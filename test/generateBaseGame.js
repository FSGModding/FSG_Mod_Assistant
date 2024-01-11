/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Base Game data generator

/* cSpell:disable */

const path          = require('node:path')
const os            = require('node:os')
const fs            = require('node:fs')
const { globSync }  = require('glob')
const c             = require('ansi-colors')

const { requiredItems, ddsDecoder } = require('../lib/workerThreadLib.js')
const { baseLooker }                = require('./generateBaseGame_lib.js')

requiredItems.currentLocale = 'en'
requiredItems.l10n_hp       = 'HP'
requiredItems.iconDecoder   = new ddsDecoder(path.join(__dirname, '..', 'texconv.exe'), os.tmpdir())

const dataPath    = 'C:\\Program Files (x86)\\Farming Simulator 2022\\data'
const dlcBasePath = 'C:\\Users\\jtsag\\Desktop\\ModEdit\\_openedDLC'

const filePaths = [
	path.join(dataPath, 'vehicles'),
	path.join(dataPath, 'placeables'),
	path.join(dataPath, 'objects')
]

const dlcPaths = {
	'agiPack' : [
		path.join(dlcBasePath, 'agiPath', 'vehicles'),
		path.join(dlcBasePath, 'agiPath', 'placeables'),
		path.join(dlcBasePath, 'agiPath', 'objects')
	],
	'antonioCarraroPack' : [
		path.join(dlcBasePath, 'antonioCarraroPack', 'vehicles'),
	],
	'claasSaddleTracPack' : [
		path.join(dlcBasePath, 'claasSaddleTracPack', 'vehicles'),
	],
	'eroPack' : [
		path.join(dlcBasePath, 'eroPack', 'vehicles'),
	],
	'forestry' : [
		path.join(dlcBasePath, 'forestry', 'vehicles'),
		path.join(dlcBasePath, 'forestry', 'placeables'),
		path.join(dlcBasePath, 'forestry', 'objects')
	],
	'goeweilPack' : [
		path.join(dlcBasePath, 'goeweilPack', 'vehicles'),
	],
	'hayAndForagePack' : [
		path.join(dlcBasePath, 'hayAndForagePack', 'vehicles'),
	],
	'kubotaPack' : [
		path.join(dlcBasePath, 'kubotaPack', 'vehicles'),
	],
	// 'vermeerPack' : [
	// 	path.join(dlcBasePath, 'vermeerPack', 'vehicles'),
	// ],
}

const exportData = {
	byBrand_vehicle   : {},
	byCat_placeable   : {},
	byCat_vehicle     : {},
	records           : {},
}

const handleResults = (results) => {
	if ( results.record === null ) { return }

	const thisName = results.shortname

	if ( results.record.masterType === 'vehicle' ) {
		exportData.byBrand_vehicle[results.record.brand] ??= []
		exportData.byBrand_vehicle[results.record.brand].push(thisName)

		exportData.byCat_vehicle[results.record.category] ??= []
		exportData.byCat_vehicle[results.record.category].push(thisName)
	} else {
		exportData.byCat_placeable[results.record.category] ??= []
		exportData.byCat_placeable[results.record.category].push(thisName)
	}

	exportData.records[thisName] = results.record

	/* eslint-disable no-console */
	if ( results.log.items.length !== 0 ) {
		console.log(c.redBright(`🗙 FAILED: ${c.red(thisName)} had errors`))
		console.log(results.log.items)
	} else {
		console.log(c.greenBright(`✓ ADDED: ${c.green(thisName)}`))
	}
	/* eslint-enable no-console */
}

const fullFileList = []

for ( const thisPath of filePaths ) {
	const theseFiles = globSync('**/*.xml', { cwd : thisPath, follow : true, mark : true, stat : true, withFileTypes : true })
	for ( const thisFile of theseFiles ) {
		fullFileList.push([thisFile.fullpath(), dataPath])
	}
}

for ( const packKey in dlcPaths ) {
	for ( const thisPath of dlcPaths[packKey] ) {
		const theseFiles = globSync('**/*.xml', { cwd : thisPath, follow : true, mark : true, stat : true, withFileTypes : true })
		for ( const thisFile of theseFiles ) {
			fullFileList.push([thisFile.fullpath(), path.join(dlcBasePath, packKey)])
		}
	}
}

const doWork = async () => {
	/* eslint-disable no-await-in-loop */
	for ( const thisFile of fullFileList ) {
		const results = await new baseLooker(thisFile[0], thisFile[1]).getInfo()
		try {
			handleResults(results)
		} catch (err) {
			/* eslint-disable no-console */
			console.log(err)
			console.log(results)
		}
	}
	/* eslint-enable no-await-in-loop */
	
	fs.writeFileSync(
		path.join(__dirname, '..', 'renderer', 'renderJS', 'baseGameData.js'),
		`/* eslint-disable indent, key-spacing, quotes, comma-dangle, sort-keys */\n/* cSpell:disable */\nconst client_baseGameData = ${JSON.stringify(exportData, null, 2)}`
	)
}

doWork().then(() => { console.log('done.') })




