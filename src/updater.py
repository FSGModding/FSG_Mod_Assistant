#  _______           __ ______ __                __               
# |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
# |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
# |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

# Base Window Updaters

# (c) 2021 JTSage.  MIT License.
import tkinter as Tk
import tkinter.ttk as ttk

class ModCheckUpdater() :

	def __init__(self, rootWindow) :
		""" Update the tabs

		 * rootWindow   - inherit the base class
		"""
		self._rootWindow = rootWindow
		
	def updateConfigNumbers(self, found = 0, broke = 0, missing = 0, folder = 0) :
		""" Update the number counts on the config tab """
		self._rootWindow._configLabels["found"].config(text = str(found))
		self._rootWindow._configLabels["broke"].config(text = str(broke))
		self._rootWindow._configLabels["folder"].config(text = str(folder))
		self._rootWindow._configLabels["missing"].config(text = str(missing))

	def update_tab_config(self) :
		""" Update the configuration tab """
		root = self._rootWindow
		#broken  = { k for k, v in root._modList.items() if v.isBad() }
		folder  = { k for k, v in root._modList.items() if v.isFolder() }
		missing = { k for k, v in root._modList.items() if v.isMissing() }

		self.updateConfigNumbers(
			found   = len(root._modList),
			broke   = len(root._badList),
			folder  = len(folder),
			missing = len(missing)
		)

		root._logger.write([
			root._configStrings["info-mods-found"] + ": {}".format(len(root._modList)),
			root._configStrings["info-mods-broken"] + ": {}".format(len(root._badList)),
			root._configStrings["info-mods-folders"] + ": {}".format(len(folder)),
			root._configStrings["info-mods-missing"] + ": {}".format(len(missing)),
		])
		root._logger.line()

	def update_tab_broken(self) :
		""" Update the broken mods list """
		root = self._rootWindow

		root.tabContent["tabBroken"].clear_items()
	
		root._logger.openSection(root.tabContent["tabBroken"].title + ":")
	
		initCompList = root._FSBadFile(".", [])
		initCompList.setFullModList(root._modList.keys())
		del initCompList

		for thisBadMod in sorted(root._badList.keys()) :

			message = root._badList[thisBadMod].diagnose()
			
			root._badList[thisBadMod].done() # Close any open files.

			root.tabContent["tabBroken"].add_item(
				thisBadMod,
				message
			)

			root._logger.write("{} - {}".format(
				thisBadMod,
				message
			))


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
				root._modList[thisMod].getAllActive()
			))

			root._logger.write("{modName} ({modTitle}) [{savegames}] {isOwned}".format(
				modName   = thisMod,
				modTitle  = root._modList[thisMod].name(),
				savegames = root._modList[thisMod].getAllActive(True),
				isOwned   = ("(" + root._IOStrings["OWNED"] + ")") if root._modList[thisMod].isUsed() else ""
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
				root._modList[thisMod].size()
			))

			root._logger.write("{} ({})".format(
				thisMod,
				root._modList[thisMod].size()
			))

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
				root._modList[thisMod].getAllActive(),
				root._modList[thisMod].size()
			))

			root._logger.write("{modName} ({modTitle}) [{savegames}] ({modFileSize})".format(
				modName     = thisMod,
				modTitle    = root._modList[thisMod].name(),
				savegames   = root._modList[thisMod].getAllActive(True),
				modFileSize = root._modList[thisMod].size()
			))
		
		root._logger.closeSection()

	def update_tab_conflict(self):
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