/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */
// MARK: DETAIL UI
/* eslint complexity: ["error", 25] */
/* global DATA, MA, ST, NUM, I18N, ft_doReplace, clientGetKeyMapSimple, clientGetKeyMap, clientMakeCropCalendar, client_BGData */

let modName = ''
let lookItemData = {}
let lookItemMap  = {}
let comboItemMap = {}
let i18nUnits    = null
let locale       = 'en'

// MARK: PAGE LOAD
window.addEventListener('DOMContentLoaded', () => {
	lookItemData = {}
	lookItemMap  = {}
	comboItemMap = {}

	const urlParams = new URLSearchParams(window.location.search)
	const modColUUID = urlParams.get('mod')

	window.detail_IPC.getMod(modColUUID).then(async (thisMod) => {
		modName   = thisMod.fileDetail.shortName

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
			const storeInfo = await window.detail_IPC.getStore(modColUUID)

			const storePromises = [
				step_mapImage(storeInfo.mapImage),
			]

			MA.byIdHTML('storeitems', '')

			MA.byId('store_div').clsShow(Object.keys(storeInfo.items).length !== 0)

			for ( const [storeItemFile, thisItem] of Object.entries(storeInfo.items) ) {
				if ( thisItem.masterType === 'vehicle' ) {
					const thisUUID = crypto.randomUUID()
					const combos   = subStep_combos(thisItem?.specs?.combination, storeInfo, thisUUID)
					storePromises.push(subStep_vehicle(
						thisUUID,
						storeItemFile,
						thisItem,
						storeInfo.icons[storeItemFile],
						storeInfo.brands,
						combos
					))
				} else if ( thisItem.masterType === 'placeable' ) {
					storePromises.push(subStep_placeable(
						thisItem,
						storeInfo.icons[storeItemFile]
					))
				}
			}

			basicPromises.push(...storePromises)
		} finally {
			Promise.allSettled(basicPromises).then((results) => {
				for ( const thisResult of results ) {
					if ( thisResult.status === 'rejected' ) {
						window.log.log('Issue with page build', thisResult.reason.toString())
					}
				}
				ft_doReplace()
				MA.byId('loading-spinner').clsHide()
			})
		}
	}).catch((err) => {
		window.log.error('page build error',  err.message, `\n${err.stack}`)
	})

	for ( const element of MA.query('.inset-block-header-show-hide l10n') ) {
		element.addEventListener('click', showHideClicker)
	}
})

// MARK: mapImage
async function step_mapImage(mapImage) {
	if ( mapImage === null || typeof mapImage !== 'string') { return }
	MA.byId('map_image_div').clsShow()
	MA.byId('map_image').src = mapImage
}

// MARK: crops
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

// MARK: badges
async function step_badges(thisMod) {
	return window.detail_IPC.getMalware().then((malware) => {
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

// MARK: problems
async function step_problems(thisMod) {
	return window.detail_IPC.getBinds().then(async (bindConflicts) => {
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

// MARK: keyBinds
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

// MARK: table (top)
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
			`<em>${await I18N.buildElement(thisMod.modHub.id === null ? 'mh_norecord' : 'mh_unknown' )}</em>`,
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

// MARK: SUB issues
async function subStep_issues(modRecord) {
	const problemPromises = []
	for ( const issue of modRecord.issues ) {

		const thisIssue = I18N.buildElement(issue).then((issueI18N) => {
			if ( issue === 'FILE_ERROR_LIKELY_COPY' && modRecord.fileDetail.copyName !== false ) {
				return I18N.buildElement('file_error_copy_name').then((copyI18N) => {
					return `${issueI18N} ${copyI18N} ${modRecord.fileDetail.copyName}${modRecord.fileDetail.isFolder?'':'.zip'}`
				})
			}
			return issueI18N
		})
		problemPromises.push(thisIssue)
	}
	return problemPromises
}

// MARK: SUB binds
async function subStep_binds(bindingIssue) {
	const problemPromises = []
	if ( bindingIssue !== null ) {
		for ( const keyCombo in bindingIssue ) {
			const actualKey = clientGetKeyMap(keyCombo, locale)
			const confList  = bindingIssue[keyCombo].join(', ')
			problemPromises.push(
				I18N.buildElement('bind_conflict').then((i18n) => `${i18n} : ${actualKey} :: ${confList}`)
			)
		}
	}
	return problemPromises
}

// MARK: SUB combos
function subStep_combos (combos, lookRecord, parentItem) {
	if ( typeof combos === 'undefined' || combos === null || combos.length === 0 ) { return null }

	const comboKeyList = new Set()
	const comboNodes   = []

	for ( const thisCombo of combos ) {
		if ( thisCombo === null ) { continue }

		const thisComboIsBase = thisCombo.startsWith('$data')
		const thisComboKey    = thisComboIsBase ? thisCombo.replaceAll('$data/', '').replaceAll('/', '_').replaceAll('.xml', '') : thisCombo

		if ( thisComboKey !== null ) {
			const thisItem = thisComboIsBase ? client_BGData.records[thisComboKey] : lookRecord.items[thisComboKey]

			if ( typeof thisItem === 'undefined' ) { continue }

			const thisIcon = ST.resolveIcon(
				thisItem.icon,
				lookRecord?.icons?.[thisComboKey]
			)

			comboKeyList.add({
				contents : thisComboIsBase ? null : thisItem,
				internal : thisComboIsBase,
				key      : thisComboKey,
				source   : thisComboIsBase ? null : modName,
			})

			const thisItemData = ST.getInfo(thisItem)
			const brandImgSRC  = ST.resolveBrand(lookRecord.brands?.[thisItem.brand]?.icon, thisItem.brand)

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
	comboItemMap[parentItem] = [...comboKeyList]
	return comboNodes
}

// MARK: SUB vehicles
async function subStep_vehicle(thisUUID, thisFile, thisItem, thisIcon, brands, combos) {
	lookItemMap[thisFile] = thisUUID
	lookItemData[thisUUID] = thisItem
	lookItemData[thisUUID].icon = ST.resolveIcon(thisIcon, thisItem.icon)
	lookItemData[thisUUID].brandIcon = ST.resolveBrand(brands?.[thisItem.brand]?.icon, thisItem.brand)
	lookItemData[thisUUID].uuid_name = thisFile

	const thisItemData = ST.getInfo(thisItem)
	const fillImages   = ST.markupFillTypes(thisItem.fillTypes)
	const sprayTypes   = ST.markupSprayTypes(thisItem?.sprayTypes, thisItemData.workWidth)
	const chartHTML    = MA.showTestValueBool(thisItem.motorInfo) ? ST.markupChart(thisUUID) : ''

	const thisItemDataHTML = ST.typeDataOrder.map((x) => ST.markupDataType(x, thisItemData[x]))
	
	for ( const testItem of ST.vehTestTypes ) {
		if ( MA.showTestValueBool(thisItem[testItem[0]], testItem[1]) ) {
			thisItemDataHTML.push(ST.markupDataRow(
				testItem[2],
				testItem[3] === false ?
					thisItem[testItem[0]] :
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
		brandImage : `<img src="${lookItemData[thisUUID].brandIcon}" class="img-fluid store-brand-image">`,
		iconImage  : `<img src="${lookItemData[thisUUID].icon}" class="img-fluid store-icon-image">`,

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
	DATA.eventEngine(infoDivNode, '.action-item-compare', singleAdd)
	DATA.eventEngine(infoDivNode, '.attach_has, .attach_need', attachClicker)

	MA.byIdAppend('storeitems', infoDivNode)

	if ( MA.showTestValueBool(thisItem.motorInfo) ) {
		ST.markupChartScripts(thisItem, thisUUID, i18nUnits)()
	}
}

// MARK: sub PLACEABLE
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

	MA.byIdAppend('storeitems', infoDivNode)
}

// MARK: CLICKERS
function showHideClicker(e) {
	const isShow      = e.target.classList.contains('section_show')
	const buttonGroup = e.target.parentElement
	const section     = e.target.parentElement.parentElement.querySelector('div')

	section.clsShow(isShow)
	buttonGroup.children[0].clsShow(!isShow)
	buttonGroup.children[1].clsShow(isShow)
}


function itemGetInfo(target) {
	const thisItemDIV = target.closest('.vehicleInfoBlock')
	return thisItemDIV.id
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

function singleAdd(e) {
	const itemID = itemGetInfo(e.target)
	const compareObj = {
		contents : lookItemData[itemID],
		internal : false,
		key      : lookItemData[itemID].uuid_name,
		source   : modName,
	}
	window.detail_IPC.sendCompare([compareObj])
}

function comboAddAll(e) {
	const compareObjArray = comboItemMap[itemGetInfo(e.target)]
	window.detail_IPC.sendCompare(compareObjArray)
}

function comboAddSingle(e) {
	const { source, page } = comboGetInfo(e.target)
	const compareObj = {
		contents : null,
		internal : source !== 'internal',
		key      : page,
		source   : source === 'internal' ? modName : null,
	}
	if ( source === 'internal' ) {
		compareObj.contents = lookItemData[lookItemMap[page]]
	}
	window.detail_IPC.sendCompare([compareObj])
}

function comboItemClicker(e) {
	const { source, type, page } = comboGetInfo(e.target)
	if ( source === 'internal' ) {
		location.hash = lookItemMap[page]
	} else {
		window.detail_IPC.sendBase({ type : type, page : page })
	}
}

function attachClicker(e) {
	const realTarget = e.target.closest('.badge')
	if ( realTarget.classList.contains('custom') ) { return }
	const openObject = {
		type  : realTarget.classList.contains('attach_need') ? 'attach_need' : 'attach_has',
		page : realTarget.safeAttribute('data-jointpage'),
	}
	window.detail_IPC.sendBase(openObject)
}