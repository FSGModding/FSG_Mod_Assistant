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

	modCollect.set_Collections.forEach((collectKey) => {
		if ( multiVersion && modCollect.collectionNotes[collectKey].notes_version !== curVersion ) { return }
		if ( collectKey !== modCollect.opts.originCollectKey ) {
			selectHTML.push(`<option value="${collectKey}">${modCollect.collectionToFullName[collectKey]}</option>`)
		}
	})

	fsgUtil.byId('select_destination').innerHTML = selectHTML.join('')

	updateConfirmList()
})

function updateConfirmList() {
	const confirmHTML  = []
	const selectedDest = fsgUtil.byId('select_destination').value

	lastModCollect.opts.records.forEach((thisMod) => {
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
	})

	fsgUtil.byId('confirm_list').innerHTML = confirmHTML.join('')
	processL10N()
}

function findConflict(collectKey, shortName, folder) {
	let foundConf = false
	lastModCollect.modList[collectKey].modSet.forEach((modKey) => {
		const thisMod = lastModCollect.modList[collectKey].mods[modKey]

		if ( !foundConf && shortName === thisMod.fileDetail.shortName && folder === thisMod.fileDetail.isFolder ) {
			foundConf = true
		}
	})
	return foundConf
}

function getSelectedMods() {
	const destination = fsgUtil.byId('select_destination').value

	if ( destination === '0' ) { return false }

	const fileMap = []

	lastModCollect.opts.records.forEach((mod) => {
		const includeMeElement = fsgUtil.byId(mod.uuid)

		if ( includeMeElement.getAttribute('type') === 'checkbox' && includeMeElement.checked === true ) {
			fileMap.push([destination, lastModCollect.opts.originCollectKey, mod.fileDetail.fullPath])
		}
		if ( includeMeElement.getAttribute('type') === 'hidden' && includeMeElement.value ) {
			fileMap.push([destination, lastModCollect.opts.originCollectKey, mod.fileDetail.fullPath])
		}
	})

	return fileMap
}

function clientDoCopy() {
	window.mods.realCopyFile(getSelectedMods())
}


function clientDoMove() {
	window.mods.realMoveFile(getSelectedMods())
}
