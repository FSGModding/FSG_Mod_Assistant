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
	""" This class holds all of the information about a mod we would want to know """

	fullModList = []
	fullModListObj = {}

	def setFullModList(self, keylist, theObject):
		""" Use a class-global copt of the modlist (keys) and objects """
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
		self.modVersion     = "0.0.0.0"
		
	def isFolder(self, *args) :
		""" Boolean "is this a folder", allow setting the same """
		if ( len(args) > 0 ) :
			self._folder = args[0]
		else :
			return self._folder

	def isGarbage(self) :
		""" Is this not possibly a valid file? """
		return not self.isFolderOrZip()

	def isFolderOrZip(self) :
		""" Is a folder or a zip / inverse of isGarbage() """
		return (self._folder or self._fullPath.endswith(".zip"))

	def nameIsUnzip(self) :
		""" Filename contains the "unzip" string """
		return re.search(r'unzip', self._filename, re.IGNORECASE)

	def nameStartsDigit(self) :
		""" Filename starts with a digit """
		return re.match(r'[0-9]',self._filename)

	def isCopy(self) :
		""" Is this a likely copy of another mod? 
		Return tuple :
			(bool Answer, str Good Name Guess)
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
		""" Test is the zip actually opens as a zip """
		if self._folder : return False

		if not self._fullPath.endswith(".zip") : return False

		try :
			self._thisZIP = zipfile.ZipFile(self._fullPath)
			return True
		except zipfile.BadZipFile :
			return False

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

	def fullPath(self, *args) :
		""" Return the full file path to the mod, allow setting the same """
		if ( len(args) > 0 ) :
			self._fullPath = args[0]

		else :
			if self._fullPath is not None:
				return os.path.normpath(self._fullPath)
			else :
				return None

	def hasReadableModDesc(self) :
		""" Is a zip file, and valid (check earlier) """
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
		""" Is this an archive FS can't open? """
		knownArcs = [".7z", ".rar"]

		for thisArchive in knownArcs :
			if self._filename.endswith(thisArchive) :
				return True
		
		return False

	def sha256sum(self):
		""" Compute SHA256 hash of this mod """
		if self.isFolder() :
			return None

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
		""" Cache diagnosis. We don't need this *yet*, but might someday soon """
		if self._whatWrong is None:
			self._whatWrong = self._diagnose()

		return self._whatWrong

	def _diagnose(self) :
		""" Diagnose what is wrong with this file/mod """
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
