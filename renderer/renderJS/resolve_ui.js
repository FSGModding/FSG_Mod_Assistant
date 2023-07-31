/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Resolve version window UI

/* global processL10N, fsgUtil */


let cacheShortName   = null
let cacheCollection  = null


window.mods.receive('fromMain_subWindowSelectAll', fsgUtil.windowCheckAll)
window.mods.receive('fromMain_subWindowSelectNone', fsgUtil.windowCheckNone)
window.mods.receive('fromMain_subWindowSelectInvert', fsgUtil.windowCheckInv)

window.mods.receive('fromMain_modSet', (modSet, shortName) => {
	let latestVersion = { vString : null, vParts : [], collectKey : null }

	fsgUtil.byId('modName').innerHTML = shortName
	cacheShortName = shortName

	for ( const mod of modSet ) {
		latestVersion = compareVersion(latestVersion, mod.version, mod.collectKey)
	}

	fsgUtil.byId('newVersion').innerHTML = latestVersion.vString
	fsgUtil.byId('copyButton').classList.remove('disabled')
	cacheCollection = latestVersion.collectKey

	fsgUtil.byId('modSet').innerHTML = modSet.map((mod) => makeLine(mod, latestVersion)).join('')
	processL10N()
})

function compareVersion(latestVersion, thisVersion, collectKey) {
	try {
		const latestVersionRet = latestVersion
		const thisVersionParts = thisVersion.split('.').map( (d) => { return parseInt(d) })

		if ( latestVersion.vString === null ) {
			latestVersionRet.collectKey = collectKey
			latestVersionRet.vString    = thisVersion
			latestVersionRet.vParts     = thisVersionParts
			return latestVersionRet
		}
		
		if ( latestVersion.vString === latestVersion ) {
			return latestVersionRet
		}

		if ( latestVersion.vParts.length !== thisVersionParts.length ) {
			// Different number of parts, string compare.
			if ( thisVersion > latestVersion.vString ) {
				latestVersionRet.collectKey = collectKey
				latestVersionRet.vString    = thisVersion
				latestVersionRet.vParts     = thisVersionParts
			}
			return latestVersionRet
		}

		for ( let i = 0; i < latestVersion.vParts.length; i++ ) {
			if ( thisVersionParts[i] < latestVersion.vParts[i] ) {
				break
			}
			if ( latestVersion.vParts[i] < thisVersionParts[i] ) {
				latestVersionRet.collectKey = collectKey
				latestVersionRet.vString    = thisVersion
				latestVersionRet.vParts     = thisVersionParts
				return latestVersionRet
			}
		}

		return latestVersionRet
	} catch (err) {
		window.log.warning(`Version compare failed :: ${latestVersion} / ${thisVersion} :: ${err}`, 'resolve_ui')
	}
}


function makeLine(mod, version) {
	if ( mod.version === version.vString ) { //same
		return fsgUtil.useTemplate('version_same', {
			collectName : mod.collectName,
			shortname   : mod.modRecord.fileDetail.shortName,
			title       : fsgUtil.escapeSpecial(mod.modRecord.l10n.title),
		})
	}

	return fsgUtil.useTemplate('version_diff', {
		collectKey  : mod.collectKey,
		collectName : mod.collectName,
		shortname   : mod.modRecord.fileDetail.shortName,
		title       : fsgUtil.escapeSpecial(mod.modRecord.l10n.title),
		version     : mod.version,
	})
}

function clientDoCopy() {
	const fileMap = []

	for ( const thisCheck of fsgUtil.query(':checked') ) {
		fileMap.push([thisCheck.value, cacheCollection, `${cacheShortName}.zip`])
	}

	window.mods.realCopyFile(fileMap)
}
