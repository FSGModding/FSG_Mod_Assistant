/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// copy/move confirm UI

/* global processL10N, fsgUtil */

let lastSourceMods = null

window.mods.receive('fromMain_subWindowSelectAll', fsgUtil.windowCheckAll)
window.mods.receive('fromMain_subWindowSelectNone', fsgUtil.windowCheckNone)
window.mods.receive('fromMain_subWindowSelectInvert', fsgUtil.windowCheckInv)

window.mods.receive('fromMain_confirmList', (modCollect) => {
	const multiVersion = modCollect.appSettings.multi_version
	const curVersion   = modCollect.appSettings.game_version
	lastSourceMods     = modCollect.opts.sourceFiles

	const destChecks = []

	for ( const collectKey of modCollect.opts.destinations ) {
		if ( multiVersion && modCollect.collectionNotes[collectKey].notes_version !== curVersion ) { continue }
		destChecks.push(fsgUtil.useTemplate('collect_box', {
			id     : collectKey,
			name   : modCollect.collectionToName[collectKey],
			folder : modCollect.collectionToFolderRelative[collectKey],
		}))
	}

	const confRows   = modCollect.opts.sourceFiles.map((source) => fsgUtil.arrayToTableRow([source.shortName, source.title]))

	fsgUtil.setById('dest_list', destChecks)
	fsgUtil.setById('confirm_list', confRows)

	processL10N()
})

function clientDoCopy() {
	const realDestinations = fsgUtil.query(':checked')
	const fileMap          = []

	for ( const source of lastSourceMods ) {
		for ( const realDest of realDestinations ) {
			fileMap.push([realDest.id, source.collectKey, source.fullPath])
		}
	}

	window.mods.realCopyFile(fileMap)
}

