/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Detail window UI

/* global l10n, fsgUtil */


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
window.l10n.receive('fromMain_l10n_refresh', () => { processL10N() })


window.mods.receive('fromMain_modRecord', (modRecord) => {
	fsgUtil.byId('title').innerHTML          = modRecord.l10n.title
	fsgUtil.byId('mod_location').innerHTML   = modRecord.fileDetail.fullPath
	fsgUtil.byId('mod_author').innerHTML     = modRecord.modDesc.author
	fsgUtil.byId('version').innerHTML        = modRecord.modDesc.version
	fsgUtil.byId('has_scripts').innerHTML    = checkX(modRecord.modDesc.scriptFiles)
	fsgUtil.byId('store_items').innerHTML    = checkX(modRecord.modDesc.storeItems)
	fsgUtil.byId('is_multiplayer').innerHTML = checkX(modRecord.modDesc.multiPlayer, false)
	fsgUtil.byId('description').innerHTML    = modRecord.l10n.description

	if ( modRecord.fileDetail.extraFiles.length > 0 ) {
		fsgUtil.byId('extraFiles').innerHTML     = modRecord.fileDetail.extraFiles.join('\n')
	} else {
		fsgUtil.byId('extraFiles').innerHTML     = '<l10n name="detail_extra_clean"></l10n>'
	}
	fsgUtil.byId('i3dFiles').innerHTML       = modRecord.fileDetail.i3dFiles.join('\n')

	if ( modRecord.issues.length < 1 ) {
		fsgUtil.byId('problem_div').classList.add('d-none')
	} else {
		const problems = []
		modRecord.issues.forEach((issue) => {
			let issueText = `<l10n name="${issue}"></l10n>`
		
			if ( issue === 'FILE_ERROR_LIKELY_COPY' && modRecord.fileDetail.copyName !== false ) {
				issueText += ` <l10n name="file_error_copy_name"></l10n> ${modRecord.fileDetail.copyName}${modRecord.fileDetail.isFolder?'':'.zip'}`
			}
			problems.push(`<tr class="py-2"><td class="px-2">${checkX(0, false)}</td><td>${issueText}</td></tr>`)
		})
		fsgUtil.byId('problems').innerHTML = `<table class="table">${problems.join('')}</table>`
	}

	if ( modRecord.badges === '' ) {
		fsgUtil.byId('badges').classList.add('d-none')
	} else {
		fsgUtil.byId('badges').innerHTML = modRecord.badges
	}

	if ( modRecord.modDesc.iconImageCache !== null ) {
		fsgUtil.byId('icon_div').innerHTML = `<img class="img-fluid" src="${modRecord.modDesc.iconImageCache}" />`
	} else {
		fsgUtil.byId('icon_div').classList.add('d-none')
	}

	processL10N()
})


function checkX(amount, showCount = true) {
	let returner = ''
	if ( amount > 0 ) {
		returner += fsgUtil.getIcon('check', 'success')
	} else {
		returner += fsgUtil.getIcon('x', 'danger')
	}
	return `${returner} ${(showCount)?amount:''}`
}


