/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Folder window UI

/* global processL10N, fsgUtil */

window.mods.receive('fromMain_allSettings', (allSettings, devControls) => {
	updatePrefs(allSettings, devControls)
	window.l10n.langList_send()
	window.l10n.themeList_send()
	processL10N()
})

function updatePrefs(allSettings, devControls) {
	fsgUtil.byId('dev_mode').checked    = devControls[22]
	fsgUtil.byId('dev_mode_19').checked = devControls[19]
	fsgUtil.byId('dev_mode_17').checked = devControls[17]
	fsgUtil.byId('dev_mode_15').checked = devControls[15]
	fsgUtil.byId('dev_mode_13').checked = devControls[13]

	Object.keys(allSettings).forEach((name) => {
		const formControl = fsgUtil.byId(name)
		if ( formControl !== null ) {
			if ( formControl.getAttribute('type') === 'checkbox' ) {
				formControl.checked = allSettings[name]
			} else {
				formControl.value = allSettings[name]
			}
		}
	})

	fsgUtil.query('.multi-version-pref').forEach((element) => { element.classList[allSettings.multi_version?'remove':'add']('d-none') })

	fsgUtil.query('.game_enabled_19').forEach((element) => { element.classList[allSettings.game_enabled_19?'remove':'add']('d-none') })
	fsgUtil.query('.game_enabled_17').forEach((element) => { element.classList[allSettings.game_enabled_17?'remove':'add']('d-none') })
	fsgUtil.query('.game_enabled_15').forEach((element) => { element.classList[allSettings.game_enabled_15?'remove':'add']('d-none') })
	fsgUtil.query('.game_enabled_13').forEach((element) => { element.classList[allSettings.game_enabled_13?'remove':'add']('d-none') })
}

function clientSetPref(id) {
	const formControl = fsgUtil.byId(id)

	if ( formControl.getAttribute('type') === 'checkbox' ) {
		window.mods.setPref(id, formControl.checked)
	} else {
		window.mods.setPref(id, formControl.value)
	}
}


function clientChangeTheme()    { window.l10n.themeList_change(fsgUtil.byId('theme_select').value) }
function clientChangeL10N()     { window.l10n.langList_change(fsgUtil.byId('language_select').value) }