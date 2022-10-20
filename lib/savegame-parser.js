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

module.exports = {
	saveFileChecker : saveFileChecker,
}


