//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Test Runner CLI. May become a straight to log version.

// (c) 2021 JTSage.  MIT License.

const modReader = require('./fs-mod-parse/mod-reader');

const gameFolder = "C:/Users/PC/Desktop/GitHub Projects/FS19_Mod_Checker/testFolder";
//const fileFolder = "C:/Users/PC/Desktop/GitHub Projects/FS19_Mod_Checker/testFolder/modtiny";
const fileFolder = "C:/Users/PC/Desktop/GitHub Projects/FS19_Mod_Checker/testFolder/mods";


modList = new modReader(gameFolder, fileFolder, "en");


//for (const [key, value] of Object.entries(modList.fullList)) {
//	console.log(`KEY: ${key} VAL: ${value.descDescription}`);
//}


console.log(modList.search({
	columns : ["shortName"],
	usedGame : 10
	//terms : ["didTestingFail"],
}));


console.log("end-program-file");