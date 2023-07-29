/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program - Savegame Mod Tracking

const localCollections           = 'C:\\Users\\jtsag\\Documents\\My Games\\FarmingSimulator2022\\mods'
const useLocalCollections        = false // only valid for developer, causes test fail
const path                       = require('path')
const fs                         = require('fs')
const { modFileCollection }      = require('../../lib/modCheckLib.js')
const { testLib }                = require('../test.js')
const { maIPC, getDeferPromise } = require('../../lib/modUtilLib.js')
const { EventEmitter }           = require('events')


class queueEmitter extends EventEmitter {}
const queueDoneEmit = new queueEmitter()

const modCollect = new modFileCollection( require('os').homedir, queueDoneEmit, true )

maIPC.decodePath = path.join(__dirname, '..', '..', 'texconv.exe')

module.exports.test = () => {
	return Promise.allSettled([
		testGood(new testLib('Mod Collection - Valid'))
	])
}


const testGood = (test) => {
	test.step('Loading Valid Collection')

	const modPath    = path.join(__dirname, 'mods')

	if ( useLocalCollections ) {
		for ( const folder of fs.readdirSync(localCollections)) {
			modCollect.addCollection(path.join(localCollections, folder))
		}
	}

	const folderID   = modCollect.getMD5FromFolder(modPath)
	const defer      = getDeferPromise()

	queueDoneEmit.on('process-mods-done', () => { defer.resolve_ex() })

	maIPC.IPCEmit    = queueDoneEmit

	modCollect.addCollection(modPath)
	modCollect.processMods()

	return defer.then(() => {
		if ( modCollect.collections.size === 1 && !useLocalCollections ) {
			test.step('Found expected (1) collection')
		} else if ( useLocalCollections ) {
			test.step(`Local collections loaded (${modCollect.collections.size})`)
		} else {
			test.error(`Found unexpected number of collections (${modCollect.collections.size})`)
		}
		const testSet = modCollect.getModCollection(folderID)

		if ( testSet.modSet.size === 12 ) {
			test.step('Found expected (12) mods in test collection')
		} else {
			test.error(`Found unexpected count of mods (${testSet.modSet.size})`)
		}

		const expectMinData = 60000
		const expectMaxData = 75000
		const actualSize = JSON.stringify(testSet).length
		if ( expectMinData < actualSize && actualSize < expectMaxData ) {
			test.step(`Got expected ${actualSize} bytes of data, within range`)
		} else {
			test.error(`Got unexpected ${actualSize} bytes of data, outside range`)
		}

		// console.dir(testSet, { depth : 3 })
	}).catch((e) => {
		test.error(`Unexpected error :: ${e}`)
	}).finally(() => {
		test.end()
	})
}

