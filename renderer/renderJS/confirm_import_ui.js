/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// copy/move confirm UI

/* global processL10N, fsgUtil */

let lastSourceMods = null
let isZipImport    = false

window.mods.receive('fromMain_subWindowSelectAll', fsgUtil.windowCheckAll)
window.mods.receive('fromMain_subWindowSelectNone', fsgUtil.windowCheckNone)
window.mods.receive('fromMain_subWindowSelectInvert', fsgUtil.windowCheckInv)

window.mods.receive('fromMain_confirmList', (modCollect) => {
	const multiVersion = modCollect.appSettings.multi_version
	const curVersion   = modCollect.appSettings.game_version

	isZipImport    = modCollect.opts.isZipImport
	lastSourceMods = modCollect.opts.files

	fsgUtil.clsHideFalse('modPackImport', isZipImport)

	const destChecks = []

	for ( const collectKey of modCollect.set_Collections ) {
		if ( multiVersion && modCollect.collectionNotes[collectKey].notes_version !== curVersion ) { continue }
		destChecks.push(fsgUtil.useTemplate('collect_box', {
			id     : collectKey,
			name   : modCollect.collectionToName[collectKey],
			folder : modCollect.collectionToFolderRelative[collectKey],
		}))
	}

	const confRows   = modCollect.opts.files.map((source) => fsgUtil.arrayToTableRow(source))

	fsgUtil.setById('dest_list', destChecks)
	fsgUtil.setById('confirm_list', confRows)

	processL10N()
})


function clientDoImport() {
	const realDestinations = fsgUtil.query(':checked')
	const fileMap          = []

	for ( const source of lastSourceMods ) {
		for ( const realDest of realDestinations ) {
			fileMap.push([realDest.id, '', source])
		}
	}

	window.mods.realImportFile(fileMap, isZipImport)
}

