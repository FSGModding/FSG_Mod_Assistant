/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Detail window UI

/* global Chart, processL10N, fsgUtil, getText, clientGetKeyMap, clientGetKeyMapSimple, clientMakeCropCalendar */

window.mods.receive('fromMain_lookRecord', (_, lookRecord, chartUnits, currentLocale) => {
	try {
		buildStore(lookRecord, chartUnits, currentLocale)
		fsgUtil.clsHideTrue('store_process', true)
	} catch (e) {
		window.log.warning(`Store build failed :: ${e}`, 'detail-ui')
	}
	processL10N()
})

window.mods.receive('fromMain_modRecord', (modCollect) => {
	try {
		fsgUtil.clsShowTrue('store_process', modCollect.opts.hasStore)
		buildPage(modCollect)
	} catch (e) {
		window.log.warning(`Page build failed :: ${e}`, 'detail-ui')
	}
	processL10N()
})

const buildStore = (lookRecord, chartUnits, currentLocale) => {
	const storeItemsHTML = []
	const storeItemsJS   = []

	for ( const storeitem in lookRecord.items ) {
		const thisItem     = lookRecord.items[storeitem]
		const thisItemUUID = crypto.randomUUID()

		if ( thisItem.masterType === 'vehicle' ) {
			let brandImage = null
			if ( typeof thisItem.brand === 'string' ) {
				if ( typeof lookRecord?.brands?.[thisItem.brand]?.icon !== 'undefined' ) {
					brandImage = lookRecord.brands[thisItem.brand].icon
				} else {
					brandImage = ( fsgUtil.knownBrand.has(`brand_${thisItem.brand.toLowerCase()}`) ) ? `img/brand/brand_${thisItem.brand.toLowerCase()}.png` : null
				}
			}

			const maxSpeed   = getDefault(thisItem?.specs?.maxspeed)
			const thePower   = getDefault(thisItem?.specs?.power)
			const getPower   = getDefault(thisItem?.specs?.neededpower)
			const theWidth   = getDefault(thisItem?.specs?.workingwidth, true)
			const theFill    = getDefault(thisItem.fillLevel)
			const fillImages = thisItem.fillTypes.map((thisFill) => fsgUtil.knownFills.has(thisFill) ? `<img style="height: 25px" src="img/fills/${thisFill}.png">` : '')
			
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
				show_graph        : thisItem.motorInfo === null ? 'd-none' : '',
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
				uuid              : thisItemUUID,
				weight            : formatManyNumber(thisItem.weight, currentLocale, [
					{ factor : 1,    precision : 0, unit : 'unit_kg' },
					{ factor : 0.01, precision : 1, unit : 'unit_t' },
				]),
				workWidth         : formatManyNumber(theWidth, currentLocale, [
					{ factor : 1,       precision : 1, unit : 'unit_m' },
					{ factor : 3.28084, precision : 1, unit : 'unit_ft' },
				]),
			}))

			if ( thisItem.motorInfo !== null ) {
				storeItemsJS.push(async () => {
					new Chart(
						fsgUtil.byId(`${thisItemUUID}_canvas_hp`),
						{
							type : 'line',
							data : {
								datasets : [
									...thisItem.motorInfo.hp,
								],
							},
							options : {
								interaction : {
									intersect : false,
									mode      : 'dataset',
								},
								plugins : {
									legend     : { display : false },
									tooltip    : {
										bodyAlign      : 'right',
										bodyFontFamily : 'courier',
										callbacks      : {
											label : (context) => `${context.parsed.y}${chartUnits.hp} @ ${context.parsed.x} ${chartUnits.rpm}`,
										},
										mode           : 'dataset',
										titleAlign     : 'center',
									},
								},
								scales  : {
									x : {
										display : true,
										title   : {
											text    : chartUnits.rpm,
											display : true,
										},
										type    : 'linear',
									},
									y : {
										
										display  : true,
										position : 'left',
										title    : {
											text    : chartUnits.hp,
											display : true,
										},
										type     : 'linear',
									},
								},
								stacked : false,
							},
						}
					)
					new Chart(
						fsgUtil.byId(`${thisItemUUID}_canvas_kph`),
						{
							type : 'line',
							data : {
								datasets : [
									...thisItem.motorInfo.kph,
								],
							},
							options : {
								interaction : {
									intersect : false,
									mode      : 'index',
								},
								plugins : {
									legend     : { display : false },
									tooltip    : {
										bodyAlign      : 'right',
										bodyFontFamily : 'courier',
										callbacks      : {
											label : (context) => `${context.dataset.label} : ${context.parsed.y} ${chartUnits.kph}`,
											title : (context) => `@ ${context[0].label} ${chartUnits.rpm}`,
										},
										mode           : 'index',
										titleAlign     : 'center',
									},
								},
								scales  : {
									x : {
										display : true,
										title   : {
											text    : chartUnits.rpm,
											display : true,
										},
										type    : 'linear',
									},
									y : {
										
										display  : true,
										position : 'left',
										title    : {
											text    : chartUnits.kph,
											display : true,
										},
										type     : 'linear',
									},
								},
								stacked : false,
							},
						}
					)
					new Chart(
						fsgUtil.byId(`${thisItemUUID}_canvas_mph`),
						{
							type : 'line',
							data : {
								datasets : [
									...thisItem.motorInfo.mph,
								],
							},
							options : {
								interaction : {
									intersect : false,
									mode      : 'index',
								},
								plugins : {
									legend     : { display : false },
									tooltip    : {
										bodyAlign      : 'right',
										bodyFontFamily : 'courier',
										callbacks      : {
											label : (context) => `${context.dataset.label} : ${context.parsed.y} ${chartUnits.mph}`,
											title : (context) => `@ ${context[0].label} ${chartUnits.rpm}`,
										},
										mode           : 'index',
										titleAlign     : 'center',
									},
								},
								scales  : {
									x : {
										display : true,
										title   : {
											text    : chartUnits.rpm,
											display : true,
										},
										type    : 'linear',
									},
									y : {
										
										display  : true,
										position : 'left',
										title    : {
											text    : chartUnits.mph,
											display : true,
										},
										type     : 'linear',
									},
								},
								stacked : false,
							},
						}
					)
				})
			}
		}

		if ( thisItem.masterType === 'placeable' ) {
			const fillImages = thisItem.silo.types.map((thisFill) => fsgUtil.knownFills.has(thisFill) ? `<img style="height: 25px" src="img/fills/${thisFill}.png">` : '')

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

	for ( const thisJS of storeItemsJS ) {
		setTimeout(thisJS, 25)
	}
}

const cleanOrJoin = (arr, text = 'detail_extra_clean') => typeof arr !== 'undefined' && arr.length > 0 ? arr.join('\n') : getText(text)

const doKeyBinds = (modRecord, locale) => {
	const keyBinds = []
	for ( const action in modRecord.modDesc.binds ) {
		const thisBinds = modRecord.modDesc.binds[action].map((keyCombo) => clientGetKeyMapSimple(keyCombo, locale))
		keyBinds.push(`${action} :: ${thisBinds.join(' / ')}`)
	}
	return keyBinds
}

const buildPage = (modCollect) => {
	document.body.setAttribute('data-version', modCollect.appSettings.game_version)

	const modRecord = modCollect.opts.selected
	const modDate   = new Date(Date.parse(modRecord.fileDetail.fileDate)).toLocaleString(modCollect.currentLocale, {timeZoneName : 'short'})

	const idMap = {
		bigFiles       : cleanOrJoin(modRecord.fileDetail.tooBigFiles),
		depends        : cleanOrJoin(modRecord.modDesc.depend, 'detail_depend_clean'),
		description    : fsgUtil.escapeDesc(modRecord.l10n.description),
		extraFiles     : cleanOrJoin(modRecord.fileDetail.extraFiles),
		file_date      : modDate,
		filesize       : fsgUtil.bytesToHR(modRecord.fileDetail.fileSize, modRecord.currentLocale),
		has_scripts    : checkX(modRecord.modDesc.scriptFiles),
		i3dFiles       : modRecord.fileDetail.i3dFiles.join('\n'),
		is_multiplayer : checkX(modRecord.modDesc.multiPlayer, false),
		keyBinds       : cleanOrJoin(doKeyBinds(modRecord, modCollect.currentLocale), 'detail_key_none'),
		mh_version     : ( modRecord.modHub.id !== null ) ? modRecord.modHub.version : `<em>${getText(modRecord.modHub.id === null ? 'mh_norecord' : 'mh_unknown' )}</em>`,
		mod_author     : fsgUtil.escapeSpecial(modRecord.modDesc.author),
		mod_location   : modRecord.fileDetail.fullPath,
		pngTexture     : cleanOrJoin(modRecord.fileDetail.pngTexture),
		spaceFiles     : cleanOrJoin(modRecord.fileDetail.spaceFiles),
		store_items    : checkX(modRecord.modDesc.storeItems),
		title          : (( modRecord.l10n.title !== null && modRecord.l10n.title !== 'n/a' ) ? fsgUtil.escapeSpecial(modRecord.l10n.title) : modRecord.fileDetail.shortName),
		version        : fsgUtil.escapeSpecial(modRecord.modDesc.version),
	}

	for ( const key in idMap ) { fsgUtil.byId(key).innerHTML = idMap[key] }

	fsgUtil.query('#description a').forEach((link) => { link.target = '_BLANK' })

	const bindingIssue     = modCollect.bindConflict[modRecord.currentCollection][modRecord.fileDetail.shortName] ?? null

	if ( modRecord.issues.length < 1 && bindingIssue === null ) {
		fsgUtil.byId('problem_div').classList.add('d-none')
	} else {
		const problems = [
			...doStep_issues(modRecord),
			...doStep_binds(bindingIssue, modCollect.currentLocale)
		].map((x) => `<tr class="py-2"><td class="px-2">${checkX(0, false)}</td><td>${x}</td></tr>`)

		fsgUtil.byId('problems').innerHTML = `<table class="table table-borderless">${problems.join('')}</table>`
	}

	const theseBadges = Array.from(modRecord.displayBadges, (badge) => fsgUtil.badge_main(badge)).join(' ')

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

function doStep_issues(modRecord) {
	const problems = []
	for ( const issue of modRecord.issues ) {
		let issueText = getText(issue)
		
		if ( issue === 'FILE_ERROR_LIKELY_COPY' && modRecord.fileDetail.copyName !== false ) {
			issueText += ` ${getText('file_error_copy_name')} ${modRecord.fileDetail.copyName}${modRecord.fileDetail.isFolder?'':'.zip'}`
		}
		problems.push(issueText)
	}
	return problems
}

function doStep_binds(bindingIssue, locale) {
	const problems = []
	if ( bindingIssue !== null ) {
		for ( const keyCombo in bindingIssue ) {
			const actualKey = clientGetKeyMap(keyCombo, locale)
			const confList  = bindingIssue[keyCombo].join(', ')
			const issueText = `${getText('bind_conflict')} : ${actualKey} :: ${confList}`
			problems.push(issueText)
		}
	}
	return problems
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
