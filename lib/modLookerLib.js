/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Mod Looker Class
/*eslint complexity: ["warn", 15]*/

const fs        = require('fs')
const path      = require('path')
const admZip    = require('adm-zip')
const xml2js    = require('xml2js')
const { decodeDXT, parseDDS }  = require('./ddsLibrary')
const PNG       = require('pngjs').PNG
const allLang   = require('./modLookerLang.json')
const cp        = require('child_process')

class modLooker {
	#converter      = null
	#fullFileName   = null
	#locale         = false
	#log            = null
	#logUUID        = null
	#modIsFolder    = true
	#modRecord      = null
	#path           = null
	#skipIcons      = false
	#tempFolder     = null
	#tempSubDir     = null
	#zipFile        = null

	#langData = {
		base : {},
		mod  : {},
	}

	#infoData = {
		brands : {},
		icons  : {},
		items  : {},
	}

	constructor( converter, tempFolder, modRecord, modCollectFolder, log = null, locale = 'en', skipIcons = false ) {
		// modRecord from collection, folder for collection, log class, locale string
		this.#converter  = fs.existsSync(converter) ? converter : null
		this.#locale     = locale
		this.#log        = log
		this.#logUUID    = `modLook-${modRecord.fileDetail.shortName}`
		this.#modRecord  = modRecord
		this.#path       = modCollectFolder
		this.#skipIcons  = skipIcons
		this.#tempFolder = fs.existsSync(tempFolder) ? tempFolder : null
		this.#tempSubDir = 'x'.repeat(5).replace(/./g, () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62) ] )

		this.#fullFileName = path.join(this.#path, path.basename(this.#modRecord.fileDetail.fullPath))

		this.#langData.base = allLang[this.#locale]
	}

	async getInfo() {
		if ( ! this.#modRecord.fileDetail.isFolder ) {
			this.#modIsFolder = false

			this.#zipFile = new admZip(this.#fullFileName)
		}

		const modDescTree     = this.#getXMLFile('modDesc.xml')
		const storeItemFiles  = this.#getStoreItems(modDescTree)

		this.#infoData.brands = this.#getExtraBrands(modDescTree)

		this.#langData.mod = this.#getLangKeys(modDescTree)

		for ( const thisItem of storeItemFiles ) {
			const thisItemTree = this.#getXMLFile(thisItem)
			const thisItemInfo = this.#parseStoreItem(thisItemTree)

			if ( thisItemInfo !== null ) {
				this.#infoData.items[thisItem] = thisItemInfo

				if ( !this.#skipIcons && thisItemInfo.icon !== null ) {
					const thisItemIcon = this.#loadIcon(thisItemInfo.icon)

					if ( thisItemIcon !== null ) {
						this.#infoData.icons[thisItem] = thisItemIcon
					}
				}
			}
		}

		if ( ! this.#modRecord.fileDetail.isFolder ) { this.#zipFile = null }

		const realFolder = path.join(this.#tempFolder, `fsgMA_${this.#tempSubDir}`)
		if ( fs.existsSync(realFolder) ) { fs.rmdirSync(realFolder) }

		return this.#infoData
	}

	#getXMLFile(name) {
		let fileContents = null
		let xmlTree      = null

		try {
			if ( this.#modIsFolder ) {
				const fullName = path.join(this.#fullFileName, name)
				if ( fs.existsSync(fullName) ) {
					fileContents = fs.readFileSync(fullName, 'utf-8')
				}
			} else if ( this.#zipFile.getEntry(name) !== null) {
				fileContents = this.#zipFile.readAsText(name)
			}
		} catch (e) {
			this.#log.log.notice(`File Read Failure: ${name} :: ${e}`, this.#logUUID)
		}
		
		const XMLParser = new xml2js.Parser({
			async              : false,
			attrNameProcessors : [function(name) { return name.toUpperCase() }],
			normalizeTags      : true,
			strict             : false,
		})

		if ( fileContents !== null ) {
			XMLParser.parseString(fileContents, (err, result) => {
				if ( err !== null ) {
					this.#log.log.warning(`File Parse Failure: ${name} :: ${err}`, this.#logUUID)
					xmlTree = null
				} else {
					xmlTree = result
				}
			})
		}

		return xmlTree
	}

	#getLangKeys(modDescTree) {
		const langByKey = {}

		if ( modDescTree !== null ) {
			if ( typeof modDescTree.moddesc.l10n !== 'undefined' ) {

				const fileName = modDescTree.moddesc.l10n?.[0]?.$?.FILENAMEPREFIX || null

				if ( fileName !== null ) {
					for ( const langKey of [this.#locale, 'en', 'de'] ) {
						const langFile = this.#getXMLFile(`${fileName}_${langKey}.xml`)
						if ( langFile !== null ) {
							if ( typeof langFile.l10n.texts !== 'undefined' ) {
								for ( const thisText of langFile.l10n.texts[0].text ) {
									langByKey[thisText.$.NAME] = thisText.$.TEXT
								}
								break
							}
							if ( typeof langFile.l10n.elements !== 'undefined' ) {
								for ( const thisText of langFile.l10n.elements[0].e ) {
									langByKey[thisText.$.K] = thisText.$.V
								}
								break
							}
						}
					}
				} else {
					for ( const thisText of modDescTree.moddesc.l10n[0].text ) {
						for ( const langKey of [this.#locale, 'en', 'de'] ) {
							if ( Object.hasOwn(thisText, langKey) ) {
								langByKey[thisText.$.NAME] = thisText[langKey][0]
								break
							}
						}
					}
				}
			}
		}
		return langByKey
	}

	#getExtraBrands(modDescTree) {
		const addBrands = {}
		if ( typeof modDescTree.moddesc.brands?.[0]?.brand === 'undefined' ) { return addBrands }

		for ( const thisBrand of modDescTree.moddesc.brands[0].brand ) {
			const thisName = thisBrand?.$?.NAME || null

			if ( thisName !== null ) {
				addBrands[thisName] = {
					title : thisBrand?.$?.TITLE || thisName,
					icon  : !this.#skipIcons ? this.#loadIcon(thisBrand?.$?.IMAGE) : null,
				}
			}
		}
		return addBrands
	}

	#getStoreItems(modDescTree) {
		const storeItemFiles = []

		if ( modDescTree !== null ) {
			for ( const thisItem of modDescTree.moddesc.storeitems[0].storeitem ) {
				storeItemFiles.push(thisItem.$.XMLFILENAME)
			}
		}
		return storeItemFiles
	}

	#parseStoreItem(storeItemTree) {
		if ( storeItemTree === null ) { return null }

		const storeType = Object.keys(storeItemTree)[0]

		switch ( storeType ) {
			case 'vehicle' :
				return this.#parseVehicle(storeItemTree.vehicle)
			case 'placeable' :
				return this.#parsePlace(storeItemTree.placeable)
			default :
				return null
		}
	}

	#loadIcon(iconFile) {
		if ( typeof iconFile === 'undefined' || iconFile === null ) { return null }

		const fileName = ( ! iconFile.endsWith('.dds') ) ? `${iconFile.slice(0, -4)}.dds` : iconFile

		try {
			/* redo for direct access */
			if ( !this.#modIsFolder ) {
				if ( this.#zipFile.getEntry(fileName) !== null ) {
					return this.#processIcon(this.#zipFile.readFile(fileName).buffer)
				}
				return null
			}
			
			const fullFileName = path.join(this.#fullFileName, fileName)

			if ( fs.existsSync(fullFileName) ) {
				return this.#processIcon(fs.readFileSync(fullFileName, null).buffer)
			}

			return null
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

			if ( ddsData.format === 'dxt10' && this.#converter !== null && this.#tempFolder !== null ) {
				const realFolder = path.join(this.#tempFolder, `fsgMA_${this.#tempSubDir}`)
				const tempName   = 'x'.repeat(5).replace(/./g, () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62) ] )

				if ( !fs.existsSync(realFolder) ) { fs.mkdirSync(realFolder) }

				fs.writeFileSync(path.join(realFolder, `${tempName}.dds`), Buffer.from(buffer))
				cp.execSync(`"${this.#converter}" "${path.join(realFolder, tempName)}.dds" -pow2 -ft jpg -srgb -o "${realFolder}"`)
				//-rotatecolor HDR10to709
				imageReturn = `data:image/png;base64, ${fs.readFileSync(path.join(realFolder, `${tempName}.jpg`), 'base64')}`

				fs.rmSync(path.join(realFolder, `${tempName}.dds`))
				fs.rmSync(path.join(realFolder, `${tempName}.jpg`))

				return imageReturn
			}

			// get the first mipmap texture
			const image         = ddsData.images[0]
			const imageWidth    = image.shape[0]
			const imageHeight   = image.shape[1]
			const imageDataView = new DataView(buffer, image.offset, image.length)

			// convert the DXT texture to an Uint8Array containing RGBA data
			const rgbaData = decodeDXT(imageDataView, imageWidth, imageHeight, ddsData.format)

			// convert to PNG

			const pngData = new PNG({ width : imageWidth, height : imageHeight })

			pngData.data = rgbaData

			try {
				const pngBuffer = PNG.sync.write(pngData)
			
				imageReturn = `data:image/png;base64, ${pngBuffer.toString('base64')}`
			} catch {
				imageReturn = null
			}

		} catch (err) {
			this.#log.log.notice(this.#modRecord.fileDetail.shortName, `Unknown icon processing error: ${err}`)
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

	#translate_single(key) {
		if ( typeof key === 'boolean' ) { return key }
		if ( key.startsWith('$l10n') ) {
			const searchKey = key.substring(6)

			if ( Object.hasOwn(this.#langData.mod, searchKey) ) {
				return this.#langData.mod[searchKey]
			}
			
			if ( Object.hasOwn(this.#langData.base, searchKey) ) {
				return this.#langData.base[searchKey]
			}
		}
		return key
	}

	#translate(keys) {
		switch ( typeof keys ) {
			case 'boolean' :
				return keys
			case 'string':
				return this.#translate_single(keys)
			case 'object':
				return keys.map((key) => this.#translate_single(key))
			default :
				return keys
		}
	}

	#parsePlace(xml) {
		const storeData = xml.storedata[0]

		return {
			category       : storeData?.category?.[0] || null,
			functions      : this.#translate(storeData?.functions?.[0]?.function || []),
			hasColor       : xml?.colorable?.[0]?.colors?.[0]?.color?.length > 1,
			icon           : storeData?.image?.[0] || null,
			masterType     : 'placeable',
			name           : this.#parseName(storeData?.name?.[0] || 'unknown'),
			price          : storeData?.price?.[0] || 0,
			type           : xml.$.TYPE,
		}
	}

	#parseFillTypes(xml) {
		if ( typeof xml === 'undefined' ) { return 0 }

		const fillUnits = xml[0]?.fillunitconfigurations?.[0]?.fillunitconfiguration?.[0]?.fillunits?.[0].fillunit

		let totalFill = 0

		if ( fillUnits !== null ) {
			for ( const thisFill of fillUnits ) {
				if ( thisFill?.$?.SHOWINSHOP !== 'false' ) {
					totalFill += parseInt(thisFill?.$?.CAPACITY || 0)
				}
			}
		}
		return totalFill
	}

	#parseWeight(xml) {
		if ( typeof xml === 'undefined' ) { return 0 }

		let totalWeight = 0

		for ( const thisComp of xml ) {
			totalWeight += parseInt(thisComp?.$?.MASS || 0)
		}
		return totalWeight
	}

	#parseVehicle(xml) {
		const storeData = xml.storedata[0]

		if ( typeof storeData?.bundleelements !== 'undefined' ) { return null }

		return {
			brand          : storeData?.brand?.[0] || null,
			category       : storeData?.category?.[0] || null,
			fillLevel      : this.#parseFillTypes(xml.fillunit),
			fuelType       : xml?.motorized?.[0]?.consumerconfigurations?.[0].consumerconfiguration?.[0]?.consumer?.[0]?.$?.FILLTYPE || false,
			functions      : this.#translate(storeData?.functions?.[0]?.function || []),
			hasBeacons     : typeof xml?.lights?.[0]?.beaconlights !== 'undefined',
			hasColor       : typeof xml.basematerialconfigurations !== 'undefined',
			hasLights      : typeof xml?.lights?.[0]?.reallights !== 'undefined',
			hasWheelChoice : xml.wheels?.[0]?.wheelconfigurations?.[0]?.wheelconfiguration.length > 1,
			icon           : storeData?.image?.[0] || null,
			isEnterable    : typeof xml.enterable !== 'undefined',
			isMotorized    : typeof xml.motorized !== 'undefined',
			masterType     : 'vehicle',
			name           : this.#parseName(storeData?.name?.[0] || 'unknown'),
			price          : storeData?.price?.[0] || 0,
			specs          : this.#unwrapXML(storeData?.specs?.[0]),
			transType      : this.#translate(xml?.motorized?.[0]?.motorconfigurations?.[0].motorconfiguration?.[0]?.transmission?.[0]?.$?.NAME || false),
			type           : xml.$.TYPE,
			typeDesc       : this.#translate(xml.base[0]?.typedesc?.[0] || 'unknown'),
			weight         : this.#parseWeight(xml.base?.[0]?.components?.[0]?.component),
		}
	}

	#parseName(xml) {
		if ( typeof xml === 'string' ) { return this.#translate(xml) }

		if ( Object.hasOwn(xml, this.#locale) ) { return xml[this.#locale][0] }
		if ( Object.hasOwn(xml, 'en') ) { return xml.en[0] }
		if ( Object.hasOwn(xml, 'de') ) { return xml.de[0] }
	}
}

module.exports = {
	modLooker : modLooker,
}