//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Mod File Parser - Mod Storage Class (collection)

// (c) 2021 JTSage.  MIT License.
const fs           = require('fs');
const path         = require('path');
const mergeOptions = require('merge-options').bind({ignoreUndefined: true});
const glob         = require('glob');
const xml2js       = require('xml2js');
const modFile      = require('./file-record.js');

module.exports = class modFileSlurp {
	modFolder   = null;
	gameFolder  = null;
	fullList    = {};
	activeGames = new Set();
	defaultColumns = ["shortName" , "title"];

	constructor(gameFolder, modFolder, eventEmitter = false, locale = "en") {
		this.gameFolder = gameFolder;
		this.modFolder  = modFolder;
		this.eventEmitter = eventEmitter;
		this.locale     = locale;

		if ( ! fs.existsSync(this.modFolder) ) {
			throw new Error("Unable to open mod folder");
		}
		if ( gameFolder !== false && ! fs.existsSync(this.modFolder) ) {
			throw new Error("Unable to open game saves folder");
		}

		this.statusUpdate(10);
		this.readFiles();

		if ( gameFolder !== false ) {
			this.readSaves();
		}
	}

	statusUpdate(newStatus) {
		if ( this.eventEmitter !== false ) {
			this.eventEmitter(newStatus);
		}
	}

	set(name, key, value) {
		this.fullList[name][key] = value;
	}
	
	add(name, classValue) {
		this.fullList[name] =  classValue;
	}

	contains(name) {
		return this.fullList.hasOwnProperty(name);
	}

	get(name, key = false) {
		if ( key !== false ) {
			return this.fullList[name][key];
		} else {
			return this.fullList[name];
		}
	}

	search(options = {} ) {
		var myOptions = mergeOptions({
			terms : [],
			columns : this.defaultColumns,
			includeTerms : false,
			sortColumn : 0,
			allTerms : false,
			activeGame : 0,
			usedGame : 0
		}, options);
		

		if ( myOptions.usedGame > 0 ) { myOptions.activeGame = 0; }

		if ( myOptions.includeTerms ) { myOptions.columns.push(...myOptions.terms); }

		if ( typeof myOptions.columns !== "object" || myOptions.columns.length == 0 ) { 
			throw new Error("Column list cannot be empty");
		}

		if ( myOptions.sortColumn > (myOptions.columns.length - 1) ) {
			throw new Error("Sort column out of range");
		}

		var returnList = [];

		for (const [key, value] of Object.entries(this.fullList)) {

			var useMe = false;

			if ( myOptions.terms.length < 1 ) { 
				useMe = true;
			} else {
				myOptions.terms.forEach((term) => {
					if ( ! (term in value) ) {
						throw new Error("Search term is invalid");
					}
					if ( value[term] ) { 
						useMe = true;
					} else {
						if ( myOptions.allTerms ) {
							useMe = false;
						}
					}
				});
			}

			if ( myOptions.activeGame > 0 ) {
				if ( ! value.activeGame[myOptions.activeGame] ) {
					useMe = false;
				}
			}

			if ( myOptions.usedGame > 0 ) {
				if ( ! value.usedGame[myOptions.usedGame] ) {
					useMe = false;
				}
			}

			if ( useMe === true ) {
				var arrayPart = [];

				myOptions.columns.forEach((keyName) => {
					if ( ! keyName in value ) {
						arrayPart.push(null);
					} else {
						arrayPart.push(value[keyName]);
					}
				});

				returnList.push(arrayPart);
			}
		}
		returnList.sort((a,b) => {
			var x = a[myOptions.sortColumn],
				y = b[myOptions.sortColumn];

			if ( typeof x === "string" ) {
				x = x.toUpperCase();
				y = y.toUpperCase();
			}

			if (x < y) return -1;
			if (x > y) return 1;
			return 0;
		});

		if ( myOptions.columns.length > 1 ) {
			return returnList;
		} else {
			return returnList.flat();
		}
	}
	
	get WorkingList() {
		return this.search({
			columns: ["shortName"],
			terms : ["isNameOK", "isTestOK"],
			allTerms : true
		});
	}
	get BrokenList() {
		return this.search({
			columns: ["shortName"],
			terms : ["didTestingFail"]
		});
	}
	get MissingList() {
		return this.search({
			columns: ["shortName"],
			terms : ["isMissing"]
		});
	}


	readFiles() {
		var folderPercentage = [50,70];
		var filePercentage = [10,50];

		var modFolderFiles = fs.readdirSync(this.modFolder);

		var currentFile = 1;
		modFolderFiles.forEach((thisFile) =>{
			currentFile++;
			if ( ! fs.lstatSync(path.join(this.modFolder,thisFile)).isDirectory() ) {
				var myShortName = path.parse(thisFile).name;
				this.add(myShortName, new modFile(myShortName, path.join(this.modFolder,thisFile), this.locale));
				this.statusUpdate(filePercentage[0] + Math.floor((filePercentage[1] - filePercentage[0]) * (currentFile / (modFolderFiles.length+1))));
			}
		});

		currentFile = 1;
		modFolderFiles.forEach((thisFile) =>{
			currentFile++;
			if ( fs.lstatSync(path.join(this.modFolder,thisFile)).isDirectory() ) {
				var myShortName = path.parse(thisFile).name;
				if ( this.contains(myShortName) ) {
					this.fullList[myShortName].isFileAndFolder = true;
				} else {
					this.add(myShortName, new modFile(myShortName, path.join(this.modFolder,thisFile), this.locale, true));
				}
				this.statusUpdate(folderPercentage[0] + Math.floor((folderPercentage[1] - folderPercentage[0]) * (currentFile / (modFolderFiles.length+1))));
			}
		});
	}

	readSaves() {
		this.statusUpdate(70);
		var XMLOptions = {strict : true, async: false, normalizeTags: true, attrNameProcessors : [function(name) { return name.toUpperCase();} ]};

		var filesCareer   = glob.sync(path.join(this.gameFolder, "savegame*", "careerSavegame.xml"));
		var filesVehicles = glob.sync(path.join(this.gameFolder, "savegame*", "vehicles.xml"));
		var filesItems    = glob.sync(path.join(this.gameFolder, "savegame*", "items.xml"));

		/* First, careerSavegame */
		filesCareer.forEach( (thisFile) => {
			var strictXMLParser = new xml2js.Parser(XMLOptions);

			strictXMLParser.parseString(fs.readFileSync(thisFile), (err, result) => {
				if ( err === null ) {
					var savegame = thisFile.match(/savegame(\d+)/)[1];
					this.activeGames.add(parseInt(savegame));

					result["careersavegame"]["mod"].forEach( (thisMod) => {
						var thisModName = thisMod["$"]["MODNAME"];

						if ( ! thisModName.startsWith("pdlc") ) {
							if ( this.contains(thisModName) ) {
								this.set(thisModName, "activeGame", savegame);
								if ( this.get(thisModName, "title") === false ) {
									// This should honestly never happen //
									this.set(thisModName, "title", thisMod["$"]["TITLE"]);
								}
							} else {
								this.add(thisModName, new modFile(thisModName, false, this.locale));
								this.set(thisModName, "activeGame", savegame);
								this.set(thisModName, "title", thisMod["$"]["TITLE"]);
							}
						}
					});
				}
			});
		})

		/* Next up, vehicles */
		this.statusUpdate(80);
		filesVehicles.forEach( (thisFile) => {
			var strictXMLParser = new xml2js.Parser(XMLOptions);

			strictXMLParser.parseString(fs.readFileSync(thisFile), (err, result) => {
				if ( err === null ) {
					var savegame = thisFile.match(/savegame(\d+)/)[1];

					result["vehicles"]["vehicle"].forEach( (thisMod) => {
						var thisModName = thisMod["$"]["MODNAME"];
						
						if ( ! ( typeof thisModName === "undefined") && ! thisModName.startsWith("pdlc") ) {
							if ( this.contains(thisModName) ) {
							 	this.set(thisModName, "usedGame", savegame);
							}
						}
					});
				}
			});
		});

		/* Finally, items */
		this.statusUpdate(90);
		filesItems.forEach( (thisFile) => {
			var strictXMLParser = new xml2js.Parser(XMLOptions);

			strictXMLParser.parseString(fs.readFileSync(thisFile), (err, result) => {
				if ( err === null ) {
					var savegame = thisFile.match(/savegame(\d+)/)[1];

					result["items"]["item"].forEach( (thisMod) => {
						var thisModName = thisMod["$"]["MODNAME"];
						
						if ( ! ( typeof thisModName === "undefined") && ! thisModName.startsWith("pdlc") ) {
							if ( this.contains(thisModName) ) {
							 	this.set(thisModName, "usedGame", savegame);
							}
						}
					});
				}
			});
		});
		this.statusUpdate(100);
	}
}