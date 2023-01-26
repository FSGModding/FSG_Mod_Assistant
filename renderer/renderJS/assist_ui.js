/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main Window UI

/* global l10n, fsgUtil, bootstrap, select_lib, getText */


/*  __ ____   ______        
   |  |_   | |      |.-----.
   |  |_|  |_|  --  ||     |
   |__|______|______||__|__| */

function processL10N()          { clientGetL10NEntries() }
function clientGetL10NEntries() {
	const l10nSendItems = new Set()

	fsgUtil.query('l10n').forEach((thisL10nItem) => {
		l10nSendItems.add(fsgUtil.getAttribNullEmpty(thisL10nItem, 'name'))
	})

	l10n.getText_send(l10nSendItems)
}

window.l10n.receive('fromMain_getText_return', (data) => {
	fsgUtil.query(`l10n[name="${data[0]}"]`).forEach((item) => { item.innerHTML = data[1] })
})
window.l10n.receive('fromMain_getText_return_title', (data) => {
	fsgUtil.query(`l10n[name="${data[0]}"]`).forEach((item) => {
		const buttonItem = item.closest('button')
		if ( buttonItem !== null ) {
			buttonItem.title = data[1]
			new bootstrap.Tooltip(buttonItem)
		} else {
			item.parentElement.title = data[1]
			new bootstrap.Tooltip(item.parentElement)
		}
	})
})
window.l10n.receive('fromMain_l10n_refresh', () => {
	fsgUtil.byId('lang-style-div').setAttribute('class', window.l10n.getText_sync('language_code'))
	processL10N()
})

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
	const checkList = [selectMod.split('--')[1]]

	select_lib.close_all(tableID)
	select_lib.click_only(tableID, checkList)
	select_lib.filter(tableID, filterText)
})


let lastLocale      = 'en'
let lastQuickLists  = {}
let searchStringMap = {}
let searchTagMap    = {}
let lastList        = null
let fullList        = {}

window.mods.receive('fromMain_modList', (opts) => {
	lastQuickLists  = {}
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
	lastLocale = opts.currentLocale

	fsgUtil.byId('lang-style-div').setAttribute('class', opts.currentLocale)

	const lastOpenAcc = document.querySelector('.accordion-collapse.show')
	const lastOpenID  = (lastOpenAcc !== null) ? lastOpenAcc.id : null
	const lastOpenQ   = (lastOpenAcc !== null) ? fsgUtil.byId('filter_input').value : ''
	const scrollStart = window.scrollY

	const selectedList = ( opts.activeCollection !== '999' && opts.activeCollection !== '0') ? `collection--${opts.activeCollection}` : opts.activeCollection
	const modTable     = []
	const optList      = []
	
	lastList = selectedList
	fullList = {}

	optList.push(fsgUtil.buildSelectOpt('0', `--${opts.l10n.disable}--`, selectedList, true))
	fullList[0] = `--${opts.l10n.disable}--`
	
	Object.keys(opts.modList).forEach((collection) => {
		const modRows      = []
		let   sizeOfFolder = 0

		opts.modList[collection].mods.forEach((thisMod) => {
			try {
				const displayBadges = thisMod.badgeArray || []
				const modId         = opts.modHub.list.mods[thisMod.fileDetail.shortName] || null
				const modVer        = opts.modHub.version[modId] || null
				const modColUUID    = `${collection}--${thisMod.uuid}`

				sizeOfFolder += thisMod.fileDetail.fileSize

				if ( Object.keys(thisMod.modDesc.binds).length > 0 ) {
					if ( typeof opts.bindConflict[collection][thisMod.fileDetail.shortName] !== 'undefined' ) {
						displayBadges.push('keys_bad')
					} else {
						displayBadges.push('keys_ok')
					}
				}
				if ( modVer !== null && thisMod.modDesc.version !== modVer) {
					displayBadges.push('update')
				}
				if ( opts.newMods.includes(thisMod.md5Sum) && !thisMod.canNotUse ) {
					displayBadges.push('new')
				}
				if ( modId !== null && opts.modHub.list.last.includes(modId) ) {
					displayBadges.push('recent')
				}
				if ( modId === null ) {
					displayBadges.push('nonmh')
				}

				if ( displayBadges.includes('broken') && displayBadges.includes('notmod') ) {
					const brokenIdx = displayBadges.indexOf('broken')
					displayBadges.splice(brokenIdx, brokenIdx !== -1 ? 1 : 0)
				}

				if ( ! metDepend(thisMod.modDesc.depend, collection, opts.modList[collection].mods) ) {
					displayBadges.unshift('depend')
				}

				searchStringMap[modColUUID] = [
					thisMod.fileDetail.shortName,
					thisMod.l10n.title,
					thisMod.modDesc.author
				].join(' ').toLowerCase()

				displayBadges.forEach((badge) => {
					if ( typeof searchTagMap?.[badge]?.push === 'function' ) {
						searchTagMap[badge].push(modColUUID)
					}
				})

				modRows.push(makeModRow(
					modColUUID,
					thisMod,
					displayBadges,
					modId
				))

			} catch (e) {
				window.log.notice(`Error building mod row: ${e}`, 'main')
			}
		})
		
		modTable.push(makeModCollection(
			collection,
			`${opts.modList[collection].name} <small>[${fsgUtil.bytesToHR(sizeOfFolder, opts.currentLocale)}]</small>`,
			modRows,
			fsgUtil.notesDefault(opts.notes, collection, 'notes_website'),
			fsgUtil.notesDefault(opts.notes, collection, 'notes_websiteDL', false),
			fsgUtil.notesDefault(opts.notes, collection, 'notes_tagline'),
			fsgUtil.notesDefault(opts.notes, collection, 'notes_admin'),
			opts.modList[collection].mods.length
		))
		const selectCollName = `${opts.modList[collection].name}${window.mods.getCollDesc(collection)}`
		
		optList.push(fsgUtil.buildSelectOpt(`collection--${collection}`, selectCollName, selectedList, false, opts.foldersMap[collection]))
		fullList[`collection--${collection}`] = selectCollName

	})
	optList.push(fsgUtil.buildSelectOpt('999', `--${opts.l10n.unknown}--`, selectedList, true))
	fullList[999] = `--${opts.l10n.unknown}--`
	fsgUtil.byId('collectionSelect').innerHTML = optList.join('')
	fsgUtil.byId('mod-collections').innerHTML  = modTable.join('')

	Object.keys(opts.notes).forEach((collection) => {
		const thisFav = opts?.notes[collection]?.notes_favorite || false
		if ( thisFav ) {
			const favFolder = document.querySelector(`[data-bs-target="#${collection}_mods"] svg`)
			favFolder.innerHTML += '<path d="m171,126.25l22.06,62.76l65.93,0l-54.22,35.49l21.94,61.46l-55.74,-38.21l-55.74,38.21l22.06,-61.46l-54.32,-35.49l66.06,0l21.94,-62.76l0.03,0z" fill="#7f7f00" id="svg_5"/>'
		}
	})

	const activeFolder = document.querySelector(`[data-bs-target="#${opts.activeCollection}_mods"] svg`)

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
	} catch { /* nope */ }

	select_lib.filter()
	processL10N()
})


function metDepend(depends, collection, collectionMods) {
	if ( typeof depends === 'undefined' || depends.length === 0 ) { return true }

	if ( typeof lastQuickLists[collection] === 'undefined' ) {
		lastQuickLists[collection] = new Set()
		collectionMods.forEach((mod) => {
			lastQuickLists[collection].add(mod.fileDetail.shortName)
		})
	}
	let hasAllDeps = true

	depends.forEach((thisDep) => {
		if ( ! lastQuickLists[collection].has(thisDep) ) {
			hasAllDeps = false
			return
		}
	})
	return hasAllDeps
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
	return `<tr class="mod-table-folder">
	<td class="folder-icon collapsed" ${fsgUtil.buildBS('toggle', 'collapse')} ${fsgUtil.buildBS('target', `#${id}_mods`)}>
		<div class="badge rounded-pill bg-primary bg-gradient position-absolute" style="width: 30px; font-size: 0.5em; transform: translateY(-20%)!important">${totCount}</div>
		${fsgUtil.getIconSVG('folder')}
	</td>
	<td class="folder-name collapsed" ${fsgUtil.buildBS('toggle', 'collapse')} ${fsgUtil.buildBS('target', `#${id}_mods`)}>
		<div class="d-inline-block">${name}${tagLine !== null ? `<br><span class="ps-3 small fst-italic">${tagLine}</span>` : ''}</div>
	</td>
	<td class="align-middle text-end">
		${ adminPass !== null ? `<button class="btn btn-secondary btn-sm me-2" onclick="window.mods.popClipboard('${adminPass}')">${getText('admin_pass_button')}</button>`: ''}
		${ website !== null ? `<a target="_blank" class="btn btn-secondary btn-sm me-2" href="${website}">${getText('admin_button')}</a>`: ''}
		${ dlEnabled ? `<button class="btn btn-secondary btn-sm me-2" onclick="window.mods.download('${id}')">${getText('download_button')}</button>`: ''}
		<button class="btn btn-dark btn-sm me-2" onclick="window.mods.exportList('${id}')">${getText('export_button')}</button>
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

function makeModRow(id, thisMod, badges, modId) {
	const badgeHTML = Array.from(badges, (badge) => fsgUtil.badge(false, badge))

	return `<tr onclick="select_lib.click_row('${id}')" ondblclick="window.mods.openMod('${id}')" oncontextmenu="window.mods.openMod('${id}')" class="mod-row${(modId!==null ? ' has-hash' : '')}${(thisMod.canNotUse===true)?' mod-disabled bg-opacity-25 bg-danger':''}" id="${id}">
	<td>
		<input type="checkbox" class="form-check-input mod-row-checkbox" id="${id}__checkbox">
	</td>
	<td style="width: 64px; height: 64px">
		<img class="img-fluid" src="${fsgUtil.iconMaker(thisMod.modDesc.iconImageCache)}" />
	</td>
	<td>
		<div class="bg-light"></div><span class="mod-short-name">${thisMod.fileDetail.shortName}</span><br /><small>${fsgUtil.escapeSpecial(thisMod.l10n.title)} - <em>${fsgUtil.escapeSpecial(thisMod.modDesc.author)}</em></small><div class="issue_badges">${badgeHTML.join(' ')}</div>
	</td>
	<td class="text-end pe-4">
		${fsgUtil.escapeSpecial(thisMod.modDesc.version)}<br /><em class="small">${( thisMod.fileDetail.fileSize > 0 ) ? fsgUtil.bytesToHR(thisMod.fileDetail.fileSize, lastLocale) : ''}</em>
	</td>
</tr>`
}

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

window.addEventListener('hide.bs.collapse', () => { select_lib.click_none() })
window.addEventListener('show.bs.collapse', () => { select_lib.click_none() })

const giantsLED = {	filters : [{ vendorId : fsgUtil.led.vendor, productId : fsgUtil.led.product }] }

async function spinLED()  { operateLED('spin') }
async function blinkLED() { operateLED('blink') }
async function operateLED(type = 'spin') {
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
		}, 2500)
	} catch (e) {
		window.log.debug(`Unable to spin LED (no light?) : ${e}`, 'main')
	}
}

let mismatchDialog = null

window.addEventListener('DOMContentLoaded', () => {
	processL10N()
	mismatchDialog = new bootstrap.Modal(document.getElementById('open_game_modal'), {backdrop : 'static'})
	mismatchDialog.hide()
})

window.addEventListener('click', () => {
	fsgUtil.query('.tooltip').forEach((tooltip) => { tooltip.remove() })
})
