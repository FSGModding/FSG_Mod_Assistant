//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Mod File Parser - Mod Storage Class
//  (collection, Mod Record, and Failure Diagnostics)

// (c) 2021 JTSage.  MIT License.

const fs             = require('fs')
const path           = require('path')
const glob           = require('glob')
const xml2js         = require('xml2js')
const StreamZip      = require('node-stream-zip')
const decodeDXT      = require('decode-dxt')
const parseDDS       = require('parse-dds')

const conflictListData = require('./mod-checker-conflicts')

const realBool = function(input) {
	return (typeof input === 'boolean') ? input : Boolean(input)
}

/* False "isUsed" negatives.  They are really script mods, but have some optional storeItems */
const falseIsUsedNegatives = [
	'FS19_buyableLargeStackBales',
	'FS19_RM_Seasons',
	'FS19_GlobalCompany',
	'FS19_precisionFarming',
]

module.exports = class modFileSlurp {
	modFolder         = null
	gameFolder        = null
	fullList          = {}
	activeGames       = new Set()
	defaultColumns    = ['shortName', 'title']
	#modsTesting      = [] // Promise array for testing
	locale            = () => { return 'en' }
	log               = null
	errorToException  = false // For search error, dump an exception

	constructor(gameFolder, modFolder, log = null, locale = null) {
		this.gameFolder     = gameFolder
		this.modFolder      = modFolder
		this.log            = log

		if ( typeof locale === 'function') { this.locale = locale }

		if ( this.log === null ) {
			throw new Error('Logging is non-functional, cannot continue')
		}
		if ( ! fs.existsSync(this.modFolder) ) {
			this.log.fatal('collection', 'Unable to open mod folder (exists check)')
			throw new Error('Unable to open mod folder')
		}
		if ( gameFolder !== false && ! fs.existsSync(this.gameFolder) ) {
			this.log.fatal('collection', 'Unable to open saves folder (exists check)')
			throw new Error('Unable to open game saves folder')
		}
		
	}

	async readAll() {
		return this.readFiles().then(() => {
			this.log.notice('collection', 'Finished read mods on disk (test pending)')
			return this.readSaves().then((pass2) => {
				this.log.notice('collection', 'Finished read save games')
				return pass2
			})
		}).catch((unknownError) => {
			// Shouldn't happen.  No idea
			this.log.notice('collection', `Uncaught Error" : ${unknownError}`)
		})
	}

	contains(name) {
		return Object.prototype.hasOwnProperty.call(this.fullList, name)
	}

	#safeL10n(tree) {
		if ( Object.prototype.hasOwnProperty.call(tree, this.locale()) ) {
			return tree[this.locale()]
		}
		return tree.en
	}

	async conflictList(folderFileText) {
		return Promise.allSettled(this.#modsTesting).then(() => {
			const returnArray = []
			const checkList = Object.keys(this.fullList)

			for (const [_key, modRecord] of Object.entries(this.fullList)) {
				if ( modRecord.isFileAndFolder ) {
					returnArray.push([
						modRecord.shortName,
						modRecord.title,
						folderFileText,
						modRecord.fullPath
					])
				}
			}
			
			for ( const [modName, conflictDetails] of Object.entries(conflictListData.conflictMods)) {
				if ( checkList.includes(modName) ) {
					let doesConflict = false
					if ( conflictDetails.confWith === null ) {
						doesConflict = true
					} else {
						for ( const confWithName of conflictDetails.confWith ) {
							if ( checkList.includes(confWithName) ) {
								doesConflict = true
								break
							}
						}
					}
					if ( doesConflict ) {
						returnArray.push([
							this.fullList[modName].shortName,
							this.fullList[modName].title,
							this.#safeL10n(conflictDetails.message),
							this.fullList[modName].fullPath,
						])
					}
				}
			}
			returnArray.sort((a, b) => {
				const x = a[0].toUpperCase()
				const y = b[0].toUpperCase()
	
				if (x < y) return -1
				if (x > y) return 1
				return 0
			})

			return returnArray
		})
	}

	get testPromise() {
		return this.#modsTesting
	}

	async safeResend() {
		this.log.notice('collection', 'Got window reload request')
		return Promise.allSettled(this.#modsTesting).then(() => {
			this.log.notice('collection', 'Accepted window reload request')
			return true
		})
	}

	async search(options = {} ) {
		return Promise.allSettled(this.#modsTesting).then((args) => {
			args.forEach((arg) => {
				if ( arg.status !== 'fulfilled' ) {
					this.log.fileError('collection', `Promise failed: ${arg}`)
				}
			})
			return this.#search(options)
		})
	}

	async getActive() {
		return Promise.allSettled(this.#modsTesting).then(() => {
			return Array.from(this.activeGames).sort((a, b) => a - b)
		})
	}
	get activeArray() {
		return Array.from(this.activeGames).sort((a, b) => a - b)
	}

	#search(options = {} ) {
		const returnList = []
		const defaultOptions  = {
			terms          : [],
			columns        : this.defaultColumns,
			overrideIgnore : false,
			includeTerms   : false,
			sortColumn     : 0,
			allTerms       : false,
			activeGame     : 0,
			usedGame       : 0,
			debug          : false,
		}
		const myOptions = { ...defaultOptions, ...options }
		

		if ( myOptions.usedGame !== 0 ) { myOptions.activeGame = 0 }

		const gameFilter = ( myOptions.usedGame > myOptions.activeGame ) ? myOptions.usedGame : myOptions.activeGame

		if ( myOptions.includeTerms ) { myOptions.columns.push(...myOptions.terms) }

		if ( typeof myOptions.columns !== 'object' || myOptions.columns.length === 0 ) {
			this.log.notice('collection-search', 'Column list cannot be empty')
			if ( this.errorToException ) {
				throw new Error('Column list cannot be empty')
			}
			return returnList
		}

		if ( myOptions.sortColumn > (myOptions.columns.length - 1) ) {
			this.log.notice('collection-search', 'Sort column out of range')
			if ( this.errorToException ) {
				throw new Error('Sort column out of range')
			}
			return returnList
		}

		if ( myOptions.debug ) {
			this.log.info('collection-search', `Options passed: ${myOptions.toString()}`)
		}
		
		for (const [_key, value] of Object.entries(this.fullList)) {

			let useMe = false

			if ( myOptions.terms.length === 0 ) {
				useMe = true
			} else if ( myOptions.overrideIgnore === false && value.ignoreMe ) {
				/* Mod ignored (on re-display probably) because it moved or changed */
				continue
			} else {
				for (const term of myOptions.terms) {
					if ( ! (term in value) ) {
						this.log.notice('collection-search', 'Search term is invalid')
						if ( this.errorToException ) {
							throw new Error('Search term is invalid')
						}
						return returnList
					}
					if ( value[term] ) {
						useMe = true
					} else if ( myOptions.allTerms ) {
						useMe = false
						break // Stop for loop of search terms, we need look no further.
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

			if ( myOptions.activeGame === -1 && value.activeGame[0] ) {
				/* Special case, we want the INACTIVE AND UNUSED*/
				/* Check is active is no, used can't be yes */
				continue
			}

			if ( myOptions.usedGame === -1 && ( !value.activeGame[0] || value.usedGames[0] ) ) {
				/* Special case, we want the UNUSED AND ACTIVE mods */
				/* Active must be yes, used must be no */
				continue
			}

			
			const arrayPart = []

			myOptions.columns.forEach((keyName) => {
				if ( keyName === 'isActive' ) {
					arrayPart.push(value.activeGame[gameFilter])
				} else if ( keyName === 'isUsed' ) {
					arrayPart.push(value.usedGame[gameFilter])
				} else {
					arrayPart.push((keyName in value) ? value[keyName] : null)
				}
			})

			returnList.push(arrayPart)
		}

		returnList.sort((a, b) => {
			let x = a[myOptions.sortColumn]
			let y = b[myOptions.sortColumn]

			if ( typeof x === 'string' ) {
				x = x.toUpperCase()
				y = y.toUpperCase()
			}

			if (x < y) return -1
			if (x > y) return 1
			return 0
		})

		return ( myOptions.columns.length > 1 ) ? returnList : returnList.flat()
	}
	
	getBrokenList(columns = ['shortName']) {
		return this.search({
			columns : columns,
			terms   : ['didTestingFail'],
		})
	}
	getMissingList(columns = ['shortName']) {
		return this.search({
			columns : columns,
			terms   : ['isMissing'],
		})
	}


	async readFiles() {
		const modFolderFiles = fs.readdirSync(this.modFolder, {withFileTypes : true})

		modFolderFiles.forEach((thisFile) =>{
			if ( ! thisFile.isDirectory() ) {
				try {
					const shortName = path.parse(thisFile.name).name
					this.fullList[shortName] = new modFile(
						this,
						shortName,
						path.join(this.modFolder, thisFile.name),
						this.locale,
						thisFile.isDirectory()
					)
					this.fullList[shortName].fileSize = fs.statSync(path.join(this.modFolder, thisFile.name)).size
				} catch (addError) {
					this.log.fileError('fileReader', `Add Error" : ${addError}`)
				}
			}
		})

		modFolderFiles.forEach((thisFile) =>{
			if ( thisFile.isDirectory() ) {
				try {
					const shortName = path.parse(thisFile.name).name
					if ( this.contains(shortName) ) {
						this.fullList[shortName].isFileAndFolder = true
					} else {
						this.fullList[shortName] = new modFile(
							this,
							shortName,
							path.join(this.modFolder, thisFile.name),
							this.locale,
							thisFile.isDirectory()
						)
					}
					let bytes = 0
					// BUG: with a *lot* of folders, this is going to be a pretty big performance hit.
					glob.sync(path.join(this.modFolder, thisFile.name, '**')).forEach((file) => {
						try {
							const stats = fs.statSync(file)
							if ( ! stats.isDirectory() ) { bytes += stats.size }
						} catch {
							// Do Nothing if we can't read it.
						}
					})
					this.fullList[shortName].fileSize = bytes
				} catch (addError) {
					this.log.fileError('fileReader', `Add Error" : ${addError}`)
				}
			}
		})
		
		this.#modsTesting.length = 0 // Clear the promise array from old runs.

		for ( const thisFile of Object.keys(this.fullList) ) {
			this.#modsTesting.push(this.fullList[thisFile].test())
		}
	}

	async readSaves() {
		const XMLOptions = { strict : true, async : false, normalizeTags : true, attrNameProcessors : [function(name) { return name.toUpperCase() }] }

		let filesCareer   = []
		let filesVehicles = []
		let filesItems    = []
		
		try {
			filesCareer   = glob.sync( path.join( this.gameFolder, 'savegame*', 'careerSavegame.xml' ) )
			filesVehicles = glob.sync( path.join( this.gameFolder, 'savegame*', 'vehicles.xml' ) )
			filesItems    = glob.sync( path.join( this.gameFolder, 'savegame*', 'items.xml' ) )
		} catch (err) {
			this.log.fileError('saveReader', `Failed to glob save games: ${err}`)
		}

		/* First, careerSavegame */
		filesCareer.forEach( (thisFile) => {
			const strictXMLParser = new xml2js.Parser(XMLOptions)

			let fileContents = null

			try {
				fileContents = fs.readFileSync(thisFile)
			} catch (err) {
				this.log.fileError('saveReader', `Could not open ${thisFile} : ${err}`)
			}

			strictXMLParser.parseString(fileContents, (err, result) => {
				if ( err === null ) {
					const savegame = parseInt(thisFile.match(/savegame(\d+)/)[1])
					this.activeGames.add(savegame)

					// TODO: start here - need to check nested xml.
					
					result.careersavegame.mod.forEach( (thisMod) => {
						const thisModName = thisMod.$.MODNAME

						if ( ! thisModName.startsWith('pdlc') ) {
							if ( this.contains(thisModName) ) {
								this.fullList[thisModName].activeGame = savegame
								if ( this.fullList[thisModName].title === false ) {
									/* This can only happen if the mod used to work,
									but now it is damaged.  Record the title for better
									listing */
									this.fullList[thisModName].title = thisMod.$.TITLE
								}
							} else {
								this.fullList[thisModName] = new modFile(
									this,
									thisModName,
									false,
									this.locale
								)
								this.fullList[thisModName].activeGame = savegame
								this.fullList[thisModName].title      = thisMod.$.TITLE
							}
						}
					})
				} else {
					this.log.notice('collection', `Could not parse save file ${thisFile}`)
				}
			})
		})

		/* Next up, vehicles */
		filesVehicles.forEach( (thisFile) => {
			const strictXMLParser = new xml2js.Parser(XMLOptions)

			let fileContents = null

			try {
				fileContents = fs.readFileSync(thisFile)
			} catch (err) {
				this.log.fileError('saveReader', `Could not open ${thisFile} : ${err}`)
			}

			strictXMLParser.parseString(fileContents, (err, result) => {
				if ( err === null ) {
					const savegame = parseInt(thisFile.match(/savegame(\d+)/)[1])

					result.vehicles.vehicle.forEach( (thisMod) => {
						const thisModName = thisMod.$.MODNAME
						
						if ( ! ( typeof thisModName === 'undefined') && ! thisModName.startsWith('pdlc') ) {
							if ( this.contains(thisModName) ) {
								this.fullList[thisModName].usedGame = savegame
							}
						}
					})
				} else {
					this.log.notice('collection', `Could not parse save file ${thisFile}`)
				}
			})
		})

		/* Finally, items */
		filesItems.forEach( (thisFile) => {
			const strictXMLParser = new xml2js.Parser(XMLOptions)

			let fileContents = null

			try {
				fileContents = fs.readFileSync(thisFile)
			} catch (err) {
				this.log.fileError('saveReader', `Could not open ${thisFile} : ${err}`)
			}

			strictXMLParser.parseString(fileContents, (err, result) => {
				if ( err === null ) {
					const savegame = parseInt(thisFile.match(/savegame(\d+)/)[1])

					result.items.item.forEach( (thisMod) => {
						const thisModName = thisMod.$.MODNAME
						
						if ( ! ( typeof thisModName === 'undefined') && ! thisModName.startsWith('pdlc') ) {
							if ( this.contains(thisModName) ) {
								this.fullList[thisModName].usedGame = savegame
							}
						}
					})
				} else {
					this.log.notice('collection', `Could not parse save file ${thisFile}`)
				}
			})
		})
		return true
	}
}

class modFile {
	shortName = false
	fullPath  = ''

	#title              = false
	#isFolder           = false
	#testOK             = null
	#fileExists         = true
	#ignoreMe           = false

	#fileSize    = 0
	#storeItems  = 0
	#scriptFiles = 0

	#iconRelFile    = false
	#iconImageCache = false
	#iconImageFail  = false
	#modImageFiles  = []

	#activeGames = new Set()
	#usedGames   = new Set()

	XMLDocument = false
	XMLParsed   = false

	mod_version  = '0.0.0.0'
	desc_version = 0

	#fail = new badFile()

	#modList         = null
	#copy_guess_name = false

	#current_locale = null
	#md5cache       = null

	#zipTestingStatus  = false
	#zipTestingResolve = null

	constructor(parent, shortName, path, locale, isFolder = false) {
		this.#modList        = parent
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

		this.#fail.name_failed      = !(this.#testName())
		this.#fail.folder_needs_zip = isFolder

		if ( this.#fail.name_failed && ! this.#fail.first_digit && ! this.#fail.garbage_file ) {
			this.#copy_guess_name = this.#getCopyName()
		}
	}

	get ignoreMe()               { return this.#ignoreMe }
	get ignoreMeNot()            { return !this.#ignoreMe  }
	set ignoreMe(value)          { this.#ignoreMe = realBool(value) }

	get didTestingPass()         { return this.#fail.isGood }
	get didTestingFail()         { return this.#fail.isBad }
	get didTestingFailNotFatal() { return ( ! this.#fail.isFatal && this.#fail.isBad ) }
	get didTestingFailFatal()    { return this.#fail.isFatal }
	get didTestingPassEnough()   { return this.#fail.isOK}
	get failedTestList()         { return this.#fail.diagnoseMessage }

	get filename()      { return path.basename(this.fullPath) }
	get filenameSlash() { return this.filename + (( this.isFolder ) ? '\\' : '') }

	get title()         {
		const tempTitle = this.#getLocalString('title')
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

	get hasStoreItems()   { return ( this.#storeItems > 0 ) }
	get hasNoStoreItems() { return ( this.#storeItems > 0 ) }
	get countStoreItems() { return this.#storeItems }

	get hasScripts()   { return ( this.#scriptFiles > 0 ) }
	get hasNoScripts() { return ( this.#scriptFiles > 0 ) }
	get countScripts() { return this.#scriptFiles }

	get fileSizeMap() {
		return [this.fileSizeString, this.fileSize]
	}
	get fileSizeString() {
		let bytes = this.fileSize

		if (Math.abs(this.fileSize) < 1024) {
			return '0 kB'
		}

		const units = ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
		let u = -1
		const r = 10**2

		do {
			bytes /= 1024
			++u
		} while (Math.round(Math.abs(bytes) * r) / r >= 1024 && u < units.length - 1)

		return [
			bytes.toLocaleString( this.#current_locale(), { minimumFractionDigits : 2, maximumFractionDigits : 2 } ),
			units[u]
		].join(' ')
	}

	get copyName() {
		if ( this.#copy_guess_name === false || this.#copy_guess_name === '' ) {
			return null
		}
		const copyExists = this.#modList.contains(this.#copy_guess_name)
		let sameFile = false

		if ( copyExists ) {
			sameFile = ( this.md5Sum === this.#modList.fullList[this.#copy_guess_name].md5Sum )
		}
		return [this.#copy_guess_name, copyExists, sameFile]
	}

	get md5Sum() {
		if ( !this.#isFolder && !this.#fail.garbage_file ) {
			if ( this.#md5cache === null ) {
				const crypto = require('crypto')

				const BUFFER_SIZE = 8192

				const fd = fs.openSync(this.fullPath, 'r')
				const hash = crypto.createHash('md5')
				const buffer = Buffer.alloc(BUFFER_SIZE)

				try {
					let bytesRead

					do {
						bytesRead = fs.readSync(fd, buffer, 0, BUFFER_SIZE)
						hash.update(buffer.slice(0, bytesRead))
					} while (bytesRead === BUFFER_SIZE)
				} finally {
					fs.closeSync(fd)
				}

				this.#md5cache = hash.digest('hex')
			}
			return this.#md5cache
		}
		return null
	}

	set activeGame(value) { this.#activeGames.add(parseInt(value)) }
	get activeGame() {
		return Array(21).fill(false).map((v, i) => { return ( i === 0 ) ? ( this.#activeGames.size > 0 ) : this.#activeGames.has(i) })
	}
	get activeGames() {
		return this.activeGame.slice(1).map((v, i) => { return (v) ? i+1 : null }).filter((e) => e !== null).join(', ')
	}

	set usedGame(value) { this.#usedGames.add(parseInt(value)) }
	get usedGame() {
		if ( falseIsUsedNegatives.includes(this.shortName) || ( this.isNotMissing && this.#storeItems === 0 && this.#usedGames.size === 0 ) ) {
			return this.activeGame
		}

		return Array(21).fill(false).map((v, i) => { return ( i === 0 ) ? ( this.#usedGames.size > 0 ) : this.#usedGames.has(i) })
	}
	get usedGames() {
		return this.usedGame.slice(1).map((v, i) => { return (v) ? i+1 : null }).filter((e) => e !== null).join(', ')
	}

	async test() {
		if ( !this.#fileExists || this.#fail.garbage_file ) {
			this.#testOK = false
			return new Promise( (resolve) => { resolve(false) } )
		}
		
		return ( !this.#isFolder ) ?
			this.#testZip()
				.then((testPassed) => { return this.#testOK = testPassed })
				.catch((e) => { this.#modList.log.fileError(this.shortName, `Caught zip test promise fail: ${e}`)}) :
			this.#testFolder()
				.then((testPassed) => { return this.#testOK = testPassed })
				.catch((e) => { this.#modList.log.fileError(this.shortName, `Caught folder test promise fail: ${e}`)})
	}

	get descDescription() { return this.#getLocalString('description') }

	get iconFileName() { return this.#iconRelFile }

	async getIcon() {
		if ( this.#iconRelFile === false || this.#iconImageFail === true ) {
			return null
		}

		/* Check to see if we can load */
		if ( this.#iconImageCache === false ) {
			if ( this.#isFolder ) {
				this.#iconImageFail = this.#loadFolderIcon()
			} else {
				this.#iconImageFail = await this.#loadZipIcon()
			}

			/* Double check after attempt */
			if ( this.#iconImageFail === true ) {
				this.#modList.log.icon(this.shortName, 'Icon tried to load and failed')
				return null
			}
			return this.#iconImageCache
		}
		return this.#iconImageCache
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

		return ''
	}

	#testName() {
		if ( ! this.#isFolder && ! this.fullPath.endsWith('.zip') && this.#fileExists ) {
			if ( this.fullPath.endsWith('.rar') || this.fullPath.endsWith('.7z') ) {
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
		}
		
		if ( this.shortName.match(/^[0-9]/) ) {
			this.#fail.first_digit = true
		}
		return false
	}

	async #testZip() {
		const returnPromise = new Promise((resolve) => {
			this.#zipTestingResolve = (arg) => { resolve(arg) }
		})

		const zip = new StreamZip({ file : this.fullPath })

		zip.on('error', (e) => {
			this.#fail.bad_zip = true
			this.#zipTestingStatus = false
			this.#zipTestingResolve(this.#zipTestingStatus)
			this.#modList.log.fileError(this.shortName, `Caught zip open fail ${e}`)
		})

		zip.on('ready', () => {
			for (const entry of Object.values(zip.entries())) {
				if ( entry.name.endsWith('.dds') || entry.name.endsWith('.png') ) {
					this.#modImageFiles.push(entry.name)
				}
				if ( entry.name.endsWith('.lua') ) {
					this.#scriptFiles++
				}
			}

			zip.stream('modDesc.xml', (err, stm) => {
				if ( err ) {
					this.#fail.no_modDesc = true
					this.#zipTestingStatus = false
					this.#zipTestingResolve(this.#zipTestingStatus)
				} else {
					this.XMLDocument = ''
					stm.on('data', (chunk) => { this.XMLDocument += chunk.toString() })
					stm.on('end', () => {
						zip.close()
						this.#zipTestingStatus = this.#testXML()
						this.#zipTestingResolve(this.#zipTestingStatus)
					})
				}
			})
		})

		return returnPromise
	}

	async #testFolder() {
		if ( ! fs.existsSync(path.join(this.fullPath, 'modDesc.xml')) ) {
			this.#fail.no_modDesc = true
			return false
		}

		try {
			const data = fs.readFileSync(path.join(this.fullPath, 'modDesc.xml'), 'utf8')
			this.XMLDocument = data
		} catch (e) {
			this.#modList.log.fileError(this.shortName, `Couldn't open folder (it exists) modDesc.xml: ${e}`)
			this.#fail.bad_modDesc = true
			return false
		}

		const fileList = glob.sync(path.join(this.fullPath, '**', '*.lua'))
		this.#scriptFiles = fileList.length

		const pngImageList = glob.sync(path.join(this.fullPath, '**', '*.png'))
		const ddsImageList = glob.sync(path.join(this.fullPath, '**', '*.dds'))

		pngImageList.forEach((thisFile) => {
			this.#modImageFiles.push(path.relative(this.fullPath, thisFile))
		})
		ddsImageList.forEach((thisFile) => {
			this.#modImageFiles.push(path.relative(this.fullPath, thisFile))
		})
		
		this.#testXML()
	}

	#testXML() {
		const XMLOptions = {strict : true, async : false, normalizeTags : true, attrNameProcessors : [function(name) { return name.toUpperCase() }] }
		const strictXMLParser = new xml2js.Parser(XMLOptions)
		
		/* Read modDesc.xml */
		strictXMLParser.parseString(this.XMLDocument, (err, result) => {
			if ( err !== null ) {
				/* XML Parse failed, lets try to recover */
				this.#modList.log.fileError(this.shortName, `Caught XML Parse error: ${err}`)
				this.#fail.bad_modDesc = true
				XMLOptions.strict = false
				const looseXMLParser = new xml2js.Parser(XMLOptions)

				looseXMLParser.parseString(this.XMLDocument, (err, result) => {
					if ( err !== null ) {
						/* Couldn't recover */
						this.#modList.log.fileError(this.shortName, `Caught unrecoverable XML Parse error: ${err}`)
						this.#fail.bad_modDesc_no_rec = true
						return false
					}
					this.XMLParsed = result
				})
			} else {
				this.XMLParsed = result
			}
		})

		/* Get modDesc.xml version */
		if ( this.#nestedXMLProperty('moddesc.$.DESCVERSION') ) {
			this.desc_version = parseInt(this.XMLParsed.moddesc.$.DESCVERSION)

			if ( this.desc_version < 40 ) {
				this.#fail.bad_modDesc_ver = true
				return false
			}
		} else {
			this.#fail.bad_modDesc_ver = true
			return false
		}

		/* Get MOD Version */
		if ( this.#nestedXMLProperty('moddesc.version') ) {
			this.mod_version = this.XMLParsed.moddesc.version.toString()
		} else {
			this.#fail.no_modVer = true
			return false
		}

		/* Count storeitems */
		if ( this.#nestedXMLProperty('moddesc.storeitems') ) {
			this.#storeItems = this.XMLParsed.moddesc.storeitems.length
		}
		
		/* Get icon filename */
		if ( this.#nestedXMLProperty('moddesc.iconfilename') ) {
			// NOTE: don't attempt to load png, if it's there.  We can't read it anyway
			let tempIcon = this.XMLParsed.moddesc.iconfilename[0].toString()
			if ( ! tempIcon.endsWith('.dds') ) {
				tempIcon = `${tempIcon.slice(0, -4)}.dds`
			}
			if ( this.#modImageFiles.includes(tempIcon) ) {
				this.#iconRelFile = tempIcon
			} else {
				this.#fail.no_modIcon = true
			}
		} else {
			this.#fail.no_modIcon = true
			return false
		}

		return true
	}

	#nestedXMLProperty (propertyPath) {
		if (!propertyPath) { return false }

		const properties = propertyPath.split('.')
		let obj = this.XMLParsed

		for (let i = 0; i < properties.length; i++) {
			const prop = properties[i]

			if (!obj || !Object.prototype.hasOwnProperty.call(obj, prop)) {
				return false
			}
			
			obj = obj[prop]
		}

		return true
	}

	#processIcon(buffer) {
		try {
			const ddsData   = parseDDS(buffer)

			// get the first mipmap texture
			const image         = ddsData.images[0]
			const imageWidth    = image.shape[0]
			const imageHeight   = image.shape[1]
			const imageDataView = new DataView(buffer, image.offset, image.length)

			// convert the DXT texture to an Uint8Array containing RGBA data
			const rgbaData = decodeDXT(imageDataView, imageWidth, imageHeight, ddsData.format)

			this.#iconImageCache = { data : rgbaData, width : imageWidth, height : imageHeight }
			return false
		} catch {
			return true
		}
	}
	async #loadZipIcon() {
		const returnPromise = new Promise((resolve) => {
			this.#zipTestingResolve = (arg) => { resolve(arg) }
		})

		const zip = new StreamZip({ file : this.fullPath })

		zip.on('error', (e) => {
			this.#fail.bad_zip = true
			this.#modList.log.fileError(this.shortName, `Caught zip open fail ${e}`)
			this.#zipTestingResolve(false)
		})

		zip.on('ready', () => {
			try {
				const modIconBuffer = zip.entryDataSync(this.#iconRelFile)
				this.#zipTestingResolve(this.#processIcon(modIconBuffer.buffer))
			} catch (e) {
				this.#modList.log.fileError(this.shortName, `Couldn't read icon ${e}`)
			} finally {
				zip.close()
			}
		})

		return returnPromise
	}

	#loadFolderIcon() {
		try {
			const ddsBuffer = fs.readFileSync(path.join(this.fullPath, this.#iconRelFile), null)
			return this.#processIcon(ddsBuffer.buffer)
		} catch {
			this.#fail.no_modIcon = true
			return true
		}
	}

	#getLocalString(key) {
		if (this.XMLParsed === false ) {
			return null
		}
		
		if ( ! this.#nestedXMLProperty(`moddesc.${key.toLowerCase()}`) ) {
			return null
		}
		const searchTree = this.XMLParsed.moddesc[key.toLowerCase()][0]

		if ( Object.prototype.hasOwnProperty.call(searchTree, this.#current_locale()) ) {
			return searchTree[this.#current_locale()][0].trim()
		}
		if ( Object.prototype.hasOwnProperty.call(searchTree, 'en') ) {
			return searchTree.en[0].trim()
		}
		if ( Object.prototype.hasOwnProperty.call(searchTree, 'de') ) {
			return searchTree.de[0].trim()
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
		folder_needs_zip   : false,
	}
	#failMessages = {
		first_digit        : 'FILE_ERROR_NAME_STARTS_DIGIT',
		probable_copy      : 'FILE_ERROR_LIKELY_COPY',
		probable_zippack   : 'FILE_ERROR_LIKELY_ZIP_PACK',
		other_archive      : 'FILE_ERROR_UNSUPPORTED_ARCHIVE',
		name_failed        : 'FILE_ERROR_NAME_INVALID',
		garbage_file       : 'FILE_ERROR_GARBAGE_FILE',
		bad_zip            : 'FILE_ERROR_UNREADABLE_ZIP',
		no_modDesc         : 'NOT_MOD_MODDESC_MISSING',
		bad_modDesc        : 'MOD_ERROR_MODDESC_DAMAGED_RECOVERABLE',
		bad_modDesc_no_rec : 'NOT_MOD_MODDESC_PARSE_ERROR',
		bad_modDesc_ver    : 'NOT_MOD_MODDESC_VERSION_OLD_OR_MISSING',
		no_modVer          : 'MOD_ERROR_NO_MOD_VERSION',
		no_modIcon         : 'MOD_ERROR_NO_MOD_ICON',
		folder_and_zip     : 'CONFLICT_ERROR_FOLDER_AND_FILE',
		folder_needs_zip   : 'INFO_NO_MULTIPLAYER_UNZIPPED',
	}

	#passFlags = [
		'bad_modDesc',
		'folder_and_zip',
		'folder_needs_zip'
	]

	#fatalFlags = [
		'name_failed',
		'garbage_file',
		'bad_zip',
		'no_modDesc',
		'bad_modDesc_no_rec',
		'bad_modDesc_ver',
		'no_modVer',
		'no_modIcon'
	]

	get first_digit()      { return this.failFlags.first_digit }
	set first_digit(value) { this.failFlags.first_digit = realBool(value) }

	get probable_copy()      { return this.failFlags.probable_copy }
	set probable_copy(value) { this.failFlags.probable_copy = realBool(value) }

	get probable_zippack()      { return this.failFlags.probable_zippack }
	set probable_zippack(value) { this.failFlags.probable_zippack = realBool(value) }

	get other_archive()      { return this.failFlags.other_archive }
	set other_archive(value) { this.failFlags.other_archive = realBool(value) }

	get name_failed()      { return this.failFlags.name_failed }
	set name_failed(value) { this.failFlags.name_failed = realBool(value) }

	get garbage_file()      { return this.failFlags.garbage_file }
	set garbage_file(value) { this.failFlags.garbage_file = realBool(value) }

	get bad_zip()      { return this.failFlags.bad_zip }
	set bad_zip(value) { this.failFlags.bad_zip = realBool(value) }

	get no_modDesc()      { return this.failFlags.no_modDesc }
	set no_modDesc(value) { this.failFlags.no_modDesc = realBool(value) }

	get bad_modDesc()      { return this.failFlags.bad_modDesc }
	set bad_modDesc(value) { this.failFlags.bad_modDesc = realBool(value) }

	get bad_modDesc_rec()      { return this.failFlags.bad_modDesc_rec }
	set bad_modDesc_rec(value) { this.failFlags.bad_modDesc_rec = realBool(value) }

	get bad_modDesc_ver()      { return this.failFlags.bad_modDesc_ver }
	set bad_modDesc_ver(value) { this.failFlags.bad_modDesc_ver = realBool(value) }

	get no_modVer()      { return this.failFlags.no_modVer }
	set no_modVer(value) { this.failFlags.no_modVer = realBool(value) }

	get no_modIcon()      { return this.failFlags.no_modIcon }
	set no_modIcon(value) { this.failFlags.no_modIcon = realBool(value) }

	get folder_and_zip()      { return this.failFlags.folder_and_zip }
	set folder_and_zip(value) { this.failFlags.folder_and_zip = realBool(value) }

	get folder_needs_zip()      { return this.failFlags.folder_needs_zip }
	set folder_needs_zip(value) { this.failFlags.folder_needs_zip = realBool(value) }

	get isFatal() {
		for ( const fatalFlag of this.#fatalFlags ) {
			if ( this.failFlags[fatalFlag] ) {
				return true
			}
		}
		return false
	}

	get isOK() {
		const newTestArray = Object.keys(this.failFlags).filter((word) => !this.#passFlags.includes(word))

		for ( const thisTest of newTestArray ) {
			if (this.failFlags[thisTest] === true) {
				return false
			}
		}
		return true
	}


	get isBad() {
		for (const [_key, value] of Object.entries(this.failFlags)) {
			if ( value === true ){
				return true
			}
		}
		return false
	}

	get isGood() {
		for (const [_key, value] of Object.entries(this.failFlags)) {
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

