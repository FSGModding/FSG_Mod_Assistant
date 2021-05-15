#  _______           __ ______ __                __               
# |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
# |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
# |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

# Individual Bad File / Folder Class

# (c) 2021 JTSage.  MIT License.

import os
import re
import zipfile
import lxml.etree as etree
import hashlib

class FSBadFile() :
	""" Bad files found information object

	Args:
		fullPath (str): Full path to the bad file
		strings (list): Strings of the problems we can detect
	"""

	fullModList = []
	fullModListObj = {}

	def setFullModList(self, keylist, theObject):
		"""Use a class-global copy of the modlist

		Args:
			keylist (list): List of mod names
			theObject (dict): Dict of mod names -> src.data.mods instance
		"""
		self.fullModList.clear()
		self.fullModList.extend(keylist)
		self.fullModListObj.clear()
		self.fullModListObj.update(theObject)

	def __init__(self, fullPath, strings) :
		self._brokenStrings = strings
		self._folder        = False
		self._fullPath      = fullPath
		self._filename      = os.path.basename(fullPath)
		self._filenameOK    = False
		self._thisZIP       = None
		self._modDesc       = None
		self._modDescTree   = None
		self._whatWrong     = None
		self._shaHash       = None
		self.modVersion     = "0.0.0.0"

	def __str__(self):
		"""String representation of bad file

		Returns:
			str: Representation
		"""
		return "{modFile} - {message}".format(
			modFile = self.getHRFilename(),
			message = self.diagnose()
		)

	def getHRFilename(self) :
		"""Get human readable filename (seperator after folder if folder)

		Returns:
			str: Filename
		"""
		return "{modFile}{seperator}".format(
			modFile   = self._filename,
			seperator = os.path.sep if self.isFolder() else ""
		)
		
	def isFolder(self, setTo = None) :
		"""Is this a folder

		Args:
			setTo (bool, optional): This IS a folder (True). Defaults to None.

		Returns:
			bool: This IS a folder (True)
		"""
		if setTo is not None :
			self._folder = setTo

		return self._folder

	def isGarbage(self) :
		"""Is this not possibly a valid file?

		Returns:
			bool: This CANNOT BE a valid mod (True)
		"""
		return not self.isFolderOrZip()

	def isFolderOrZip(self) :
		"""Is this not possibly a valid file?

		Returns:
			bool: This COULD BE a valid mod (True)
		"""
		return (self._folder or self._fullPath.endswith(".zip"))

	def nameIsUnzip(self) :
		"""File is a mod pack

		Returns:
			bool: Filename contains the "unzip" string, likely a pack
		"""
		return re.search(r'unzip', self._filename, re.IGNORECASE)

	def nameStartsDigit(self) :
		"""Filename starts with a digit

		Returns:
			bool: Filename DOES start with a digit (True)
		"""
		return re.match(r'[0-9]',self._filename)

	def isCopy(self) :
		"""Is this a likely copy of another mod? 

		Returns:
			tuple: (bool_likely_IS_copy, str_or_False_name_of_original)
		"""			
		windowsCopyName = re.search(r'(\w+) - .+', self._filename)
		browserDLCopyName = re.search(r'(\w+) \(.+', self._filename)

		if windowsCopyName :
			""" Probable windows copy/paste """
			if windowsCopyName[1] in self.fullModList :
				return (True, windowsCopyName[1])
			else :
				return (True, False)

		if browserDLCopyName :
			if browserDLCopyName[1] in self.fullModList :
				return (True, browserDLCopyName[1])
			else :
				return (True, False)

		return (False,False)

	def isValidZip(self) :
		"""Test is the zip actually opens as a zip

		Returns:
			bool: Zip file IS readable (True)
		"""
		if self._folder : return False

		if not self._fullPath.endswith(".zip") : return False

		try :
			self._thisZIP = zipfile.ZipFile(self._fullPath)
			return True
		except zipfile.BadZipFile :
			return False

	def isGood(self, setTo = None) :
		"""File is a valid mod name?

		Args:
			setTo (bool, optional): File IS a valid name. Defaults to None.

		Returns:
			bool: File IS a valid name (True)
		"""
		if setTo is not None :
			self._filenameOK = setTo

		return self._filenameOK

	def isBad(self, setTo = None) :
		"""File is NOT a valid mod name?

		Args:
			setTo (bool, optional): File is NOT a valid name. Defaults to None.

		Returns:
			bool: File is NOT a valid name (True)
		"""
		if setTo is not None :
			self._filenameOK = not setTo

		return not self._filenameOK

	def fullPath(self, setTo = None) :
		"""Full path to the file (with filename)

		Args:
			setTo (str, optional): Set the full path to the file. Defaults to None.

		Returns:
			str: Full path to the file, system normalized
		"""
		if setTo is not None :
			self._fullPath = setTo

		else :
			if self._fullPath is not None:
				return os.path.normpath(self._fullPath)
			else :
				return None

	def hasReadableModDesc(self) :
		"""Has a parseable modDesc.xml

		Returns:
			bool: file/folder DOES have a parseable modDesc.xml

		Notes:
			If a zip file, file must already be in memory. Call isValidZip() first.
		"""
		if self.isGarbage() : return False

		if self._filename.endswith(".zip") and self._thisZIP is not None :
			if 'modDesc.xml' in self._thisZIP.namelist() :
				try:
					thisModDesc = self._thisZIP.read('modDesc.xml')
					self._modDescTree = etree.fromstring(thisModDesc)
					self.modVersion = self._modDescTree.findtext("version")
					return True
				except:
					return False
			else :
				return False

		if self.isFolder() :
			if os.path.exists(os.path.join(self._fullPath, "modDesc.xml")) :
				try:
					self._modDescTree = etree.parse(os.path.join(self._fullPath, "modDesc.xml"))
					self.modVersion = self._modDescTree.findtext("version")
					return True
				except :
					return False
			else :
				return False

		""" Unhandled?  Shouldn't be..."""
		return False

	def isGarbageArchive(self) :
		"""Is this an archive FS can't open?

		Returns:
			bool: File IS a known archive the game cannot read (probably a mod pack)
		"""		
		knownArcs = [".7z", ".rar"]

		for thisArchive in knownArcs :
			if self._filename.endswith(thisArchive) :
				return True
		
		return False

	def sha256sum(self):
		"""Get SHA256 Hash of the file (cached)

		Returns:
			str: SHA256 of the file (folder = None)
		"""
		if self.isFolder() :
			return None

		if self._shaHash is None:
			self._shaHash = self._sha256sum()

		return self._shaHash

	def _sha256sum(self):
		"""Get the SHA256 Hash of the file (bypass cache)

		Returns:
			str: SHA256 of the file
		"""
		h  = hashlib.sha256()
		b  = bytearray(128*1024)
		mv = memoryview(b)
		with open(self._fullPath, 'rb', buffering=0) as f:
			for n in iter(lambda : f.readinto(mv), 0):
				h.update(mv[:n])

		return h.hexdigest()

	def done(self) :
		""" Explicit file close (zip) """
		if self._thisZIP is not None:
			self._thisZIP.close()

	def diagnose(self) :
		"""Diagnose file problem, cache result

		Returns:
			str: Problem with file
		"""
		if self._whatWrong is None:
			self._whatWrong = self._diagnose()

		return self._whatWrong

	def _diagnose(self) :
		"""Diagnose file problem, cache result (actual work)

		Returns:
			str: Problem with file
		"""
		if self.isGarbage() :
			if self.isGarbageArchive() :
				return self._brokenStrings["garbage-archive"]
			else :
				return self._brokenStrings["garbage-default"]

		if self.isFolder() :
			amICopied = self.isCopy()
			amIAMod   = self.hasReadableModDesc()

			if not amIAMod :
				""" Not a mod real mod - we are either garbage or an UNZIP unpack """
				if self.nameIsUnzip() :
					return self._brokenStrings["unzip-folder"]
				else :
					return self._brokenStrings["folder-not-mod"]

			if self.isGood() :
				""" We are a mod, the name is good, suggest zipping! """
				return self._brokenStrings["must-be-zipped"]

			if amICopied[0] :
				if amICopied[1] :
					""" Duplicate, other can be guessed and found """
					if self.modVersion == self.fullModListObj[amICopied[1]].modVersion :
						""" Yep, guessed name exists """
						return self._brokenStrings["duplicate-have"].format(guessedModName=amICopied[1])
					else :
						""" Different versions """
						return self._brokenStrings["duplicate-diff"].format(
							guessedModName = amICopied[1],
							goodVer        = self.fullModListObj[amICopied[1]].modVersion,
							badVer         = self.modVersion
						)
				else :
					""" Duplicate check passed, original not found """
					return self._brokenStrings["duplicate-miss"]

			"""
			So, we are NOT a copy, but we are a mod, and our name is bad. 
			That could only happen if there are digits in our name, but, just in case...
			"""
			if self.nameStartsDigit() :
				return self._brokenStrings["digit-folder"]
			
			return self._brokenStrings["unknown-folder"]

		else :
			""" Ok, zip files. """

			if not self.isValidZip():
				""" Not really a zipfile """
				return self._brokenStrings["invalid-zipfile"]

			if not self.hasReadableModDesc():
				""" Can't find moddesc, not a mod """
				if self.nameIsUnzip() :
					""" Named like a UNZIP mod pack """
					return self._brokenStrings["unzip-zipfile"]
				else :
					""" Might still be a pack, be less sure """
					return self._brokenStrings["zipfile-not-mod"]

			""" Ok, so we *are* a mod, but with a bad name. """

			amICopied = self.isCopy()

			if amICopied[0]:
				""" We are a copy! """
				if amICopied[1] :
					""" Duplicate, other guessed and found """
					if self.modVersion == self.fullModListObj[amICopied[1]].modVersion :
						""" Same version """
						if self.sha256sum() == self.fullModListObj[amICopied[1]].sha256sum() :
							""" Same SHA256 sum (identical) """
							return self._brokenStrings["duplicate-have"].format(guessedModName=amICopied[1])
						else :
							""" Same versions, different sum - somebody altered it """
							return self._brokenStrings["duplicate-sha"].format(guessedModName=amICopied[1])
					else :
						""" Different versions """
						return self._brokenStrings["duplicate-diff"].format(
							guessedModName = amICopied[1],
							goodVer        = self.fullModListObj[amICopied[1]].modVersion,
							badVer         = self.modVersion
						)
				else :
					""" Duplicate check passed, original not found """
					return self._brokenStrings["duplicate-miss"]

			""" Not a copy. """
			
			if self.nameStartsDigit() :
				return self._brokenStrings["digit-zipfile"]

			return self._brokenStrings["unknown-zipfile"]

		""" Can't be here, but in case we somehow are """
		return self._brokenStrings["default"]
