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

	def __init__(self, version, logger, icon) :
		self._version        = version
		self._logger         = logger
		self._configFileName = None
		self._basePath       = None
		self._modDir         = None

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

		self._configLabels = {}
		
	def mainloop(self) :
		self._root.mainloop()

	def makeMenuBar(self, strings) :
		menubar  = Tk.Menu(self._root)
		filemenu = Tk.Menu(menubar, tearoff=0)

		filemenu.add_command(label=strings["save-log-file"], command=self._save_log)
		filemenu.add_separator()
		filemenu.add_command(label=strings["exit-program"], command=self._root.quit)

		menubar.add_cascade(label=strings["file-menu"], menu=filemenu)

		self._root.config(menu=menubar)

	def addTab(self, name, **kwargs) :
		self.tabFrame[name] = ttk.Frame(self._tabNotebook, padding=(9,9,9,9))

		self._tabNotebook.add(self.tabFrame[name], **kwargs)

		self._root.update()

	def makeConfigTab(self, strings) :
		ttk.Label(self.tabFrame["tabConfig"], text=strings['info-ask-for-file'] ).pack(fill='x', pady=(6,20))

		self._loadButtonLabel = strings['load-button-label']
		loadButton = ttk.Button(self.tabFrame["tabConfig"], text=strings['load-button-label'], command=self._load_main_config)
		loadButton.pack(fill='x')
		loadButton.bind('<Return>', lambda event=None: loadButton.invoke())
		loadButton.focus()

		self._configLabels["filename_label"] = strings["info-game-settings"]

		self._configLabels["filename"] = ttk.Label(self.tabFrame["tabConfig"], text=strings["info-game-settings"].format(filename = "--"), anchor="center" )
		self._configLabels["filename"].pack(fill='x', pady=(20,0))
		
		self._configLabels["folder_label"] = strings["info-mod-folder"]
		
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

		self.updateConfigNumbers()
	
	def updateConfigNumbers(self, found = 0, broke = 0, missing = 0, folder = 0) :
		self._configLabels["found"].config(text = str(found))
		self._configLabels["broke"].config(text = str(broke))
		self._configLabels["folder"].config(text = str(folder))
		self._configLabels["missing"].config(text = str(missing))

	def _load_main_config(self) :
		filename = fd.askopenfilename(
			initialdir  = os.path.expanduser("~") + "/Documents/My Games/FarmingSimulator2019",
			initialfile = "gameSettings.xml",
			title       = self._loadButtonLabel + " : gameSettings.xml",
			filetypes   = [("XML", "gameSettings.xml")]
		)

		if filename : 
			self._configFileName = filename
			self._basePath       = filename[0:-16]
			self._modDir         = os.path.join(self._basePath, "mods")

			try:
				configFileTree = etree.parse(self._configFileName)
			except:
				mb.showerror(title="Error", message="Error Opening {filename}".format(filename = filename))
				return


			try:
				modFolderXML = configFileTree.xpath("/gameSettings/modsDirectoryOverride")

				if util.strtobool(modFolderXML[0].attrib["active"]) :
					self._modDir = modFolderXML[0].attrib["directory"]
			except IndexError :
				mb.showerror(title="Error", message="Not a settings file".format(filename = filename))
				return
			except :
				mb.showerror(title="Error", message="Error Opening {filename}".format(filename = filename))
				return

			## Update the config tab to show the chosen filename, and enable the process button
			self._configLabels["filename"].config(text = self._configLabels["filename_label"].format(filename = self._configFileName))
			self._configLabels["foldername"].config(text = self._configLabels["folder_label"].format(folder = self._modDir))
			self._processButton.state(['!disabled'])
			self._processButton.focus()


	def _process_button(self) :
		i = 1
		i += 1

	def _save_log(self) :
		i = 1
		i = i + 1
