/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program
/* eslint no-console: off */

const { ma_logger }     = require('../lib/modUtilLib.js')
const { savegameTrack } = require('../lib/modCheckLib.js')

const logger = new ma_logger('saveTest')

console.log('FSG Mod Assistant : Test Save Tracker')
console.log('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\n')

let exitCode = 0

const saveGamePath = 'C:\\Users\\jtsag\\Documents\\My Games\\FarmingSimulator2022\\savegame3'

try {
	const saveBack = new savegameTrack(saveGamePath, logger)
	console.log(JSON.stringify(saveBack.modList, null, 2))
} catch (e) {
	exitCode = 1
	console.log(`Something went wrong: ${e}`)
}



console.log('\n\nLogger:')
console.log(logger.textLog)

console.log(`\n\nExiting with code ${exitCode}\n`)
process.exit(exitCode)
