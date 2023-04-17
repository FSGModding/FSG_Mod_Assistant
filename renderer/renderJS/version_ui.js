/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Version window UI

/* global fsgUtil, processL10N */


window.mods.receive('fromMain_modList', (modCollect) => {
	// console.log(modCollect)
	const doMultiVersion     = modCollect.appSettings.multi_version
	const thisVersion        = modCollect.appSettings.game_version
	const nameIconMap        = {}
	const collectionMap      = {}
	const nameTitleMap       = {}
	const versionList        = {}
	const versionListNoMatch = {}

	for ( const collectKey of modCollect.set_Collections ) {
		if ( doMultiVersion && modCollect.collectionNotes[collectKey].notes_version !== thisVersion ) {
			continue
		}

		collectionMap[collectKey] = modCollect.collectionToName[collectKey]
		for ( const modKey of modCollect.modList[collectKey].modSet ) {
			const mod     = modCollect.modList[collectKey].mods[modKey]
			const modName = mod.fileDetail.shortName
			

			if ( mod.fileDetail.isFolder ) { continue }

			nameTitleMap[modName] ??= fsgUtil.escapeSpecial(mod.l10n.title)
			nameIconMap[modName]  ??= mod.modDesc.iconImageCache
			versionList[modName]  ??= []
			versionList[modName].push([collectKey, mod.modDesc.version])
		}
	}

	for ( const key in versionList ) {
		if ( versionList[key].length < 2 ) {
			delete versionList[key]
			continue
		}

		const firstVer = versionList[key][0][1]
		for ( let i = 1; i < versionList[key].length; i++ ) {
			if ( firstVer !== versionList[key][i][1] ) {
				versionListNoMatch[key] = versionList[key]
				delete versionList[key]
				break
			}
		}
	}

	const listHTML = []

	const sortedNoMatch = Object.keys(versionListNoMatch).sort(Intl.Collator().compare)
	const sortedMatch   = Object.keys(versionList).sort(Intl.Collator().compare)

	for ( const key of sortedNoMatch ) {
		const theseCollections = versionListNoMatch[key].map((vArray) => `${collectionMap[vArray[0]]}: ${vArray[1]}`)
		const modVer  = modCollect.modHub.version?.[modCollect.modHub.list.mods?.[key]]

		listHTML.push(makeLine('diff', nameTitleMap[key], key, theseCollections, nameIconMap[key], modVer))
	}

	for ( const key of sortedMatch ) {
		const theseCollections = versionList[key].map((vArray) => collectionMap[vArray[0]])
		const modVer  = modCollect.modHub.version?.[modCollect.modHub.list.mods?.[key]]

		listHTML.push(makeLine('same', nameTitleMap[key], key, theseCollections, nameIconMap[key], modVer))
	}

	fsgUtil.byId('modList').innerHTML = listHTML.join('')
	processL10N()
})


function makeColList(collections) {
	const colList = ['<ul class="list-unstyled px-2">']
	for ( const thisColText of collections ) {
		colList.push(`<li>${thisColText}</li>`)
	}
	colList.push('</ul>')
	return colList.join('')
}

function makeLine(type, realName, shortName, collections, icon, mhVer) {
	return fsgUtil.useTemplate('version_line', {
		badge             : fsgUtil.badge('dark', ( type === 'same' ) ? 'version_same' : 'version_diff', true),
		clickCallback     : ( type === 'same' ) ? '' : `window.mods.openVersionResolve('${shortName}')`,
		collectClass      : ( type === 'same' ) ? '' : 'text-body-emphasis',
		color             : ( type === 'same' ) ? 'list-group-item-secondary' : 'list-group-item-danger',
		icon              : fsgUtil.iconMaker(icon),
		joinedCollections : type !== 'same' ? makeColList(collections) : `<l10n name="version_collections"></l10n>: ${fsgUtil.escapeSpecial(collections.join(', '))}`,
		modHubVersion     : ( type === 'same' || typeof mhVer === 'undefined') ? '' : `<span class="border border-2 badge bg-info">${mhVer}</span>`,
		realName          : realName,
		shortName         : shortName,
		showButton        : ( type === 'same' ) ? 'd-none' : '',
	})
}

