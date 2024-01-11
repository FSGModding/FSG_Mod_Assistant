/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Base game window UI

/* global Chart, processL10N, fsgUtil, getText */


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
		sprayTypesHTML.push(`<div class="ms-4">${fillImages.join(' ')} ${formatManyNumber(thisType.width !== null ? thisType.width : defaultWidth, currentLocale, [
			{ factor : 1,       precision : 1, unit : 'unit_m' },
			{ factor : 3.28084, precision : 1, unit : 'unit_ft' },
		])}</div>`)
	}
	return sprayTypesHTML.join('')
}

const client_buildStore = (lookRecord, chartUnits, currentLocale) => {
	const storeItemsHTML = []
	const storeItemsJS   = []

	for ( const storeitem in lookRecord.items ) {
		const thisItem     = lookRecord.items[storeitem]
		const thisItemUUID = crypto.randomUUID()

		if ( thisItem.masterType === 'vehicle' ) {
			let brandImage = null
			if ( typeof thisItem.brand === 'string' ) {
				if ( typeof lookRecord?.brands?.[thisItem.brand]?.icon === 'string' ) {
					brandImage = lookRecord.brands[thisItem.brand].icon
				} else {
					brandImage = ( fsgUtil.knownBrand.has(`brand_${thisItem.brand.toLowerCase()}`) ) ? `img/brand/brand_${thisItem.brand.toLowerCase()}.webp` : null
				}
			}

			const maxSpeed   = getDefault(thisItem?.specs?.maxspeed)
			const thePower   = getDefault(thisItem?.specs?.power)
			const getPower   = getDefault(thisItem?.specs?.neededpower)
			const theWidth   = getDefault(thisItem?.specs?.workingwidth, true)
			const theFill    = getDefault(thisItem.fillLevel)
			const fillImages = thisItem.fillTypes.map((thisFill) => fsgUtil.knownFills.has(thisFill) ? `<img style="height: 25px" src="img/fills/${thisFill}.webp">` : '')
			
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

function getDefault(value, float = false, safe = 0) {
	const newValue = typeof value === 'number' || typeof value === 'string' ? value : safe
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

window.addEventListener('DOMContentLoaded', () => { processL10N() })
