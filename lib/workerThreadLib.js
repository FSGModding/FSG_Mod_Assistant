/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Mod Parser, Mod Look Parser, Crop Data Reader, File Handler Class
// -- This is part of the detached thread processes

const path         = require('node:path')
const fs           = require('node:fs')
const crypto       = require('node:crypto')
const cp           = require('node:child_process')
const admZip       = require('adm-zip')
const {XMLParser}  = require('fast-xml-parser')
const allLang      = require('./modLookerLang.json')
const alwaysArray  = require('./modCheckLib_static.js').alwaysArrays
const { globSync } = require('glob')
const Vips         = require('wasm-vips')

const vipsPromise   = Vips()
const requiredItems = {
	iconDecoder   : null,
	currentLocale : null,
	l10n_hp       : null,
}

class logCollector {
	#items = []
	#group = null

	constructor(group) {
		this.#group = group
	}

	danger  (text) { this.#items.push(['danger', text]) }
	debug   (text) { this.#items.push(['debug', text]) }
	error   (text) { this.#items.push(['danger', text]) }
	info    (text) { this.#items.push(['info', text]) }
	notice  (text) { this.#items.push(['notice', text]) }
	warn    (text) { this.#items.push(['warning', text]) }
	warning (text) { this.#items.push(['warning', text]) }

	get lines() {
		return {
			group : this.#group,
			items : this.#items,
		}
	}
}

class modFileChecker {
	#maxFilesType = { grle : 10, pdf : 1, png : 128, txt : 2 }
	#fileSizeMap  = { cache : 10485760, dds : 12582912, gdm : 18874368, shapes : 268435456, xml : 262144 }

	#flag_broken = {
		FILE_ERROR_GARBAGE_FILE                : false,
		FILE_ERROR_LIKELY_COPY                 : false,
		FILE_ERROR_LIKELY_ZIP_PACK             : false,
		FILE_ERROR_NAME_INVALID                : false,
		FILE_ERROR_NAME_STARTS_DIGIT           : false,
		FILE_ERROR_UNREADABLE_ZIP              : false,
		FILE_ERROR_UNSUPPORTED_ARCHIVE         : false,
		MOD_ERROR_NO_MOD_VERSION               : false,
		NOT_MOD_MODDESC_MISSING                : false,
		NOT_MOD_MODDESC_PARSE_ERROR            : false,
		NOT_MOD_MODDESC_VERSION_OLD_OR_MISSING : false,
	}

	#flag_info = {
		INFO_NO_MULTIPLAYER_UNZIPPED           : false,
		FILE_IS_A_SAVEGAME                     : false,
	}

	#flag_problem = {
		INFO_MIGHT_BE_PIRACY                   : false,
		MOD_ERROR_MODDESC_DAMAGED_RECOVERABLE  : false,
		MOD_ERROR_NO_MOD_ICON                  : false,
		PERF_DDS_TOO_BIG                       : false,
		PERF_GDM_TOO_BIG                       : false,
		PERF_GRLE_TOO_MANY                     : false,
		PERF_HAS_EXTRA                         : false,
		PERF_I3D_TOO_BIG                       : false,
		PERF_L10N_NOT_SET                      : false,
		PERF_PDF_TOO_MANY                      : false,
		PERF_PNG_TOO_MANY                      : false,
		PERF_SHAPES_TOO_BIG                    : false,
		PERF_SPACE_IN_FILE                     : false,
		PERF_TXT_TOO_MANY                      : false,
		PERF_XML_TOO_BIG                       : false,
		PREF_PNG_TEXTURE                       : false,
	}

	modDesc = {
		actions        : {},
		author         : '--',
		binds          : {},
		cropInfo       : false,
		depend         : [],
		descVersion    : 0,
		iconFileName   : false,
		iconImageCache : null,
		mapConfigFile  : null,
		mapIsSouth     : false,
		multiPlayer    : false,
		scriptFiles    : 0,
		storeItems     : 0,
		version        : '--',
	}

	modDescRAW    = null
	modDescParsed = false

	md5Sum            = null
	uuid              = null
	currentCollection = null

	fileDetail = {
		copyName    : false,
		extraFiles  : [],
		fileDate    : null,
		fileSize    : 0,
		fullPath    : false,
		i3dFiles    : [],
		imageDDS    : [],
		imageNonDDS : [],
		isFolder    : false,
		isSaveGame  : false,
		pngTexture  : [],
		shortName   : false,
		spaceFiles  : [],
		tooBigFiles : [],
	}

	canNotUse     = true
	badges        = ''
	currentLocale = null

	#l10n           = null
	#locale         = null
	#log            = null
	#iconParser     = requiredItems.iconDecoder

	#modHandle = null
	
	constructor(filePath, isFolder, size, date, md5Pre = null) {
		this.fileDetail.fullPath = filePath
		this.fileDetail.isFolder = isFolder
		this.fileDetail.fileSize = size
		this.fileDetail.fileDate = date
		
		this.md5Sum    = md5Pre ?? null
		this.#locale   = requiredItems.currentLocale

		this.fileDetail.shortName = path.parse(this.fileDetail.fullPath).name

		this.#flag_info.INFO_NO_MULTIPLAYER_UNZIPPED = this.fileDetail.isFolder
	}

	async getInfo() {
		this.uuid      = crypto.createHash('md5').update(this.fileDetail.fullPath).digest('hex')
		this.#log      = new logCollector(`mod-${this.uuid}`)
		this.#log.info(`Adding Mod File: ${this.fileDetail.shortName}`)
			
		const isValidMod = this.#doStep_validFileName

		try {
			if ( !isValidMod ) {
				this.#util_raiseFlag_broken('FILE_ERROR_NAME_INVALID')
				throw new Error('Invalid Mod')
			}

			this.#modHandle = new fileHandler(this.fileDetail.fullPath, this.fileDetail.isFolder, this.#log)

			if ( ! this.#modHandle.isOpen ) {
				this.#util_raiseFlag_broken('FILE_ERROR_UNREADABLE_ZIP')
				throw new Error('Unreadable ZIP File')
			}
				
			if ( this.#modHandle.exists('careerSavegame.xml')) {
				this.fileDetail.isSaveGame = true
				this.modDesc.version       = '--'
				this.#util_raiseFlag_info('FILE_IS_A_SAVEGAME')
				throw new Error('Savegame Detected')
			}

			if ( this.#modHandle.exists('modDesc.xml') === null ) {
				this.#util_raiseFlag_broken('NOT_MOD_MODDESC_MISSING')
				this.md5Sum                 = null
				throw new Error('ModDesc Missing, Invalid, or Un-Readable')
			}

			this.#doStep_fileCounts()
			this.#doStep_parseModDesc()
				
			if ( this.modDesc.mapConfigFile !== null ) {
				try {
					if (! this.#modHandle.exists(this.modDesc.mapConfigFile) ) { throw new Error('Config file does not Exist')}

					const cropInfo = new cropDataReader(
						...this.#doStep_parseMapXML(this.modDesc.mapConfigFile).map((x) => this.#modHandle.readText(x))
					)

					this.modDesc.cropInfo   = cropInfo.crops
					this.modDesc.mapIsSouth = cropInfo.isSouth
				} catch (err) {
					this.#log.notice(`Caught map fail: ${err.message}`)
				}
			}

			try {
				if ( this.#flag_problem.MOD_ERROR_NO_MOD_ICON || typeof this.modDesc.iconFileName !== 'string' || ! this.#modHandle.exists(this.modDesc.iconFileName) ) {
					throw new Error('File does not Exist')
				}

				this.modDesc.iconImageCache = await this.#iconParser.parseDDS(
					this.#modHandle.readBin(this.modDesc.iconFileName),
					false
				)
			} catch (err) {
				this.#util_raiseFlag_problem('MOD_ERROR_NO_MOD_ICON')
				this.#log.notice(`Caught icon fail: ${err.message}`)
			}
		} catch (err) {
			this.#log.notice(`Stopping Mod Parse : ${err.message}`)
		} finally {
			this.#doStep_l10n()
			this.#modHandle?.close?.()
		}
		this.#modHandle    = null
		this.modDescParsed = null
		this.modDescRAW    = null

		return this.storable
	}

	get storable() {
		return {
			log    : this.#log.lines,
			record : {
				badgeArray        : this.#doStep_badges,
				canNotUse         : this.#doStep_canUse,
				currentCollection : this.currentCollection,
				fileDetail        : this.fileDetail,
				issues            : Object.entries({...this.#flag_broken, ...this.#flag_problem, ...this.#flag_info}).filter((x) => x[1] === true).map((x) => x[0]),
				l10n              : this.#l10n,
				md5Sum            : this.md5Sum,
				modDesc           : this.modDesc,
				uuid              : this.uuid,
			},
		}
	}

	#doStep_fileCounts() {
		for ( const checkFile of this.#modHandle.listFiles() ) {
			const fileName = this.fileDetail.isFolder ? checkFile.name : checkFile.entryName

			if ( fileName.includes(' ') ) {
				this.fileDetail.spaceFiles.push(fileName)
				this.#util_raiseFlag_problem('PERF_SPACE_IN_FILE')
			}

			if ( this.fileDetail.isFolder && checkFile.isDirectory() ) { continue }

			if ( fileName.endsWith('/') || fileName.endsWith('\\') ) { continue }

			this.#util_countFile(
				path.extname(fileName),
				fileName,
				this.fileDetail.isFolder ? checkFile.size : checkFile.header.size
			)
		}

		this.#flag_problem.PERF_GRLE_TOO_MANY = ( this.#maxFilesType.grle < 1 )
		this.#flag_problem.PERF_PNG_TOO_MANY  = ( this.#maxFilesType.png < 1 )
		this.#flag_problem.PERF_PDF_TOO_MANY  = ( this.#maxFilesType.pdf < 1 )
		this.#flag_problem.PERF_TXT_TOO_MANY  = ( this.#maxFilesType.txt < 1 )
	}

	get #doStep_canUse() {
		return this.fileDetail.isSaveGame ? true : Object.entries(this.#flag_broken).some((x) => x[1] === true)
	}

	#doStep_l10n() {
		const title = this.#modDesc_localString('title', '--')
		const desc  = this.#modDesc_localString('description')

		this.#flag_info.PERF_L10N_NOT_SET  = ( title === '--' || desc === '' )

		this.#l10n = {
			title       : title,
			description : desc,
		}
	}

	get #doStep_badges() {
		const badges = {
			broken  : this.fileDetail.isSaveGame ? false : Object.entries(this.#flag_broken).some((x) => x[1] === true),
			folder  : this.fileDetail.isFolder,
			noMP    : ! this.modDesc.multiPlayer && this.fileDetail.isFolder,
			notmod  : this.#flag_broken.NOT_MOD_MODDESC_MISSING,
			pconly  : (this.modDesc.scriptFiles > 0),
			problem : this.fileDetail.isSaveGame ? false : Object.entries(this.#flag_problem).some((x) => x[1] === true),
			savegame : this.fileDetail.isSaveGame,
		}

		return Object.entries(badges).filter((x) => x[1] === true).map((x) => x[0])
	}

	get #doStep_validFileName() {
		const fullModPath = this.fileDetail.fullPath
		const shortName   = this.fileDetail.shortName

		if ( ! this.fileDetail.isFolder && ! fullModPath.endsWith('.zip') ) {
			if ( fullModPath.endsWith('.rar') || fullModPath.endsWith('.7z') ) {
				this.#util_raiseFlag_broken('FILE_ERROR_UNSUPPORTED_ARCHIVE')
			} else {
				this.#util_raiseFlag_broken('FILE_ERROR_GARBAGE_FILE')
			}
			return false
		}

		if ( shortName.match(/unzip/i) ) {
			this.#util_raiseFlag_broken('FILE_ERROR_LIKELY_ZIP_PACK')
		}

		if ( shortName.match(/^\d/) ) {
			this.#util_raiseFlag_broken('FILE_ERROR_NAME_STARTS_DIGIT')
			return false
		}

		if ( ! shortName.match(/^[A-Z_a-z]\w+$/) ) {
			const copyName = shortName.match(/^([A-Za-z]\w+)(?: - .+$| \(.+$)/)

			if ( copyName !== null ) {
				this.#util_raiseFlag_broken('FILE_ERROR_LIKELY_COPY')
				this.fileDetail.copyName    = copyName[1]
			}
			return false
		}
		return true
	}

	#modDesc_localString(key, fallback = '') {
		const searchTree = this.modDescParsed?.[key.toLowerCase()] ?? fallback

		if ( searchTree === null ) { return fallback }

		try {
			return searchTree?.[this.#locale] ?? searchTree?.en ?? searchTree?.de ?? fallback
		} catch (err) {
			this.#log.warning(`Caught odd entry: ${key} :: ${err}`)
			return fallback
		}
	}

	#modDesc_default(key, fallback = null) { return key ?? fallback }

	#doStep_parseModDesc() {
		this.modDescParsed = this.#modHandle.readXML('modDesc.xml', 'moddesc', 'moddesc')

		if ( this.modDescParsed === false ) {
			this.#util_raiseFlag_broken('NOT_MOD_MODDESC_PARSE_ERROR')
			return
		}

		if ( this.modDescParsed === null ) {
			this.#util_raiseFlag_broken('NOT_MOD_MODDESC_MISSING')
			return
		}

		/* Get modDesc.xml version */
		this.modDesc.descVersion   = this.#modDesc_default(this.modDescParsed?.$?.DESCVERSION, 0)
		this.#flag_broken.NOT_MOD_MODDESC_VERSION_OLD_OR_MISSING = ( this.modDesc.descVersion === 0 )
	
		/* Get MOD Version */
		this.modDesc.version       = this.#modDesc_default(this.modDescParsed?.version?.toString?.(), '0.0.0.0')
		this.#flag_broken.MOD_ERROR_NO_MOD_VERSION = ( this.modDesc.version === '0.0.0.0' )

		this.modDesc.author        = this.#modDesc_default(this.modDescParsed?.author, '--')
		this.modDesc.multiPlayer   = this.#modDesc_default(this.modDescParsed?.multiplayer?.$?.SUPPORTED, false)
		this.modDesc.storeItems    = this.#modDesc_default(this.modDescParsed?.storeitems?.storeitem?.length, 0)
		this.modDesc.mapConfigFile = this.#modDesc_default(this.modDescParsed?.maps?.map?.[0]?.$?.CONFIGFILENAME)
		this.modDesc.depend        = this.#modDesc_default(this.modDescParsed?.dependencies?.dependency, [])
		
		this.#flag_problem.INFO_MIGHT_BE_PIRACY = Object.hasOwn(this.modDescParsed, 'productid')

		/* Get icon filename */
		let iconFileName = ''
		
		if ( typeof this.modDescParsed?.iconfilename ==='string' ) {
			iconFileName = this.modDescParsed.iconfilename
		} else if ( typeof this.modDescParsed?.iconfilename?.[0] ==='string' ) {
			iconFileName = this.modDescParsed.iconfilename[0]
		}
		
		if ( typeof iconFileName === 'string' && ! iconFileName.endsWith('.dds') ) {
			iconFileName = `${iconFileName.slice(0, -4)}.dds`
		}

		if ( this.fileDetail.imageDDS.includes(iconFileName) ) {
			this.modDesc.iconFileName = iconFileName
		} else {
			
			this.#util_raiseFlag_broken('MOD_ERROR_NO_MOD_ICON')
		}
		
		this.#doStep_parseActions()
	}

	#doStep_parseActions() {
		try {
			if ( Array.isArray(this.modDescParsed?.actions?.action) ) {
				for ( const action of this.modDescParsed.actions.action ) {
					this.modDesc.actions[action.$.NAME] = action.$.CATEGORY || 'ALL'
				}
			}
			if ( Array.isArray(this.modDescParsed?.inputbinding?.actionbinding) ) {
				for ( const action of this.modDescParsed.inputbinding.actionbinding ) {
					const thisActionName = action.$.ACTION

					for ( const binding of action.binding ) {
						if ( binding.$.DEVICE === 'KB_MOUSE_DEFAULT' ) {
							this.modDesc.binds[thisActionName] ??= []
							this.modDesc.binds[thisActionName].push(binding.$.INPUT)
						}
					}
				}
			}
		} catch (err) {
			this.#log.warning(`Key binding read failed : ${err}`)
		}
	}

	#doStep_parseMapXML(fileName) {
		const mapConfigParsed = this.#modHandle.readXML(fileName, 'moddesc', 'map')

		
		if ( mapConfigParsed === null ) {
			this.#log.warning('Map XML Files not found')
		}

		return [
			this.#util_nullBaseGameFile(mapConfigParsed?.fruittypes?.$?.FILENAME),
			this.#util_nullBaseGameFile(mapConfigParsed?.growth?.$?.FILENAME),
			this.#util_nullBaseGameFile(mapConfigParsed?.environment?.$?.FILENAME),
		]
	}

	#util_raiseFlag_problem(flag) { this.#flag_problem[flag] = true }
	#util_raiseFlag_broken(flag)  { this.#flag_broken[flag] = true }
	#util_raiseFlag_info(flag)    { this.#flag_info[flag] = true }

	#util_size_check(size, type, fileName, flagPart) {
		if ( size > this.#fileSizeMap[type] ) {
			this.fileDetail.tooBigFiles.push(fileName)
			this.#util_raiseFlag_problem(`PERF_${flagPart}_TOO_BIG`)
		}
	}
	#util_tick_count(type) { this.#maxFilesType[type]-- }

	#util_countUnknown(shortSuffix, fileName) {
		const knownGood   = new Set(['', 'png', 'dds', 'i3d', 'shapes', 'lua', 'gdm', 'cache', 'xml', 'grle', 'pdf', 'txt', 'gls', 'anim', 'ogg'])

		if ( !knownGood.has(shortSuffix) ) {
			if ( shortSuffix === 'l64' || shortSuffix === 'dat' ) {
				this.#util_raiseFlag_problem('INFO_MIGHT_BE_PIRACY')
			}
			this.#util_raiseFlag_problem('PERF_HAS_EXTRA')
			this.fileDetail.extraFiles.push(fileName)
			return true
		}
		return false
	}
	#util_countFile(suffix, fileName, size) {
		const shortSuffix = suffix.substring(1)

		if ( this.#util_countUnknown(shortSuffix, fileName) ) { return }

		switch (shortSuffix) {
			case 'png' : {
				this.#util_tick_count('png')
				if ( ! fileName.endsWith('_weight.png') ) {
					this.fileDetail.imageNonDDS.push(fileName)
					this.fileDetail.pngTexture.push(fileName)
				}
				break
			}
			case 'dds' :
				this.fileDetail.imageDDS.push(fileName)
				this.#util_size_check(size, 'dds', fileName, 'DDS')
				break
			case 'i3d' :
				this.fileDetail.i3dFiles.push(fileName)
				break
			case 'lua' :
				this.modDesc.scriptFiles++
				break
			case 'cache' :
				this.#util_size_check(size, shortSuffix, fileName, 'I3D')
				break
			case 'gdm' :
			case 'xml' :
			case 'shapes' :
				this.#util_size_check(size, shortSuffix, fileName, shortSuffix.toUpperCase())
				break
			case '.grle' :
			case '.pdf' :
			case '.txt' :
				this.#util_tick_count(shortSuffix)
				break
			default :
				break
		}
		
	}

	#util_nullBaseGameFile(fileName) {
		return ( typeof fileName === 'string' && !fileName.startsWith('$') ) ? fileName : null
	}
}

class cropDataReader {
	#cropData   = {}
	#skipFruits = new Set(['meadow'])

	/* eslint-disable sort-keys */
	#baseGameCropTypes = {
		wheat         : { maxHarvest : 8,  minHarvest : 8,  states : 8 },
		barley        : { maxHarvest : 7,  minHarvest : 7,  states : 7 },
		canola        : { maxHarvest : 9,  minHarvest : 9,  states : 9 },
		oat           : { maxHarvest : 5,  minHarvest : 5,  states : 5 },
		maize         : { maxHarvest : 7,  minHarvest : 7,  states : 7 },
		sunflower     : { maxHarvest : 8,  minHarvest : 8,  states : 8 },
		soybean       : { maxHarvest : 7,  minHarvest : 7,  states : 7 },
		potato        : { maxHarvest : 6,  minHarvest : 6,  states : 6 },
		sugarbeet     : { maxHarvest : 8,  minHarvest : 8,  states : 8 },
		sugarcane     : { maxHarvest : 8,  minHarvest : 8,  states : 8 },
		cotton        : { maxHarvest : 9,  minHarvest : 9,  states : 9 },
		sorghum       : { maxHarvest : 5,  minHarvest : 5,  states : 5 },
		grape         : { maxHarvest : 11, minHarvest : 10, states : 7 },
		olive         : { maxHarvest : 10, minHarvest : 9,  states : 7 },
		poplar        : { maxHarvest : 14, minHarvest : 14, states : 14 },
		grass         : { maxHarvest : 4,  minHarvest : 3,  states : 4 },
		oilseedradish : { maxHarvest : 2,  minHarvest : 2,  states : 2 },
	}

	#baseGameCrops = [
		{
			growthTime     : 8,
			harvestPeriods : [5, 6],
			name           : 'wheat',
			plantPeriods   : [7, 8],
		}, {
			growthTime     : 7,
			harvestPeriods : [4, 5],
			name           : 'barley',
			plantPeriods   : [7, 8],
		}, {
			growthTime     : 9,
			harvestPeriods : [5, 6],
			name           : 'canola',
			plantPeriods   : [6, 7],
		}, {
			growthTime     : 5,
			harvestPeriods : [5, 6],
			name           : 'oat',
			plantPeriods   : [1, 2],
		}, {
			growthTime     : 7,
			harvestPeriods : [8, 9],
			name           : 'maize',
			plantPeriods   : [2, 3],
		}, {
			growthTime     : 8,
			harvestPeriods : [8, 9],
			name           : 'sunflower',
			plantPeriods   : [1, 2],
		}, {
			growthTime     : 7,
			harvestPeriods : [8, 9],
			name           : 'soybean',
			plantPeriods   : [2, 3],
		}, {
			growthTime     : 6,
			harvestPeriods : [6, 7],
			name           : 'potato',
			plantPeriods   : [1, 2],
		}, {
			growthTime     : 8,
			harvestPeriods : [8, 9],
			name           : 'sugarbeet',
			plantPeriods   : [1, 2],
		}, {
			growthTime     : 8,
			harvestPeriods : [8, 9],
			name           : 'sugarcane',
			plantPeriods   : [1, 2],
		}, {
			growthTime     : 9,
			harvestPeriods : [8, 9],
			name           : 'cotton',
			plantPeriods   : [1, 12],
		}, {
			growthTime     : 5,
			harvestPeriods : [6, 7],
			name           : 'sorghum',
			plantPeriods   : [2, 3],
		}, {
			growthTime     : 7,
			harvestPeriods : [7, 8],
			name           : 'grape',
			plantPeriods   : [1, 2, 3],
		}, {
			growthTime     : 7,
			harvestPeriods : [8],
			name           : 'olive',
			plantPeriods   : [1, 2, 3, 4],
		}, {
			growthTime     : 14,
			harvestPeriods : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
			name           : 'poplar',
			plantPeriods   : [1, 2, 3, 4, 5, 6],
		}, {
			growthTime     : 4,
			harvestPeriods : [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1],
			name           : 'grass',
			plantPeriods   : [1, 2, 3, 4, 5, 6, 7, 8, 9],
		}, {
			growthTime     : 2,
			harvestPeriods : [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1],
			name           : 'oilseedradish',
			plantPeriods   : [1, 2, 3, 4, 5, 6, 7, 8],
		}
	]
	/* eslint-enable sort-keys */

	#mapIsSouth = false
	#cropOutput = []

	constructor(typesFile, growthFile, envFile) {
		let didReadTypes  = false
		let didReadGrowth = false

		const cropParser = fileHandler.getParser('crop')

		if ( envFile !== null ) {
			try {
				const envParsed = cropParser.parse(envFile)

				this.#mapIsSouth = envParsed?.environment?.latitude < 0 ?? false
			} catch { /* Ignore errors */	}
		}

		if ( growthFile === null ) {
			this.#cropOutput = this.#baseGameCrops
			return
		}

		if ( typesFile !== null ) {
			try {
				const typesParsed = cropParser.parse(typesFile)

				didReadTypes = this.#readTypes(typesParsed?.map?.fruittypes?.fruittype)
			} catch { /* ignore */ }
		}

		if ( ! didReadTypes ) {
			for ( const cropName in this.#baseGameCropTypes ) {
				this.#cropData[cropName] = {
					harvest    : new Set(),
					maxHarvest : this.#baseGameCropTypes[cropName].maxHarvest,
					minHarvest : this.#baseGameCropTypes[cropName].minHarvest,
					plant      : new Set(),
					states     : this.#baseGameCropTypes[cropName].states,
				}
			}
		}

		try {
			const growthParsed = cropParser.parse(growthFile)

			didReadGrowth = this.#readGrowth(growthParsed?.growth?.seasonal?.fruit)
		} catch { /* ignore */ }

		if ( ! didReadGrowth ) {
			this.#cropOutput = this.#baseGameCrops
			return
		}

		for ( const cropName in this.#cropData ) {
			this.#cropOutput.push({
				growthTime     : this.#cropData[cropName].states,
				harvestPeriods : [...this.#cropData[cropName].harvest],
				name           : cropName,
				plantPeriods   : [...this.#cropData[cropName].plant],
			})
		}
	}

	#util_inRange(testMax, thisFruit) {
		return ( testMax >= this.#cropData[thisFruit].minHarvest && testMax <= this.#cropData[thisFruit].maxHarvest )
	}
	#util_default(data, fallback = null) { return data ?? fallback }
	#util_realIndex(index)               { return index < 13 ? index : index % 12 }

	#readGrowth (growth) {
		if ( !Array.isArray(growth) ) { return false }
		
		for ( const fruit of growth ) {
			const thisFruit = fruit.$.NAME.toLowerCase()

			if ( this.#skipFruits.has(thisFruit) ) { continue }
			if ( ! Object.hasOwn(this.#cropData, thisFruit) ) { continue }

			if ( thisFruit === 'poplar' ) {
				this.#cropData[thisFruit].harvest = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
			}

			let lastMax = 0

			for ( const period of fruit.period) {
				const thisIndex = period.$.INDEX
				
				if ( period.$?.PLANTINGALLOWED === true ) {
					this.#cropData[thisFruit].plant.add(thisIndex)
				}

				if ( Object.hasOwn(period, 'update') ) {
					if ( this.#util_inRange(lastMax, thisFruit) ) {
						const readyIndex = thisIndex + 1

						this.#cropData[thisFruit].harvest.add(this.#util_realIndex(readyIndex))
					}
				} else {
					for ( const update of period.update ) {
						const range    = this.#util_default(update.$.RANGE)
						const add      = this.#util_default(update.$.ADD, 0)
						const set      = this.#util_default(update.$.SET)
						const rangeMax = typeof range === 'string' ? parseInt(range.split('-')[1]) : range
						const newMax   = set !== null ? set : rangeMax + add

						if ( this.#util_inRange(newMax, thisFruit) ) {
							const readyIndex = thisIndex + ( thisFruit === 'olive' ? 2 : 1 )

							this.#cropData[thisFruit].harvest.add(this.#util_realIndex(readyIndex))
						}

						lastMax = newMax
					}
				}
			}
		}
		return true
	}

	#readTypes (fruittypes) {
		if ( fruittypes === null ) { return false }

		for ( const thisFruit of fruittypes) {
			const fruitName = thisFruit.$.NAME.toLowerCase()

			if ( this.#skipFruits.has(fruitName) ) { continue }

			this.#cropData[fruitName] = {
				harvest    : new Set(),
				maxHarvest : thisFruit?.harvest?.$?.MAXHARVESTINGGROWTHSTATE ?? 20,
				minHarvest : thisFruit?.harvest?.$?.MINHARVESTINGGROWTHSTATE ?? 20,
				plant      : new Set(),
				states     : thisFruit?.growth?.$?.NUMGROWTHSTATES ?? 20,
			}

			if ( Object.hasOwn(thisFruit, 'preparing') ) {
				this.#cropData[fruitName].minHarvest = thisFruit.preparing?.$?.MINGROWTHSTATE ?? this.#cropData[fruitName].minHarvest
				this.#cropData[fruitName].maxHarvest = thisFruit.preparing?.$?.MAXGROWTHSTATE ?? this.#cropData[fruitName].maxHarvest
			}
		}
		return true
	}

	get isSouth() { return this.#mapIsSouth }
	get crops() { return this.#cropOutput }
}

class modLooker {
	#iconParser     = requiredItems.iconDecoder
	#fullFileName   = null
	#locale         = null
	#log            = null
	#hpString       = null
	#modRecord      = null
	#path           = null
	#skipIcons      = false

	#langData = {}

	#infoData = {
		brands   : {},
		icons    : {},
		items    : {},
		mapImage : null,
	}

	#catDescMap  = require('./modCheckLib_static').catDescMap
	#fillCats    = require('./modCheckLib_static').fillCats
	#getColor    = require('./modCheckLib_static').getColor

	#modHandle = null

	constructor( modRecord, modCollectFolder, skipIcons = false ) {
		// modRecord from collection, folder for collection, skip Icons bool
		this.#log        = new logCollector(`modLook-${modRecord.fileDetail.shortName}`)
		this.#hpString   = requiredItems.l10n_hp
		this.#modRecord  = modRecord
		this.#path       = modCollectFolder
		this.#skipIcons  = skipIcons
		this.#locale     = requiredItems.currentLocale

		this.#fullFileName = path.join(this.#path, path.basename(this.#modRecord.fileDetail.fullPath))

		this.#langData = Object.hasOwn(allLang, this.#locale) ? allLang[this.#locale] : allLang.en
	}

	async getInfo() {
		this.#modHandle = new fileHandler(this.#fullFileName, this.#modRecord.fileDetail.isFolder, this.#log)

		if ( ! this.#modHandle.isOpen ) { return { log : this.#log.lines, record : null } }

		const modDescTree     = this.#modHandle.readXML('modDesc.xml')
		const storeItemFiles  = this.#getStoreItems(modDescTree)

		this.#infoData.mapImage = await this.#getMapImage(modDescTree)
		this.#infoData.brands   = await this.#getExtraBrands(modDescTree)

		this.#langData = { ...this.#langData, ...this.#getLangKeys(modDescTree) }

		const iconLoads = []

		for ( const thisItem of storeItemFiles ) {
			const thisItemTree = this.#modHandle.readXML(thisItem, 'modlook')
			const thisItemInfo = this.#parseStoreItem(thisItemTree)

			if ( thisItemInfo !== null ) {
				this.#infoData.items[thisItem] = thisItemInfo

				if ( !this.#skipIcons && thisItemInfo.icon !== null ) {
					iconLoads.push(this.#loadIcon(thisItemInfo.icon).then((itemIcon) => {
						this.#infoData.icons[thisItem] = itemIcon
					}).catch((err) => {
						this.#log.notice(`Caught image error: ${err}`)
					}))
				}
			}
		}

		this.#modHandle.close()
		this.#modHandle = null

		return Promise.allSettled(iconLoads).then(() => {
			return { log : this.#log.lines, record : this.#infoData }
		})
	}

	#getLangKeys(modDescTree) {
		let langByKey = {}

		if ( modDescTree !== null && typeof modDescTree.moddesc.l10n === 'object' ) {
			const fileName = modDescTree.moddesc.l10n?.$?.FILENAMEPREFIX || null

			if ( fileName !== null ) {
				for ( const langKey of [this.#locale, 'en', 'de'] ) {
					const langFile = this.#modHandle.readXML(`${fileName}_${langKey}.xml`)
					if ( langFile !== null ) {
						if ( Array.isArray(langFile.l10n.texts) ) {
							langByKey = { ...langByKey, ...langFile.l10n.texts.text.reduce((last, x) => {
								return {...last, [x.$.NAME] : x.$.TEXT}
							}, {})}

							break
						}
						if ( Array.isArray(langFile.l10n.elements) ) {
							langByKey = { ...langByKey, ...langFile.l10n.elements.e.reduce((last, x) => {
								return {...last, [x.$.K] : x.$.V}
							}, {})}

							break
						}
					}
				}
			} else if ( typeof modDescTree.moddesc.l10n.text === 'object' ) {
				for ( const thisText of modDescTree.moddesc.l10n.text ) {
					for ( const langKey of [this.#locale, 'en', 'de'] ) {
						if ( Object.hasOwn(thisText, langKey) ) {
							langByKey[thisText.$.NAME] = thisText[langKey]
							break
						}
					}
				}
			}
		}
		return langByKey
	}

	async #getExtraBrands(modDescTree) {
		const addBrands = {}
		const iconLoads = []

		if ( !Array.isArray(modDescTree.moddesc?.brands?.brand) ) { return addBrands }

		for ( const thisBrand of modDescTree.moddesc.brands.brand ) {
			const thisName = thisBrand?.$?.NAME || null

			if ( thisName !== null ) {
				addBrands[thisName.toUpperCase()] = {
					title : thisBrand?.$?.TITLE || thisName,
					icon  : null,
				}
				if ( !this.#skipIcons ) {
					iconLoads.push(this.#loadIcon(thisBrand?.$?.IMAGE).then((itemIcon) => {
						addBrands[thisName.toUpperCase()].icon = itemIcon
					}).catch((err) => {
						this.#log.notice(`Caught image error: ${err}`)
					}))
				}
			}
		}
		return Promise.allSettled(iconLoads).then(() => { return addBrands })
	}

	async #getMapImage(modDescTree) {
		if ( modDescTree !== null ) {
			const mapFile = modDescTree.moddesc?.maps?.map?.[0]?.$?.CONFIGFILENAME ?? null
			if ( mapFile === null ) { return null }

			const mapXMLTree   = this.#modHandle.readXML(mapFile, 'modlook')
			const mapImageName = mapXMLTree?.map?.$?.IMAGEFILENAME

			return this.#loadIcon(mapImageName, true)
		}
		return null
	}

	#getStoreItems(modDescTree) {
		const storeItemFiles = []

		if ( modDescTree !== null ) {
			for ( const thisItem of modDescTree.moddesc.storeitems.storeitem ) {
				storeItemFiles.push(thisItem.$.XMLFILENAME)
			}
		}
		return storeItemFiles
	}

	#parseStoreItem(storeItemTree) {
		if ( storeItemTree === null ) { return null }

		const storeType = Object.keys(storeItemTree)[0]
		
		switch ( storeType ) {
			case 'vehicle' :
				return this.#parseVehicle(storeItemTree.vehicle)
			case 'placeable' :
				return this.#parsePlace(storeItemTree.placeable)
			default :
				return null
		}
	}

	async #loadIcon(iconFile, isMap) {
		if ( typeof iconFile !== 'string' || iconFile === null ) { return null }

		if ( iconFile.startsWith('$data/store/brands/') ) {
			return `img/brand/${iconFile.substring(19).slice(0, -4).toLowerCase()}.webp`
		}

		const fileName = ( ! iconFile.endsWith('.dds') ) ? `${iconFile.slice(0, -4)}.dds` : iconFile

		try {
			if ( this.#modHandle.exists(fileName) ) {
				return this.#iconParser.parseDDS(
					this.#modHandle.readBin(fileName),
					true,
					isMap
				)
			}
			return null
		} catch (err) {
			this.#log.warning(`Caught image error: ${err}`)
		}
		return null
	}

	#unwrapXML(xml) {
		const returner = {}
		if ( typeof xml !== 'object' || xml === null ) { return {} }

		for ( const key in xml ) {
			if ( key !== 'combination' ) {
				returner[key] = xml[key]
			}
		}
		return returner
	}

	#translate_single(key) {
		if ( key === null || typeof key !== 'string' ) { return null }
		if ( ! key.startsWith('$l10n') ) { return key }
		
		const searchKey = key.substring(6)

		return this.#langData?.[searchKey] ?? key
	}

	#getCategory(category) {
		if ( category === null ) { return '' }
		return this.#translate_single(this.#catDescMap?.[category]) ?? category
	}

	#translate(keys) {
		switch ( typeof keys ) {
			case 'boolean' :
				return keys
			case 'string':
				return this.#translate_single(keys)
			case 'object':
				try {
					return keys.map((key) => this.#translate_single(key))
				} catch {
					return ['invalid-xml-error']
				}
			default :
				return keys
		}
	}

	#util_getDefault(key, fallback = null) { return key ?? fallback }
	#util_getExist(key) { return typeof key !== 'undefined' }
	#util_getGTCount(key, count = 1) { return typeof key !== 'number' ? false : key > count}

	#parsePlace(xml) {
		const storeData = xml.storedata

		if ( storeData?.showinstore === false ) { return null }

		const fillUnit = this.#parseFillTypes(xml?.silo?.storages?.storage ?? null)

		try {
			return {
				category       : this.#getCategory(storeData?.category),
				functions      : this.#translate(this.#util_getDefault(storeData?.functions?.function, [])),
				hasColor       : this.#util_getGTCount(xml?.colorable?.colors?.color?.length, 1),
				icon           : this.#util_getDefault(storeData?.image),
				masterType     : 'placeable',
				name           : this.#parseName(storeData?.name),
				price          : this.#util_getDefault(storeData?.price, 0),
				type           : xml.$.TYPE,

				beehive   : {
					exists : this.#util_getExist(xml.beehive),
					radius : this.#util_getDefault(xml?.beehive?.$?.ACTIONRADIUS, 0),
					liters : this.#util_getDefault(xml?.beehive?.$?.LITERSHONEYPERDAY, 0),
				},
				husbandry : {
					exists   : this.#util_getExist(xml?.husbandry?.animals),
					type     : this.#util_getDefault(xml?.husbandry?.animals?.$?.TYPE, null),
					capacity : this.#util_getDefault(xml?.husbandry?.animals?.$?.MAXNUMANIMALS, 0),
				},
				incomePerHour : this.#util_getDefault(xml?.incomeperhour),
				objectStorage : this.#util_getDefault(xml?.objectstorage?.$?.CAPACITY),
				silo : {
					exists   : fillUnit.capacity > 0,
					types    : fillUnit.types,
					capacity : fillUnit.capacity,
				},
			}
		} catch {
			return null
		}
	}

	#parseFillTypes(xml) {
		const returnObject = {
			capacity : 0,
			types    : [],
		}
		if ( xml === null ) { return returnObject }

		for ( const thisFill of xml ) {
			if ( thisFill?.$?.SHOWINSHOP !== false ) {
				const thisTypes = thisFill?.$?.FILLTYPES?.split?.(' ') ?? null
				const thisCats  = thisFill?.$?.FILLTYPECATEGORIES?.split?.(' ') ?? null

				if ( thisCats !== null ) {
					for ( const thisCat of thisCats ) {
						const thisCatKey = thisCat.toLowerCase()
						if ( Object.hasOwn(this.#fillCats, thisCatKey) ) {
							returnObject.types.push(...this.#fillCats[thisCatKey])
						}
					}
				}
				
				if ( thisTypes !== null ) {
					for ( const thisType of thisTypes ) {
						returnObject.types.push(thisType.toLowerCase())
					}
				}

				returnObject.capacity += thisFill?.$?.CAPACITY ?? 0
			}
		}
		
		return returnObject
	}

	#parseWeight(xml) {
		if ( typeof xml !== 'object' || xml === null ) { return 0 }

		return xml.reduce((total, current) => total + current?.$?.MASS ?? 0, 0)
	}

	#parseBrand(xml) {
		if ( typeof xml === 'string' ) { return xml }
		if ( typeof xml?.['#text'] === 'string' ) { return xml['#text'] }
		return null
	}

	#util_motorGraph(index, data, label) {
		return {
			backgroundColor        : `${this.#getColor(index)}88`,
			borderColor            : this.#getColor(index),
			cubicInterpolationMode : 'monotone',
			data                   : data,
			label                  : label,
			pointHoverRadius       : 12,
			pointRadius            : 8,
			pointStyle             : 'circle',
			tension                : 0.4,
			yAxisID                : 'y',
		}
	}

	#parseMotor(xml) {
		if ( typeof xml !== 'object' ) { return null }

		const motorInfo = {
			hp    : [],
			kph   : [],
			mph   : [],
		}

		const last = {
			trans  : null,
			torque : null,
			rpm    : null,
		}

		for ( const [i, thisMotor] of xml.entries() ) {
			last.torque = this.#util_getDefault(thisMotor?.motor?.torque, last.torque)
			last.trans  = this.#util_getDefault(thisMotor?.transmission, last.trans)

			const axelRatio  = this.#util_getDefault(last.trans?.$?.AXLERATIO, 1)
			const minFwdGear = this.#util_getDefault(last.trans?.$?.MINFORWARDGEARRATIO)
			const motorScale = this.#util_getDefault(thisMotor?.motor?.$?.TORQUESCALE, 1)
			const motorRPM   = this.#util_getDefault(thisMotor?.motor?.$?.MAXRPM, last.rpm ?? 1800)

			last.rpm = motorRPM

			let minGear    = Number.MAX_SAFE_INTEGER

			const viewHP = thisMotor?.$?.HP ?? null
			const names  = [
				this.#translate(thisMotor?.$?.NAME),
				this.#translate_single(last.trans?.$?.NAME, null),
				viewHP !== null ? `${viewHP}${this.#hpString}` : null,
			]
			
			if ( minFwdGear === null ) {
				if ( typeof last.trans?.forwardgear === 'object' ) {
					for ( const thisGear of last.trans.forwardgear) {
						let   thisGear_ratio = this.#util_getDefault(thisGear?.$?.GEARRATIO)
						const thisGear_max   = this.#util_getDefault(thisGear?.$?.MAXSPEED)

						if ( thisGear_max !== null ) {
							thisGear_ratio = motorRPM * Math.PI / (thisGear_max / 3.6 * 30)
						}

						minGear = Math.min(minGear, (thisGear_ratio * axelRatio))
					}
				}
			} else {
				minGear = minFwdGear * axelRatio
			}

			const theseHP  = []
			const theseKPH = []
			const theseMPH = []

			for ( let j = 0; j < last.torque.length; j++ ) {
				const thisEntry   = last.torque[j]
				const thisScale   = this.#util_getDefault(thisEntry?.$?.NORMRPM, 1)
				const thisTorque  = this.#util_getDefault(thisEntry?.$?.TORQUE, 1)
				const thisRPM     = this.#util_getDefault(thisEntry?.$?.RPM, thisScale * motorRPM)
				const thisHP      = Math.round(motorScale*(1.35962161*Math.PI*thisRPM*thisTorque)/30)
				const thisSpeed_k = Math.round(3.6*((thisRPM*Math.PI)/(30*minGear)))
				const thisSpeed_m = Math.round(3.6*((thisRPM*Math.PI)/(30*minGear)) * 0.621371)
				const thisRPM_r   = Math.round(thisRPM)

				theseHP.push({x : thisRPM_r,  y : thisHP})
				theseKPH.push({x : thisRPM_r, y : thisSpeed_k})
				theseMPH.push({x : thisRPM_r, y : thisSpeed_m})
			}

			let matchIndex = -1
			if ( i > 0 ) {
				for ( let k = 0; k < motorInfo.hp.length; k++) {
					if ( JSON.stringify(motorInfo.hp[k].data) === JSON.stringify(theseHP) ) {
						matchIndex = k
						break
					}
				}
			}

			if ( matchIndex > -1 ) {
				motorInfo.hp[matchIndex].label.push([...names].filter((x) => x !== null).join(' - '))
			} else {
				motorInfo.hp.push(this.#util_motorGraph(i, theseHP, [[...names].filter((x) => x !== null).join(' - ')]))
			}

			motorInfo.kph[i] = this.#util_motorGraph(i, theseKPH, [...names].filter((x) => x !== null).join(' - '))
			motorInfo.mph[i] = this.#util_motorGraph(i, theseMPH, [...names].filter((x) => x !== null).join(' - '))
		}

		return motorInfo
	}

	#parseVehicle(xml) {
		const storeData = xml.storedata

		if ( storeData?.showinstore === false ) { return null }
		if ( Object.hasOwn(storeData, 'bundleelements') ) { return null }

		try {
			const theseFills = this.#parseFillTypes(xml?.fillunit?.fillunitconfigurations?.fillunitconfiguration?.[0]?.fillunits?.fillunit ?? null)
			
			return {
				brand          : this.#parseBrand(storeData?.brand),
				category       : this.#getCategory(storeData?.category),
				fillLevel      : theseFills.capacity,
				fillTypes      : theseFills.types,
				fuelType       : this.#util_getDefault(xml?.motorized?.consumerconfigurations?.[0].consumerconfiguration?.[0]?.consumer?.[0]?.$?.FILLTYPE, false),
				functions      : this.#translate(storeData?.functions?.function || []),
				hasBeacons     : this.#util_getExist(xml?.lights?.beaconlights),
				hasColor       : this.#util_getExist(xml.basematerialconfigurations),
				hasLights      : this.#util_getExist(xml?.lights?.reallights),
				hasWheelChoice : this.#util_getGTCount(xml.wheels?.wheelconfigurations?.wheelconfiguration?.length, 1),
				icon           : this.#util_getDefault(storeData?.image),
				isEnterable    : this.#util_getDefault(xml.enterable),
				isMotorized    : this.#util_getDefault(xml.motorized),
				masterType     : 'vehicle',
				motorInfo      : this.#parseMotor(xml?.motorized?.motorconfigurations?.motorconfiguration),
				name           : this.#parseName(storeData?.name),
				price          : this.#util_getDefault(storeData?.price, 0),
				specs          : this.#unwrapXML(storeData?.specs),
				transType      : this.#translate(xml?.motorized?.motorconfigurations?.motorconfiguration?.[0]?.transmission?.$?.NAME || false),
				type           : xml.$.TYPE,
				typeDesc       : this.#translate(xml.base?.typedesc || 'unknown'),
				weight         : this.#parseWeight(xml.base?.components?.component),
			}
		} catch (_) {
			return null
		}
	}

	#parseName(xml, fallback = 'unknown') {
		if ( (typeof xml !== 'string' && typeof xml !== 'object') || xml === null ) { return fallback }
		if ( typeof xml === 'string' ) { return this.#translate(xml) }

		if ( Object.hasOwn(xml, this.#locale) ) { return xml[this.#locale] }
		if ( Object.hasOwn(xml, 'en') ) { return xml.en }
		if ( Object.hasOwn(xml, 'de') ) { return xml.de }
		return fallback
	}
}

class fileHandler {
	#ZIPFile     = null
	#isFolder    = false
	#log         = null
	#folderName  = null

	#isOpen    = false

	constructor(fileName, isFolder, log) {
		this.#isFolder = isFolder
		this.#isOpen   = true
		this.#log      = log

		if ( ! fs.existsSync(fileName) ) {
			this.#isOpen = false
			this.#log.warning(`File-Manager File-Not-Found: ${fileName}`)
		} else if ( ! this.#isFolder ) {
			try {
				if ( ! fileName.endsWith('.zip') ) { throw new Error('Not a ZIP File') }
				this.#ZIPFile = new admZip(fileName)
				this.#isOpen   = true
			} catch (_) {
				this.#log.warning(`File-Manager ZIP File Error: ${fileName}`)
				this.#isOpen = false
			}
		} else {
			this.#folderName = fileName
			this.#isOpen     = true
		}
	}

	get isOpen() { return this.#isOpen }

	close() { if ( ! this.#isFolder ) { this.#ZIPFile = null } }

	exists(fileName) {
		if ( fileName === null ) { return false }
		if ( this.#isFolder ) {
			return fs.existsSync(path.join(this.#folderName, fileName))
		}
		return ( this.#ZIPFile.getEntry(fileName) !== null )
	}

	listFiles() {
		return ( this.#isFolder ) ?
			globSync('**', { cwd : this.#folderName, follow : true, mark : true, stat : true, withFileTypes : true }) :
			this.#ZIPFile.getEntries()
	}

	static getParser(type) {
		return new XMLParser({
			attributeNamePrefix    : '',
			attributesGroupName    : '$',
			ignoreAttributes       : false,
			ignoreDeclaration      : true,
			ignorePiTags           : true,
			isArray                : (_, jPath) => alwaysArray[type].has(jPath),
			parseAttributeValue    : true,
			parseTagValue          : true,
			processEntities        : false,
			stopNodes              : require('./modCheckLib_static.js').stopNodes,
			transformAttributeName : (name) => name.toUpperCase(),
			transformTagName       : (name) => name.toLowerCase(),
			trimValues             : true,
		})
	}

	readText(fileName) { return this.#readFile(fileName, true) }
	readBin(fileName)  { return this.#readFile(fileName, false) }
	readXML(fileName, type = 'moddesc', defaultKey = null)  {
		
		const fileContents = this.readText(fileName)

		if ( fileContents === null ) { return null }

		const thisXMLParser = fileHandler.getParser(type)

		try {
			
			const thisParsedXML = (defaultKey === null ? thisXMLParser.parse(fileContents) : thisXMLParser.parse(fileContents)?.[defaultKey] ) ?? null

			if ( thisParsedXML === null ) {
				this.#log.warning(`XML Parse error or default key not found ${fileName} :: ${defaultKey}`)
			}

			return thisParsedXML
		} catch (_) {
			this.#log.warning(`Caught unrecoverable XML Parse error ${fileName}`)
			return false
		}
	}

	#readFile(fileName, text = true) {
		try {
			if ( ! this.exists(fileName) ) { throw new Error('Non-existent') }
		
			if ( this.#isFolder ) {
				return text ?
					fs.readFileSync(path.join(this.#folderName, fileName), 'utf8') :
					fs.readFileSync(path.join(this.#folderName, fileName), null).buffer
			}
			return text ? this.#ZIPFile.readAsText(fileName) : this.#ZIPFile.readFile(fileName).buffer
		} catch (err) {
			this.#log.debug(`File-Manager file read error ${fileName} :: ${err.message}`)
			return null
		}
	}
}


const ddsLib = {
	convert565ByteToRgb : (byte) => [
		Math.round(((byte >>> 11) & 31) * (255 / 31)),
		Math.round(((byte >>> 5) & 63) * (255 / 63)),
		Math.round((byte & 31) * (255 / 31))
	],
	extractBitsFromUin16Array : (array, shift, length) => {
		// sadly while javascript operates with doubles, it does all its binary operations on 32 bytes integers
		// so we have to get a bit dirty to do the bit shifting on the 48 bytes integer for the alpha values of DXT5
	
		const height   = array.length
		const height_1 = height - 1
		const width    = 16
		const rowS     = ((shift / width) | 0)
		const rowE     = (((shift + length - 1) / width) | 0)
		let shiftS
		let shiftE
		let result
	
		if (rowS === rowE) {
			// all the requested bits are contained in a single uint16
			shiftS = (shift % width)
			result = (array[height_1 - rowS] >> shiftS) & (Math.pow(2, length) - 1)
		} else {
			// the requested bits are contained in two continuous uint16
			shiftS = (shift % width)
			shiftE = (width - shiftS)
			result = (array[height_1 - rowS] >> shiftS) & (Math.pow(2, length) - 1)
			result += (array[height_1 - rowE] & (Math.pow(2, length - shiftE) - 1)) << shiftE
		}
	
		return result
	},
	fourCCToInt32 : (value) =>
		value.charCodeAt(0) +
			(value.charCodeAt(1) << 8) +
			(value.charCodeAt(2) << 16) +
			(value.charCodeAt(3) << 24),
	getAlphaIndexBC3 : (alphaIndices, pixelIndex) =>
		ddsLib.extractBitsFromUin16Array(alphaIndices, (3 * (15 - pixelIndex)), 3),
	getAlphaValueBC2 : (alphaValue, pixelIndex) =>
		ddsLib.extractBitsFromUin16Array(alphaValue, (4 * (15 - pixelIndex)), 4) * 17,
	int32ToFourCC : (value) => String.fromCharCode(
		value & 0xff,
		(value >> 8) & 0xff,
		(value >> 16) & 0xff,
		(value >> 24) & 0xff
	),
	interpolateAlphaValues : (firstVal, secondVal) => {
		const alphaValues = [firstVal, secondVal]
	
		if (firstVal > secondVal) {
			alphaValues.push(
				Math.floor(ddsLib.lerp(firstVal, secondVal, 1 / 7)),
				Math.floor(ddsLib.lerp(firstVal, secondVal, 2 / 7)),
				Math.floor(ddsLib.lerp(firstVal, secondVal, 3 / 7)),
				Math.floor(ddsLib.lerp(firstVal, secondVal, 4 / 7)),
				Math.floor(ddsLib.lerp(firstVal, secondVal, 5 / 7)),
				Math.floor(ddsLib.lerp(firstVal, secondVal, 6 / 7))
			)
		} else {
			alphaValues.push(
				Math.floor(ddsLib.lerp(firstVal, secondVal, 1 / 5)),
				Math.floor(ddsLib.lerp(firstVal, secondVal, 2 / 5)),
				Math.floor(ddsLib.lerp(firstVal, secondVal, 3 / 5)),
				Math.floor(ddsLib.lerp(firstVal, secondVal, 4 / 5)),
				0,
				255
			)
		}
	
		return alphaValues
	},
	interpolateColorValues : (firstVal, secondVal, isDxt1) => {
		const firstColor  = ddsLib.convert565ByteToRgb(firstVal)
		const secondColor = ddsLib.convert565ByteToRgb(secondVal)
		const colorValues = [...firstColor, 255, ...secondColor, 255]
	
		if (isDxt1 && firstVal <= secondVal) {
			colorValues.push(
				Math.round((firstColor[0] + secondColor[0]) / 2),
				Math.round((firstColor[1] + secondColor[1]) / 2),
				Math.round((firstColor[2] + secondColor[2]) / 2),
				255,
	
				0,
				0,
				0,
				0
			)
		} else {
			colorValues.push(
				Math.round(ddsLib.lerp(firstColor[0], secondColor[0], 1 / 3)),
				Math.round(ddsLib.lerp(firstColor[1], secondColor[1], 1 / 3)),
				Math.round(ddsLib.lerp(firstColor[2], secondColor[2], 1 / 3)),
				255,
	
				Math.round(ddsLib.lerp(firstColor[0], secondColor[0], 2 / 3)),
				Math.round(ddsLib.lerp(firstColor[1], secondColor[1], 2 / 3)),
				Math.round(ddsLib.lerp(firstColor[2], secondColor[2], 2 / 3)),
				255
			)
		}
	
		return colorValues
	},
	lerp : (v1, v2, r) => v1 * (1 - r) + v2 * r,
	multiply : (component, multiplier) => {
		if (!isFinite(multiplier) || multiplier === 0) { return 0 }
	
		return Math.round(component * multiplier)
	},

	parseHeaders : (arrayBuffer) => {
		const DDS_MAGIC        = 0x20534444
		const DDSD_MIPMAPCOUNT = 0x20000
		const DDPF_FOURCC      = 0x4
	
		const FOURCC_DXT1  = ddsLib.fourCCToInt32('DXT1')
		const FOURCC_DXT3  = ddsLib.fourCCToInt32('DXT3')
		const FOURCC_DXT5  = ddsLib.fourCCToInt32('DXT5')
		const FOURCC_DX10  = ddsLib.fourCCToInt32('DX10')
	
		const DDSCAPS2_CUBEMAP                   = 0x200
		const D3D10_RESOURCE_DIMENSION_TEXTURE2D = 3
		const DXGI_FORMAT_R32G32B32A32_FLOAT     = 2
		const DXGI_FORMAT_BC7_UNORM              = 98
		const DXGI_FORMAT_BC7_UNORM_SRGB         = 99
	
		// The header length in 32 bit ints
		const headerLengthInt = 31
	
		// Offsets into the header array
		const off_magic       = 0
		const off_size        = 1
		const off_flags       = 2
		const off_height      = 3
		const off_width       = 4
		const off_mipmapCount = 7
		const off_pfFlags     = 20
		const off_pfFourCC    = 21
		const off_caps2       = 28
	
		const header = new Int32Array(arrayBuffer, 0, headerLengthInt)
	
		if (header[off_magic] !== DDS_MAGIC) {
			throw new Error('Invalid magic number in DDS header')
		}
	
		if (!header[off_pfFlags] & DDPF_FOURCC) {
			throw new Error('Unsupported format, must contain a FourCC code')
		}
	
		let blockBytes
		let format
		let dx10Header
		let resourceDimension
		const fourCC = header[off_pfFourCC]
		switch (fourCC) {
			case FOURCC_DXT1:
				blockBytes = 8
				format     = 'dxt1'
				break
			case FOURCC_DXT3:
				blockBytes = 16
				format     = 'dxt3'
				break
			case FOURCC_DXT5:
				blockBytes = 16
				format     = 'dxt5'
				break
			case FOURCC_DX10:
				dx10Header        = new Uint32Array(arrayBuffer.slice(128, 128 + 20))
				blockBytes        = 16
				format            = dx10Header[0]
				resourceDimension = dx10Header[1]
	
				if ( resourceDimension !== D3D10_RESOURCE_DIMENSION_TEXTURE2D ) {
					throw new Error(`Unsupported DX10 resource dimension ${resourceDimension}`)
				}
				
				if ( format === DXGI_FORMAT_R32G32B32A32_FLOAT) {
					format = 'rgba32f'
				} else if ( format === DXGI_FORMAT_BC7_UNORM || format === DXGI_FORMAT_BC7_UNORM_SRGB ) {
					format = 'dxt10'
				} else {
					throw new Error(`Unsupported DX10 texture format ${format}`)
				}
	
				break
			default:
				throw new Error(`Unsupported FourCC code: ${ddsLib.int32ToFourCC(fourCC)}`)
		}
	
		const flags       = header[off_flags]
		const mipmapCount = (flags & DDSD_MIPMAPCOUNT) ? Math.max(1, header[off_mipmapCount]) : 1
	
		const caps2 = header[off_caps2]
		
		if (caps2 & DDSCAPS2_CUBEMAP) {
			throw new Error('This version does not support cube maps')
		}
	
		let width       = header[off_width]
		let height      = header[off_height]
		const texWidth  = width
		const texHeight = height
		const images    = []
		let dataOffset  = header[off_size] + 4
		let dataLength
	
		if (fourCC === FOURCC_DX10) { dataOffset += 20 }
	
		for (let i = 0; i < mipmapCount; i++) {
			dataLength = Math.max(4, width) / 4 * Math.max(4, height) / 4 * blockBytes
	
			images.push({
				offset : dataOffset,
				length : dataLength,
				shape  : [width, height],
			})
	
			dataOffset += dataLength
	
			width  = Math.floor(width / 2)
			height = Math.floor(height / 2)
		}
		
	
		return {
			flags  : flags,
			format : format,
			images : images,
			shape  : [texWidth, texHeight],
		}
	},

	decode : (imageDataView, width, height, format = 'dxt1') => {
		switch (format.toLowerCase()) {
			case 'dxt1':
				return ddsLib.BC1(imageDataView, width, height)
			case 'dxt2':
				return ddsLib.BC2(imageDataView, width, height, true)
			case 'dxt3':
				return ddsLib.BC2(imageDataView, width, height, false)
			case 'dxt4':
				return ddsLib.BC3(imageDataView, width, height, true)
			case 'dxt5':
				return ddsLib.BC3(imageDataView, width, height, false)
			case 'dxt10':
				throw new Error('Cannot decode dxt10 Images')
			default:
				throw new Error(`Unknown DXT format : '${format}'`)
		}
	},

	BC1 : (imageData, width, height) => {
		const rgba     = new Uint8Array(width * height * 4)
		const height_4 = (height / 4) | 0
		const width_4  = (width / 4) | 0
		let offset     = 0
		let colorValues
		let colorIndices
		let colorIndex
		let pixelIndex
		let rgbaIndex
		let h
		let w
		let x
		let y

		for (h = 0; h < height_4; h++) {
			for (w = 0; w < width_4; w++) {
				colorValues  = ddsLib.interpolateColorValues(imageData.getUint16(offset, true), imageData.getUint16(offset + 2, true), true)
				colorIndices = imageData.getUint32(offset + 4, true)

				for (y = 0; y < 4; y++) {
					for (x = 0; x < 4; x++) {
						pixelIndex = (3 - x) + (y * 4)
						rgbaIndex = (h * 4 + 3 - y) * width * 4 + (w * 4 + x) * 4
						colorIndex = (colorIndices >> (2 * (15 - pixelIndex))) & 0x03
						rgba[rgbaIndex]     = colorValues[colorIndex * 4]
						rgba[rgbaIndex + 1] = colorValues[colorIndex * 4 + 1]
						rgba[rgbaIndex + 2] = colorValues[colorIndex * 4 + 2]
						rgba[rgbaIndex + 3] = colorValues[colorIndex * 4 + 3]
					}
				}

				offset += 8
			}
		}

		return rgba
	},
	BC2 : (imageData, width, height, premultiplied) => {
		const rgba     = new Uint8Array(width * height * 4)
		const height_4 = (height / 4) | 0
		const width_4  = (width / 4) | 0
		let offset = 0
		let alphaValues
		let alphaValue
		let multiplier
		let colorValues
		let colorIndices
		let colorIndex
		let pixelIndex
		let rgbaIndex
		let h
		let w
		let x
		let y
	
		for (h = 0; h < height_4; h++) {
			for (w = 0; w < width_4; w++) {
				alphaValues = [
					imageData.getUint16(offset + 6, true),
					imageData.getUint16(offset + 4, true),
					imageData.getUint16(offset + 2, true),
					imageData.getUint16(offset, true)
				] // reordered as big endian
	
				colorValues = ddsLib.interpolateColorValues(
					imageData.getUint16(offset + 8, true),
					imageData.getUint16(offset + 10, true)
				)
				colorIndices = imageData.getUint32(offset + 12, true)
	
				for (y = 0; y < 4; y++) {
					for (x = 0; x < 4; x++) {
						pixelIndex = (3 - x) + (y * 4)
						rgbaIndex  = (h * 4 + 3 - y) * width * 4 + (w * 4 + x) * 4
						colorIndex = (colorIndices >> (2 * (15 - pixelIndex))) & 0x03
						alphaValue = ddsLib.getAlphaValueBC2(alphaValues, pixelIndex)
	
						multiplier = premultiplied ? 255 / alphaValue : 1
	
						rgba[rgbaIndex]     = ddsLib.multiply(colorValues[colorIndex * 4], multiplier)
						rgba[rgbaIndex + 1] = ddsLib.multiply(colorValues[colorIndex * 4 + 1], multiplier)
						rgba[rgbaIndex + 2] = ddsLib.multiply(colorValues[colorIndex * 4 + 2], multiplier)
						rgba[rgbaIndex + 3] = ddsLib.getAlphaValueBC2(alphaValues, pixelIndex)
					}
				}
	
				offset += 16
			}
		}
	
		return rgba
	},
	BC3 : (imageData, width, height, premultiplied) => {
		const rgba     = new Uint8Array(width * height * 4)
		const height_4 = (height / 4) | 0
		const width_4  = (width / 4) | 0
		let offset = 0
		let alphaValues
		let alphaIndices
		let alphaIndex
		let alphaValue
		let multiplier
		let colorValues
		let colorIndices
		let colorIndex
		let pixelIndex
		let rgbaIndex
		let h
		let w
		let x
		let y
	
		for (h = 0; h < height_4; h++) {
			for (w = 0; w < width_4; w++) {
				alphaValues = ddsLib.interpolateAlphaValues(
					imageData.getUint8(offset, true),
					imageData.getUint8(offset + 1, true),
					false
				)
				alphaIndices = [
					imageData.getUint16(offset + 6, true),
					imageData.getUint16(offset + 4, true),
					imageData.getUint16(offset + 2, true)
				] // reordered as big endian
	
				colorValues = ddsLib.interpolateColorValues(
					imageData.getUint16(offset + 8, true),
					imageData.getUint16(offset + 10, true)
				)
				colorIndices = imageData.getUint32(offset + 12, true)
	
				for (y = 0; y < 4; y++) {
					for (x = 0; x < 4; x++) {
						pixelIndex = (3 - x) + (y * 4)
						rgbaIndex  = (h * 4 + 3 - y) * width * 4 + (w * 4 + x) * 4
						colorIndex = (colorIndices >> (2 * (15 - pixelIndex))) & 0x03
						alphaIndex = ddsLib.getAlphaIndexBC3(alphaIndices, pixelIndex)
						alphaValue = alphaValues[alphaIndex]
	
						multiplier = premultiplied ? 255 / alphaValue : 1
	
						rgba[rgbaIndex]     = ddsLib.multiply(colorValues[colorIndex * 4], multiplier)
						rgba[rgbaIndex + 1] = ddsLib.multiply(colorValues[colorIndex * 4 + 1], multiplier)
						rgba[rgbaIndex + 2] = ddsLib.multiply(colorValues[colorIndex * 4 + 2], multiplier)
						rgba[rgbaIndex + 3] = alphaValue
					}
				}
	
				offset += 16
			}
		}
	
		return rgba
	},
}


class ddsDecoder {
	#convertProg    = null
	#convertFlags_o = '-pow2 -px new_ -f DXT5 -srgb'
	#convertFlags_a = '-pow2 -px new_ -f DXT5 -srgb'
	#tempFolder     = null

	constructor(converter, tempFolder) {
		this.#convertProg = converter
		this.#tempFolder  = path.join(tempFolder, `fsgMod_this.${this.#getRand()}`)
	}

	#getRand(length = 5) {
		return 'x'.repeat(length).replace(/./g, () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62) ] )
	}

	clearTemp() {
		if ( fs.existsSync(this.#tempFolder) ) {
			try { fs.rmdirSync(this.#tempFolder) } catch { /* Don't care */ }
		}
	}

	async parseDDS(fileBuffer, hasAlpha = false, mapCrop = false) {
		let realBuffer  = fileBuffer
		let ddsData     = null

		if ( realBuffer === null ) { return null }
		
		try {
			ddsData   = ddsLib.parseHeaders(realBuffer)
		} catch (err) {
			throw new Error(`DDS Header Error: ${err}`)
		}

		try {
			if ( process.platform === 'win32' && ddsData.format === 'dxt10' && this.#convertProg !== null && this.#tempFolder !== null ) {
				// If DXT10, convert to DXT5/BC3 and reload the file
				const tempFileNameIN  = `${this.#getRand(6)}.dds`
				const tempFileNameOUT = `new_${tempFileNameIN}`

				if ( !fs.existsSync(this.#tempFolder) ) { fs.mkdirSync(this.#tempFolder) }

				fs.writeFileSync(path.join(this.#tempFolder, tempFileNameIN), Buffer.from(realBuffer))
				cp.execSync(`"${this.#convertProg}" "${path.join(this.#tempFolder, tempFileNameIN)}" ${hasAlpha ? this.#convertFlags_a : this.#convertFlags_o} -o "${this.#tempFolder}"`)

				realBuffer = fs.readFileSync(path.join(this.#tempFolder, tempFileNameOUT)).buffer
				ddsData    = ddsLib.parseHeaders(realBuffer)

				fs.rmSync(path.join(this.#tempFolder, tempFileNameIN))
				fs.rmSync(path.join(this.#tempFolder, tempFileNameOUT))
			}
		} catch (err) {
			throw new Error(`DDS DXT10 Conversion Error: ${err}`)
		}

		try {
			// get the first mipmap texture
			const image         = ddsData.images[0]
			const imageWidth    = image.shape[0]
			const imageHeight   = image.shape[1]
			const imageDataView = new DataView(realBuffer, image.offset, image.length)

			// convert the DXT texture to an Uint8Array containing RGBA data
			const rgbaData = ddsLib.decode(imageDataView, imageWidth, imageHeight, ddsData.format)

			// convert to WEBP
			return await vipsPromise.then((vReady) => {
				let newImage = vReady.Image.newFromMemory(rgbaData, imageWidth, imageHeight, 4, vReady.BandFormat.uchar)

				const origWidth  = newImage.width
				const origHeight = newImage.height

				if ( mapCrop ) {
					newImage = newImage.crop(origWidth/4, origHeight/4, origWidth/2, origHeight/2)
					newImage = newImage.resize(0.5)
				} else if ( origWidth === 512 ) {
					newImage = newImage.resize(0.5)
				} else if ( origWidth === 1024 ) {
					newImage = newImage.resize(0.25)
				}
				
				const webpBuffer = newImage.writeToBuffer('.webp')
				newImage = null

				return `data:image/webp;base64, ${btoa(String.fromCharCode.apply(null, webpBuffer))}`
			}).catch((err) => {
				throw new Error(`WEBP Encode Error: ${err}`)
			})
		} catch (err) {
			throw new Error(`DDS Decode Error: ${err}`)
		}
	}
}

module.exports = {
	ddsDecoder     : ddsDecoder,
	modFileChecker : modFileChecker,
	modLooker      : modLooker,
	requiredItems  : requiredItems,
}