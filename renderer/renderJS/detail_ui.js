/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Detail window UI

/* global dtLib, __, processL10N, fsgUtil, client_BGData, clientGetKeyMap, clientGetKeyMapSimple, clientMakeCropCalendar */

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

const doMapImage = (mapImage) => {
	if ( mapImage === null || typeof mapImage !== 'string') { return }
	fsgUtil.clsShow('map_image_div')
	fsgUtil.byId('map_image').src = mapImage
}

const buildStore = (lookRecord, chartUnits) => {
	const storeItemsHTML = []
	const storeItemsJS   = []

	doMapImage(lookRecord?.mapImage)

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

const doKeyBinds = (modRecord, locale) => {
	const keyBinds = []
	for ( const action in modRecord.modDesc.binds ) {
		const thisBinds = modRecord.modDesc.binds[action].map((keyCombo) => clientGetKeyMapSimple(keyCombo, locale))
		keyBinds.push(`${action} :: ${thisBinds.join('<span class="mx-3">/</span>')}`)
	}
	return keyBinds
}

const buildPage = (modCollect) => {
	document.body.setAttribute('data-version', modCollect.appSettings.game_version)

	const modRecord    = modCollect.opts.selected
	modName            = modRecord.fileDetail.shortName
	const modDate      = new Date(Date.parse(modRecord.fileDetail.fileDate)).toLocaleString(modCollect.currentLocale, {timeZoneName : 'short'})
	const doneKeyBinds = doKeyBinds(modRecord, modCollect.currentLocale)
	const idMap = {
		bigFiles       : fsgUtil.arrayJoinOrOther(modRecord.fileDetail.tooBigFiles),
		depends        : fsgUtil.arrayJoinOrOther(modRecord.modDesc.depend, 'detail_depend_clean'),
		description    : fsgUtil.escapeDesc(modRecord.l10n.description),
		extraFiles     : fsgUtil.arrayJoinOrOther(modRecord.fileDetail.extraFiles),
		file_date      : modDate,
		filesize       : fsgUtil.bytesToHR(modRecord.fileDetail.fileSize),
		has_scripts    : fsgUtil.checkX(modRecord.modDesc.scriptFiles),
		i3dFiles       : modRecord.fileDetail.i3dFiles.join('\n'),
		is_multiplayer : fsgUtil.checkX(modRecord.modDesc.multiPlayer, false),
		keyBinds       : fsgUtil.arrayJoinOrOther(doneKeyBinds, 'detail_key_none'),
		mh_version     : ( modRecord.modHub.id !== null ) ? `<a href="https://www.farming-simulator.com/mod.php?mod_id=${modRecord.modHub.id}" target="_BLANK">${modRecord.modHub.version}</a>` : `<em>${__(modRecord.modHub.id === null ? 'mh_norecord' : 'mh_unknown' )}</em>`,
		mod_author     : fsgUtil.escapeSpecial(modRecord.modDesc.author),
		mod_location   : modRecord.fileDetail.fullPath,
		pngTexture     : fsgUtil.arrayJoinOrOther(modRecord.fileDetail.pngTexture),
		spaceFiles     : fsgUtil.arrayJoinOrOther(modRecord.fileDetail.spaceFiles),
		store_items    : fsgUtil.checkX(modRecord.modDesc.storeItems),
		title          : (( modRecord.l10n.title !== null && modRecord.l10n.title !== '--' ) ? fsgUtil.escapeSpecial(modRecord.l10n.title) : modRecord.fileDetail.shortName),
		version        : fsgUtil.escapeSpecial(modRecord.modDesc.version),
	}

	fsgUtil.setContent(idMap)

	fsgUtil.clsOrGateArr('keyBinds', doneKeyBinds, 'text-info')
	fsgUtil.clsOrGateArr('pngTexture', modRecord.fileDetail.pngTexture)
	fsgUtil.clsOrGateArr('spaceFiles', modRecord.fileDetail.spaceFiles)
	fsgUtil.clsOrGateArr('extraFiles', modRecord.fileDetail.extraFiles)
	fsgUtil.clsOrGateArr('bigFiles', modRecord.fileDetail.tooBigFiles)

	for ( const element of fsgUtil.query('#description a') ) { element.target = '_BLANK' }

	const bindingIssue     = modCollect.bindConflict[modRecord.currentCollection][modRecord.fileDetail.shortName] ?? null

	if ( modRecord.issues.length === 0 && bindingIssue === null ) {
		fsgUtil.clsHide('problem_div')
	} else {
		const problems = [
			...doStep_issues(modRecord),
			...doStep_binds(bindingIssue, modCollect.currentLocale)
		].map((x) => `<tr class="py-2"><td class="px-2">${fsgUtil.checkX(0, false)}</td><td>${x}</td></tr>`)

		fsgUtil.setById('problems', `<table class="table table-borderless mb-0">${problems.join('')}</table>`)
	}

	const theseBadges = Array.isArray(modRecord.displayBadges) ? modRecord.displayBadges.map((badge) => fsgUtil.badge_main(badge)).join(' ') : false

	fsgUtil.setTextOrHide(
		'badges',
		theseBadges,
		theseBadges
	)

	fsgUtil.setTextOrHide(
		'icon_div',
		`<img class="img-fluid" src="${modRecord.modDesc.iconImageCache}" />`,
		modRecord.modDesc.iconImageCache
	)

	if ( Array.isArray(modRecord.modDesc.cropInfo) ) {
		fsgUtil.clsShow('cropcal_div')
		fsgUtil.clsShow('detail_crop_json')
		
		clientMakeCropCalendar('crop-table', modRecord.modDesc.cropInfo, modRecord.modDesc?.mapIsSouth || false, modRecord.modDesc?.cropWeather || null)
		
		fsgUtil.byId('cropcal_button').addEventListener('click', () => {
			window.mods.popClipboard(JSON.stringify(modRecord.modDesc.cropInfo))
		})
	}
}

function doStep_issues(modRecord) {
	const problems = []
	for ( const issue of modRecord.issues ) {
		let issueText = __(issue)
		
		if ( issue === 'FILE_ERROR_LIKELY_COPY' && modRecord.fileDetail.copyName !== false ) {
			issueText += ` ${__('file_error_copy_name')} ${modRecord.fileDetail.copyName}${modRecord.fileDetail.isFolder?'':'.zip'}`
		}
		problems.push(issueText)
	}
	return problems
}

function doStep_binds(bindingIssue, locale) {
	const problems = []
	if ( bindingIssue !== null ) {
		for ( const keyCombo in bindingIssue ) {
			const actualKey = clientGetKeyMap(keyCombo, locale)
			const confList  = bindingIssue[keyCombo].join(', ')
			const issueText = `${__('bind_conflict')} : ${actualKey} :: ${confList}`
			problems.push(issueText)
		}
	}
	return problems
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