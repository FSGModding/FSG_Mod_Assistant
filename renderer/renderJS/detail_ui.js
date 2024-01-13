/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Detail window UI
/* eslint complexity: ["error", 16] */

/* global Chart, processL10N, fsgUtil, getText, clientGetKeyMap, clientGetKeyMapSimple, clientMakeCropCalendar */

let lookItemData = {}
let modName      = ''
window.mods.receive('fromMain_lookRecord', (lookRecord, chartUnits, currentLocale) => {
	lookItemData = {}
	try {
		buildStore(lookRecord, chartUnits, currentLocale)
		fsgUtil.clsHideTrue('store_process', true)
	} catch (err) {
		window.log.warning(`Store build failed :: ${err}`, 'detail-ui')
	}
	processL10N()
})

window.mods.receive('fromMain_modRecord', (modCollect) => {
	try {
		fsgUtil.clsShowTrue('store_process', modCollect.opts.hasStore)
		buildPage(modCollect)
	} catch (err) {
		window.log.warning(`Page build failed :: ${err}`, 'detail-ui')
	}
	processL10N()
})

const doMapImage = (mapImage) => {
	if ( mapImage === null || typeof mapImage !== 'string') { return }
	fsgUtil.byId('map_image_div').classList.remove('d-none')
	fsgUtil.byId('map_image').src = mapImage
}

const prodMulti = (amount, multi, currentLocale) => `${Intl.NumberFormat(currentLocale, { maximumFractionDigits : 0 }).format(amount)}${multi > 1 ? ` <small>(${Intl.NumberFormat(currentLocale, { maximumFractionDigits : 0 }).format(amount * multi)})</small>` : ''}`

const buildProduction = (prodRecords, currentLocale) => {
	if ( typeof prodRecords === 'undefined' || prodRecords === null ) { return ''}
	const liEntry  = '<li class="list-group-item">'
	const prodHTML = []

	for ( const thisProduction of prodRecords ) {
		const multi     = thisProduction.cycles
		const inputHTML = []

		for ( const inputMix in thisProduction.inputs ) {
			if ( inputMix !== 'no_mix' ) {
				inputHTML.push(`${liEntry}${thisProduction.inputs[inputMix].map((x) => `${prodMulti(x.amount, multi, currentLocale)} ${fsgUtil.getFillImage(x.filltype)}`).join(' <i class="prodIcon bi bi-distribute-horizontal"></i> ')}</li>`)
			}
		}

		inputHTML.push(...thisProduction.inputs.no_mix.map((x) => `${liEntry}${prodMulti(x.amount, multi, currentLocale)} ${fsgUtil.getFillImage(x.filltype)}</li>`))

		prodHTML.push(fsgUtil.useTemplate('prod_div', {
			class_prodBoosts : thisProduction.boosts.length !== 0 ? ''                                                                                                                                                                                : 'd-none',
			prodBoosts       : thisProduction.boosts.length !== 0 ? thisProduction.boosts.map((x) => `${liEntry}${prodMulti(x.amount, multi, currentLocale)} ${fsgUtil.getFillImage(x.filltype)}  <i class="prodIcon bi bi-caret-up-square"></i> ${x.boostFac * 100}%</li>`).join(' ') : '',
			prodCost         : Intl.NumberFormat(currentLocale).format(thisProduction.cost),
			prodCycles       : thisProduction.cycles,
			prodInputs       : inputHTML.join('<li class="list-group-item"><i class="prodIconLG bi bi-plus-circle"></i></li>'),
			prodName         : thisProduction.name,
			prodOutput       : thisProduction.outputs.map((x) => `${prodMulti(x.amount, multi, currentLocale)} ${fsgUtil.getFillImage(x.filltype)}`).join(' <i class="prodIcon bi bi-plus-lg"></i> '),
		}))
	}
	return prodHTML.join('')
}

const buildWidth2 = (sprayTypes, defaultWidth, currentLocale) => {
	if ( typeof sprayTypes !== 'object' || sprayTypes === null || sprayTypes.length === 0 ) {
		return ''
	}

	const sprayTypesHTML = []

	for ( const thisType of sprayTypes ) {
		const fillImages = thisType.fills.map((thisFill) => fsgUtil.knownFills.has(thisFill) ? `<img style="height: 25px" src="img/fills/${thisFill}.webp">` : '')
		sprayTypesHTML.push(`<div class="ms-4">${fillImages.join(' ')} ${fsgUtil.numFmtMany(thisType.width !== null ? thisType.width : defaultWidth, currentLocale, [
			{ factor : 1,       precision : 1, unit : 'unit_m' },
			{ factor : 3.28084, precision : 1, unit : 'unit_ft' },
		])}</div>`)
	}
	return sprayTypesHTML.join('')
}

const getMaxSpeed = (specSpeed, limitSpeed, motorSpeed) => {
	const specSpeed_clean = getDefault(specSpeed, false, 0)
	const limitSpeed_clean = getDefault(limitSpeed, false, 0)

	if ( specSpeed_clean > 0 ) { return specSpeed_clean }
	if ( limitSpeed_clean > 0 ) { return limitSpeed_clean }

	if ( typeof motorSpeed !== 'undefined' && motorSpeed !== null ) {
		let thisMin = 10000
		let thisMax = 0
		for ( const thisSpeed of motorSpeed ) {
			thisMin = Math.min(thisMin, thisSpeed)
			thisMax = Math.max(thisMax, thisSpeed)
		}
		if ( thisMin === thisMax ) { return thisMin }
		return [thisMin, thisMax]
	}
	return 0
}

const buildStore = (lookRecord, chartUnits, currentLocale) => {
	const storeItemsHTML = []
	const storeItemsJS   = []

	doMapImage(lookRecord?.mapImage)

	for ( const storeitem in lookRecord.items ) {
		const thisItem     = lookRecord.items[storeitem]
		const thisItemUUID = crypto.randomUUID()

		if ( thisItem.masterType === 'vehicle' ) {
			lookItemData[thisItemUUID] = thisItem
			lookItemData[thisItemUUID].icon = fsgUtil.iconMaker(lookRecord?.icons?.[storeitem] || null)
			lookItemData[thisItemUUID].uuid_name = storeitem

			let brandImage = null
			if ( typeof thisItem.brand === 'string' ) {
				if ( typeof lookRecord?.brands?.[thisItem.brand]?.icon === 'string' ) {
					brandImage = lookRecord.brands[thisItem.brand].icon
				} else {
					brandImage = ( fsgUtil.knownBrand.has(`brand_${thisItem.brand.toLowerCase()}`) ) ? `img/brand/brand_${thisItem.brand.toLowerCase()}.webp` : null
				}
			}
			const maxSpeed   = getMaxSpeed(thisItem?.specs?.maxspeed, thisItem?.speedLimit, thisItem?.motorInfo?.speed)
			const thePower   = getDefault(thisItem?.specs?.power)
			const getPower   = getDefault(thisItem?.specs?.neededpower)
			const theWidth   = getDefault(thisItem?.specs?.workingwidth, true)
			const theFill    = getDefault(thisItem.fillLevel)
			const fillImages = thisItem.fillTypes.map((thisFill) => fsgUtil.knownFills.has(thisFill) ? `<img style="height: 25px" src="img/fills/${thisFill}.webp">` : '')
			const powerSpan  = fsgUtil.getMinMaxHP(thePower, thisItem?.motorInfo)
			
			storeItemsHTML.push(fsgUtil.useTemplate('vehicle_div', {
				brandHIDE         : shouldHide(brandImage),
				brandIMG          : fsgUtil.iconMaker(brandImage),
				category          : thisItem.category,
				enginePower       : fsgUtil.numFmtMany(powerSpan, currentLocale, [
					{ factor : 1,      precision : 0, unit : 'unit_hp' },
					{ factor : 0.7457, precision : 1, unit : 'unit_kw' },
				]),
				fillImages        : fillImages.join(' '),
				fillUnit          : fsgUtil.numFmtMany(theFill, currentLocale, [
					{ factor : 1,         precision : 0, unit : 'unit_l' },
					{ factor : 0.001,     precision : 1, unit : 'unit_m3' },
					{ factor : 0.0353147, precision : 1, unit : 'unit_ft3' },
				]),
				functions         : thisItem.functions.join('<br>'),
				iconIMG           : fsgUtil.iconMaker(lookRecord?.icons?.[storeitem] || null),
				itemName          : thisItem.name,
				itemTitle         : thisItem.type,
				maxSpeed          : fsgUtil.numFmtMany(maxSpeed, currentLocale, [
					{ factor : 1,        precision : 0, unit : 'unit_kph' },
					{ factor : 0.621371, precision : 0, unit : 'unit_mph' },
				], true),
				needPower         : fsgUtil.numFmtMany(getPower, currentLocale, [
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
				show_maxSpeed     : shouldHide(maxSpeed !== 0),
				show_methane      : shouldHide(thisItem.fuelType, 'methane'),
				show_needPower    : shouldHide(thisItem?.specs?.neededpower),
				show_price        : shouldHide(thisItem.price),
				show_transmission : shouldHide(thisItem.transType),
				show_weight       : shouldHide(thisItem.weight),
				show_workWidth    : shouldHide(thisItem?.specs?.workingwidth),
				transmission      : thisItem.transType,
				typeDesc          : thisItem.typeDesc,
				uuid              : thisItemUUID,
				weight            : fsgUtil.numFmtMany(thisItem.weight, currentLocale, [
					{ factor : 1,    precision : 0, unit : 'unit_kg' },
					{ factor : 0.01, precision : 1, unit : 'unit_t' },
				]),
				workWidth         : fsgUtil.numFmtMany(theWidth, currentLocale, [
					{ factor : 1,       precision : 1, unit : 'unit_m' },
					{ factor : 3.28084, precision : 1, unit : 'unit_ft' },
				]),
				workWidth2        : buildWidth2(thisItem?.sprayTypes, theWidth, currentLocale),
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
			const fillImages = thisItem.silo.types.map((thisFill) => fsgUtil.knownFills.has(thisFill) ? `<img style="height: 25px" src="img/fills/${thisFill}.webp">` : '')

			storeItemsHTML.push(fsgUtil.useTemplate('place_div', {
				animalCount      : thisItem.husbandry.capacity,
				category          : thisItem.category,
				fillImages       : fillImages.join(' '),
				fillUnit         : fsgUtil.numFmtMany(thisItem.silo.capacity, currentLocale, [
					{ factor : 1,         precision : 0, unit : 'unit_l' },
					{ factor : 0.001,     precision : 1, unit : 'unit_m3' },
					{ factor : 0.0353147, precision : 1, unit : 'unit_ft3' },
				]),
				functions        : thisItem.functions.join('<br>'),
				hasBee           : `${fsgUtil.numFmtMany(thisItem.beehive.radius, currentLocale, [{factor : 1, precision : 0, unit : 'unit_m'}])} / ${fsgUtil.numFmtMany(thisItem.beehive.liters, currentLocale, [{factor : 1, precision : 0, unit : 'unit_l'}])}`,
				iconIMG          : fsgUtil.iconMaker(lookRecord?.icons?.[storeitem] || null),
				income           : thisItem.incomePerHour ?? 0,
				itemName         : thisItem.name,
				itemTitle        : thisItem.type,
				objectCount      : thisItem.objectStorage ?? 0,
				price            : Intl.NumberFormat(currentLocale).format(thisItem.price),
				prodLines        : buildProduction(thisItem?.productions, currentLocale),
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

const cleanOrJoin    = (arr, text = 'detail_extra_clean') => Array.isArray(arr) && arr.length !== 0 ? arr.join('\n') : getText(text)
const extraInfoColor = (id, arr, badColor = 'text-danger') => {
	const element = fsgUtil.byId(id)
	element.classList.remove(badColor, 'text-success')
	if ( Array.isArray(arr) && arr.length !== 0 ) {
		element.classList.add(badColor)
	} else {
		element.classList.add('text-success')
	}
}

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

	const modRecord    = modCollect.opts.selected
	modName            = modRecord.fileDetail.shortName
	const modDate      = new Date(Date.parse(modRecord.fileDetail.fileDate)).toLocaleString(modCollect.currentLocale, {timeZoneName : 'short'})
	const doneKeyBinds = doKeyBinds(modRecord, modCollect.currentLocale)
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
		keyBinds       : cleanOrJoin(doneKeyBinds, 'detail_key_none'),
		mh_version     : ( modRecord.modHub.id !== null ) ? `<a href="https://www.farming-simulator.com/mod.php?mod_id=${modRecord.modHub.id}" target="_BLANK">${modRecord.modHub.version}</a>` : `<em>${getText(modRecord.modHub.id === null ? 'mh_norecord' : 'mh_unknown' )}</em>`,
		mod_author     : fsgUtil.escapeSpecial(modRecord.modDesc.author),
		mod_location   : modRecord.fileDetail.fullPath,
		pngTexture     : cleanOrJoin(modRecord.fileDetail.pngTexture),
		spaceFiles     : cleanOrJoin(modRecord.fileDetail.spaceFiles),
		store_items    : checkX(modRecord.modDesc.storeItems),
		title          : (( modRecord.l10n.title !== null && modRecord.l10n.title !== '--' ) ? fsgUtil.escapeSpecial(modRecord.l10n.title) : modRecord.fileDetail.shortName),
		version        : fsgUtil.escapeSpecial(modRecord.modDesc.version),
	}

	for ( const key in idMap ) { fsgUtil.byId(key).innerHTML = idMap[key] }

	extraInfoColor('keyBinds', doneKeyBinds, 'text-info')
	extraInfoColor('pngTexture', modRecord.fileDetail.pngTexture)
	extraInfoColor('spaceFiles', modRecord.fileDetail.spaceFiles)
	extraInfoColor('extraFiles', modRecord.fileDetail.extraFiles)
	extraInfoColor('bigFiles', modRecord.fileDetail.tooBigFiles)

	for ( const element of fsgUtil.query('#description a') ) { element.target = '_BLANK' }

	const bindingIssue     = modCollect.bindConflict[modRecord.currentCollection][modRecord.fileDetail.shortName] ?? null

	if ( modRecord.issues.length === 0 && bindingIssue === null ) {
		fsgUtil.byId('problem_div').classList.add('d-none')
	} else {
		const problems = [
			...doStep_issues(modRecord),
			...doStep_binds(bindingIssue, modCollect.currentLocale)
		].map((x) => `<tr class="py-2"><td class="px-2">${checkX(0, false)}</td><td>${x}</td></tr>`)

		fsgUtil.byId('problems').innerHTML = `<table class="table table-borderless">${problems.join('')}</table>`
	}

	const theseBadges = Array.isArray(modRecord.displayBadges) ? modRecord.displayBadges.map((badge) => fsgUtil.badge_main(badge)).join(' ') : false

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

	if ( Array.isArray(modRecord.modDesc.cropInfo) ) {
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
	const newValue = typeof value === 'number' || typeof value === 'string' ? value : safe
	return !float ? parseInt(newValue) : parseFloat(newValue)
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


function clientOpenCompare(uuid) {
	window.mods.openCompareMod(lookItemData[uuid], modName)
}