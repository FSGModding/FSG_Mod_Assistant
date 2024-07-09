/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */
// MARK: RESOLVE UI

/* global MA, bootstrap, DATA */


// MARK: receive data
window.resolve_IPC.receive('resolve:shortname', (key) => {
	MA.byIdText('modName', key)
	window.resolve_IPC.get(key).then((results) => {
		const sourceMod = getMostRecent(results)

		if ( sourceMod === false ) {
			MA.byId('versionBroken').clsShow()
			MA.byId('versionInfo').clsHide()
			return
		}

		MA.byIdText('newVersion', sourceMod.version)

		const modListDiv = MA.byId('modSet')

		modListDiv.innerHTML = ''
		for ( const thisMod of results ) {
			modListDiv.appendChild(doLine(thisMod, sourceMod))
		}

		// MARK: copy button
		MA.byIdEventIfExists('copyButton', () => {
			window.fileOpOverlay.show()
			MA.byId('fileOpWorking').clsShow()
			MA.byId('fileOpSuccess').clsHide()
			MA.byId('fileOpDanger').clsHide()
			const fileOpPacket = []
			for ( const thisCheck of MA.query('.fileOpCheck:checked') ) {
				fileOpPacket.push({
					destinations      : [thisCheck.value],
					source_collectKey : sourceMod.collectKey,
					source_modUUID    : sourceMod.modRecord.uuid,
					type              : 'copy',
				})
			}
			window.resolve_IPC.fileOp(fileOpPacket).then((operResult) => {
				console.log(operResult)
			})
		})
	})
})

window.operations.receive('select:all',    MA.fileOpCheckAll)
window.operations.receive('select:none',   MA.fileOpCheckNone)
window.operations.receive('select:invert', MA.fileOpCheckInv)

// MARK: comparisons
function getMostRecent(verList) {
	for ( const testVersion of verList ) {
		if ( unwrapVersion(testVersion.version)[0] === false ) { return false }
	}
	return verList.reduce((last, current) => maxVersion(last, current))
}

function unwrapVersion(verString) {
	if ( verString.match(/[^\d.]/) ) { return [false, null] }
	const parts = verString.split('.').map((x) => parseInt(x))
	while ( parts.length < 4 ) { parts.push(0) }
	return [true, parts]
}

function maxVersion(a, b) {
	const [_a, verA] = unwrapVersion(a.version)
	const [_b, verB] = unwrapVersion(b.version)

	if ( verA[0] !== verB[0] ) { return verA[0] > verB[0] ? a : b }
	if ( verA[1] !== verB[1] ) { return verA[1] > verB[1] ? a : b }
	if ( verA[2] !== verB[2] ) { return verA[2] > verB[2] ? a : b }
	if ( verA[3] !== verB[3] ) { return verA[3] > verB[3] ? a : b }
	return a
}


// MARK: page build
function doLine(thisMod, sourceMod) {
	if ( thisMod.version === sourceMod.version ) {
		return DATA.templateEngine('version_same', {
			collectName : thisMod.collectName,
			shortName   : thisMod.modRecord.fileDetail.shortName,
			title       : DATA.escapeSpecial(thisMod.modRecord.l10n.title),
		})
	}
	const node = DATA.templateEngine('version_diff', {
		collectName : thisMod.collectName,
		shortName   : thisMod.modRecord.fileDetail.shortName,
		title       : DATA.escapeSpecial(thisMod.modRecord.l10n.title),
		version     : thisMod.version,
	})

	const fileCheck = node.querySelector('.fileOpCheck')

	fileCheck.value = thisMod.collectKey
	fileCheck.addEventListener('change', () => {
		MA.byId('copyButton').clsEnable(MA.queryA('.fileOpCheck:checked').length !== 0)
	})
	return node
}


document.addEventListener('DOMContentLoaded', () => {
	window.fileOpOverlay = new bootstrap.Modal('#fileOpProgress', { backdrop : 'static', keyboard : false })
})