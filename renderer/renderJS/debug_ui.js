/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Debug window UI

/* global l10n, fsgUtil, bootstrap */


/*  __ ____   ______        
   |  |_   | |      |.-----.
   |  |_|  |_|  --  ||     |
   |__|______|______||__|__| */

function processL10N()          { clientGetL10NEntries() }
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


window.debug.receive('fromMain_debugLog', (data) => {
	const showThese = []
	const showData  = []
	const levelInfo = new RegExp(/<span class="log_level .+?">(.+?)<\/span>/)

	document.querySelectorAll(':checked').forEach((element) => {
		showThese.push(element.id.replace('debug_', '').toUpperCase())
	})

	data.split('\n').forEach((line) => {
		if ( showThese.includes(line.match(levelInfo)[1].trim()) ) { showData.push(line) }
	})

	document.getElementById('debug_log').innerHTML = showData.join('\n')
})

function clientResetButtons() {
	fsgUtil.query('.filter_only').forEach((element) => {
		if ( element.id === 'debug_debug' ) {
			element.checked = false
		} else {
			element.checked = true
		}
	})
	window.gamelog.getDebugLogContents()
}

window.addEventListener('DOMContentLoaded', () => {
	processL10N()

	const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
	tooltipTriggerList.map((tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl) )
})
