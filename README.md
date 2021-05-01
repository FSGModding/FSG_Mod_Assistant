# FS19 Mod Install Checker

This little script will take a look at your mod install folder and inform you of the following

 * If a mod file is named incorrectly and won't load in the game.
 * If a mod is not properly zipped.
 * If a mod is used in your savegames, but does not appear to be installed.
 * If a mod is not loaded or used in any of your savegames
 * Optionally: If a mod is loaded but unused in your savegames.

 ## Usage:

 From the command line, execute the script

 ```
 C:\ > ./FS19_Mod_Checker.ps1
 ```

## Output

The output is both shown in the terminal, and saved to a log file in the same folder, ```FS19_Used_Mods.log```

## What this does

This script provides information only.  It does not alter any files on your computer at all (except for adding it's own log file)

## Options

The ```showonlyloaded``` argument will show mods that are loaded (active) in your savegame but do not appear to be used.  Note that there will be a bunch of false positives in this list - any script only mod, or vehicle add on, or pre-requisite script for another mod may appear on this list.  Be careful with what you remove.

 ```
 C:\ > ./FS19_Mod_Checker.ps1 -showonlyloaded
 ```

## Requirements

Windows powershell.  Sorry Mac users, maybe someday.

# Sample output

![Sample Terminal](CommandOutput.png)

[Log file with bad mods](FS19_Sample_Log.txt)

[Log file with no bad mods](FS19_Sample_Log_Clean.txt)

# Planned Improvements

 * Better suggestions for renaming/deleting bad mods based off of other files in folder.
 * Create a short list of popular script-only mods and hide them from the "loaded but not used" list. (i.e. AutoDrive, Global Company, Courseplay, etc.)