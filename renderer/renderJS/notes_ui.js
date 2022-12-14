/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Folder window UI

/* global l10n, fsgUtil */

/*  __ ____   ______        
   |  |_   | |      |.-----.
   |  |_|  |_|  --  ||     |
   |__|______|______||__|__| */

let thisCollection = null

function processL10N()          { clientGetL10NEntries() }
function clientGetL10NEntries() {
	const l10nSendItems = new Set()

	fsgUtil.query('l10n').forEach((thisL10nItem) => {
		l10nSendItems.add(fsgUtil.getAttribNullError(thisL10nItem, 'name'))
	})

	l10n.getText_send(l10nSendItems)
}

window.l10n.receive('fromMain_getText_return', (data) => {
	fsgUtil.query(`l10n[name="${data[0]}"]`).forEach((item) => { item.innerHTML = data[1] })
})
window.l10n.receive('fromMain_l10n_refresh', () => { processL10N() })

window.mods.receive('fromMain_collectionName', (collection, collectionName, allNotes, lastGameSettings) => {
	thisCollection = collection
	fsgUtil.byId('collection_name').innerHTML = collectionName

	fsgUtil.query('input').forEach((element) => {
		let thisValue = ''
		
		let thisPlaceholder = lastGameSettings[element.id.replace('notes_', '')]
		if ( typeof allNotes[collection] !== 'undefined' ) {
			thisValue       = allNotes[collection][element.id]
			thisPlaceholder = ( typeof thisValue !== 'undefined' ) ? '' : thisPlaceholder
		}
		if ( element.getAttribute('type') === 'checkbox' ) {
			element.checked = (thisValue !== '') ? thisValue : false
		} else {
			element.placeholder = ( typeof thisPlaceholder !== 'undefined' ) ? thisPlaceholder : ''
			element.value =  ( typeof thisValue !== 'undefined' ) ? thisValue : ''
		}

		clientCheckValid(element.id)
	})
	
	if ( typeof allNotes[collection] !== 'undefined' ) {
		fsgUtil.byId('notes_notes').innerHTML = allNotes[collection].notes_notes || ''
	}

	processL10N()
})

function clientCheckValid(id, inProgress = false) {
	
	const formControl  = fsgUtil.byId(id)
	const formValue    = formControl.value
	const formFeedback = fsgUtil.byId(`${id}_feedback`)

	let validCheck = true

	switch ( id ) {
		case 'notes_website' :
			if (! ( formValue === '' || ( formValue.startsWith('http') && formValue.endsWith('/') ))) {
				validCheck = false
			}
			break
		case 'notes_password' :
			if ( formValue.length > 16 ) { validCheck = false }
			break
		case 'notes_username' :
			if ( formValue.length > 30 ) { validCheck = false }
			break
		default :
			break
	}

	if ( formFeedback !== null ) {
		if ( validCheck ) {
			formFeedback.classList.add('d-none')
		} else {
			formFeedback.classList.remove('d-none')
		}
	}

	if ( validCheck && !inProgress ) {
		formControl.classList.add('is-valid')
		formControl.classList.remove('is-invalid')
	} else {
		formControl.classList.remove('is-valid')
		formControl.classList.add('is-invalid')
	}
}

function clientMarkIP(id) {
	clientCheckValid(id, true)
}
function clientSetNote(id) {
	const formControl = fsgUtil.byId(id)
	
	if ( formControl.getAttribute('type') === 'checkbox' ) {
		window.mods.setNote(id, formControl.checked, thisCollection)
	} else {
		window.mods.setNote(id, formControl.value, thisCollection)
	}
}