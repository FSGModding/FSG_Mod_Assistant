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
	#logName  = null
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
		this.#logName  = `savegame-${path.basename(filePath)}`
		this.#log      = log
		this.errorList = []

		this.#log.log.info(`Adding Save: ${filePath}`, this.#logName)

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
			this.#log.log.danger(`Zip Open Fail: ${e}`, this.#logName)
			return
		}

		for ( const entry of zipEntries ) {
			try {
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
			} catch (e) {
				this.#log.log.danger(`Unreadable file: ${entry.entryName} :: ${e}`, this.#logName)
				this.errorList.push(['SAVEGAME_UNREADABLE', entry.entryName])
			}
		}
		
		zipFile = null
	}

	#readFolder() {
		try {
			this.#xml.raw.placeables = fs.readFileSync(path.join(this.#fileName, 'placeables.xml'), 'utf-8')
		} catch (e) {
			this.#log.log.notice('No placeables.xml found', this.#logName)
			this.errorList.push(['SAVEGAME_UNREADABLE', 'placeables.xml'])
		}
		try {
			this.#xml.raw.vehicles = fs.readFileSync(path.join(this.#fileName, 'vehicles.xml'), 'utf-8')
		} catch (e) {
			this.#log.log.notice('No vehicles.xml found', this.#logName)
			this.errorList.push(['SAVEGAME_UNREADABLE', 'vehicles.xml'])
		}
		try {
			this.#xml.raw.farms = fs.readFileSync(path.join(this.#fileName, 'farms.xml'), 'utf-8')
		} catch (e) {
			this.#log.log.notice('No farms.xml found', this.#logName)
			this.errorList.push(['SAVEGAME_UNREADABLE', 'farms.xml'])
		}
		try {
			this.#xml.raw.careerSavegame = fs.readFileSync(path.join(this.#fileName, 'careerSavegame.xml'), 'utf-8')
		} catch (e) {
			this.#log.log.notice('No careerSavegame.xml found', this.#logName)
			this.errorList.push(['SAVEGAME_UNREADABLE', 'careerSavegame.xml'])
		}
	}

	#processFarms() {
		if ( this.#xml.raw.farms === null ) {
			this.errorList.push(['SAVEGAME_PARSE_ERROR', 'farms.xml'])
			return
		}
		const XMLOptions = {
			async              : false,
			attrNameProcessors : [function(name) { return name.toUpperCase() }],
			normalizeTags      : true,
			strict             : true,
		}
		const strictXMLParser = new xml2js.Parser(XMLOptions)

		try {
			strictXMLParser.parseString(this.#xml.raw.farms, (err, result) => {
				if ( err === null ) {
					this.#xml.parsed.farms = result
				}
			})
		} catch (e) {
			this.errorList.push(['SAVEGAME_PARSE_ERROR', 'farms.xml'])
			this.#log.log.danger(`Parsing farms.xml failed: ${e}`, this.#logName)
		}
		try {
			for ( const thisFarm of this.#xml.parsed.farms.farms.farm ) {
				this.farms[parseInt(thisFarm.$.FARMID)] = thisFarm.$.NAME
			}
		} catch (e) {
			this.errorList.push(['SAVEGAME_PARSE_ERROR', 'farms.xml'])
			this.#log.log.danger(`Parsing farms.xml failed: ${e}`, this.#logName)
		}
		if ( Object.keys(this.farms).length > 1 ) { this.singleFarm = false }
		this.farms[0] = '--unowned--'
	}

	#processPlaceables() {
		if ( this.#xml.raw.placeables === null ) {
			this.errorList.push(['SAVEGAME_PARSE_ERROR', 'placeables.xml'])
			return
		}
		const XMLOptions = {
			async              : false,
			attrNameProcessors : [function(name) { return name.toUpperCase() }],
			normalizeTags      : true,
			strict             : true,
		}
		const strictXMLParser = new xml2js.Parser(XMLOptions)

		try {
			strictXMLParser.parseString(this.#xml.raw.placeables, (err, result) => {
				if ( err === null ) {
					this.#xml.parsed.placeables = result
				}
			})
		} catch (e) {
			this.errorList.push(['SAVEGAME_PARSE_ERROR', 'placeables.xml'])
			this.#log.log.danger(`Parsing placeables.xml failed: ${e}`, this.#logName)
		}
		try {
			for ( const thisPlace of this.#xml.parsed.placeables.placeables.placeable ) {
				const modName = thisPlace.$.MODNAME
				const farmID  = thisPlace.$.FARMID
				if ( typeof modName !== 'undefined' ) {
					if (typeof this.#placeables[modName] === 'undefined' ) {
						this.#placeables[modName] = new Set(farmID)
					} else {
						this.#placeables[modName].add(farmID)
					}
				}
			}
		} catch (e) {
			this.errorList.push(['SAVEGAME_PARSE_ERROR', 'placeables.xml'])
			this.#log.log.danger(`Parsing placeables.xml failed: ${e}`, this.#logName)
		}
	}

	#processVehicles() {
		if ( this.#xml.raw.vehicles === null ) {
			this.errorList.push(['SAVEGAME_PARSE_ERROR', 'vehicles.xml'])
			return
		}
		const XMLOptions = {
			async              : false,
			attrNameProcessors : [function(name) { return name.toUpperCase() }],
			normalizeTags      : true,
			strict             : true,
		}
		const strictXMLParser = new xml2js.Parser(XMLOptions)

		try {
			strictXMLParser.parseString(this.#xml.raw.vehicles, (err, result) => {
				if ( err === null ) {
					this.#xml.parsed.vehicles = result
				}
			})
		} catch (e) {
			this.#log.log.danger(`Parsing vehicles.xml failed: ${e}`, this.#logName)
			this.errorList.push(['SAVEGAME_PARSE_ERROR', 'vehicles.xml'])
		}
		try {
			for ( const thisVehicle of this.#xml.parsed.vehicles.vehicles.vehicle ) {
				const modName = thisVehicle.$.MODNAME
				const farmID  = thisVehicle.$.FARMID
				if ( typeof modName !== 'undefined' ) {
					if (typeof this.#vehicles[modName] === 'undefined' ) {
						this.#vehicles[modName] = new Set(farmID)
					} else {
						this.#vehicles[modName].add(farmID)
					}
				}
			}
		} catch (e) {
			this.#log.log.danger(`Parsing vehicles.xml failed: ${e}`, this.#logName)
			this.errorList.push(['SAVEGAME_PARSE_ERROR', 'vehicles.xml'])
		}
	}

	#processCareer() {
		if ( this.#xml.raw.careerSavegame === null ) {
			this.errorList.push(['SAVEGAME_PARSE_ERROR', 'careerSavegame.xml'])
			return
		}
		const XMLOptions = {
			async              : false,
			attrNameProcessors : [function(name) { return name.toUpperCase() }],
			normalizeTags      : true,
			strict             : true,
		}
		const strictXMLParser = new xml2js.Parser(XMLOptions)

		try {
			strictXMLParser.parseString(this.#xml.raw.careerSavegame, (err, result) => {
				if ( err === null ) {
					this.#xml.parsed.careerSavegame = result
				}
			})
		} catch (e) {
			this.errorList.push(['SAVEGAME_PARSE_ERROR', 'careerSavegame.xml'])
			this.#log.log.danger(`Parsing careerSavegame.xml failed: ${e}`, this.#logName)
		}
		try {
			this.mapMod = this.#xml.parsed.careerSavegame.careersavegame.settings[0].mapid[0].split('.')[0]
			for ( const thisMod of this.#xml.parsed.careerSavegame.careersavegame.mod ) {
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
						for ( const farmID of this.#placeables[modName] ) { farmIDs.add(farmID) }
					}
					if ( typeof this.#vehicles[modName] !== 'undefined' ) {
						for ( const farmID of this.#vehicles[modName] ) { farmIDs.add(farmID) }
					}

					Array.from(farmIDs).sort((a, b) => a - b).forEach((farmID) => {
						this.mods[modName].farms.add(this.farms[farmID])
					})
				}
			}
		} catch (e) {
			this.errorList.push(['SAVEGAME_PARSE_ERROR', 'careerSavegame.xml'])
			this.#log.log.danger(`Parsing careerSavegame.xml failed: ${e}`, this.#logName)
		}
	}
}

module.exports = {
	saveFileChecker : saveFileChecker,
}


