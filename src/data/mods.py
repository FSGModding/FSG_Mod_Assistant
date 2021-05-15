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
import hashlib

class FSMod() :
	"""Holds all the details of found mod files
	"""
	
	langCode = ["en"]

	def setLangCode(self, code):
		"""Set the class-global language code for l10n lookups

		Args:
			code (str): Language code
		"""
		self.langCode.clear()
		self.langCode.append(code)

	def __init__(self, modName = None) :
		self._modName     = modName
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
		self._sha256hash  = None

		self.modVersion   = None

	def __str__(self) :
		"""String representation of the mod

		Returns:
			str: Description of the mod
		"""
		if self._fileSize > 0 :
			return "{modName} ({modTitle}) [{saveactive}]/[{saveused}] ({modFileSize})".format(
				modName     = self._modName,
				modTitle    = self.name(),
				saveactive  = self.getAllActive(showNone = True, short=True),
				saveused    = self.getAllUsed(showNone = True, short=True),
				modFileSize = self.size()
			)
		else :
			return "{modName} ({modTitle}) [{saveactive}]/[{saveused}]".format(
				modName    = self._modName,
				modTitle   = self.name(),
				saveactive = self.getAllActive(showNone = True, short=True),
				saveused   = self.getAllUsed(showNone = True, short=True),
			)
	
	def isFolder(self, setTo = None) :
		"""Is this mod a folder?

		Args:
			setTo (bool, optional): Set to True/False. Defaults to None.

		Returns:
			bool: The mod is a folder (True)
		"""

		if setTo is not None:
			self._folder = setTo
		
		return self._folder

	def getZip(self) :
		"""Get ZIP file suffix

		Returns:
			str: ".zip" for ZIP files, otherwise empty
		"""
		if not self._folder:
			return ".zip"
		else :
			return ""

	def isZip(self, setTo = None) :
		"""Is this a zip file

		Args:
			setTo (bool, optional): Set to True/False. Defaults to None.

		Returns:
			bool: The mod is a zip file (True)
		"""
		if setTo is not None :
			self._folder = not setTo
		
		return not self._folder

	def isMissing(self, setTo = None) :
		"""Does the file exist?

		Args:
			setTo (bool, optional): Set the file existence. Defaults to None.

		Returns:
			bool: The file does NOT exist (True)
		"""
		if setTo is not None :
			self._fileExists = not setTo
		
		return not self._fileExists

	def isNotMissing(self, setTo  = None) :
		"""Does the file exist

		Args:
			setTo (bool, optional): Set the file existence. Defaults to None.

		Returns:
			bool: The file DOES exist (True)
		"""
		if setTo is not None :
			self._fileExists = setTo
		
		return self._fileExists

	def isGood(self, setTo = None) :
		"""Is this mod name valid

		Args:
			setTo (bool, optional): Set mod name validity. Defaults to None.

		Returns:
			bool: The mod name IS valid (True)
		"""
		if setTo is not None :
			self._filenameOK = setTo
		
		return self._filenameOK

	def isBad(self, setTo = None) :
		"""Is this mod name valid

		Args:
			setTo (bool, optional): Set the mod name validity. Defaults to None.

		Returns:
			bool: The mod not is NOT valid (True)
		"""

		if setTo is not None :
			self._filenameOK = not setTo
		
		return not self._filenameOK

	def isActive(self, inGame = None) :
		"""Is this mod active / make it active

		Args:
			inGame (int, optional): Savegame to toggle to True. Defaults to None.

		Returns:
			bool: Mod IS active (True)
		"""
		if inGame is not None :
			self._activeGames.add(inGame)
		
		return ( len(self._activeGames) > 0 )

	def isNotActive(self) :
		"""Is this mod active

		Returns:
			bool: Mod is NOT active (True)
		"""
		return ( len(self._activeGames) == 0 )

	def getAllActive(self, short = False, veryShort = False, showNone = False) :
		"""Get all active games

		Args:
			short (bool, optional): Short mode, no spaces. Defaults to False.
			veryShort (bool, optional): Very short mode - 1,2,3,4 becomes 1-4. Defaults to False.
			showNone (bool, optional): Show pair of dashes if not active. Defaults to False.

		Returns:
			str: List of games
		"""
		if showNone and self.isNotActive() :
			return "--"

		returnList = list(self._to_ranges(self._activeGames)) if veryShort else list(str(t) for t in sorted(self._activeGames, key = lambda item : int(item)))
		returnSep  = "," if short else ", "
		
		return returnSep.join(returnList)

	def isUsed(self, inGame = None) :
		"""Is this mod in use / set as used

		Args:
			inGame (int, optional): Savegame to toggle used status to True. Defaults to None.

		Returns:
			bool: This mod IS used (True)
		"""
		if inGame is not None :
			self._usedGames.add(inGame)
		
		return ( len(self._usedGames) > 0 )

	def isNotUsed(self) :
		""" Boolean "is this mod not used" """
		return ( len(self._usedGames) == 0 )

	def getAllUsed(self, short = False, veryShort = False, showNone = False) :
		"""Get all used games

		Args:
			short (bool, optional): Short mode, no spaces. Defaults to False.
			veryShort (bool, optional): Very short mode - 1,2,3,4 becomes 1-4. Defaults to False.
			showNone (bool, optional): Show pair of dashes if not used. Defaults to False.

		Returns:
			str: List of games
		"""
		if showNone and self.isNotUsed() :
			return "--"

		returnList = list(self._to_ranges(self._usedGames)) if veryShort else list(str(t) for t in sorted(self._usedGames, key = lambda item : int(item)))
		returnSep  = "," if short else ", "
		
		return returnSep.join(returnList)

	def setUsedToActive(self) :
		"""Set list of used games to the list of active games
		"""
		self._usedGames.update(self._activeGames)

	def size(self, setTo = None) :
		"""How big is the mod on disk

		Args:
			setTo (int, optional): Size of the mod, in bytes. Defaults to None.

		Returns:
			str: Human readable size of the mod
		"""
		if setTo is not None :
			self._fileSize = setTo
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

	def name(self, setTo = None) :
		"""The name of the mod

		Args:
			setTo (str, optional): Name of the mod. Defaults to None.

		Returns:
			str: Name of the mod (filename)
		"""
		if setTo is not None :
			self._name = setTo
		
		return self._name

	def fullPath(self, setTo = None) :
		"""Where is the mod

		Args:
			setTo (str, optional): Full path on disk to the mod. Defaults to None.

		Returns:
			str: System normalized full path to the mod (with filename)
		"""
		if setTo is not None :
			self._fullPath = setTo

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

			if self._name is None:
				self.getModDescName()

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

			if self._name is None:
				self.getModDescName()

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

	def sha256sum(self):
		""" Compute SHA256 hash of this mod """
		if self._sha256hash is not None:
			return self._sha256hash
		if self._fullPath is None:
			return None
		if self.isFolder() :
			""" Overload the return for folders, we do not want to hash a folder """
			return False

		h  = hashlib.sha256()
		b  = bytearray(128*1024)
		mv = memoryview(b)
		with open(self._fullPath, 'rb', buffering=0) as f:
			for n in iter(lambda : f.readinto(mv), 0):
				h.update(mv[:n])

		self._sha256hash = h.hexdigest()
		return self._sha256hash

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
				self._name = nameTry.strip()

		return self._name

	def getIconFile(self, window) :
		"""Get the icon file, in the calling window

		Args:
			window (tkinter.Tk): Window object of the calling window

		Returns:
			ImageTK.PhotoImage: image file, or None
		"""
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



