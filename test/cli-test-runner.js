//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Test Runner CLI. (old version, but this will become the CLI version soon)

// (c) 2021 JTSage.  MIT License.
const _homedir  = require('os').homedir()
const path      = require('path')

//const gameFolder = path.join(_homedir, 'Documents' , 'My Games', 'FarmingSimulator2019' )
const gameFolder = path.join(__dirname, '..', '..', 'testFolder')
const fileFolder = path.join(gameFolder, 'mods')

const modReader    = require('../lib/mod-checker.js')
const translator   = require('../lib/translate.js')
const myTranslator = new translator.translator(translator.getSystemLocale())

const modList = new modReader(gameFolder, fileFolder, myTranslator.deferCurrentLocale)


modList.readAll().then(() => {
	console.log('File Read Done, Testing Proceeding Async - Calling First Search, will return when testing is complete.')

	modList.search({
		columns : [
			'shortName',
			//'isActive',
			//'isUsed',
			'isFolder',
			'didTestingPassEnough',
			// 'title',
			// 'mod_version',
			//'fileSizeMap',
			//'activeGames',
			//'usedGames',
			'iconFileName',
			// 'fullPath',
		],
		//usedGame : -1,
		allTerms : true,
		terms    : ['didTestingPassEnough', 'isFile'],
		debug    : true,
	}).then((searchResults) => {
		console.log('test.js results:', searchResults)
		//console.log(modList.log.toDisplayText)
	})
})

async function _promiseStatus() {
	/* This is *spiffy* - it looks at the status of the testing promises, with a quick delay.
	Assuming everything is working correctly, you should see them resolve in parallel. */
	/* eslint-disable no-promise-executor-return */
	console.log(modList.testPromise)
	await new Promise((resolve) => setTimeout(resolve, 150))
	console.log(modList.testPromise)
	await new Promise((resolve) => setTimeout(resolve, 150))
	console.log(modList.testPromise)
	await new Promise((resolve) => setTimeout(resolve, 150))
	console.log(modList.testPromise)
	await new Promise((resolve) => setTimeout(resolve, 150))
	console.log(modList.testPromise)
	await new Promise((resolve) => setTimeout(resolve, 150))
	console.log(modList.testPromise)
	/* eslint-enable no-promise-executor-return */
}
//_promiseStatus().then(() => { console.log('blag')})

/* Race the parser!! We initialized in "de", changing to "en" to get the list from the search
above in english.  As long as this line is run before the search can return, we should see english
This is a deliberate race condition to make sure async is working. */
myTranslator.currentLocale = 'en'

myTranslator.getLangList().then((data) => {
	console.log('Languages List (async loading - likely returning before file load is done):', data)
})


console.log('End File Code. There may (should!) still be running async processes')