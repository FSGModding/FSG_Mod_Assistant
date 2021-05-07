# FS19 Mod Install Checker

This little program will take a look at your mod install folder and inform you of the following

 * If a mod file is named incorrectly and won't load in the game.
   * Suggest it might be a copy if the name looks like a copy (and note if you already have it)
   * Suggest you extract it if it looks like a collection of mods

 * If a mod is not properly zipped.
   * Suggest that you zip it up

 * If a mod is used in your save games, but does not appear to be installed.

 * If a mod is not loaded or used in any of your save games

 * If a mod is loaded but unused in your save games.

 * If a mod you have possibly conflicts with another mod you have.


## What this does

This program provides information only. 

__This does not alter or delete any files on your computer at all__

You can, optionally, choose to save a log file from the File menu.

## Usage:

Run dist/FS19_Mod_Checker.exe - command line or explorer.

## What it looks like

### Configuration Screen, Mods Loaded
![Configuration Screen, Mods Loaded](sshot/001-ConfigLoaded.png)

### Bad Mods, Unzipped Mods, Extra Files
![Bad Mods, Unzipped Mods, Extra Files](sshot/002-BadMods.png)

### Missing Mods
![Missing Mods](sshot/003-MissingMods.png)

### Possible Conflicts
![Possible Conflicts](sshot/004-Conflicts.png)

### Inactive, Unused Mods
![Inactive, Unused Mods](sshot/005-InactiveMods.png)

### Active but Unused Mods
![Active but Unused Mods](sshot/006-UnusedMods.png)

__Note__: Screenshots report the size of most files as 14 Bytes because I've created a special test set of mods to trigger behavior that doesn't happen with my actual mod set.  The size will be correctly reported on your computer.

## Development Requirements

Needs the [lxml](https://lxml.de/installation.html) module installed

## Translation Effort

Sadly, the primary developer only understands English.  If you'd like to contribute a translation, and already know how gettext .pot/.po files work, check out the locale folder.  If not, you may find a web interface simpler: https://crowdin.com/project/fs19-mod-checker

## In-Progress Improvements

 * Create a short list of popular script-only mods and hide them from the "loaded but not used" list. (i.e. AutoDrive, Global Company, Course Play, etc.) [GitHub Issue #4](https://github.com/jtsage/FS19_Mod_Checker/issues/4)

 * Note some of the more popular mod conflicts and suggest avoiding them: [GitHub Issue #2](https://github.com/jtsage/FS19_Mod_Checker/issues/2)

 ## A short note about the EXE

 So, the exe file (the preferred method of running this) is essentially a miniaturized copy of python with all of the required libraries.  It has been reported in the past the EXE's built with this fantastic package can occasionally cause false positives in virus software.  As of this writing, it looks like it is all good - but that could potentially change for the worst.  As always, the source code is available to peruse at your leisure or run directly. (For the python initiated, this uses auto-py-to-exe to build, the configuration json file is included - of course you will need to update paths to build yourself)

 ### Developer Notes:

 i10n POT command: ```python C:\Python39\Tools\i18n\pygettext.py -d fs19modcheck -o locale/fs19modcheck.pot .\FS19_Mod_Checker.py .\lib\mod_checker_lib.py```
