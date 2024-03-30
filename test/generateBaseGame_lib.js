/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Base Game generator library

const { requiredItems, logCollector, fileHandlerAsync } = require('../lib/workerThreadLib.js')
const path          = require('node:path')
const allLang       = require('../lib/modLookerLang.json')
const {XMLParser}   = require('fast-xml-parser')

class baseLooker {
	#iconParser     = requiredItems.iconDecoder
	#dataPath       = null
	#fullFileName   = null
	#locale         = null
	#log            = null
	#hpString       = null

	#langData = {}

	#catDescMap  = require('../lib/modCheckLib_static').catDescMap
	#fillCats    = require('../lib/modCheckLib_static').fillCats
	#getColor    = require('../lib/modCheckLib_static').getColor

	#modHandle = null

	constructor( fullPath, dataPath ) {
		// modRecord from collection, folder for collection, skip Icons bool
		this.#log        = new logCollector(`modLook-${path.basename(fullPath)}`)
		this.#hpString   = requiredItems.l10n_hp
		this.#locale     = requiredItems.currentLocale
		this.#dataPath   = dataPath

		this.#fullFileName = fullPath

		this.#langData = Object.hasOwn(allLang, this.#locale) ? allLang[this.#locale] : allLang.en
	}

	async getInfo() {
		this.#modHandle = new fileHandlerAsync(path.dirname(this.#fullFileName), true, this.#log)

		await this.#modHandle.open()
		
		const thisItem = path.basename(this.#fullFileName)
		const thisItemName = path.relative(this.#dataPath, this.#fullFileName).replaceAll('\\', '_').replace('.xml', '')
		if ( ! this.#modHandle.isOpen ) { return { log : this.#log.lines, record : null } }

		const iconLoads = []

		const thisItemTree = await this.#modHandle.readXML(thisItem, 'modlook')
		const thisItemInfo = this.#parseStoreItem(thisItemTree)

		if ( thisItemInfo !== null && thisItemInfo.icon !== null ) {
			iconLoads.push(this.#loadIcon(thisItemInfo.icon, false).then((itemIcon) => {
				thisItemInfo.iconOriginalName = thisItemInfo.icon
				thisItemInfo.icon = itemIcon
			}).catch((err) => {
				this.#log.notice(`Caught image error: ${err}`)
			}))
		}

		return Promise.allSettled(iconLoads).then(() => {
			this.#modHandle.close()
			this.#modHandle = null
			return { shortname : thisItemName, log : this.#log.lines, record : thisItemInfo }
		})
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

	async #loadIcon(iconFile, isMap) {
		if ( typeof iconFile !== 'string' || iconFile === null ) { return null }

		if ( iconFile.startsWith('$data/store/brands/') ) {
			return `img/brand/${iconFile.substring(19).slice(0, -4).toLowerCase()}.webp`
		}

		let fileName = ( ! iconFile.endsWith('.dds') ) ? `${iconFile.slice(0, -4)}.dds` : iconFile

		fileName = path.relative(path.dirname(this.#fullFileName), path.join(this.#dataPath, fileName.replace('$data', '')))

		try {
			if ( this.#modHandle.exists(fileName) ) {
				return this.#iconParser.parseDDS(
					await this.#modHandle.readBin(fileName),
					true,
					isMap
				)
			}
			return null
		} catch (err) {
			this.#log.warning(`Caught image error: ${err}`)
		}
		return null
	}

	#unwrapXML(xml) {
		const returner = {}
		if ( typeof xml !== 'object' || xml === null ) { return {} }

		for ( const key in xml ) {
			if ( key !== 'combination' ) {
				returner[key] = xml[key]
			} else {
				for ( const thisCombo of xml.combination ) {
					returner.combination ??= []
					returner.combination.push(thisCombo?.$?.XMLFILENAME)
				}
			}
		}
		return returner
	}

	#translate_single(key) {
		if ( key === null || typeof key !== 'string' ) { return null }
		if ( ! key.startsWith('$l10n') ) { return key }
		
		const searchKey = key.substring(6)

		return this.#langData?.[searchKey] ?? key
	}

	#getCategory(category) {
		if ( category === null ) { return '' }
		return this.#catDescMap?.[category] ?? category
	}

	#translate(keys) {
		switch ( typeof keys ) {
			case 'boolean' :
				return keys
			case 'string':
				return this.#translate_single(keys)
			case 'object':
				try {
					return keys.map((key) => this.#translate_single(key))
				} catch {
					return ['invalid-xml-error']
				}
			default :
				return keys
		}
	}

	#util_getDefault(key, fallback = null) { return key ?? fallback }
	#util_getExist(key) { return typeof key !== 'undefined' }
	#util_getGTCount(key, count = 1) { return typeof key !== 'number' ? false : key > count}

	#parseProductionInput(thisInput) {
		const isBoost  = thisInput?.$?.MIX === 'boost' ?? false
		const mixIndex = typeof thisInput?.$?.MIX === 'undefined' ? null : `mix-${thisInput.$.MIX}`

		return {
			boost : isBoost,
			idx   : mixIndex,
			data  : {
				amount   : thisInput?.$?.AMOUNT ?? 0,
				boostFac : thisInput?.$?.BOOSTFACTOR ?? 0,
				filltype : (thisInput?.$?.FILLTYPE ?? 'unknown').toLowerCase(),
			},
		}
	}

	#parseProduction(xml) {
		const returnObj = []

		if ( typeof xml === 'undefined' || xml === null ) { return returnObj }

		for ( const thisProd of xml ) {
			if ( typeof thisProd?.inputs?.input === 'undefined' || typeof thisProd?.outputs?.output === 'undefined' ) { continue }

			const thisProdObj = {
				boosts  : [],
				cost    : thisProd?.$?.COSTSPERACTIVEHOUR ?? 1,
				cycles  : thisProd?.$?.CYCLESPERHOUR ?? 1,
				inputs  : {
					no_mix : [],
				},
				name    : this.#parseNameParams(thisProd?.$?.NAME, thisProd?.$?.PARAMS),
				outputs : [],
			}
			
			for ( const thisInput of thisProd.inputs.input ) {
				const thisInputObj = this.#parseProductionInput(thisInput, thisProdObj.inputs.length)
				if ( thisInputObj.boost ) {
					thisProdObj.boosts.push(thisInputObj.data)
				} else if ( thisInputObj.idx === null ) {
					thisProdObj.inputs.no_mix.push(thisInputObj.data)
				} else {
					thisProdObj.inputs[thisInputObj.idx] ??= []
					thisProdObj.inputs[thisInputObj.idx].push(thisInputObj.data)
				}
			}
			
			for ( const thisOutput of thisProd.outputs.output ) {
				thisProdObj.outputs.push({
					amount   : thisOutput?.$?.AMOUNT ?? 0,
					filltype : (thisOutput?.$?.FILLTYPE ?? 'unknown').toLowerCase(),
				})
			}

			returnObj.push(thisProdObj)
		}
		
		return returnObj
	}

	#parsePlace(xml) {

		const storeData = xml.storedata
		
		if ( storeData?.showinstore === false ) { return null }

		const fillUnit = this.#parseFillTypes(xml?.silo?.storages?.storage ?? null)

		try {
			return {
				category       : this.#getCategory(storeData?.category),
				functions      : this.#util_getDefault(storeData?.functions?.function, []),
				hasColor       : this.#util_getGTCount(xml?.colorable?.colors?.color?.length, 1),
				icon           : this.#util_getDefault(storeData?.image),
				masterType     : 'placeable',
				name           : this.#parseName(storeData?.name),
				price          : this.#util_getDefault(storeData?.price, 0),
				type           : xml.$.TYPE,

				beehive   : {
					exists : this.#util_getExist(xml.beehive),
					radius : this.#util_getDefault(xml?.beehive?.$?.ACTIONRADIUS, 0),
					liters : this.#util_getDefault(xml?.beehive?.$?.LITERSHONEYPERDAY, 0),
				},
				husbandry : {
					exists   : this.#util_getExist(xml?.husbandry?.animals),
					type     : this.#util_getDefault(xml?.husbandry?.animals?.$?.TYPE, null),
					capacity : this.#util_getDefault(xml?.husbandry?.animals?.$?.MAXNUMANIMALS, 0),
				},
				incomePerHour : this.#util_getDefault(xml?.incomeperhour),
				objectStorage : this.#util_getDefault(xml?.objectstorage?.$?.CAPACITY),
				productions   : this.#parseProduction(xml?.productionpoint?.productions?.production),
				silo : {
					exists   : fillUnit.capacity > 0,
					types    : fillUnit.types,
					capacity : fillUnit.capacity,
				},
			}
		} catch {
			return null
		}
	}

	#parseFillTypes(xml) {
		const returnObject = {
			capacity : 0,
			types    : [],
		}
		if ( xml === null ) { return returnObject }

		for ( const thisFill of xml ) {
			if ( thisFill?.$?.SHOWINSHOP !== false ) {
				const thisTypes = thisFill?.$?.FILLTYPES?.split?.(' ') ?? null
				const thisCats  = thisFill?.$?.FILLTYPECATEGORIES?.split?.(' ') ?? null

				if ( thisCats !== null ) {
					for ( const thisCat of thisCats ) {
						const thisCatKey = thisCat.toLowerCase()
						if ( Object.hasOwn(this.#fillCats, thisCatKey) ) {
							returnObject.types.push(...this.#fillCats[thisCatKey])
						}
					}
				}
				
				if ( thisTypes !== null ) {
					for ( const thisType of thisTypes ) {
						returnObject.types.push(thisType.toLowerCase())
					}
				}

				returnObject.capacity += thisFill?.$?.CAPACITY ?? 0
			}
		}
		
		return returnObject
	}

	#parseWeight(xml) {
		if ( typeof xml !== 'object' || xml === null ) { return 0 }

		return xml.reduce((total, current) => total + current?.$?.MASS ?? 0, 0)
	}

	#parseBrand(xml) {
		if ( typeof xml === 'string' ) { return xml }
		if ( typeof xml?.['#text'] === 'string' ) { return xml['#text'] }
		return null
	}

	#util_motorGraph(index, data, label) {
		return {
			backgroundColor        : `${this.#getColor(index)}88`,
			borderColor            : this.#getColor(index),
			cubicInterpolationMode : 'monotone',
			data                   : data,
			label                  : label,
			pointHoverRadius       : 12,
			pointRadius            : 8,
			pointStyle             : 'circle',
			tension                : 0.4,
			yAxisID                : 'y',
		}
	}

	#parseMotor(xml) {
		if ( typeof xml !== 'object' ) { return null }

		const motorInfo = {
			hp    : [],
			kph   : [],
			mph   : [],
			speed : [],
		}

		const last = {
			trans  : null,
			torque : null,
			rpm    : null,
		}

		for ( const [i, thisMotor] of xml.entries() ) {
			last.torque = this.#util_getDefault(thisMotor?.motor?.torque, last.torque)
			last.trans  = this.#util_getDefault(thisMotor?.transmission, last.trans)

			motorInfo.speed.push(this.#util_getDefault(thisMotor?.motor?.$?.MAXFORWARDSPEED, 0))
			
			const axelRatio  = this.#util_getDefault(last.trans?.$?.AXLERATIO, 1)
			const minFwdGear = this.#util_getDefault(last.trans?.$?.MINFORWARDGEARRATIO)
			const motorScale = this.#util_getDefault(thisMotor?.motor?.$?.TORQUESCALE, 1)
			const motorRPM   = this.#util_getDefault(thisMotor?.motor?.$?.MAXRPM, last.rpm ?? 1800)

			last.rpm = motorRPM

			let minGear    = Number.MAX_SAFE_INTEGER

			const viewHP = thisMotor?.$?.HP ?? null
			const names  = [
				this.#translate(thisMotor?.$?.NAME),
				this.#translate_single(last.trans?.$?.NAME, null),
				viewHP !== null ? `${viewHP}${this.#hpString}` : null,
			]
			
			if ( minFwdGear === null ) {
				if ( typeof last.trans?.forwardgear === 'object' ) {
					for ( const thisGear of last.trans.forwardgear) {
						let   thisGear_ratio = this.#util_getDefault(thisGear?.$?.GEARRATIO)
						const thisGear_max   = this.#util_getDefault(thisGear?.$?.MAXSPEED)

						if ( thisGear_max !== null ) {
							thisGear_ratio = motorRPM * Math.PI / (thisGear_max / 3.6 * 30)
						}

						minGear = Math.min(minGear, (thisGear_ratio * axelRatio))
					}
				}
			} else {
				minGear = minFwdGear * axelRatio
			}

			const theseHP  = []
			const theseKPH = []
			const theseMPH = []

			for ( let j = 0; j < last.torque.length; j++ ) {
				const thisEntry   = last.torque[j]
				const thisScale   = this.#util_getDefault(thisEntry?.$?.NORMRPM, 1)
				const thisTorque  = this.#util_getDefault(thisEntry?.$?.TORQUE, 1)
				const thisRPM     = this.#util_getDefault(thisEntry?.$?.RPM, thisScale * motorRPM)
				const thisHP      = Math.round(motorScale*(1.35962161*Math.PI*thisRPM*thisTorque)/30)
				const thisSpeed_k = Math.round(3.6*((thisRPM*Math.PI)/(30*minGear)))
				const thisSpeed_m = Math.round(3.6*((thisRPM*Math.PI)/(30*minGear)) * 0.621371)
				const thisRPM_r   = Math.round(thisRPM)

				theseHP.push({x : thisRPM_r,  y : thisHP})
				theseKPH.push({x : thisRPM_r, y : thisSpeed_k})
				theseMPH.push({x : thisRPM_r, y : thisSpeed_m})
			}

			let matchIndex = -1
			if ( i > 0 ) {
				for ( let k = 0; k < motorInfo.hp.length; k++) {
					if ( JSON.stringify(motorInfo.hp[k].data) === JSON.stringify(theseHP) ) {
						matchIndex = k
						break
					}
				}
			}

			if ( matchIndex > -1 ) {
				motorInfo.hp[matchIndex].label.push([...names].filter((x) => x !== null).join(' - '))
			} else {
				motorInfo.hp.push(this.#util_motorGraph(i, theseHP, [[...names].filter((x) => x !== null).join(' - ')]))
			}

			motorInfo.kph[i] = this.#util_motorGraph(i, theseKPH, [...names].filter((x) => x !== null).join(' - '))
			motorInfo.mph[i] = this.#util_motorGraph(i, theseMPH, [...names].filter((x) => x !== null).join(' - '))
		}

		return motorInfo
	}

	#parseSprays(xml) {
		if ( typeof xml !== 'object' ) { return null }

		const sprayTypes = []

		for ( const thisType of xml ) {
			const fills = new Set(thisType?.$?.FILLTYPES?.split(' ') || [])
			fills.delete('unknown')

			sprayTypes.push({
				fills : [...fills].map((x) => x.toLowerCase()),
				width : thisType?.usagescales?.$?.WORKINGWIDTH || null,
			})
		}
		return sprayTypes.sort((a, b) => a.width - b.width)
	}

	#findAttr(xml, searchKey, maxDepth = 6, cDepth = 0 ) {
		const finds = []
	
		for ( const thisKey of Object.keys(xml) ) {
			if ( thisKey === '$' && typeof xml.$[searchKey] !== 'undefined' ) {
				finds.push(xml.$[searchKey])
			} else if ( typeof xml[thisKey] === 'object' && cDepth < maxDepth ) {
				finds.push(...this.#findAttr(xml[thisKey], searchKey, maxDepth, cDepth + 1))
			}
		}
		return finds
	}

	#parseJoints(canUse, needs, front) {
		const returnCanUse = typeof canUse !== 'undefined' ? this.#findAttr(canUse, 'JOINTTYPE') : []
		const returnNeeds  = typeof needs  !== 'undefined' ? this.#findAttr(needs, 'JOINTTYPE')  : []
		const returnFront  = typeof front  !== 'undefined' ? this.#findAttr(front, 'JOINTTYPE')  : []

		returnCanUse.push(...returnFront)

		return {
			canUse : [...new Set(returnCanUse)].filter((x) => x !== null),
			needs  : [...new Set(returnNeeds)].filter((x) => x !== null),
		}
	}

	#parseVehicle(xml) {
		const storeData = xml.storedata

		if ( storeData?.showinstore === false ) { return null }
		if ( typeof storeData === 'undefined' || storeData === null ) { return null }
		if ( Object.hasOwn(storeData, 'bundleelements') ) { return null }

		try {
			const theseFills = this.#parseFillTypes(xml?.fillunit?.fillunitconfigurations?.fillunitconfiguration?.[0]?.fillunits?.fillunit ?? null)
			
			return {
				brand          : this.#parseBrand(storeData?.brand),
				category       : this.#getCategory(storeData?.category),
				fillLevel      : theseFills.capacity,
				fillTypes      : theseFills.types,
				fuelType       : this.#util_getDefault(xml?.motorized?.consumerconfigurations?.[0].consumerconfiguration?.[0]?.consumer?.[0]?.$?.FILLTYPE, false),
				functions      : storeData?.functions?.function || [],
				hasBeacons     : this.#util_getExist(xml?.lights?.beaconlights),
				hasColor       : this.#util_getExist(xml.basematerialconfigurations),
				hasLights      : this.#util_getExist(xml?.lights?.reallights),
				hasWheelChoice : this.#util_getGTCount(xml.wheels?.wheelconfigurations?.wheelconfiguration?.length, 1),
				icon           : this.#util_getDefault(storeData?.image),
				isEnterable    : this.#util_getDefault(xml.enterable) !== null,
				isMotorized    : this.#util_getDefault(xml.motorized) !== null,
				joints         : this.#parseJoints(
					xml?.attacherjoints,
					xml?.attachable,
					xml?.frontloaderconfigurations
				),
				masterType     : 'vehicle',
				motorInfo      : this.#parseMotor(xml?.motorized?.motorconfigurations?.motorconfiguration),
				name           : this.#parseName(storeData?.name),
				parentFile     : xml?.parentfile?.$?.XMLFILENAME || null,
				price          : this.#util_getDefault(storeData?.price, 0),
				specs          : this.#unwrapXML(storeData?.specs),
				speedLimit     : this.#util_getDefault(xml?.base?.speedlimit?.$?.VALUE),
				sprayTypes     : this.#parseSprays(xml?.sprayer?.spraytypes?.spraytype),
				transType      : xml?.motorized?.motorconfigurations?.motorconfiguration?.[0]?.transmission?.$?.NAME || false,
				type           : xml.$.TYPE,
				typeDesc       : xml.base?.typedesc || 'unknown',
				weight         : this.#parseWeight(xml.base?.components?.component),
			}
		} catch (_) {
			return null
		}
	}

	#parseNameParams(name, params, fallback = 'unknown') {
		if ( typeof name !== 'string' ) { return fallback }
		if ( typeof params !== 'string' ) { return name }
		return `${name} [[${params}]]`
	}

	#parseName(xml, fallback = 'unknown') {
		if ( (typeof xml !== 'number' && typeof xml !== 'string' && typeof xml !== 'object') || xml === null ) { return fallback }
		if ( typeof xml === 'number' ) { return xml.toString() }
		if ( typeof xml === 'string' ) { return this.#translate(xml) }

		if ( Object.hasOwn(xml, '#text') ) {
			return `${xml['#text']} [[${xml?.$?.PARAMS}]]`
		}
		if ( Object.hasOwn(xml, this.#locale) ) { return xml[this.#locale] }
		if ( Object.hasOwn(xml, 'en') ) { return xml.en }
		if ( Object.hasOwn(xml, 'de') ) { return xml.de }
		return fallback
	}
}

const alwaysXMLArray = new Set([
	'moddesc.brands.brand',
])

const getParser = () => {
	return new XMLParser({
		attributeNamePrefix    : '',
		attributesGroupName    : '$',
		ignoreAttributes       : false,
		ignoreDeclaration      : true,
		ignorePiTags           : true,
		isArray                : (_, jPath) => alwaysXMLArray.has(jPath),
		parseAttributeValue    : true,
		parseTagValue          : true,
		processEntities        : false,
		transformAttributeName : (name) => name.toUpperCase(),
		transformTagName       : (name) => name.toLowerCase(),
		trimValues             : true,
	})
}

module.exports = {
	baseLooker      : baseLooker,
	getParser       : getParser,
}