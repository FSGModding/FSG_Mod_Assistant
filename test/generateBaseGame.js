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
const { baseLooker, getParser }     = require('./generateBaseGame_lib.js')

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

const baseData = {
	brandMap        : {},
	brandMap_icon   : {},
	brands          : [],
	byBrand_vehicle : {},
	byCat_placeable : {},
	byCat_vehicle   : {},
	category        : {},
	catMap_place    : {},
	catMap_vehicle  : {},
	joints_has      : {},
	joints_list     : [],
	joints_needs    : {},
	joints_set      : new Set(),
	records         : {},
	topLevel        : [
		{ class : 'cat-brand',       page : 'brand',       name : 'basegame_brand'},
		{ class : 'cat-vehicle',     page : 'vehicle',     name : 'basegame_vehicle'},
		{ class : 'cat-tool',        page : 'tool',        name : 'basegame_tool'},
		{ class : 'cat-object',      page : 'object',      name : 'basegame_object'},
		{ class : 'cat-placeable',   page : 'placeable',   name : 'basegame_placeable'},
		{ class : 'cat-attach-has',  page : 'attach_has',  name : 'basegame_attach_has'},
		{ class : 'cat-attach-need', page : 'attach_need', name : 'basegame_attach_need'},
		{ class : 'look-fillunit',   page : 'fills',       name : 'basegame_fills'},
	],
}

const handleResults = (results, fileDetails) => {
	if ( results.record === null ) { return }

	const thisName = results.shortname

	if ( results.record.masterType === 'vehicle' ) {
		baseData.byBrand_vehicle[results.record.brand] ??= []
		baseData.byBrand_vehicle[results.record.brand].push(thisName)

		baseData.byCat_vehicle[results.record.category] ??= []
		baseData.byCat_vehicle[results.record.category].push(thisName)

		for ( const thisJoint of results.record.joints.canUse ) {
			baseData.joints_set.add(thisJoint)
			baseData.joints_has[thisJoint] ??= []
			baseData.joints_has[thisJoint].push(thisName)
		}

		for ( const thisJoint of results.record.joints.needs ) {
			baseData.joints_set.add(thisJoint)
			baseData.joints_needs[thisJoint] ??= []
			baseData.joints_needs[thisJoint].push(thisName)
		}
	} else {
		baseData.byCat_placeable[results.record.category] ??= []
		baseData.byCat_placeable[results.record.category].push(thisName)
	}

	baseData.records[thisName] = results.record

	baseData.records[thisName].dlcKey   = fileDetails[2]
	baseData.records[thisName].isBase   = (fileDetails[2] === null)
	baseData.records[thisName].diskPath = (fileDetails[2] !== null) ? null : path.relative(fileDetails[1], fileDetails[0]).split(path.sep)

	/* eslint-disable no-console */
	if ( results.log.items.length !== 0 ) {
		console.log(c.redBright(`🗙 FAILED: ${c.red(thisName)} had errors`))
		console.log(results.log.items)
	} else {
		console.log(c.greenBright(`✓ ADDED: ${c.green(thisName)}`))
	}
	/* eslint-enable no-console */
}


const thisXMLParser = getParser()

const storeCats = thisXMLParser.parse(fs.readFileSync(path.join(__dirname, 'bgBuilder', 'storeCategories.xml')))

const ignoreCats = new Set(['sales', 'objectanimal', 'objectmisc'])

for ( const thisCat of storeCats.categories.category ) {
	const thisType = thisCat.$.TYPE.toLowerCase()
	const iconName = thisCat.$.NAME.toLowerCase()
	const title    = thisCat.$.TITLE

	if ( ignoreCats.has(iconName) ) { continue }

	baseData.category[thisType] ??= []
	baseData.category[thisType].push({
		iconName : iconName,
		title    : title,
	})
	baseData[ thisType === 'placeable' ? 'catMap_place' : 'catMap_vehicle'][iconName] = title
}

const brandFiles = [
	path.join(__dirname, 'bgBuilder', 'brands.xml'),
	...globSync('*.xml', { cwd : path.join(path.join(__dirname, 'bgBuilder', 'dlc')), stat : true, withFileTypes : true }).map((x) => x.fullpath())
]

for ( const thisBrandFile of brandFiles ) {
	const brandContents = thisXMLParser.parse(fs.readFileSync(thisBrandFile))
	const theseBrands   = brandContents?.brands?.brand || brandContents?.moddesc?.brands?.brand || []

	for ( const thisBrand of theseBrands ) {
		const thisName = thisBrand.$.NAME.toLowerCase()
		const thisTitle = thisBrand.$.TITLE
		const thisImage = path.parse(thisBrand.$.IMAGE).name.toLowerCase()

		baseData.brands.push({
			image : thisImage,
			name  : thisName,
			title : thisTitle,
		})

		baseData.brandMap[thisName] = thisTitle
		baseData.brandMap_icon[thisName] = thisImage
	}
}

const fullFileList = []

for ( const thisPath of filePaths ) {
	const theseFiles = globSync('**/*.xml', { cwd : thisPath, follow : true, mark : true, stat : true, withFileTypes : true })
	for ( const thisFile of theseFiles ) {
		fullFileList.push([thisFile.fullpath(), dataPath, null])
	}
}

for ( const packKey in dlcPaths ) {
	for ( const thisPath of dlcPaths[packKey] ) {
		const theseFiles = globSync('**/*.xml', { cwd : thisPath, follow : true, mark : true, stat : true, withFileTypes : true })
		for ( const thisFile of theseFiles ) {
			fullFileList.push([thisFile.fullpath(), path.join(dlcBasePath, packKey), packKey])
		}
	}
}

const doWork = async () => {
	/* eslint-disable no-await-in-loop */
	for ( const thisFile of fullFileList ) {
		const results = await new baseLooker(thisFile[0], thisFile[1]).getInfo()
		try {
			handleResults(results, thisFile)
		} catch (err) {
			/* eslint-disable no-console */
			console.log(err)
			console.log(results)
		}
	}
	/* eslint-enable no-await-in-loop */
	
	baseData.joints_list = [...baseData.joints_set]
	baseData.brands.sort((a, b) => Intl.Collator().compare(a.title, b.title))
	
	fs.writeFileSync(
		path.join(__dirname, '..', 'renderer', 'renderJS', 'baseGameData.js'),
		`/* eslint-disable indent, key-spacing, quotes, comma-dangle, sort-keys */\n/* cSpell:disable */\nconst client_BGData = ${JSON.stringify(baseData, null, 2)}`
	)
}

doWork().then(() => { console.log('done.') })




