#  _______           __ ______ __                __               
# |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
# |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
# |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

# Log Writer

# (c) 2021 JTSage.  MIT License.
import datetime

class ModCheckLog() :
	""" Log class

	BIG NOTE: this is a *shared* log, the log contents
	are deliberately not instanced
	"""

	LogText = []

	def __init__(self) :
		self._sectionsOpen = 0
		self._sectionLead = ""

	def openSection(self, title = None) :
		""" Basic indentation - open section """
		if title is not None:
			self.write(title)
		
		self._sectionsOpen += 1
		self._sectionLead   = self._sectionLead + "  "

	def closeSection(self) :
		""" Basic indentation - close section """
		if self._sectionsOpen > 0 :
			self._sectionsOpen -= 1
			self._sectionLead   = self._sectionLead[0:-2]
			self.line()

	def write(self, value) :
		""" Write a log entry, string of iterable type"""
		if ( isinstance(value, str)) :
			self.LogText.append(self._sectionLead + value)
		else :
			for thisValue in value:
				self.LogText.append(self._sectionLead + thisValue)

	def line(self) :
		""" Write a seperator line """
		self.LogText.append("   ---=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=---")

	def empty(self) :
		""" Empty the log """
		self.LogText.clear()

	def header(self) :
		""" Write the log header """
		self.write([
			" _______           __ ______ __                __               ",
			"|   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.",
			"|       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|",
			"|__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  ",
		])
		self.line()

	def footer(self) :
		""" Put a date stamp at the end of the log """
		today = datetime.datetime.now()
		self.write("{nowTime}".format(nowTime = today.strftime("%Y-%m-%d %H:%M")))
		self.line()

	def readAll(self):
		""" Return the log as a newline delimited text string """
		return '\n'.join(self.LogText)

