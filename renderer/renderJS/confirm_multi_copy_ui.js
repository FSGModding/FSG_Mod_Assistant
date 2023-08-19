/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// copy/move confirm UI

/* global processL10N, fsgUtil */

let lastSourceMods = null
let lastSourceCollect = null
let lastFolderRelative = null

window.mods.receive('fromMain_subWindowSelectAll', fsgUtil.windowCheckAll)
window.mods.receive('fromMain_subWindowSelectNone', fsgUtil.windowCheckNone)
window.mods.receive('fromMain_subWindowSelectInvert', fsgUtil.windowCheckInv)

window.mods.receive('fromMain_confirmList', (modCollect) => {
	const multiVersion = modCollect.appSettings.multi_version
	const curVersion   = modCollect.appSettings.game_version

	lastFolderRelative = modCollect.collectionToFolderRelative[modCollect.opts.originCollectKey]
	lastSourceMods     = modCollect.opts.records.map((modItem) => modItem.fileDetail.fullPath)
	lastSourceCollect  = modCollect.opts.originCollectKey

	const destChecks = []

	for ( const collectKey of modCollect.set_Collections ) {
		if ( multiVersion && modCollect.collectionNotes[collectKey].notes_version !== curVersion ) { continue }
		if ( collectKey === modCollect.opts.originCollectKey ) { continue }
		destChecks.push(fsgUtil.useTemplate('collect_box', {
			id     : collectKey,
			name   : modCollect.collectionToName[collectKey],
			folder : modCollect.collectionToFolderRelative[collectKey],
		}))
	}

	const confRows   = modCollect.opts.records.map((thisMod) => fsgUtil.useTemplate('mod_row', {
		icon      : fsgUtil.iconMaker(thisMod.modDesc.iconImageCache),
		printPath : `${lastFolderRelative}\\${fsgUtil.basename(thisMod.fileDetail.fullPath)}`,
		shortname : thisMod.fileDetail.shortName,
		title     : fsgUtil.escapeSpecial(thisMod.l10n.title),
	}))

	fsgUtil.byId('dest_list').innerHTML    = destChecks.join('')
	fsgUtil.byId('confirm_list').innerHTML = confRows.join('')

	processL10N()
})


function clientDoMultiCopy() {
	const realDestinations = fsgUtil.query(':checked')
	const fileMap          = []

	for ( const source of lastSourceMods ) {
		for ( const realDest of realDestinations ) {
			fileMap.push([realDest.id, lastSourceCollect, source])
		}
	}

	window.mods.realCopyMultiFile(fileMap)
}

