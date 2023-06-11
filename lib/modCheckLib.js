/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Mod Checker Class
/*eslint complexity: ["warn", 30]*/

const fs        = require('fs')
const path      = require('path')
const admZip    = require('adm-zip')
const xml2js    = require('xml2js')
const crypto    = require('crypto')
const { decodeDXT, parseDDS }  = require('./ddsLibrary')
const { globSync }             = require('glob')
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
	#map_ShortName                  = {}
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
	get shortNames() { return this.#map_ShortName }

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
		this.#map_ShortName                  = {}
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
			this.#list_allMods[collectKey].alphaSort.sort(Intl.Collator().compare)
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
			birthDate  : null,
			date       : null,
			error      : false,
			fullPath   : fullPath,
			hashString : null,
			isFolder   : null,
			size       : null,
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
				for ( const file of globSync('**', { cwd : path.join(fullPath), stat : true, withFileTypes : true })) {
					try {
						if ( file.isFile() ) { bytes += file.size }
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

		this.#map_ShortName[thisModRecord.fileDetail.shortName] ??= []
		this.#map_ShortName[thisModRecord.fileDetail.shortName].push([collectKey, thisModRecord.uuid])

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
						if ( keyCombo === '' ) { continue }

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
			notes_add_date   : new Date(1900, 1, 1),
			notes_admin      : null,
			notes_favorite   : false,
			notes_game_admin : null,
			notes_last       : new Date(1900, 1, 1),
			notes_notes      : null,
			notes_password   : null,
			notes_server     : null,
			notes_tagline    : null,
			notes_username   : null,
			notes_version    : 22,
			notes_website    : null,
			notes_websiteDL  : false,
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
				bindConflict               : this.#bindConflict,
				collectionNotes            : this.#doNotesDefault(),
				collectionToFolder         : this.#map_CollectionToFolder,
				collectionToFolderRelative : this.#map_CollectionToFolderRelative,
				collectionToFullName       : this.#map_CollectionToFullName,
				collectionToName           : this.#map_CollectionToName,
				currentLocale              : this.#localeFunction(),
				folderToCollection         : this.#map_FolderToCollection,
				modHub                     : {
					list    : this.#modHubList,
					version : this.#modHubVersion,
				},
				modList                    : this.#list_allMods,
				newMods                    : this.#list_newMods,
				opts                       : extra,
				set_Collections            : this.#set_Collections,
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
	#maxFilesType = { grle : 10, pdf : 1, png : 128, txt : 2 }

	#fileSizeMap = {
		cache  : ( 10 * 1024 * 1024 ),
		dds    : ( 12 * 1024 * 1024 ),
		gdm    : ( 18 * 1024 * 1024 ),
		shapes : ( 256 * 1024 * 1024 ),
		xml    : ( 0.25 * 1024 * 1024 ),
	}

	#failFlags = {
		bad_modDesc        : false,
		bad_modDesc_no_rec : false,
		bad_modDesc_ver    : false,
		bad_zip            : false,
		dds_too_big        : false, // 12MB
		first_digit        : false,
		folder_needs_zip   : false,
		garbage_file       : false,
		gdm_too_big        : false, // 18MB
		grle_too_many      : false, // 10
		has_extra_files    : false,
		i3d_too_big        : false, // 10MB
		l10n_not_set       : false, // set on processL10n if either null
		might_be_crack     : false,
		name_failed        : false,
		no_modDesc         : false,
		no_modIcon         : false,
		no_modVer          : false,
		other_archive      : false,
		pdf_too_many       : false,
		png_texture        : false,
		png_too_many       : false, // 128
		probable_copy      : false,
		probable_zippack   : false,
		shapes_too_big     : false, // 256MB
		space_in_file      : false, // (internal files)
		txt_too_many       : false,
		xml_too_big        : false, // 0.25MB
	}
	#failMessages = {
		bad_modDesc        : 'MOD_ERROR_MODDESC_DAMAGED_RECOVERABLE',
		bad_modDesc_no_rec : 'NOT_MOD_MODDESC_PARSE_ERROR',
		bad_modDesc_ver    : 'NOT_MOD_MODDESC_VERSION_OLD_OR_MISSING',
		bad_zip            : 'FILE_ERROR_UNREADABLE_ZIP',
		dds_too_big        : 'PERF_DDS_TOO_BIG', // 12MB
		first_digit        : 'FILE_ERROR_NAME_STARTS_DIGIT',
		folder_needs_zip   : 'INFO_NO_MULTIPLAYER_UNZIPPED',
		garbage_file       : 'FILE_ERROR_GARBAGE_FILE',
		gdm_too_big        : 'PERF_GDM_TOO_BIG', // 18MB
		grle_too_many      : 'PERF_GRLE_TOO_MANY', // 10
		has_extra_files    : 'PERF_HAS_EXTRA',
		i3d_too_big        : 'PERF_I3D_TOO_BIG', // 10MB
		l10n_not_set       : 'PERF_L10N_NOT_SET', // set on processL10n if either null
		might_be_crack     : 'INFO_MIGHT_BE_PIRACY',
		name_failed        : 'FILE_ERROR_NAME_INVALID',
		no_modDesc         : 'NOT_MOD_MODDESC_MISSING',
		no_modIcon         : 'MOD_ERROR_NO_MOD_ICON',
		no_modVer          : 'MOD_ERROR_NO_MOD_VERSION',
		other_archive      : 'FILE_ERROR_UNSUPPORTED_ARCHIVE',
		pdf_too_many       : 'PERF_PDF_TOO_MANY', // 1
		png_texture        : 'PREF_PNG_TEXTURE',
		png_too_many       : 'PERF_PNG_TOO_MANY', // 128
		probable_copy      : 'FILE_ERROR_LIKELY_COPY',
		probable_zippack   : 'FILE_ERROR_LIKELY_ZIP_PACK',
		shapes_too_big     : 'PERF_SHAPES_TOO_BIG', // 256MB
		space_in_file      : 'PERF_SPACE_IN_FILE', // (internal files)
		txt_too_many       : 'PERF_TXT_TOO_MANY', // 2
		xml_too_big        : 'PERF_XML_TOO_BIG', // 0.25MB
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
		author         : 'n/a',
		binds          : {},
		cropInfo       : false,
		depend         : [],
		descVersion    : 0,
		iconFileName   : false,
		iconImageCache : null,
		mapConfigFile  : false,
		mapIsSouth     : false,
		multiPlayer    : false,
		scriptFiles    : 0,
		storeItems     : 0,
		version        : '0.0.0.0',
		xmlDoc         : false,
		xmlParsed      : false,
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
		copyName    : false,
		extraFiles  : [],
		fileDate    : null,
		fileSize    : 0,
		fullPath    : false,
		i3dFiles    : [],
		imageDDS    : [],
		imageNonDDS : [],
		isFolder    : false,
		pngTexture  : [],
		shortName   : false,
		spaceFiles  : [],
		tooBigFiles : [],
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
			badgeArray        : this.badgeArray,
			canNotUse         : this.canNotUse,
			currentCollection : this.currentCollection,
			fileDetail        : this.fileDetail,
			issues            : this.issues,
			l10n              : this.l10n,
			md5Sum            : this.md5Sum,
			modDesc           : {},
			uuid              : this.uuid,
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
			folder  : this.fileDetail.isFolder,
			noMP    : ! this.modDesc.multiPlayer,
			notmod  : this.#failFlags.no_modDesc,
			pconly  : (this.modDesc.scriptFiles > 0),
			problem : false,
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
		const XMLOptions = {
			async              : false,
			attrNameProcessors : [function(name) { return name.toUpperCase() }],
			normalizeTags      : true,
			strict             : true,
		}
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

		/* Check if map */
		if ( this.#nestedXMLProperty('moddesc.maps') ) {
			this.modDesc.mapConfigFile = this.modDesc.xmlParsed.moddesc.maps[0]?.map[0]?.$?.CONFIGFILENAME || false
		}
			
		/* Get icon filename */
		if ( this.#nestedXMLProperty('moddesc.iconfilename') ) {
			// NOTE: don't attempt to load png, if it's there.  We can't read it anyway
			try {
				let tempIcon = this.modDesc.xmlParsed.moddesc.iconfilename[0].toString()

				if ( ! tempIcon.endsWith('.dds') ) {
					tempIcon = `${tempIcon.slice(0, -4)}.dds`
				}
				if ( this.fileDetail.imageDDS.includes(tempIcon) ) {
					this.modDesc.iconFileName = tempIcon
				} else {
					this.#failFlags.no_modIcon = true
				}
			} catch (e) {
				this.#log.log.notice(`Caught icon fail: ${e}`, this.#logUUID)
				this.#failFlags.no_modIcon = true
				return false
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

	#processMapConfig(file) {
		const fileMap = [null, null, null]
		const XMLOptions = {
			async              : false,
			attrNameProcessors : [function(name) { return name.toUpperCase() }],
			normalizeTags      : true,
			strict             : true,
		}
		const strictXMLParser = new xml2js.Parser(XMLOptions)
			
		/* Read modDesc.xml */
		strictXMLParser.parseString(file, (err, result) => {
			if ( err !== null ) {
				/* XML Parse failed, lets try to recover */
				this.#log.log.warning(`Caught XML Parse error: ${err}`, this.#logUUID)
			} else {
				const typesFile  = result.map?.fruittypes?.[0]?.$?.FILENAME || null
				const growthFile = result.map?.growth?.[0]?.$?.FILENAME || null
				const envFile    = result.map?.environment?.[0]?.$?.FILENAME || null

				fileMap[0] = ( typesFile !== null && !typesFile.startsWith('$') ) ? typesFile : null
				fileMap[1] = ( growthFile !== null && !growthFile.startsWith('$') ) ? growthFile : null
				fileMap[2] = ( envFile !== null && !envFile.startsWith('$') ) ? envFile : null
			}
		})
		return fileMap
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

		if ( this.modDesc.mapConfigFile !== false ) {
			try {
				if ( zipFile.getEntry(this.modDesc.mapConfigFile) === null ) {
					throw 'Config file does not Exist'
				}
				const mapConfigFile = zipFile.readAsText(this.modDesc.mapConfigFile)
				const mapFiles      = this.#processMapConfig(mapConfigFile)

				if ( mapFiles[0] !== null ) {
					if ( zipFile.getEntry(mapFiles[0]) === null ) {
						throw 'Fruit Types file does not exist'
					}
					mapFiles[0] = zipFile.readAsText(mapFiles[0])
				}

				if ( mapFiles[1] !== null ) {
					if ( zipFile.getEntry(mapFiles[1]) === null ) {
						throw 'Growth file does not exist'
					}
					mapFiles[1] = zipFile.readAsText(mapFiles[1])
				}

				if ( mapFiles[2] !== null ) {
					if ( zipFile.getEntry(mapFiles[2]) === null ) {
						throw 'Growth file does not exist'
					}
					mapFiles[2] = zipFile.readAsText(mapFiles[2])
				}

				const cropInfo = new cropDataReader(mapFiles[0], mapFiles[1], mapFiles[2])

				this.modDesc.cropInfo   = cropInfo.crops
				this.modDesc.mapIsSouth = cropInfo.isSouth
			} catch (e) {
				this.#failFlags.no_modIcon = true
				this.#log.log.notice(`Caught map fail: ${e}`, this.#logUUID)
			}
		}

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

		const allFileList  = globSync('**', { cwd : this.fileDetail.fullPath, follow : true, mark : true, stat : true, withFileTypes : true })

		for ( const checkFile of allFileList ) {
			this.#checkInternalFile(
				path.extname(checkFile.name),
				checkFile.name,
				checkFile.size
			)
		}

		this.#failFlags.grle_too_many = ( this.#maxFilesType.grle < 1 )
		this.#failFlags.png_too_many  = ( this.#maxFilesType.png < 1 )
		this.#failFlags.pdf_too_many  = ( this.#maxFilesType.pdf < 1 )
		this.#failFlags.txt_too_many  = ( this.#maxFilesType.txt < 1 )

		if ( ! this.#failFlags.no_modDesc ) {
			this.#processModDesc()
		}

		if ( this.modDesc.mapConfigFile !== false ) {
			try {
				if ( ! fs.existsSync(path.join(this.fileDetail.fullPath, this.modDesc.mapConfigFile))) {
					throw 'Config file does not Exist'
				}
				const mapConfigFile = fs.readFileSync(path.join(this.fileDetail.fullPath, this.modDesc.mapConfigFile), 'utf8')
				const mapFiles      = this.#processMapConfig(mapConfigFile)

				if ( mapFiles[0] !== null ) {
					if ( ! fs.existsSync(path.join(this.fileDetail.fullPath, mapFiles[0])) ) {
						throw 'Fruit Types file does not exist'
					}
					mapFiles[0] = fs.readFileSync(path.join(this.fileDetail.fullPath, mapFiles[0]), 'utf8')
				}

				if ( mapFiles[1] !== null ) {
					if ( ! fs.existsSync(path.join(this.fileDetail.fullPath, mapFiles[1])) ) {
						throw 'Growth file does not exist'
					}
					mapFiles[1] = fs.readFileSync(path.join(this.fileDetail.fullPath, mapFiles[1]), 'utf8')
				}

				if ( mapFiles[2] !== null ) {
					if ( ! fs.existsSync(path.join(this.fileDetail.fullPath, mapFiles[2])) ) {
						throw 'Environment file does not exist'
					}
					mapFiles[2] = fs.readFileSync(path.join(this.fileDetail.fullPath, mapFiles[2]), 'utf8')
				}

				const cropInfo = new cropDataReader(mapFiles[0], mapFiles[1], mapFiles[2])

				this.modDesc.cropInfo   = cropInfo.crops
				this.modDesc.mapIsSouth = cropInfo.isSouth
			} catch (e) {
				this.#failFlags.no_modIcon = true
				this.#log.log.notice(`Caught map fail: ${e}`, this.#logUUID)
			}
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
		author         : 'n/a',
		binds          : {},
		cropInfo       : false,
		descVersion    : 0,
		iconFileName   : false,
		iconImageCache : null,
		mapConfigFile  : false,
		mapIsSouth     : false,
		multiPlayer    : false,
		scriptFiles    : 0,
		storeItems     : 0,
		version        : 'n/a',
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
		copyName    : false,
		extraFiles  : [],
		fileDate    : null,
		fileSize    : 0,
		fullPath    : false,
		i3dFiles    : [],
		imageDDS    : [],
		imageNonDDS : [],
		isFolder    : false,
		pngTexture  : [],
		shortName   : false,
		spaceFiles  : [],
		tooBigFiles : [],
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

class cropDataReader {
	#cropData   = {}
	#skipFruits = ['meadow']

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
	
	#XMLOptions = {
		async              : false,
		attrNameProcessors : [function(name) { return name.toUpperCase() }],
		normalizeTags      : true,
		strict             : true,
	}

	#mapIsSouth = false
	#cropOutput = []

	constructor(typesFile, growthFile, envFile) {
		const xmlParse = new xml2js.Parser(this.#XMLOptions)

		if ( envFile === null ) {
			this.#mapIsSouth = false
		} else {
			xmlParse.parseString(envFile, (err, result) => {
				if ( err === null ) {
					this.#mapIsSouth = result.environment.latitude[0] < 0
				}
			})
		}

		if ( growthFile === null ) {
			this.#cropOutput = this.#baseGameCrops
			return
		}

		if ( typesFile === null ) {
			for ( const cropName in this.#baseGameCropTypes ) {
				this.#cropData[cropName] = {
					harvest    : new Set(),
					maxHarvest : this.#baseGameCropTypes[cropName].maxHarvest,
					minHarvest : this.#baseGameCropTypes[cropName].minHarvest,
					plant      : new Set(),
					states     : this.#baseGameCropTypes[cropName].states,
				}
			}
		} else {
			xmlParse.parseString(typesFile, (err, result) => {
				if ( err === null ) {
					for ( const thisFruit of result.map.fruittypes[0].fruittype) {
						const fruitName = thisFruit.$.NAME.toLowerCase()
			
						if ( this.#skipFruits.includes(fruitName) ) { continue }
			
						this.#cropData[fruitName] = {
							harvest    : new Set(),
							maxHarvest : parseInt(thisFruit.harvest[0].$.MAXHARVESTINGGROWTHSTATE),
							minHarvest : parseInt(thisFruit.harvest[0].$.MINHARVESTINGGROWTHSTATE),
							plant      : new Set(),
							states     : parseInt(thisFruit.growth[0].$.NUMGROWTHSTATES),
						}
			
						if ( typeof thisFruit.preparing !== 'undefined' ) {
							this.#cropData[fruitName].minHarvest = parseInt(thisFruit.preparing[0].$.MINGROWTHSTATE)
							this.#cropData[fruitName].maxHarvest = parseInt(thisFruit.preparing[0].$.MAXGROWTHSTATE)
						}
					}
				}
			})
		}

		xmlParse.parseString(growthFile, (err, result) => {
			if ( err === null ) {
				for ( const fruit of result.growth.seasonal[0].fruit ) {
					const thisFruit = fruit.$.NAME.toLowerCase()

					if ( this.#skipFruits.includes(thisFruit) ) { continue }

					if ( typeof this.#cropData[thisFruit] === 'undefined' ) { continue }

					if ( thisFruit === 'poplar' ) {
						this.#cropData[thisFruit].harvest = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
					}

					let lastMax = 0

					for ( const period of fruit.period) {
						const thisIndex = parseInt(period.$.INDEX)
				
						if ( period.$?.PLANTINGALLOWED === 'true' ) {
							this.#cropData[thisFruit].plant.add(thisIndex)
						}

						if ( typeof period.update === 'undefined' ) {
							if ( lastMax >= this.#cropData[thisFruit].minHarvest && lastMax <= this.#cropData[thisFruit].maxHarvest ) {
								const readyIndex = thisIndex+1

								this.#cropData[thisFruit].harvest.add(readyIndex < 13 ? readyIndex : readyIndex % 12)
							}
						} else {
							for ( const update of period.update ) {
								const range    = update.$.RANGE
								const add      = update.$.ADD || false
								const set      = update.$.SET || false
								const rangeMax = parseInt(range.includes('-') ? range.split('-')[1] : range)
								const newMax   = set !== false ? parseInt(set) : rangeMax + parseInt(add)

								if ( newMax >= this.#cropData[thisFruit].minHarvest && newMax <= this.#cropData[thisFruit].maxHarvest ) {
									const readyIndex = thisIndex + ( thisFruit === 'olive' ? 2 : 1 )

									this.#cropData[thisFruit].harvest.add(readyIndex < 13 ? readyIndex : readyIndex % 12)
								}

								lastMax = newMax
							}
						}
					}
				}
			}
		})

		for ( const cropName in this.#cropData ) {
			this.#cropOutput.push({
				growthTime     : this.#cropData[cropName].states,
				harvestPeriods : Array.from(this.#cropData[cropName].harvest),
				name           : cropName,
				plantPeriods   : Array.from(this.#cropData[cropName].plant),
			})
		}
	}

	get isSouth() { return this.#mapIsSouth }
	get crops() { return this.#cropOutput }
}

module.exports = {
	modFileCollection : modFileCollection,
	modFileChecker    : modFileChecker,
	notModFileChecker : notModFileChecker,
}


