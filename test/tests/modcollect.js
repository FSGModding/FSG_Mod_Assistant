/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program - Savegame Mod Tracking

const path                  = require('path')
const { modFileCollection } = require('../../lib/modCheckLib_new.js')
const {testLib}             = require('../test.js')


module.exports.test = () => {
	return Promise.allSettled([
		testGood(new testLib('Mod Collection - Valid'))
	])
}


const testGood = (test) => {
	test.step('Loading Valid Collection')

	// const modPath    = path.join(__dirname, 'mods')
	const modPath    = 'C:\\Users\\jtsag\\Documents\\My Games\\FarmingSimulator2022\\mods\\fsg_realism'
	const modCollect = new modFileCollection( require('os').homedir, true )
	const folderID   = modCollect.getMD5FromFolder(modPath)

	modCollect.addCollection(modPath)

	modCollect.processMods().then(() => {
		if ( modCollect.collections.size === 1 ) {
			test.step('Found expected (1) collection')
		} else {
			test.error(`Found unexpected number of collections (${modCollect.collections.size})`)
		}
		const testSet = modCollect.getModCollection(folderID)

		if ( testSet.modSet.size === 12 ) {
			test.step('Found expected (12) mods')
		} else {
			test.error(`Found unexpected count of mods (${testSet.modSet.size})`)
		}

		const expectSize = 109445
		const actualSize = JSON.stringify(testSet).length
		if ( actualSize === expectSize ) {
			test.step(`Got expected ${expectSize} bytes of data`)
		} else {
			test.error(`Got unexpected ${actualSize} bytes of data, expected ${expectSize}`)
		}

		// console.dir(testSet, { depth : 3 })
	}).catch((e) => {
		test.error(`Unexpected error :: ${e}`)
	}).finally(() => {
		test.end()
	})
}

