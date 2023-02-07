/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// copy/move confirm UI

/* global fsgUtil, getText, processL10N */

//TODO : make version aware

let lastModCollect     = null
let lastFolderRelative = null

window.mods.receive('fromMain_subWindowSelectAll', () => {
	fsgUtil.query('[type="checkbox"]').forEach((element) => { element.checked = true })
})
window.mods.receive('fromMain_subWindowSelectNone', () => {
	fsgUtil.query('[type="checkbox"]').forEach((element) => { element.checked = false })
})

window.mods.receive('fromMain_confirmList', (modCollect) => {
	lastModCollect     = modCollect
	lastFolderRelative = modCollect.collectionToFolderRelative[modCollect.opts.originCollectKey]
	
	const selectHTML = []

	selectHTML.push('<option value="0">...</option>')

	modCollect.set_Collections.forEach((collectKey) => {
		if ( collectKey !== modCollect.opts.originCollectKey ) {
			selectHTML.push(`<option value="${collectKey}">${modCollect.collectionToFullName[collectKey]}</option>`)
		}
	})

	fsgUtil.byId('select_destination').innerHTML = selectHTML.join('')

	updateConfirmList()
})

function updateConfirmList() {
	const confirmHTML  = []
	const selectedDest = fsgUtil.byId('select_destination').value

	lastModCollect.opts.records.forEach((thisMod) => {
		const printPath = `${lastFolderRelative}\\${fsgUtil.basename(thisMod.fileDetail.fullPath)}`
		confirmHTML.push(`<div class="row border-bottom">
			<div class="col col-auto">
				<div class="p-2" style="width: 110px; height:110px;">
					<img class="img-fluid" src="${fsgUtil.iconMaker(thisMod.modDesc.iconImageCache)}" />
				</div>
			</div>
			<div class="col">
				<h4 class="mb-0 mt-2">${thisMod.fileDetail.shortName} <span class="ps-3 small text-muted">${fsgUtil.escapeSpecial(thisMod.l10n.title)}</span></h4>
				<p class="font-monospace small mb-1">${printPath}</p>`)

		if ( selectedDest === '0' ) {
			confirmHTML.push(`<div class="row mt-0"><div class="col col-form-label">${getText('no_destination_selected')}</div></div>`)
		} else if ( findConflict(selectedDest, thisMod.fileDetail.shortName, thisMod.fileDetail.isFolder) ) {
			confirmHTML.push(`<div class="row mt-0">
				<div class="col-8 col-form-label">${getText('destination_full')}</div>
				<div class="col-4 col-form-label">
					<div class="form-check">
						<input class="form-check-input" type="checkbox" value="" id="${thisMod.uuid}">
						<label class="form-check-label" for="${thisMod.uuid}">${getText('overwrite')}</label>
					</div>
				</div>
			</div>`)
		} else {
			confirmHTML.push(`<div class="row mt-0">
				<div class="col col-form-label">${getText('destination_clear')}</div>
			</div>
			<input type="hidden" value="1" id="${thisMod.uuid}" />`)
		}

		confirmHTML.push('</div></div>')
	})

	fsgUtil.byId('confirm_list').innerHTML = confirmHTML.join('')
	processL10N()
}

function findConflict(collectKey, shortName, folder) {
	let foundConf = false
	lastModCollect.modList[collectKey].modSet.forEach((modKey) => {
		const thisMod = lastModCollect.modList[collectKey].mods[modKey]

		if ( !foundConf && shortName === thisMod.fileDetail.shortName && folder === thisMod.fileDetail.isFolder ) {
			foundConf = true
		}
	})
	return foundConf
}

function getSelectedMods() {
	const destination = fsgUtil.byId('select_destination').value

	if ( destination === '0' ) { return false }

	const fileMap = []

	lastModCollect.opts.records.forEach((mod) => {
		const includeMeElement = fsgUtil.byId(mod.uuid)

		if ( includeMeElement.getAttribute('type') === 'checkbox' && includeMeElement.checked === true ) {
			fileMap.push([destination, lastModCollect.opts.originCollectKey, mod.fileDetail.fullPath])
		}
		if ( includeMeElement.getAttribute('type') === 'hidden' && includeMeElement.value ) {
			fileMap.push([destination, lastModCollect.opts.originCollectKey, mod.fileDetail.fullPath])
		}
	})

	return fileMap
}

function clientDoCopy() {
	window.mods.realCopyFile(getSelectedMods())
}


function clientDoMove() {
	window.mods.realMoveFile(getSelectedMods())
}
