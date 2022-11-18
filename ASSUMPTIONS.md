# Assumptions made that a mod is "good"

## File Name

File name must contain only [a-zA-Z0-9_], cannot must begin with [a-zA-Z].

We make no assumptions that files are case insensitive, although this is by default true on windows 10 - it's an extra hurdle to make a folder contain case sensitive files.  On mac, this is (probably) not the default, but appears to be available.  Either way, we don't check for this, and it would be an *excellent* way to shoot yourself in the foot.

## Collections

ZIP files that include the text "unzip" or "extract" (along with some translations of these terms) are *probably* collections that should be extracted

## Folders

Mods that are not zipped cannot be used in multiplayer

## Compression

Only readable ZIP files are valid - however, the Giants engine is more forgiving than most zip libraries - currently, we only warn if it soft-fails.

## Mod Contents

* a modDesc.xml is required, and must be parse-able
* a readable icon file is required
* the moddesc.descversion attribute must appear, and be 60+
* a mod version string must be present
* the "productid" tag should not be present (probably cracked DLC)

## Mod "working" concerns

There is really no way we can automate the test to see if a mod actually functions in game - this is to weed out the garbage from the high and low quality mods.
