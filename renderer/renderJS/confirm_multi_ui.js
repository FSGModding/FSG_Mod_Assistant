/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// copy/move confirm UI

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

let lastSourceMods = null

window.mods.receive('fromMain_confirmList', (modCollect) => {
	lastSourceMods = modCollect.opts.sourceFiles

	const destChecks = []
	const confRows   = []

	modCollect.opts.destinations.forEach((collectKey) => {
		destChecks.push(makeCheck(
			collectKey,
			modCollect.collectionToName[collectKey],
			modCollect.collectionToFolderRelative[collectKey]
		))
	})

	modCollect.opts.sourceFiles.forEach((source) => {
		confRows.push(makeRow(source))
	})

	fsgUtil.byId('dest_list').innerHTML    = destChecks.join('')
	fsgUtil.byId('confirm_list').innerHTML = confRows.join('')

	processL10N()
})

const makeRow = (row) => `<tr><td>${row.shortName}</td><td>${row.title}</td></tr>`

const makeCheck = (id, name, dir) => `<div class="form-check form-switch mb-2">
		<input class="form-check-input" type="checkbox" id="${id}">
		<label class="ms-2 form-check-label row" for="${id}"><div class="col-3">${name}</div><div class="col-9"><small>${dir}</small></div></label>
	</div>`


function clientDoCopy() {
	const realDestinations = fsgUtil.query(':checked')
	const fileMap          = []

	lastSourceMods.forEach((source) => {
		realDestinations.forEach((realDest) => {
			fileMap.push([realDest.id, source.collectKey, source.fullPath])
		})
	})

	window.mods.realCopyFile(fileMap)
}

