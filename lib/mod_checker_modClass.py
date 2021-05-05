"""
 _______           __ ______ __                __               
|   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
|       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
|__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  
                                            v1.0.0.0 by JTSage

Individual Mod Record (class)

(c) 2021 JTSage.  MIT License.
"""

class FSMod() :
	""" Each class holds all the info about a mod we need to know """

	def __init__(self) :
		self._folder      = False
		self._filenameOK  = True
		self._fileExists  = True
		self._name        = None
		self._fullPath    = None
		self._fileSize    = 0
		self._activeGames = set()
		self._usedGames   = set()
	
	def isFolder(self, *args) :
		if ( len(args) > 0 ) :
			self._folder = args[0]
		else :
			return self._folder

	def isZip(self, *args) :
		if ( len(args) > 0 ) :
			self._folder = not args[0]
		else:
			return not self._folder

	# def isMissing(self, value) :
	# 	self._fileExists = not value

	def isMissing(self, *args) :
		if ( len(args) > 0 ) :
			self._fileExists = not args[0]
		else:
			return not self._fileExists

	def isNotMissing(self, *args) :
		if ( len(args) > 0 ) :
			self._fileExists = args[0]
		else:
			return self._fileExists


	def isGood(self, *args) :
		if ( len(args) > 0 ) :
			self._filenameOK = args[0]
		else:
			return self._filenameOK

	def isBad(self, *args) :
		if ( len(args) > 0 ) :
			self._filenameOK = not args[0]
		else:
			return not self._filenameOK

	def isActive(self, *args) :
		if ( len(args) > 0 ) :
			self._activeGames.add(args[0])
		else: 
			return ( len(self._activeGames) > 0 )

	def isNotActive(self) :
	 	return ( len(self._activeGames) == 0 )

	def getAllActive(self) :
		return ", ".join( str(t) for t in sorted(self._activeGames) )

	def isUsed(self, *args) :
		if ( len(args) > 0 ) :
			self._usedGames.add(args[0])
		else: 
			return ( len(self._usedGames) > 0 )

	def isNotUsed(self) :
	 	return ( len(self._usedGames) == 0 )

	def getAllUsed(self) :
		return ", ".join( str(t) for t in sorted(self._usedGames) )

	def size(self, *args) :
		if ( len(args) > 0 ) :
			self._fileSize = args[0]
		else:
			if self._fileSize  < 1 :
				return "0 B"
			else :
				size           = self._fileSize
				decimal_places = 2

				for unit in ['B', 'Kb', 'Mb', 'Gb', 'Tb', 'Pb']:
					if size < 1024.0 or unit == 'Pb':
						break
					size /= 1024.0
				return f"{size:.{decimal_places}f} {unit}"

	def name(self, *args) :
		if ( len(args) > 0 ) :
			self._name = args[0]
		else :
			return self._name

	def fullPath(self, *args) :
		if ( len(args) > 0 ) :
			self._fullPath = args[0]
		else :
			return self._fullPath

