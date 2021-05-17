#  _______           __ ______ __                __               
# |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
# |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
# |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

# Re-Usable UI Elements - Scrollable Canvas Tab

# (c) 2021 JTSage.  MIT License.
import tkinter as Tk
import tkinter.ttk as ttk

class ModCheckCanvasTab() :
	"""
	Build a ttk.Canvas (scrollable) tab

	Args:
		notebookTab (object): Parent Element
		title (str): Title of this tab
		description (str): Description of this tab
		extraText (list, optional): Extra info to display. Defaults to None.
		hideCanvas (bool, optional): Set to True to hide the scrollable canvas. Defaults to False.
	""" 

	def __init__(self, notebookTab, title, description, extraText=None, extraControls=None, hideCanvas = False) :
		self.title        = title
		self._notebookTab = notebookTab
		self._description = description
		self._extraText   = extraText
		self._extraControls = extraControls
		self._hideCanvas  = hideCanvas

		self._vertScrollbar = None
		self._scrollCanvas  = None
		self._inCanvasFrame = None

		self._isOdd = True
		self._isFirstChild = True

		self._build()

	def _build(self) :
		"""Build the canvas inside _parent """

		ttk.Label(self._notebookTab, text=self.title, font='Calibri 12 bold').pack()
		ttk.Label(self._notebookTab, text=self._description, wraplength = 640).pack(fill='x', pady=(0,10))

		if self._extraControls is not None:
			for thisControl in self._extraControls :
				if thisControl["type"] == "checkbox" :
					Tk.Checkbutton(self._notebookTab, **thisControl["kwargs"]).pack(fill='x', pady=(0,10))

		if self._extraText is not None :

			for idx, thisText in enumerate(self._extraText, start=1) :
				padY = (
					0,
					10 if idx == len(self._extraText) else 0
				)
				ttk.Label(self._notebookTab, text=thisText, anchor='w').pack(padx=(30,0), pady=padY, fill='x')


		if ( not self._hideCanvas ) :
			self._outsideFrame   = Tk.Frame(self._notebookTab, bd = 2, relief="groove")
			self._outsideFrame.pack(expand=True, fill="both")

			self._scrollCanvas   = Tk.Canvas(self._outsideFrame, bd=0, bg='white')
			self._vertScrollbar  = ttk.Scrollbar(self._outsideFrame, orient="vertical", command=self._scrollCanvas.yview)
			self._inCanvasFrame  = Tk.Frame(self._scrollCanvas, bd=0, bg='white')

			self._inCanvasFrame.bind(
				"<Configure>",
				lambda e: self._scrollCanvas.configure(
					scrollregion=self._scrollCanvas.bbox("all")
				)
			)
			self._scrollCanvas.bind(
				"<Configure>",
				lambda e: self._scrollCanvas.itemconfig(
					self._scrollFrameWin,
					width = e.width
				)
			)

			self._scrollFrameWin = self._scrollCanvas.create_window((0, 0), window=self._inCanvasFrame, anchor="nw")
			self._scrollCanvas.configure(yscrollcommand=self._vertScrollbar.set)
			self._scrollCanvas.pack(side="left", fill="both", expand=True)

			self._vertScrollbar.pack(side="right", fill="y")

			self._inCanvasFrame.bind('<Enter>', self._bound_to_mousewheel)
			self._inCanvasFrame.bind('<Leave>', self._unbound_to_mousewheel)

	def _on_mousewheel(self, event):
		""" Handle mousewheel events """
		self._scrollCanvas.yview_scroll(int(-1*(event.delta/120)), "units")

	def _bound_to_mousewheel(self, event):
		""" Bind mousewheel events """
		self._scrollCanvas.bind_all("<MouseWheel>", self._on_mousewheel)

	def _unbound_to_mousewheel(self, event):
		""" Unbind mousewheel events """
		self._scrollCanvas.unbind_all("<MouseWheel>")

	def clear_items(self) :
		"""Clear the canvas of data items """
		for widget in self._inCanvasFrame.winfo_children():
			widget.destroy()

	def add_item(self, term, desc) :
		"""Add an item to the scrollable canvas

		Args:
			term (str): Title of the item (bold, bulleted)
			desc (str): Description text (normal, indented)
		"""
		if not self._isFirstChild :
			ttk.Separator(self._inCanvasFrame,orient='horizontal').pack(fill='x')
			padY = [5,5]
		else :
			self._isFirstChild = False
			padY = [0,5]
			
		bgColor = "#E8E8E8" if self._isOdd else 'white'
		self._isOdd = not self._isOdd

		thisFrame = Tk.Frame(self._inCanvasFrame, bg=bgColor)
		thisFrame.pack(fill='x', expand=True)

		ttk.Label(
			thisFrame,
			text       = "\u2022 " + term,
			anchor     = 'w',
			font       = 'Calibri 9 bold',
			background = bgColor
		).pack(fill = 'x', padx = (30,30), pady = (padY[0], 0))

		ttk.Label(
			thisFrame,
			text       = desc,
			anchor     = 'w',
			wraplength = 540, # (640-30-30-40)
			background = bgColor
		).pack(fill = 'x', pady = (0,padY[1]), padx = (70,30))
		
		


	