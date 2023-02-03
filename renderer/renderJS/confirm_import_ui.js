/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// copy/move confirm UI

/* global processL10N, fsgUtil */

let lastSourceMods = null

window.mods.receive('fromMain_subWindowSelectAll', () => {
	fsgUtil.query('[type="checkbox"]').forEach((element) => { element.checked = true })
})
window.mods.receive('fromMain_subWindowSelectNone', () => {
	fsgUtil.query('[type="checkbox"]').forEach((element) => { element.checked = false })
})

window.mods.receive('fromMain_confirmList', (modCollect) => {
	lastSourceMods = modCollect.opts.files

	const destChecks = []
	const confRows   = []

	modCollect.set_Collections.forEach((collectKey) => {
		destChecks.push(fsgUtil.makeCollectionCheckBox({
			id     : collectKey,
			name   : modCollect.collectionToName[collectKey],
			folder : modCollect.collectionToFolderRelative[collectKey],
		}))
	})

	console.log(modCollect.opts.files)

	modCollect.opts.files.forEach((source) => {
		confRows.push(fsgUtil.arrayToTableRow(source))
	})

	fsgUtil.byId('dest_list').innerHTML    = destChecks.join('')
	fsgUtil.byId('confirm_list').innerHTML = confRows.join('')

	processL10N()
})


function clientDoImport() {
	const realDestinations = fsgUtil.query(':checked')
	const fileMap          = []

	lastSourceMods.forEach((source) => {
		realDestinations.forEach((realDest) => {
			fileMap.push([realDest.id, '', source])
		})
	})

	window.mods.realImportFile(fileMap)
}

