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

let lastModRecords = null
let lastCollection = null

window.mods.receive('fromMain_confirmList', (modRecords, fullList, folderMap, collection) => {
	lastModRecords = modRecords
	lastCollection = collection
	

	const confirmHTML = []

	lastModRecords.forEach((mod) => {
		const printPath = window.mods.homeDirMap(`${folderMap[lastCollection]}\\${fsgUtil.basename(mod.fileDetail.fullPath)}`)
		confirmHTML.push('<div class="row border-bottom">')
		confirmHTML.push(`<h3 class="mb-0 mt-2">${mod.fileDetail.shortName}</h3>`)
		confirmHTML.push(`<p class="font-monospace small">${printPath}</h3>`)
		confirmHTML.push('</div>')
	})

	fsgUtil.byId('confirm_list').innerHTML = confirmHTML.join('')
	processL10N()
})

function clientDeleteButton() {
	const fileMap = []

	lastModRecords.forEach((mod) => {
		fileMap.push([lastCollection, lastCollection, mod.fileDetail.fullPath])
	})

	window.mods.realDeleteFile(fileMap)
}
