import { fetch, exportFiles, I18nFetchOptions, ArgumentValues } from './mmp-tool-i18n';
import * as path from 'path';
import * as parseArgs from 'minimist';

require('dotenv').config();
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const DEFAULT_IGNORE_FIELDS = ['ID', 'category', 'key', 'description', 'status'];

const argv = parseArgs(process.argv.slice(2), {
  string: ['ignore-fields', 'spreadsheet-id', 'spreadsheet-tab'],
  boolean: ['prettify']
}) as ArgumentValues;

const ignoreFields = argv['ignore-fields']
  ? argv['ignore-fields'].split(',').map(field => field.trim())
  : DEFAULT_IGNORE_FIELDS;
const options:I18nFetchOptions = {
  appId: (process.env.I18N_SPREADSHEET_ID || argv['spreadsheet-id'])!,
  tab: process.env.I18N_SPREADSHEET_TAB || argv['spreadsheet-tab'] || 'locales',
  ignoreFields
}

fetch(options).then(exportFiles);