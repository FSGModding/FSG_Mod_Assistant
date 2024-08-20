/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */
// MARK: BASE GAME UI

/* global I18N, MA, ST, DATA, NUM, client_BGData, ft_doReplace */
let locale     = 'en'
let i18nUnits  = null
let searchTree = {}

const selectFills = [
	{ filltype : 'barley', l10n : '$l10n_fillType_barley' },
	{ filltype : 'carrot', l10n : '$l10n_fillType_carrots' },
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
	{ filltype : 'parsnip', l10n : '$l10n_fillType_parsnip' },
	{ filltype : 'pigfood', l10n : '$l10n_fillType_pigFood' },
	{ filltype : 'poplar', l10n : '$l10n_fillType_poplar' },
	{ filltype : 'potato', l10n : '$l10n_fillType_potato' },
	{ filltype : 'beetroot', l10n : '$l10n_fillType_beetroot' },
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

// #region COMBOS
function subStep_combos (combos) {
	if ( typeof combos === 'undefined' || combos === null || combos.length === 0 ) { return null }

	const comboNodes   = []

	for ( const thisCombo of combos ) {
		if ( thisCombo === null ) { continue }

		const thisComboIsBase = thisCombo.startsWith('$data')
		const thisComboKey    = thisCombo.replaceAll('$data/', '').replaceAll('/', '_').replaceAll('.xml', '')

		if ( thisComboKey !== null ) {
			const thisItem = client_BGData.records[thisComboKey]

			if ( typeof thisItem === 'undefined' ) { continue }

			const thisIcon = ST.resolveIcon(thisItem.icon)

			comboKeyList.add({
				contents : null,
				internal : true,
				key      : thisComboKey,
				source   : null,
			})

			const thisItemData = ST.getInfo(thisItem)
			const brandImgSRC  = ST.resolveBrand(null, thisItem.brand)

			const thisNode = DATA.templateEngine('combo_div_source', {
				brandImage : `<img src="${brandImgSRC}" class="img-fluid store-brand-image">`,
				iconImage  : `<img src="${thisIcon}" class="img-fluid store-icon-image">`,

				category       : I18N.defer(thisItem.category),
				clickPage      : thisComboKey,
				clickSource    : thisComboIsBase ? 'base' : 'internal',
				clickType      : 'item',
				fullName       : I18N.defer(thisItem.name),
				
				compareTerms   : [
					ST.markupDataType('price', thisItemData.price),
					ST.markupDataType('workWidth', thisItemData.workWidth),
				].join(''),
			}, {}, {
				'.comboCompareButton' : MA.showTest(thisItem.masterType === 'vehicle'),
			})

			DATA.eventEngine(thisNode, '.comboItemClicker', comboItemClicker)
			DATA.eventEngine(thisNode, '.comboItemAddClicker', comboAddSingle)
			
			comboNodes.push(thisNode)
		}
	}
	return comboNodes
}
// #endregion

// #region VEHICLES
// eslint-disable-next-line complexity
async function subStep_vehicle(thisUUID, thisItem, pageID, combos = null) {
	const thisIcon     = ST.resolveIcon(thisItem.icon)
	const thisItemData = ST.getInfo(thisItem)
	const brandImgSRC  = ST.resolveBrand(null, thisItem.brand)
	const fillImages   = ST.markupFillTypes(thisItem.fillTypes)
	const sprayTypes   = ST.markupSprayTypes(thisItem?.sprayTypes, thisItemData.workWidth)
	const chartHTML    = MA.showTestValueBool(thisItem.motorInfo) ? ST.markupChart(thisUUID) : ''

	const thisItemDataHTML = ST.typeDataOrder.map((x) => ST.markupDataType(x, thisItemData[x]))
	
	for ( const testItem of ST.vehTestTypes ) {
		if ( MA.showTestValueBool(thisItem[testItem[0]], testItem[1]) ) {
			thisItemDataHTML.push(ST.markupDataRow(
				testItem[2],
				testItem[3] === false ?
					I18N.defer(thisItem[testItem[0]]) :
					I18N.defer(testItem[3], false)
			))
		}
	}

	if ( sprayTypes !== null ) {
		thisItemDataHTML.push(ST.markupDataRowTrue(
			'look-width',
			sprayTypes
		))
	} else {
		thisItemDataHTML.push(ST.markupDataType(
			'workWidth',
			thisItemData.workWidth
		))
	}

	thisItemDataHTML.push(
		ST.markupDataType(
			'fillLevel',
			thisItemData.fillLevel,
			fillImages.length !== 0 ? fillImages.join('') : null
		),
		ST.markupDataRowTrue(
			'cat-attach-has',
			MA.showTestValueBool(thisItem?.joints?.canUse) ? I18N.defer('basegame_attach_has', false) : null,
			ST.markupJoints(thisItem?.joints?.canUse, true, false)
		),
		ST.markupDataRowTrue(
			'cat-attach-need',
			MA.showTestValueBool(thisItem?.joints?.needs) ? I18N.defer('basegame_attach_need', false) : null,
			ST.markupJoints(thisItem?.joints?.needs, false, false)
		)
	)
	const infoDivNode = DATA.templateEngine('vehicle_info_div', {
		brandImage : `<img src="${brandImgSRC}" class="img-fluid store-brand-image">`,
		iconImage  : `<img src="${thisIcon}" class="img-fluid store-icon-image">`,

		category  : I18N.defer(thisItem.category),
		functions : ST.markupFunctions(thisItem.functions),
		itemName  : I18N.defer(thisItem.name),
		itemTitle : thisItem.type,
		typeDesc  : I18N.defer(thisItem.typeDesc),

		chartData : chartHTML,
		itemData  : thisItemDataHTML.join(''),
	}, {
		'vehicle-info-parent' : thisUUID,
	}, {
		'.combo-list' : MA.showTest(thisItem?.specs?.combination),
	})

	if ( combos !== null ) {
		const comboParent = infoDivNode.querySelector('.combo-item-list')
		for ( const thisCombo of combos ) {
			comboParent.appendChild(thisCombo)
		}
	}
	
	DATA.eventEngine(infoDivNode, '.action-compare-all-combo', comboAddAll)
	DATA.eventEngine(infoDivNode, '.action-item-compare', () => {
		window.basegame_IPC.sendCompare([buildCompareRequest(pageID)])
	})
	DATA.eventEngine(infoDivNode, '.attach_has, .attach_need', attachClicker)

	MA.byIdAppend('bgContent', infoDivNode)

	if ( MA.showTestValueBool(thisItem.motorInfo) ) {
		ST.markupChartScripts(thisItem, thisUUID, i18nUnits)()
	}
}
// #endregion


// #region PLACEABLE
async function subStep_placeable(thisItem, thisIcon) {
	const fillImages       = ST.markupFillTypes(thisItem.silo.types)
	const thisItemIcon     = ST.resolveIcon(thisIcon, thisItem.icon)
	const thisItemDataHTML = []

	thisItemDataHTML.push(
		ST.markupDataType('price', NUM.default(thisItem.price)),
		ST.markupDataType('income', NUM.default(thisItem.incomePerHour)),
		ST.markupDataType('objects', NUM.default(thisItem.objectStorage)),
		ST.markupDataType(
			'fillLevel',
			NUM.default(thisItem?.silo?.capacity),
			fillImages.length !== 0 ? fillImages.join('') : null
		),
		ST.markupDataType('bees', NUM.default(thisItem.beehive.radius))
	)
	
	for ( const husbandType of ST.husbandTestTypes ) {
		if ( MA.showTestValueBool(thisItem.husbandry.type, husbandType) ) {
			thisItemDataHTML.push(ST.markupDataRow(`fill-${husbandType.toLowerCase()}`, thisItem.husbandry.capacity))
		}
	}
	
	const infoDivNode = DATA.templateEngine('place_div', {
		category  : I18N.defer(thisItem.category),
		functions : ST.markupFunctions(thisItem.functions),
		iconImage : `<img src="${thisItemIcon}" class="img-fluid store-icon-image">`,
		itemName  : I18N.defer(thisItem.name),
		itemTitle : thisItem.type,
		placeData : thisItemDataHTML.join(''),
	})

	if ( MA.showTestValueBool(thisItem?.productions) ) {
		const prodLines = ST.markupProductions(thisItem?.productions)
		const parentElement = infoDivNode.querySelector('.prodLines')
		for ( const element of prodLines ) {
			parentElement.appendChild(element)
		}
	}

	MA.byIdAppend('bgContent', infoDivNode)
}
// #endregion

// #region CAT LISTS
function getTopCat(cat) {
	switch ( cat ) {
		case 'vehicle' :
			return client_BGData.category.vehicle.map((x) => buildCategoryItem({
				image      : `<img src="img/baseCategory/${x.iconName}.webp" style="width:160px">`,
				page       : x.iconName,
				text       : x.title,
				type       : 'subcat',
			}))
		case 'tool' :
			return client_BGData.category.tool.map((x) => buildCategoryItem({
				image      : `<img src="img/baseCategory/${x.iconName}.webp" style="width:160px">`,
				page       : x.iconName,
				text       : x.title,
				type       : 'subcat',
			}))
		case 'object' :
			return client_BGData.category.object.map((x) => buildCategoryItem({
				image      : `<img src="img/baseCategory/${x.iconName}.webp" style="width:160px">`,
				page       : x.iconName,
				text       : x.title,
				type       : 'subcat',
			}))
		case 'placeable' :
			return client_BGData.category.placeable.map((x) => buildCategoryItem({
				image      : `<img src="img/baseCategory/${x.iconName}.webp" style="width:160px">`,
				page       : x.iconName,
				text       : x.title,
				type       : 'subcat',
			}))
		case 'brand' :
			return client_BGData.brands.map((x) => buildCategoryItem({
				image : `<img src="img/brand/${x.image}.webp" style="width:100px">`,
				maxWidthCalc : '100px',
				page  : x.name,
				text  : x.title,
				type  : 'brand',
			}))
		case 'fills' :
			return selectFills.map((x) => buildCategoryItem({
				image      : `<fillType class="h0" name="fill-${x.filltype}"></fillType>`,
				page       : x.filltype,
				text       : x.l10n,
				type       : 'fill',
			}))
		case 'attach_need' :
			return Object.keys(client_BGData.joints_needs).sort().map((x) => buildCategoryItem({
				image      : `<img src="img/baseCategory/attach_${x.toLowerCase()}.webp" style="width:160px">`,
				page       : x.toLowerCase(),
				text       : x,
				type       : 'attach_need',
			}))
		case 'attach_has' :
			return Object.keys(client_BGData.joints_has).sort().map((x) => buildCategoryItem({
				image      : `<img src="img/baseCategory/attach_${x.toLowerCase()}.webp" style="width:160px">`,
				page       : x.toLowerCase(),
				text       : x,
				type       : 'attach_has',
			}))
		default :
			return locale
	}
}

function buildCategoryItem({type = null, page = null, maxWidthCalc = null, image = null, text = null, skipIfNotBase = true} = {}) {
	return [
		`<div class="text-center pageClicker flex-grow-0" data-type="${type}" data-page="${page}">`,
		`<div class="p-2 border rounded-3 d-flex flex-column h-100 justify-content-center" style="max-width: ${maxWidthCalc === null ? 'auto' : `calc(${maxWidthCalc} + 1rem)`}">`,
		image,
		I18N.defer(text, skipIfNotBase),
		'</div></div>'
	].join('')
}

function buildItem(itemID, noBrand = false) {
	const thisItem         = client_BGData.records[itemID]
	const thisItemData     = ST.getInfo(thisItem)
	let   dataItems        = null
	const attemptKey       = ST.getCleanParentID(thisItem.parentFile)

	if ( attemptKey !== null ) {
		const attemptItem = client_BGData.records[attemptKey]
		const newItemData = ST.getInfo(attemptItem)
		dataItems = ST.getDataTypes(attemptItem.type).map((x) => ST.markupDataType(x, newItemData[x])).join('')
	} else {
		dataItems = ST.getDataTypes(thisItem.type).map((x) => ST.markupDataType(x, thisItemData[x])).join('')
	}

	const iconImage = ST.resolveIcon(thisItem.icon)
	const iconBrand = noBrand ? '' : ST.resolveBrand('', thisItem.brand)
			
	const infoDivNode = DATA.templateEngine('store_item', {
		brandImage : noBrand ? '' : `<img src="${iconBrand}" class="img-fluid store-brand-image">`,
		iconImage  : `<img src="${iconImage}" class="img-fluid store-icon-image">`,

		dataItems  : dataItems,
		dlc        : thisItem.dlcKey !== null ? thisItem.dlcKey : '',
		name       : I18N.defer(thisItem.name),
	}, {}, {
		'.compareSingle'    : MA.showTest(thisItem.masterType === 'vehicle'),
		'.hasParentFile'    : attemptKey !== null ? 'notRealItem' : '',
		'.store-icon-brand' : MA.showTest(!noBrand),
	})

	const pageClickerDIV = infoDivNode.querySelector('.pageClicker')
	pageClickerDIV.setAttribute('data-type', 'item')
	pageClickerDIV.setAttribute('data-page', attemptKey !== null ? attemptKey : itemID)

	return infoDivNode
}
// #endregion

// #region UTILITY
function buildSearchTree () {
	searchTree = {}

	for ( const [thisItemKey, thisItem] of Object.entries(client_BGData.records) ) {
		const brandString = (thisItem.brand ? client_BGData.brandMap[thisItem.brand?.toLowerCase()]?.toLowerCase() : '')
		searchTree[thisItemKey] = `${thisItem.name.toLowerCase()} ${brandString} ${thisItemKey.toLowerCase()}`
	}
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

function buildCompareRequest(id) {
	return {
		contents : null,
		internal : true,
		key      : id,
		source   : null,
	}
}

function pageTitle(title, { compareAll = false, openFolder = false, preTranslated = false, skipIfNotBase = false } = {}) {
	const titleDiv = document.createElement('div')

	titleDiv.classList.add('w-100', 'pb-3', 'fs-2', 'text-center', 'position-sticky', 'top-0', 'z-3', 'bg-body')
	titleDiv.innerHTML = [
		'<div class="w-75 mx-auto">',
		preTranslated ? title : I18N.defer(title, skipIfNotBase),
		'</div>',
		'<div style="margin-top: -1.6em; text-align: start">',
		'<button type="button" class="btn btn-outline-primary" id="backButton"><i18n-text data-key="basegame_button_back"></i18n-text></button>',
		'<button type="button" class="btn btn-outline-primary" id="homeButton"><i18n-text data-key="basegame_button_home"></i18n-text></button>',
		'</div>',
		'<div style="margin-top: -1.5em; text-align: end">&nbsp;',
		!openFolder ? '' : '<button type="button" class="btn btn-outline-warning" id="openFolderButton"><i18n-text data-key="basegame_button_folder"></i18n-text></button>',
		!compareAll ? '' : '<button type="button" class="btn btn-outline-warning" id="compareAllButton"><i18n-text data-key="basegame_compare_all"></i18n-text></button>',
		'</div>'
	].join('')

	return titleDiv
}
// #endregion


// #region PAGE LOAD
// eslint-disable-next-line complexity
window.addEventListener('DOMContentLoaded', async () => {
	const urlParams     = new URLSearchParams(window.location.search)
	const pageType      = urlParams.get('type')
	const pageID        = urlParams.get('page')

	locale    = await window.i18n.lang()
	i18nUnits = await window.settings.units()

	MA.byId('homePageContent').clsHide()
	MA.byId('homePageError').clsHide()

	switch (pageType) {
		case 'cat' : {
			MA.byId('bgContent').innerHTML = getTopCat(pageID).join('')
			MA.byId('bgContent').prepend(pageTitle(`basegame_${pageID}`))
			break
		}
		case 'subcat' : {
			const isVehicleCat = Object.hasOwn(client_BGData.catMap_vehicle, pageID)
			const catL10n      = isVehicleCat ? client_BGData.catMap_vehicle[pageID] : client_BGData.catMap_place[pageID]
			const catContent   = ((isVehicleCat ? client_BGData.byCat_vehicle[catL10n] : client_BGData.byCat_placeable[catL10n]) ?? []).sort()

			MA.byId('bgContent').appendChild(pageTitle(catL10n, {compareAll : true}))

			for ( const element of catContent.map((x) => buildItem(x, !isVehicleCat)) ) {
				MA.byId('bgContent').appendChild(element)
			}

			MA.byIdEventIfExists('compareAllButton', () => {
				window.basegame_IPC.sendCompare(catContent.map((x) => buildCompareRequest(x)))
			})
			break
		}
		case 'brand' : {
			const brandDisplay = pageID.replace('brand_', '').toUpperCase()
			const brandContent = (client_BGData.byBrand_vehicle[brandDisplay] ?? []).sort()

			MA.byId('bgContent').appendChild(pageTitle(client_BGData.brandMap[pageID], {compareAll : true, skipIfNotBase : true}))

			for ( const element of brandContent.map((x) => buildItem(x)) ) {
				MA.byId('bgContent').appendChild(element)
			}

			MA.byIdEventIfExists('compareAllButton', () => {
				window.basegame_IPC.sendCompare(brandContent.map((x) => buildCompareRequest(x)))
			})
			break
		}
		case 'attach_has' :
		case 'attach_need' : {
			const jointType     = attachProperCase(pageID)
			const jointCase     = pageType === 'attach_has' ? 'joints_has' : 'joints_needs'
			const jointContents = (client_BGData[jointCase]?.[jointType] || []).sort()
			const thisTitle     = `${I18N.defer(`basegame_${pageType}`, false)} : ${jointType}`

			MA.byId('bgContent').appendChild(pageTitle(thisTitle, {compareAll : true, preTranslated : true, skipIfNotBase : true}))

			for ( const element of jointContents.map((x) => buildItem(x)) ) {
				MA.byId('bgContent').appendChild(element)
			}

			MA.byIdEventIfExists('compareAllButton', () => {
				window.basegame_IPC.sendCompare(jointContents.map((x) => buildCompareRequest(x)))
			})
			break
		}
		case 'fill' : {
			const thisTitle    = `${I18N.defer('basegame_fills', false)} : ${I18N.defer(findFill(pageID))}`
			const fillContents = getByFill(pageID).sort()

			MA.byId('bgContent').appendChild(pageTitle(thisTitle, {compareAll : true, preTranslated : true, skipIfNotBase : true}))

			for ( const element of fillContents.map((x) => buildItem(x)) ) {
				MA.byId('bgContent').appendChild(element)
			}

			MA.byIdEventIfExists('compareAllButton', () => {
				window.basegame_IPC.sendCompare(fillContents.map((x) => buildCompareRequest(x)))
			})
			
			break
		}
		case 'item' : {
			const thisItem = client_BGData.records[pageID]
			
			if ( typeof thisItem === 'undefined' ) {
				MA.byId('homePageContent').clsShow()
				MA.byId('homePageError').clsShow()
				MA.queryF('template-var[data-name="error-page-type"]').textContent = pageType.toString()
				MA.queryF('template-var[data-name="error-page-page"]').textContent = pageID.toString()
				break
			}

			if ( thisItem.masterType === 'vehicle' ) {
				MA.byId('bgContent').appendChild(pageTitle(
					`${client_BGData.brandMap[thisItem.brand.toLowerCase()]} ${I18N.defer(thisItem.name)}`,
					{openFolder : thisItem.isBase, preTranslated : true, skipIfNotBase : true}))

				const thisUUID = crypto.randomUUID()
				await subStep_vehicle(
					thisUUID,
					thisItem,
					pageID,
					subStep_combos(thisItem?.specs?.combination)
				)

				if ( thisItem.isBase ) {
					MA.byIdEventIfExists('openFolderButton', () => {
						window.basegame_IPC.openFolder(thisItem.diskPath.slice(0, -1))
					})
				}
				break
			}

			MA.byId('bgContent').appendChild(pageTitle(thisItem.name, {skipIfNotBase : true}))
			await subStep_placeable(thisItem)

			break
		}
		default : {
			if ( typeof pageType === 'string' ) {
				MA.byId('homePageContent').clsShow()
				MA.byId('homePageError').clsShow()
				MA.queryF('template-var[data-name="error-page-type"]').textContent = pageType.toString()
				MA.queryF('template-var[data-name="error-page-page"]').textContent = pageID.toString()
				break
			}
			
			buildSearchTree()
			MA.byId('homePageContent').clsShow()

			MA.byId('mods__filter').addEventListener('keyup', doFilter)
			MA.byId('mods__filter').addEventListener('contextmenu', window.basegame_IPC.context)
			MA.byId('mods__filter_clear').addEventListener('click', doClear)

			break
		}
	}

	ft_doReplace()

	for ( const element of MA.queryA('.compareSingle')) {
		element.addEventListener('click', compareSingle)
	}

	for ( const element of MA.queryA('.pageClicker')) {
		element.addEventListener('click', changePage)
	}

	MA.byIdEventIfExists('backButton', () => { history.back() })
	MA.byIdEventIfExists('homeButton', () => { location.search = '' })
	MA.byIdEventIfExists('homeButtonError', () => { location.search = '' })
})
// #endregion

// #region FILTER
function findItemsByTerm(strTerm) {
	const foundItems = []
	for ( const [thisItemKey, thisItem] of Object.entries(searchTree) ) {
		if ( thisItem.includes(strTerm.toLowerCase()) ) { foundItems.push(thisItemKey) }
	}
	return foundItems
}

function doFilter() {
	const filterText = MA.byIdValueLC('mods__filter')

	MA.byId('mods__filter_clear').clsShow(filterText !== '')

	MA.byIdHTML('searchContent', '')
	if ( filterText.length > 1 ) {
		MA.byId('homePageBlurb').clsHide()
		MA.byId('searchContentBox').clsShow()
		for ( const element of findItemsByTerm(filterText).sort().map((x) => buildItem(x)) ) {
			for ( const clicker of element.querySelectorAll('.compareSingle')) {
				clicker.addEventListener('click', compareSingle)
			}
		
			for ( const clicker of element.querySelectorAll('.pageClicker')) {
				clicker.addEventListener('click', changePage)
			}

			MA.byId('searchContent').appendChild(element)
		}
	} else {
		MA.byId('homePageBlurb').clsShow()
		MA.byId('searchContentBox').clsHide()
	}
}

function doClear() {
	MA.byIdValue('mods__filter', '')
	doFilter()
}
// #endregion

// #region CLICKS
function changePage(e) {
	const realTarget = e.target.closest('.pageClicker')
	const thisType   = realTarget.safeAttribute('data-type')
	const thisPage   = realTarget.safeAttribute('data-page')
	if ( thisType !== null && thisPage !== null ) {
		location.search = `?type=${thisType}&page=${thisPage}`
	}
}

function compareSingle(e) {
	e.preventDefault()
	e.stopPropagation()
	const realTarget = e.target.closest('.pageClicker')

	window.basegame_IPC.sendCompare([buildCompareRequest(realTarget.safeAttribute('data-page'))])
}

function attachClicker(e) {
	const realTarget = e.target.closest('.badge')
	if ( realTarget.classList.contains('custom') ) { return }
	const openObject = {
		type  : realTarget.classList.contains('attach_need') ? 'attach_need' : 'attach_has',
		page : realTarget.safeAttribute('data-jointpage'),
	}
	if ( openObject.type !== null && openObject.page !== null ) {
		location.search = `?type=${openObject.type}&page=${openObject.page}`
	}
}

function comboGetInfo(target) {
	const thisItemDIV = target.closest('.comboItemEntry')
	const theseVars = thisItemDIV.querySelector('.comboItemInfo').querySelectorAll('template-var')
	const returnObj = {
		source : null,
		type   : null,
		page   : null,
	}
	for ( const element of theseVars ) {
		if ( element.safeAttribute('data-name') === 'clickSource' ) { returnObj.source = element.textContent }
		if ( element.safeAttribute('data-name') === 'clickPage' ) { returnObj.page = element.textContent }
		if ( element.safeAttribute('data-name') === 'clickType' ) { returnObj.type = element.textContent }
	}
	return returnObj
}

function comboAddAll() { window.basegame_IPC.sendCompare([...comboKeyList]) }

function comboAddSingle(e) {
	const { page } = comboGetInfo(e.target)
	const compareObj = {
		contents : null,
		internal : true,
		key      : page,
		source   : null,
	}
	window.basegame_IPC.sendCompare([compareObj])
}

function comboItemClicker(e) {
	const { type, page } = comboGetInfo(e.target)
	location.search = `?type=${type}&page=${page}`
}
// #endregion