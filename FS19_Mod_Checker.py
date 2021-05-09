#  _______           __ ______ __                __               
# |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
# |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
# |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

# Main Program

# (c) 2021 JTSage.  MIT License.

import tkinter as Tk
import tkinter.ttk as ttk
import os
import sys
import lib.mod_checker_lib as mod_checker_lib
import gettext

from mod_checker.ui.tree import ModCheckTreeTab
from mod_checker.ui.canvas import ModCheckCanvasTab



VERSION = "1.0.0.2"

changeables    = {
	"mainConfigFile" : "",
	"version"        : VERSION
}

# This might not be needed, python might just do this now.  But it probably 
# can't hurt.
if sys.platform.startswith('win'):
	import locale
	if os.getenv('LANG') is None:
		lang, enc = locale.getdefaultlocale()
		os.environ['LANG'] = lang

gettext.install('fs19modcheck', mod_checker_lib.resource_path("./locale"))

# 
#  _______ _______ _____ __   _      _  _  _ _____ __   _ ______   _____  _  _  _
#  |  |  | |_____|   |   | \  |      |  |  |   |   | \  | |     \ |     | |  |  |
#  |  |  | |     | __|__ |  \_|      |__|__| __|__ |  \_| |_____/ |_____| |__|__|
#                                                                                
# 

root = Tk.Tk()
root.title("FS19 Mod Checker v" + VERSION)
root.minsize(650, 500)

# Change the theme.
style = ttk.Style()
style.theme_use('winnative')

# Set up the top menubar
menubar = Tk.Menu(root)
filemenu = Tk.Menu(menubar, tearoff=0)
filemenu.add_command(label=_("Save Log"), command=mod_checker_lib.save_log)
filemenu.add_separator()
filemenu.add_command(label=_("Exit"), command=root.quit)

menubar.add_cascade(label=_("File"), menu=filemenu)


root.config(menu=menubar)

# Set a window icon
mainIconImage = Tk.PhotoImage(file = os.path.join(mod_checker_lib.resource_path("./lib/"), 'mcicon.png'))
root.iconphoto(False, mainIconImage)

# Set up the tab list in the main window
n = ttk.Notebook(root)

tabConfig   = ttk.Frame(n, padding=(9,9,9,9)) # Config Tab
tabBroken   = ttk.Frame(n, padding=(9,9,9,9)) # Broken Mods / Files Tab
tabMissing  = ttk.Frame(n, padding=(9,9,9,9)) # Missing Mods Tab
tabConflict = ttk.Frame(n, padding=(9,9,9,9)) # Conflicts Tab
tabInactive = ttk.Frame(n, padding=(9,9,9,9)) # Inactive Mods Tab
tabUnused   = ttk.Frame(n, padding=(9,9,9,9)) # Active but Unused Mods Tab
tabAbout    = ttk.Frame(n, padding=(9,9,9,9)) # About Tab

n.add(tabConfig,   underline=0, text=_('Configuration'))
n.add(tabBroken,   underline=0, text=_('Broken Mods'))
n.add(tabMissing,  underline=0, text=_('Missing Mods'))
n.add(tabConflict, underline=0, text=_('Possible Conflicts'))
n.add(tabInactive, underline=0, text=_('Inactive Mods'))
n.add(tabUnused,   underline=0, text=_('Active, Un-Used Mods'))
n.add(tabAbout,    text=_('About'))


n.enable_traversal()

n.pack(expand = 1, pady = 0, padx = 0, fill = "both")

root.update()



# 
#  _______  _____  __   _ _______ _____  ______      _______ _______ ______ 
#  |       |     | | \  | |______   |   |  ____         |    |_____| |_____]
#  |_____  |_____| |  \_| |       __|__ |_____|         |    |     | |_____]
#                                                                           
# 

tabConfig.columnconfigure(0, weight=1)
tabConfig.columnconfigure(1, minsize=root.winfo_width()/2)

ttk.Label(tabConfig, text=_("First, you need to point Mod Checker to your gameSettings.xml file") ).grid(column=0, columnspan=2, row=0, pady=6, sticky=(Tk.W,Tk.E))

loadButton = ttk.Button(tabConfig, text=_("Load Settings"), command=lambda: mod_checker_lib.load_main_config(changeables))
loadButton.grid(column=0, row=1, columnspan=2, sticky=(Tk.W,Tk.E))
loadButton.bind('<Return>', lambda event=None: loadButton.invoke())
loadButton.focus()

changeables["mainFileLabel"] = ttk.Label(tabConfig, text=_("Game Settings File: {filename}").format(filename = "[not set]") )
changeables["mainFileLabel"].grid(column=0, columnspan=2, row=2, pady=12, sticky=(Tk.W,Tk.E))

ttk.Label(tabConfig, text=_('Next, click "Check Mods" to scan your collection') ).grid(column=0, columnspan=2, row=3, pady=6, sticky=(Tk.W,Tk.E))

processButton = ttk.Button(tabConfig, text=_("Check Mods"), command=lambda: mod_checker_lib.process_files(changeables))
processButton.state(['disabled'])
processButton.grid(column=0, row=4, columnspan=2, pady=(0,40), sticky=(Tk.W,Tk.E))
processButton.bind('<Return>', lambda event=None: processButton.invoke())

changeables["processButton"] = processButton

ttk.Label(tabConfig, text=_("Mods Found")+":").grid(column=0, row=5, padx=(0,5), sticky=(Tk.E))
ttk.Label(tabConfig, text=_("Broken Mods")+":").grid(column=0, row=6, padx=(0,5), sticky=(Tk.E))
ttk.Label(tabConfig, text=_("Folders Found")+":").grid(column=0, row=7, padx=(0,5), sticky=(Tk.E))
ttk.Label(tabConfig, text=_("Missing Mods")+":").grid(column=0, row=8, padx=(0,5), sticky=(Tk.E))

changeables["modLabels"] = {
	"found"   : ttk.Label(tabConfig, text="0", font='Helvetica 18 bold'),
	"broke"   : ttk.Label(tabConfig, text="0", font='Helvetica 18 bold'),
	"folder"  : ttk.Label(tabConfig, text="0", font='Helvetica 18 bold'),
	"missing" : ttk.Label(tabConfig, text="0", font='Helvetica 18 bold')
}
changeables["modLabels"]["found"].grid(column=1, row=5, sticky=(Tk.W))
changeables["modLabels"]["broke"].grid(column=1, row=6, sticky=(Tk.W))
changeables["modLabels"]["folder"].grid(column=1, row=7, sticky=(Tk.W))
changeables["modLabels"]["missing"].grid(column=1, row=8, sticky=(Tk.W))

# 
#  ______   ______  _____  _     _ _______ __   _      _______  _____  ______  _______
#  |_____] |_____/ |     | |____/  |______ | \  |      |  |  | |     | |     \ |______
#  |_____] |    \_ |_____| |    \_ |______ |  \_|      |  |  | |_____| |_____/ ______|
#                                                                                     
# 
changeables["brokenTab"] = ModCheckCanvasTab(
	parent      = tabBroken,
	title       = _("Broken Mods"),
	description = _("These mods have been detected to be a possible problem.  ZIP Files or Folders with any non-alphanumeric character other than \"_\" will not be loaded by the game.  Mods that are not compressed as a ZIP file cannot be used in multiplayer games.  Finally, the mod folder should only contain mods, no other files.  Below, there is a list of problem files, and a suggested solution")
)



# 
#  _______ _____ _______ _______ _____ __   _  ______      _______  _____  ______  _______
#  |  |  |   |   |______ |______   |   | \  | |  ____      |  |  | |     | |     \ |______
#  |  |  | __|__ ______| ______| __|__ |  \_| |_____|      |  |  | |_____| |_____/ ______|
#                                                                                         
# 

changeables["missingTab"] = ModCheckTreeTab(
	parent = tabMissing,
	title  = _("Missing Mods"),
	description = _("The scanner failed to find the mods below, however they are referenced in one or more savegames. For mods that have not been purchased, this is usually harmless.  For mods you have purchased, missing the mod file could cost you in-game money.  To correct this, re-download the mod from where you originally got it and place it in the mod folder."),
	columns = [
		_("Name"),
		_("Title"),
		_("Purchased"),
		_("Savegame")
	],
	columnExtra = {
		"#3": {"minwidth": 0, "width": 75, "stretch": Tk.NO},
		"#4": {"minwidth": 0, "width":100, "stretch": Tk.NO}
	}
)


# 
#  _______  _____  __   _ _______        _____ _______ _______      _______  _____  ______  _______
#  |       |     | | \  | |______ |        |   |          |         |  |  | |     | |     \ |______
#  |_____  |_____| |  \_| |       |_____ __|__ |_____     |         |  |  | |_____| |_____/ ______|
#                                                                                                  
# 
changeables["conflictTab"] = ModCheckCanvasTab(
	parent      = tabConflict,
	title       = _("Possible Conflicts"),
	description = _("These mods were detected in your mod folder.  In some specific cases, they can cause conflicts with other mods, causing your game to either not work or behave strangely. This display is for informational purposes, and should not be taken a suggestion not to use anything listed here"),
	extraText   = [
		"\u2022 " + _("This should not be taken as a suggestion that these mods do not work."),
		"\u2022 " + _("This is also not intended as a slight against the mod or author."),
		"\u2022 " + _("Many (most) times these mods will work as intended."),
		"\u2022 " + _("If you do experience in-game problems, this may be a good place to start testing.")
	]
)


# 
#  _____ __   _ _______ _______ _______ _____ _    _ _______      _______  _____  ______  _______
#    |   | \  | |_____| |          |      |    \  /  |______      |  |  | |     | |     \ |______
#  __|__ |  \_| |     | |_____     |    __|__   \/   |______      |  |  | |_____| |_____/ ______|
#                                                                                                
# 

changeables["inactiveTab"] = ModCheckTreeTab(
	parent = tabInactive,
	title  = _("Inactive Mods"),
	description = _("These mods are not activated in any of your savegames.  If you would like to save space, and perhaps speed up FS19 starting, you could remove some or all of these."),
	columns = [
		_("Name"),
		_("Size"),
	],
	columnExtra = {
		"#2": {"minwidth": 0, "width":100, "stretch": Tk.NO, "anchor": "e"}
	}
)



# 
#  _     _ __   _ _     _ _______ _______ ______       _______  _____  ______  _______
#  |     | | \  | |     | |______ |______ |     \      |  |  | |     | |     \ |______
#  |_____| |  \_| |_____| ______| |______ |_____/      |  |  | |_____| |_____/ ______|
#                                                                                     
# 


changeables["unusedTab"] = ModCheckTreeTab(
	parent = tabUnused,
	title  = _("Active, Unused Mods"),
	description = _("These mods are active in a savegame, but do not seem to be in use. If you do not plan on using them, you could possible remove them.  Please note that some script only or pre-requisite mods may appear here by mistake, so please use this list carefully."),
	columns = [
		_("Name"),
		_("Title"),
		_("Savegame"),
		_("Size")
	],
	columnExtra = {
		"#3": {"minwidth": 0, "width":120, "stretch": Tk.NO},
		"#4": {"minwidth": 0, "width":100, "stretch": Tk.NO, "anchor": "e"}
	}
)



# 
#  _______ ______   _____  _     _ _______
#  |_____| |_____] |     | |     |    |   
#  |     | |_____] |_____| |_____|    |   
#                                         
# 

changeables["aboutTab"] = ModCheckCanvasTab(
	parent      = tabAbout,
	hideCanvas  = True,
	title       = _("About FS19 Mod Checker"),
	description = _("This little program will take a look at your mod install folder and inform you of the following:"),
	extraText   = [
		"\u2022 " + _("If a mod file is named incorrectly and won't load in the game."),
		"\u2022 " + _("If a mod is not properly zipped."),
		"\u2022 " + _("If a mod is used in your save games, but does not appear to be installed."),
		"\u2022 " + _("If a mod is not loaded or used in any of your save games"),
		"\u2022 " + _("If a mod is loaded but unused in your save games."),
		" ",
		_("This program only offers suggestions, no files on your computer will be altered"),
		" ",
		_("For the latest version, see https://github.com/jtsage/FS19_Mod_Checker")
	]
	
)


# 
#  _______ _______ _____ __   _              _____   _____   _____ 
#  |  |  | |_____|   |   | \  |      |      |     | |     | |_____]
#  |  |  | |     | __|__ |  \_|      |_____ |_____| |_____| |      
#                                                                  
# 

root.mainloop()
