//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Mod File Parser - Conflict Mods

// (c) 2021 JTSage.  MIT License.

/*
These are mods that have often reported conflicts and
we want to warn the user of that.

This is really for the "big" or "common" conflicts.
One-off oddities is a waste of maintainer time.
*/

module.exports.conflictMods = {
	'FS19_InfoMenu' : {
		confWith : ['FS19_precisionFarming'],
		message  : {
			en : 'Some versions of Info Menu conflict with the Precision Farming DLC',
		},
	},
	'FS19_UnitConvertLite' : {
		confWith : ['FS19_precisionFarming'],
		message  : {
			en : 'Some versions of Unit Convert Lite conflict with the Precision Farming DLC',
		},
	},
	'FS19_additionalFieldInfo' : {
		confWith : ['FS19_precisionFarming'],
		message  : {
			en : 'Versions of Additional Field Info prior to 1.0.2.3 conflict with the Precision Farming DLC',
		},
	},
	'FS19_Variable_Spray_Usage' : {
		confWith : ['FS19_precisionFarming'],
		message  : {
			en : 'Variable Spray Usage conflicts with the Precision Farming DLC',
		},
	},
	'FS19_towBar' : {
		confWith : null,
		message  : {
			en : 'Old versions of the Tow Bar have been reported to be game breaking.',
		},
	},
	'FS19PlaceAnywhere' : {
		confWith : ['FS19_GlobalCompany'],
		message  : {
			en : 'The Place Anywhere mod can conflict with Global Company if both are loaded (and Global Company\'s extended placeables is used)',
		},
	},
	'FS19_REA' : {
		confWith : null,
		message  : {
			en : 'The Added Realism For Vehicles mod can cause conflicts with improperly prepared vehicle mods. If has also been reported to not work with CoursePlay',
		},
	},
	'FS19_realMud' : {
		confWith : null,
		message  : {
			en : 'The Real Mud mod can cause conflicts with improperly prepared vehicle mods.',
		},
	},
	'FS19_zzzSpeedControl' : {
		confWith : ['FS19_Courseplay'],
		message  : {
			en : 'Speed Control has been reported to not work with CoursePlay',
		},
	},
	'FS19_waitingWorkers' : {
		confWith : ['FS19_Courseplay'],
		message  : {
			en : 'Waiting workers has been reported to not work with CoursePlay',
		},
	},
	'FS19_Courseplay' : {
		confWith : [
			'FS19_IMT_5360',
			'FS_19_JohnDeere_540GIII_V1',
			'FS19_MANMilk',
			'FS19_waitingWorkers',
			'FS19_STS_EU_Series',
			'FS19_RealShovel',
			'FS19_zzzSpeedControl',
			'FS19_towBar',
			'FS19_REA',
			'FS19_coverAddon'
		],
		message  : {
			en : 'There are a number of mods that will not function correctly with courseplay.  A partial list is available in the pinned issue on the courseplay github.',
		},
	},
	'FS19_baler_addon' : {
		confWith : ['FS19_addon_strawHarvest'],
		message  : {
			en : 'Using the Baler Addon mod with the Straw Harvest addon can cause baler not be filled with netting/yarn and bales cannot be ejected',
		},
	},
	'FS19_RoundbalerExtension' : {
		confWith : ['FS19_addon_strawHarvest'],
		message  : {
			en : 'Versions of the Round Baler Extension below 1.5.0.0 will fail to work with the Straw Harvest Addon',
		},
	},
	'FS19_VariableBaleCapacity' : {
		confWith : ['FS19_addon_strawHarvest'],
		message  : {
			en : 'When also using the Straw Harvest Addon, variable bales will not work correctly with the Premos Bale Shredder vehicle',
		},
	},
	'FS19_GlobalCompanyPlaceable_sawmill' : {
		confWith : ['FS19_addon_strawHarvest'],
		message  : {
			en : 'The Global Company Sawmill pack will not work correctly with the Straw Harvest Addon',
		},
	},
	'FS19_SeeBales' : {
		confWith : ['FS19_addon_strawHarvest'],
		message  : {
			en : 'See Bales used with the Straw Harvest addon will cause pallets to fill to 0l and a game crash when selling pallets',
		},
	},
	'FS19_realDirtFix' : {
		confWith : ['FS19_addon_strawHarvest'],
		message  : {
			en : 'Real Dirt Fix will not work correctly with the Straw Harvest addon',
		},
	},
	'FS19_MoreBunkersilo' : {
		confWith : ['FS19_addon_strawHarvest'],
		message  : {
			en : 'More Bunker Silo versions below 1.0.0.2 pallets cannot be sold when running the Straw Harvest addon',
		},
	},
	'FS19_BeetHarvest_Addon' : {
		confWith : ['FS19_addon_strawHarvest'],
		message  : {
			en : 'The beet harvest addon is incompatible with the Straw Harvest addon, they cannot be used together',
		},
	},
	'FS19_AutomaticUnloadForBaleWrapper' : {
		confWith : ['FS19_addon_strawHarvest'],
		message  : {
			en : 'Automatic Unload for Bale Wrappers does not work with the Straw Harvest addon',
		},
	},
	'FS19_addon_strawHarvest' : {
		confWith : null,
		message  : {
			en : 'Straw harvest has a few notable mod non-specific incompatibilities :<br />1.) The palletizer will not work with autoloaded (autounloaded) trailers.<br />2.) Using Straw Harvest with Seasons and Maize Plus CCM will likely result in too many fill types and could convert snow to a pellet variety.<br />3.) Alfalfa, if on the map, cannot be baled.<br />4.) Strange behavior may result when using the Alpine DLC (fixed in version 1.2.1.0)<br />5.) If you mod folder is on OneDrive or Epic Games sync, you may be unable to sell pallets (or other odd behavior)',
		},
	},
	'FS19_RM_Seasons' : {
		confWith : null,
		message  : {
			en : 'Seasons has issues with the following :<br />1.) Do not load multiple map mods. Only load the map you are using!<br />2.) Any mod that manipulates the weather, [e.g. Multi overlay hud]<br />3.) Any mod that manipulates growth<br />4.) Any mod that changes animals<br />5.) Any "season manager" type mods<br />6.) Some animal cleaning mods may not work correctly, especially during the winter',
		},
	},
	'FS19_realistic' : {
		confWith : null,
		message  : {
			en : 'Realistic Yield and Weight is incompatible with the Alpine DLC pack.  Wheels tend to glitch through the ground',
		},
	},
}