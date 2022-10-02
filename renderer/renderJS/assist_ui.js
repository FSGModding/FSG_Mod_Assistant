/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main Window UI

/* global l10n, fsgUtil */


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
window.l10n.receive('fromMain_l10n_refresh', () => { processL10N() })






let lastModSelect   = null
let lastTableSelect = null
let lastListSelect  = null


function updateModFilesColor() {
	const allModRows = document.querySelectorAll('.mod-row')

	allModRows.forEach((thisRow) => {
		const thisColor = thisRow.childNodes[0].childNodes[0].checked
		thisRow.querySelectorAll('td').forEach((thisTD) => {
			thisTD.classList[( thisColor===true ? 'add' : 'remove' )]('table-success')
		})
	})
}

function updateModListColor() {
	const allModRows = document.querySelectorAll('.mod-list-row')

	allModRows.forEach((thisRow) => {
		const thisColor = thisRow.childNodes[0].childNodes[0].checked
		thisRow.querySelectorAll('td').forEach((thisTD) => {
			thisTD.classList[( thisColor===true ? 'add' : 'remove' )]('table-success')
		})
	})
}

function modListClick(event) {
	if (event.target.tagName === 'TD' && event.target.parentElement.className === 'mod-list-row') {
		const checkBox  = event.target.parentElement.querySelectorAll('input')[0]

		if ( !event.shiftKey || lastListSelect === null || event.target.parentElement.id === lastListSelect ) {
			checkBox.checked = !checkBox.checked
			lastListSelect    = event.target.parentElement.id
		} else {
			const thisModSelection = event.target.parentElement.parentElement.querySelectorAll('tr')
			let thisPosition = null
			let lastPosition = null

			for ( let i=0; i<thisModSelection.length; i++ ) {
				if (thisModSelection[i].id === event.target.parentElement.id ) {
					thisPosition = i
				}
				if (thisModSelection[i].id === lastListSelect ) {
					lastPosition = i
				}
			}

			const positionTestStart = Math.min(thisPosition, lastPosition)
			const positionTestEnd   = Math.max(thisPosition, lastPosition)
			const checkValue        = thisModSelection[lastPosition].querySelectorAll('input')[0].checked

			for ( let i=positionTestStart; i<=positionTestEnd; i++) {
				thisModSelection[i].querySelectorAll('input')[0].checked = checkValue
			}
			lastListSelect = null
		}
		updateModListColor()
	}
}


function fileListClick(event) {
	if (event.target.tagName === 'INPUT' && event.target.className === 'form-check-input mod-folder-checkbox') {
		const thisModTable = document.getElementById(event.target.getAttribute('data-bs-target').substring(1)).querySelectorAll('input[type="checkbox"]')
		thisModTable.forEach((thisCheckBox) => {
			thisCheckBox.checked = event.target.checked
		})
		lastModSelect   = null
		lastTableSelect = null
		updateModFilesColor()
	}

	if (event.target.tagName === 'TD' && event.target.parentElement.className === 'mod-row') {
		const thisTable = event.target.closest('table').closest('tr').id
		const checkBox  = event.target.parentElement.querySelectorAll('input')[0]
		
		event.target.closest('table').parentElement.closest('table').querySelectorAll(`input[data-bs-target="#${thisTable}"]`)[0].indeterminate = true

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
		updateModFilesColor()
	}
}



window.addEventListener('DOMContentLoaded', () => {
	processL10N()
})

window.addEventListener('click', (event) => {
	fileListClick(event)
	modListClick(event)
})

window.addEventListener('scroll', () => {
	const scrollValue = this.scrollY +  140
	const moveButtons = fsgUtil.byId('moveButtons')
	try {
		moveButtons.style.top = `${scrollValue}px`
	} catch { return }
})
