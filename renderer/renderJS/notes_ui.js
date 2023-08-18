/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Folder window UI

/* global processL10N, fsgUtil */

let thisCollection = null

window.mods.receive('fromMain_collectionName', (modCollect) => {
	thisCollection = modCollect.opts.collectKey

	if ( !modCollect.appSettings.multi_version ) {
		fsgUtil.byId('multi_version').classList.add('d-none')
	}
	
	fsgUtil.byId('collection_name').innerHTML = modCollect.collectionToName[thisCollection]

	for ( const element of fsgUtil.query('input') ) {
		let thisValue = ''
		
		let thisPlaceholder = modCollect.opts.lastGameSettings[element.id.replace('notes_', '')]
		
		if ( element.getAttribute('type') === 'text' ) {
			thisValue       = modCollect.collectionNotes[thisCollection][element.id]
			thisPlaceholder = ( thisValue !== null ) ? '' : thisPlaceholder

			element.placeholder = ( typeof thisPlaceholder !== 'undefined' ) ? thisPlaceholder : ''
			element.value =  ( typeof thisValue !== 'undefined' ) ? thisValue : ''
		}

		if ( element.getAttribute('type') === 'checkbox' ) {
			thisValue       = modCollect.collectionNotes[thisCollection][element.id]

			if ( element.id.startsWith('notes_unit') && thisValue === null ) {
				thisValue = modCollect.opts.lastGameSettings?.[element.id.replace('notes_', '')]
			}
			element.checked = (thisValue !== '') ? thisValue : false
		}

		clientCheckValid(element.id)
	}
	
	fsgUtil.byId('notes_unit_money').value = modCollect.collectionNotes[thisCollection].notes_unit_money ?? modCollect.opts.lastGameSettings.unit_money
	fsgUtil.byId('notes_version').value    = modCollect.collectionNotes[thisCollection].notes_version

	fsgUtil.byId('notes_notes').innerHTML = modCollect.collectionNotes?.[thisCollection]?.notes_notes || ''

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
		formControl.classList.remove('is-inprogress', 'is-invalid')
		formControl.classList.add('is-valid')
	} else if ( inProgress ) {
		formControl.classList.remove('is-valid', 'is-invalid')
		formControl.classList.add('is-inprogress')
	} else {
		formControl.classList.remove('is-valid', 'is-inprogress')
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