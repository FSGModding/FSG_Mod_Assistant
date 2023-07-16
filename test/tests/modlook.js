/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program - Mod Internals Looker

const { modLooker } = require('../../lib/modCheckLib.js')
const path          = require('path')
const {testLib}     = require('../test.js')

module.exports.test = async () => {
	return Promise.all([
		testGood(new testLib('Mod Looker - Good File')),
		testBad(new testLib('Mod Looker - Missing File'))
	])
}


const testGood = (test) => {
	const searchPath = path.join(__dirname, 'mods')
	const looker    = new modLooker(
		{
			fileDetail : {
				fullPath  : path.join(searchPath, 'TestMod_TotallyValidZIP.zip'),
				imageDDS  : [],
				isFolder  : false,
				shortName : 'TestMod_TotallyValidZIP',
			},
		},
		searchPath,
		true
	)

	return looker.getInfo().then((result) => {
		if ( Object.keys(result.items).length === 21 ) {
			test.step('Got expected number of store items (21)')
		} else {
			test.error(`Got unexpected number of store items ${Object.keys(result.items).length}`)
		}

		if ( Object.keys(result.brands).length === 1 ) {
			test.step('Got expected number of new brands (1)')
		} else {
			test.error('Got unexpected number of new brands')
		}
	}).catch((e) => {
		test.error(`Unexpected error :: ${e}`)
	}).finally(() => {
		test.end()
	})
}

const testBad = (test) => {
	const searchPath = path.join(__dirname, 'mods')
	const looker    = new modLooker(
		{
			fileDetail : {
				fullPath  : path.join(searchPath, 'TestMod_NonExistentFile.zip'),
				imageDDS  : [],
				isFolder  : false,
				shortName : 'TestMod_NonExistentFile',
			},
		},
		searchPath,
		true
	)

	return looker.getInfo().then((result) => {
		if ( result === null ) {
			test.step('Got expected null object')
		} else {
			test.error('Return object was not null')
		}
	}).catch((e) => {
		test.error(`Unexpected error :: ${e}`)
	}).finally(() => {
		test.end()
	})
}
