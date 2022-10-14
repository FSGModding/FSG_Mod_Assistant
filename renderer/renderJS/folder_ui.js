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
	const folderHTML = []
	
	folderHTML.push('<div class="folderLine mb-3 pb-2 border-bottom"><div class="row">')
	folderHTML.push(`<div class="col-6"><h4>${name}</h4></div>`)
	folderHTML.push('<div class="col-6"><div class="btn-group w-100"><button class="btn btn-sm btn-success open_folder"><l10n name="open_folder"></l10n></button><button class="btn btn-sm btn-danger remove_folder"><l10n name="remove_folder"></l10n></button></div></div>')
	folderHTML.push(`</div><em class="ps-2 folder-path" data-folder="${path}">${window.mods.homeDirMap(path)}</em></div>`)

	return folderHTML.join('')
}

function processButtonClick(event) {
	let thisButton = null
	if ( event.target.tagName === 'L10N' ) {
		thisButton = event.target.parentElement
	} else {
		thisButton = event.target
	}

	if ( thisButton.classList.contains('open_folder') ) {
		const thisFolder = thisButton.closest('.folderLine').querySelectorAll('em')[0].innerHTML
		window.mods.openFolder(thisFolder)
	}
	if ( thisButton.classList.contains('remove_folder') ) {
		const thisLine   = thisButton.closest('.folderLine')
		const thisFolder = thisLine.querySelectorAll('em')[0].getAttribute('data-folder')

		thisLine.classList.add('bg-black', 'bg-opacity-50', 'text-decoration-line-through')
		thisLine.querySelectorAll('button').forEach((button) => { button.classList.add('disabled')})
		window.mods.removeFolder(thisFolder)
	}
}

window.addEventListener('click', (event) => {
	processButtonClick(event)
})