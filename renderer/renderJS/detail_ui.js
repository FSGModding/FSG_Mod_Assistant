/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Detail window UI

/*eslint complexity: off*/
/* global processL10N, fsgUtil, getText, clientGetKeyMap, clientGetKeyMapSimple, clientMakeCropCalendar */


window.mods.receive('fromMain_modRecord', (modCollect) => {
	try {
		buildPage(modCollect)
	} catch (e) {
		window.log.warning(`Page build failed :: ${e}`, 'detail-ui')
	}
	processL10N()
})

const buildPage = (modCollect) => {
	const modRecord = modCollect.opts.selected
	const modDate   = new Date(Date.parse(modRecord.fileDetail.fileDate))

	const idMap = {
		bigFiles       : (( modRecord.fileDetail.tooBigFiles.length > 0 ) ? modRecord.fileDetail.tooBigFiles.join('\n') : getText('detail_extra_clean')),
		depends        : (( typeof modRecord.modDesc.depend !== 'undefined' && modRecord.modDesc.depend.length > 0 )  ? modRecord.modDesc.depend.join('\n')  : getText('detail_depend_clean')),
		description    : fsgUtil.escapeDesc(modRecord.l10n.description),
		extraFiles     : (( modRecord.fileDetail.extraFiles.length > 0 )  ? modRecord.fileDetail.extraFiles.join('\n')  : getText('detail_extra_clean')),
		file_date      : modDate.toLocaleString(modCollect.currentLocale, {timeZoneName : 'short'}),
		filesize       : fsgUtil.bytesToHR(modRecord.fileDetail.fileSize, modRecord.currentLocale),
		has_scripts    : checkX(modRecord.modDesc.scriptFiles),
		i3dFiles       : modRecord.fileDetail.i3dFiles.join('\n'),
		is_multiplayer : checkX(modRecord.modDesc.multiPlayer, false),
		mh_version     : ( modRecord.modHub.id !== null ) ? modRecord.modHub.version : `<em>${getText(modRecord.modHub.id === null ? 'mh_norecord' : 'mh_unknown' )}</em>`,
		mod_author     : fsgUtil.escapeSpecial(modRecord.modDesc.author),
		mod_location   : modRecord.fileDetail.fullPath,
		pngTexture     : (( modRecord.fileDetail.pngTexture.length > 0 )  ? modRecord.fileDetail.pngTexture.join('\n')  : getText('detail_extra_clean')),
		spaceFiles     : (( modRecord.fileDetail.spaceFiles.length > 0 )  ? modRecord.fileDetail.spaceFiles.join('\n')  : getText('detail_extra_clean')),
		store_items    : `${modRecord.modDesc.storeItems > 0 ? makeStoreButton(modRecord) : ''} ${checkX(modRecord.modDesc.storeItems)}`,
		title          : (( modRecord.l10n.title !== null && modRecord.l10n.title !== 'n/a' ) ? fsgUtil.escapeSpecial(modRecord.l10n.title) : modRecord.fileDetail.shortName),
		version        : fsgUtil.escapeSpecial(modRecord.modDesc.version),
	}

	for ( const key in idMap ) { fsgUtil.byId(key).innerHTML = idMap[key] }

	fsgUtil.query('#description a').forEach((link) => { link.target = '_BLANK' })

	const keyBinds = []
	for ( const action in modRecord.modDesc.binds ) {
		const thisBinds = modRecord.modDesc.binds[action].map((keyCombo) => clientGetKeyMapSimple(keyCombo, modCollect.currentLocale))
		keyBinds.push(`${action} :: ${thisBinds.join(' / ')}`)
	}
	
	fsgUtil.byId('keyBinds').innerHTML = ( keyBinds.length > 0 ) ? keyBinds.join('\n') : getText('detail_key_none')

	const bindingIssue     = modCollect.bindConflict[modRecord.currentCollection][modRecord.fileDetail.shortName]
	const bindingIssueTest = typeof bindingIssue !== 'undefined'

	if ( modRecord.issues.length < 1 && !bindingIssueTest ) {
		fsgUtil.byId('problem_div').classList.add('d-none')
	} else {
		const problems = []
		for ( const issue of modRecord.issues ) {
			let issueText = getText(issue)
		
			if ( issue === 'FILE_ERROR_LIKELY_COPY' && modRecord.fileDetail.copyName !== false ) {
				issueText += ` ${getText('file_error_copy_name')} ${modRecord.fileDetail.copyName}${modRecord.fileDetail.isFolder?'':'.zip'}`
			}
			problems.push(`<tr class="py-2"><td class="px-2">${checkX(0, false)}</td><td>${issueText}</td></tr>`)
		}

		if ( bindingIssueTest ) {
			for ( const keyCombo in bindingIssue ) {
				const actualKey = clientGetKeyMap(keyCombo, modCollect.currentLocale)
				const confList  = bindingIssue[keyCombo].join(', ')
				const issueText = `${getText('bind_conflict')} : ${actualKey} :: ${confList}`
				problems.push(`<tr class="py-2"><td class="px-2">${checkX(0, false)}</td><td>${issueText}</td></tr>`)
			}
		}

		fsgUtil.byId('problems').innerHTML = `<table class="table table-borderless">${problems.join('')}</table>`
	}

	const displayBadges = modRecord.badgeArray || []

	
	if ( Object.keys(modRecord.modDesc.binds).length > 0 ) {
		displayBadges.push(( typeof modCollect.bindConflict[modRecord.currentCollection][modRecord.fileDetail.shortName] !== 'undefined' ) ?
			'keys_bad' :
			'keys_ok'
		)
	}
	if ( modRecord.modHub.id !== null && modRecord.modHub.version !== null && modRecord.modDesc.version !== modRecord.modHub.version ) {
		displayBadges.push('update')
	}
	if ( modRecord.modHub.recent ) {
		displayBadges.push('recent')
	}
	if ( modRecord.modHub.id === null ){
		displayBadges.push('nonmh')
		fsgUtil.byId('modhub_link').classList.add('d-none')
	}
	if ( modRecord.modHub.id !== null ){
		fsgUtil.byId('modhub_link').innerHTML = `<a target="_BLANK" href="https://www.farming-simulator.com/mod.php?mod_id=${modRecord.modHub.id}">www.farming-simulator.com/mod.php?mod_id=${modRecord.modHub.id}</a>`
	}
	if ( typeof modRecord.modDesc.depend !== 'undefined' && modRecord.modDesc.depend.length > 0 ) {
		displayBadges.unshift('depend_flag')
	}
	if (modCollect.appSettings.game_version !== modRecord.gameVersion) {
		displayBadges.unshift(`fs${modRecord.gameVersion}`)
	}
	

	if ( displayBadges.includes('broken') && displayBadges.includes('notmod') ) {
		const brokenIdx = displayBadges.indexOf('broken')
		displayBadges.splice(brokenIdx, brokenIdx !== -1 ? 1 : 0)
	}

	const theseBadges = Array.from(displayBadges, (badge) => fsgUtil.badge(false, badge)).join(' ')

	fsgUtil.setTextOrHide(
		'badges',
		theseBadges,
		theseBadges
	)

	fsgUtil.setTextOrHide(
		'icon_div',
		`<img class="img-fluid" src="${modRecord.modDesc.iconImageCache}" />`,
		modRecord.modDesc.iconImageCache
	)

	if ( typeof modRecord.modDesc.cropInfo !== 'undefined' && modRecord.modDesc.cropInfo !== false ) {
		fsgUtil.byId('cropcal_div').classList.remove('d-none')
		clientMakeCropCalendar('crop-table', modRecord.modDesc.cropInfo, modRecord.modDesc?.mapIsSouth || false)
		fsgUtil.byId('cropjson').innerHTML = JSON.stringify(modRecord.modDesc.cropInfo)
	}
}

function makeStoreButton(modRecord) {
	return ( modRecord.gameVersion < 22 ) ? '' : `<button onclick="window.mods.lookInMod('${modRecord.colUUID}')" class="btn btn-vsm btn-primary"><l10n name="look_detail_button"></l10n></button>`
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
