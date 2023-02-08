/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main Window UI

/* global processL10N, fsgUtil, bootstrap, select_lib, getText */

// TODO: de HTML-ify

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
	const checkList = []
	selectList.forEach((id) => { checkList.push(`${id}__checkbox`) })

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

	const versionsHTML = [22, 19, 17, 15, 13].map((version) =>  makeVersionRow(version, modCollect.appSettings))
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

	modCollect.set_Collections.forEach((collectKey) => {
		fullList[`collection--${collectKey}`] = modCollect.modList[collectKey].fullName
		if ( !multiVersion || modCollect.collectionNotes[collectKey].notes_version === curVersion ) {
			optList.push(fsgUtil.buildSelectOpt(`collection--${collectKey}`, modCollect.modList[collectKey].fullName, lastList, false, modCollect.collectionToFolder[collectKey]))
		}
		if ( multiVersion && `collection--${collectKey}` === lastList && modCollect.collectionNotes[collectKey].notes_version !== curVersion ) {
			lastList = '999'
		}
	})

	fullList[999] = `--${modCollect.opts.l10n.unknown}--`
	optList.push(fsgUtil.buildSelectOpt('999', `--${modCollect.opts.l10n.unknown}--`, lastList, true))

	fsgUtil.byId('collectionSelect').innerHTML = optList.join('')
	/* END : List selection */


	modCollect.set_Collections.forEach((collectKey) => {
		if ( multiVersion && modCollect.collectionNotes[collectKey].notes_version !== curVersion ) { return }
		const thisCollection = modCollect.modList[collectKey]
		const collectNotes   = modCollect.collectionNotes?.[collectKey]
		const modRows        = []
		const scrollRows     = []
		const sizeOfFolder   = thisCollection.folderSize

		thisCollection.alphaSort.forEach((modKey) => {
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

				displayBadges.forEach((badge) => {
					if ( typeof searchTagMap?.[badge]?.push === 'function' ) {
						searchTagMap[badge].push(thisMod.colUUID)
					}
				})

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
		})
		
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
	})
	
	fsgUtil.byId('mod-collections').innerHTML  = modTable.join('')
	fsgUtil.byId('scroll-bar-fake').innerHTML  = scrollTable.join('')

	modCollect.set_Collections.forEach((collectKey) => {
		const thisFav = fsgUtil.notesDefault(modCollect.collectionNotes?.[collectKey], 'notes_favorite', false)

		if ( thisFav ) {
			const favFolder = document.querySelector(`[data-bs-target="#${collectKey}_mods"] svg`)

			if ( favFolder !== null ) {
				favFolder.innerHTML += '<path d="m171,126.25l22.06,62.76l65.93,0l-54.22,35.49l21.94,61.46l-55.74,-38.21l-55.74,38.21l22.06,-61.46l-54.32,-35.49l66.06,0l21.94,-62.76l0.03,0z" fill="#7f7f00" id="svg_5"/>'
			}
		}
	})

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

		thisMod.modDesc.depend.forEach((thisDep) => {
			if ( ! thisCollection.dependSet.has(thisDep) ) {
				hasAllDeps = false
				return
			}
		})
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

function makeModCollection(id, name, modsRows, website, dlEnabled, tagLine, adminPass, modCount) {
	const totCount = modCount > 999 ? '999+' : modCount
	return `<tr class="mod-table-folder" oncontextmenu="window.mods.openCText('${id}')">
	<td class="folder-icon collapsed" ${fsgUtil.buildBS('toggle', 'collapse')} ${fsgUtil.buildBS('target', `#${id}_mods`)}>
		<div class="badge rounded-pill bg-primary bg-gradient float-start" style="width: 30px; height: 13px; margin-bottom: -15px; font-size: 0.5em; transform: translateY(-20%)!important">${totCount}</div>
		${fsgUtil.getIconSVG('folder')}
	</td>
	<td class="folder-name collapsed" ${fsgUtil.buildBS('toggle', 'collapse')} ${fsgUtil.buildBS('target', `#${id}_mods`)}>
		<div class="d-inline-block">${name}${tagLine !== null ? `<br><span class="ps-3 small fst-italic">${tagLine}</span>` : ''}</div>
	</td>
	<td class="align-middle text-end">
	${ dlEnabled ? `<button class="btn btn-outline-warning btn-sm me-2" onclick="window.mods.download('${id}')">${getText('download_button')}</button>`: ''}
		${ adminPass !== null ? `<button class="btn btn-outline-info btn-sm me-2" onclick="window.mods.popClipboard('${adminPass}')">${getText('admin_pass_button')}</button>`: ''}
		${ website !== null ? `<a target="_blank" class="btn btn-outline-info btn-sm me-2" href="${website}">${getText('admin_button')}</a>`: ''}
		<button class="btn btn-outline-info btn-sm me-2" onclick="window.mods.exportList('${id}')">${getText('export_button')}</button>
		<button class="btn btn-primary btn-sm me-2" onclick="window.mods.openNotes('${id}')">${getText('notes_button')}</button>
		<button class="btn btn-primary btn-sm me-2" onclick="window.mods.openSave('${id}')">${getText('check_save')}</button>
	</td>
</tr>
<tr class="mod-table-folder-detail collapse accordion-collapse" data-bs-parent="#mod-collections" id="${id}_mods">
	<td class="mod-table-folder-details px-0 ps-4" colspan="3">
		<table class="w-100 py-0 my-0 table table-sm table-hover table-striped">${modsRows.join('')}</table>
		<span class="no-mods-found d-block fst-italic small text-center d-none">${getText('empty_or_filtered')}</span>
	</td>
</tr>`
}

function makeModRow(id, thisMod, badges, modId, currentGameVersion) {
	const badgeHTML        = Array.from(badges, (badge) => fsgUtil.badge(false, badge))
	const modDisabledClass = ( thisMod.canNotUse===true || currentGameVersion !== thisMod.gameVersion ) ? ' mod-disabled bg-opacity-25':''
	const modColorClass    = thisMod.canNotUse === true ? '  bg-danger' : ( currentGameVersion !== thisMod.gameVersion ? ' bg-warning' : '' )

	return `<tr draggable="true" ondragstart="clientDragOut(event)" onclick="select_lib.click_row('${id}')" ondblclick="window.mods.openMod('${id}')" oncontextmenu="window.mods.modCText('${id}')" class="mod-row${(modId!==null ? ' has-hash' : '')}${modDisabledClass}${modColorClass}" id="${id}">
	<td>
		<input type="checkbox" class="form-check-input mod-row-checkbox" id="${id}__checkbox">
	</td>
	<td style="width: 64px; height: 64px">
		<img class="img-fluid" src="${fsgUtil.iconMaker(thisMod.modDesc.iconImageCache)}" />
	</td>
	<td>
		<div class="bg-light"></div><span class="mod-short-name">${thisMod.fileDetail.shortName}</span><br /><small>${fsgUtil.escapeSpecial(thisMod.l10n.title)} - <em>${fsgUtil.escapeSpecial(thisMod.modDesc.author)}</em></small><div class="issue_badges">${badgeHTML.join(' ')}</div>
	</td>
	<td class="text-end pe-4" style="width: 120px;">
		${fsgUtil.escapeSpecial(thisMod.modDesc.version)}<br /><em class="small">${( thisMod.fileDetail.fileSize > 0 ) ? fsgUtil.bytesToHR(thisMod.fileDetail.fileSize, lastLocale) : ''}</em>
	</td>
</tr>`
}

function makeVersionRow(version, options) {
	const thisVersionEnabled = version === 22 ? true : options[`game_enabled_${version}`]
	const backGroundClass    = version === options.game_version ? 'bg-success' : 'bg-primary'

	if ( !thisVersionEnabled && version !== options.game_version ) { return '' }

	return `<div data-bs-dismiss="offcanvas" class="row ${backGroundClass} mb-3 mx-2 py-2 rounded-2 d-flex align-items-baseline" style="cursor: pointer;" onclick="clientSetGameVersion(${version})">
		<div class="col-3">
			<img src="img/fs${version}_256.png" class="img-fluid">
		</div>
		<div class="col-9 text-white" style="font-size: 150%">
			<l10n name="game_title_farming_simulator"></l10n> 20${version}
		</div>
	</div>`
}

function clientSetGameVersion(version) { window.mods.changeVersion(version) }

function clientClearInput() { select_lib.filter(null, '') }

function clientBatchOperation(mode) {
	const selectedMods   = []
	const allModRows     = fsgUtil.query('.mod-row')

	allModRows.forEach((thisRow) => {
		if ( thisRow.querySelector('.mod-row-checkbox').checked ) {
			selectedMods.push(thisRow.id)
		}
	})

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
window.addEventListener('shown.bs.collapse', () => { select_lib.click_none() })

const giantsLED = {	filters : [{ vendorId : fsgUtil.led.vendor, productId : fsgUtil.led.product }] }

async function spinLED()  { operateLED('spin') }
async function blinkLED() { operateLED('blink') }
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

