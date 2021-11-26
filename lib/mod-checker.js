/*  _______           __ ______ __                __               
   |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
   |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
   |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  */

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
const PNG            = require('pngjs').PNG

const conflictListData2019 = require('./mod-checker-conflicts')
const conflictListData2022 = require('./mod-checker-conflicts-2022')

/**
 * Turn a truthy value into a boolean
 * 
 * @param  {any} input Value to boolean
 * @return {boolean} The value.
 */
const realBool = function(input) {
	return (typeof input === 'boolean') ? input : Boolean(input)
}

const validFileTypes = [
	'.ogg', '.dds', '.i3d', '.shapes', '.lua', '.xml', '.grle', '.gls', '/'
]

/* False "isUsed" negatives.  They are really script mods, but have some optional storeItems */
const falseIsUsedNegatives = {
	19 : [
		'FS19_buyableLargeStackBales',
		'FS19_RM_Seasons',
		'FS19_GlobalCompany',
		'FS19_precisionFarming',
	],
	22 : [],
}

/* Known Paid DLC titles to check for cracked / pirated versions */
const knownPDLCTitlesEN = {
	19 : [
		'Kverneland &amp; Vicon Equipment Pack',
		'Grimme Pack',
		'CLAAS Pack (Platinum Expansion)',
		'Anderson Group Equipment Pack',
		'Rottne Pack',
		'BOURGAULT Pack',
		'Alpine Farming Pack',
	],
	22 : [],
}



class modReader {
	gameVersion       = 19
	modFolder         = null
	gameFolder        = null
	fullList          = {}
	activeGames       = new Set()
	defaultColumns    = ['shortName', 'title']
	#modsTesting      = [] // Promise array for testing
	locale            = () => { return 'en' }
	log               = null
	errorToException  = false // For search error, dump an exception
	modsDoneTesting   = 0
	modsToTest        = 0

	/**
	 * Create a collection of mods to parse
	 * 
	 * @param  {string} gameFolder Path to save games, or null to not load saves
	 * @param  {string} modFolder Path to mod files / folders. Required
	 * @param  {class} log=null Class to handle logging, should be an instance of mcLogger
	 * @param  {function} locale=null Function that returns a string of the current locale (i.e. "en")
	 */
	constructor(gameFolder, modFolder, log = null, locale = null, gameVersion = 19) {
		this.gameFolder     = gameFolder
		this.modFolder      = modFolder
		this.log            = log
		this.gameVersion    = gameVersion

		if ( typeof locale === 'function') { this.locale = locale }

		this.log.notice('collection', `Setting parser version to ${gameVersion}`)

		if ( this.log === null ) {
			throw new Error('Logging is non-functional, cannot continue')
		}
		if ( ! fs.existsSync(this.modFolder) ) {
			this.log.fatal('collection', 'Unable to open mod folder (exists check)')
			throw new Error('Unable to open mod folder')
		}
		if ( gameFolder !== false && gameFolder !== null && ! fs.existsSync(this.gameFolder) ) {
			this.log.fatal('collection', 'Unable to open saves folder (exists check)')
			throw new Error('Unable to open game saves folder')
		}
		
	}

	
	/**
	 * Reads all mods and save games in the supplied folders.  Also starts async testings
	 * 
	 * @returns {Promise} this promise resolves when all files, folders, and saves have been read.  Tests may still be pending
	 */
	async readAll() {
		return this.#readFiles().then(() => {
			this.log.notice('collection', 'Finished read mods on disk (test pending)')
			return this.#readSaves().then((pass2) => {
				this.log.notice('collection', 'Finished read save games')
				return pass2
			}).catch((unknownError) => {
				// Shouldn't happen.  No idea
				this.log.notice('collection', `Uncaught Error - Saves Read" : ${unknownError}`)
			})
		}).catch((unknownError) => {
			// Shouldn't happen.  No idea
			this.log.notice('collection', `Uncaught Error - Files Read" : ${unknownError}`)
		})
	
	}

	/**
	 * Check if the mod list contains the given key
	 * 
	 * @param  {String} name Key to search for
	 */
	contains(name) {
		return Object.prototype.hasOwnProperty.call(this.fullList, name)
	}

	
	/**
	 * Pull a localize string from a sanitized source. (en key must always exist).  Currently used only for conflict list
	 * 
	 * @param  {Object} tree Object of localizations. (language code as)
	 */
	#safeL10n(tree) {
		if ( Object.prototype.hasOwnProperty.call(tree, this.locale()) ) {
			return tree[this.locale()]
		}
		return tree.en
	
	}
	/**
	 * Ask for the list of conflicting mods
	 * 
	 * @returns {Promise<Array>} Returns the conflict list as an array of Array([Short Name], [Title], [Message(s)], [Full Path])
	 */
	async conflictList() {
		return Promise.allSettled(this.#modsTesting).then(() => {
			let checkEntriesFromFile = []
			const returnArray = []
			const checkList = Object.keys(this.fullList)

			for (const [_key, modRecord] of Object.entries(this.fullList)) {
				if ( modRecord.isFileConflict && modRecord.isNotMissing ) {
					returnArray.push([
						modRecord.shortName,
						modRecord.title,
						modRecord.howIsFileConflict,
						modRecord.fullPath
					])
				}
			}

			const dupeArray = this.#findDupes()

			if ( dupeArray.length > 0 ) {
				returnArray.push(...dupeArray)
			}
			
			switch ( this.gameVersion ) {
				case 19:
					checkEntriesFromFile = Object.entries(conflictListData2019.conflictMods)
					break
				case 22:
					checkEntriesFromFile = Object.entries(conflictListData2022.conflictMods)
					break
				default:
					this.log.notice('collection', 'Conflicts Error - Unknown gameVersion')
					break
			}

			for ( const [modName, conflictDetails] of checkEntriesFromFile) {
				if ( checkList.includes(modName) && this.fullList[modName].isNotMissing ) {
					let doesConflict = false
					if ( conflictDetails.confWith === null ) {
						doesConflict = true
					} else {
						for ( const confWithName of conflictDetails.confWith ) {
							if ( checkList.includes(confWithName) && this.fullList[confWithName].isNotMissing ) {
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

	get testStatus() {
		return [this.modsDoneTesting, this.modsToTest]
	}
	/**
	 * Get the array of running test promises
	 * 
	 * @returns {Array} Test promises. Note there is no way to resolve these to individual mods.
	 */
	get testPromise() {
		return this.#modsTesting
	}

	
	/**
	 * Ask is it is safe to refresh a view. In practice, hold answer until it is.  Not used in production.
	 * 
	 * @returns {boolean} Yes/No safe to reload.
	 */
	async safeResend() {
		this.log.notice('collection', 'Got window reload request')
		return Promise.allSettled(this.#modsTesting).then(() => {
			this.log.notice('collection', 'Accepted window reload request')
			return true
		})
	}

	
	/**
	 * Search the mod list given a set of options
	 * 
	 * @param  {Object} options={} Object of options to pass
	 * @param  {Array} options.terms Array of Boolean search terms from modFile class
	 * @param  {Array} options.columns Array of Return values from modFile Class
	 * @param  {Boolean} options.overrideIgnore=false When true, display even if modFile has ignore flag set
	 * @param  {Boolean} options.includeTerms=false When true, include search terms in results array
	 * @param  {Number} options.sortColumn=0 Sort by options.columns index
	 * @param  {Boolean} options.allTerms=false When true, options.terms is an AND condition rather than OR condition
	 * @param  {Number} options.activeGame=0 Limit to mods active in specified savegame. 0 = all, -1 = None
	 * @param  {Number} options.usedGame=0 Limit to mods used in specified savegame. 0 = all, -1 = None (Takes precedence over activeGame)
	 * @param  {Boolean} options.debug=false When true, log passed options to logger class.
	 * 
	 * @returns {Promise<Array>} Returns sorted, matched list of mods array of Array(options.columns)
	 */
	async search(options = {} ) {
		return Promise.allSettled(this.#modsTesting).then((args) => {
			args.forEach((arg) => {
				if ( arg.status !== 'fulfilled' ) {
					this.log.fileError('collection', `Promise failed: ${arg}`)
				}
			})
			return this.#search(options)
		}).catch((err) => {
			this.log.fatal('collection', `Search promise failed: ${err}`)
		})
	}

	#findDupes() {
		const titleMap = {}
		const returnArray = []

		for (const [key, value] of Object.entries(this.fullList)) {
			if ( value.title === false ) { continue }
			if ( Object.prototype.hasOwnProperty.call(titleMap, value.title) ) {
				titleMap[value.title][0]++
				titleMap[value.title][1].push(key)
			} else {
				titleMap[value.title] = [1, [key]]
			}
		}
		for (const [_key, value] of Object.entries(titleMap)) {
			if ( value[0] > 1 ) {
				returnArray.push([
					value[1].join(', '),
					`(${value[0]})`,
					['INFO_MIGHT_BE_DUPLICATE'],
					false
				])

			}
		}
		return returnArray
	}

	/**
	 * Get Array of active games
	 */
	async getActive() {
		return Promise.allSettled(this.#modsTesting).then(() => {
			return Array.from(this.activeGames).sort((a, b) => a - b)
		})
	}

	/**
	 * Get Array of active games - note this is an unsafe usage - you must ensure that the reader has finished before calling.
	 */
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
				try {
					x = x.toUpperCase()
					y = y.toUpperCase()
				} catch {
					this.log.info('search-sort', `Key error (ignored) x:${x}, y:${y}`)
					// Ignore this error.  Unicode maybe?
				}
			}

			if (x < y) return -1
			if (x > y) return 1
			return 0
		})

		return ( myOptions.columns.length > 1 ) ? returnList : returnList.flat()
	}
	
	
	/**
	 * Get a list of broken mods - shorthand to .search()
	 * 
	 * @param  {} columns=Array('shortName') Items to include in return array
	 * 
	 * @returns {Promise<Array>} Returns sorted, matched list of mods array of Array(columns)
	 */
	getBrokenList(columns = ['shortName']) {
		return this.search({
			columns : columns,
			terms   : ['isModBroken'],
		})
	}

	/**
	 * Get a list of missing mods - shorthand to .search()
	 * 
	 * @param  {} columns=Array('shortName') Items to include in return array
	 * 
	 * @returns {Promise<Array>} Returns sorted, matched list of mods array of Array(columns)
	 */
	getMissingList(columns = ['shortName']) {
		return this.search({
			columns : columns,
			terms   : ['isMissing'],
		})
	}

	/**
	 * Read mod files and folders in given modFolder.  This also begins the testing process
	 */
	async #readFiles() {
		const modFolderFiles = fs.readdirSync(this.modFolder, {withFileTypes : true})

		modFolderFiles.forEach((thisFile) =>{
			if ( ! thisFile.isDirectory() && ! thisFile.isSymbolicLink() ) {
				try {
					const shortName = path.parse(thisFile.name).name
					this.fullList[shortName] = new modFile(
						this,
						shortName,
						path.join(this.modFolder, thisFile.name),
						this.locale,
						thisFile.isDirectory()
					)
					const theseStats = fs.statSync(path.join(this.modFolder, thisFile.name))
					this.fullList[shortName].fileSize = theseStats.size
					this.fullList[shortName].date     = theseStats.ctime
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
					this.fullList[shortName].date = fs.statSync(path.join(this.modFolder, thisFile.name)).ctime

					let bytes = 0
					// BUG: with a *lot* of folders, this is going to be a pretty big performance hit.
					glob.sync(path.join(this.modFolder, thisFile.name, '**')).forEach((file) => {
						try {
							const stats = fs.statSync(file)
							if ( stats.isFile() ) { bytes += stats.size }
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

		this.modsToTest = this.#modsTesting.length
	}

	
	/**
	 * Read save game files given in gameFolder.
	 */
	async #readSaves() {
		this.activeGames.clear()

		if ( this.gameFolder === null || this.gameFolder === false ) { return true }

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

					if ( 'careersavegame' in result && 'mod' in result.careersavegame ) {
						result.careersavegame.mod.forEach( (thisMod) => {
							const thisModName = thisMod.$?.MODNAME || null

							if ( thisModName === null ) {
								this.log.notice('collection', `Malformed mod record in file ${thisFile} : ${thisMod}`)
							}

							if ( thisModName !== null && ! thisModName.startsWith('pdlc') ) {
								if ( this.contains(thisModName) ) {
									this.fullList[thisModName].activeGame = savegame
								} else {
									this.fullList[thisModName] = new modFile(
										this,
										thisModName,
										false,
										this.locale
									)
									this.fullList[thisModName].activeGame = savegame
									this.fullList[thisModName].title      = thisMod.$.TITLE
									this.modsToTest++
									this.modsDoneTesting++
								}
							}
						})
					} else {
						this.log.notice('collection', `Malformed save file ${thisFile}`)
					}
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

					if ( 'vehicles' in result && 'vehicle' in result.vehicles ) {
						result.vehicles.vehicle.forEach( (thisMod) => {
							const thisModName = thisMod.$?.MODNAME || null
							
							if ( thisModName !== null && ! ( typeof thisModName === 'undefined') && ! thisModName.startsWith('pdlc') ) {
								if ( this.contains(thisModName) ) {
									this.fullList[thisModName].usedGame = savegame
								}
							}
						})
					} else {
						this.log.notice('collection', `Malformed save file ${thisFile}`)
					}
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
					
					try {
						result.items.item.forEach( (thisMod) => {
							const thisModName = thisMod.$?.MODNAME || null
							
							if ( thisModName !== null && ! ( typeof thisModName === 'undefined') && ! thisModName.startsWith('pdlc') ) {
								if ( this.contains(thisModName) ) {
									this.fullList[thisModName].usedGame = savegame
								}
							}
						})
					} catch (err) {
						this.log.fileError('saveReader', `File not in expected format, empty? ${thisFile} : ${err}`)
					}
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
	#modExtraFiles  = []
	#modI3DFiles    = []

	#activeGames = new Set()
	#usedGames   = new Set()

	XMLDocument = false
	XMLParsed   = false

	mod_version    = '0.0.0.0'
	mod_author     = null
	desc_version   = 0
	isMultiplayer  = false
	isOldShaders   = false
	date           = new Date(1970, 0, 1, 0, 0, 0, 0)
	newestPart     = new Date(1970, 0, 1, 0, 0, 0, 0)

	#fail = new badFile()

	#modList         = null
	#copy_guess_name = false

	#current_locale = null
	#md5cache       = null

	#zipTestingStatus  = false
	#zipTestingResolve = null

	/**
	 * Create a mod record for a file or folder
	 * 
	 * @param  {Class} parent The collection class
	 * @param  {String} shortName Short name of mod (Zip file name without the .zip, or folder name)
	 * @param  {String} path Full path to mod.  When false, assume the mod is "missing"
	 * @param  {Function} locale Function that returns the current locale as a string, i.e. "en"
	 * @param  {Boolean} isFolder=false When true, mod is unzipped
	 */
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

	
	/** Is this mod being ignored? */
	get ignoreMe()               { return this.#ignoreMe }
	/** Is this mod NOT being ignored? */
	get ignoreMeNot()            { return !this.#ignoreMe  }
	set ignoreMe(value)          { this.#ignoreMe = realBool(value) }

	/** Did all testing pass? */
	get didTestingPass()         { return this.#fail.isGood }
	/** Did some testing fail? */
	get didTestingFail()         { return this.#fail.isBad }
	/** Did a test fail that marks mod as "broken"? */
	get isModBroken()            { return this.#fail.isBrokenMod }
	/** Get list of failed tests that marks mod as "broken" */
	get howIsModBroken()         { return this.#fail.brokenMessage }
	/** Did a test fail the marks mod as a "conflict"? */
	get isFileConflict()         { return this.#fail.isConflictMod }
	/** Get list of failed tests that marks mod as a "conflict" */
	get howIsFileConflict()      { return this.#fail.conflictMessage }
	/** Did testing fail, but not fatally so? */
	get didTestingFailNotFatal() { return ( ! this.#fail.isFatal && this.#fail.isBad ) }
	/** Did enough tests fail to be fatal? */
	get didTestingFailFatal()    { return this.#fail.isFatal }
	/** Did enough tests pass that this mod probably works fine? */
	get didTestingPassEnough()   { return this.#fail.isOK}
	/** Get list of ALL failed tests, even those that are just informational */
	get failedTestList()         { return this.#fail.diagnoseMessage }

	/** Get String Date */
	get stringDate()    { return (isNaN(this.date.getTime()) ? '0000-00-00T00:00' : this.date.toISOString().substring(0, 16) ) }
	/** Get filename */
	get filename()      { return path.basename(this.fullPath) }
	/** Get filename with trailing slash if this is a folder */
	get filenameSlash() { return this.filename + (( this.isFolder ) ? '\\' : '') }

	/** Get title, prefer from modDesc, fallback to already stored title (set fallback) */
	get title()         {
		const tempTitle = this.#getLocalString('title')
		return ( tempTitle === null ) ? this.#title : tempTitle
	}
	set title(value)    { this.#title = value }

	/** Get / Set "isFolder" flag */
	get isFolder()      { return this.#isFolder }
	set isFolder(value) { this.#isFolder = realBool(value) }
	
	/** Get / Set "isFile" flag (inverse of "isFolder") */
	get isFile()      { return !this.#isFolder }
	set isFile(value) { this.#isFolder = !realBool(value) }
	
	/** Get / Set "isFileAndFolder" flag (for when both exist.  Note we only test the zip) */
	get isFileAndFolder()      { return this.#fail.folder_and_zip }
	set isFileAndFolder(value) { this.#fail.folder_and_zip = value }
	
	/** Get / Set "isNameOK" flag - does file name conform to Giants standards? */
	get isNameOK()       { return !this.#fail.name_failed }
	set isNameOK(value)  { this.#fail.name_failed = !value }

	/** Get / Set "isNameBad" flag - inverse of "isNameOK" */
	get isNameBad()      { return this.#fail.name_failed }
	set isNameBad(value) { this.#fail.name_failed = value }

	/** Get / Set "isTestOK" - largely depreciated, will be false is testing failed, not is an individual test failed. */
	get isTestOK()      { return this.#testOK }
	set isTestOK(value) { this.#testOK = realBool(value) }

	/** Get / Set "isTestBad" - inverse of "isTestOK" */
	get isTestBad()      { return !this.#testOK }
	set isTestBad(value) { this.#testOK = !realBool(value) }
	
	/** Get / Set "isMissing" - does the file exist on disk? */
	get isMissing()      { return !this.#fileExists }
	set isMissing(value) { this.#fileExists = !realBool(value) }

	/** Get / Set "isNotMissing" - inverse of "isMissing" */
	get isNotMissing()      { return this.#fileExists }
	set isNotMissing(value) { this.#fileExists = realBool(value) }
	
	/** Get / Set "fileSize" - the file / folder size in bytes */
	get fileSize()      { return this.#fileSize }
	set fileSize(value) { this.#fileSize = value }

	/** Ask if the mod includes store items */
	get hasStoreItems()   { return ( this.#storeItems > 0 ) }
	/** Ask if the mod DOES NOT include store items */
	get hasNoStoreItems() { return ( this.#storeItems > 0 ) }
	/** Ask how many store items the mod includes */
	get countStoreItems() { return this.#storeItems }

	/** Ask if the mod includes scripts */
	get hasScripts()   { return ( this.#scriptFiles > 0 ) }
	/** Ask if the mod DOES NOT include scripts */
	get hasNoScripts() { return ( this.#scriptFiles > 0 ) }
	/** Ask how many scripts the mod includes */
	get countScripts() { return this.#scriptFiles }

	/** Ask if the mod includes extra files */
	get hasExtras()   { return ( this.#modExtraFiles.length > 0 ) }
	/** Ask if the mod DOES NOT include extra files */
	get hasNoExtras() { return ( this.#modExtraFiles.length < 1 ) }
	/** Get list of extra files in the archive / folder */
	get getExtras() { return this.#modExtraFiles }

	get getI3DCount() { return this.#modI3DFiles.length }
	get getI3DNames() { return this.#modI3DFiles }
	
	/** Get Array of filesize Array([Human Readable], [In Bytes]) */
	get fileSizeMap() {
		return [this.fileSizeString, this.fileSize]
	}
	/** Get Filesize of file / folder in a human readable format */
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

	/** If this mod looks like a copy, get the name of the original, and if the original exists, compare them (md5 sum) */
	get copyName() {
		if ( this.#copy_guess_name === false || this.#copy_guess_name === '' ) {
			return null
		}

		let copyRecordExists = this.#modList.contains(this.#copy_guess_name)
		let sameFile = false

		if ( copyRecordExists ) {
			if ( this.#modList.fullList[this.#copy_guess_name].isMissing ) {
				this.#modList.log.info(this.shortName, 'Original file used to exist, is now missing')
				copyRecordExists = false
			} else {
				sameFile = ( this.md5Sum === this.#modList.fullList[this.#copy_guess_name].md5Sum )
			}
		}
		return [this.#copy_guess_name, copyRecordExists, sameFile]
	}

	/** Compare a MD5 sum of this mod file (null for folders and non-zip files) */
	get md5Sum() {
		if ( !this.#isFolder && !this.#fail.garbage_file ) {
			if ( this.#md5cache === null ) {
				const crypto = require('crypto')
				const sum    = crypto.createHash('md5')
				let gotRead  = true

				try {
					sum.update(fs.readFileSync(this.fullPath))
				} catch (err) {
					gotRead = false
					this.#modList.log.info(this.shortName, `MD5 sum (update) error: ${err}`)
				}

				if ( gotRead) {
					try {
						this.#md5cache = sum.digest('hex')
					} catch (err) {
						this.#modList.log.info(this.shortName, `MD5 sum (hash) error: ${err}`)
					}
				}
			}
			this.#modList.log.info(this.shortName, `MD5 sum asked for, returning: ${this.#md5cache}`)
			return this.#md5cache
		}
		return null
	}

	/** Get / Set that mod is active in a save game.  Get is an array of length 21, the 0th element is "any save game" */
	set activeGame(value) { this.#activeGames.add(parseInt(value)) }
	get activeGame() {
		return Array(21).fill(false).map((v, i) => { return ( i === 0 ) ? ( this.#activeGames.size > 0 ) : this.#activeGames.has(i) })
	}
	/** Get human readable list of active games for mod */
	get activeGames() {
		return this.activeGame.slice(1).map((v, i) => { return (v) ? i+1 : null }).filter((e) => e !== null).join(', ')
	}

	/** Get / Set that mod is used in a save game. Get is an array of length 21, the 0th element is "any save game" */
	set usedGame(value) { this.#usedGames.add(parseInt(value)) }
	get usedGame() {
		if ( falseIsUsedNegatives[this.#modList.gameVersion].includes(this.shortName) || ( this.isNotMissing && this.#storeItems === 0 && this.#usedGames.size === 0 ) ) {
			return this.activeGame
		}

		return Array(21).fill(false).map((v, i) => { return ( i === 0 ) ? ( this.#usedGames.size > 0 ) : this.#usedGames.has(i) })
	}
	/** Get human readable list of used games for mod */
	get usedGames() {
		return this.usedGame.slice(1).map((v, i) => { return (v) ? i+1 : null }).filter((e) => e !== null).join(', ')
	}

	/** Begin testing of the mod.  Add promise to array in modReader class */
	async test() {
		if ( !this.#fileExists || this.#fail.garbage_file ) {
			this.#testOK = false
			this.#modList.modsDoneTesting++
			return new Promise( (resolve) => { resolve(false) } )
		}
		
		return ( !this.#isFolder ) ?
			this.#testZip()
				.then((testPassed) => {
					this.#modList.modsDoneTesting++
					return this.#testOK = testPassed
				})
				.catch((e) => {
					this.#modList.modsDoneTesting++
					this.#modList.log.fileError(this.shortName, `Caught zip test promise fail: ${e}`)
				}) :
			this.#testFolder()
				.then((testPassed) => {
					this.#modList.modsDoneTesting++
					return this.#testOK = testPassed
				})
				.catch((e) => {
					this.#modList.modsDoneTesting++
					this.#modList.log.fileError(this.shortName, `Caught folder test promise fail: ${e}`)
				})
	}

	/** Get localized description of mod */
	get descDescription() { return this.#getLocalString('description') }

	/** Get previously cached icon file name for mod */
	get iconFileName() { return this.#iconRelFile }

	/** Get (cached) icon file for mod.  Returns null on failure */
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

	/** Compute probably "original" name is this is a copy */
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

	/** Test mod file/folder name for Giants compatibility. Name must only contain A-Za-z0-9_ and cannot start with a digit  */
	#testName() {
		if ( this.fullPath === '' ) {
			// If fullPath isn't set, this is a missing mod.  We shouldn't be here, but in case
			// we are, just return that the name is OK
			return true
		}
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

	/** Zip testing process */
	async #testZip() {
		const returnPromise = new Promise((resolve) => {
			this.#zipTestingResolve = (arg) => { resolve(arg) }
		})

		const zip = new StreamZip({ file : this.fullPath })

		zip.on('error', (e) => {
			this.#fail.bad_zip     = true
			this.#zipTestingStatus = false
			this.#zipTestingResolve(this.#zipTestingStatus)
			this.#modList.log.fileError(this.shortName, `Caught zip open fail ${e}`)
		})

		zip.on('ready', () => {
			for (const entry of Object.values(zip.entries())) {
				const thisTime = new Date(entry.time)

				if ( thisTime > this.newestPart ) {
					this.newestPart = new Date(thisTime.getTime())
				}
				if ( entry.name.endsWith('.dds') || entry.name.endsWith('.png') ) {
					this.#modImageFiles.push(entry.name)
				}
				if ( entry.name.endsWith('.lua') ) {
					this.#scriptFiles++
				}
				if ( entry.name.endsWith('.l64') || entry.name.endsWith('productID.dat') ) {
					this.#fail.might_be_crack = true
				}

				let extraFile = true

				if (entry.name.endsWith('.i3d')) {
					this.#modI3DFiles.push(entry.name)
				}

				for (const suffix of validFileTypes) {
					if (entry.name.endsWith(suffix)) {
						extraFile = false
					}
				}
				if ( extraFile ) {
					this.#modExtraFiles.push(entry.name)
				}
			}

			zip.stream('modDesc.xml', (err, stm) => {
				if ( err ) {
					this.#fail.no_modDesc  = true
					this.#zipTestingStatus = false
					this.#modList.log.fileError(this.shortName, `Zip missing file: modDesc.xml: ${err}`)
					this.#zipTestingResolve(this.#zipTestingStatus)
				} else {
					this.XMLDocument = ''
					stm.on('error', (e) => {
						/* Catch things like CRC errors.  But double check if we already got the document
						(or at least most of it) before totally giving up. */
						this.#modList.log.fileError(this.shortName, `Zip file error: modDesc.xml: ${e}`)

						zip.close()

						if ( this.XMLDocument === '' ) {
							this.#fail.no_modDesc  = true
							this.#zipTestingStatus = false
							this.#modList.log.fileError(this.shortName, 'Zip file error: modDesc.xml: failed to load.')
						} else {
							this.#zipTestingStatus = this.#testXML()
						}
						
						this.#zipTestingResolve(this.#zipTestingStatus)
					})
					stm.on('data', (chunk) => {
						this.XMLDocument += chunk.toString()
					})
					stm.on('end', () => {

						for ( const i3dFile of this.#modI3DFiles ) {
							const data = zip.entryDataSync(i3dFile)
							this.#testI3D(data.toString())
						}
						zip.close()
						this.#zipTestingStatus = this.#testXML()
						this.#zipTestingResolve(this.#zipTestingStatus)
					})
				}
			})
			
		})

		return returnPromise
	}

	/** Folder testing process */
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

		const cryptLUAFiles = glob.sync(path.join(this.fullPath, '**', '*.l64' ))
		const prodIDFiles   = glob.sync(path.join(this.fullPath, '**', 'productID.dat' ))
		if ( cryptLUAFiles.length > 0  || prodIDFiles.length > 0 ) {
			this.#fail.might_be_crack = true
		}

		const fileList = glob.sync(path.join(this.fullPath, '**', '*.lua'))
		this.#scriptFiles = fileList.length

		const pngImageList = glob.sync(path.join(this.fullPath, '**', '*.png'))
		const ddsImageList = glob.sync(path.join(this.fullPath, '**', '*.dds'))

		const allFileList = glob.sync(path.join(this.fullPath, '**', '*'), { mark : true })
		
		
		for ( const checkFile of allFileList ) {

			if (checkFile.endsWith('.i3d')) {
				this.#modI3DFiles.push(checkFile.slice(this.fullPath.length+1))
			}

			let extraFile = true
			for (const suffix of validFileTypes) {
				if (checkFile.endsWith(suffix)) {
					extraFile = false
				}
			}
			if ( extraFile ) {
				this.#modExtraFiles.push(checkFile.slice(this.fullPath.length+1))
			}
		}

		/* Note: the replace call is to convert to posix style, required by modDesc */
		pngImageList.forEach((thisFile) => {
			this.#modImageFiles.push(path.relative(this.fullPath, thisFile).replace(/\\/g, '/'))
		})
		ddsImageList.forEach((thisFile) => {
			this.#modImageFiles.push(path.relative(this.fullPath, thisFile).replace(/\\/g, '/'))
		})
		
		for ( const i3dFile of this.#modI3DFiles ) {
			const data = fs.readFileSync(path.join(this.fullPath, i3dFile), 'utf8')
			this.#testI3D(data)
		}

		this.#testXML()
	}

	/* Check I3D contents - right now, supported checks are:
	 * 
	 * is FS19 mod using FS17 shaders?
	 * is FS22 mod using FS19 shaders?
	 */
	#testI3D(fileContents) {
		const XMLOptions    = {strict : false, async : false, normalizeTags : true, attrNameProcessors : [function(name) { return name.toUpperCase() }] }
		const i3dXMLParser  = new xml2js.Parser(XMLOptions)
		const oldShadeRegex = new RegExp(((this.#modList.gameVersion===19)?'fs17support':'fs19support'), 'gi')
		
		/* Read supplied i3d file, ignore errors */
		i3dXMLParser.parseString(fileContents, (err, result) => {
			if ( err !== null ) { return false }
			if ( this.#nestedXMLProperty('i3d.files', result) ) {
				result.i3d.files.forEach( ( fileList ) => {
					fileList.file.forEach( ( fileListPart ) => {
						if ( fileListPart.$.FILENAME.match(oldShadeRegex) ) {
							this.isOldShaders = true
						}
					})
				})
			}
		})
	}

	/** modDesc.xml testing process (file & folder) */
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
			
			if ( this.#modList.gameVersion === 19 ) {
				if ( this.desc_version < 40 || this.desc_version > 59 ) {
					this.#fail.bad_modDesc_ver = true
					return false
				}
			}
			if ( this.#modList.gameVersion === 22 ) {
				if ( this.desc_version < 60 ) {
					this.#fail.bad_modDesc_ver = true
					return false
				}
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

		/* Set the mod author (safe fail, I think) */
		if ( this.#nestedXMLProperty('moddesc.author') ) {
			this.mod_author = this.XMLParsed.moddesc.author.toString()
		}

		if ( this.#nestedXMLProperty('moddesc.multiplayer') ) {
			try {
				if ( this.XMLParsed.moddesc.multiplayer[0].$.SUPPORTED === 'true' ) {
					this.isMultiplayer = true
				}
			} catch {
				this.isMultiplayer = false
			}
		}

		/* Count storeitems */
		if ( this.#nestedXMLProperty('moddesc.storeitems') ) {
			try {
				this.#storeItems = this.XMLParsed.moddesc.storeitems[0].storeitem.length
			} catch {
				this.#storeItems = 0
			}
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

		if ( this.#nestedXMLProperty('moddesc.productid') ) {
			this.#fail.might_be_crack = true
		}

		try {
			const titleCheck = this.XMLParsed.moddesc.title[0].en[0].trim()

			if ( knownPDLCTitlesEN[this.#modList.gameVersion].includes(titleCheck) ) {
				this.#fail.might_be_crack = true
			}
		} catch {
			// soft fail, eat errors.
		}


		return true
	}

	/** Check if deeply nested property exists in parse modDesc.xml */
	#nestedXMLProperty (propertyPath, passedObj = false) {
		if (!propertyPath) { return false }

		const properties = propertyPath.split('.')
		let obj = ( passedObj === false ? this.XMLParsed : passedObj )

		for (let i = 0; i < properties.length; i++) {
			const prop = properties[i]

			if (!obj || !Object.prototype.hasOwnProperty.call(obj, prop)) {
				return false
			}
			
			obj = obj[prop]
		}

		return true
	}

	/** Attempt to convert the .dds icon to a rgba buffer (with width and height) */
	#processIcon(buffer) {
		if ( buffer === null ) {
			this.#iconImageCache = false
			return true
		}
		try {
			const ddsData   = parseDDS(buffer)

			// get the first mipmap texture
			const image         = ddsData.images[0]
			const imageWidth    = image.shape[0]
			const imageHeight   = image.shape[1]
			const imageDataView = new DataView(buffer, image.offset, image.length)

			// convert the DXT texture to an Uint8Array containing RGBA data
			const rgbaData = decodeDXT(imageDataView, imageWidth, imageHeight, ddsData.format)

			// make a new PNG image of same width and height, pipe in raw RGBA data
			const pngData = new PNG({ width : imageWidth, height : imageHeight })

			pngData.data = rgbaData

			try {
				// Dump out PNG, base64 encode it.
				const pngBuffer = PNG.sync.write(pngData)
			
				this.#iconImageCache = `data:image/png;base64, ${pngBuffer.toString('base64')}`
			} catch {
				this.#iconImageCache = false
				return false
			}

			return false
		} catch (err) {
			this.#modList.log.icon(this.shortName, `Unknown icon processing error: ${err}`)
			return true
		}
	}

	/** Load the mod icon from a zip file */
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
				this.#zipTestingResolve(this.#processIcon(null))
			} finally {
				zip.close()
			}
		})

		return returnPromise
	}

	/** Load the mod icon from a folder */
	#loadFolderIcon() {
		try {
			const ddsBuffer = fs.readFileSync(path.join(this.fullPath, this.#iconRelFile), null)
			return this.#processIcon(ddsBuffer.buffer)
		} catch {
			this.#fail.no_modIcon = true
			return true
		}
	}

	/** Search the modDesc.xml for a localized string, fallback to "en", then "de", finally fail */
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
		might_by_crack     : false,
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
		might_be_crack     : 'INFO_MIGHT_BE_PIRACY',
	}

	#passFlags = [
		'bad_modDesc',
		'folder_and_zip',
		'folder_needs_zip',
		'might_be_crack'
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
	
	#notBroken = [
		'folder_and_zip',
		'folder_needs_zip',
		'might_be_crack'
	]

	get might_be_crack()      { return this.failFlags.might_by_crack }
	set might_be_crack(value) { this.failFlags.might_be_crack = realBool(value) }

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

	get isBrokenMod() {
		return this.brokenMessage.length > 0
	}
	get brokenMessage() {
		const errorMessages = []
		for (const [key, value] of Object.entries(this.failFlags)) {
			if ( value === true && ! this.#notBroken.includes(key) ){
				errorMessages.push(this.#failMessages[key])
			}
		}
		return errorMessages
	}

	get isConflictMod() {
		return this.conflictMessage.length > 0
	}
	get conflictMessage() {
		const errorMessages = []
		for (const [key, value] of Object.entries(this.failFlags)) {
			if ( value === true ) {
				if ( ! this.#notBroken.includes(key) ) {
					return []
				}
				errorMessages.push(this.#failMessages[key])
			}
		}
		return errorMessages
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

/** Logging class for modChecker */
class mcLogger {
	logContents = []

	/**
	 * Log "info"
	 * 
	 * @param  {} caller Closest process caller.
	 * @param  {} text Text to log
	 */
	info(caller, text) {
		this.logContents.push(['INFO', 'fw-bold text-info', new Date(), caller, text])
	}

	/**
	 * Log "notice"
	 * 
	 * @param  {} caller Closest process caller.
	 * @param  {} text Text to log
	 */
	notice(caller, text) {
		this.logContents.push(['NOTICE', 'fw-bold text-warning', new Date(), caller, text])
	}

	/**
	 * Log "file error"
	 * 
	 * @param  {} caller Closest process caller.
	 * @param  {} text Text to log
	 */
	fileError(caller, text) {
		this.logContents.push(['FILE-ERROR', 'fw-bold text-danger', new Date(), caller, text])
	}

	/**
	 * Log "fatal error"
	 * 
	 * @param  {} caller Closest process caller.
	 * @param  {} text Text to log
	 */
	fatal(caller, text) {
		this.logContents.push(['FATAL', 'text-white bg-danger', new Date(), caller, text])
	}

	/**
	 * Log "icon" (anything having to do with icon load & display)
	 * 
	 * @param  {} caller Closest process caller.
	 * @param  {} text Text to log
	 */
	icon(caller, text) {
		this.logContents.push(['ICON-ERROR', 'fw-bold text-muted', new Date(), caller, text])
	}

	/** Get log contents as a simple string */
	get toDisplayText() {
		return this.logContents.map((item) => { return `${item[0]}: ${item[2].toISOString()} (${item[3]}) ${item[4]}`}).join('\n')
	}

	/** Get log contents as styled HTML (bootstrap v5) */
	get toDisplayHTML() {
		return this.logContents.map((item) => { return `<span class="${item[1]}" style="margin-left: -10px">${item[0]}:</span> <em>${item[2].toISOString()}</em> (${item[3]}) ${item[4]}`}).join('\n')
	}
}



module.exports = {
	modReader : modReader,
	mcLogger  : mcLogger,
}