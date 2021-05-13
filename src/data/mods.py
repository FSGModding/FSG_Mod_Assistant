#  _______           __ ______ __                __               
# |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
# |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
# |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

# Individual Mod Record (class)

# (c) 2021 JTSage.  MIT License.

import os
import zipfile
import lxml.etree as etree
import PIL.Image as Image
import PIL.ImageTk as ImageTk
import io
import locale
import itertools

class FSMod() :
	# This class holds all of the information about a mod we would want to know

	langCode = ["en"]

	def setLangCode(self, code):
		""" I do not wanna talk about it. This is program-wide"""
		self.langCode.clear()
		self.langCode.append(code)

	def __init__(self) :
		self._folder      = False
		self._filenameOK  = True
		self._fileExists  = True
		self._name        = None
		self._fullPath    = None
		self._fileSize    = 0
		self._activeGames = set()
		self._usedGames   = set()
		self._thisZIP     = None
		self._modDescTree = None
		self._modDescC    = False
		self._iconImageTk = None
		self._iconImageC  = False

		self.modVersion   = "0.0.0.0"
	
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
		# Return a string of all the savegames this mod is active in - human readable
		if self.isNotActive() :
			return "--"
		else :
			return self.getAllActive(short)

	def getAllActive(self, short = False, veryShort = False) :
		# Return a string of all the savegames this mod is active in
		if veryShort :
			return self._getShortSortSet(self._activeGames)
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
		# Return a string of all the savegames this mod is used in - human readable
		if self.isNotUsed() :
			return "--"
		else :
			return self.getAllUsed(short)

	def getAllUsed(self, short = False, veryShort = False) :
		# Return a string of all the savegames this mod is used in
		if veryShort :
			return self._getShortSortSet(self._usedGames)
		if short :
			return ",".join( str(t) for t in sorted(self._usedGames, key = lambda item : int(item)) )
		else :
			return ", ".join( str(t) for t in sorted(self._usedGames, key = lambda item : int(item)) )

	def setUsedToActive(self) :
		# Normalize the games this mod is used in the it's active games
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

				for unit in ['B', 'Kb', 'Mb', 'Gb', 'Tb', 'Pb']:
					if size < 1024.0 or unit == 'Pb':
						break
					size /= 1024.0
				return locale.format('%.2f', size, True) + " " + unit

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

	def _getModDesc(self) :
		""" Check to see if the mod has a modDesc.xml file (and parse it)

		WARNING: don't do this for every mod, IO *expensive*
		"""
		if self._modDescC or self._modDescTree is not None:
			return self._modDescTree


		if self.isMissing() or self._fullPath is None :
			return None
		
		self._modDescC = True # Cache results

		if self.isZip() :
			self._thisZIP = zipfile.ZipFile(self._fullPath)

			if 'modDesc.xml' in self._thisZIP.namelist() :
				try:
					thisModDesc = self._thisZIP.read('modDesc.xml')
					self._modDescTree = etree.fromstring(thisModDesc)
					return self._modDescTree
				except:
					return None
		else :
			if os.path.exists(os.path.join(self._fullPath, "modDesc.xml")) :
				try:
					self._modDescTree = etree.parse(os.path.join(self._fullPath, "modDesc.xml"))
					return self._modDescTree
				except :
					return None

		return None

	def simpleTestZip (self) :
		if self.isFolder() : return None

		""" Catch bad zips """
		try :
			localZIP = zipfile.ZipFile(self._fullPath)
		except zipfile.BadZipFile :
			return False

		if 'modDesc.xml' in localZIP.namelist() :
			try:
				thisModDesc = localZIP.read('modDesc.xml')
				localTree = etree.fromstring(thisModDesc)
				self.modVersion = localTree.findtext("version")
				localZIP.close()
				return True
			except:
				localZIP.close()
				return False
		else :
			return False

	def hasModDesc(self) :
		""" Check to see if the mod has a modDesc.xml file. (cached)

		WARNING: don't do this for every mod, IO *expensive*
		"""
		if self.isMissing() or self._fullPath is None :
			return False
		
		if self._modDescTree is not None or self._getModDesc() is not None:
			return True
		else :
			return False
		
	def getModDescDescription(self) :
		if self.isMissing() or self._fullPath is None: 
			return None

		if ( self._modDescTree is None ) :
			self._getModDesc()

		if ( self._modDescTree is not None ) :
			return self._getI10nFromXPath(self._modDescTree.xpath("/modDesc/description"))
		else :
			return None

	def getModDescName(self) :
		if self.isMissing() or self._fullPath is None: 
			return None

		if ( self._modDescTree is None ) :
			self._getModDesc()

		if ( self._modDescTree is not None ) :
			nameTry = self._getI10nFromXPath(self._modDescTree.xpath("/modDesc/title"))

			if nameTry is not None:
				self._name = nameTry

		return self._name


	# 	if self.isZip() :
	# 		thisZip = zipfile.ZipFile(self._fullPath)

	def getIconFile(self, window) :
		""" Get a Tk.PhotoImage icon from the mod, if it exists.

		WARNING: don't do this for every mod, IO *expensive*
		"""
		if self._iconImageC or self._iconImageTk is not None:
			""" Cache results.  Only read this once """
			return self._iconImageTk

		if self.isMissing() or self._fullPath is None: 
			return None

		self._iconImageC = True # Cache results

		if ( self._modDescTree is None ) :
			self._getModDesc()

		if ( self._modDescTree is None ) :
			return None

		configFileTree = self._modDescTree
		iconFileName   = self._normalize_icon_name(configFileTree.findtext('iconFilename'))
		
		if iconFileName is None:
			self._iconImageTk = False
			return None

		if self.isZip() :
			try:
				iconFileData = self._thisZIP.read(iconFileName)
				iconImagePIL = Image.open(io.BytesIO(iconFileData))
			except:
				return None
		else :
			try:				
				iconImagePIL = Image.open(os.path.join(self._fullPath, iconFileName))
			except :
				return None

		try :
			self._iconImageTk = ImageTk.PhotoImage(iconImagePIL.resize((150,150)), master=window)
		except :
			return None

		return self._iconImageTk

	def _normalize_icon_name(self, givenName) :
		if givenName is None : return None

		if ( self.isZip() ) :
			if givenName in self._thisZIP.namelist() :
				return givenName
			if givenName.endswith(".png") :
				tempName = givenName[0:-4] + ".dds"
				if tempName in self._thisZIP.namelist() :
					return tempName
				else :
					return None
		else :
			if os.path.exists(os.path.join(self._fullPath, givenName)) :
				return givenName
			if givenName.endswith(".png") :
				tempName = givenName[0:-4] + ".dds"
				if os.path.exists(os.path.join(self._fullPath, tempName)) :
					return tempName
				else :
					return None

		return None

	def _getI10nFromXPath(self, xPathLookup) :
		fallbacks = [None, None, None]

		for parentElement in xPathLookup:
			for childElement in parentElement:
				fallbacks[2] = childElement.text
				if childElement.tag == self.langCode[0] :
					return childElement.text
				if childElement.tag == "en":
					fallbacks[0] = childElement.text
				if childElement.tag == "de":
					fallbacks[1] = childElement.text
		for fallback in fallbacks:
			if fallback is not None:
				return fallback
		return None

	def _to_ranges(self, iterable) :
		iterable = sorted(set(iterable))
		for key, group in itertools.groupby(enumerate(iterable), lambda t: t[1] - t[0]) : # pylint: disable=unused-variable
			group = list(group)
			yield group[0][1], group[-1][1]

	def _getShortSortSet(self, iterable) :
		returnList = []
		startList = [int(x) for x in iterable]
		for item in self._to_ranges(startList) :
			if item is None:
				continue
			if item[0] == item[1]:
				returnList.append(str(item[0]))
			elif item[0]+1 == item[1]:
				returnList.append(str(item[0]))
				returnList.append(str(item[1]))
			else :
				returnList.append(str(item[0]) + "-" + str(item[1]))
		return ", ".join(returnList)

	def closeZIP(self) :
		if self.isZip() and self._thisZIP is not None:
			self._thisZIP.close()


