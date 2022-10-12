/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Mod Checker Class

const fs        = require('fs')
const path      = require('path')
const admZip    = require('adm-zip')
const glob      = require('glob')
const xml2js    = require('xml2js')
const crypto    = require('crypto')
const decodeDXT = require('decode-dxt')
const parseDDS  = require('parse-dds')
const PNG       = require('pngjs').PNG

class modFileChecker {
	#validFileTypes = [
		'.ogg', '.dds', '.i3d', '.shapes', '.lua', '.xml', '.grle', '.gls', '/'
	]

	#failFlags = {
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
		folder_needs_zip   : false,
		might_be_crack     : false,
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
		folder_needs_zip   : 'INFO_NO_MULTIPLAYER_UNZIPPED',
		might_be_crack     : 'INFO_MIGHT_BE_PIRACY',
	}

	#flags_broken = [
		'first_digit', 'probable_copy', 'probable_zippack',
		'other_archive', 'name_failed', 'garbage_file',
		'bad_zip', 'no_modDesc', 'bad_modDesc_no_rec',
		'bad_modDesc_ver', 'no_modVer', 'no_modIcon',
	]

	#flags_problem = [
		'might_be_crack', 'bad_modDesc'
	]

	modDesc = {
		descVersion    : 0,
		version        : '0.0.0.0',
		author         : '',
		storeItems     : 0,
		scriptFiles    : 0,
		iconFileName   : false,
		iconImageCache : null,
		multiPlayer    : false,
		xmlDoc         : false,
		xmlParsed      : false,
	}

	issues = []

	l10n = {
		title       : null,
		description : null,
	}

	uuid = null
	currentCollection = null

	fileDetail = {
		isFolder    : false,
		fullPath    : false,
		shortName   : false,
		fileSize    : 0,
		fileDate    : null,
		copyName    : false,
		imageNonDDS : [],
		imageDDS    : [],
		i3dFiles    : [],
		extraFiles  : [],
	}

	badges        = ''
	canNotUse     = false
	currentLocale = null

	#locale         = false
	#log            = null
	
	constructor( filePath, isFolder, size, date, log = null, locale = null ) {
		let stopProcess = false

		this.fileDetail.fullPath = filePath
		this.fileDetail.isFolder = isFolder
		this.fileDetail.fileSize = size
		this.fileDetail.fileDate = date

		this.uuid = crypto.createHash('md5').update(filePath).digest('hex')

		this.#locale   = locale
		this.#log      = log

		this.#log.notice('modEntry', `Adding mod ${filePath}`)

		this.fileDetail.shortName = path.parse(this.fileDetail.fullPath).name

		this.#failFlags.folder_needs_zip = this.fileDetail.isFolder

		if ( this.#isFileNameBad() ) {
			stopProcess = true
		}

		if ( ! stopProcess ) {
			if ( ! this.fileDetail.isFolder ) {
				this.#testZip()
			} else {
				this.#testFolder()
			}
		}

		this.badges = this.#getBadges()
		this.issues = this.#populateIssues()
	}

	populateL10n() {
		this.l10n.title       = this.#getLocalString('title')
		this.l10n.description = this.#getLocalString('description')
	}

	#populateIssues() {
		const issues = []
		Object.keys(this.#failFlags).forEach((flag) => {
			if ( this.#failFlags[flag] === true ) {
				issues.push(this.#failMessages[flag])
			}
		})
		return issues
	}

	#getLocalString(key) {
		if (this.modDesc.xmlParsed === false ) {
			return null
		}
		
		if ( ! this.#nestedXMLProperty(`moddesc.${key.toLowerCase()}`) ) {
			return null
		}
		const searchTree = this.modDesc.xmlParsed.moddesc[key.toLowerCase()][0]

		if ( Object.prototype.hasOwnProperty.call(searchTree, this.#locale()) ) {
			return searchTree[this.#locale()][0].trim()
		}
		if ( Object.prototype.hasOwnProperty.call(searchTree, 'en') ) {
			return searchTree.en[0].trim()
		}
		if ( Object.prototype.hasOwnProperty.call(searchTree, 'de') ) {
			return searchTree.de[0].trim()
		}
		return null
	}

	#getBadges() {
		const badgeColor = {
			broken  : 'danger',
			problem : 'warning',
			noMP    : 'secondary',
			PCOnly  : 'info',
			folder  : 'primary',
		}
		const badges = {
			broken  : false,
			problem : false,
			noMP    : ! this.modDesc.multiPlayer,
			PCOnly  : (this.modDesc.scriptFiles > 0),
			folder  : this.fileDetail.isFolder,
		}

		if ( this.fileDetail.isFolder ) { badges.noMP = true }

		this.#flags_broken.forEach((flag) => {
			if ( this.#failFlags[flag] ) { badges.broken = true; this.canNotUse = true }
		})
		this.#flags_problem.forEach((flag) => {
			if ( this.#failFlags[flag] ) { badges.problem = true }
		})

		const badgeCollection = []
		Object.keys(badges).forEach((badge) => {
			if ( badges[badge] === true ) {
				badgeCollection.push(`<span class="badge bg-${badgeColor[badge]}"><l10n name="mod_badge_${badge}"></l10n></span>`)
			}
		})

		return badgeCollection.join('')
	}

	#isFileNameBad() {
		const fullModPath = this.fileDetail.fullPath
		const shortName   = this.fileDetail.shortName

		if ( ! this.fileDetail.isFolder && ! fullModPath.endsWith('.zip') ) {
			if ( fullModPath.endsWith('.rar') || fullModPath.endsWith('.7z') ) {
				this.#failFlags.other_archive = true
			} else {
				this.#failFlags.garbage_file = true
			}
			this.#failFlags.name_failed = true
		}

		if ( shortName.match(/unzip/i) ) {
			this.#failFlags.probable_zippack = true
		}

		if ( shortName.match(/^[0-9]/) ) {
			this.#failFlags.first_digit = true
			this.#failFlags.name_failed = true
		}

		if ( ! shortName.match(/^[a-zA-Z][a-zA-Z0-9_]+$/) ) {
			this.#failFlags.name_failed = true

			if ( ! this.#failFlags.first_digit && ! this.#failFlags.garbage_file ) {
				const winCopy = shortName.match(/^([a-zA-Z][a-zA-Z0-9_]+) - .+$/)
				const dlCopy  = shortName.match(/^([a-zA-Z][a-zA-Z0-9_]+) \(.+$/)

				if ( winCopy !== null ) {
					this.#failFlags.probable_copy = true
					this.fileDetail.copyName      = winCopy[1]
				}
				if ( dlCopy !== null ) {
					this.#failFlags.probable_copy = true
					this.fileDetail.copyName      = dlCopy[1]
				}
			}
		}
		return this.#failFlags.name_failed
	}

	#processModDesc() {
		const XMLOptions = {strict : true, async : false, normalizeTags : true, attrNameProcessors : [function(name) { return name.toUpperCase() }] }
		const strictXMLParser = new xml2js.Parser(XMLOptions)
			
		/* Read modDesc.xml */
		strictXMLParser.parseString(this.modDesc.xmlDoc, (err, result) => {
			if ( err !== null ) {
				/* XML Parse failed, lets try to recover */
				this.#log.fileError(this.fileDetail.shortName, `Caught XML Parse error: ${err}`)
				this.#failFlags.bad_modDesc = true
				XMLOptions.strict = false
				const looseXMLParser = new xml2js.Parser(XMLOptions)
	
				looseXMLParser.parseString(this.modDesc.xmlDoc, (err, result) => {
					if ( err !== null ) {
						/* Couldn't recover */
						this.#log.fileError(this.fileDetail.shortName, `Caught unrecoverable XML Parse error: ${err}`)
						this.#failFlags.bad_modDesc_no_rec = true
						return false
					}
					this.modDesc.xmlParsed = result
				})
			} else {
				this.modDesc.xmlParsed = result
			}
		})
	
		/* Get modDesc.xml version */
		if ( this.#nestedXMLProperty('moddesc.$.DESCVERSION') ) {
			this.modDesc.descVersion = parseInt(this.modDesc.xmlParsed.moddesc.$.DESCVERSION)
			if ( this.modDesc.descVersion < 60 ) {
				this.#failFlags.bad_modDesc_ver = true
			}
		} else {
			this.#failFlags.bad_modDesc_ver = true
			return false
		}
	
		/* Get MOD Version */
		if ( this.#nestedXMLProperty('moddesc.version') ) {
			this.modDesc.version = this.modDesc.xmlParsed.moddesc.version.toString()
		} else {
			this.#failFlags.no_modVer = true
			return false
		}
	
		/* Set the mod author (safe fail, I think) */
		if ( this.#nestedXMLProperty('moddesc.author') ) {
			this.modDesc.author = this.modDesc.xmlParsed.moddesc.author.toString()
		}
	
		if ( this.#nestedXMLProperty('moddesc.multiplayer') ) {
			try {
				if ( this.modDesc.xmlParsed.moddesc.multiplayer[0].$.SUPPORTED === 'true' ) {
					this.modDesc.multiPlayer = true
				}
			} catch {
				this.modDesc.multiPlayer = false
			}
		}
	
		/* Count storeitems */
		if ( this.#nestedXMLProperty('moddesc.storeitems') ) {
			try {
				this.modDesc.storeItems = this.modDesc.xmlParsed.moddesc.storeitems[0].storeitem.length
			} catch {
				this.modDesc.storeItems = 0
			}
		}
			
		/* Get icon filename */
		if ( this.#nestedXMLProperty('moddesc.iconfilename') ) {
			// NOTE: don't attempt to load png, if it's there.  We can't read it anyway
			let tempIcon = this.modDesc.xmlParsed.moddesc.iconfilename[0].toString()
			if ( ! tempIcon.endsWith('.dds') ) {
				tempIcon = `${tempIcon.slice(0, -4)}.dds`
			}
			if ( this.fileDetail.imageDDS.includes(tempIcon) ) {
				this.modDesc.iconFileName = tempIcon
			} else {
				this.#failFlags.no_modIcon = true
			}
		} else {
			this.#failFlags.no_modIcon = true
			return false
		}
	
		if ( this.#nestedXMLProperty('moddesc.productid') ) {
			this.#failFlags.might_be_crack = true
		}

		return true
	}


	#testZip() {
		let zipFile    = null
		let zipEntries = null

		try {
			zipFile = new admZip(this.fileDetail.fullPath)
			zipEntries = zipFile.getEntries()
		} catch (e) {
			this.#failFlags.bad_zip = true
			this.#log.fileError(this.fileDetail.shortName, `ZIP open fail ${e}`)
			return
		}

		zipEntries.forEach((entry) => {
			let isExtraFile = true

			if ( entry.entryName.endsWith('.png') ) {
				this.fileDetail.imageNonDDS.push(entry.entryName)
			}
			if ( entry.entryName.endsWith('.dds') ) {
				this.fileDetail.imageDDS.push(entry.entryName)
			}
			if ( entry.entryName.endsWith('.l64') || entry.entryName.endsWith('productID.dat')) {
				this.#failFlags.might_be_crack = true
			}
			if ( entry.entryName.endsWith('.lua') ) {
				this.modDesc.scriptFiles++
			}
			if ( entry.entryName.endsWith('.i3d') ) {
				this.fileDetail.i3dFiles.push(entry.entryName)
			}

			for ( const suffix of this.#validFileTypes ) {
				if ( isExtraFile && entry.entryName.endsWith(suffix) ) { isExtraFile = false }
			}
			if ( isExtraFile ) {
				this.fileDetail.extraFiles.push(entry.entryName)
			}
		})

		try {
			this.modDesc.xmlDoc = zipFile.readAsText('modDesc.xml')
		} catch (e) {
			this.#failFlags.no_modDesc = true
			this.#log.fileError(this.fileDetail.shortName, `Zip missing file: modDesc.xml: ${e}`)
		}

		if ( ! this.#failFlags.no_modDesc ) {
			this.#processModDesc()
		}

		zipFile = null
	}

	
	#testFolder() {
		if ( ! fs.existsSync(path.join(this.fileDetail.fullPath, 'modDesc.xml')) ) {
			this.#failFlags.no_modDesc = true
			return false
		}

		try {
			const data = fs.readFileSync(path.join(this.fileDetail.fullPath, 'modDesc.xml'), 'utf8')
			this.modDesc.xmlDoc = data
		} catch (e) {
			this.#log.fileError(this.fileDetail.shortName, `Couldn't open folder (it exists) modDesc.xml: ${e}`)
			this.#failFlags.bad_modDesc = true
			return false
		}

		const allFileList  = glob.sync('**', { cwd : this.fileDetail.fullPath, mark : true })

		for ( const checkFile of allFileList ) {
			let extraFile = true
			for ( const suffix of this.#validFileTypes ) {
				if ( extraFile && checkFile.endsWith(suffix) ) { extraFile = false }
			}
			if ( extraFile ) { this.fileDetail.extraFiles.push(checkFile) }
			if ( checkFile.endsWith('.i3d') ) { this.fileDetail.i3dFiles.push(checkFile) }
			if ( checkFile.endsWith('.dds') ) { this.fileDetail.imageDDS.push(checkFile) }
			if ( checkFile.endsWith('.png') ) { this.fileDetail.imageNonDDS.push(checkFile) }
			if ( checkFile.endsWith('.lua') ) { this.modDesc.scriptFiles++ }

			if ( checkFile.endsWith('.l64') ) { this.#failFlags.might_be_crack = true }
			if ( checkFile.endsWith('productID.dat') ) { this.#failFlags.might_be_crack = true }
		}

		if ( ! this.#failFlags.no_modDesc ) {
			this.#processModDesc()
		}
	}


	#nestedXMLProperty (propertyPath, passedObj = false) {
		if (!propertyPath) { return false }

		const properties = propertyPath.split('.')
		let obj = ( passedObj === false ? this.modDesc.xmlParsed : passedObj )

		for (let i = 0; i < properties.length; i++) {
			const prop = properties[i]

			if (!obj || !Object.prototype.hasOwnProperty.call(obj, prop)) {
				return false
			}
			
			obj = obj[prop]
		}

		return true
	}

	#loadZipIcon() {
		if ( this.#failFlags.bad_zip || this.#failFlags.no_modIcon ) { return }

		try {
			const zipFile = new admZip(this.fileDetail.fullPath)
			const iconFile = zipFile.readFile(this.modDesc.iconFileName)
			this.#processIcon(iconFile.buffer)
		} catch (e) {
			this.#failFlags.no_modIcon = true
			this.#log.fileError(this.fileDetail.shortName, `Caught fail ${e}`)
		}
	}

	#loadFolderIcon() {
		try {
			const ddsBuffer = fs.readFileSync(path.join(this.fileDetail.fullPath, this.modDesc.iconFileName), null)
			this.#processIcon(ddsBuffer.buffer)
		} catch (e) {
			this.#failFlags.no_modIcon = true
			this.#log.fileError(this.fileDetail.shortName, `Caught fail ${e}`)
		}
	}

	#processIcon(buffer) {
		if ( buffer === null ) {
			this.modDesc.iconImageCache = null
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
			
				this.modDesc.iconImageCache = `data:image/png;base64, ${pngBuffer.toString('base64')}`
			} catch {
				this.modDesc.iconImageCache = null
				return false
			}

			return false
		} catch (err) {
			this.#log.icon(this.fileDetail.shortName, `Unknown icon processing error: ${err}`)
			return true
		}
	}

	populateIcon() {
		if ( this.modDesc.iconImageCache !== null ) { return }

		if ( ! this.fileDetail.isFolder ) {
			this.#loadZipIcon()
		} else {
			this.#loadFolderIcon()
		}
	}
}

module.exports = {
	modFileChecker : modFileChecker,
}


