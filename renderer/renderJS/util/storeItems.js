/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// FSG Mod Assist Utilities (detail windows)

/* global client_BGData, I18N, DATA, locale, Chart, MA */

const _f = (type, width = '2rem') => `<fillType style="font-size: ${width}" name="${type}"></fillType>`

const NUM = {
	default(value, { float = false, safe = 0 } = {}) {
		const newValue = typeof value === 'number' || typeof value === 'string' ? value : safe
		return !float ? parseInt(newValue) : parseFloat(newValue)
	},

	maxSpeed : (specSpeed, motorSpeed) => {
		const specSpeed_clean = NUM.default(specSpeed)
	
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
	
	minMaxHP     : (baseHP, motorInfo) => {
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

	fmtMulti  : (amount, multi) => `<span class="me-1">${NUM.fmtNoFrac(amount * multi)}</span>`,
	fmtNoFrac : (amount) => Intl.NumberFormat(locale, { maximumFractionDigits : 0 }).format(amount),
	fmtType   : ( type, value ) => {
		if ( typeof value === 'number' && value === 0 ) { return '' }
		
		if ( type === 'power' && Array.isArray(value) && value.length === 3 ) {
			return NUM.fmtMany(value[2] ? value[0] : value.slice(0, 2), locale, ST.unitCombo(type))
		}
		return NUM.fmtMany(value, locale, ST.unitCombo(type))
	},

	fmtMany : (value, locale, transArray, dashZeros = false) => {
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
				thisText.push(`${Intl.NumberFormat(locale, { maximumFractionDigits : thisTrans.precision }).format(thisNumber)} ${I18N.defer(thisTrans.unit, false)}`)
			}
			returnText.push(thisText.join(' / '))
		}

		return returnText.join(separator)
	},
}

const ST = {
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
				return [ST.unit.l, ST.unit.m3, ST.unit.ft3]
			case 'capacity-sm' :
				return [ST.unit.l, ST.unit.ft3]
			case 'power' :
				return [ST.unit.hp, ST.unit.kw]
			case 'speed' :
				return [ST.unit.kph, ST.unit.mph]
			case 'width' :
				return [ST.unit.m, ST.unit.ft]
			case 'weight' :
				return [ST.unit.kg, ST.unit.t, ST.unit.lbs]
			default :
				return [ST.unit.none]
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
		['year',           null,             'look-year',         false],
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

	isKnownBrand : (brand) => {
		if ( typeof brand !== 'string' ) { return false }
		const testBrand = brand.toLowerCase().replace(/^brand_/, '').replace(/\.png|\.webp|\.dds/, '')

		return ST.brandList.has(testBrand) ? testBrand : false
	},

	getInfo : (thisItem) => {
		const thisData = {
			fillLevel  : NUM.default(thisItem.fillLevel),
			hasPower   : NUM.default(thisItem?.specs?.power),
			maxSpeed   : NUM.maxSpeed(thisItem?.specs?.maxspeed, thisItem?.motorInfo?.speed),
			needPower  : NUM.default(thisItem?.specs?.neededpower),
			price      : NUM.default(thisItem.price),
			speedLimit : NUM.default(thisItem?.speedLimit),
			weight     : NUM.default(thisItem.weight),
			workWidth  : NUM.default(thisItem?.specs?.workingwidth, { float : true }),
		}
		thisData.powerSpan = NUM.minMaxHP(thisData.hasPower, thisItem?.motorInfo)
		
		if ( typeof thisItem.sprayTypes !== 'undefined' && thisItem.sprayTypes !== null && thisItem?.sprayTypes?.length !== 0 && thisData.workWidth === 0 ) {
			for ( const thisWidth of thisItem.sprayTypes ) {
				thisData.workWidth = Math.max(thisWidth.width, thisData.workWidth)
			}
		}
		return thisData
	},

	resolveBrand : (icon, brand) => {
		if ( typeof icon === 'string' && icon !== '' ) { return icon }
		const includedBrand = ST.isKnownBrand(brand)
		return includedBrand === null ? '' : `img/brand/brand_${includedBrand}.webp`
	},
	resolveGameIcon : (icon, { width = '10vw' } = {}) =>
		typeof icon !== 'string' ?
			'' :
			icon.startsWith('fill-') ?
				`<fillType style="font-size : ${width}" name="${icon.substring(5)}"></fillType>` :
				`<i style="font-size : ${width}" class="fsico-${icon}"></i>`,
	resolveIcon : (...testIconList) => {
		for ( const testIcon of testIconList ) {
			if ( typeof testIcon === 'string' ) {
				if ( testIcon.startsWith('data:') ) { return testIcon }
				if ( testIcon.startsWith('$data') ) {
					const iconPointer = client_BGData.iconMap[testIcon.toLowerCase()]
					const trueIcon    = client_BGData.records[iconPointer]?.icon
					if ( typeof trueIcon === 'string' ) { return trueIcon }
				}
			}
		}
		return 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'-250 -250 1403.2 1404.2\'%3E%3Cpath style=\'fill: %23771111; filter: drop-shadow(10px 10px 5px rgb(0 0 0 / 0.4));\' opacity=\'0.3\' d=\'M441.6 0a441.6 441.6 0 1 0 0 883.2 441.6 441.6 0 0 0 0-883.2ZM129 674a387.4 387.4 0 0 1-76.9-232.4 386.9 386.9 0 0 1 114-275.4 388 388 0 0 1 275.4-114 386.9 386.9 0 0 1 283 122L129.2 674Zm587.8 43a388 388 0 0 1-275.3 114A386.9 386.9 0 0 1 163 713.6l595-499.1a387 387 0 0 1 73 227A386.9 386.9 0 0 1 717 717Z\' /%3E%3C/svg%3E'
	},
	

	markupFillTypes : (fillArray) => {
		if ( typeof fillArray !== 'object' || !Array.isArray(fillArray) ) { return [] }
		return fillArray.map((x) => `<fillType name="${x}"></fillType>`)
	},



	markupDataRow  : (icon, value, extraLine = null ) => {
		return [
			'<div class="row border-top align-items-center py-1">',
			`<div class="col-auto">${ST.resolveGameIcon(icon, { width : '1.5em' })}</div>`,
			`<div class="col text-end">${value}</div>`,
			'</div>',
			extraLine === null || extraLine.length === 0 ? '' : `<div class="row"><div class="col-1"></div><div class="col-11 text-end">${extraLine}</div></div>`,
		].join('')
	},
	markupDataRowTrue : (icon, value, extraLine = null ) => {
		if ( typeof value === 'undefined' || value === 0 || value === null || value === 0 || value === '' ) { return '' }
		return ST.markupDataRow(icon, value, extraLine)
	},
	markupDataType : (type, value, extraLine = null ) => {
		if ( value === 0 || ( Array.isArray(value) && value[0] === 0 )) { return '' }
		const thisTypeMap = ST.typeIconMap[type]
		return ST.markupDataRow(thisTypeMap[0], NUM.fmtType(thisTypeMap[1], value), extraLine)
	},
	markupFunctions : ( functions ) => functions.map((x) => I18N.defer(x)).join('<br>'),
	markupJoint     : ( haveClass, id, name ) => `<div class="badge joint ${haveClass}" data-jointPage="${id}">${name}</div>`,
	markupJoints    : (joints, doesHave ) => { //, isBase = true) => {
		if ( typeof joints === 'undefined' ) { return '' }
	
		let   hasCustom = false
		const jointHTML = []
	
		for ( const thisJoint of joints ) {
			if ( ! client_BGData.joints_list.includes(thisJoint) ) {
				hasCustom = true
				continue
			}
			jointHTML.push(ST.markupJoint(
				!doesHave ? 'attach_has' : 'attach_need',
				thisJoint.toLowerCase(),
				thisJoint
			))
		}
		if ( hasCustom ) {
			jointHTML.push(ST.markupJoint(
				!doesHave ? 'attach_has custom' : 'attach_need custom',
				'',
				I18N.defer('attachment_custom', false)
			))
		}

		return jointHTML.length === 0 ? null : `<div class="d-flex joint-container justify-content-end">${jointHTML.join('')}</div>`
	},
	markupSprayTypes     : (sprayTypes, defaultWidth) => {
		if ( typeof sprayTypes !== 'object' || sprayTypes === null || sprayTypes.length === 0 ) { return null }

		const sprayTypesHTML = []

		for ( const thisType of sprayTypes ) {
			const fillImages = ST.markupFillTypes(thisType.fills)
			sprayTypesHTML.push(`${fillImages.join('')} ${NUM.fmtMany(
				thisType.width !== null ? thisType.width : defaultWidth,
				locale,
				ST.unitCombo('width')
			)}`)
		}
		return sprayTypesHTML.length === 0 ? null : sprayTypesHTML.join('<br>')
	},
	

	markupChart : (thisUUID) => {
		return [
			`<nav><div class="nav nav-tabs" id="${thisUUID}_nav-tab" role="tablist">`,
			...ST.markupChartButtons(thisUUID),
			'</div></nav>',
			`<div class="tab-content" id="${thisUUID}_nav-tabContent">`,
			...ST.markupChartPanes(thisUUID),
			'</div>'
		].join('')
	},
	markupChartButtons : (uuid) => {
		return [
			{ active : true, id : 'hp',  icon : 'engine'},
			{ active : false, id : 'kph', icon : 'speed'},
			{ active : false, id : 'mph', icon : 'speed'},
		].map((x) => `<button class="nav-link ${x.active ? 'active' : ''}" id="${uuid}_${x.id}_tab" data-bs-toggle="tab" data-bs-target="#${uuid}_${x.id}_graph" type="button" role="tab" ><i class="fsicoLI fsico-look-${x.icon}"></i><l10n name="unit_${x.id}"></l10n></button>`)
	},
	markupChartPanes : (uuid) => {
		return [
			{ active : true, id : 'hp'},
			{ active : false, id : 'kph'},
			{ active : false, id : 'mph'},
		].map((x) => `<div class="tab-pane fade ${x.active ? 'show active' : ''}" id="${uuid}_${x.id}_graph" role="tabpanel"><canvas id="${uuid}_canvas_${x.id}" ></canvas></div>`)
	},
	markupChartScripts : (thisItem, thisItemUUID, chartUnits) => {
		return async () => {
			new Chart(
				MA.byId(`${thisItemUUID}_canvas_hp`),
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
				MA.byId(`${thisItemUUID}_canvas_kph`),
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
				MA.byId(`${thisItemUUID}_canvas_mph`),
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

	markupProductions : (prodRecords) => {
		if ( typeof prodRecords === 'undefined' || prodRecords === null ) { return ''}
		const prodNodes = []
	
		for ( const thisProduction of prodRecords ) {
			const cycleMultiplier = thisProduction.cycles
	
			const inputHTML = []
	
			for ( const inputMix in thisProduction.inputs ) {
				if ( inputMix !== 'no_mix' ) {
					inputHTML.push(ST.markupRow(
						thisProduction.inputs[inputMix].map((x) =>
							`${NUM.fmtMulti(x.amount, cycleMultiplier)}${_f(x.filltype)}`
						).join('<i class="text-info bi-distribute-horizontal mx-1"></i>')
					))
				}
			}
	
			inputHTML.push(...thisProduction.inputs.no_mix.map((x) => {
				return ST.markupRowSinglet(NUM.fmtMulti(x.amount, cycleMultiplier), _f(x.filltype))
			}))
	
			if ( thisProduction.boosts.length !== 0 ) {
				inputHTML.unshift(ST.markupRow(thisProduction.boosts.map((x) =>
					`<div class="d-flex align-items-center">${NUM.fmtMulti(x.amount, cycleMultiplier)}${_f(x.filltype)}<span class="ms-1">(${x.boostFac * 100}%)</span></div>`
				).join('<i class="text-info bi-plus-slash-minus mx-1"></i>')))
			}

			let nameString = thisProduction.name

			if ( thisProduction.params !== null ) {
				const paramArray = thisProduction.params.split('|')
				let   matchNum = -1
				nameString = nameString.replace(/%s/g, () => {
					matchNum++
					return paramArray[matchNum] || '%s'
				})
			}

			nameString = nameString.replace(/\$l10n_\w+/g, (match) => {
				I18N.defer(match)
			})

			prodNodes.push(DATA.templateEngine('prod_div', {
				prodCost         : NUM.fmtNoFrac(thisProduction.cost),
				prodCycles       : thisProduction.cycles,
				prodInputs       : inputHTML.join(ST.markupRow('<i class="text-success bi-plus-lg"></i>')),
				prodName         : nameString,
				prodOutput       : thisProduction.outputs.map((x) =>
					ST.markupRowSinglet(NUM.fmtMulti(x.amount, cycleMultiplier), _f(x.filltype))
				).join(ST.markupRow('<i class="text-success bi-plus-lg"></i>')),
			}))
		}
		return prodNodes
	},

	markupRow  : (content) => `<div class="d-flex flex-wrap justify-content-center align-items-center">${content}</div>`,
	markupRowSinglet : (icon, amount = '') => ST.markupRow(`${icon}${amount}`),
}