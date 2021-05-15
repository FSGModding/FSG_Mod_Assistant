#  _______           __ ______ __                __               
# |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
# |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
# |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

# Re-Usable UI Elements - Treeview Tab

# (c) 2021 JTSage.  MIT License.

import tkinter as Tk
import tkinter.ttk as ttk

class ModCheckTreeTab() :
	"""Build a ttk.TreeView tab	

	Args:
		notebookTab (object): Notebook tab Frame
		title (str): Title of this tab
		description (str): Description of this tab
		columns (list): Columns for view
		rootWindow (object): Root window element
		detailClass (class): src.ui.detail ModCheckDetailWin or API compatable
		columnExtra (dict, optional): kwargs to each column. Defaults to None.
	"""

	def __init__(self, notebookTab, title, description, columns, rootWindow, detailClass, columnExtra=None) :
		self.title        = title

		self._notebookTab = notebookTab
		self._description = description
		self._rootWindow  = rootWindow
		self._detailWin   = detailClass

		self._treeview      = None
		self._vertScrollbar = None

		self._columns     = [("#"+str(i),j) for i,j in zip(range(1,len(columns)+1), columns)]
		self._columnExtra = columnExtra
		self._isOdd       = True

		self._build()

	def _build(self) :
		""" Build the treeview inside of _notebookTab """
		ttk.Label(self._notebookTab, text=self.title, font='Calibri 12 bold').pack()
		ttk.Label(self._notebookTab, text=self._description, wraplength = 640).pack(fill='x')

		self._treeview = ttk.Treeview(self._notebookTab, selectmode='browse', columns=self._columns, show='headings', style="modCheck.Treeview")
		self._treeview.pack(expand=True, side='left', fill='both', pady=(5,0))

		if self._columnExtra is not None :
			for thisExtraKey, thisExtraKwargs in self._columnExtra.items():
				self._treeview.column(thisExtraKey, **thisExtraKwargs)

		self._vertScrollbar = ttk.Scrollbar(self._notebookTab, orient="vertical", command=self._treeview.yview)
		self._vertScrollbar.pack(side='right', fill='y', pady=(25,2))

		self._treeview.configure(yscrollcommand=self._vertScrollbar.set)

		for col,name in self._columns:
			self._treeview.heading(col, text=name, command=lambda _col=col: \
 				 self._treeview_sort(self._treeview, _col, False))

		self._treeview.bind("<Double-1>", self._on_double_click)

		self._treeview.tag_configure('even', background='#E8E8E8')

	def _on_double_click(self, event):
		"""On double-click of a mod, display some information

		Args:
			event (tkinter.Event): The event that just happened (a double click)
		"""
		thisItem    = self._treeview.identify('item',event.x,event.y)
		thisModName = self._treeview.item(thisItem,"text")

		if thisModName :
			self._detailWin(
				base     = self._rootWindow,
				parent   = self._notebookTab,
				modName  = thisModName,
				modClass = self._rootWindow._modList[thisModName]
			)

	def clear_items(self) :
		""" Empty the tree """
		self._treeview.delete(*self._treeview.get_children())

	def add_item(self, name, values):
		"""Add an item to the tree

		Args:
			name (str): Name column (hidden/descriptor only)
			values (list): Values for shown columns.
		"""

		self._treeview.insert(
			parent = '',
			index  = 'end',
			text   = name,
			values = values,
			tags   = ('odd' if self._isOdd else 'even')
		)

		self._isOdd = not self._isOdd

	def _treeview_sort(self, tv, col, reverse):
		""" Sort a tree column numerically or alphabetically

		Args:
			tv (ttk.Treeview): The treeview
			col (str): Column descriptor
			reverse (bool): a->z or z->a (True)
		"""
		l = [(self._fix_sort_order(tv.set(k, col)), k) for k in tv.get_children('')]

		l.sort(reverse=reverse)		

		# rearrange items in sorted positions
		for index, (val, k) in enumerate(l): # pylint: disable=unused-variable
			tv.item(k, tags= ("even" if ( index % 2 == 0 ) else "odd" ) )
			tv.move(k, '', index)

		# reverse sort next time
		tv.heading(col, command=lambda _col=col: \
				 self._treeview_sort(tv, _col, not reverse))

	def _fix_sort_order(self, text) :
		"""Turn the size column back into a number, lowercase any text

		Args:
			text (str): Text to process

		Returns:
			int_or_str: File size as an int or lowercase str
		"""
		if not isinstance(text, str) :
			""" Trap not-strings.  Can't happen, but completness."""
			return text

		if text[0].isdigit() :
			try :
				num, ext = text.split()

				multiplyer = 1

				if ext == "Kb" :
					multiplyer = 1024
				if ext == "Mb" :
					multiplyer = 1024 * 1024
				if ext == "Gb" :
					multiplyer = 1024 * 1024 * 1024

				return int(float(num) * multiplyer)
		
			except ValueError :
				""" Not a size number """
				pass

		if isinstance(text, str) :
			return text.lower()
		else :
			""" This should never happen, but... """
			return text
