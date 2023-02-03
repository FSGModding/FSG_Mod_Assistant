/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Folder window UI

/* global processL10N, fsgUtil, getText */

let lastScroll = null


window.mods.receive('fromMain_getFolders', (modCollect) => {
	let   folderNum       = 0
	const localFolderList = []
	const lastFolder      = modCollect.set_Collections.size - 1

	modCollect.set_Collections.forEach((collectKey) => {
		localFolderList.push(makeFolderLine(
			modCollect.collectionToFolder[collectKey],
			modCollect.collectionToFolderRelative[collectKey],
			modCollect.collectionToFullName[collectKey],
			folderNum,
			lastFolder
		))
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
	return `${moveBtn('<l10n name="folder_top_button"></l10n>', num, 0, disable)}${moveBtn('<l10n name="folder_up_button"></l10n>', num, num-1, disable)}`
}
function dnBtn(num, last, disable) {
	return `${moveBtn('<l10n name="folder_down_button"></l10n>', num, num+1, disable)}${moveBtn('<l10n name="folder_bot_button"></l10n>', num, last, disable)}`
}

function makeFolderLine(path, relPath, name, num, last) {
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
						<em class="ps-2 folder-path" data-folder="${path}">${relPath}</em>
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