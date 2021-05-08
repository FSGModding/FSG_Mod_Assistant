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

helpmenu = Tk.Menu(menubar, tearoff=0)
helpmenu.add_command(label=_("About"), command=lambda: about())

menubar.add_cascade(label=_("File"), menu=filemenu)
menubar.add_cascade(label=_("Help"), menu=helpmenu)

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

n.add(tabConfig,   underline=0, text=_('Configuration'))
n.add(tabBroken,   underline=0, text=_('Broken Mods'))
n.add(tabMissing,  underline=0, text=_('Missing Mods'))
n.add(tabConflict, underline=0, text=_('Possible Conflicts'))
n.add(tabInactive, underline=0, text=_('Inactive Mods'))
n.add(tabUnused,   underline=0, text=_('Active, Un-Used Mods'))


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

ttk.Label(tabBroken, text=_("Broken Mods"), font='Helvetica 12 bold').pack()
ttk.Label(tabBroken, text=_("These mods have been detected to be a possible problem.  ZIP Files or Folders with any non-alphanumeric character other than \"_\" will not be loaded by the game.  Mods that are not compressed as a ZIP file cannot be used in multiplayer games.  Finally, the mod folder should only contain mods, no other files.  Below, there is a list of problem files, and a suggested solution"), wraplength = 600).pack(fill='x', pady=(0,5))



brokenCanvas    = Tk.Canvas(tabBroken, bd=2, relief='ridge')
brokenCanvasVSB = ttk.Scrollbar(tabBroken, orient="vertical", command=brokenCanvas.yview)
brokenFrame     = ttk.Frame(brokenCanvas, border=1, padding=(30,0))

brokenFrame.bind(
	"<Configure>",
	lambda e: brokenCanvas.configure(
		scrollregion=brokenCanvas.bbox("all")
	)
)

brokenCanvas.create_window((0, 0), window=brokenFrame, anchor="nw")

brokenCanvas.configure(yscrollcommand=brokenCanvasVSB.set)

brokenCanvas.pack(side="left", fill="both", expand=True)
brokenCanvasVSB.pack(side="right", fill="y")

def bf_on_mousewheel(event):
	brokenCanvas.yview_scroll(int(-1*(event.delta/120)), "units")

def bf_bound_to_mousewheel(event):
	brokenCanvas.bind_all("<MouseWheel>", bf_on_mousewheel)

def bf_unbound_to_mousewheel(event):
	brokenCanvas.unbind_all("<MouseWheel>")

brokenFrame.bind('<Enter>', bf_bound_to_mousewheel)
brokenFrame.bind('<Leave>', bf_unbound_to_mousewheel)

changeables["brokenFrame"] = brokenFrame



# 
#  _______ _____ _______ _______ _____ __   _  ______      _______  _____  ______  _______
#  |  |  |   |   |______ |______   |   | \  | |  ____      |  |  | |     | |     \ |______
#  |  |  | __|__ ______| ______| __|__ |  \_| |_____|      |  |  | |_____| |_____/ ______|
#                                                                                         
# 

ttk.Label(tabMissing, text=_("Missing Mods"), font='Helvetica 12 bold').pack()
ttk.Label(tabMissing, text=_("The scanner failed to find the mods below, however they are referenced in one or more savegames. For mods that have not been purchased, this is usually harmless.  For mods you have purchased, missing the mod file could cost you in-game money.  To correct this, re-download the mod from where you originally got it and place it in the mod folder."), wraplength = 600).pack(fill='x')

missingTreeCols = [
	('#1', _("Name")),
	('#2', _("Title")),
	('#3', _("Purchased")),
	('#4', _("Savegame"))
]

missingTree = ttk.Treeview(tabMissing, selectmode='browse', columns=missingTreeCols, show='headings')
missingTree.pack(expand=True, side='left', fill='both', pady=(5,0))

missingTree.column("#3", minwidth=0, width=75, stretch=Tk.NO) 
missingTree.column("#4", minwidth=0, width=100, stretch=Tk.NO) 

missingTreeVSB = ttk.Scrollbar(tabMissing, orient="vertical", command=missingTree.yview)
missingTreeVSB.pack(side='right', fill='y', pady=(25,2))

missingTree.configure(yscrollcommand=missingTreeVSB.set)

for col,name in missingTreeCols:
	missingTree.heading(col, text=name, command=lambda _col=col: \
				 treeview_sort_size_column(missingTree, _col, False))


changeables["missingTree"] = missingTree



# 
#  _______  _____  __   _ _______        _____ _______ _______      _______  _____  ______  _______
#  |       |     | | \  | |______ |        |   |          |         |  |  | |     | |     \ |______
#  |_____  |_____| |  \_| |       |_____ __|__ |_____     |         |  |  | |_____| |_____/ ______|
#                                                                                                  
# 
ttk.Label(tabConflict, text = _("Possible Conflicts"), font='Helvetica 12 bold').pack()
ttk.Label(tabConflict, text = _("These mods were detected in your mod folder.  In some specific cases, they can cause conflicts with other mods, causing your game to either not work or behave strangely. This display is for informational purposes, and should not be taken a suggestion not to use anything listed here"), wraplength=600).pack(fill='x')

ttk.Label(tabConflict, text = "\u2022 " + _("This should not be taken as a suggestion that these mods do not work."), anchor='w').pack(pady=(20, 0), padx=(30,0), fill='x')
ttk.Label(tabConflict, text = "\u2022 " + _("This is also not intended as a slight against the mod or author."), anchor='w').pack(padx=(30,0), fill='x')
ttk.Label(tabConflict, text = "\u2022 " + _("Many (most) times these mods will work as intended."), anchor='w').pack(padx=(30,0), fill='x')
ttk.Label(tabConflict, text = "\u2022 " + _("If you do experience in-game problems, this may be a good place to start testing."), anchor='w').pack(pady=(0,10), padx=(30,0), fill='x')

conflictCanvas    = Tk.Canvas(tabConflict, bd=2, relief='ridge')
conflictCanvasVSB = ttk.Scrollbar(tabConflict, orient="vertical", command=conflictCanvas.yview)
conflictFrame     = ttk.Frame(conflictCanvas, border=1, padding=(30,0))

conflictFrame.bind(
	"<Configure>",
	lambda e: conflictCanvas.configure(
		scrollregion=conflictCanvas.bbox("all")
	)
)

conflictCanvas.create_window((0, 0), window=conflictFrame, anchor="nw")

conflictCanvas.configure(yscrollcommand=conflictCanvasVSB.set)

conflictCanvas.pack(side="left", fill="both", expand=True)
conflictCanvasVSB.pack(side="right", fill="y")

def cf_on_mousewheel(event):
	conflictCanvas.yview_scroll(int(-1*(event.delta/120)), "units")

def cf_bound_to_mousewheel(event):
	conflictCanvas.bind_all("<MouseWheel>", cf_on_mousewheel)

def cf_unbound_to_mousewheel(event):
	conflictCanvas.unbind_all("<MouseWheel>")

conflictFrame.bind('<Enter>', cf_bound_to_mousewheel)
conflictFrame.bind('<Leave>', cf_unbound_to_mousewheel)


changeables["conflictFrame"] = conflictFrame



# 
#  _____ __   _ _______ _______ _______ _____ _    _ _______      _______  _____  ______  _______
#    |   | \  | |_____| |          |      |    \  /  |______      |  |  | |     | |     \ |______
#  __|__ |  \_| |     | |_____     |    __|__   \/   |______      |  |  | |_____| |_____/ ______|
#                                                                                                
# 
ttk.Label(tabInactive, text=_("Inactive Mods"), font='Helvetica 12 bold').pack()
ttk.Label(tabInactive, text=_("These mods are not activated in any of your savegames.  If you would like to save space, and perhaps speed up FS19 starting, you could remove some or all of these."), wraplength = 600).pack(fill='x')


inactiveTreeCols = [
	('#1', _("Name")),
	('#2', _("Size"))
]

inactiveTree = ttk.Treeview(tabInactive, selectmode='browse', columns=inactiveTreeCols, show='headings')
inactiveTree.pack(expand=True, side='left', fill='both', pady=(5,0))

inactiveTree.column("#2", minwidth=0, width=100, stretch=Tk.NO, anchor='e') 

inactiveTreeVSB = ttk.Scrollbar(tabInactive, orient="vertical", command=inactiveTree.yview)
inactiveTreeVSB.pack(side='right', fill='y', pady=(25,2))

inactiveTree.configure(yscrollcommand=inactiveTreeVSB.set)

for col,name in inactiveTreeCols:
	inactiveTree.heading(col, text=name, command=lambda _col=col: \
				 treeview_sort_size_column(inactiveTree, _col, False))

changeables["inactiveTree"] = inactiveTree



# 
#  _     _ __   _ _     _ _______ _______ ______       _______  _____  ______  _______
#  |     | | \  | |     | |______ |______ |     \      |  |  | |     | |     \ |______
#  |_____| |  \_| |_____| ______| |______ |_____/      |  |  | |_____| |_____/ ______|
#                                                                                     
# 
ttk.Label(tabUnused, text=_("Active, Unused Mods"), font='Helvetica 12 bold').pack()
ttk.Label(tabUnused, text=_("These mods are active in a savegame, but do not seem to be in use. If you do not plan on using them, you could possible remove them.  Please note that some script only or pre-requisite mods may appear here by mistake, so please use this list carefully."), wraplength = 600).pack(fill='x')

unusedTreeCols = [
	('#1', _("Name")),
	('#2', _("Title")),
	('#3', _("Savegame")),
	('#4', _("Size"))
]

unusedTree = ttk.Treeview(tabUnused, selectmode='browse', columns=unusedTreeCols, show='headings')
unusedTree.pack(expand=True, side='left', fill='both', pady=(5,0))

unusedTree.column("#3", minwidth=0, width=120, stretch=Tk.NO)
unusedTree.column("#4", minwidth=0, width=100, stretch=Tk.NO, anchor='e') 

unusedTreeVSB = ttk.Scrollbar(tabUnused, orient="vertical", command=unusedTree.yview)
unusedTreeVSB.pack(side='right', fill='y', pady=(25,2))

unusedTree.configure(yscrollcommand=unusedTreeVSB.set)

for col,name in unusedTreeCols:
	unusedTree.heading(col, text=name, command=lambda _col=col: \
				 treeview_sort_size_column(unusedTree, _col, False))

changeables["unusedTree"] = unusedTree



# 
#  _______ ______   _____  _     _ _______
#  |_____| |_____] |     | |     |    |   
#  |     | |_____] |_____| |_____|    |   
#                                         
# 

def about() :
	aboutWindow = Tk.Toplevel(root)

	aboutWindow.title(_("About FS19 Mod Checker"))
	aboutWindow.geometry("600x460")

	aboutFrame = ttk.Frame(aboutWindow, padding=(0,0,0,0))
	aboutFrame.pack(pady=(5,0), padx=5, fill="both")

	ttk.Label(aboutFrame, text=_("FS19 Mod Checker") + " v" + VERSION, font='Helvetica 18 bold').pack()

	ttk.Label(aboutFrame, text=_("This little program will take a look at your mod install folder and inform you of the following:"), anchor = 'w', wraplength = 600).pack(fill = 'x', pady = 0, padx = (10,0))

	aboutBullets = [
		_("If a mod file is named incorrectly and won't load in the game."),
		_("If a mod is not properly zipped."),
		_("If a mod is used in your save games, but does not appear to be installed."),
		_("If a mod is not loaded or used in any of your save games"),
		_("If a mod is loaded but unused in your save games.")
	]

	for thisBullet in aboutBullets:
		ttk.Label(aboutFrame, text="\u2022 " + thisBullet, anchor = 'w', wraplength = 520).pack(fill = 'x', pady = (5,0), padx = (40,0))	

	ttk.Label(aboutFrame, text=_("This program only offers suggestions, no files on your computer will be altered"), font='Helvetica 9 bold', anchor='center', wraplength = 600).pack(fill = 'x', pady=(10,0) )

	# i10n Note: don't translate the license, there is not an "official" copy of it other than english.
	MITLicenseText = "Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the \"Software\"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE."
	ttk.Label(aboutFrame, text=MITLicenseText, anchor = 'w', wraplength = 560).pack(fill = 'x', pady = (20,0), padx = (20,0))
	
	aboutWindow.bind('<Escape>', lambda x: aboutWindow.destroy())
	aboutWindow.iconphoto(False, mainIconImage)
	aboutWindow.focus_force()



# 
#  _______ _____ ______ _______       _______  _____         ______ __   _ _     _ _______
#  |______   |    ____/ |______          |    |     |       |_____/ | \  | |     | |  |  |
#  ______| __|__ /_____ |______ _____    |    |_____| _____ |    \_ |  \_| |_____| |  |  |
#                                                                                         
# 

def size_to_real_number(text) :
	# Convert a human-readable size back to something we can sort.
	try :
		num, ext = text.split()

		if ext == "B":
			return float(num)
		if ext == "Kb" :
			return float(num) * 1024
		if ext == "Mb" :
			return float(num) * 1024 * 1024
		if ext == "Gb" :
			return float(num) * 1024 * 1024 * 1024
	
	except ValueError :
		return text

	return text



# 
#  _______  ______ _______ _______       _______  _____   ______ _______
#     |    |_____/ |______ |______       |______ |     | |_____/    |   
#     |    |    \_ |______ |______ _____ ______| |_____| |    \_    |   
#                                                                       
# 
def lower_if_possible(x):
	if isinstance(x[0], float) :
		return x
	else :
		try:
			return (x[0].lower(), x[1])
		except AttributeError:
			return x

def treeview_sort_size_column(tv, col, reverse):
	# Sort a treeview by the chosen column

	l = [(size_to_real_number(tv.set(k, col)), k) for k in tv.get_children('')]
	l.sort(
		key=lambda t : lower_if_possible(t),
		reverse=reverse
	)		

	# rearrange items in sorted positions
	for index, (val, k) in enumerate(l): # pylint: disable=unused-variable
		tv.move(k, '', index)

	# reverse sort next time
	tv.heading(col, command=lambda _col=col: \
				 treeview_sort_size_column(tv, _col, not reverse))




# 
#  _______ _______ _____ __   _              _____   _____   _____ 
#  |  |  | |_____|   |   | \  |      |      |     | |     | |_____]
#  |  |  | |     | __|__ |  \_|      |_____ |_____| |_____| |      
#                                                                  
# 

root.mainloop()
