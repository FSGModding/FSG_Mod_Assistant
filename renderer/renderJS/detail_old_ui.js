/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Detail window UI

/* global dtLib, __, processL10N, fsgUtil, client_BGData, ,  */

let lookItemData = {}
let lookItemMap  = {}
let comboItemMap = {}
let modName      = ''

window.mods.receive('fromMain_lookRecord', (lookRecord, chartUnits, currentLocale) => {
	lookItemData = {}
	lookItemMap  = {}
	comboItemMap = {}
	try {
		buildStore(lookRecord, chartUnits, currentLocale)
		fsgUtil.clsHideTrue('store_process', true)
	} catch (err) {
		window.log.warning(`Store build failed :: ${err}`, 'detail-ui')
	}
	processL10N()
})

window.mods.receive('fromMain_modRecord', (modCollect) => {
	try {
		fsgUtil.clsShowTrue('store_process', modCollect.opts.hasStore)
		buildPage(modCollect)
	} catch (err) {
		window.log.warning(`Page build failed :: ${err}`, 'detail-ui')
	}
	processL10N()
})

const make_combos = (combos, lookRecord, parentItem) => {
	if ( typeof combos === 'undefined' || combos === null || combos.length === 0 ) { return '' }

	const comboKeyList = new Set()
	const comboHTML    = []

	for ( const thisCombo of combos ) {
		if ( thisCombo === null ) { continue }

		const thisComboIsBase = thisCombo.startsWith('$data')
		const thisComboKey    = thisComboIsBase ? thisCombo.replaceAll('$data/', '').replaceAll('/', '_').replaceAll('.xml', '') : thisCombo

		if ( thisComboKey !== null ) {
			const thisItem = thisComboIsBase ? client_BGData.records[thisComboKey] : lookRecord.items[thisComboKey]

			if ( typeof thisItem === 'undefined' ) { continue }

			const theIcon = dtLib.iconChooser(
				thisItem.icon,
				lookRecord?.icons?.[thisComboKey]
			)

			comboKeyList.add({internal : thisComboIsBase, key : thisComboKey, contents : thisComboIsBase ? null : thisItem})

			const thisItemData = dtLib.getInfo(thisItem)

			comboHTML.push(fsgUtil.useTemplate('combo_div_source', {
				brandIcon      : dtLib.safeBrandImage(thisItem.brand),
				category       : __(thisItem.category, {skipIfNotBase : true}),
				clickPage      : thisComboKey,
				clickSource    : thisComboIsBase ? 'base' : 'internal',
				clickType      : 'item',
				compareTerms   : [
					dtLib.doDataType('price', thisItemData.price),
					dtLib.doDataType('workWidth', thisItemData.workWidth),
				].join(''),
				fullName       : __(thisItem.name, {skipIfNotBase : true}),
				itemIcon       : dtLib.safeDataImage(theIcon),
				page           : thisComboKey,
				showCompButton : thisItem.masterType === 'vehicle' ? '' : 'd-none',
			}))
		}
	}
	comboItemMap[parentItem] = [...comboKeyList]
	return comboHTML.join('')
}


/* eslint-disable-next-line complexity */
const buildStore = (lookRecord, chartUnits) => {
	const storeItemsHTML = []
	const storeItemsJS   = []


	for ( const storeitem in lookRecord.items ) {
		const thisItem     = lookRecord.items[storeitem]
		const thisItemUUID = crypto.randomUUID()

		if ( thisItem.masterType === 'vehicle' ) {
			lookItemMap[storeitem] = thisItemUUID
			lookItemData[thisItemUUID] = thisItem
			lookItemData[thisItemUUID].icon = fsgUtil.iconMaker(lookRecord?.icons?.[storeitem] || null)
			lookItemData[thisItemUUID].uuid_name = storeitem

			const thisItemData = dtLib.getInfo(thisItem)
			const brandImage   = dtLib.safeBrandFromRecord(thisItem.brand, lookRecord, {width : '30%'})
			const fillImages   = dtLib.doFillTypes(thisItem.fillTypes)
		
			const thisItemDataHTML = dtLib.typeDataOrder.map((x) => dtLib.doDataType(x, thisItemData[x]))

			for ( const testItem of dtLib.vehTestTypes ) {
				if ( fsgUtil.getShowBool(thisItem[testItem[0]], testItem[1]) ) {
					thisItemDataHTML.push(dtLib.doDataRow(testItem[2], __(testItem[3] === false ? thisItem[testItem[0]]: testItem[3])))
				}
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
					dtLib.doJoints(thisItem?.joints?.canUse, true, false)
				),
				dtLib.doDataRowTrue(
					'cat-attach-need',
					fsgUtil.getShowBool(thisItem?.joints?.needs) ? __('basegame_attach_need') : null,
					dtLib.doJoints(thisItem?.joints?.needs, false, false)
				)
			)

			storeItemsHTML.push(fsgUtil.useTemplate('vehicle_info_div', {
				brandImage   : brandImage,
				category     : __(thisItem.category, { skipIfNotBase : true }),
				combinations : make_combos(thisItem?.specs?.combination, lookRecord, thisItemUUID),
				functions    : dtLib.wrap.functions(thisItem.functions),
				iconImage    : dtLib.safeDataImage(dtLib.iconChooser(thisItem.icon), { width : 'auto'}),
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
	
			storeItemsHTML.push(fsgUtil.useTemplate('place_div', {
				category  : __(thisItem.category, {skipIfNotBase : true}),
				functions : dtLib.wrap.functions(thisItem.functions),
				iconImage : dtLib.safeDataImage(fsgUtil.iconMaker(lookRecord?.icons?.[storeitem]), { width : 'auto'}),
				itemName  : __(thisItem.name, {skipIfNotBase : true}),
				itemTitle : thisItem.type,
				placeData : thisItemDataHTML.join(''),
				prodLines : dtLib.doProductions(thisItem?.productions),
			}))
		}
	}

	fsgUtil.setById('storeitems', storeItemsHTML)
	fsgUtil.clsShow('store_div')

	for ( const thisJS of storeItemsJS ) {
		setTimeout(thisJS, 25)
	}
}


const buildPage = (modCollect) => {
	document.body.setAttribute('data-version', modCollect.appSettings.game_version)

	const modRecord    = modCollect.opts.selected
	modName            = modRecord.fileDetail.shortName


	

}



function clientOpenCompare(uuid) {
	window.mods.openCompareMod(lookItemData[uuid], modName)
}

function clientCompareCombo(source, page) {
	if ( source === 'internal' ) {
		window.mods.openCompareMod(lookItemData[lookItemMap[page]], modName)
	} else {
		window.mods.openCompareBase(page)
	}
}

function clientOpenCombos(uuid) {
	window.mods.openCompareMulti(comboItemMap[uuid], modName)
}

function clientClickCombo(source, type, page) {
	if ( source === 'internal' ) {
		location.hash = lookItemMap[page]
	} else {
		window.mods.openBaseGameDeep(type, page)
	}
}