/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// FSG Mod Assist Utilities (detail windows)

/* global Chart, client_BGData, fsgUtil, __, _l */

const _f = (type, width = '2rem') => `<fillType style="font-size: ${width}" name="${type}"></fillType>`

const dtLib = {
	/* cSpell:disable */
	brandList : new Set([
		'abi', 'aebi', 'agco', 'agrisem', 'agromasz', 'albutt', 'aldi', 'alpego', 'amazone',
		'amitytech', 'amitytechnology', 'andersongroup', 'annaburger', 'apv', 'arcusin', 'armatrac', 'bednar',
		'bergmann', 'berthoud', 'bkt', 'bmvolvo', 'boeckmann', 'bomech', 'bourgault', 'brantner',
		'bredal', 'bremer', 'brielmaier', 'briri', 'buehrer', 'capello', 'caseih', 'challenger',
		'claas', 'continental', 'conveyall', 'corteva', 'dalbo', 'damcon', 'degelman', 'demco',
		'deutzfahr', 'dfm', 'duevelsdorf', 'easysheds', 'einboeck', 'elho', 'elmersmfg', 'elten',
		'engelbertstrauss', 'ero', 'faresin', 'farmax', 'farmet', 'farmtech', 'fendt', 'fiat',
		'flexicoil', 'fliegl', 'fmz', 'fortschritt', 'fortuna', 'fsi', 'fuhrmann', 'gessner',
		'giants', 'goeweil', 'goldhofer', 'gorenc', 'greatplains', 'gregoirebesson', 'grimme',
		'groha', 'hardi', 'hatzenbichler', 'hauer', 'hawe', 'heizomat', 'helm', 'holaras', 'holmer',
		'horsch', 'husqvarna', 'impex', 'iseki', 'jcb', 'jenz', 'johndeere', 'jonsered', 'joskin',
		'jungheinrich', 'kaercher', 'kaweco', 'kemper', 'kesla', 'kingston', 'kinze', 'kline',
		'knoche', 'koeckerling', 'kockerling', 'koller', 'komatsu', 'kongskilde', 'kotschenreuther', 'kotte',
		'kramer', 'krampe', 'kroeger', 'krone', 'kronetrailer', 'ksag', 'kubota', 'kuhn',
		'kverneland', 'lacotec', 'landini', 'lely', 'lemken', 'lindner', 'lizard', 'lizardbuilding',
		'lizardenergy', 'lizardfarming', 'lizardforestry', 'lizardgoods', 'lizardlawncare',
		'lizardlogistics', 'lizardmotors', 'lizardstorage', 'lodeking', 'mack', 'mackhistorical',
		'magsi', 'mahindra', 'man', 'manitou', 'masseyferguson', 'mccormack', 'mccormick',
		'mcculloch', 'meridian', 'michelin', 'michieletto', 'mitas', 'nardi', 'neuero',
		'newholland', 'nokian', 'none', 'nordsten', 'olofsfors', 'oxbo', 'paladin', 'pesslinstruments',
		'pfanzelt', 'pioneer', 'planet', 'ploeger', 'poettinger', 'ponsse', 'porschediesel',
		'prinoth', 'provita', 'provitis', 'quicke', 'rabe', 'randon', 'rau', 'reform', 'reiter',
		'riedler', 'rigitrac', 'risutec', 'ropa', 'rostselmash', 'rottne', 'rudolfhoermann',
		'rudolph', 'salek', 'salford', 'samasz', 'samporosenlew', 'samsonagro', 'schaeffer',
		'schaumann', 'schouten', 'schuitemaker', 'schwarzmueller', 'seppknuesel', 'seppknusel', 'siloking', 'sip',
		'stadia', 'stara', 'starkindustries', 'stepa', 'steyr', 'stihl', 'stoll', 'strautmann',
		'suer', 'tajfun', 'tatra', 'tenwinkel', 'thueringeragrar', 'thundercreek', 'tmccancela',
		'treffler', 'trelleborg', 'tt', 'unia', 'unverferth', 'vaederstad', 'valtra', 'valtravalmet',
		'veenhuis', 'vermeer', 'versatile', 'vervaet', 'vicon', 'volvo', 'volvobm', 'volvokrabat',
		'vredestein', 'walkabout', 'warzee', 'webermt', 'welger', 'westtech', 'wilson', 'zetor',
		'ziegler', 'zunhammer', 'agi', 'agibatco', 'agineco', 'agisentinel', 'agistorm',
		'agiwesteel', 'agiwestfield', 'antoniocarraro'
	]),
	/* cSpell:enable */
	unit : {
		ft   : { factor : 3.28084,   precision : 1, unit : 'unit_ft' },
		ft3  : { factor : 0.0353147, precision : 1, unit : 'unit_ft3' },
		hp   : { factor : 1,         precision : 0, unit : 'unit_hp' },
		kg   : { factor : 1,         precision : 0, unit : 'unit_kg' },
		kph  : { factor : 1,         precision : 0, unit : 'unit_kph' },
		kw   : { factor : 0.7457,    precision : 1, unit : 'unit_kw' },
		l    : { factor : 1,         precision : 0, unit : 'unit_l' },
		lbs  : { factor : 2.20462,   precision : 0, unit : 'unit_lbs' },
		m    : { factor : 1,         precision : 1, unit : 'unit_m' },
		m3   : { factor : 0.001,     precision : 1, unit : 'unit_m3' },
		mph  : { factor : 0.621371,  precision : 0, unit : 'unit_mph' },
		none : { factor : 1,         precision : 0, unit : '' },
		t    : { factor : 0.01,      precision : 1, unit : 'unit_t' },
	},
	unitCombo : (type) => {
		switch ( type ) {
			case 'capacity' :
				return [dtLib.unit.l, dtLib.unit.m3, dtLib.unit.ft3]
			case 'capacity-sm' :
				return [dtLib.unit.l, dtLib.unit.ft3]
			case 'power' :
				return [dtLib.unit.hp, dtLib.unit.kw]
			case 'speed' :
				return [dtLib.unit.kph, dtLib.unit.mph]
			case 'width' :
				return [dtLib.unit.m, dtLib.unit.ft]
			case 'weight' :
				return [dtLib.unit.kg, dtLib.unit.t, dtLib.unit.lbs]
			default :
				return [dtLib.unit.none]
		}
	},

	vehTestTypes : [
		//[ 'thisItem.record', 'must equal', 'iconName', 'l10n entry']
		['transType',      null,             'look-transmission', false],
		['fuelType',       'diesel',         'look-diesel',       'look_diesel'],
		['fuelType',       'electriccharge', 'look-electric',     'look_electric'],
		['fuelType',       'methane',        'look-methane',      'look_methane'],
		['hasLights',      null,             'look-lights',       'look_has_lights'],
		['hasBeacons',     null,             'look-beacons',      'look_has_beacons'],
		['hasColor',       null,             'look-paintable',    'look_has_paint'],
		['hasWheelChoice', null,             'look-wheels',       'look_has_wheels'],
	],

	husbandTestTypes : ['CHICKEN', 'COW', 'HORSE', 'PIG', 'SHEEP'],

	typeDataOrder : ['price', 'powerSpan', 'needPower', 'maxSpeed', 'speedLimit', 'weight'],
	typeIconMap : {
		'bees'       : ['fill-honey', 'width'],
		'fillLevel'  : ['look-fillunit', 'capacity-sm'],
		'income'     : ['look-income', 'money'],
		'maxSpeed'   : ['look-speed', 'speed'],
		'needPower'  : ['look-engine', 'power'],
		'objects'    : ['look-objects', 'count'],
		'powerSpan'  : ['look-engine', 'power'],
		'price'      : ['look-price', 'money'],
		'speedLimit' : ['look-speedlimit', 'speed'],
		'weight'     : ['look-weight', 'weight'],
		'workWidth'  : ['look-width', 'width'],
	},
	typeMap : {
		'baleLoader'                  : ['price'],
		'default'                     : ['price', 'powerSpan', 'needPower', 'maxSpeed', 'speedLimit', 'fillLevel', 'workWidth'],
		'dynamicMountAttacherTrailer' : ['price'],
	},

	doDataRow  : (icon, value, extraLine = null ) => {
		return [
			'<div class="row border-top align-items-center py-1">',
			`<div class="col-auto">${dtLib.safeGameIcon(icon, { width : '1.5em' })}</div>`,
			`<div class="col text-end">${value}</div>`,
			'</div>',
			extraLine === null || extraLine.length === 0 ? '' : `<div class="row"><div class="col-1"></div><div class="col-11 text-end">${extraLine}</div></div>`,
		].join('')
	},
	doDataRowTrue : (icon, value, extraLine = null ) => {
		if ( typeof value === 'undefined' || value === 0 || value === null || value === 0 || value === '' ) { return '' }
		return dtLib.doDataRow(icon, value, extraLine)
	},
	doDataType : (type, value, extraLine = null ) => {
		if ( value === 0 || ( Array.isArray(value) && value[0] === 0 )) { return '' }
		const thisTypeMap = dtLib.typeIconMap[type]
		return dtLib.doDataRow(thisTypeMap[0], dtLib.numFmtType(thisTypeMap[1], value), extraLine)
	},
	getDataTypes : (type) => ( typeof dtLib.typeMap[type] !== 'undefined' ) ? dtLib.typeMap[type] : dtLib.typeMap.default,

	checkBrand : (brand) => {
		if ( typeof brand !== 'string' ) { return '' }
		const testBrand = brand.toLowerCase().replace(/^brand_/, '').replace(/\.png|\.webp|\.dds/, '')

		return dtLib.brandList.has(testBrand) ? testBrand : null
	},
	safeBrandImage : ( brand, { extraHTML = null, width = '12vw' } = {} ) => {
		const testBrand = dtLib.checkBrand(brand)
		if ( ! testBrand && brand !== null ) { window.log.warning(`Missing Brand: ${brand}`, 'basegame_ui')}
		return dtLib.safeStaticImage(testBrand ? `img/brand/brand_${testBrand}.webp` : null, { width : width, extraHTML : extraHTML })
	},
	safeDataImage : (imgData, { extraHTML = null, width = '12vw' } = {}) => {
		if ( ! fsgUtil.onlyText(imgData) ) { return '' }

		return dtLib.safeStaticImage(imgData.startsWith('data:') ? imgData : `img/baseCategory/${imgData}.webp`, { width : width, extraHTML : extraHTML })
	},
	safeGameIcon : (icon, { width = '10vw' } = {}) =>
		typeof icon !== 'string' ?
			'' :
			icon.startsWith('fill-') ?
				`<fillType style="font-size : ${width}" name="${icon.substring(5)}"></fillType>` :
				`<i style="font-size : ${width}" class="fsico-${icon}"></i>`,
	safeStaticImage : (imgSrc, { extraHTML = null, width = '12vw'}) => imgSrc === null ?
		'' :
		`${extraHTML !== null ? extraHTML : ''}<img class="mb-3 rounded-2" style="width: ${width}" src="${imgSrc}">`,
	
	doFillTypes      : (fillArray) => {
		if ( typeof fillArray !== 'object' || !Array.isArray(fillArray) ) { return [] }
		return fillArray.map((x) => `<fillType name="${x}"></fillType>`)
	},
	doJoints         : (joints, doesHave, isBase = true) => {
		if ( typeof joints === 'undefined' ) { return '' }
	
		let   hasCustom = false
		const jointHTML = []
	
		for ( const thisJoint of joints ) {
			if ( ! client_BGData.joints_list.includes(thisJoint) ) {
				hasCustom = true
				continue
			}
			if ( isBase ) {
				jointHTML.push(`<a href="?type=${ !doesHave ? 'attach_has' : 'attach_need'}&page=${thisJoint.toLowerCase()}">${thisJoint}</a>`)
			} else {
				jointHTML.push(`<a href="#" onclick="clientClickCombo('base', '${!doesHave ? 'attach_has' : 'attach_need'}', '${thisJoint.toLowerCase()}'); return false">${thisJoint}</a>`)
			}
		}
		if ( hasCustom ) { jointHTML.push('<l10n name="attachment_custom"></l10n>')}

		return jointHTML.length === 0 ? null : jointHTML.join(', ')
	},
	doSprayTypes     : (sprayTypes, defaultWidth) => {
		if ( typeof sprayTypes !== 'object' || sprayTypes === null || sprayTypes.length === 0 ) { return null }

		const sprayTypesHTML = []

		for ( const thisType of sprayTypes ) {
			const fillImages = dtLib.doFillTypes(thisType.fills)
			sprayTypesHTML.push(`${fillImages.join('')} ${dtLib.numFmtMany(
				thisType.width !== null ? thisType.width : defaultWidth,
				_l(),
				dtLib.unitCombo('width')
			)}`)
		}
		return sprayTypesHTML.length === 0 ? null : sprayTypesHTML.join('<br>')
	},

	
	numFmtMulti  : (amount, multi) => `<span class="me-1">${dtLib.numFmtNoFrac(amount * multi)}</span>`,
	numFmtNoFrac : (amount) => Intl.NumberFormat(_l(), { maximumFractionDigits : 0 }).format(amount),
	numFmtType : ( type, value ) => {
		if ( typeof value === 'number' && value === 0 ) { return '' }
		
		if ( type === 'power' && Array.isArray(value) && value.length === 3 ) {
			return dtLib.numFmtMany(value[2] ? value[0] : value.slice(0, 2), _l(), dtLib.unitCombo(type))
		}
		return dtLib.numFmtMany(value, _l(), dtLib.unitCombo(type))
	},

	numFmtMany : (value, locale, transArray, dashZeros = false) => {
		if ( typeof value === 'undefined' || value === null ) { return '' }

		const valueList  = typeof value === 'number' ? [value] : value
		const separator   = valueList.length < 3 ? ' - ' : ', '
		const returnText = []

		for ( const thisValue of valueList ) {
			if ( dashZeros && thisValue === 0 ) {
				returnText.push('--')
				continue
			}
			
			const thisText = []

			for ( const thisTrans of transArray ) {
				const thisNumber = thisValue * thisTrans.factor
				thisText.push(`${Intl.NumberFormat(locale, { maximumFractionDigits : thisTrans.precision }).format(thisNumber)} ${__(thisTrans.unit)}`)
			}
			returnText.push(thisText.join(' / '))
		}

		return returnText.join(separator)
	},

	default(value, { float = false, safe = 0 } = {}) {
		const newValue = typeof value === 'number' || typeof value === 'string' ? value : safe
		return !float ? parseInt(newValue) : parseFloat(newValue)
	},

	getInfo : (thisItem) => {
		const thisData = {
			fillLevel  : dtLib.default(thisItem.fillLevel),
			hasPower   : dtLib.default(thisItem?.specs?.power),
			maxSpeed   : dtLib.getMaxSpeed(thisItem?.specs?.maxspeed, thisItem?.motorInfo?.speed),
			needPower  : dtLib.default(thisItem?.specs?.neededpower),
			price      : dtLib.default(thisItem.price),
			speedLimit : dtLib.default(thisItem?.speedLimit),
			weight     : dtLib.default(thisItem.weight),
			workWidth  : dtLib.default(thisItem?.specs?.workingwidth, { float : true }),
		}
		thisData.powerSpan = dtLib.getMinMaxHP(thisData.hasPower, thisItem?.motorInfo)
		
		if ( typeof thisItem.sprayTypes !== 'undefined' && thisItem.sprayTypes !== null && thisItem?.sprayTypes?.length !== 0 && thisData.workWidth === 0 ) {
			for ( const thisWidth of thisItem.sprayTypes ) {
				thisData.workWidth = Math.max(thisWidth.width, thisData.workWidth)
			}
		}
		return thisData
	},
	getMaxSpeed : (specSpeed, motorSpeed) => {
		const specSpeed_clean = dtLib.default(specSpeed)
	
		if ( specSpeed_clean > 0 ) { return specSpeed_clean }
	
		if ( typeof motorSpeed !== 'undefined' && motorSpeed !== null ) {
			let thisMax = 0
			for ( const thisSpeed of motorSpeed ) {
				thisMax = Math.max(thisMax, thisSpeed)
			}
			return thisMax
		}
		return 0
	},
	getMinMaxHP     : (baseHP, motorInfo) => {
		if ( !baseHP ) { return [0, 0, true] }
		if ( !motorInfo ) { return [baseHP, 0, true] }

		let trueMin = 10000
		let trueMax = 0

		for ( const thisHP of motorInfo.hp ) {
			let thisMax = 0
			for ( const thisHPEntry of thisHP.data ) {
				thisMax = Math.max(thisMax, thisHPEntry.y)
			}
			trueMin = Math.min(trueMin, thisMax)
			trueMax = Math.max(trueMax, thisMax)
		}
		return [trueMin, trueMax, trueMin === trueMax]
	},

	wrap : {
		functions : ( functions ) => functions.map((x) => __(x, {skipIfNotBase : true})).join('<br>'),
		item : ( itemID ) => {
			const thisItem         = client_BGData.records[itemID]
			const thisItemData     = dtLib.getInfo(thisItem)

			return fsgUtil.useTemplate('store_item', {
				brandString    : dtLib.safeBrandImage(thisItem.brand, { extraHTML : '<br>' }),
				dataItems      : dtLib.getDataTypes(thisItem.type).map((x) => dtLib.doDataType(x, thisItemData[x])).join(''),
				dlc            : thisItem.dlcKey !== null ? thisItem.dlcKey : '',
				iconString     : dtLib.safeDataImage(thisItem.icon),
				name           : __(thisItem.name, { skipIfNotBase : true }),
				page           : itemID,
				showCompButton : thisItem.masterType === 'vehicle' ? '' : 'd-none',
			})
		},
		pRow  : (content) => `<div class="d-flex flex-wrap justify-content-center align-items-center">${content}</div>`,
		pRowS : (icon, amount = '') => dtLib.wrap.pRow(`${icon}${amount}`),
		row : (HTMLArray, extraClass = 'g-2 justify-content-center')  =>
			`<div class="row ${extraClass}">${ typeof HTMLArray !== 'object' ? HTMLArray : HTMLArray.join('') }</div>`,
		single : ({ name = null, brand = null, icon = null, fsIcon = null, type = 'item', page = null, noTrans = false} = {}) =>
			[
				'<div class="col-2 text-center">',
				'<div class="p-2 border rounded-3 h-100">',
				`<a class="text-decoration-none text-white-50" href="?type=${type}&page=${page}">`,
				`${dtLib.safeDataImage(icon)}${dtLib.safeBrandImage(brand)}${dtLib.safeGameIcon(fsIcon)}<br />`,
				`${__(name, { skipAlways : noTrans })}</a></div></div>`
			].join(''),
	},

	doProductions : (prodRecords) => {
		if ( typeof prodRecords === 'undefined' || prodRecords === null ) { return ''}
		const prodHTML = []
	
		for ( const thisProduction of prodRecords ) {
			const cycleMultiplier = thisProduction.cycles
	
			const inputHTML = []
	
			for ( const inputMix in thisProduction.inputs ) {
				if ( inputMix !== 'no_mix' ) {
					inputHTML.push(dtLib.wrap.pRow(
						thisProduction.inputs[inputMix].map((x) =>
							`${dtLib.numFmtMulti(x.amount, cycleMultiplier)}${_f(x.filltype)}`
						).join('<i class="text-info bi-distribute-horizontal mx-1"></i>')
					))
				}
			}
	
			inputHTML.push(...thisProduction.inputs.no_mix.map((x) => {
				return dtLib.wrap.pRowS(dtLib.numFmtMulti(x.amount, cycleMultiplier), _f(x.filltype))
			}))
	
			if ( thisProduction.boosts.length !== 0 ) {
				inputHTML.unshift(dtLib.wrap.pRow(thisProduction.boosts.map((x) =>
					`<div class="d-flex align-items-center">${dtLib.numFmtMulti(x.amount, cycleMultiplier)}${_f(x.filltype)}<span class="ms-1">(${x.boostFac * 100}%)</span></div>`
				).join('<i class="text-info bi-plus-slash-minus mx-1"></i>')))
			}

			prodHTML.push(fsgUtil.useTemplate('prod_div', {
				prodCost         : dtLib.numFmtNoFrac(thisProduction.cost),
				prodCycles       : thisProduction.cycles,
				prodInputs       : inputHTML.join(dtLib.wrap.pRow('<i class="text-success bi-plus-lg"></i>')),
				prodName         : __(thisProduction.name, {skipIfNotBase : true}),
				prodOutput       : thisProduction.outputs.map((x) =>
					dtLib.wrap.pRowS(dtLib.numFmtMulti(x.amount, cycleMultiplier), _f(x.filltype))
				).join(dtLib.wrap.pRow('<i class="text-success bi-plus-lg"></i>')),
			}))
		}
		return prodHTML.join('')
	},

	doChart : (thisItem, thisItemUUID, chartUnits) => {
		return async () => {
			new Chart(
				fsgUtil.byId(`${thisItemUUID}_canvas_hp`),
				{
					type : 'line',
					data : {
						datasets : [
							...thisItem.motorInfo.hp,
						],
					},
					options : {
						interaction : {
							intersect : false,
							mode      : 'dataset',
						},
						plugins : {
							legend     : { display : false },
							tooltip    : {
								bodyAlign      : 'right',
								bodyFontFamily : 'courier',
								callbacks      : {
									label : (context) => `${context.parsed.y}${chartUnits.unit_hp} @ ${context.parsed.x} ${chartUnits.unit_rpm}`,
								},
								mode           : 'dataset',
								titleAlign     : 'center',
							},
						},
						scales  : {
							x : {
								display : true,
								title   : {
									text    : chartUnits.unit_rpm,
									display : true,
								},
								type    : 'linear',
							},
							y : {
								
								display  : true,
								position : 'left',
								title    : {
									text    : chartUnits.unit_hp,
									display : true,
								},
								type     : 'linear',
							},
						},
						stacked : false,
					},
				}
			)
			new Chart(
				fsgUtil.byId(`${thisItemUUID}_canvas_kph`),
				{
					type : 'line',
					data : {
						datasets : [
							...thisItem.motorInfo.kph,
						],
					},
					options : {
						interaction : {
							intersect : false,
							mode      : 'index',
						},
						plugins : {
							legend     : { display : false },
							tooltip    : {
								bodyAlign      : 'right',
								bodyFontFamily : 'courier',
								callbacks      : {
									label : (context) => `${context.dataset.label} : ${context.parsed.y} ${chartUnits.unit_kph}`,
									title : (context) => `@ ${context[0].label} ${chartUnits.unit_rpm}`,
								},
								mode           : 'index',
								titleAlign     : 'center',
							},
						},
						scales  : {
							x : {
								display : true,
								title   : {
									text    : chartUnits.unit_rpm,
									display : true,
								},
								type    : 'linear',
							},
							y : {
								
								display  : true,
								position : 'left',
								title    : {
									text    : chartUnits.unit_kph,
									display : true,
								},
								type     : 'linear',
							},
						},
						stacked : false,
					},
				}
			)
			new Chart(
				fsgUtil.byId(`${thisItemUUID}_canvas_mph`),
				{
					type : 'line',
					data : {
						datasets : [
							...thisItem.motorInfo.mph,
						],
					},
					options : {
						interaction : {
							intersect : false,
							mode      : 'index',
						},
						plugins : {
							legend     : { display : false },
							tooltip    : {
								bodyAlign      : 'right',
								bodyFontFamily : 'courier',
								callbacks      : {
									label : (context) => `${context.dataset.label} : ${context.parsed.y} ${chartUnits.unit_mph}`,
									title : (context) => `@ ${context[0].label} ${chartUnits.unit_rpm}`,
								},
								mode           : 'index',
								titleAlign     : 'center',
							},
						},
						scales  : {
							x : {
								display : true,
								title   : {
									text    : chartUnits.unit_rpm,
									display : true,
								},
								type    : 'linear',
							},
							y : {
								
								display  : true,
								position : 'left',
								title    : {
									text    : chartUnits.unit_mph,
									display : true,
								},
								type     : 'linear',
							},
						},
						stacked : false,
					},
				}
			)
		}
	},
}