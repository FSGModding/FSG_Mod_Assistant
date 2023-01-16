/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Folder window UI

/* global l10n, fsgUtil, bootstrap, getText */

/*  __ ____   ______        
   |  |_   | |      |.-----.
   |  |_|  |_|  --  ||     |
   |__|______|______||__|__| */

let lastScroll = null

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
window.l10n.receive('fromMain_getText_return_title', (data) => {
	fsgUtil.query(`l10n[name="${data[0]}"]`).forEach((item) => {
		const buttonItem = item.closest('button')
		if ( buttonItem !== null ) {
			buttonItem.title = data[1]
			new bootstrap.Tooltip(buttonItem)
		}
	})
})
window.l10n.receive('fromMain_l10n_refresh', () => { processL10N() })

window.mods.receive('fromMain_getFolders', (modList) => {
	let folderNum = 0
	const localFolderList = []
	const lastFolder      = Object.keys(modList).length - 1

	Object.keys(modList).forEach((list) => {
		localFolderList.push(makeFolderLine(modList[list].fullPath, modList[list].name, folderNum, lastFolder))
		folderNum++
	})

	fsgUtil.byId('folderList').innerHTML = localFolderList.join('')

	processL10N()

	try {
		if ( lastScroll !== null ) {
			window.scrollTo(0, lastScroll)
			lastScroll = null
		}
	} catch { /* ignore */ }
})

function moveBtn(icon, num, dest, disable) {
	return `<button onclick="clientMoveItem(${num}, ${dest})" class="btn btn-sm btn-outline-light ${disable?'disabled':''}">${icon}</button>`
}

function upBtn(num, disable) {
	return `${moveBtn('<i class="bi bi-align-top"></i>', num, 0, disable)}${moveBtn('<i class="bi bi-chevron-up"></i>', num, num-1, disable)}`
}
function dnBtn(num, last, disable) {
	return `${moveBtn('<i class="bi bi-chevron-down"></i>', num, num+1, disable)}${moveBtn('<i class="bi bi-align-bottom"></i>', num, last, disable)}`
}

function makeFolderLine(path, name, num, last) {
	return `<div class="folderLine my-2 py-2 pb-3 border-bottom">
		<div class="row">
			<div class="col-2">
				<div class="btn-group-vertical w-100">
					${upBtn(num, num < 1)}
					${dnBtn(num, last, num === last)}
				</div>
			</div>
			<div class="col-10 pt-4">
				<div class="row">
					<div class="col-6"><h4>${name}</h4></div>
					<div class="col-6">
						<div class="btn-group w-100">
							<button class="btn btn-sm btn-success open_folder" style="line-height: 1.1em">${getText('open_folder')}</button>
							<button class="btn btn-sm btn-danger remove_folder" style="line-height: 1.1em">${getText('remove_folder')}</button>
						</div>
					</div>
				</div>
				<div class="row">
					<div class="col-12 pt-2">
						<em class="ps-2 folder-path" data-folder="${path}">${window.mods.homeDirMap(path)}</em>
					</div>
				</div>
			</div>
		</div>
	</div>`
}

function clientMoveItem(from, to) {
	lastScroll = window.scrollY
	window.mods.reorderFolder(from, to)
}

function processButtonClick(event) {
	lastScroll = window.scrollY
	let thisButton = null
	if ( event.target.tagName === 'L10N' ) {
		thisButton = event.target.parentElement
	} else {
		thisButton = event.target
	}

	if ( thisButton.classList.contains('open_folder') ) {
		const thisFolder = thisButton.closest('.folderLine').querySelectorAll('em')[0].getAttribute('data-folder')
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