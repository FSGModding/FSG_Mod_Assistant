/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// delete confirm UI

/* global l10n, fsgUtil */


/*  __ ____   ______        
   |  |_   | |      |.-----.
   |  |_|  |_|  --  ||     |
   |__|______|______||__|__| */

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


window.mods.receive('fromMain_confirmList', (modRecords) => {
	let innerHTML = ''

	innerHTML += `<div class="col-8"><h5>${modRecords.fileDetail.shortName}</h5></div>`
	innerHTML += `<div class="col-4"><button id="deleteButton" onclick="clientDeleteButton()" data-uuid="${modRecords.uuid}" data-collection=${modRecords.currentCollection} class="btn btn-danger"><l10n name="delete"></l10n></button></div>`
	innerHTML += `<div class="col-12"><p class="font-monospace small">${window.mods.homeDirMap(modRecords.fileDetail.fullPath)}</p></div>`

	fsgUtil.byId('confirm_list').innerHTML = innerHTML

	processL10N()
})

function clientDeleteButton() {
	const record     = fsgUtil.byId('deleteButton')
	const uuid       = fsgUtil.getAttribNullError(record, 'data-uuid')
	const collection = fsgUtil.getAttribNullError(record, 'data-collection')

	window.mods.realDeleteFile(collection, uuid)
}
