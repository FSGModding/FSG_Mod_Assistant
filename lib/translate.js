/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// l10n Translator Class

// Giants' Version of Country Codes:
// en=English de=German fr=French es=Spanish ru=Russian pl=Polish it=Italian
// br=Brazilian-Portuguese cs=Chinese(Simplified) ct=Chinese(Traditional) 
// cz=Czech nl=Netherlands hu=Hungary jp=Japanese kr=Korean pt=Portuguese
// ro=Romanian tr=Turkish 

const fs   = require('fs')
const path = require('path')

module.exports.getSystemLocale = function () {
	const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale
	switch ( systemLocale ) {
		case 'pt-BR' :
			return 'br'
		case 'zh-CHT':
		case 'zh-Hant':
		case 'zh-HK':
		case 'zh-MO':
		case 'zh-TW':
			return 'ct'
		case 'zh':
		case 'zh-CHS':
		case 'zh-Hans':
		case 'zh-CN':
		case 'zh-SG':
			return 'cs'
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
module.exports.translator = class translator {
	#log               = null
	#currentLocale     = null
	#translatorStrings = new Map()
	#langPromise       = null
	mcVersion          = null
	iconOverrides      = {}

	constructor(locale = 'en', logger) {
		this.#currentLocale = locale
		this.#log           = logger

		this.#langPromise = this.loadLanguages()

		this.#log.log.info('Starting i18n Library', 'translate-library')
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
					this.#log.log.debug(`Loaded ${thisLang.language_code} Language`, 'translate-library')
				} catch (e) {
					this.#log.log.warning(`Unable to load language: ${thisFile}`, 'translate-library')
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
		const className = this.iconOverrides[stringID]
		return ( typeof className !== 'undefined' ) ?
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

		return possibleValue
	}

	async stringLookup(stringID) {
		return this.#langPromise.then(() => {
			return this.syncStringLookup(stringID)
		})
	}

	async stringTitleLookup(stringID) {
		return this.#langPromise.then(() => {
			if ( stringID === null ) { return null }
			
			const lcStringID = `${stringID.toLowerCase()}__title`

			if ( lcStringID === 'mc_ver_string' ) { return this.mcVersion }

			let possibleValue = this.#translatorStrings.get(this.#currentLocale)?.get(lcStringID)

			possibleValue ??= this.#translatorStrings.get('en')?.get(lcStringID)

			return typeof possibleValue !== 'undefined' ? possibleValue : null
		})
	}
}