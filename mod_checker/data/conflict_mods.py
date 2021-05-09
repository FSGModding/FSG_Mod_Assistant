#  _______           __ ______ __                __               
# |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
# |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
# |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

# External Data file - Conflict Mods

# (c) 2021 JTSage.  MIT License.

# These are mods that have often reported conflicts and we want to warn the user of that.
#
# This is really for the "big" or "common" conflicts.  One-off oddities is a waste of
# maintainer time.
#
# List format:
#
#	"modName" : {
#		"message"  : "Informational Message when found",
#		"confWith" : ["list", "of", "mods"] OR None
#	}
mods = {

	"FS19_InfoMenu" : {
		"message"  : "Some versions of Info Menu conflict with the Precision Farming DLC",
		"confWith" : None
	},
	"FS19_UnitConvertLite" : {
		"message"  : "Some versions of Unit Convert Lite conflict with the Precision Farming DLC",
		"confWith" : None
	},
	"FS19_additionalFieldInfo" : {
		"message"  : "Versions of Additional Field Info prior to 1.0.2.3 conflict with the Precision Farming DLC",
		"confWith" : None
	},
	"FS19_Variable_Spray_Usage" : {
		"message"  : "Variable Spray Usage conflicts with the Precision Farming DLC",
		"confWith" : None
	},
	"FS19_towBar" : {
		"message"  : "Old versions of the Tow Bar have been reported to be game breaking.",
		"confWith" : None
	},
	"FS19PlaceAnywhere" : {
		"message"  : "The Place Anywhere mod can conflict with Global Company if both are loaded (and Global Company's extended placeables is used)",
		"confWith" : [ "FS19_GlobalCompany"]
	},
	"FS19_GlobalCompany" : {
		"message"  : "The Global Company mod can conflict with Place Anywhere if both are loaded (and Global Company's extended placeables is used)",
		"confWith" : ["FS19PlaceAnywhere"]
	}, 
	"FS19_REA" : {
		"message"  : "The Added Realism For Vehicles mod can cause conflicts with improperly prepared vehicle mods. If has also been reported to not work with CoursePlay",
		"confWith" : None
	},
	"FS19_realMud" : {
		"message"  : "The Real Mud mod can cause conflicts with improperly prepared vehicle mods.",
		"confWith": None
	},
	"FS19_zzzSpeedControl" : {
		"message"  : "Speed Control has been reported to not work with CoursePlay",
		"confWith": ["FS19_Courseplay"]
	},
	"FS19_waitingWorkers" : {
		"message"  : "Waiting workers has been reported to not work with CoursePlay",
		"confWith": ["FS19_Courseplay"]
	},
	"FS19_Courseplay" : {
		"message"  : "There are a number of mods that will not function correctly with courseplay.  A partial list is available in the pinned issue on the courseplay github.",
		"confWith" : [
			"FS19_IMT_5360",
			"FS_19_JohnDeere_540GIII_V1",
			"FS19_MANMilk",
			"FS19_waitingWorkers",
			"FS19_STS_EU_Series",
			"FS19_RealShovel",
			"FS19_zzzSpeedControl",
			"FS19_towBar",
			"FS19_REA",
			"FS19_coverAddon"
		]
	}
}