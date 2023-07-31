# FSG Mod Assistant - Contributing

- [FSG Mod Assistant - Contributing](#fsg-mod-assistant---contributing)
  - [New contributor guide](#new-contributor-guide)
  - [Getting started](#getting-started)
    - [Issues](#issues)
      - [Create a new issue](#create-a-new-issue)
      - [Solve an issue](#solve-an-issue)
    - [Make Changes](#make-changes)
      - [Make changes locally](#make-changes-locally)
    - [Commit your update](#commit-your-update)
    - [Pull Request](#pull-request)
    - [Your PR is merged!](#your-pr-is-merged)
  - [Windows](#windows)
  - [Folder Structure](#folder-structure)
    - [Utility Classes `fsg_util.js`](#utility-classes-fsg_utiljs)
  - [Mod Testing Assumptions](#mod-testing-assumptions)
    - [File Name](#file-name)
    - [Collections](#collections)
    - [Folders](#folders)
    - [Compression](#compression)
    - [Mod Contents](#mod-contents)
    - [Mod "working" concerns](#mod-working-concerns)

Thank you for investing your time in contributing to our project!

Read our [Code of Conduct](/.github/CODE_OF_CONDUCT.md) to keep our community approachable and respectable.

In this guide you will get an overview of the contribution workflow from opening an issue, creating a PR, reviewing, and merging the PR.

## New contributor guide

To get an overview of the project, read the [README](/README.md). Here are some resources to help you get started with open source contributions:

- [Finding ways to contribute to open source on GitHub](https://docs.github.com/en/get-started/exploring-projects-on-github/finding-ways-to-contribute-to-open-source-on-github)
- [Set up Git](https://docs.github.com/en/get-started/quickstart/set-up-git)
- [GitHub flow](https://docs.github.com/en/get-started/quickstart/github-flow)
- [Collaborating with pull requests](https://docs.github.com/en/github/collaborating-with-pull-requests)

## Getting started

### Issues

#### Create a new issue

If you spot a problem with the application, [search if an issue already exists](https://docs.github.com/en/github/searching-for-information-on-github/searching-on-github/searching-issues-and-pull-requests#search-by-the-title-body-or-comments). If a related issue doesn't exist, you can open a new issue using a relevant [issue form](https://github.com/FSGModding/FSG_Mod_Assistant/issues/new/choose).

#### Solve an issue

Scan through our [existing issues](https://github.com/FSGModding/FSG_Mod_Assistant/issues/) to find one that interests you. You can narrow down the search using `labels` as filters. As a general rule, we don’t assign issues to anyone. If you find an issue to work on, you are welcome to open a PR with a fix.

### Make Changes

#### Make changes locally

1. Fork the repository.
  - Using GitHub Desktop:
    - [Getting started with GitHub Desktop](https://docs.github.com/en/desktop/installing-and-configuring-github-desktop/getting-started-with-github-desktop) will guide you through setting up Desktop.
    - Once Desktop is set up, you can use it to [fork the repo](https://docs.github.com/en/desktop/contributing-and-collaborating-using-github-desktop/cloning-and-forking-repositories-from-github-desktop)!

  - Using the command line:
    - [Fork the repo](https://docs.github.com/en/github/getting-started-with-github/fork-a-repo#fork-an-example-repository) so that you can make your changes without affecting the original project until you're ready to merge them.

2. Install or update to **Node.js**, at least Node 18.x. [Node Download](https://nodejs.org/en/download/)

3. Mod Assistant requires Yarn to build.  Note that for windows, you may have to run powershell as `Administrator` to globally install it correctly. [Yarn Install](https://classic.yarnpkg.com/lang/en/docs/install/#windows-stable)

4. Create a working branch and start with your changes!

5. If using VSCode, the build files already exist, just press `F5` to run the program.  If running from the command line, use Before running for the first time, you must build the dependencies. Run `yarn` in the repo folder.

### Commit your update

Commit the changes once you are happy with them. Please use the testing suite `npm test` to identify any easily fixable errors.

### Pull Request

When you're finished with the changes, create a pull request, also known as a PR.
- Fill the "Ready for review" template so that we can review your PR. This template helps reviewers understand your changes as well as the purpose of your pull request.
- Don't forget to [link PR to issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue) if you are solving one.

Once you submit your PR, a FSG team member will review your proposal. We may ask questions or request additional information.
- We may ask for changes to be made before a PR can be merged, either using [suggested changes](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/incorporating-feedback-in-your-pull-request) or pull request comments. You can apply suggested changes directly through the UI. You can make any other changes in your fork, then commit them to your branch.
- As you update your PR and apply changes, mark each conversation as [resolved](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/commenting-on-a-pull-request#resolving-conversations).
- If you run into any merge issues, checkout this [git tutorial](https://github.com/skills/resolve-merge-conflicts) to help you resolve merge conflicts and other issues.

### Your PR is merged!

Congratulations :tada::tada: The FSG team thanks you :sparkles:.

## Windows

This app is designed for and (mostly) exclusive to windows.  PRs for non-windows support will be considered on a case-by-case basis.

## Folder Structure

- `modAssist_main.js` : Master electron server process
- __F:__`/build` : Build files (icons)
- __F:__`/lib` : Custom libraries for master process
  - `modAssist_window_lib.js` : Window handling library
  - `modCheckLib_static.js`   : Some static data structures that get reused multiple places
  - `modCheckLib.js` : Mod Collection Class, Save Game Checker Class, Save Game Track Class
  - `modLookerLang.json` : Localization for modLooker Class, imported from base game
  - `modUtilLib.js` : DDS Decoder Class, Logger Class, Localization Class, IPC Object for main process
  - `oldModHub.json` : ModHub Data for FS19 and below
  - `queueRunner.js` : Thread runner control (modLook and modFileChecker)
  - `workerThreadLib.js` : Mod Parser Class, Mod Looker Class, IPC Object for threads
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

### Utility Classes `fsg_util.js`

- `getText(key)` : Insert localization HTML tag

- `fsgUtil`
  - `led` : Giants LED operation strings
  - `byId(id)` : Get HTML element by ID
  - `checkChangeAll(element, newValue)` : Set checkbox values on elements
  - `clsHide(id)` | `clsShow(id)` : Add/Remove 'd-none' from ID
  - `clsHideTrue(id, test)` | `clsShowFalse(id, test)` : Add 'd-none' to ID if test is true
  - `clsHideFalse(id, test)` | `clsShowTrue(id, test)` : Remove 'd-none' to ID if test is true
  - `clsOrGate(id, test, ifTrue, ifFalse)` : Add `ifTrue` to ID if test is true, otherwise add `ifFalse`
  - `clsRemoveFromAll(queryOrNodes, classList)` : Remove class(es) from Node(s) or DOM query results
  - `query(query)` : Run _querySelectorAll_
  - `getIconSVG(type)` : Get named SVG Icon
  - `getIcon(type,cls)` : Get named SVG Icon encapsulated in _class_
  - `buildSelectOpt(value, text, selected, disabled, title)` : Built HTML select option
  - `getAttribNullEmpty(element, attrib)` : Get HTML attribute from element, return null if it doesn't exist
  - `bytesToMB(count, suffix)` : Convert count to megabytes, boolean show suffix (MB)
  - `bytesToHR(inBytes,locale)` : Make byte value human readable using _locale_
  - `basename(name, sep = '\\')` : Renderer version of _path.basename()_
  - `iconMaker(icon)` : Return base64 icon or placeholder icon
  - `notesDefault(notes, collection, key, defaultValue)` : Retrieve collection note detail if it exists.
  - `escapeDesc( text )` : Escape special characters in the mod description
  - `escapeSpecial( text )` : Escape special characters
  - `firstOrNull(arr)` : Return first array element only if array length is exactly 1
  - `setTextOrHide(id, content, test)` : Set content to ID if test is true, otherwise hide ID
  - `badge : (color, name, fullName = false)` : Make localized badge using color class _color_, with _name_. If _fullName_ is false, add `mod_badge_` to _name_
  - `windowCheckAll()` : check all checkboxes on page
  - `windowCheckNone()` : uncheck all checkboxes on page
  - `windowCheckInv()` : invert all checkboxes on page

## Mod Testing Assumptions

Assumptions made that a mod is "good"

### File Name

File name must contain only [a-zA-Z0-9_], cannot must begin with [a-zA-Z].

We make no assumptions that files are case insensitive, although this is by default true on windows 10 - it's an extra hurdle to make a folder contain case sensitive files.  On mac, this is (probably) not the default, but appears to be available.  Either way, we don't check for this, and it would be an __excellent__ way to shoot yourself in the foot.

### Collections

ZIP files that include the text "unzip" or "extract" (along with some translations of these terms) are _probably_ collections that should be extracted

### Folders

Mods that are not zipped cannot be used in multiplayer

### Compression

Only readable ZIP files are valid - however, the Giants engine is more forgiving than most zip libraries - currently, we only warn if it soft-fails.

### Mod Contents

- a modDesc.xml is required, and must be parse-able
- a readable icon file is required
- the moddesc.descversion attribute must appear, and be 60+
- a mod version string must be present
- the "productid" tag should not be present (probably cracked DLC)

### Mod "working" concerns

There is really no way we can automate the test to see if a mod actually functions in game - this is to weed out the garbage from the high and low quality mods.
