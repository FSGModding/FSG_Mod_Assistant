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
		l10nSendItems.add(fsgUtil.getAttribNullEmpty(thisL10nItem, 'name'))
	})

	l10n.getText_send(l10nSendItems)
}

window.l10n.receive('fromMain_getText_return', (data) => {
	fsgUtil.query(`l10n[name="${data[0]}"]`).forEach((item) => { item.innerHTML = data[1] })
})
window.l10n.receive('fromMain_l10n_refresh', () => { processL10N() })

let lastRec            = null
let lastFolderRelative = null

window.mods.receive('fromMain_confirmList', (modCollect) => {
	lastRec            = modCollect.opts
	lastFolderRelative = modCollect.collectionToFolderRelative[modCollect.opts.originCollectKey]

	const confirmHTML = []

	modCollect.opts.records.forEach((thisMod) => {
		const printPath = `${lastFolderRelative}\\${fsgUtil.basename(thisMod.fileDetail.fullPath)}`

		confirmHTML.push('<div class="row border-bottom">')
		confirmHTML.push(`<h3 class="mb-0 mt-2">${thisMod.fileDetail.shortName}</h3>`)
		confirmHTML.push(`<p class="font-monospace small">${printPath}</h3>`)
		confirmHTML.push('</div>')
	})

	fsgUtil.byId('confirm_list').innerHTML = confirmHTML.join('')
	processL10N()
})

function clientDeleteButton() {
	const fileMap = []

	lastRec.records.forEach((thisMod) => {
		fileMap.push([lastRec.originCollectKey, lastRec.originCollectKey, thisMod.fileDetail.fullPath])
	})

	window.mods.realDeleteFile(fileMap)
}
