//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Mod File Parser - Mod Storage Class
//  (collection, Mod Record, and Failure Diagnostics)

// (c) 2021 JTSage.  MIT License.

const fs           = require('fs')
const path         = require('path')
const mergeOptions = require('merge-options').bind({ignoreUndefined: true})
const glob         = require('glob')
const xml2js       = require('xml2js')
const AdmZip       = require('adm-zip')
const md5File      = require('md5-file')

const realBool = function(input) {
	return ( input === true || input === false ) ?
		input :
		( ( input ) ? true : false )
}

module.exports = class modFileSlurp {
	modFolder         = null
	gameFolder        = null
	fullList          = {}
	activeGames       = new Set()
	defaultColumns    = ["shortName" , "title"]
	#modsTesting      = []
	locale            = "en"

	constructor(gameFolder, modFolder, locale = "en") {
		this.gameFolder   = gameFolder
		this.modFolder    = modFolder
		this.locale       = locale

		if ( ! fs.existsSync(this.modFolder) ) {
			throw new Error("Unable to open mod folder")
		}
		if ( gameFolder !== false && ! fs.existsSync(this.modFolder) ) {
			throw new Error("Unable to open game saves folder")
		}
	}

	async readAll() {
		return this.readFiles().then((pass1) => { 
			this.readSaves().then((pass2) => {
				return pass2
			})
		})
	}

	contains(name) {
		return this.fullList.hasOwnProperty(name)
	}

	async search(options = {} ) {
		return Promise.allSettled(this.#modsTesting).then((args) => {
			args.forEach((arg) => { 
				if ( arg.status !== "fulfilled" ) {
					console.log("DEBUG::Promise Testing Error:", arg)
				}
			})
			return this.#search(options)
		})
	}

	#search(options = {} ) {
		const returnList = []
		const myOptions  = mergeOptions({
			terms : [],
			columns : this.defaultColumns,
			includeTerms : false,
			sortColumn : 0,
			allTerms : false,
			activeGame : 0,
			usedGame : 0
		}, options)
		

		if ( myOptions.usedGame > 0 ) { myOptions.activeGame = 0 }

		if ( myOptions.includeTerms ) { myOptions.columns.push(...myOptions.terms) }

		if ( typeof myOptions.columns !== "object" || myOptions.columns.length == 0 ) { 
			throw new Error("Column list cannot be empty")
		}

		if ( myOptions.sortColumn > (myOptions.columns.length - 1) ) {
			throw new Error("Sort column out of range")
		}
		
		for (const [key, value] of Object.entries(this.fullList)) {

			let useMe = false

			if ( myOptions.terms.length === 0 ) { 
				useMe = true
			} else {
				for (const term of myOptions.terms) {
					if ( ! (term in value) ) {
						throw new Error("Search term is invalid")
					}
					if ( value[term] ) { 
						useMe = true
					} else {
						if ( myOptions.allTerms ) {
							useMe = false
							break // Stop for loop of search terms, we need look no further.
						}
					}
				}
			}
			if ( useMe === false ) { continue } // Already not included, lets skip ahead.

			if ( myOptions.activeGame > 0 && ! value.activeGame[myOptions.activeGame] ) {
				/* Missing in search save game, continue out of for loop, skip this mod */
				continue
			}

			if ( myOptions.usedGame > 0 && ! value.usedGame[myOptions.usedGame] ) {
				/* Missing in search save game, continue out of for loop, skip this mod */
				continue
			}

			
			let arrayPart = []

			myOptions.columns.forEach((keyName) => {
				if ( ! keyName in value ) {
					arrayPart.push(null)
				} else {
					arrayPart.push(value[keyName])
				}
			})

			returnList.push(arrayPart)
		}

		returnList.sort((a,b) => {
			let x = a[myOptions.sortColumn]
			let y = b[myOptions.sortColumn]

			if ( typeof x === "string" ) {
				x = x.toUpperCase()
				y = y.toUpperCase()
			}

			if (x < y) return -1
			if (x > y) return 1
			return 0
		})

		return ( myOptions.columns.length > 1 ) ? returnList : returnList.flat()
	}
	
	getWorkingList(columns = ["shortName"]) {
		return this.search({
			columns  : columns,
			terms    : ["isNameOK", "isTestOK"],
			allTerms : true
		})
	}
	getBrokenList(columns = ["shortName"]) {
		return this.search({
			columns : columns,
			terms   : ["didTestingFail"]
		})
	}
	getMissingList(columns = ["shortName"]) {
		return this.search({
			columns : columns,
			terms   : ["isMissing"]
		})
	}


	async readFiles() {
		await new Promise(resolve => setTimeout(resolve, 50))
		let modFolderFiles = fs.readdirSync(this.modFolder, {withFileTypes: true})

		modFolderFiles.forEach((thisFile) =>{
			if ( ! thisFile.isDirectory() ) {
				let shortName = path.parse(thisFile.name).name
				this.fullList[shortName] = new modFile(
					shortName,
					path.join(this.modFolder,thisFile.name),
					this.locale,
					thisFile.isDirectory()
				)
			}
		})

		modFolderFiles.forEach((thisFile) =>{
			if ( thisFile.isDirectory() ) {
				let shortName = path.parse(thisFile.name).name
				if ( this.contains(shortName) ) {
					this.fullList[shortName].isFileAndFolder = true
				} else {
					this.fullList[shortName] = new modFile(
						shortName,
						path.join(this.modFolder,thisFile.name),
						this.locale,
						thisFile.isDirectory()
					)
				}
			}
		})
		
		this.#modsTesting.length = 0 // Clear the promise array from old runs.

		Object.keys(this.fullList).forEach((thisFile) => {
			this.#modsTesting.push(this.fullList[thisFile].test())
		})
	}

	async readSaves() {
		const XMLOptions = { strict : true, async: false, normalizeTags: true, attrNameProcessors : [function(name) { return name.toUpperCase() }] }

		const filesCareer   = glob.sync( path.join( this.gameFolder, "savegame*", "careerSavegame.xml" ) )
		const filesVehicles = glob.sync( path.join( this.gameFolder, "savegame*", "vehicles.xml" ) )
		const filesItems    = glob.sync( path.join( this.gameFolder, "savegame*", "items.xml" ) )

		/* First, careerSavegame */
		filesCareer.forEach( (thisFile) => {
			const strictXMLParser = new xml2js.Parser(XMLOptions)

			strictXMLParser.parseString(fs.readFileSync(thisFile), (err, result) => {
				if ( err === null ) {
					const savegame = thisFile.match(/savegame(\d+)/)[1]
					this.activeGames.add(parseInt(savegame))

					result["careersavegame"]["mod"].forEach( (thisMod) => {
						const thisModName = thisMod["$"]["MODNAME"]

						if ( ! thisModName.startsWith("pdlc") ) {
							if ( this.contains(thisModName) ) {
								this.fullList[thisModName].activeGame = savegame
								if ( this.fullList[thisModName].title === false ) {
									/* This can only happen if the mod used to work,
									but now it is damaged.  Record the title for better
									listing */
									this.fullList[thisModName].title = thisMod["$"]["TITLE"]
								}
							} else {
								this.fullList[thisModName] = new modFile(
									thisModName,
									false,
									this.locale
								)
								this.fullList[thisModName].activeGame = savegame
								this.fullList[thisModName].title      = thisMod["$"]["TITLE"]
							}
						}
					})
				}
			})
		})

		/* Next up, vehicles */
		filesVehicles.forEach( (thisFile) => {
			const strictXMLParser = new xml2js.Parser(XMLOptions)

			strictXMLParser.parseString(fs.readFileSync(thisFile), (err, result) => {
				if ( err === null ) {
					const savegame = thisFile.match(/savegame(\d+)/)[1]

					result["vehicles"]["vehicle"].forEach( (thisMod) => {
						const thisModName = thisMod["$"]["MODNAME"]
						
						if ( ! ( typeof thisModName === "undefined") && ! thisModName.startsWith("pdlc") ) {
							if ( this.contains(thisModName) ) {
								this.fullList[thisModName].usedGame = savegame
							}
						}
					})
				}
			})
		})

		/* Finally, items */
		filesItems.forEach( (thisFile) => {
			const strictXMLParser = new xml2js.Parser(XMLOptions)

			strictXMLParser.parseString(fs.readFileSync(thisFile), (err, result) => {
				if ( err === null ) {
					const savegame = thisFile.match(/savegame(\d+)/)[1]

					result["items"]["item"].forEach( (thisMod) => {
						const thisModName = thisMod["$"]["MODNAME"]
						
						if ( ! ( typeof thisModName === "undefined") && ! thisModName.startsWith("pdlc") ) {
							if ( this.contains(thisModName) ) {
								this.fullList[thisModName].usedGame = savegame
							}
						}
					})
				}
			})
		})
		return true
	}
}

class modFile {
	shortName = false
	fullPath  = ""

	#title              = false
	#isFolder           = false
	#testOK             = null
	#fileExists         = true

	#fileSize    = 0
	#storeItems  = 0
	#scriptFiles = 0

	#iconRelFile    = false
	#iconImageCache = false
	#iconImageFail  = false

	#activeGames = new Set()
	#usedGames   = new Set()

	XMLDocument = false
	XMLParsed   = false

	mod_version  = "0.0.0.0"
	desc_version = 0

	#fail = new badFile()

	#copy_guess_name = false

	#current_locale = null

	constructor(shortName, path, locale, isFolder = false) {
		this.shortName       = shortName
		this.#isFolder       = isFolder
		this.#current_locale = locale

		if ( path === false ) {
			this.#fileExists       = false
			this.#fail.name_failed = false
			this.#testOK           = true
		} else {
			this.fullPath = path
		}

		this.#fail.name_failed = !(this.#testName())

		if ( this.#fail.name_failed && ! this.#fail.first_digit && ! this.#fail.garbage_file ) {
			this.#copy_guess_name = this.#getCopyName()
		}
	}

	get didTestingPass()         { return this.#fail.isGood }
	get didTestingFail()         { return this.#fail.isBad }
	get didTestingFailNotFatal() { return ( ! this.#fail.isFatal && this.#fail.isBad ) }
	get didTestingFailFatal()    { return this.#fail.isFatal } // TODO: add #fail.isFatal
	get failedTestList()         { return this.#fail.diagnoseMessage }

	get filename() { return path.basename(this.fullPath) }

	get title()         { 
		const tempTitle = this.#getLocalString("title")
		return ( tempTitle === null ) ? this.#title : tempTitle
	}
	set title(value)    { this.#title = value }

	get isFolder()      { return this.#isFolder }
	set isFolder(value) { this.#isFolder = realBool(value) }
	
	get isFile()      { return !this.#isFolder }
	set isFile(value) { this.#isFolder = !realBool(value) }
	
	get isFileAndFolder()      { return this.#fail.folder_and_zip }
	set isFileAndFolder(value) { this.#fail.folder_and_zip = value }
	
	get isNameOK()       { return !this.#fail.name_failed }
	set isNameOK(value)  { this.#fail.name_failed = !value }

	get isNameBad()      { return this.#fail.name_failed }
	set isNameBad(value) { this.#fail.name_failed = value }

	get isTestOK()      { return this.#testOK }
	set isTestOK(value) { this.#testOK = realBool(value) }

	get isTestBad()      { return !this.#testOK }
	set isTestBad(value) { this.#testOK = !realBool(value) }
	
	get isMissing()      { return !this.#fileExists }
	set isMissing(value) { this.#fileExists = !realBool(value) }

	get isNotMissing()      { return this.#fileExists }
	set isNotMissing(value) { this.#fileExists = realBool(value) }
	
	get fileSize()      { return this.#fileSize }
	set fileSize(value) { this.#fileSize = value }

	get hasStoreItems()   { return (( this.#storeItems > 0 ) ? true : false ) }
	get hasNoStoreItems() { return (( this.#storeItems > 0 ) ? false : true ) }
	get countStoreItems() { return this.#storeItems }

	get hasScripts()   { return (( this.#scriptFiles > 0 ) ? true : false ) }
	get hasNoScripts() { return (( this.#scriptFiles > 0 ) ? false : true ) }
	get countScripts() { return this.#scriptFiles }

	get fileSizeString() {
		if ( this.#fileSize < 1024 ) {
			return "0 KB"
		} else {
			return ( this.#fileSize / 1024 ).toLocaleString( this.#current_locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 } ) + " KB"
		}
	}

	get copyName() { return this.#copy_guess_name }

	get md5Sum() {
		if ( !this.#isFolder && !this.#fail.garbage_file ) {
			return md5File.sync(this.fullPath)
		}
		return null
	}

	set activeGame(value) { this.#activeGames.add(parseInt(value)) }
	get activeGame() { 
		const retArr = [( this.#activeGames.size == 0 )]
		
		for ( let idx = 1; idx < 21; idx++) {
			retArr.push(this.#activeGames.has(idx))
		}
		return retArr
	}
	get activeGames() { return Array.from(this.#activeGames).sort().join(", ") }
	
	set usedGame(value) { this.#usedGames.add(parseInt(value)) }
	get usedGame() { 
		if ( this.#storeItems == 0 && this.#usedGames.size == 0 ) {
			return this.activeGame
		}

		const retArr = [( this.#usedGames.size == 0 )]
		
		for ( let idx = 1; idx < 21; idx++) {
			retArr.push(this.#usedGames.has(idx))
		}
		return retArr
	}
	get usedGames() { 
		return ( this.#storeItems == 0 && this.#usedGames.size == 0 ) ?
			this.activeGames :
			Array.from(this.#usedGames).sort().join(", ")
	}

	async test() {
		if ( !this.#fileExists || this.#fail.garbage_file ) {
			this.#testOK = false
			return new Promise( (resolve) => { resolve(false) } )
		}
		
		return ( !this.#isFolder ) ?
			this.#testZip().then((testPassed) => { this.#testOK = testPassed }) :
			this.#testFolder().then((testPassed) => { this.#testOK = testPassed })
	}

	get descDescription() { return this.#getLocalString("description") }

	get icon() {
		if ( this.#iconRelFile === false || this.#iconImageFail === true ) { 
			return null
		} else {
			/* Check to see if we can load */
			if ( this.#iconImageCache === false ) {
				if ( this.#isFolder ) {
					this.#iconImageFail = this.#loadFolderIcon()
				} else {
					this.#iconImageFail = this.#loadZipIcon()
				}

				/* Double check after attempt */
				if ( this.#iconImageFail === true ) {
					return null
				} else {
					return this.#iconImageCache
				}
			} else {
				return this.#iconImageCache
			}
		}
	}

	#getCopyName() {
		const winCopy = this.shortName.match(/^([a-zA-Z][a-zA-Z0-9_]+) - .+$/)
		const dlCopy  = this.shortName.match(/^([a-zA-Z][a-zA-Z0-9_]+) \(.+$/)

		if ( winCopy !== null ) {
			this.#fail.probable_copy = true
			return winCopy[1]
		}
		if ( dlCopy !== null ) {
			this.#fail.probable_copy = true
			return dlCopy[1]
		}

		return ""
	}

	#testName() {
		if ( ! this.#isFolder && ! this.fullPath.endsWith(".zip") && this.#fileExists ) {
			if ( this.fullPath.endsWith(".rar") || this.fullPath.endsWith(".7z") ) {
				this.#fail.other_archive = true
			} else {
				this.#fail.garbage_file = true
			}
			return false
		}

		if ( this.shortName.match(/unzip/i) ) {
			this.#fail.probable_zippack = true
		}
		if ( this.shortName.match(/^[a-zA-Z][a-zA-Z0-9_]+$/) ) {
			return true
		} else {
			if ( this.shortName.match(/^[0-9]/) ) {
				this.#fail.first_digit = true
			}	
			return false
		}
	}

	async #testZip() {
		try {
			var zip = new AdmZip(this.fullPath)
		} catch {
			this.#fail.bad_zip = true
			return false
		}

		const modDescEntry = zip.getEntry("modDesc.xml")

		if ( modDescEntry === null ) {
			this.#fail.no_modDesc = true
			return false
		}

		this.XMLDocument = modDescEntry.getData().toString('utf8')

		const zipFileList = zip.getEntries()

		zipFileList.forEach( (arcFile) => {
			if ( arcFile.name.endsWith(".lua") ) {
				this.#scriptFiles++
			}
		})

		return await this.#testXML()
	}

	async #testFolder() {
		if ( ! fs.existsSync(path.join(this.fullPath, "modDesc.xml")) ) {
			this.#fail.no_modDesc = true
			return false
		}

		try {
			const data = fs.readFileSync(path.join(this.fullPath, "modDesc.xml"), 'utf8')
			this.XMLDocument = data
		} catch {
			this.#fail.bad_modDesc = true
			return false
		}

		const fileList = glob.sync(path.join(this.fullPath, "**", "*.lua"))
		this.#scriptFiles = fileList.length

		return await this.#testXML()
	}

	async #testXML() {
		const XMLOptions = {strict : true, async: false, normalizeTags: true, attrNameProcessors : [function(name) { return name.toUpperCase() }] }
		const strictXMLParser = new xml2js.Parser(XMLOptions)
		
		/* Read modDesc.xml */
		strictXMLParser.parseString(this.XMLDocument, (err, result) => {
			if ( err !== null ) {
				/* XML Parse failed, lets try to recover */
				this.#fail.bad_modDesc = true
				XMLOptions["strict"] = false
				var looseXMLParser = new xml2js.Parser(XMLOptions)

				looseXMLParser.parseString(this.XMLDocument, (err, result) => {
					if ( err !== null ) {
						/* Couldn't recover */
						this.#fail.bad_modDesc_no_rec = true
						return false
					} else {
						this.XMLParsed = result
					}
				})
			} else {
				this.XMLParsed = result
			}
		})

		/* Get modDesc.xml version */
		if ( this.XMLParsed['moddesc']['$'].hasOwnProperty("DESCVERSION") ) {
			this.desc_version = parseInt(this.XMLParsed['moddesc']['$']["DESCVERSION"])

			if ( this.desc_version < 40 ) {
				this.#fail.bad_modDesc_ver = true
				return false
			}
		} else {
			this.#fail.bad_modDesc_ver = true
			return false
		}

		/* Get MOD Version */
		if ( this.XMLParsed['moddesc'].hasOwnProperty('version') ) {
			this.mod_version = this.XMLParsed['moddesc']['version'].toString()
		} else {
			this.#fail.no_modVer = true
			return false
		}

		/* Count storeitems */
		if ( this.XMLParsed['moddesc'].hasOwnProperty('storeitems') ) {
			this.#storeItems = this.XMLParsed['moddesc']['storeitems'].length
		} 
		
		/* Get icon filename */
		if ( this.XMLParsed['moddesc'].hasOwnProperty('iconfilename') ) {
			this.#iconRelFile = this.XMLParsed['moddesc']['iconfilename'].toString()
		} else {
			this.#fail.no_modIcon = true
			return false
		}

		return true
	}

	#loadZipIcon() { // TODO: load icon from zip file
		/* Return : status of load T/F */
		return false
	}

	#loadFolderIcon() { //TODO: load icon from folder
		/* Return : status of load T/F */
		return false
	}

	#getLocalString(key) {
		if (this.XMLParsed === false ) {
			return null
		}
		
		if ( ! this.XMLParsed['moddesc'].hasOwnProperty(key.toLowerCase()) ) {
		 	return null
		}
		var searchTree = this.XMLParsed['moddesc'][key.toLowerCase()][0]

		if ( searchTree.hasOwnProperty(this.#current_locale()) ) {
			return searchTree[this.#current_locale()][0].trim()
		}
		if ( searchTree.hasOwnProperty("en") ) {
			return searchTree["en"][0].trim()
		}
		if ( searchTree.hasOwnProperty("de") ) {
			return searchTree["de"][0].trim()
		}
		return null
	}

}

class badFile {
	failFlags = {
		first_digit        : false,
		probable_copy      : false,
		probable_zippack   : false,
		other_archive      : false,
		name_failed        : false,
		garbage_file       : false,
		bad_zip            : false,
		no_modDesc         : false,
		bad_modDesc        : false,
		bad_modDesc_no_rec : false,
		bad_modDesc_ver    : false,
		no_modVer          : false,
		no_modIcon         : false,
		folder_and_zip     : false,
	}
	#failMessages = {
		first_digit        : "FILE_ERROR_NAME_STARTS_DIGIT",
		probable_copy      : "FILE_ERROR_LIKELY_COPY",
		probable_zippack   : "FILE_ERROR_LIKELY_ZIP_PACK",
		other_archive      : "FILE_ERROR_UNSUPPORTED_ARCHIVE",
		name_failed        : "FILE_ERROR_NAME_INVALID",
		garbage_file       : "FILE_ERROR_GARBAGE_FILE",
		bad_zip            : "FILE_ERROR_UNREADABLE_ZIP",
		no_modDesc         : "NOT_MOD_MODDESC_MISSING",
		bad_modDesc        : "MOD_ERROR_MODDESC_DAMAGED_RECOVERABLE",
		bad_modDesc_no_rec : "NOT_MOD_MODDESC_PARSE_ERROR",
		bad_modDesc_ver    : "NOT_MOD_MODDESC_VERSION_OLD_OR_MISSING",
		no_modVer          : "MOD_ERROR_NO_MOD_VERSION",
		no_modIcon         : "MOD_ERROR_NO_MOD_ICON",
		folder_and_zip     : "CONFLICT_ERROR_FOLDER_AND_FILE",
	}

	#fatalFlags = [
		"name_failed",
		"bad_zip",
		"no_modDesc",
		"bad_modDesc_no_rec",
		"bad_modDesc_ver",
		"no_modVer",
		"no_modIcon"
	]

	get first_digit()      { return this.failFlags["first_digit"] }
	set first_digit(value) { this.failFlags["first_digit"] = realBool(value) }

	get probable_copy()      { return this.failFlags["probable_copy"] }
	set probable_copy(value) { this.failFlags["probable_copy"] = realBool(value) }

	get probable_zippack()      { return this.failFlags["probable_zippack"] }
	set probable_zippack(value) { this.failFlags["probable_zippack"] = realBool(value) }

	get other_archive()      { return this.failFlags["other_archive"] }
	set other_archive(value) { this.failFlags["other_archive"] = realBool(value) }

	get name_failed()      { return this.failFlags["name_failed"] }
	set name_failed(value) { this.failFlags["name_failed"] = realBool(value) }

	get garbage_file()      { return this.failFlags["garbage_file"] }
	set garbage_file(value) { this.failFlags["garbage_file"] = realBool(value) }

	get bad_zip()      { return this.failFlags["bad_zip"] }
	set bad_zip(value) { this.failFlags["bad_zip"] = realBool(value) }

	get no_modDesc()      { return this.failFlags["no_modDesc"] }
	set no_modDesc(value) { this.failFlags["no_modDesc"] = realBool(value) }

	get bad_modDesc()      { return this.failFlags["bad_modDesc"] }
	set bad_modDesc(value) { this.failFlags["bad_modDesc"] = realBool(value) }

	get bad_modDesc_rec()      { return this.failFlags["bad_modDesc_rec"] }
	set bad_modDesc_rec(value) { this.failFlags["bad_modDesc_rec"] = realBool(value) }

	get bad_modDesc_ver()      { return this.failFlags["bad_modDesc_ver"] }
	set bad_modDesc_ver(value) { this.failFlags["bad_modDesc_ver"] = realBool(value) }

	get no_modVer()      { return this.failFlags["no_modVer"] }
	set no_modVer(value) { this.failFlags["no_modVer"] = realBool(value) }

	get no_modIcon()      { return this.failFlags["no_modIcon"] }
	set no_modIcon(value) { this.failFlags["no_modIcon"] = realBool(value) }

	get folder_and_zip()      { return this.failFlags["folder_and_zip"] }
	set folder_and_zip(value) { this.failFlags["folder_and_zip"] = realBool(value) }

	get isFatal() {
		this.#fatalFlags.forEach((fatalFlag) => {
			if ( this.failFlags[fatalFlag] ) {
				return true
			}
		})
		return false
	}

	get isBad() {
		for (const [key, value] of Object.entries(this.failFlags)) {
			if ( value === true ){
				return true
			}
		}
		return false
	}

	get isGood() {
		for (const [key, value] of Object.entries(this.failFlags)) {
			if ( value === true ){
				return false
			}
		}
		return true
	}

	get diagnoseMessage() {
		const errorMessages = []
		for (const [key, value] of Object.entries(this.failFlags)) {
			if ( value === true ){
				errorMessages.push(this.#failMessages[key])
			}
		}
		return errorMessages
	}
}