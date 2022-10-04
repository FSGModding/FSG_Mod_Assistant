/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Mod Checker Class


// const fs             = require('fs')
const path           = require('path')
// const glob           = require('glob')
// const xml2js         = require('xml2js')
// const StreamZip      = require('node-stream-zip')
// const decodeDXT      = require('decode-dxt')
// const parseDDS       = require('parse-dds')
// const PNG            = require('pngjs').PNG

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
		'might_by_crack', 'bad_modDesc'
	]

	modDesc = {
		descVersion    : 0,
		version        : '0.0.0.0',
		author         : '',
		storeItems     : 0,
		scriptFiles    : 0,
		iconFileName   : false,
		iconImageCache : false,
		multiPlayer    : false,
		xmlDoc         : false,
		xmlParsed      : false,
	}

	fileDetail = {
		isFolder    : false,
		fullPath    : false,
		shortName   : false,
		fileSize    : 0,
		copyName    : false,
		imageNonDDS : [],
		i3dFiles    : [],
		extraFiles  : [],
	}

	badges    = ''
	canNotUse = false

	#locale         = false
	#log            = null
	
	constructor( filePath, isFolder, log = null, locale = null ) {
		let stopProcess = false

		this.fileDetail.fullPath = filePath
		this.fileDetail.isFolder = isFolder

		this.#locale   = locale
		this.#log      = log

		this.#log.notice('modEntry', `Adding mod ${filePath}`)

		this.fileDetail.shortName = path.parse(this.fileDetail.fullPath).name

		this.#failFlags.folder_needs_zip = !isFolder

		if ( this.#isFileNameBad() ) {
			stopProcess = true
		}

		if ( ! stopProcess ) {
			//more test
		}

		this.badges = this.#getBadges()
	}

	#getBadges() {
		const badgeColor = {
			broken  : 'danger',
			problem : 'warning',
			noMP    : 'secondary',
			PCOnly  : 'info',
			folder  : 'info',
		}
		const badges = {
			broken  : false,
			problem : false,
			noMP    : ! this.modDesc.multiPlayer,
			PCOnly  : (this.modDesc.scriptFiles > 0),
			folder  : this.fileDetail.isFolder,
		}
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
}

module.exports = {
	modFileChecker : modFileChecker,
}


