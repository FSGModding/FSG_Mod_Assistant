/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program - Savegame Mod Tracking

const path              = require('path')
const { savegameTrack } = require('../../lib/modCheckLib.js')
const {testLib}         = require('../test.js')

module.exports.test = () => {
	return Promise.allSettled([
		testBad(new testLib('Mod Tracker - Invalid Savegame')),
		testGood(new testLib('Mod Tracker - Valid Savegame'))
	])
}

const testBad = (test) => {
	test.step('Loading Invalid Savegame')
	const saveGamePath = path.join(__dirname, 'modtrack', 'savegame2')

	return new savegameTrack(saveGamePath).getInfo().then((results) => {
		if ( results.current.length === 0 ) {
			test.step('Empty object returned')
		} else {
			test.error('Return object not empty')
		}
	}).catch((e) => {
		test.error(`Unexpected error :: ${e}`)
	}).finally(() => {
		test.end()
	})
}

const testGood = (test) => {
	test.step('Loading Valid Savegame')
	const saveGamePath = path.join(__dirname, 'modtrack', 'savegame1')

	return new savegameTrack(saveGamePath).getInfo().then((results) => {
		if ( results.current.length === 4 ) {
			test.step('Expected set of mods returned from current save')
		}

		for ( const thisBack of results.byDate ) {
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
						test.step('Expected "added since" mod found in 2021-02-01')
					} else {
						test.error('"added since" mod not detected in 2021-02-01')
					}
					break
				case '2021-01-01_01-00' :
					if ( thisBack.onlyBackup.length === 1 ) {
						test.step('Expected "removed since" found in 2021-01-01')
					} else {
						test.error('"removed since" not detected in 2021-01-01')
					}
					break
				default :
					break
			}
		}
	}).catch((e) => {
		test.error(`Unexpected error :: ${e}`)
	}).finally(() => {
		test.end()
	})
}

