/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Mod Collection Class, File Handler Class, Save File Reader, Save Tracker

const fs           = require('node:fs')
const fsPromise    = require('node:fs/promises')
const path         = require('node:path')
const cp           = require('node:child_process')
const crypto       = require('node:crypto')
const admZip       = require('adm-zip')
const {XMLParser}  = require('fast-xml-parser')
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
	#settings            = maIPC.settings
	#updateReady         = false
	#badgeNamed          = {}

	#userHome        = ''
	#useSyncSafeMode = false
	#skipCache       = false

	#scanPromise = []

	#threadPool      = []
	#threadPoolCount = 0
	#threadPoolMax   = 3
	#threadCurrent   = 0
	#threadDoneEmit  = null

	constructor(homeDir, emitter, skipCache = false) {
		this.#userHome            = homeDir
		this.#skipCache           = skipCache
		this.#threadDoneEmit      = emitter
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
		} catch (err) {
			this.#log.log.danger(`Couldn't read folder: ${thisRealPath} :: ${err}`, 'collection-reader')
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
			requireArr : [],
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

	#startThreads() {
		this.#threadPool.length = 0
		this.#threadPoolCount   = 0
		this.#threadCurrent     = 0

		for ( let idx = 1; idx <= this.#threadPoolMax; idx++ ) {
			const thisThread = cp.fork(path.join(__dirname, 'queueRunner.js'), [
				idx,
				maIPC.decodePath,
				maIPC.l10n.deferCurrentLocale(),
				maIPC.l10n.syncStringLookup('unit_hp')
			])
			this.#threadPoolCount++
			thisThread.on('message', (m) => { this.#workQueueResponse.apply(this, [m]) })
			thisThread.on('exit',    (m) => { this.#workQueueDone.apply(this, [m]) })
			this.#threadPool.push(thisThread)
		}
	}

	#exitThreads() {
		for ( let idx = 0; idx < this.#threadPoolMax; idx++ ) {
			this.#threadPool[idx].send({ type : 'exit' })
		}
	}

	#workQueueResponse(m) {
		if ( Object.hasOwn(m, 'type') ) {
			switch (m.type) {
				case 'log' :
					this.#log.log[m.level](m.data.join(' '), `worker-thread-${m.pid}`)
					break
				case 'modRecord' :
					for ( const logLine of m.logLines.items ) {
						this.#log.log[logLine[0]](logLine[1], m.logLines.group)
					}
					this.#log.log.debug(`Sent(got) modRecord :: ${m.collectKey}--${m.modRecord.fileDetail.shortName}`, `worker-thread-${m.pid}`)
					this.#addModToData(m.collectKey, m.modRecord)

					if ( m.modRecord.md5Sum !== null && !m.modRecord.canNotUse ) {
						this.#log.log.info('Adding mod to cache', `mod-${m.modRecord.uuid}`)
						this.#list_newMods.add(m.modRecord.uuid)
						this.#modCache.setMod(m.modRecord.md5Sum, m.modRecord)
					}
					break
				default :
					break
			}
		}
	}

	#workQueueDone() {
		this.#threadPoolCount--
		if ( this.#threadPoolCount === 0 ) {
			this.processModsPost()
			this.#threadDoneEmit.emit('process-mods-done')
		}
	}

	async processMods() {
		this.#startThreads()

		for ( const collectKey of this.#set_Collections ) {
			for ( const thisFile of this.#map_FolderContents[collectKey] ) {
				this.#scanPromise.push(this.#addMod(collectKey, thisFile))
			}
		}
		this.#exitThreads()
	}

	processModsPost() {
		this.#modCache.saveFile()
		this.#doAlphaSort()
		this.#processBindConflicts()
		this.#doRequired()
		this.#doBadges()
	}

	get processPromise() { return Promise.all(this.#scanPromise) }

	#doRequired() {
		for ( const collectKey of this.#set_Collections ) {
			this.#list_allMods[collectKey].requireSet = new Set(this.#list_allMods[collectKey].requireArr)
			delete this.#list_allMods[collectKey].requireArr
		}
	}

	#doAlphaSort() {
		for ( const collectKey of this.#set_Collections ) {
			this.#list_allMods[collectKey].alphaSort.sort(Intl.Collator().compare)
		}
	}

	#doModBadge(modRecord, hasConflicts = false, hasDepend = false, requireSet) {
		if ( modRecord.fileDetail.isSaveGame ) {
			const shortCut = new badgeHandle(['notmod', 'savegame'], this.#badgeNamed)

			if ( modRecord.fileDetail.isFolder ) { shortCut.add('folder') }

			return shortCut.keyList
		}

		const newBadge  = new badgeHandle(modRecord.badgeArray, this.#badgeNamed)
		const thisMHRec = this.modHubFullRecord(modRecord, false)

		if ( this.#list_newMods.has(modRecord.uuid) ) {
			newBadge.add('new')
		}

		if ( modRecord.fileDetail.isFolder ) {
			if ( Object.hasOwn(this.#map_FolderToCollection, modRecord.fileDetail.fullPath) ) {
				newBadge.add('collect')
			}

			newBadge.add('noMP')
		}

		if ( requireSet.has(modRecord.fileDetail.shortName ) ) {
			newBadge.add('require')
		}

		if ( modRecord.modDesc.mapConfigFile !== null ) {
			newBadge.add('map')
		}

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

		if ( Object.keys(modRecord.modDesc.binds).length !== 0 ) {
			if ( hasConflicts !== false ) {
				newBadge.add('keys_bad')
				newBadge.addTitle('keys_bad', hasConflicts)
			} else {
				newBadge.add('keys_ok')
			}
		}

		if ( hasDepend !== false ) {
			if ( hasDepend.length !== 0 ) {
				newBadge.add('depend')
				newBadge.addTitle('depend', hasDepend)
			} else {
				newBadge.add('depend_flag')
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

		if ( typeof conflictList !== 'object' ) { return false }

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
		if ( modRecord.modDesc.depend.length === 0 ) { return false }
		const metSet = this.getModCollection(collectKey).dependSet
		return modRecord.modDesc.depend.filter((x) => ! metSet.has(x))
	}

	#populateBadgeL10n() {
		const allBadges = [
			'mod_badge_broken',
			'mod_badge_collect',
			'mod_badge_depend_flag',
			'mod_badge_depend',
			'mod_badge_folder',
			'mod_badge_fs0',
			'mod_badge_fs11',
			'mod_badge_fs13',
			'mod_badge_fs15',
			'mod_badge_fs17',
			'mod_badge_fs19',
			'mod_badge_fs22',
			'mod_badge_keys_bad',
			'mod_badge_keys_ok',
			'mod_badge_log',
			'mod_badge_map',
			'mod_badge_new',
			'mod_badge_nomp',
			'mod_badge_nonmh',
			'mod_badge_notmod',
			'mod_badge_pconly',
			'mod_badge_problem',
			'mod_badge_recent',
			'mod_badge_require',
			'mod_badge_savegame',
			'mod_badge_update',
			'mod_badge_web',
		]
		for ( const thisBadge of allBadges ) {
			this.#badgeNamed[thisBadge.substring(10)] = maIPC.l10n.syncStringLookup(thisBadge)
		}
	}

	#doBadges() {
		this.#populateBadgeL10n()
		this.#siteStore = maIPC.sites.store
		for ( const collectKey of this.#set_Collections ) {
			const thisCollect = this.getModCollection(collectKey)
			for ( const thisModKey of thisCollect.modSet ) {
				const thisModRecord = this.#list_allMods[collectKey].mods[thisModKey]
				const newBadges     = this.#doModBadge(
					thisModRecord,
					this.getConflictInCollection(collectKey, thisModRecord),
					this.getDependInCollection(collectKey, thisModRecord),
					this.#list_allMods[collectKey].requireSet
				)
				thisModRecord.displayBadges = newBadges
			}
		}
	}
		
	#cacheHit(thisFileStats) {
		if ( thisFileStats.folder || this.#skipCache || thisFileStats.hashString === null ) { return false }

		return this.#modCache.getMod(thisFileStats.hashString)
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

		let isSymLink = null

		try {
			if ( thisFile.isSymbolicLink() ) {
				const thisSymLink     = fs.readlinkSync(fullPath)
				const thisSymLinkStat = fs.lstatSync(path.join(folderLoc, thisSymLink))

				isSymLink = path.join(folderLoc, thisSymLink)

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
				fileStats.size = globSync('**', { cwd : (isSymLink !== null ? isSymLink : fullPath), stat : true, withFileTypes : true }).filter((x) => x.isFile()).map((x) => x.size).reduce((total, x) => total + x, 0)
			} else {
				fileStats.hashString = this.#getMD5Hash(`${thisFile.name}-${fileStats.size}-${(this.#useSyncSafeMode)?fileStats.birthDate.toISOString():fileStats.date.toISOString()}`)
			}
		} catch (err) {
			this.#log.log.warning(`Unable to stat file ${thisFile.name} in ${folderLoc} : ${err}`, 'collection-reader')
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
		if ( dVer >= 60 ) { return 22 }
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
		this.#list_allMods[collectKey].dependSet.add(thisModRecord.fileDetail.sortName)
		this.#list_allMods[collectKey].alphaSort.push(`${thisModRecord.fileDetail.shortName}::${thisModRecord.uuid}`)
		
		if ( Array.isArray(thisModRecord.modDesc.depend) ) {
			this.#list_allMods[collectKey].requireArr.push(...thisModRecord.modDesc.depend)
		}
		
		this.#loadingWindow.current()
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

	get #getCurrentThread() {
		this.#threadCurrent++
		if ( this.#threadCurrent >= this.#threadPoolCount ) {
			this.#threadCurrent = 0
		}
		return this.#threadCurrent
	}

	async #addMod(collectKey, thisFile) {
		const thisFileStats = this.#fileStats(collectKey, thisFile)

		// Check cache
		const modInCache    = this.#cacheHit(thisFileStats)
		if ( modInCache ) {
			this.#log.log.debug(`Adding mod FROM cache: ${modInCache.fileDetail.shortName}`, `mod-${modInCache.uuid}`)
			this.#addModToData(collectKey, modInCache)
			return
		}
		
		if ( !thisFileStats.isFolder && !thisFile.name.endsWith('.zip') ) {
			const thisModRecord = new notModFileChecker(
				thisFileStats.fullPath,
				false,
				thisFileStats.size,
				thisFileStats.date
			)
			this.#addModToData(collectKey, thisModRecord)

			return
		}

		this.#threadPool[this.#getCurrentThread].send({
			type : 'mod',
			data : {
				collectKey : collectKey,
				date       : (this.#useSyncSafeMode) ? thisFileStats.birthDate.toISOString() : thisFileStats.date.toISOString(),
				filePath   : thisFileStats.fullPath,
				isFolder   : thisFileStats.isFolder,
				md5Pre     : thisFileStats.hashString,
				size       : thisFileStats.size,
			},
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
			notes_unit_acre  : null,
			notes_unit_mile  : null,
			notes_unit_money : null,
			notes_unit_temp  : null,
			notes_username   : null,
			notes_version    : 22,
			notes_website    : null,
			notes_websiteDL  : false,
		}
		const safeOptions = {}

		for ( const collectKey of this.#set_Collections ) {
			safeOptions[collectKey] = {}
			for ( const optName in defaults ) {
				const rightNow = currentOptions?.[collectKey]?.[optName]
				safeOptions[collectKey][optName] = typeof rightNow !== 'undefined' ? rightNow : defaults[optName]
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
				badgeL10n                  : this.#badgeNamed,
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

class notModFileChecker {
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
		xmlDoc         : false,
		xmlParsed      : false,
	}

	issues = [
		'FILE_ERROR_NAME_INVALID',
		'FILE_ERROR_GARBAGE_FILE',
	]

	l10n = {
		title       : '--',
		description : '--',
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
		isLogFile   : false,
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
		this.fileDetail.fileSize = size
		this.fileDetail.fileDate = date.toISOString()
		this.fileDetail.isFolder = isFolder

		this.uuid = crypto.createHash('md5').update(filePath).digest('hex')
		this.#log = maIPC.log.group(`mod-${this.uuid}`)

		this.#log.info(`Adding NON Mod File: ${filePath}`)

		if ( !isFolder && filePath.endsWith('.txt') ) {
			const fileContent = fs.readFileSync(filePath, 'utf-8')
			if ( fileContent?.split('\n')?.[0].startsWith('GIANTS Engine Runtime 9.0.0')) {
				this.fileDetail.isLogFile = true
				this.badgeArray.push('log')
			}
		}
		this.fileDetail.shortName = path.basename(this.fileDetail.fullPath)
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

		if ( thisXML === null || !Array.isArray(thisXML.farm) ) {
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

		if ( thisXML === null || typeof thisXML.placeable !== 'object' ) {
			this.#util_readError('placeables')
			return
		}

		this.#placeables = this.#util_iterateXML(thisXML.placeable)
	}

	#doStep_vehicles() {
		const thisXML = this.#fileHandle.readXML('vehicles.xml', 'savegame', 'vehicles')

		if ( thisXML === null || typeof thisXML.vehicle !== 'object' ) {
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

		if ( Array.isArray(thisXML.mod) ) {
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
		
					this.mods[modName].farms = new Set([...farmIDs].sort((a, b) => a - b))
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

			if ( currentSave === null ) { throw new Error('Original save could not be read') }

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

			if ( this.#saveMods.byDate.length === 0 ) {
				throw new Error('No backups found for savegame, useless results')
			}
		} catch (err) {
			this.#log.notice(err)
		}
		return this.#saveMods
	}

	#doStep_readFile(folder) {
		const fullFileName = path.join(folder, 'careerSavegame.xml')

		if ( !fs.existsSync(fullFileName) ) {
			throw new Error(`careerSavegame.xml does not exist: ${folder}`)
		}

		const thisXML = this.#xmlParser.parse(fs.readFileSync(fullFileName, 'utf-8'))?.careersavegame ?? null
		
		if ( thisXML === null ) {
			throw new Error(`Parsing careerSavegame.xml failed: ${folder}`)
		}

		return {
			map  : thisXML?.settings?.maptitle ?? null,
			mods : thisXML?.mod?.map?.((x) => x?.$?.MODNAME) ?? [],
		}
	}

	#doStep_findFiles () {
		const backupPath = path.join(path.dirname(this.#savePath), 'savegameBackup')

		if ( !fs.existsSync(this.#savePath) ) { throw new Error('Original Save Not Found') }
		if ( !fs.existsSync(backupPath) )     { throw new Error('Backup Folder Not Found') }

		const fileList = globSync(`${path.basename(this.#savePath)}_**`, { cwd : path.join(backupPath), stat : true, withFileTypes : true })
			.filter((x) => x.isDirectory())
			.map((x) => path.join(x.path, x.name))
		
		if ( fileList < 1 ) { throw new Error('No Valid Backups Found') }

		return fileList
	}
}

class saveGameManager {
	#allSaves = {}
	#backPath = null
	#fullPath = null
	#log      = null

	constructor(gameSettingsXMLFile) {
		this.#fullPath = path.dirname(gameSettingsXMLFile)
		this.#log      = maIPC.log.group('savegame-manager')

		for ( let i = 1; i <= 20; i++) {
			this.#allSaves[`${i}`] = {
				active  : false,
				backups : [],
			}
		}
	}

	async getInfo() {
		await this.#findActiveSaves()
		await this.#findBackupSaves()

		return this.#allSaves
	}

	#processSave(fullPath) {
		const thisSaveFile = new fileHandler(fullPath, true, this.#log)
		const thisCareer   = thisSaveFile.readXML('careerSavegame.xml', 'savegame', 'careersavegame')
		const thisFarms    = thisSaveFile.readXML('farms.xml', 'savegame', 'farms')

		if ( thisCareer === null || thisCareer === false || thisFarms === null || thisFarms === false ) {
			return { error : true }
		}

		const pTime = thisCareer?.statistics?.playtime ?? 0

		const returnObj = {
			error    : false,
			farms    : [],
			map      : thisCareer?.settings?.maptitle ?? '--',
			modCount : thisCareer?.mod?.length ?? 0,
			name     : thisCareer?.settings?.savegamename,
			playTime : `${Math.floor(pTime/60)}:${Math.floor(pTime%60).toString().padStart(2, '0')}`,
			saveDate : thisCareer?.settings?.savedate ?? '1970-01-01',
			uuid     : crypto.createHash('md5').update(fullPath).digest('hex'),
		}

		for ( const thisFarm of thisFarms.farm ) {
			returnObj.farms.push({
				color : thisFarm?.$?.COLOR ?? 1,
				id    : thisFarm?.$?.FARMID ?? 1,
				loan  : thisFarm?.$?.LOAN ?? 0,
				money : thisFarm?.$?.MONEY ?? 0,
				name  : thisFarm?.$?.NAME ?? '--',
			})
		}

		return returnObj
	}

	async #findActiveSaves() {
		return fsPromise.readdir(this.#fullPath, {withFileTypes : true}).then((folderContents) => {
			for ( const thisFolder of folderContents ) {
				if ( !thisFolder.isDirectory() ) {
					continue
				} else if ( thisFolder.name.match(/savegame[\d+]/) ) {
					const thisID    = thisFolder.name.replace('savegame', '')
					const thisStats = fs.statSync(path.join(this.#fullPath, thisFolder.name))
					this.#allSaves[thisID].active = {
						fileDate : thisStats.mtime,
						fullName : thisFolder.name,
						fullPath : path.join(this.#fullPath, thisFolder.name),
						...this.#processSave(path.join(this.#fullPath, thisFolder.name)),
					}
				} else if ( thisFolder.name === 'savegameBackup' ) {
					this.#backPath = path.join(this.#fullPath, 'savegameBackup')
				}
			}
		})
	}

	async #findBackupSaves() {
		if ( this.#backPath === null ) { return }
		
		return fsPromise.readdir(path.join(this.#backPath), { withFileTypes : true }).then((folderContents) => {
			for ( const thisFolder of folderContents ) {
				if ( !thisFolder.isDirectory() ) {
					continue
				} else {
					const [folderName, folderDateStr] = thisFolder.name.split('_backup')
					const thisID                      = folderName.replace('savegame', '')
					const [folderDate, folderTime]    = folderDateStr.split('_')
					const folderDateObj               = new Date(`${folderDate}T${folderTime.replace('-', ':')}:00.000`)

					this.#allSaves[thisID].backups.push({
						fileDate : folderDateObj,
						fullName : thisFolder.name,
						fullPath : path.join(this.#backPath, thisFolder.name),
						...this.#processSave(path.join(this.#backPath, thisFolder.name)),
					})
				}
			}
		})
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

class modPackChecker {
	#fileName   = null
	#fileHandle = null
	#log        = null

	constructor( fileName ) {
		this.#fileName = fileName
		this.#log      = maIPC.log.group(`mod_pack_check-${path.basename(fileName)}`)

		this.#log.info(`Checking Possible ModPack: ${fileName}`)
	}

	getInfo() {
		let allowedNonZIP = 2
		this.#fileHandle  = new fileHandler(this.#fileName, false, this.#log)

		if ( ! this.#fileHandle.isOpen ) {
			this.#log.danger(`File fail: ${this.#fileName}`)
			return false
		}

		for ( const thisFile of this.#fileHandle.listFiles() ) {
			if ( thisFile.isDirectory )                 { return false }
			if ( thisFile.entryName.endsWith('.xml') )  { return false}
			if ( !thisFile.entryName.endsWith('.zip') ) { allowedNonZIP-- }
			if ( allowedNonZIP <= 0 )                   { return false }
		}
		return true
	}
}

class badgeHandle {
	#baseSet   = null
	#l10nNames = {}
	#extraData = {}

	
	constructor(initArray = [], transBadges) {
		this.#baseSet = new Set()
		this.#l10nNames = transBadges
		
		for ( const key of initArray ) {
			this.add(key)
		}
	}

	get keyList() {
		const sorted      = [...this.#baseSet].sort((a, b) => Intl.Collator().compare(this.#l10nNames[a], this.#l10nNames[b]))
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
	modFileCollection : modFileCollection,
	modPackChecker    : modPackChecker,
	notModFileChecker : notModFileChecker,
	saveFileChecker   : saveFileChecker,
	saveGameManager   : saveGameManager,
	savegameTrack     : savegameTrack,
}


