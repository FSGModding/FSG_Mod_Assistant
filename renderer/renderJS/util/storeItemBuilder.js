/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */
// MARK: Store Item Builder Classes

/* global I18N, DATA, client_BGData, MA, Chart */

const UNITS = {
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
	t    : { factor : 0.001,     precision : 1, unit : 'unit_t' },
}

const fillCat = {
	19 : {
		augerwagon      : ['wheat', 'barley', 'oat', 'canola', 'soybean', 'sunflower', 'maize', 'fertilizer', 'seeds'],
		bulk            : ['wheat', 'barley', 'oat', 'canola', 'sunflower', 'soybean', 'maize', 'potato', 'sugarbeet', 'manure', 'seeds', 'forage', 'forage_mixing', 'chaff', 'woodchips', 'silage', 'straw', 'grass_windrow', 'drygrass_windrow', 'sugarcane', 'fertilizer', 'pigfood', 'lime'],
		combine         : ['wheat', 'barley', 'oat', 'canola', 'sunflower', 'soybean', 'maize'],
		farmsilo        : ['wheat', 'barley', 'oat', 'canola', 'sunflower', 'soybean', 'maize', 'potato', 'sugarbeet', 'sugarcane'],
		forageharvester : ['chaff', 'grass_windrow', 'drygrass_windrow', 'woodchips'],
		foragewagon     : ['straw', 'grass_windrow', 'drygrass_windrow', 'chaff', 'silage'],
		fork            : ['manure', 'silage', 'chaff', 'straw', 'grass_windrow', 'drygrass_windrow'],
		hayloft         : ['straw', 'drygrass_windrow'],
		liquid          : ['milk', 'fuel', 'water', 'diesel', 'def'],
		loadingvehicle  : ['wheat', 'barley', 'oat', 'canola', 'sunflower', 'soybean', 'maize', 'seeds', 'forage', 'chaff', 'woodchips', 'silage', 'fertilizer', 'lime'],
		manurespreader  : ['manure'],
		piece           : ['wool', 'treesaplings', 'egg'],
		silagetrailer   : ['straw', 'grass_windrow', 'drygrass_windrow', 'chaff', 'silage', 'woodchips', 'sugarcane'],
		slurrytank      : ['liquidmanure', 'digestate'],
		sprayer         : ['liquidfertilizer', 'herbicide'],
		spreader        : ['fertilizer'],
		trainwagon      : ['wheat', 'barley', 'oat', 'canola', 'maize', 'sunflower', 'soybean', 'sugarbeet', 'potato'],
		windrow         : ['straw', 'drygrass_windrow', 'grass_windrow'],
	},
	22 : {
		augerwagon          : ['wheat', 'barley', 'oat', 'canola', 'soybean', 'sunflower', 'maize', 'fertilizer', 'seeds', 'sorghum'],
		bulk                : ['wheat', 'barley', 'oat', 'canola', 'sunflower', 'soybean', 'maize', 'potato', 'sugarbeet', 'sugarbeet_cut', 'manure', 'seeds', 'forage', 'forage_mixing', 'chaff', 'woodchips', 'silage', 'straw', 'grass_windrow', 'drygrass_windrow', 'sugarcane', 'fertilizer', 'pigfood', 'lime', 'snow', 'roadsalt', 'sorghum', 'olive', 'stone', 'mineral_feed', 'carrot', 'beetroot', 'parsnip'],
		combine             : ['wheat', 'barley', 'oat', 'canola', 'sunflower', 'soybean', 'maize', 'sorghum'],
		farmsilo            : ['wheat', 'barley', 'oat', 'canola', 'sunflower', 'soybean', 'maize', 'sorghum'],
		forageharvester     : ['chaff', 'grass_windrow', 'woodchips'],
		foragewagon         : ['straw', 'grass_windrow', 'drygrass_windrow', 'chaff', 'silage', 'forage'],
		fork                : ['manure', 'silage', 'chaff', 'straw', 'grass_windrow', 'drygrass_windrow'],
		hayloft             : ['straw', 'drygrass_windrow'],
		liquid              : ['milk', 'water', 'diesel', 'def'],
		loadingvehicle      : ['heat', 'barley', 'oat', 'canola', 'sunflower', 'soybean', 'maize', 'seeds', 'forage', 'chaff', 'woodchips', 'silage', 'fertilizer', 'lime', 'sorghum'],
		manurespreader      : ['manure'],
		mixerwagon          : ['forage', 'forage_mixing', 'drygrass_windrow', 'silage', 'straw', 'mineral_feed'],
		piece               : ['wool', 'treesaplings', 'egg'],
		product             : ['flour', 'bread', 'cake', 'butter', 'cheese', 'fabric', 'sugar', 'clothes', 'cereal', 'sunflower_oil', 'canola_oil', 'olive_oil', 'raisins', 'grapejuice', 'chocolate', 'boards', 'furniture', 'strawberry', 'lettuce', 'tomato', 'egg'],
		product_bga         : ['ethane', 'electriccharge'],
		shovel              : ['wheat', 'barley', 'oat', 'canola', 'sunflower', 'soybean', 'maize', 'potato', 'sugarbeet', 'sugarbeet_cut', 'manure', 'seeds', 'forage', 'forage_mixing', 'chaff', 'woodchips', 'silage', 'straw', 'grass_windrow', 'drygrass_windrow', 'sugarcane', 'fertilizer', 'pigfood', 'lime', 'snow', 'roadsalt', 'sorghum', 'grape', 'olive', 'stone', 'mineral_feed', 'carrot', 'beetroot', 'parsnip'],
		silagetrailer       : ['straw', 'grass_windrow', 'drygrass_windrow', 'chaff', 'silage', 'forage', 'woodchips', 'sugarcane'],
		slurrytank          : ['liquidmanure', 'digestate'],
		sprayer             : ['liquidfertilizer', 'herbicide'],
		spreader            : ['fertilizer'],
		topliftingharvester : ['carrot', 'beetroot', 'parsnip'],
		trainwagon          : ['wheat', 'barley', 'oat', 'canola', 'maize', 'sunflower', 'soybean', 'sugarcane', 'sugarbeet', 'potato', 'sorghum', 'woodchips', 'olive', 'grape', 'seeds', 'carrot', 'beetroot', 'parsnip'],
		vegetables          : ['potato', 'carrot', 'beetroot', 'parsnip'],
		windrow             : ['straw', 'drygrass_windrow', 'grass_windrow'],
	},
	25 : {
		animal              : ['cow_swiss_brown', 'cow_angus', 'cow_holstein', 'cow_limousin', 'sheep_black_welsh', 'sheep_steinschaf', 'sheep_swiss_mountain', 'sheep_landrace', 'pig_landrace', 'pig_black_pied', 'pig_berkshire', 'chicken', 'chicken_rooster', 'goat'],
		augerwagon          : ['wheat', 'barley', 'oat', 'canola', 'sorghum', 'ricelonggrain', 'sunflower', 'soybean', 'maize', 'seeds', 'fertilizer'],
		bulk                : ['wheat', 'barley', 'oat', 'canola', 'sorghum', 'sunflower', 'soybean', 'maize', 'potato', 'sugarbeet', 'beetroot', 'carrot', 'parsnip', 'rice', 'ricelonggrain', 'greenbean', 'pea', 'spinach', 'olive', 'sugarcane', 'woodchips', 'sugarbeet_cut', 'silage', 'grass_windrow', 'drygrass_windrow', 'straw', 'chaff', 'forage', 'forage_mixing', 'pigfood', 'mineral_feed', 'seeds', 'fertilizer', 'lime', 'manure', 'snow', 'roadsalt', 'stone'],
		combine             : ['wheat', 'barley', 'oat', 'canola', 'sorghum', 'ricelonggrain', 'sunflower', 'soybean', 'maize'],
		farmsilo            : ['wheat', 'barley', 'oat', 'canola', 'sorghum', 'sunflower', 'soybean', 'maize', 'rice', 'ricelonggrain'],
		forageharvester     : ['chaff', 'grass_windrow', 'woodchips'],
		foragewagon         : ['grass_windrow', 'drygrass_windrow', 'straw', 'chaff', 'silage', 'forage'],
		fork                : ['manure', 'silage', 'chaff', 'straw', 'grass_windrow', 'drygrass_windrow'],
		hayloft             : ['straw', 'drygrass_windrow'],
		horse               : ['horse_palomino', 'horse_black', 'horse_bay', 'horse_pinto', 'horse_seal_brown', 'horse_gray', 'horse_dun', 'horse_chestnut'],
		liquid              : ['milk', 'buffalomilk', 'water', 'diesel', 'def'],
		loadingvehicle      : ['wheat', 'barley', 'oat', 'canola', 'sorghum', 'ricelonggrain', 'sunflower', 'soybean', 'maize', 'woodchips', 'silage', 'chaff', 'forage', 'seeds', 'fertilizer', 'lime'],
		manurespreader      : ['manure'],
		mixerwagon          : ['forage', 'drygrass_windrow', 'silage', 'straw', 'mineral_feed', 'forage_mixing'],
		piece               : ['wool', 'treesaplings', 'egg'],
		planter_small       : ['beetroot', 'carrot', 'parsnip', 'spinach'],
		product             : ['honey', 'flour', 'riceflour', 'milk_bottled', 'goatmilk_bottled', 'buffalomilk_bottled', 'bread', 'cake', 'buffalomozzarella', 'goatcheese', 'butter', 'cheese', 'fabric', 'sugar', 'clothes', 'cereal', 'sunflower_oil', 'canola_oil', 'olive_oil', 'rice_oil', 'raisins', 'grapejuice', 'cement', 'cementbricks', 'barrel', 'bucket', 'bathtub', 'chocolate', 'boards', 'furniture', 'strawberry', 'lettuce', 'tomato', 'spring_onion', 'napacabbage', 'chilli', 'garlic', 'enoki', 'oyster', 'egg', 'cartonroll', 'paperroll', 'planks', 'prefabwall', 'woodbeam', 'potatochips', 'ricerolls', 'fermentednapacabbage', 'preservedcarrots', 'preservedparsnip', 'preservedbeetroot', 'noodlesoup', 'soupcansmixed', 'soupcanscarrots', 'soupcansbeetroot', 'soupcanspotato', 'roofplates', 'rope', 'canned_peas', 'spinach_bags', 'jarred_greenbean', 'rice_bags', 'rice_boxes', 'ricesaplings'],
		product_bga         : ['methane', 'electriccharge'],
		root_crops          : ['beetroot', 'carrot', 'parsnip', 'potato', 'sugarbeet'],
		shovel              : ['wheat', 'barley', 'oat', 'canola', 'sorghum', 'sunflower', 'soybean', 'maize', 'potato', 'sugarbeet', 'beetroot', 'carrot', 'parsnip', 'rice', 'ricelonggrain', 'greenbean', 'pea', 'spinach', 'olive', 'sugarcane', 'woodchips', 'sugarbeet_cut', 'silage', 'grass_windrow', 'drygrass_windrow', 'straw', 'chaff', 'forage', 'forage_mixing', 'pigfood', 'mineral_feed', 'seeds', 'fertilizer', 'lime', 'manure', 'snow', 'roadsalt', 'stone'],
		silagetrailer       : ['grass_windrow', 'drygrass_windrow', 'straw', 'chaff', 'silage', 'forage', 'woodchips', 'sugarcane'],
		slurrytank          : ['liquidmanure', 'digestate'],
		sprayer             : ['liquidfertilizer', 'herbicide'],
		spreader            : ['fertilizer'],
		topliftingharvester : ['beetroot', 'carrot', 'parsnip'],
		trainwagon          : ['wheat', 'barley', 'oat', 'canola', 'sorghum', 'sunflower', 'soybean', 'maize', 'potato', 'sugarbeet', 'sugarbeet_cut', 'beetroot', 'carrot', 'parsnip', 'rice', 'ricelonggrain', 'greenbean', 'pea', 'spinach', 'olive', 'grape', 'sugarcane', 'woodchips', 'seeds'],
		vegetables          : ['beetroot', 'carrot', 'parsnip'],
		windrow             : ['grass_windrow', 'drygrass_windrow', 'straw'],
	},

}

const icons = {
	map_to : (name) => {
		switch (name) {
			case 'bees'       : return ['fill-honey', 'width']
			case 'fillLevel'  : return ['look-fillunit', 'capacity-sm']
			case 'income'     : return ['look-income', 'money']
			case 'maxSpeed'   : return ['look-speed', 'speed']
			case 'needPower'  : return ['look-engine', 'power']
			case 'objects'    : return ['look-objects', 'count']
			case 'powerSpan'  : return ['look-engine', 'power']
			case 'price'      : return ['look-price', 'money']
			case 'speedLimit' : return ['look-speedlimit', 'speed']
			case 'weight'     : return ['look-weight', 'weight']
			case 'workWidth'  : return ['look-width', 'width']
			default : return ['fill-unknown', 'none']
		}
	},

	game : (icon, { width = '10vw' } = {}) =>
		typeof icon !== 'string' ?
			'' :
			icon.startsWith('fill-') ?
				`<fillType style="font-size : ${width}" name="${icon.substring(5)}"></fillType>` :
				`<i style="font-size : ${width}" class="fsico-${icon}"></i>`,

	item : (...testIconList) => {
		for ( const testIcon of testIconList ) {
			if ( typeof testIcon === 'string' ) {
				if ( testIcon.startsWith('data:') ) { return testIcon }
				if ( testIcon.startsWith('$data') ) {
					const iconPointer = testIcon.replace('.png', '.dds')
					const trueIcon    = client_BGData.icons[iconPointer]
					if ( typeof trueIcon === 'string' ) { return trueIcon }
				}
			}
		}
		return 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'-250 -250 1403.2 1404.2\'%3E%3Cpath style=\'fill: %23771111; filter: drop-shadow(10px 10px 5px rgb(0 0 0 / 0.4));\' opacity=\'0.3\' d=\'M441.6 0a441.6 441.6 0 1 0 0 883.2 441.6 441.6 0 0 0 0-883.2ZM129 674a387.4 387.4 0 0 1-76.9-232.4 386.9 386.9 0 0 1 114-275.4 388 388 0 0 1 275.4-114 386.9 386.9 0 0 1 283 122L129.2 674Zm587.8 43a388 388 0 0 1-275.3 114A386.9 386.9 0 0 1 163 713.6l595-499.1a387 387 0 0 1 73 227A386.9 386.9 0 0 1 717 717Z\' /%3E%3C/svg%3E'
	},

	forcePointer : (item) => {
		const trueIcon = client_BGData.icons[item]
		return icons.item(trueIcon, item)
	},

	brand : (fromIncludedBrand, brandID) => {
		const includedBrand = client_BGData.brandKeyToIcon[brandID.toUpperCase()]

		if ( typeof includedBrand !== 'undefined' ) {
			return `img/brand/${includedBrand}.webp`
		}

		if ( typeof fromIncludedBrand === 'object' ) {
			if ( fromIncludedBrand.iconFile !== null ) { return fromIncludedBrand.iconFile }
			if ( fromIncludedBrand.iconBase !== null ) {
				return fromIncludedBrand.iconBase.replace('.dds', '.webp').replace('$data/store/brands/', 'img/brand/').toLowerCase()
			}
		}
		return ''
	},

	fill_cats_from_fill : (name, version = 22) => {
		const foundCats = []
		if ( typeof fillCat[version] !== 'object' ) { return foundCats }
		for ( const [key, value] of Object.entries(fillCat?.[version])) {
			if ( value.includes(name) ) { foundCats.push(key) }
		}
		return foundCats
	},
	fills_from_fill_cat : (name, version = 22) => {
		return fillCat?.[version]?.[name] || []
	},
}


class Util {
	#locale = 'en'

	constructor(locale) {
		this.#locale = locale
	}

	num_default(value, { float = false, safe = 0 } = {}) {
		const newValue = typeof value === 'number' || typeof value === 'string' ? value : safe
		return !float ? parseInt(newValue) : parseFloat(newValue)
	}

	num_multiple(value, multiplier) {
		return `<span class="me-1">${Intl.NumberFormat(this.#locale, { maximumFractionDigits : 0 }).format(value * multiplier)}</span>`
	}

	num_format_single(value, unit, {dash_zeros = true} = {}) {
		if ( typeof value === 'undefined' || value === null ) { return dash_zeros ? '--' : '' }

		if ( dash_zeros && value === 0 ) { return '--' }

		const thisNumber = value * unit.factor
		return `${Intl.NumberFormat(this.#locale, { maximumFractionDigits : unit.precision }).format(thisNumber)} ${I18N.defer(unit.unit, false)}`
	}
	num_format(values, formatType, {dash_zeros = false, sep_range = ' - ', sep_sequence = ', ', sep_units = ' / '} = {}) {
		if ( typeof values === 'undefined' || values === null ) { return '' }

		const valueList  = typeof values === 'number' ? [values] : values
		const separator  = valueList.length < 3 ? sep_range : sep_sequence
		const returnText = []
		const transArray = this.unit_combo(formatType)

		for ( const thisValue of valueList ) {
			if ( dash_zeros && thisValue === 0 ) {
				returnText.push('--')
				continue
			}
			
			const thisText = []

			for ( const thisTrans of transArray ) {
				const thisNumber = thisValue * thisTrans.factor
				thisText.push(`${Intl.NumberFormat(this.#locale, { maximumFractionDigits : thisTrans.precision }).format(thisNumber)} ${I18N.defer(thisTrans.unit, false)}`)
			}
			returnText.push(thisText.join(sep_units))
		}

		return returnText.join(separator)
	}
	
	unit_combo(type) {
		switch ( type ) {
			case 'capacity'    : return [UNITS.l, UNITS.m3, UNITS.ft3]
			case 'capacity-sm' : return [UNITS.l, UNITS.ft3]
			case 'power'       : return [UNITS.hp, UNITS.kw]
			case 'speed'       : return [UNITS.kph, UNITS.mph]
			case 'width'       : return [UNITS.m, UNITS.ft]
			case 'weight'      : return [UNITS.kg, UNITS.t, UNITS.lbs]
			default            : return [UNITS.none]
		}
	}

	markup_row(icon, value, extraLine = null ) {
		return [
			'<div class="row border-top align-items-center py-1">',
			`<div class="col-auto">${icons.game(icon, { width : '1.5em' })}</div>`,
			`<div class="col text-end">${value}</div>`,
			'</div>',
			extraLine === null || extraLine.length === 0 ? '' : `<div class="row"><div class="col-1"></div><div class="col-11 text-end">${extraLine}</div></div>`,
		].join('')
	}

	markup_row_ifTrue(icon, value, extraLine = null ) {
		return value ? this.markup_row(icon, value, extraLine) : ''
	}

	markup_row_ifTrue_l10n(icon, value, l10n_key, extraLine = null ) {
		return value ? this.markup_row(icon, I18N.defer(l10n_key, false), extraLine) : ''
	}

	markup_data_ifTrue(type, value, extraLine = null ) {
		if ( !value || ( Array.isArray(value) && value[0] === 0 )) { return '' }
		const [typeIcon, typeUnit] = icons.map_to(type)
		return this.markup_row(typeIcon, this.num_format(value, typeUnit), extraLine)
	}

	markup_joints(joints, is_has_joint) {
		if ( typeof joints === 'undefined' ) { return false }
	
		let   hasCustom = false
		const jointHTML = []
	
		for ( const thisJoint of joints ) {
			if ( ! client_BGData.jointList.includes(thisJoint) ) {
				hasCustom = true
				continue
			}
			jointHTML.push(`<div class="badge joint ${is_has_joint ? 'attach_has' : 'attach_need'}" data-jointPage="${thisJoint.toLowerCase()}">${thisJoint}</div>`)
		}
		if ( hasCustom ) {
			jointHTML.push(`<div class="badge joint custom ${is_has_joint ? 'attach_has' : 'attach_need'}" data-jointPage="">${I18N.defer('attachment_custom', false)}</div>`)
		}

		return jointHTML.length === 0 ? null : `<div class="d-flex joint-container justify-content-end">${jointHTML.join('')}</div>`
	}

	markup_pRow(content) {
		return `<div class="d-flex flex-wrap justify-content-center align-items-center">${content}</div>`
	}
	markup_pSingle(icon, amount = '') {
		return this.markup_pRow(`${icon}${amount}`)
	}
	markup_pItem(fill, amount, cycles) {
		return `${this.num_multiple(amount, cycles)}${this.markup_fill(fill)}`
	}
	markup_pBoost(fill, amount, cycles, percentage) {
		return this.markup_pRow(`${this.num_multiple(amount, cycles)}${this.markup_fill(fill)}(${percentage}%)`)
	}
	markup_pPlus() {
		return this.markup_pRow('<i class="text-success bi-plus-lg"></i>')
	}
	markup_pOr() {
		return '<i class="text-info bi-distribute-horizontal mx-1"></i>'
	}
	markup_pOrB() {
		return '<i class="text-info bi-plus-slash-minus mx-1"></i>'
	}
	markup_fill(type, width = '2rem') {
		return `<fillType style="font-size: ${width}" name="${type}"></fillType>`
	}
}

class client_BuilderVehicle {
	#util     = null
	#item     = null
	#filename = null
	#version  = 22
	#locale   = 'en'
	#brands   = {}
	#uuid     = null
	#modName  = null

	#htmlDIV = null
	#icon = null
	#brand = null

	#combos = []

	#specs = {}

	#html_arr = {}

	comboKeyList = new Set()
	
	constructor(fileName, item, modName, locale = 'en', gameVersion = 22, extraBrands = {}) {
		this.#util     = new Util(locale)
		this.#locale   = locale
		this.#uuid     = crypto.randomUUID()
		this.#item     = item
		this.#filename = fileName
		this.#modName  = modName
		this.#version  = gameVersion
		this.#brands   = extraBrands

		this.#normalize_specs()

		
		this.doIcons()
	}

	get data() {
		return this.#specs
	}

	get comboData() {
		return {
			...this.data,
			brand_icon : this.#brand,
			file_name  : this.#filename,
			icon       : this.#icon,
			name       : this.name,
		}
	}

	get cleanParentID() {
		const parentFile = this.#item.parentItem
		if ( typeof parentFile !== 'string' ) { return null }
		const attemptKey = parentFile.replace('.xml', '').replace('$data/', '').replaceAll('/', '_')
		return ( typeof client_BGData.vehicles[attemptKey] !== 'undefined' ) ? attemptKey : null
	}

	#add_sidebar(item) {
		if ( item !== '' ) { this.#html_arr.sidebar.push(item) }
	}

	get icon() { return this.#icon }
	get brand() { return this.#brand }
	get name() { return I18N.unwrap_base(this.#item.sorting.name, this.#version) }

	doIcons() {
		if ( this.#item.iconOrig === '$data/store/store_empty.png' ) {
			this.#icon = icons.item([])
		} else if ( typeof this.#item.dlcKey !== 'undefined' && this.#item.dlcKey !== null ) {
			const iconPointer = this.#item.iconOrig.replace('.png', '.dds')
			const trueIcon    = client_BGData.icons[iconPointer]
			if ( typeof trueIcon === 'string' ) { this.#icon = trueIcon }
		} else {
			this.#icon  = icons.item(this.#item.iconFile, this.#item.iconBase, this.#item.iconOrig)
		}
		this.#brand = icons.brand(this.#brands[this.#item.sorting.brand], this.#item.sorting.brand)
	}

	get itemCard() {
		return [
			'price',
			'powerSpan',
			'needPower',
			'maxSpeed',
			'speedLimit',
			'fillLevel',
			'workWidth',
		].map((x) => this.#util.markup_data_ifTrue(x, this.#specs[x])).join('')
	}

	doSideBar() {
		this.#html_arr.sidebar = [
			'price',
			'powerSpan',
			'needPower',
			'maxSpeed',
			'speedLimit',
			'weight'
		].map((x) => this.#util.markup_data_ifTrue(x, this.#specs[x]))

		this.#add_sidebar(this.#util.markup_row_ifTrue_l10n('look-transmission', this.#item.motor.transmissionType, this.#item.motor.transmissionType))
		this.#add_sidebar(this.#util.markup_row_ifTrue_l10n('look-diesel', this.#item.motor.fuelType === 'diesel', 'look_diesel'))
		this.#add_sidebar(this.#util.markup_row_ifTrue_l10n('look-methane', this.#item.motor.fuelType === 'methane', 'look_methane'))
		this.#add_sidebar(this.#util.markup_row_ifTrue_l10n('look-electric', this.#item.motor.fuelType === 'electriccharge', 'look_electric'))
		this.#add_sidebar(this.#util.markup_row_ifTrue_l10n('look-lights', this.#item.flags.lights, 'look_has_lights'))
		this.#add_sidebar(this.#util.markup_row_ifTrue_l10n('look-beacons', this.#item.flags.beacons, 'look_has_beacons'))
		this.#add_sidebar(this.#util.markup_row_ifTrue_l10n('look-paintable', this.#item.flags.color, 'look_has_paint'))
		this.#add_sidebar(this.#util.markup_row_ifTrue_l10n('look-wheels', this.#item.flags.wheels, 'look_has_wheels'))
		this.#add_sidebar(this.#util.markup_row_ifTrue('look-year', this.#item.sorting.year))

		const sprayHTML = this.#getSprays()
		if ( sprayHTML !== '' ) {
			this.#add_sidebar(this.#util.markup_row('look-width', sprayHTML))
		} else {
			this.#add_sidebar(this.#util.markup_data_ifTrue('workWidth', this.#specs.workWidth))
		}

		const fills = this.#getFillTypeArray(this.#item.fillSpray.fillType, this.#item.fillSpray.fillCat)
		this.#add_sidebar(this.#util.markup_data_ifTrue('fillLevel', this.#specs.fillLevel, fills.join('')))

		this.#add_sidebar(this.#util.markup_row_ifTrue(
			'cat-attach-has',
			this.#item.specs.jointAccepts.length !== 0 ? I18N.defer('basegame_attach_has', false) : false,
			this.#util.markup_joints(this.#item.specs.jointAccepts, true)
		))

		this.#add_sidebar(this.#util.markup_row_ifTrue(
			'cat-attach-need',
			this.#item.specs.jointRequires.length !== 0 ? I18N.defer('basegame_attach_need', false) : false,
			this.#util.markup_joints(this.#item.specs.jointRequires, true)
		))
	}

	get HTML() {
		this.#html_arr.chart = this.#item.motor.motors.length !== 0 ? this.#markupChart() : []

		this.doSideBar()

		this.#htmlDIV = document.createElement('div')

		this.#htmlDIV.innerHTML = [
			`<div class="inset-vehicle-block vehicleInfoBlock col-12 inset-block" id="${this.#uuid}"><div>`,
			`<span class="inset-block-header" name="detail_dev_info">${I18N.unwrap_base(this.#item.sorting.name, this.#version)}</span>`,
			'<span class="inset-block-header-show-hide"><i18n-text type="button" class="btn btn-sm btn-warning action-item-compare" data-key="basegame_button_comp"></i18n-text></span>',
			'<span class="inset-block-blurb-detail">',
			`<small class="fst-italic">${I18N.unwrap_base(this.#item.sorting.typeDescription, this.#version)}</small>`,
			'<span class="fw-normal" style="font-size: 50%">-</span>',
			`<small class="fst-italic fw-normal">${this.#item.sorting.typeName}</small>`,
			'<span class="fw-normal" style="font-size: 50%">-</span>',
			`<small class="fw-bold">${I18N.unwrap_base(this.#item.sorting.category, this.#version)}</small>`,
			'</span>',
			'<div class="inset-body">',
			'<div class="row mx-2">',
			'<div class="col-5 my-auto mx-auto">',
			`<div class="store-icon-image"><img src="${this.#icon}" class="img-fluid store-icon-image"></div>`,
			`<div class="store-icon-brand"><img src="${this.#brand}" class="img-fluid store-brand-image"></div>`,
			'</div><div class="col-7">',
			...this.#html_arr.sidebar,
			'</div>',
			`<div class="col-12 py-2"><p class="text-center">${this.#item.specs.functions.map((x) => I18N.unwrap_base(x, this.#version)).join('<br>')}</p></div>`,
			`<div class="col-12 py-2 combo-list  ${this.#combos.length === 0 ? 'd-none' : ''}">`,
			'<div class="inset-inline-header">',
			`<span class="inset-inline-header-text"><i18n-text data-key="combinations_title"></i18n-text> (<span class="combo_count">${this.#combos.length}</span>)</span>`,
			'<span class="inset-inline-header-button">',
			'<i18n-text type="button" class="btn btn-warning btn-vsm action-compare-all-combo" data-key="basegame_compare_all"></i18n-text>',
			'</span>',
			'<span class="inset-block-combo-show-hide bg-danger" style="margin-left: 10px; margin-top: -1.5rem; margin-right: auto;">',
			'<i18n-text class="section_show" data-key="section_show"></i18n-text>',
			'<i18n-text class="d-none section_hide" data-key="section_hide"></i18n-text>',
			'</span></div>',
			'<div class="combo-item-list d-none"></div>',
			'</div>',
			...this.#html_arr.chart,
			'</div></div></div></div>'
		].join('')
		
		if ( this.#combos.length !== 0 ) {
			const comboParent = this.#htmlDIV.querySelector('.combo-item-list')
			for ( const thisCombo of this.#combos ) {
				comboParent.appendChild(thisCombo)
			}
			const showHide    = this.#htmlDIV.querySelector('.inset-block-combo-show-hide')
			showHide.addEventListener('click', () => {
				const isShow      = showHide.querySelector('.section_hide').classList.contains('d-none')
				comboParent.clsShow(isShow)
				showHide.children[0].clsShow(!isShow)
				showHide.children[1].clsShow(isShow)
			})
		}

		DATA.eventEngine(this.#htmlDIV, '.action-compare-all-combo', this.clicks.all_combo)
		DATA.eventEngine(this.#htmlDIV, '.action-item-compare', this.clicks.single)
		DATA.eventEngine(this.#htmlDIV, '.attach_has, .attach_need', this.clicks.joint)


		return this.#htmlDIV
	}

	clicks = {
		joint : (e) => {
			const realTarget = e.target.closest('.badge')
			if ( realTarget.classList.contains('custom') ) { return }
			const openObject = {
				type  : realTarget.classList.contains('attach_need') ? 'attach_need' : 'attach_has',
				page  : realTarget.safeAttribute('data-jointpage'),
			}
			window.detail_IPC?.sendBase?.(openObject)
			window.basegame_IPC?.sendBase?.(openObject)
		},
		single : () => {
			const compareObj = {
				contents : this.comboData,
				internal : this.#filename === null,
				key      : this.#uuid,
				source   : this.#modName,
			}
			window.detail_IPC?.sendCompare?.([compareObj])
			window.basegame_IPC?.sendCompare?.([compareObj])
		},
		all_combo : () => {
			window.detail_IPC?.sendCompare?.([...this.comboKeyList])
			window.basegame_IPC?.sendCompare?.([...this.comboKeyList])
		},

	}

	#getColor = (idx) => this.graphColors[idx % this.graphColors.length]

	graphColors = [
		'#4dc9f6',
		'#f67019',
		'#f53794',
		'#537bc4',
		'#acc236',
		'#166a8f',
		'#00a950',
		'#58595b',
		'#8549ba'
	]

	async doCharts(chartUnits) {
		if (this.#item.motor.motors.length === 0 ) { return }

		const rpmData = []
		const mphData = []
		const kphData = []

		for ( const [index, thisMotor] of this.#item.motor.motors.entries() ) {
			const thisMotorLine = {
				backgroundColor        : `${this.#getColor(index)}88`,
				borderColor            : this.#getColor(index),
				cubicInterpolationMode : 'monotone',
				/* eslint-disable-next-line no-await-in-loop */
				label                  : await I18N.unwrap_base_inline(thisMotor.name),
				pointHoverRadius       : 12,
				pointRadius            : 8,
				pointStyle             : 'circle',
				tension                : 0.4,
				yAxisID                : 'y',
			}

			rpmData.push({
				...thisMotorLine,
				data : thisMotor.horsePower.map((e) => { return { x : e.rpm, y : e.value } } ),
			})
			mphData.push({
				...thisMotorLine,
				data : thisMotor.speedMph.map((e) => { return { x : e.rpm, y : e.value } } ),
			})
			kphData.push({
				...thisMotorLine,
				data : thisMotor.speedKph.map((e) => { return { x : e.rpm, y : e.value } } ),
			})
		}

		new Chart(
			MA.byId(`${this.#uuid}_canvas_hp`),
			{
				type : 'line',
				data : {
					datasets : rpmData,
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
			MA.byId(`${this.#uuid}_canvas_kph`),
			{
				type : 'line',
				data : {
					datasets : kphData,
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
			MA.byId(`${this.#uuid}_canvas_mph`),
			{
				type : 'line',
				data : {
					datasets : mphData,
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

	#normalize_specs() {
		this.#specs.fillLevel  = this.#util.num_default(this.#item.fillSpray.fillLevel)
		this.#specs.hasPower   = this.#util.num_default(this.#item.specs.specs?.power)
		this.#specs.needPower  = this.#util.num_default(this.#item.specs.specs?.neededPower)
		this.#specs.price      = this.#util.num_default(this.#item.specs.price)
		this.#specs.speedLimit = this.#util.num_default(this.#item.specs.specs?.speedLimit)
		this.#specs.weight     = this.#util.num_default(this.#item.specs.weight)
		this.#specs.workWidth  = this.#util.num_default(this.#item.specs.specs?.workingWidth, { float : true })
		
		this.#specs.maxSpeed   = this.#util.num_default(this.#item.specs.specs?.maxSpeed)

		if ( this.#specs.maxSpeed === 0 && this.#item.motor.motors.length !== 0 ) {
			for ( const motor of this.#item.motor.motors ) {
				this.#specs.maxSpeed = Math.max(this.#specs.maxSpeed, motor.maxSpeed)
			}
		}

		this.#specs.powerSpan = { min : 0, max : 0 }

		if ( this.#specs.hasPower !== 0 ) {
			if ( this.#item.motor.motors.length === 0 ) {
				this.#specs.powerSpan.min = this.#specs.hasPower
				this.#specs.powerSpan.max = this.#specs.hasPower
			} else {
				this.#specs.powerSpan.min = 10000
				for ( const motor of this.#item.motor.motors ) {
					const thisMotorMax = Math.max(...motor.horsePower.map((x) => x.value))
					this.#specs.powerSpan.min = Math.min(thisMotorMax, this.#specs.powerSpan.min)
					this.#specs.powerSpan.max = Math.max(thisMotorMax, this.#specs.powerSpan.max)
				}
			}
		}

		if ( this.#specs.powerSpan.min === this.#specs.powerSpan.max ) {
			this.#specs.powerSpan = this.#specs.powerSpan.min
		} else {
			this.#specs.powerSpan = [this.#specs.powerSpan.min, this.#specs.powerSpan.max]
		}

		if ( this.#item.fillSpray.sprayTypes.length !== 0 && this.#specs.workWidth === 0 ) {
			for ( const thisWidth of this.#item.fillSpray.sprayTypes ) {
				this.#specs.workWidth = Math.max(thisWidth.width, this.#specs.workWidth)
			}
		}
	}

	#getSprays() {
		if ( this.#item.fillSpray.sprayTypes.length === 0 ) { return '' }

		const HTML = []

		for ( const thisSpray of this.#item.fillSpray.sprayTypes ) {
			const fills = this.#getFillTypeArray(thisSpray.fills)

			HTML.push(`${fills.join('')} ${this.#util.num_format(
				thisSpray.width ?? this.#specs.workWidth,
				'width'
			)}`)
		}
		return HTML.join('<br>')
	}

	#getFillTypeArray(fills, cats = []) {
		if ( !Array.isArray(fills) || !Array.isArray(cats)) { return [] }

		const allFills = new Set(fills)

		for ( const cat of cats ) {
			icons.fills_from_fill_cat(cat, this.#version).map((x) => allFills.add(x))
		}

		return [...allFills].map((x) => `<fillType name="${x}"></fillType>`)
	}

	#markupChart() {
		return [
			`<nav><div class="nav nav-tabs" id="${this.#uuid}_nav-tab" role="tablist">`,

			...[
				{ active : true, id : 'hp',  icon : 'engine'},
				{ active : false, id : 'kph', icon : 'speed'},
				{ active : false, id : 'mph', icon : 'speed'},
			].map((x) => `<button class="nav-link ${x.active ? 'active' : ''}" id="${this.#uuid}_${x.id}_tab" data-bs-toggle="tab" data-bs-target="#${this.#uuid}_${x.id}_graph" type="button" role="tab" ><i class="fsicoLI fsico-look-${x.icon}"></i><i18n-text data-key="unit_${x.id}"></i18n-text></button>`),

			'</div></nav>',
			`<div class="tab-content" id="${this.#uuid}_nav-tabContent">`,

			...[
				{ active : true, id : 'hp'},
				{ active : false, id : 'kph'},
				{ active : false, id : 'mph'},
			].map((x) => `<div class="tab-pane fade ${x.active ? 'show active' : ''}" id="${this.#uuid}_${x.id}_graph" role="tabpanel"><canvas id="${this.#uuid}_canvas_${x.id}" ></canvas></div>`),

			'</div>'
		]
	}

	get lookItemMap () {
		return [this.#filename, this.#uuid]
	}

	populateCombos (lookRecord = {}) {
		if ( this.#item.sorting.combos.length === 0 ) { return }
	
		for ( const thisCombo of this.#item.sorting.combos ) {
			if ( thisCombo === null ) { continue }
	
			const thisComboIsBase = thisCombo.startsWith('$data')
			const thisComboKey    = thisComboIsBase ? thisCombo.replaceAll('$data/', '').replaceAll('/', '_').replaceAll('.xml', '') : thisCombo
	
			if ( thisComboKey !== null ) {
				const thisItem = thisComboIsBase ? client_BGData?.[client_BGData.itemKeyToType[thisComboKey]]?.[thisComboKey] : lookRecord?.vehicles?.[thisComboKey]
	
				if ( typeof thisItem === 'undefined' ) { continue }
	
				const thisItemParsed = new client_BuilderVehicle(
				 	thisComboIsBase ? null : thisComboKey,
					thisItem,
					thisComboIsBase ? null : this.#modName,
					this.#locale,
					this.#version
				)

				this.comboKeyList.add({
					contents : thisItemParsed.comboData,
					internal : thisComboIsBase,
					key      : thisComboKey,
					source   : thisComboIsBase ? null : this.#modName,
				})

				const thisNode = document.createElement('div')

				thisNode.innerHTML = [
					'<div class="row border-bottom mb-2 comboItemEntry">',
					'<div class="text-center col-2 py-2 mt-0 pt-0 comboItemClicker">',
					`<div class="store-icon-image"><img src="${thisItemParsed.icon}" class="img-fluid store-icon-image"></div>`,
					`<div class="store-icon-brand"><img src="${thisItemParsed.brand}" class="img-fluid store-brand-image"></div>`,
					'</div>',
					'<div class="col-5 align-self-center text-center comboItemClicker">',
					thisItemParsed.name,
					'<br><em>',
					I18N.unwrap_base(thisItem.sorting.category, this.#version),
					'</em></div>',
					'<div class="col-4 align-self-center comboItemClicker">',
					this.#util.markup_data_ifTrue('price', thisItemParsed.data.price),
					this.#util.markup_data_ifTrue('workWidth', thisItemParsed.data.workWidth),
					'</div>',
					`<div class="text-center col-1 align-self-center comboCompareButton ${thisItem.masterType === 'vehicle' ? '' : 'd-none'}">`,
					'<i18n-text type="button" class="btn btn-warning btn-vsm float-end mt-2 comboItemAddClicker" style="margin-left: -25px; margin-right:5px;" data-key="basegame_button_comp"></i18n-text>',
					'</div>',
					'</div>',
				].join('')
	
				DATA.eventEngine(thisNode, '.comboItemClicker', () => {
					if ( thisComboIsBase ) {
						window.detail_IPC?.sendBase?.({ type : 'item', page : thisComboKey })
						window.basegame_IPC?.sendBase?.({ type : 'item', page : thisComboKey })
					} else {
						location.hash = window.lookItemMap[thisComboKey]
					}
				})
				DATA.eventEngine(thisNode, '.comboItemAddClicker', () => {
					const compareObj = {
						contents : thisItemParsed.comboData,
						internal : thisComboIsBase,
						key      : thisComboKey,
						source   : thisComboIsBase ? null : this.#modName,
					}
					window.detail_IPC?.sendCompare?.([compareObj])
					window.basegame_IPC?.sendCompare?.([compareObj])
				})
				
				this.#combos.push(thisNode)
			}
		}
		
	}
}

class client_BuilderPlace {
	#util     = null
	#item     = null
	#version  = 22

	#htmlDIV = null
	#icon = null

	#specs = {}

	#productions = []
	#html_arr = {}

	
	constructor(item, locale = 'en', gameVersion = 22) {
		this.#util     = new Util(locale)
		this.#item     = item
		this.#version  = gameVersion

		this.doIcons()
	}

	get data() {
		return this.#specs
	}

	get cleanParentID() {
		return null
	}

	get icon() { return this.#icon }
	get brand() { return '' }
	get name() { return I18N.unwrap_base(this.#item.sorting.name, this.#version) }

	get itemCard() {
		return this.#util.markup_data_ifTrue('price', this.#util.num_default(this.#item.sorting.price))
	}

	#add_sidebar(item) {
		if ( item !== '' ) { this.#html_arr.sidebar.push(item) }
	}

	doIcons() {
		if ( this.#item.iconOrig === '$data/store/store_empty.png' ) {
			this.#icon = icons.item([])
		} else if ( typeof this.#item.dlcKey !== 'undefined' && this.#item.dlcKey !== null ) {
			const iconPointer = this.#item.iconOrig.replace('.png', '.dds')
			const trueIcon    = client_BGData.icons[iconPointer]
			if ( typeof trueIcon === 'string' ) { this.#icon = trueIcon }
		} else {
			this.#icon  = icons.item(this.#item.iconFile, this.#item.iconBase, this.#item.iconOrig)
		}
	}

	doSideBar() {
		this.#html_arr.sidebar = []

		this.#add_sidebar(this.#util.markup_data_ifTrue('price', this.#util.num_default(this.#item.sorting.price)))
		this.#add_sidebar(this.#util.markup_data_ifTrue('income', this.#util.num_default(this.#item.sorting.incomePerHour)))
		this.#add_sidebar(this.#util.markup_data_ifTrue('objects', this.#util.num_default(this.#item.storage.objects)))
		
		const fills = this.#getFillTypeArray(this.#item.storage.siloFillCats, this.#item.storage.siloFillTypes)
		this.#add_sidebar(this.#util.markup_data_ifTrue('fillLevel', this.#specs.fillLevel, fills.join('')))

		this.#add_sidebar(this.#util.markup_data_ifTrue('bees', this.#util.num_default(this.#item.animals.beehiveRadius)))

		this.#add_sidebar(this.#util.markup_row_ifTrue(
			`fill-${this.#item.animals.husbandryType?.toLowerCase?.()}`,
			this.#util.num_default(this.#item.animals.husbandryAnimals)
		))
	}

	doProductions() {
		this.#productions = this.#item.productions.map((x) => this.doProduction(x))
	}

	#doCycle(cycle) {
		const min = Math.floor(cycle / 60) === 0 ? '<1' : Math.floor(cycle / 60)
		return [
			'<div class="row">',
			`<div class="col border-end"><i18n-text data-key="prod_month"></i18n-text><br>${Math.floor(cycle * 24)}</div>`,
			`<div class="col border-end"><i18n-text class="text-warning-emphasis" data-key="prod_hour"></i18n-text><br>${Math.floor(cycle)}</div>`,
			`<div class="col"><i18n-text data-key="prod_minute"></i18n-text><br>${min}</div>`,
			'</div>'
		]
	}

	doProduction(prodRecord) {

		const output = prodRecord.output.map((x) =>
			this.#util.markup_pRow(this.#util.markup_pItem(
				x.fillType,
				x.amount,
				prodRecord.cyclesPerHour
			))
		).join(this.#util.markup_pPlus())

		const boosts = this.#util.markup_pRow(prodRecord.boosts.map((x) =>
			this.#util.markup_pBoost(
				x.fillType,
				x.amount,
				prodRecord.cyclesPerHour,
				x.boostFactor * 100
			)
		).join(this.#util.markup_pOrB()))

		const inputs = prodRecord.recipe.map((items) =>
			this.#util.markup_pRow(items.map((x) =>
				this.#util.markup_pItem(
					x.fillType,
					x.amount,
					prodRecord.cyclesPerHour
				)
			).join(this.#util.markup_pOr()))
		)

		if ( prodRecord.boosts.length !== 0 ) {
			inputs.unshift(boosts)
		}

		const input_and_boost = inputs.join(this.#util.markup_pPlus())

		return [
			'<div class="row border-top mt-2">',
			'<div class="col-4 text-center align-self-top border-end">',
			`<div class="row py-2"><div class="col">${I18N.unwrap_base(prodRecord.name, this.#version, prodRecord.params)}</div></div>`,
			'<div class="row py-2 align-items-center"><div class="col-12 mb-1"><i style="font-size: 1.5rem" class="fsico-look-prod-cycle"></i></div><div class="col-12">',
			...this.#doCycle(prodRecord.cyclesPerHour),
			'</div></div>',
			'<div class="row py-2 align-items-center"><div class="col-12 mb-1"><i style="font-size: 1.5rem" class="fsico-look-price"></i></div><div class="col-12">',
			...this.#doCycle(prodRecord.costPerHour),
			'</div></div>',
			'</div>',
			'<div class="col-8 text-center align-self-center">',
			'<div class="row align-items-center"><!-- inputs -->',
			'<div class="col-10">',
			input_and_boost,
			'</div>',
			'<div class="col-2">',
			'<i style="font-size: 1.5rem" class="fsico-look-prod-input"></i>',
			'</div>',
			'</div>',
			'<div class="row border-top align-items-center pt-2 mt-2"><!-- outputs -->',
			'<div class="col-10">',
			output,
			'</div>',
			'<div class="col-2">',
			'<i style="font-size: 1.5rem" class="fsico-look-prod-output"></i>',
			'</div>',
			'</div>',
			'</div>',
			'</div>',
		].join('')
	}

	get HTML() {
		this.doSideBar()
		this.doProductions()

		this.#htmlDIV = document.createElement('div')

		this.#htmlDIV.innerHTML = [
			'<div class="col-12 inset-block inset-placable-block"><div>',
			`<span class="inset-block-header" name="detail_dev_info">${I18N.unwrap_base(this.#item.sorting.name, this.#version)}</span>`,
			'<span class="inset-block-blurb-detail">',
			`<small class="fst-italic fw-normal">${this.#item.sorting.typeName}</small>`,
			'<span class="fw-normal" style="font-size: 50%">-</span>',
			`<small class="fw-bold">${I18N.unwrap_base(this.#item.sorting.category, this.#version)}</small>`,
			'</span>',
			'<div class="inset-body">',
			'<div class="row mx-2">',
			'<div class="col-5 my-auto mx-auto">',
			`<div class="store-icon-image"><img src="${this.#icon}" class="img-fluid store-icon-image"></div>`,
			'</div>',
			'<div class="col-7">',
			...this.#html_arr.sidebar,
			'<div class="prodLines">',
			...this.#productions,
			'</div></div>',
			`<div class="col-12 pt-2"><p class="text-center">${this.#item.sorting.functions.map((x) => I18N.unwrap_base(x, this.#version)).join('<br>')}</p></div>`,
			'</div></div></div></div>',
		].join('')

		return this.#htmlDIV
	}

	#getFillTypeArray(fills, cats = []) {
		if ( !Array.isArray(fills) || !Array.isArray(cats)) { return [] }

		const allFills = new Set(fills)

		for ( const cat of cats ) {
			icons.fills_from_fill_cat(cat, this.#version).map((x) => allFills.add(x))
		}

		return [...allFills].map((x) => `<fillType name="${x}"></fillType>`)
	}
}