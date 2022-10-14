/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program

const path       = require('path')
const fs         = require('fs')

const { mcLogger }             = require('../lib/logger.js')
const { saveFileChecker }       = require('../lib/savegame-parser.js')

const logger = new mcLogger()

console.log('FSG Mod Assistant : Test Save Reader')
console.log('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\n')

let exitCode = 0

const folderSave = path.join(__dirname, 'saves', 'savegame8')
const zipSave    = path.join(__dirname, 'saves', 'savegame8.zip')

if ( !fs.existsSync(folderSave) || !fs.existsSync(zipSave) ) {
	console.log('Couldn\'t open test saves!')
	process.exit(1)
}

try {
	const zipSaveCheck = new saveFileChecker(zipSave, false, logger)
	console.dir(zipSaveCheck, {depth : 0})
} catch (e) {
	exitCode = 1
	console.log(`Something went wrong with the zip: ${e}`)
}

try {
	const folderSaveCheck = new saveFileChecker(folderSave, true, logger)
	console.dir(folderSaveCheck, {depth : 0})
} catch (e) {
	exitCode = 1
	console.log(`Something went wrong with the folder: ${e}`)
}


console.log('\n\nLogger:')
console.log(logger.toDisplayText)

console.log(`\n\nExiting with code ${exitCode}\n`)
process.exit(exitCode)
