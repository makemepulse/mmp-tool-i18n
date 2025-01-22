import { upsync, I18nFetchOptions, ArgumentValues } from '../mmp-tool-i18n';
import * as path from 'path';
import * as parseArgs from 'minimist';

require('dotenv').config();
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const DEFAULT_IGNORE_FIELDS = ['ID', 'category', 'key', 'description', 'status'];

const argv = parseArgs(process.argv.slice(2), {
  string: ['spreadsheet-id', 'spreadsheet-tab', 'ignore-fields', 'only-fields', 'locales-dir'],
}) as ArgumentValues;

const customIgnoreFields = process.env.I18N_IGNORE_FIELDS || argv['ignore-fields'];
const ignoreFields = customIgnoreFields
  ? customIgnoreFields.split(',').map((field) => field.trim())
  : DEFAULT_IGNORE_FIELDS;
const customOnlyFields = process.env.I18N_ONLY_FIELDS || argv['only-fields'];
const onlyFields = customOnlyFields?.split(',').map((field) => field.trim());
const options: I18nFetchOptions = {
  appId: (process.env.I18N_SPREADSHEET_ID || argv['spreadsheet-id'])!,
  tab: process.env.I18N_SPREADSHEET_TAB || argv['spreadsheet-tab'] || 'locales',
  ignoreFields,
  onlyFields,
};

test(`UpSync`, async () => {
  await upsync(options);
});
