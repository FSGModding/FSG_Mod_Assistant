<#
 _______           __ ______ __                __               
|   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
|       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
|__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  
                                              v1.0.0.0 by JTSage
#> 
param (
	[parameter(Mandatory=$false)][ValidateRange(0,20)][Int]$saveslot = 0,
	[string]$savepath       = "~\Documents\My` Games\FarmingSimulator2019\",
	[switch]$hideonlyload   = $false,
	[switch]$nolog          = $false,
	[switch]$quiet          = $false,
	[switch]$help           = $false
)


if ( $help ) {
	Write-Host "ModChecker v1.0.0.0"
	Write-Host "-------------------"
	Write-Host "Usage:"
	Write-Host " -savepath [Path to Save Files]  : Set path to save files"
	Write-Host " -saveslot [1-20]                : Look at a single save game, by slot number"
	Write-Host " -hideonlyload                   : Do not show mods that are active but potentially unused"
	Write-Host " -nolog                          : Do not write log file"
	Write-Host " -quiet                          : Do not print output to terminal"
	Write-Host " -help                           : Print this screen"
	exit 0
}

$Esc     = [char]0x1b 
$DANGER  = "$Esc[91mDANGER$Esc[0m:"
$ERRORF  = "$Esc[91mFATAL ERROR$Esc[0m:"
$WARNING = "$Esc[93mWARNING$Esc[0m:"
$SUGGEST = "$Esc[96mSUGGESTION$Esc[0m:"
$NOTICE  = "$Esc[92mNOTICE$Esc[0m:"
$sepLine = "   ---=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=---"


$LogFile = "FS19_Used_Mods_Log.txt"
if ( !$nolog ) { Set-Content $LogFile -value "" }

Function Writer {
	Param ([string]$outputString)
	# Write a line to the log file and/or screen
	if ( !$nolog ) { Add-content $LogFile -value ( $outputString -replace "$Esc\[\d+m" ) }
	if ( !$quiet ) { Write-Host $outputString }
}

# Check the given game path to see if we can find savefiles.
if (-Not (Test-Path -Path $savepath)) {
	Writer("$ERRORF Farming Simulator Save Files Not Found, Exiting.")
	exit 1
}

Writer( -join(
	" _______           __ ______ __                __               `n",
	"|   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.`n",
	"|       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|`n",
	"|__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  `n",
	"                                              v1.0.0.0 by JTSage`n",
	$sepLine, "`n",
	"$Esc[93mNOTE$Esc[0m: This script does not in any way alter your mods or your`n",
	"save game. To correct any problems found, you must manually`n",
	"follow the suggestions below.`n",
	$sepLine
) )

if ( !$nolog -And !$quiet ) { Write-Host "Output saved to $logFile`n$sepLine" }

# Set up the default paths to all of the things we need to read

#(if ( $saveslot -eq 0 ) { "*" } else { $saveslot })

$GamePaths = @{
	gameSettings = -join($savepath, "gameSettings.xml");
	vehicles     = -join($savepath, "savegame", $(if ( $saveslot -eq 0 ) { "*" } else { $saveslot }), "\vehicles.xml");
	career       = -join($savepath, "savegame", $(if ( $saveslot -eq 0 ) { "*" } else { $saveslot }), "\careerSavegame.xml");
	items        = -join($savepath, "savegame", $(if ( $saveslot -eq 0 ) { "*" } else { $saveslot }), "\items.xml");
	modDir       = -join($savepath, "mods\");
	modZip       = -join($savepath, "mods\*.zip");
}

# In case mod path has been overridden, we need to grab the new one
Select-Xml -Path $GamePaths.gameSettings -XPath '/gameSettings/modsDirectoryOverride' |
	ForEach-Object { 
		if ( $_.Node.active -eq "true" ) { 
			$GamePaths.modDir = $_.Node.directory
			$GamePaths.modZip = -join($_.Node.directory, "\*.zip")
		}
	}


# Load those mods we know wont ever show a "used" status
$scriptOnlyMods = Get-Content .\KnownScriptOnlyMods.txt | Select-Object -skip 2

# Load those mods we know sometimes cause conflicts.
$knownConflicts = Get-Content KnownConflicts.json | ConvertFrom-Json

<# Create our mod list stucture.
Internal = @{
	type    = [zip/folder]
	file    = boolean (file name ok?)
	missing = boolean (file exists?)
	loaded  = boolean (in careerSavegame?)
	used    = boolean (purchased in-game?)
	name    = String
}
#> 

$ModList = @{}

# This is a special case, just add it for simplicity.
$ModList["FS19_holmerPack"] = @{
	type    = "zip";
	file    = $true;
	missing = $false;
	loaded  = $false;
	used    = $false;
	name    = "DLC Holmer Terra-Varient Pack"
}

$statusFlags = @{
	badFile     = $false;
	missingFile = $false;
	garbageFile = $false;
	modsMissing = 0;
}

<#
 oooooooooo.                 .             
 `888'   `Y8b              .o8             
  888      888  .oooo.   .o888oo  .oooo.   
  888      888 `P  )88b    888   `P  )88b  
  888      888  .oP"888    888    .oP"888  
  888     d88' d8(  888    888 . d8(  888  
 o888bood8P'   `Y888""8o   "888" `Y888""8o 
#>
# First, lets warn if there is any "cruft" in the mods folder.  That would be any file that
# does not have a zip extension

Get-ChildItem $GamePaths.modDir -Exclude "*.zip" |
	Where-Object { !$_.PSIsContainer } |
	ForEach-Object {
		$statusFlags.garbageFile = $true
		Writer(-join("$DANGER Garbage found: `"", $_.fullName, "`"" ))
	}

if ( $statusFlags.garbageFile ) { 
	Writer("$SUGGEST Remove extra files from the mods folder, they only cause confusion")
	Writer("$SUGGEST These are typically the result of improperly extracting a mod file")
	Writer($sepLine) }

# Next, lets look at the zip files in the mods folder.  This will populate our list.

# Find all zipped mods. Note any that have broken names for a bit later.
Get-ChildItem $GamePaths.modZip |
	Where-Object { !$_.PSIsContainer} | 
	ForEach-Object {
		$realName = $_.name.TrimEnd(".zip")
		$modStatus = $true
		
		if ( $realName -match '\W' -or  $realName -match '^[0-9].+' ) {
			$modStatus = $false
			$statusFlags.badFile = $true
		}

		$ModList[$realName] = @{
			type    = "zip";
			file    = $modStatus;
			missing = $false;
			loaded  = $false;
			used    = $false;
			name    = $false;
		}
	}

# Find all unzipped mods. Note any that have broken names for a bit later.  And note they are folders.
Get-ChildItem -Directory $GamePaths.modDir |
	Where-Object { $_.PSIsContainer} | 
	ForEach-Object {
		$realName = $_.name
		$modStatus = $true
		
		if ( $realName -match '\W' -or  $realName -match '^[0-9].+' ) {
			$modStatus = $false
			$statusFlags.badFile = $true
		}

		$ModList[$realName] = @{
			type    = "folder";
			file    = $modStatus;
			missing = $false;
			loaded  = $false;
			used    = $false;
			name    = $false;
		}
	}

$saveGameVehicles = Get-ChildItem $GamePaths.vehicles |
	Where-Object { !$_.PSIsContainer} | 
	ForEach-Object { $_.FullName }

$saveGameCareer = Get-ChildItem $GamePaths.career |
	Where-Object { !$_.PSIsContainer} | 
	ForEach-Object { $_.FullName }

$saveGameItems = Get-ChildItem $GamePaths.items |
	Where-Object { !$_.PSIsContainer} | 
	ForEach-Object { $_.FullName }

foreach ( $thisCareerFile in $saveGameCareer ) {
	Select-Xml -Path $thisCareerFile -XPath '/careerSavegame/mod' |
		ForEach-Object { 
			$thisModName = $_.Node.modName
			$thisTitle = $_.Node.title
			if ( !$thisModName -Or $thisModName -match '^pdlc' ) {
				return # Skip DLC and Blanks
			} 

			if ( $ModList.ContainsKey($thisModName) ) {
				$ModList[$thisModName]["loaded"] = $true
				$ModList[$thisModName]["name"]   = $thisTitle
			} else {
				$statusFlags.missingFile = $true
				$statusFlags.modsMissing += 1
				
				$ModList[$thisModName] = @{
					type    = "zip";
					file    = $true;
					missing = $true;
					loaded  = $true;
					used    = $false;
					name    = $thisTitle;
				}
			}
		}
}


foreach ( $thisItemFile in $saveGameItems ) {
	Select-Xml -Path $thisItemFile -XPath '/items/item' |
		ForEach-Object { 
			$thisModName = $_.Node.modName
			if ( !$thisModName -Or $thisModName -match '^pdlc' ) {
				return # Skip DLC and Blanks
			}

			if ( $modList.ContainsKey($thisModName) ) {
				$modList[$thisModName]["used"] = $true
			}
		}
}

foreach ( $thisVehicleFile in $saveGameVehicles ) {
	Select-Xml -Path $thisVehicleFile -XPath '/vehicles/vehicle' |
		ForEach-Object { 
			$thisModName = $_.Node.modName
			if ( !$thisModName -Or $thisModName -match '^pdlc' ) {
				return # Skip DLC and Blanks
			}

			if ( $modList.ContainsKey($thisModName) ) {
				$modList[$thisModName]["used"] = $true
			}
		}
}

# Set the used flag on known script only mods.  Saves having to check later.
foreach ( $thisKnownMod in $scriptOnlyMods ) {
	if ( $modList.ContainsKey($thisKnownMod) -And $modList[$thisKnownMod]["loaded"] -eq $true ) {
		$modList[$thisKnownMod]["used"] = $true
	}
}


if ( $statusFlags.badFile ) { Writer("$DANGER You have incorrectly named mods.`n  Incorrectly named mod will not load into the game. They are listed below.`n$sepLine") }
if ( $statusFlags.missingFile ) { Writer("$DANGER You have missing mods.`n  Missing mods are mods that are either active or used in a`n  save game that no longer exist in the mods folder. They`n  are listed below.`n$sepLine" ) }


<#
 ooooooooo.                                               .            
 `888   `Y88.                                           .o8            
  888   .d88'  .ooooo.  oo.ooooo.   .ooooo.  oooo d8b .o888oo  .oooo.o 
  888ooo88P'  d88' `88b  888' `88b d88' `88b `888""8P   888   d88(  "8 
  888`88b.    888ooo888  888   888 888   888  888       888   `"Y88b.  
  888  `88b.  888    .o  888   888 888   888  888       888 . o.  )88b 
 o888o  o888o `Y8bod8P'  888bod8P' `Y8bod8P' d888b      "888" 8""888P' 
                         888                                           
                        o888o                                          
#>




# Fist up, bad files, of the zip variety.

$foundOne = $false;

$modList.keys | 
	Where-Object { !$modList[$_].file -And $modList[$_].type -eq "zip" } |
	ForEach-Object {
		$thisName = $_
		$searchName = $false;

		if ( $foundOne ) { Writer("") } else { $foundOne = $true }
		
		Writer('{0} "{1}.zip" breaks naming conventions and will not be loaded.' -f $DANGER, $_)

		if ( $thisName -Match '^\d+\w+' ) {
			$searchName = $thisName -Replace '^\d+(\w+?)', '$1'
		}
		if ( $thisName -Match '^\w+? \(\d+\)' ) { # "Mod_Name (1).zip" etc
			$searchName = $thisName -Replace '^(\w+?) \(\d+\)', '$1'
		}
		if ( $thisName -Match '^\w+? - .+' ) { # "Mod_Name - Copy.zip" etc
			$searchName = $thisName -Replace '^(\w+?) - .+', '$1'
		}

		if ( $searchName -And $modList.Contains($searchName) ) {
			Writer("  {0} `"{1}`" already exists, you should delete this file." -f $SUGGEST, $searchName)
		} else {
			Writer("  {0} good duplicate not found, you should rename this file. (`"{1}.zip`"?)" -f $SUGGEST, $searchName)
		}
}

# Next up, bad folders

$modList.keys | 
	Where-Object { !$modList[$_].file -And $modList[$_].type -eq "folder" } |
	ForEach-Object {
		$thisName = $_
		$searchName = $false;

		if ( $foundOne ) { Writer("") } else { $foundOne = $true }
		
		Writer('{0} "{1}" breaks naming conventions and will not be loaded.' -f $DANGER, $_)

		if ( $thisName -Match '^\d+\w+' ) {
			$searchName = $thisName -Replace '^\d+(\w+?)', '$1'
		}
		if ( $thisName -Match '^\w+? \(\d+\)' ) { # "Mod_Name (1)" etc
			$searchName = $thisName -Replace '^(\w+?) \(\d+\)', '$1'
		}
		if ( $thisName -Match '^\w+? - .+' ) { # "Mod_Name - Copy" etc
			$searchName = $thisName -Replace '^(\w+?) - .+', '$1'
		}

		if ( $searchName -And $modList.Contains($searchName) ) {
			Writer("  {0} `"{1}`" already exists, you should delete this folder." -f $SUGGEST, $searchName)
		} else {
			Writer("  {0} good duplicate not found, you should rename this folder. (`"{1}`"?)" -f $SUGGEST, $searchName)
		}
		Writer("  {0} Additionally, unzipped mods cannot be used in multiplayer - you should zip this" -f $SUGGEST)
}

# Finally, regular folders.  Suggest they get zipped up.
$modList.keys | 
	Where-Object { $modList[$_].file -And $modList[$_].type -eq "folder" } |
	ForEach-Object {
		if ( $foundOne ) { Writer("") } else { $foundOne = $true }
		
		Writer('{0} "{1}" is an unzipped folder.' -f $WARNING, $_)
		Writer("  {0} Unzipped mods cannot be used in multiplayer - you should zip this" -f $SUGGEST)
}

if ( !$foundOne ) { Writer("$NOTICE your mods folder is clean of mis-named / broken mod files") }


# Missing mods that are used (these can cost you money if you start the save)
$foundOne = $false;
$modList.keys | 
	Where-Object { $modList[$_].missing -And $modList[$_].used } |
	Sort-Object |
	ForEach-Object {
		if ( !$foundOne ) {
			Writer("$sepLine`n$DANGER Missing mods that are active and used / placed / purchased")
			$foundOne = $true;
		}
		Writer("  {0} ({1})" -f $_, $modList[$_].name)
	}

if ( $foundOne ) { Writer("$SUGGEST Re-install these mods before starting the save game(s) that use them`n$SUGGEST Failure to do so could cost you in-game money.") }

# Missing mods that are not used (these are unlikely to cost you money)
$foundOne = $false;
$modList.keys | 
	Where-Object { $modList[$_].missing -And !$modList[$_].used } |
	Sort-Object |
	ForEach-Object {
		if ( !$foundOne ) {
			Writer("$sepLine`n$WARNING Missing mods that are active and NOT used / placed / purchased")
			$foundOne = $true;
		}
		Writer("  {0} ({1})" -f $_, $modList[$_].name)
	}

if ( $foundOne ) { Writer("$SUGGEST Re-install these mods before starting the save game(s) that use them.`n$SUGGEST Opening the save game without re-install will remove them from this list.`n$SUGGEST These mods are unlikely to cost you in-game money.") }


# Lets talk about known conflicts here.
$foundOne = $false

foreach ($thisProperty in $knownConflicts.PSObject.Properties) {
	if ( $modList.Contains($thisProperty.Name) ) {
		if ( !$foundOne ) {
			Writer("$sepLine`n$WARNING Potential conflict found in your mod list")
			$foundOne = $true;	
		}

		Writer(-join("`n{0} `"{1}`" mod found - possible conflict" -f $NOTICE, $thisProperty.Name ))
		Writer(-join("  {0} {1}" -f $SUGGEST, $thisProperty.Value))
	}
}
if ( $foundOne ) {
	Writer("`n$SUGGEST This should not be taken as a suggestion that these mods do not work.")
	Writer("$SUGGEST This is also not intended as a slight against the mod or author.")
	Writer("$SUGGEST Many (most) times these mods will work as intended.")
	Writer("$SUGGEST If you do experience in-game problems, this may be a good place to start testing.")
}


# Mods that are neither loaded or used.
$foundOne = $false;
$modList.keys | 
	Where-Object { $modList[$_].file -And !$modList[$_].used -And !$modList[$_].loaded } |
	Sort-Object |
	ForEach-Object {
		if ( !$foundOne ) {
			Writer("$sepLine`n$NOTICE These mods are not active in {0}." -f $(if ( $saveslot -eq 0 ) { "any savegame" } else { "savegame #$saveslot" }))
			$foundOne = $true;
		}
		Writer("  {0}" -f $_)
	}
	if ( $foundOne ) { Writer("$SUGGEST You could free up some space by getting rid of any of these you won't use.") }


#Mods that are loaded but seemingly not used.  Most margin for error here.
if ( !$hideonlyload ) {
	$foundOne = $false;
	$modList.keys | 
		Where-Object { $modList[$_].file -And !$modList[$_].missing -And !$modList[$_].used -And $modList[$_].loaded } |
		Sort-Object |
		ForEach-Object {
			if ( !$foundOne ) {
				Writer("$sepLine`n$NOTICE These mods are active, but NOT used / placed / purchased in {0}." -f $(if ( $saveslot -eq 0 ) { "any savegame" } else { "savegame #$saveslot" }))
				$foundOne = $true;
			}
			Writer("  {0} ({1})" -f $_, $modList[$_].name)
		}
		if ( $foundOne ) { 
			Writer("$SUGGEST You could free up some space by getting rid of any of these you won't use.")
			Writer("$SUGGEST Do so carefully, script only mods and pre-requisites can appear here by mistake.")
		}
}


$today = Get-Date
Writer($sepLine)
Writer("$NOTICE Report created at: $today")
Writer("$NOTICE Savegame: {0}" -f $(if ( $saveslot -eq 0 ) { "all" } else { "#$saveslot" }) )
Writer("$NOTICE Data Folder: {0}" -f $savepath)
Writer("$NOTICE Mods Folder: {0}" -f $GamePaths.modDir)
Writer("$NOTICE Mods Referenced / Found: {0} ({1} are missing)" -f $ModList.count, $statusFlags.modsMissing)
Writer($sepLine)

pause
