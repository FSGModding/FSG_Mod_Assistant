#  _______           __ ______ __                __               
# |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
# |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
# |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

# Main Program

# (c) 2021 JTSage.  MIT License.
#
# GetText:
# python C:\Python39\Tools\i18n\pygettext.py -d fs19modcheck -o locale/fs19modcheck.pot .\FS19_Mod_Checker.py

import gettext
import tkinter as Tk
import tkinter.ttk as ttk

from src.ui.tree import ModCheckTreeTab
from src.ui.canvas import ModCheckCanvasTab
from src.ui.detail import ModCheckDetailWin
from src.data.logger import ModCheckLog
from src.base import ModCheckRoot
from src.updater import ModCheckUpdater
from src.data.mods import FSMod
from src.data.badfile import FSBadFile

import src.data.conflict_mods as conflictMods
import src.data.script_mods as scriptMods
import src.data.util as ModCheckUtil


VERSION = "1.0.0.6"


#         _______ __   _  ______       _____  _____ _______ _     _ _______  ______
#  |      |_____| | \  | |  ____      |_____]   |   |       |____/  |______ |_____/
#  |_____ |     | |  \_| |_____|      |       __|__ |_____  |    \_ |______ |    \_
#                                                                                  

langPick = Tk.Tk()
langPick.title("FS19 Mod Checker v" + VERSION)
langPick.minsize(350, 150)

# Change the theme.
style = ttk.Style()
style.theme_use('winnative')

ttk.Label(langPick, text="Choose Language", font='Helvetica 15 bold', anchor='center').pack(fill='x', pady=(5,0))
userLang = Tk.StringVar()

langPicker = ttk.Combobox(langPick, textvariable=userLang)
langPicker['values'] = ModCheckUtil.get_lang_list()
langPicker.state(["readonly"])
langPicker.current(0)
langPicker.pack(fill='x', padx=20, pady=20)

langButton = ttk.Button(langPick, text="OK", command=lambda langWindow = langPick: makeRootWindow(langWindow))
langButton.pack(fill='x', padx=20)
langButton.bind('<Return>', lambda event=None: langButton.invoke())
langButton.focus()


# 
#  _______ _______ _____ __   _      _  _  _ _____ __   _ ______   _____  _  _  _
#  |  |  | |_____|   |   | \  |      |  |  |   |   | \  | |     \ |     | |  |  |
#  |  |  | |     | __|__ |  \_|      |__|__| __|__ |  \_| |_____/ |_____| |__|__|
#                                                                                
# 
def makeRootWindow(langWindow) :
	langWindow.destroy()

	# Lets do i10n for this app.
	thisUserLang = ModCheckUtil.get_lang_code(userLang.get())
	ModCheckUtil.set_locale(thisUserLang)
	garbageMod = FSMod()
	garbageMod.setLangCode(thisUserLang)
	del garbageMod

	gtUserLang = gettext.translation('fs19modcheck', ModCheckUtil.get_resource_path("./locale"), languages=[thisUserLang], fallback=True)
	gtUserLang.install()

	rootWindow = ModCheckRoot(
		version      = VERSION,
		logger       = ModCheckLog(),
		icon         = ModCheckUtil.get_resource_path("./icon/") + 'mcicon.png',
		modClass     = FSMod,
		badClass     = FSBadFile,
		scriptMods   = scriptMods.mods,
		conflictMods = conflictMods.mods,
		updater      = ModCheckUpdater
	)

	rootWindow.makeMenuBar({
		"file-menu"     : _("File"),
		"save-log-file" : _("Save Log"),
		"exit-program"  : _("Exit")
	})

	
	# These strings are used in lots of places.  Hopefully they are somewhat clear.
	rootWindow.addIOStrings({
		"error-open-settings" : _("Error Opening Settings File {filename}"),
		"error-not-settings"  : _("This is not a valid FS19 game settings file"),
		"xml-file-type"       : _("XML Settings File"),
		"txt-file-type"       : _("Text Document"),
		"YES"                 : _("YES"),
		"no"                  : _("no"),
		"OWNED"               : _("OWNED"),
		"save-log-title"      : _("Save Log File..."),
		"save-log-ok"         : _("Log File Saved Successfully"),
		"save-log-error"      : _("Unable to save the log file"),
		"save-log-filename"   : _("FS19_Mod_Checker_Log.txt"),
		
		"size-on-disk"        : _("Size on disk"),
		"active-in"           : _("Mod Active In Savegame(s)"),
		"used-in"             : _("Mod Used In Savegame(s)"),
		"ok-button-label"     : _("OK"),
		"type-zip-file"       : _("ZIP File"),
		"type-folder"         : _("Folder"),
		"type-missing"        : _("Mod is Missing"),
		"type-title"          : _("Mod Type")
	})



	#  _______  _____  __   _ _______ _____  ______      _______ _______ ______ 
	#  |       |     | | \  | |______   |   |  ____         |    |_____| |_____]
	#  |_____  |_____| |  \_| |       __|__ |_____|         |    |     | |_____]
	#                                                                           

	rootWindow.addTab("tabConfig",   underline=0, text=_('Configuration'))

	# These strings are used on the config tab exclusively
	rootWindow.makeConfigTab(strings = {
		"info-ask-for-file"    : _("First, you need to point Mod Checker to your gameSettings.xml file"),
		"load-button-label"    : _("Load Settings"),
		"info-game-settings"   : _("Game Settings File: {filename}"),
		"info-mod-folder"      : _("Mod Folder: {folder}"),
		"info-ask-process"     : _("Next, click \"{process_button_label}\" to scan your collection"),
		"process-button-label" : _("Check Mods"),
		"info-mods-found"      : _("Mods Found"),
		"info-mods-broken"     : _("Broken Mods"),
		"info-mods-folders"    : _("Folders Found"),
		"info-mods-missing"    : _("Missing Mods"),
		"program-description"  : _("This little program will take a look at your mod install folder and inform you of any potential problems that it finds."),
		"latest-version"       : _("For the latest version, visit us at")
	})




	#  ______   ______  _____  _     _ _______ __   _      _______  _____  ______  _______
	#  |_____] |_____/ |     | |____/  |______ | \  |      |  |  | |     | |     \ |______
	#  |_____] |    \_ |_____| |    \_ |______ |  \_|      |  |  | |_____| |_____/ ______|
	#                                                                                     

	rootWindow.addTab("tabBroken",   underline=0, text=_('Broken Files'))

	rootWindow.tabContent["tabBroken"] = ModCheckCanvasTab(
		parent      = rootWindow.tabFrame["tabBroken"],
		title       = _("Broken Mods"),
		description = _("These mods have been detected to be a possible problem.  ZIP Files or Folders with any non-alphanumeric character other than \"_\" will not be loaded by the game.  Mods that are not compressed as a ZIP file cannot be used in multiplayer games.  Finally, the mod folder should only contain mods, no other files.  Below, there is a list of problem files, and a suggested solution")
	)

	# These strings describe the nature of how a mod is broken
	rootWindow.addBrokenStrings({
		"default"         : _("This File or Folder is invalid, and we have no idea why.  If you have time, please send the file to the developer so we can catch this case in the future. jtsage+fsmodcheck@gmail.com"),
		"unzip-folder"    : _("This folder appears to be the contents of a zipped modpack.  The contents should be moved into the main mods folder, and this folder removed"),
		"unzip-zipfile"   : _("This file appears to be a zipped modpack.  The contents should be extracted to the main mod folder, and this file removed."),
		"digit-folder"    : _("Mod Folders cannot start with a digit.  This is a valid mod with a bad name"),
		"digit-zipfile"   : _("Zip files cannot start with a digit.  This is a valid mod with a bad name"),
		"duplicate-have"  : _("This looks like a copy of the {guessedModName} mod and can probably be deleted."),
		"duplicate-miss"  : _("This looks like a copy, but the original wasn't found. Rename it?"),
		"unknown-folder"  : _("This valid mod folder is named incorrectly, but we didn't figure out what is wrong."),
		"unknown-zipfile" : _("This valid mod ZIP file is named incorrectly, but we didn't figure out what is wrong."),
		"must-be-zipped"  : _("Unzipped mods cannot be used in multiplayer, you should zip this folder"),
		"garbage-default" : _("This file should not exist here, delete or move it."),
		"garbage-archive" : _("This is an archive file.  It might be a mod pack which should be unpacked and then removed."),
		"folder-not-mod"  : _("This folder shouldn't be here, it is not a valid mod."),
		"zipfile-not-mod" : _("This zip file is not a mod. It might be a modpack. (unzip it?)"),
		"invalid-zipfile" : _("This zip file is not readable.  Delete this"),
	})



	#  _______  _____  __   _ _______        _____ _______ _______      _______  _____  ______  _______
	#  |       |     | | \  | |______ |        |   |          |         |  |  | |     | |     \ |______
	#  |_____  |_____| |  \_| |       |_____ __|__ |_____     |         |  |  | |_____| |_____/ ______|
	#                                                                                                  

	rootWindow.addTab("tabConflict", underline=0, text=_('Conflicts'))

	rootWindow.tabContent["tabConflict"] = ModCheckCanvasTab(
		parent      = rootWindow.tabFrame["tabConflict"],
		title       = _("Possible Conflicts"),
		description = _("These mods were detected in your mod folder.  In some specific cases, they can cause conflicts with other mods, causing your game to either not work or behave strangely. This display is for informational purposes, and should not be taken a suggestion not to use anything listed here"),
		extraText   = [
			"\u2022 " + _("This should not be taken as a suggestion that these mods do not work."),
			"\u2022 " + _("This is also not intended as a slight against the mod or author."),
			"\u2022 " + _("Many (most) times these mods will work as intended."),
			"\u2022 " + _("If you do experience in-game problems, this may be a good place to start testing.")
		]
	)


	#  _______ _____ _______ _______ _____ __   _  ______      _______  _____  ______  _______
	#  |  |  |   |   |______ |______   |   | \  | |  ____      |  |  | |     | |     \ |______
	#  |  |  | __|__ ______| ______| __|__ |  \_| |_____|      |  |  | |_____| |_____/ ______|
	#                                                                                         

	rootWindow.addTab("tabMissing",  underline=0, text=_('Missing Mods'))

	rootWindow.tabContent["tabMissing"] = ModCheckTreeTab(
		parent = rootWindow.tabFrame["tabMissing"],
		title  = _("Missing Mods"),
		description = _("The scanner failed to find the mods below, however they are referenced in one or more savegames. For mods that have not been purchased, this is usually harmless.  For mods you have purchased, missing the mod file could cost you in-game money.  To correct this, re-download the mod from where you originally got it and place it in the mod folder."),
		columns = [
			_("Name"),
			_("Title"),
			_("Purchased"),
			_("Savegame")
		],
		base = rootWindow,
		detail = ModCheckDetailWin,
		columnExtra = {
			"#3": {"minwidth": 0, "width": 75, "stretch": 0},
			"#4": {"minwidth": 0, "width":100, "stretch": 0}
		}
	)








	#  _____ __   _ _______ _______ _______ _____ _    _ _______      _______  _____  ______  _______
	#    |   | \  | |_____| |          |      |    \  /  |______      |  |  | |     | |     \ |______
	#  __|__ |  \_| |     | |_____     |    __|__   \/   |______      |  |  | |_____| |_____/ ______|
	#                                                                                                

	rootWindow.addTab("tabInactive", underline=0, text=_('Inactive Mods'))

	rootWindow.tabContent["tabInactive"] = ModCheckTreeTab(
		parent = rootWindow.tabFrame["tabInactive"],
		title  = _("Inactive Mods"),
		description = _("These mods are not activated in any of your savegames.  If you would like to save space, and perhaps speed up FS19 starting, you could remove some or all of these."),
		columns = [
			_("Name"),
			_("Size"),
		],
		base = rootWindow,
		detail = ModCheckDetailWin,
		columnExtra = {
			"#2": {"minwidth": 0, "width":100, "stretch": 0, "anchor": "e"}
		}
	)



	#  _     _ __   _ _     _ _______ _______ ______       _______  _____  ______  _______
	#  |     | | \  | |     | |______ |______ |     \      |  |  | |     | |     \ |______
	#  |_____| |  \_| |_____| ______| |______ |_____/      |  |  | |_____| |_____/ ______|
	#                                                                                     

	rootWindow.addTab("tabUnused",   underline=0, text=_('Active & Un-Used Mods'))

	rootWindow.tabContent["tabUnused"] = ModCheckTreeTab(
		parent = rootWindow.tabFrame["tabUnused"],
		title  = _("Active, Un-Used Mods"),
		description = _("These mods are active in a savegame, but do not seem to be in use. If you do not plan on using them, you could possibly remove them.  Please note that some script only or pre-requisite mods may appear here by mistake, so please use this list carefully."),
		columns = [
			_("Name"),
			_("Title"),
			_("Savegame"),
			_("Size")
		],
		base = rootWindow,
		detail = ModCheckDetailWin,
		columnExtra = {
			"#3": {"minwidth": 0, "width":120, "stretch": 0},
			"#4": {"minwidth": 0, "width":100, "stretch": 0, "anchor": "e"}
		}
	)



	#   ______  _____   _____  ______       _______  _____  ______  _______
	#  |  ____ |     | |     | |     \      |  |  | |     | |     \ |______
	#  |_____| |_____| |_____| |_____/      |  |  | |_____| |_____/ ______|
	#                                                                      

	rootWindow.addTab("tabGood",   underline=0, text=_('Good Mods'))

	rootWindow.tabContent["tabGood"] = ModCheckTreeTab(
		parent = rootWindow.tabFrame["tabGood"],
		title  = _("Good Mods"),
		description = _("These mods are active and used in a savegame, and in good working order.  They are listed here for convenience, you do not need to do anything with these mods."),
		columns = [
			_("Name"),
			_("Title"),
			_("Savegame"),
			_("Size")
		],
		base = rootWindow,
		detail = ModCheckDetailWin,
		columnExtra = {
			"#3": {"minwidth": 0, "width":120, "stretch": 0},
			"#4": {"minwidth": 0, "width":100, "stretch": 0, "anchor": "e"}
		}
	)







#  _______ _______ _____ __   _              _____   _____   _____ 
#  |  |  | |_____|   |   | \  |      |      |     | |     | |_____]
#  |  |  | |     | __|__ |  \_|      |_____ |_____| |_____| |      
#                                                                  

Tk.mainloop()
