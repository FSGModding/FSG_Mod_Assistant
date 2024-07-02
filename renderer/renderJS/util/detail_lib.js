/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// FSG Mod Assist Utilities (detail windows)

/* global Chart, client_BGData, ST */ //, fsgUtil, __, _l */

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

	
	getDataTypes : (type) => ( typeof ST.typeMap[type] !== 'undefined' ) ? ST.typeMap[type] : ST.typeMap.default,


	safeBrandFromRecord : ( brand, lookRecord, { extraHTML = null, width = '12vw' } = {} ) => {
		if ( typeof lookRecord?.brands?.[brand]?.icon !== 'undefined' ) {
			return ST.safeStaticImage(lookRecord.brands[brand].icon, { extraHTML : extraHTML, width : width })
		}
		return ST.safeBrandImage(brand, { extraHTML : extraHTML, width : width })
	},
	safeBrandImage : ( brand, { extraHTML = null, width = '12vw' } = {} ) => {
		const testBrand = ST.checkBrand(brand)
		if ( ! testBrand && brand !== null && typeof brand !== 'undefined' ) { window.log.warning(`Missing Brand: ${brand}`, 'basegame_ui')}
		return ST.safeStaticImage(testBrand ? `img/brand/brand_${testBrand}.webp` : null, { width : width, extraHTML : extraHTML })
	},
	safeDataImage : (imgData, { extraHTML = null, width = '12vw' } = {}) => {
		if ( ! fsgUtil.onlyText(imgData) ) { return '' }

		return ST.safeStaticImage(imgData.startsWith('data:') ? imgData : `img/baseCategory/${imgData}.webp`, { width : width, extraHTML : extraHTML })
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
			const fillImages = ST.doFillTypes(thisType.fills)
			sprayTypesHTML.push(`${fillImages.join('')} ${ST.numFmtMany(
				thisType.width !== null ? thisType.width : defaultWidth,
				_l(),
				ST.unitCombo('width')
			)}`)
		}
		return sprayTypesHTML.length === 0 ? null : sprayTypesHTML.join('<br>')
	},





	getCleanParentID  : ( parentFile ) => {
		if ( typeof parentFile !== 'string' ) { return null }
		const attemptKey = parentFile.replace('.xml', '').replace('$data/', '').replaceAll('/', '_')
		return ( typeof client_BGData.records[attemptKey] !== 'undefined' ) ? attemptKey : null
	},

	

	wrap : {
		item : ( itemID ) => {
			const thisItem         = client_BGData.records[itemID]
			const thisItemData     = ST.getInfo(thisItem)
			let   dataItems        = null
			const attemptKey       = ST.getCleanParentID(thisItem.parentFile)

			if ( attemptKey !== null ) {
				const attemptItem = client_BGData.records[attemptKey]
				const newItemData = ST.getInfo(attemptItem)
				dataItems = ST.getDataTypes(attemptItem.type).map((x) => ST.doDataType(x, newItemData[x])).join('')
			} else {
				dataItems = ST.getDataTypes(thisItem.type).map((x) => ST.doDataType(x, thisItemData[x])).join('')
			}
			
			return fsgUtil.useTemplate('store_item', {
				brandString    : ST.safeBrandImage(thisItem.brand, { extraHTML : '<br>' }),
				dataItems      : dataItems,
				dlc            : thisItem.dlcKey !== null ? thisItem.dlcKey : '',
				hasParentFile  : attemptKey !== null ? 'notRealItem' : '',
				iconString     : ST.safeDataImage(thisItem.icon),
				name           : __(thisItem.name, { skipIfNotBase : true }),
				page           : attemptKey !== null ? attemptKey : itemID,
				showCompButton : thisItem.masterType === 'vehicle' ? '' : 'd-none',
			})
		},
		pRow  : (content) => `<div class="d-flex flex-wrap justify-content-center align-items-center">${content}</div>`,
		pRowS : (icon, amount = '') => ST.wrap.pRow(`${icon}${amount}`),
		row : (HTMLArray, extraClass = 'g-2')  =>
			`<div class="row ${extraClass}">${ typeof HTMLArray !== 'object' ? HTMLArray : HTMLArray.join('') }</div>`,
		single : ({ name = null, brand = null, icon = null, fsIcon = null, type = 'item', page = null, noTrans = false} = {}) =>
			[
				'<div class="col-2 text-center">',
				'<div class="p-2 border rounded-3 h-100">',
				`<a class="text-decoration-none text-white-50" href="?type=${type}&page=${page}">`,
				`${ST.safeDataImage(icon)}${ST.safeBrandImage(brand)}${ST.safeGameIcon(fsIcon)}<br />`,
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
					inputHTML.push(ST.wrap.pRow(
						thisProduction.inputs[inputMix].map((x) =>
							`${ST.numFmtMulti(x.amount, cycleMultiplier)}${_f(x.filltype)}`
						).join('<i class="text-info bi-distribute-horizontal mx-1"></i>')
					))
				}
			}
	
			inputHTML.push(...thisProduction.inputs.no_mix.map((x) => {
				return ST.wrap.pRowS(ST.numFmtMulti(x.amount, cycleMultiplier), _f(x.filltype))
			}))
	
			if ( thisProduction.boosts.length !== 0 ) {
				inputHTML.unshift(ST.wrap.pRow(thisProduction.boosts.map((x) =>
					`<div class="d-flex align-items-center">${ST.numFmtMulti(x.amount, cycleMultiplier)}${_f(x.filltype)}<span class="ms-1">(${x.boostFac * 100}%)</span></div>`
				).join('<i class="text-info bi-plus-slash-minus mx-1"></i>')))
			}

			prodHTML.push(fsgUtil.useTemplate('prod_div', {
				prodCost         : ST.numFmtNoFrac(thisProduction.cost),
				prodCycles       : thisProduction.cycles,
				prodInputs       : inputHTML.join(ST.wrap.pRow('<i class="text-success bi-plus-lg"></i>')),
				prodName         : __(thisProduction.name, {skipIfNotBase : true}),
				prodOutput       : thisProduction.outputs.map((x) =>
					ST.wrap.pRowS(ST.numFmtMulti(x.amount, cycleMultiplier), _f(x.filltype))
				).join(ST.wrap.pRow('<i class="text-success bi-plus-lg"></i>')),
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