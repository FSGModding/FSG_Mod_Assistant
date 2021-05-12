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

	def __init__(self, base, parent, modName, modClass) :
		""" Build a ttk.TreeView tab
			* parent      - Parent element
			* base        - Root window object
			* modName     - Text name of the mod
			* modClass    - Details of the mod
		""" 

		self._parent      = parent
		self._modName     = modName
		self._theMod      = modClass
		self._base        = base

		self._UIParts     = {}

		self._thisWindow  = Tk.Toplevel(self._parent.winfo_toplevel())

		self._title()
		self._logo_and_detail()
		self._canvas_desc()
		self._theMod.closeZIP()

	def _title(self) :
		self._thisWindow.title(self._modName)
		self._thisWindow.geometry("650x450")

		if self._theMod.name() is None:
			self._theMod.getModDescName()

		modTitle = self._theMod.name() or self._modName

		ttk.Label(self._thisWindow, font='Helvetica 12 bold', text=modTitle, anchor='center').pack(fill='x', pady=(10,5))

		self._thisWindow.bind("<Escape>", lambda x: self._thisWindow.destroy())
		
	def _logo_and_detail(self) :

		mainFrame = Tk.Frame(self._thisWindow)
		mainFrame.pack(fill='x', anchor='center', padx=10, pady=(0,10), expand=True)
		
		Tk.Grid.columnconfigure(mainFrame, 0, weight=1)
		Tk.Grid.columnconfigure(mainFrame, 1, weight=1)

		thisIconImage = self._theMod.getIconFile(self._thisWindow)
		
		if thisIconImage is not None:
			thisIconLabel = Tk.Label(mainFrame, anchor='nw')
			thisIconLabel.image = thisIconImage  # <== this is were we anchor the img object
			thisIconLabel.configure(image=thisIconImage)
			thisIconLabel.grid(column=0, row=0)

		subFrame = Tk.Frame(mainFrame)
		subFrame.grid(column=1, row=0, sticky='ew')

		Tk.Grid.columnconfigure(subFrame, 0, weight=1)
		Tk.Grid.columnconfigure(subFrame, 1, weight=1)

		typeString = self._base._IOStrings["type-zip-file"]
		if self._theMod.isMissing() :
			typeString = self._base._IOStrings["type-missing"]
		if self._theMod.isFolder() :
			typeString = self._base._IOStrings["type-folder"]

		infoDetails = [
			[
				self._base._IOStrings["type-title"],
				typeString
			],
			[
				self._base._IOStrings['mod-version'],
				self._theMod.modVersion
			],
			[
				self._base._IOStrings["active-in"],
				self._theMod.getAllActiveHR()
			],
			[
				self._base._IOStrings["used-in"],
				self._theMod.getAllUsedHR()
			]
		]

		if self._theMod.isNotMissing() :
			infoDetails.insert(1, [
				self._base._IOStrings["size-on-disk"],
				str(locale.format_string("%d", self._theMod._fileSize, grouping=True)) + " (" + self._theMod.size() + ")"
			])

		for rowCount, thisDetail in enumerate(infoDetails, start=0):
			ttk.Label(subFrame, text=thisDetail[0], font='Helvetica 8 bold').grid(column=0, row=rowCount, padx=5, sticky='e')
			ttk.Label(subFrame, text=thisDetail[1]).grid(column=1, row=rowCount, padx=5, sticky='w')

		self._UIParts["thisOkButton"] = ttk.Button(subFrame, text=self._base._IOStrings["ok-button-label"], command=self._thisWindow.destroy)
		self._UIParts["thisOkButton"].grid(column = 0, columnspan = 2, row = len(infoDetails), pady=5, sticky='ew')
		self._UIParts["thisOkButton"].bind('<Return>', lambda event=None: self._UIParts["thisOkButton"].invoke())
		self._UIParts["thisOkButton"].focus()

	def _canvas_desc(self):	
		self._UIParts["canvas"] = Tk.Canvas(self._thisWindow, bd=2, relief='ridge')
		self._UIParts["VSB"]    = ttk.Scrollbar(self._thisWindow, orient="vertical", command=self._UIParts["canvas"].yview)
		self._UIParts["frame"]  = ttk.Frame(self._UIParts["canvas"], border=1, padding=(30,0))
		self._UIParts["frame"].bind("<Configure>", lambda e: self._UIParts["canvas"].configure( scrollregion=self._UIParts["canvas"].bbox("all") ) )
		self._UIParts["canvas"].create_window((0, 0), window=self._UIParts["frame"], anchor="nw")
		self._UIParts["canvas"].configure(yscrollcommand=self._UIParts["VSB"].set)
		self._UIParts["canvas"].pack(side="left", fill="both", expand=True)
		self._UIParts["VSB"].pack(side="right", fill="y")

		self._UIParts["frame"].bind('<Enter>', self._bound_to_mousewheel)
		self._UIParts["frame"].bind('<Leave>', self._unbound_to_mousewheel)

		ttk.Label( self._UIParts["frame"], text = self._theMod.getModDescDescription(), anchor = 'w', wraplength = 590).pack(fill = 'x', pady = 0, padx=0)

	def _on_mousewheel(self, event):
		""" Handle mousewheel events """
		self._UIParts["canvas"].yview_scroll(int(-1*(event.delta/120)), "units")

	def _bound_to_mousewheel(self, event):
		""" Bind mousewheel events """
		self._UIParts["canvas"].bind_all("<MouseWheel>", self._on_mousewheel)

	def _unbound_to_mousewheel(self, event):
		""" Unbind mousewheel events """
		self._UIParts["canvas"].unbind_all("<MouseWheel>")


	