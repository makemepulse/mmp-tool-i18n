import { html } from './utils/unescape';
import { downloadFile } from './utils/download-file';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { WorkBook } from 'xlsx';
import * as mkdirp from 'mkdirp';

require('dotenv').config();
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const PROJ_DIR = path.resolve('./../../'); // repository root folder from a classic './node_modules' folder
const TGT_FLD = process.env.npm_config_i18n_locales_dir || 'src/locales';
const OUT_DIR = path.resolve(PROJ_DIR, TGT_FLD);

let _WORKBOOK: WorkBook;
let _LOCALES: string[];
let _OPTIONS: I18nFetchOptions;

export interface I18nFetchOptions {
  apiKey?: string;
  appId: string;
  tab: string;
  ignoreFields?: string[];
}

export interface I18nData {
  [key: string]: Record<string, string>;
}

export interface LocaleDef {
  locale: string;
  label: string;
}

export interface CountryDef {
  locale: string;
  label: string;
  languages: Array<LocaleDef>;
}

export function isString(v: any) {
  return typeof v === 'string';
}

export function csvEscape(s: string) {
  return s.replace('"', '""');
}

export function flatten(locales: any, keys: any[] = [], list: any[] = []) {
  for (const key in locales) {
    keys.push(key);
    const val = locales[key];

    if (isString(val)) {
      list.push({
        key: keys.join('.'),
        val,
      });
    } else {
      flatten(val, keys, list);
    }

    keys.pop();
  }

  return list;
}

/**
 * format xls data to a valid vue-i18n locale formatted data
 *
 * @param data
 * @returns flat data
 */
export function format(data: any): I18nData {
  const flat_data: I18nData = {};

  // Iterate over locales
  Object.keys(data).forEach((locale) => {
    const locale_data = data[locale];

    // Iterate over categories
    Object.keys(locale_data).forEach((category) => {
      const category_data = locale_data[category];

      // Iterate over keys
      Object.keys(category_data).forEach((key) => {
        // unescape special chars
        category_data[key] = html.unescape(category_data[key]);
      });
    });

    flat_data[locale] = data[locale];
  });

  return flat_data;
}

/**
 * get xls Workbook
 * @param url
 * @returns
 */
export async function getWorkBook(url: string): Promise<WorkBook> {
  if (_WORKBOOK) return _WORKBOOK;

  if (!fs.existsSync('./.tmp')) {
    mkdirp.sync('.tmp');
  }

  try {
    await downloadFile(url, './.tmp/locale.xlsx');
  } catch (e) {
    console.warn('[i18n] No locale fetched, try to get tmp file');
  }

  _WORKBOOK = XLSX.readFile('./.tmp/locale.xlsx');
  return _WORKBOOK;
}

export function getWorkBookTH(records: I18nData[]): string[] {
  if (!_WORKBOOK) return [];

  return (records[0] && Object.keys(records[0])) || [];
}

/**
 *
 * @param options
 * @returns
 */
export function getWorkbookLanguages(records: I18nData[]): string[] {
  if (!_WORKBOOK) return [];
  if (_LOCALES) return _LOCALES;

  _LOCALES = (records[0] && Object.keys(records[0])) || [];
  _LOCALES = _LOCALES.filter((value) => _OPTIONS.ignoreFields && _OPTIONS.ignoreFields.indexOf(value) == -1);

  return _LOCALES;
}

/**
 * Fetch locales to Spreadsheet grouped by locale
 */
export async function fetch(options: I18nFetchOptions): Promise<I18nData> {
  _OPTIONS = options;

  console.warn('[i18n] fetch', _OPTIONS);

  const workbookURL = `https://docs.google.com/spreadsheets/d/${_OPTIONS.appId}/pub?output=xlsx`;
  await getWorkBook(workbookURL);

  var records: I18nData[] = XLSX.utils.sheet_to_json(_WORKBOOK.Sheets[_OPTIONS.tab]);
  if (!records[0]) {
    console.error(`[i18n] Tab "${_OPTIONS.tab}" do not exist`);
  }

  const locales = getWorkbookLanguages(records);
  const data: any = {};

  locales.forEach((locale) => {
    records.forEach((record: any) => {
      if (record[locale]) {
        const key = record.key;
        const category = record.category;

        const localeObj = (data[locale] = data[locale] || {});
        const categoryObj = (localeObj[category] = localeObj[category] || {});

        categoryObj[key] = record[locale] || `${locale}.${category}.${key}`;
        categoryObj[key] = categoryObj[key].toString().trim();
      }
    });
  });

  const flat_data: I18nData = format(data);

  console.log('[i18n] Locales loaded');
  return flat_data;
}

/**
 *
 * @param locales
 */
export async function exportFiles(locales: I18nData) {
  mkdirp.sync(OUT_DIR);
  for (const locale of Object.keys(locales)) {
    console.log(`[i18n] Writing ${TGT_FLD}/${locale}.json`);
    fs.writeFile(OUT_DIR + `/${locale}.json`, JSON.stringify(locales[locale]), () => {});
  }
}

/**
 *
 * @param options
 * @returns
 */
export async function upsync(options: I18nFetchOptions): Promise<Boolean> {
  
  _OPTIONS = options;

  console.warn('[i18n] upsync', _OPTIONS);

  await getWorkBook(`https://docs.google.com/spreadsheets/d/${_OPTIONS.appId}/pub?output=xlsx`);

  var records: I18nData[] = XLSX.utils.sheet_to_json(_WORKBOOK.Sheets[_OPTIONS.tab]);
  if (!records[0]) {
    console.error(`[i18n] Tab "${options.tab}" do not exist`);
  }

  const tableHead = getWorkBookTH(records);
  const locales = getWorkbookLanguages(records);
  let data: any[] = [];

  for (const locale of locales) {
    const localesPath = path.resolve(OUT_DIR, `${locale}.json`);
    const localesStr = await fs.promises.readFile(localesPath, { encoding: 'utf-8' });
    const localesData = JSON.parse(localesStr);

    const flats = flatten(localesData);

    flats.forEach(({ key, val }: { key: string; val: string }) => {
      const category = key.split('.', 1)[0];
      const k = key.slice(`${category}.`.length);
      const dataIndex = data.findIndex((row) => row.key === k && row.category === category);
      if (dataIndex === -1) {
        const row: any = {
          category,
          key: k,
        };
        row[locale] = val;
        data.push(row);
      } else {
        const row: any = data[dataIndex];
        row[locale] = val;
      }
    });
  }

  const wb = XLSX.utils.book_new();
  const aoaData = [];
  aoaData.push(tableHead);
  data.forEach((row) => {
    const item: any[] = [];
    tableHead.forEach((cell) => {
      item.push(row[cell]);
    });
    aoaData.push(item);
  });

  var ws = XLSX.utils.aoa_to_sheet(aoaData);
  XLSX.utils.book_append_sheet(wb, ws, _OPTIONS.tab);
  XLSX.writeFile(wb, path.resolve(PROJ_DIR, `__i18n_sync.xlsx`));

  return true;
}
