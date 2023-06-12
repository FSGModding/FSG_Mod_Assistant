/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Mod Looker Class
/*eslint complexity: ["warn", 10]*/

const fs        = require('fs')
const path      = require('path')
const admZip    = require('adm-zip')
const xml2js    = require('xml2js')
const { decodeDXT, parseDDS }  = require('./ddsLibrary')
const JPEG      = require('jpeg-js')
const allLang   = require('./modLookerLang.json')

class modLooker {
	#locale         = false
	#log            = null
	#logUUID        = null
	#modRecord      = null
	#zipFile        = null
	#path           = null
	#modIsFolder    = true
	#fullFileName   = null

	#XMLOptions = {
		async              : false,
		attrNameProcessors : [function(name) { return name.toUpperCase() }],
		normalizeTags      : true,
		strict             : false,
	}

	constructor( modRecord, modCollectFolder, log = null, locale = 'en' ) {
		// modRecord from collection, folder for collection, log class, locale string
		this.#path      = modCollectFolder
		this.#modRecord = modRecord
		this.#locale    = locale
		this.#log       = log
		this.#logUUID   = `modLook-${this.#modRecord.fileDetail.shortName}`

		this.#fullFileName = path.join(this.#path, path.basename(this.#modRecord.fileDetail.fullPath))
	}

	async getInfo() {
		const infoData = {
			items : {},
			lang  : {},
			base  : allLang[this.#locale],
		}
		if ( ! this.#modRecord.fileDetail.isFolder ) {
			this.#modIsFolder = false

			this.#zipFile = new admZip(this.#fullFileName)
		}

		const modDescContents = this.#getTextFile('modDesc.xml')
		const storeItemFiles  = this.#getStoreItems(modDescContents)

		infoData.lang = this.#getLangKeys(modDescContents)

		for ( const thisItem of storeItemFiles ) {
			const thisItemContents = this.#getTextFile(thisItem)

			infoData.items[thisItem] = this.#parseStoreItem(thisItemContents)
		}

		if ( ! this.#modRecord.fileDetail.isFolder ) { this.#zipFile = null }

		return infoData
	}

	#getTextFile(name) {
		try {
			if ( this.#modIsFolder ) {
				const fullName = path.join(this.#fullFileName, name)
				if ( fs.existsSync(fullName) ) {
					return fs.readFileSync(fullName, 'utf-8')
				}
			} else if ( this.#zipFile.getEntry(name) !== null) {
				return this.#zipFile.readAsText(name)
			}
		} catch (e) {
			this.#log.log.notice(`File Failure: ${e}`, this.#logUUID)
		}
		return ''
	}

	#getLangKeys(modDescContents) {
		const langByKey = {}
		const XMLParser = new xml2js.Parser(this.#XMLOptions)

		XMLParser.parseString(modDescContents, (err, result) => {
			if ( err !== null ) {
				this.#log.log.warning(`Caught unrecoverable XML Parse error: ${err}`, this.#logUUID)
				return
			}
			if ( typeof result.moddesc.l10n !== 'undefined' ) {
				const fileName = result.moddesc.l10n?.[0]?.$?.FILENAMEPREFIX || null
				if ( fileName !== null ) {
					const langFile = this.#getTextFile(`${fileName}_${this.#locale}.xml`)
					XMLParser.parseString(langFile, (err2, result2) => {
						if ( err2 !== null ) {
							this.#log.log.warning(`Caught unrecoverable XML Parse error: ${err}`, this.#logUUID)
							return
						}
						for ( const thisText of result2.l10n.texts[0].text ) {
							langByKey[thisText.$.NAME] = thisText.$.TEXT
						}
					})
				} else {
					for ( const thisText of result.moddesc.l10n[0].text ) {
						if ( Object.hasOwn(thisText, this.#locale) ) {
							langByKey[thisText.$.NAME] = thisText[this.#locale][0]
						} else if ( Object.hasOwn(thisText, 'en') ) {
							langByKey[thisText.$.NAME] = thisText.en[0]
						} else if ( Object.hasOwn(thisText, 'de') ) {
							langByKey[thisText.$.NAME] = thisText.de[0]
						}
					}
				}
			}
		})
		return langByKey
	}

	#getStoreItems(modDescContents) {
		const storeItemFiles = []
		const XMLParser = new xml2js.Parser(this.#XMLOptions)

		XMLParser.parseString(modDescContents, (err, result) => {
			if ( err !== null ) {
				this.#log.log.warning(`Caught unrecoverable XML Parse error: ${err}`, this.#logUUID)
				return []
			}
			try {
				for ( const thisItem of result.moddesc.storeitems[0].storeitem ) {
					storeItemFiles.push(thisItem.$.XMLFILENAME)
				}
			} catch (e) {
				this.#log.log.warning(`Storeitems could not be read: ${err}`, this.#logUUID)
			}
		})
		return storeItemFiles
	}

	#parseStoreItem(storeItemContents) {
		let returnValue = {}
		const XMLParser = new xml2js.Parser(this.#XMLOptions)

		XMLParser.parseString(storeItemContents, (err, result) => {
			if ( err !== null ) {
				this.#log.log.warning(`Caught unrecoverable XML Parse error: ${err}`, this.#logUUID)
				return
			}
			const storeType = Object.keys(result)[0]

			if ( storeType === 'vehicle' ) {
				returnValue = this.#parseVehicle(result.vehicle)
			} else if ( storeType === 'placeable' ) {
				returnValue = this.#parsePlace(result.placeable)
			}
		})
		if ( typeof returnValue.icon !== 'undefined' && returnValue.icon !== null ) {
			returnValue.iconImage = this.#loadIcon(returnValue.icon)
		}
		return returnValue
	}

	#loadIcon(iconFile) {
		let tempIcon = iconFile

		if ( ! iconFile.endsWith('.dds') ) {
			tempIcon = `${iconFile.slice(0, -4)}.dds`
		}

		try {
			if ( this.#modRecord.fileDetail.imageDDS.includes(tempIcon) ) {
				if ( !this.#modIsFolder ) {
					return this.#processIcon(this.#zipFile.readFile(tempIcon).buffer)
				}
				return this.#processIcon(fs.readFileSync(path.join(this.fileDetail.fullPath, this.modDesc.iconFileName), null))
			}
		} catch (err) {
			this.#log.log.warning(`Caught image error: ${err}`, this.#logUUID)
		}
		return null
	}

	#processIcon(buffer) {
		let imageReturn = null

		if ( buffer === null ) { return null }
		
		try {
			const ddsData   = parseDDS(buffer)

			// get the first mipmap texture
			const image         = ddsData.images[0]
			const imageWidth    = image.shape[0]
			const imageHeight   = image.shape[1]
			const imageDataView = new DataView(buffer, image.offset, image.length)

			// convert the DXT texture to an Uint8Array containing RGBA data
			const rgbaData = decodeDXT(imageDataView, imageWidth, imageHeight, ddsData.format)

			// convert to JPEG
			const jpgData = JPEG.encode({
				width  : imageWidth,
				height : imageHeight,
				data   : rgbaData,
			}, 70)

			try {
				imageReturn = `data:image/jpeg;base64, ${jpgData.data.toString('base64')}`
			} catch {
				imageReturn = null
			}

		} catch (err) {
			this.#log.log.notice(this.fileDetail.shortName, `Unknown icon processing error: ${err}`)
		}
		return imageReturn
	}

	#unwrapXML(xml) {
		const returner = {}
		if ( typeof xml === 'undefined' ) { return {} }

		for ( const key in xml ) {
			if ( key !== 'combination' ) {
				returner[key] = xml[key][0]
			}
		}
		return returner
	}

	#parsePlace(xml) {
		return {
			category       : xml.storedata[0]?.category?.[0] || null,
			functions      : xml.storedata[0]?.functions?.[0]?.function || [],
			hasColor       : typeof xml.colorable !== 'undefined',
			icon           : xml.storedata[0].image[0] || null,
			name           : xml.storedata[0]?.name?.[0] || 'unknown',
			price          : xml.storedata[0]?.price?.[0] || 0,
			type           : xml.$.TYPE,
		}
	}
	#parseVehicle(xml) {
		return {
			brand          : xml.storedata[0]?.brand?.[0] || null,
			category       : xml.storedata[0]?.category?.[0] || null,
			functions      : xml.storedata[0]?.functions?.[0]?.function || [],
			hasColor       : typeof xml.basematerialconfigurations !== 'undefined',
			hasLights      : typeof xml.lights !== 'undefined',
			hasWheelChoice : xml.wheels[0]?.wheelconfigurations?.[0]?.wheelconfiguration.length > 1,
			icon           : xml.storedata[0].image[0] || null,
			name           : xml.storedata[0]?.name?.[0] || 'unknown',
			price          : xml.storedata[0]?.price?.[0] || 0,
			specs          : this.#unwrapXML(xml.storedata[0]?.specs?.[0]),
			type           : xml.$.TYPE,
			typeDesc       : xml.base[0]?.typedesc?.[0] || null,
		}
	}
}

// module.exports = {
// 	modLooker : modLooker,
// }

/* eslint-disable */

const fullPath = 'C:\\Users\\jtsag\\Documents\\My Games\\FarmingSimulator2022\\mods\\fsg_realism\\'
const modName  = 'FSG_eTractors_Pack'
// const fullPath = 'C:\\Users\\jtsag\\Documents\\My Games\\FarmingSimulator2022\\mods\\~test_mods\\'
// const modName  = 'FS22_RedBarnPack'

const { ma_logger }         = require('./ma-logger.js')
const looker = new modLooker(
	{
		fileDetail : {
			fullPath  : path.join(fullPath, `${modName}.zip`),
			imageDDS  : [],
			isFolder  : false,
			shortName : modName,
		},
	},
	fullPath,
	new ma_logger('multi-test')
)

looker.getInfo().then((result) => {
	console.log(result)
})





