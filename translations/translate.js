//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// i18n Translator function (simple string mapping with "en" fallback)

// (c) 2021 JTSage.  MIT License.
const fs   = require('fs');
const path = require('path');

module.exports = class translator {
	#currentLocale     = null;
	#translatorStrings = [];
	#langPromise       = null;

	constructor(locale = "en") {
		this.#currentLocale = locale;

		this.#langPromise = this.loadLanguages();
	}

	get currentLocale() { return this.#currentLocale; }
	set currentLocale(value) { 
		if ( value in this.#translatorStrings ) {
			this.#currentLocale = value;
		}
	}

	sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms))
	}

	async loadLanguages() {
		
		let langJSON = fs.readdirSync(__dirname);

		langJSON.forEach( (thisFile) => {		
			if ( path.extname(thisFile) === ".json" ) {
				let thisLang = JSON.parse(fs.readFileSync(path.join(__dirname, thisFile)))
				this.#translatorStrings[thisLang.language_code] = thisLang;
			}
		});
	}

	async getLangList() {
		return await this.#langPromise.then(() => {
			let returnArray = [];
			Object.keys(this.#translatorStrings).forEach((key) => {
				returnArray.push([key, this.#translatorStrings[key].language_name]);
			});
			return returnArray;
		});
	}

	async stringLookup(stringID) {
		return await this.#langPromise.then(() => {
			stringID = stringID.toLowerCase();

			if ( this.#currentLocale in this.#translatorStrings && stringID in this.#translatorStrings[this.#currentLocale] ) {
				return this.#translatorStrings[this.#currentLocale][stringID];
			}
			if ( stringID in this.#translatorStrings["en"] ) {
				return this.#translatorStrings["en"][stringID];
			}
			return stringID;
		});
	}
}