/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// copy/move confirm UI

/* global processL10N, fsgUtil */

//TODO : make version aware

let lastSourceMods = null

window.mods.receive('fromMain_subWindowSelectAll', () => {
	fsgUtil.query('[type="checkbox"]').forEach((element) => { element.checked = true })
})
window.mods.receive('fromMain_subWindowSelectNone', () => {
	fsgUtil.query('[type="checkbox"]').forEach((element) => { element.checked = false })
})

window.mods.receive('fromMain_confirmList', (modCollect) => {
	const multiVersion = modCollect.appSettings.multi_version
	const curVersion   = modCollect.appSettings.game_version
	lastSourceMods     = modCollect.opts.sourceFiles

	const destChecks = []
	const confRows   = []

	modCollect.opts.destinations.forEach((collectKey) => {
		if ( multiVersion && modCollect.collectionNotes[collectKey].notes_version !== curVersion ) { return }
		destChecks.push(fsgUtil.makeCollectionCheckBox({
			id     : collectKey,
			name   : modCollect.collectionToName[collectKey],
			folder : modCollect.collectionToFolderRelative[collectKey],
		}))
	})

	modCollect.opts.sourceFiles.forEach((source) => {
		confRows.push(fsgUtil.arrayToTableRow([source.shortName, source.title]))
	})

	fsgUtil.byId('dest_list').innerHTML    = destChecks.join('')
	fsgUtil.byId('confirm_list').innerHTML = confRows.join('')

	processL10N()
})

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

