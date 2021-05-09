#  _______           __ ______ __                __               
# |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
# |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
# |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

# Log Writer

# (c) 2021 JTSage.  MIT License.
import datetime

class ModCheckLog() :

	LogText = []

	def write(self, value) :
		if ( isinstance(value, str)) :
			self.LogText.append(value)
		else :
			self.LogText.extend(value)

	def line(self) :
		self.write("   ---=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=---")

	def empty(self) :
		self.LogText.clear()

	def header(self) :
		self.write([
			" _______           __ ______ __                __               ",
			"|   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.",
			"|       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|",
			"|__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  ",
		])
		self.line()

	def footer(self) :
		today = datetime.datetime.now()
		self.write("{nowTime}".format(nowTime = today.strftime("%Y-%m-%d %H:%M")))
		self.line()

	def readAll(self):
		return '\n'.join(self.LogText)

