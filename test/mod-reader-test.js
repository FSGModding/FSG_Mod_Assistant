/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program

const path       = require('path')
const fs         = require('fs')
const os         = require('os')
const testPath   = path.join(__dirname, 'testMods')

const { ma_logger }         = require('../lib/ma-logger.js')
const { modFileCollection } = require('../lib/modCheckLib.js')



console.log('FSG Mod Assistant : Test Mod Reader')
console.log('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\n')

let exitCode = 0

const logger     = new ma_logger('multi-test')
const modCollect = new modFileCollection(
	logger,
	{ get : () => { return '' }, store : {} },
	{ store : {} },
	os.homedir(),
	{
		hide  : () => { return },
		count : () => { return },
	},
	() => { return 'en'},
	true
)

try {
	fs.readdirSync(testPath, {withFileTypes : true})
} catch (e) {
	console.log(`Couldn't open test folder :: ${e}`)
	exitCode = 1
	process.exit(exitCode)
}

console.log('-=-=-=-=-=-=-=-=-=-=-=-=-')
console.log('TEST COLLECTION :: BEGIN')
console.log('-=-=-=-=-=-=-=-=-=-=-=-=-')

const thisCollectionStats = modCollect.addCollection(testPath)

console.log(`  File Count: ${thisCollectionStats.fileCount}\n`)

modCollect.processMods()

modCollect.processPromise.then(() => {
	console.log('\n-=-=-=-=-=-=-=-=-=-=-=-=-')
	console.log('TEST COLLECTION :: FINISHED')
	console.log('-=-=-=-=-=-=-=-=-=-=-=-=-\n')
	modCollect.collections.forEach((collectKey) => {
		modCollect.getModListFromCollection(collectKey).forEach((thisMod) => {
			console.log(`Short Name : ${thisMod.fileDetail.shortName}`)
			console.log(`  Issues      : ${thisMod.issues.join(', ')}`)
			console.log(`  Badges      : ${thisMod.badgeArray.join(', ')}`)
			console.log(`  Extra       : ${thisMod.fileDetail.extraFiles.join(', ')}`)
		})
	})
	console.log(`\n\nExiting with code ${exitCode}\n`)
})