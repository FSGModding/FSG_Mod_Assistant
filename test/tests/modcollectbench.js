/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program - Mod Collection Benchmarking - Only valid for original dev unless paths are altered

const localCollections           = 'C:\\Users\\jtsag\\Documents\\My Games\\FarmingSimulator2022\\mods'
const useLocalCollections        = true // only valid for developer, causes test fail

const path                       = require('node:path')
const fs                         = require('node:fs')
const { EventEmitter }           = require('node:events')
const { modFileCollection }      = require('../../lib/modCheckLib.js')
const { testLib }                = require('../test.js')
const { serveIPC, getDeferPromise } = require('../../lib/modUtilLib.js')

class queueEmitter extends EventEmitter {}
const queueDoneEmit = new queueEmitter()

serveIPC.loadWindow = { current : () => { process.stdout.write('.') } }

const modCollect = new modFileCollection( require('node:os').homedir, queueDoneEmit )

module.exports.test = () => {
	return Promise.allSettled([
		testGood(new testLib('Mod Collection - Valid'))
	])
}


const testGood = (test) => {
	test.step('Loading Valid Collection')

	const startTime = Date.now()

	const modPath    = path.join(__dirname, 'mods')

	if ( useLocalCollections ) {
		for ( const folder of fs.readdirSync(localCollections)) {
			modCollect.addCollection(path.join(localCollections, folder))
		}
	}

	const folderID   = modCollect.getMD5FromFolder(modPath)
	const defer      = getDeferPromise()

	queueDoneEmit.on('process-mods-done', () => { process.stdout.write('!\n'); defer.resolve_ex() })

	serveIPC.IPCEmit    = queueDoneEmit

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

		if ( testSet.modSet.size === 13 ) {
			test.step('Found expected (13) mods in test collection')
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

		test.step(`Total Mods Processed : ${modCollect.totalModCount}`)
		test.step(`Collection Process took ${Date.now() - startTime}ms`)

		// console.dir(testSet, { depth : 3 })
	}).catch((err) => {
		test.error(`Unexpected error :: ${err}`)
	}).finally(() => {
		test.end()
	})
}

