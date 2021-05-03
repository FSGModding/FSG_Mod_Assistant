"""
 _______           __ ______ __                __               
|   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
|       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
|__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  
                                              v1.0.0.0 by JTSage

Main library file

(c) 2021 JTSage.  MIT License.
"""

from tkinter import *
from tkinter import ttk
from distutils.util import strtobool
import tkinter.filedialog as fd
import tkinter.messagebox as mb
import os
import re
import glob
from lxml import etree
import mod_checker_data
import __main__


"""
 
          _____  _______ ______        _______ _______ _____ __   _       _______  _____  __   _ _______ _____  ______
  |      |     | |_____| |     \       |  |  | |_____|   |   | \  |       |       |     | | \  | |______   |   |  ____
  |_____ |_____| |     | |_____/ _____ |  |  | |     | __|__ |  \_| _____ |_____  |_____| |  \_| |       __|__ |_____|
                                                                                                                      
 
"""
def load_main_config(*args):

	filename = fd.askopenfilename(
		initialdir  = os.path.expanduser("~") + "/Documents/My Games/FarmingSimulator2019",
		initialfile = "gameSettings.xml",
		title       = 'Select gameSettings.xml',
		filetypes   = [("XML Settings", "gameSettings.xml")]
	)

	if filename: 
		__main__.mainConfigFile = filename

		__main__.mainFileLabel.config(text = "Game Settings File: " + __main__.mainConfigFile)
		__main__.processButton.state(['!disabled'])


"""
 
   _____   ______  _____  _______ _______ _______ _______       _______ _____        _______ _______
  |_____] |_____/ |     | |       |______ |______ |______       |______   |   |      |______ |______
  |       |    \_ |_____| |_____  |______ ______| ______| _____ |       __|__ |_____ |______ ______|
                                                                                                    
 
"""
def process_files(*args):
	basePath  = __main__.mainConfigFile[0:-16]
	modDir    = basePath + "/mods"

	#Make sure the display is clear
	__main__.brokenTree.delete(*__main__.brokenTree.get_children())
	__main__.missingTree.delete(*__main__.missingTree.get_children())
	__main__.inactiveTree.delete(*__main__.inactiveTree.get_children())
	__main__.unusedTree.delete(*__main__.unusedTree.get_children())

	for widget in __main__.conflictFrame.winfo_children():
		widget.destroy()

	# Find the savegame files
	filesVehicles = glob.glob(basePath + "savegame*/vehicles.xml")
	filesCareer   = glob.glob(basePath + "savegame*/careerSavegame.xml")
	filesItems    = glob.glob(basePath + "savegame*/items.xml")

	# Load the config file.  We need to check for a different mod folder
	# AND this will tell us if we are in the right folder.
	try:
		configFileTree = etree.parse(__main__.mainConfigFile)
	except:
		mb.showerror(title="Error", message="Cannot open main config file")
		__main__.processButton.state(['disabled'])
		return
		
	modFolderXML = configFileTree.xpath("/gameSettings/modsDirectoryOverride")

	if strtobool(modFolderXML[0].attrib["active"]) :
		modDir = modFolderXML[0].attrib["directory"]


	# Time to load all of your mods.

	modsGlob = glob.glob(modDir + "/*")

	modDirFiles = [os.path.basename(fn) for fn in modsGlob 
		if os.path.isdir(fn)]
	modZipFiles = [os.path.splitext(os.path.basename(fn))[0] for fn in modsGlob 
		if os.path.basename(fn).endswith('.zip')]
	modBadFiles = [os.path.basename(fn) for fn in modsGlob 
		if not os.path.basename(fn).endswith('.zip') and not os.path.isdir(fn)]

	# We should clear the modList in case this is a second run
	__main__.modList = {}

	# Lets parse through the folders.
	for thisMod in modDirFiles:
		__main__.modList[thisMod] = {
			"isFolder"  : True,
			"fileBad"   : bool(re.search(r'\W', thisMod) or re.match(r'[0-9]', thisMod)),
			"activeIn"  : set(),
			"usedIn"    : set(),
			"isMissing" : False,
			"name"      : None
		}
	
	for thisMod in modZipFiles:
		__main__.modList[thisMod] = {
			"isFolder"  : False,
			"fileBad"   : bool(re.search(r'\W', thisMod) or re.match(r'[0-9]', thisMod)),
			"activeIn"  : set(),
			"usedIn"    : set(),
			"isMissing" : False,
			"name"      : None
		}


	# Alright, lets look at careerSavegame
	for thisFile in filesCareer:
		thisXML = etree.parse(thisFile)
		thisSavegame = re.search(r'savegame([\d+])', thisFile)[1]
	
		theseMods = thisXML.xpath("/careerSavegame/mod")

		for thisMod in theseMods:
			if "modName" not in thisMod.attrib or thisMod.attrib["modName"].startswith("pdlc") :
				continue
			if thisMod.attrib["modName"] in __main__.modList.keys() :
				__main__.modList[thisMod.attrib["modName"]]["activeIn"].add(thisSavegame)
				__main__.modList[thisMod.attrib["modName"]]["name"] = thisMod.attrib["title"]
			else :
				__main__.modList[thisMod.attrib["modName"]] = {
					"isFolder"  : False,
					"fileBad"   : False,
					"activeIn"  : {thisSavegame},
					"usedIn"    : set(),
					"isMissing" : True,
					"name"      : thisMod.attrib["title"]
				}
		
	#Next up, vehicles
	for thisFile in filesVehicles:
		thisXML = etree.parse(thisFile)
		thisSavegame = re.search(r'savegame([\d+])', thisFile)[1]
	
		theseMods = thisXML.xpath("/vehicles/vehicle")

		for thisMod in theseMods:
			if "modName" not in thisMod.attrib or thisMod.attrib["modName"].startswith("pdlc") :
				continue
			if thisMod.attrib["modName"] in __main__.modList.keys() :
				__main__.modList[thisMod.attrib["modName"]]["usedIn"].add(thisSavegame)

	# Finally, lets do items
	for thisFile in filesItems:
		thisXML = etree.parse(thisFile)
		thisSavegame = re.search(r'savegame([\d+])', thisFile)[1]
	
		theseMods = thisXML.xpath("/items/item")

		for thisMod in theseMods:
			if "modName" not in thisMod.attrib or thisMod.attrib["modName"].startswith("pdlc") :
				continue
			if thisMod.attrib["modName"] in __main__.modList.keys() :
				__main__.modList[thisMod.attrib["modName"]]["usedIn"].add(thisSavegame)

	#Deal with the script only mods
	for thisMod in mod_checker_data.knownScriptOnlyMods:
		if thisMod in __main__.modList.keys():
			__main__.modList[thisMod]["usedIn"].update(__main__.modList[thisMod]["activeIn"])

	upd_config()
	upd_broken(modBadFiles)
	upd_missing()
	upd_inactive()
	upd_unused()
	upd_conflict()




"""
 
  _     _  _____  ______        _______  _____  __   _ _______ _____  ______
  |     | |_____] |     \       |       |     | | \  | |______   |   |  ____
  |_____| |       |_____/ _____ |_____  |_____| |  \_| |       __|__ |_____|
                                                                            
 
"""
def upd_config() :

	broken  = {k: v for k, v in __main__.modList.items() if v['fileBad'] }
	folder  = {k: v for k, v in __main__.modList.items() if v['isFolder'] }
	missing = {k: v for k, v in __main__.modList.items() if v['isMissing'] }

	__main__.modLabels["found"].config(text = len(__main__.modList.keys()))
	__main__.modLabels["broke"].config(text = len(broken))
	__main__.modLabels["folder"].config(text = len(folder))
	__main__.modLabels["missing"].config(text = len(missing))




"""
 
  _     _  _____  ______        ______   ______  _____  _     _ _______ __   _
  |     | |_____] |     \       |_____] |_____/ |     | |____/  |______ | \  |
  |_____| |       |_____/ _____ |_____] |    \_ |_____| |    \_ |______ |  \_|
                                                                              
 
"""
def upd_broken(garbageFiles) :
	broken = {k: v for k, v in __main__.modList.items() if v['fileBad'] }
	folder = {k: v for k, v in __main__.modList.items() if v['isFolder'] and not v['fileBad'] }
	

	for thisMod in sorted(broken.keys()) :
		__main__.brokenTree.insert(
			parent='',
			index='end',
			text=thisMod,
			values=(
				thisMod,
				"Folder" if __main__.modList[thisMod]["isFolder"] else "Zip File",
				"Bad " + ("Folder" if __main__.modList[thisMod]["isFolder"] else "File") + " Name"
			))

	for thisMod in sorted(folder.keys()) :
		__main__.brokenTree.insert(
			parent='',
			index='end',
			text=thisMod,
			values=(
				thisMod,
				"Folder",
				"Needs Zipped"
			))
	
	for thisFile in garbageFiles :
		__main__.brokenTree.insert(
			parent='',
			index='end',
			text=thisFile,
			values=(
				thisFile,
				"Garbage File",
				"Needs Deleted"
			))


"""
 
  _     _  _____  ______        _______ _____ _______ _______ _____ __   _  ______
  |     | |_____] |     \       |  |  |   |   |______ |______   |   | \  | |  ____
  |_____| |       |_____/ _____ |  |  | __|__ ______| ______| __|__ |  \_| |_____|
                                                                                  
 
"""
def upd_missing() :
	missing = {k: v for k, v in __main__.modList.items() if v['isMissing'] }

	for thisMod in sorted(missing.keys()) :
		__main__.missingTree.insert(
			parent='',
			index='end',
			text=thisMod,
			values=(
				thisMod,
				__main__.modList[thisMod]["name"],
				"YES" if len(__main__.modList[thisMod]["usedIn"]) > 0 else "no",
				", ".join( str(t) for t in sorted(__main__.modList[thisMod]["activeIn"]))
			))


"""
 
  _     _  _____  ______        _____ __   _ _______ _______ _______ _____ _    _ _______
  |     | |_____] |     \         |   | \  | |_____| |          |      |    \  /  |______
  |_____| |       |_____/ _____ __|__ |  \_| |     | |_____     |    __|__   \/   |______
                                                                                         
 
"""
def upd_inactive() :
	inactive = {k: v for k, v in __main__.modList.items() if len(v['usedIn']) == 0 and len(v['activeIn']) == 0 and not v['fileBad']  }

	for thisMod in sorted(inactive.keys()) :
		__main__.inactiveTree.insert(
			parent='',
			index='end',
			text=thisMod,
			values=(
				thisMod
			))


"""
 
  _     _  _____  ______        _     _ __   _ _     _ _______ _______ ______ 
  |     | |_____] |     \       |     | | \  | |     | |______ |______ |     \
  |_____| |       |_____/ _____ |_____| |  \_| |_____| ______| |______ |_____/
                                                                              
 
"""
def upd_unused() :
	unused = {k: v for k, v in __main__.modList.items() if len(v['usedIn']) == 0 and len(v['activeIn']) > 0 and not v['fileBad']  }

	for thisMod in sorted(unused.keys()) :
		__main__.unusedTree.insert(
			parent='',
			index='end',
			text=thisMod,
			values=(
				thisMod,
				__main__.modList[thisMod]["name"],
				", ".join( str(t) for t in sorted(__main__.modList[thisMod]["activeIn"]))
			))


"""
 
  _     _  _____  ______        _______  _____  __   _ _______        _____ _______ _______
  |     | |_____] |     \       |       |     | | \  | |______ |        |   |          |   
  |_____| |       |_____/ _____ |_____  |_____| |  \_| |       |_____ __|__ |_____     |   
                                                                                           
 
"""
def upd_conflict() :

	

	for thisMod in sorted(mod_checker_data.knownConflicts.keys()) :
		if thisMod in __main__.modList.keys():
			ttk.Label(
				__main__.conflictFrame,
				text=thisMod,
				anchor='w'
			).pack(fill='x', padx=0,pady=(10,0))

			ttk.Label(
				__main__.conflictFrame,
				text=mod_checker_data.knownConflicts[thisMod],
				anchor='w',
				wraplength=450
			).pack(fill='x', pady=0,padx=(40,0))
