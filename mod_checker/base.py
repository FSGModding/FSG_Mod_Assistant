#  _______           __ ______ __                __               
# |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
# |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
# |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

# Base Window Operations

# (c) 2021 JTSage.  MIT License.
import tkinter as Tk
import tkinter.ttk as ttk
import tkinter.filedialog as fd
import tkinter.messagebox as mb
import os
import re
import glob
import pathlib
import distutils.util as util
import lxml.etree as etree

class ModCheckRoot() :

	def __init__(self, version, logger, icon, modClass, scriptMods, conflictMods) :
		""" Build the app

		 * version      - current version string
		 * logger       - an instance of mod_checker.data.logger.ModCheckLog()
		 * icon         - Path to icon file, string
		 * modClass     - the FSMod class from mod_checker.data.mods
		 * scriptMods   - list of known script mods
		 * conflictMods - dictionary of known conflicting mods
		"""
		self._version        = version
		self._logger         = logger
		self._configFileName = None
		self._basePath       = None
		self._modDir         = None
		self._FSMod          = modClass
		self._scriptMods     = scriptMods
		self._conflictMods   = conflictMods

		self._root = Tk.Tk()
		self._root.title("FS19 Mod Checker v" + self._version)
		self._root.minsize(650, 500)

		# Change the theme.
		style = ttk.Style()
		style.theme_use('winnative')

		self._mainIconImage = Tk.PhotoImage(file = icon)
		self._root.iconphoto(False, self._mainIconImage)

		self._tabNotebook = ttk.Notebook(self._root)
		self._tabNotebook.enable_traversal()
		self._tabNotebook.pack(expand = 1, pady = 0, padx = 0, fill = "both")

		self.tabFrame = {}
		self.tabContent = {}

		self._configLabels  = {}
		self._configStrings = {}
		self._brokenStrings = {}
		self._IOStrings     = {}

		self._modList = {}
		self._badMods = None
		
	def mainloop(self) :
		""" Run the mainloop (Tk) """
		self._root.mainloop()

	def makeMenuBar(self, strings) :
		""" Create a menu bar """
		menubar  = Tk.Menu(self._root)
		filemenu = Tk.Menu(menubar, tearoff=0)

		filemenu.add_command(label=strings["save-log-file"], command=self._save_log)
		filemenu.add_separator()
		filemenu.add_command(label=strings["exit-program"], command=self._root.quit)

		menubar.add_cascade(label=strings["file-menu"], menu=filemenu)

		self._root.config(menu=menubar)

	def addTab(self, name, **kwargs) :
		""" Add a tab to the main window"""
		self.tabFrame[name] = ttk.Frame(self._tabNotebook, padding=(9,9,9,9))

		self._tabNotebook.add(self.tabFrame[name], **kwargs)

		self._root.update()

	def makeConfigTab(self, strings) :
		""" Create the content for the Configuration tab """
		self._configStrings = strings

		ttk.Label(self.tabFrame["tabConfig"], text=strings['info-ask-for-file'] ).pack(fill='x', pady=(6,20))

		loadButton = ttk.Button(self.tabFrame["tabConfig"], text=strings['load-button-label'], command=self._load_main_config)
		loadButton.pack(fill='x')
		loadButton.bind('<Return>', lambda event=None: loadButton.invoke())
		loadButton.focus()

		self._configLabels["filename"] = ttk.Label(self.tabFrame["tabConfig"], text=strings["info-game-settings"].format(filename = "--"), anchor="center" )
		self._configLabels["filename"].pack(fill='x', pady=(20,0))
			
		self._configLabels["foldername"] = ttk.Label(self.tabFrame["tabConfig"], text=strings["info-mod-folder"].format(folder = "--"), anchor="center" )
		self._configLabels["foldername"].pack(fill='x', pady=(0,20))
		
		ttk.Label(self.tabFrame["tabConfig"], text=strings["info-ask-process"].format(process_button_label = strings["process-button-label"]) ).pack(fill='x')
		
		self._processButton = ttk.Button(self.tabFrame["tabConfig"], text=strings["process-button-label"], command=self._process_button)
		self._processButton.state(['disabled'])
		self._processButton.pack(fill='x', pady=(20,0))
		
		self._processButton.bind('<Return>', lambda event=None: self._processButton.invoke())

		externalFrame = ttk.Frame(self.tabFrame["tabConfig"])
		internalFrame = ttk.Frame()

		ttk.Label(internalFrame, text=strings["info-mods-found"]+":").grid(column=0, row=0, padx=(0,5), sticky=(Tk.E))
		ttk.Label(internalFrame, text=strings["info-mods-broken"]+":").grid(column=0, row=1, padx=(0,5), sticky=(Tk.E))
		ttk.Label(internalFrame, text=strings["info-mods-folders"]+":").grid(column=0, row=2, padx=(0,5), sticky=(Tk.E))
		ttk.Label(internalFrame, text=strings["info-mods-missing"]+":").grid(column=0, row=3, padx=(0,5), sticky=(Tk.E))

		self._configLabels["found"]   = ttk.Label(internalFrame, text="", font='Helvetica 18 bold')
		self._configLabels["broke"]   = ttk.Label(internalFrame, text="", font='Helvetica 18 bold')
		self._configLabels["folder"]  = ttk.Label(internalFrame, text="", font='Helvetica 18 bold')
		self._configLabels["missing"] = ttk.Label(internalFrame, text="", font='Helvetica 18 bold')

		self._configLabels["found"].grid(column=1, row=0, sticky=(Tk.W))
		self._configLabels["broke"].grid(column=1, row=1, sticky=(Tk.W))
		self._configLabels["folder"].grid(column=1, row=2, sticky=(Tk.W))
		self._configLabels["missing"].grid(column=1, row=3, sticky=(Tk.W))

		externalFrame.pack(fill="both", expand=True)
		internalFrame.place(in_=externalFrame, anchor="c", relx=.5, rely=.5)

		self._updateConfigNumbers()

	def addBrokenStrings(self, strings) :
		""" Add broken strings to class """
		self._brokenStrings = strings

	def addIOStrings(self, strings) :
		""" Add common IO strings to class """
		self._IOStrings = strings
	
	def _updateConfigNumbers(self, found = 0, broke = 0, missing = 0, folder = 0) :
		""" Update the number counts on the config tab """
		self._configLabels["found"].config(text = str(found))
		self._configLabels["broke"].config(text = str(broke))
		self._configLabels["folder"].config(text = str(folder))
		self._configLabels["missing"].config(text = str(missing))

	def _load_main_config(self) :
		""" Load and open the main config file, set the mod folder """
		filename = fd.askopenfilename(
			initialdir  = os.path.expanduser("~") + "/Documents/My Games/FarmingSimulator2019",
			initialfile = "gameSettings.xml",
			title       = self._configStrings["load-button-label"] + " : gameSettings.xml",
			filetypes   = [(self._IOStrings["xml-file-type"], "gameSettings.xml")]
		)

		if filename : 
			self._configFileName = filename
			self._basePath       = filename[0:-16]
			self._modDir         = os.path.join(self._basePath, "mods")

			try:
				configFileTree = etree.parse(self._configFileName)
			except:
				mb.showerror(title="Error", message=self._IOStrings["error-open-settings"].format(filename = filename))
				return


			try:
				modFolderXML = configFileTree.xpath("/gameSettings/modsDirectoryOverride")

				if util.strtobool(modFolderXML[0].attrib["active"]) :
					self._modDir = modFolderXML[0].attrib["directory"]
			except IndexError :
				mb.showerror(title="Error", message=self._IOStrings["error-not-settings"])
				return
			except :
				mb.showerror(title="Error", message=self._IOStrings["error-open-settings"].format(filename = filename))
				return

			## Update the config tab to show the chosen filename, and enable the process button
			self._configLabels["filename"].config(text = self._configStrings["info-game-settings"].format(filename = self._configFileName))
			self._configLabels["foldername"].config(text = self._configStrings["info-mod-folder"].format(folder = self._modDir))
			self._processButton.state(['!disabled'])
			self._processButton.focus()


	def _process_button(self) :
		""" Run the "Process Mods" button """
		self._read_mods_from_folder()
		self._read_mods_from_saves()
		self._read_script_mod()

		self._logger.empty()
		self._logger.header()

		self._update_tab_config()
		self._update_tab_broken()
		self._update_tab_missing()
		self._update_tab_conflict()
		self._update_tab_inactive()
		self._update_tab_unused()
	
		self._logger.footer()

		# Hackish way to un-focus the process button
		self._configLabels["found"].focus()
		
		
	def _save_log(self) :
		""" Save the log to a file on disk (button) """
		try:
			fileWrite = fd.asksaveasfile(
				mode        = "w", 
				initialdir  = os.path.expanduser("~"),
				initialfile = self._IOStrings["save-log-filename"],
				title       = self._IOStrings["save-log-title"],
				filetypes   = [(self._IOStrings["txt-file-type"], ".txt")]
			)
			fileWrite.write(self._logger.readAll())
			fileWrite.close()
			mb.showinfo(title="Saved", message=self._IOStrings["save-log-ok"])
		except:
			mb.showerror(title="Error", message=self._IOStrings["save-log-error"])
		

	def _read_mods_from_folder(self) :
		""" Read the mods that are in the mods folder """
		modsGlob = glob.glob(os.path.join(self._modDir, "*"))

		modDirFiles   = [fn for fn in modsGlob 
			if os.path.isdir(fn)]
		modZipFiles   = [fn for fn in modsGlob 
			if os.path.basename(fn).endswith('.zip')]
		self._badMods = [os.path.basename(fn) for fn in modsGlob 
			if not os.path.basename(fn).endswith('.zip') and not os.path.isdir(fn)]


		# Empty the mod list for scan or re-scan
		self._modList.clear()

		# Special Case
		self._modList["FS19_holmerPack"] = self._FSMod()
		self._modList["FS19_holmerPack"].name("DLC Holmer Terra-Variant Pack")
		self._modList["FS19_holmerPack"].size(133849603)


		# Lets parse through the folders.
		for thisMod in modDirFiles:
			modName  = os.path.basename(thisMod)
			this_dir = pathlib.Path(thisMod)

			self._modList[modName] = self._FSMod()
			self._modList[modName].isFolder(True)
			self._modList[modName].size(sum(f.stat().st_size for f in this_dir.glob('**/*') if f.is_file()))
			self._modList[modName].fullPath(thisMod)

			if ( re.search(r'\W', modName) or re.match(r'[0-9]', modName) or re.search(r'unzip', modName, re.IGNORECASE)) :
				self._modList[modName].isBad(True)
		
		# Next, the zip files
		for thisMod in modZipFiles:
			modName = os.path.splitext(os.path.basename(thisMod))[0]
		
			self._modList[modName] = self._FSMod()
			self._modList[modName].fullPath(thisMod)
			self._modList[modName].size(os.path.getsize(thisMod))

			if ( re.search(r'\W', modName) or re.match(r'[0-9]', modName) or re.search(r'unzip', modName, re.IGNORECASE) ) :
				self._modList[modName].isBad(True)

	def _read_mods_from_saves(self) :
		""" Read the mods that are referenced in the savegames """
		filesVehicles = glob.glob(os.path.join(self._basePath, "savegame*/vehicles.xml"))
		filesCareer   = glob.glob(os.path.join(self._basePath, "savegame*/careerSavegame.xml"))
		filesItems    = glob.glob(os.path.join(self._basePath, "savegame*/items.xml"))


		# Alright, lets look at careerSavegame
		for thisFile in filesCareer:
			try:
				thisXML = etree.parse(thisFile)
			except:
				continue

			thisSavegame = re.search(r'savegame(\d+)', thisFile)[1]
			
			theseMods = thisXML.xpath("/careerSavegame/mod")

			for thisMod in theseMods:
				if "modName" not in thisMod.attrib or thisMod.attrib["modName"].startswith("pdlc") :
					# Skip blanks and paid DLC content
					continue
				else :
					thisModName = thisMod.attrib["modName"]

				if thisModName in self._modList.keys() :
					# Existing mod, mark it active 
					self._modList[thisModName].isActive(thisSavegame)
					self._modList[thisModName].name(thisMod.attrib["title"])
				else :
					# Missing Mod, we should add it to the list
					self._modList[thisModName] = self._FSMod()
					self._modList[thisModName].isActive(thisSavegame)
					self._modList[thisModName].isMissing(True)
					self._modList[thisModName].name(thisMod.attrib["title"])


		#Next up, vehicles
		for thisFile in filesVehicles:
			try:
				thisXML = etree.parse(thisFile)
			except:
				continue

			thisSavegame = re.search(r'savegame(\d+)', thisFile)[1]
		
			theseMods = thisXML.xpath("/vehicles/vehicle")

			for thisMod in theseMods:
				# Trap for missing mods, but they should all be "found" by now
				if "modName" not in thisMod.attrib or thisMod.attrib["modName"].startswith("pdlc") :
					continue
				if thisMod.attrib["modName"] in self._modList.keys() :
					self._modList[thisMod.attrib["modName"]].isUsed(thisSavegame)


		# Finally, lets do items
		for thisFile in filesItems:
			try:
				thisXML = etree.parse(thisFile)
			except:
				continue

			thisSavegame = re.search(r'savegame(\d+)', thisFile)[1]
			theseMods    = thisXML.xpath("/items/item")

			for thisMod in theseMods:
				# Trap for missing mods, but they should all be "found" by now
				if "modName" not in thisMod.attrib or thisMod.attrib["modName"].startswith("pdlc") :
					continue
				if thisMod.attrib["modName"] in self._modList.keys() :
					self._modList[thisMod.attrib["modName"]].isUsed(thisSavegame)

	def _read_script_mod(self) :
		"""Deal with the script only mods - any game they are active in, assume they are also used. """
		for thisMod in self._scriptMods:
			if thisMod in self._modList.keys():
				self._modList[thisMod].setUsedToActive()

	def _update_tab_config(self) :
		""" Update the configuration tab """
		broken  = { k for k, v in self._modList.items() if v.isBad() }
		folder  = { k for k, v in self._modList.items() if v.isFolder() }
		missing = { k for k, v in self._modList.items() if v.isMissing() }

		self._updateConfigNumbers(
			found   = len(self._modList),
			broke   = len(broken) + len(self._badMods),
			folder  = len(folder),
			missing = len(missing)
		)

		self._logger.write([
			self._configStrings["info-mods-found"] + ": {}".format(len(self._modList)),
			self._configStrings["info-mods-broken"] + ": {}".format(len(broken) + len(self._badMods)),
			self._configStrings["info-mods-folders"] + ": {}".format(len(folder)),
			self._configStrings["info-mods-missing"] + ": {}".format(len(missing)),
		])
		self._logger.line()

	def _update_tab_broken(self) :
		""" Update the broken mods list """
		broken = { k for k, v in self._modList.items() if v.isBad() }
		folder = { k for k, v in self._modList.items() if v.isFolder() and v.isGood() }

		self.tabContent["tabBroken"].clear_items()
	
		self._logger.write(self.tabContent["tabBroken"].title + ":")
	
		# First, bad names, they won't load
		for thisMod in sorted(broken, key=str.casefold) :
			# Trap message.  Should never display, but just in case.
			message = self._brokenStrings["default"]
		
			if ( re.search(r'unzip', thisMod, re.IGNORECASE) ) :
				# If it has "unzip" in the file/folder name, assume it is a pack or other mods.
				message = self._brokenStrings["unzip-folder"] if self._modList[thisMod].isFolder() else self._brokenStrings["unzip-zipfile"]
			elif ( re.match(r'[0-9]',thisMod) ) :
				# If it starts with a digit, something went way wrong.  Might be a pack, or it might be garbage.
				message = self._brokenStrings["digit-folder"] if self._modList[thisMod].isFolder() else self._brokenStrings["digit-zipfile"]
			else :
				# Finally, test for the common copy/paste file names, and duplicate downloads.
				testWinCopy = re.search(r'(\w+) - .+', thisMod)
				testDLCopy = re.search(r'(\w+) \(.+', thisMod)
				goodName = False
				if ( testWinCopy or testDLCopy ) :
					if ( testWinCopy and testWinCopy[1] in self._modList.keys() ) :
						# Does the guessed "good name" already exist?
						goodName = testWinCopy[1]
					if ( testDLCopy and testDLCopy[1] in self._modList.keys() ) :
						# Does the guessed "good name" already exist?
						goodName = testDLCopy[1]

					if ( goodName ) :
						message = self._brokenStrings["duplicate-have"].format(guessedModName = goodName)
					else :
						message = self._brokenStrings["duplicate-miss"]

				else :
					# Trap for when we can't figure out what is wrong with it.
					message = self._brokenStrings["unknown-folder"] if self._modList[thisMod].isFolder() else self._brokenStrings["unknown-zipfile"]
			
			self.tabContent["tabBroken"].add_item(
				thisMod + self._modList[thisMod].getZip(),
				message
			)
						
			self._logger.write("  {} - {}".format(
				thisMod + self._modList[thisMod].getZip(),
				message
			))

		# Next, unzipped folders that shouldn't be
		for thisMod in sorted(folder, key=str.casefold) :
			# No real logic here.  If it's a folder, suggest it be zipped.
			#
			# We have no real way of catching the case of a mod being unzipped directly to the root
			# mods folder, there are far too many variations - and although many mods follow the 
			# FS19 prefix convention, not all do, nor is it a requirement.

			self.tabContent["tabBroken"].add_item(
				thisMod,
				self._brokenStrings["must-be-zipped"]
			)
			self._logger.write("  {} - {}".format(
				thisMod,
				self._brokenStrings["must-be-zipped"]
			))

	
		# Finally, trash that just shouldn't be there 
		#
		# This would be anything other than a folder or a zip file. We could take a guess at other
		# archives, but thats about it.
		for thisFile in self._badMods :
			message = self._brokenStrings["garbage-default"]


			for thisArchive in [ ".7z", ".rar" ] :
				if thisFile.endswith(thisArchive) :
					message = self._brokenStrings["garbage-archive"]


			self.tabContent["tabBroken"].add_item(
				thisFile,
				message
			)
			self._logger.write("  {} - {}".format(
				thisFile,
				message
			))

		self._logger.line()

	def _update_tab_missing(self) :
		""" Update the missing mods list """
		missing = { k for k, v in self._modList.items() if v.isMissing() }

		# Clear out the tree first
		self.tabContent["tabMissing"].clear_items()

		self._logger.write(self.tabContent["tabMissing"].title + ":")

	
		for thisMod in sorted(missing, key=str.casefold) :
			self.tabContent["tabMissing"].add_item(thisMod, (
				thisMod,
				self._modList[thisMod].name(),
				self._IOStrings["YES"] if self._modList[thisMod].isUsed() else self._IOStrings["no"],
				self._modList[thisMod].getAllActive()
			))

			self._logger.write("  " + "{modName} ({modTitle}) [{savegames}] {isOwned}".format(
				modName   = thisMod,
				modTitle  = self._modList[thisMod].name(),
				savegames = self._modList[thisMod].getAllActive(True),
				isOwned   = ("(" + self._IOStrings["OWNED"] + ")") if self._modList[thisMod].isUsed() else ""
			))

		self._logger.line()

	def _update_tab_inactive(self) :
		""" Update the inactive mods list """
		inactive = { k for k, v in self._modList.items() if v.isNotUsed() and v.isNotActive() and v.isGood()  }

		# Clear out the tree first
		self.tabContent["tabInactive"].clear_items()
	
		self._logger.write(self.tabContent["tabInactive"].title+":")

		for thisMod in sorted(inactive, key=str.casefold) :
			self.tabContent["tabInactive"].add_item(thisMod, (
				thisMod,
				self._modList[thisMod].size()
			))

			self._logger.write("  {} ({})".format(
				thisMod,
				self._modList[thisMod].size()
			))

		self._logger.line()

	def _update_tab_unused(self) :
		""" Update the active but un-used mods list """
		unused = { k for k, v in self._modList.items() if v.isNotUsed() and v.isActive() and v.isGood() and v.isNotMissing() }

		self.tabContent["tabUnused"].clear_items()
	
		self._logger.write(self.tabContent["tabUnused"].title+":")


		for thisMod in sorted(unused, key=str.casefold) :
			self.tabContent["tabUnused"].add_item(thisMod, (
				thisMod,
				self._modList[thisMod].name(),
				self._modList[thisMod].getAllActive(),
				self._modList[thisMod].size()
			))

			self._logger.write("  " + "{modName} ({modTitle}) [{savegames}] ({modFileSize})".format(
				modName     = thisMod,
				modTitle    = self._modList[thisMod].name(),
				savegames   = self._modList[thisMod].getAllActive(True),
				modFileSize = self._modList[thisMod].size()
			))
		
		self._logger.line()

	def _update_tab_conflict(self):
		""" Update the possible conflicts tab """
		self.tabContent["tabConflict"].clear_items()
	
		for thisMod in sorted(self._conflictMods.keys(), key=str.casefold) :
			if thisMod in self._modList.keys():
				# Page through all known conflicts and compare it to the list
				# of INSTALLED mods.  We are attempting to warn what COULD maybe
				# happen, not what IS happening

				if self._conflictMods[thisMod]["confWith"] is None :
					# confWith is None, so it's a general warning
					self.tabContent["tabConflict"].add_item(thisMod, self._conflictMods[thisMod]["message"])

				else :
					# confWith is a list, so lets see if a conflicting mod is installed
					isConflicted = False
					for confMod in self._conflictMods[thisMod]["confWith"] :
						if confMod in self._modList.keys() :
							# At least one conflicting mod is present
							isConflicted = True
					if isConflicted :
						self.tabContent["tabConflict"].add_item(thisMod, self._conflictMods[thisMod]["message"])