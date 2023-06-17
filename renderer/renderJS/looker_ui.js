/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Looker window UI

/* global processL10N, fsgUtil, getText */
/*eslint complexity: ["warn", 17]*/

window.mods.receive('fromMain_modRecord', (modCollect) => {
	const modRecord = modCollect.opts.selected

	const idMap = {
		mod_location   : modRecord.fileDetail.fullPath,
		title          : (( modRecord.l10n.title !== null && modRecord.l10n.title !== 'n/a' ) ? fsgUtil.escapeSpecial(modRecord.l10n.title) : modRecord.fileDetail.shortName),
	}

	for ( const key in idMap ) { fsgUtil.byId(key).innerHTML = idMap[key] }

	const storeItemsHTML = []

	for ( const storeitem in modCollect.opts.look.items ) {
		const thisItem = modCollect.opts.look.items[storeitem]

		if ( thisItem.masterType === 'vehicle' ) {
			let brandImage = null
			if ( typeof thisItem.brand === 'string' ) {
				if ( typeof modCollect.opts.look?.brands?.[thisItem.brand]?.icon !== 'undefined' ) {
					brandImage = modCollect.opts.look.brands[thisItem.brand].icon
				} else {
					brandImage = `img/brand/brand_${thisItem.brand.toLowerCase()}.png`
				}
			}

			const maxSpeed = getDefault(thisItem?.specs?.maxspeed)
			const thePower = getDefault(thisItem?.specs?.power)
			const getPower = getDefault(thisItem?.specs?.neededpower)
			const theWidth = getDefault(thisItem?.specs?.workingwidth, true)
			const theFill  = getDefault(thisItem.fillLevel)
			const fillImages = thisItem.fillTypes.map((thisFill) => `<img style="height: 25px" src="img/fills/${thisFill}.png">`)

			storeItemsHTML.push(fsgUtil.useTemplate('vehicle_div', {
				brandHIDE         : shouldHide(brandImage),
				brandIMG          : fsgUtil.iconMaker(brandImage),
				enginePower       : formatManyNumber(thePower, modCollect.currentLocale, [
					{ factor : 1,      precision : 0, unit : 'unit_hp' },
					{ factor : 0.7457, precision : 1, unit : 'unit_kw' },
				]),
				fillImages        : fillImages.join(' '),
				fillUnit          : formatManyNumber(theFill, modCollect.currentLocale, [
					{ factor : 1,         precision : 0, unit : 'unit_l' },
					{ factor : 0.001,     precision : 1, unit : 'unit_m3' },
					{ factor : 0.0353147, precision : 1, unit : 'unit_ft3' },
				]),
				functions         : thisItem.functions.join('<br>'),
				iconIMG           : fsgUtil.iconMaker(modCollect.opts.look?.icons?.[storeitem] || null),
				itemName          : thisItem.name,
				itemTitle         : thisItem.type,
				maxSpeed          : formatManyNumber(maxSpeed, modCollect.currentLocale, [
					{ factor : 1,        precision : 0, unit : 'unit_kph' },
					{ factor : 0.621371, precision : 0, unit : 'unit_mph' },
				]),
				needPower         : formatManyNumber(getPower, modCollect.currentLocale, [
					{ factor : 1,      precision : 0, unit : 'unit_hp' },
					{ factor : 0.7457, precision : 1, unit : 'unit_kw' },
				]),
				price             : Intl.NumberFormat(modCollect.currentLocale).format(thisItem.price),
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
				weight            : formatManyNumber(thisItem.weight, modCollect.currentLocale, [
					{ factor : 1,    precision : 0, unit : 'unit_kg' },
					{ factor : 0.01, precision : 1, unit : 'unit_t' },
				]),
				workWidth         : formatManyNumber(theWidth, modCollect.currentLocale, [
					{ factor : 1,       precision : 1, unit : 'unit_m' },
					{ factor : 3.28084, precision : 1, unit : 'unit_ft' },
				]),
			}))
		}

		if ( thisItem.masterType === 'placeable' ) {
			storeItemsHTML.push(fsgUtil.useTemplate('place_div', {
				functions         : thisItem.functions.join('<br>'),
				iconIMG           : fsgUtil.iconMaker(modCollect.opts.look?.icons?.[storeitem] || null),
				itemName          : thisItem.name,
				itemTitle         : thisItem.type,
				price             : Intl.NumberFormat(modCollect.currentLocale).format(thisItem.price),
				show_hasPaint     : shouldHide(thisItem.hasColor),
			}))
		}

	}

	fsgUtil.byId('storeitems').innerHTML = storeItemsHTML.join('')

	processL10N()
})

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
