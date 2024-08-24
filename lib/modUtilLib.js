/*  _______           __ _______               __         __   
	 |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
	 |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
	 |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
	 (c) 2022-present FSG Modding.  MIT License. */
/* eslint complexity: ["error", 25] */
// MARK: MOD UTIL [main]
// TODO: doc marks

/**
 * Utility libraries for MA
 * @module modUtilLib
 */

const EventEmitter          = require('node:events')
const fs                    = require('node:fs')
const path                  = require('node:path')
const { keyMap, localKeys } = require('../renderer/renderJS/util/key_lookup_table.js')
const baseGameLang          = require('./modLookerLang.json')

/**
 * Logger Class
 * @class
*/
class ma_logger extends EventEmitter {
	#isPacked     = false
	#dataPath     = null
	#fullFileName = null
	#dangerEvent  = null

	#fileHandle   = null

	#textLog = []
	#htmlLog = []
	#process = ''

	#level_to_color = {
		danger  : 'fw-bold text-danger',
		debug   : 'fw-bold text-muted',
		info    : 'fw-bold text-info',
		notice  : 'fw-bold text-success',
		warning : 'fw-bold text-warning',
	}

	/**
	 * Create a new log instance
	 * @param {string} defaultProcess Default process string
	 * @param {object} app Electron app api
	 * @param {string} fileName File to output
	 * @param {boolean} clearFile Clear file when starting
	 */
	constructor( defaultProcess, app = null, fileName = null, clearFile = true) {
		super()
		this.#process = defaultProcess

		if ( app !== null ) {
			this.#isPacked = app.isPackaged
			this.#dataPath = app.getPath('userData')

			if ( fileName !== null && clearFile ) {
				this.#fullFileName = path.join(this.#dataPath, fileName)
				this.#fileHandle   = fs.createWriteStream(this.#fullFileName)

				this.#fileHandle.on('error', (err) => {
					delete this.#trans.file
					this.#addToLog('danger', 'logging-class', `File write failed : ${err.message}`)
				})
			}
		}
	}

	/**
	 * Set danger callback function
	 * @param {function} newCallback Function to call
	 */
	set dangerCallBack(newCallback) { this.#dangerEvent = newCallback }
	
	/**
	 * Turn off console writes
	 */
	forceNoConsole() { this.#isPacked = true }

	#trans = {
		// eslint-disable-next-line no-console
		console : (text) => { if ( ! this.#isPacked ) { console.log(text) } },
		file    : (text) => { if ( this.#fullFileName !== null ) { this.#fileHandle.write(`${text}\n`) } },
	}

	/**
	 * Add a log line
	 * @param {string} level Level, one of 'danger', 'warning', 'notice', 'info', or 'debug'
	 * @param {string} process Process to log
	 * @param  {...string} text Text to add to log
	 * @private
	 * @instance
	 * @memberof ma_logger
	 */
	#addToLog(level, process, ...text) {
		const inputText = this.#mapTextInput(...text)//[...text].map((x) => x.toString()).join(' :: ')
		if ( level === 'danger' && typeof this.#dangerEvent === 'function' ) { this.#dangerEvent() }
		const cleanTextText = typeof inputText === 'string' ? inputText.replaceAll('\n', '\n -- ') : inputText
		const cleanTextHTML = typeof inputText === 'string' ? inputText.replaceAll('\n', '<br> -- ') : inputText
		const logTime       = new Date()
		const logTimeString = `${logTime.getFullYear()}-${(logTime.getMonth()+1).toString().padStart(2, '0')}-${(logTime.getDate()).toString().padStart(2, '0')} ${(logTime.getHours()).toString().padStart(2, '0')}:${(logTime.getMinutes()).toString().padStart(2, '0')}:${(logTime.getSeconds()).toString().padStart(2, '0')}`
		const cleanProcess  = process === null || process === this.#process ? '' : `${process} >> `
		const simpleText    = `${logTimeString} | ${level.toUpperCase().padStart(7, ' ')} | ${cleanProcess}${cleanTextText}`
		const htmlText      = `<em>${logTimeString}</em> | <span class="log_level ${this.#level_to_color[level]}">${level.toUpperCase().padStart(7, ' ')}</span> | ${cleanProcess}${cleanTextHTML}`

		for (const transport in this.#trans) {
			this.#trans[transport](simpleText)
		}
		this.emit('logAdded', level, htmlText)
		this.#htmlLog.push([level, htmlText])
		this.#textLog.push(simpleText)
	}

	#mapTextInput(...text) {
		return [...text].map((item) => {
			if ( typeof item !== 'object' ) {
				return item.toString()
			}
			return JSON.stringify(
				item,
				(_key, value) => (value instanceof Set ? [...value] : value)
			)
		}).join(' :: ')
	}

	/**
	 * Add danger level error
	 * @param {string} process Process to log
	 * @param  {...string} text Text to log
	 */
	danger  (process, ...text) { this.#addToLog('danger', process, ...text) }
	/**
	 * Add debug level error
	 * @param {string} process Process to log
	 * @param  {...string} text Text to log
	 */
	debug   (process, ...text) { this.#addToLog('debug', process, ...text) }
	/**
	 * Add danger level error
	 * @param {string} process Process to log
	 * @param  {...string} text Text to log
	 */
	error   (process, ...text) { this.#addToLog('danger', process, ...text) }
	/**
	 * Add info level error
	 * @param {string} process Process to log
	 * @param  {...string} text Text to log
	 */
	info    (process, ...text) { this.#addToLog('info', process, ...text) }
	/**
	 * Add notice level error
	 * @param {string} process Process to log
	 * @param  {...string} text Text to log
	 */
	notice  (process, ...text) { this.#addToLog('notice', process, ...text) }
	/**
	 * Add warning level error
	 * @param {string} process Process to log
	 * @param  {...string} text Text to log
	 */
	warn    (process, ...text) { this.#addToLog('warning', process, ...text) }
	/**
	 * Add warning level error
	 * @param {string} process Process to log
	 * @param  {...string} text Text to log
	 */
	warning (process, ...text) { this.#addToLog('warning', process, ...text) }

	log = {
		danger  : (text, process) => { this.danger(process, 'DANGER DEPRECIATED', text) },
		debug   : (text, process) => { this.danger(process, 'DEBUG DEPRECIATED', text) },
		error   : (text, process) => { this.danger(process, 'DANGER DEPRECIATED', text) },
		info    : (text, process) => { this.danger(process, 'INFO DEPRECIATED', text) },
		notice  : (text, process) => { this.danger(process, 'NOTICE DEPRECIATED', text) },
		warn    : (text, process) => { this.danger(process, 'WARNING DEPRECIATED', text) },
		warning : (text, process) => { this.danger(process, 'WARNING DEPRECIATED', text) },
	}

	/**
	 * Create grouped process
	 * @param {string} process Process to log
	 * @returns {Object} Object of standard log level functions
	 */
	group = (process) => { return {
		danger  : (...text) => { this.danger(process, ...text) },
		debug   : (...text) => { this.debug(process, ...text) },
		error   : (...text) => { this.danger(process, ...text) },
		info    : (...text) => { this.info(process, ...text) },
		notice  : (...text) => { this.notice(process, ...text) },
		warn    : (...text) => { this.warning(process, ...text) },
		warning : (...text) => { this.warning(process, ...text) },
	} }

	/**
	 * @property {string} pathToLog Path to log on disk
	 */
	get pathToLog() { return this.#fullFileName }
	/**
	 * @property {string} textLog Full log as text
	 */
	get textLog()   { return this.#textLog.join('\n') }
	/**
	 * @property {string} htmlLog Full log as html
	 */
	get htmlLog()   { return this.#htmlLog }
}

/**
 * 
 * @returns 2 letter system locale, constrained to the set Giants uses
 */
const getSystemLocale = function () {
	const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale
	const spanishEA = new Set([
		'es-AR', 'es-BO', 'es-CL', 'es-CO', 'es-CR', 'es-DO', 'es-EC', 'es-GT', 'es-HN', 'es-MX', 'es-NI', 'es-PA', 'es-PE', 'es-PR', 'es-PY', 'es-SV', 'es-UY', 'es-VE'
	])
	const chineseT = new Set(['zh-CHT', 'zh-Hant', 'zh-HK', 'zh-MO', 'zh-TW'])
	const chineseS = new Set(['zh', 'zh-CHS', 'zh-Hans', 'zh-CN', 'zh-SG'])

	if ( chineseT.has(systemLocale) ) { return 'ct' }
	if ( chineseS.has(systemLocale) ) { return 'cs' }
	if ( spanishEA.has(systemLocale) ) {
		// return 'ea' // FUTURE PROOFING, NOT YET SUPPORTED
		return 'es'
	}
	switch ( systemLocale ) {
		case 'fr-CA' :
			//return 'fc' // FUTURE PROOF
			return 'fr'
		case 'pt-BR' :
			return 'br'
		case 'cs':
			return 'cz'
		case 'ja':
			return 'jp'
		case 'ko':
			return 'kr'
		default :
			return systemLocale.slice(0, 2)
	}
}

/**
 * l10n Library
 * @class
 */
class translator {
	#log               = null
	#debug             = false
	#currentLocale     = null
	#translatorStrings = new Map()
	#langPromise       = null
	mcVersion          = null
	/**
	 * @property {Object} iconOverrides Preset string->icon
	 */
	iconOverrides      = {
		admin_button           : 'globe2',
		admin_pass_button      : 'key',
		base_game_data         : 'wikipedia',
		basegame_button_back   : 'arrow-left',
		basegame_button_comp   : 'file-diff-fill',
		basegame_button_folder : 'folder',
		basegame_button_home   : 'house-fill',
		basegame_compare_all   : 'file-earmark-diff-fill',
		button_gamelog         : 'file-earmark-text',
		check_save             : 'file-earmark-check',
		download_button        : 'cloud-download',
		export_button          : 'filetype-csv',
		folder_bot_button      : 'align-bottom',
		folder_down_button     : 'chevron-down',
		folder_top_button      : 'align-top',
		folder_up_button       : 'chevron-up',
		game_admin_pass_button : 'person-lock',
		help_button            : 'question-circle',
		map_multi_button       : 'globe-americas',
		min_tray_button        : 'chevron-bar-down',
		mini_mode_button       : 'window-stack"',
		notes_button           : 'journal-text',
		preferences_button     : 'gear',
		refresh_page           : 'arrow-clockwise',
		removable_button       : 'usb-drive',
		remove_folder          : 'trash3',
		savegame_manage        : 'hdd',
		savegame_track         : 'calendar2-check',
		search_all             : 'search',
		update_ready           : 'cloud-download',

		tag_filter__exclusive  : 'pin',
		tag_filter__hide       : 'eye-slash',
		tag_filter__show       : 'eye',

		prod_hour   : 'clock',
		prod_minute : 'hourglass',
		prod_month  : 'calendar3',
	}
	keybinds = {
		folder_refresh__title : ['KEY_f5'],
		help_button__title    : ['KEY_f1'],
		launch_game__title    : ['KEY_lctrl', 'KEY_space'],
		search_all__title     : ['KEY_f3'],
	}

	specialStrings = {
		'app_name' :
			(text_t) => `<i class="fsico-ma-large"></i>${text_t}`,
	}

	#overrideSet_Icons   = new Set()

	/**
	 * Create a new translator instance
	 * @param {string} locale 2 letter locale
	 * @param {boolean} debug Show debug information
	 */
	constructor(locale = null, debug = false) {
		this.#currentLocale = locale === null ? getSystemLocale() : locale
		this.#debug         = debug

		this.#log = serveIPC.log.group('translate-lib')
		this.#log.info(`Starting i18n Library :: ${this.#currentLocale}`)

		this.#overrideSet_Icons = new Set(Object.keys(this.iconOverrides))

		this.#langPromise = this.#loadLanguages()
	}

	/**
	 * Useful for passing a later-called function around
	 * @returns {string} 2 letter locale
	 */
	deferCurrentLocale = () => { return this.#currentLocale }
	/**
	 * @property {string} currentLocale 2 letter locale
	 */
	get currentLocale() { return this.#currentLocale }
	set currentLocale(value) {
		if ( this.#translatorStrings.has(value) ) {
			this.#currentLocale = value
		}
	}

	/**
	 * @property {Object} currentUnits Get current measurement units
	 */
	get currentUnits() {
		return {
			hp       : this.syncStringLookup('unit_hp'),
			kph      : this.syncStringLookup('unit_kph'),
			mph      : this.syncStringLookup('unit_mph'),
			rpm      : this.syncStringLookup('unit_rpm'),
			unit_hp  : this.syncStringLookup('unit_hp'),
			unit_kph : this.syncStringLookup('unit_kph'),
			unit_mph : this.syncStringLookup('unit_mph'),
			unit_rpm : this.syncStringLookup('unit_rpm'),
		}
	}

	/**
	 * load Language files
	 * @private
	 * @instance
	 * @memberof translator
	 */
	async #loadLanguages() {
		const langJSON = fs.readdirSync(path.join(__dirname, '..', 'translations'))

		for ( const thisFile of langJSON ) {
			if ( path.extname(thisFile) === '.json' ) {
				try {
					const thisLang = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'translations', thisFile)))
					this.#translatorStrings.set(thisLang.language_code, new Map(Object.entries(thisLang)))
					this.#log.debug(`Loaded ${thisLang.language_code} Language`)
				} catch (err) {
					this.#log.warning(`Unable to load language: ${thisFile} :: ${err}`)
				}
			}
		}
	}

	/**
	 * Get loaded language list
	 * @returns {Array.<Array>} [[langCode, Language Title],...]
	 */
	async getLangList() {
		return this.#langPromise.then(() => {
			const returnArray = []
			returnArray.push(['en', 'English'])
			for ( const key of this.#translatorStrings.keys() ) {
				if ( key !== 'en' ) {
					returnArray.push([key, this.#translatorStrings.get(key)?.get('language_name')])
				}
			}
			return returnArray
		})
	}

	#iconOverride(stringID) {
		const className = this.iconOverrides[stringID] ?? null
		return ( className !== null ) ?
			`<i class="bi bi-${className}"></i>` :
			null
	}

	async getTextOverride(key, {newText = null, prefix = '', suffix = ''} = {}) {
		return this.getText(key, true).then((result) => {
			if ( newText !== null ) { result.entry = newText }
			result.entry = `${prefix}${result.entry}${suffix}`
			return result
		})
	}

	async getText(key, skipDebug = false) {
		if ( key === null ) { return null }
		
		return this.#langPromise.then(() => {
			const entry_key = key.toLowerCase()
			const title_key = `${entry_key}__title`
			const i18nObject = {
				entry     : null,
				entry_key : entry_key,
				title     : null,
			}

			if ( i18nObject.entry_key.startsWith('$l10n') ) {
				const baseKey   = i18nObject.entry_key.replace('$l10n_', '')

				i18nObject.entry ??= baseGameLang?.[this.#currentLocale]?.[baseKey]
				i18nObject.entry ??= baseGameLang.en?.[baseKey]
				i18nObject.entry ??= baseKey.startsWith('filltype_') ? `F:${baseKey.replace('filltype_', '')}` : `~~${baseKey}~~`

				return i18nObject
			}

			if ( i18nObject.entry_key === 'mc_ver_string' ) { i18nObject.title = this.mcVersion }
			else {
				i18nObject.title ??= this.#translatorStrings.get(this.#currentLocale)?.get(title_key)
				i18nObject.title ??= this.#translatorStrings.get('en')?.get(title_key)
				i18nObject.title = ( typeof i18nObject.title !== 'undefined' ) ? i18nObject.title : null
			}

			if ( this.#overrideSet_Icons.has(entry_key) ) {
				i18nObject.entry = this.#iconOverride(entry_key)
				return i18nObject
			}

			i18nObject.entry ??= this.#translatorStrings.get(this.#currentLocale)?.get(entry_key)
			i18nObject.entry ??= this.#translatorStrings.get('en')?.get(entry_key)
			i18nObject.entry ??= `__${entry_key}__`

			if ( !skipDebug && this.#debug ) {
				if ( i18nObject.entry === '' ) { this.#log.info(`Empty translation string : ${this.#currentLocale} :: ${entry_key}`) }
				if ( i18nObject.entry === `__${entry_key}__` ) { this.#log.info(`Unknown translation string : ${this.#currentLocale} :: ${entry_key}`) }
			}

			return i18nObject
		})
	}

	/**
	 * Synchronous lookup
	 * @param {string} stringID 
	 * @returns {string} Translated text
	 */
	syncStringLookup(stringID) {
		// Note: this could fail depending on when it's used.
		if ( stringID === null ) { return null }
		
		let   possibleValue = null
		const lcStringID    = stringID.toLowerCase()

		possibleValue ??= this.#iconOverride(lcStringID)
		possibleValue ??= this.#translatorStrings.get(this.#currentLocale)?.get(lcStringID)
		possibleValue ??= this.#translatorStrings.get('en')?.get(lcStringID)
		possibleValue ??= `__${lcStringID}__`

		if ( this.#debug ) {
			if ( possibleValue === '' ) { this.#log.info(`Empty translation string : ${this.#currentLocale} :: ${lcStringID}`) }
			if ( possibleValue === `__${lcStringID}__` ) { this.#log.info(`Unknown translation string : ${this.#currentLocale} :: ${lcStringID}`) }
		}
		return possibleValue
	}

	/**
	 * Retrieve MA string
	 * @param {string} stringID 
	 * @returns {string} Translated string
	 */
	async stringLookup(stringID) {
		return this.#langPromise.then(() => {
			return this.syncStringLookup(stringID)
		})
	}
	/**
	 * Retrieve multiple MA strings
	 * @param {Array.<string>} stringIDs Array of stringIDs
	 * @returns {Array.<Array>} [[stringID, Translated String], ...]
	 */
	async stringGroup(stringIDs) {
		return this.#langPromise.then(() => [...stringIDs].map((x) => [x, this.syncStringLookup(x)]) )
	}

	/**
	 * Retrieve base game string
	 * @param {string} stringID 
	 * @returns {string} Translated string
	 */
	async baseStringLookup(stringID) {
		return this.#langPromise.then(() => this.syncBaseStringLookup(stringID))
	}

	/**
	 * Retrieve multiple base game strings
	 * @param {Array.<string>} stringIDs 
	 * @returns {string} [[stringID, Translated String], ...]
	 */
	async baseStringGroup(stringIDs) {
		return this.#langPromise.then(() => [...stringIDs].map((x) => [x, this.syncBaseStringLookup(x)]) )
	}

	/**
	 * Retrieve base game string
	 * @param {string} stringID
	 * @returns {string} Translated string
	 */
	syncBaseStringLookup(stringID) {
		const lookupID   = stringID.replace('$l10n_', '')
		let   thisAnswer =  baseGameLang?.[this.#currentLocale]?.[lookupID]

		thisAnswer ??= baseGameLang.en?.[lookupID]
		thisAnswer ??= stringID

		return thisAnswer
	}

	#keyBindLookup(stringID) {
		if ( ! Object.hasOwn(this.keybinds, stringID) ) {
			return ''
		}
		const bindArr  = []
		const thisBind = this.keybinds[stringID]

		for ( const thisKey of thisBind ) {
			let thisPart = null

			thisPart ??= localKeys?.[this.#currentLocale]?.[thisKey]
			thisPart ??= localKeys?.en?.[thisKey]
			thisPart ??= keyMap?.[thisKey]
			bindArr.push(thisPart)
		}
		return ` [${bindArr.join('+')}]`
	}

	/**
	 * Retrieve MA title string
	 * @param {string} stringID 
	 * @returns {string} Translated string
	 */
	async stringTitleLookup(stringID) {
		return this.#langPromise.then(() => {
			if ( stringID === null ) { return null }
			
			const lcStringID = `${stringID.toLowerCase()}__title`

			if ( lcStringID === 'mc_ver_string' ) { return this.mcVersion }

			let possibleValue = null
			
			possibleValue ??= this.#translatorStrings.get(this.#currentLocale)?.get(lcStringID)
			possibleValue ??= this.#translatorStrings.get('en')?.get(lcStringID)

			return typeof possibleValue === 'string' ? `${possibleValue}${this.#keyBindLookup(lcStringID)}` : null
		})
	}
}

function getDeferPromise() {
	let _resolve, _reject

	const promise = new Promise((resolve, reject) => {
		_reject = reject
		_resolve = resolve
	})

	promise.resolve_ex = (value) => {
		_resolve(value)
	}

	promise.reject_ex = (value) => {
		_reject(value)
	}

	return promise
}

/**
 * Mod Cache Manager
 * @class
*/
class modCacheManager {
	#cacheMap     = new Map()
	#saveFileData = null
	#saveFileIcon = null

	/**
	 * Create new instance
	 * @param {string} filePath Path to save to on disk
	 */
	constructor(filePath) {
		this.#saveFileData = path.join(filePath, 'mod_cache.json')
		this.#saveFileIcon = path.join(filePath, 'mod_icons.json')
		this.loadFile()
	}

	/**
	 * Load current cache
	 * @returns null
	 */
	loadFile() {
		if ( !fs.existsSync(this.#saveFileData) ||  !fs.existsSync(this.#saveFileIcon) ) {
			serveIPC.log.debug('mod-cache-manager', 'Cache Not Found, Creating')
			return
		}

		try {
			const dataContents = JSON.parse(fs.readFileSync(this.#saveFileData))
			const iconContents = JSON.parse(fs.readFileSync(this.#saveFileIcon))

			for ( const key of Object.keys(dataContents) ) {
				const keyContents = dataContents[key]

				keyContents.modDesc.iconImageCache = iconContents[key] ?? null

				this.#cacheMap.set(key, keyContents)
			}
		} catch (err) {
			serveIPC.log.warning('mod-cache-manager', 'Cache Error', err)
		}
	}

	/**
	 * Save current cache
	 */
	saveFile() {
		try {
			const writeData = fs.createWriteStream(this.#saveFileData)
			const writeIcon = fs.createWriteStream(this.#saveFileIcon)

			writeData.write('{')
			writeIcon.write('{')

			let lastData = null
			let lastIcon = null

			for ( const [key, value] of this.#cacheMap ) {
				if ( lastData !== null ) { writeData.write(`${lastData},\n`) }
				if ( lastIcon !== null ) { writeIcon.write(`${lastIcon},\n`) }

				lastIcon = `"${key}" : ${JSON.stringify(value.modDesc.iconImageCache)}`
				lastData = `"${key}" : ${JSON.stringify(value, (k, v) => k === 'iconImageCache' ? null : v )}`
			}

			if ( lastData !== null ) { writeData.write(`${lastData}\n`) }
			if ( lastIcon !== null ) { writeIcon.write(`${lastIcon}\n`) }
			writeData.end('}\n')
			writeIcon.end('}\n')
		} catch (err) {
			serveIPC.log.warning('mod-cache-manager', 'Cache Write Error', err)
		}
	}

	/**
	 * @property {Array.<string>} keys Array of mod uuid keys
	 */
	get keys()          { return this.#cacheMap.keys() }

	/**
	 * Clear the cache
	 */
	clearAll() {
		this.#cacheMap.clear()
		this.saveFile()
	}

	/**
	 * Test is mod exists in cache
	 * @param {string} uuid Mod UUID
	 * @returns {boolean} UUID exists in cache
	 */
	hasMod(uuid)       { return this.#cacheMap.has(uuid) }
	/**
	 * Get mod from cache
	 * @param {string} uuid Mod UUID
	 * @returns {(Object|boolean)} Mod record or false
	 */
	getMod(uuid)       { return this.hasMod(uuid) ? this.#cacheMap.get(uuid) : false }
	/**
	 * Remove mod from cache
	 * @param {string} uuid Mod UUID
	 */
	remMod(uuid)       { this.#cacheMap.delete(uuid) }
	/**
	 * Add mod to cache (or update)
	 * @param {string} uuid Mod UUID
	 * @param {Object} data Mod Record
	 */
	setMod(uuid, data) { this.#cacheMap.set(uuid, data) }
}


/** 
 * IPC Communication
 * @typedef serveIPC
 * @type {Object}
 * @property {Object} dlRequest NET download request object
 * @property {module:modCheckLib~modFileCollection} modCollect mod collection
 * @property {Set} modFolders mod folders as full paths
 * @property {module:modAssist_window_lib.windowLib} windowLib Window handling library
 * @property {module:modUtilLib~modCacheManager} storeCache Mod Cache
 * @property {electron-store} storeCacheDetail Mod Details Cache
 * @property {electron-store} storeNote Collection Settings
 * @property {electron-store} storeSet Application Settings
 * @property {electron-store} storeSites Mod External Sites
 * @property {saveFileCheckerRecord} cacheGameSave Loaded save game compare
 * @property {module:modUtilLib~ma_logger} log Logging Class
 * @property {module:modUtilLib~translator} l10n Localization class
 * @property {Set} ignoreMalwareList Malware files to ignore in this session
 * @property {Set} whiteMalwareList Malware files globally white-listed
 * @property {boolean} isBotDisabled use FSG Bot
 * @property {boolean} isDownloading Currently downloading mods
 * @property {boolean} isFirstMinimize Has been minimized this session
 * @property {boolean} isFirstRun Has been opened before
 * @property {boolean} isFoldersDirty Folders need re-scanned
 * @property {boolean} isFoldersEdit Folders are being edited
 * @property {boolean} isGamePolling Poll game for running status
 * @property {boolean} isGameRunning Is the game running
 * @property {boolean} isModCacheDisabled Don't cache mods
 * @property {boolean} isProcessing Mod processor running
 * @property {module:modAssist_window_lib~loadingWindow} loadWindow Loading window 
 * @property {Object} devControls Dev controls status { version : boolean }
 * @property {module:modUtilLib~gameSetOverride} gameSetOverride Game settings overrides
 * @property {module:modUtilLib~intervals} interval Running intervals
 * @property {referenceFunctions} refFunc Reference functions
 * @property {Object} icon Icons needed elsewhere
 * @property {module:modUtilLib~ipc-path} path Reusable paths
 * @property {Object} watch Watched files
*/
const serveIPC = {
	/**
	 * Get translated string (sync!!)
	 * @param {string} x String ID
	 * @returns {string} Translated string
	 * @method
	 */
	__ : (x) => serveIPC.l10n.syncStringLookup(x),

	dlRequest        : null,
	modCollect       : null,
	modFolders       : new Set(),
	windowLib        : null,

	storeCache       : null,
	storeCacheDetail : null,
	storeNote        : null,
	storeSet         : null,
	storeSites       : null,

	compareMap       : new Map(),

	cacheGameSave    : null,
	
	l10n         : { deferCurrentLocale : () => 'en', syncStringLookup : (x) => x },
	log          : null,

	ignoreMalwareList  : new Set(),
	whiteMalwareList   : require('./modCheckLib_static.js').malwareFalse,

	isBotDisabled      : false,
	isDebugDanger      : false,
	isDownloading      : false,
	isFirstMinimize    : true,
	isFirstRun         : false,
	isFoldersDirty     : true,
	isFoldersEdit      : false,
	isGamePolling      : true,
	isGameRunning      : false,
	isModCacheDisabled : false,
	isProcessing       : false,
	
	loadJSON     : { current : () => {} },
	loadWindow   : { current : () => {} },

	devControls : { 13 : false, 15 : false, 17 : false, 19 : false, 22 : false, 25 : false },

	/**
	 * @typedef gameSetOverride
	 * @property {boolean} active Override is active
	 * @property {?string} folder Folder for override
	 * @property {(number|string)} index Collection for override, 999 - disabled, 0 - unknown
	 * @property {Object} xml XML tree of override
	 */

	gameSetOverride : {
		active : false,
		folder : null,
		index  : 999,
		xml    : null,
	},

	/**
	 * @typedef intervals
	 * @property {?interval} gameLog game log reloader
	 * @property {?interval} gamePoll game status poll
	 * @property {?interval} modHub modhub downloader
	 * @property {?interval} update auto-updater
	 */
	interval : {
		gameLog  : null,
		gamePoll : null,
		modHub   : null,
		update   : null,
	},

	refFunc : {},

	icon : {
		tray : null,
	},

	/**
	 * @typedef ipc-path
	 * @property {string} game Path to game
	 * @property {?string} last Last path used to open a file or folder
	 * @property {string} setFile Settings file (current version)
	 * @property {string} setFolder Settings folder (current version)
	 */
	path : {
		game      : '',
		last      : null,
		setFile   : '',
		setFolder : '',
	},

	watch : {
		folders : [],
		log     : null,
	},
}

module.exports = {
	getDeferPromise : getDeferPromise,
	ma_logger       : ma_logger,
	modCacheManager : modCacheManager,
	serveIPC        : serveIPC,
	translator      : translator,
}
