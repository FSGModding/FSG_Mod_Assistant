/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Mod Checker Class

const fs        = require('fs')
const path      = require('path')
const admZip    = require('adm-zip')
const glob      = require('glob')
const xml2js    = require('xml2js')
const crypto    = require('crypto')
const { decodeDXT, parseDDS }  = require('./ddsLibrary')
const JPEG      = require('jpeg-js')


class modFileCollection {
	#ignoreList = [
		'^npm-debug\\.log$',
		'^\\..*\\.swp$',
		'^Thumbs\\.db$',
		'^thumbs\\.db$',
		'^ehthumbs\\.db$',
		'^Desktop\\.ini$',
		'^desktop\\.ini$',
		'@eaDir$',
	]
	#junkRegex = new RegExp(this.#ignoreList.join('|'))

	#bindConflict                   = {}
	#map_CollectionToFolder         = {}
	#map_CollectionToFolderRelative = {}
	#map_CollectionToFullName       = {}
	#map_CollectionToName           = {}
	#map_FolderContents             = {}
	#map_FolderToCollection         = {}
	#map_ModUUIDToShortName         = {}
	#set_Collections                = new Set()

	#modHubList    = { 'mods' : {}, 'last' : [] }
	#modHubVersion = {}

	#list_allMods = {}
	#list_newMods = new Set()

	#log                 = null
	#loadingWindow       = {}
	#localeFunction      = null
	#map_CollectionNotes = null
	#modCache            = {}
	#modCacheStore       = {}
	#settings            = null

	#userHome        = ''
	#useSyncSafeMode = false
	#skipCache       = false

	#scanPromise = []

	constructor(logger, notes, cache, homeDir, loadingWindow, settings, locale, skipCache = false) {
		this.#modCache            = cache
		this.#log                 = logger
		this.#map_CollectionNotes = notes
		this.#userHome            = homeDir
		this.#skipCache           = skipCache
		this.#loadingWindow       = loadingWindow
		this.#localeFunction      = locale
		this.#settings            = settings
	}

	mapFolderToCollection(folder) {
		return this.#map_FolderToCollection[folder] || null
	}
	mapCollectionToFolder(collectKey) {
		return this.#map_CollectionToFolder[collectKey]
	}
	mapCollectionToName(collectKey) {
		return this.#map_CollectionToName[collectKey]
	}
	mapCollectionToFullName(collectKey) {
		return this.#map_CollectionToFullName[collectKey]
	}

	set newCollectionOrder(newSetOrder) { this.#set_Collections = newSetOrder }

	removeCollection(collectKey) {
		const thisRealPath = this.#map_CollectionToFolder[collectKey]

		this.#set_Collections.delete(collectKey)
		
		delete this.#map_FolderToCollection[thisRealPath]
		delete this.#list_allMods[collectKey]
		delete this.#map_FolderContents[collectKey]
		delete this.#map_CollectionToFolder[collectKey]
		delete this.#map_CollectionToFolderRelative[collectKey]
		delete this.#map_CollectionToName[collectKey]
		delete this.#map_CollectionToFullName[collectKey]
	}

	get bindConflict() { return this.#bindConflict }
	get collections() { return this.#set_Collections }

	getModListFromCollection(collectKey) {
		return Object.values(this.#list_allMods[collectKey].mods)
	}
	getModCollection(collectKey) {
		return this.#list_allMods[collectKey]
	}

	get modHubList()           { return this.#modHubList }
	set modHubList(newList)    { this.#modHubList = newList }
	get modHubVersion()        { return this.#modHubVersion }
	set modHubVersion(newList) { this.#modHubVersion  = newList }

	modHubFullRecord(thisMod, asArray = true) {
		/* Return [ID, Version, Recent] */
		const modHubID = this.modHubModRecord(thisMod)

		if ( asArray ) {
			return [
				modHubID,
				this.modHubVersionModHubId(modHubID),
				this.#modHubList.last.includes(modHubID)
			]
		}

		return {
			id      : modHubID,
			version : this.modHubVersionModHubId(modHubID),
			recent  : this.#modHubList.last.includes(modHubID),
		}
	}
	modHubModRecord(thisMod) {
		return this.#modHubList.mods[thisMod.fileDetail.shortName] || null
	}
	modHubModUUID(modUUID) {
		return this.#modHubList.mods[this.#map_ModUUIDToShortName[modUUID]] || null
	}
	modHubVersionUUID(modUUID) {
		return this.#modHubVersion[this.modHubModUUID(modUUID)] || null
	}
	modHubVersionModRecord(thisMod) {
		return this.#modHubVersion[this.modHubModRecord(thisMod)] || null
	}
	modHubVersionModHubId(modHubID) {
		return this.#modHubVersion[modHubID] || null
	}

	modColUUIDToRecord(ID) {
		const idParts = ID.split('--')
		return this.#list_allMods?.[idParts[0]]?.mods?.[idParts[1]] || null
	}

	modColUUIDToFolder(ID) {
		const idParts = ID.split('--')
		return this.#map_CollectionToFolder[idParts[0]]
	}

	modColUUIDsToRecords(IDs) {
		return IDs.map((thisColUUID) => this.modColUUIDToRecord(thisColUUID))
	}

	modColAndUUID(collectKey, modKey) {
		return this.#list_allMods[collectKey].mods[modKey]
	}

	clearAll() {
		this.#scanPromise                    = []
		this.#map_FolderContents             = {}
		this.#map_CollectionToFolder         = {}
		this.#map_CollectionToFolderRelative = {}
		this.#map_FolderToCollection         = {}
		this.#map_CollectionToName           = {}
		this.#map_CollectionToFullName       = {}
		this.#map_ModUUIDToShortName         = {}
		this.#list_allMods                   = {}
		this.#list_newMods                   = new Set()
		this.#set_Collections.clear()
	}

	set syncSafe(mode) { this.#useSyncSafeMode = mode }

	addCollection(folder) {
		const goodFolderContents = []
		const thisFolderKey      = this.#getMD5Hash(folder, 'col_')
		const thisRealPath       = path.normalize(folder)
		const thisShortName      = path.basename(thisRealPath)
		const thisFullName       = this.#populateFullName(thisFolderKey, thisShortName)

		try {
			const folderContents = fs.readdirSync(thisRealPath, {withFileTypes : true})

			for ( const thisFile of folderContents ) {
				if ( !this.#junkRegex.test(thisFile.name) ) { goodFolderContents.push(thisFile) }
			}
		} catch (e) {
			this.#log.log.danger(`Couldn't read folder: ${thisRealPath} :: ${e}`, 'collection-reader')
			return null
		}

		this.#set_Collections.add(thisFolderKey)
		this.#list_allMods[thisFolderKey] = {
			alphaSort  : [],
			dependSet  : new Set(),
			folderSize : 0,
			fullName   : thisFullName,
			mods       : {},
			modSet     : new Set(),
			name       : thisShortName,
		}

		this.#map_FolderContents             [thisFolderKey] = goodFolderContents
		this.#map_CollectionToFolder         [thisFolderKey] = thisRealPath
		this.#map_CollectionToFolderRelative [thisFolderKey] = this.#toHomeDir(thisRealPath)
		this.#map_FolderToCollection         [thisRealPath]  = thisFolderKey
		this.#map_CollectionToName           [thisFolderKey] = thisShortName
		this.#map_CollectionToFullName       [thisFolderKey] = thisFullName

		return {
			collectKey : thisFolderKey,
			fileCount  : goodFolderContents.length,
		}
	}

	async processMods() {
		this.#modCacheStore = this.#modCache.store

		for ( const collectKey of this.#set_Collections ) {
			for ( const thisFile of this.#map_FolderContents[collectKey] ) {
				this.#scanPromise.push(this.#addMod(collectKey, thisFile))
			}
		}

		Promise.all(this.#scanPromise).then(() => {
			this.#modCache.store = this.#modCacheStore
			this.#doAlphaSort()
			this.#processBindConflicts()
		})
	}

	get processPromise() { return Promise.all(this.#scanPromise) }

	#doAlphaSort() {
		for ( const collectKey of this.#set_Collections ) {
			this.#list_allMods[collectKey].alphaSort.sort()
		}
	}

	#cacheHit(thisFileStats) {
		if ( thisFileStats.folder || this.#skipCache || thisFileStats.hashString === null ) { return false }

		return this.#modCacheStore[thisFileStats.hashString] ?? false
	}

	#fileStats(collectKey, thisFile) {
		const folderLoc = this.#map_CollectionToFolder[collectKey]
		const fullPath  = path.join(folderLoc, thisFile.name)
		const fileStats = {
			isFolder   : null,
			date       : null,
			birthDate  : null,
			size       : null,
			error      : false,
			hashString : null,
			fullPath   : fullPath,
		}

		try {
			if ( thisFile.isSymbolicLink() ) {
				const thisSymLink     = fs.readlinkSync(fullPath)
				const thisSymLinkStat = fs.lstatSync(path.join(folderLoc, thisSymLink))

				fileStats.isFolder  = thisSymLinkStat.isDirectory()
				fileStats.date      = thisSymLinkStat.ctime
				fileStats.birthDate = thisSymLinkStat.birthtime

				if ( !fileStats.isFolder ) { fileStats.size = thisSymLinkStat.size }
			} else {
				const theseStats = fs.statSync(fullPath)

				fileStats.isFolder = thisFile.isDirectory()
				fileStats.date     = theseStats.ctime
				fileStats.birthDate = theseStats.birthtime

				if ( !fileStats.isFolder ) { fileStats.size = theseStats.size }
			}

			if ( fileStats.isFolder ) {
				let bytes = 0
				for ( const file of glob.sync('**', { cwd : path.join(fullPath) })) {
					try {
						const stats = fs.statSync(path.join(fullPath, file))
						if ( stats.isFile() ) { bytes += stats.size }
					} catch { /* Do Nothing if we can't read it. */ }
				}
				fileStats.size = bytes
			} else {
				fileStats.hashString = this.#getMD5Hash(`${thisFile.name}-${fileStats.size}-${(this.#useSyncSafeMode)?fileStats.birthDate.toISOString():fileStats.date.toISOString()}`)
			}
		} catch (e) {
			this.#log.log.warning(`Unable to stat file ${thisFile.name} in ${folderLoc} : ${e}`, 'file-stat')
			fileStats.isFolder  = false
			fileStats.size      = 0
			fileStats.date      = new Date(1969, 1, 1, 0, 0, 0, 0)
			fileStats.birthDate = new Date(1969, 1, 1, 0, 0, 0, 0)
			fileStats.error     = true
		}
		return fileStats
	}

	#addModToData(collectKey, modRecord) {
		const thisModRecord = { ...modRecord }

		thisModRecord.currentCollection = collectKey
		thisModRecord.colUUID           = `${collectKey}--${thisModRecord.uuid}`
		thisModRecord.modHub            = this.modHubFullRecord(thisModRecord, false)

		const dVer = thisModRecord.modDesc.descVersion

		switch ( true ) {
			case ( dVer >= 4 && dVer <= 6 ) :
				thisModRecord.gameVersion = 11
				break
			case ( dVer >= 9 && dVer <= 16 ) :
				thisModRecord.gameVersion = 13
				break
			case ( dVer >= 20 && dVer <= 25 ) :
				thisModRecord.gameVersion = 15
				break
			case ( dVer >= 31 && dVer <= 39 ) :
				thisModRecord.gameVersion = 17
				break
			case ( dVer >= 40 && dVer <= 53 ) :
				thisModRecord.gameVersion = 19
				break
			case ( dVer >= 60 ) :
				thisModRecord.gameVersion = 22
				break
			default :
				thisModRecord.gameVersion = 0
				break
		}

		this.#map_ModUUIDToShortName[thisModRecord.uuid] = thisModRecord.fileDetail.shortName
		this.#list_allMods[collectKey].mods[thisModRecord.uuid] = thisModRecord
		this.#list_allMods[collectKey].folderSize += thisModRecord.fileDetail.fileSize
		this.#list_allMods[collectKey].modSet.add(thisModRecord.uuid)
		this.#list_allMods[collectKey].dependSet.add(thisModRecord.fileDetail.shortName)
		this.#list_allMods[collectKey].alphaSort.push(`${thisModRecord.fileDetail.shortName}::${thisModRecord.uuid}`)
	}

	#processBindConflicts() {
		this.#bindConflict = {}

		for ( const collectKey of this.#set_Collections ) {
			this.#bindConflict[collectKey] = {}

			const collectionBinds    = {}

			for ( const modUUID of this.#list_allMods[collectKey].modSet ) {
				const thisMod = this.#list_allMods[collectKey].mods[modUUID]

				for ( const actName in thisMod.modDesc.binds ) {
					for ( const keyCombo of thisMod.modDesc.binds[actName] ) {
						if ( keyCombo === '' ) { return }

						const safeCat   = thisMod.modDesc.actions[actName] || 'UNKNOWN'
						const thisCombo = `${safeCat}--${keyCombo}`

						collectionBinds[thisCombo] ??= []
						collectionBinds[thisCombo].push(thisMod.fileDetail.shortName)
					}
				}
			}

			for ( const keyCombo in collectionBinds ) {
				if ( collectionBinds[keyCombo].length > 1 ) {
					for ( const modName of collectionBinds[keyCombo]) {
						this.#bindConflict[collectKey][modName] ??= {}
						this.#bindConflict[collectKey][modName][keyCombo] = collectionBinds[keyCombo].filter((w) => w !== modName)
						if ( this.#bindConflict[collectKey][modName][keyCombo].length === 0 ) {
							delete this.#bindConflict[collectKey][modName][keyCombo]
						}
					}
				}
			}
		}

		for ( const collectKey in this.#bindConflict ) {
			for ( const modName in this.#bindConflict[collectKey] ) {
				if ( Object.keys(this.#bindConflict[collectKey][modName]).length === 0 ) {
					delete this.#bindConflict[collectKey][modName]
				}
			}
		}
	}

	#addMod(collectKey, thisFile) {
		return new Promise((resolve) => {
			let isDone = false
			const thisFileStats = this.#fileStats(collectKey, thisFile)

			// Check cache
			const modInCache    = this.#cacheHit(thisFileStats)
			if ( modInCache ) {
				this.#log.log.debug(`Adding mod FROM cache: ${modInCache.fileDetail.shortName}`, `mod-${modInCache.uuid}`)
				this.#addModToData(collectKey, modInCache)
				this.#loadingWindow.count()
				isDone = true
				resolve(true)
			}
		
			if ( !isDone && !thisFileStats.isFolder && !thisFile.name.endsWith('.zip') ) {
				const thisModRecord = new notModFileChecker(
					thisFileStats.fullPath,
					false,
					thisFileStats.size,
					thisFileStats.date,
					this.#log
				)
				this.#addModToData(collectKey, thisModRecord)
				this.#loadingWindow.count()
				isDone = true
				resolve(true)
			}
		
			if ( !isDone) {
				try {
					const thisModRecord = new modFileChecker(
						thisFileStats.fullPath,
						thisFileStats.isFolder,
						thisFileStats.size,
						(this.#useSyncSafeMode) ? thisFileStats.birthDate : thisFileStats.date,
						thisFileStats.hashString,
						this.#log,
						this.#localeFunction
					)

					thisModRecord.doTests().then(() => {
						const thisModRecordStore = thisModRecord.storable

						this.#addModToData(collectKey, thisModRecordStore)

						if ( thisFileStats.hashString !== null && !thisModRecordStore.canNotUse ) {
							this.#log.log.info('Adding mod to cache', `mod-${thisModRecordStore.uuid}`)
							this.#list_newMods.add(thisFileStats.hashString)
							this.#modCacheStore[thisFileStats.hashString] = thisModRecordStore
						}
					})
				} catch (e) {
					this.#log.log.danger(`Couldn't process file: ${thisFileStats.fullPath} :: ${e}`, 'collection-reader')
					const thisModRecord = new notModFileChecker(
						thisFileStats.fullPath,
						false,
						thisFileStats.size,
						thisFileStats.date,
						this.#log
					)
					this.#addModToData(collectKey, thisModRecord)
				} finally {
					this.#loadingWindow.count()
					resolve(true)
				}
			}
		})
	}

	#doNotesDefault() {
		const currentOptions = this.#map_CollectionNotes.store
		const defaults = {
			notes_favorite  : false,
			notes_tagline   : null,
			notes_username  : null,
			notes_server    : null,
			notes_password  : null,
			notes_website   : null,
			notes_websiteDL : false,
			notes_admin     : null,
			notes_notes     : null,
			notes_version   : 22,
		}
		const safeOptions = {}

		for ( const collectKey of this.#set_Collections ) {
			safeOptions[collectKey] = {}
			for ( const optName in defaults ) {
				safeOptions[collectKey][optName] = currentOptions?.[collectKey]?.[optName] || defaults[optName]
			}
		}
		return safeOptions
	}

	async toRenderer(extra = null) {
		return Promise.all(this.#scanPromise).then(() => {
			return {
				appSettings                : this.#settings.store,
				currentLocale              : this.#localeFunction(),
				opts                       : extra,
				bindConflict               : this.#bindConflict,
				modList                    : this.#list_allMods,
				set_Collections            : this.#set_Collections,
				collectionToFolder         : this.#map_CollectionToFolder,
				collectionToFolderRelative : this.#map_CollectionToFolderRelative,
				folderToCollection         : this.#map_FolderToCollection,
				collectionToName           : this.#map_CollectionToName,
				collectionToFullName       : this.#map_CollectionToFullName,
				collectionNotes            : this.#doNotesDefault(),
				newMods                    : this.#list_newMods,
				modHub                     : {
					list    : this.#modHubList,
					version : this.#modHubVersion,
				},
			}
		})
	}

	#toHomeDir(folder) {
		return folder.replaceAll(this.#userHome, '~')
	}

	#populateFullName(collectKey, shortName) {
		const tagLine  = this.#map_CollectionNotes.get(`${collectKey}.notes_tagline`, null)
		
		return `${shortName}${tagLine === null ? '' : ` [${tagLine}]`}`
	}

	getFolderHash(folder) {
		return this.#getMD5Hash(folder, 'col_')
	}
	
	#getMD5Hash(text, prefix = '') {
		return `${prefix}${crypto.createHash('md5').update(text).digest('hex')}`
	}
}

class modFileChecker {
	#maxFilesType = { grle : 10, png : 128, txt : 2, pdf : 1 }

	#fileSizeMap = {
		dds    : ( 12 * 1024 * 1024 ),
		xml    : ( 0.25 * 1024 * 1024 ),
		shapes : ( 256 * 1024 * 1024 ),
		cache  : ( 10 * 1024 * 1024 ),
		gdm    : ( 18 * 1024 * 1024 ),
	}

	#failFlags = {
		first_digit        : false,
		probable_copy      : false,
		probable_zippack   : false,
		other_archive      : false,
		name_failed        : false,
		garbage_file       : false,
		bad_zip            : false,
		no_modDesc         : false,
		bad_modDesc        : false,
		bad_modDesc_no_rec : false,
		bad_modDesc_ver    : false,
		no_modVer          : false,
		no_modIcon         : false,
		folder_needs_zip   : false,
		might_be_crack     : false,
		has_extra_files    : false,
		png_texture        : false,
		dds_too_big        : false, // 12MB
		xml_too_big        : false, // 0.25MB
		i3d_too_big        : false, // 10MB
		shapes_too_big     : false, // 256MB
		gdm_too_big        : false, // 18MB
		grle_too_many      : false, // 10
		png_too_many       : false, // 128
		pdf_too_many       : false,
		txt_too_many       : false,
		space_in_file      : false, // (internal files)
		l10n_not_set       : false, // set on processL10n if either null
	}
	#failMessages = {
		first_digit        : 'FILE_ERROR_NAME_STARTS_DIGIT',
		probable_copy      : 'FILE_ERROR_LIKELY_COPY',
		probable_zippack   : 'FILE_ERROR_LIKELY_ZIP_PACK',
		other_archive      : 'FILE_ERROR_UNSUPPORTED_ARCHIVE',
		name_failed        : 'FILE_ERROR_NAME_INVALID',
		garbage_file       : 'FILE_ERROR_GARBAGE_FILE',
		bad_zip            : 'FILE_ERROR_UNREADABLE_ZIP',
		no_modDesc         : 'NOT_MOD_MODDESC_MISSING',
		bad_modDesc        : 'MOD_ERROR_MODDESC_DAMAGED_RECOVERABLE',
		bad_modDesc_no_rec : 'NOT_MOD_MODDESC_PARSE_ERROR',
		bad_modDesc_ver    : 'NOT_MOD_MODDESC_VERSION_OLD_OR_MISSING',
		no_modVer          : 'MOD_ERROR_NO_MOD_VERSION',
		no_modIcon         : 'MOD_ERROR_NO_MOD_ICON',
		folder_needs_zip   : 'INFO_NO_MULTIPLAYER_UNZIPPED',
		might_be_crack     : 'INFO_MIGHT_BE_PIRACY',
		has_extra_files    : 'PERF_HAS_EXTRA',
		png_texture        : 'PREF_PNG_TEXTURE',
		dds_too_big        : 'PERF_DDS_TOO_BIG', // 12MB
		xml_too_big        : 'PERF_XML_TOO_BIG', // 0.25MB
		i3d_too_big        : 'PERF_I3D_TOO_BIG', // 10MB
		shapes_too_big     : 'PERF_SHAPES_TOO_BIG', // 256MB
		gdm_too_big        : 'PERF_GDM_TOO_BIG', // 18MB
		grle_too_many      : 'PERF_GRLE_TOO_MANY', // 10
		pdf_too_many       : 'PERF_PDF_TOO_MANY', // 1
		txt_too_many       : 'PERF_TXT_TOO_MANY', // 2
		png_too_many       : 'PERF_PNG_TOO_MANY', // 128
		space_in_file      : 'PERF_SPACE_IN_FILE', // (internal files)
		l10n_not_set       : 'PERF_L10N_NOT_SET', // set on processL10n if either null
	}

	#flags_broken = [
		'first_digit', 'probable_copy', 'probable_zippack',
		'other_archive', 'name_failed', 'garbage_file',
		'bad_zip', 'no_modDesc', 'bad_modDesc_no_rec',
		'bad_modDesc_ver', 'no_modVer',
	]

	#flags_problem = [
		'might_be_crack', 'bad_modDesc', 'dds_too_big', 'xml_too_big',
		'i3d_too_big', 'shapes_too_big', 'gdm_too_big', 'grle_too_many',
		'png_too_many', 'space_in_file', 'l10n_not_set', 'has_extra_files',
		'png_texture', 'pdf_too_many', 'txt_too_many', 'no_modIcon',
	]

	modDesc = {
		actions        : {},
		binds          : {},
		descVersion    : 0,
		version        : '0.0.0.0',
		author         : 'n/a',
		storeItems     : 0,
		scriptFiles    : 0,
		iconFileName   : false,
		iconImageCache : null,
		multiPlayer    : false,
		xmlDoc         : false,
		xmlParsed      : false,
		depend         : [],
	}

	issues = []

	l10n = {
		title       : null,
		description : null,
	}

	md5Sum            = null
	uuid              = null
	currentCollection = null

	fileDetail = {
		isFolder    : false,
		fullPath    : false,
		shortName   : false,
		fileSize    : 0,
		fileDate    : null,
		copyName    : false,
		imageNonDDS : [],
		imageDDS    : [],
		i3dFiles    : [],
		extraFiles  : [],
		tooBigFiles : [],
		spaceFiles  : [],
		pngTexture  : [],
	}

	badges        = ''
	canNotUse     = false
	currentLocale = null

	#locale         = false
	#log            = null
	#logUUID        = null
	
	constructor( filePath, isFolder, size, date, md5Pre = null, log = null, locale = null ) {
		this.fileDetail.fullPath = filePath
		this.fileDetail.isFolder = isFolder
		this.fileDetail.fileSize = size
		this.fileDetail.fileDate = date.toISOString()

		this.#locale   = locale
		this.#log      = log
		
		this.md5Sum    = md5Pre

		this.fileDetail.shortName = path.parse(this.fileDetail.fullPath).name

		this.#failFlags.folder_needs_zip = this.fileDetail.isFolder
	}

	async doTests() {
		this.uuid     = crypto.createHash('md5').update(this.fileDetail.fullPath).digest('hex')
		this.#logUUID  = `mod-${this.uuid}`
		this.#log.log.info(`Adding Mod File: ${this.fileDetail.shortName}`, this.#logUUID)
		
		if ( ! this.#isFileNameBad() ) {
			if ( ! this.fileDetail.isFolder ) {
				this.#testZip().then(() => {
					this.#doneTest()
				})
				
			} else {
				this.#testFolder().then(() => {
					this.#doneTest()
				})
			}
		} else {
			this.#doneTest()
		}
	}

	get debugDump() {
		const retObj = this.storable
		if ( retObj.modDesc.iconImageCache !== null ) {
			retObj.modDesc.iconImageCache = `${retObj.modDesc.iconImageCache.length} base64 bytes`
		}
		retObj.flags = this.#failFlags
		return retObj
	}
	
	get storable() {
		const storable = {
			canNotUse         : this.canNotUse,
			md5Sum            : this.md5Sum,
			fileDetail        : this.fileDetail,
			issues            : this.issues,
			badgeArray        : this.badgeArray,
			l10n              : this.l10n,
			modDesc           : {},
			uuid              : this.uuid,
			currentCollection : this.currentCollection,
		}
		
		for ( const key in this.modDesc ) {
			if ( ! key.startsWith('xml') ) {
				storable.modDesc[key] = this.modDesc[key]
			}
		}
		return storable
	}

	populateL10n() {
		this.l10n.title       = this.#getLocalString('title')
		this.l10n.description = this.#getLocalString('description')

		if ( this.l10n.title === null || this.l10n.description === null ) {
			this.l10n.title       = 'n/a'
			this.l10n.description = ''
			this.#failFlags.l10n_not_set = true
		}
	}

	#populateIssues() {
		const issues = []
		for ( const flag in this.#failFlags ) {
			if ( this.#failFlags[flag] === true ) {
				issues.push(this.#failMessages[flag])
			}
		}
		return issues
	}

	#getLocalString(key) {
		if ( this.modDesc.xmlParsed === false ) { return null }
		
		if ( ! this.#nestedXMLProperty(`moddesc.${key.toLowerCase()}`) ) {
			return null
		}
		const searchTree = this.modDesc.xmlParsed.moddesc[key.toLowerCase()][0]

		if ( Object.prototype.hasOwnProperty.call(searchTree, this.#locale()) ) {
			return searchTree[this.#locale()][0].trim()
		}
		if ( Object.prototype.hasOwnProperty.call(searchTree, 'en') ) {
			return searchTree.en[0].trim()
		}
		if ( Object.prototype.hasOwnProperty.call(searchTree, 'de') ) {
			return searchTree.de[0].trim()
		}
		return null
	}

	#getBadges() {
		const badges = {
			broken  : false,
			problem : false,
			noMP    : ! this.modDesc.multiPlayer,
			PCOnly  : (this.modDesc.scriptFiles > 0),
			folder  : this.fileDetail.isFolder,
			notmod  : this.#failFlags.no_modDesc,
		}

		if ( this.fileDetail.isFolder ) { badges.noMP = true }

		for ( const flag of this.#flags_broken ) {
			if ( this.#failFlags[flag] ) { badges.broken = true; this.canNotUse = true; break }
		}
		for ( const flag of this.#flags_problem ) {
			if ( this.#failFlags[flag] ) { badges.problem = true; break }
		}

		return Object.keys(badges).filter((badge) => badges[badge] === true )
	}

	#isFileNameBad() {
		const fullModPath = this.fileDetail.fullPath
		const shortName   = this.fileDetail.shortName

		if ( ! this.fileDetail.isFolder && ! fullModPath.endsWith('.zip') ) {
			if ( fullModPath.endsWith('.rar') || fullModPath.endsWith('.7z') ) {
				this.#failFlags.other_archive = true
			} else {
				this.#failFlags.garbage_file = true
			}
			this.#failFlags.name_failed = true
		}

		if ( shortName.match(/unzip/i) ) {
			this.#failFlags.probable_zippack = true
		}

		if ( shortName.match(/^[0-9]/) ) {
			this.#failFlags.first_digit = true
			this.#failFlags.name_failed = true
		}

		if ( ! shortName.match(/^[a-zA-Z_][a-zA-Z0-9_]+$/) ) {
			this.#failFlags.name_failed = true

			if ( ! this.#failFlags.first_digit && ! this.#failFlags.garbage_file ) {
				const winCopy = shortName.match(/^([a-zA-Z][a-zA-Z0-9_]+) - .+$/)
				const dlCopy  = shortName.match(/^([a-zA-Z][a-zA-Z0-9_]+) \(.+$/)

				if ( winCopy !== null ) {
					this.#failFlags.probable_copy = true
					this.fileDetail.copyName      = winCopy[1]
				}
				if ( dlCopy !== null ) {
					this.#failFlags.probable_copy = true
					this.fileDetail.copyName      = dlCopy[1]
				}
			}
		}
		return this.#failFlags.name_failed
	}

	#processModDesc() {
		const XMLOptions = {strict : true, async : false, normalizeTags : true, attrNameProcessors : [function(name) { return name.toUpperCase() }] }
		const strictXMLParser = new xml2js.Parser(XMLOptions)
			
		/* Read modDesc.xml */
		strictXMLParser.parseString(this.modDesc.xmlDoc, (err, result) => {
			if ( err !== null ) {
				/* XML Parse failed, lets try to recover */
				this.#log.log.warning(`Caught XML Parse error: ${err}`, this.#logUUID)
				this.#failFlags.bad_modDesc = true
				XMLOptions.strict = false
				const looseXMLParser = new xml2js.Parser(XMLOptions)
	
				looseXMLParser.parseString(this.modDesc.xmlDoc, (err, result) => {
					if ( err !== null ) {
						/* Couldn't recover */
						this.#log.log.warning(`Caught unrecoverable XML Parse error: ${err}`, this.#logUUID)
						this.#failFlags.bad_modDesc_no_rec = true
						return false
					}
					this.modDesc.xmlParsed = result
				})
			} else {
				this.modDesc.xmlParsed = result
			}
		})
	
		/* Get modDesc.xml version */
		if ( this.#nestedXMLProperty('moddesc.$.DESCVERSION') ) {
			this.modDesc.descVersion = parseInt(this.modDesc.xmlParsed.moddesc.$.DESCVERSION)
		} else {
			this.#failFlags.bad_modDesc_ver = true
			return false
		}
	
		/* Get MOD Version */
		if ( this.#nestedXMLProperty('moddesc.version') ) {
			this.modDesc.version = this.modDesc.xmlParsed.moddesc.version.toString()
		} else {
			this.#failFlags.no_modVer = true
			return false
		}
	
		/* Set the mod author (safe fail, I think) */
		if ( this.#nestedXMLProperty('moddesc.author') ) {
			this.modDesc.author = this.modDesc.xmlParsed.moddesc.author.toString()
		}
	
		if ( this.#nestedXMLProperty('moddesc.multiplayer') ) {
			try {
				if ( this.modDesc.xmlParsed.moddesc.multiplayer[0].$.SUPPORTED === 'true' ) {
					this.modDesc.multiPlayer = true
				}
			} catch {
				this.modDesc.multiPlayer = false
			}
		}
	
		/* Count storeitems */
		if ( this.#nestedXMLProperty('moddesc.storeitems') ) {
			try {
				this.modDesc.storeItems = this.modDesc.xmlParsed.moddesc.storeitems[0].storeitem.length
			} catch {
				this.modDesc.storeItems = 0
			}
		}
			
		/* Get icon filename */
		if ( this.#nestedXMLProperty('moddesc.iconfilename') ) {
			// NOTE: don't attempt to load png, if it's there.  We can't read it anyway
			let tempIcon = this.modDesc.xmlParsed.moddesc.iconfilename[0].toString()
			if ( ! tempIcon.endsWith('.dds') ) {
				tempIcon = `${tempIcon.slice(0, -4)}.dds`
			}
			if ( this.fileDetail.imageDDS.includes(tempIcon) ) {
				this.modDesc.iconFileName = tempIcon
			} else {
				this.#failFlags.no_modIcon = true
			}
		} else {
			this.#failFlags.no_modIcon = true
			return false
		}
	
		if ( this.#nestedXMLProperty('moddesc.productid') ) {
			this.#failFlags.might_be_crack = true
		}

		try {
			if ( this.#nestedXMLProperty('moddesc.dependencies') ) {
				for ( const dep of this.modDesc.xmlParsed.moddesc.dependencies[0].dependency ) {
					this.modDesc.depend.push(dep)
				}
			}
		} catch (e) {
			this.#log.log.warning(`Dependency processing failed : ${e}`, this.#logUUID)
		}

		try {
			if ( this.#nestedXMLProperty('moddesc.actions') ) {
				for ( const action of this.modDesc.xmlParsed.moddesc.actions[0].action ) {
					this.modDesc.actions[action.$.NAME] = action.$.CATEGORY || 'ALL'
				}
			}
			if ( this.#nestedXMLProperty('moddesc.inputbinding')) {
				for ( const action of this.modDesc.xmlParsed.moddesc.inputbinding[0].actionbinding ) {
					const thisActionName = action.$.ACTION

					for ( const binding of action.binding ) {
						if ( binding.$.DEVICE === 'KB_MOUSE_DEFAULT' ) {
							this.modDesc.binds[thisActionName] ??= []
							this.modDesc.binds[thisActionName].push(binding.$.INPUT)
						}
					}
				}
			}
		} catch (e) {
			this.#log.log.warning(`Key binding read failed : ${e}`, this.#logUUID)
		}
		return true
	}

	#doneTest() {
		this.populateL10n()
		this.badgeArray   = this.#getBadges()
		this.issues       = this.#populateIssues()
		this.currentLocal = this.#locale()
	}

	async #testZip() {
		let zipFile    = null
		let zipEntries = null

		try {
			zipFile = new admZip(this.fileDetail.fullPath)
			zipEntries = zipFile.getEntries()
		} catch (e) {
			this.#failFlags.bad_zip = true
			this.#log.log.warning(`Zip file failure: ${e}`, this.#logUUID)
			return
		}

		for ( const entry of zipEntries ) {
			this.#checkInternalFile(
				path.extname(entry.entryName),
				entry.entryName,
				entry.header.size
			)
		}
		
		this.#failFlags.grle_too_many = ( this.#maxFilesType.grle < 1 )
		this.#failFlags.png_too_many  = ( this.#maxFilesType.png < 1 )
		this.#failFlags.pdf_too_many  = ( this.#maxFilesType.pdf < 1 )
		this.#failFlags.txt_too_many  = ( this.#maxFilesType.txt < 1 )

		try {
			if ( zipFile.getEntry('modDesc.xml') === null ) {
				throw 'File does not exist'
			}
			this.modDesc.xmlDoc = zipFile.readAsText('modDesc.xml')
		} catch (e) {
			this.#failFlags.no_modDesc = true
			this.#log.log.notice(`Zip file missing modDesc.xml: ${e}`, this.#logUUID)
		}

		if ( ! this.#failFlags.no_modDesc ) {
			this.#processModDesc()
		}

		if ( this.#failFlags.bad_zip || this.#failFlags.no_modIcon ) { return }

		try {
			if ( zipFile.getEntry(this.modDesc.iconFileName) === null ) {
				throw 'File does not Exist'
			}
			const iconFile = zipFile.readFile(this.modDesc.iconFileName)
			this.#processIcon(iconFile.buffer)
		} catch (e) {
			this.#failFlags.no_modIcon = true
			this.#log.log.notice(`Caught icon fail: ${e}`, this.#logUUID)
		}

		if ( this.#failFlags.no_modDesc ) { this.md5Sum = null }

		zipFile = null
	}

	async #testFolder() {
		if ( ! fs.existsSync(path.join(this.fileDetail.fullPath, 'modDesc.xml')) ) {
			this.#failFlags.no_modDesc = true
			return false
		}

		try {
			const data = fs.readFileSync(path.join(this.fileDetail.fullPath, 'modDesc.xml'), 'utf8')
			this.modDesc.xmlDoc = data
		} catch (e) {
			this.#log.log.warning(`Couldn't read modDesc.xml: ${e}`, this.#logUUID)
			this.#failFlags.bad_modDesc = true
			return false
		}

		const allFileList  = glob.sync('**', { cwd : this.fileDetail.fullPath, mark : true })

		for ( const checkFile of allFileList ) {
			const fileStats = fs.statSync(path.join(this.fileDetail.fullPath, checkFile))

			this.#checkInternalFile(
				path.extname(checkFile),
				checkFile,
				fileStats.size
			)
		}

		this.#failFlags.grle_too_many = ( this.#maxFilesType.grle < 1 )
		this.#failFlags.png_too_many  = ( this.#maxFilesType.png < 1 )
		this.#failFlags.pdf_too_many  = ( this.#maxFilesType.pdf < 1 )
		this.#failFlags.txt_too_many  = ( this.#maxFilesType.txt < 1 )

		if ( ! this.#failFlags.no_modDesc ) {
			this.#processModDesc()
		}

		try {
			const ddsBuffer = fs.readFileSync(path.join(this.fileDetail.fullPath, this.modDesc.iconFileName), null)
			this.#processIcon(ddsBuffer.buffer)
		} catch (e) {
			this.#failFlags.no_modIcon = true
			this.#log.log.notice(`Caught icon fail: ${e}`, this.#logUUID)
		}
	}

	#nestedXMLProperty (propertyPath, passedObj = false) {
		if (!propertyPath) { return false }

		const properties = propertyPath.split('.')
		let obj = ( passedObj === false ? this.modDesc.xmlParsed : passedObj )

		for (let i = 0; i < properties.length; i++) {
			const prop = properties[i]

			if (!obj || !Object.prototype.hasOwnProperty.call(obj, prop)) {
				return false
			}
			
			obj = obj[prop]
		}

		return true
	}

	#checkInternalFile(suffix, fileName, size) {
		if ( fileName.includes(' ') ) {
			this.fileDetail.spaceFiles.push(fileName)
			this.#failFlags.space_in_file = true
		}
		
		if ( !fileName.endsWith('/') && !fileName.endsWith('\\') ) {
			switch (suffix) {
				case '.png' :
					this.#maxFilesType.png--
					this.fileDetail.imageNonDDS.push(fileName)
					this.fileDetail.pngTexture.push(fileName)
					break
				case '.dds' :
					this.fileDetail.imageDDS.push(fileName)
					if ( size > this.#fileSizeMap.dds ) {
						this.fileDetail.tooBigFiles.push(fileName)
						this.#failFlags.dds_too_big = true
					}
					break
				case '.i3d' :
					this.fileDetail.i3dFiles.push(fileName)
					break
				case '.shapes' :
					if ( size > this.#fileSizeMap.shapes ) {
						this.fileDetail.tooBigFiles.push(fileName)
						this.#failFlags.i3d_too_big = true
					}
					break
				case '.lua' :
					this.modDesc.scriptFiles++
					break
				case '.gdm' :
					if ( size > this.#fileSizeMap.gdm ) {
						this.fileDetail.tooBigFiles.push(fileName)
						this.#failFlags.gdm_too_big = true
					}
					break
				case '.cache' :
					if ( size > this.#fileSizeMap.cache ) {
						this.fileDetail.tooBigFiles.push(fileName)
						this.#failFlags.i3d_too_big = true
					}
					break
				case '.xml' :
					if ( size > this.#fileSizeMap.xml ) {
						this.fileDetail.tooBigFiles.push(fileName)
						this.#failFlags.xml_too_big = true
					}
					break
				case '.grle' :
					this.#maxFilesType.grle--
					break
				case '.pdf' :
					this.#maxFilesType.pdf--
					break
				case '.txt' :
					this.#maxFilesType.txt--
					break
				case '.l64' :
				case '.dat' :
					this.fileDetail.extraFiles.push(fileName)
					this.#failFlags.might_be_crack = true
					break
				case '.gls' :
				case '.anim' :
				case '.ogg' :
					break
				default :
					this.fileDetail.extraFiles.push(fileName)
					this.#failFlags.has_extra_files = true
			}
		}
	}

	#processIcon(buffer) {
		if ( buffer === null ) {
			this.modDesc.iconImageCache = null
			return true
		}
		try {
			const ddsData   = parseDDS(buffer)

			// get the first mipmap texture
			const image         = ddsData.images[0]
			const imageWidth    = image.shape[0]
			const imageHeight   = image.shape[1]
			const imageDataView = new DataView(buffer, image.offset, image.length)

			// convert the DXT texture to an Uint8Array containing RGBA data
			const rgbaData = decodeDXT(imageDataView, imageWidth, imageHeight, ddsData.format)

			// convert to JPEG
			const jpgData = JPEG.encode({
				width  : imageWidth,
				height : imageHeight,
				data   : rgbaData,
			}, 70)

			try {
				this.modDesc.iconImageCache = `data:image/jpeg;base64, ${jpgData.data.toString('base64')}`
			} catch {
				this.modDesc.iconImageCache = null
				return false
			}

			return false
		} catch (err) {
			this.#log.log.notice(this.fileDetail.shortName, `Unknown icon processing error: ${err}`)
			return true
		}
	}
}

class notModFileChecker {
	modDesc = {
		actions        : {},
		binds          : {},
		descVersion    : 0,
		version        : 'n/a',
		author         : 'n/a',
		storeItems     : 0,
		scriptFiles    : 0,
		iconFileName   : false,
		iconImageCache : null,
		multiPlayer    : false,
		xmlDoc         : false,
		xmlParsed      : false,
	}

	issues = [
		'FILE_ERROR_NAME_INVALID',
		'FILE_ERROR_GARBAGE_FILE',
	]

	l10n = {
		title       : 'n/a',
		description : 'n/a',
	}

	md5Sum            = null
	uuid              = null
	currentCollection = null

	fileDetail = {
		isFolder    : false,
		fullPath    : false,
		shortName   : false,
		fileSize    : 0,
		fileDate    : null,
		copyName    : false,
		imageNonDDS : [],
		imageDDS    : [],
		i3dFiles    : [],
		extraFiles  : [],
		tooBigFiles : [],
		spaceFiles  : [],
		pngTexture  : [],
	}

	badgeArray    = ['broken', 'notmod']
	canNotUse     = true
	currentLocale = null

	#log = null
	#logUUID = null

	constructor( filePath, isFolder, size, date, log = null ) {
		this.fileDetail.fullPath = filePath
		this.fileDetail.size     = size
		this.fileDetail.fileDate = date.toISOString()

		this.#log      = log
		this.uuid      = crypto.createHash('md5').update(filePath).digest('hex')
		this.#logUUID  = `mod-${this.uuid}`

		this.#log.log.info(`Adding NON Mod File: ${filePath}`, this.#logUUID)

		this.fileDetail.shortName = path.basename(this.fileDetail.fullPath)
	}
}

module.exports = {
	modFileCollection : modFileCollection,
	modFileChecker    : modFileChecker,
	notModFileChecker : notModFileChecker,
}


