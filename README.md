# makemepulse tool i18n

Handle localisation with a templated Google Spreadsheet

## Table of content

* [Requirements](#requirements)
* [Installation](#installation)
* [Options](#options)
* [Settings](#settings)
* [Commands](#commands)
* [Troubleshootings](#troubleshootings)
* [Test](#test)

## Requirements / Prerequisite

- A Vue.js project: 
    - `vue`
    - `vue-i18n`
- A Google Sheets from the template `Template_tool_i18n`: 
    1. [New Google Sheets from a template](https://docs.google.com/spreadsheets/u/0/?ftv=1&folder=0ABUmECcOxpcZUk9PVA&tgif=d)
    2. Choose `Template_tool_i18n` tempate
    3. Add/Remove/Update languages the project need to support
    5. **The spreadsheet must be public !** Go to _File > Share > Publish to the web_ to make it public.
    4. That'it !

## Installation

```
npm i git+ssh://git@github.com:makemepulse/makemepulse-tool-i18n.git
```

## Options

| Property              | Type   | Description                                       | Default                                    |
| ------------          | ------ | ------------------------------------------------- | ------------------------------------------ |
| i18n_spreadsheet_id   | string | The id of the spreadsheet                         | `process.env.I18N_SPREADSHEET_ID`    |
| i18n_spreadsheet_tab  | string | The tab of the spreadsheet                        | `"locales"`    |
| i18n_ignoreFields     | array  | Collection of fields whiches **are not** locales  | `['ID', 'category', 'key', 'description', 'status']`
| i18n_locales_dir      | string | the path of the locales folder                    | `src/locales`


## Settings

### .env file

Eg: Define the `I18N_SPREADSHEET_ID` from the current spreadsheet url: https://docs.google.com/spreadsheets/d/1bH-aZzj38YjIZTlWhv1XKWc9NyItRAuRXnQEZoWRmzA/edit#gid=0

```
I18N_SPREADSHEET_ID = '1bH-aZzj38YjIZTlWhv1XKWc9NyItRAuRXnQEZoWRmzA'
I18N_LOCALES_DIR = src/locales
```

## Commands

| Command    | Description                                                         | Arg                     |
| ---------- | ------------------------------------------------------------------- | ----------------------- |
| `i18n`     | Fetch the spreadsheet and create vue-i18n locale json files.        | [see Options](#options) |
| `i18n:up`  | up sync will create `__i18n_sync.xlsx` at the root of the project   | [see Options](#options) |


Add the following commands to your `package.json` file:
```
{
    "scripts": {
        "i18n": "node ./node_modules/mmp-tool-i18n/lib/index.js --i18n_spreadsheet_id=__YOUR_I18N_SPREADSHEET_ID__",
        "i18n:up": "node ./node_modules/mmp-tool-i18n/lib/upsync.js --i18n_spreadsheet_id=__YOUR_I18N_SPREADSHEET_ID__"
    }
}
```

## Troubleshootings

### Arabic language

*Please note that if your project needs arabic locales and if there is Latin character in your arabic locales, you must the  `v-html` directive to display the locales*

## Test

```
npm test
```