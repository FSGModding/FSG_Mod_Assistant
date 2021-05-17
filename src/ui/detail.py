#  _______           __ ______ __                __               
# |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
# |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
# |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

# Re-Usable UI Elements - Detail Window

# (c) 2021 JTSage.  MIT License.

import tkinter as Tk
import tkinter.ttk as ttk
import locale

class ModCheckDetailWin() :
	"""Make the details window for a specific mod

	Args:
		rootWindow (object): Root window object
		mod (str): modName key
	""" 

	def __init__(self, rootWindow, mod) :
		self._theMod      = rootWindow._modList[mod]
		self._rootWindow  = rootWindow

		self._thisWindow  = Tk.Toplevel(self._rootWindow._root.winfo_toplevel())

		self._okButton      = None
		self._vertScrollbar = None
		self._scrollCanvas  = None
		self._inCanvasFrame = None

		self._title()
		self._logo_and_detail()

		if self._theMod.isNotMissing() :
			self._canvas_desc()

	def _title(self) :
		"""Create window, set title, bind <esc> to close """
		self._thisWindow.title(self._theMod.modName)
		self._thisWindow.geometry("650x450")

		if self._theMod.name() is None:
			self._theMod.getModDescName()

		modTitle = self._theMod.name() or self._theMod.modName

		ttk.Label(self._thisWindow, font='Calibri 12 bold', text=modTitle, anchor='center').pack(fill='x', pady=(10,5))

		self._thisWindow.bind("<Escape>", lambda x: self._thisWindow.destroy())
		
	def _logo_and_detail(self) :
		"""Do the mod logo, and the list of details we know about the mod """

		mainFrame = Tk.Frame(self._thisWindow)
		mainFrame.pack(fill='x', anchor='center', padx=10, pady=(0,10), expand=True)
		
		Tk.Grid.columnconfigure(mainFrame, 0, weight=1)
		Tk.Grid.columnconfigure(mainFrame, 1, weight=1)

		thisIconImage = self._theMod.getIconFile(self._thisWindow)

		doIcon = bool(thisIconImage is not None)
		
		if doIcon:
			thisIconLabel = Tk.Label(mainFrame, anchor='nw')
			thisIconLabel.image = thisIconImage  # <== this is were we anchor the img object
			thisIconLabel.configure(image=thisIconImage)
			thisIconLabel.grid(column=0, row=0)

		subFrame = Tk.Frame(mainFrame)

		if doIcon:
			subFrame.grid(column=1, row=0, sticky='ew')
		else:
			subFrame.grid(column=0, columnspan=2, row=0, sticky='ew')

		Tk.Grid.columnconfigure(subFrame, 0, weight=1)
		Tk.Grid.columnconfigure(subFrame, 1, weight=1)

		typeString = self._rootWindow._IOStrings["type-zip-file"]
		if self._theMod.bothFolderAndZip :
			typeString += " & " + self._rootWindow._IOStrings["type-folder"]
		if self._theMod.isFolder() :
			typeString = self._rootWindow._IOStrings["type-folder"]
		if self._theMod.isMissing() :
			typeString = self._rootWindow._IOStrings["type-missing"]

		infoDetails = [
			[
				self._rootWindow._IOStrings["type-title"],
				typeString
			],
			[
				self._rootWindow._IOStrings["active-in"],
				self._theMod.getAllActive(showNone = True)
			],
			[
				self._rootWindow._IOStrings["used-in"],
				self._theMod.getAllUsed(showNone = True)
			]
		]


		if self._theMod.modVersion is not None:
			infoDetails.insert(1, [
				self._rootWindow._IOStrings['mod-version'],
				self._theMod.modVersion
			])

		if self._theMod.isNotMissing() :
			infoDetails.insert(1, [
				self._rootWindow._IOStrings["size-on-disk"],
				str(locale.format_string("%d", self._theMod._fileSize, grouping=True)) + " (" + self._theMod.size() + ")"
			])

		for rowCount, thisDetail in enumerate(infoDetails, start=0):
			ttk.Label(subFrame, text=thisDetail[0], font='Calibri 8 bold').grid(column=0, row=rowCount, padx=5, sticky='e')
			ttk.Label(subFrame, text=thisDetail[1]).grid(column=1, row=rowCount, padx=5, sticky='w')

		self._okButton = ttk.Button(subFrame, text=self._rootWindow._IOStrings["ok-button-label"], command=self._thisWindow.destroy)
		self._okButton.grid(column = 0, columnspan = 2, row = len(infoDetails), pady=5, sticky='ew')
		self._okButton.bind('<Return>', lambda event=None: self._okButton.invoke())
		self._okButton.focus()

	def _canvas_desc(self):	
		"""Set up and populate a scrollable frame with the description in it """
		self._scrollCanvas  = Tk.Canvas(self._thisWindow, bd=2, relief='ridge')
		self._vertScrollbar = ttk.Scrollbar(self._thisWindow, orient="vertical", command=self._scrollCanvas.yview)
		self._inCanvasFrame  = ttk.Frame(self._scrollCanvas, border=1, padding=(30,0))

		self._scrollCanvas.create_window((0, 0), window=self._inCanvasFrame, anchor="nw")
		self._scrollCanvas.configure(yscrollcommand=self._vertScrollbar.set)
		self._scrollCanvas.pack(side="left", fill="both", expand=True)

		self._vertScrollbar.pack(side="right", fill="y")

		self._inCanvasFrame.bind("<Configure>", lambda e: self._scrollCanvas.configure( scrollregion=self._scrollCanvas.bbox("all") ) )
		self._inCanvasFrame.bind('<Enter>', self._bound_to_mousewheel)
		self._inCanvasFrame.bind('<Leave>', self._unbound_to_mousewheel)

		ttk.Label( self._inCanvasFrame, text = str(self._theMod.getModDescDescription()).rstrip(), anchor = 'w', wraplength = 590).pack(fill = 'x', pady = 0, padx=0)

	def _on_mousewheel(self, event):
		""" Handle mousewheel events """
		self._scrollCanvas.yview_scroll(int(-1*(event.delta/120)), "units")

	def _bound_to_mousewheel(self, event):
		""" Bind mousewheel events """
		self._scrollCanvas.bind_all("<MouseWheel>", self._on_mousewheel)

	def _unbound_to_mousewheel(self, event):
		""" Unbind mousewheel events """
		self._scrollCanvas.unbind_all("<MouseWheel>")


	