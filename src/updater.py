#  _______           __ ______ __                __               
# |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
# |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
# |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

# Base Window Updaters

# (c) 2021 JTSage.  MIT License.
import tkinter as Tk
import tkinter.ttk as ttk

class ModCheckUpdater() :
	"""Update the tabs

	Args:
		rootWindow (object): Root window object (base)
	"""	

	def __init__(self, rootWindow) :
		self._rootWindow = rootWindow
		
	def updateConfigNumbers(self, found = 0, broke = 0, missing = 0) :
		"""Update the number of mods found

		Args:
			found (int, optional): Found mods count. Defaults to 0.
			broke (int, optional): Broken files count. Defaults to 0.
			missing (int, optional): Missing mods count. Defaults to 0.
		"""
		self._rootWindow._configLabels["found"].config(text = str(found))
		self._rootWindow._configLabels["broke"].config(text = str(broke))
		self._rootWindow._configLabels["missing"].config(text = str(missing))

	def update_tab_config(self) :
		""" Update the configuration tab """
		root    = self._rootWindow
		missing = { k for k, v in root._modList.items() if v.isMissing() }

		skipBads = 0

		if root.warnUnpacked.get() == 0:
			skipBads = len({ k for k, v in root._badList.items() if v.isGood() })

		self.updateConfigNumbers(
			found   = len(root._modList),
			broke   = (len(root._badList) - skipBads),
			missing = len(missing)
		)

		root._logger.write([
			root._configStrings["info-mods-found"] + ": {}".format(len(root._modList)),
			root._configStrings["info-mods-broken"] + ": {}".format(len(root._badList)),
			root._configStrings["info-mods-missing"] + ": {}".format(len(missing)),
		])
		root._logger.line()

	def update_tab_broken(self) :
		""" Update the broken mods list """
		root = self._rootWindow

		root.tabContent["tabBroken"].clear_items()
	
		root._logger.openSection(root.tabContent["tabBroken"].title + ":")
	
		initCompList = root._FSBadFile(".", [])
		initCompList.setFullModList(root._modList.keys(), root._modList)
		del initCompList

		for idx, thisBadMod in enumerate(sorted(root._badList.keys()), start=1) :
			root._badList[thisBadMod].diagnose(ignoreUnpacked = (False if root.warnUnpacked.get() == 1 else True)) # Diagnose the problem (cached)
			root._badList[thisBadMod].done() # Close any open files.

			if root._badList[thisBadMod].diagnose() is False:
				continue

			root.tabContent["tabBroken"].add_item(
				root._badList[thisBadMod].getHRFilename(),
				root._badList[thisBadMod].diagnose()
			)

			root._set_progress(90 + int(5 * (idx / len(root._badList))))

			root._logger.write(str(root._badList[thisBadMod]))

		root._logger.closeSection()

	def update_tab_missing(self) :
		""" Update the missing mods list """
		root = self._rootWindow

		missing = { k for k, v in root._modList.items() if v.isMissing() }

		# Clear out the tree first
		root.tabContent["tabMissing"].clear_items()

		root._logger.openSection(root.tabContent["tabMissing"].title + ":")

		for thisMod in sorted(missing, key=str.casefold) :
			root.tabContent["tabMissing"].add_item(thisMod, (
				thisMod,
				root._modList[thisMod].name(),
				root._IOStrings["YES"] if root._modList[thisMod].isUsed() else root._IOStrings["no"],
				root._modList[thisMod].getAllActive(veryShort=True)
			))

			root._logger.write("{mod}{isOwned}".format(
				mod     = str(root._modList[thisMod]),
				isOwned = (" (" + root._IOStrings["OWNED"] + ")") if root._modList[thisMod].isUsed() else ""
			))

		root._logger.closeSection()

	def update_tab_inactive(self) :
		""" Update the inactive mods list """
		root = self._rootWindow

		inactive = { k for k, v in root._modList.items() if v.isNotUsed() and v.isNotActive() and v.isGood()  }

		# Clear out the tree first
		root.tabContent["tabInactive"].clear_items()
	
		root._logger.openSection(root.tabContent["tabInactive"].title+":")

		for thisMod in sorted(inactive, key=str.casefold) :
			root.tabContent["tabInactive"].add_item(thisMod, (
				thisMod,
				root._modList[thisMod].name(),
				root._modList[thisMod].size()
			))

			root._logger.write(str(root._modList[thisMod]))

		root._logger.closeSection()

	def update_tab_unused(self) :
		""" Update the active but un-used mods list """
		root = self._rootWindow

		unused = { k for k, v in root._modList.items() if v.isNotUsed() and v.isActive() and v.isGood() and v.isNotMissing() }

		root.tabContent["tabUnused"].clear_items()
	
		root._logger.openSection(root.tabContent["tabUnused"].title+":")

		for thisMod in sorted(unused, key=str.casefold) :
			root.tabContent["tabUnused"].add_item(thisMod, (
				thisMod,
				root._modList[thisMod].name(),
				root._modList[thisMod].getAllActive(veryShort=True),
				root._modList[thisMod].size()
			))

			root._logger.write(str(root._modList[thisMod]))
		
		root._logger.closeSection()

	def update_tab_good(self) :
		""" Update the good mods list (don't log)"""
		root = self._rootWindow

		good = { k for k, v in root._modList.items() if v.isUsed() and v.isActive() and v.isGood() and v.isNotMissing() }

		root.tabContent["tabGood"].clear_items()
	
		for thisMod in sorted(good, key=str.casefold) :
			root.tabContent["tabGood"].add_item(thisMod, (
				thisMod,
				root._modList[thisMod].name(),
				root._modList[thisMod].getAllActive(veryShort=True),
				root._modList[thisMod].size()
			))


	def update_tab_conflict(self):
		""" Update the possible conflicts tab (don't log) """
		root = self._rootWindow

		root.tabContent["tabConflict"].clear_items()
	
		for thisMod in sorted(root._conflictMods.keys(), key=str.casefold) :
			if thisMod in root._modList.keys():
				# Page through all known conflicts and compare it to the list
				# of detected (INSTALLED or MISSING) mods.  We are attempting
				# to warn what COULD maybe happen, not what IS happening

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