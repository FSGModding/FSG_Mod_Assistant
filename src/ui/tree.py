#  _______           __ ______ __                __               
# |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
# |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
# |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

# Re-Usable UI Elements - Treeview Tab

# (c) 2021 JTSage.  MIT License.

import tkinter as Tk
import tkinter.ttk as ttk

class ModCheckTreeTab() :

	def __init__(self, parent, title, description, columns, base, detail, columnExtra=None) :
		""" Build a ttk.TreeView tab
			* parent      - Parent element
			* title       - Title of this tab (display label)
			* description - Description of this tab
			* columns     - Simple list of columns
			* base        - Root window object
			* columnExtra - kwargs for each column, if needed.
			* detail      - Detail window class
		""" 
		self._parent      = parent
		self._UIParts     = {}
		self.title        = title
		self._description = description
		self._base        = base
		self._detailWin   = detail

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

		self._detailWin(
			base     = self._base,
			parent   = self._parent,
			modName  = thisModName,
			modClass = self._base._modList[thisModName]
		)

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


	