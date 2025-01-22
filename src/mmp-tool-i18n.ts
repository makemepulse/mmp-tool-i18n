import { html } from './utils/unescape';
import { downloadFile } from './utils/download-file';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import type { WorkBook } from 'xlsx';
import * as mkdirp from 'mkdirp';
import * as parseArgs from 'minimist';

require('dotenv').config();
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// @ts-ignore
const argv = (parseArgs?.default || parseArgs)(process.argv.slice(2), {
  string: ['spreadsheet-id', 'spreadsheet-tab', 'ignore-fields', 'only-fields', 'locales-dir', 'filename'],
  boolean: ['prettify', 'flatten'],
}) as ArgumentValues;

const PROJ_DIR = path.resolve('./'); // repository root folder from a classic './node_modules' folder
const TGT_FLD = process.env.I18N_LOCALES_DIR || argv['locales-dir'] || 'src/locales';
const OUT_DIR = path.resolve(PROJ_DIR, TGT_FLD);

let _WORKBOOK: WorkBook;
let _LOCALES: string[];
let _OPTIONS: I18nFetchOptions;

export interface ArgumentValues {
  'spreadsheet-id'?: string;
  'spreadsheet-tab'?: string;
  'ignore-fields'?: string;
  'only-fields'?: string;
  'locales-dir'?: string;
  filename?: string;
  prettify?: boolean;
  flatten?: boolean;
}

export interface I18nFetchOptions {
  apiKey?: string;
  appId: string;
  tab: string;
  ignoreFields?: string[];
  onlyFields?: string[];
  filename?: string;
}

export interface I18nData {
  [key: string]: Record<string, string | I18nData>;
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

export interface FilenamePlaceholders {
  locale: string;
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

function setDotted(key: string, val: string, obj: any) {
  const chain = key.split('.');
  const name = chain.pop() as string;
  let o = obj;
  for (const ck of chain) {
    if (o[ck] === undefined) o[ck] = {};
    o = o[ck];
  }
  const isDef = o[name] !== undefined;
  o[name] = html.unescape(val.trim());
  return isDef;
}

function formatFilename(filename: string, placeholders: FilenamePlaceholders) {
  return Object.entries(placeholders).reduce(
    (filename, [placeholder, value]) => filename.replace(`[${placeholder}]`, value),
    filename,
  );
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

  const { appId: filename = 'locale' } = _OPTIONS;
  const tmpFile = `./.tmp/${filename}.xlsx`;

  try {
    await downloadFile(url, tmpFile);
  } catch (e) {
    console.warn('[i18n] No locale fetched, try to get tmp file');
  }

  _WORKBOOK = XLSX.readFile(tmpFile);
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
  _LOCALES = _LOCALES.filter((locale) => {
    let include = true;
    if (_OPTIONS.ignoreFields?.length) {
      include = _OPTIONS.ignoreFields.every((field) => field.toLowerCase() !== locale.toLowerCase());
    }
    if (include && _OPTIONS.onlyFields?.length) {
      include = _OPTIONS.onlyFields.some((field) => field.toLowerCase() === locale.toLowerCase());
    }

    return include;
  });

  return _LOCALES;
}

/**
 * Fetch locales to Spreadsheet grouped by locale
 */
export async function fetch(options: I18nFetchOptions): Promise<I18nData> {
  _OPTIONS = options;

  console.log('[i18n] fetch', _OPTIONS);

  const workbookURL = `https://docs.google.com/spreadsheets/d/${_OPTIONS.appId}/pub?output=xlsx`;
  await getWorkBook(workbookURL);

  let tabs = _OPTIONS.tab.split(',').map((tab) => tab.trim());
  var records: I18nData[] = [];
  for (let i = 0; i < tabs.length; i++) {
    const data: I18nData[] = XLSX.utils.sheet_to_json(_WORKBOOK.Sheets[tabs[i]], { raw: false });
    if (!data[0]) {
      console.warn(`[i18n] Tab "${tabs[i]}" do not exist`);
      continue;
    }
    records.push(...data);
  }

  // var records: I18nData[] = XLSX.utils.sheet_to_json(_WORKBOOK.Sheets[_OPTIONS.tab], { raw: false });
  // if (!records[0]) {
  //   console.error(`[i18n] Tab "${_OPTIONS.tab}" do not exist`);
  // }

  const locales = getWorkbookLanguages(records);
  const data: any = {};

  locales.forEach((locale) => {
    records.forEach((record: any) => {
      if (record[locale]) {
        const key = record.key;
        const category = record.category;

        if (!key) {
          return;
        }

        const localeObj = (data[locale] = data[locale] || {});
        const categoryObj = (localeObj[category] = localeObj[category] || {});
        setDotted(key, record[locale] || `${locale}.${category}.${key}`, categoryObj);
      }
    });
  });

  console.log('[i18n] Locales loaded');
  return data;
}

/**
 *
 * @param locales
 * @param prettify Prettify output. Optionnal. Default to false
 */
export async function exportFiles(locales: I18nData, prettify = argv.prettify) {
  const _filename = _OPTIONS.filename || '[locale]';

  for (const locale of Object.keys(locales)) {
    const [filename, ...dirs] = formatFilename(_filename, { locale }).split('/').reverse();

    const target = dirs.reverse().join('/');
    const outDir = `${OUT_DIR}${target ? '/' + target : ''}`;
    mkdirp.sync(outDir);

    console.log(`[i18n] Writing ${TGT_FLD}${target ? '/' + target : ''}/${filename}.json`);
    fs.writeFile(
      `${outDir}/${filename}.json`,
      JSON.stringify(locales[locale], undefined, prettify ? 2 : undefined),
      () => {},
    );
  }
}

/**
 *
 * @param options
 * @returns
 */
export async function upsync(options: I18nFetchOptions): Promise<Boolean> {
  _OPTIONS = options;
  const _filename = _OPTIONS.filename || '[locale]';

  console.log('[i18n] upsync', _OPTIONS);

  await getWorkBook(`https://docs.google.com/spreadsheets/d/${_OPTIONS.appId}/pub?output=xlsx`);

  var records: I18nData[] = XLSX.utils.sheet_to_json(_WORKBOOK.Sheets[_OPTIONS.tab], { raw: false });
  if (!records[0]) {
    console.error(`[i18n] Tab "${options.tab}" do not exist`);
  }

  const tableHead = getWorkBookTH(records);
  const locales = getWorkbookLanguages(records);
  let data: any[] = [];

  for (const locale of locales) {
    const [filename, ...dirs] = formatFilename(_filename, { locale }).split('/').reverse();

    const target = dirs.reverse().join('/');
    const outDir = `${OUT_DIR}${target ? '/' + target : ''}`;

    const localesPath = path.resolve(`${outDir}/${filename}.json`);
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
