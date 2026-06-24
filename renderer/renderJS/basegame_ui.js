/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */
// MARK: BASE GAME UI

/* global I18N, MA, DATA, icons, client_BGData, ft_doReplace, client_BuilderPlace, client_BuilderVehicle */
let version    = 25
let locale     = 'en'
let i18nUnits  = null
let searchTree = {}

/* cSpell: disable */
const catTitleMap = {
	'object'           : '$l10n_ui_objects',
	'tool'             : '$l10n_ui_tools',
	'vehicle'          : '$l10n_ui_vehicles',

	'animals'          : '$l10n_categoryType_animals',
	'baling'           : '$l10n_categoryType_baling',
	'combine'          : '$l10n_categoryType_combine',
	'cotton'           : '$l10n_categoryType_cotton',
	'drivables'        : '$l10n_categoryType_driveables',
	'forage'           : '$l10n_categoryType_forage',
	'forestry'         : '$l10n_categoryType_forestry',
	'grain'            : '$l10n_categoryType_grain',
	'grapes_olives'    : '$l10n_categoryType_grapesOlives',
	'grassland'        : '$l10n_categoryType_grassland',
	'handtools'        : '$l10n_categoryType_handTools',
	'loaders'          : '$l10n_categoryType_loaders',
	'misc'             : '$l10n_categoryType_misc',
	'objects'          : '$l10n_categoryType_objects',
	'placeable'        : '$l10n_categoryType_placeable',
	'rice'             : '$l10n_categoryType_rice',
	'rootcrops'        : '$l10n_categoryType_rootcrops',
	'seeding'          : '$l10n_categoryType_seeding',
	'silage'           : '$l10n_categoryType_silage',
	'soil_preparation' : '$l10n_categoryType_soilPreparation',
	'soiltreatment'    : '$l10n_categoryType_soilTreatment',
	'specialcrops'     : '$l10n_categoryType_specialCrops',
	'sugarcane'        : '$l10n_categoryType_sugarCane',
	'trailers'         : '$l10n_categoryType_trailers',
	'vegetables'       : '$l10n_categoryType_vegetables',
	'yield'            : '$l10n_categoryType_yieldImprovement',
	'yieldweeds'       : '$l10n_categoryType_yieldWeeds',
}
/* cSpell: enable */

const selectFills = [
	{ filltype : 'barley', l10n : '$l10n_fillType_barley' },
	{ filltype : 'beetroot', l10n : '$l10n_fillType_beetroot' },
	{ filltype : 'canola', l10n : '$l10n_fillType_canola' },
	{ filltype : 'carrot', l10n : '$l10n_fillType_carrots' },
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
	{ filltype : 'greenbean', l10n : '$l10n_fillType_greenbean' },
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
	{ filltype : 'pea', l10n : '$l10n_fillType_pea' },
	{ filltype : 'pigfood', l10n : '$l10n_fillType_pigFood' },
	{ filltype : 'poplar', l10n : '$l10n_fillType_poplar' },
	{ filltype : 'potato', l10n : '$l10n_fillType_potato' },
	{ filltype : 'rice', l10n : '$l10n_fillType_rice' },
	{ filltype : 'ricelonggrain', l10n : '$l10n_fillType_ricelonggrain' },
	{ filltype : 'roadsalt', l10n : '$l10n_fillType_roadSalt' },
	{ filltype : 'roundbale', l10n : '$l10n_fillType_roundBale' },
	{ filltype : 'seeds', l10n : '$l10n_fillType_seeds' },
	{ filltype : 'silage_additive', l10n : '$l10n_fillType_silageAdditive' },
	{ filltype : 'silage', l10n : '$l10n_fillType_silage' },
	{ filltype : 'sorghum', l10n : '$l10n_fillType_sorghum' },
	{ filltype : 'soybean', l10n : '$l10n_fillType_soybean' },
	{ filltype : 'spinach', l10n : '$l10n_fillType_spinach' },
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

// MARK: CAT LISTS
function getTopCat(cat) {
	const skip_cats = new Set([
		'sales',
		'chainsaws',
	])
	const skip_joint = new Set([
		'train',
		'bigbag'
	])
	switch ( cat ) {
		case 'non-place' : {
			const catArray = []
			for ( const catName of Object.keys(client_BGData.category).sort() ) {
				if ( catName === 'placeable' || catName === 'none' ) { continue }
				catArray.push(
					`<div class="w-100 pb-3 fs-2 text-center top-0 z-3 bg-body"><div class="w-75 mx-auto"><i18n-text data-version="${version}" data-key="${catTitleMap[catName]}"></i18n-text></div></div>`,
					...client_BGData.category[catName]
						.filter((x) => !skip_cats.has(x.key))
						.filter((x) => client_BGData.catKeyToVehicle[x.key].length !== 0 )
						.sort((a, b) => Intl.Collator().compare(a.key, b.key))
						.map((x) => buildCategoryItem({
							// image      : `<img src="${icons.item(x.iconFile)}" style="width:160px">`,
							image      : `<img src="${icons.forcePointer(client_BGData.vehicles[client_BGData.catKeyToVehicle[x.key][0]].iconOrig)}" style="width:160px">`,
							
							page       : x.key,
							text       : x.title,
							type       : 'subcat',
						}))
				)
			}
			return catArray
		}
		case 'placeable' :
			return client_BGData.category.placeable
				.sort((a, b) => Intl.Collator().compare(a.key, b.key))
				.filter((x) => client_BGData.catKeyToPlaceable[x.key].length !== 0 )
				.map((x) => buildCategoryItem({
					image      : `<img src="${icons.item(client_BGData.placeables[client_BGData.catKeyToPlaceable[x.key][0]].iconOrig)}" style="width:160px">`,
					page       : x.key,
					text       : x.title,
					type       : 'subcat',
				}))
		case 'brand' :
			return client_BGData.brands
				.sort((a, b) => Intl.Collator().compare(a.title, b.title))
				.filter((x) => client_BGData.brandKeyToVehicles?.[x.key]?.length > 0 )
				.map((x) => buildCategoryItem({
					image : `<img src="img/brand/${x.icon}.webp" style="width:100px">`,
					maxWidthCalc : '100px',
					page  : x.key,
					text  : x.title,
					type  : 'brand',
				}))
		case 'fills' :
			return selectFills
				.filter((x) => getByFill(x.filltype).length !== 0)
				.map((x) => buildCategoryItem({
					colSix     : true,
					image      : `<fillType class="h0" name="fill-${x.filltype}"></fillType>`,
					page       : x.filltype,
					text       : x.l10n,
					type       : 'fill',
				}))
		case 'attach_need' :
			return Object.keys(client_BGData.jointNeedToVehicle)
				.filter((x) => !skip_joint.has(x.toLowerCase()) )
				.sort()
				.map((x) => buildCategoryItem({
					image      : `<img src="${icons.forcePointer(client_BGData.vehicles[client_BGData.jointNeedToVehicle[x][0]].iconOrig)}" style="width:160px">`,
					page       : x.toLowerCase(),
					text       : x,
					type       : 'attach_need',
				}))
		case 'attach_has' :
			return Object.keys(client_BGData.jointHasToVehicle)
				.filter((x) => !skip_joint.has(x.toLowerCase()) )
				.sort()
				.map((x) => buildCategoryItem({
					image      : `<img src="${icons.forcePointer(client_BGData.vehicles[client_BGData.jointHasToVehicle[x][0]].iconOrig)}" style="width:160px">`,
					page       : x.toLowerCase(),
					text       : x,
					type       : 'attach_has',
				}))
		default :
			return locale
	}
}

function buildCategoryItem({colSix = false, type = null, page = null, maxWidthCalc = null, image = null, text = null} = {}) {
	const style = !colSix ? '' : 'style="width: 16%"'
	return [
		`<div ${style} class="text-center pageClicker flex-grow-0" data-type="${type}" data-page="${page}">`,
		`<div class="p-2 border rounded-3 d-flex flex-column h-100 justify-content-center" style="max-width: ${maxWidthCalc === null ? 'auto' : `calc(${maxWidthCalc} + 1rem)`}">`,
		image,
		I18N.unwrap_base(text, version),
		'</div></div>'
	].join('')
}

// MARK: build card item
function buildItem(itemID, noBrand = false) {
	const itemType       = client_BGData.itemKeyToType[itemID]
	const skipBrand      = noBrand || ( itemType !== 'vehicles' )
	const thisItem       = client_BGData[itemType][itemID]
	const thisItemParsed = itemType === 'vehicles' ?
		new client_BuilderVehicle(
			null,
			thisItem,
			null,
			locale,
			version
		) :
		new client_BuilderPlace(
			thisItem,
			locale,
			version
		)
	let   dataItems        = null
	const attemptKey       = thisItemParsed.cleanParentID

	if ( attemptKey !== null ) {
		const attemptItem = client_BGData[itemType][attemptKey]
		const attemptItemParsed = new client_BuilderVehicle(
			null,
			attemptItem,
			null,
			locale,
			version
		)
		dataItems = attemptItemParsed.itemCard
	} else {
		dataItems = thisItemParsed.itemCard
	}

	const infoDivNode = DATA.templateEngine('store_item', {
		brandImage : skipBrand ? '' : `<img src="${thisItemParsed.brand}" class="img-fluid store-brand-image">`,
		iconImage  : `<img src="${thisItemParsed.icon}" class="img-fluid store-icon-image">`,

		dataItems  : dataItems,
		dlc        : thisItem.dlcKey !== null ? thisItem.dlcKey : '',
		name       : thisItemParsed.name,
	}, {}, {
		'.compareSingle'    : MA.showTest(thisItem.masterType === 'vehicle'),
		'.hasParentFile'    : attemptKey !== null ? 'notRealItem' : '',
		'.store-icon-brand' : MA.showTest(!skipBrand),
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

	for ( const [thisItemKey, thisItem] of Object.entries(client_BGData.vehicles) ) {
		searchTree[thisItemKey] = `${thisItem.sorting.name.toLowerCase()} ${thisItemKey.toLowerCase()}`
	}
	for ( const [thisItemKey, thisItem] of Object.entries(client_BGData.placeables) ) {
		searchTree[thisItemKey] = `${thisItem.sorting.name.toLowerCase()} ${thisItemKey.toLowerCase()}`
	}
}

function attachProperCase(pageID) {
	for ( const thisAttach of client_BGData.jointList ) {
		if ( thisAttach.toLowerCase() === pageID ) { return thisAttach }
	}
}

function findFill(fillType) {
	for ( const thisFill of selectFills ) {
		if ( thisFill.filltype === fillType ) { return thisFill.l10n }
	}
}

function getByFill(fillType) {
	const vehicleList = new Set()
	const fillCatList = icons.fill_cats_from_fill(fillType, version)

	for ( const [thisItemID, thisItem] of Object.entries(client_BGData.vehicles) ) {
		if ( thisItem.fillSpray.fillType.includes(fillType) ) { vehicleList.add(thisItemID) }

		if ( thisItem.fillSpray.fillCat.length === 0 ) { continue }
		for ( const fillCat of fillCatList ) {
			if ( thisItem.fillSpray.fillCat.includes(fillCat)) { vehicleList.add(thisItemID) }
		}
	}
	return [...vehicleList].sort()
}

function buildCompareRequest(id) {
	const thisItem       = client_BGData.vehicles[id]
	if ( typeof thisItem === 'undefined' ) { return }
	const thisItemParsed = new client_BuilderVehicle(
		null,
		thisItem,
		null,
		locale,
		version
	)

	return {
		contents : thisItemParsed.comboData,
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
		preTranslated ? title : skipIfNotBase ? I18N.unwrap_base(title, version) : I18N.defer(title, skipIfNotBase),
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

	window.log.debug('Basegame', pageType, pageID)

	version   = window.location.pathname.substring(window.location.pathname.length -7, window.location.pathname.length -5)
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
			const isVehicleCat = Object.hasOwn(client_BGData.catKeyToVehicle, pageID)
			const catL10n      = client_BGData.catKeyToTitle[pageID]
			const catContent   = ((isVehicleCat ? client_BGData.catKeyToVehicle[pageID] : client_BGData.catKeyToPlaceable[pageID]) ?? []).sort()

			MA.byId('bgContent').appendChild(pageTitle(catL10n, {skipIfNotBase : true, compareAll : true}))

			for ( const element of catContent.sort().map((x) => buildItem(x, !isVehicleCat)) ) {
				MA.byId('bgContent').appendChild(element)
			}

			MA.byIdEventIfExists('compareAllButton', () => {
				window.basegame_IPC.sendCompare(catContent.map((x) => buildCompareRequest(x)))
			})
			break
		}
		case 'brand' : {
			const brandDisplay = pageID.toUpperCase()
			const brandContent = (client_BGData.brandKeyToVehicles[brandDisplay] ?? []).sort()

			MA.byId('bgContent').appendChild(pageTitle(client_BGData.brandKeyToTitle[pageID], {compareAll : true, skipIfNotBase : true}))

			for ( const element of brandContent.sort().map((x) => buildItem(x)) ) {
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
			const jointCase     = pageType === 'attach_has' ? 'jointHasToVehicle' : 'jointNeedToVehicle'
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
			const thisTitle    = `${I18N.defer('basegame_fills', false)} : ${I18N.unwrap_base(findFill(pageID), version)}`
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
			const itemType       = client_BGData.itemKeyToType[pageID]
			const thisItem       = client_BGData?.[itemType]?.[pageID]

			if ( typeof thisItem === 'undefined' ) {
				MA.byId('homePageContent').clsShow()
				MA.byId('homePageError').clsShow()
				MA.queryF('template-var[data-name="error-page-type"]').textContent = pageType.toString()
				MA.queryF('template-var[data-name="error-page-page"]').textContent = pageID.toString()
				break
			}

			const thisItemParsed = itemType === 'vehicles' ?
				new client_BuilderVehicle(
					null,
					thisItem,
					null,
					locale,
					version
				) :
				new client_BuilderPlace(
					thisItem,
					locale,
					version
				)

			if ( thisItem.masterType === 'vehicle' ) {
				MA.byId('bgContent').appendChild(pageTitle(
					`${client_BGData.brandKeyToTitle[thisItem.sorting.brand.toUpperCase()]} ${thisItemParsed.name}`,
					{openFolder : thisItem.isBase, preTranslated : true, skipIfNotBase : true}))

				thisItemParsed.populateCombos(this.storeInfo)
				const thisHTML = thisItemParsed.HTML
				thisHTML.firstElementChild.classList.add('mt-3')
				MA.byIdAppend('bgContent', thisHTML)
				thisItemParsed.doCharts(i18nUnits)
			} else {
				MA.byId('bgContent').appendChild(pageTitle(thisItem.sorting.name, {skipIfNotBase : true}))
				const thisHTML = thisItemParsed.HTML
				thisHTML.firstElementChild.classList.add('mt-3')
				MA.byIdAppend('bgContent', thisHTML)
			}
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


