/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

/**
 *  Mod Collection Class, File Handler Class, Save File Reader, Save Tracker
 * @module modCheckLib
 */

const fs                 = require('node:fs')
const fsPromise          = require('node:fs/promises')
const path               = require('node:path')
const cp                 = require('node:child_process')
const crypto             = require('node:crypto')
const {fileHandlerAsync} = require('./workerThreadLib.js')
const { globSync }       = require('glob')
const { serveIPC }       = require('./modUtilLib')

/**
 * Main Collection Class for modRecords
 * @class
 */
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
	#map_CollectionToStatus         = {}
	#map_CollectionToFolder         = {}
	#map_CollectionToFolderRelative = {}
	#map_CollectionToFullName       = {}
	#map_CollectionToName           = {}
	#map_FolderContents             = {}
	#map_FolderToCollection         = {}
	#map_ModUUIDToShortName         = {}
	#map_ShortName                  = {}
	#set_Collections                = new Set()

	#dangerMods                     = new Set()

	#modHubList    = { 'mods' : {}, 'last' : [] }
	#modHubVersion = {}

	#list_allMods = {}
	#list_newMods = new Set()

	#log                 = serveIPC.log
	#loadingWindow       = serveIPC.loadWindow
	#localeFunction      = serveIPC.l10n.deferCurrentLocale
	#map_CollectionNotes = serveIPC.storeNote
	#modCache            = serveIPC.storeCache
	#siteStore           = {}
	#settings            = serveIPC.storeSet
	#updateReady         = false
	#badgeNamed          = {}

	#userHome        = ''
	#useSyncSafeMode = false
	#skipCache       = false

	#scanPromise = []

	#threadPool      = []
	#threadPoolIdx   = new Set()
	#threadPoolCount = 0
	#threadPoolMax   = 3
	#threadCurrent   = 0
	#threadDoneEmit  = null

	#botRequestList  = new Set()
	#botRequestMap   = {}
	#botResponse     = {}
	#botInterval     = null
	#botLastRun      = 0
	#botMinInterval  = 1000 * 60 * 5
	#botDisabled     = false

	#noteDefaults = {
		notes_add_date   : new Date(1900, 1, 1),
		notes_admin      : null,
		notes_color      : '0',
		notes_favorite   : false,
		notes_frozen     : false,
		notes_fsg_bot    : '',
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
	/**
	 * 
	 * @param {string} homeDir User's home folder
	 * @param {EventEmitter} emitter emitter to use
	 */
	constructor(homeDir, emitter) {
		this.#userHome            = homeDir
		this.#skipCache           = serveIPC.isModCacheDisabled
		this.#threadDoneEmit      = emitter
		this.#botDisabled         = serveIPC.isBotDisabled
	}

	/**
	 * Start the bot if it's not running
	 * @param {boolean} forceRunNow Force run it once now
	 */
	startBotInterval(forceRunNow = false) {
		if ( this.#botDisabled ) { return }
		if ( forceRunNow ) { this.#botRunner() }
		if ( this.#botInterval === null ) {
			this.#botInterval = setInterval(() => { this.#botRunner() }, 15000)
		}
	}

	#botRunner() {
		const thisRun = Date.now()
		if ( thisRun > this.#botLastRun + this.#botMinInterval ) {
			this.#log.info('fsg-bot-poll', 'Updating FSG Bot Information')
			if ( this.#botRequestList.size === 0 ) {
				this.#log.debug('fsg-bot-poll', 'Bot request list empty, stopping interval')
				if ( this.#botInterval !== null ) {
					clearInterval(this.#botInterval)
					this.#botInterval = null
				}
				return
			}

			this.#botLastRun = thisRun

			const { net } = require('electron')

			if ( net.isOnline() ) {
				const thisURL = `https://www.farmsimgame.com/ma/${[...this.#botRequestList].join('-')}`
				const request = net.request(thisURL)
		
				request.setHeader('pragma', 'no-cache')
		
				request.on('response', (response) => {
					this.#log.debug('fsg-bot-poll', 'Got FSG Bot response', response.statusCode)
					let responseData = ''
		
					response.on('error', (err) => {
						this.#log.info('fsg-bot-poll', 'Network error', err)
					})
		
					response.on('data', (chunk) => { responseData = responseData + chunk.toString() })
					response.on('end',  () => {
						try {
							const responseObj = JSON.parse(responseData)
							this.#botResponse = {}
							for ( const thisIDObj of responseObj ) {
								this.#botResponse[thisIDObj.id] = thisIDObj
							}
						} catch (err) {
							this.#log.info('fsg-bot-poll', 'File error', err)
						}
						
					})
				})
				request.on('abort', () => {
					this.#log.info('fsg-bot-poll', 'Network abort')
				})
				request.on('error', (err) => {
					this.#log.info('fsg-bot-poll', 'Network error', err)
				})
				request.end()
			}
		}
	}

	/**
	 * Map a real folder to a collection key
	 * @param {string} folder Folder Path
	 * @returns {?modRecord_collectKey}
	 */
	mapFolderToCollection(folder) {
		return this.#map_FolderToCollection[folder] || null
	}

	/**
	 * Map collection key to real folder
	 * @param {modRecord_collectKey} collectKey 
	 * @returns {string} Path to folder
	 */
	mapCollectionToFolder(collectKey) {
		return this.#map_CollectionToFolder[collectKey]
	}

	/**
	 * Map collection key to (short) name
	 * @param {modRecord_collectKey} collectKey 
	 * @returns {string} Collection name
	 */
	mapCollectionToName(collectKey) {
		return this.#map_CollectionToName[collectKey]
	}

	/**
	 * Map collection to full name
	 * @param {modRecord_collectKey} collectKey 
	 * @returns {string} Full collection name
	 */
	mapCollectionToFullName(collectKey) {
		return this.#map_CollectionToFullName[collectKey]
	}

	/**
	 * Map comboKey to folder
	 * @param {modRecord_col_uuid} comboKey
	 * @returns {string} Collection folder
	 */
	mapDashedToFolder(comboKey) {
		return this.#map_CollectionToFolder[comboKey.split('--')[0]]
	}

	/**
	 * Map comboKey to mod path
	 * @param {modRecord_col_uuid} comboKey 
	 * @returns {string} Full path to mod
	 */
	mapDashedToFullPath(comboKey) {
		const entry = this.modColUUIDToFolderAndRecord(comboKey)
		return path.join(entry.folder, path.basename(entry.mod.fileDetail.fullPath))
	}

	/**
	 * @type {Array}
	 * @description Set a new order for collection display
	 */
	set newCollectionOrder(newSetOrder) { this.#set_Collections = newSetOrder }

	/**
	 * Remove a collection from list
	 * @param {modRecord_collectKey} collectKey 
	 */
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
		delete this.#map_CollectionToStatus[collectKey]
	}

	/**
	 * @type {Object}
	 * @description bind conflicts
	 */
	get bindConflict() { return this.#bindConflict }

	/** @type {Set.<modRecord_collectKey>} */
	get collections() { return this.#set_Collections }

	/** @type {Object.<modRecord_shortName, modRecord>} */
	get shortNames() { return this.#map_ShortName }

	/** @type {number} */
	get totalModCount() { return Object.keys(this.#map_ModUUIDToShortName).length }

	/**
	 * Is this a collection of favorites?
	 * @param {modRecord_collectKey} collectKey 
	 * @returns {boolean}
	 */
	isFavorite(collectKey) {
		return serveIPC.storeNote.get(`${collectKey}.notes_favorite`, false)
	}

	/**
	 * 
	 * @returns {Array} [[all files], [collectKeys]]
	 */
	getFavoriteCollectionFiles() {
		const files       = []
	
		const collections = [...this.#set_Collections].filter((collectKey) =>
			this.versionCurrent(collectKey) && this.isFavorite(collectKey)
		)
	
		for ( const collectKey of collections ) {
			const thisCollection = this.getModCollection(collectKey)
			files.push(...[...thisCollection.modSet].map((x) => `${collectKey}--${x}`))
		}
		return [files, collections]
	}

	/**
	 * Get mod list from a collectKey
	 * @param {string} collectKey 
	 * @returns {modCollect_mods} { uuid : modRecord }
	 */
	getModListFromCollection(collectKey) {
		return Object.values(this.#list_allMods[collectKey].mods)
	}

	/**
	 * Get mod list from a comboKey
	 * @param {string} comboKey 
	 * @returns {modCollect_mods} { uuid : modRecord }
	 */
	getModCollectionFromDashed(comboKey) {
		return this.#list_allMods[comboKey.split('--')[0]]
	}

	/**
	 * Get a full collection by collectKey
	 * @param {string} collectKey 
	 * @returns {modCollect_collection}
	 */
	getModCollection(collectKey) {
		return this.#list_allMods[collectKey]
	}

	/** @type {modHub_list} */
	get modHubList()           { return this.#modHubList }
	set modHubList(newList)    { this.#modHubList = newList }

	/** @type {modHub_version} */
	get modHubVersion()        { return this.#modHubVersion }
	set modHubVersion(newList) { this.#modHubVersion  = newList }

	/**
	 * Get full modhub record by shortname
	 * @param {modRecord_shortName} thisMod 
	 * @returns {modHub_record}
	 */
	modHubFullRecord(thisMod) {
		const modHubID = this.modHubModRecord(thisMod)

		return {
			id      : modHubID,
			version : this.modHubVersionModHubId(modHubID),
			recent  : this.#modHubList.last.includes(parseInt(modHubID)),
		}
	}

	/**
	 * Get modHub ID by shortname
	 * @param {modRecord_shortName} thisMod 
	 * @returns {?number}
	 */
	modHubModRecord(thisMod) {
		return this.#modHubList.mods[thisMod.fileDetail.shortName] || null
	}

	/**
	 * Get modHub ID by UUID
	 * @param {modRecord_uuid} modUUID 
	 * @returns {?number}
	 */
	modHubModUUID(modUUID) {
		return this.#modHubList.mods[this.#map_ModUUIDToShortName[modUUID]] || null
	}

	/**
	 * Get modHub ID by UUID
	 * @param {modRecord_uuid} modUUID 
	 * @returns {?string}
	 */
	modHubVersionUUID(modUUID) {
		return this.#modHubVersion[this.modHubModUUID(modUUID)] || null
	}

	/**
	 * Get modHub ID by shortname
	 * @param {modRecord_shortName} thisMod 
	 * @returns {?number}
	 */
	modHubVersionModRecord(thisMod) {
		return this.#modHubVersion[this.modHubModRecord(thisMod)] || null
	}

	/**
	 * Get modHub version by modHub ID
	 * @param {number} modHubID 
	 * @returns {?string}
	 */
	modHubVersionModHubId(modHubID) {
		return this.#modHubVersion[modHubID] || null
	}

	/**
	 * 
	 * @param {modRecord_col_uuid} ID 
	 * @returns {Object} record
	 * @returns {string} record.folder full path
	 * @returns {?modRecord} record.mod
	 */
	modColUUIDToFolderAndRecord(ID) {
		const idParts = ID.split('--')
		return {
			folder : this.#map_CollectionToFolder[idParts[0]],
			mod    : this.#list_allMods?.[idParts[0]]?.mods?.[idParts[1]] || null,
		}
	}

	/**
	 * Get a modRecord from a comboKey
	 * @param {modRecord_col_uuid} ID 
	 * @returns {?modRecord}
	 */
	modColUUIDToRecord(ID) {
		const idParts = ID.split('--')
		return this.#list_allMods?.[idParts[0]]?.mods?.[idParts[1]] || null
	}

	/**
	 * Get folder path from comboKey
	 * @param {modRecord_col_uuid} ID 
	 * @returns {string} Full path
	 */
	modColUUIDToFolder(ID) {
		return this.#map_CollectionToFolder[ID.split('--')[0]]
	}

	/**
	 * Get multiple mod records from comboKeys
	 * @param {Array.<modRecord_col_uuid>} IDs 
	 * @returns {Array.<modRecord>}
	 */
	modColUUIDsToRecords(IDs) {
		return IDs.map((thisColUUID) => this.modColUUIDToRecord(thisColUUID))
	}

	/**
	 * Get single mod from collectKey and UUID
	 * @param {modRecord_collectKey} collectKey 
	 * @param {modRecord_uuid} modKey 
	 * @returns {modRecord}
	 */
	modColAndUUID(collectKey, modKey) {
		return this.#list_allMods[collectKey].mods[modKey]
	}

	/**
	 * Clear all collection storage
	 */
	clearAll() {
		this.#botRequestList                 = new Set()
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
		this.#dangerMods                     = new Set()
		this.#set_Collections.clear()
	}

	/** @type {boolean} */
	set syncSafe(mode) { this.#useSyncSafeMode = typeof mode === 'boolean' ? mode : false }

	/**
	 * Return new collection key from folder
	 * @param {string} folder 
	 * @returns {modRecord_collectKey} col_[HASH]
	 */
	getMD5FromFolder(folder) { return this.#getMD5Hash(folder, 'col_') }
	
	/** @type {number} */
	get modFullCount() {
		let fullCount = 0
		for ( const thisList in this.#list_allMods ) {
			fullCount += this.#list_allMods[thisList].alphaSort.length
		}
		return fullCount
	}

	/** @type {number} */
	get fullCollectSize() {
		return JSON.stringify(this.#list_allMods).length
	}

	/**
	 * Add a collection
	 * @param {string} folder 
	 * @param {boolean} offline collection is currently offline
	 * @returns {Object} newCollection
	 * @returns {modRecord_collectKey} newCollection.collectKey
	 * @returns {number} newCollection.fileCount number of files
	 */
	addCollection(folder, offline = false) {
		const goodFolderContents = []
		const thisFolderKey      = this.#getMD5Hash(folder, 'col_')
		const thisRealPath       = path.normalize(folder)
		const thisShortName      = path.basename(thisRealPath)
		const thisFullName       = this.#populateFullName(thisFolderKey, thisShortName)

		if ( !offline ) {
			try {
				const folderContents = fs.readdirSync(thisRealPath, {withFileTypes : true})

				for ( const thisFile of folderContents ) {
					if ( !this.#junkRegex.test(thisFile.name) ) { goodFolderContents.push(thisFile) }
				}
				this.#map_CollectionToStatus[thisFolderKey] = true
			} catch (err) {
				this.#log.danger('collection-reader', 'Could not read folder', thisRealPath, err)
				this.#map_CollectionToStatus[thisFolderKey] = false
				return null
			}
		} else {
			this.#map_CollectionToStatus[thisFolderKey] = false
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
			requireBy  : {},
		}

		const thisFolderBotIDS = this.#map_CollectionNotes.get(`${thisFolderKey}.notes_fsg_bot`, '')

		const theseIDs = thisFolderBotIDS.split(/\D+/).filter((x) => x.length !== 0)

		for ( const thisID of theseIDs ) { this.#botRequestList.add(thisID) }
		this.#botRequestMap[thisFolderKey] = theseIDs

		if ( theseIDs.length !== 0 ) { this.startBotInterval() }

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
				serveIPC.decodePath,
				serveIPC.l10n.deferCurrentLocale(),
				serveIPC.__('unit_hp')
			])
			this.#threadPoolIdx.add(idx-1)
			this.#threadPoolCount++
			thisThread.on('message', (m) => { this.#workQueueResponse.apply(this, [m]) })
			thisThread.on('exit',    (m) => { this.#workQueueDone.apply(this, [m, idx-1]) })
			this.#threadPool.push(thisThread)
		}
	}

	#exitThreads() {
		for ( const idx of this.#threadPoolIdx ) {
			this.#threadPool[idx].send({ type : 'exit' })
		}
	}

	#workQueueResponse(m) {
		if ( Object.hasOwn(m, 'type') ) {
			switch (m.type) {
				case 'log' :
					this.#log[m.level](`worker-thread-${m.pid}`, m.data.join(' '))
					break
				case 'modRecord' :
					for ( const logLine of m.logLines.items ) {
						this.#log[logLine[0]](m.logLines.group, logLine[1])
					}
					this.#log.debug(`worker-thread-${m.pid}`, `Sent(got) modRecord :: ${m.collectKey}--${m.modRecord.fileDetail.shortName}`)
					this.#addModToData(m.collectKey, m.modRecord)

					if ( m.modRecord.md5Sum !== null && !m.modRecord.canNotUse ) {
						this.#log.info(`mod-${m.modRecord.uuid}`, 'Adding mod to cache')
						this.#list_newMods.add(m.modRecord.uuid)
						this.#modCache.setMod(m.modRecord.md5Sum, m.modRecord)
					}
					break
				default :
					break
			}
		}
	}

	#workQueueDone(_, idx) {
		this.#threadPoolIdx.delete(idx)

		this.#threadPoolCount--
		if ( this.#threadPoolCount === 0 ) {
			this.processModsPost()
			this.#threadDoneEmit.emit('process-mods-done')
		}
	}

	#getCurrentThread( largeFileThread = false ) {
		if ( largeFileThread ) { return Math.min(...this.#threadPoolIdx) }
		this.#threadCurrent++
		return [...this.#threadPoolIdx][this.#threadCurrent % this.#threadPoolIdx.size]
	}

	/**
	 * Process mods on disk (multi-threaded)
	 */
	async processMods() {
		this.#startThreads()

		for ( const collectKey of this.#set_Collections ) {
			for ( const thisFile of this.#map_FolderContents[collectKey] ) {
				this.#scanPromise.push(this.#addMod(collectKey, thisFile))
			}
		}
		this.#exitThreads()
	}

	/**
	 * Post-process mods, run after processMods, but before returning to caller
	 */
	processModsPost() {
		this.#modCache.saveFile()
		this.#doAlphaSort()
		this.#processBindConflicts()
		this.#doRequired()
		this.#doBadges()
	}

	/** @type {Promise} */
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
		const thisMHRec = this.modHubFullRecord(modRecord)

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

	/**
	 * Get conflicts in a given collection
	 * @param {modRecord_collectKey} collectKey 
	 * @param {modRecord} modRecord 
	 * @returns {Array.<modRecord_shortName>}
	 */
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

	/**
	 * Get if depended on mods are in a collection
	 * @param {modRecord_collectKey} collectKey 
	 * @param {modRecord} modRecord 
	 * @returns {(boolean|number)} number not met
	 */
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
			'mod_badge_malware',
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
			this.#badgeNamed[thisBadge.substring(10)] = serveIPC.__(thisBadge)
		}
	}

	#doBadges() {
		this.#populateBadgeL10n()
		this.#siteStore = serveIPC.storeSites.store
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
			this.#log.warning('collection-reader', `Unable to stat file ${thisFile.name} in ${folderLoc}`, err)
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
		thisModRecord.modHub            = this.modHubFullRecord(thisModRecord)
		thisModRecord.gameVersion       = this.#util_gameVersion(thisModRecord.modDesc.descVersion)
		
		if ( thisModRecord.issues.includes('MALICIOUS_CODE') ) {
			this.#dangerMods.add(thisModRecord.colUUID)
		}

		this.#map_ShortName[thisModRecord.fileDetail.shortName] ??= []
		this.#map_ShortName[thisModRecord.fileDetail.shortName].push([collectKey, thisModRecord.uuid])

		this.#map_ModUUIDToShortName[thisModRecord.uuid] = thisModRecord.fileDetail.shortName
		this.#list_allMods[collectKey].mods[thisModRecord.uuid] = thisModRecord
		this.#list_allMods[collectKey].folderSize += thisModRecord.fileDetail.fileSize
		this.#list_allMods[collectKey].modSet.add(thisModRecord.uuid)
		this.#list_allMods[collectKey].dependSet.add(thisModRecord.fileDetail.shortName)
		this.#list_allMods[collectKey].alphaSort.push(`${thisModRecord.fileDetail.shortName}::${thisModRecord.uuid}`)

		if ( Array.isArray(thisModRecord.modDesc.depend) ) {
			this.#list_allMods[collectKey].requireArr.push(...thisModRecord.modDesc.depend)
			for ( const thisDep of thisModRecord.modDesc.depend ) {
				this.#list_allMods[collectKey].requireBy[thisDep] ??= []
				this.#list_allMods[collectKey].requireBy[thisDep].push(thisModRecord.fileDetail.shortName)
			}
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

	async #addMod(collectKey, thisFile) {
		const thisFileStats = this.#fileStats(collectKey, thisFile)

		// Check cache
		const modInCache    = this.#cacheHit(thisFileStats)
		if ( modInCache ) {
			this.#log.debug(`mod-${modInCache.uuid}`, 'Adding mod FROM cache', modInCache.fileDetail.shortName)
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

		// Size check is to keep all large (200Mb+) mods in a single thread to drop memory usage
		this.#threadPool[this.#getCurrentThread(thisFileStats.size > 200*1024*1024)].send({
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

	/**
	 * Get version of a collection
	 * @param {modRecord_collectKey} collectKey 
	 * @returns {number}
	 */
	version(collectKey) {
		return this.#map_CollectionNotes.get(`${collectKey}.notes_version`, 22)
	}

	/**
	 * Check if collection version is the same
	 * @param {modRecord_collectKey} collectKey 
	 * @param {number} verCheck 
	 * @returns {boolean}
	 */
	versionSame(collectKey, verCheck) {
		return verCheck === this.version(collectKey)
	}

	/**
	 * Check if collection version is the different
	 * @param {modRecord_collectKey} collectKey 
	 * @param {number} verCheck 
	 * @returns {boolean}
	 */
	versionNotSame(collectKey, verCheck) {
		return verCheck !== this.version(collectKey)
	}

	/**
	 * Check if collection version is the currently selected version
	 * @param {modRecord_collectKey} collectKey 
	 * @returns {boolean}
	 */
	versionCurrent(collectKey) {
		const current_version = serveIPC.storeSet.get('game_version')
		return this.versionSame(collectKey, current_version)
	}

	/**
	 * Get note with safe default
	 * @param {modRecord_collectKey} collectKey 
	 * @param {string} noteKey 
	 * @returns {any}
	 */
	getSafeNote(collectKey, noteKey) {
		const fullNoteKey = `notes_${noteKey}`
		const realDefault = this.#noteDefaults[fullNoteKey]
		return this.#map_CollectionNotes.get(`${collectKey}.${fullNoteKey}`, realDefault)
	}

	#doNotesDefault() {
		const currentOptions = this.#map_CollectionNotes.store
		const defaults       = this.#noteDefaults
		const safeOptions    = {}

		for ( const collectKey of this.#set_Collections ) {
			safeOptions[collectKey] = {}
			for ( const optName in defaults ) {
				const rightNow = currentOptions?.[collectKey]?.[optName]
				safeOptions[collectKey][optName] = typeof rightNow !== 'undefined' ? rightNow : defaults[optName]
			}
		}
		return safeOptions
	}

	/** @type {boolean} */
	set updateIsReady(newValue = true) { this.#updateReady = newValue }
	get updateIsReady() { return this.#updateReady }

	/** @type {Object} */
	get botDetails() {
		return {
			l10nMap     : {
				online  : serveIPC.__('bot_online'),
				offline : serveIPC.__('bot_offline'),
				unknown : serveIPC.__('bot_unknown'),
			},
			requestList : this.#botRequestList,
			requestMap  : this.#botRequestMap,
			response    : this.#botResponse,
		}
	}

	/** @type {Array.<modRecord_col_uuid>} */
	get dangerMods() { return this.#dangerMods }

	/** @type {boolean} */
	get isDangerMods() { return this.#dangerMods.size !== 0 }

	/**
	 * Send mod list to renderer
	 * @param {Object} extra more data to include in opts
	 * @returns {Object} see code for full list of keys
	 */
	async toRenderer(extra = null) {
		return Promise.all(this.#scanPromise).then(() => {
			return {
				appSettings                : this.#settings.store,
				badgeL10n                  : this.#badgeNamed,
				bindConflict               : this.#bindConflict,
				bot                        : this.botDetails,
				collectionNotes            : this.#doNotesDefault(),
				collectionToFolder         : this.#map_CollectionToFolder,
				collectionToFolderRelative : this.#map_CollectionToFolderRelative,
				collectionToFullName       : this.#map_CollectionToFullName,
				collectionToName           : this.#map_CollectionToName,
				collectionToStatus         : this.#map_CollectionToStatus,
				currentLocale              : this.#localeFunction(),
				dangerMods                 : this.#dangerMods,
				dangerModsSkip             : serveIPC.whiteMalwareList,
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

/**
 * notModFileChecker - null(ish) class that mimics modRecord
 */
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
		this.#log = serveIPC.log.group(`mod-${this.uuid}`)

		this.#log.info(`Adding NON Mod File: ${filePath}`)

		if ( !isFolder && filePath.endsWith('.txt') ) {
			const fileContent = fs.readFileSync(filePath, 'utf-8')
			if ( fileContent?.split('\n')?.[0].startsWith('GIANTS Engine Runtime')) {
				this.fileDetail.isLogFile = true
				this.badgeArray.push('log')
			}
		}
		this.fileDetail.shortName = path.basename(this.fileDetail.fullPath)
	}
}


class csvFileChecker {
	#fileName     = null
	#fileContents = null
	#log          = null
	//#csvRegex     = new RegExp(/(?:,"|^")(""|[\w\W]*?)(?=",|"$)|(?:,(?!")|^(?!"))([^,]*?)(?=$|,)/g)
	#csvRegex     = new RegExp(/(?:,"|^")(""|[\W\w]*?)(?=",|"$)|(?:,(?!")|^(?!"))([^,]*?)(?=$|,)/g)

	errorList  = []
	mods       = {}
	#status    = true

	constructor( fileName ) {
		this.#fileName = fileName
		this.#log      = serveIPC.log.group(`savegame-${path.basename(fileName)}`)

		this.#log.info(`Parsing CSV: ${fileName}`)
	}

	get dataReturn() {
		return {
			errorList  : this.errorList,
			farms      : { 0 : '--unowned', 1 : 'My farm' },
			mapMod     : this.#status ? 'csvLoaded' : null,
			mods       : this.mods,
			singleFarm : true,
		}
	}

	async getInfo() {
		if ( !fs.existsSync(this.#fileName) ) {
			this.errorList.push(['SAVEGAME_UNREADABLE', this.#fileName])
			this.#log.danger(`CSV open fail: ${this.#fileName}`)
			this.#status = false
			return this.dataReturn
		}
		this.#fileContents = fs.readFileSync(this.#fileName, { encoding : 'utf8' })

		const fileLines = this.#fileContents.replace(/\r\n/g, '\n').split('\n')

		if ( fileLines?.[0] !== '"Mod","Title","Version","Author","ModHub","Link"' ) {
			this.errorList.push(['SAVEGAME_UNREADABLE', this.#fileName])
			this.#log.danger(`CSV format fail: ${this.#fileName}`)
			this.#status = false
			return this.dataReturn
		}

		for ( let i = 1; i < fileLines.length; i++ ) {
			const thisLine = [...fileLines[i].matchAll(this.#csvRegex)]
			try {
				this.mods[thisLine[0][1].replace('.zip', '')] = {
					'farms'   : new Set(),
					'title'   : thisLine[1][1],
					'version' : thisLine[2][1],
				}
			} catch (err) {
				this.#log.debug(`Bad CSV Line :: ${fileLines[i]} : ${err}`)
			}
		}

		return this.dataReturn
	}

}

/**
 * Save file checker
 * @class
 */
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

	/**
	 * 
	 * @param {string} fileName full file and path of save
	 * @param {boolean} isFolder Expect a folder
	 */
	constructor( fileName, isFolder ) {
		this.#fileName = fileName
		this.#isFolder = isFolder
		this.#log      = serveIPC.log.group(`savegame-${path.basename(fileName)}`)

		this.#log.info(`Adding Save: ${fileName}`)
	}

	/** 
	 * @type {saveFileCheckerRecord}
	 * @description get generated data
	 */
	get dataReturn() {
		return {
			errorList  : this.errorList,
			farms      : this.farms,
			mapMod     : this.mapMod,
			mods       : this.mods,
			singleFarm : this.singleFarm,
		}
	}

	/**
	 * Process data
	 * @returns {saveFileCheckerRecord}
	 */
	async getInfo() {
		this.#fileHandle = new fileHandlerAsync(this.#fileName, this.#isFolder, this.#log)

		const couldOpen = await this.#fileHandle.open()

		if ( ! couldOpen ) {
			this.#log.danger(`Save open fail: ${this.#fileName}`)
			this.errorList.push(['SAVEGAME_UNREADABLE', this.#fileName])
			return this.dataReturn
		}

		await this.#doStep_farms()
		await this.#doStep_placeables()
		await this.#doStep_vehicles()
		await this.#doStep_career()

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

	async #doStep_farms() {
		const thisXML = await this.#fileHandle.readXML('farms.xml', 'savegame', 'farms')

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

	async #doStep_placeables() {
		const thisXML = await this.#fileHandle.readXML('placeables.xml', 'savegame', 'placeables')

		if ( thisXML === null || typeof thisXML.placeable !== 'object' ) {
			this.#util_readError('placeables')
			return
		}

		this.#placeables = this.#util_iterateXML(thisXML.placeable)
	}

	async #doStep_vehicles() {
		const thisXML = await this.#fileHandle.readXML('vehicles.xml', 'savegame', 'vehicles')

		if ( thisXML === null || typeof thisXML.vehicle !== 'object' ) {
			this.#util_readError('vehicles')
			return
		}

		this.#vehicles = this.#util_iterateXML(thisXML.vehicle)
	}

	async #doStep_career() {
		const thisXML = await this.#fileHandle.readXML('careerSavegame.xml', 'savegame', 'careersavegame')

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

/**
 * Savegame tracker
 * @class
 */
class savegameTrack {
	#log       = null
	#savePath  = null
	#xmlParser = null

	#saveMods = {
		current : [],
		byDate  : [],
	}

	/**
	 * 
	 * @param {string} savePath Full path to the save game
	 */
	constructor(savePath) {
		this.#savePath = savePath
		this.#log      = serveIPC.log.group(`savegame_track_${path.basename(savePath)}`)

		this.#xmlParser = fileHandlerAsync.getParser('savegame')
	}

	/**
	 * Process savegame
	 * @returns {saveTrackRecord}
	 */
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

/**
 * Manage local save games
 * @class
 */
class saveGameManager {
	#allSaves = {}
	#backPath = null
	#fullPath = null
	#log      = null

	/**
	 * 
	 * @param {string} gameSettingsXMLFile Path and name of game settings file
	 */
	constructor(gameSettingsXMLFile) {
		this.#fullPath = path.dirname(gameSettingsXMLFile)
		this.#log      = serveIPC.log.group('savegame-manager')

		for ( let i = 1; i <= 20; i++) {
			this.#allSaves[`${i}`] = {
				active  : false,
				backups : [],
			}
		}
	}

	/**
	 * Process saves on disk
	 * @returns {saveManageRecord_return}
	 */
	async getInfo() {
		await this.#findActiveSaves()
		await this.#findBackupSaves()

		return this.#allSaves
	}

	/* eslint-disable-next-line complexity */
	async #processSave(fullPath) {
		const thisSaveFile = new fileHandlerAsync(fullPath, true, this.#log)
		const couldOpen    = await thisSaveFile.open()

		if ( !couldOpen ) { return { error : true } }

		const thisCareer   = await thisSaveFile.readXML('careerSavegame.xml', 'savegame', 'careersavegame')
		const thisFarms    = await thisSaveFile.readXML('farms.xml', 'savegame', 'farms')

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

		if ( typeof thisFarms.farm === 'object' ) {
			for ( const thisFarm of thisFarms.farm ) {
				returnObj.farms.push({
					color : thisFarm?.$?.COLOR ?? 1,
					id    : thisFarm?.$?.FARMID ?? 1,
					loan  : thisFarm?.$?.LOAN ?? 0,
					money : thisFarm?.$?.MONEY ?? 0,
					name  : thisFarm?.$?.NAME ?? '--',
				})
			}
		}

		return returnObj
	}

	async #findActiveSaves() {
		return fsPromise.readdir(this.#fullPath, {withFileTypes : true}).then(async (folderContents) => {
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
						/* eslint-disable no-await-in-loop */
						...await this.#processSave(path.join(this.#fullPath, thisFolder.name)),
						/* eslint-enable no-await-in-loop */
					}
				} else if ( thisFolder.name === 'savegameBackup' ) {
					this.#backPath = path.join(this.#fullPath, 'savegameBackup')
				}
			}
		})
	}

	async #findBackupSaves() {
		if ( this.#backPath === null ) { return }
		
		return fsPromise.readdir(path.join(this.#backPath), { withFileTypes : true }).then(async (folderContents) => {
			for ( const thisFolder of folderContents ) {
				if ( !thisFolder.isDirectory() ) {
					continue
				} else {
					try {
						const [folderName, folderDateStr] = thisFolder.name.split('_backup')
						const thisID                      = folderName.replace('savegame', '')
						const [folderDate, folderTime]    = folderDateStr.split('_')
						const folderDateObj               = new Date(`${folderDate}T${folderTime.replace('-', ':')}:00.000`)

						this.#allSaves[thisID].backups.push({
							fileDate : folderDateObj,
							fullName : thisFolder.name,
							fullPath : path.join(this.#backPath, thisFolder.name),
							/* eslint-disable no-await-in-loop */
							...await this.#processSave(path.join(this.#backPath, thisFolder.name)),
							/* eslint-enable no-await-in-loop */
						})
					} catch (err) {
						this.#log.notice(`Invalid backup save folder : ${thisFolder.name} :: ${err}`)
					}
				}
			}
		})
	}
}

/**
 * Check if a ZIP is a mod pack
 * @class
 */
class modPackChecker {
	#fileName   = null
	#fileHandle = null
	#log        = null

	/**
	 * 
	 * @param {string} fileName path and name of ZIP
	 */
	constructor( fileName ) {
		this.#fileName = fileName
		this.#log      = serveIPC.log.group(`mod_pack_check-${path.basename(fileName)}`)

		this.#log.info(`Checking Possible ModPack: ${fileName}`)
	}

	/**
	 * Process the ZIP file
	 * @returns {boolean} true if it is a mod pack
	 */
	async getInfo() {
		let allowedNonZIP = 2
		this.#fileHandle  = new fileHandlerAsync(this.#fileName, false, this.#log)
		const couldOpen   = await this.#fileHandle.open()

		if ( ! couldOpen ) {
			this.#log.danger(`File fail: ${this.#fileName}`)
			return false
		}

		for ( const thisFile of this.#fileHandle.list ) {
			const fileInfo = this.#fileHandle.fileInfo(thisFile)
			if ( fileInfo.isFolder )          { return false }
			if ( thisFile.endsWith('.xml') )  { return false }
			if ( !thisFile.endsWith('.zip') ) { allowedNonZIP-- }
			if ( allowedNonZIP <= 0 )         { return false }
		}
		return true
	}
}

/**
 * badge handler
 * @class
 */
class badgeHandle {
	#baseSet   = null
	#l10nNames = {}
	#extraData = {}

	/**
	 * 
	 * @param {Array} initArray original simple array of badges
	 * @param {Object} transBadges localization for badges
	 */
	constructor(initArray = [], transBadges) {
		this.#baseSet = new Set()
		this.#l10nNames = transBadges
		
		for ( const key of initArray ) {
			this.add(key)
		}
	}

	/**
	 * @type {Array.<badgeHandleList>}
	 * @description Get list of badges
	 */
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

	/**
	 * Remove badge if another exists
	 * @param {string} checkKey badge id to find
	 * @param {string} removeKey badge id to remove
	 */
	pruneOn(checkKey, removeKey) {
		if ( this.#baseSet.has(checkKey) ) { this.del(removeKey) }
	}

	/**
	 * Add a badge
	 * @param {string} key badge id to add
	 */
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

	/**
	 * Remove a badge
	 * @param {string} key badge id to remove
	 */
	del(key) {
		this.#baseSet.delete(key)
		delete this.#extraData[key]
	}

	/**
	 * Add a CSS class to a badge
	 * @param {string} key badge id
	 * @param {string} cls CSS class to add
	 */
	addClass(key, cls) {
		this.#addExtra(key, 'cls', cls)
	}

	/**
	 * Remove a CSS class from a badge
	 * @param {string} key badge id
	 * @param {string} cls CSS class to remove
	 */
	delClass(key, cls) {
		this.#extraData[key].cls.delete(cls)
	}

	/**
	 * Add a title to a badge
	 * @param {string} key badge id
	 * @param {string} cls title to add
	 */
	addTitle(key, title) {
		this.#addExtra(key, 'title', title)
	}

	/**
	 * Remove a title from a badge
	 * @param {string} key badge id
	 * @param {string} cls title to add
	 */
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
	csvFileChecker    : csvFileChecker,
	modFileCollection : modFileCollection,
	modPackChecker    : modPackChecker,
	notModFileChecker : notModFileChecker,
	saveFileChecker   : saveFileChecker,
	saveGameManager   : saveGameManager,
	savegameTrack     : savegameTrack,
}


