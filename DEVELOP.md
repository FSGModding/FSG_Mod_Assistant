# FSG Mod Assistant

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC) ![GitHub release (latest by date)](https://img.shields.io/github/v/release/FSGModding/FSG_Mod_Assistant) ![GitHub Release Date](https://img.shields.io/github/release-date/FSGModding/FSG_Mod_Assistant) [![Crowdin](https://badges.crowdin.net/fsg-mod-assistant/localized.svg)](https://crowdin.com/project/fsg-mod-assistant)

Developer information below

___Contents___

- [FSG Mod Assistant](#fsg-mod-assistant)
  - [Environment and Requirements](#environment-and-requirements)
    - [Node.js](#nodejs)
    - [Yarn](#yarn)
  - [Build and Run](#build-and-run)
    - [Run Development Version](#run-development-version)
    - [Build Executable](#build-executable)
  - [Testing](#testing)
    - [Test everything](#test-everything)
    - [Check translations against each other](#check-translations-against-each-other)
    - [Fix translations](#fix-translations)
    - [Check Dependencies](#check-dependencies)
  - [Folder Structure](#folder-structure)
  - [Utility Classes `fsg_util.js`](#utility-classes-fsg_utiljs)
  - [Pull Requests](#pull-requests)

## Environment and Requirements

### Node.js

Mod Assistant expects to be built using at least Node 16.x, 18.x is preferred.

- [Node Download](https://nodejs.org/en/download/)

### Yarn

Mod Assistant requires Yarn to build.  Note that for windows, you may have to run powershell as `Administrator` to globally install it correctly

- [Yarn Install](https://classic.yarnpkg.com/lang/en/docs/install/#windows-stable)

## Build and Run

If using VSCode, the build files already exist, just press `F5` to run the program.  If running from the command line, use

Before running for the first time, you must build the dependencies. Run yarn in the repo folder.

`# yarn`

### Run Development Version

`# .\node_modules\.bin\electron .`

### Build Executable

`# npm run dist`

## Testing

This package provides a number of test cases:

### Test everything

`# npm test`

### Check translations against each other

See if translation files match keys

`# npm run lang_test`

### Fix translations

If translation files are mismatched, this will fix it (english is master)

`# npm run lang_fix`

### Check Dependencies

This is for an automated system for checking dependency versions

`# npm run depends`

## Folder Structure

- `modAssist_main.js` : Master electron server process
- __F:__`/build` : Build files (icons)
- __F:__`/lib` : Custom libraries for master process
  - `ddsLibrary.js` : DDS -> PNG conversion
  - `ma-logger.js` : Logging class
  - `savegame-parser.js` : Save game file/folder parser
  - `single-mod-checker.js` : Mod parser
  - `translate.js` : Localization library
- __F:__`/renderer` : User facing renderer files
  - `<window name>.html` : Render side HTML
  - __F:__`/img` : Image includes
  - __F:__`/inc` : 3rd Party scripts and CSS
  - __F:__`/preload` : Preload scripts, name is _preload-&lt;window name>.js_, runs privileged
  - __F:__`/renderJS` : Render side script, name is _&lt;window name>_ui.js`, runs sandboxed
    - `fsg_util.js` : Utility libraries, loaded everywhere (sandboxed)
    - `key_lookup_table.js` : Used to map keybindings to pretty text, detail screen
    - `select_lib_ui.js` : Selection library, main screen
- __F:__`/test` : Test files and scripts
- __F:__`/translations` : Localization files

The one exception to the naming scheme is `main.html` uses `assist_ui.js`

## Utility Classes `fsg_util.js`

- `getText(key)` : Insert localization HTML tag

- `fsgUtil`
  - `led` : Giants LED operation strings
  - `byId(id)` : Get HTML element by ID
  - `query(query)` : Run _querySelectorAll_
  - `getIconSVG(type)` : Get named SVG Icon
  - `getIcon(type,cls)` : Get named SVG Icon encapsulated in _class_
  - `buildSelectOpt(value, text, selected, disabled, title)` : Built HTML select option
  - `getAttribNullError(element, attrib)` : Get HTML attribute from element, throw error if it doesn't exist
  - `getAttribNullEmpty(element, attrib)` : Get HTML attribute from element, return null if it doesn't exist
  - `buildBS(name, value)` : Build a BootStrap date attribute _name_, with _value_
  - `bytesToHR(inBytes,locale)` : Make byte value human readable using _locale_
  - `basename(name, sep = '\\')` : Renderer version of _path.basename()_
  - `iconMaker(icon)` : Return base64 icon or placeholder icon
  - `notesDefault(notes, collection, key, defaultValue)` : Retrieve collection note detail if it exists.
  - `escapeDesc( text )` : Escape special characters in the mod description
  - `escapeSpecial( text )` : Escape special characters
  - `badge : (color, name, fullName = false)` : Make localized badge using color class _color_, with _name_. If _fullName_ is false, add `mod_badge_` to _name_

## Pull Requests

Any pull request is fine, please try and squash atomic commits first, but it's not a deal breaker.  Please be verbose in your description of what the pull request does.
