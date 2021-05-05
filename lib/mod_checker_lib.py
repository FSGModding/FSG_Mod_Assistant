"""
 _______           __ ______ __                __               
|   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
|       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
|__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  
                                            v1.0.0.0 by JTSage

Main library file

(c) 2021 JTSage.  MIT License.
"""

from tkinter import * # pylint: disable=unused-wildcard-import
from tkinter import ttk
from distutils.util import strtobool
from lxml import etree
from datetime import date
from pathlib import Path
import tkinter.filedialog as fd
import tkinter.messagebox as mb
import os
import sys
import re
import glob
from .mod_checker_modClass import FSMod # pylint: disable=relative-beyond-top-level
from .mod_checker_data import knownScriptOnlyMods, knownConflicts # pylint: disable=relative-beyond-top-level


# 
#          _____  _______ ______        _______ _______ _____ __   _       _______  _____  __   _ _______ _____  ______
#  |      |     | |_____| |     \       |  |  | |_____|   |   | \  |       |       |     | | \  | |______   |   |  ____
#  |_____ |_____| |     | |_____/ _____ |  |  | |     | __|__ |  \_| _____ |_____  |_____| |  \_| |       __|__ |_____|
#                                                                                                                      
# 

def load_main_config(changeables, *args):

	filename = fd.askopenfilename(
		initialdir  = os.path.expanduser("~") + "/Documents/My Games/FarmingSimulator2019",
		initialfile = "gameSettings.xml",
		title       = 'Select gameSettings.xml',
		filetypes   = [("XML Settings", "gameSettings.xml")]
	)

	if filename: 
		changeables["mainConfigFile"] = filename

		changeables["mainFileLabel"].config(text = "Game Settings File: " + filename)
		changeables["processButton"].state(['!disabled'])



# 
#   _____   ______  _____  _______ _______ _______ _______       _______ _____        _______ _______
#  |_____] |_____/ |     | |       |______ |______ |______       |______   |   |      |______ |______
#  |       |    \_ |_____| |_____  |______ ______| ______| _____ |       __|__ |_____ |______ ______|
#                                                                                                    
# 

def process_files(log, changeables, *args):
	
	basePath  = changeables["mainConfigFile"][0:-16]
	modDir    = basePath + "/mods"

	# Find the savegame files
	filesVehicles = glob.glob(basePath + "savegame*/vehicles.xml")
	filesCareer   = glob.glob(basePath + "savegame*/careerSavegame.xml")
	filesItems    = glob.glob(basePath + "savegame*/items.xml")

	# Load the config file.  We need to check for a different mod folder
	# AND this will tell us if we are in the right folder.
	try:
		configFileTree = etree.parse(changeables["mainConfigFile"])
	except:
		mb.showerror(title="Error", message="Cannot open main config file")
		changeables["processButton"].state(['disabled'])
		return
		
	modFolderXML = configFileTree.xpath("/gameSettings/modsDirectoryOverride")

	if strtobool(modFolderXML[0].attrib["active"]) :
		modDir = modFolderXML[0].attrib["directory"]


	# Time to load all of your mods.

	modsGlob = glob.glob(modDir + "/*")

	modDirFiles = [fn for fn in modsGlob 
		if os.path.isdir(fn)]
	modZipFiles = [fn for fn in modsGlob 
		if os.path.basename(fn).endswith('.zip')]
	modBadFiles = [os.path.basename(fn) for fn in modsGlob 
		if not os.path.basename(fn).endswith('.zip') and not os.path.isdir(fn)]

	# Define the full mod list.
	fullModList = {}

	# Special Case
	fullModList["FS19_holmerPack"] = FSMod()
	fullModList["FS19_holmerPack"].name("DLC Holmer Terra-Variant Pack")
	fullModList["FS19_holmerPack"].size(133849603)



	# Lets parse through the folders.
	for thisMod in modDirFiles:
		modName  = os.path.basename(thisMod)
		this_dir = Path(thisMod)

		fullModList[modName] = FSMod()
		fullModList[modName].isFolder(True)
		fullModList[modName].size(sum(f.stat().st_size for f in this_dir.glob('**/*') if f.is_file()))
		fullModList[modName].fullPath(thisMod)

		if ( re.search(r'\W', modName) or re.match(r'[0-9]', modName) ) :
			fullModList[modName].isBad(True)
		
	# Next, the zip files
	for thisMod in modZipFiles:
		modName = os.path.splitext(os.path.basename(thisMod))[0]
		
		fullModList[modName] = FSMod()
		fullModList[modName].fullPath(thisMod)
		fullModList[modName].size(os.path.getsize(thisMod))

		if ( re.search(r'\W', modName) or re.match(r'[0-9]', modName) ) :
			fullModList[modName].isBad(True)


	# Alright, lets look at careerSavegame
	for thisFile in filesCareer:
		thisXML = etree.parse(thisFile)
		thisSavegame = re.search(r'savegame([\d+])', thisFile)[1]
	
		theseMods = thisXML.xpath("/careerSavegame/mod")

		for thisMod in theseMods:
			if "modName" not in thisMod.attrib or thisMod.attrib["modName"].startswith("pdlc") :
				""" Skip blanks and paid DLC content """
				continue
			else :
				thisModName = thisMod.attrib["modName"]

			if thisModName in fullModList.keys() :
				""" Existing mod, mark it active """
				fullModList[thisModName].isActive(thisSavegame)
				fullModList[thisModName].name(thisMod.attrib["title"])
			else :
				""" Missing Mod, we should add it to the list """
				fullModList[thisModName] = FSMod()
				fullModList[thisModName].isActive(thisSavegame)
				fullModList[thisModName].isMissing(True)
				fullModList[thisModName].name(thisMod.attrib["title"])
		
	#Next up, vehicles
	for thisFile in filesVehicles:
		thisXML = etree.parse(thisFile)
		thisSavegame = re.search(r'savegame([\d+])', thisFile)[1]
	
		theseMods = thisXML.xpath("/vehicles/vehicle")

		for thisMod in theseMods:
			if "modName" not in thisMod.attrib or thisMod.attrib["modName"].startswith("pdlc") :
				continue
			if thisMod.attrib["modName"] in fullModList.keys() :
				fullModList[thisMod.attrib["modName"]].isUsed(thisSavegame)

	# Finally, lets do items
	for thisFile in filesItems:
		thisXML      = etree.parse(thisFile)
		thisSavegame = re.search(r'savegame([\d+])', thisFile)[1]
		theseMods    = thisXML.xpath("/items/item")

		for thisMod in theseMods:
			if "modName" not in thisMod.attrib or thisMod.attrib["modName"].startswith("pdlc") :
				continue
			if thisMod.attrib["modName"] in fullModList.keys() :
				fullModList[thisMod.attrib["modName"]].isUsed(thisSavegame)

	#Deal with the script only mods
	for thisMod in knownScriptOnlyMods:
		if thisMod in fullModList.keys():
			fullModList[thisMod]._usedGames.update(fullModList[thisMod]._activeGames)


	start_log(log)
	upd_config(log, changeables, fullModList)
	upd_broken(log, changeables, fullModList, modBadFiles)
	upd_missing(log, changeables, fullModList)
	upd_inactive(log, changeables, fullModList)
	upd_unused(log, changeables, fullModList)
	upd_conflict(log, changeables, fullModList)
	end_log(log)





# 
#  _     _  _____  ______        _______  _____  __   _ _______ _____  ______
#  |     | |_____] |     \       |       |     | | \  | |______   |   |  ____
#  |_____| |       |_____/ _____ |_____  |_____| |  \_| |       __|__ |_____|
#                                                                            
# 

def upd_config(log, changeables, fullModList) :

	broken  = { k for k, v in fullModList.items() if v.isBad() }
	folder  = { k for k, v in fullModList.items() if v.isFolder() }
	missing = { k for k, v in fullModList.items() if v.isMissing() }

	changeables["modLabels"]["found"].config(text = len(fullModList))
	changeables["modLabels"]["broke"].config(text = len(broken))
	changeables["modLabels"]["folder"].config(text = len(folder))
	changeables["modLabels"]["missing"].config(text = len(missing))

	write_log(log, "Found Mods: {}".format(len(fullModList)))
	write_log(log, "Broken Mods: {}".format(len(broken)))
	write_log(log, "Unzipped Mods: {}".format(len(folder)))
	write_log(log, "Missing Mods: {}".format(len(missing)))
	write_log_sep(log)



# 
#  _     _  _____  ______        ______   ______  _____  _     _ _______ __   _
#  |     | |_____] |     \       |_____] |_____/ |     | |____/  |______ | \  |
#  |_____| |       |_____/ _____ |_____] |    \_ |_____| |    \_ |______ |  \_|
#                                                                              
# 

def upd_broken(log, changeables, fullModList, garbageFiles) :
	broken = { k for k, v in fullModList.items() if v.isBad() }
	folder = { k for k, v in fullModList.items() if v.isFolder() and v.isGood() }
	
	for widget in changeables["brokenFrame"].winfo_children():
		widget.destroy()

	write_log(log, "Broken Mods:")
	
	""" First, bad names, they won't load """
	for thisMod in sorted(broken) :
		message = "This File or Folder is invalid"
	
		if ( re.match(r'[0-9]',thisMod) ) :
			if fullModList[thisMod].isFolder() :
				message = "Mod Folders cannot start with a digit.  Is this a collection of mods that should be moved to the root mods folder and then removed?"
			else :
				message = "Zip files cannot start with a digit.  Is this perhaps a collection of mods? If it is, extract the contents and delete this file."
		else :
			testWinCopy = re.search(r'(\w+) - .+', thisMod)
			testDLCopy = re.search(r'(\w+) \(.+', thisMod)
			goodName = False
			if ( testWinCopy or testDLCopy ) :
				if ( testWinCopy and testWinCopy[1] in fullModList.keys() ) :
					goodName = testWinCopy[1]
				if ( testDLCopy and testDLCopy[1] in fullModList.keys() ) :
					goodName = testDLCopy[1]

				if ( goodName ) :
					message = "This looks like a copy of the {} mod and can probably be deleted.".format(goodName)
				else :
					message = "This looks like a copy, but the original wasn't found. Rename it?"

			else :
				if fullModList[thisMod].isFolder() :
					message = "This folder is named incorrectly, but we didn't figure out what is wrong."
				else :
					message = "This ZIP file is named incorrectly, but we didn't figure out what is wrong."
		
		add_deflist(
			changeables["brokenFrame"],
			thisMod + fullModList[thisMod].getZip(),
			message
		)
					
		write_log(log, "  {} - {}".format(
			thisMod + fullModList[thisMod].getZip(),
			message
		))

	""" Next, folders that should be zip files instead """
	for thisMod in sorted(folder) :
		message = "Unzipped mods cannot be used in multiplayer, you should zip this folder"

		add_deflist(
			changeables["brokenFrame"],
			thisMod,
			message
		)
		write_log(log, "  {} - {}".format(
			thisMod,
			message
		))

	
	""" Finally, trash that just shouldn't be there """
	for thisFile in garbageFiles :
		message = "This file should not exist here, delete or move it."

		add_deflist(
			changeables["brokenFrame"],
			thisFile,
			message
		)
		write_log(log, "  {} - {}".format(
			thisFile,
			message
		))

	write_log_sep(log)



# 
#  _     _  _____  ______        _______ _____ _______ _______ _____ __   _  ______
#  |     | |_____] |     \       |  |  |   |   |______ |______   |   | \  | |  ____
#  |_____| |       |_____/ _____ |  |  | __|__ ______| ______| __|__ |  \_| |_____|
#                                                                                  
# 

def upd_missing(log, changeables, fullModList) :
	missing = { k for k, v in fullModList.items() if v.isMissing() }

	# Clear out the tree first
	changeables["missingTree"].delete(*changeables["missingTree"].get_children())

	write_log(log, "Missing Mods:")
	
	for thisMod in sorted(missing) :
		changeables["missingTree"].insert(
			parent = '',
			index  = 'end',
			text   = thisMod,
			values = (
				thisMod,
				fullModList[thisMod].name(),
				"YES" if fullModList[thisMod].isUsed() else "no",
				fullModList[thisMod].getAllActive()
			))

		write_log(log, "  {} ({}) - saves:{} {}".format(
			thisMod,
			fullModList[thisMod].name(),
			fullModList[thisMod].getAllActive(),
			"OWNED" if fullModList[thisMod].isUsed() else ""
		))

	write_log_sep(log)



# 
#  _     _  _____  ______        _____ __   _ _______ _______ _______ _____ _    _ _______
#  |     | |_____] |     \         |   | \  | |_____| |          |      |    \  /  |______
#  |_____| |       |_____/ _____ __|__ |  \_| |     | |_____     |    __|__   \/   |______
#                                                                                         
# 

def upd_inactive(log, changeables, fullModList) :
	inactive = { k for k, v in fullModList.items() if v.isNotUsed() and v.isNotActive() and v.isGood()  }

	# Clear out the tree first
	changeables["inactiveTree"].delete(*changeables["inactiveTree"].get_children())

	write_log(log, "Inactive Mods:")

	for thisMod in sorted(inactive) :
		changeables["inactiveTree"].insert(
			parent = '',
			index  = 'end',
			text   = thisMod,
			values = (
				thisMod,
				fullModList[thisMod].size()
			))

		write_log(log, "  {} ({})".format(
			thisMod,
			fullModList[thisMod].size()
		))

	write_log_sep(log)


# 
#  _     _  _____  ______        _     _ __   _ _     _ _______ _______ ______ 
#  |     | |_____] |     \       |     | | \  | |     | |______ |______ |     \
#  |_____| |       |_____/ _____ |_____| |  \_| |_____| ______| |______ |_____/
#                                                                              
# 

def upd_unused(log, changeables, fullModList) :
	unused = { k for k, v in fullModList.items() if v.isNotUsed() and v.isActive() and v.isGood() and v.isNotMissing() }

	changeables["unusedTree"].delete(*changeables["unusedTree"].get_children())

	write_log(log, "Unused Mods:")

	for thisMod in sorted(unused) :
		changeables["unusedTree"].insert(
			parent = '',
			index  = 'end',
			text   = thisMod,
			values = (
				thisMod,
				fullModList[thisMod].name(),
				fullModList[thisMod].getAllActive(),
				fullModList[thisMod].size()
			))

		write_log(log, "  {} ({}) - saves:{} ({})".format(
			thisMod,
			fullModList[thisMod].name(),
			fullModList[thisMod].getAllActive(),
			fullModList[thisMod].size()
		))
	
	write_log_sep(log)



# 
#  _     _  _____  ______        _______  _____  __   _ _______        _____ _______ _______
#  |     | |_____] |     \       |       |     | | \  | |______ |        |   |          |   
#  |_____| |       |_____/ _____ |_____  |_____| |  \_| |       |_____ __|__ |_____     |   
#                                                                                           
# 

def upd_conflict(log, changeables,fullModList) :

	for widget in changeables["conflictFrame"].winfo_children():
		widget.destroy()

	for thisMod in sorted(knownConflicts.keys()) :
		if thisMod in fullModList.keys():
			add_deflist(changeables["conflictFrame"], thisMod, knownConflicts[thisMod])



# 
#  _______ _______ _    _ _______               _____   ______
#  |______ |_____|  \  /  |______       |      |     | |  ____
#  ______| |     |   \/   |______ _____ |_____ |_____| |_____|
#                                                             
# 

def save_log(log) :
	try:
		fileWrite = fd.asksaveasfile(
			mode        = "w", 
			initialdir  = os.path.expanduser("~"),
			initialfile = "FS19_Mod_Checker_log.txt",
			title       = 'Save Log File...',
			filetypes   = [("Text Documents", ".txt")]
		)
		fileWrite.write('\n'.join(log))
		fileWrite.close()
		mb.showinfo(title="Saved", message="Log Saved")
	except:
		mb.showerror(title="Error", message="Unable to save log file")



# 
#   ______ _______ _______  _____  _     _  ______ _______ _______        _____  _______ _______ _     _
#  |_____/ |______ |______ |     | |     | |_____/ |       |______       |_____] |_____|    |    |_____|
#  |    \_ |______ ______| |_____| |_____| |    \_ |_____  |______ _____ |       |     |    |    |     |
#                                                                                                       
# 

def resource_path(relative_path):
	""" Get absolute path to resource, works for dev and for PyInstaller """
	try:
		# PyInstaller creates a temp folder and stores path in _MEIPASS
		base_path = sys._MEIPASS # pylint: disable=no-member
	except AttributeError:
		base_path = os.path.abspath(".")

	return os.path.join(base_path, relative_path)



# 
#  _______ _______ _______  ______ _______               _____   ______
#  |______    |    |_____| |_____/    |          |      |     | |  ____
#  ______|    |    |     | |    \_    |    _____ |_____ |_____| |_____|
#                                                                      
# 

def start_log(log):
	log.clear()
	log.append(" _______           __ ______ __                __               ")
	log.append("|   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.")
	log.append("|       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|")
	log.append("|__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  ")
	log.append("                                            v1.0.0.0 by JTSage")
	log.append("   ---=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=---")



# 
#  _______ __   _ ______                _____   ______
#  |______ | \  | |     \       |      |     | |  ____
#  |______ |  \_| |_____/ _____ |_____ |_____| |_____|
#                                                     
# 

def end_log(log):
	today = date.today()
	write_log(log, "Report Generated on: {}".format(today))
	write_log_sep(log)



# 
#  _  _  _  ______ _____ _______ _______               _____   ______
#  |  |  | |_____/   |      |    |______       |      |     | |  ____
#  |__|__| |    \_ __|__    |    |______ _____ |_____ |_____| |_____|
#                                                                    
# 

def write_log(log, text) :
	log.append(text)


# 
#  _  _  _  ______ _____ _______ _______               _____   ______       _______ _______  _____ 
#  |  |  | |_____/   |      |    |______       |      |     | |  ____       |______ |______ |_____]
#  |__|__| |    \_ __|__    |    |______ _____ |_____ |_____| |_____| _____ ______| |______ |      
#                                                                                                  
# 

def write_log_sep(log) :
	write_log(log, "   ---=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=---")





# 
#  _______ ______  ______        ______  _______ _______        _____ _______ _______
#  |_____| |     \ |     \       |     \ |______ |______ |        |   |______    |   
#  |     | |_____/ |_____/ _____ |_____/ |______ |       |_____ __|__ ______|    |   
#                                                                                    
# 

def add_deflist(frame, term, desc) :
	ttk.Label(
		frame,
		text   = term,
		anchor = 'w',
		font='Helvetica 9 bold'
	).pack(fill = 'x', padx = 0, pady = (10,0))

	ttk.Label(
		frame,
		text       = desc,
		anchor     = 'w',
		wraplength = 600-30-30-40
	).pack(fill = 'x', pady = 0, padx = (40,0))