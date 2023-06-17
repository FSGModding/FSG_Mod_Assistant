/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Mod Checker Class, Mod Collection Class, Crop Calendar Reader Class, Mod Looker Class
/*eslint complexity: ["warn", 25]*/

const fs           = require('fs')
const path         = require('path')
const admZip       = require('adm-zip')
const {XMLParser}  = require('fast-xml-parser')
const crypto       = require('crypto')
const allLang      = require('./modLookerLang.json')
const { globSync } = require('glob')


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
	#iconParser          = null

	#userHome        = ''
	#useSyncSafeMode = false
	#skipCache       = false

	#scanPromise = []

	constructor(iconParser, logger, notes, cache, homeDir, loadingWindow, settings, locale, skipCache = false) {
		this.#iconParser          = iconParser
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

		return ( asArray ) ?
			[
				modHubID,
				this.modHubVersionModHubId(modHubID),
				this.#modHubList.last.includes(modHubID)
			] : {
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
		return this.#map_CollectionToFolder[ID.split('--')[0]]
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

	set syncSafe(mode) { this.#useSyncSafeMode = typeof mode === 'boolean' ? mode : false }

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

		thisModRecord.gameVersion ??= ( dVer >= 4 && dVer <= 6 ) ? 11 : null
		thisModRecord.gameVersion ??= ( dVer >= 9 && dVer <= 16 ) ? 13 : null
		thisModRecord.gameVersion ??= ( dVer >= 20 && dVer <= 25 ) ? 15 : null
		thisModRecord.gameVersion ??= ( dVer >= 31 && dVer <= 39 ) ? 17 : null
		thisModRecord.gameVersion ??= ( dVer >= 40 && dVer <= 53 ) ? 19 : null
		thisModRecord.gameVersion ??= ( dVer >= 60 ) ? 22 : null
		thisModRecord.gameVersion ??= 0

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
						this.#iconParser,
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
		is_savegame        : false,
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
		is_savegame        : 'FILE_IS_A_SAVEGAME',
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
		'bad_modDesc_ver', 'no_modVer', 'is_savegame',
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
		mapConfigFile  : null,
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
	#iconParser     = null
	
	constructor(iconParser, filePath, isFolder, size, date, md5Pre = null, log = null, locale = null ) {
		this.#iconParser         = iconParser
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

		this.#failFlags.l10n_not_set   = ( this.l10n.title === null || this.l10n.description === null )
		this.l10n.title              ??= 'n/a'
		this.l10n.description        ??= ''
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
		const searchTree = this.modDesc.xmlParsed?.moddesc?.[key.toLowerCase()] ?? null
		let   foundTerm  = null

		if ( searchTree === null ) { return null }

		try {
			foundTerm ??= searchTree?.[this.#locale()] ?? null
			foundTerm ??= searchTree?.en ?? null
			foundTerm ??= searchTree?.de ?? null
		} catch (err) {
			this.#log.log.warning(`Caught odd entry: ${key} :: ${err}`, this.#logUUID)
		}
		return foundTerm
	}

	#getBadges() {
		const badges = {
			broken  : false,
			folder  : this.fileDetail.isFolder,
			noMP    : ! this.modDesc.multiPlayer,
			notmod  : this.#failFlags.no_modDesc,
			pconly  : (this.modDesc.scriptFiles > 0),
			problem : false,
			savegame : this.#failFlags.is_savegame,
		}

		if ( this.fileDetail.isFolder ) { badges.noMP = true }

		for ( const flag of this.#flags_broken ) {
			if ( this.#failFlags[flag] ) { badges.broken = true; this.canNotUse = true; break }
		}
		for ( const flag of this.#flags_problem ) {
			if ( this.#failFlags[flag] ) { badges.problem = true; break }
		}

		if ( badges.savegame ) { badges.noMP = false; badges.broken = false; badges.problem = false; this.canNotUse = true }

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
		if ( this.modDesc.xmlDoc === false ) { return }

		const alwaysArray   = [
			'moddesc.storeitems.storeitem',
			'moddesc.actions.action',
			'moddesc.inputbinding.actionbinding',
			'moddesc.inputbinding.actionbinding.binding',
			'moddesc.maps.map',
			'moddesc.dependencies.dependency',
		]

		const modDescParser = new XMLParser({
			attributeNamePrefix    : '',
			attributesGroupName    : '$',
			ignoreAttributes       : false,
			ignoreDeclaration      : true,
			ignorePiTags           : true,
			isArray                : (_, jPath) => {
				return alwaysArray.indexOf(jPath) !== -1
			},
			parseAttributeValue    : true,
			parseTagValue          : true,
			transformAttributeName : (name) => name.toUpperCase(),
			transformTagName       : (name) => name.toLowerCase(),
			trimValues             : true,
		})

		try {
			this.modDesc.xmlParsed  = modDescParser.parse(this.modDesc.xmlDoc)
		} catch {
			this.#log.log.warning('Caught unrecoverable XML Parse error', this.#logUUID)
			this.#failFlags.bad_modDesc_no_rec = true
			return
		}

		const parsedDesc = this.modDesc.xmlParsed?.moddesc ?? null

		if ( parsedDesc === null ) {
			this.#log.log.warning('ModDesc XML is not formed correctly', this.#logUUID)
			this.#failFlags.bad_modDesc_no_rec = true
			return
		}

		/* Get modDesc.xml version */
		this.modDesc.descVersion        = parsedDesc?.$?.DESCVERSION ?? 0
		this.#failFlags.bad_modDesc_ver = ( this.modDesc.descVersion === 0 )
	
		/* Get MOD Version */
		this.modDesc.version      = parsedDesc?.version?.toString?.() ?? '0.0.0.0'
		this.#failFlags.no_modVer = ( this.modDesc.version === '0.0.0.0' )

		this.modDesc.author        = parsedDesc?.author ?? 'n/a'
		this.modDesc.multiPlayer   = parsedDesc?.multiplayer?.$?.SUPPORTED ?? false
		this.modDesc.storeItems    = parsedDesc?.storeitems?.storeitem?.length ?? 0
		this.modDesc.mapConfigFile = parsedDesc?.maps?.map?.[0]?.$?.CONFIGFILENAME ?? null
		this.modDesc.depend        = parsedDesc?.dependencies?.dependency ?? []
		
		this.#failFlags.might_be_crack = typeof ( parsedDesc?.productid ) !== 'undefined'

		/* Get icon filename */
		let iconFileName = parsedDesc?.iconfilename ?? false

		iconFileName = ( iconFileName !== false && ! iconFileName.endsWith('.dds') ) ? `${iconFileName.slice(0, -4)}.dds` : iconFileName

		if ( this.fileDetail.imageDDS.includes(iconFileName) ) {
			this.modDesc.iconFileName = iconFileName
		} else {
			this.#failFlags.no_modIcon = true
		}
		
		try {
			if ( typeof parsedDesc?.actions?.action !== 'undefined' ) {
				for ( const action of parsedDesc.actions.action ) {
					this.modDesc.actions[action.$.NAME] = action.$.CATEGORY || 'ALL'
				}
			}
			if ( typeof parsedDesc?.inputbinding?.actionbinding !== 'undefined' ) {
				for ( const action of parsedDesc.inputbinding.actionbinding ) {
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
	}

	#processMapConfig(fileContents) {
		const mapXMLParser = new XMLParser({
			attributeNamePrefix    : '',
			attributesGroupName    : '$',
			ignoreAttributes       : false,
			ignoreDeclaration      : true,
			ignorePiTags           : true,
			transformAttributeName : (name) => name.toUpperCase(),
			transformTagName       : (name) => name.toLowerCase(),
			trimValues             : true,
		})

		try {
			const mapConfigParsed  = mapXMLParser.parse(fileContents)

			const typesFile = mapConfigParsed?.map?.fruittypes?.$?.FILENAME ?? '$'
			const growFile  = mapConfigParsed?.map?.growth?.$?.FILENAME ?? '$'
			const envFile   = mapConfigParsed?.map?.environment?.$?.FILENAME ?? '$'

			return [
				( typesFile !== null && !typesFile.startsWith('$') ) ? typesFile : null,
				( growFile !== null && !growFile.startsWith('$') ) ? growFile : null,
				( envFile !== null && !envFile.startsWith('$') ) ? envFile : null,
			]

		} catch {
			this.#log.log.warning('Caught unrecoverable Map XML Parse error', this.#logUUID)
			return [null, null, null]
		}
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
				if ( zipFile.getEntry('careerSavegame.xml')  !== null ) {
					this.#failFlags.is_savegame = true
					this.#log.log.notice('Zip file is a savegame archive', this.#logUUID)
					this.modDesc.version = '--'
				}
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

		if ( this.modDesc.mapConfigFile !== null ) {
			try {
				if ( zipFile.getEntry(this.modDesc.mapConfigFile) === null ) {
					throw 'Config file does not Exist'
				}
				const mapConfigFile = zipFile.readAsText(this.modDesc.mapConfigFile)
				const mapFiles      = this.#processMapConfig(mapConfigFile).map((fileName) => {
					if ( fileName === null || zipFile.getEntry(fileName) === null ) { return null }

					return zipFile.readAsText(fileName)
				})

				const cropInfo = new cropDataReader(mapFiles[0], mapFiles[1], mapFiles[2])

				this.modDesc.cropInfo   = cropInfo.crops
				this.modDesc.mapIsSouth = cropInfo.isSouth
			} catch (e) {
				this.#log.log.notice(`Caught map fail: ${e}`, this.#logUUID)
			}
		}

		try {
			if ( this.modDesc.iconFileName === false || zipFile.getEntry(this.modDesc.iconFileName) === null ) {
				throw 'File does not Exist'
			}

			this.modDesc.iconImageCache = this.#iconParser.parseDDS(
				this.#logUUID,
				zipFile.readFile(this.modDesc.iconFileName).buffer,
				false
			)
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

		if ( this.modDesc.mapConfigFile !== null ) {
			try {
				if ( ! fs.existsSync(path.join(this.fileDetail.fullPath, this.modDesc.mapConfigFile))) {
					throw 'Config file does not Exist'
				}
				const mapConfigFile = fs.readFileSync(path.join(this.fileDetail.fullPath, this.modDesc.mapConfigFile), 'utf8')
				const mapFiles      = this.#processMapConfig(mapConfigFile).map((fileName) => {
					if ( fileName === null || ! fs.existsSync(path.join(this.fileDetail.fullPath, fileName)) ) { return null }

					return fs.readFileSync(path.join(this.fileDetail.fullPath, fileName), 'utf8')
				})

				const cropInfo = new cropDataReader(mapFiles[0], mapFiles[1], mapFiles[2])

				this.modDesc.cropInfo   = cropInfo.crops
				this.modDesc.mapIsSouth = cropInfo.isSouth
			} catch (e) {
				this.#failFlags.no_modIcon = true
				this.#log.log.notice(`Caught map fail: ${e}`, this.#logUUID)
			}
		}

		try {
			if ( this.modDesc.iconFileName === false || !fs.existsSync(path.join(this.fileDetail.fullPath, this.modDesc.iconFileName)) ) {
				throw 'File does not Exist'
			}
			this.modDesc.iconImageCache = this.#iconParser.parseDDS(
				this.#logUUID,
				fs.readFileSync(path.join(this.fileDetail.fullPath, this.modDesc.iconFileName), null).buffer,
				false
			)
		} catch (e) {
			this.#failFlags.no_modIcon = true
			this.#log.log.notice(`Caught icon fail: ${e}`, this.#logUUID)
		}
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

	#mapIsSouth = false
	#cropOutput = []

	constructor(typesFile, growthFile, envFile) {
		let didReadTypes  = false
		let didReadGrowth = false

		const alwaysArray   = [
			'map.fruittypes.fruittype',
			'growth.seasonal.fruit',
			'growth.seasonal.fruit.period',
			'growth.seasonal.fruit.period.update',
		]

		const cropParser = new XMLParser({
			attributeNamePrefix    : '',
			attributesGroupName    : '$',
			ignoreAttributes       : false,
			ignoreDeclaration      : true,
			ignorePiTags           : true,
			isArray                : (_, jPath) => {
				return alwaysArray.indexOf(jPath) !== -1
			},
			parseAttributeValue    : true,
			parseTagValue          : true,
			transformAttributeName : (name) => name.toUpperCase(),
			transformTagName       : (name) => name.toLowerCase(),
			trimValues             : true,
		})


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
				harvestPeriods : Array.from(this.#cropData[cropName].harvest),
				name           : cropName,
				plantPeriods   : Array.from(this.#cropData[cropName].plant),
			})
		}
	}

	#readGrowth (growth) {
		if ( typeof growth === 'undefined' ) { return false }
		
		for ( const fruit of growth ) {
			const thisFruit = fruit.$.NAME.toLowerCase()

			if ( this.#skipFruits.includes(thisFruit) ) { continue }
			if ( typeof this.#cropData[thisFruit] === 'undefined' ) { continue }

			if ( thisFruit === 'poplar' ) {
				this.#cropData[thisFruit].harvest = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
			}

			let lastMax = 0

			for ( const period of fruit.period) {
				const thisIndex = period.$.INDEX
				
				if ( period.$?.PLANTINGALLOWED === true ) {
					this.#cropData[thisFruit].plant.add(thisIndex)
				}

				if ( typeof period.update === 'undefined' ) {
					if ( lastMax >= this.#cropData[thisFruit].minHarvest && lastMax <= this.#cropData[thisFruit].maxHarvest ) {
						const readyIndex = thisIndex + 1

						this.#cropData[thisFruit].harvest.add(readyIndex < 13 ? readyIndex : readyIndex % 12)
					}
				} else {
					for ( const update of period.update ) {
						const range    = update.$.RANGE
						const add      = update.$.ADD || 0
						const set      = update.$.SET || null
						const rangeMax = typeof range === 'string' ? parseInt(range.split('-')[1]) : range
						const newMax   = set !== null ? set : rangeMax + add

						if ( newMax >= this.#cropData[thisFruit].minHarvest && newMax <= this.#cropData[thisFruit].maxHarvest ) {
							const readyIndex = thisIndex + ( thisFruit === 'olive' ? 2 : 1 )

							this.#cropData[thisFruit].harvest.add(readyIndex < 13 ? readyIndex : readyIndex % 12)
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

			if ( this.#skipFruits.includes(fruitName) ) { continue }

			this.#cropData[fruitName] = {
				harvest    : new Set(),
				maxHarvest : thisFruit?.harvest?.$?.MAXHARVESTINGGROWTHSTATE ?? 20,
				minHarvest : thisFruit?.harvest?.$?.MINHARVESTINGGROWTHSTATE ?? 20,
				plant      : new Set(),
				states     : thisFruit?.growth?.$?.NUMGROWTHSTATES ?? 20,
			}

			if ( typeof thisFruit.preparing !== 'undefined' ) {
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
	#iconParser     = null
	#fullFileName   = null
	#locale         = false
	#log            = null
	#logUUID        = null
	#modIsFolder    = true
	#modRecord      = null
	#path           = null
	#skipIcons      = false
	#zipFile        = null

	#langData = {
		base : {},
		mod  : {},
	}

	#infoData = {
		brands : {},
		icons  : {},
		items  : {},
	}

	#fillCats = {
		augerwagon      : ['wheat', 'barley', 'oat', 'canola', 'soybean', 'sunflower', 'maize', 'fertilizer', 'seeds', 'sorghum'],
		bulk            : ['wheat', 'barley', 'oat', 'canola', 'sunflower', 'soybean', 'maize', 'potato', 'sugarbeet', 'sugarbeet_cut', 'manure', 'seeds', 'forage', 'forage_mixing', 'chaff', 'woodchips', 'silage', 'straw', 'grass_windrow', 'drygrass_windrow', 'sugarcane', 'fertilizer', 'pigfood', 'lime', 'snow', 'roadsalt', 'sorghum', 'olive', 'stone', 'mineral_feed'],
		combine         : ['wheat', 'barley', 'oat', 'canola', 'sunflower', 'soybean', 'maize', 'sorghum'],
		farmsilo        : ['wheat', 'barley', 'oat', 'canola', 'sunflower', 'soybean', 'maize', 'sorghum'],
		forageharvester : ['chaff', 'grass_windrow', 'woodchips'],
		foragewagon     : ['straw', 'grass_windrow', 'drygrass_windrow', 'chaff', 'silage', 'forage'],
		fork            : ['manure', 'silage', 'chaff', 'straw', 'grass_windrow', 'drygrass_windrow'],
		hayloft         : ['straw', 'drygrass_windrow'],
		liquid          : ['milk', 'water', 'diesel', 'def'],
		loadingvehicle  : ['heat', 'barley', 'oat', 'canola', 'sunflower', 'soybean', 'maize', 'seeds', 'forage', 'chaff', 'woodchips', 'silage', 'fertilizer', 'lime', 'sorghum'],
		manurespreader  : ['manure'],
		mixerwagon      : ['forage', 'forage_mixing', 'drygrass_windrow', 'silage', 'straw', 'mineral_feed'],
		piece           : ['wool', 'treesaplings', 'egg'],
		product         : ['flour', 'bread', 'cake', 'butter', 'cheese', 'fabric', 'sugar', 'clothes', 'cereal', 'sunflower_oil', 'canola_oil', 'olive_oil', 'raisins', 'grapejuice', 'chocolate', 'boards', 'furniture', 'strawberry', 'lettuce', 'tomato', 'egg'],
		product_bga     : ['ethane', 'electriccharge'],
		shovel          : ['wheat', 'barley', 'oat', 'canola', 'sunflower', 'soybean', 'maize', 'potato', 'sugarbeet', 'sugarbeet_cut', 'manure', 'seeds', 'forage', 'forage_mixing', 'chaff', 'woodchips', 'silage', 'straw', 'grass_windrow', 'drygrass_windrow', 'sugarcane', 'fertilizer', 'pigfood', 'lime', 'snow', 'roadsalt', 'sorghum', 'grape', 'olive', 'stone', 'mineral_feed'],
		silagetrailer   : ['straw', 'grass_windrow', 'drygrass_windrow', 'chaff', 'silage', 'forage', 'woodchips', 'sugarcane'],
		slurrytank      : ['liquidmanure', 'digestate'],
		sprayer         : ['liquidfertilizer', 'herbicide'],
		spreader        : ['fertilizer'],
		trainwagon      : ['wheat', 'barley', 'oat', 'canola', 'maize', 'sunflower', 'soybean', 'sugarcane', 'sugarbeet', 'potato', 'sorghum', 'woodchips', 'olive', 'grape', 'seeds'],
		windrow         : ['straw', 'drygrass_windrow', 'grass_windrow'],
	}

	#alwaysArray   = [
		'moddesc.storeitems.storeitem',
		'moddesc.l10n.text',
		'moddesc.brands.brand',
		'l10n.texts.text',
		'l10n.elements.e',
		'vehicle.fillunit.fillunitconfigurations.fillunitconfiguration.fillunits.fillunit',
		'vehicle.fillunit.fillunitconfigurations.fillunitconfiguration',
		'vehicle.motorized.consumerconfigurations',
		'vehicle.motorized.consumerconfigurations.consumerconfiguration.consumer',
		'vehicle.storedata.functions.function',
		'vehicle.wheels.wheelconfigurations.wheelconfiguration',
		'vehicle.motorized.motorconfigurations.motorconfiguration',
		'vehicle.base.components.component',
		'placeable.storedata.functions.function',
		'placeable.colorable.colors.color',
	]

	#xmlParser = null

	constructor( iconParser, modRecord, modCollectFolder, log = null, locale = 'en', skipIcons = false ) {
		// modRecord from collection, folder for collection, log class, locale string
		this.#iconParser = iconParser
		this.#locale     = locale
		this.#log        = log
		this.#logUUID    = `modLook-${modRecord.fileDetail.shortName}`
		this.#modRecord  = modRecord
		this.#path       = modCollectFolder
		this.#skipIcons  = skipIcons

		this.#fullFileName = path.join(this.#path, path.basename(this.#modRecord.fileDetail.fullPath))

		this.#langData.base = typeof allLang[this.#locale] !== 'undefined' ? allLang[this.#locale] : allLang.en

		this.#xmlParser = new XMLParser({
			attributeNamePrefix    : '',
			attributesGroupName    : '$',
			ignoreAttributes       : false,
			ignoreDeclaration      : true,
			ignorePiTags           : true,
			isArray                : (_, jPath) => {
				return this.#alwaysArray.indexOf(jPath) !== -1
			},
			parseAttributeValue    : true,
			parseTagValue          : true,
			transformAttributeName : (name) => name.toUpperCase(),
			transformTagName       : (name) => name.toLowerCase(),
			trimValues             : true,
		})
	}

	async getInfo() {
		if ( ! this.#modRecord.fileDetail.isFolder ) {
			this.#modIsFolder = false

			this.#zipFile = new admZip(this.#fullFileName)
		}

		const modDescTree     = this.#getXMLFile('modDesc.xml')
		const storeItemFiles  = this.#getStoreItems(modDescTree)

		this.#infoData.brands = this.#getExtraBrands(modDescTree)

		this.#langData.mod = this.#getLangKeys(modDescTree)

		for ( const thisItem of storeItemFiles ) {
			const thisItemTree = this.#getXMLFile(thisItem)
			const thisItemInfo = this.#parseStoreItem(thisItemTree)

			if ( thisItemInfo !== null ) {
				this.#infoData.items[thisItem] = thisItemInfo

				if ( !this.#skipIcons && thisItemInfo.icon !== null ) {
					const thisItemIcon = this.#loadIcon(thisItemInfo.icon)

					if ( thisItemIcon !== null ) {
						this.#infoData.icons[thisItem] = thisItemIcon
					}
				}
			}
		}

		if ( ! this.#modRecord.fileDetail.isFolder ) { this.#zipFile = null }

		return this.#infoData
	}

	#getXMLFile(name) {
		let fileContents = null
		let xmlTree      = null

		try {
			if ( this.#modIsFolder ) {
				const fullName = path.join(this.#fullFileName, name)
				if ( fs.existsSync(fullName) ) {
					fileContents = fs.readFileSync(fullName, 'utf-8')
				}
			} else if ( this.#zipFile.getEntry(name) !== null) {
				fileContents = this.#zipFile.readAsText(name)
			}
		} catch (e) {
			this.#log.log.notice(`File Read Failure: ${name} :: ${e}`, this.#logUUID)
		}
		
		if ( fileContents !== null ) {
			try {
				xmlTree = this.#xmlParser.parse(fileContents)
			} catch (err) {
				this.#log.log.warning(`File Parse Failure: ${name} :: ${err}`, this.#logUUID)
			}
		}

		return xmlTree
	}

	#getLangKeys(modDescTree) {
		const langByKey = {}

		if ( modDescTree !== null && typeof modDescTree.moddesc.l10n !== 'undefined' ) {
			const fileName = modDescTree.moddesc.l10n?.$?.FILENAMEPREFIX || null

			if ( fileName !== null ) {
				for ( const langKey of [this.#locale, 'en', 'de'] ) {
					const langFile = this.#getXMLFile(`${fileName}_${langKey}.xml`)
					if ( langFile !== null ) {
						if ( typeof langFile.l10n.texts !== 'undefined' ) {
							for ( const thisText of langFile.l10n.texts.text ) {
								langByKey[thisText.$.NAME] = thisText.$.TEXT
							}
							break
						}
						if ( typeof langFile.l10n.elements !== 'undefined' ) {
							for ( const thisText of langFile.l10n.elements.e ) {
								langByKey[thisText.$.K] = thisText.$.V
							}
							break
						}
					}
				}
			} else {
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

	#getExtraBrands(modDescTree) {
		const addBrands = {}
		if ( typeof modDescTree.moddesc?.brands?.brand === 'undefined' ) { return addBrands }

		for ( const thisBrand of modDescTree.moddesc.brands.brand ) {
			const thisName = thisBrand?.$?.NAME || null

			if ( thisName !== null ) {
				addBrands[thisName.toUpperCase()] = {
					title : thisBrand?.$?.TITLE || thisName,
					icon  : !this.#skipIcons ? this.#loadIcon(thisBrand?.$?.IMAGE) : null,
				}
			}
		}
		return addBrands
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

	#loadIcon(iconFile) {
		if ( typeof iconFile === 'undefined' || iconFile === null ) { return null }

		if ( iconFile.startsWith('$data/store/brands/') ) {
			return `img/brand/${iconFile.substring(19).slice(0, -4).toLowerCase()}.png`
		}

		const fileName = ( ! iconFile.endsWith('.dds') ) ? `${iconFile.slice(0, -4)}.dds` : iconFile

		try {
			/* redo for direct access */
			if ( !this.#modIsFolder ) {
				if ( this.#zipFile.getEntry(fileName) !== null ) {
					return this.#iconParser.parseDDS(
						this.#logUUID,
						this.#zipFile.readFile(fileName).buffer,
						true
					)
				}
				return null
			}
			
			const fullFileName = path.join(this.#fullFileName, fileName)

			if ( fs.existsSync(fullFileName) ) {
				return this.#iconParser.parseDDS(
					this.#logUUID,
					fs.readFileSync(fullFileName, null).buffer,
					true
				)
			}

			return null
		} catch (err) {
			this.#log.log.warning(`Caught image error: ${err}`, this.#logUUID)
		}
		return null
	}

	#unwrapXML(xml) {
		const returner = {}
		if ( typeof xml === 'undefined' ) { return {} }

		for ( const key in xml ) {
			if ( key !== 'combination' ) {
				returner[key] = xml[key]
			}
		}
		return returner
	}

	#translate_single(key) {
		if ( typeof key === 'boolean' ) { return key }
		if ( key.startsWith('$l10n') ) {
			const searchKey = key.substring(6)

			if ( Object.hasOwn(this.#langData.mod, searchKey) ) {
				return this.#langData.mod[searchKey]
			}
			
			if ( Object.hasOwn(this.#langData.base, searchKey) ) {
				return this.#langData.base[searchKey]
			}
		}
		return key
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

	#parsePlace(xml) {
		const storeData = xml.storedata

		try {
			return {
				category       : storeData?.category || null,
				functions      : this.#translate(storeData?.functions?.function || []),
				hasColor       : xml?.colorable?.colors?.color?.length > 1,
				icon           : storeData?.image || null,
				masterType     : 'placeable',
				name           : this.#parseName(storeData?.name || 'unknown'),
				price          : storeData?.price || 0,
				type           : xml.$.TYPE,
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
		if ( typeof xml === 'undefined' ) { return returnObject }

		const fillUnits = xml?.fillunitconfigurations?.fillunitconfiguration?.[0]?.fillunits?.fillunit ?? null

		if ( fillUnits !== null ) {
			for ( const thisFill of fillUnits ) {
				if ( thisFill?.$?.SHOWINSHOP !== false ) {
					const thisTypes = thisFill?.$?.FILLTYPES?.split?.(' ') ?? null
					const thisCats  = thisFill?.$?.FILLTYPECATEGORIES?.split?.(' ') ?? null

					if ( thisCats !== null ) {
						for ( const thisCat of thisCats ) {
							const thisCatKey = thisCat.toLowerCase()
							if ( typeof this.#fillCats[thisCatKey] !== 'undefined' ) {
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
		}
		return returnObject
	}

	#parseWeight(xml) {
		if ( typeof xml === 'undefined' ) { return 0 }

		let totalWeight = 0

		for ( const thisComp of xml ) {
			totalWeight += thisComp?.$?.MASS ?? 0
		}
		return totalWeight
	}

	#parseBrand(xml) {
		if ( typeof xml === 'undefined' || xml === null ) { return null }
		if ( typeof xml === 'string' ) { return xml }
		if ( typeof xml?.['#text'] === 'string' ) { return xml['#text'] }
	}

	#parseVehicle(xml) {
		const storeData = xml.storedata

		if ( typeof storeData?.bundleelements !== 'undefined' ) { return null }

		try {
			const theseFills = this.#parseFillTypes(xml.fillunit)
			
			return {
				brand          : this.#parseBrand(storeData?.brand),
				category       : storeData?.category || null,
				fillLevel      : theseFills.capacity,
				fillTypes      : theseFills.types,
				fuelType       : xml?.motorized?.consumerconfigurations?.[0].consumerconfiguration?.[0]?.consumer?.[0]?.$?.FILLTYPE || false,
				functions      : this.#translate(storeData?.functions?.function || []),
				hasBeacons     : typeof xml?.lights?.beaconlights !== 'undefined',
				hasColor       : typeof xml.basematerialconfigurations !== 'undefined',
				hasLights      : typeof xml?.lights?.reallights !== 'undefined',
				hasWheelChoice : xml.wheels?.wheelconfigurations?.wheelconfiguration?.length > 1,
				icon           : storeData?.image || null,
				isEnterable    : typeof xml.enterable !== 'undefined',
				isMotorized    : typeof xml.motorized !== 'undefined',
				masterType     : 'vehicle',
				name           : this.#parseName(storeData?.name || 'unknown'),
				price          : storeData?.price || 0,
				specs          : this.#unwrapXML(storeData?.specs),
				transType      : this.#translate(xml?.motorized?.motorconfigurations?.motorconfiguration?.[0]?.transmission?.$?.NAME || false),
				type           : xml.$.TYPE,
				typeDesc       : this.#translate(xml.base?.typedesc || 'unknown'),
				weight         : this.#parseWeight(xml.base?.components?.component),
			}
		} catch (e) {
			return null
		}
	}

	#parseName(xml) {
		if ( typeof xml === 'string' ) { return this.#translate(xml) }

		if ( Object.hasOwn(xml, this.#locale) ) { return xml[this.#locale] }
		if ( Object.hasOwn(xml, 'en') ) { return xml.en }
		if ( Object.hasOwn(xml, 'de') ) { return xml.de }
	}
}

class saveFileChecker {
	#fileName = null
	#logName  = null
	#badSave  = false
	#log      = null

	errorList   = []
	singleFarm  = true
	mapMod      = null
	#placeables = {}
	farms       = {}
	#vehicles   = {}
	mods        = {}

	#xml = {
		parsed : {
			careerSavegame : null,
			farms          : null,
			placeables     : null,
			vehicles       : null,
		},
		raw    : {
			careerSavegame : null,
			farms          : null,
			placeables     : null,
			vehicles       : null,
		},
	}

	#xmlParser = null
	#sections  = ['placeables', 'farms', 'careerSavegame', 'vehicles']

	constructor( filePath, isFolder, log = null ) {
		this.#fileName = filePath
		this.#logName  = `savegame-${path.basename(filePath)}`
		this.#log      = log

		this.#log.log.info(`Adding Save: ${filePath}`, this.#logName)

		const alwaysArray   = [
			'farms.farm',
			'placeables.placeable',
			'vehicles.vehicle',
		]

		this.#xmlParser = new XMLParser({
			attributeNamePrefix    : '',
			attributesGroupName    : '$',
			ignoreAttributes       : false,
			ignoreDeclaration      : true,
			ignorePiTags           : true,
			isArray                : (_, jPath) => {
				return alwaysArray.indexOf(jPath) !== -1
			},
			parseAttributeValue    : true,
			parseTagValue          : true,
			transformAttributeName : (name) => name.toUpperCase(),
			transformTagName       : (name) => name.toLowerCase(),
			trimValues             : true,
		})

		if ( !isFolder ) {
			this.#readZip()
		} else {
			this.#readFolder()
		}
		if ( !this.#badSave ) {
			this.#processFarms()
			this.#processPlaceables()
			this.#processVehicles()
			this.#processCareer()
		}
	}

	#readZip() {
		let zipFile    = null
		try {
			zipFile    = new admZip(this.#fileName)
		} catch (e) {
			this.#badSave = true
			this.#log.log.danger(`Zip Open Fail: ${e}`, this.#logName)
			return
		}

		for ( const filename of this.#sections ) {
			try {
				if ( zipFile.getEntry(`${filename}.xml`) !== null ) {
					this.#xml.raw[filename] = zipFile.readAsText(`${filename}.xml`)
				} else {
					throw 'file not found'
				}
			} catch (e) {
				this.#log.log.danger(`Unreadable file: ${filename}.xml :: ${e}`, this.#logName)
				this.errorList.push(['SAVEGAME_UNREADABLE', `${filename}.xml`])
			}
		}

		zipFile = null
	}

	#readFolder() {
		for ( const filename of this.#sections ) {
			try {
				this.#xml.raw[filename] = fs.readFileSync(path.join(this.#fileName, `${filename}.xml`), 'utf-8')
			} catch (e) {
				this.#log.log.notice(`No ${filename}.xml found`, this.#logName)
				this.errorList.push(['SAVEGAME_UNREADABLE', `${filename}.xml`])
			}
		}
	}

	#parseXML(name) {
		if ( this.#xml.raw[name] === null ) {
			this.errorList.push(['SAVEGAME_PARSE_ERROR', `${name}.xml`])
			return false
		}

		try {
			this.#xml.parsed[name] = this.#xmlParser.parse(this.#xml.raw[name])
		} catch (e) {
			this.errorList.push(['SAVEGAME_PARSE_ERROR', `${name}.xml`])
			this.#log.log.danger(`Parsing ${name}.xml failed: ${e}`, this.#logName)
			return false
		}
		return true
	}

	#processFarms() {
		if ( ! this.#parseXML('farms') ) { return }

		try {
			if ( typeof this.#xml.parsed.farms?.farms?.farm === 'undefined' ) {
				throw 'incorrect xml format'
			}
			
			for ( const thisFarm of this.#xml.parsed.farms.farms.farm ) {
				this.farms[thisFarm.$.FARMID] = thisFarm.$.NAME
			}
		} catch (e) {
			this.errorList.push(['SAVEGAME_PARSE_ERROR', 'farms.xml'])
			this.#log.log.danger(`Parsing farms.xml failed: ${e}`, this.#logName)
		}
		if ( Object.keys(this.farms).length > 1 ) { this.singleFarm = false }
		this.farms[0] = '--unowned--'
	}

	#processPlaceables() {
		if ( ! this.#parseXML('placeables') ) { return }

		try {
			if ( typeof this.#xml.parsed.placeables?.placeables?.placeable === 'undefined' ) {
				throw 'incorrect xml format'
			}

			for ( const thisPlace of this.#xml.parsed.placeables.placeables.placeable ) {
				const modName = thisPlace.$.MODNAME
				const farmID  = thisPlace.$.FARMID
				if ( typeof modName !== 'undefined' ) {
					this.#placeables[modName] ??= new Set()
					this.#placeables[modName].add(farmID)
				}
			}
		} catch (e) {
			this.errorList.push(['SAVEGAME_PARSE_ERROR', 'placeables.xml'])
			this.#log.log.danger(`Parsing placeables.xml failed: ${e}`, this.#logName)
		}
	}

	#processVehicles() {
		if ( ! this.#parseXML('vehicles') ) { return }

		try {
			if ( typeof this.#xml.parsed.vehicles?.vehicles?.vehicle === 'undefined' ) {
				throw 'incorrect xml format'
			}

			for ( const thisVehicle of this.#xml.parsed.vehicles.vehicles.vehicle ) {
				const modName = thisVehicle.$.MODNAME
				const farmID  = thisVehicle.$.FARMID
				if ( typeof modName !== 'undefined' ) {
					this.#vehicles[modName] ??= new Set()
					this.#vehicles[modName].add(farmID)
				}
			}
		} catch (e) {
			this.#log.log.danger(`Parsing vehicles.xml failed: ${e}`, this.#logName)
			this.errorList.push(['SAVEGAME_PARSE_ERROR', 'vehicles.xml'])
		}
	}

	#processCareer() {
		if ( ! this.#parseXML('careerSavegame') ) { return }
		
		try {
			this.mapMod = this.#xml.parsed.careerSavegame?.careersavegame?.settings?.mapid?.split?.('.')?.[0]

			for ( const thisMod of this.#xml.parsed.careerSavegame.careersavegame.mod ) {
				const modName    = thisMod.$.MODNAME
				const modTitle   = thisMod.$.TITLE
				const modVersion = thisMod.$.VERSION
				if ( typeof modName !== 'undefined' ) {
					const farmIDs = new Set()
					
					this.mods[modName] ??= {
						version : modVersion,
						title   : modTitle,
						farms   : new Set(),
					}
					
					if ( typeof this.#placeables[modName] !== 'undefined') {
						for ( const farmID of this.#placeables[modName] ) { farmIDs.add(farmID) }
					}
					if ( typeof this.#vehicles[modName] !== 'undefined' ) {
						for ( const farmID of this.#vehicles[modName] ) { farmIDs.add(farmID) }
					}

					Array.from(farmIDs).sort((a, b) => a - b).forEach((farmID) => {
						this.mods[modName].farms.add(this.farms[farmID])
					})
				}
			}
		} catch (e) {
			this.errorList.push(['SAVEGAME_PARSE_ERROR', 'careerSavegame.xml'])
			this.#log.log.danger(`Parsing careerSavegame.xml failed: ${e}`, this.#logName)
		}
	}
}

module.exports = {
	modFileChecker    : modFileChecker,
	modFileCollection : modFileCollection,
	modLooker         : modLooker,
	notModFileChecker : notModFileChecker,
	saveFileChecker   : saveFileChecker,
}


