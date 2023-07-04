/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program - Savegame Mod Tracking

const path              = require('path')
const { ma_logger }     = require('../../lib/modUtilLib.js')
const { savegameTrack } = require('../../lib/modCheckLib.js')

const logger = new ma_logger('saveTest')
logger.forceNoConsole()

module.exports.test = (testLib) => {
	testBad(new testLib('Mod Tracker - Invalid Savegame'))
	testGood(new testLib('Mod Tracker - Valid Savegame'))
}

const testBad = (test) => {
	test.step('Loading Invalid Savegame')
	const saveGamePath = path.join(__dirname, 'modtrack', 'savegame2')

	try {
		const saveBack = new savegameTrack(saveGamePath, logger)
		const saveBackMods = saveBack.modList
		if ( saveBackMods.current.length === 0 ) {
			test.step('Empty object returned')
		} else {
			test.error('Return object not empty')
		}
	} catch (e) {
		test.error(`Something went wrong: ${e}`)
	} finally {
		test.end()
	}
}

const testGood = (test) => {
	test.step('Loading Invalid Savegame')
	const saveGamePath = path.join(__dirname, 'modtrack', 'savegame1')

	try {
		const saveBack = new savegameTrack(saveGamePath, logger)
		const saveBackMods = saveBack.modList

		if ( saveBackMods.current.length === 4 ) {
			test.step('Expected set of mods returned from current save')
		}

		for ( const thisBack of saveBackMods.byDate ) {
			switch ( thisBack.date ) {
				case '2021-03-01_01-00' :
					if ( thisBack.duplicate === true ) {
						test.step('Expected duplicate found in 2021-03-01')
					} else {
						test.error('Duplicate not found in 2021-03-01')
					}
					break
				case '2021-02-01_01-00' :
					if ( thisBack.onlyOriginal.length === 1 ) {
						test.step('Expected not present mod found in 2021-02-01')
					} else {
						test.error('Not present mod not detected in 2021-02-01')
					}
					break
				case '2021-01-01_01-00' :
					if ( thisBack.onlyBackup.length === 1 ) {
						test.step('Expected extra mod found in 2021-01-01')
					} else {
						test.error('Extra mod not detected in 2021-01-01')
					}
					break
				default :
					break
			}
		}
	} catch (e) {
		test.error(`Something went wrong: ${e}`)
	} finally {
		test.end()
	}
}

