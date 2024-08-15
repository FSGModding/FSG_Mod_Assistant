/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */
// MARK: NOTES UI
/* global MA, DATA */

let collectKey = null

// MARK: populate inputs
window.notes_IPC.receive('settings:collection:id', async (key) => {
	collectKey = key

	MA.byId('is_active_collect').clsShow(key === await window.notes_IPC.active())
	MA.byIdText('collection_name', await window.notes_IPC.collectName(key))

	window.notes_IPC.get(key).then(async (results) => {
		const lastGameSet = await window.notes_IPC.last()
		for ( const [optKey, value] of Object.entries(results) ) {
			const element = MA.byId(optKey)

			if ( element === null ) { continue }

			const type = element.safeAttribute('type') ?? 'other'
			
			if ( type === 'text' || type === 'password' || optKey === 'notes_notes' ) {
				element.placeholder = lastGameSet[optKey.replace('notes_', '')] ?? ''
				element.value       = typeof value === 'undefined' || value === null ? '' : value.toString()
			} else if ( type === 'checkbox' ) {
				element.checked = value !== null ? value : lastGameSet?.[optKey.replace('notes_', '')] ?? false
			} else if ( optKey === 'notes_version' ) {
				window.notes_IPC.verList().then((versions) => {
					element.innerHTML = versions.map((x) => DATA.optionFromArray(x, value)).join('')
				})
			} else if ( optKey === 'notes_color' ) {
				for ( const clrElement of MA.query('[name="notes_color"]') ) {
					clrElement.checked = clrElement.value === value
				}
			} else if ( optKey === 'notes_unit_money' ) {
				element.value = value ?? lastGameSet.unit_money
			}

			inputValidate(optKey, element, false)
		}
	})
})


// MARK: PAGE LOAD
window.addEventListener('DOMContentLoaded', () => {
	window.addEventListener('beforeunload', (e) => {
		if ( document.activeElement.tagName === 'INPUT' ) {
			e.preventDefault()
			document.activeElement.blur()
			setTimeout(() => { window.close()}, 250)
		}
	})

	for ( const thisLabel of MA.query('.notes-color-label') ) {
		const thisNum = parseInt(thisLabel.getAttribute('for').replace('notes_color', ''))
		thisLabel.innerHTML = DATA.getIconSVG('folder', false, false, false, thisNum, true)
	}

	for ( const element of MA.query('page-replace')) {
		const replaceType = element.safeAttribute('data-type')
		const replaceKey  = element.safeAttribute('data-name')

		switch ( replaceType ) {
			case 'text-input':
				element.replaceWith(replaceTextInput(replaceKey))
				break
			case 'password-input':
				element.replaceWith(replacePasswordInput(replaceKey))
				break
			case 'switch-input':
				element.replaceWith(replaceSwitchInput(replaceKey))
				break
			default :
				break
		}
	}

	const changeInputs = ['unit_money', 'unit_mile', 'unit_temp', 'unit_acre', 'version', 'websiteDL']

	for ( const id of changeInputs ) {
		MA.byIdEventIfExists(`notes_${id}`, inputSet, 'change')
	}

	for ( const element of MA.queryA('[name="notes_color"]') ) {
		element.addEventListener('change', inputColor)
	}
	MA.byIdEventIfExists('notes_notes', window.notes_IPC.inputContext, 'contextmenu')
	MA.byIdEventIfExists('notes_notes', inputSet, 'blur')
	MA.byIdEventIfExists('notes_website', window.notes_IPC.inputContext, 'contextmenu')
	MA.byIdEventIfExists('notes_website', inputSet, 'blur')
	MA.byIdEventIfExists('notes_website', inputKey, 'keyup')
	MA.byIdEventIfExists('notes_websiteDL', () => {
		MA.byId('notes_website').blur()
	}, 'change')
})

// MARK: PAGE BUILD
function replaceTextInput(id) {
	const node = document.createElement('div')
	node.innerHTML = [
		`<i18n-text class="inset-block-header" data-key="notes_title_${id}"></i18n-text>`,
		'<div class="row">',
		`<i18n-text class="inset-block-blurb-option col-6" data-key="notes_blurb_${id}"></i18n-text>`,
		'<div class="col-6">',
		`<input type="text" class="inputElement form-control form-control-sm" id="notes_${id}">`,
		'</div></div>',
	].join('')

	const inputElement = node.querySelector('input')

	inputElement.addEventListener('keyup', inputKey )
	inputElement.addEventListener('context', window.notes_IPC.inputContext )
	inputElement.addEventListener('blur', inputSet)
	return node
}
function replacePasswordInput(id) {
	const node = document.createElement('div')
	node.innerHTML = [
		`<i18n-text class="inset-block-header" data-key="notes_title_${id}"></i18n-text>`,
		'<div class="row">',
		`<i18n-text class="inset-block-blurb-option col-6" data-key="notes_blurb_${id}"></i18n-text>`,
		'<div class="col-6"><div class="input-group">',
		`<input type="password" class="inputElement form-control form-control-sm" id="notes_${id}">`,
		'<span class="input-group-text togglePasswordControl"><i class="bi-eye"></i></span>',
		'</div></div></div>'
	].join('')

	const inputElement  = node.querySelector('input')
	const toggleElement = node.querySelector('.togglePasswordControl')

	inputElement.addEventListener('keyup', inputKey )
	inputElement.addEventListener('context', window.notes_IPC.inputContext )
	inputElement.addEventListener('blur', inputSet)
	toggleElement.addEventListener('click', (e) => {
		const thisInput   = e.target.closest('.input-group').querySelector('input')
		const newIsHidden = thisInput.getAttribute('type') !== 'password'

		thisInput.setAttribute('type', newIsHidden ? 'password' : 'text')
		toggleElement.innerHTML = `<i class="bi-eye${newIsHidden ? '' : '-slash'}"></i>`
	})
	return node
}

function replaceSwitchInput(id) {
	const node = document.createElement('div')
	node.innerHTML = [
		`<i18n-text class="inset-block-header" data-key="notes_title_${id}"></i18n-text>`,
		'<div class="row">',
		`<i18n-text class="inset-block-blurb-option col-9" data-key="notes_blurb_${id}"></i18n-text>`,
		'<div class="col-3 px-2 form-check form-switch custom-switch">',
		`<input id="notes_${id}" class="inputElement form-check-input" type="checkbox" role="switch">`,
		'</div></div>'
	].join('')

	const inputElement = node.querySelector('input')

	inputElement.addEventListener('change', inputSet)
	return node
}

// MARK: input interact
function inputColor() {
	const checkValue = MA.query('[name="notes_color"]:checked')?.[0]?.value ?? null
	
	if ( checkValue !== null ) {
		window.notes_IPC.set(collectKey, 'notes_color', checkValue)
	}
}

function inputSet(e) {
	const formControl = e.target.closest('.inputElement')
	const dataKey     = formControl.id
	if ( ! inputValidate(dataKey, formControl, false) ) { return }

	if ( dataKey === 'notes_website' && MA.byIdCheck('notes_websiteVALID') ) {
		try {
			const parsedURL   = new URL('', formControl.value)
			formControl.value = new URL('/', parsedURL.origin).href
		} catch {
			/* do nothing? */
		}
	}
	
	if ( dataKey === 'notes_fsg_bot' ) {
		formControl.value = formControl.value.split(/\D+/).filter((x) => x.length !== 0 ).join('-')
	}
	
	if ( formControl.getAttribute('type') === 'checkbox' ) {
		window.notes_IPC.set(collectKey, dataKey, formControl.checked).then((retValue) => { formControl.checked = retValue[dataKey] })
	} else if ( formControl.tagName === 'SELECT' ) {
		window.notes_IPC.set(collectKey, dataKey, formControl.value)
	} else {
		window.notes_IPC.set(collectKey, dataKey, formControl.value).then((retValue) => { formControl.value = retValue[dataKey] })
	}
}

function inputKey(e) {
	const dataKey = e.target.id
	if ( ( e.code === 'Enter' || e.code === 'NumpadEnter' ) ) {
		e.target.blur()
	} else {
		inputValidate(dataKey, e.target, true)
	}
}

function inputValidate(id, element, inProgress = false) {
	const formControl  = element
	const formValue    = formControl.value
	const formFeedback = MA.byId(`${id}_feedback`)
	
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

	if ( formFeedback !== null ) { formFeedback.clsHide(validCheck) }

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

	return validCheck
}