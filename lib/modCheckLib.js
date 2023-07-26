/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Mod Checker Class, Mod Collection Class, Crop Calendar Reader Class, Mod Looker Class

const fs           = require('fs')
const path         = require('path')
const admZip       = require('adm-zip')
const {XMLParser}  = require('fast-xml-parser')
const crypto       = require('crypto')
const allLang      = require('./modLookerLang.json')
const alwaysArray  = require('./modCheckLib_static.js').alwaysArrays
const { globSync } = require('glob')
const { maIPC }    = require('./modUtilLib')


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

	#log                 = maIPC.log
	#loadingWindow       = maIPC.loading
	#localeFunction      = maIPC.l10n.deferCurrentLocale
	#map_CollectionNotes = maIPC.notes
	#modCache            = maIPC.modCache
	#siteStore           = {}
	#modCacheStore       = {}
	#settings            = maIPC.settings
	#updateReady         = false

	#userHome        = ''
	#useSyncSafeMode = false
	#skipCache       = false

	#scanPromise = []

	constructor(homeDir, skipCache = false) {
		this.#userHome            = homeDir
		this.#skipCache           = skipCache
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
				this.#modHubList.last.includes(parseInt(modHubID))
			] : {
				id      : modHubID,
				version : this.modHubVersionModHubId(modHubID),
				recent  : this.#modHubList.last.includes(parseInt(modHubID)),
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

	modColUUIDToFolderAndRecord(ID) {
		const idParts = ID.split('--')
		return {
			folder : this.#map_CollectionToFolder[idParts[0]],
			mod    : this.#list_allMods?.[idParts[0]]?.mods?.[idParts[1]] || null,
		}
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

	getMD5FromFolder(folder) { return this.#getMD5Hash(folder, 'col_') }
	
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

		return Promise.all(this.#scanPromise).then(() => {
			this.#modCache.store = this.#modCacheStore
			this.#doAlphaSort()
			this.#processBindConflicts()
			this.#doBadges()
		})
	}

	get processPromise() { return Promise.all(this.#scanPromise) }

	#doAlphaSort() {
		for ( const collectKey of this.#set_Collections ) {
			this.#list_allMods[collectKey].alphaSort.sort(Intl.Collator().compare)
		}
	}

	#doModBadge(modRecord, hasConflicts = false, hasDepend = false) {
		if ( modRecord.fileDetail.isSaveGame ) {
			return [['savegame', ['', '']], ['notmod', ['', '']]]
		}

		const newBadge  = new badgeHandle(modRecord.badgeArray)
		const thisMHRec = this.modHubFullRecord(modRecord, false)

		if ( thisMHRec.id !== null ) {
			if ( modRecord.modDesc.version !== thisMHRec.version ) {
				newBadge.add('update')
			}
			if ( thisMHRec.recent ) {
				newBadge.add('recent')
			}
		} else {
			newBadge.add('nonmh')
		}

		newBadge.add(`fs${modRecord.gameVersion}`)
		newBadge.addClass(`fs${modRecord.gameVersion}`, `bdg_no_fs${modRecord.gameVersion}`)

		if ( Object.hasOwn(this.#siteStore, modRecord.fileDetail.shortName) ) {
			newBadge.add('web')
		}

		if ( Object.keys(modRecord.modDesc.binds).length > 0 ) {
			if ( hasConflicts !== false ) {
				newBadge.add('keys_bad')
				newBadge.addTitle('keys_bad', hasConflicts)
			} else {
				newBadge.add('keys_ok')
			}
		}

		if ( hasDepend !== false ) {
			if ( hasDepend.length > 0 ) {
				newBadge.add('depend_flag')
				newBadge.addTitle('depend_flag', hasDepend)
			} else {
				newBadge.add('depend')
			}
		}

		newBadge.pruneOn('keys_bad', 'keys_ok')
		newBadge.pruneOn('notmod', 'broken')
		newBadge.pruneOn('notmod', 'fs0')
		newBadge.pruneOn('notmod', 'nonmh')
		newBadge.pruneOn('notmod', 'noMP')
		newBadge.pruneOn('notmod', 'problem')

		return newBadge.keyList
	}

	getConflictInCollection(collectKey, modRecord) {
		const conflictList = this.#bindConflict[collectKey][modRecord.fileDetail.shortName]

		if ( typeof conflictList === 'undefined' ) { return false }

		const theseConflicts = this.#bindConflict[collectKey]
		const badKeys        = Object.keys(conflictList)
		const confMods       = new Set()

		for ( const badKey of badKeys ) {
			for ( const potential in theseConflicts ) {
				if ( Object.hasOwn(theseConflicts[potential], badKey) ) {
					confMods.add(potential)
				}
			}
		}
		confMods.delete(modRecord.fileDetail.shortName)

		return [...confMods]
	}

	getDependInCollection(collectKey, modRecord) {
		if ( modRecord.modDesc.depend.length < 1 ) { return false }
		const metSet = this.getModCollection(collectKey).dependSet
		return modRecord.modDesc.depend.filter((x) => ! metSet.has(x))
	}

	#doBadges() {
		this.#siteStore = maIPC.sites.store
		for ( const collectKey of this.#set_Collections ) {
			const thisCollect = this.getModCollection(collectKey)
			for ( const thisModKey of thisCollect.modSet ) {
				const thisModRecord = this.#list_allMods[collectKey].mods[thisModKey]
				const newBadges     = this.#doModBadge(
					thisModRecord,
					this.getConflictInCollection(collectKey, thisModRecord),
					this.getDependInCollection(collectKey, thisModRecord)
				)
				thisModRecord.displayBadges = newBadges
			}
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
			this.#log.log.warning(`Unable to stat file ${thisFile.name} in ${folderLoc} : ${e}`, 'collection-reader')
			fileStats.isFolder  = false
			fileStats.size      = 0
			fileStats.date      = new Date(1969, 1, 1, 0, 0, 0, 0)
			fileStats.birthDate = new Date(1969, 1, 1, 0, 0, 0, 0)
			fileStats.error     = true
		}
		return fileStats
	}

	#util_between(low, check, high) { return ( check >= low && check <= high ) }
	#util_gameVersion(dVer) {
		if ( this.#util_between(4,  dVer, 6) )  { return 11 }
		if ( this.#util_between(9,  dVer, 16) ) { return 13 }
		if ( this.#util_between(20, dVer, 25) ) { return 15 }
		if ( this.#util_between(31, dVer, 39) ) { return 17 }
		if ( this.#util_between(40, dVer, 53) ) { return 19 }
		if ( dVer > 60 ) { return 22 }
		return 0
	}

	#addModToData(collectKey, modRecord) {
		const thisModRecord = { ...modRecord }

		thisModRecord.currentCollection = collectKey
		thisModRecord.colUUID           = `${collectKey}--${thisModRecord.uuid}`
		thisModRecord.modHub            = this.modHubFullRecord(thisModRecord, false)
		thisModRecord.gameVersion       = this.#util_gameVersion(thisModRecord.modDesc.descVersion)
		
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


		this.#cleanBindConflicts()
	}

	#cleanBindConflicts() {
		for ( const collectKey in this.#bindConflict ) {
			for ( const modName in this.#bindConflict[collectKey] ) {
				if ( Object.keys(this.#bindConflict[collectKey][modName]).length === 0 ) {
					delete this.#bindConflict[collectKey][modName]
				}
			}
		}
	}

	async #addMod(collectKey, thisFile) {
		return new Promise((resolve) => {
			let stopper = false
			const thisFileStats = this.#fileStats(collectKey, thisFile)

			// Check cache
			const modInCache    = this.#cacheHit(thisFileStats)
			if ( modInCache ) {
				this.#log.log.debug(`Adding mod FROM cache: ${modInCache.fileDetail.shortName}`, `mod-${modInCache.uuid}`)
				this.#addModToData(collectKey, modInCache)
				this.#loadingWindow.current()
				stopper = true
				resolve(true)
			}
		
			if ( !stopper && !thisFileStats.isFolder && !thisFile.name.endsWith('.zip') ) {
				const thisModRecord = new notModFileChecker(
					thisFileStats.fullPath,
					false,
					thisFileStats.size,
					thisFileStats.date
				)
				this.#addModToData(collectKey, thisModRecord)
				this.#loadingWindow.current()
				stopper = true
				resolve(true)
			}
		
			if ( !stopper ) {
				resolve(new modFileChecker(
					thisFileStats.fullPath,
					thisFileStats.isFolder,
					thisFileStats.size,
					(this.#useSyncSafeMode) ? thisFileStats.birthDate : thisFileStats.date,
					thisFileStats.hashString
				).getInfo().then((results) => {
					this.#addModToData(collectKey, results)

					if ( thisFileStats.hashString !== null && !results.canNotUse ) {
						this.#log.log.info('Adding mod to cache', `mod-${results.uuid}`)
						this.#list_newMods.add(thisFileStats.hashString)
						this.#modCacheStore[thisFileStats.hashString] = results
					}
				}).catch((err) => {
					this.#log.log.danger(`Couldn't process file: ${thisFileStats.fullPath} :: ${err}`, 'collection-reader')
					const notModRecord = new notModFileChecker(
						thisFileStats.fullPath,
						false,
						thisFileStats.size,
						thisFileStats.date
					)
					this.#addModToData(collectKey, notModRecord)
				}))
				this.#loadingWindow.current()
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
			notes_holding    : false,
			notes_last       : new Date(1900, 1, 1),
			notes_notes      : null,
			notes_password   : null,
			notes_removable  : false,
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

	set updateIsReady(newValue = true) { this.#updateReady = newValue }
	get updateIsReady() { return this.#updateReady }

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
				updateReady                : this.#updateReady,
			}
		})
	}

	#toHomeDir(folder) {
		return (typeof folder === 'string') ? folder.replaceAll(this.#userHome, '~') : folder
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
	#iconParser     = maIPC.decode

	#modHandle = null
	
	constructor(filePath, isFolder, size, date, md5Pre = null) {
		this.fileDetail.fullPath = filePath
		this.fileDetail.isFolder = isFolder
		this.fileDetail.fileSize = size
		this.fileDetail.fileDate = date.toISOString()
		
		this.md5Sum    = md5Pre
		this.#locale   = maIPC.l10n.deferCurrentLocale()

		this.fileDetail.shortName = path.parse(this.fileDetail.fullPath).name

		this.#flag_info.INFO_NO_MULTIPLAYER_UNZIPPED = this.fileDetail.isFolder
	}

	async getInfo() {
		return new Promise((resolve) => {
			this.uuid      = crypto.createHash('md5').update(this.fileDetail.fullPath).digest('hex')
			this.#log      = maIPC.log.group(`mod-${this.uuid}`)
			this.#log.info(`Adding Mod File: ${this.fileDetail.shortName}`)
			
			const isValidMod = this.#doStep_validFileName

			try {
				if ( !isValidMod ) {
					this.#util_raiseFlag_broken('FILE_ERROR_NAME_INVALID')
					throw 'Invalid Mod'
				}

				this.#modHandle = new fileHandler(this.fileDetail.fullPath, this.fileDetail.isFolder, this.#log)

				if ( ! this.#modHandle.isOpen ) {
					this.#util_raiseFlag_broken('FILE_ERROR_UNREADABLE_ZIP')
					throw 'Unreadable ZIP File'
				}
				
				if ( this.#modHandle.exists('careerSavegame.xml')) {
					this.fileDetail.isSaveGame = true
					this.modDesc.version       = '--'
					this.#util_raiseFlag_info('FILE_IS_A_SAVEGAME')
					throw 'Savegame Detected'

				}

				if ( this.#modHandle.exists('modDesc.xml') === null ) {
					this.#util_raiseFlag_broken('NOT_MOD_MODDESC_MISSING')
					this.md5Sum                 = null
					
					throw 'ModDesc Missing, Invalid, or Un-Readable'
				}

				this.#doStep_fileCounts()
				this.#doStep_parseModDesc()
				
				if ( this.modDesc.mapConfigFile !== null ) {
					try {
						if (! this.#modHandle.exists(this.modDesc.mapConfigFile) ) { throw 'Config file does not Exist'}

						const cropInfo = new cropDataReader(
							...this.#doStep_parseMapXML(this.modDesc.mapConfigFile).map((x) => this.#modHandle.readText(x))
						)

						this.modDesc.cropInfo   = cropInfo.crops
						this.modDesc.mapIsSouth = cropInfo.isSouth
					} catch (e) {
						this.#log.notice(`Caught map fail: ${e}`)
					}
				}

				try {
					if ( this.#flag_problem.MOD_ERROR_NO_MOD_ICON || typeof this.modDesc.iconFileName !== 'string' || ! this.#modHandle.exists(this.modDesc.iconFileName) ) {
						throw 'File does not Exist'
					}

					this.modDesc.iconImageCache = this.#iconParser.parseDDS(
						this.#modHandle.readBin(this.modDesc.iconFileName),
						false
					)
				} catch (e) {
					this.#util_raiseFlag_problem('MOD_ERROR_NO_MOD_ICON')
					this.#log.notice(`Caught icon fail: ${e}`)
				}
			} catch (err) {
				this.#log.notice(`Stopping Mod Parse : ${err}`)
			} finally {
				this.#doStep_l10n()
				this.#modHandle?.close?.()
			}
			this.#modHandle    = null
			this.modDescParsed = null
			this.modDescRAW    = null

			resolve(this.storable)
		})
	}

	get storable() {
		return {
			badgeArray        : this.#doStep_badges,
			canNotUse         : this.#doStep_canUse,
			currentCollection : this.currentCollection,
			fileDetail        : this.fileDetail,
			issues            : Object.entries({...this.#flag_broken, ...this.#flag_problem, ...this.#flag_info}).filter((x) => x[1] === true).map((x) => x[0]),
			l10n              : this.#l10n,
			md5Sum            : this.md5Sum,
			modDesc           : this.modDesc,
			uuid              : this.uuid,
		}
	}

	#doStep_fileCounts() {
		for ( const checkFile of this.#modHandle.listFiles() ) {
			const fileName = this.fileDetail.isFolder ? checkFile.name : checkFile.entryName

			if ( fileName.includes(' ') ) {
				this.fileDetail.spaceFiles.push(fileName)
				this.#util_raiseFlag_problem('PERF_SPACE_IN_FILE')
			}
			
	
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
		return this.fileDetail.isSaveGame ? true : Object.entries(this.#flag_broken).filter((x) => x[1] === true).length > 0
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
			broken  : this.fileDetail.isSaveGame ? false : Object.entries(this.#flag_broken).filter((x) => x[1] === true).length > 0,
			folder  : this.fileDetail.isFolder,
			noMP    : ! this.modDesc.multiPlayer && this.fileDetail.isFolder,
			notmod  : this.#flag_broken.NOT_MOD_MODDESC_MISSING,
			pconly  : (this.modDesc.scriptFiles > 0),
			problem : this.fileDetail.isSaveGame ? false : Object.entries(this.#flag_problem).filter((x) => x[1] === true).length > 0,
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

		if ( shortName.match(/^[0-9]/) ) {
			this.#util_raiseFlag_broken('FILE_ERROR_NAME_STARTS_DIGIT')
			return false
		}

		if ( ! shortName.match(/^[a-zA-Z_][a-zA-Z0-9_]+$/) ) {
			const copyName = shortName.match(/^([a-zA-Z][a-zA-Z0-9_]+)(?: - .+$| \(.+$)/)

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

		this.modDesc.author        = this.#modDesc_default(this.modDescParsed?.author, 'n/a')
		this.modDesc.multiPlayer   = this.#modDesc_default(this.modDescParsed?.multiplayer?.$?.SUPPORTED, false)
		this.modDesc.storeItems    = this.#modDesc_default(this.modDescParsed?.storeitems?.storeitem?.length, 0)
		this.modDesc.mapConfigFile = this.#modDesc_default(this.modDescParsed?.maps?.map?.[0]?.$?.CONFIGFILENAME)
		this.modDesc.depend        = this.#modDesc_default(this.modDescParsed?.dependencies?.dependency, [])
		
		this.#flag_problem.INFO_MIGHT_BE_PIRACY = typeof ( this.modDescParsed?.productid ) !== 'undefined'

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
			if ( typeof this.modDescParsed?.actions?.action !== 'undefined' ) {
				for ( const action of this.modDescParsed.actions.action ) {
					this.modDesc.actions[action.$.NAME] = action.$.CATEGORY || 'ALL'
				}
			}
			if ( typeof this.modDescParsed?.inputbinding?.actionbinding !== 'undefined' ) {
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
		} catch (e) {
			this.#log.warning(`Key binding read failed : ${e}`)
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

	#util_countFile(suffix, fileName, size) {
		const shortSuffix = suffix.substring(1)
		const knownGood   = new Set(['png', 'dds', 'i3d', 'shapes', 'lua', 'gdm', 'cache', 'xml', 'grle', 'pdf', 'txt', 'gls', 'anim', 'ogg'])

		if ( !knownGood.has(shortSuffix) ) {
			if ( shortSuffix === 'l64' || shortSuffix === 'dat' ) {
				this.#util_raiseFlag_problem('INFO_MIGHT_BE_PIRACY')
			}
			this.#util_raiseFlag_problem('PERF_HAS_EXTRA')
			this.fileDetail.extraFiles.push(fileName)
			return
		}

		switch (shortSuffix) {
			case 'png' :
				this.#util_tick_count('png')
				this.fileDetail.imageNonDDS.push(fileName)
				this.fileDetail.pngTexture.push(fileName)
				break
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
		return ( typeof fileName !== 'undefined' && fileName !== null && !fileName.startsWith('$') ) ? fileName : null
	}
}

class notModFileChecker {
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
		isSaveGame  : false,
		pngTexture  : [],
		shortName   : false,
		spaceFiles  : [],
		tooBigFiles : [],
	}

	badgeArray    = ['broken', 'notmod']
	canNotUse     = true
	currentLocale = null

	#log = null

	constructor( filePath, isFolder, size, date) {
		this.fileDetail.fullPath = filePath
		this.fileDetail.size     = size
		this.fileDetail.fileDate = date.toISOString()
		this.fileDetail.isFolder = isFolder

		this.uuid = crypto.createHash('md5').update(filePath).digest('hex')
		this.#log = maIPC.log.group(`mod-${this.uuid}`)

		this.#log.info(`Adding NON Mod File: ${filePath}`)

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
				harvestPeriods : Array.from(this.#cropData[cropName].harvest),
				name           : cropName,
				plantPeriods   : Array.from(this.#cropData[cropName].plant),
			})
		}
	}

	#util_inRange(testMax, thisFruit) {
		return ( testMax >= this.#cropData[thisFruit].minHarvest && testMax <= this.#cropData[thisFruit].maxHarvest )
	}
	#util_default(data, fallback = null) { return data ?? fallback }
	#util_realIndex(index)               { return index < 13 ? index : index % 12 }

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
	#iconParser     = maIPC.decode
	#fullFileName   = null
	#locale         = null
	#log            = null
	#l10n           = null
	#modRecord      = null
	#path           = null
	#skipIcons      = false

	#langData = { }

	#infoData = {
		brands : {},
		icons  : {},
		items  : {},
	}

	#catDescMap  = require('./modCheckLib_static').catDescMap
	#fillCats    = require('./modCheckLib_static').fillCats
	#getColor    = require('./modCheckLib_static').getColor

	#modHandle = null

	constructor( modRecord, modCollectFolder, skipIcons = false ) {
		// modRecord from collection, folder for collection, skip Icons bool
		this.#log        = maIPC.log.group(`modLook-${modRecord.fileDetail.shortName}`)
		this.#l10n       = maIPC.l10n
		this.#modRecord  = modRecord
		this.#path       = modCollectFolder
		this.#skipIcons  = skipIcons
		this.#locale     = maIPC.l10n.deferCurrentLocale()

		this.#fullFileName = path.join(this.#path, path.basename(this.#modRecord.fileDetail.fullPath))

		this.#langData = typeof allLang[this.#locale] !== 'undefined' ? allLang[this.#locale] : allLang.en
	}

	async getInfo() {
		this.#modHandle = new fileHandler(this.#fullFileName, this.#modRecord.fileDetail.isFolder, this.#log)

		if ( ! this.#modHandle.isOpen ) { return null }

		const modDescTree     = this.#modHandle.readXML('modDesc.xml')
		const storeItemFiles  = this.#getStoreItems(modDescTree)

		this.#infoData.brands = this.#getExtraBrands(modDescTree)

		this.#langData = { ...this.#langData, ...this.#getLangKeys(modDescTree) }

		for ( const thisItem of storeItemFiles ) {
			const thisItemTree = this.#modHandle.readXML(thisItem, 'modlook')
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

		this.#modHandle.close()
		this.#modHandle = null

		return this.#infoData
	}

	#getLangKeys(modDescTree) {
		let langByKey = {}

		if ( modDescTree !== null && typeof modDescTree.moddesc.l10n !== 'undefined' ) {
			const fileName = modDescTree.moddesc.l10n?.$?.FILENAMEPREFIX || null

			if ( fileName !== null ) {
				for ( const langKey of [this.#locale, 'en', 'de'] ) {
					const langFile = this.#modHandle.readXML(`${fileName}_${langKey}.xml`)
					if ( langFile !== null ) {
						if ( typeof langFile.l10n.texts !== 'undefined' ) {
							langByKey = { ...langByKey, ...langFile.l10n.texts.text.reduce((last, x) => {
								return {...last, [x.$.NAME] : x.$.TEXT}
							}, {})}

							break
						}
						if ( typeof langFile.l10n.elements !== 'undefined' ) {
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
		if ( typeof iconFile !== 'string' || iconFile === null ) { return null }

		if ( iconFile.startsWith('$data/store/brands/') ) {
			return `img/brand/${iconFile.substring(19).slice(0, -4).toLowerCase()}.png`
		}

		const fileName = ( ! iconFile.endsWith('.dds') ) ? `${iconFile.slice(0, -4)}.dds` : iconFile

		try {
			if ( this.#modHandle.exists(fileName) ) {
				return this.#iconParser.parseDDS(
					this.#modHandle.readBin(fileName),
					true
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
		if ( typeof xml === 'undefined' ) { return {} }

		for ( const key in xml ) {
			if ( key !== 'combination' ) {
				returner[key] = xml[key]
			}
		}
		return returner
	}

	#translate_single(key) {
		if ( key === null || typeof key === 'undefined' ) { return null }
		if ( typeof key === 'boolean' || ! key.startsWith('$l10n') ) { return key }
		
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
	#util_getGTCount(key, count = 1) { return typeof key === 'undefined' ? false : key > count}

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
		
		return returnObject
	}

	#parseWeight(xml) {
		if ( typeof xml === 'undefined' ) { return 0 }

		return xml.reduce((total, current) => total + current?.$?.MASS ?? 0, 0)
	}

	#parseBrand(xml) {
		if ( typeof xml === 'undefined' || xml === null ) { return null }
		if ( typeof xml === 'string' ) { return xml }
		if ( typeof xml?.['#text'] === 'string' ) { return xml['#text'] }
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

		for ( let i = 0; i < xml.length; i++ ) {
			const thisMotor = xml[i]

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
				viewHP !== null ? `${viewHP}${this.#l10n.syncStringLookup('unit_hp')}` : null,
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
		if ( typeof storeData?.bundleelements !== 'undefined' ) { return null }

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
		} catch (e) {
			return null
		}
	}

	#parseName(xml, fallback = 'unknown') {
		if ( typeof xml === 'undefined' ) { return fallback }
		if ( typeof xml === 'string' ) { return this.#translate(xml) }

		if ( Object.hasOwn(xml, this.#locale) ) { return xml[this.#locale] }
		if ( Object.hasOwn(xml, 'en') ) { return xml.en }
		if ( Object.hasOwn(xml, 'de') ) { return xml.de }
		return fallback
	}
}

class saveFileChecker {
	#fileName   = null
	#isFolder   = false
	#fileHandle = null
	#log        = null

	errorList   = []
	singleFarm  = true
	farms       = {}
	mapMod      = null
	mods        = {}

	#placeables = {}
	#vehicles   = {}

	constructor( fileName, isFolder ) {
		this.#fileName = fileName
		this.#isFolder = isFolder
		this.#log      = maIPC.log.group(`savegame-${path.basename(fileName)}`)

		this.#log.info(`Adding Save: ${fileName}`)
	}

	get dataReturn() {
		return {
			errorList  : this.errorList,
			farms      : this.farms,
			mapMod     : this.mapMod,
			mods       : this.mods,
			singleFarm : this.singleFarm,
		}
	}

	async getInfo() {
		this.#fileHandle = new fileHandler(this.#fileName, this.#isFolder, this.#log)

		if ( ! this.#fileHandle.isOpen ) {
			this.#log.danger(`Save open fail: ${this.#fileName}`)
			this.errorList.push(['SAVEGAME_UNREADABLE', this.#fileName])
			return this.dataReturn
		}

		this.#doStep_farms()
		this.#doStep_placeables()
		this.#doStep_vehicles()
		this.#doStep_career()

		this.#fileHandle.close()
		this.#fileHandle = null

		return this.dataReturn
	}

	#util_readError(type) {
		this.errorList.push(['SAVEGAME_PARSE_ERROR', `${type}.xml`])
		this.#log.warning(`Parsing ${type}.xml failed`)
	}

	#util_iterateXML(data) {
		const returnObj = {}
		for ( const thisItem of data ) {
			const modName = thisItem?.$?.MODNAME ?? null
			const farmID  = thisItem?.$?.FARMID ?? 0
			if ( modName !== null ) {
				returnObj[modName] ??= new Set()
				returnObj[modName].add(farmID)
			}
		}
		return returnObj
	}

	#doStep_farms() {
		const thisXML = this.#fileHandle.readXML('farms.xml', 'savegame', 'farms')

		if ( thisXML === null || typeof thisXML.farm === 'undefined' ) {
			this.#util_readError('farms')
			return
		}

		for ( const thisFarm of thisXML.farm ) {
			this.farms[thisFarm.$.FARMID] = thisFarm.$.NAME
		}

		if ( Object.keys(this.farms).length > 1 ) { this.singleFarm = false }
		this.farms[0] = '--unowned--'
	}

	#doStep_placeables() {
		const thisXML = this.#fileHandle.readXML('placeables.xml', 'savegame', 'placeables')

		if ( thisXML === null || typeof thisXML.placeable === 'undefined' ) {
			this.#util_readError('placeables')
			return
		}

		this.#placeables = this.#util_iterateXML(thisXML.placeable)
	}

	#doStep_vehicles() {
		const thisXML = this.#fileHandle.readXML('vehicles.xml', 'savegame', 'vehicles')

		if ( thisXML === null || typeof thisXML.vehicle === 'undefined' ) {
			this.#util_readError('vehicles')
			return
		}

		this.#vehicles = this.#util_iterateXML(thisXML.vehicle)
	}

	#doStep_career() {
		const thisXML = this.#fileHandle.readXML('careerSavegame.xml', 'savegame', 'careersavegame')

		if ( thisXML === null ) {
			this.#util_readError('careerSavegame')
			return
		}

		this.mapMod = thisXML?.settings?.mapid?.split?.('.')?.[0] ?? null

		if ( typeof thisXML.mod !== 'undefined' ) {
			for ( const thisMod of thisXML.mod ) {
				const modName    = thisMod?.$.MODNAME ?? null
				const modTitle   = thisMod?.$.TITLE ?? 'n/a'
				const modVersion = thisMod?.$.VERSION ?? '0.0.0.0'
				if ( modName !== null ) {
					let farmIDs = new Set()
							
					this.mods[modName] ??= {
						version : modVersion,
						title   : modTitle,
						farms   : new Set(),
					}
							
					if ( Object.hasOwn(this.#placeables, modName) ) {
						farmIDs = new Set([...farmIDs, ...this.#placeables[modName]])
					}
					if ( Object.hasOwn(this.#vehicles, modName) ) {
						farmIDs = new Set([...farmIDs, ...this.#vehicles[modName]])
					}
		
					this.mods[modName].farms = new Set(Array.from(farmIDs).sort((a, b) => a - b))
				}
			}
		}
	}
}

class savegameTrack {
	#log       = null
	#savePath  = null
	#xmlParser = null

	#saveMods = {
		current : [],
		byDate  : [],
	}

	constructor(savePath) {
		this.#savePath = savePath
		this.#log      = maIPC.log.group(`savegame_track_${path.basename(savePath)}`)

		this.#xmlParser = fileHandler.getParser('savegame')
	}

	async getInfo() {
		try {
			const backupFileList = this.#doStep_findFiles()
			const currentSave    = this.#doStep_readFile(this.#savePath)

			if ( currentSave === null ) { throw 'Original save could not be read' }

			this.#saveMods.current = currentSave.mods
			this.#saveMods.saveID  = path.basename(this.#savePath)

			for ( const thisBackup of backupFileList ) {
				const theseMods    = this.#doStep_readFile(thisBackup)

				if ( theseMods === null || theseMods.map !== currentSave.map ) { continue }

				const onlyBackup   = theseMods.mods.filter((x) => !currentSave.mods.includes(x))
				const onlyOriginal = currentSave.mods.filter((x) => !theseMods.mods.includes(x))

				this.#saveMods.byDate.push({
					date         : path.basename(thisBackup).replace(/savegame\d+_backup/, ''),
					duplicate    : onlyBackup.length === 0 && onlyOriginal.length === 0,
					mods         : theseMods.mods,
					onlyBackup   : onlyBackup,
					onlyOriginal : onlyOriginal,
				})
			}

			this.#saveMods.byDate.sort(Intl.Collator().compare)

			if ( this.#saveMods.byDate.length < 1 ) {
				throw 'No backups found for savegame, useless results'
			}
		} catch (e) {
			this.#log.notice(e)
		}
		return this.#saveMods
	}

	#doStep_readFile(folder) {
		const fullFileName = path.join(folder, 'careerSavegame.xml')

		if ( !fs.existsSync(fullFileName) ) {
			throw `careerSavegame.xml does not exist: ${folder}`
		}

		const thisXML = this.#xmlParser.parse(fs.readFileSync(fullFileName, 'utf-8'))?.careersavegame ?? null
		
		if ( thisXML === null ) {
			throw `Parsing careerSavegame.xml failed: ${folder}`
		}

		return {
			map  : thisXML?.settings?.maptitle ?? null,
			mods : thisXML?.mod?.map?.((x) => x?.$?.MODNAME) ?? [],
		}
	}

	#doStep_findFiles () {
		const backupPath = path.join(path.dirname(this.#savePath), 'savegameBackup')

		if ( !fs.existsSync(this.#savePath) ) { throw 'Original Save Not Found' }
		if ( !fs.existsSync(backupPath) )     { throw 'Backup Folder Not Found' }

		const fileList = globSync(`${path.basename(this.#savePath)}_**`, { cwd : path.join(backupPath), stat : true, withFileTypes : true })
			.filter((x) => x.isDirectory())
			.map((x) => path.join(x.path, x.name))
		
		if ( fileList < 1 ) { throw 'No Valid Backups Found' }

		return fileList
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

		if ( ! this.#isFolder ) {
			try {
				if ( ! fileName.endsWith('.zip') ) { throw 'Not a ZIP File' }
				this.#ZIPFile = new admZip(fileName)
				this.#isOpen   = true
			} catch (e) {
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
		} catch (e) {
			this.#log.warning(`Caught unrecoverable XML Parse error ${fileName}`)
			return false
		}
	}

	#readFile(fileName, text = true) {
		try {
			if ( ! this.exists(fileName) ) { throw 'Non-existent' }
		
			if ( this.#isFolder ) {
				return text ?
					fs.readFileSync(path.join(this.#folderName, fileName), 'utf8') :
					fs.readFileSync(path.join(this.#folderName, fileName), null).buffer
			}
			return text ? this.#ZIPFile.readAsText(fileName) : this.#ZIPFile.readFile(fileName).buffer
		} catch (err) {
			this.#log.debug(`File-Manager file read error ${fileName} :: ${err}`)
			return null
		}
	}
}

class badgeHandle {
	#baseSet   = null
	#extraData = {}

	constructor(initArray = []) {
		this.#baseSet = new Set()
		for ( const key of initArray ) {
			this.add(key)
		}
	}

	get keyList() {
		const sorted = Array.from(this.#baseSet).sort(Intl.Collator().compare)
		const returnArray = []

		for ( const key of sorted ) {
			returnArray.push([key, [
				[...this.#extraData[key].cls].join(' '),
				[...this.#extraData[key].title].sort(Intl.Collator().compare).join(', '),
			]])
		}
		return returnArray
	}

	pruneOn(checkKey, removeKey) {
		if ( this.#baseSet.has(checkKey) ) { this.del(removeKey) }
	}

	add(key) {
		this.#baseSet.add(key)
		this.#extraData[key] ??= { cls : new Set(), title : new Set() }
		if ( key === 'pconly' ) { this.addClass(key, [
			'bdg_no_fs13',
			'bdg_no_fs15',
			'bdg_no_fs17',
			'bdg_no_fs19'
		]) }
		if ( key === 'nonmh' ) { this.addClass(key, 'bdg_no_fs13') }
	}
	del(key) {
		this.#baseSet.delete(key)
		delete this.#extraData[key]
	}

	addClass(key, cls) {
		this.#addExtra(key, 'cls', cls)
	}
	delClass(key, cls) {
		this.#extraData[key].cls.delete(cls)
	}

	addTitle(key, title) {
		this.#addExtra(key, 'title', title)
	}
	delTitle(key, title) {
		this.#extraData[key].title.delete(title)
	}

	#addExtra(key, space, extra) {
		if ( typeof extra === 'string' ) {
			this.#extraData[key][space].add(extra)
		} else if ( typeof extra === 'object' ) {
			this.#extraData[key][space] = new Set([...this.#extraData[key][space], ...extra])
		}
	}
}

module.exports = {
	modFileChecker    : modFileChecker,
	modFileCollection : modFileCollection,
	modLooker         : modLooker,
	notModFileChecker : notModFileChecker,
	saveFileChecker   : saveFileChecker,
	savegameTrack     : savegameTrack,
}


