#  _______           __ ______ __                __               
# |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
# |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
# |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

# Re-Usable UI Elements

# (c) 2021 JTSage.  MIT License.
import tkinter as Tk
import tkinter.ttk as ttk

class ModCheckCanvasTab() :

	def __init__(self, parent, title, description, extraText=None, hideCanvas = False) :
		""" Build a ttk.Canvas (scrollable) tab
			* parent      - Parent element
			* title       - Title of this tab (display label)
			* description - Description of this tab
			* extraText   - Extra info to add to window
			* hideCanvas  - Only use this as an info tab, don't produce the canvas
		""" 
		self._parent      = parent
		self._UIParts     = {}
		self.title        = title
		self._description = description
		self._extraText   = extraText
		self._hideCanvas  = hideCanvas

		self._build()


	def _build(self) :
		""" Build the canvas inside _parent """
		ttk.Label(self._parent, text=self.title, font='Helvetica 12 bold').pack()
		ttk.Label(self._parent, text=self._description, wraplength = 600).pack(fill='x')

		if self._extraText is not None :
			ttk.Label(self._parent, text=" ", anchor='w').pack(padx=(30,0), fill='x')
			for thisText in self._extraText :
				ttk.Label(self._parent, text=thisText, anchor='w').pack(padx=(30,0), fill='x')
			ttk.Label(self._parent, text=" ", anchor='w').pack(padx=(30,0), fill='x')

		if ( not self._hideCanvas ) :
			self._UIParts["canvas"] = Tk.Canvas(self._parent, bd=2, relief='ridge')
			self._UIParts["VSB"]    = ttk.Scrollbar(self._parent, orient="vertical", command=self._UIParts["canvas"].yview)
			self._UIParts["frame"]  = ttk.Frame(self._UIParts["canvas"], border=1, padding=(30,0))

			self._UIParts["frame"].bind(
				"<Configure>",
				lambda e: self._UIParts["canvas"].configure(
					scrollregion=self._UIParts["canvas"].bbox("all")
				)
			)

			self._UIParts["canvas"].create_window((0, 0), window=self._UIParts["frame"], anchor="nw")

			self._UIParts["canvas"].configure(yscrollcommand=self._UIParts["VSB"].set)

			self._UIParts["canvas"].pack(side="left", fill="both", expand=True)
			self._UIParts["VSB"].pack(side="right", fill="y")

			self._UIParts["frame"].bind('<Enter>', self._bound_to_mousewheel)
			self._UIParts["frame"].bind('<Leave>', self._unbound_to_mousewheel)

	def _on_mousewheel(self, event):
		""" Handle mousewheel events """
		self._UIParts["canvas"].yview_scroll(int(-1*(event.delta/120)), "units")

	def _bound_to_mousewheel(self, event):
		""" Bind mousewheel events """
		self._UIParts["canvas"].bind_all("<MouseWheel>", self._on_mousewheel)

	def _unbound_to_mousewheel(self, event):
		""" Unbind mousewheel events """
		self._UIParts["canvas"].unbind_all("<MouseWheel>")

	def clear_items(self) :
		""" Clear the canvas of data items """
		for widget in self._UIParts["frame"].winfo_children():
			widget.destroy()

	def add_item(self, term, desc) :
		""" Add data item to canvas """
		ttk.Label(
			self._UIParts["frame"],
			text   = term,
			anchor = 'w',
			font='Helvetica 9 bold'
		).pack(fill = 'x', padx = 0, pady = (10,0))

		ttk.Label(
			self._UIParts["frame"],
			text       = desc,
			anchor     = 'w',
			wraplength = 600-30-30-40
		).pack(fill = 'x', pady = 0, padx = (40,0))


	