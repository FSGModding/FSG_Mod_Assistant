#  _______           __ ______ __                __               
# |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
# |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
# |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

# Base Window Updaters

# (c) 2021 JTSage.  MIT License.
import tkinter as Tk
import tkinter.ttk as ttk
import re

class ModCheckUpdater() :

	def __init__(self, rootWindow) :
		""" Update the tabs

		 * rootWindow   - inherit the base class
		"""
		self._rootWindow = rootWindow
		
	def _updateConfigNumbers(self, found = 0, broke = 0, missing = 0, folder = 0) :
		""" Update the number counts on the config tab """
		self._rootWindow._configLabels["found"].config(text = str(found))
		self._rootWindow._configLabels["broke"].config(text = str(broke))
		self._rootWindow._configLabels["folder"].config(text = str(folder))
		self._rootWindow._configLabels["missing"].config(text = str(missing))

	def _update_tab_config(self) :
		""" Update the configuration tab """
		root = self._rootWindow
		broken  = { k for k, v in root._modList.items() if v.isBad() }
		folder  = { k for k, v in root._modList.items() if v.isFolder() }
		missing = { k for k, v in root._modList.items() if v.isMissing() }

		self._updateConfigNumbers(
			found   = len(root._modList),
			broke   = len(broken) + len(root._badMods),
			folder  = len(folder),
			missing = len(missing)
		)

		root._logger.write([
			root._configStrings["info-mods-found"] + ": {}".format(len(root._modList)),
			root._configStrings["info-mods-broken"] + ": {}".format(len(broken) + len(root._badMods)),
			root._configStrings["info-mods-folders"] + ": {}".format(len(folder)),
			root._configStrings["info-mods-missing"] + ": {}".format(len(missing)),
		])
		root._logger.line()

	def _update_tab_broken(self) :
		""" Update the broken mods list """
		root = self._rootWindow

		broken = { k for k, v in root._modList.items() if v.isBad() }
		folder = { k for k, v in root._modList.items() if v.isFolder() and v.isGood() }

		root.tabContent["tabBroken"].clear_items()
	
		root._logger.write(root.tabContent["tabBroken"].title + ":")
	
		# First, bad names, they won't load
		for thisMod in sorted(broken, key=str.casefold) :
			# Trap message.  Should never display, but just in case.
			message = root._brokenStrings["default"]
		
			if ( re.search(r'unzip', thisMod, re.IGNORECASE) ) :
				# If it has "unzip" in the file/folder name, assume it is a pack or other mods.
				message = root._brokenStrings["unzip-folder"] if root._modList[thisMod].isFolder() else root._brokenStrings["unzip-zipfile"]
			elif ( re.match(r'[0-9]',thisMod) ) :
				# If it starts with a digit, something went way wrong.  Might be a pack, or it might be garbage.
				message = root._brokenStrings["digit-folder"] if root._modList[thisMod].isFolder() else root._brokenStrings["digit-zipfile"]
			else :
				# Finally, test for the common copy/paste file names, and duplicate downloads.
				testWinCopy = re.search(r'(\w+) - .+', thisMod)
				testDLCopy = re.search(r'(\w+) \(.+', thisMod)
				goodName = False
				if ( testWinCopy or testDLCopy ) :
					if ( testWinCopy and testWinCopy[1] in root._modList.keys() ) :
						# Does the guessed "good name" already exist?
						goodName = testWinCopy[1]
					if ( testDLCopy and testDLCopy[1] in root._modList.keys() ) :
						# Does the guessed "good name" already exist?
						goodName = testDLCopy[1]

					if ( goodName ) :
						message = root._brokenStrings["duplicate-have"].format(guessedModName = goodName)
					else :
						message = root._brokenStrings["duplicate-miss"]

				else :
					# Trap for when we can't figure out what is wrong with it.
					message = root._brokenStrings["unknown-folder"] if root._modList[thisMod].isFolder() else root._brokenStrings["unknown-zipfile"]
			
			root.tabContent["tabBroken"].add_item(
				thisMod + root._modList[thisMod].getZip(),
				message
			)
						
			root._logger.write("  {} - {}".format(
				thisMod + root._modList[thisMod].getZip(),
				message
			))

		# Next, unzipped folders that shouldn't be
		for thisMod in sorted(folder, key=str.casefold) :
			# No real logic here.  If it's a folder, suggest it be zipped.
			#
			# We have no real way of catching the case of a mod being unzipped directly to the root
			# mods folder, there are far too many variations - and although many mods follow the 
			# FS19 prefix convention, not all do, nor is it a requirement.

			root.tabContent["tabBroken"].add_item(
				thisMod,
				root._brokenStrings["must-be-zipped"]
			)
			root._logger.write("  {} - {}".format(
				thisMod,
				root._brokenStrings["must-be-zipped"]
			))

	
		# Finally, trash that just shouldn't be there 
		#
		# This would be anything other than a folder or a zip file. We could take a guess at other
		# archives, but thats about it.
		for thisFile in root._badMods :
			message = root._brokenStrings["garbage-default"]


			for thisArchive in [ ".7z", ".rar" ] :
				if thisFile.endswith(thisArchive) :
					message = root._brokenStrings["garbage-archive"]


			root.tabContent["tabBroken"].add_item(
				thisFile,
				message
			)
			root._logger.write("  {} - {}".format(
				thisFile,
				message
			))

		root._logger.line()

	def _update_tab_missing(self) :
		""" Update the missing mods list """
		root = self._rootWindow

		missing = { k for k, v in root._modList.items() if v.isMissing() }

		# Clear out the tree first
		root.tabContent["tabMissing"].clear_items()

		root._logger.write(root.tabContent["tabMissing"].title + ":")

	
		for thisMod in sorted(missing, key=str.casefold) :
			root.tabContent["tabMissing"].add_item(thisMod, (
				thisMod,
				root._modList[thisMod].name(),
				root._IOStrings["YES"] if root._modList[thisMod].isUsed() else root._IOStrings["no"],
				root._modList[thisMod].getAllActive()
			))

			root._logger.write("  " + "{modName} ({modTitle}) [{savegames}] {isOwned}".format(
				modName   = thisMod,
				modTitle  = root._modList[thisMod].name(),
				savegames = root._modList[thisMod].getAllActive(True),
				isOwned   = ("(" + root._IOStrings["OWNED"] + ")") if root._modList[thisMod].isUsed() else ""
			))

		root._logger.line()

	def _update_tab_inactive(self) :
		""" Update the inactive mods list """
		root = self._rootWindow

		inactive = { k for k, v in root._modList.items() if v.isNotUsed() and v.isNotActive() and v.isGood()  }

		# Clear out the tree first
		root.tabContent["tabInactive"].clear_items()
	
		root._logger.write(root.tabContent["tabInactive"].title+":")

		for thisMod in sorted(inactive, key=str.casefold) :
			root.tabContent["tabInactive"].add_item(thisMod, (
				thisMod,
				root._modList[thisMod].size()
			))

			root._logger.write("  {} ({})".format(
				thisMod,
				root._modList[thisMod].size()
			))

		root._logger.line()

	def _update_tab_unused(self) :
		""" Update the active but un-used mods list """
		root = self._rootWindow

		unused = { k for k, v in root._modList.items() if v.isNotUsed() and v.isActive() and v.isGood() and v.isNotMissing() }

		root.tabContent["tabUnused"].clear_items()
	
		root._logger.write(root.tabContent["tabUnused"].title+":")


		for thisMod in sorted(unused, key=str.casefold) :
			root.tabContent["tabUnused"].add_item(thisMod, (
				thisMod,
				root._modList[thisMod].name(),
				root._modList[thisMod].getAllActive(),
				root._modList[thisMod].size()
			))

			root._logger.write("  " + "{modName} ({modTitle}) [{savegames}] ({modFileSize})".format(
				modName     = thisMod,
				modTitle    = root._modList[thisMod].name(),
				savegames   = root._modList[thisMod].getAllActive(True),
				modFileSize = root._modList[thisMod].size()
			))
		
		root._logger.line()

	def _update_tab_conflict(self):
		""" Update the possible conflicts tab """
		root = self._rootWindow

		root.tabContent["tabConflict"].clear_items()
	
		for thisMod in sorted(root._conflictMods.keys(), key=str.casefold) :
			if thisMod in root._modList.keys():
				# Page through all known conflicts and compare it to the list
				# of INSTALLED mods.  We are attempting to warn what COULD maybe
				# happen, not what IS happening

				if root._conflictMods[thisMod]["confWith"] is None :
					# confWith is None, so it's a general warning
					root.tabContent["tabConflict"].add_item(thisMod, root._conflictMods[thisMod]["message"])

				else :
					# confWith is a list, so lets see if a conflicting mod is installed
					isConflicted = False
					for confMod in root._conflictMods[thisMod]["confWith"] :
						if confMod in root._modList.keys() :
							# At least one conflicting mod is present
							isConflicted = True
					if isConflicted :
						root.tabContent["tabConflict"].add_item(thisMod, root._conflictMods[thisMod]["message"])