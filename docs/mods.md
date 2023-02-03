# FSG Mod Assistant - Collection Area

[← Back to main](index.html)

## Overview

The mod collection area is the main informational center of Mod Assistant.  Here you can view, select and process your mod collections.

![multi](img/collect-001.png)

### A Valid Mod

This is a valid, working mod entry

![valid](img/collect-002.png)

### An Invalid Mod

This is a broken mod (in fact, it's an audio file).  Note the title, author, version, and size are all omitted.

![invalid](img/collect-003.png)

## Information Displayed

In this section you will see several data items:

- Context color - red is broken, green is selected.
- the "Short Name" of the mod, which is derived from the file name without the `.ZIP` extension
- The mod title
- The mod author
- The mod version
- The mod size
- Any number of status tags or badges

## The Tags (Badges)

- __Depend__ : This mod has un-met dependencies.
- __Keys__ : This mod contains added key bindings.  When green, these keybinds do not conflict with another mod in the collection.  When red, they appear to conflict (although, in some cases this is fine - but if you can't use a mod, this could provide a helpful clue as to why)
- __Update__ : The version of the mod you have does not match the version on modhub
- __New__ : This file has been added to this collection since the last scan
- __Recent__ : This mod has recently been updated or released on the modHub
- __nonModHub__ : This mod wasn't found on ModHub, it is probably a 3rd party mod.
- __NotMOD__ : This file is not a mod
- __Broken__ : This mod is likely broken
- __Issue__ : This mod may have non game breaking issues
- __noMP__ : This mod can't be used for multiplayer
- __Folder__ : This mod is unzipped
- __PC__ : This mod contains scripts, and will only work on PC/Mac.  Once in a while a modder may leave an extra script in a crossplay mod, but Mod Assistant is unable to detect if this is the case.

__Special Note:__ - The Issue badge is based on all the possible issues we know about, _including_ those that the Giants Server software reports - some of those issues are easily ignorable, and in fact do not pose a problem to a mod being included on the modhub.  However, for completeness, they are displayed by Mod Assistant.

## Selecting Items and Mouse Actions

There are quick selection buttons on the right side of the interface.  The number in white is the number of mods currently selected.

![Alt text](img/collect-005.png)

### Keyboard Shortcuts

- `CTRL`+`A` Select All
- `CTRL`+`SHIFT`+`A` Select None
- `CTRL`+`I` Select Inverse

### Primary Button

- `LEFT CLICK` a mods to select it

- `LEFT CLICK` a mod, then `SHIFT`+`LEFT CLICK` a second mod to select a range

- `LEFT CLICK`(x2) a mod to open it's details page

- `ALT`+`LEFT CLICK` a mod to set that mod as the "active" one for the `Open in Explorer` and `Find on ModHub` interface buttons

### Secondary Button

- `RIGHT CLICK` a mod will to display a context menu where you can carry out most operations on that single mod

![Alt text](img/collect-004.png)
