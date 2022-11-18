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

function processL10N()          { clientGetL10NEntries(); l10n.langList_send() }
function clientChangeL10N()     { l10n.langList_change(fsgUtil.byId('language_select').value) }
function clientGetL10NEntries() {
	const l10nSendItems = new Set()

	fsgUtil.query('l10n').forEach((thisL10nItem) => {
		l10nSendItems.add(fsgUtil.getAttribNullError(thisL10nItem, 'name'))
	})

	l10n.getText_send(l10nSendItems)
}

window.l10n.receive('fromMain_langList_return', (listData, selected) => {
	fsgUtil.byId('language_select').innerHTML = listData.map((x) => {
		return fsgUtil.buildSelectOpt(x[0], x[1], selected)
	}).join('')
})
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
window.l10n.receive('fromMain_l10n_refresh', () => { processL10N() })

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


let lastLocale = 'en'

window.mods.receive('fromMain_modList', (currLocale, modList, extraL10n, currentList, modFoldersMap, newList, modHubList, modHubVersion, bindConflict, notes) => {
	lastLocale = currLocale

	const lastOpenAcc = document.querySelector('.accordion-collapse.show')
	const lastOpenID  = (lastOpenAcc !== null) ? lastOpenAcc.id : null
	const lastOpenQ   = (lastOpenAcc !== null) ? lastOpenAcc.querySelector('input.mod-row-filter').value : ''
	const scrollStart = window.scrollY

	const selectedList = ( currentList !== '999' && currentList !== '0') ? `collection--${currentList}` : currentList
	const modTable     = []
	const optList      = []
	
	optList.push(fsgUtil.buildSelectOpt('0', `--${extraL10n[0]}--`, selectedList, true))
	
	Object.keys(modList).forEach((collection) => {
		const modRows      = []
		let   sizeOfFolder = 0

		modList[collection].mods.forEach((thisMod) => {
			const extraBadges = []
			const modId       = modHubList.mods[thisMod.fileDetail.shortName] || null
			const modVer      = modHubVersion[modId] || null

			sizeOfFolder += thisMod.fileDetail.fileSize

			if ( Object.keys(thisMod.modDesc.binds).length > 0 ) {
				if ( typeof bindConflict[collection][thisMod.fileDetail.shortName] !== 'undefined' ) {
					extraBadges.push(fsgUtil.badge('danger', 'keys_bad'))
				} else {
					extraBadges.push(fsgUtil.badge('success', 'keys_ok'))
				}
			}
			if ( modVer !== null && thisMod.modDesc.version !== modVer) {
				extraBadges.push(fsgUtil.badge('light', 'update'))
			}
			if ( newList.includes(thisMod.md5Sum) && !thisMod.canNotUse ) {
				extraBadges.push(fsgUtil.badge('success', 'new'))
			}
			if ( modId !== null && modHubList.last.includes(modId) ) {
				extraBadges.push(fsgUtil.badge('success', 'recent'))
			}
			if ( modId === null ) {
				extraBadges.push(fsgUtil.badge('dark', 'nonmh'))
			}

			let theseBadges = thisMod.badges + extraBadges.join('')

			if ( theseBadges.match('mod_badge_broken') && theseBadges.match('mod_badge_notmod') ) {
				theseBadges = theseBadges.replace(fsgUtil.badge('danger', 'broken'), '')
			}

			modRows.push(makeModRow( `${collection}--${thisMod.uuid}`, thisMod, theseBadges, modId))

		})

		let collWebsite = ''
		let collDL      = false
		if ( typeof notes[collection] !== 'undefined' && typeof notes[collection].notes_websiteDL !== 'undefined' ) {
			collDL = notes[collection].notes_websiteDL
		}
		if ( typeof notes[collection] !== 'undefined' && typeof notes[collection].notes_website !== 'undefined' ) {
			collWebsite = notes[collection].notes_website
		}
		
		modTable.push(makeModCollection(
			collection,
			`${modList[collection].name} <small>[${modList[collection].mods.length}] [${fsgUtil.bytesToHR(sizeOfFolder, currLocale)}]</small>`,
			modRows,
			collWebsite,
			collDL
		))
		optList.push(fsgUtil.buildSelectOpt(`collection--${collection}`, modList[collection].name, selectedList, false, modFoldersMap[collection]))

	})
	optList.push(fsgUtil.buildSelectOpt('999', `--${extraL10n[1]}--`, selectedList, true))
	fsgUtil.byId('collectionSelect').innerHTML = optList.join('')
	fsgUtil.byId('mod-collections').innerHTML  = modTable.join('')

	Object.keys(notes).forEach((collection) => {
		const thisFav = notes[collection].notes_favorite || false
		if ( thisFav ) {
			const favFolder = document.querySelector(`[data-bs-target="#${collection}_mods"] svg`)
			favFolder.innerHTML += '<path d="m171,126.25l22.06,62.76l65.93,0l-54.22,35.49l21.94,61.46l-55.74,-38.21l-55.74,38.21l22.06,-61.46l-54.32,-35.49l66.06,0l21.94,-62.76l0.03,0z" fill="#7f7f00" id="svg_5"/>'
		}
	})

	const activeFolder = document.querySelector(`[data-bs-target="#${currentList}_mods"] svg`)
	if ( activeFolder !== null ) {
		activeFolder.innerHTML += '<polygon fill="#43A047" points="290.088 61.432 117.084 251.493 46.709 174.18 26.183 197.535 117.084 296.592 310.614 83.982"></polygon>'
	}

	select_lib.clear_range()

	try {
		document.querySelectorAll(`[data-bs-target="#${lastOpenID}"]`).forEach((element) => {
			element.classList.remove('collapsed')
		})
		document.getElementById(lastOpenID).classList.add('show')
		if ( lastOpenQ !== '' ) {
			document.getElementById(lastOpenID).querySelector('input.mod-row-filter').value = lastOpenQ
			select_lib.filter(lastOpenID)
		}
		window.scrollTo(0, scrollStart)
	} catch { /* nope */ }

	processL10N()
})


function clientMakeListInactive() {
	fsgUtil.byId('collectionSelect').value = 0
	window.mods.makeInactive()
}

function clientMakeListActive() {
	const activePick = fsgUtil.byId('collectionSelect').value.replace('collection--', '')

	if ( activePick !== '0' && activePick !== '999' ) {
		window.mods.makeActive(activePick)
	}
}

function makeModCollection(id, name, modsRows, website, dlEnabled) {
	return `<tr class="mod-table-folder">
	<td class="folder-icon collapsed" ${fsgUtil.buildBS('toggle', 'collapse')} ${fsgUtil.buildBS('target', `#${id}_mods`)}>
		${fsgUtil.getIconSVG('folder')}
	</td>
	<td class="folder-name collapsed" ${fsgUtil.buildBS('toggle', 'collapse')} ${fsgUtil.buildBS('target', `#${id}_mods`)}>
		${name}
	</td>
	<td class="text-end">
		${ website !== '' ? `<a target="_blank" class="btn btn-secondary btn-sm me-2" href="${website}">${getText('admin_button')}</a>`: ''}
		${ dlEnabled ? `<button class="btn btn-secondary btn-sm me-2" onclick="window.mods.download('${id}')">${getText('download_button')}</button>`: ''}
		<button class="btn btn-dark btn-sm me-2" onclick="window.mods.exportList('${id}')">${getText('export_button')}</button>
		<button class="btn btn-primary btn-sm me-2" onclick="window.mods.openNotes('${id}')">${getText('notes_button')}</button>
		<button class="btn btn-primary btn-sm me-2" onclick="window.mods.openSave('${id}')">${getText('check_save')}</button>
	</td>
</tr>
<tr class="mod-table-folder-detail collapse accordion-collapse" data-bs-parent="#mod-collections" id="${id}_mods">
	<td class="mod-table-folder-details px-0 ps-4" colspan="3">
		<table class="w-100 py-0 my-0 table table-sm table-hover table-striped">
			<tr>
				<td colspan="4">
					<div class="row g-2 mb-1">
						<div class="col">
							<div class="input-group input-group-sm mb-0">
								<span class="input-group-text bg-gradient">${getText('filter_only')}</span>
								<input type="text" id="${id}_mods__filter" onkeyup="select_lib.filter('${id}_mods')" class="form-control mod-row-filter">
								<span id="${id}_mods__filter_clear" onclick="clientClearInput('${id}_mods__filter')" class="form-control-clear gg-erase form-control-feedback position-absolute d-none" style="right:10px; cursor:pointer; z-index:100; top:5px; color:black;"></span>
							</div>
						</div>
						<div class="col col-auto">
							<div class="btn-group btn-group-sm">
								<input type="checkbox" id="${id}_mods__show_non_mod" onchange="select_lib.filter('${id}_mods')" class="btn-check mod-row-filter_check" autocomplete="off" checked>
								<label class="btn btn-outline-success" for="${id}_mods__show_non_mod">${getText('show_non_mod')}</label>

								<input type="checkbox" id="${id}_mods__show_broken" onchange="select_lib.filter('${id}_mods')" class="btn-check mod-row-filter_check" autocomplete="off" checked>
								<label class="btn btn-outline-success" for="${id}_mods__show_broken">${getText('show_broken')}</label>
							</div>
						</div>
						<div class="col col-auto">
							<div class="btn-group btn-group-sm input-group input-group-sm">
								<span class="input-group-text">${getText('select_pick')}</span>
								<button class="btn btn-btn btn-outline-light" onclick="select_lib.click_none('${id}_mods')">${getText('select_none')}</button>
								<button class="btn btn-btn btn-outline-light" onclick="select_lib.click_all('${id}_mods')">${getText('select_all')}</button>
								<button class="btn btn-btn btn-outline-light" onclick="select_lib.click_invert('${id}_mods')">${getText('select_invert')}</button>
							</div>
						</div>
					</div>
				</td>
			</tr>
			${modsRows.join('')}
		</table>
	</td>
</tr>`
}


function makeModRow(id, thisMod, badges, modId) {
	return `<tr onclick="select_lib.click_row('${id}')" ondblclick="window.mods.openMod('${id}')" oncontextmenu="window.mods.openMod('${id}')" class="mod-row${(modId!==null ? ' has-hash' : '')}${(thisMod.canNotUse===true)?' mod-disabled bg-opacity-25 bg-danger':''}" id="${id}">
	<td>
		<input type="checkbox" class="form-check-input mod-row-checkbox" id="${id}__checkbox">
	</td>
	<td style="width: 64px; height: 64px">
		<img class="img-fluid" src="${fsgUtil.iconMaker(thisMod.modDesc.iconImageCache)}" />
	</td>
	<td>
		<div class="bg-light"></div>${thisMod.fileDetail.shortName}<br /><small>${thisMod.l10n.title} - <em>${thisMod.modDesc.author}</em></small><div class="issue_badges">${badges}</div>
	</td>
	<td class="text-end pe-4">
		${thisMod.modDesc.version}<br /><em class="small">${( thisMod.fileDetail.fileSize > 0 ) ? fsgUtil.bytesToHR(thisMod.fileDetail.fileSize, lastLocale) : ''}</em>
	</td>
</tr>`
}


function clientClearInput(id) {
	const filterId = id.replace('__filter', '')
	fsgUtil.byId(id).value = ''
	select_lib.filter(filterId)
}

function clientBatchOperation(mode) {
	const selectedMods = []
	const allModRows   = fsgUtil.query('.mod-row')

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
			if ( selectedMods.length === 1 ) { window.mods.openMods(selectedMods) }
			break
		case 'hub':
			if ( selectedMods.length === 1 ) { window.mods.openHub(selectedMods) }
			break
		default:
			break
	}
}

window.addEventListener('hide.bs.collapse', () => { select_lib.clear_all() })
window.addEventListener('show.bs.collapse', () => { select_lib.clear_all() })

window.addEventListener('DOMContentLoaded', () => {	processL10N() })

window.addEventListener('click', () => {
	fsgUtil.query('.tooltip').forEach((tooltip) => { tooltip.remove() })
})

window.addEventListener('scroll', () => {
	const scrollValue = this.scrollY +  120
	const moveButtons = fsgUtil.byId('moveButtons')
	try {
		moveButtons.style.top = `${scrollValue}px`
	} catch { return }
})
