/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program - Mod Internals Looker

const path                         = require('path')
const os                           = require('os')
const { modLooker, requiredItems } = require('../../lib/workerThreadLib')
const { ddsDecoder }               = require('../../lib/modUtilLib.js')

requiredItems.currentLocale = 'en'
requiredItems.iconDecoder   = new ddsDecoder(path.join(__dirname, '..', '..', 'texconv.exe'), os.tmpdir())

const {testLib}     = require('../test.js')

module.exports.test = async () => {
	return Promise.all([
		testGood(new testLib('Mod Looker - Good File')),
		testBad(new testLib('Mod Looker - Missing File'))
	])
}

const isWin = process.platform === 'win32'


const testGood = (test) => {
	const searchPath = path.join(__dirname, 'mods')
	return new modLooker(
		{
			fileDetail : {
				fullPath  : path.join(searchPath, 'TestMod_TotallyValidZIP.zip'),
				imageDDS  : [],
				isFolder  : false,
				shortName : 'TestMod_TotallyValidZIP',
			},
		},
		searchPath,
		!isWin
	).getInfo().then((result) => {
		for ( const logLine of result.log.items ) {
			test.step_log(`Log :: ${logLine[0].padEnd(7)} -> ${logLine[1]}`)
		}
		if ( Object.keys(result.record.items).length === 21 ) {
			test.step('Got expected number of store items (21)')
		} else {
			test.error(`Got unexpected number of store items ${Object.keys(result.record.items).length}`)
		}

		if ( isWin ) {
			if ( Object.keys(result.record.icons).length === 21 ) {
				test.step('Got expected number of icons (21)')
			} else {
				test.error(`Got unexpected number of icons ${Object.keys(result.record.icons).length}`)
			}
		}

		if ( Object.keys(result.record.brands).length === 1 ) {
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
	return new modLooker(
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
	).getInfo().then((result) => {
		for ( const logLine of result.log.items ) {
			test.step_log(`Log :: ${logLine[0].padEnd(7)} -> ${logLine[1]}`)
		}
		if ( result.record === null ) {
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
