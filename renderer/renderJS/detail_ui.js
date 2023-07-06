/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Detail window UI

/*eslint complexity: off*/
/* global processL10N, fsgUtil, getText, clientGetKeyMap, clientGetKeyMapSimple, clientMakeCropCalendar */

window.mods.receive('fromMain_lookRecord', (modRecord, lookRecord, currentLocale) => {
	try {
		buildStore(modRecord, lookRecord, currentLocale)
	} catch (e) {
		window.log.warning(`Page build failed :: ${e}`, 'detail-ui')
	}
	processL10N()
})

window.mods.receive('fromMain_modRecord', (modCollect) => {
	try {
		buildPage(modCollect)
	} catch (e) {
		window.log.warning(`Page build failed :: ${e}`, 'detail-ui')
	}
	processL10N()
})

const buildStore = (modRecord, lookRecord, currentLocale) => {
	const idMap = {
		mod_location   : modRecord.fileDetail.fullPath,
		title          : (( modRecord.l10n.title !== null && modRecord.l10n.title !== 'n/a' ) ? fsgUtil.escapeSpecial(modRecord.l10n.title) : modRecord.fileDetail.shortName),
	}

	for ( const key in idMap ) { fsgUtil.byId(key).innerHTML = idMap[key] }

	const storeItemsHTML = []

	for ( const storeitem in lookRecord.items ) {
		const thisItem = lookRecord.items[storeitem]

		if ( thisItem.masterType === 'vehicle' ) {
			let brandImage = null
			if ( typeof thisItem.brand === 'string' ) {
				if ( typeof lookRecord?.brands?.[thisItem.brand]?.icon !== 'undefined' ) {
					brandImage = lookRecord.brands[thisItem.brand].icon
				} else {
					brandImage = ( fsgUtil.knownBrand.includes(thisItem.brand.toLowerCase()) ) ? `img/brand/brand_${thisItem.brand.toLowerCase()}.png` : null
				}
			}

			const maxSpeed   = getDefault(thisItem?.specs?.maxspeed)
			const thePower   = getDefault(thisItem?.specs?.power)
			const getPower   = getDefault(thisItem?.specs?.neededpower)
			const theWidth   = getDefault(thisItem?.specs?.workingwidth, true)
			const theFill    = getDefault(thisItem.fillLevel)
			const fillImages = thisItem.fillTypes.map((thisFill) => fsgUtil.knownFills.includes(thisFill) ? `<img style="height: 25px" src="img/fills/${thisFill}.png">` : '')
			
			storeItemsHTML.push(fsgUtil.useTemplate('vehicle_div', {
				brandHIDE         : shouldHide(brandImage),
				brandIMG          : fsgUtil.iconMaker(brandImage),
				category          : thisItem.category,
				enginePower       : formatManyNumber(thePower, currentLocale, [
					{ factor : 1,      precision : 0, unit : 'unit_hp' },
					{ factor : 0.7457, precision : 1, unit : 'unit_kw' },
				]),
				fillImages        : fillImages.join(' '),
				fillUnit          : formatManyNumber(theFill, currentLocale, [
					{ factor : 1,         precision : 0, unit : 'unit_l' },
					{ factor : 0.001,     precision : 1, unit : 'unit_m3' },
					{ factor : 0.0353147, precision : 1, unit : 'unit_ft3' },
				]),
				functions         : thisItem.functions.join('<br>'),
				iconIMG           : fsgUtil.iconMaker(lookRecord?.icons?.[storeitem] || null),
				itemName          : thisItem.name,
				itemTitle         : thisItem.type,
				maxSpeed          : formatManyNumber(maxSpeed, currentLocale, [
					{ factor : 1,        precision : 0, unit : 'unit_kph' },
					{ factor : 0.621371, precision : 0, unit : 'unit_mph' },
				]),
				needPower         : formatManyNumber(getPower, currentLocale, [
					{ factor : 1,      precision : 0, unit : 'unit_hp' },
					{ factor : 0.7457, precision : 1, unit : 'unit_kw' },
				]),
				price             : Intl.NumberFormat(currentLocale).format(thisItem.price),
				show_diesel       : shouldHide(thisItem.fuelType, 'diesel'),
				show_electric     : shouldHide(thisItem.fuelType, 'electriccharge'),
				show_enginePower  : shouldHide(thisItem?.specs?.power),
				show_fillUnit     : thisItem.fillLevel > 0 ? '' : 'd-none',
				show_hasBeacons   : shouldHide(thisItem.hasBeacons),
				show_hasLights    : shouldHide(thisItem.hasLights),
				show_hasPaint     : shouldHide(thisItem.hasColor),
				show_hasWheels    : shouldHide(thisItem.hasWheelChoice),
				show_maxSpeed     : shouldHide(thisItem?.specs?.maxspeed),
				show_methane      : shouldHide(thisItem.fuelType, 'methane'),
				show_needPower    : shouldHide(thisItem?.specs?.neededpower),
				show_price        : shouldHide(thisItem.price),
				show_transmission : shouldHide(thisItem.transType),
				show_weight       : shouldHide(thisItem.weight),
				show_workWidth    : shouldHide(thisItem?.specs?.workingwidth),
				transmission      : thisItem.transType,
				typeDesc          : thisItem.typeDesc,
				weight            : formatManyNumber(thisItem.weight, currentLocale, [
					{ factor : 1,    precision : 0, unit : 'unit_kg' },
					{ factor : 0.01, precision : 1, unit : 'unit_t' },
				]),
				workWidth         : formatManyNumber(theWidth, currentLocale, [
					{ factor : 1,       precision : 1, unit : 'unit_m' },
					{ factor : 3.28084, precision : 1, unit : 'unit_ft' },
				]),
			}))
		}

		if ( thisItem.masterType === 'placeable' ) {
			const fillImages = thisItem.silo.types.map((thisFill) => fsgUtil.knownFills.includes(thisFill) ? `<img style="height: 25px" src="img/fills/${thisFill}.png">` : '')

			storeItemsHTML.push(fsgUtil.useTemplate('place_div', {
				animalCount      : thisItem.husbandry.capacity,
				category          : thisItem.category,
				fillImages       : fillImages.join(' '),
				fillUnit         : formatManyNumber(thisItem.silo.capacity, currentLocale, [
					{ factor : 1,         precision : 0, unit : 'unit_l' },
					{ factor : 0.001,     precision : 1, unit : 'unit_m3' },
					{ factor : 0.0353147, precision : 1, unit : 'unit_ft3' },
				]),
				functions        : thisItem.functions.join('<br>'),
				hasBee           : `${formatManyNumber(thisItem.beehive.radius, currentLocale, [{factor : 1, precision : 0, unit : 'unit_m'}])} / ${formatManyNumber(thisItem.beehive.liters, currentLocale, [{factor : 1, precision : 0, unit : 'unit_l'}])}`,
				iconIMG          : fsgUtil.iconMaker(lookRecord?.icons?.[storeitem] || null),
				income           : thisItem.incomePerHour ?? 0,
				itemName         : thisItem.name,
				itemTitle        : thisItem.type,
				objectCount      : thisItem.objectStorage ?? 0,
				price            : Intl.NumberFormat(currentLocale).format(thisItem.price),
				show_fillUnit    : shouldHide(thisItem.silo.exists),
				show_hasBee      : shouldHide(thisItem.beehive.exists),
				show_hasChicken  : shouldHide(thisItem.husbandry.type, 'CHICKEN'),
				show_hasCow      : shouldHide(thisItem.husbandry.type, 'COW'),
				show_hasHorse    : shouldHide(thisItem.husbandry.type, 'HORSE'),
				show_hasPaint    : shouldHide(thisItem.hasColor),
				show_hasPig      : shouldHide(thisItem.husbandry.type, 'PIG'),
				show_hasSheep    : shouldHide(thisItem.husbandry.type, 'SHEEP'),
				show_income      : shouldHide(thisItem.incomePerHour),
				show_objectStore : shouldHide(thisItem.objectStorage),
			}))
		}
	}

	fsgUtil.byId('storeitems').innerHTML = storeItemsHTML.join('')
	fsgUtil.byId('store_div').classList.remove('d-none')
}

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
		store_items    : checkX(modRecord.modDesc.storeItems),
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


function checkX(amount, showCount = true) {
	let returner = ''
	if ( amount > 0 ) {
		returner += fsgUtil.getIcon('check', 'success')
	} else {
		returner += fsgUtil.getIcon('x', 'danger')
	}
	return `${(showCount)?amount:''} ${returner}`
}


function getDefault(value, float = false, safe = 0) {
	const newValue = typeof value !== 'undefined' ? value : safe
	return !float ? parseInt(newValue) : parseFloat(newValue)
}

function formatManyNumber(value, locale, transArray) {
	const returnText = []

	for ( const thisTrans of transArray ) {
		const thisNumber = value * thisTrans.factor
		returnText.push(`${Intl.NumberFormat(locale, { maximumFractionDigits : thisTrans.precision }).format(thisNumber)} ${getText(thisTrans.unit)}`)
	}

	return returnText.join(' / ')
}

function shouldHide(item, wanted = null) {
	if ( typeof item === 'undefined' || item === null || item === false || item === '' ) {
		return 'd-none'
	}
	if ( wanted !== null && item.toLowerCase() !== wanted.toLowerCase() ) {
		return 'd-none'
	}
	return ''
}
