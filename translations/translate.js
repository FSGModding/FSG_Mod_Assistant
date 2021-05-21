const fs      = require('fs');
const path    = require('path');
const glob    = require("glob");

module.exports = class translator {
	myLocale = null;

	strings = [];

	constructor(locale = "en") {
		this.myLocale = locale;
		this.loadStrings();
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