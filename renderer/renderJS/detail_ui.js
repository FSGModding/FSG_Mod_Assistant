/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Detail window UI

/* global l10n, fsgUtil, bootstrap, getText */


/*  __ ____   ______        
   |  |_   | |      |.-----.
   |  |_|  |_|  --  ||     |
   |__|______|______||__|__| */

function processL10N()          { clientGetL10NEntries() }
function clientChangeL10N()     { l10n.langList_change(fsgUtil.byId('language_select').value) }
function clientGetL10NEntries() {
	const l10nSendItems = new Set()

	fsgUtil.query('l10n').forEach((thisL10nItem) => {
		l10nSendItems.add(fsgUtil.getAttribNullError(thisL10nItem, 'name'))
	})

	l10n.getText_send(l10nSendItems)
}

window.l10n.receive('fromMain_getText_return', (data) => {
	fsgUtil.query(`l10n[name="${data[0]}"]`).forEach((item) => { item.innerHTML = data[1] })
})

window.l10n.receive('fromMain_getText_return_title', (data) => {
	fsgUtil.query(`l10n[name="${data[0]}"]`).forEach((item) => {
		item.parentElement.title = data[1]
		new bootstrap.Tooltip(item.parentElement)
	})
})

window.l10n.receive('fromMain_l10n_refresh', () => { processL10N() })


window.mods.receive('fromMain_modRecord', (modRecord, modhubRecord) => {
	const mhVer = ( modhubRecord[1] !== null ) ? modhubRecord[1] : `<em>${getText(modhubRecord[0] === null ? 'mh_norecord' : 'mh_unknown' )}</em>`

	const idMap = {
		filesize       : fsgUtil.bytesToHR(modRecord.fileDetail.fileSize, modRecord.currentLocale),
		file_date      : modRecord.fileDetail.fileDate.substring(0, 16),
		title          : (( modRecord.l10n.title !== null && modRecord.l10n.title !== 'n/a' ) ? modRecord.l10n.title : modRecord.fileDetail.shortName),
		mod_location   : modRecord.fileDetail.fullPath,
		mod_author     : modRecord.modDesc.author,
		version        : modRecord.modDesc.version,
		mh_version     : mhVer,
		has_scripts    : checkX(modRecord.modDesc.scriptFiles),
		store_items    : checkX(modRecord.modDesc.storeItems),
		is_multiplayer : checkX(modRecord.modDesc.multiPlayer, false),
		description    : modRecord.l10n.description,
		i3dFiles       : modRecord.fileDetail.i3dFiles.join('\n'),
		extraFiles     : (( modRecord.fileDetail.extraFiles.length > 0 )  ? modRecord.fileDetail.extraFiles.join('\n')  : getText('detail_extra_clean')),
		bigFiles       : (( modRecord.fileDetail.tooBigFiles.length > 0 ) ? modRecord.fileDetail.tooBigFiles.join('\n') : getText('detail_extra_clean')),
		spaceFiles     : (( modRecord.fileDetail.spaceFiles.length > 0 )  ? modRecord.fileDetail.spaceFiles.join('\n')  : getText('detail_extra_clean')),
		pngTexture     : (( modRecord.fileDetail.pngTexture.length > 0 )  ? modRecord.fileDetail.pngTexture.join('\n')  : getText('detail_extra_clean')),
	}
	Object.keys(idMap).forEach((key) => {
		fsgUtil.byId(key).innerHTML = idMap[key]
	})

	if ( modRecord.issues.length < 1 ) {
		fsgUtil.byId('problem_div').classList.add('d-none')
	} else {
		const problems = []
		modRecord.issues.forEach((issue) => {
			let issueText = getText(issue)
		
			if ( issue === 'FILE_ERROR_LIKELY_COPY' && modRecord.fileDetail.copyName !== false ) {
				issueText += ` ${getText('file_error_copy_name')} ${modRecord.fileDetail.copyName}${modRecord.fileDetail.isFolder?'':'.zip'}`
			}
			problems.push(`<tr class="py-2"><td class="px-2">${checkX(0, false)}</td><td>${issueText}</td></tr>`)
		})
		fsgUtil.byId('problems').innerHTML = `<table class="table table-borderless">${problems.join('')}</table>`
	}

	textOrHide(
		'badges',
		modRecord.badges,
		modRecord.badges
	)
	textOrHide(
		'icon_div',
		`<img class="img-fluid" src="${modRecord.modDesc.iconImageCache}" />`,
		modRecord.modDesc.iconImageCache
	)

	processL10N()
})

function textOrHide(id, content, test) {
	if ( test === null || test === '' ) {
		fsgUtil.byId(id).classList.add('d-none')
	} else {
		fsgUtil.byId(id).innerHTML = content
	}
}

function checkX(amount, showCount = true) {
	let returner = ''
	if ( amount > 0 ) {
		returner += fsgUtil.getIcon('check', 'success')
	} else {
		returner += fsgUtil.getIcon('x', 'danger')
	}
	return `${returner} ${(showCount)?amount:''}`
}


