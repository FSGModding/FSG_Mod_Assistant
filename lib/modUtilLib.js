/*  _______           __ _______               __         __   
	 |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
	 |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
	 |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
	 (c) 2022-present FSG Modding.  MIT License. */

// DDS Library - based on
// https://github.com/kchapelier/decode-dxt (modernized)
//  and
// https://github.com/Jam3/parse-dds


const fs                    = require('node:fs')
const path                  = require('node:path')
const { keyMap, localKeys } = require('../renderer/renderJS/key_lookup_table.js')

class ma_logger {
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

	constructor( defaultProcess, app = null, fileName = null, clearFile = true) {
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

	set dangerCallBack(newCallback) { this.#dangerEvent = newCallback }
	
	forceNoConsole() { this.#isPacked = true }

	#trans = {
		// eslint-disable-next-line no-console
		console : (text) => { if ( ! this.#isPacked ) { console.log(text) } },
		file    : (text) => { if ( this.#fullFileName !== null ) { this.#fileHandle.write(`${text}\n`) } },
	}

	#addToLog(level, process, text) {
		if ( level === 'danger' && typeof this.#dangerEvent === 'function' ) { this.#dangerEvent() }
		const cleanTextText = typeof text === 'string' ? text.replaceAll('\n', '\n -- ') : text
		const cleanTextHTML = typeof text === 'string' ? text.replaceAll('\n', '<br> -- ') : text
		const logTime       = new Date()
		const logTimeString = `${logTime.getFullYear()}-${(logTime.getMonth()+1).toString().padStart(2, '0')}-${(logTime.getDate()).toString().padStart(2, '0')} ${(logTime.getHours()).toString().padStart(2, '0')}:${(logTime.getMinutes()).toString().padStart(2, '0')}:${(logTime.getSeconds()).toString().padStart(2, '0')}`
		const cleanProcess  = process === null || process === this.#process ? '' : `${process} >> `
		const simpleText    = `${logTimeString} | ${level.toUpperCase().padStart(7, ' ')} | ${cleanProcess}${cleanTextText}`
		const htmlText      = `<em>${logTimeString}</em> | <span class="log_level ${this.#level_to_color[level]}">${level.toUpperCase().padStart(7, ' ')}</span> | ${cleanProcess}${cleanTextHTML}`

		for (const transport in this.#trans) {
			this.#trans[transport](simpleText)
		}
		this.#htmlLog.push(htmlText)
		this.#textLog.push(simpleText)
	}

	log = {
		danger  : (text, process = null) => { this.#addToLog('danger', process, text) },
		debug   : (text, process = null) => { this.#addToLog('debug', process, text) },
		error   : (text, process = null) => { this.#addToLog('danger', process, text) },
		info    : (text, process = null) => { this.#addToLog('info', process, text) },
		notice  : (text, process = null) => { this.#addToLog('notice', process, text) },
		warn    : (text, process = null) => { this.#addToLog('warning', process, text) },
		warning : (text, process = null) => { this.#addToLog('warning', process, text) },
	}

	group = (process) => { return {
		danger  : (text) => { this.log.danger(text, process) },
		debug   : (text) => { this.log.debug(text, process) },
		error   : (text) => { this.log.danger(text, process) },
		info    : (text) => { this.log.info(text, process) },
		notice  : (text) => { this.log.notice(text, process) },
		warn    : (text) => { this.log.warning(text, process) },
		warning : (text) => { this.log.warning(text, process) },
	} }

	bulk = (itemObj) => {
		const thisProcess = itemObj.title
		for ( const lineItem of itemObj.items ) {
			this.#addToLog(lineItem[0], thisProcess, lineItem[1])
		}
	}

	get pathToLog() { return this.#fullFileName }
	get textLog()   { return this.#textLog.join('\n') }
	get htmlLog()   { return this.#htmlLog.join('\n') }
}


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

class translator {
	#log               = null
	#debug             = false
	#currentLocale     = null
	#translatorStrings = new Map()
	#langPromise       = null
	mcVersion          = null
	iconOverrides      = {
		admin_button           : 'globe2',
		admin_pass_button      : 'key',
		button_gamelog         : 'file-earmark-text',
		download_button        : 'cloud-download',
		export_button          : 'filetype-csv',
		folder_bot_button      : 'align-bottom',
		folder_down_button     : 'chevron-down',
		folder_top_button      : 'align-top',
		folder_up_button       : 'chevron-up',
		game_admin_pass_button : 'person-lock',
		help_button            : 'question-circle',
		min_tray_button        : 'chevron-bar-down',
		notes_button           : 'journal-text',
		preferences_button     : 'gear',
		removable_button       : 'usb-drive',
		savegame_manage        : 'hdd',
		savegame_track         : 'calendar2-check',
		search_all             : 'search',
		update_ready           : 'cloud-download',
	}
	keybinds = {
		folder_refresh__title : ['KEY_f5'],
		help_button__title    : ['KEY_f1'],
		launch_game__title    : ['KEY_lctrl', 'KEY_space'],
		search_all__title     : ['KEY_f3'],
	}

	constructor(locale = null, debug = false) {
		this.#currentLocale = locale === null ? getSystemLocale() : locale
		this.#debug         = debug

		this.#log = maIPC.log.group('translate-lib')
		this.#log.info(`Starting i18n Library :: ${this.#currentLocale}`)

		this.#langPromise = this.loadLanguages()
	}

	deferCurrentLocale = () => { return this.#currentLocale }
	get currentLocale() { return this.#currentLocale }
	set currentLocale(value) {
		if ( this.#translatorStrings.has(value) ) {
			this.#currentLocale = value
		}
	}

	async loadLanguages() {
		
		const langJSON = fs.readdirSync(path.join(__dirname, '..', 'translations'))

		for ( const thisFile of langJSON ) {
			if ( path.extname(thisFile) === '.json' ) {
				try {
					const thisLang = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'translations', thisFile)))
					this.#translatorStrings.set(thisLang.language_code, new Map(Object.entries(thisLang)))
					this.#log.debug(`Loaded ${thisLang.language_code} Language`)
				} catch (_) {
					this.#log.warning(`Unable to load language: ${thisFile}`)
				}
			}
		}
	}

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

	iconOverride(stringID) {
		const className = this.iconOverrides[stringID] ?? null
		return ( className !== null ) ?
			`<i class="bi bi-${className}"></i>` :
			null
	}

	syncStringLookup(stringID) {
		// Note: this could fail depending on when it's used.
		if ( stringID === null ) { return null }
		
		let   possibleValue = null
		const lcStringID    = stringID.toLowerCase()

		possibleValue ??= this.iconOverride(lcStringID)
		possibleValue ??= this.#translatorStrings.get(this.#currentLocale)?.get(lcStringID)
		possibleValue ??= this.#translatorStrings.get('en')?.get(lcStringID)
		possibleValue ??= `__${lcStringID}__`

		if ( this.#debug ) {
			if ( possibleValue === '' ) { this.#log.info(`Empty translation string : ${this.#currentLocale} :: ${lcStringID}`) }
			if ( possibleValue === `__${lcStringID}__` ) { this.#log.info(`Unknown translation string : ${this.#currentLocale} :: ${lcStringID}`) }
		}
		return possibleValue
	}

	async stringLookup(stringID) {
		return this.#langPromise.then(() => {
			return this.syncStringLookup(stringID)
		})
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

class modCacheManager {
	#cacheMap     = new Map()
	#saveFileData = null
	#saveFileIcon = null

	constructor(filePath) {
		this.#saveFileData = path.join(filePath, 'mod_cache.json')
		this.#saveFileIcon = path.join(filePath, 'mod_icons.json')
		this.loadFile()
	}

	loadFile() {
		if ( !fs.existsSync(this.#saveFileData) ||  !fs.existsSync(this.#saveFileIcon) ) {
			maIPC.log.log.debug('Cache Not Found, Creating', 'mod-cache-manager')
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
			maIPC.log.log.warning(`Cache Error :: ${err}`, 'mod-cache-manager')
		}
	}

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
			maIPC.log.log.warning(`Cache Write Error :: ${err}`, 'mod-cache-manager')
		}
	}

	get keys()          { return this.#cacheMap.keys() }

	clearAll() {
		this.#cacheMap.clear()
		this.saveFile()
	}

	hasMod(uuid)       { return this.#cacheMap.has(uuid) }
	getMod(uuid)       { return this.hasMod(uuid) ? this.#cacheMap.get(uuid) : false }
	remMod(uuid)       { this.#cacheMap.delete(uuid) }
	setMod(uuid, data) { this.#cacheMap.set(uuid, data) }
}

const maIPC = {
	decodePath : null,
	l10n       : { deferCurrentLocale : () => 'en', syncStringLookup : (x) => x },
	loading    : { current : () => {} },
	log        : null,
	modCache   : null,
	notes      : null,
	processing : false,
	settings   : null,
	sites      : null,
}

module.exports = {
	getDeferPromise : getDeferPromise,
	ma_logger       : ma_logger,
	maIPC           : maIPC,
	modCacheManager : modCacheManager,
	translator      : translator,
}
