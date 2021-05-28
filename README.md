# FS19 Mod Install Checker

This little program will take a look at your mod install folder and inform you of the following

## What this does

This program provides information only.

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

### Explore Mods

Here you can sort the list of good, installed mods to discover any number of things

* If a mod is not loaded or used in any of your save games

* If a mod is loaded but unused in your save games.

* What mod each save game is using

* Which mods take up the most space on your disk

## Usage

Unzip the zip file, run the installer.

### Something didn't work?!?

Please open an issue and let me know what.  If it is specific to a mod, let me know where to get the mod.  You can also hit CTRL+ALT+D in the app to bring up the debug log - sending that too might be a good idea.

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

## In-Progress Improvements

* Note some of the more popular mod conflicts and suggest avoiding them: [GitHub Issue #2](https://github.com/jtsage/FS19_Mod_Checker/issues/2)

## A short note about the EXE

UPDATE: the electron package should work without any virus warnings, unlike the python version. It *is* unsigned, and probably will remain so for the future - I cannot possibly spend a couple hundred dollars a year on a code signing certificate for one little project - and as far as I know, no company still offers freebies for open source.
