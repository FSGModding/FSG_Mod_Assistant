/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main Window UI

/* global processL10N, fsgUtil, bootstrap, select_lib */

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
	select_lib.filter(tableID, filterText)
})

window.mods.receive('fromMain_dirtyUpdate', (dirtyFlag) => {
	fsgUtil.byId('dirty_folders').classList[(dirtyFlag)?'remove':'add']('d-none')
})
window.mods.receive('fromMain_debugLogDanger', () => {
	fsgUtil.byId('debug_danger_bubble').classList.remove('d-none')
})

let lastLocale      = 'en'
let searchStringMap = {}
let searchTagMap    = {}
let lastList        = null
let fullList        = {}

window.mods.receive('fromMain_modList', (modCollect) => {
	const multiVersion = modCollect.appSettings.multi_version
	const curVersion   = modCollect.appSettings.game_version
	searchStringMap = {}
	searchTagMap    = {
		broken  : [],
		folder  : [],
		new     : [],
		nomp    : [],
		notmod  : [],
		pconly  : [],
		problem : [],
		recent  : [],
		update  : [],
		nonmh   : [],
	}
	lastLocale = modCollect.opts.currentLocale

	fsgUtil.byId('lang-style-div').setAttribute('class', modCollect.opts.currentLocale)

	fsgUtil.byId('dirty_folders').classList[(modCollect.opts.foldersDirty)?'remove':'add']('d-none')

	const versionsHTML = [22, 19, 17, 15, 13].map((version) =>  makeVersionRow(version, modCollect.appSettings, modCollect))
	fsgUtil.byId('farm_sim_versions').innerHTML = versionsHTML.join('')
	fsgUtil.byId('multi_version_button').classList[(modCollect.appSettings.multi_version)?'remove':'add']('d-none')


	const lastOpenAcc = document.querySelector('.accordion-collapse.show')
	const lastOpenID  = (lastOpenAcc !== null) ? lastOpenAcc.id : null
	const lastOpenQ   = (lastOpenAcc !== null) ? fsgUtil.byId('filter_input').value : ''
	const scrollStart = window.scrollY

	const modTable     = []
	const optList      = []
	const scrollTable  = []

	/* List selection */
	lastList = ( modCollect.opts.activeCollection !== '999' && modCollect.opts.activeCollection !== '0') ? `collection--${modCollect.opts.activeCollection}` : modCollect.opts.activeCollection
	fullList = {}

	fullList[0] = `--${modCollect.opts.l10n.disable}--`
	optList.push(fsgUtil.buildSelectOpt('0', `--${modCollect.opts.l10n.disable}--`, lastList, true))

	for ( const collectKey of modCollect.set_Collections ) {
		fullList[`collection--${collectKey}`] = modCollect.modList[collectKey].fullName
		if ( !multiVersion || modCollect.collectionNotes[collectKey].notes_version === curVersion ) {
			optList.push(fsgUtil.buildSelectOpt(`collection--${collectKey}`, modCollect.modList[collectKey].fullName, lastList, false, modCollect.collectionToFolder[collectKey]))
		}
		if ( multiVersion && `collection--${collectKey}` === lastList && modCollect.collectionNotes[collectKey].notes_version !== curVersion ) {
			lastList = '999'
		}
	}

	fullList[999] = `--${modCollect.opts.l10n.unknown}--`
	optList.push(fsgUtil.buildSelectOpt('999', `--${modCollect.opts.l10n.unknown}--`, lastList, true))

	fsgUtil.byId('collectionSelect').innerHTML = optList.join('')
	/* END : List selection */


	for ( const collectKey of modCollect.set_Collections ) {
		if ( multiVersion && modCollect.collectionNotes[collectKey].notes_version !== curVersion ) { continue }
		const thisCollection = modCollect.modList[collectKey]
		const collectNotes   = modCollect.collectionNotes?.[collectKey]
		const modRows        = []
		const scrollRows     = []
		const sizeOfFolder   = thisCollection.folderSize

		for ( const modKey of thisCollection.alphaSort ) {
			try {
				const thisMod       = thisCollection.mods[modKey.split('::')[1]]
				const displayBadges = doBadgeSet(
					thisMod.badgeArray,
					thisMod,
					thisCollection,
					modCollect.newMods,
					modCollect.bindConflict?.[collectKey],
					modCollect.appSettings.game_version
				)

				searchStringMap[thisMod.colUUID] = [
					thisMod.fileDetail.shortName,
					thisMod.l10n.title,
					thisMod.modDesc.author
				].join(' ').toLowerCase()

				for ( const badge of displayBadges ) {
					if ( typeof searchTagMap?.[badge]?.push === 'function' ) {
						searchTagMap[badge].push(thisMod.colUUID)
					}
				}

				scrollRows.push(fsgUtil.buildScrollMod(collectKey, thisMod.colUUID))
				modRows.push(makeModRow(
					thisMod.colUUID,
					thisMod,
					displayBadges,
					thisMod.modHub.id,
					modCollect.appSettings.game_version
				))

			} catch (e) {
				window.log.notice(`Error building mod row: ${e}`, 'main')
			}
		}
		
		modTable.push(makeModCollection(
			collectKey,
			`${thisCollection.name} <small>[${fsgUtil.bytesToHR(sizeOfFolder, lastLocale)}]</small>`,
			modRows,
			fsgUtil.notesDefault(collectNotes, 'notes_website'),
			fsgUtil.notesDefault(collectNotes, 'notes_websiteDL', false),
			fsgUtil.notesDefault(collectNotes, 'notes_tagline'),
			fsgUtil.notesDefault(collectNotes, 'notes_admin'),
			thisCollection.dependSet.size
		))
		scrollTable.push(fsgUtil.buildScrollCollect(collectKey, scrollRows))
	}
	
	fsgUtil.byId('mod-collections').innerHTML  = modTable.join('')
	fsgUtil.byId('scroll-bar-fake').innerHTML  = scrollTable.join('')

	for ( const collectKey of modCollect.set_Collections ) {
		const thisFav = fsgUtil.notesDefault(modCollect.collectionNotes?.[collectKey], 'notes_favorite', false)

		if ( thisFav ) {
			const favFolder = document.querySelector(`[data-bs-target="#${collectKey}_mods"] svg`)

			if ( favFolder !== null ) {
				favFolder.innerHTML += '<path d="m171,126.25l22.06,62.76l65.93,0l-54.22,35.49l21.94,61.46l-55.74,-38.21l-55.74,38.21l22.06,-61.46l-54.32,-35.49l66.06,0l21.94,-62.76l0.03,0z" fill="#7f7f00" id="svg_5"/>'
			}
		}
	}

	const activeFolder = document.querySelector(`[data-bs-target="#${modCollect.opts.activeCollection}_mods"] svg`)

	if ( activeFolder !== null ) {
		let currentInner = activeFolder.innerHTML
		
		currentInner = currentInner.replace('#FFC843', '#225511')
		currentInner = currentInner.replace('#E0B03B', '#44bb22')
		currentInner = currentInner.replace('#7f7f00', '#b3a50b')
		currentInner += '<polygon fill="#eeeeee" points="290.088 61.432 117.084 251.493 46.709 174.18 26.183 197.535 117.084 296.592 310.614 83.982"></polygon>'

		activeFolder.innerHTML = currentInner
	}

	select_lib.clear_range()

	try {
		select_lib.open_table(lastOpenID)

		if ( lastOpenQ !== '' ) {
			select_lib.filter(lastOpenID, lastOpenQ)
		}
		window.scrollTo(0, scrollStart)
	} catch {
		// Don't Care
	}

	select_lib.filter()
	processL10N()
})


function doBadgeSet(originalBadges, thisMod, thisCollection, newMods, bindConflicts, currentGameVersion) {
	const theseBadges = [...originalBadges] || []

	if ( Object.keys(thisMod.modDesc.binds).length > 0 ) {
		theseBadges.push(typeof bindConflicts[thisMod.fileDetail.shortName] !== 'undefined' ? 'keys_bad' : 'keys_ok')
	}

	if ( thisMod.modHub.version !== null && thisMod.modDesc.version !== thisMod.modHub.version) {
		theseBadges.push('update')
	}

	if ( newMods.has(thisMod.md5Sum) && !thisMod.canNotUse ) {
		theseBadges.push('new')
	}

	if ( thisMod.modHub.recent ) {
		theseBadges.push('recent')
	}

	if ( thisMod.modHub.id === null ) {
		theseBadges.push('nonmh')
	}

	if ( theseBadges.includes('keys_bad') && theseBadges.includes('keys_ok') ) {
		const brokenIdx = theseBadges.indexOf('keys_ok')
		theseBadges.splice(brokenIdx, brokenIdx !== -1 ? 1 : 0)
	}

	if ( theseBadges.includes('broken') && theseBadges.includes('notmod') ) {
		const brokenIdx = theseBadges.indexOf('broken')
		theseBadges.splice(brokenIdx, brokenIdx !== -1 ? 1 : 0)
	}

	if ( typeof thisMod.modDesc.depend !== 'undefined' && thisMod.modDesc.depend.length > 0 ) {
		let hasAllDeps = true

		for ( const thisDep of thisMod.modDesc.depend ) {
			if ( ! thisCollection.dependSet.has(thisDep) ) {
				hasAllDeps = false
				break
			}
		}
		if ( !hasAllDeps ) { theseBadges.unshift('depend')}
	}

	if ( currentGameVersion !== thisMod.gameVersion ) {
		if ( typeof thisMod.gameVersion === 'number' ) {
			theseBadges.unshift(`fs${thisMod.gameVersion}`)
		} else {
			theseBadges.unshift('fs0')
		}
	}

	return Array.from(new Set(theseBadges))
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
	}
}

const makeModCollection = (id, name, modsRows, website, dlEnabled, tagLine, adminPass, modCount) => fsgUtil.useTemplate('collect_row', {
	id                 : id,
	name               : name,
	tagLine            : tagLine !== null ? `<br><span class="ps-3 small fst-italic">${tagLine}</span>` : '',
	totalCount         :  modCount > 999 ? '999+' : modCount,
	bootstrap_data     : `${fsgUtil.buildBS('toggle', 'collapse')} ${fsgUtil.buildBS('target', `#${id}_mods`)}`,
	folderSVG          : fsgUtil.getIconSVG('folder'),
	class_hideDownload : dlEnabled ? '' : 'd-none',
	class_hidePassword : adminPass !== null ? '' : 'd-none',
	class_hideWebsite  : website !== null ? '' : 'd-none',
	password           : adminPass,
	website            : website,
	mod_rows           : `<table class="w-100 py-0 my-0 table table-sm table-hover table-striped">${modsRows.join('')}</table>`,
})


const makeModRow = (id, thisMod, badges, modId, currentGameVersion) => fsgUtil.useTemplate('mod_row', {
	id                : id,
	shortname         : thisMod.fileDetail.shortName,
	title             : fsgUtil.escapeSpecial(thisMod.l10n.title),
	author            : fsgUtil.escapeSpecial(thisMod.modDesc.author),
	version           : fsgUtil.escapeSpecial(thisMod.modDesc.version),
	fileSize          : ( thisMod.fileDetail.fileSize > 0 ) ? fsgUtil.bytesToHR(thisMod.fileDetail.fileSize, lastLocale) : '',
	icon              : fsgUtil.iconMaker(thisMod.modDesc.iconImageCache),
	class_modColor    : thisMod.canNotUse === true ? '  bg-danger' : ( currentGameVersion !== thisMod.gameVersion ? ' bg-warning' : '' ),
	class_modDisabled : ( thisMod.canNotUse===true || currentGameVersion !== thisMod.gameVersion ) ? ' mod-disabled bg-opacity-25':'',
	class_hasHash     : modId!==null ? ' has-hash' : '',
	badges            : Array.from(badges, (badge) => fsgUtil.badge(false, badge)).join(' '),
})


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
		version         : version,
		backgroundClass : version === options.game_version ? 'bg-success' : 'bg-primary',
		collections     : counts.collect,
		mods            : counts.mods,
	})
}

function clientSetGameVersion(version) { window.mods.changeVersion(parseInt(version, 10)) }

function clientClearInput() { select_lib.filter(null, '') }

function clientBatchOperation(mode) {
	const allModRows     = fsgUtil.query('.mod-row .mod-row-checkbox:checked')
	const selectedMods   = Array.from(allModRows).map((thisRow) => thisRow.id.replace('__checkbox', ''))

	switch (mode) {
		case 'copy':
			if ( selectedMods.length > 0 ) { window.mods.copyMods(selectedMods) }
			break
		case 'move':
			if ( selectedMods.length > 0 ) { window.mods.moveMods(selectedMods) }
			break
		case 'delete':
			if ( selectedMods.length > 0 ) { window.mods.deleteMods(selectedMods) }
			break
		case 'open':
			if ( select_lib.last_alt_select !== null ) {
				selectedMods.length = 0
				selectedMods.push(select_lib.last_alt_select)
			}
			if ( selectedMods.length === 1 ) { window.mods.openMods(selectedMods) }
			break
		case 'hub':
			if ( select_lib.last_alt_hash && select_lib.last_alt_select !== null ) {
				selectedMods.length = 0
				selectedMods.push(select_lib.last_alt_select)
			}
			if ( selectedMods.length === 1 ) { window.mods.openHub(selectedMods) }
			break
		case 'zip':
			if ( selectedMods.length > 0 ) { window.mods.zipMods(selectedMods) }
			break
		default:
			break
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

		if ( clientLED.length < 1 ) { return }

		const clientLEDDevice = clientLED[0]

		await clientLEDDevice.open()
		await clientLEDDevice.sendReport(0x00, fsgUtil.led[type])
		setTimeout(async () => {
			await clientLEDDevice.sendReport(0x00, fsgUtil.led.off)
			await clientLEDDevice.close()
		}, time)
	} catch (e) {
		window.log.debug(`Unable to spin LED (no light?) : ${e}`, 'main')
	}
}

let mismatchDialog      = null
let dragDropOperation   = false
let dragDropInFolder    = false


window.addEventListener('DOMContentLoaded', () => {
	processL10N()
	mismatchDialog = new bootstrap.Modal(document.getElementById('open_game_modal'), {backdrop : 'static'})
	mismatchDialog.hide()
	const dragTarget = fsgUtil.byId('drag_target')

	dragTarget.addEventListener('dragenter', clientDragEnter )
	dragTarget.addEventListener('dragleave', clientDragLeave )
	dragTarget.addEventListener('dragover',  clientDragOver )
	dragTarget.addEventListener('drop',      clientDragDrop )
})

function clientDragOut(e) {
	e.preventDefault()
	e.stopPropagation()

	for ( const thisPath of e.path ) {
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

		if ( thisID !== 'drag_add_folder' && thisID !== 'drag_add_file' ) {
			if ( e.path.includes(addFolder) ) { thisID = 'drag_add_folder' }
			if ( e.path.includes(addFile) )   { thisID = 'drag_add_file' }
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

