const modReader = require('./fs-mod-parse/mod-reader');

const gameFolder = "C:/Users/PC/Desktop/GitHub Projects/FS19_Mod_Checker/testFolder";
const fileFolder = "C:/Users/PC/Desktop/GitHub Projects/FS19_Mod_Checker/testFolder/modtiny";
//const fileFolder = "C:/Users/PC/Desktop/GitHub Projects/FS19_Mod_Checker/testFolder/mods";




modList = new modReader(gameFolder, fileFolder, "en");




//for (const [key, value] of Object.entries(modList.fullList)) {
//	console.log(`KEY: ${key} VAL: ${value.descDescription}`);
//}


//console.log("Missing :");
//console.log(modList.MissingList);

console.log(modList.search({
	columns : ["shortName"],
	usedGame : 10
	//terms : ["didTestingFail"],
}));
// console.log()

// console.log("Good :");
// console.log(modList.WorkingList);

console.log("end-program-file");