/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Save Checker Class

const fs        = require('fs')
const path      = require('path')
const admZip    = require('adm-zip')
const xml2js    = require('xml2js')

class saveFileChecker {
	#fileName = null
	#isFolder = false
	#badSave  = false
	#log      = null

	singleFarm  = true
	mapMod      = null
	#placeables = {}
	farms       = {}
	#vehicles   = {}
	mods        = {}

	#xml = {
		parsed : {
			careerSavegame : null,
			farms          : null,
			placeables     : null,
			vehicles       : null,
		},
		raw    : {
			careerSavegame : null,
			farms          : null,
			placeables     : null,
			vehicles       : null,
		},
	}

	constructor( filePath, isFolder, log = null ) {
		this.#fileName = filePath
		this.#isFolder = isFolder
		this.#log      = log

		this.#log.notice('saveEntry', `Adding save ${filePath}`)

		if ( !isFolder ) {
			this.#readZip()
		} else {
			this.#readFolder()
		}
		if ( !this.#badSave ) {
			this.#processFarms()
			this.#processPlaceables()
			this.#processVehicles()
			this.#processCareer()
		}
	}

	#readZip() {
		let zipFile    = null
		let zipEntries = null
		try {
			zipFile    = new admZip(this.#fileName)
			zipEntries = zipFile.getEntries()
		} catch (e) {
			this.#badSave = true
			this.#log.fileError(this.#fileName, `ZIP open fail ${e}`)
			return
		}

		zipEntries.forEach((entry) => {
			switch ( entry.entryName ) {
				case 'placeables.xml' :
					this.#xml.raw.placeables = entry.getData().toString('utf8')
					break
				case 'farms.xml' :
					this.#xml.raw.farms = entry.getData().toString('utf8')
					break
				case 'careerSavegame.xml' :
					this.#xml.raw.careerSavegame = entry.getData().toString('utf8')
					break
				case 'vehicles.xml' :
					this.#xml.raw.vehicles = entry.getData().toString('utf8')
					break
				default:
					break
			}
		})
		
		zipFile = null
	}

	#readFolder() {
		try {
			this.#xml.raw.placeables = fs.readFileSync(path.join(this.#fileName, 'placeables.xml'), 'utf-8')
		} catch (e) {
			this.#log.notice(this.#fileName, 'No placeables.xml found')
		}
		try {
			this.#xml.raw.vehicles = fs.readFileSync(path.join(this.#fileName, 'vehicles.xml'), 'utf-8')
		} catch (e) {
			this.#log.notice(this.#fileName, 'No vehicles.xml found')
		}
		try {
			this.#xml.raw.farms = fs.readFileSync(path.join(this.#fileName, 'farms.xml'), 'utf-8')
		} catch (e) {
			this.#log.notice(this.#fileName, 'No farms.xml found')
		}
		try {
			this.#xml.raw.careerSavegame = fs.readFileSync(path.join(this.#fileName, 'careerSavegame.xml'), 'utf-8')
		} catch (e) {
			this.#log.notice(this.#fileName, 'No careerSavegame.xml found')
		}
	}

	#processFarms() {
		if ( this.#xml.raw.farms === null ) { return }
		const XMLOptions = {strict : true, async : false, normalizeTags : true, attrNameProcessors : [function(name) { return name.toUpperCase() }] }
		const strictXMLParser = new xml2js.Parser(XMLOptions)

		try {
			strictXMLParser.parseString(this.#xml.raw.farms, (err, result) => {
				if ( err === null ) {
					this.#xml.parsed.farms = result
				}
			})
		} catch (e) {
			this.#log.fileError(this.#fileName, `Parsing farms.xml failed: ${e}`)
		}
		try {
			this.#xml.parsed.farms.farms.farm.forEach((thisFarm) => {
				this.farms[parseInt(thisFarm.$.FARMID)] = thisFarm.$.NAME
			})
		} catch (e) {
			this.#log.fileError(this.#fileName, `Parsing farms.xml failed: ${e}`)
		}
		if ( Object.keys(this.farms).length > 1 ) { this.singleFarm = false }
		this.farms[0] = '--unowned--'
	}

	#processPlaceables() {
		if ( this.#xml.raw.placeables === null ) { return }
		const XMLOptions = {strict : true, async : false, normalizeTags : true, attrNameProcessors : [function(name) { return name.toUpperCase() }] }
		const strictXMLParser = new xml2js.Parser(XMLOptions)

		try {
			strictXMLParser.parseString(this.#xml.raw.placeables, (err, result) => {
				if ( err === null ) {
					this.#xml.parsed.placeables = result
				}
			})
		} catch (e) {
			this.#log.fileError(this.#fileName, `Parsing placeables.xml failed: ${e}`)
		}
		try {
			this.#xml.parsed.placeables.placeables.placeable.forEach((thisPlace) => {
				const modName = thisPlace.$.MODNAME
				const farmID  = thisPlace.$.FARMID
				if ( typeof modName !== 'undefined' ) {
					if (typeof this.#placeables[modName] === 'undefined' ) {
						this.#placeables[modName] = new Set(farmID)
					} else {
						this.#placeables[modName].add(farmID)
					}
				}
			})
		} catch (e) {
			this.#log.fileError(this.#fileName, `Parsing placeables.xml failed: ${e}`)
		}
	}

	#processVehicles() {
		if ( this.#xml.raw.vehicles === null ) { return }
		const XMLOptions = {strict : true, async : false, normalizeTags : true, attrNameProcessors : [function(name) { return name.toUpperCase() }] }
		const strictXMLParser = new xml2js.Parser(XMLOptions)

		try {
			strictXMLParser.parseString(this.#xml.raw.vehicles, (err, result) => {
				if ( err === null ) {
					this.#xml.parsed.vehicles = result
				}
			})
		} catch (e) {
			this.#log.fileError(this.#fileName, `Parsing vehicles.xml failed: ${e}`)
		}
		try {
			this.#xml.parsed.vehicles.vehicles.vehicle.forEach((thisVehicle) => {
				const modName = thisVehicle.$.MODNAME
				const farmID  = thisVehicle.$.FARMID
				if ( typeof modName !== 'undefined' ) {
					if (typeof this.#vehicles[modName] === 'undefined' ) {
						this.#vehicles[modName] = new Set(farmID)
					} else {
						this.#vehicles[modName].add(farmID)
					}
				}
			})
		} catch (e) {
			this.#log.fileError(this.#fileName, `Parsing vehicles.xml failed: ${e}`)
		}
	}

	#processCareer() {
		if ( this.#xml.raw.careerSavegame === null ) { return }
		const XMLOptions = {strict : true, async : false, normalizeTags : true, attrNameProcessors : [function(name) { return name.toUpperCase() }] }
		const strictXMLParser = new xml2js.Parser(XMLOptions)

		try {
			strictXMLParser.parseString(this.#xml.raw.careerSavegame, (err, result) => {
				if ( err === null ) {
					this.#xml.parsed.careerSavegame = result
				}
			})
		} catch (e) {
			this.#log.fileError(this.#fileName, `Parsing careerSavegame.xml failed: ${e}`)
		}
		try {
			this.mapMod = this.#xml.parsed.careerSavegame.careersavegame.settings[0].mapid[0].split('.')[0]
			this.#xml.parsed.careerSavegame.careersavegame.mod.forEach((thisMod) => {
				const modName    = thisMod.$.MODNAME
				const modTitle   = thisMod.$.TITLE
				const modVersion = thisMod.$.VERSION
				if ( typeof modName !== 'undefined' ) {
					const farmIDs = new Set()
					if (typeof this.mods[modName] === 'undefined' ) {
						this.mods[modName] = {
							version : modVersion,
							title   : modTitle,
							farms   : new Set(),
						}
					}
					if ( typeof this.#placeables[modName] !== 'undefined') {
						this.#placeables[modName].forEach((farmID) => { farmIDs.add(farmID) })
					}
					if ( typeof this.#vehicles[modName] !== 'undefined' ) {
						this.#vehicles[modName].forEach((farmID) => { farmIDs.add(farmID) })
					}

					Array.from(farmIDs).sort((a, b) => a - b).forEach((farmID) => {
						this.mods[modName].farms.add(this.farms[farmID])
					})
				}
			})
		} catch (e) {
			this.#log.fileError(this.#fileName, `Parsing careerSavegame.xml failed: ${e}`)
		}
	}
}


// #processModDesc() {
// 	const XMLOptions = {strict : true, async : false, normalizeTags : true, attrNameProcessors : [function(name) { return name.toUpperCase() }] }
// 	const strictXMLParser = new xml2js.Parser(XMLOptions)
		
// 	/* Read modDesc.xml */
// 	strictXMLParser.parseString(this.modDesc.xmlDoc, (err, result) => {
// 		if ( err !== null ) {
// 			/* XML Parse failed, lets try to recover */
// 			this.#log.fileError(this.fileDetail.shortName, `Caught XML Parse error: ${err}`)
// 			this.#failFlags.bad_modDesc = true
// 			XMLOptions.strict = false
// 			const looseXMLParser = new xml2js.Parser(XMLOptions)

// 			looseXMLParser.parseString(this.modDesc.xmlDoc, (err, result) => {
// 				if ( err !== null ) {
// 					/* Couldn't recover */
// 					this.#log.fileError(this.fileDetail.shortName, `Caught unrecoverable XML Parse error: ${err}`)
// 					this.#failFlags.bad_modDesc_no_rec = true
// 					return false
// 				}
// 				this.modDesc.xmlParsed = result
// 			})
// 		} else {
// 			this.modDesc.xmlParsed = result
// 		}
// 	})

// 	/* Get modDesc.xml version */
// 	if ( this.#nestedXMLProperty('moddesc.$.DESCVERSION') ) {
// 		this.modDesc.descVersion = parseInt(this.modDesc.xmlParsed.moddesc.$.DESCVERSION)
// 		if ( this.modDesc.descVersion < 60 ) {
// 			this.#failFlags.bad_modDesc_ver = true
// 		}
// 	} else {
// 		this.#failFlags.bad_modDesc_ver = true
// 		return false
// 	}

// 	/* Get MOD Version */
// 	if ( this.#nestedXMLProperty('moddesc.version') ) {
// 		this.modDesc.version = this.modDesc.xmlParsed.moddesc.version.toString()
// 	} else {
// 		this.#failFlags.no_modVer = true
// 		return false
// 	}

// 	/* Set the mod author (safe fail, I think) */
// 	if ( this.#nestedXMLProperty('moddesc.author') ) {
// 		this.modDesc.author = this.modDesc.xmlParsed.moddesc.author.toString()
// 	}

// 	if ( this.#nestedXMLProperty('moddesc.multiplayer') ) {
// 		try {
// 			if ( this.modDesc.xmlParsed.moddesc.multiplayer[0].$.SUPPORTED === 'true' ) {
// 				this.modDesc.multiPlayer = true
// 			}
// 		} catch {
// 			this.modDesc.multiPlayer = false
// 		}
// 	}

// 	/* Count storeitems */
// 	if ( this.#nestedXMLProperty('moddesc.storeitems') ) {
// 		try {
// 			this.modDesc.storeItems = this.modDesc.xmlParsed.moddesc.storeitems[0].storeitem.length
// 		} catch {
// 			this.modDesc.storeItems = 0
// 		}
// 	}
		
// 	/* Get icon filename */
// 	if ( this.#nestedXMLProperty('moddesc.iconfilename') ) {
// 		// NOTE: don't attempt to load png, if it's there.  We can't read it anyway
// 		let tempIcon = this.modDesc.xmlParsed.moddesc.iconfilename[0].toString()
// 		if ( ! tempIcon.endsWith('.dds') ) {
// 			tempIcon = `${tempIcon.slice(0, -4)}.dds`
// 		}
// 		if ( this.fileDetail.imageDDS.includes(tempIcon) ) {
// 			this.modDesc.iconFileName = tempIcon
// 		} else {
// 			this.#failFlags.no_modIcon = true
// 		}
// 	} else {
// 		this.#failFlags.no_modIcon = true
// 		return false
// 	}

// 	if ( this.#nestedXMLProperty('moddesc.productid') ) {
// 		this.#failFlags.might_be_crack = true
// 	}

// 	return true
// }


// #testZip() {
// 	let zipFile    = null
// 	let zipEntries = null

// 	try {
// 		zipFile = new admZip(this.fileDetail.fullPath)
// 		zipEntries = zipFile.getEntries()
// 	} catch (e) {
// 		this.#failFlags.bad_zip = true
// 		this.#log.fileError(this.fileDetail.shortName, `ZIP open fail ${e}`)
// 		return
// 	}
	
// 	this.#failFlags.grle_too_many = ( this.#maxFilesType.grle < 1 )
// 	this.#failFlags.png_too_many  = ( this.#maxFilesType.png < 1 )
// 	this.#failFlags.pdf_too_many  = ( this.#maxFilesType.pdf < 1 )
// 	this.#failFlags.txt_too_many  = ( this.#maxFilesType.txt < 1 )

// 	try {
// 		this.modDesc.xmlDoc = zipFile.readAsText('modDesc.xml')
// 	} catch (e) {
// 		this.#failFlags.no_modDesc = true
// 		this.#log.fileError(this.fileDetail.shortName, `Zip missing file: modDesc.xml: ${e}`)
// 	}

// 	if ( ! this.#failFlags.no_modDesc ) {
// 		this.#processModDesc()
// 	}

// 	zipFile = null
// }



// #nestedXMLProperty (propertyPath, passedObj = false) {
// 	if (!propertyPath) { return false }

// 	const properties = propertyPath.split('.')
// 	let obj = ( passedObj === false ? this.modDesc.xmlParsed : passedObj )

// 	for (let i = 0; i < properties.length; i++) {
// 		const prop = properties[i]

// 		if (!obj || !Object.prototype.hasOwnProperty.call(obj, prop)) {
// 			return false
// 		}
		
// 		obj = obj[prop]
// 	}

// 	return true
// }


module.exports = {
	saveFileChecker : saveFileChecker,
}


