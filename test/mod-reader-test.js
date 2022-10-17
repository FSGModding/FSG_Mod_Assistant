/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program

const path       = require('path')
const fs         = require('fs')
const testPath   = path.join(__dirname, 'testMods')

const { mcLogger }             = require('../lib/logger.js')
const { modFileChecker }       = require('../lib/single-mod-checker.js')

const logger = new mcLogger()

console.log('FSG Mod Assistant : Test Mod Reader')
console.log('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\n')

let exitCode = 0
let folderContents = []

try {
	folderContents = fs.readdirSync(testPath, {withFileTypes : true})
} catch (e) {
	console.log(`Couldn't open test folder :: ${e}`)
	exitCode = 1
	process.exit(exitCode)
}

folderContents.forEach((thisFile) => {
	console.log(`${thisFile.name} :: BEGIN`)
	try {
		const thisMod = new modFileChecker(
			path.join(testPath, thisFile.name),
			thisFile.isDirectory(),
			0,
			new Date(1970, 1, 1, 0, 0, 0, 0),
			logger,
			() => { return 'en'}
		)
		const badgeNames = Array.from(thisMod.badges.matchAll(/"mod_badge_(.+?)"/g), (m) => `${m[1]}`)
		console.log(`  Giants HASH : ${thisMod.giantsHash}`)
		console.log(`  Issues      : ${thisMod.issues.join(', ')}`)
		console.log(`  Badges      : ${badgeNames.join(', ')}`)
		console.log(`  Extra       : ${thisMod.fileDetail.extraFiles.join(', ')}`)
	} catch (e) {
		console.log(`  Unable to read ${thisFile} :: ${e}`)
		console.log(e.stack)
		exitCode = 1
	}
	console.log(`${thisFile.name} :: END\n`)
})

console.log('\n\nLogger:')
console.log(logger.toDisplayText)

console.log(`\n\nExiting with code ${exitCode}\n`)
process.exit(exitCode)
