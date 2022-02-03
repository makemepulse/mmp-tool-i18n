import { upsync, I18nFetchOptions } from './mmp-tool-i18n';
import * as path from 'path';

require('dotenv').config();
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const ignoreFields = process.env.I18N_SPREADSHEET_TAB || process.env.npm_config_i18n_spreadsheet_tab || ['ID', 'category', 'key', 'description', 'status'];
const options:I18nFetchOptions = {
  appId: (process.env.I18N_SPREADSHEET_ID || process.env.npm_config_i18n_spreadsheet_id)!,
  tab: process.env.I18N_SPREADSHEET_TAB || process.env.npm_config_i18n_spreadsheet_tab || 'locales',
  ignoreFields: Array.isArray(ignoreFields) ? ignoreFields : ['ID', 'category', 'key', 'description', 'status']
}

upsync(options);
