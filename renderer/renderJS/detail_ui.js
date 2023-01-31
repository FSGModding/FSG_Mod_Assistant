/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Detail window UI

/* global l10n, fsgUtil, bootstrap, getText, clientGetKeyMap, clientGetKeyMapSimple */


/*  __ ____   ______        
   |  |_   | |      |.-----.
   |  |_|  |_|  --  ||     |
   |__|______|______||__|__| */

function processL10N()          { clientGetL10NEntries() }
function clientChangeL10N()     { l10n.langList_change(fsgUtil.byId('language_select').value) }
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

window.l10n.receive('fromMain_getText_return_title', (data) => {
	fsgUtil.query(`l10n[name="${data[0]}"]`).forEach((item) => {
		item.parentElement.title = data[1]
		new bootstrap.Tooltip(item.parentElement)
	})
})

window.l10n.receive('fromMain_l10n_refresh', () => { processL10N() })


window.mods.receive('fromMain_modRecord', (modCollect) => {
	console.log(modCollect)
	const modRecord = modCollect.opts.selected
	const mhVer     = ( modRecord.modHub.id !== null ) ? modRecord.modHub.version : `<em>${getText(modRecord.modHub.id === null ? 'mh_norecord' : 'mh_unknown' )}</em>`
	const modDate   = new Date(Date.parse(modRecord.fileDetail.fileDate))

	const idMap = {
		filesize       : fsgUtil.bytesToHR(modRecord.fileDetail.fileSize, modRecord.currentLocale),
		file_date      : modDate.toLocaleString(modCollect.currentLocale, {timeZoneName : 'short'}),
		title          : (( modRecord.l10n.title !== null && modRecord.l10n.title !== 'n/a' ) ? fsgUtil.escapeSpecial(modRecord.l10n.title) : modRecord.fileDetail.shortName),
		mod_location   : modRecord.fileDetail.fullPath,
		mod_author     : fsgUtil.escapeSpecial(modRecord.modDesc.author),
		version        : fsgUtil.escapeSpecial(modRecord.modDesc.version),
		mh_version     : mhVer,
		has_scripts    : checkX(modRecord.modDesc.scriptFiles),
		store_items    : checkX(modRecord.modDesc.storeItems),
		is_multiplayer : checkX(modRecord.modDesc.multiPlayer, false),
		description    : fsgUtil.escapeDesc(modRecord.l10n.description),
		i3dFiles       : modRecord.fileDetail.i3dFiles.join('\n'),
		extraFiles     : (( modRecord.fileDetail.extraFiles.length > 0 )  ? modRecord.fileDetail.extraFiles.join('\n')  : getText('detail_extra_clean')),
		bigFiles       : (( modRecord.fileDetail.tooBigFiles.length > 0 ) ? modRecord.fileDetail.tooBigFiles.join('\n') : getText('detail_extra_clean')),
		spaceFiles     : (( modRecord.fileDetail.spaceFiles.length > 0 )  ? modRecord.fileDetail.spaceFiles.join('\n')  : getText('detail_extra_clean')),
		pngTexture     : (( modRecord.fileDetail.pngTexture.length > 0 )  ? modRecord.fileDetail.pngTexture.join('\n')  : getText('detail_extra_clean')),
		depends        : (( typeof modRecord.modDesc.depend !== 'undefined' && modRecord.modDesc.depend.length > 0 )  ? modRecord.modDesc.depend.join('\n')  : getText('detail_depend_clean')),
	}
	Object.keys(idMap).forEach((key) => {
		fsgUtil.byId(key).innerHTML = idMap[key]
	})

	fsgUtil.byId('description').querySelectorAll('a').forEach((link) => { link.target = '_BLANK' })

	const keyBinds = []
	Object.keys(modRecord.modDesc.binds).forEach((action) => {
		const thisBinds = []
		modRecord.modDesc.binds[action].forEach((keyCombo) => { thisBinds.push(clientGetKeyMapSimple(keyCombo, modCollect.currentLocale))})
		keyBinds.push(`${action} :: ${thisBinds.join(' / ')}`)
	})
	
	fsgUtil.byId('keyBinds').innerHTML = ( keyBinds.length > 0 ) ? keyBinds.join('\n') : getText('detail_key_none')

	const bindingIssue     = modCollect.bindConflict[modRecord.currentCollection][modRecord.fileDetail.shortName]
	const bindingIssueTest = typeof bindingIssue !== 'undefined'

	if ( modRecord.issues.length < 1 && !bindingIssueTest ) {
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

		if ( bindingIssueTest ) {
			Object.keys(bindingIssue).forEach((keyCombo) => {
				const actualKey = clientGetKeyMap(keyCombo, modCollect.currentLocale)
				const confList  = bindingIssue[keyCombo].join(', ')
				const issueText = `${getText('bind_conflict')} : ${actualKey} :: ${confList}`
				problems.push(`<tr class="py-2"><td class="px-2">${checkX(0, false)}</td><td>${issueText}</td></tr>`)
			})
		}

		fsgUtil.byId('problems').innerHTML = `<table class="table table-borderless">${problems.join('')}</table>`
	}

	const displayBadges = modRecord.badgeArray || []

	if ( Object.keys(modRecord.modDesc.binds).length > 0 ) {
		if ( typeof modCollect.bindConflict[modRecord.currentCollection][modRecord.fileDetail.shortName] !== 'undefined' ) {
			displayBadges.push('keys_bad')
		} else {
			displayBadges.push('keys_ok')
		}
	}

	if ( modRecord.modHub.id !== null && modRecord.modHub.version !== null && modRecord.modDesc.version !== modRecord.modHub.version ) {
		displayBadges.push('update')
	}
	if ( modRecord.modHub.recent ) {
		displayBadges.push('recent')
	}
	if ( modRecord.modHub.id === null ) {
		displayBadges.push('nonmh')
		fsgUtil.byId('modhub_link').classList.add('d-none')
	} else {
		const modhubLink = `https://www.farming-simulator.com/mod.php?mod_id=${modRecord.modHub.id}`
		fsgUtil.byId('modhub_link').innerHTML = `<a target="_BLANK" href="${modhubLink}">${modhubLink}</a>`
	}

	if ( typeof modRecord.modDesc.depend !== 'undefined' && modRecord.modDesc.depend.length > 0 ) {
		displayBadges.push('depend_flag')
	}

	if ( displayBadges.includes('broken') && displayBadges.includes('notmod') ) {
		const brokenIdx = displayBadges.indexOf('broken')
		displayBadges.splice(brokenIdx, brokenIdx !== -1 ? 1 : 0)
	}

	const theseBadges = Array.from(displayBadges, (badge) => fsgUtil.badge(false, badge)).join(' ')

	textOrHide(
		'badges',
		theseBadges,
		theseBadges
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
	return `${(showCount)?amount:''} ${returner}`
}
