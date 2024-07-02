/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

/* global DATA, MA, ST, I18N, __, ft_doReplace, clientGetKeyMapSimple, clientGetKeyMap, clientMakeCropCalendar */

// let modName = ''
let lookItemData = {}
let lookItemMap  = {}
let comboItemMap = {}
let i18nUnits    = null
let locale       = 'en'


window.addEventListener('DOMContentLoaded', () => {
	lookItemData = {}
	lookItemMap  = {}
	comboItemMap = {}

	const urlParams = new URLSearchParams(window.location.search)
	const modColUUID = urlParams.get('mod')

	window.detail.getMod(modColUUID).then(async (thisMod) => {
		// modName   = thisMod.fileDetail.shortName

		locale    = await window.i18n.lang()
		i18nUnits = await window.settings.units()

		const basicPromises = [
			step_table(thisMod),
			step_keyBinds(thisMod),
			step_problems(thisMod),
			step_badges(thisMod),
			step_crops(thisMod),
		]

		try {
			const storeInfo = await window.detail.getStore(modColUUID)

			console.log(storeInfo)
			const storePromises = [
				step_mapImage(storeInfo.mapImage),
			]

			MA.byIdHTML('storeitems', '')
			MA.byId('store_div').clsShow(storeInfo.items.length !== 0)

			for ( const [storeItemFile, thisItem] of Object.entries(storeInfo.items) ) {
				if ( thisItem.masterType === 'vehicle' ) {
					storePromises.push(subStep_vehicle(storeItemFile, thisItem, storeInfo.icons[storeItemFile], storeInfo.brands))
				} else if ( thisItem.masterType === 'placeable' ) {
					// storePromises.push(subStep_placeable(thisItem, thisItemUUID))
				}
			}

			basicPromises.push(...storePromises)
		} catch {
			// console.log(`UNABLE TO LOAD STORE INFO :: ${err}`)
		}

		
		

		Promise.allSettled(basicPromises).then(() => {
			ft_doReplace()
			MA.byId('loading-spinner').clsHide()
		})
		
	})

	for ( const element of MA.query('.inset-block-header-show-hide l10n') ) {
		element.addEventListener('click', showHideClicker)
	}
})


async function step_mapImage(mapImage) {
	if ( mapImage === null || typeof mapImage !== 'string') { return }
	MA.byId('map_image_div').clsShow()
	MA.byId('map_image').src = mapImage
}

async function step_crops(thisMod) {
	if ( Array.isArray(thisMod.modDesc.cropInfo) ) {
		MA.byId('cropcal_div').clsShow()
		MA.byId('detail_crop_json').clsShow()
		MA.byId('cropcal_button').addEventListener('click', () => {
			window.mods.popClipboard(JSON.stringify(thisMod.modDesc.cropInfo))
		})
		
		return clientMakeCropCalendar(
			thisMod.modDesc.cropInfo,
			thisMod.modDesc?.mapIsSouth || false,
			thisMod.modDesc?.cropWeather || null
		).then((html) => {
			MA.byIdHTML('crop-table', html)
		})
	}
}

async function step_badges(thisMod) {
	return window.detail.getMalware().then((malware) => {
		let foundMalware = false

		const theseBadges = Array.isArray(thisMod.displayBadges) ? thisMod.displayBadges.filter((badge) => {
			if ( badge.name === 'malware' ) {
				if ( malware.dangerModsSkip.has(thisMod.fileDetail.shortName) ) { return false }
				if ( malware.suppressList.includes(thisMod.fileDetail.shortName)) { return false }
				foundMalware = true
			}
			return true
		}) : []

		MA.byId('malware-found').clsShow(foundMalware)

		const badgePromise = theseBadges.map((badge) => I18N.buildBadgeMod(badge))

		return Promise.allSettled(badgePromise).then((badges) => {
			badges.map((x) => {
				MA.byId('badges').appendChild(x.value)
			})
		})
	})
}

async function step_problems(thisMod) {
	return window.detail.getBinds().then(async (bindConflicts) => {
		const bindingIssue     = bindConflicts[thisMod.currentCollection][thisMod.fileDetail.shortName] ?? null

		if ( thisMod.issues.length === 0 && bindingIssue === null ) {
			MA.byId('problem_div').clsHide()
		} else {
			return Promise.allSettled([
				...await subStep_issues(thisMod),
				...await subStep_binds(bindingIssue, locale),
			]).then((value) => {
				const theseIssues = value.map((item) => `<tr class="py-2"><td class="px-2">${DATA.checkX(0, false)}</td><td>${item.value}}</td></tr>`)
				MA.byIdHTML('problems', `<table class="table table-borderless mb-0">${theseIssues.join('')}</table>`)
			})
		}
	})
}

async function step_keyBinds(thisMod) {
	const keyBinds = []
	for ( const action in thisMod.modDesc.binds ) {
		const thisBinds = thisMod.modDesc.binds[action].map((keyCombo) => clientGetKeyMapSimple(keyCombo, locale))
		keyBinds.push(`${action} :: ${thisBinds.join('<span class="mx-3">/</span>')}`)
	}
	return DATA.joinArrayOrI18N(keyBinds, 'detail_key_none').then((value) => {
		MA.byIdHTML('keyBinds', value)
		MA.byId('keyBinds').clsOrGateArr(keyBinds, 'text-info')
	})
	
}

async function step_table(thisMod) {
	const joinedArrays = {
		bigFiles       : [thisMod.fileDetail.tooBigFiles],
		depends        : [thisMod.modDesc.depend, 'detail_depend_clean'],
		extraFiles     : [thisMod.fileDetail.extraFiles],
		pngTexture     : [thisMod.fileDetail.pngTexture],
		spaceFiles     : [thisMod.fileDetail.spaceFiles],
	}
	for ( const [id, content] of Object.entries(joinedArrays)) {
		DATA.joinArrayOrI18N(...content).then((value) => {
			MA.byIdHTML(id, value)
			MA.byId(id).clsOrGateArr(content[0])
		})
	}

	const idMap = {
		description    : DATA.escapeDesc(thisMod.l10n.description),
		file_date      : (new Date(Date.parse(thisMod.fileDetail.fileDate))).toLocaleString(locale, {timeZoneName : 'short'}),
		filesize       : await DATA.bytesToHR(thisMod.fileDetail.fileSize),
		has_scripts    : DATA.checkX(thisMod.modDesc.scriptFiles),
		i3dFiles       : thisMod.fileDetail.i3dFiles.join('\n'),
		is_multiplayer : DATA.checkX(thisMod.modDesc.multiPlayer, false),
		mh_version     : ( thisMod.modHub.id !== null ) ?
			`<a href="https://www.farming-simulator.com/mod.php?mod_id=${thisMod.modHub.id}" target="_BLANK">${thisMod.modHub.version}</a>` :
			`<em>${await __(thisMod.modHub.id === null ? 'mh_norecord' : 'mh_unknown' )}</em>`,
		mod_author     : DATA.escapeSpecial(thisMod.modDesc.author),
		mod_location   : thisMod.fileDetail.fullPath,
		store_items    : DATA.checkX(thisMod.modDesc.storeItems),
		title          : (( thisMod.l10n.title !== null && thisMod.l10n.title !== '--' ) ? DATA.escapeSpecial(thisMod.l10n.title) : thisMod.fileDetail.shortName),
		version        : DATA.escapeSpecial(thisMod.modDesc.version),
	}
	for ( const [id, content] of Object.entries(idMap)) {
		MA.byIdHTML(id, content)
	}

	for ( const element of MA.query('#description a') ) { element.target = '_BLANK' }

	MA.byIdHTMLorHide(
		'icon_div',
		`<img class="img-fluid" src="${thisMod.modDesc.iconImageCache}" />`,
		thisMod.modDesc.iconImageCache
	)
}

async function subStep_issues(modRecord) {
	const problemPromises = []
	for ( const issue of modRecord.issues ) {

		const thisIssue = __(issue).then((issueI18N) => {
			if ( issue === 'FILE_ERROR_LIKELY_COPY' && modRecord.fileDetail.copyName !== false ) {
				return __('file_error_copy_name').then((copyI18N) => {
					return `${issueI18N} ${copyI18N} ${modRecord.fileDetail.copyName}${modRecord.fileDetail.isFolder?'':'.zip'}`
				})
			}
			return issueI18N
		})
		problemPromises.push(thisIssue)
	}
	return problemPromises
}

async function subStep_binds(bindingIssue) {
	const problemPromises = []
	if ( bindingIssue !== null ) {
		for ( const keyCombo in bindingIssue ) {
			const actualKey = clientGetKeyMap(keyCombo, locale)
			const confList  = bindingIssue[keyCombo].join(', ')
			problemPromises.push(
				__('bind_conflict').then((i18n) => `${i18n} : ${actualKey} :: ${confList}`)
			)
		}
	}
	return Promise.allSettled(problemPromises)
}

async function subStep_vehicle(thisFile, thisItem, thisIcon, brands) {
	const thisUUID = crypto.randomUUID()
	lookItemMap[thisFile] = crypto.randomUUID()
	lookItemData[thisUUID] = thisItem
	lookItemData[thisUUID].icon = ST.resolveIcon(thisIcon, thisItem.icon)
	lookItemData[thisUUID].uuid_name = thisFile

	const thisItemData = ST.getInfo(thisItem)
	const brandImgSRC  = ST.resolveBrand(brands?.[thisItem.brand]?.icon, thisItem.brand)
	const fillImages   = ST.markupFillTypes(thisItem.fillTypes)

	const thisItemDataHTML = ST.typeDataOrder.map((x) => ST.markupDataType(x, thisItemData[x]))
	// console.log(thisItemDataHTML)
	// for ( const testItem of dtLib.vehTestTypes ) {
	// 	if ( fsgUtil.getShowBool(thisItem[testItem[0]], testItem[1]) ) {
	// 		thisItemDataHTML.push(dtLib.doDataRow(testItem[2], __(testItem[3] === false ? thisItem[testItem[0]]: testItem[3])))
	// 	}
	// }

	thisItemDataHTML.push(
		ST.markupDataType(
			'fillLevel',
			thisItemData.fillLevel,
			fillImages.length !== 0 ? fillImages.join('') : null
		)//,
	)
	// 	dtLib.doDataType(
	// 		'workWidth',
	// 		thisItemData.workWidth,
	// 		dtLib.doSprayTypes(thisItem?.sprayTypes, thisItemData.workWidth)
	// 	),
	// 	dtLib.doDataRowTrue(
	// 		'cat-attach-has',
	// 		fsgUtil.getShowBool(thisItem?.joints?.canUse) ? __('basegame_attach_has') : null,
	// 		dtLib.doJoints(thisItem?.joints?.canUse, true, false)
	// 	),
	// 	dtLib.doDataRowTrue(
	// 		'cat-attach-need',
	// 		fsgUtil.getShowBool(thisItem?.joints?.needs) ? __('basegame_attach_need') : null,
	// 		dtLib.doJoints(thisItem?.joints?.needs, false, false)
	// 	)
	// )
	MA.byIdAppend('storeitems', DATA.templateEngine('vehicle_info_div', {
		// parentID : thisUUID,

		brandImage : `<img src="${brandImgSRC}" class="img-fluid store-brand-image">`,
		iconImage  : `<img src="${lookItemData[thisUUID].icon}" class="img-fluid store-icon-image">`,

		category  : I18N.defer(thisItem.category),
		functions : ST.markupFunctions(thisItem.functions),
		itemName  : I18N.defer(thisItem.name),
		itemTitle : thisItem.type,
		typeDesc  : I18N.defer(thisItem.typeDesc),

		itemData  : thisItemDataHTML.join(''),
	}, {
		'vehicle-info-parent' : thisUUID,
	}, {
		'.combo-list' : MA.showTest(thisItem?.specs?.combination),
	}))
	// storeItemsHTML.push(fsgUtil.useTemplate('vehicle_info_div', {
	// 	combinations : make_combos(thisItem?.specs?.combination, lookRecord, thisItemUUID),
	// }))

	// if ( thisItem.motorInfo !== null ) {
	// 	storeItemsJS.push(dtLib.doChart(thisItem, thisItemUUID, chartUnits))
	// }

	// console.log(thisItemData)
}


function showHideClicker(e) {
	const isShow      = e.target.classList.contains('section_show')
	const buttonGroup = e.target.parentElement
	const section     = e.target.parentElement.parentElement.querySelector('div')

	section.clsShow(isShow)
	buttonGroup.children[0].clsShow(!isShow)
	buttonGroup.children[1].clsShow(isShow)
}