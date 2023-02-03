/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Version window UI

/* global processL10N, fsgUtil, getText */

let cacheShortName   = null
let cacheCollection  = null


window.mods.receive('fromMain_subWindowSelectAll', () => {
	fsgUtil.query('[type="checkbox"]').forEach((element) => { element.checked = true })
})
window.mods.receive('fromMain_subWindowSelectNone', () => {
	fsgUtil.query('[type="checkbox"]').forEach((element) => { element.checked = false })
})

window.mods.receive('fromMain_modSet', (modSet, shortName) => {
	let latestVersion = { vString : null, vParts : [], collectKey : null }
	const modHTML = []

	fsgUtil.byId('modName').innerHTML = shortName
	cacheShortName = shortName

	modSet.forEach((mod) => {
		latestVersion = compareVersion(latestVersion, mod.version, mod.collectKey)
	})

	fsgUtil.byId('newVersion').innerHTML = latestVersion.vString
	fsgUtil.byId('copyButton').classList.remove('disabled')
	cacheCollection = latestVersion.collectKey

	modSet.forEach((mod) => {
		modHTML.push(makeLine(mod, latestVersion))
	})

	fsgUtil.byId('modSet').innerHTML = modHTML.join('')
	processL10N()
})

function compareVersion(latestVersion, thisVersion, collectKey) {
	const latestVersionRet = latestVersion
	const thisVersionParts = thisVersion.split('.')

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
		if ( latestVersion.vParts[i] < thisVersionParts[i] ) {
			latestVersionRet.collectKey = collectKey
			latestVersionRet.vString    = thisVersion
			latestVersionRet.vParts     = thisVersionParts
			return latestVersionRet
		}
	}

	return latestVersionRet
}


function makeLine(mod, version) {
	if ( mod.version === version.vString ) { //same
		return `<li class="list-group-item d-flex justify-content-between align-items-start list-group-item-dark">
			<div class="ms-2 me-auto">
				<div class="fw-bold">${mod.modRecord.fileDetail.shortName}</div>
				<div class="small">${fsgUtil.escapeSpecial(mod.modRecord.l10n.title)}</div>
				<div class="text-black small ps-3">${getText('destination')} ${mod.collectName} :: ${getText('version_same')}</div>
			</div>
		</li>`
	}

	return `<li class="list-group-item d-flex justify-content-between align-items-start list-group-item-danger">
		<div class="ms-2 me-auto">
			<div class="fw-bold">${mod.modRecord.fileDetail.shortName} <span class="small">${mod.version}</span></div>
			<div class="small">${fsgUtil.escapeSpecial(mod.modRecord.l10n.title)}</div>
			<div class="text-black small ps-3">${getText('destination')} ${mod.collectName}</div>
		</div>
		<input class="form-check-input form-check me-1" type="checkbox" name="modToCopy[]" value="${mod.collectKey}">
	</li>`
}

function clientDoCopy() {
	const checked = fsgUtil.query(':checked')
	const fileMap = []

	checked.forEach((thisCheck) => {
		fileMap.push([thisCheck.value, cacheCollection, `${cacheShortName}.zip`])
	})

	
	window.mods.realCopyFile(fileMap)
}
