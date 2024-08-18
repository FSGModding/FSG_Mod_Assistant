/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */
// MARK: RESOLVE UI

/* global MA, bootstrap, DATA */

document.addEventListener('DOMContentLoaded', () => {
	window.state = new windowState()
})

class windowState {
	overlay = null

	constructor() {
		this.overlay = new bootstrap.Modal('#fileOpProgress', { backdrop : 'static', keyboard : false })

		window.resolve_IPC.receive('resolve:shortname', (key) => { this.gotData(key) })

		window.operations.receive('select:all',    MA.fileOpCheckAll)
		window.operations.receive('select:none',   MA.fileOpCheckNone)
		window.operations.receive('select:invert', MA.fileOpCheckInv)
	}

	// MARK: page build
	doLine(thisMod, sourceMod) {
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

	// MARK: comparisons
	getMostRecent(verList) {
		for ( const testVersion of verList ) {
			if ( this.unwrapVersion(testVersion.version)[0] === false ) { return false }
		}
		return verList.reduce((last, current) => this.maxVersion(last, current))
	}

	unwrapVersion(verString) {
		if ( verString.match(/[^\d.]/) ) { return [false, null] }
		const parts = verString.split('.').map((x) => parseInt(x))
		while ( parts.length < 4 ) { parts.push(0) }
		return [true, parts]
	}

	maxVersion(a, b) {
		const [_a, verA] = this.unwrapVersion(a.version)
		const [_b, verB] = this.unwrapVersion(b.version)
	
		if ( verA[0] !== verB[0] ) { return verA[0] > verB[0] ? a : b }
		if ( verA[1] !== verB[1] ) { return verA[1] > verB[1] ? a : b }
		if ( verA[2] !== verB[2] ) { return verA[2] > verB[2] ? a : b }
		if ( verA[3] !== verB[3] ) { return verA[3] > verB[3] ? a : b }
		return a
	}

	// MARK: receive data
	gotData(key) {
		MA.byIdText('modName', key)
		window.resolve_IPC.get(key).then((results) => {
			const sourceMod = this.getMostRecent(results)

			if ( sourceMod === false ) {
				MA.byId('versionBroken').clsShow()
				MA.byId('versionInfo').clsHide()
				return
			}

			MA.byIdText('newVersion', sourceMod.version)

			const modListDiv = MA.byId('modSet')

			modListDiv.innerHTML = ''
			for ( const thisMod of results ) {
				modListDiv.appendChild(this.doLine(thisMod, sourceMod))
			}

			// MARK: copy button action
			MA.byIdEventIfExists('copyButton', () => {
				window.fileOpOverlay.show()
				MA.byId('fileOpWorking').clsShow()
				MA.byId('fileOpSuccess').clsHide()
				MA.byId('fileOpDanger').clsHide()
				MA.byId('badFileFeedback').clsHide()
				const fileOpPacket = []
				for ( const thisCheck of MA.query('.fileOpCheck:checked') ) {
					fileOpPacket.push({
						destinations      : [thisCheck.value],
						source_collectKey : sourceMod.collectKey,
						source_modUUID    : sourceMod.modRecord.uuid,
						type              : 'copy',
					})
				}
				window.resolve_IPC.fileOp(fileOpPacket).then((opResult) => {
					const didFail = opResult.some((x) => x.status === false )
					if ( didFail ) {
						MA.byId('fileOpDanger').clsShow()
						MA.byId('fileOpWorking').clsHide()
						MA.byId('badFileFeedback').clsShow()
						const badFiles = opResult
							.filter((x) => x.status === false)
							.map((x) => {
								if ( x.type === 'delete' ) {
									return `<i class="bi bi-trash3"></i> ${x.source}`
								}
								return `-> ${x.dest}<br>`
							})
						MA.byId('badFileList').innerHTML = badFiles.join('')
					} else {
						MA.byId('fileOpSuccess').clsShow()
						MA.byId('fileOpWorking').clsHide()
					}

					setTimeout(() => {
						if ( ! didFail ) {
							window.operations.close()
						} else {
							location.reload()
						}
					}, didFail ? 5000 : 1500)
				})
			})
		})
	}
}