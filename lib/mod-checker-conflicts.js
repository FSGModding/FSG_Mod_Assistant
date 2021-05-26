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

/* List format:

	"modName" : {
		"message"  : "Informational Message when found",
		"confWith" : ["list", "of", "mods"] OR None
	}
*/
module.exports.conflictMods = {
	"FS19_InfoMenu" : {
		confWith : null,
		message  : {
			en : "Some versions of Info Menu conflict with the Precision Farming DLC",
		},
	},
	"FS19_UnitConvertLite" : {
		confWith : null,
		message  : {
			en : "Some versions of Unit Convert Lite conflict with the Precision Farming DLC",
		}
	},
	"FS19_additionalFieldInfo" : {
		confWith : null,
		message  : {
			en : "Versions of Additional Field Info prior to 1.0.2.3 conflict with the Precision Farming DLC",
		}
	},
	"FS19_Variable_Spray_Usage" : {
		confWith : null,
		message  : {
			en : "Variable Spray Usage conflicts with the Precision Farming DLC",
		}
	},
	"FS19_towBar" : {
		confWith : null,
		message  : {
			en : "Old versions of the Tow Bar have been reported to be game breaking.",
		}
	},
	"FS19PlaceAnywhere" : {
		confWith : ["FS19_GlobalCompany"],
		message  : {
			en : "The Place Anywhere mod can conflict with Global Company if both are loaded (and Global Company's extended placeables is used)",
		}
	},
	"FS19_GlobalCompany" : {
		confWith : ["FS19PlaceAnywhere"],
		message  : {
			en : "The Global Company mod can conflict with Place Anywhere if both are loaded (and Global Company's extended placeables is used)",
		}
	}, 
	"FS19_REA" : {
		confWith : null,
		message  : {
			en : "The Added Realism For Vehicles mod can cause conflicts with improperly prepared vehicle mods. If has also been reported to not work with CoursePlay",
		}
	},
	"FS19_realMud" : {
		confWith : null,
		message  : {
			en : "The Real Mud mod can cause conflicts with improperly prepared vehicle mods.",
		}
	},
	"FS19_zzzSpeedControl" : {
		confWith : ["FS19_Courseplay"],
		message  : {
			en : "Speed Control has been reported to not work with CoursePlay",
		}
	},
	"FS19_waitingWorkers" : {
		confWith : ["FS19_Courseplay"],
		message  : {
			en : "Waiting workers has been reported to not work with CoursePlay",
		}
	},
	"FS19_Courseplay" : {
		confWith : [
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
		],
		message  : {
			en : "There are a number of mods that will not function correctly with courseplay.  A partial list is available in the pinned issue on the courseplay github.",
		}
	}
}