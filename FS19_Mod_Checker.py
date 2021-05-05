"""
 _______           __ ______ __                __               
|   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
|       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
|__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  
                                            v1.0.0.0 by JTSage

Main Program

(c) 2021 JTSage.  MIT License.
"""

from tkinter import * # pylint: disable=unused-wildcard-import
from tkinter import ttk
import tkinter.filedialog as fd
import tkinter.messagebox as mb
import os
import lib.mod_checker_lib as mod_checker_lib
from lib.mod_checker_data import knownScriptOnlyMods, knownConflicts


mainConfigFile = ""
masterLog      = []


# 
#  _______ _______ _____ __   _      _  _  _ _____ __   _ ______   _____  _  _  _
#  |  |  | |_____|   |   | \  |      |  |  |   |   | \  | |     \ |     | |  |  |
#  |  |  | |     | __|__ |  \_|      |__|__| __|__ |  \_| |_____/ |_____| |__|__|
#                                                                                
# 

root = Tk()
root.title("FS19 Mod Checker")
root.minsize(650, 500)


menubar = Menu(root)
filemenu = Menu(menubar, tearoff=0)
filemenu.add_command(label="Save Log", command=mod_checker_lib.save_log)
filemenu.add_separator()
filemenu.add_command(label="Exit", command=root.quit)
menubar.add_cascade(label="File", menu=filemenu)

helpmenu = Menu(menubar, tearoff=0)
helpmenu.add_command(label="About...", command=mod_checker_lib.about)
menubar.add_cascade(label="Help", menu=helpmenu)

root.config(menu=menubar)


mainIconImage = PhotoImage(file = os.path.join(mod_checker_lib.resource_path("./lib/"), 'mcicon.png'))
root.iconphoto(False, mainIconImage)

n = ttk.Notebook(root)

tabConfig   = ttk.Frame(n, padding=(9,9,9,9)) # Config Tab
tabBroken   = ttk.Frame(n, padding=(9,9,9,9)) # Broken Mods / Files Tab
tabMissing  = ttk.Frame(n, padding=(9,9,9,9)) # Missing Mods Tab
tabConflict = ttk.Frame(n, padding=(9,9,9,9)) # Conflicts Tab
tabInactive = ttk.Frame(n, padding=(9,9,9,9)) # Inactive Mods Tab
tabUnused   = ttk.Frame(n, padding=(9,9,9,9)) # Active but Unused Mods Tab

n.add(tabConfig,   text='Configuration')
n.add(tabBroken,   text='Broken Mods')
n.add(tabMissing,  text='Missing Mods')
n.add(tabConflict, text='Possible Conflicts')
n.add(tabInactive, text='Inactive Mods')
n.add(tabUnused,   text='Active, Un-Used Mods')

n.pack(expand = 1, pady = (5,0), padx = 5, fill = "both")

root.update()



# 
#  _______  _____  __   _ _______ _____  ______      _______ _______ ______ 
#  |       |     | | \  | |______   |   |  ____         |    |_____| |_____]
#  |_____  |_____| |  \_| |       __|__ |_____|         |    |     | |_____]
#                                                                           
# 

tabConfig.columnconfigure(0, weight=1)
tabConfig.columnconfigure(1, minsize=root.winfo_width()/2)

ttk.Label(tabConfig, text="First, you need to point Mod Checker to your gameSettings.xml file" ).grid(column=0, columnspan=2, row=0, pady=6, sticky=(W,E))

ttk.Button(tabConfig, text="Load Settings", command=mod_checker_lib.load_main_config).grid(column=0, row=1, columnspan=2, sticky=(W, E))

mainFileLabel = ttk.Label(tabConfig, text="Game Settings File: [not set]" )
mainFileLabel.grid(column=0, columnspan=2, row=2, pady=6, sticky=(W,E))

ttk.Label(tabConfig, text="Next, click \"Check Mods\" to scan your collection" ).grid(column=0, columnspan=2, row=3, pady=6, sticky=(W,E))

processButton = ttk.Button(tabConfig, text="Check Mods", command=mod_checker_lib.process_files)
processButton.state(['disabled'])
processButton.grid(column=0, row=4, columnspan=2, sticky=(W, E))


ttk.Label(tabConfig, text="Mods Found").grid(column=0, row=5, sticky=(E))
ttk.Label(tabConfig, text="Broken Mods").grid(column=0, row=6, sticky=(E))
ttk.Label(tabConfig, text="Folders Found").grid(column=0, row=7, sticky=(E))
ttk.Label(tabConfig, text="Missing Mods").grid(column=0, row=8, sticky=(E))

modLabels = {
	"found"   : ttk.Label(tabConfig, text="0", font='Helvetica 18 bold'),
	"broke"   : ttk.Label(tabConfig, text="0", font='Helvetica 18 bold'),
	"folder"  : ttk.Label(tabConfig, text="0", font='Helvetica 18 bold'),
	"missing" : ttk.Label(tabConfig, text="0", font='Helvetica 18 bold')
}
modLabels["found"].grid(column=1, row=5, sticky=(W))
modLabels["broke"].grid(column=1, row=6, sticky=(W))
modLabels["folder"].grid(column=1, row=7, sticky=(W))
modLabels["missing"].grid(column=1, row=8, sticky=(W))


for child in tabConfig.winfo_children(): 
	child.grid_configure(padx=5, pady=5)



# 
#  ______   ______  _____  _     _ _______ __   _      _______  _____  ______  _______
#  |_____] |_____/ |     | |____/  |______ | \  |      |  |  | |     | |     \ |______
#  |_____] |    \_ |_____| |    \_ |______ |  \_|      |  |  | |_____| |_____/ ______|
#                                                                                     
# 

ttk.Label(tabBroken, text="These mods have broken file names, and will not appear in your game.  They need to be removed or renamed").pack()

brokenTreeCols = ('Name','Type','Problem')

brokenTree = ttk.Treeview(tabBroken, selectmode='browse', columns=brokenTreeCols, show='headings')
brokenTree.pack(expand=True, side='left', fill='both')

brokenTreeVSB = ttk.Scrollbar(tabBroken, orient="vertical", command=brokenTree.yview)
brokenTreeVSB.pack(side='right', fill='y')

brokenTree.configure(yscrollcommand=brokenTreeVSB.set)

for col in brokenTreeCols:
	brokenTree.heading(col, text=col, command=lambda _col=col: \
				 treeview_sort_size_column(brokenTree, _col, False))


# 
#  _______ _____ _______ _______ _____ __   _  ______      _______  _____  ______  _______
#  |  |  |   |   |______ |______   |   | \  | |  ____      |  |  | |     | |     \ |______
#  |  |  | __|__ ______| ______| __|__ |  \_| |_____|      |  |  | |_____| |_____/ ______|
#                                                                                         
# 

ttk.Label(tabMissing, text="These mods are missing.  Those that are owned could cost you money").pack()

missingTreeCols = ('Name','Title','Purchased','Savegame')

missingTree = ttk.Treeview(tabMissing, selectmode='browse', columns=missingTreeCols, show='headings')
missingTree.pack(expand=True, side='left', fill='both')

missingTree.column("#3", minwidth=0, width=50, stretch=NO) 
missingTree.column("#4", minwidth=0, width=100, stretch=NO) 

missingTreeVSB = ttk.Scrollbar(tabMissing, orient="vertical", command=missingTree.yview)
missingTreeVSB.pack(side='right', fill='y')

missingTree.configure(yscrollcommand=missingTreeVSB.set)

for col in missingTreeCols:
	missingTree.heading(col, text=col, command=lambda _col=col: \
				 treeview_sort_size_column(missingTree, _col, False))


# 
#  _______  _____  __   _ _______        _____ _______ _______      _______  _____  ______  _______
#  |       |     | | \  | |______ |        |   |          |         |  |  | |     | |     \ |______
#  |_____  |_____| |  \_| |       |_____ __|__ |_____     |         |  |  | |_____| |_____/ ______|
#                                                                                                  
# 

ttk.Label(tabConflict, text = "These mods could potentially cause conflicts.").pack()

ttk.Label(tabConflict, text = "This should not be taken as a suggestion that these mods do not work.").pack(pady=(20, 0))
ttk.Label(tabConflict, text = "This is also not intended as a slight against the mod or author.").pack()
ttk.Label(tabConflict, text = "Many (most) times these mods will work as intended.").pack()
ttk.Label(tabConflict, text = "If you do experience in-game problems, this may be a good place to start testing.").pack(pady=(0,20))

conflictFrame = ttk.Frame(tabConflict, border=1, padding=(9,9,9,9))
conflictFrame.pack(fill="x")





# 
#  _____ __   _ _______ _______ _______ _____ _    _ _______      _______  _____  ______  _______
#    |   | \  | |_____| |          |      |    \  /  |______      |  |  | |     | |     \ |______
#  __|__ |  \_| |     | |_____     |    __|__   \/   |______      |  |  | |_____| |_____/ ______|
#                                                                                                
# 

ttk.Label(tabInactive, text="These mods are never active.  Maybe you can save some room by getting rid of them?").pack()

inactiveTreeCols = ('Name','Size')

inactiveTree = ttk.Treeview(tabInactive, selectmode='browse', columns=inactiveTreeCols, show='headings')
inactiveTree.pack(expand=True, side='left', fill='both')

inactiveTree.column("#2", minwidth=0, width=100, stretch=NO, anchor='e') 

inactiveTreeVSB = ttk.Scrollbar(tabInactive, orient="vertical", command=inactiveTree.yview)
inactiveTreeVSB.pack(side='right', fill='y')

inactiveTree.configure(yscrollcommand=inactiveTreeVSB.set)

for col in inactiveTreeCols:
	inactiveTree.heading(col, text=col, command=lambda _col=col: \
				 treeview_sort_size_column(inactiveTree, _col, False))



# 
#  _     _ __   _ _     _ _______ _______ ______       _______  _____  ______  _______
#  |     | | \  | |     | |______ |______ |     \      |  |  | |     | |     \ |______
#  |_____| |  \_| |_____| ______| |______ |_____/      |  |  | |_____| |_____/ ______|
#                                                                                     
# 

ttk.Label(tabUnused, text="These mods are active but not purchased. Maybe remove what you don't need?").pack()


unusedTreeCols = ('Name','Title','Savegame','Size')
unusedTree = ttk.Treeview(tabUnused, selectmode='browse', columns=unusedTreeCols, show='headings')
unusedTree.pack(expand=True, side='left', fill='both')

unusedTree.column("#3", minwidth=0, width=120, stretch=NO)
unusedTree.column("#4", minwidth=0, width=100, stretch=NO, anchor='e') 

unusedTreeVSB = ttk.Scrollbar(tabUnused, orient="vertical", command=unusedTree.yview)
unusedTreeVSB.pack(side='right', fill='y')

unusedTree.configure(yscrollcommand=unusedTreeVSB.set)

for col in unusedTreeCols:
	unusedTree.heading(col, text=col, command=lambda _col=col: \
				 treeview_sort_size_column(unusedTree, _col, False))



def size_to_real_number(text) :
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


def treeview_sort_size_column(tv, col, reverse):
	if ( col == "Size" ) :
		l = [(size_to_real_number(tv.set(k, col)), k) for k in tv.get_children('')]
	else :
		l = [(tv.set(k, col), k) for k in tv.get_children('')]

	l.sort(reverse=reverse)

	# rearrange items in sorted positions
	for index, (val, k) in enumerate(l): # pylint: disable=unused-variable
		tv.move(k, '', index)

	# reverse sort next time
	tv.heading(col, text=col, command=lambda _col=col: \
				 treeview_sort_size_column(tv, _col, not reverse))

def treeview_sort_column(tv, col, reverse):
	l = [(tv.set(k, col), k) for k in tv.get_children('')]
	
	l.sort(reverse=reverse)

	# rearrange items in sorted positions
	for index, (val, k) in enumerate(l): # pylint: disable=unused-variable
		tv.move(k, '', index)

	# reverse sort next time
	tv.heading(col, text=col, command=lambda _col=col: \
				 treeview_sort_column(tv, _col, not reverse))



# 
#  _______ _______ _____ __   _              _____   _____   _____ 
#  |  |  | |_____|   |   | \  |      |      |     | |     | |_____]
#  |  |  | |     | __|__ |  \_|      |_____ |_____| |_____| |      
#                                                                  
# 

root.mainloop()
