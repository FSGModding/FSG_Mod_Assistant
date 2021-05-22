//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// i18n Translator function (simple string mapping with "en" fallback)

// (c) 2021 JTSage.  MIT License.
const fs      = require('fs');
const path    = require('path');
const glob    = require('glob');

module.exports = class translator {
	myLocale = null;

	strings = [];

	constructor(locale = "en") {
		this.myLocale = locale;
		this.loadStrings();
	}

	get getLangs() {
		var returnArray = [];
		Object.keys(this.strings).forEach((key) => {
			returnArray.push([this.strings[key].language_code, this.strings[key].language_name]);
		});
		return returnArray;
	}

	stringLookup(stringID) {
		stringID = stringID.toLowerCase();

		if ( this.myLocale in this.strings && stringID in this.strings[this.myLocale] ) {
			return this.strings[this.myLocale][stringID];
		}
		if ( stringID in this.strings["en"] ) {
			return this.strings["en"][stringID];
		}
		return stringID;
	}
	
	loadStrings() {
		var langJSON = glob.sync(path.join(__dirname, "*.json"));

		langJSON.forEach( (thisFile) => {
			this.strings[path.basename(thisFile, ".json")] = JSON.parse(fs.readFileSync(thisFile));
		});
	}
}