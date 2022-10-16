/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main Window UI

/* global l10n, fsgUtil, bootstrap */

let loadingModal = null
let listModal    = null

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
		item.closest('button').title = data[1]
		new bootstrap.Tooltip(item.closest('button'))
	})
})
window.l10n.receive('fromMain_l10n_refresh', () => { processL10N() })

window.mods.receive('fromMain_loadingTotal', (count) => { fsgUtil.byId('count_total').innerHTML = count })
window.mods.receive('fromMain_loadingDone',  (count) => { fsgUtil.byId('count_done').innerHTML  = count })
window.mods.receive('fromMain_showLoading',  () => { loadingModal.show() })
window.mods.receive('fromMain_hideLoading',  () => { loadingModal.hide() })
window.mods.receive('fromMain_showListSet',  () => { listModal.show() })
window.mods.receive('fromMain_hideListSet',  () => { listModal.hide() })

window.mods.receive('fromMain_modList', (modList, extraL10n, currentList, modFoldersMap, newList) => {
	const selectedList = ( currentList !== '999' && currentList !== '0') ? `collection--${currentList}` : currentList
	const modTable     = []
	const optList      = []
	
	optList.push(fsgUtil.buildSelectOpt('0', `--${extraL10n[0]}--`, selectedList, true))
	
	Object.keys(modList).forEach((collection) => {
		const modRows = []
		modList[collection].mods.forEach((thisMod) => {
			const theseBadges = ( newList.includes(thisMod.md5Sum) ) ?
				`${thisMod.badges}<span class="badge bg-success"><l10n name="mod_badge_new"></l10n></span>` :
				thisMod.badges
			
			modRows.push(makeModRow(
				`${collection}--${thisMod.uuid}`,
				thisMod.fileDetail.shortName,
				thisMod.l10n.title,
				thisMod.modDesc.version,
				theseBadges,
				thisMod.canNotUse
			))
		})
		modTable.push(makeModCollection(
			collection,
			`${modList[collection].name} (${modList[collection].mods.length})`,
			modRows
		))
		optList.push(fsgUtil.buildSelectOpt(`collection--${collection}`, modList[collection].name, selectedList, false, modFoldersMap[collection]))

	})
	optList.push(fsgUtil.buildSelectOpt('999', `--${extraL10n[1]}--`, selectedList, true))
	fsgUtil.byId('collectionSelect').innerHTML = optList.join('')
	fsgUtil.byId('mod-collections').innerHTML  = modTable.join('')

	const activeFolder = document.querySelector(`[data-bs-target="#${currentList}_mods"] svg`)
	if ( activeFolder !== null ) {
		activeFolder.innerHTML += '<polygon fill="#43A047" points="290.088 61.432 117.084 251.493 46.709 174.18 26.183 197.535 117.084 296.592 310.614 83.982"></polygon>'
	}
	
	
	lastModSelect   = null
	lastTableSelect = null
	processL10N()
})


let lastModSelect   = null
let lastTableSelect = null


function updateModFilesColor() {
	const allModRows = document.querySelectorAll('.mod-row')

	allModRows.forEach((thisRow) => {
		const thisColor = thisRow.childNodes[0].childNodes[0].checked
		thisRow.querySelectorAll('td').forEach((thisTD) => {
			thisTD.classList[( thisColor===true ? 'add' : 'remove' )]('table-success')
		})
	})
}


function fileListClick(event) {
	if (event.target.tagName === 'INPUT' && event.target.classList.contains('folder_master_check') ) {
		const thisModTable = document.getElementById(event.target.getAttribute('data-bs-target').substring(1)).querySelectorAll('input[type="checkbox"]')
		thisModTable.forEach((thisCheckBox) => {
			if ( ! thisCheckBox.parentElement.parentElement.classList.contains('disabled') ) {
				thisCheckBox.checked = event.target.checked
			}
		})

		const moveButtons = fsgUtil.byId('moveButtons').querySelectorAll('button')

		moveButtons.forEach((button) =>{
			button.classList[(event.target.checked)?'remove':'add']('disabled')
		})

		lastModSelect   = null
		lastTableSelect = null
		updateModFilesColor()
	}

	if (event.target.tagName === 'TD' && event.target.parentElement.classList.contains('mod-row') ) {
		const thisTable = event.target.closest('table').closest('tr').id
		const checkBox  = event.target.parentElement.querySelectorAll('input')[0]

		if ( lastTableSelect !== null && lastTableSelect !== thisTable ) {
			lastModSelect   = null
			lastTableSelect = thisTable
		}

		if ( !event.shiftKey || lastModSelect === null || event.target.parentElement.id === lastModSelect ) {
			checkBox.checked = !checkBox.checked
			lastModSelect    = event.target.parentElement.id
		} else {
			const thisModSelection = event.target.parentElement.parentElement.querySelectorAll('tr')
			let thisPosition = null
			let lastPosition = null

			for ( let i=0; i<thisModSelection.length; i++ ) {
				if (thisModSelection[i].id === event.target.parentElement.id ) {
					thisPosition = i
				}
				if (thisModSelection[i].id === lastModSelect ) {
					lastPosition = i
				}
			}

			const positionTestStart = Math.min(thisPosition, lastPosition)
			const positionTestEnd   = Math.max(thisPosition, lastPosition)
			const checkValue        = thisModSelection[lastPosition].querySelectorAll('input')[0].checked

			for ( let i=positionTestStart; i<=positionTestEnd; i++) {
				thisModSelection[i].querySelectorAll('input')[0].checked = checkValue
			}
			lastModSelect = null
		}

		let allChecked   = true
		let noneChecked  = true
		const oneChecked = (document.querySelectorAll('.mod-row input[type="checkbox"]:checked').length === 1)

		const thisModTable = event.target.closest('table').querySelectorAll('input[type="checkbox"]')

		thisModTable.forEach((thisCheckBox) => {
			if ( ! thisCheckBox.parentElement.parentElement.classList.contains('disabled') ) {
				if ( thisCheckBox.checked ) {
					noneChecked = false
				} else {
					allChecked = false
				}
			}
		})

		const tableCheck = event.target.closest('table').parentElement.closest('table').querySelectorAll(`input[data-bs-target="#${thisTable}"]`)[0]

		tableCheck.indeterminate = ! ( allChecked || noneChecked )

		if ( allChecked ) {
			tableCheck.checked = true
		} else if ( noneChecked ) {
			tableCheck.checked = false
		}

		const moveButtons = fsgUtil.byId('moveButtons').querySelectorAll('button')

		moveButtons[0].classList[(!noneChecked)?'remove':'add']('disabled')
		moveButtons[1].classList[(!noneChecked)?'remove':'add']('disabled')
		moveButtons[2].classList[(!noneChecked)?'remove':'add']('disabled')
		moveButtons[3].classList[(oneChecked)?'remove':'add']('disabled')
		
		updateModFilesColor()
	}
}

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

function makeModCollection(id, name, modsRows) {
	const tableHTML = []
	
	tableHTML.push(fsgUtil.buildTR('mod-table-folder'))
	tableHTML.push(fsgUtil.buildTD('folder-icon collapsed', [['toggle', 'collapse'], ['target', `#${id}_mods`]]))
	tableHTML.push(`${fsgUtil.getIconSVG('folder')}</td>`)
	tableHTML.push(fsgUtil.buildTD('folder-name collapsed', [['toggle', 'collapse'], ['target', `#${id}_mods`]]))
	tableHTML.push(`${name}</td>`)
	tableHTML.push('<td class="text-end">')
	tableHTML.push(`<button class="btn btn-primary btn-sm me-2" onclick="window.mods.openSave('${id}')"><l10n name="check_save"></l10n></button>`)
	tableHTML.push(`<input type="checkbox" data-bs-target="#${id}_mods" class="align-middle form-check-input mod-folder-checkbox folder_master_check">`)
	tableHTML.push('</td></tr>')

	tableHTML.push(fsgUtil.buildTR('mod-table-folder-detail collapse accordion-collapse', `${id}_mods`, 'data-bs-parent=".table"'))
	tableHTML.push('<td class="mod-table-folder-details-indent"></td>')
	tableHTML.push('<td class="mod-table-folder-details px-0" colspan="2">')
	tableHTML.push(`<table class="w-100 py-0 my-0 table table-sm table-hover table-striped">${modsRows.join('')}</table>`)
	tableHTML.push('</td></tr>')
	return tableHTML.join('')
}

function makeModRow(id, name, title, version, badges, disabled = false) {
	return `<tr oncontextmenu="window.mods.openMod('${id}')" onDblClick="window.mods.openMod('${id}')" class="mod-row${(disabled===true)?' mod-disabled bg-opacity-25 bg-danger':''}" id="${id}"><td><input type="checkbox" class="form-check-input"></td><td>${name}<br /><small>${title}</small><div class="issue_badges">${badges}</div></td><td class="text-end pe-4">${version}</td></tr>`
}


function clientBatchOperation(mode) {
	const selectedMods = []
	const allModRows   = document.querySelectorAll('.mod-row')

	allModRows.forEach((thisRow) => {
		if ( thisRow.childNodes[0].childNodes[0].checked ) {
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
		default:
			console.log('inconceivable!')
			break
	}
}

function deSelectAll() {
	const moveButtons = fsgUtil.byId('moveButtons').querySelectorAll('button')
	const allModRows  = document.querySelectorAll('.mod-row')
	const tableChecks = document.querySelectorAll('.folder_master_check')

	tableChecks.forEach((thisCheck) => { thisCheck.checked = false; thisCheck.indeterminate = false })
	allModRows.forEach( (thisRow)   => { thisRow.childNodes[0].childNodes[0].checked = false })
	moveButtons.forEach((button)    => { button.classList.add('disabled') })

	updateModFilesColor()
}

window.addEventListener('hide.bs.collapse', () => { deSelectAll() })
window.addEventListener('show.bs.collapse', () => { deSelectAll() })

window.addEventListener('DOMContentLoaded', () => {
	loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'))
	listModal    = new bootstrap.Modal(document.getElementById('setModel'))
	processL10N()
})

window.addEventListener('click', (event) => {
	document.querySelectorAll('.tooltip').forEach((tooltip) => {
		tooltip.remove()
	})
	fileListClick(event)
})

window.addEventListener('scroll', () => {
	const scrollValue = this.scrollY +  140
	const moveButtons = fsgUtil.byId('moveButtons')
	try {
		moveButtons.style.top = `${scrollValue}px`
	} catch { return }
})
