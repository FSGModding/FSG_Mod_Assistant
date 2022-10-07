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

window.mods.receive('fromMain_getFolders', (modList) => {
	const localFolderList = []
	Object.keys(modList).forEach((list) => {
		localFolderList.push(makeFolderLine(modList[list].fullPath, modList[list].name))

	})
	fsgUtil.byId('folderList').innerHTML = localFolderList.join('')
	processL10N()
})

function makeFolderLine(path, name) {
	let folderHTML = ''
	
	folderHTML += '<div class="mb-3 border-bottom"><div class="row">'
	folderHTML += `<div class="col-8"><h4>${name}</h4></div>`
	folderHTML += '<div class="col-4"><button class="btn btn-sm w-100 btn-danger"><l10n name="remove_folder"></l10n></button></div>'
	folderHTML += `</div><p class="folder-path text-end">${path}</p></div>`

	return folderHTML
}

