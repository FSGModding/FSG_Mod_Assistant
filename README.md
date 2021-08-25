# FS19 Mod Install Checker

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC) ![GitHub release (latest by date)](https://img.shields.io/github/v/release/jtsage/FS19_Mod_Checker) [![Build/release](https://github.com/jtsage/FS19_Mod_Checker/actions/workflows/build.yml/badge.svg)](https://github.com/jtsage/FS19_Mod_Checker/actions/workflows/build.yml) ![GitHub Release Date](https://img.shields.io/github/release-date/jtsage/FS19_Mod_Checker) ![GitHub all releases](https://img.shields.io/github/downloads/jtsage/FS19_Mod_Checker/total) [![Crowdin](https://badges.crowdin.net/fs19-mod-checker/localized.svg)](https://crowdin.com/project/fs19-mod-checker)

This little program will take a look at your mod install folder and inform you of what it finds.

## What this does

This program provides lots of information.

_Optionally_, it will also allow you to remove mods from your install folder (atomically - that is, one at a time).  Moved mods are sent to a "quarantine" folder of your choice. From this quarantine location you can fix files names, unzip mod packs, or delete stuff you just don't want anymore.

### Broken Mods

* If a mod file is named incorrectly and won't load in the game.
  * Suggest it might be a copy if the name looks like a copy
    * Note if you already have that identical file
    * Note if you already have that version, but the files are different
    * Note if you don't have a properly named original
  * Suggest you extract it if it looks like a collection of mods

* If a mod is not properly zipped.
  * Suggest that you zip it up
  * Suggest you move the contents of the folder if it looks like a mod pack
  * Suggest you remove the folder if it looks like garbage

* If a mod is not intended for FS19 (i.e. FS17 mods)
  * Warn that you can't use it with this version

* If a file exists that is not a mod at all
  * Suggest you remove the file

### Conflicts

* If a you have a mod as both a folder and a zip file, warn that only the zip file will be used

* If you have a mod that is known to cause issues in specific circumstances, warn you

### Missing Mods

* List all those mods that are active in your save games but don't appear to be installed any more
  * Allow you to search for the missing mod on the official mod hub, Google, DuckDuckGo, and Bing.

### Explore Mods

Here you can sort the list of good, installed mods to discover any number of things

* If a mod is not loaded or used in any of your save games

* If a mod is loaded but unused in your save games.

* What mod each save game is using

* Which mods take up the most space on your disk

## Usage

Download the installer for your platform from the [Releases](https://github.com/jtsage/FS19_Mod_Checker/releases) page - the program
will install with 1-click, and auto-run when it's ready.

### Download options

Builds are available for the following:

* win x64 Installer
* win x64 portable (no need to install)
* mac x64 DMG (disk image)
* mac x64 ZIP (portable)

Note: the mac builds probably work just fine on the new M1 macs.

Linux Note: this builds just fine under linux. For the very few folks this would help, I don't wish to eat into my free github actions minutes - build and run it like any other npm / yarn based project - if you were able to get FS running under linux, this shouldn't be much in comparison.

### Updating

Either download the new version and install over top, or, for every version post 1.9.30, it'll auto update (windows only - mac requires a different code signing at $100/year).  Woohoo!

Note: Give the program a second to update after closing (when notified of the new version).  If you are too fast, windows will want to remove your shortcut.  If you do what I did, and blindly click yes, the install folder is at:

```C:\Users\<your username>\AppData\Local\Programs\fs19-mod-checker```

### Something didn't work?!?

Please open an issue and let me know what.  If it is specific to a mod, let me know where to get the mod.  You can also hit CTRL+ALT+D in the app to bring up the debug log - sending that too might be a good idea.

### Usage with dedicated servers (for active/inactive/unused lists)

It's beyond the scope of this project to tell you which farm / user is using each mod.  But, the program also doesn't look at that bit - a mod is either used or not, associated farm ownership is ignored.  

So, if you want to run it against a dedicated server save:

Option 1 - If you are running the dedicated server locally, just use the scanner on that set of save files / mods.

Option 2 - Download your savegame folder *and* gameSettings.xml and run it on that.  Keep in mind to make sure the server has saved out the file recently before you do this.  Then just run it on that set of files like normal.

Option 3 - Just grab the savegame folder, and replace one of your unused local saves with it.

I will not be exploring using the server API to check directly - The amount of complexity this would add overshadows the benefits.  Nor will I be adding arbitrary save file loading - again, the complexity add is too much.

## What it looks like

### Configuration Screen, Mods Loaded

<p align="center">
  <img width="650" src="https://github.com/jtsage/FS19_Mod_Checker/raw/main/screen_shots/001-config.png">
</p>

### Bad Mods, Unzipped Mods, Extra Files

<p align="center">
  <img width="650" src="https://github.com/jtsage/FS19_Mod_Checker/raw/main/screen_shots/002-broken.png">
</p>

### Missing Mods

<p align="center">
  <img width="650" src="https://github.com/jtsage/FS19_Mod_Checker/raw/main/screen_shots/003-missing.png">
</p>

### Possible Conflicts

<p align="center">
  <img width="650" src="https://github.com/jtsage/FS19_Mod_Checker/raw/main/screen_shots/004-conflict.png">
</p>

### Explore Mods

<p align="center">
  <img width="650" src="https://github.com/jtsage/FS19_Mod_Checker/raw/main/screen_shots/005-explore.png">
</p>

<p align="center">
  <img width="650" src="https://github.com/jtsage/FS19_Mod_Checker/raw/main/screen_shots/006-explore-options.png">
</p>

### Detail Popup

<p align="center">
  <img width="650" src="https://github.com/jtsage/FS19_Mod_Checker/raw/main/screen_shots/010-detail.png">
</p>

## Translation Effort

Sadly, the primary developer only understands English.  If you'd like to contribute a translation, take a look in the translations folder, it's simple json. If you prefer a web interface: [Crowdin Project Page](https://crowdin.com/project/fs19-mod-checker)

### Localizations Available

* Dutch / Nederlands - Thank you Kim | Paint-a-Farm!
* English
* French / Français - Thank you Taco29!
* German / Deutsch - Thank you paraTM!
* Polish / Polski - Thank you Ziuta!
* Spanish / Español - Thank you Vanquish081!

## In-Progress Improvements

* Note some of the more popular mod conflicts and suggest avoiding them: [GitHub Issue #2](https://github.com/jtsage/FS19_Mod_Checker/issues/2)

## A short note about the EXE

2021-07-02 (late): Seems to be ok with the ~3pm EDT update to defender.  At any rate, purchase pending on the signing certificate.

2021-07-02: Spoke too soon.  The windows download at least is throwing a false virus warning at the moment.  Working on it.  Looks like sectigo joined the last couple decades and you can no verify without a listed phone number (a.k.a. Only own a cell phone like, ya know, everybody).  Looking into this today or tomorrow.

2021-06: the electron package should work without any virus warnings, unlike the python version. It *is* unsigned, and probably will remain so for the future - I cannot possibly spend a couple hundred dollars a year on a code signing certificate for one little project - and as far as I know, no company still offers freebies for open source.

## For developers

There is a CLI version in the repository, modChecker.js (you'll need the npm dependencies, but it will run without the dev-dependencies just fine. (dev stuff is only needed for the test suite and to run/build the electron version)) - it shows the basic usage of the mod / save game parser.  Someday, the parser might be it's own npm module, maybe.
