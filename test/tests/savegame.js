/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program - Savegame Parser

const path                = require('path')
const { ma_logger }       = require('../../lib/modUtilLib.js')
const { saveFileChecker } = require('../../lib/modCheckLib.js')

const logger = new ma_logger('saveTest')
logger.forceNoConsole()

module.exports.test = (testLib) => {
	testBad(new testLib('Save Game Reader - Invalid File'))
	testZip(new testLib('Save Game Reader - Zip File'))
	testFolder(new testLib('Save Game Reader - Folder'))
}

const testBad = (test) => {
	const fullPath = path.join(__dirname, 'savegame', 'savegame1.zip')
	try {
		const saveCheck = new saveFileChecker(fullPath, false, logger)
		if ( saveCheck.mapMod === null ) {
			test.step('Expected empty result set received')
		} else {
			test.error('Got a non-empty result set')
		}
	} catch (e) {
		test.error(`Unexpected error: ${e}`)
	} finally {
		test.end()
	}
}

const testZip = (test) => {
	const fullPath = path.join(__dirname, 'savegame', 'savegame8.zip')
	try {
		const saveCheck = new saveFileChecker(fullPath, false, logger)

		if ( saveCheck.mapMod !== null ) {
			test.step('Got expected map name')
		} else {
			test.error('Got unexpected map name')
		}

		if ( Object.keys(saveCheck.farms).length === 6 ) {
			test.step('Got expected number of farms (6)')
		} else {
			test.error('Got unexpected number of farms')
		}

		if ( Object.keys(saveCheck.mods).length === 38 ) {
			test.step('Got expected number of mods (38)')
		} else {
			test.error('Got unexpected number of mods')
		}
	} catch (e) {
		test.error(`Unexpected error: ${e}`)
	} finally {
		test.end()
	}
}

const testFolder = (test) => {
	const fullPath = path.join(__dirname, 'savegame', 'savegame8')
	try {
		const saveCheck = new saveFileChecker(fullPath, true, logger)

		if ( saveCheck.mapMod !== null ) {
			test.step('Got expected map name')
		} else {
			test.error('Got unexpected map name')
		}

		if ( Object.keys(saveCheck.farms).length === 6 ) {
			test.step('Got expected number of farms (6)')
		} else {
			test.error('Got unexpected number of farms')
		}

		if ( Object.keys(saveCheck.mods).length === 38 ) {
			test.step('Got expected number of mods (38)')
		} else {
			test.error('Got unexpected number of mods')
		}
	} catch (e) {
		test.error(`Unexpected error: ${e}`)
	} finally {
		test.end()
	}
}