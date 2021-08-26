//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Simple script for live testing in development environments

// (c) 2021 JTSage.  MIT License.
const path      = require('path')

const gameFolder = path.join(__dirname, '..', '..', 'testFolder')
const fileFolder = path.join(gameFolder, 'mods')

const { modReader, mcLogger }  = require('../lib/mod-checker.js')
const translator   = require('../lib/translate.js')
const myTranslator = new translator.translator(translator.getSystemLocale())

const logger  = new mcLogger()
const modList = new modReader(gameFolder, fileFolder, logger, myTranslator.deferCurrentLocale)


modList.readAll().then(() => {
	writeLn('File Read Done, Testing Proceeding Async - Calling First Search, will return when testing is complete.')

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
			'howIsModBroken',
			// 'fullPath',
		],
		//usedGame : -1,
		allTerms : true,
		terms    : ['isModBroken'],
		debug    : true,
	}).then((searchResults) => {
		writeLn('test.js results:', searchResults)
		//writeLn(modList.log.toDisplayText)
	})
})

async function _promiseStatus() {
	/* This is *spiffy* - it looks at the status of the testing promises, with a quick delay.
	Assuming everything is working correctly, you should see them resolve in parallel. */
	/* eslint-disable no-promise-executor-return */
	writeLn(modList.testPromise)
	await new Promise((resolve) => setTimeout(resolve, 150))
	writeLn(modList.testPromise)
	await new Promise((resolve) => setTimeout(resolve, 150))
	writeLn(modList.testPromise)
	await new Promise((resolve) => setTimeout(resolve, 150))
	writeLn(modList.testPromise)
	await new Promise((resolve) => setTimeout(resolve, 150))
	writeLn(modList.testPromise)
	await new Promise((resolve) => setTimeout(resolve, 150))
	writeLn(modList.testPromise)
	/* eslint-enable no-promise-executor-return */
}
//_promiseStatus().then(() => { writeLn('blag')})

/* Race the parser!! We initialized in "de", changing to "en" to get the list from the search
above in english.  As long as this line is run before the search can return, we should see english
This is a deliberate race condition to make sure async is working. */
myTranslator.currentLocale = 'en'

myTranslator.getLangList().then((data) => {
	writeLn('Languages List (async loading - likely returning before file load is done):', data)
})


writeLn('End File Code. There may (should!) still be running async processes')

function writeLn(text) { process.stdout.write(`${text}\n`) }