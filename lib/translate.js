/*  _______           __ ______ __                __               
   |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
   |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
   |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  */

// i18n Translator function (simple string mapping with "en" fallback)

// (c) 2021 JTSage.  MIT License.

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
	#currentLocale     = null
	#translatorStrings = []
	#langPromise       = null
	mcVersion          = null

	constructor(locale = 'en') {
		this.#currentLocale = locale

		this.#langPromise = this.loadLanguages()
	}

	deferCurrentLocale = () => { return this.#currentLocale }
	get currentLocale() { return this.#currentLocale }
	set currentLocale(value) {
		if ( value in this.#translatorStrings ) {
			this.#currentLocale = value
		}
	}

	async loadLanguages() {
		
		const langJSON = fs.readdirSync(path.join(__dirname, '..', 'translations'))

		langJSON.forEach( (thisFile) => {
			if ( path.extname(thisFile) === '.json' ) {
				const thisLang = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'translations', thisFile)))
				this.#translatorStrings[thisLang.language_code] = thisLang
			}
		})
	}

	async getLangList() {
		return this.#langPromise.then(() => {
			const returnArray = []
			returnArray.push(['en', this.#translatorStrings.en.language_name])
			Object.keys(this.#translatorStrings).forEach((key) => {
				if ( key !== 'en' ) {
					returnArray.push([key, this.#translatorStrings[key].language_name])
				}
			})
			return returnArray
		})
	}

	syncStringLookup(stringID) {
		// Note: this could fail depending on when it's used.
		if ( stringID === null ) { return null }
			
		const lcStringID = stringID.toLowerCase()

		if ( lcStringID === 'mc_ver_string' ) { return this.mcVersion }

		if ( this.#currentLocale in this.#translatorStrings && lcStringID in this.#translatorStrings[this.#currentLocale] ) {
			return this.#translatorStrings[this.#currentLocale][lcStringID]
		}
		if ( lcStringID in this.#translatorStrings.en ) {
			return this.#translatorStrings.en[lcStringID]
		}
		return lcStringID
	}

	async stringLookup(stringID) {
		return this.#langPromise.then(() => {
			if ( stringID === null ) { return null }
			
			const lcStringID = stringID.toLowerCase()

			if ( lcStringID === 'mc_ver_string' ) { return this.mcVersion }

			if ( this.#currentLocale in this.#translatorStrings && lcStringID in this.#translatorStrings[this.#currentLocale] ) {
				return this.#translatorStrings[this.#currentLocale][lcStringID]
			}
			if ( lcStringID in this.#translatorStrings.en ) {
				return this.#translatorStrings.en[lcStringID]
			}
			return lcStringID
		})
	}
}