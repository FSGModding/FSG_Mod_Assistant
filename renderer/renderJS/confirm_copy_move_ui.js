/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// copy/move confirm UI

/* global fsgUtil, processL10N */

let lastModCollect     = null
let lastFolderRelative = null

window.mods.receive('fromMain_subWindowSelectAll', () => {
	fsgUtil.query('[type="checkbox"]').forEach((element) => { element.checked = true })
})
window.mods.receive('fromMain_subWindowSelectNone', () => {
	fsgUtil.query('[type="checkbox"]').forEach((element) => { element.checked = false })
})

window.mods.receive('fromMain_confirmList', (modCollect) => {
	const multiVersion = modCollect.appSettings.multi_version
	const curVersion   = modCollect.appSettings.game_version

	lastModCollect     = modCollect
	lastFolderRelative = modCollect.collectionToFolderRelative[modCollect.opts.originCollectKey]
	
	const selectHTML = []

	selectHTML.push('<option value="0">...</option>')

	for ( const collectKey of modCollect.set_Collections ) {
		if ( multiVersion && modCollect.collectionNotes[collectKey].notes_version !== curVersion ) { continue }
		if ( collectKey !== modCollect.opts.originCollectKey ) {
			selectHTML.push(`<option value="${collectKey}">${modCollect.collectionToFullName[collectKey]}</option>`)
		}
	}

	fsgUtil.byId('select_destination').innerHTML = selectHTML.join('')

	updateConfirmList()
})

function updateConfirmList() {
	const confirmHTML  = []
	const selectedDest = fsgUtil.byId('select_destination').value

	for ( const thisMod of lastModCollect.opts.records ) {
		let destHTML = ''

		switch ( true ) {
			case selectedDest === '0':
				destHTML = fsgUtil.useTemplate('no_dest', {})
				break
			case findConflict(selectedDest, thisMod.fileDetail.shortName, thisMod.fileDetail.isFolder) :
				destHTML = fsgUtil.useTemplate('conflict_dest', { uuid : thisMod.uuid })
				break
			default :
				destHTML = fsgUtil.useTemplate('clear_dest', { uuid : thisMod.uuid })
				break
		}

		confirmHTML.push(fsgUtil.useTemplate('mod_row', {
			printPath : `${lastFolderRelative}\\${fsgUtil.basename(thisMod.fileDetail.fullPath)}`,
			icon      : fsgUtil.iconMaker(thisMod.modDesc.iconImageCache),
			shortname : thisMod.fileDetail.shortName,
			title     : fsgUtil.escapeSpecial(thisMod.l10n.title),
			destHTML  : destHTML,
		}))
	}

	fsgUtil.byId('confirm_list').innerHTML = confirmHTML.join('')
	processL10N()
}

function findConflict(collectKey, shortName, folder) {
	for ( const modKey of lastModCollect.modList[collectKey].modSet ) {
		const thisMod = lastModCollect.modList[collectKey].mods[modKey]

		if ( shortName === thisMod.fileDetail.shortName && folder === thisMod.fileDetail.isFolder ) {
			return true
		}
	}
	return false
}

function getSelectedMods() {
	const destination = fsgUtil.byId('select_destination').value

	if ( destination === '0' ) { return false }

	const fileMap = []

	for ( const mod of lastModCollect.opts.records ) {
		const includeMeElement = fsgUtil.byId(mod.uuid)

		if ( includeMeElement.getAttribute('type') === 'checkbox' && includeMeElement.checked === true ) {
			fileMap.push([destination, lastModCollect.opts.originCollectKey, mod.fileDetail.fullPath])
		}
		if ( includeMeElement.getAttribute('type') === 'hidden' && includeMeElement.value ) {
			fileMap.push([destination, lastModCollect.opts.originCollectKey, mod.fileDetail.fullPath])
		}
	}

	return fileMap
}

function clientDoCopy() {
	window.mods.realCopyFile(getSelectedMods())
}


function clientDoMove() {
	window.mods.realMoveFile(getSelectedMods())
}
