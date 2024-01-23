/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Base game window UI

/* global __, processL10N, fsgUtil, dtLib, client_BGData */

let searchTree = {}
let chartUnits = null

const selectFills = [
	{ filltype : 'barley', l10n : '$l10n_fillType_barley' },
	{ filltype : 'canola', l10n : '$l10n_fillType_canola' },
	{ filltype : 'chaff', l10n : '$l10n_fillType_chaff' },
	{ filltype : 'cotton', l10n : '$l10n_fillType_cotton' },
	{ filltype : 'diesel', l10n : '$l10n_fillType_diesel' },
	{ filltype : 'digestate', l10n : '$l10n_fillType_digestate' },
	{ filltype : 'drygrass_windrow', l10n : '$l10n_fillType_dryGrass' },
	{ filltype : 'fertilizer', l10n : '$l10n_fillType_fertilizer' },
	{ filltype : 'forage_mixing', l10n : '$l10n_fillType_forage_mixing' },
	{ filltype : 'forage', l10n : '$l10n_fillType_forage' },
	{ filltype : 'grape', l10n : '$l10n_fillType_grape' },
	{ filltype : 'grass_windrow', l10n : '$l10n_fillType_grass' },
	{ filltype : 'herbicide', l10n : '$l10n_fillType_herbicide' },
	{ filltype : 'lime', l10n : '$l10n_fillType_lime' },
	{ filltype : 'liquidfertilizer', l10n : '$l10n_fillType_liquidFertilizer' },
	{ filltype : 'liquidmanure', l10n : '$l10n_fillType_liquidManure' },
	{ filltype : 'maize', l10n : '$l10n_fillType_maize' },
	{ filltype : 'manure', l10n : '$l10n_fillType_manure' },
	{ filltype : 'milk', l10n : '$l10n_fillType_milk' },
	{ filltype : 'mineral_feed', l10n : '$l10n_fillType_mineralFeed' },
	{ filltype : 'oat', l10n : '$l10n_fillType_oat' },
	{ filltype : 'olive', l10n : '$l10n_fillType_olive' },
	{ filltype : 'pigfood', l10n : '$l10n_fillType_pigFood' },
	{ filltype : 'poplar', l10n : '$l10n_fillType_poplar' },
	{ filltype : 'potato', l10n : '$l10n_fillType_potato' },
	{ filltype : 'roadsalt', l10n : '$l10n_fillType_roadSalt' },
	{ filltype : 'roundbale', l10n : '$l10n_fillType_roundBale' },
	{ filltype : 'seeds', l10n : '$l10n_fillType_seeds' },
	{ filltype : 'silage_additive', l10n : '$l10n_fillType_silageAdditive' },
	{ filltype : 'silage', l10n : '$l10n_fillType_silage' },
	{ filltype : 'sorghum', l10n : '$l10n_fillType_sorghum' },
	{ filltype : 'soybean', l10n : '$l10n_fillType_soybean' },
	{ filltype : 'squarebale', l10n : '$l10n_fillType_squareBale' },
	{ filltype : 'stone', l10n : '$l10n_fillType_stone' },
	{ filltype : 'straw', l10n : '$l10n_fillType_straw' },
	{ filltype : 'sugarbeet_cut', l10n : '$l10n_fillType_sugarBeetCut' },
	{ filltype : 'sugarbeet', l10n : '$l10n_fillType_sugarBeet' },
	{ filltype : 'sugarcane', l10n : '$l10n_fillType_sugarCane' },
	{ filltype : 'sunflower', l10n : '$l10n_fillType_sunflower' },
	{ filltype : 'treesaplings', l10n : '$l10n_fillType_treeSaplings' },
	{ filltype : 'water', l10n : '$l10n_fillType_water' },
	{ filltype : 'wheat', l10n : '$l10n_fillType_wheat' },
	{ filltype : 'wood', l10n : '$l10n_fillType_wood' },
	{ filltype : 'woodchips', l10n : '$l10n_fillType_woodChips' },
]

const comboKeyList = new Set()

const make_combos = (combos) => {
	if ( typeof combos === 'undefined' || combos === null || combos.length === 0 ) { return '' }

	comboKeyList.clear()

	const comboHTML = []
	for ( const thisCombo of combos ) {
		if ( thisCombo === null ) { continue }

		const thisComboIsBase = thisCombo.startsWith('$data')
		const thisComboKey    = thisComboIsBase ? thisCombo.replaceAll('$data/', '').replaceAll('/', '_').replaceAll('.xml', '') : null

		if ( thisComboKey !== null ) {
			const thisItem = client_BGData.records[thisComboKey]

			if ( typeof thisItem === 'undefined' ) { continue }

			comboKeyList.add(thisComboKey)
			const thisItemData = dtLib.getInfo(thisItem)

			comboHTML.push(fsgUtil.useTemplate('combo_div_basegame', {
				brandIcon      : dtLib.safeBrandImage(thisItem.brand),
				category       : __(thisItem.category, {skipIfNotBase : true}),
				compareTerms   : [
					dtLib.doDataType('price', thisItemData.price),
					dtLib.doDataType('workWidth', thisItemData.workWidth),
				].join(''),
				fullName       : __(thisItem.name, {skipIfNotBase : true}),
				itemIcon       : dtLib.safeDataImage(thisItem.icon),
				page           : thisComboKey,
				showCompButton : thisItem.masterType === 'vehicle' ? '' : 'd-none',
			}))
		}
	}
	return comboHTML.join('')
	
}

const client_buildStore = (thisItem) => {
	const storeItemsHTML = []
	const storeItemsJS   = []

	const thisItemUUID = crypto.randomUUID()

	if ( thisItem.masterType === 'vehicle' ) {
		const thisItemData = dtLib.getInfo(thisItem)
		const brandImage   = dtLib.safeBrandImage(thisItem.brand, {width : '30%'})
		const fillImages   = dtLib.doFillTypes(thisItem.fillTypes)
		
		const thisItemDataHTML = dtLib.typeDataOrder.map((x) => dtLib.doDataType(x, thisItemData[x]))

		for ( const testItem of dtLib.vehTestTypes ) {
			if ( fsgUtil.getShowBool(thisItem[testItem[0]], testItem[1]) ) {
				thisItemDataHTML.push(dtLib.doDataRow(testItem[2], __(testItem[3] === false ? thisItem[testItem[0]]: testItem[3])))
			}
		}

		const parentID = dtLib.getCleanParentID(thisItem.parentFile)
		if ( parentID !== null ) {
			const parentItem = client_BGData.records[parentID]
			thisItemDataHTML.push(dtLib.doDataRow('look-key', `<a href="?type=item&page=${parentID}">${__(parentItem.name, { skipIfNotBase : true })}</a>`))
		}

		thisItemDataHTML.push(
			dtLib.doDataType(
				'fillLevel',
				thisItemData.fillLevel,
				fillImages.length !== 0 ? fillImages.join('') : null
			),
			dtLib.doDataType(
				'workWidth',
				thisItemData.workWidth,
				dtLib.doSprayTypes(thisItem?.sprayTypes, thisItemData.workWidth)
			),
			dtLib.doDataRowTrue(
				'cat-attach-has',
				fsgUtil.getShowBool(thisItem?.joints?.canUse) ? __('basegame_attach_has') : null,
				dtLib.doJoints(thisItem?.joints?.canUse, true, true)
			),
			dtLib.doDataRowTrue(
				'cat-attach-need',
				fsgUtil.getShowBool(thisItem?.joints?.needs) ? __('basegame_attach_need') : null,
				dtLib.doJoints(thisItem?.joints?.needs, false, true)
			)
		)

		storeItemsHTML.push(fsgUtil.useTemplate('vehicle_info_div', {
			brandImage   : brandImage,
			category     : __(thisItem.category, { skipIfNotBase : true }),
			combinations : make_combos(thisItem?.specs?.combination),
			functions    : dtLib.wrap.functions(thisItem.functions),
			iconImage    : dtLib.safeDataImage(thisItem.icon, { width : 'auto'}),
			itemData     : thisItemDataHTML.join(''),
			itemName     : __(thisItem.name, { skipIfNotBase : true }),
			itemTitle    : thisItem.type,
			showBrand    : fsgUtil.getHide(brandImage),
			showCombos   : fsgUtil.getHide(thisItem?.specs?.combination),
			showGraph    : fsgUtil.getHide(thisItem.motorInfo),
			typeDesc     : thisItem.typeDesc,
			uuid         : thisItemUUID,
		}))

		if ( thisItem.motorInfo !== null ) {
			storeItemsJS.push(dtLib.doChart(thisItem, thisItemUUID, chartUnits))
		}
	}

	if ( thisItem.masterType === 'placeable' ) {
		const fillImages       = dtLib.doFillTypes(thisItem.silo.types)
		const thisItemDataHTML = []

		thisItemDataHTML.push(
			dtLib.doDataType('price', dtLib.default(thisItem.price)),
			dtLib.doDataType('income', dtLib.default(thisItem.incomePerHour)),
			dtLib.doDataType('objects', dtLib.default(thisItem.objectStorage)),
			dtLib.doDataType(
				'fillLevel',
				dtLib.default(thisItem?.silo?.capacity),
				fillImages.length !== 0 ? fillImages.join('') : null
			),
			dtLib.doDataType('bees', dtLib.default(thisItem.beehive.radius))
		)

		for ( const husbandType of dtLib.husbandTestTypes ) {
			if ( fsgUtil.getShowBool(thisItem.husbandry.type, husbandType) ) {
				thisItemDataHTML.push(dtLib.doDataRow(`fill-${husbandType.toLowerCase()}`, thisItem.husbandry.capacity))
			}
		}

		storeItemsHTML.push(fsgUtil.useTemplate('place_info_div', {
			category  : __(thisItem.category, {skipIfNotBase : true}),
			functions : dtLib.wrap.functions(thisItem.functions),
			iconImage : dtLib.safeDataImage(thisItem.icon, { width : 'auto'}),
			itemName  : __(thisItem.name, {skipIfNotBase : true}),
			placeData : thisItemDataHTML.join(''),
			prodLines : dtLib.doProductions(thisItem?.productions),
		}))
	}

	for ( const thisJS of storeItemsJS ) {
		setTimeout(thisJS, 250)
	}

	return storeItemsHTML.join('')
}

function getTopCat(cat) {
	switch ( cat ) {
		case 'vehicle' :
			return dtLib.wrap.row(client_BGData.category.vehicle.map((x) => dtLib.wrap.single({
				icon : x.iconName,
				name : x.title,
				page : x.iconName,
				type : 'subcat',
			})))
		case 'tool' :
			return dtLib.wrap.row(client_BGData.category.tool.map((x) => dtLib.wrap.single({
				icon : x.iconName,
				name : x.title,
				page : x.iconName,
				type : 'subcat',
			})))
		case 'object' :
			return dtLib.wrap.row(client_BGData.category.object.map((x) => dtLib.wrap.single({
				icon : x.iconName,
				name : x.title,
				page : x.iconName,
				type : 'subcat',
			})))
		case 'placeable' :
			return dtLib.wrap.row(client_BGData.category.placeable.map((x) => dtLib.wrap.single({
				icon : x.iconName,
				name : x.title,
				page : x.iconName,
				type : 'subcat',
			})))
		case 'brand' :
			return dtLib.wrap.row(client_BGData.brands.map((x) => dtLib.wrap.single({
				brand   : x.image,
				name    : x.title,
				noTrans : true,
				page    : x.name,
				type    : 'brand',
			})))
		case 'fills' :
			return dtLib.wrap.row(selectFills.map((x) => dtLib.wrap.single({
				fsIcon  : `fill-${x.filltype}`,
				name    : x.l10n,
				noTrans : false,
				page    : x.filltype,
				type    : 'fill',
			})))
		case 'attach_need' :
			return dtLib.wrap.row(Object.keys(client_BGData.joints_needs).sort().map((x) => dtLib.wrap.single({
				icon    : `attach_${x.toLowerCase()}`,
				name    : x,
				noTrans : true,
				page    : x.toLowerCase(),
				type    : 'attach_need',
			})))
		case 'attach_has' :
			return dtLib.wrap.row(Object.keys(client_BGData.joints_has).sort().map((x) => dtLib.wrap.single({
				icon    : `attach_${x.toLowerCase()}`,
				name    : x,
				noTrans : true,
				page    : x.toLowerCase(),
				type    : 'attach_has',
			})))
		default : {
			return [
				dtLib.wrap.row(client_BGData.topLevel.slice(0, 5).map((x) => dtLib.wrap.single({
					fsIcon : x.class,
					name   : x.name,
					page   : x.page,
					type   : 'cat',
				})), 'g-2 justify-content-center'),
				dtLib.wrap.row(client_BGData.topLevel.slice(5).map((x) => dtLib.wrap.single({
					fsIcon : x.class,
					name   : x.name,
					page   : x.page,
					type   : 'cat',
				})), 'g-2 justify-content-center mt-2')
			].join('')
		}
			
	}
}

function buildSearchTree () {
	searchTree = {}

	for ( const [thisItemKey, thisItem] of Object.entries(client_BGData.records) ) {
		const brandString = (thisItem.brand ? client_BGData.brandMap[thisItem.brand?.toLowerCase()]?.toLowerCase() : '')
		searchTree[thisItemKey] = `${thisItem.name.toLowerCase()} ${brandString} ${thisItemKey}`
	}
}

function setPageInfo(title, content, { button_comp = false, button_folder = false } = {}) {
	fsgUtil.clsShowTrue('folderButton', button_folder)
	fsgUtil.clsShowTrue('compareButton', button_comp)
	fsgUtil.clsShowTrue('back_button', history.length > 1)

	fsgUtil.byId('bgContent').innerHTML = content
	fsgUtil.byId('title').innerHTML     = title
}

function attachProperCase(pageID) {
	for ( const thisAttach of client_BGData.joints_list ) {
		if ( thisAttach.toLowerCase() === pageID ) { return thisAttach }
	}
}

function findFill(fillType) {
	for ( const thisFill of selectFills ) {
		if ( thisFill.filltype === fillType ) { return thisFill.l10n }
	}
}

function getByFill(fillType) {
	const vehicleList = []

	for ( const [thisItemID, thisItem] of Object.entries(client_BGData.records) ) {
		if ( thisItem.masterType !== 'vehicle' ) { continue }
		if ( thisItem.fillTypes.length === 0 ) { continue }
		if ( thisItem.fillTypes.includes(fillType) ) { vehicleList.push(thisItemID) }
	}
	return vehicleList.sort()
}


window.mods.receive('fromMain_forceNavigate', (type, page) => { location.search = `?type=${type}&page=${page}` })

window.addEventListener('DOMContentLoaded', () => {
	const urlParams     = new URLSearchParams(window.location.search)
	const pageType      = urlParams.get('type')
	const pageID        = urlParams.get('page')

	chartUnits = window.l10n.getText_sync(['unit_rpm', 'unit_mph', 'unit_kph', 'unit_hp'])

	switch (pageType) {
		case 'cat':
			setPageInfo(
				`<l10n name="basegame_${pageID}_title"></l10n>`,
				getTopCat(pageID)
			)
			break
		case 'subcat' : {
			const isVehicleCat = Object.hasOwn(client_BGData.catMap_vehicle, pageID)
			const catL10n      = isVehicleCat ? client_BGData.catMap_vehicle[pageID] : client_BGData.catMap_place[pageID]
			const catContent   = ((isVehicleCat ? client_BGData.byCat_vehicle[catL10n] : client_BGData.byCat_placeable[catL10n]) ?? []).sort()

			setPageInfo(
				`<l10nBase name="${catL10n}"></l10nBase>`,
				dtLib.wrap.row(catContent.sort().map((x) => dtLib.wrap.item(x)))
			)
			break
		}
		case 'brand' : {
			const brandDisplay = pageID.replace('brand_', '').toUpperCase()
			const brandContent = (client_BGData.byBrand_vehicle[brandDisplay] ?? []).sort()

			setPageInfo(
				`<l10nBase name="${client_BGData.brandMap[pageID]}"></l10nBase>`,
				dtLib.wrap.row(brandContent.sort().map((x) => dtLib.wrap.item(x)))
			)
			break
		}
		case 'attach_has' : {
			const jointType = attachProperCase(pageID)

			setPageInfo(
				`<l10n name="basegame_attach_has"></l10n> : ${jointType}`,
				dtLib.wrap.row(client_BGData.joints_has[jointType].sort().map((x) => dtLib.wrap.item(x)))
			)
			break
		}
		case 'attach_need' : {
			const jointType = attachProperCase(pageID)

			setPageInfo(
				`<l10n name="basegame_attach_need"></l10n> : ${jointType}`,
				dtLib.wrap.row(client_BGData.joints_needs[jointType].sort().map((x) => dtLib.wrap.item(x)))
			)
			break
		}
		case 'fill' : {
			setPageInfo(
				`<l10n name="basegame_fills"></l10n> : <l10nBase name="${findFill(pageID)}"></l10nBase>`,
				dtLib.wrap.row(getByFill(pageID).sort().map((x) => dtLib.wrap.item(x)))
			)
			break
		}
		case 'item' : {
			const thisItem = client_BGData.records[pageID]
	
			fsgUtil.byId('mod_location').innerHTML = thisItem.isBase ? `$data/${thisItem.diskPath.join('/')}` : `DLC : ${thisItem.dlcKey}`

			setPageInfo(
				typeof thisItem.brand !== 'undefined' ? `${client_BGData.brandMap[thisItem.brand.toLowerCase()]} ${__(thisItem.name, {skipIfNotBase : true})}` : __(thisItem.name, {skipIfNotBase : true}),
				client_buildStore(thisItem),
				{
					button_comp   : thisItem.masterType === 'vehicle',
					button_folder : thisItem.isBase,
				}
			)
			break
		}
		default :
			buildSearchTree()
			fsgUtil.byId('searchBox').classList.remove('d-none')
			setPageInfo(
				'<l10n name="basegame_main_title"></l10n>',
				getTopCat('top')
			)
			break
	}
	processL10N()
})

function findItemsByTerm(strTerm) {
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
		fsgUtil.byId('searchResults').innerHTML = dtLib.wrap.row(findItemsByTerm(filterText).sort().map((x) => dtLib.wrap.item(x)))
		processL10N()
	}
}

function clientClearInput() {
	fsgUtil.byId('mods__filter').value = ''
	clientFilter()
}

function clientOpenFolder() {
	const pageID        = new URLSearchParams(window.location.search).get('page')
	const folder        = client_BGData.records[pageID].diskPath.slice(0, -1)

	window.mods.openBaseFolder(folder)
}

function clientOpenCompare(forcePageID = null) {
	const pageID        = new URLSearchParams(window.location.search).get('page')

	window.mods.openCompareBase(forcePageID !== null ? forcePageID : pageID)
}

function clientOpenCombos() {
	window.mods.openCompareBaseMulti([...comboKeyList])
}