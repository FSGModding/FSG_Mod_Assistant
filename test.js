//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Test Runner CLI. May become a straight to log version.

// (c) 2021 JTSage.  MIT License.

const gameFolder = "C:/Users/PC/Desktop/GitHub Projects/FS19_Mod_Checker/testFolder"
//const fileFolder = "C:/Users/PC/Desktop/GitHub Projects/FS19_Mod_Checker/testFolder/modtiny"
const fileFolder = "C:/Users/PC/Desktop/GitHub Projects/FS19_Mod_Checker/testFolder/mods"

const modReader = require('./mod-checker')
const translator = require('./translate.js')
const myTranslator = new translator("de")



modList = new modReader(gameFolder, fileFolder, myTranslator.deferCurrentLocale)


modList.readAll().then((args) => {
	console.log("File Read Done, Testing Proceeding Async - Calling First Search")
	modList.search({
 		columns : ["shortName", "title", "mod_version"],
 		terms : ["didTestingPass"],
	}).then(searchResults => { console.log(searchResults) })
})

/* Race the parser!! We initialized in "de", changing to "en" to get the list from the search
above in english.  As long as this line is run before the search can return, we should see english
This is a deliberate race condition to make sure async is working. */
myTranslator.currentLocale = "en"

myTranslator.getLangList().then((data) => { 
	console.log("Languages List (async loading):", data)
})


console.log("End File Code. There may still be running async processes (should be)")