/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// copy/move confirm UI

/* global l10n, fsgUtil, getText */


/*  __ ____   ______        
   |  |_   | |      |.-----.
   |  |_|  |_|  --  ||     |
   |__|______|______||__|__| */

function processL10N()          { clientGetL10NEntries() }
function clientGetL10NEntries() {
	const l10nSendItems = new Set()

	fsgUtil.query('l10n').forEach((thisL10nItem) => {
		l10nSendItems.add(fsgUtil.getAttribNullEmpty(thisL10nItem, 'name'))
	})

	l10n.getText_send(l10nSendItems)
}

window.l10n.receive('fromMain_getText_return', (data) => {
	fsgUtil.query(`l10n[name="${data[0]}"]`).forEach((item) => { item.innerHTML = data[1] })
})
window.l10n.receive('fromMain_l10n_refresh', () => { processL10N() })


let lastRec = null

window.mods.receive('fromMain_subWindowSelectAll', () => {
	fsgUtil.query('[type="checkbox"]').forEach((element) => { element.checked = true })
})
window.mods.receive('fromMain_subWindowSelectNone', () => {
	fsgUtil.query('[type="checkbox"]').forEach((element) => { element.checked = false })
})

window.mods.receive('fromMain_confirmList', (confList) => {
	const selectOpts = []

	selectOpts.push(['...', 0])

	lastRec = confList

	Object.keys(confList.foldersMap).forEach((safeName) => {
		if ( safeName !== confList.collection ) {
			const humanName = `${fsgUtil.basename(confList.foldersMap[safeName])}${window.mods.getCollDesc(safeName)}`
			selectOpts.push([humanName, safeName])
		}
	})

	const selectHTML = []
	selectOpts.forEach((opt) => {
		selectHTML.push(`<option value="${opt[1]}">${opt[0]}</option>`)
	})
	fsgUtil.byId('select_destination').innerHTML = selectHTML.join('')

	updateConfirmList()
})

function updateConfirmList() {
	const confirmHTML  = []
	const selectedDest = fsgUtil.byId('select_destination').value

	lastRec.records.forEach((mod) => {
		const printPath = window.mods.homeDirMap(`${lastRec.foldersMap[lastRec.collection]}\\${fsgUtil.basename(mod.fileDetail.fullPath)}`)
		confirmHTML.push(`<div class="row border-bottom">
			<div class="col col-auto">
				<div class="p-2" style="width: 110px; height:110px;">
					<img class="img-fluid" src="${fsgUtil.iconMaker(mod.modDesc.iconImageCache)}" />
				</div>
			</div>
			<div class="col">
				<h4 class="mb-0 mt-2">${mod.fileDetail.shortName} <span class="ps-3 small text-muted">${fsgUtil.escapeSpecial(mod.l10n.title)}</span></h4>
				<p class="font-monospace small mb-1">${printPath}</p>`)

		if ( selectedDest === '0' ) {
			confirmHTML.push(`<div class="row mt-0"><div class="col col-form-label">${getText('no_destination_selected')}</div></div>`)
		} else if ( findConflict(selectedDest, mod.fileDetail.shortName, mod.fileDetail.isFolder) ) {
			confirmHTML.push(`<div class="row mt-0">
				<div class="col-8 col-form-label">${getText('destination_full')}</div>
				<div class="col-4 col-form-label">
					<div class="form-check">
						<input class="form-check-input" type="checkbox" value="" id="${mod.uuid}">
						<label class="form-check-label" for="${mod.uuid}">${getText('overwrite')}</label>
					</div>
				</div>
			</div>`)
		} else {
			confirmHTML.push(`<div class="row mt-0">
				<div class="col col-form-label">${getText('destination_clear')}</div>
			</div>
			<input type="hidden" value="1" id="${mod.uuid}" />`)
		}

		confirmHTML.push('</div></div>')
	})

	fsgUtil.byId('confirm_list').innerHTML = confirmHTML.join('')
	processL10N()
}

function findConflict(collection, shortName, folder) {
	let foundConf = false
	lastRec.list[collection].mods.forEach((mod) => {
		if ( !foundConf && shortName === mod.fileDetail.shortName && folder === mod.fileDetail.isFolder ) {
			foundConf = true
		}
	})
	return foundConf
}

function clientDoCopy() {
	const destination = fsgUtil.byId('select_destination').value

	if ( destination === '0' ) { return false }

	const fileMap = []

	lastRec.records.forEach((mod) => {
		const includeMeElement = fsgUtil.byId(mod.uuid)

		if ( includeMeElement.getAttribute('type') === 'checkbox' && includeMeElement.checked === true ) {
			fileMap.push([destination, lastRec.collection, mod.fileDetail.fullPath])
		}
		if ( includeMeElement.getAttribute('type') === 'hidden' && includeMeElement.value ) {
			fileMap.push([destination, lastRec.collection, mod.fileDetail.fullPath])
		}
	})

	window.mods.realCopyFile(fileMap)
}


function clientDoMove() {
	const destination = fsgUtil.byId('select_destination').value

	if ( destination === '0' ) { return false }

	const fileMap = []

	lastRec.records.forEach((mod) => {
		const includeMeElement = fsgUtil.byId(mod.uuid)

		if ( includeMeElement.getAttribute('type') === 'checkbox' && includeMeElement.checked === true ) {
			fileMap.push([destination, lastRec.collection, mod.fileDetail.fullPath])
		}
		if ( includeMeElement.getAttribute('type') === 'hidden' && includeMeElement.value ) {
			fileMap.push([destination, lastRec.collection, mod.fileDetail.fullPath])
		}
	})

	window.mods.realMoveFile(fileMap)
}
