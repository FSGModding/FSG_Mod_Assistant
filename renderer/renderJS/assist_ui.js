/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main Window UI

/* global processL10N, fsgUtil, bootstrap, select_lib, __ */

window.mods.receive('fromMain_selectInvertOpen', () => {
	const lastOpenAcc = document.querySelector('.accordion-collapse.show')
	const lastOpenID  = (lastOpenAcc !== null) ? lastOpenAcc.id : null

	if ( lastOpenID !== null ) { select_lib.click_invert(lastOpenID) }
})

window.mods.receive('fromMain_selectNoneOpen', () => {
	const lastOpenAcc = document.querySelector('.accordion-collapse.show')
	const lastOpenID  = (lastOpenAcc !== null) ? lastOpenAcc.id : null

	if ( lastOpenID !== null ) { select_lib.click_none(lastOpenID) }
})

window.mods.receive('fromMain_selectAllOpen', () => {
	const lastOpenAcc = document.querySelector('.accordion-collapse.show')
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
	fsgUtil.byId('dirty_folders').classList[(dirtyFlag)?'remove':'add']('d-none')
})
window.mods.receive('fromMain_debugLogDanger', () => {
	fsgUtil.byId('debug_danger_bubble').classList.remove('d-none')
})
window.mods.receive('fromMain_debugLogNoDanger', () => {
	fsgUtil.byId('debug_danger_bubble').classList.add('d-none')
})

window.mods.receive('fromMain_modInfoPop', (thisMod, thisSite) => {
	fsgUtil.byId('mod_info_mod_name').innerHTML = thisMod.fileDetail.shortName
	fsgUtil.byId('mod_info_input').value = thisSite
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
	gameIsRunningFlag = status.gameRunning
	toggleGameStatus(status.gameRunning)
	fsgUtil.clsShowTrue('update-is-ready-button', status.updateReady)
})

window.mods.receive('fromMain_modList', (modCollect) => {
	const multiVersion = modCollect.appSettings.multi_version
	const curVersion   = modCollect.appSettings.game_version
	gameRunAlert       = modCollect.opts.l10n.runMessage

	searchStringMap_empty()
	searchTagMap_empty()

	document.body.setAttribute('data-version', curVersion)

	fsgUtil.clsOrGate('mini_button', modCollect.opts.showMini, 'btn-outline-light', 'unused-class')
	fsgUtil.clsShowTrue('update-is-ready-button', modCollect.updateReady)
	fsgUtil.clsShowTrue('dirty_folders', modCollect.opts.foldersDirty)
	fsgUtil.clsShowTrue('multi_version_button', multiVersion)

	fsgUtil.byId('farm_sim_versions').innerHTML = [22, 19, 17, 15, 13].map((version) =>  makeVersionRow(version, modCollect.appSettings, modCollect)).join('')

	const lastOpenAcc = document.querySelector('.accordion-collapse.show')
	const lastOpenID  = lastOpenAcc?.id ?? null
	const lastOpenQ   = (lastOpenAcc !== null) ? fsgUtil.byId('filter_input').value : ''
	const scrollStart = window.scrollY

	const modTable     = []
	const scrollTable  = []
	const verList      = {}
	let   verFlag      = false

	/* List selection */
	fsgUtil.byId('collectionSelect').innerHTML = buildCollectSelect(modCollect)
	/* END : List selection */

	for ( const collectKey of modCollect.set_Collections ) {
		if ( multiVersion && modCollect.collectionNotes[collectKey].notes_version !== curVersion ) { continue }
		const thisCollection = modCollect.modList[collectKey]
		const collectNotes   = modCollect.collectionNotes[collectKey]
		const collectFreeze  = collectNotes.notes_frozen
		const modRows        = []
		const scrollRows     = []
		const sizeOfFolder   = thisCollection.folderSize
		const mapIcons       = []
		const mapNames       = []

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
		
		const isOnline = modCollect.collectionToStatus[collectKey]
		const fullName = `${thisCollection.name} <small>[${isOnline ? fsgUtil.bytesToHR(sizeOfFolder) : __('removable_offline') }]</small>`

		modTable.push(makeModCollection(
			isOnline,
			collectKey,
			fullName,
			modRows,
			collectNotes.notes_website,
			collectNotes.notes_websiteDL,
			[collectNotes.notes_tagline, (mapIcons.length === 1 ? mapNames[0][0] : null)].filter((x) => x !== null).join(' - '),
			collectNotes.notes_admin,
			modRows.length, //thisCollection.dependSet.size,
			collectNotes.notes_favorite,
			modCollect.opts.activeCollection === collectKey,
			collectNotes.notes_game_admin,
			collectNotes.notes_holding,
			fsgUtil.firstOrNull(mapIcons),
			mapNames[0],
			parseInt(collectNotes.notes_color),
			collectNotes.notes_removable
		))
		scrollTable.push(fsgUtil.buildScrollCollect(collectKey, scrollRows))
	}
	
	fsgUtil.byId('mod-collections').innerHTML  = modTable.join('')
	fsgUtil.byId('scroll-bar-fake').innerHTML  = scrollTable.join('')

	fsgUtil.clsOrGate('verButton', verFlag, 'btn-danger', 'btn-success')

	toggleGameStatus(modCollect.opts.gameRunning)
	gameIsRunningFlag = modCollect.opts.gameRunning

	buildDropDownFilters(modCollect.badgeL10n)

	select_lib.clear_range()

	try {
		select_lib.open_table(lastOpenID)

		if ( lastOpenQ !== '' ) {
			select_lib.filter_begin(lastOpenID, lastOpenQ)
		}
		window.scrollTo(0, scrollStart)
	} catch {
		// Don't Care
	}

	select_lib.filter_begin()
	processL10N()
})


function toggleGameStatus(status = false) {
	fsgUtil.clsOrGate('gameRunningBubble', status, 'text-success', 'text-danger')
}

function clientMakeListInactive() {
	fsgUtil.byId('collectionSelect').value = 0
	window.mods.makeInactive()
}

function clientMakeListActive() {
	const activePick = fsgUtil.byId('collectionSelect').value.replace('collection--', '')

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

	fsgUtil.byId('filter_out__tags').innerHTML = hideTags.join('')
	fsgUtil.byId('filter__tags').innerHTML     = limitTags.join('')
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

const makeModCollection = (isOnline, id, name, modsRows, website, dlEnabled, tagLine, adminPass, modCount, favorite, isActive, gameAdminPass, isHolding, singleMapIcon, mapNames, folderColor, removable) => fsgUtil.useTemplate('collect_row', {
	bootstrap_data              : `data-bs-toggle="collapse" data-bs-target="#${id}_mods"`,
	class_hideDownload          : dlEnabled ? '' : 'd-none',
	class_hideGameAdminPassword : gameAdminPass !== null ? '' : 'd-none',
	class_hidePassword          : adminPass !== null ? '' : 'd-none',
	class_hideRemovable         : removable ? '' : 'd-none',
	class_hideWebsite           : website !== null ? '' : 'd-none',
	class_isHolding             : isHolding ? 'is-holding-pen' : '',
	class_mapIcon               : singleMapIcon === null ? 'd-none' : '',
	class_status                : !isOnline ? 'text-decoration-line-through' : '',
	folderSVG                   : fsgUtil.getIconSVG('folder', favorite, isActive, isHolding, folderColor),
	game_admin_password         : gameAdminPass,
	id                          : id,
	mapClick                    : mapNames?.[2],
	mapIcon                     : fsgUtil.iconMaker(singleMapIcon),
	mapTitle                    : mapNames?.[1],
	mod_rows                    : `<table class="w-100 py-0 my-0 table table-sm table-hover table-striped">${modsRows.join('')}</table>`,
	name                        : name,
	password                    : adminPass,
	tagLine                     : tagLine !== '' ? `<br><span class="ps-3 small fst-italic">${tagLine}</span>` : '',
	totalCount                  : modCount > 999 ? '999+' : modCount,
	website                     : website,
})


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
	const modName = fsgUtil.byId('mod_info_mod_name').innerHTML
	const newSite = fsgUtil.byId('mod_info_input').value
	window.mods.setModInfo(modName, newSite)
	modInfoDialog.hide()
}
function clientSetGameVersion(version) { window.mods.changeVersion(parseInt(version, 10)) }

function clientClearInput() { select_lib.filter_begin(null, '') }

function clientBatchOperation(mode) {
	const allModRows     = fsgUtil.queryA('.mod-row .mod-row-checkbox:checked')
	const selectedMods   = allModRows.map((thisRow) => thisRow.id.replace('__checkbox', ''))

	if ( selectedMods.length === 0 ) { return }

	const isHoldingPen   = fsgUtil.byId(`${selectedMods[0].split('--')[0]}_mods`).classList.contains('is-holding-pen')

	if ( mode === 'copy' || mode ==='move' ) {
		window.mods[`${mode}${isHoldingPen ? 'Multi' : 'Mods'}`](selectedMods)
	} else if ( mode === 'delete' || mode === 'zip' ) {
		window.mods[`${mode}Mods`](selectedMods)
	} else {
		if ( select_lib.last_alt_select !== null ) {
			selectedMods.length = 0
			selectedMods.push(select_lib.last_alt_select)
		}
		if ( selectedMods.length !== 1 ) { return }
		if ( mode === 'open' ) { window.mods.openMods(selectedMods) }
		if ( mode === 'hub' )  { window.mods.openHub(selectedMods) }
		if ( mode === 'site' ) { window.mods.openExt(selectedMods) }
	}
}

function clientOpenFarmSim() {
	const currentList = fsgUtil.byId('collectionSelect').value
	if ( currentList === lastList ) {
		// Selected is active, no confirm
		spinLED()
		window.mods.startFarmSim()
	} else {
		// Different, ask confirmation
		fsgUtil.byId('no_match_game_list').innerHTML = fullList[lastList]
		fsgUtil.byId('no_match_ma_list').innerHTML = fullList[currentList]
		fastBlinkLED()
		mismatchDialog.show()
	}
}

function clientOpenGame_IGNORE() {
	mismatchDialog.hide()
	spinLED()
	fsgUtil.byId('collectionSelect').value = lastList
	window.mods.startFarmSim()
}

function clientOpenGame_FIX() {
	mismatchDialog.hide()
	clientMakeListActive()
}

window.addEventListener('hidden.bs.collapse', () => { select_lib.click_none() })
window.addEventListener('shown.bs.collapse',  () => { select_lib.click_none() })

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
	fsgUtil.byId('loadOverlay_statusMessage').innerHTML        = mainTitle
	fsgUtil.byId('loadOverlay_statusDetail').innerHTML         = subTitle
	fsgUtil.byId('loadOverlay_statusTotal').innerHTML          = '0'
	fsgUtil.byId('loadOverlay_statusCurrent').innerHTML        = '0'
	fsgUtil.byId('loadOverlay_downloadCancelButton').innerHTML = dlCancel

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
	const thisElement = document.getElementById('loadOverlay_statusTotal')
	lastTotal = ( count < 1 ) ? 1 : count

	if ( thisElement !== null ) { thisElement.innerHTML = thisCount }
})

window.loader.receive('fromMain_loading_current', (count, inMB = false) => {
	const thisCount   = inMB ? fsgUtil.bytesToMB(count, false) : count
	const thisElement = document.getElementById('loadOverlay_statusCurrent')
	const thisProg    = document.getElementById('loadOverlay_statusProgBarInner')
	const thisPercent = `${Math.ceil((count / lastTotal) * 100)}%` || '0%'

	if ( thisProg !== null ) { thisProg.style.width = thisPercent }

	if ( thisElement !== null ) { thisElement.innerHTML = thisCount }

	if ( inMB ) {
		const perDone    = Math.max(1, Math.ceil((count / lastTotal) * 100))
		const perRem     = 100 - perDone
		const endTime    = Date.now()
		const elapsedMS  = endTime - startTime
		const elapsedSec = elapsedMS / 1000
		const estSpeed   = fsgUtil.bytesToMB(count, false) / elapsedSec // MB/sec
		const secRemain  = elapsedSec / perDone * perRem

		const prettyMinRemain = Math.floor(secRemain / 60)
		const prettySecRemain = secRemain % 60

		document.getElementById('loadOverlay_speed_speed').innerHTML = `${estSpeed.toFixed(1)} MB/s`
		document.getElementById('loadOverlay_speed_time').innerHTML = `~ ${prettyMinRemain.toFixed(0).padStart(2, '0')}:${prettySecRemain.toFixed(0).padStart(2, '0')}`
	}
})

window.addEventListener('DOMContentLoaded', () => {
	processL10N()
	mismatchDialog = new bootstrap.Modal(document.getElementById('open_game_modal'), {backdrop : 'static'})
	mismatchDialog.hide()
	modInfoDialog = new bootstrap.Modal(document.getElementById('open_mod_info_modal'), {backdrop : 'static'})
	modInfoDialog.hide()
	loadOverlay = new bootstrap.Modal('#loadOverlay', { backdrop : 'static', keyboard : false })
	const dragTarget = fsgUtil.byId('drag_target')

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

	fsgUtil.byId('drag_back').classList.add('d-none')
	fsgUtil.byId('drag_add_file').classList.remove('bg-primary')
	fsgUtil.byId('drag_add_folder').classList.remove('d-none', 'bg-primary')

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
		fsgUtil.byId('drag_back').classList.add('d-none')

		fsgUtil.byId('drag_add_file').classList.remove('bg-primary')
		fsgUtil.byId('drag_add_folder').classList.remove('d-none', 'bg-primary')
	}
}

function clientDragEnter(e) {
	e.preventDefault()
	e.stopPropagation()

	if ( !dragDropOperation ) {
		fsgUtil.byId('drag_back').classList.remove('d-none')
	
		if ( e.dataTransfer.items.length > 1 || e.dataTransfer.items[0].type !== '' ) {
			// multiple, so can't add as collection.
			fsgUtil.byId('drag_add_folder').classList.add('d-none')
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

