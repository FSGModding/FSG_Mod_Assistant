//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Test Runner CLI. May become a straight to log version.

// (c) 2021 JTSage.  MIT License.

const modReader = require('./fs-mod-parse/mod-reader');
const EventEmitter = require('events');

const gameFolder = "C:/Users/PC/Desktop/GitHub Projects/FS19_Mod_Checker/testFolder";
//const fileFolder = "C:/Users/PC/Desktop/GitHub Projects/FS19_Mod_Checker/testFolder/modtiny";
const fileFolder = "C:/Users/PC/Desktop/GitHub Projects/FS19_Mod_Checker/testFolder/mods";

class StatusEmitter extends EventEmitter {}
const statusEmitter = new StatusEmitter();

const translator = require('./translations/translate.js');
let myTranslator = new translator("de");


myTranslator.getLangList().then((data) => { 
	console.log("getlangs:", data);
} );

myTranslator.stringLookup("config_working_status").then((data) => {
	console.log(data);
});


var statFunc = (newStatus) => {
	statusEmitter.emit("updateStatus", newStatus);
	//console.log(newStatus);
}

statusEmitter.on('updateStatus', function(newPercentage) {
	console.log("new:", newPercentage);
});

//modList = new modReader(gameFolder, fileFolder, statFunc, "en");


//for (const [key, value] of Object.entries(modList.fullList)) {
//	console.log(`KEY: ${key} VAL: ${value.descDescription}`);
//}


// console.log(modList.search({
// 	columns : ["shortName"],
// 	usedGame : 10
// 	//terms : ["didTestingFail"],
// }));


console.log("end-program-file");