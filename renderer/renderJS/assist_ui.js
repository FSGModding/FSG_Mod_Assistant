/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main Window UI

/* global processL10N, fsgUtil, bootstrap, select_lib, __ */

window.mods.receive('fromMain_selectInvertOpen', () => {
	const lastOpenAcc = fsgUtil.queryF('.accordion-collapse.show')
	const lastOpenID  = (lastOpenAcc !== null) ? lastOpenAcc.id : null

	if ( lastOpenID !== null ) { select_lib.click_invert(lastOpenID) }
})

window.mods.receive('fromMain_selectNoneOpen', () => {
	const lastOpenAcc = fsgUtil.queryF('.accordion-collapse.show')
	const lastOpenID  = (lastOpenAcc !== null) ? lastOpenAcc.id : null

	if ( lastOpenID !== null ) { select_lib.click_none(lastOpenID) }
})

window.mods.receive('fromMain_selectAllOpen', () => {
	const lastOpenAcc = fsgUtil.queryF('.accordion-collapse.show')
	const lastOpenID  = (lastOpenAcc !== null) ? lastOpenAcc.id : null

	if ( lastOpenID !== null ) { select_lib.click_all(lastOpenID) }
})

window.mods.receive('fromMain_selectOnly', (selectList) => {
	const tableID   = `${selectList[0].split('--')[0]}_mods`
	const checkList = selectList.map((id) => `${id}__checkbox`)

	select_lib.close_all(tableID)
	select_lib.click_only(tableID, checkList)
})

window.mods.receive('fromMain_selectOnlyFilter', (selectMod, filterText) => {
	const tableID = `${selectMod.split('--')[0]}_mods`
	const checkList = [`${selectMod}__checkbox`]
	
	select_lib.close_all(tableID)
	select_lib.click_only(tableID, checkList)
	select_lib.filter_begin(tableID, filterText)
})

window.mods.receive('fromMain_dirtyUpdate', (dirtyFlag) => {
	fsgUtil.clsHideFalse('dirty_folders', dirtyFlag)
})
window.mods.receive('fromMain_debugLogDangerFlag', (status) => {
	fsgUtil.clsShowTrue('debug_danger_bubble', status)
})

window.mods.receive('fromMain_modInfoPop', (thisMod, thisSite) => {
	fsgUtil.setById('mod_info_mod_name', thisMod.fileDetail.shortName)
	fsgUtil.setById('mod_info_input', thisSite)
	modInfoDialog.show()
})

let gameRunAlert    = 'Game is currently running, updates to the active collection require a game restart'
let searchStringMap = {}
let searchTagMap    = {}
let lastList        = null
let fullList        = {}

const searchTagMap_empty = () => {
	// Add tag here to also add to the filter drop downs. (auto-magic)
	searchTagMap    = {
		broken      : [],
		depend      : [],
		depend_flag : [],
		folder      : [],
		keys_bad    : [],
		keys_ok     : [],
		log         : [],
		map         : [],
		new         : [],
		nomp        : [],
		nonmh       : [],
		notmod      : [],
		pconly      : [],
		problem     : [],
		recent      : [],
		require     : [],
		savegame    : [],
		update      : [],
	}
}
const searchStringMap_empty = () => {
	searchStringMap = {}
}

const buildSearchString = (thisMod) => {
	return [
		thisMod.fileDetail.shortName,
		thisMod.l10n.title,
		thisMod.modDesc.author
	].join(' ').toLowerCase()
}

const buildBadges = (thisMod) => {
	const displayBadges = []
	
	if ( !Array.isArray(thisMod.displayBadges ) ) { return '' }

	for ( const badge of thisMod.displayBadges ) {
		displayBadges.push(fsgUtil.badge_main(badge))
		const badge_lower = badge[0].toLowerCase()
		if ( typeof searchTagMap?.[badge_lower]?.push === 'function' ) {
			searchTagMap[badge_lower].push(thisMod.colUUID)
		}
	}
	return displayBadges.join('')
}

const checkVersion = (verFlag, verList, isFrozen, thisMod) => {
	if ( !verFlag && !isFrozen && !thisMod.fileDetail.isFolder ) {
		return (
			Object.hasOwn(verList, thisMod.fileDetail.shortName) &&
			verList[thisMod.fileDetail.shortName] !== thisMod.modDesc.version
		) ? 1 : 2
	}
	return 0
}

let gameIsRunningFlag = false

window.mods.receive('fromMain_gameUpdate', (status) => {
	toggleGameStatus(status.gameRunning, status.gameRunningEnabled)
	fsgUtil.clsShowTrue('update-is-ready-button', status.updateReady)
	updateBotStatus(status.botStatus)
})

let collectOrder    = {}
let lastPreferences = null
let lastDevSettings = null

window.mods.receive('fromMain_allSettings', (allSettings, devControls) => {
	lastPreferences = allSettings
	lastDevSettings = devControls
	updatePreferences()
})

window.mods.receive('fromMain_modList', (modCollect) => {
	const multiVersion = modCollect.appSettings.multi_version
	const curVersion   = modCollect.appSettings.game_version
	lastPreferences    = modCollect.appSettings
	lastDevSettings    = modCollect.opts.devControls
	gameRunAlert       = modCollect.opts.l10n.runMessage
	collectOrder  = { map : {}, numeric : {}, max : 0 }

	searchStringMap_empty()
	searchTagMap_empty()

	document.body.setAttribute('data-version', curVersion)

	fsgUtil.clsOrGate('folderEditButton', modCollect.opts.foldersEdit, 'btn-primary', 'btn-outline-primary')
	fsgUtil.clsOrGate('mini_button', modCollect.opts.showMini, 'btn-outline-light', null)
	fsgUtil.clsShowTrue('update-is-ready-button', modCollect.updateReady)
	fsgUtil.clsShowTrue('dirty_folders', modCollect.opts.foldersDirty)
	fsgUtil.clsShowTrue('multi_version_button', multiVersion)

	fsgUtil.setById('farm_sim_versions', [22, 19, 17, 15, 13].map((version) =>  makeVersionRow(version, modCollect.appSettings, modCollect)))

	const lastOpenAcc = fsgUtil.queryF('.accordion-collapse.show')
	const lastOpenID  = lastOpenAcc?.id ?? null
	const lastOpenQ   = (lastOpenAcc !== null) ? fsgUtil.valueById('filter_input') : ''
	const scrollStart = window.scrollY

	const modTable     = []
	const scrollTable  = []
	const verList      = {}
	let   verFlag      = false

	/* List selection */
	fsgUtil.setById('collectionSelect', buildCollectSelect(modCollect))
	/* END : List selection */

	for ( const [folderIndex, collectKey] of Object.entries([...modCollect.set_Collections]) ) {
		if ( multiVersion && modCollect.collectionNotes[collectKey].notes_version !== curVersion ) { continue }
		const thisCollection = modCollect.modList[collectKey]
		const collectNotes   = modCollect.collectionNotes[collectKey]
		const collectFreeze  = collectNotes.notes_frozen
		const modRows        = []
		const scrollRows     = []
		const sizeOfFolder   = thisCollection.folderSize
		const mapIcons       = []
		const mapNames       = []

		collectOrder.map[collectKey]      = parseInt(folderIndex)
		collectOrder.numeric[folderIndex] = collectKey
		collectOrder.max                  = Math.max(collectOrder.max, parseInt(folderIndex))

		if ( !modCollect.opts.foldersEdit ) {
			for ( const modKey of thisCollection.alphaSort ) {
				try {
					const thisMod       = thisCollection.mods[modKey.split('::')[1]]

					switch ( checkVersion(verFlag, verList, collectFreeze, thisMod) ) {
						case 1: // toggle flag true
							verFlag = true; break
						case 2: // add to list
							verList[thisMod.fileDetail.shortName] = thisMod.modDesc.version
							break
						default:
							break
					}

					searchStringMap[thisMod.colUUID] = buildSearchString(thisMod)

					scrollRows.push(fsgUtil.buildScrollMod(collectKey, thisMod.colUUID))
					
					const thisModEntry = makeModRow(
						thisMod.colUUID,
						thisMod,
						buildBadges(thisMod),
						thisMod.modHub.id,
						modCollect.appSettings.game_version,
						Object.hasOwn(modCollect.opts.modSites, thisMod.fileDetail.shortName)
					)
					
					modRows.push(thisModEntry[0])

					if ( thisModEntry[1] !== null ) {
						mapIcons.push(thisModEntry[1])
						mapNames.push(thisModEntry.slice(2))
					}
				} catch (err) {
					window.log.notice(`Error building mod row: ${modKey} :: ${err}`, 'main')
				}
			}
		}
		
		const isOnline = modCollect.collectionToStatus[collectKey]
		const fullName = `${thisCollection.name} <small>[${isOnline ? fsgUtil.bytesToHR(sizeOfFolder) : __('removable_offline') }]</small>`
		
		modTable.push(makeModCollection({
			adminPass     : collectNotes.notes_admin,
			dateAdd       : collectNotes.notes_add_date,
			dateUsed      : collectNotes.notes_last,
			dlEnabled     : collectNotes.notes_websiteDL,
			favorite      : collectNotes.notes_favorite,
			folderColor   : parseInt(collectNotes.notes_color),
			foldersEdit   : modCollect.opts.foldersEdit,
			gameAdminPass : collectNotes.notes_game_admin,
			id            : collectKey,
			isActive      : modCollect.opts.activeCollection === collectKey,
			isHolding     : collectNotes.notes_holding,
			isOnline      : isOnline,
			mapNames      : mapNames[0],
			modCount      : modRows.length,
			modsRows      : modRows,
			name          : fullName,
			removable     : collectNotes.notes_removable,
			singleMapIcon : fsgUtil.firstOrNull(mapIcons),
			tagLine       : [collectNotes.notes_tagline, (mapIcons.length === 1 ? mapNames[0][0] : null)].filter((x) => x !== null).join(' - '),
			website       : collectNotes.notes_website,
		}))
		scrollTable.push(fsgUtil.buildScrollCollect(collectKey, scrollRows))
	}
	
	fsgUtil.setById('mod-collections', modTable)
	fsgUtil.setById('scroll-bar-fake', scrollTable)

	fsgUtil.clsOrGate('verButton', verFlag, 'btn-danger', 'btn-success')

	toggleGameStatus(modCollect.opts.gameRunning)
	updateBotStatus(modCollect.bot)
	buildDropDownFilters(modCollect.badgeL10n)
	setOrderButtons(Object.keys(collectOrder.map), modCollect.opts.foldersEdit)

	select_lib.clear_range()

	try {
		select_lib.open_table(lastOpenID)

		if ( lastOpenQ !== '' ) {
			select_lib.filter_begin(lastOpenID, lastOpenQ)
		}
		window.scrollTo(0, scrollStart)
	} catch { /* Don't Care */ }

	select_lib.filter_begin()
	processL10N()
})

function setOrderButtons(keys, doSomething) {
	if ( !doSomething ) { return }
	for ( const key of keys ) {
		fsgUtil.clsDisableTrue(`${key}_order_up_last`, getOrderPrev(key) === null)
		fsgUtil.clsDisableTrue(`${key}_order_up`, getOrderPrev(key) === null)
		fsgUtil.clsDisableTrue(`${key}_order_down`, getOrderNext(key) === null)
		fsgUtil.clsDisableTrue(`${key}_order_down_last`, getOrderNext(key) === null)
	}
}

function clientMoveItem(collectKey, moveUpInList, forceLast = false) {
	const curIndex = collectOrder.map[collectKey]
	const newIndex = forceLast ?
		moveUpInList ? 0 : collectOrder.max :
		moveUpInList ? getOrderPrev(collectKey) : getOrderNext(collectKey)

	if ( curIndex !== null && newIndex !== null ) {
		window.mods.reorderFolder(curIndex, newIndex)
	}
}

function getOrderPrev(key) {
	const thisIndex = collectOrder.map[key]
	
	if ( typeof thisIndex === 'undefined' ) { return null }

	for ( let i = thisIndex - 1; i >= 0; i-- ) {
		if ( typeof collectOrder.numeric[i] !== 'undefined' ) { return i }
	}
	return null
}

function getOrderNext(key) {
	const thisIndex = collectOrder.map[key]

	if ( typeof thisIndex === 'undefined' ) { return null }

	for ( let i = thisIndex + 1; i <= collectOrder.max; i++ ) {
		if ( typeof collectOrder.numeric[i] !== 'undefined' ) { return i }
	}
	return null
}

function clientRemoveFolder(collectKey) {
	window.mods.removeFolder(collectKey)
}

function toggleGameStatus(status = false, show = true) {
	gameIsRunningFlag = status.gameRunning
	fsgUtil.clsHideFalse('gameRunningBubble', show)
	fsgUtil.clsOrGate('gameRunningBubble', status, 'text-success', 'text-danger')
}

function clientMakeListInactive() {
	fsgUtil.valueById('collectionSelect', 0)
	window.mods.makeInactive()
}

function clientMakeListActive() {
	const activePick = fsgUtil.valueById('collectionSelect').replace('collection--', '')

	if ( activePick !== '0' && activePick !== '999' ) {
		blinkLED()
		window.mods.makeActive(activePick)
		if ( gameIsRunningFlag ) { alert(gameRunAlert) }
	}
}

const buildDropDownFilters = ( l10n ) => {
	// Dynamically build filter lists based on what is in the collections
	const tagOrder = Object.keys(l10n)
		.sort((a, b) => new Intl.Collator().compare(l10n[a], l10n[b]))
		.filter((x) => Object.hasOwn(searchTagMap, x) && searchTagMap[x].length !== 0)

	const hideTags  = tagOrder.map((x) => makeFilterButton(x, true))
	const limitTags = tagOrder.map((x) => makeFilterButton(x, false))

	hideTags.unshift(makeFilterReset(true))
	limitTags.unshift(makeFilterReset(false))

	fsgUtil.setById('filter_out__tags', hideTags)
	fsgUtil.setById('filter__tags', limitTags)
}

const makeFilterReset  = (isHide = false) => {
	const funcName = isHide ? 'out_tag_reset' : 'tag_reset'
	return `<button class="btn btn-outline-warning text-center" onclick="select_lib.${funcName}()"><l10n name="filter_tag_reset"></l10n></button>`

}

const makeFilterButton = ( name, isHide = false ) => {
	const id     = `${isHide ? 'tag_filter_out__' : 'tag_filter__'}${name}`
	const cls    = isHide ? 'filter_out_tag_buttons' : 'filter_tag_buttons'
	const l10n   = `mod_badge_${name}`
	const qty    = searchTagMap?.[name]?.length ?? null
	const color  = name === 'keys_bad' || name === 'depend' ? 'danger' : 'success'

	return `
		<input type="checkbox" id="${id}" onchange="select_lib.filter_begin()" class="btn-check ${cls}" autocomplete="off">
		<label class="btn btn-outline-${color}" for="${id}"><l10n name="${l10n}"></l10n>${qty !== null ? ` [${qty}]` : ''}</label>
	`
}


const botStatusLine = (id, response, isGood,  l10n) => {
	const thisStatus = !isGood ? 'broken' : response.online ? 'online' : 'offline'
	const thisTitle  = !isGood ?
		`${id} ${l10n.unknown}` :
		response.online ?
			`${response.name} :: ${response.playersOnline} / ${response.slotCount} ${l10n.online}` :
			`${response.name} ${l10n.offline}`
	const thisText = isGood && response.online ? response.playersOnline : ''

	return [
		`<a title="${thisTitle}" target="_blank" href="https://www.farmsimgame.com/Server/${id}">`,
		`<span class="bot-status bot-${thisStatus}">${thisText}</span>`,
		'</a>'
	].join('')
}

const updateBotStatus = (botObject) => {
	if ( Object.keys(botObject.response).length === 0 ) { return }

	for ( const [collectKey, IDs] of Object.entries(botObject.requestMap) ) {
		const thisBotDiv = fsgUtil.byId(`${collectKey}__bot`)
		if ( thisBotDiv === null ) { continue }
		if ( IDs.length === 0 ) {
			thisBotDiv.innerHTML = ''
			thisBotDiv.classList.add('d-none')
			continue
		}

		const thisCollectHTML = []

		for ( const thisID of IDs ) {
			thisCollectHTML.push(botStatusLine(
				thisID,
				botObject.response[thisID],
				botObject.response[thisID].status === 'Good',
				botObject.l10nMap
			))
		}
		thisBotDiv.classList.remove('d-none')
		thisBotDiv.innerHTML = thisCollectHTML.join('')
	}
}

const makeModCollection = (data) => fsgUtil.useTemplate('collect_row', {
	bootstrap_data              : `data-bs-toggle="collapse" data-bs-target="#${data.id}_mods"`,
	class_hideDownload          : data.dlEnabled ? '' : 'd-none',
	class_hideFolderEdit        : data.foldersEdit ? '' : 'd-none',
	class_hideGameAdminPassword : data.gameAdminPass !== null ? '' : 'd-none',
	class_hidePassword          : data.adminPass !== null ? '' : 'd-none',
	class_hideRemovable         : data.removable ? '' : 'd-none',
	class_hideWebsite           : data.website !== null ? '' : 'd-none',
	class_isHolding             : data.isHolding ? 'is-holding-pen' : '',
	class_mapIcon               : data.singleMapIcon === null ? 'd-none' : '',
	class_showFolderEdit        : !data.foldersEdit ? '' : 'd-none',
	class_status                : !data.isOnline ? 'text-decoration-line-through' : '',
	dateAdd                     : getPrintDate(data.dateAdd),
	dateUsed                    : getPrintDate(data.dateUsed),
	folderSVG                   : fsgUtil.getIconSVG('folder', data.favorite, data.isActive, data.isHolding, data.folderColor),
	game_admin_password         : data.gameAdminPass,
	id                          : data.id,
	mapClick                    : data.mapNames?.[2],
	mapIcon                     : fsgUtil.iconMaker(data.singleMapIcon),
	mapTitle                    : data.mapNames?.[1],
	mod_rows                    : `<table class="w-100 py-0 my-0 table table-sm table-hover table-striped">${data.modsRows.join('')}</table>`,
	name                        : data.name,
	password                    : data.adminPass,
	tagLine                     : data.tagLine !== '' ? `${!data.foldersEdit ? '<br>' : ''}<span class="ps-3 small fst-italic">${data.tagLine}</span>` : '',
	totalCount                  : data.modCount > 999 ? '999+' : data.modCount,
	website                     : data.website,
})

function getPrintDate(textDate) {
	const year2000 = 949381200000
	const date = typeof textDate === 'string' ? new Date(Date.parse(textDate)) : textDate

	if ( date < year2000 ) { return '<l10n name="mh_unknown"></l10n>'}

	return `<span class="text-body-emphasis">${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${(date.getDate()).toString().padStart(2, '0')}</span>`
}

const makeModRow = (id, thisMod, badges, modId, currentGameVersion, hasExtSite) => {
	return [
		fsgUtil.useTemplate('mod_row', {
			author            : fsgUtil.escapeSpecial(thisMod.modDesc.author),
			badges            : badges,
			class_hasHash     : modId!==null ? ' has-hash' : '',
			class_hasSite     : hasExtSite ? ' has-ext-site' : '',
			class_isAFolder   : !thisMod.badgeArray.includes('folder') ? 'd-none' : '',
			class_modColor    : thisMod.canNotUse === true ? '  bg-danger' : ( currentGameVersion !== thisMod.gameVersion ? ' bg-warning' : '' ),
			class_modDisabled : ( thisMod.canNotUse===true || currentGameVersion !== thisMod.gameVersion ) ? ' mod-disabled bg-secondary-subtle bg-opacity-25':'',
			click_modEnabled  : ! ( thisMod.badgeArray.includes('savegame') || thisMod.badgeArray.includes('notmod') ),
			fileSize          : ( thisMod.fileDetail.fileSize > 0 ) ? fsgUtil.bytesToHR(thisMod.fileDetail.fileSize) : '',
			icon              : fsgUtil.iconMaker(thisMod.modDesc.iconImageCache),
			id                : id,
			shortname         : thisMod.fileDetail.shortName,
			title             : fsgUtil.escapeSpecial(thisMod.l10n.title),
			version           : fsgUtil.escapeSpecial(thisMod.modDesc.version),
		}),
		thisMod.modDesc.mapConfigFile ? thisMod.modDesc.iconImageCache : null,
		thisMod.fileDetail.shortName,
		fsgUtil.escapeSpecial(thisMod.l10n.title),
		id,
	]
}

function makeVersionRow(version, options, modCollect) {
	const thisVersionEnabled = version === 22 ? true : options[`game_enabled_${version}`]
	const counts = { collect : 0, mods : 0 }

	if ( !thisVersionEnabled && version !== options.game_version ) { return '' }

	for ( const collectKey of modCollect.set_Collections ) {
		if ( modCollect.collectionNotes[collectKey].notes_version === version ) {
			counts.collect++
			counts.mods += modCollect.modList[collectKey].alphaSort.length
		}
	}
	return fsgUtil.useTemplate('version_row', {
		backgroundClass : version === options.game_version ? 'bg-success' : 'bg-primary',
		collections     : counts.collect,
		mods            : counts.mods,
		version         : version,
	})
}

function buildCollectSelect(modCollect) {
	const optList          = []
	const activeCollection = modCollect.opts.activeCollection
	const multiVersion     = modCollect.appSettings.multi_version
	const curVersion       = modCollect.appSettings.game_version

	lastList = ( activeCollection !== '999' && activeCollection !== '0') ? `collection--${modCollect.opts.activeCollection}` : modCollect.opts.activeCollection
	fullList = {
		0   : `--${modCollect.opts.l10n.disable}--`,
		999 : `--${modCollect.opts.l10n.unknown}--`,
	}
	
	optList.push(fsgUtil.buildSelectOpt(
		'0',
		`--${modCollect.opts.l10n.disable}--`,
		lastList,
		true
	))

	for ( const collectKey of modCollect.set_Collections ) {
		const thisVersion = modCollect.collectionNotes[collectKey].notes_version
		const fullKey     = `collection--${collectKey}`

		fullList[fullKey] = modCollect.modList[collectKey].fullName

		if ( !multiVersion || thisVersion === curVersion ) {
			optList.push(fsgUtil.buildSelectOpt(
				fullKey,
				modCollect.modList[collectKey].fullName,
				lastList,
				false,
				modCollect.collectionToFolder[collectKey]
			))
		}
		if ( multiVersion && fullKey === lastList && thisVersion !== curVersion ) {
			lastList = '999'
		}
	}

	optList.push(fsgUtil.buildSelectOpt(
		'999',
		`--${modCollect.opts.l10n.unknown}--`,
		lastList,
		true
	))

	return optList.join('')
}

function clientOpenMod(enabled, modID) {
	if ( enabled === 'true' ) {
		window.mods.openMod(modID)
	}
}

function clientSetModInfo() {
	const modName = fsgUtil.htmlById('mod_info_mod_name')
	const newSite = fsgUtil.valueById('mod_info_input')
	window.mods.setModInfo(modName, newSite)
	modInfoDialog.hide()
}
function clientSetGameVersion(version) { window.mods.changeVersion(parseInt(version, 10)) }

function clientClearInput() { select_lib.filter_begin(null, '') }

function clientModContext(id) {
	const allModRows     = fsgUtil.queryA('.mod-row .mod-row-checkbox:checked')
	const selectedMods   = allModRows.map((thisRow) => thisRow.id.replace('__checkbox', ''))
	const isHoldingPen   = selectedMods.length === 0 ? false : fsgUtil.byId(`${selectedMods[0].split('--')[0]}_mods`).classList.contains('is-holding-pen')
	window.mods.modCText(id, selectedMods, isHoldingPen)
}

function clientBatchOperation(mode) {
	const allModRows     = fsgUtil.queryA('.mod-row .mod-row-checkbox:checked')
	const selectedMods   = allModRows.map((thisRow) => thisRow.id.replace('__checkbox', ''))
	const alternateMod   = select_lib.last_alt_select !== null ? [select_lib.last_alt_select] : selectedMods

	if ( selectedMods.length === 0 ) { return }

	const isHoldingPen   = fsgUtil.clsIdHas(`${selectedMods[0].split('--')[0]}_mods`, 'is-holding-pen')

	switch ( mode ) {
		case 'copy' :
		case 'move' :
			window.mods[`${mode}${isHoldingPen ? 'Multi' : 'Mods'}`](selectedMods)
			break
		case 'delete' :
		case 'zip' :
			window.mods[`${mode}Mods`](selectedMods)
			break
		case 'openMods' :
		case 'openHub' :
		case 'openExt' :
			if ( alternateMod.length === 1 ) {
				window.mods[mode](alternateMod)
			}
			break
		default :
			break
	}
}

function clientOpenFarmSim() {
	const currentList = fsgUtil.valueById('collectionSelect')
	if ( currentList === lastList ) {
		// Selected is active, no confirm
		spinLED()
		window.mods.startFarmSim()
	} else {
		// Different, ask confirmation
		fsgUtil.setById('no_match_game_list', fullList[lastList])
		fsgUtil.setById('no_match_ma_list', fullList[currentList])
		fastBlinkLED()
		mismatchDialog.show()
	}
}

function clientOpenGame_IGNORE() {
	mismatchDialog.hide()
	spinLED()
	fsgUtil.valueById('collectionSelect', lastList)
	window.mods.startFarmSim()
}

function clientOpenGame_FIX() {
	mismatchDialog.hide()
	clientMakeListActive()
}

window.addEventListener('hidden.bs.collapse', () => { select_lib.click_none() })
window.addEventListener('shown.bs.collapse',  () => { select_lib.click_none() })

function updatePreferences() {
	fsgUtil.byId('uPref_dev_mode').checked = lastDevSettings[22]
	fsgUtil.byId('uPref_dev_mode_19').checked = lastDevSettings[19]
	fsgUtil.byId('uPref_dev_mode_17').checked = lastDevSettings[17]
	fsgUtil.byId('uPref_dev_mode_15').checked = lastDevSettings[15]
	fsgUtil.byId('uPref_dev_mode_13').checked = lastDevSettings[13]

	for ( const name in lastPreferences ) {
		const formControl = fsgUtil.byId(`uPref_${name}`)
		if ( formControl !== null ) {
			if ( formControl.getAttribute('type') === 'checkbox' ) {
				formControl.checked = lastPreferences[name]
			} else if ( name === 'font_size' ) {
				formControl.value = (lastPreferences[name] / 14) * 100
			} else {
				formControl.value = lastPreferences[name]
			}
		}
	}

	fsgUtil.setById('font_size_value', `${Math.floor((lastPreferences.font_size / 14) * 100)}%`)

	fsgUtil.classPerTest('.multi-version-pref', lastPreferences.multi_version)

	fsgUtil.classPerTest('.game_enabled_19', lastPreferences.game_enabled_19)
	fsgUtil.classPerTest('.game_enabled_17', lastPreferences.game_enabled_17)
	fsgUtil.classPerTest('.game_enabled_15', lastPreferences.game_enabled_15)
	fsgUtil.classPerTest('.game_enabled_13', lastPreferences.game_enabled_13)

	fsgUtil.classPerTest('.game_disabled_19', !lastPreferences.game_enabled_19)
	fsgUtil.classPerTest('.game_disabled_17', !lastPreferences.game_enabled_17)
	fsgUtil.classPerTest('.game_disabled_15', !lastPreferences.game_enabled_15)
	fsgUtil.classPerTest('.game_disabled_13', !lastPreferences.game_enabled_13)

	processL10N()
}

function clientDragFontSize() {
	fsgUtil.setById('font_size_value', `${fsgUtil.valueById('uPref_font_size')}%`)
}

function clientSetPref(id) {
	const formControl = fsgUtil.byId(`uPref_${id}`)

	if ( formControl.getAttribute('type') === 'checkbox' ) {
		window.mods.setPref(id, formControl.checked)
	} else if ( id === 'font_size' ) {
		window.mods.setPref(id, (formControl.value / 100) * 14)
	} else {
		window.mods.setPref(id, formControl.value)
	}
}


function clientChangeTheme()    { window.l10n.themeList_change(fsgUtil.valueById('theme_select')) }
function clientChangeL10N()     { window.l10n.langList_change(fsgUtil.valueById('language_select')) }


const giantsLED = {	filters : [{ vendorId : fsgUtil.led.vendor, productId : fsgUtil.led.product }] }

async function spinLED()      { operateLED('spin') }
async function blinkLED()     { operateLED('blink') }
async function fastBlinkLED() { operateLED('blink', 1000) }
async function operateLED(type = 'spin', time = 2500) {
	if ( ! window.mods.isLEDActive() ) { return }
	
	try {
		const clientLED = await navigator.hid.requestDevice(giantsLED)

		if ( clientLED.length === 0 ) { return }

		const clientLEDDevice = clientLED[0]

		await clientLEDDevice.open()
		await clientLEDDevice.sendReport(0x00, fsgUtil.led[type])
		setTimeout(async () => {
			await clientLEDDevice.sendReport(0x00, fsgUtil.led.off)
			await clientLEDDevice.close()
		}, time)
	} catch (err) {
		window.log.debug(`Unable to spin LED (no light?) : ${err}`, 'main')
	}
}

let mismatchDialog      = null
let modInfoDialog       = null
let dragDropOperation   = false
let dragDropInFolder    = false

let loadOverlay = null
let startTime   = Date.now()
let lastTotal   = 1

window.loader.receive('formMain_loading_show', () => {
	if ( loadOverlay !== null ) { loadOverlay.show() }
})

window.loader.receive('formMain_loading_hide', () => {
	if ( loadOverlay !== null ) { loadOverlay.hide() }
})

window.loader.receive('formMain_loadingTitles', (mainTitle, subTitle, dlCancel) => {
	fsgUtil.setById('loadOverlay_statusMessage', mainTitle)
	fsgUtil.setById('loadOverlay_statusDetail', subTitle)
	fsgUtil.setById('loadOverlay_statusTotal', '0')
	fsgUtil.setById('loadOverlay_statusCurrent', '0')
	fsgUtil.setById('loadOverlay_downloadCancelButton', dlCancel)

	fsgUtil.clsShow('loadOverlay_statusCount')
	fsgUtil.clsShow('loadOverlay_statusProgBar')

	fsgUtil.clsHide('loadOverlay_downloadCancel')
	fsgUtil.clsHide('loadOverlay_speed')
	
	if ( loadOverlay !== null ) { loadOverlay.show() }
})

window.loader.receive('fromMain_loadingDownload', () => {
	fsgUtil.clsShow('loadOverlay_downloadCancel')
	fsgUtil.clsShow('loadOverlay_speed')
})

window.loader.receive('fromMain_loadingNoCount', () => {
	fsgUtil.clsHide('loadOverlay_statusCount')
	fsgUtil.clsHide('loadOverlay_statusProgBar')
})

window.loader.receive('fromMain_loading_total', (count, inMB = false) => {
	if ( inMB ) { startTime = Date.now() }
	const thisCount   = inMB ? fsgUtil.bytesToMB(count) : count
	const thisElement = fsgUtil.byId('loadOverlay_statusTotal')
	lastTotal = ( count < 1 ) ? 1 : count

	if ( thisElement !== null ) { thisElement.innerHTML = thisCount }
})

window.loader.receive('fromMain_loading_current', (count, inMB = false) => {
	const thisCount   = inMB ? fsgUtil.bytesToMB(count, false) : count
	const thisElement = fsgUtil.byId('loadOverlay_statusCurrent')
	const thisProg    = fsgUtil.byId('loadOverlay_statusProgBarInner')
	const thisPercent = `${Math.ceil((count / lastTotal) * 100)}%` || '0%'

	if ( thisProg !== null ) { thisProg.style.width = thisPercent }

	if ( thisElement !== null ) { thisElement.innerHTML = thisCount }

	if ( inMB ) {
		const perDone    = Math.max(1, Math.ceil((count / lastTotal) * 100))
		const perRem     = 100 - perDone
		const elapsedSec = (Date.now() - startTime) / 1000
		const estSpeed   = fsgUtil.bytesToMBCalc(count, false) / elapsedSec // MB/sec
		const secRemain  = elapsedSec / perDone * perRem

		const prettyMinRemain = Math.floor(secRemain / 60)
		const prettySecRemain = secRemain % 60

		fsgUtil.setById('loadOverlay_speed_speed', `${estSpeed.toFixed(1)} MB/s`)
		fsgUtil.setById('loadOverlay_speed_time', `~ ${prettyMinRemain.toFixed(0).padStart(2, '0')}:${prettySecRemain.toFixed(0).padStart(2, '0')}`)
	}
})

window.addEventListener('DOMContentLoaded', () => {
	processL10N()
	mismatchDialog = new bootstrap.Modal('#open_game_modal', {backdrop : 'static'})
	mismatchDialog.hide()
	modInfoDialog = new bootstrap.Modal('#open_mod_info_modal', {backdrop : 'static'})
	modInfoDialog.hide()
	loadOverlay = new bootstrap.Modal('#loadOverlay', { backdrop : 'static', keyboard : false })

	const todayIs = new Date()
	if ( todayIs.getMonth() === 3 && todayIs.getDate() === 1 ) {
		fsgUtil.clsAddId('drag_target', 'fsg-back-2')
	}

	const dragTarget = fsgUtil.byId('drag_target')

	window.l10n.langList_send()
	window.l10n.themeList_send()

	fsgUtil.byId('prefcanvas').addEventListener('hide.bs.offcanvas', () => {
		fsgUtil.queryF('body').classList.remove('full-scroll')
		fsgUtil.clearTooltips()
	})
	fsgUtil.byId('prefcanvas').addEventListener('show.bs.offcanvas', () => {
		fsgUtil.queryF('body').classList.add('full-scroll')
		updatePreferences()
	})

	dragTarget.addEventListener('dragenter', clientDragEnter )
	dragTarget.addEventListener('dragleave', clientDragLeave )
	dragTarget.addEventListener('dragover',  clientDragOver )
	dragTarget.addEventListener('drop',      clientDragDrop )
})

function clientDragOut(e) {
	e.preventDefault()
	e.stopPropagation()

	const thePath = e.composedPath()

	for ( const thisPath of thePath ) {
		if ( thisPath.nodeName === 'TR' ) {
			window.mods.dragOut(thisPath.id)
			break
		}
	}
}

function clientDragDrop(e) {
	e.preventDefault()
	e.stopPropagation()

	dragDropOperation = false

	fsgUtil.clsHide('drag_back')
	fsgUtil.clsDelId('drag_add_file', 'bg-primary')
	fsgUtil.clsDelId('drag_add_folder', 'd-none', 'bg-primary')

	const dt    = e.dataTransfer
	const files = dt.files


	if ( dragDropInFolder ) {
		const newFolder = files[0].path
		window.mods.dropFolder(newFolder)
	} else {
		const fileList = []
		for ( const thisFile of files ) { fileList.push(thisFile.path) }
		window.mods.dropFiles(fileList)
	}

	dragDropInFolder    = false
}

function clientDragLeave(e) {
	e.preventDefault()
	e.stopPropagation()

	if ( e.x <= 0 && e.y <= 0 ) {
		dragDropOperation   = false
		dragDropInFolder    = false
		fsgUtil.clsHide('drag_back')

		fsgUtil.clsDelId('drag_add_file', 'bg-primary')
		fsgUtil.clsDelId('drag_add_folder', 'd-none', 'bg-primary')
	}
}

function clientDragEnter(e) {
	e.preventDefault()
	e.stopPropagation()

	if ( !dragDropOperation ) {
		fsgUtil.clsShow('drag_back')
	
		const isCSV = e.dataTransfer.items[0].type === 'text/csv'

		fsgUtil.clsHideTrue('csv-no', isCSV)
		fsgUtil.clsHideTrue('csv-no-text', isCSV)
		fsgUtil.clsHideFalse('csv-yes', isCSV)
		fsgUtil.clsHideFalse('csv-yes-text', isCSV)

		if ( e.dataTransfer.items.length > 1 || e.dataTransfer.items[0].type !== '' ) {
			// multiple, so can't add as collection or non-empty type
			fsgUtil.clsHide('drag_add_folder')
		}

	} else {
		const addFolder = fsgUtil.byId('drag_add_folder')
		const addFile   = fsgUtil.byId('drag_add_file')
		let   thisID    = e.target.id
		const thePath   = e.composedPath()

		if ( thisID !== 'drag_add_folder' && thisID !== 'drag_add_file' ) {
			if ( thePath.includes(addFolder) ) { thisID = 'drag_add_folder' }
			if ( thePath.includes(addFile) )   { thisID = 'drag_add_file' }
		}
		if ( thisID === 'drag_add_folder' ) {
			addFolder.classList.add('bg-primary')
			addFile.classList.remove('bg-primary')
			dragDropInFolder = true
		}
		if ( thisID === 'drag_add_file' ) {
			addFolder.classList.remove('bg-primary')
			addFile.classList.add('bg-primary')
			dragDropInFolder = false
		}
	}

	dragDropOperation = true
}

function clientDragOver(e) {
	e.preventDefault()
	e.stopPropagation()

	e.dataTransfer.dropEffect = (dragDropInFolder ? 'link' : 'copy')
}


window?.l10n?.receive('fromMain_getText_return', (data) => {
	if ( data[0] === '__currentLocale__'  ) {
		setTimeout(() => {
			const topperHeight = fsgUtil.byId('main-header').offsetHeight
			const bottomHeight = fsgUtil.byId('main-footer').offsetHeight
			fsgUtil.byId('moveButtons').style.height = `calc(100vh - ${topperHeight + bottomHeight + 10}px)`
			fsgUtil.byId('moveButtons').style.top = `${topperHeight + 5}px`
		}, 250)
	}
})
