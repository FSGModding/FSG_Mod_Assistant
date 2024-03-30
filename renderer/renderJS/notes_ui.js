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

	fsgUtil.clsHideFalse('is_active_collect', modCollect.opts.isActiveCollection)
	fsgUtil.clsHideFalse('multi_version', modCollect.appSettings.multi_version)

	fsgUtil.setById('collection_name', modCollect.collectionToName[thisCollection])

	for ( const element of fsgUtil.query('input') ) {
		let thisValue = ''
		
		let thisPlaceholder = modCollect.opts.lastGameSettings[element.id.replace('notes_', '')]
		
		if ( element.getAttribute('type') === 'text' || element.getAttribute('type') === 'password' ) {
			thisValue       = modCollect.collectionNotes[thisCollection][element.id]
			thisPlaceholder = ( thisValue !== null ) ? '' : thisPlaceholder

			element.placeholder = ( typeof thisPlaceholder !== 'undefined' ) ? thisPlaceholder : ''
			element.value =  ( typeof thisValue !== 'undefined' ) ? thisValue : ''
		}

		if ( element.getAttribute('type') === 'checkbox' ) {
			if ( element.id === 'notes_websiteVALID' ) { continue }
			thisValue       = modCollect.collectionNotes[thisCollection][element.id]

			if ( element.id.startsWith('notes_unit') && thisValue === null ) {
				thisValue = modCollect.opts.lastGameSettings?.[element.id.replace('notes_', '')]
			}
			element.checked = (thisValue !== '') ? thisValue : false
		}
		if ( element.getAttribute('type') === 'radio' ) {
			thisValue       = modCollect.collectionNotes[thisCollection][element.getAttribute('name')]
			element.checked = thisValue === element.value
		}

		clientCheckValid(element.id)
	}
	
	fsgUtil.byId('notes_unit_money').value = modCollect.collectionNotes[thisCollection].notes_unit_money ?? modCollect.opts.lastGameSettings.unit_money
	fsgUtil.byId('notes_version').value    = modCollect.collectionNotes[thisCollection].notes_version

	fsgUtil.setById('notes_notes', modCollect.collectionNotes?.[thisCollection]?.notes_notes || '')

	processL10N()
})

function clientToggleVisible(id) {
	const formControl = fsgUtil.byId(id)
	const eyeButton   = fsgUtil.byId(`${id}_toggle`)
	const doVisible   = formControl.getAttribute('type') === 'password'

	formControl.setAttribute('type', doVisible ? 'text' : 'password')
	eyeButton.innerHTML = `<i class="bi-${doVisible ? 'eye-slash' : 'eye'}"></i>`
}

function clientCheckValid(id, inProgress = false) {
	
	const formControl  = fsgUtil.byId(id)
	const formValue    = formControl.value
	const formFeedback = fsgUtil.byId(`${id}_feedback`)

	let validCheck = true

	switch ( id ) {
		case 'notes_website' :
			try {
				const parsedURL   = new URL('', formValue)
				if ( (parsedURL.protocol !== 'http:' && parsedURL.protocol !== 'https:') || parsedURL.pathname !== '/' ) {
					validCheck = false
				}
			} catch {
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

function clientSetColor() {
	const checkValue = fsgUtil.query('[name="notes_color"]:checked')?.[0]?.value ?? null

	if ( checkValue !== null ) {
		window.mods.setNote('notes_color', checkValue, thisCollection)
	}
}

function clientSetNote(id) {
	const forceValid  = fsgUtil.byId('notes_websiteVALID').checked
	const formControl = fsgUtil.byId(id)

	if ( id === 'notes_website' && forceValid ) {
		try {
			const parsedURL   = new URL('', formControl.value)
			formControl.value = new URL('/', parsedURL.origin).href
		} catch {
			/* do nothing? */
		}
	}
	
	if ( id === 'notes_fsg_bot' ) {
		formControl.value = formControl.value.split(/\D+/).filter((x) => x.length !== 0 ).join('-')
	}
	
	if ( formControl.getAttribute('type') === 'checkbox' ) {
		window.mods.setNote(id, formControl.checked, thisCollection)
	} else {
		window.mods.setNote(id, formControl.value, thisCollection)
	}
}

window.addEventListener('DOMContentLoaded', () => {
	const colorLabels = fsgUtil.query('.notes-color-label')
	for ( const thisLabel of colorLabels ) {
		const thisNum = parseInt(thisLabel.getAttribute('for').replace('notes_color', ''))
		thisLabel.innerHTML = fsgUtil.getIconSVG('folder', false, false, false, thisNum, true)
	}
})

window.onbeforeunload = (e) => {
	if ( document.activeElement.tagName === 'INPUT' ) {
		e.returnValue = false
		document.activeElement.blur()
		setTimeout(() => { window.close()}, 250)
	}
}