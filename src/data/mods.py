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
	""" This class holds all of the information about a mod we would want to know """

	langCode = ["en"]

	def setLangCode(self, code):
		""" Set preferred language as class-shared. """
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

		self._modDescTree = None
		self._iconImage   = None

		self.modVersion   = "0.0.0.0"
	
	def isFolder(self, *args) :
		""" Boolean "is this a folder", allow setting the same """
		if ( len(args) > 0 ) :
			self._folder = args[0]
		else :
			return self._folder

	def getZip(self) :
		""" If this is a zip file, return the extension, otherwise do nothing. """
		if not self._folder:
			return ".zip"
		else :
			return ""

	def isZip(self, *args) :
		""" Boolean "is this a zip file", allow setting the same """
		if ( len(args) > 0 ) :
			self._folder = not args[0]
		else:
			return not self._folder

	def isMissing(self, *args) :
		""" Boolean "does this file/folder NOT exist", allow setting the same """
		if ( len(args) > 0 ) :
			self._fileExists = not args[0]
		else:
			return not self._fileExists

	def isNotMissing(self, *args) :
		""" Boolean "does this file/folder exist", allow setting the same """
		if ( len(args) > 0 ) :
			self._fileExists = args[0]
		else:
			return self._fileExists

	def isGood(self, *args) :
		""" Boolean "is this named correctly", allow setting the same """
		if ( len(args) > 0 ) :
			self._filenameOK = args[0]
		else:
			return self._filenameOK

	def isBad(self, *args) :
		""" Boolean "is this named INCORRECTLY", allow setting the same """
		if ( len(args) > 0 ) :
			self._filenameOK = not args[0]
		else:
			return not self._filenameOK

	def isActive(self, *args) :
		""" Boolean "is this mod active", also takes an integer to mark active in savegame # """
		if ( len(args) > 0 ) :
			self._activeGames.add(args[0])
		else: 
			return ( len(self._activeGames) > 0 )

	def isNotActive(self) :
		""" Boolean "is this mod not active" """
		return ( len(self._activeGames) == 0 )

	def getAllActive(self, short = False, veryShort = False, showNone = False) :
		""" Return a string of all the savegames this mod is active in """
		if showNone and self.isNotActive() :
			return "--"
		if veryShort :
			return ", ".join(list(self._to_ranges(self._activeGames)))
		if short :
			return ",".join( str(t) for t in sorted(self._activeGames, key = lambda item : int(item)) )
		else :
			return ", ".join( str(t) for t in sorted(self._activeGames, key = lambda item : int(item)) )

	def isUsed(self, *args) :
		""" Boolean "is this mod used", also takes an integer to mark active in savegame # """
		if ( len(args) > 0 ) :
			self._usedGames.add(args[0])
		else: 
			return ( len(self._usedGames) > 0 )

	def isNotUsed(self) :
		""" Boolean "is this mod not used" """
		return ( len(self._usedGames) == 0 )

	def getAllUsed(self, short = False, veryShort = False, showNone = False) :
		""" Return a string of all the savegames this mod is used in """
		if showNone and self.isNotUsed() :
			return "--"
		if veryShort :
			return ", ".join(list(self._to_ranges(self._activeGames)))
		if short :
			return ",".join( str(t) for t in sorted(self._usedGames, key = lambda item : int(item)) )
		else :
			return ", ".join( str(t) for t in sorted(self._usedGames, key = lambda item : int(item)) )

	def setUsedToActive(self) :
		""" Normalize the games this mod is used in the it's active games """
		self._usedGames.update(self._activeGames)

	def size(self, *args) :
		""" Return a human readable string of the mod file/folder size, allow setting the same """
		if ( len(args) > 0 ) :
			self._fileSize = args[0]
		else:
			if self._fileSize  < 1 :
				return "0 B"
			else :
				size = self._fileSize

				for unit in ['B', 'Kb', 'Mb', 'Gb']:
					if size < 1024.0 or unit == 'Gb':
						break
					size /= 1024.0
				return locale.format('%.2f', size, True) + " " + unit

	def name(self, *args) :
		""" Return the name of the mod (title), allow setting the same """
		if ( len(args) > 0 ) :
			self._name = args[0]
		else :
			return self._name

	def fullPath(self, *args) :
		""" Return the full file path to the mod, allow setting the same """
		if ( len(args) > 0 ) :
			self._fullPath = args[0]

		else :
			if self._fullPath is not None:
				return os.path.normpath(self._fullPath)
			else :
				return None

	def _fileIOReadZip(self) :
		""" Read the zip file, get whatever we need for later (test it) """
		try :
			zipFileData  = zipfile.ZipFile(self._fullPath)
			zipFileFiles = zipFileData.namelist()
		except (zipfile.BadZipFile, PermissionError) :
			""" Can't read the zip file """
			self._modDescTree = False # We will never get the modDesc
			self._iconImage   = False # We will never get an icon
			return False

		if 'modDesc.xml' in zipFileFiles :
			try:
				modDescFileData = zipFileData.read('modDesc.xml')
				self._modDescTree = etree.fromstring(modDescFileData)
			except :
				""" Can't find / read modDesc """
				self._modDescTree = False # Never get it now
				self._iconImage   = False # No icon either
				return False

			iconFileNameGiven = self._modDescTree.findtext('iconFilename')
			iconFileNameFound = None

			if iconFileNameGiven in zipFileFiles :
				iconFileNameFound = iconFileNameGiven
			elif iconFileNameGiven.endswith(".png") :
				iconFileNameTemp = iconFileNameGiven[0:-4] + ".dds"
				if iconFileNameTemp in zipFileFiles :
					iconFileNameFound = iconFileNameTemp
				else :
					iconFileNameFound = None

			if iconFileNameFound is not None:
				try :
					iconFileData    = zipFileData.read(iconFileNameFound)
					iconImagePIL    = Image.open(io.BytesIO(iconFileData))
					self._iconImage = iconImagePIL.resize((150,150))
				except :
					""" Can't read icon file """
					self._iconImage = False
						
			self.modVersion = self._modDescTree.findtext("version")

			return True
		
	def _fileIOReadFolder(self) :
		""" Read the folder, get whatever we need for later (test it) """
		if os.path.exists(os.path.join(self._fullPath, "modDesc.xml")) :
			""" modDesc exists """
			try:
				self._modDescTree = etree.parse(os.path.join(self._fullPath, "modDesc.xml"))
			except :
				""" Can't find / read modDesc """
				self._modDescTree = False # Never get it now
				self._iconImage   = False # No icon either
				return False


			iconFileNameGiven = self._modDescTree.findtext('iconFilename')
			iconFileNameFound = None

			if os.path.exists(os.path.join(self._fullPath, iconFileNameGiven)) :
				iconFileNameFound = iconFileNameGiven
			elif iconFileNameGiven.endswith(".png") :
				iconFileNameTemp = iconFileNameGiven[0:-4] + ".dds"
				if os.path.exists(os.path.join(self._fullPath, iconFileNameTemp)) :
					iconFileNameFound = iconFileNameTemp
				else :
					iconFileNameFound = None

			if iconFileNameFound is not None:
				try :
					iconImagePIL    = Image.open(os.path.join(self._fullPath, iconFileNameFound))
					self._iconImage = iconImagePIL.resize((150,150))
				except :
					""" Can't read icon file """
					self._iconImage = False
						
			self.modVersion = self._modDescTree.findtext("version")

			return True
		else :
			""" No Mod Desc """
			self._modDescTree = False # We will never get the modDesc
			self._iconImage   = False # We will never get an icon
			return False

	def quickTest (self) :
		""" Perform a self-test on the mod.  Return pass/fail.  Cache modDesc and icon """
		if self.isFolder() : 
			return self._fileIOReadFolder()
		else :
			return self._fileIOReadZip()

	def getModDescDescription(self) :
		""" Get the description from modDesc - assume loaded, as we do that in the test phase """
		if isinstance(self._modDescTree, etree._Element) :
			return self._getI10nFromXPath(self._modDescTree.xpath("/modDesc/description"))
		else :
			return None

	def getModDescName(self) :
		""" Get the name from the modDesc if possible. Otherwise, just return the current name """
		if isinstance(self._modDescTree, etree._Element) :
			nameTry = self._getI10nFromXPath(self._modDescTree.xpath("/modDesc/title"))

			if nameTry is not None:
				self._name = nameTry

		return self._name

	def getIconFile(self, window) :
		""" Get the icon file, in the calling window """
		if not self._iconImage:
			return None

		try :
			return ImageTk.PhotoImage(self._iconImage, master=window)
		except :
			return None

	def _getI10nFromXPath(self, xPathLookup) :
		""" Get localized text from the modDesc, with fallbacks (en->de->first seen) """
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
		""" Turn a set into ranges - i.e. 1,2,3,4,6,8 -> 1-4,6,8 """
		iterable = sorted(int(x) for x in set(iterable))
		for key, group in itertools.groupby(enumerate(iterable), lambda t: t[1] - t[0]) : # pylint: disable=unused-variable
			group = list(group)

			if group[0][1] == group[-1][1]:
				yield str(group[0][1])
			elif group[0][1]+1 == group[-1][1]:
				yield str(group[0][1])
				yield str(group[-1][1])
			else:
				yield str(group[0][1]) + "-" + str(group[-1][1])



