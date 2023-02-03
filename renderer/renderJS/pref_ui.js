/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Folder window UI

/* global processL10N, fsgUtil */

window.mods.receive('fromMain_allSettings', (allSettings, devControls) => {
	updatePrefs(allSettings, devControls)
	processL10N()
})

function updatePrefs(allSettings, devControls) {
	fsgUtil.byId('dev_mode').checked = devControls

	Object.keys(allSettings).forEach((name) => {
		const formControl = fsgUtil.byId(name)
		if ( formControl !== null ) {
			if ( formControl.tagName === 'EM' ) {
				formControl.innerHTML = allSettings[name]
			} else if ( formControl.getAttribute('type') === 'checkbox' ) {
				formControl.checked = allSettings[name]
			} else {
				formControl.value = allSettings[name]
			}
		}
	})
}

function clientSetPref(id) {
	const formControl = fsgUtil.byId(id)

	if ( formControl.getAttribute('type') === 'checkbox' ) {
		window.mods.setPref(id, formControl.checked)
	} else {
		window.mods.setPref(id, formControl.value)
	}
}