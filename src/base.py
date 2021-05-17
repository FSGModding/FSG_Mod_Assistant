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
import lxml.etree as etree
import webbrowser

class ModCheckRoot() :
	"""Build the app

	Args:
		logger (class): src.data.logger.ModCheckLog instance
		modClass (class): src.data.mods.FSMod
		badClass (class): src.data.badfile.FSBadFile
		scriptMods (list): Known script mods
		conflictMods (dict): Known conflicting mods
		updater (class): src.updater.ModCheckUpdater
	"""	

	def __init__(self, logger, modClass, badClass, falseUnusedMods, conflictMods, updater) :
		self._logger          = logger
		self._configFileName  = None
		self._basePath        = None
		self._modDir          = None
		self._FSMod           = modClass
		self._FSBadFile       = badClass
		self._falseUnusedMods = falseUnusedMods
		self._conflictMods    = conflictMods
		self._updater         = updater(self)

		self._root = Tk.Tk()
		self._root.title("FS19 Mod Checker")
		self._root.minsize(670, 530)
		self._root.option_add( "*font", "Calibri 10" )

		# Change the theme.
		style = ttk.Style()
		style.theme_use('winnative')

		style.map("Treeview",
			foreground=self.fixed_map(style, "foreground"),
			background=self.fixed_map(style, "background"))

		style.configure("modCheck.Treeview", highlightthickness=0, bd=0, font=('Calibri', 10))
		style.configure("modCheck.Treeview.Heading", font=('Calibri', 11,'bold'))

		self._tabNotebook = ttk.Notebook(self._root)
		self._tabNotebook.enable_traversal()
		self._tabNotebook.pack(expand = 1, pady = 0, padx = 0, fill = "both")

		self.tabFrame   = {}
		self.tabContent = {}

		self._configLabels  = {}
		self._configStrings = {}
		self._brokenStrings = {}
		self._IOStrings     = {}

		self._modList = {}
		self._badList = {}

		self.warnUnpacked = Tk.IntVar(value=1)
	
	def fixed_map(self, style, option):
		"""Treeview background color workaround (fixed upstream)

		Args:
			style (ttk.Style): tkinter current style
			option (str): Option name

		Returns:
			list: Option style options, with !disabled and !selected removed.
		"""		
		return [elm for elm in style.map("Treeview", query_opt=option)
				if elm[:2] != ("!disabled", "!selected")]

	def mainloop(self) :
		""" Run the mainloop (Tk) """
		self._root.mainloop()

	def makeMenuBar(self, strings) :
		"""Create the menu bar

		Args:
			strings (list): Menu bar titles
		"""
		menubar  = Tk.Menu(self._root)
		filemenu = Tk.Menu(menubar, tearoff=0)

		filemenu.add_command(label=strings["save-log-file"], command=self._save_log)
		filemenu.add_separator()
		filemenu.add_command(label=strings["exit-program"], command=self._root.quit)

		menubar.add_cascade(label=strings["file-menu"], menu=filemenu)

		self._root.config(menu=menubar)

	def addTab(self, name, **kwargs) :
		"""Add a tab to the main window

		Args:
			name (str): Name of the tab
		"""
		self.tabFrame[name] = ttk.Frame(self._tabNotebook, padding=(9,9,9,9))

		self._tabNotebook.add(self.tabFrame[name], **kwargs)

		self._root.update()

	def makeConfigTab(self, strings) :
		"""Create the content for the Configuration tab

		Args:
			strings (list): Strings used in this window display
		"""
		self._configStrings = strings

		ttk.Label(self.tabFrame["tabConfig"], text=strings['program-description'], wraplength=570, font='Calibri 10 bold', anchor='center' ).pack(fill='x', padx=30, pady=(6,10))
		
		ttk.Label(self.tabFrame["tabConfig"], text=strings['info-ask-for-file'] ).pack(fill='x', pady=(0,12))

		self._loadButton = ttk.Button(self.tabFrame["tabConfig"], text=strings['load-button-label'], command=self._load_main_config)
		self._loadButton.pack(fill='x')
		self._loadButton.bind('<Return>', lambda event=None: self._loadButton.invoke())
		self._loadButton.focus_force()

		self._configLabels["filename"] = ttk.Label(self.tabFrame["tabConfig"], text=strings["info-game-settings"].format(filename = "--"), anchor="center" )
		self._configLabels["filename"].pack(fill='x', pady=(20,0))
			
		self._configLabels["foldername"] = ttk.Label(self.tabFrame["tabConfig"], text=strings["info-mod-folder"].format(folder = "--"), anchor="center" )
		self._configLabels["foldername"].pack(fill='x', pady=(0,20))

		ttk.Label(self.tabFrame["tabConfig"], text=strings["info-ask-process"].format(process_button_label = strings["process-button-label"]) ).pack(fill='x')
		
		self._processButton = ttk.Button(self.tabFrame["tabConfig"], text=strings["process-button-label"], command=self._process_button)
		self._processButton.state(['disabled'])
		self._processButton.pack(fill='x', pady=(12,0))
		
		self._processButton.bind('<Return>', lambda event=None: self._processButton.invoke())

		self._progressBar = ttk.Progressbar(self.tabFrame["tabConfig"])
		self._progressBar.pack(fill='x', pady=(10,0))

		externalFrame = ttk.Frame(self.tabFrame["tabConfig"])
		internalFrame = ttk.Frame()

		counts = [
			["found",   strings["info-mods-found"]],
			["broke",   strings["info-mods-broken"]],
			["present", strings["info-mods-present"]],
			["missing", strings["info-mods-missing"]]
		]

		for rowIdx, detail in enumerate(counts, start=0):
			ttk.Label(internalFrame, text=detail[1]+":").grid(column=0, row=rowIdx, padx=(0,5), sticky=(Tk.E))
			self._configLabels[detail[0]]   = ttk.Label(internalFrame, text="", font='Calibri 18 bold')
			self._configLabels[detail[0]].grid(column=1, row=rowIdx, sticky=(Tk.W))
		
		externalFrame.pack(fill="both", expand=True)
		internalFrame.place(in_=externalFrame, anchor="c", relx=.5, rely=.5)

		ttk.Label(self.tabFrame["tabConfig"], text=strings['latest-version'], wraplength=570, anchor='center' ).pack(fill='x', padx=30, pady=(6,0))
		Link(self.tabFrame["tabConfig"], "https://github.com/jtsage/FS19_Mod_Checker/releases", text="github.com/jtsage/FS19_Mod_Checker").pack(fill='x', padx=30, pady=(0,10))

		self._updater.updateConfigNumbers()

	def addBrokenStrings(self, strings) :
		"""Add broken file explanation strings

		Args:
			strings (list): Broken file descriptions
		"""		
		self._brokenStrings = strings

	def addIOStrings(self, strings) :
		"""Add common file I/O explanation strings

		Args:
			strings (list): common IO descriptions (and some misc)
		"""
		self._IOStrings = strings

	def _load_main_config(self) :
		""" Load and open the main config file, set the mod folder """
		filename = fd.askopenfilename(
			initialdir  = os.path.expanduser("~") + "/Documents/My Games/FarmingSimulator2019",
			initialfile = "gameSettings.xml",
			title       = self._configStrings["load-button-label"] + " : gameSettings.xml",
			filetypes   = [(self._IOStrings["xml-file-type"], ".xml")]
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

				if str(modFolderXML[0].attrib["active"]).lower() == "true":
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
			self._set_progress(0)
			self._processButton.state(['!disabled'])
			self._processButton.focus()

	def _set_progress(self, value) :
		"""Update progress bar and refresh UI

		Args:
			value (int): Progress percentage
		"""
		self._progressBar["value"] = value
		self._progressBar.update()

	def _process_button(self) :
		""" Run the "Process Mods" button """

		# Disable the buttons while we run
		currentProcButtonText = self._processButton["text"]
		currentLoadButtonText = self._loadButton["text"]

		self._configLabels["found"].focus()

		self._processButton["text"] = self._IOStrings["working-pause"]
		self._loadButton["text"]    = self._IOStrings["working-pause"]

		self._processButton.state(['disabled'])
		self._loadButton.state(['disabled'])

		self._root.update()
		self._set_progress(5)

		# Read Mods

		## Glob Files = 5%, Read folders = 25%, Read files = 25%
		self._read_mods_from_folder()
		self._set_progress(60)

		## Each CareerSavegame, Vehicles, Items category = 6%
		self._read_mods_from_saves()
		self._set_progress(80)

		## 5%. Likely over-stated.
		self._read_script_mod()
		self._set_progress(85)

		# Update UI with found mods
		self._logger.start()
		
		self._updater.update_tab_config()
		self._set_progress(90)

		# 5%. Should be in-expensive, except for really bad collections.
		self._updater.update_tab_broken()
		self._set_progress(95)

		self._updater.update_tab_missing()
		self._updater.update_tab_conflict()
		self._updater.update_tab_inactive()
		self._updater.update_tab_unused()
		self._updater.update_tab_good()
		
		self._logger.end()

		# Undo the GUI changes when done processing
		self._set_progress(100)
		self._processButton["text"] = currentProcButtonText
		self._loadButton["text"]    = currentLoadButtonText

		self._processButton.state(['!disabled'])
		self._loadButton.state(['!disabled'])

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
		
		# Clear the lists to be sure
		self._modList.clear()
		self._badList.clear()

		modsGlob = glob.glob(os.path.join(self._modDir, "*"))

		modDirFiles   = [fn for fn in modsGlob 
			if os.path.isdir(fn)]

		modZipFiles   = [fn for fn in modsGlob 
			if os.path.basename(fn).endswith('.zip')]

		for fn in modsGlob:
			if not os.path.basename(fn).endswith('.zip') and not os.path.isdir(fn):
				self._badList[os.path.basename(fn)] = self._FSBadFile(fn, self._brokenStrings)

		# Special Case
		self._modList["FS19_holmerPack"] = self._FSMod("FS19_holmerPack")
		self._modList["FS19_holmerPack"].name("DLC Holmer Terra-Variant Pack")
		self._modList["FS19_holmerPack"].size(133849603)

		self._set_progress(10)
		# Lets parse through the folders.
		for idx, thisMod in enumerate(modDirFiles, start = 1):
			# 10% @start + 20% divided between each folder found.
			self._set_progress(10 + int(20 * (idx / len(modDirFiles))))

			modName  = os.path.basename(thisMod)
			this_dir = pathlib.Path(thisMod)

			self._modList[modName] = self._FSMod(modName)
			self._modList[modName].isFolder(True)
			self._modList[modName].size(sum(f.stat().st_size for f in this_dir.glob('**/*') if f.is_file()))
			self._modList[modName].fullPath(thisMod)

			self._badList[modName] = self._FSBadFile(thisMod, self._brokenStrings)
			self._badList[modName].isFolder(True)

			if ( re.search(r'\W', modName) or re.match(r'[0-9]', modName) or re.search(r'unzip', modName, re.IGNORECASE)) :
				""" Bad name can't be good """
				self._modList[modName].isBad(True)
			else :
				if self._modList[modName].quickTest():
					""" Passed the test, only in the bad list because it is unzipped """
					self._badList[modName].isGood(True)
				else :
					""" Failed the test, mark it bad in the mod list """
					self._modList[modName].isBad(True)

		
		# Next, the zip files
		self._set_progress(30)
		for idx, thisMod in enumerate(modZipFiles, start = 1):
			# 30% @ start, +30% divided between each zip file.
			self._set_progress(30 + int(30 * (idx / len(modZipFiles))))

			modName    = os.path.splitext(os.path.basename(thisMod))[0]
			badModName = os.path.basename(thisMod)
		
			self._modList[modName] = self._FSMod(modName)
			self._modList[modName].fullPath(thisMod)
			self._modList[modName].size(os.path.getsize(thisMod))

			if ( re.search(r'\W', modName) or re.match(r'[0-9]', modName) or re.search(r'unzip', modName, re.IGNORECASE) ) :
				self._modList[modName].isBad(True)
				self._badList[badModName] = self._FSBadFile(thisMod, self._brokenStrings)
			else :
				if not self._modList[modName].quickTest():
					self._modList[modName].isBad(True)
					self._badList[badModName] = self._FSBadFile(thisMod, self._brokenStrings)
 

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
					self._modList[thisModName] = self._FSMod(thisModName)
					self._modList[thisModName].isActive(thisSavegame)
					self._modList[thisModName].isMissing(True)
					self._modList[thisModName].name(thisMod.attrib["title"])


		#Next up, vehicles
		self._set_progress(66)
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
		self._set_progress(74)
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
		for thisMod in self._falseUnusedMods:
			if thisMod in self._modList.keys():
				self._modList[thisMod].setUsedToActive()


class Link(Tk.Label):
	"""Make a clickable hyperlink label

	Args:
		master (object, optional): tkinter object parent. Defaults to None.
		link (str, optional): Link URL. Defaults to None.
		fg (str, optional): Foreground color (inactive). Defaults to 'black'.
		font (tuple, optional): Font of the link. Defaults to ('Calibri', 10).
		text (str): Passed to label, text to display
	"""	
	
	def __init__(self, master=None, link=None, fg='black', font=('Calibri', 10), *args, **kwargs):
		super().__init__(master, *args, **kwargs)
		self.master           = master
		self._color_mouse_off = fg
		self._color_mouse_on  = "blue"
		self._font_mouse_off  = font
		self._font_mouse_on   = font + ('underline',)
		self._link            = link

		self['fg']   = self._color_mouse_off
		self['font'] = self._font_mouse_off

		self.bind('<Enter>',    self._mouse_on)
		self.bind('<Leave>',    self._mouse_out)
		self.bind('<Button-1>', self._callback)

	def _mouse_on(self, *args):
		self['fg']   = self._color_mouse_on
		self['font'] = self._font_mouse_on

	def _mouse_out(self, *args):
		self['fg']   = self._color_mouse_off
		self['font'] = self._font_mouse_off

	def _callback(self, *args):
		webbrowser.open_new(self._link)