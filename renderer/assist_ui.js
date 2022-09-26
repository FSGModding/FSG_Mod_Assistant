/* _______           __ _______               __         __   
  |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
  |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
  |__|_|__||_____|_____|___|___||_____|_____||__||_____||____| */

// l10n Client Side Interface

// (c) 2022 FSG Modding

/* global ipc */

const byId = function( id ) { return document.getElementById( id ) }

let lastModSelect   = null
let lastTableSelect = null
let lastListSelect  = null

function getAttribNullError(element, attrib) {
	const attribValue = element.getAttribute(attrib)

	if ( typeof attribValue === 'undefined' || attribValue === null ) {
		throw new TypeError('l10n name not defined')
	} else {
		return attribValue
	}
}

function clientGetL10NEntries() {
	const l10nItems    = document.querySelectorAll('l10n')
	const l10nFunction = typeof ipc === 'function' ? ipc.getL10nText : ((text) => {return text})
	l10nItems.forEach((thisL10nItem) => {
		try {
			thisL10nItem.innerText = l10nFunction(getAttribNullError(thisL10nItem, 'name'))
		} catch (err) {
			if (err instanceof TypeError) {
				console.log(`-- ${err.message}`)
				console.log(`--- Item: ${thisL10nItem.outerHTML}`)
				console.log(`--- Parent: ${thisL10nItem.parentElement.outerHTML}`)
			} else {
				throw err
			}
		}
	})
}

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
	clientGetL10NEntries()
})

window.addEventListener('click', (event) => {
	fileListClick(event)
	modListClick(event)
})

window.addEventListener('scroll', () => {
	const scrollValue = this.scrollY +  140
	const moveButtons = byId('moveButtons')
	try {
		moveButtons.style.top = `${scrollValue}px`
	} catch { return }
})
