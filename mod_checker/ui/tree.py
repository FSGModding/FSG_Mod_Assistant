#  _______           __ ______ __                __               
# |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
# |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
# |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

# Re-Usable UI Elements - Treeview Tab

# (c) 2021 JTSage.  MIT License.

import tkinter as Tk
import tkinter.ttk as ttk
import locale

class ModCheckTreeTab() :

	def __init__(self, parent, title, description, columns, base, columnExtra=None) :
		""" Build a ttk.TreeView tab
			* parent      - Parent element
			* title       - Title of this tab (display label)
			* description - Description of this tab
			* columns     - Simple list of columns
			* base        - Root window object
			* columnExtra - kwargs for each column, if needed.
		""" 
		self._parent      = parent
		self._UIParts     = {}
		self.title        = title
		self._description = description
		self._base        = base

		self._columns     = [("#"+str(i),j) for i,j in zip(range(1,len(columns)+1), columns)]
		self._columnExtra = columnExtra

		self._build()

	def _build(self) :
		""" Build the treeview inside of _parent """
		ttk.Label(self._parent, text=self.title, font='Helvetica 12 bold').pack()
		ttk.Label(self._parent, text=self._description, wraplength = 600).pack(fill='x')

		self._UIParts["tree"] = ttk.Treeview(self._parent, selectmode='browse', columns=self._columns, show='headings')
		self._UIParts["tree"].pack(expand=True, side='left', fill='both', pady=(5,0))

		if self._columnExtra is not None :
			for thisExtraKey in self._columnExtra.keys():
				self._UIParts["tree"].column(thisExtraKey, **self._columnExtra[thisExtraKey])

		self._UIParts["VSB"] = ttk.Scrollbar(self._parent, orient="vertical", command=self._UIParts["tree"].yview)
		self._UIParts["VSB"].pack(side='right', fill='y', pady=(25,2))

		self._UIParts["tree"].configure(yscrollcommand=self._UIParts["VSB"].set)

		for col,name in self._columns:
			self._UIParts["tree"].heading(col, text=name, command=lambda _col=col: \
 				 self._treeview_sort(self._UIParts["tree"], _col, False))

		self._UIParts["tree"].bind("<Double-1>", self._on_double_click)

	def _on_double_click(self, event):
		""" On double-click of a mod, display some information """
		thisItem    = self._UIParts["tree"].identify('item',event.x,event.y)
		thisModName = self._UIParts["tree"].item(thisItem,"text")
		thisMod     = self._base._modList[thisModName]
		thisInfoBox = Tk.Toplevel(self._parent.winfo_toplevel())

		thisInfoBox.title(thisModName)
		thisInfoBox.geometry("650x450")

		if thisMod.name() is None:
			thisMod.getModDescName()

		thisModTitle = thisMod.name() or thisModName

		ttk.Label(thisInfoBox, font='Helvetica 12 bold', text=thisModTitle, anchor='center').pack(fill='x', pady=(10,5))
		
		mainFrame = Tk.Frame(thisInfoBox)
		mainFrame.pack(fill='x', anchor='center', padx=10, pady=(0,10), expand=True)
		
		Tk.Grid.columnconfigure(mainFrame, 0, weight=1)
		Tk.Grid.columnconfigure(mainFrame, 1, weight=1)

		thisIconImage = thisMod.getIconFile(thisInfoBox)
		
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
		if thisMod.isMissing() :
			typeString = self._base._IOStrings["type-missing"]
		if thisMod.isFolder() :
			typeString = self._base._IOStrings["type-folder"]

		infoDetails = [
			[
				self._base._IOStrings["type-title"],
				typeString
			],
			[
				self._base._IOStrings["active-in"],
				thisMod.getAllActiveHR()
			],
			[
				self._base._IOStrings["used-in"],
				thisMod.getAllUsedHR()
			]
		]

		if thisMod.isNotMissing() :
			infoDetails.insert(1, [
				self._base._IOStrings["size-on-disk"],
				str(locale.format_string("%d", thisMod._fileSize, grouping=True)) + " (" + thisMod.size() + ")"
			])

		for rowCount, thisDetail in enumerate(infoDetails, start=0):
			ttk.Label(subFrame, text=thisDetail[0], font='Helvetica 8 bold').grid(column=0, row=rowCount, padx=5, sticky='e')
			ttk.Label(subFrame, text=thisDetail[1]).grid(column=1, row=rowCount, padx=5, sticky='w')
		
		canvasParts = {}
		canvasParts["canvas"] = Tk.Canvas(thisInfoBox, bd=2, relief='ridge')
		canvasParts["VSB"]    = ttk.Scrollbar(thisInfoBox, orient="vertical", command=canvasParts["canvas"].yview)
		canvasParts["frame"]  = ttk.Frame(canvasParts["canvas"], border=1, padding=(30,0))
		canvasParts["frame"].bind("<Configure>", lambda e: canvasParts["canvas"].configure( scrollregion=canvasParts["canvas"].bbox("all") ) )
		canvasParts["canvas"].create_window((0, 0), window=canvasParts["frame"], anchor="nw")
		canvasParts["canvas"].configure(yscrollcommand=canvasParts["VSB"].set)
		canvasParts["canvas"].pack(side="left", fill="both", expand=True)
		canvasParts["VSB"].pack(side="right", fill="y")

		ttk.Label( canvasParts["frame"], text = thisMod.getModDescDescription(), anchor = 'w', wraplength = 590).pack(fill = 'x', pady = 0, padx=0)

		thisOkButton = ttk.Button(subFrame, text=self._base._IOStrings["ok-button-label"], command=thisInfoBox.destroy)
		thisOkButton.grid(column = 0, columnspan = 2, row = len(infoDetails), pady=5, sticky='ew')
		thisOkButton.bind('<Return>', lambda event=None: thisOkButton.invoke())
		thisOkButton.focus()

		thisInfoBox.bind("<Escape>", lambda x: thisInfoBox.destroy())

	def clear_items(self) :
		""" Empty the tree """
		self._UIParts["tree"].delete(*self._UIParts["tree"].get_children())

	def add_item(self, name, values):
		""" Add an item to the tree """
		self._UIParts["tree"].insert(
			parent = '',
			index  = 'end',
			text   = name,
			values = values)

	def _treeview_sort(self, tv, col, reverse):
		""" Sort a tree column numerically or alphabetically """
		l = [(self._size_to_real_num(tv.set(k, col)), k) for k in tv.get_children('')]

		l.sort(
			key=lambda t : self._lower_if_possible(t),
			reverse=reverse
		)		

		# rearrange items in sorted positions
		for index, (val, k) in enumerate(l): # pylint: disable=unused-variable
			tv.move(k, '', index)

		# reverse sort next time
		tv.heading(col, command=lambda _col=col: \
				 self._treeview_sort(tv, _col, not reverse))

	def _size_to_real_num(self, text) :
		""" Turn the size column back into a number for sorting """
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

	def _lower_if_possible(self, x):
		""" Normalize to lowercase for sorting, if possible """
		if isinstance(x[0], float) :
			return x
		else :
			try:
				return (x[0].lower(), x[1])
			except AttributeError:
				return x


	