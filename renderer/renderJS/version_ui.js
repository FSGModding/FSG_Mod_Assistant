/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Version window UI

/* global fsgUtil, processL10N, getText */


window.mods.receive('fromMain_modList', (modCollect) => {
	const nameIconMap        = {}
	const collectionMap      = {}
	const nameTitleMap       = {}
	const versionList        = {}
	const versionListNoMatch = {}

	modCollect.set_Collections.forEach((collectKey) => {
		collectionMap[collectKey] = modCollect.collectionToName[collectKey]
		modCollect.modList[collectKey].modSet.forEach((modKey) => {
			const mod     = modCollect.modList[collectKey].mods[modKey]
			const modName = mod.fileDetail.shortName
			const modVer  = mod.modDesc.version

			if ( ! mod.fileDetail.isFolder ) {
				nameTitleMap[modName] ??= fsgUtil.escapeSpecial(mod.l10n.title)
				nameIconMap[modName]  ??= mod.modDesc.iconImageCache
				versionList[modName]  ??= []
				versionList[modName].push([collectKey, modVer])
			}
		})
	})
	Object.keys(versionList).forEach((key) => {
		if ( versionList[key].length < 2 ) { delete versionList[key] }
	})

	Object.keys(versionList).forEach((key) => {
		const firstVer = versionList[key][0][1]
		let   deleteMe = false
		for ( let i = 1; i < versionList[key].length; i++ ) {
			if ( firstVer !== versionList[key][i][1] ) {
				deleteMe = true
				versionListNoMatch[key] = versionList[key]
			}
		}
		if ( deleteMe ) { delete versionList[key] }
	})

	const listHTML = []
	Object.keys(versionListNoMatch).forEach((key) => {
		const theseCollections = []
		versionListNoMatch[key].forEach((versionArray) => {
			theseCollections.push(`${collectionMap[versionArray[0]]}: ${versionArray[1]}`)
		})
		listHTML.push(makeLine('diff', nameTitleMap[key], key, theseCollections, nameIconMap[key]))
	})

	Object.keys(versionList).forEach((key) => {
		const theseCollections = []
		versionList[key].forEach((versionArray) => { theseCollections.push(collectionMap[versionArray[0]]) })
		listHTML.push(makeLine('same', nameTitleMap[key], key, theseCollections, nameIconMap[key]))
	})

	fsgUtil.byId('modList').innerHTML = listHTML.join('')
	processL10N()
})


function makeLine(type, realName, shortName, collections, icon) {
	const color = ( type === 'same' ) ? 'list-group-item-secondary' : 'list-group-item-danger'
	const l10n  = ( type === 'same' ) ? 'version_same' : 'version_diff'
	const click = ( type === 'diff' ) ? `oncontextmenu="window.mods.openVersionResolve('${shortName}')" onDblClick="window.mods.openVersionResolve('${shortName}')"` : ''

	return `<li ${click} class="list-group-item d-flex justify-content-between align-items-start ${color}">
		<div class="row w-100">
			<div class="col-2 p-0 mx-3" style="width:64px; height:64px;">
				<img class="img-fluid" src="${fsgUtil.iconMaker(icon)}" />
			</div>
			<div class="col-8">
				<div class="fw-bold">${shortName}</div>
				<div class="small">${realName}</div>
				<div class="text-black small ps-3">${getText('version_collections')}: ${fsgUtil.escapeSpecial(collections.join(', '))}</div>
			</div>
			<div class="col-2">
				${fsgUtil.badge('dark', l10n, true)}
			</div>
		</div>
	</li>`
}

