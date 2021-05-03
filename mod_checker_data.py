"""
 _______           __ ______ __                __               
|   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
|       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
|__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  
                                              v1.0.0.0 by JTSage

External Data file

(c) 2021 JTSage.  MIT License.
"""

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
	"FS19_StoreSales",
	"FS19_ToolsCombo",
	"FS19_TrainStopMod",
	"FS19_UnitConvertLite",
	"FS19_UniversalPassenger",
	"FS19_VehicleControlAddon",
	"FS19_vehicleDirtExtension",
	"FS19_VehicleExplorer",
	"FS19_VehicleStraps",
	"FS19_zzzSpeedControl",
	"VehicleInspector"
]

knownConflicts = {
	"FS19_InfoMenu" : 
		"Some versions of Info Menu conflict with the Precision Farming DLC"
	,
	"FS19_UnitConvertLite" :
		"Some versions of Unit Convert Lite conflict with the Precision Farming DLC"
	,
	"FS19_additionalFieldInfo" :
		"Versions of Additional Field Info prior to 1.0.2.3 conflict with the Precision Farming DLC"
	,
	"FS19_towBar" :
		"Old versions of the Tow Bar have been reported to be game breaking."
	,
	"FS19PlaceAnywhere" :
		"The Place Anywhere mod can conflict with Global Company if both are loaded (and GC's extended placables is used)"
	,
	"FS19_GlobalCompany" :
		"The Global Company mod can conflict with Place Anywhere if both are loaded (and GC's extended placables is used)"
	,
	"FS19_REA" :
		"The Added Realism For Vehicles mod can cause conflicts with improperly prepared vehicle mods."
	,
	"FS19_realMud" :
		"The Real Mud mod can cause conflicts with improperly prepared vehicle mods."
}