/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Base Game data generator
// HUGE NOTE: this doesn't work out-of-the-box, it'll run out of memory.

/* cSpell:disable */
const path          = require('node:path')
const fs            = require('node:fs')
const { globSync }  = require('glob')
const c             = require('ansi-colors')

const { getParser }     = require('./generateBaseGame_lib.js')

const dataPath    = 'C:\\Users\\jtsag\\Desktop\\ModEdit\\_basegame19'
const dlcBasePath = 'C:\\Users\\jtsag\\Desktop\\ModEdit\\_openedDLC19'

const filePaths = [
	path.join(dataPath, 'vehicles'),
	path.join(dataPath, 'placeables'),
	path.join(dataPath, 'objects')
]

const dlcPaths = {
	'alpine' : [
		path.join(dlcBasePath, 'alpine', 'vehicles'),
		path.join(dlcBasePath, 'alpine', 'objects')
	],
	'anderson' : [
		path.join(dlcBasePath, 'anderson', 'vehicles'),
		path.join(dlcBasePath, 'anderson', 'objects')
	],
	'bourgault' : [
		path.join(dlcBasePath, 'bourgault', 'vehicles'),
	],
	'claas' : [
		path.join(dlcBasePath, 'claas', 'vehicles'),
	],
	'grimme' : [
		path.join(dlcBasePath, 'grimme', 'vehicles'),
	],
	'johnDeereCotton' : [
		path.join(dlcBasePath, 'johnDeereCotton', 'vehicles'),
		path.join(dlcBasePath, 'johnDeereCotton', 'objects'),
	],
	'kveneland' : [
		path.join(dlcBasePath, 'kveneland', 'vehicles'),
		path.join(dlcBasePath, 'kveneland', 'objects'),
	],
	'rottne' : [
		path.join(dlcBasePath, 'rottene', 'vehicles'),
	],
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
	iconMap         : {},
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
	
	if ( typeof results.record.iconOriginalName === 'string' && results.record.iconOriginalName.startsWith('$data') ) {
		baseData.iconMap[results.record.iconOriginalName.toLowerCase()] = thisName
	}

	baseData.records[thisName] = results.record

	baseData.records[thisName].dlcKey   = fileDetails[2]
	baseData.records[thisName].isBase   = (fileDetails[2] === null)
	baseData.records[thisName].diskPath = (fileDetails[2] !== null) ? null : path.relative(fileDetails[1], fileDetails[0]).split(path.sep)

	/* eslint-disable no-console */
	const mem  = Math.round(process.memoryUsage().rss / (1024 * 1024))
	if ( results.log.items.length !== 0 ) {
		console.log(c.redBright(`🗙 FAILED: ${c.red(thisName)} had errors ${mem}`))
		console.log(results.log.items)
	} else {
		console.log(c.greenBright(`✓ ADDED: ${c.green(thisName)} ${mem}`))
	}
	/* eslint-enable no-console */
}

const threadList = new Set()

const thisXMLParser = getParser()

const storeCats = thisXMLParser.parse(fs.readFileSync(path.join(__dirname, 'bgBuilder', '19', 'storeCategories.xml')))

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
	path.join(__dirname, 'bgBuilder', '19', 'brands.xml'),
	...globSync('*.xml', { cwd : path.join(path.join(__dirname, 'bgBuilder', '19', 'dlc')), stat : true, withFileTypes : true }).map((x) => x.fullpath())
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



const doWork = () => {
	const threadPromises = []

	const threadCount = Math.ceil(fullFileList.length / 200)
	// eslint-disable-next-line no-console
	console.log(c.greenBright(`Spawning ${threadCount - 1} threads for ${fullFileList.length} files`))
	

	for ( let i = 0; i <= threadCount - 1; i++ ) {
		const thisPromise = Promise.withResolvers()
		threadPromises.push(thisPromise.promise)
		openLookThread(i+1, thisPromise, fullFileList.slice(i * 200, (i+1) * 200))
	}

	Promise.allSettled(threadPromises).then(() => {
		baseData.joints_list = [...baseData.joints_set]
		baseData.brands.sort((a, b) => Intl.Collator().compare(a.title, b.title))
		
		fs.writeFileSync(
			path.join(__dirname, 'baseGameData.js'),
			`/* eslint-disable indent, key-spacing, quotes, comma-dangle, sort-keys */\n/* cSpell:disable */\nconst client_BGData = ${JSON.stringify(baseData, null, 2)}`
		)
		// eslint-disable-next-line no-console
		console.log(c.greenBright('all done!'), threadPromises)
	})
}

doWork()


function openLookThread(threadID = 1, thisPromise, workPacket) {
	threadList.add(threadID)
	const lookThread = require('node:child_process').fork(path.join(__dirname, 'generateBaseGame_queue.js'), [
		threadID,
		() => {return 'en'},
		'hp',
	])
	lookThread.on('message', (m) => {
		if ( Object.hasOwn(m, 'type') ) {
			switch (m.type) {
				case 'log' :
					// eslint-disable-next-line no-console
					console.log(`worker-thread-${m.pid}`, m.data.join(' '))
					break
				case 'modLook' : {
					for ( const logLine of m.logLines.items ) {
						// eslint-disable-next-line no-console
						console.log(m.logLines.group, logLine[1])
					}
	
					if ( typeof m.modLook === 'undefined' ) {
						// eslint-disable-next-line no-console
						console.error(`worker-thread-${m.pid}`, 'Unable to read mod file/folder!')
						break
					}
					handleResults(m.results, m.fileDetails)

					break
				}
				default :
					break
			}
		}
	})
	lookThread.on('close', () => {
		thisPromise.resolve(true)
		threadList.delete(threadID)
	})

	for ( const workItem of workPacket ) {
		lookThread.send({
			type : 'look',
			data : {
				fullPath : workItem[0],
				dataPath : workItem[1],
				fileDetails : workItem,
			},
		})
	}
	lookThread.send({ type : 'exit' })
}



