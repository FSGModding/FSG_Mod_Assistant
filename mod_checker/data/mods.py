#  _______           __ ______ __                __               
# |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
# |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
# |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

# Individual Mod Record (class)

# (c) 2021 JTSage.  MIT License.
import os

class FSMod() :
	# This class holds all of the information about a mod we would want to know

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
		# Boolean "is this a folder", allow setting the same
		if ( len(args) > 0 ) :
			self._folder = args[0]
		else :
			return self._folder

	def getZip(self) :
		# If this is a zip file, return the extension, otherwise do nothing.
		if not self._folder:
			return ".zip"
		else :
			return ""

	def isZip(self, *args) :
		# Boolean "is this a zip file", allow setting the same
		if ( len(args) > 0 ) :
			self._folder = not args[0]
		else:
			return not self._folder

	def isMissing(self, *args) :
		# Boolean "does this file/folder NOT exist", allow setting the same
		if ( len(args) > 0 ) :
			self._fileExists = not args[0]
		else:
			return not self._fileExists

	def isNotMissing(self, *args) :
		# Boolean "does this file/folder exist", allow setting the same
		if ( len(args) > 0 ) :
			self._fileExists = args[0]
		else:
			return self._fileExists


	def isGood(self, *args) :
		# Boolean "is this named correctly", allow setting the same
		if ( len(args) > 0 ) :
			self._filenameOK = args[0]
		else:
			return self._filenameOK

	def isBad(self, *args) :
		# Boolean "is this named INCORRECTLY", allow setting the same
		if ( len(args) > 0 ) :
			self._filenameOK = not args[0]
		else:
			return not self._filenameOK

	def isActive(self, *args) :
		# Boolean "is this mod active", also takes an integer to mark active in savegame #
		if ( len(args) > 0 ) :
			self._activeGames.add(args[0])
		else: 
			return ( len(self._activeGames) > 0 )

	def isNotActive(self) :
		# Boolean "is this mod not active"
	 	return ( len(self._activeGames) == 0 )

	def getAllActiveHR(self, short = False) :
		if self.isNotActive() :
			return "--"
		else :
			return self.getAllActive(short)

	def getAllActive(self, short = False) :
		# Return a string of all the savegames this mod is active in
		if short :
			return ",".join( str(t) for t in sorted(self._activeGames, key = lambda item : int(item)) )
		else :
			return ", ".join( str(t) for t in sorted(self._activeGames, key = lambda item : int(item)) )

	def isUsed(self, *args) :
		# Boolean "is this mod used", also takes an integer to mark active in savegame #
		if ( len(args) > 0 ) :
			self._usedGames.add(args[0])
		else: 
			return ( len(self._usedGames) > 0 )

	def isNotUsed(self) :
		# Boolean "is this mod not used"
	 	return ( len(self._usedGames) == 0 )

	def getAllUsedHR(self, short = False) :
		if self.isNotUsed() :
			return "--"
		else :
			return self.getAllUsed(short)

	def getAllUsed(self, short = False) :
		# Return a string of all the savegames this mod is used in
		if short :
			return ",".join( str(t) for t in sorted(self._usedGames, key = lambda item : int(item)) )
		else :
			return ", ".join( str(t) for t in sorted(self._usedGames, key = lambda item : int(item)) )

	def setUsedToActive(self) :
		self._usedGames.update(self._activeGames)

	def size(self, *args) :
		# Return a human readable string of the mod file/folder size, allow setting the same
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
		# Return the name of the mod (title), allow setting the same
		if ( len(args) > 0 ) :
			self._name = args[0]
		else :
			return self._name

	def fullPath(self, *args) :
		# Return the full file path to the mod, allow setting the same
		if ( len(args) > 0 ) :
			self._fullPath = args[0]

		else :
			if self._fullPath is not None:
				return os.path.normpath(self._fullPath)
			else :
				return None

