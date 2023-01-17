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

function processL10N()          { clientGetL10NEntries(); l10n.langList_send() }
function clientChangeL10N()     { l10n.langList_change(fsgUtil.byId('language_select').value) }
function clientGetL10NEntries() {
	const l10nSendItems = new Set()

	fsgUtil.query('l10n').forEach((thisL10nItem) => {
		l10nSendItems.add(fsgUtil.getAttribNullEmpty(thisL10nItem, 'name'))
	})

	l10n.getText_send(l10nSendItems)
}

window.l10n.receive('fromMain_getText_return', (data) => {
	fsgUtil.query(`l10n[name="${data[0]}"]`).forEach((item) => { item.innerHTML = data[1] })
})
window.l10n.receive('fromMain_l10n_refresh', () => { processL10N() })

window.l10n.receive('fromMain_langList_return', (listData, selected) => {
	fsgUtil.byId('language_select').innerHTML = listData.map((x) => {
		return fsgUtil.buildSelectOpt(x[0], x[1], selected)
	}).join('')
})

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