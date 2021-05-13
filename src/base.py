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
import webbrowser

class ModCheckRoot() :
	"""
	Build the app

	Keyword Arguments:
	  version      -- current version string
	  logger       -- class ModCheckLog from src.data.logger instance
	  icon         -- Path to program icon file, string
	  modClass     -- Base class FSMod from src.data.mods
	  badClass     -- Base class FSBadFile from src.data.badfile
	  scriptMods   -- list of known script mods
	  conflictMods -- dict of known conflicting mods
	  updater      -- Base class ModCheckUpdater from src.updater
	"""

	def __init__(self, version, logger, icon, modClass, badClass, scriptMods, conflictMods, updater) :
		
		self._version        = version
		self._logger         = logger
		self._configFileName = None
		self._basePath       = None
		self._modDir         = None
		self._FSMod          = modClass
		self._FSBadFile      = badClass
		self._scriptMods     = scriptMods
		self._conflictMods   = conflictMods
		self._updater        = updater(self)

		self._root = Tk.Tk()
		self._root.title("FS19 Mod Checker v" + self._version)
		self._root.minsize(670, 500)
		self._root.option_add( "*font", "Calibri 10" )

		# Change the theme.
		style = ttk.Style()
		style.theme_use('winnative')

		style.map("Treeview",
			foreground=self.fixed_map(style, "foreground"),
			background=self.fixed_map(style, "background"))

		style.configure("modCheck.Treeview", highlightthickness=0, bd=0, font=('Calibri', 10))
		style.configure("modCheck.Treeview.Heading", font=('Calibri', 11,'bold'))

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
		self._badList = {}
	
	def fixed_map(self, style, option):
		""" This is a workaround for background color not working in treeview on current 
		version of Tk included with python.  Presumably, this gets nuked sometime soon. 2021-05-13
		"""
		return [elm for elm in style.map("Treeview", query_opt=option)
				if elm[:2] != ("!disabled", "!selected")]


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

		externalFrame = ttk.Frame(self.tabFrame["tabConfig"])
		internalFrame = ttk.Frame()

		ttk.Label(internalFrame, text=strings["info-mods-found"]+":").grid(column=0, row=0, padx=(0,5), sticky=(Tk.E))
		ttk.Label(internalFrame, text=strings["info-mods-broken"]+":").grid(column=0, row=1, padx=(0,5), sticky=(Tk.E))
		ttk.Label(internalFrame, text=strings["info-mods-folders"]+":").grid(column=0, row=2, padx=(0,5), sticky=(Tk.E))
		ttk.Label(internalFrame, text=strings["info-mods-missing"]+":").grid(column=0, row=3, padx=(0,5), sticky=(Tk.E))

		self._configLabels["found"]   = ttk.Label(internalFrame, text="", font='Calibri 18 bold')
		self._configLabels["broke"]   = ttk.Label(internalFrame, text="", font='Calibri 18 bold')
		self._configLabels["folder"]  = ttk.Label(internalFrame, text="", font='Calibri 18 bold')
		self._configLabels["missing"] = ttk.Label(internalFrame, text="", font='Calibri 18 bold')

		self._configLabels["found"].grid(column=1, row=0, sticky=(Tk.W))
		self._configLabels["broke"].grid(column=1, row=1, sticky=(Tk.W))
		self._configLabels["folder"].grid(column=1, row=2, sticky=(Tk.W))
		self._configLabels["missing"].grid(column=1, row=3, sticky=(Tk.W))

		externalFrame.pack(fill="both", expand=True)
		internalFrame.place(in_=externalFrame, anchor="c", relx=.5, rely=.5)

		ttk.Label(self.tabFrame["tabConfig"], text=strings['latest-version'], wraplength=570, anchor='center' ).pack(fill='x', padx=30, pady=(6,0))
		# cspell: disable-next-line 
		Link(self.tabFrame["tabConfig"], "https://github.com/jtsage/FS19_Mod_Checker/releases", text="github.com/jtsage/FS19_Mod_Checker").pack(fill='x', padx=30, pady=(0,10))

		self._updater.updateConfigNumbers()

	def addBrokenStrings(self, strings) :
		""" Add broken strings to class """
		self._brokenStrings = strings

	def addIOStrings(self, strings) :
		""" Add common IO strings to class """
		self._IOStrings = strings

	def _load_main_config(self) :
		""" Load and open the main config file, set the mod folder """
		filename = fd.askopenfilename(
			#initialdir  = os.path.expanduser("~") + "/Documents/My Games/FarmingSimulator2019",
			initialdir  = os.path.expanduser("~") + "/Desktop/GitHub Projects/FS19_Mod_Checker/testFolder",
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

		# Disable the buttons while we run
		currentButtonText = self._processButton["text"]
		self._configLabels["found"].focus()
		self._processButton["text"] = self._IOStrings["working-pause"]
		self._processButton.state(['disabled'])
		self._loadButton.state(['disabled'])
		self._root.config(cursor="watch")
		self._root.update()
		
		
		self._read_mods_from_folder()
		self._read_mods_from_saves()
		self._read_script_mod()

		self._logger.empty()
		self._logger.header()

		self._updater.update_tab_config()
		self._updater.update_tab_broken()
		self._updater.update_tab_missing()
		self._updater.update_tab_conflict()
		self._updater.update_tab_inactive()
		self._updater.update_tab_unused()
		self._updater.update_tab_good()
	
		self._logger.footer()

		# Undo the GUI changes when done processing
		self._processButton["text"] = currentButtonText
		self._processButton.state(['!disabled'])
		self._loadButton.state(['!disabled'])
		self._configLabels["found"].focus()
		self._root.config(cursor="")
		
		
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

		
		for fn in modsGlob:
			if not os.path.basename(fn).endswith('.zip') and not os.path.isdir(fn):
				# Invalid file, add to bad List
				self._badList[os.path.basename(fn)] = self._FSBadFile(fn, self._brokenStrings)

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

			self._badList[modName] = self._FSBadFile(thisMod, self._brokenStrings)
			self._badList[modName].isFolder(True)

			if ( re.search(r'\W', modName) or re.match(r'[0-9]', modName) or re.search(r'unzip', modName, re.IGNORECASE)) :
				self._modList[modName].isBad(True)
			else :
				if self._modList[modName].quickTest():
					self._badList[modName].isGood(True)

		
		# Next, the zip files
		for thisMod in modZipFiles:
			modName    = os.path.splitext(os.path.basename(thisMod))[0]
			badModName = os.path.basename(thisMod)
		
			self._modList[modName] = self._FSMod()
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


class Link(Tk.Label):
	""" Real simple Tk.label hyperlink class """
	
	def __init__(self, master=None, link=None, fg='grey', font=('Arial', 10), *args, **kwargs):
		super().__init__(master, *args, **kwargs)
		self.master = master
		self.default_color = fg # keeping track of the default color 
		self.color = 'blue'   # the color of the link after hovering over it 
		self.default_font = font    # keeping track of the default font
		self.link = link 

		""" setting the fonts as assigned by the user or by the init function  """
		self['fg'] = fg
		self['font'] = font 

		""" Assigning the events to private functions of the class """

		self.bind('<Enter>', self._mouse_on)    # hovering over 
		self.bind('<Leave>', self._mouse_out)   # away from the link
		self.bind('<Button-1>', self._callback) # clicking the link

	def _mouse_on(self, *args):
		""" 
			if mouse on the link then we must give it the blue color and an 
			underline font to look like a normal link
		"""
		self['fg'] = self.color
		self['font'] = self.default_font + ('underline', )

	def _mouse_out(self, *args):
		""" 
			if mouse goes away from our link we must reassign 
			the default color and font we kept track of   
		"""
		self['fg'] = self.default_color
		self['font'] = self.default_font

	def _callback(self, *args):
		webbrowser.open_new(self.link)