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
	#maxFilesType = { grle : 10, png : 128, txt : 2, pdf : 1 }

	#fileSizeMap = {
		dds    : ( 12 * 1024 * 1024 ),
		xml    : ( 0.25 * 1024 * 1024 ),
		shapes : ( 256 * 1024 * 1024 ),
		cache  : ( 10 * 1024 * 1024 ),
		gdm    : ( 18 * 1024 * 1024 ),
	}

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
		has_extra_files    : false,
		png_texture        : false,
		dds_too_big        : false, // 12MB
		xml_too_big        : false, // 0.25MB
		i3d_too_big        : false, // 10MB
		shapes_too_big     : false, // 256MB
		gdm_too_big        : false, // 18MB
		grle_too_many      : false, // 10
		png_too_many       : false, // 128
		pdf_too_many       : false,
		txt_too_many       : false,
		space_in_file      : false, // (internal files)
		l10n_not_set       : false, // set on processL10n if either null
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
		has_extra_files    : 'PERF_HAS_EXTRA',
		png_texture        : 'PREF_PNG_TEXTURE',
		dds_too_big        : 'PERF_DDS_TOO_BIG', // 12MB
		xml_too_big        : 'PERF_XML_TOO_BIG', // 0.25MB
		i3d_too_big        : 'PERF_I3D_TOO_BIG', // 10MB
		shapes_too_big     : 'PERF_SHAPES_TOO_BIG', // 256MB
		gdm_too_big        : 'PERF_GDM_TOO_BIG', // 18MB
		grle_too_many      : 'PERF_GRLE_TOO_MANY', // 10
		pdf_too_many       : 'PERF_PDF_TOO_MANY', // 1
		txt_too_many       : 'PERF_TXT_TOO_MANY', // 2
		png_too_many       : 'PERF_PNG_TOO_MANY', // 128
		space_in_file      : 'PERF_SPACE_IN_FILE', // (internal files)
		l10n_not_set       : 'PERF_L10N_NOT_SET', // set on processL10n if either null
	}

	#flags_broken = [
		'first_digit', 'probable_copy', 'probable_zippack',
		'other_archive', 'name_failed', 'garbage_file',
		'bad_zip', 'no_modDesc', 'bad_modDesc_no_rec',
		'bad_modDesc_ver', 'no_modVer', 'no_modIcon',
	]

	#flags_problem = [
		'might_be_crack', 'bad_modDesc', 'dds_too_big', 'xml_too_big',
		'i3d_too_big', 'shapes_too_big', 'gdm_too_big', 'grle_too_many',
		'png_too_many', 'space_in_file', 'l10n_not_set', 'has_extra_files',
		'png_texture', 'pdf_too_many', 'txt_too_many'
	]

	modDesc = {
		descVersion    : 0,
		version        : '0.0.0.0',
		author         : 'n/a',
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

	md5Sum            = null
	giantsHash        = null
	uuid              = null
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
		tooBigFiles : [],
		spaceFiles  : [],
		pngTexture  : [],
	}

	badges        = ''
	canNotUse     = false
	currentLocale = null

	#locale         = false
	#log            = null
	
	constructor( filePath, isFolder, size, date, log = null, locale = null ) {
		this.fileDetail.fullPath = filePath
		this.fileDetail.isFolder = isFolder
		this.fileDetail.fileSize = size
		this.fileDetail.fileDate = date.toISOString()

		this.uuid = crypto.createHash('md5').update(filePath).digest('hex')

		this.#locale   = locale
		this.#log      = log

		this.#log.notice('modEntry', `Adding mod ${filePath}`)

		this.fileDetail.shortName = path.parse(this.fileDetail.fullPath).name

		this.#failFlags.folder_needs_zip = this.fileDetail.isFolder

		if ( ! this.#isFileNameBad() ) {
			if ( ! this.fileDetail.isFolder ) {
				const hashString = `${path.basename(this.fileDetail.fullPath)}-${this.fileDetail.fileSize}-${this.fileDetail.fileDate}`
				this.md5Sum = crypto.createHash('md5').update(hashString).digest('hex')
				
				this.#testZip()

				if ( this.#failFlags.no_modDesc ) { this.md5Sum = null }

			} else {
				this.#testFolder()
			}
		}

		this.populateL10n()
		this.populateIcon()
		this.badges       = this.#getBadges()
		this.issues       = this.#populateIssues()
		this.currentLocal = this.#locale()
	}
	
	get storable() {
		const storable = {
			canNotUse         : this.canNotUse,
			giantsHash        : this.giantsHash,
			md5Sum            : this.md5Sum,
			fileDetail        : this.fileDetail,
			issues            : this.issues,
			badges            : this.badges,
			l10n              : this.l10n,
			modDesc           : {},
			uuid              : this.uuid,
			currentCollection : this.currentCollection,
		}
		Object.keys(this.modDesc).forEach((key) => {
			if ( ! key.startsWith('xml') ) {
				storable.modDesc[key] = this.modDesc[key]
			}
		})
		return storable
	}

	populateL10n() {
		this.l10n.title       = this.#getLocalString('title')
		this.l10n.description = this.#getLocalString('description')

		if ( this.l10n.title === null || this.l10n.description === null ) {
			this.l10n.title       = 'n/a'
			this.l10n.description = ''
			this.#failFlags.l10n_not_set = true
		}
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
		if ( this.modDesc.xmlParsed === false ) { return null }
		
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
			notmod  : 'danger',
		}
		const badges = {
			broken  : false,
			problem : false,
			noMP    : ! this.modDesc.multiPlayer,
			PCOnly  : (this.modDesc.scriptFiles > 0),
			folder  : this.fileDetail.isFolder,
			notmod  : this.#failFlags.no_modDesc,
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
			this.#checkInternalFile(
				path.extname(entry.entryName),
				entry.entryName,
				entry.header.size
			)
		})
		
		this.#failFlags.grle_too_many = ( this.#maxFilesType.grle < 1 )
		this.#failFlags.png_too_many  = ( this.#maxFilesType.png < 1 )
		this.#failFlags.pdf_too_many  = ( this.#maxFilesType.pdf < 1 )
		this.#failFlags.txt_too_many  = ( this.#maxFilesType.txt < 1 )

		try {
			this.modDesc.xmlDoc = zipFile.readAsText('modDesc.xml')
		} catch (e) {
			this.#failFlags.no_modDesc = true
			this.#log.fileError(this.fileDetail.shortName, `Zip missing file: modDesc.xml: ${e}`)
		}

		if ( ! this.#failFlags.no_modDesc ) {
			this.#processModDesc()
			try {
				const fileContents  = fs.readFileSync(this.fileDetail.fullPath)
				const hashSum      = crypto.createHash('md5')
				hashSum.update(fileContents)
				hashSum.update(this.fileDetail.shortName)

				this.giantsHash = hashSum.digest('hex')
			} catch (e) {
				this.#log.fileError(this.fileDetail.shortName, `Couldn't Compute HASH: ${e}`)
			}
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
			const fileStats = fs.statSync(path.join(this.fileDetail.fullPath, checkFile))

			this.#checkInternalFile(
				path.extname(checkFile),
				checkFile,
				fileStats.size
			)
		}

		this.#failFlags.grle_too_many = ( this.#maxFilesType.grle < 1 )
		this.#failFlags.png_too_many  = ( this.#maxFilesType.png < 1 )
		this.#failFlags.pdf_too_many  = ( this.#maxFilesType.pdf < 1 )
		this.#failFlags.txt_too_many  = ( this.#maxFilesType.txt < 1 )

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

	#checkInternalFile(suffix, fileName, size) {
		if ( fileName.includes(' ') ) {
			this.fileDetail.spaceFiles.push(fileName)
			this.#failFlags.space_in_file = true
		}
		
		if ( !fileName.endsWith('/') && !fileName.endsWith('\\') ) {
			switch (suffix) {
				case '.png' :
					this.#maxFilesType.png--
					this.fileDetail.imageNonDDS.push(fileName)
					break
				case '.dds' :
					this.fileDetail.imageDDS.push(fileName)
					if ( size > this.#fileSizeMap.dds ) {
						this.fileDetail.tooBigFiles.push(fileName)
						this.#failFlags.dds_too_big = true
					}
					break
				case '.i3d' :
					this.fileDetail.i3dFiles.push(fileName)
					break
				case '.shapes' :
					if ( size > this.#fileSizeMap.shapes ) {
						this.fileDetail.tooBigFiles.push(fileName)
						this.#failFlags.i3d_too_big = true
					}
					break
				case '.lua' :
					this.modDesc.scriptFiles++
					break
				case '.gdm' :
					if ( size > this.#fileSizeMap.gdm ) {
						this.fileDetail.tooBigFiles.push(fileName)
						this.#failFlags.gdm_too_big = true
					}
					break
				case '.cache' :
					if ( size > this.#fileSizeMap.cache ) {
						this.fileDetail.tooBigFiles.push(fileName)
						this.#failFlags.i3d_too_big = true
					}
					break
				case '.xml' :
					if ( size > this.#fileSizeMap.xml ) {
						this.fileDetail.tooBigFiles.push(fileName)
						this.#failFlags.xml_too_big = true
					}
					break
				case '.grle' :
					this.#maxFilesType.grle--
					break
				case '.pdf' :
					this.#maxFilesType.pdf--
					break
				case '.txt' :
					this.#maxFilesType.txt--
					break
				case '.l64' :
				case '.dat' :
					this.fileDetail.extraFiles.push(fileName)
					this.#failFlags.might_be_crack = true
					break
				case '.gls' :
				case '.anim' :
				case '.ogg' :
					break
				default :
					this.fileDetail.extraFiles.push(fileName)
					this.#failFlags.has_extra_files = true
			}
		}
	}

	#loadZipIcon() {
		if ( this.#failFlags.bad_zip || this.#failFlags.no_modIcon ) { return }

		try {
			const zipFile  = new admZip(this.fileDetail.fullPath)
			const iconFile = zipFile.readFile(this.modDesc.iconFileName)
			this.#processIcon(iconFile.buffer)
		} catch (e) {
			this.#failFlags.no_modIcon = true
			this.#log.fileError(this.fileDetail.shortName, `Caught icon fail ${e}`)
		}
	}

	#loadFolderIcon() {
		try {
			const ddsBuffer = fs.readFileSync(path.join(this.fileDetail.fullPath, this.modDesc.iconFileName), null)
			this.#processIcon(ddsBuffer.buffer)
		} catch (e) {
			this.#failFlags.no_modIcon = true
			this.#log.fileError(this.fileDetail.shortName, `Caught icon fail ${e}`)
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

class notModFileChecker {
	modDesc = {
		descVersion    : 0,
		version        : 'n/a',
		author         : 'n/a',
		storeItems     : 0,
		scriptFiles    : 0,
		iconFileName   : false,
		iconImageCache : null,
		multiPlayer    : false,
		xmlDoc         : false,
		xmlParsed      : false,
	}

	issues = [
		'FILE_ERROR_NAME_INVALID',
		'FILE_ERROR_GARBAGE_FILE',
	]

	l10n = {
		title       : 'n/a',
		description : 'n/a',
	}

	md5Sum            = null
	uuid              = null
	giantsHash        = null
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
		tooBigFiles : [],
		spaceFiles  : [],
		pngTexture  : [],
	}

	badges        = '<span class="badge bg-danger"><l10n name="mod_badge_broken"></l10n></span><span class="badge bg-danger"><l10n name="mod_badge_notmod"></l10n></span>'
	canNotUse     = true
	currentLocale = null

	#log = null

	constructor( filePath, isFolder, size, date, log = null ) {
		this.fileDetail.fullPath = filePath
		this.fileDetail.size     = size
		this.fileDetail.fileDate = date.toISOString()

		this.#log      = log

		this.#log.notice('modEntry', `Adding NOT mod ${filePath}`)

		this.uuid = crypto.createHash('md5').update(filePath).digest('hex')

		this.fileDetail.shortName = path.basename(this.fileDetail.fullPath)
	}
}

module.exports = {
	modFileChecker    : modFileChecker,
	notModFileChecker : notModFileChecker,
}


