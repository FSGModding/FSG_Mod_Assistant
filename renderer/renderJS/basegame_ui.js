/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Base game window UI

/* global Chart, processL10N, fsgUtil, client_baseGameBrandMap, client_baseGameData, client_baseGameCats, client_baseGameBrandIconMap, client_baseGameBrands, client_baseGameTopLevel, client_baseGameCatMap_vehicle, client_baseGameCatMap_place */

let currentLocale = 'en'

const prodMulti = (amount, multi) => `${Intl.NumberFormat(currentLocale, { maximumFractionDigits : 0 }).format(amount)}${multi > 1 ? ` <small>(${Intl.NumberFormat(currentLocale, { maximumFractionDigits : 0 }).format(amount * multi)})</small>` : ''}`

const buildProduction = (prodRecords) => {
	if ( typeof prodRecords === 'undefined' || prodRecords === null ) { return ''}
	const liEntry  = '<li class="list-group-item">'
	const prodHTML = []

	for ( const thisProduction of prodRecords ) {
		const multi     = thisProduction.cycles
		const inputHTML = []

		for ( const inputMix in thisProduction.inputs ) {
			if ( inputMix !== 'no_mix' ) {
				inputHTML.push(`${liEntry}${thisProduction.inputs[inputMix].map((x) => `${prodMulti(x.amount, multi, currentLocale)} ${fsgUtil.getFillImage(x.filltype)}`).join(' <i class="prodIcon bi bi-distribute-horizontal"></i> ')}</li>`)
			}
		}

		inputHTML.push(...thisProduction.inputs.no_mix.map((x) => `${liEntry}${prodMulti(x.amount, multi, currentLocale)} ${fsgUtil.getFillImage(x.filltype)}</li>`))

		prodHTML.push(fsgUtil.useTemplate('prod_div', {
			class_prodBoosts : thisProduction.boosts.length !== 0 ? ''                                                                                                                                                                                : 'd-none',
			prodBoosts       : thisProduction.boosts.length !== 0 ? thisProduction.boosts.map((x) => `${liEntry}${prodMulti(x.amount, multi, currentLocale)} ${fsgUtil.getFillImage(x.filltype)}  <i class="prodIcon bi bi-caret-up-square"></i> ${x.boostFac * 100}%</li>`).join(' ') : '',
			prodCost         : Intl.NumberFormat(currentLocale).format(thisProduction.cost),
			prodCycles       : thisProduction.cycles,
			prodInputs       : inputHTML.join('<li class="list-group-item"><i class="prodIconLG bi bi-plus-circle"></i></li>'),
			prodName         : thisProduction.name,
			prodOutput       : thisProduction.outputs.map((x) => `${prodMulti(x.amount, multi, currentLocale)} ${fsgUtil.getFillImage(x.filltype)}`).join(' <i class="prodIcon bi bi-plus-lg"></i> '),
		}))
	}
	return prodHTML.join('')
}

const buildWidth2 = (sprayTypes, defaultWidth) => {
	if ( typeof sprayTypes !== 'object' || sprayTypes === null || sprayTypes.length === 0 ) {
		return ''
	}

	const sprayTypesHTML = []

	for ( const thisType of sprayTypes ) {
		const fillImages = thisType.fills.map((thisFill) => fsgUtil.knownFills.has(thisFill) ? `<img style="height: 25px" src="img/fills/${thisFill}.webp">` : '')
		sprayTypesHTML.push(`<div class="ms-4">${fillImages.join(' ')} ${fsgUtil.numFmtMany(thisType.width !== null ? thisType.width : defaultWidth, currentLocale, [
			{ factor : 1,       precision : 1, unit : 'unit_m' },
			{ factor : 3.28084, precision : 1, unit : 'unit_ft' },
		])}</div>`)
	}
	return sprayTypesHTML.join('')
}

const getMaxSpeed = (specSpeed, limitSpeed, motorSpeed) => {
	const specSpeed_clean = getDefault(specSpeed, false, 0)
	const limitSpeed_clean = getDefault(limitSpeed, false, 0)

	if ( specSpeed_clean > 0 ) { return specSpeed_clean }
	if ( limitSpeed_clean > 0 ) { return limitSpeed_clean }

	if ( typeof motorSpeed !== 'undefined' && motorSpeed !== null ) {
		let thisMax = 0
		for ( const thisSpeed of motorSpeed ) {
			thisMax = Math.max(thisMax, thisSpeed)
		}
		return thisMax
	}
	return 0
}

const client_buildStore = (thisItem) => {
	const storeItemsHTML = []
	const storeItemsJS   = []

	const thisItemUUID = crypto.randomUUID()

	if ( thisItem.masterType === 'vehicle' ) {
		const brandImage = fsgUtil.knownBrand.has(`brand_${thisItem.brand.toLowerCase()}`) ? `img/brand/brand_${thisItem.brand.toLowerCase()}.webp` : null
		const maxSpeed   = getMaxSpeed(thisItem?.specs?.maxspeed, thisItem?.speedLimit, thisItem?.motorInfo?.speed)
		const thePower   = getDefault(thisItem?.specs?.power)
		const getPower   = getDefault(thisItem?.specs?.neededpower)
		let   theWidth   = getDefault(thisItem?.specs?.workingwidth, true)
		const theFill    = getDefault(thisItem.fillLevel)
		const fillImages = thisItem.fillTypes.map((thisFill) => fsgUtil.knownFills.has(thisFill) ? `<img style="height: 25px" src="img/fills/${thisFill}.webp">` : '')
		const powerSpan  = fsgUtil.getMinMaxHP(thePower, thisItem?.motorInfo)
		
		if ( typeof thisItem.sprayTypes !== 'undefined' && thisItem.sprayTypes !== null && thisItem?.sprayTypes?.length !== 0 && theWidth === 0 ) {
			for ( const thisWidth of thisItem.sprayTypes ) {
				theWidth = Math.max(thisWidth.width, theWidth)
			}
		}

		storeItemsHTML.push(fsgUtil.useTemplate('vehicle_div', {
			brandHIDE         : shouldHide(brandImage),
			brandIMG          : fsgUtil.iconMaker(brandImage),
			category          : thisItem.category,
			enginePower       : fsgUtil.numFmtMany(powerSpan, currentLocale, [
				{ factor : 1,      precision : 0, unit : 'unit_hp' },
				{ factor : 0.7457, precision : 1, unit : 'unit_kw' },
			]),
			fillImages        : fillImages.join(' '),
			fillUnit          : fsgUtil.numFmtMany(theFill, currentLocale, [
				{ factor : 1,         precision : 0, unit : 'unit_l' },
				{ factor : 0.001,     precision : 1, unit : 'unit_m3' },
				{ factor : 0.0353147, precision : 1, unit : 'unit_ft3' },
			]),
			functions         : wrapFunctions(thisItem.functions),
			iconIMG           : thisItem.icon,
			itemName          : thisItem.name,
			itemTitle         : thisItem.type,
			maxSpeed          : fsgUtil.numFmtMany(maxSpeed, currentLocale, [
				{ factor : 1,        precision : 0, unit : 'unit_kph' },
				{ factor : 0.621371, precision : 0, unit : 'unit_mph' },
			]),
			needPower         : fsgUtil.numFmtMany(getPower, currentLocale, [
				{ factor : 1,      precision : 0, unit : 'unit_hp' },
				{ factor : 0.7457, precision : 1, unit : 'unit_kw' },
			]),
			price             : Intl.NumberFormat(currentLocale).format(thisItem.price),
			show_diesel       : shouldHide(thisItem.fuelType, 'diesel'),
			show_electric     : shouldHide(thisItem.fuelType, 'electriccharge'),
			show_enginePower  : shouldHide(thisItem?.specs?.power),
			show_fillUnit     : thisItem.fillLevel > 1 ? '' : 'd-none',
			show_graph        : thisItem.motorInfo === null ? 'd-none' : '',
			show_hasBeacons   : shouldHide(thisItem.hasBeacons),
			show_hasLights    : shouldHide(thisItem.hasLights),
			show_hasPaint     : shouldHide(thisItem.hasColor),
			show_hasWheels    : shouldHide(thisItem.hasWheelChoice),
			show_maxSpeed     : shouldHide(maxSpeed),
			show_methane      : shouldHide(thisItem.fuelType, 'methane'),
			show_needPower    : shouldHide(thisItem?.specs?.neededpower),
			show_price        : shouldHide(thisItem.price),
			show_transmission : shouldHide(thisItem.transType),
			show_weight       : shouldHide(thisItem.weight),
			show_workWidth    : shouldHide(theWidth !== 0),
			transmission      : thisItem.transType,
			typeDesc          : thisItem.typeDesc,
			uuid              : thisItemUUID,
			weight            : fsgUtil.numFmtMany(thisItem.weight, currentLocale, [
				{ factor : 1,    precision : 0, unit : 'unit_kg' },
				{ factor : 0.01, precision : 1, unit : 'unit_t' },
			]),
			workWidth         : fsgUtil.numFmtMany(theWidth, currentLocale, [
				{ factor : 1,       precision : 1, unit : 'unit_m' },
				{ factor : 3.28084, precision : 1, unit : 'unit_ft' },
			]),
			workWidth2        : buildWidth2(thisItem?.sprayTypes, theWidth, currentLocale),
		}))

		if ( thisItem.motorInfo !== null ) {
			storeItemsJS.push(async () => {
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
			})
		}
	}

	if ( thisItem.masterType === 'placeable' ) {
		const fillImages = thisItem.silo.types.map((thisFill) => fsgUtil.knownFills.has(thisFill) ? `<img style="height: 25px" src="img/fills/${thisFill}.webp">` : '')

		storeItemsHTML.push(fsgUtil.useTemplate('place_div', {
			animalCount      : thisItem.husbandry.capacity,
			category          : thisItem.category,
			fillImages       : fillImages.join(' '),
			fillUnit         : fsgUtil.numFmtMany(thisItem.silo.capacity, currentLocale, [
				{ factor : 1,         precision : 0, unit : 'unit_l' },
				{ factor : 0.001,     precision : 1, unit : 'unit_m3' },
				{ factor : 0.0353147, precision : 1, unit : 'unit_ft3' },
			]),
			functions        : wrapFunctions(thisItem.functions),
			hasBee           : `${fsgUtil.numFmtMany(thisItem.beehive.radius, currentLocale, [{factor : 1, precision : 0, unit : 'unit_m'}])} / ${fsgUtil.numFmtMany(thisItem.beehive.liters, currentLocale, [{factor : 1, precision : 0, unit : 'unit_l'}])}`,
			iconIMG          : thisItem.icon,
			income           : thisItem.incomePerHour ?? 0,
			itemName         : thisItem.name,
			itemTitle        : thisItem.type,
			objectCount      : thisItem.objectStorage ?? 0,
			price            : Intl.NumberFormat(currentLocale).format(thisItem.price),
			prodLines        : buildProduction(thisItem?.productions, currentLocale),
			show_fillUnit    : shouldHide(thisItem.silo.exists),
			show_hasBee      : shouldHide(thisItem.beehive.exists),
			show_hasChicken  : shouldHide(thisItem.husbandry.type, 'CHICKEN'),
			show_hasCow      : shouldHide(thisItem.husbandry.type, 'COW'),
			show_hasHorse    : shouldHide(thisItem.husbandry.type, 'HORSE'),
			show_hasPaint    : shouldHide(thisItem.hasColor),
			show_hasPig      : shouldHide(thisItem.husbandry.type, 'PIG'),
			show_hasSheep    : shouldHide(thisItem.husbandry.type, 'SHEEP'),
			show_income      : shouldHide(thisItem.incomePerHour),
			show_objectStore : shouldHide(thisItem.objectStorage),
		}))
	}

	fsgUtil.byId('bgContent').innerHTML = storeItemsHTML.join('')

	for ( const thisJS of storeItemsJS ) {
		setTimeout(thisJS, 25)
	}
}

function wrapFunctions(funcs) {
	const thisHTML = []
	for ( const thisFunc of funcs ) {
		thisHTML.push(`<l10nBase name="${thisFunc}"></l10nBase>`)
	}
	return thisHTML.join('<br>')
}

function getDefault(value, float = false, safe = 0) {
	const newValue = typeof value === 'number' || typeof value === 'string' ? value : safe
	return !float ? parseInt(newValue) : parseFloat(newValue)
}

function shouldHide(item, wanted = null) {
	if ( typeof item === 'undefined' || item === null || item === false || item === '' ) {
		return 'd-none'
	}
	if ( wanted !== null && item.toLowerCase() !== wanted.toLowerCase() ) {
		return 'd-none'
	}
	return ''
}

function wrapItem(name, icon, type, page, noTrans = false) {
	const iconString = icon.startsWith('data:') ?
		icon :
		icon.startsWith('brand_') ?
			`img/brand/${icon}.webp` :
			`img/baseCategory/${icon}.webp`

	const nameString = noTrans ? name : name.startsWith('$l10n') ?
		`<l10nBase name="${name}"></l10nBase>` :
		`<l10n name="${name}"></l10n>`

	return `<div class="col-2 text-center"><div class="p-2 border rounded-3 h-100"><a class="text-decoration-none text-white-50" href="?type=${type}&page=${page}"><img class="mb-3" style="width: 100px" src="${iconString}"><br />${nameString}</a></div></div>`
}

function wrapStoreItem(name, price, icon, brand, page, type, dlc = null) {
	const iconString  = icon.startsWith('data:') ? icon : `img/baseCategory/${icon}.webp`
	const brandString = typeof brand === 'string' ? `<br><img class="mb-3" style="width: 100px" src="img/brand/${client_baseGameBrandIconMap[brand.toLowerCase()]}.webp"></img>` : ''

	return fsgUtil.useTemplate('store_item', {
		brandString    : brandString,
		dlc            : dlc !== null ? dlc : '',
		iconString     : iconString,
		name           : name,
		page           : page,
		price          : Intl.NumberFormat(currentLocale).format(price),
		showCompButton : type === 'vehicle' ? '' : 'd-none',
	})
}

function wrapRow(rowHTMLArray) {
	return `<div class="row g-2 justify-content-center">${ typeof rowHTMLArray !== 'object' ? rowHTMLArray : rowHTMLArray.join('') }</div>`
}

function getTopCat(cat) {
	switch ( cat ) {
		case 'vehicle' :
			return client_baseGameCats.vehicles.map((x) => wrapItem(x.title, x.iconName, 'subcat', x.iconName))
		case 'tool' :
			return client_baseGameCats.tools.map((x) => wrapItem(x.title, x.iconName, 'subcat', x.iconName))
		case 'object' :
			return client_baseGameCats.objects.map((x) => wrapItem(x.title, x.iconName, 'subcat', x.iconName))
		case 'placeable' :
			return client_baseGameCats.placeables.map((x) => wrapItem(x.title, x.iconName, 'subcat', x.iconName))
		case 'brand' :
			return client_baseGameBrands.map((x) => wrapItem(x.title, x.image, 'brand', x.name, true))
		//case 'top':
		default :
			return client_baseGameTopLevel.map((x) => wrapItem(x.name, x.icon, 'cat', x.page))
			
	}
}

let chartUnits = {}
let searchTree = {
	// pageIdKey : searchString
}

function buildSearchTree () {
	searchTree = {}

	for ( const [thisItemKey, thisItem] of Object.entries(client_baseGameData.records) ) {
		const brandString = (thisItem.brand ? client_baseGameBrandMap[thisItem.brand?.toLowerCase()]?.toLowerCase() : '')
		searchTree[thisItemKey] = `${thisItem.name.toLowerCase()} ${brandString} ${thisItemKey}`
	}
}

function client_findItems(strTerm) {
	const foundItems = []
	for ( const [thisItemKey, thisItem] of Object.entries(searchTree) ) {
		if ( thisItem.includes(strTerm.toLowerCase()) ) { foundItems.push(thisItemKey) }
	}
	return foundItems
}

function clientFilter() {
	const filterText = fsgUtil.byId('mods__filter').value.toLowerCase()

	fsgUtil.byId('mods__filter_clear').classList[( filterText !== '' ) ? 'remove':'add']('d-none')

	if ( filterText.length < 2 ) {
		fsgUtil.byId('searchResults').innerHTML = ''
	} else {
		fsgUtil.byId('searchResults').innerHTML = wrapRow(client_findItems(filterText).map((x) => wrapStoreItem(
			client_baseGameData.records[x].name,
			client_baseGameData.records[x].price,
			client_baseGameData.records[x].icon,
			client_baseGameData.records[x].brand,
			x,
			client_baseGameData.records[x].masterType,
			client_baseGameData.records[x].dlcKey
		)))
	}
}

function clientClearInput() {
	fsgUtil.byId('mods__filter').value = ''
	clientFilter()
}

window.addEventListener('DOMContentLoaded', () => {
	const urlParams     = new URLSearchParams(window.location.search)
	const pageType      = urlParams.get('type')
	const pageID        = urlParams.get('page')

	currentLocale = document.querySelector('body').getAttribute('data-i18n') || 'en'
	chartUnits    = window.l10n.getText_sync(['unit_rpm', 'unit_mph', 'unit_kph', 'unit_hp'])

	fsgUtil.byId('folderButton').classList.add('d-none')
	fsgUtil.byId('compareButton').classList.add('d-none')

	if ( urlParams.size === 0 ) {
		// Display Main Page
		buildSearchTree()
		fsgUtil.byId('back_button').classList.add('d-none')
		fsgUtil.byId('searchBox').classList.remove('d-none')
		fsgUtil.byId('bgContent').innerHTML = wrapRow(getTopCat('top'))
		fsgUtil.byId('title').innerHTML     = '<l10n name="basegame_main_title"></l10n>'
		setTimeout(clientFilter, 250)
	} else if ( pageType === 'cat' ) {
		// Display Top-Level Category
		fsgUtil.byId('bgContent').innerHTML = wrapRow(getTopCat(pageID))
		fsgUtil.byId('title').innerHTML     = `<l10n name="basegame_${pageID}_title"></l10n>`
	} else if ( pageType === 'subcat' ) {
		// Display Sub-Category
		const isVehicleCat = Object.hasOwn(client_baseGameCatMap_vehicle, pageID)
		const catL10n      = isVehicleCat ? client_baseGameCatMap_vehicle[pageID] : client_baseGameCatMap_place[pageID]
		const catContent   = ((isVehicleCat ? client_baseGameData.byCat_vehicle[catL10n] : client_baseGameData.byCat_placeable[catL10n]) ?? []).sort()

		fsgUtil.byId('title').innerHTML     = `<l10nBase name="${catL10n}"></l10nBase>`
		fsgUtil.byId('bgContent').innerHTML = wrapRow(catContent.map((x) => wrapStoreItem(
			client_baseGameData.records[x].name,
			client_baseGameData.records[x].price,
			client_baseGameData.records[x].icon,
			client_baseGameData.records[x].brand,
			x,
			client_baseGameData.records[x].masterType,
			client_baseGameData.records[x].dlcKey
		)))
	} else if ( pageType === 'brand' ) {
		// Display Brand
		const brandDisplay = pageID.replace('brand_', '').toUpperCase()
		const brandContent = (client_baseGameData.byBrand_vehicle[brandDisplay] ?? []).sort()

		fsgUtil.byId('title').innerHTML     = `<l10nBase name="${client_baseGameBrandMap[pageID]}"></l10nBase>`
		
		fsgUtil.byId('bgContent').innerHTML = wrapRow(brandContent.map((x) => wrapStoreItem(
			client_baseGameData.records[x].name,
			client_baseGameData.records[x].price,
			client_baseGameData.records[x].icon,
			client_baseGameData.records[x].brand,
			x,
			client_baseGameData.records[x].masterType,
			client_baseGameData.records[x].dlcKey
		)))
	} else if ( pageType === 'item' ) {
		// Display Item
		const thisItem = client_baseGameData.records[pageID]

		fsgUtil.byId('folderButton').classList[thisItem.isBase ? 'remove' : 'add']('d-none')

		if ( thisItem.masterType === 'vehicle' ) {
			fsgUtil.byId('compareButton').classList.remove('d-none')
		}

		fsgUtil.byId('title').innerHTML        = typeof thisItem.brand !== 'undefined' ? `${client_baseGameBrandMap[thisItem.brand.toLowerCase()]} ${thisItem.name}` : thisItem.name
		fsgUtil.byId('mod_location').innerHTML = thisItem.isBase ? `$data/${thisItem.diskPath.join('/')}` : `DLC : ${thisItem.dlcKey}`
		client_buildStore(thisItem)
	} else {
		buildSearchTree()
		fsgUtil.byId('searchBox').classList.remove('d-none')
		fsgUtil.byId('back_button').classList.add('d-none')
		fsgUtil.byId('bgContent').innerHTML = wrapRow(getTopCat('top'))
		fsgUtil.byId('title').innerHTML     = '<l10n name="basegame_main_title"></l10n>'
		setTimeout(clientFilter, 250)
	}
	processL10N()
	clientGetL10NEntries2()
})


function clientOpenFolder() {
	const urlParams     = new URLSearchParams(window.location.search)
	const pageID        = urlParams.get('page')
	const folder        = pageID.split('_').slice(0, -1)

	window.mods.openBaseFolder(folder)
}

function clientOpenCompare(forcePageID = null) {
	const urlParams     = new URLSearchParams(window.location.search)
	const pageID        = urlParams.get('page')

	window.mods.openCompareBase(forcePageID !== null ? forcePageID : pageID)
}


function clientGetL10NEntries2() {
	const l10nSendArray = fsgUtil.queryA('l10nBase').map((element) => fsgUtil.getAttribNullEmpty(element, 'name'))

	window.l10n.getTextBase_send(new Set(l10nSendArray))
}

window?.l10n?.receive('fromMain_getTextBase_return', (data) => {
	for ( const item of fsgUtil.query(`l10nBase[name="${data[0]}"]`) ) { item.innerHTML = data[1] }
})

window?.l10n?.receive('fromMain_l10n_refresh', () => {
	clientGetL10NEntries2()
})