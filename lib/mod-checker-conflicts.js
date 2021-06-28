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
			pl : 'Niektóre wersje "Info Menu" powodują konflikt z "Precision Farming DLC".',
			de : 'Manche Versionen des Infomenüs stehen im Konflikt mit dem Precision Farming DLC',
		},
	},
	'FS19_UnitConvertLite' : {
		confWith : ['FS19_precisionFarming'],
		message  : {
			en : 'Some versions of Unit Convert Lite conflict with the Precision Farming DLC',
			pl : 'Niektóre wersje "Unit Convert Lite" powodują konflikt z "Precision Farming DLC".',
			de : 'Manche Versionen von Unit Convert Lite stehen in Konflikt mit dem Precision Farming DLC',
		},
	},
	'FS19_additionalFieldInfo' : {
		confWith : ['FS19_precisionFarming'],
		message  : {
			en : 'Versions of Additional Field Info prior to 1.0.2.3 conflict with the Precision Farming DLC',
			pl : '"Additional Field Info" do wersji 1.0.2.3 powoduje konflikt z "Precision Farming DLC".',
			de : 'Versionen von Additional Field Info vor 1.0.2.3 stehen in Konflikt mit dem Precision Farming DLC',
		},
	},
	'FS19_Variable_Spray_Usage' : {
		confWith : ['FS19_precisionFarming'],
		message  : {
			en : 'Variable Spray Usage conflicts with the Precision Farming DLC',
			pl : '"Spray Usage" powoduje konflikt z "Precision Farming DLC".',
			de : 'Variabler Düngerverbrauch steht in Konflikt mit dem Precision Farming DLC',
		},
	},
	'FS19_towBar' : {
		confWith : null,
		message  : {
			en : 'Old versions of the Tow Bar have been reported to be game breaking.',
			pl : '"Tow Bar" powoduje bardzo dużo konfliktów z innymi modami.',
			de : 'Alte Versionen der Abschleppstange haben bekannte Fehler, die FS19 unspielbar machen.',
		},
	},
	'FS19PlaceAnywhere' : {
		confWith : ['FS19_GlobalCompany'],
		message  : {
			en : 'The Place Anywhere mod can conflict with Global Company if both are loaded (and Global Company\'s extended placeables is used)',
			pl : '"Place Anywhere" z powodu braku aktualizacji nie jest zalecany oraz powoduje konflikt z "Global Company" (Global Company posiada tą samą funkcję w ustawieniach).',
			de : 'Wenn Überall Platzieren und Global Company (mit Global Companys "erweitertes Platzieren") gleichzeitig geladen werden, kann es Konflikte geben',
		},
	},
	'FS19_REA' : {
		confWith : null,
		message  : {
			en : 'The Added Realism For Vehicles mod can cause conflicts with improperly prepared vehicle mods. If has also been reported to not work with CoursePlay',
			pl : '"Added Realism For Vehicles" powoduje dużo problemów z niepoprawnie zedytowanymi pojazdami oraz powoduje problem z "Courseplay".',
			de : 'Der Mod "Added Realism For Vehicles" kann Konflikte mit unsauber vorbereiteten Fahrzeugen bewirken. Außerdem wird berichtet, dass der Mod nicht mit CoursePlay funktioniert',
		},
	},
	'FS19_realMud' : {
		confWith : null,
		message  : {
			en : 'The Real Mud mod can cause conflicts with improperly prepared vehicle mods.',
			pl : '"Real Mud" poduje problemy z niepoprawnie zedytowanymi pojazdami.',
			de : 'Der Mod "Echter Schlamm" kann Konflikte mit unsauber vorbereiteten Fahrzeugen bewirken.',
		},
	},
	'FS19_zzzSpeedControl' : {
		confWith : ['FS19_Courseplay'],
		message  : {
			en : 'Speed Control has been reported to not work with CoursePlay',
			pl : '"Speed Control" powoduje konflikt z "Courseplay".',
			de : 'Es wird berichtet, dass SpeedControl nicht mit CoursePlay funktioniert',
		},
	},
	'FS19_waitingWorkers' : {
		confWith : ['FS19_Courseplay'],
		message  : {
			en : 'Waiting workers has been reported to not work with CoursePlay',
			pl : '"Waiting workers" powoduje konflikt z "Courseplay".',
			de : 'Es wird berichtet, dass der Mod "Wartende Helfer" nicht mit CoursePlay funktioniert',
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
			pl : 'Jest bardzo dużo modów które nie działają poprawnie z "Courseplay", listę większości z nich znajdziesz w repozytorium Courseplay na GitHub.',
			de : 'Es gibt eine Reihe an Mods, die nicht mit CoursePlay funktionieren. Eine (unvollständige) Liste ist als angepinntes Issue im Github von CoursePlay zu finden.',
		},
	},
	'FS19_baler_addon' : {
		confWith : ['FS19_addon_strawHarvest'],
		message  : {
			en : 'Using the Baler Addon mod with the Straw Harvest addon can cause baler not be filled with netting/yarn and bales cannot be ejected',
			pl : '"Baler Addon" powoduje konflikt z "Straw Harvest Addon": Prasa może nie zostać napełniona siatką/sznurkiem oraz nie może zostać wyładowana z niej bela.',
			de : 'Das "Baler Addon" kann in Verbindung mit dem Strohberungs-DLC dafür sorgen, dass Pressen nicht mit Garn gefüllt werden und Ballen nicht ausgeworfen werden können',
		},
	},
	'FS19_RoundbalerExtension' : {
		confWith : ['FS19_addon_strawHarvest'],
		message  : {
			en : 'Versions of the Round Baler Extension below 1.5.0.0 will fail to work with the Straw Harvest Addon',
			pl : '"Round Baler Extension" do wersji 1.5.0.0 powoduje konflikt z "Straw Harvest Addon".',
			de : 'Die Versionen unter 1.5.0.0 der Rundballen-Erweiterung funktionieren nicht mit dem Strohbergungs-DLC',
		},
	},
	'FS19_VariableBaleCapacity' : {
		confWith : ['FS19_addon_strawHarvest'],
		message  : {
			en : 'When also using the Straw Harvest Addon, variable bales will not work correctly with the Premos Bale Shredder vehicle',
			pl : '"Variable Bale Capacity" powodują konflikt z "Straw Harvest Addon": Problem z Premos Bale Shredder.',
			de : 'Wenn das Strohberungs-DLC genutzt wird, funktioniert der Mod "variable Ballenkapazität" nicht mit dem Premos Ballenschredder',
		},
	},
	'FS19_GlobalCompanyPlaceable_sawmill' : {
		confWith : ['FS19_addon_strawHarvest'],
		message  : {
			en : 'The Global Company Sawmill pack will not work correctly with the Straw Harvest Addon',
			pl : '"Sawmill" (dodatek do Global Company) powoduje konflikt z "Straw Harvest Addon".',
			de : 'Das Global Company Sägewerk-Pack funktioniert nicht richtig mit dem Strohberungs-DLC',
		},
	},
	'FS19_SeeBales' : {
		confWith : ['FS19_addon_strawHarvest'],
		message  : {
			en : 'See Bales used with the Straw Harvest addon will cause pallets to fill to 0l and a game crash when selling pallets',
			pl : '"See Bales" powoduje konflikt z "Straw Harvest Addon": Palety mają wypełnienie na poziomie 0l i przy próbie sprzedaży zawiesza się gra.',
			de : 'Wenn der Mod "SeeBales" mit dem Strohbergungs-DLC verwendet wird, werden die Paletten mit 0l gefüllt und das Spiel stürzt beim Verkauf ab',
		},
	},
	'FS19_realDirtFix' : {
		confWith : ['FS19_addon_strawHarvest'],
		message  : {
			en : 'Real Dirt Fix will not work correctly with the Straw Harvest addon',
			pl : '"Real Dirt Fix" powoduje konflikt z "Straw Harvest Addon".',
			de : 'Real Dirt Fix funktioniert nicht korrekt mit dem Straw Ernte Addon',
		},
	},
	'FS19_MoreBunkersilo' : {
		confWith : ['FS19_addon_strawHarvest'],
		message  : {
			en : 'More Bunker Silo versions below 1.0.0.2 pallets cannot be sold when running the Straw Harvest addon',
			pl : '"More Bunker Silo" do wersji 1.0.0.2 powoduje konflikt z "Straw Harvest Addon": Nie można sprzedać palet.',
			de : 'Der Mod "More Bunkersilo" mit Versionen vor 1.0.0.2 sorgt in Kombination mit dem Strohbergungs-DLC dafür, dass Paletten nicht verkauft werden können',
		},
	},
	'FS19_BeetHarvest_Addon' : {
		confWith : ['FS19_addon_strawHarvest'],
		message  : {
			en : 'The beet harvest addon is incompatible with the Straw Harvest addon, they cannot be used together',
			pl : '"Beet Harvest Addon" powoduje konflikt z "Straw Harvest Addon".',
			de : 'Das "Addon Zuckerrübenernte" ist nicht kompatibel mit dem Strohbergungs-DLC. Sie können nicht gleichzeitig verwendet werden',
		},
	},
	'FS19_AutomaticUnloadForBaleWrapper' : {
		confWith : ['FS19_addon_strawHarvest'],
		message  : {
			en : 'Automatic Unload for Bale Wrappers does not work with the Straw Harvest addon',
			pl : '"Automatic Unload for Bale Wrappers" powoduje konflikt z "Straw Harvest Addon".',
			de : '"Automatic Unload for Bale Wrappers" funktioniert nicht mit dem Strohbergungs-DLC',
		},
	},
	'FS19_addon_strawHarvest' : {
		confWith : null,
		message  : {
			en : 'Straw harvest has a few notable mod non-specific incompatibilities :<br />1.) The palletizer will not work with autoloaded (autounloaded) trailers.<br />2.) Using Straw Harvest with Seasons and Maize Plus CCM will likely result in too many fill types and could convert snow to a pellet variety.<br />3.) Alfalfa, if on the map, cannot be baled.<br />4.) Strange behavior may result when using the Alpine DLC (fixed in version 1.2.1.0)<br />5.) If you mod folder is on OneDrive or Epic Games sync, you may be unable to sell pallets (or other odd behavior)',
			pl : 'Inne możliwe konflikty z "Straw Harvest Addon":<br/>1) Paletyzer nie działa z przyczepami z "autoload".<br/>2) Używanie tego modu wraz z Seasons i Maize Plus spowoduje przekroczenie ilości materiałów i może zmienić np. śnieg w pellet.<br/>3) Lucerna nie może być zbelowana (jeśli jest dodana do mapy).<br/>4) Dziwne problemy używając Alpine DLC (prawdopodobnie naprawione w wersji DLC 1.2.1.0).<br/>5) Jeśli masz włączony OneDrive lub synchronizację danych w Epic Games możesz mieć problem ze sprzedażą palet (lub też inne problemy).',
			de : 'Das Strohbergungs-DLC hat ein paar bemerkenswerte Inkompatibilitäten:<br />1.) Der Pallertierer funktioniert nicht mit AutoLoad-Anhängern.<br />2.) Die Verwendung des Strohbergungs-DLC mit Seasons und Maize Plus CCM sorgt vermutlich für zu viele fillTypes und könnte Schnee zu Paletten machen.<br />3.) Alfalfa kann nicht zu Ballen gepresst werden (sofern es in der Map verbaut ist).<br />4.) Seltsames Verhalten mit Alpine-DLC vor Version 1.2.1.0<br />5.) Wenn der Mod-Ordner auf einem OneDrive oder im EpicSync liegt, kann es vorkommen, dass man keine Paletten verkaufen kann (oder anderes seltsames Verhalten)',
		},
	},
	'FS19_RM_Seasons' : {
		confWith : null,
		message  : {
			en : 'Seasons has issues with the following :<br />1.) Do not load multiple map mods. Only load the map you are using!<br />2.) Any mod that manipulates the weather, [e.g. Multi overlay hud]<br />3.) Any mod that manipulates growth<br />4.) Any mod that changes animals<br />5.) Any "season manager" type mods<br />6.) Some animal cleaning mods may not work correctly, especially during the winter',
			pl : 'Możliwe konflikty z Seasons:<br/>1) Nie ładuj kilku map. Zostaw w modach tylko tą której używasz!<br/>2) Każdy mod ingerujący w pogodę (np. Multi overlay hud).<br/>3) Każdy mod ingerujący we wzrost upraw.<br/>4) Każdy mod ingerujący w zwierzęta.<br/>5) Każdy "menadżer sezonów".<br/>6) Niektóre mody do oczyszczania zwierząt, mogą nie działać prawidłowo (w szczególności podczas zimy).',
			de : 'Seasons hat Probleme mit dem Folgendem:<br />1.) Nicht mehrere Maps laden. Immer nur die Karte, die genutzt wird!<br />2.) Alle Mods, die das Wetter beeinflussen (z. B. Multi Overlay HUD)<br />3.) Alle Mods, die das Wachstum beeinflussen<br />4.) Alle Mods, die die Tierhaltung verändern<br />5.) Alle Mods in der Art von "Seasons Manager"<br />6.) Manche Stall-Reinigungs-Mods könnten nicht fehlerfrei funktionieren - vor allem im Winter',
		},
	},
	'FS19_realistic' : {
		confWith : null,
		message  : {
			en : 'Realistic Yield and Weight is incompatible with the Alpine DLC pack.  Wheels tend to glitch through the ground',
			pl : '"Realistic Yield and Weight" powoduje konflikt z "Alpine DLC": Koła dziwnie zachowują się na terenie.',
			de : 'Der Mod "Realistischer Ertrag und Ladungsgewichte" ist nicht kompatibel mit dem Apline-DLC. Räder tendieren dazu, durch den Boden zu sinken',
		},
	},
}