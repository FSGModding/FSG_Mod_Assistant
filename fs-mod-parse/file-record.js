//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Mod File Parser - Mod Storage Class (individual)

// (c) 2021 JTSage.  MIT License.

const AdmZip  = require('adm-zip');
const fs      = require('fs');
const path    = require('path');
const xml2js  = require('xml2js');
const md5File = require('md5-file');
const glob    = require('glob');
const badFile = require('./file-diagnostic.js');

module.exports = class modFile {
	shortName = false;
	title     = false;
	fullPath  = "";

	#isFolder           = false;
	#testOK             = false;
	#fileExists         = true;
	#isBothFolderAndZip = false;

	#fileSize    = 0;
	#storeItems  = 0;
	#scriptFiles = 0;

	#iconRelFile   = false;
	#iconImage     = false;
	#iconImageFail = false;

	#activeGames = new Set();
	#usedGames   = new Set();

	XMLDocument = false;
	XMLParsed   = false;

	mod_version  = "0.0.0.0";
	desc_version = 0;

	#fail = new badFile();

	#copy_guess_name = false;

	#current_locale = null;

	constructor(shortName, path, locale, isFolder = false) {
		this.shortName = shortName;
		this.#isFolder = isFolder;
		this.#current_locale = locale;

		if ( path === false ) {
			this.#fileExists = false;
			this.#fail.name_failed = false;
			this.#testOK = true;
		} else {
			this.fullPath = path;
		}

		this.isNameOK = this.#testName();

		if ( ! this.isNameOK && ! this.#fail.first_digit && ! this.#fail.garbage_file ) {
			this.#copy_guess_name = this.#getCopyName();
		}

		if ( this.isNameOK && this.#fileExists && !this.#fail.garbage_file ) {
			if ( !this.#isFolder && !this.#fail.garbage_file ) {
				this.#testOK = this.#testZip();
				/* TODO: Load zip icon here */
			} else {
				this.#testOK = this.#testFolder();
				/* TODO: load folder icon here*/
			}
		}	
	}

	get didTestingPass() { return this.#fail.isGood; }
	get didTestingFail() { return this.#fail.isBad; }
	get failedTestList() { return this.#fail.whereFailed; }

	get filename() { return path.basename(this.fullPath); }

	get isFolder()      { return this.#isFolder; }
	set isFolder(value) { this.#isFolder = this.#realBool(value); }
	
	get isFile()      { return !this.#isFolder; }
	set isFile(value) { this.#isFolder = !this.#realBool(value); }
	
	get isFileAndFolder()      { return this.#isBothFolderAndZip; }
	set isFileAndFolder(value) { this.#isBothFolderAndZip = this.#realBool(value); }
	
	get isNameOK()       { return !this.#fail.name_failed; }
	set isNameOK(value)  { this.#fail.name_failed = this.#realBool(!value); }

	get isNameBad()      { return this.#fail.name_failed; }
	set isNameBad(value) { this.#fail.name_failed = this.#realBool(value); }

	get errorMessage()  { return this.#fail.diagnoseMessage; }

	get isTestOK()      { return this.#testOK; }
	set isTestOK(value) { this.#testOK = this.#realBool(value); }

	get isTestBad()      { return !this.#testOK; }
	set isTestBad(value) { this.#testOK = !this.#realBool(value); }
	
	get isMissing()      { return !this.#fileExists; }
	set isMissing(value) { this.#fileExists = !this.#realBool(value); }

	get isNotMissing()      { return this.#fileExists; }
	set isNotMissing(value) { this.#fileExists = this.#realBool(value); }
	
	get fileSize()      { return this.#fileSize; }
	set fileSize(value) { this.#fileSize = value; }

	get hasStoreItems()   { return (( this.#storeItems > 0 ) ? true : false ); }
	get hasNoStoreItems() { return (( this.#storeItems > 0 ) ? false : true ); }
	get countStoreItems() { return this.#storeItems; }

	get hasScripts()   { return (( this.#scriptFiles > 0 ) ? true : false ); }
	get hasNoScripts() { return (( this.#scriptFiles > 0 ) ? false : true ); }
	get countScripts() { return this.#scriptFiles; }

	get fileSizeString() {
		if ( this.#fileSize < 1024 ) {
			return "0 KB";
		} else {
			return ( this.#fileSize / 1024 ).toLocaleString( undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 } ) + " KB";
		}
	}

	get copyName() { return this.#copy_guess_name; }

	get md5Sum() {
		if ( !this.#isFolder && !this.#fail.garbage_file ) {
			return md5File.sync(this.fullPath);
		}
		return null;
	}

	set activeGame(value) { this.#activeGames.add(parseInt(value)); }
	get activeGame() { 
		var retArr = [( this.#activeGames.size == 0 )];
		
		for ( var idx = 1; idx < 21; idx++) {
			retArr.push(this.#activeGames.has(idx));
		}
		return retArr;
	}
	get activeGames() { return Array.from(this.#activeGames).sort().join(", "); }
	
	set usedGame(value) { this.#usedGames.add(parseInt(value)); }
	get usedGame() { 

		if ( this.#storeItems == 0 && this.#usedGames.size == 0 ) {
			return this.activeGame;
		}

		var retArr = [( this.#usedGames.size == 0 )];
		
		for ( var idx = 1; idx < 21; idx++) {
			retArr.push(this.#usedGames.has(idx));
		}
		return retArr;
	}
	get usedGames() { 

		if ( this.#storeItems == 0 && this.#usedGames.size == 0 ) {
			return this.activeGames;
		}
		
		return Array.from(this.#usedGames).sort().join(", ");
	}

	#loadDescTitle() { 
		var tempTitle = this.#getLocalString("title");
		if ( tempTitle !== null ) {
			this.title = tempTitle;
		}
	}

	get descDescription() { return this.#getLocalString("description"); }

	get icon() {
		if ( this.#iconRelFile === false || this.#iconImageFail === true ) { 
			return null;
		} else {
			/* Check to see if we can load */
			if ( this.#iconImage === false ) {
				if ( this.#isFolder ) {
					this.#iconImageFail = this.#loadFolderIcon();
				} else {
					this.#iconImageFail = this.#loadZipIcon();
				}

				/* Double check after attempt */
				if ( this.#iconImageFail === true ) {
					return null;
				} else {
					return this.#iconImage;
				}
			} else {
				return this.#iconImage;
			}
		}
	}

	UsedIsActive() { this.#usedGames = new Set([...this.#activeGames, ...this.#usedGames])}

	#realBool(input) {
		if ( input === true || input === false ) { return input; }
		return ( input ) ? true : false;
	}

	#getCopyName() {
		var winCopy = this.shortName.match(/^([a-zA-Z][a-zA-Z0-9_]+) - .+$/);
		var dlCopy  = this.shortName.match(/^([a-zA-Z][a-zA-Z0-9_]+) \(.+$/);

		if ( winCopy !== null ) {
			this.#fail.probable_copy = true;
			return winCopy[1];
		}
		if ( dlCopy !== null ) {
			this.#fail.probable_copy = true;
			return dlCopy[1];
		}

		return "";

	}

	#testName() {
		if ( ! this.#isFolder && ! this.fullPath.endsWith(".zip") && this.#fileExists ) {
			if ( this.fullPath.endsWith(".rar") || this.fullPath.endsWith(".7z") ) {
				this.#fail.other_archive = true;
			} else {
				this.#fail.garbage_file = true;
			}
			return false;
		}

		if ( this.shortName.match(/unzip/i) ) {
			this.#fail.probable_zippack = true;
		}
		if ( this.shortName.match(/^[a-zA-Z][a-zA-Z0-9_]+$/) ) {
			return true;
		} else {
			if ( this.shortName.match(/^[0-9]/) ) {
				this.#fail.first_digit = true;
			}	
			return false;
		}
	}

	#testZip() {
		try {
			var zip = new AdmZip(this.fullPath);
		} catch {
			this.#fail.bad_zip = true;
			return false;
		}

		var modDescEntry = zip.getEntry("modDesc.xml");

		if ( modDescEntry === null ) {
			this.#fail.no_modDesc = true;
			return false;
		}

		this.XMLDocument = modDescEntry.getData().toString('utf8');

		var zipFileList = zip.getEntries();

		zipFileList.forEach( (arcFile) => {
			if ( arcFile.name.endsWith(".lua") ) {
				this.#scriptFiles++;
			}
		})

		return this.#testXML();
	}

	#testFolder() {
		if ( ! fs.existsSync(path.join(this.fullPath, "modDesc.xml")) ) {
			this.#fail.no_modDesc = true;
			return false;
		}

		try {
			var data = fs.readFileSync(path.join(this.fullPath, "modDesc.xml"), 'utf8');
			this.XMLDocument = data;
		} catch {
			this.#fail.bad_modDesc = true;
			return false
		}

		var fileList = glob.sync(path.join(this.fullPath, "**", "*.lua"));
		this.#scriptFiles = fileList.length;

		return this.#testXML();
	}

	#testXML() {
		var XMLOptions = {strict : true, async: false, normalizeTags: true, attrNameProcessors : [function(name) { return name.toUpperCase();} ]};
		var strictXMLParser = new xml2js.Parser(XMLOptions);
		
		/* Read modDesc.xml */
		strictXMLParser.parseString(this.XMLDocument, (err, result) => {
			if ( err !== null ) {
				/* XML Parse failed, lets try to recover */
				this.#fail.bad_modDesc = true;
				XMLOptions["strict"] = false;
				var looseXMLParser = new xml2js.Parser(XMLOptions);

				looseXMLParser.parseString(this.XMLDocument, (err, result) => {
					if ( err !== null ) {
						/* Couldn't recover */
						this.#fail.bad_modDesc_no_rec = true;
						return false;
					} else {
						this.XMLParsed = result;
					}
				});
			} else {
				this.XMLParsed = result;
			}
		});

		/* Get modDesc.xml version */
		if ( this.XMLParsed['moddesc']['$'].hasOwnProperty("DESCVERSION") ) {
			this.desc_version = parseInt(this.XMLParsed['moddesc']['$']["DESCVERSION"]);

			if ( this.desc_version < 40 ) {
				this.#fail.bad_modDesc_ver = true;
				return false;
			}
		} else {
			this.#fail.bad_modDesc_ver = true;
			return false
		}

		/* Get MOD Version */
		if ( this.XMLParsed['moddesc'].hasOwnProperty('version') ) {
			this.mod_version = this.XMLParsed['moddesc']['version'].toString();
		} else {
			this.#fail.no_modVer = true;
			return false;
		}

		/* Count storeitems */
		if ( this.XMLParsed['moddesc'].hasOwnProperty('storeitems') ) {
			this.#storeItems = this.XMLParsed['moddesc']['storeitems'].length;
		} 
		
		/* Get icon filename */
		if ( this.XMLParsed['moddesc'].hasOwnProperty('iconfilename') ) {
			this.#iconRelFile = this.XMLParsed['moddesc']['iconfilename'];
		} else {
			this.#fail.no_modIcon = true;
			return false;
		}

		this.#loadDescTitle();

		return true;
	}

	#loadZipIcon() { // TODO: load icon from zip file
		/* Return : status of load T/F */
		return true;
	}

	#loadFolderIcon() { //TODO: load icon from folder
		/* Return : status of load T/F */
		return true;
	}

	#getLocalString(key) {
		if (this.XMLParsed === false ) { return null; }
		
		if ( ! this.XMLParsed['moddesc'].hasOwnProperty(key.toLowerCase()) ) {
		 	return null;
		}
		var searchTree = this.XMLParsed['moddesc'][key.toLowerCase()][0];

		if ( searchTree.hasOwnProperty(this.#current_locale) ) {
			return searchTree[this.#current_locale][0].trim();
		}
		if ( searchTree.hasOwnProperty("en") ) {
			return searchTree["en"][0].trim();
		}
		if ( searchTree.hasOwnProperty("de") ) {
			return searchTree["de"][0].trim();
		}
		return null;
	}

};