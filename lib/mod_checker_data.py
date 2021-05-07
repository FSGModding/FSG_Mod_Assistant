#  _______           __ ______ __                __               
# |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
# |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
# |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

# External Data file

# (c) 2021 JTSage.  MIT License.


# These are mods we are sure will (almost) never actually appear in the "used" section because
# they don't have anything that you buy or place included in them.
#
# The big exception is Seasons, as it does have one or two placeables, but you don't have to use
# them, so better to err on the side of caution. 
knownScriptOnlyMods = [
	"FS19_adjustWorkingSpeed",
	"FS19_AdvancedStats",
	"FS19_Agribumper",
	"FS19_AnimalPenExtension",
	"FS19_AnimalScreenExtended",
	"FS19_AutoDrive",
	"FS19_BaleWapperExtension",
	"FS19_BetterContracts",
	"FS19_buyableLargeStackBales",
	"FS19_CameraSuspension",
	"FS19_categoryAdder",
	"FS19_Courseplay",
	"FS19_coverAddon",
	"FS19_disableVehicleCameraCollision",
	"FS19_EasyAutoLoad",
	"FS19_Engine_Starter",
	"FS19_ExtendedVehicleMaintenance",
	"FS19_fixAttacherJointRot",
	"FS19_FollowMe",
	"FS19_Geo_Montana",
	"FS19_GlobalCompany",
	"FS19_GlobalCompanyAddOn_Icons",
	"FS19_guidanceSteering",
	"FS19_InfoDisplay",
	"FS19_InfoMenu",
	"FS19_InsideCameraZoom",
	"FS19_Inspector",
	"FS19_KeyboardSteering",
	"FS19_LumberJack",
	"FS19_MaizePlus",
	"FS19_MapObjectsHider",
	"FS19_Measure.zip",
	"FS19_MoneyTool",
	"FS19_MoreMissionsAllowed",
	"FS19_NoAutomaticRefuel",
	"FS19_PrecisionFarmingAddon",
	"FS19_QuickCamera",
	"FS19_REA",
	"FS19_READynamicDirt",
	"FS19_realDirtColor",
	"FS19_realDirtFix",
	"FS19_realMud",
	"FS19_realSpeedLimit",
	"FS19_RM_Midwest",
	"FS19_RM_Seasons",
	"FS19_SleepAnytime",
	"FS19_SleepAnywhere",
	"FS19_simpleIC",
	"FS19_StoreSales",
	"FS19_StubbleCultivator",
	"FS19_ToolsCombo",
	"FS19_TrainStopMod",
	"FS19_UnitConvertLite",
	"FS19_UniversalPassenger",
	"FS19_VehicleControlAddon",
	"FS19_vehicleDirtExtension",
	"FS19_VehicleExplorer",
	"FS19_VehicleStraps",
	"FS19_waitingWorkers",
	"FS19_zzzSpeedControl",
	"VehicleInspector",
]


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
knownConflicts = {

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