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

			const maxSpeed = parseInt(typeof thisItem?.specs?.maxspeed !== 'undefined' ? thisItem.specs.maxspeed : 0)
			const thePower = parseInt(typeof thisItem?.specs?.power !== 'undefined'? thisItem.specs.power : 0 )
			const theWidth = parseInt(typeof thisItem?.specs?.workingwidth !== 'undefined'? thisItem.specs.workingwidth : 0 )
			const theFill  = parseInt(typeof thisItem.fillLevel !== 'undefined'? thisItem.fillLevel : 0 )

			storeItemsHTML.push(fsgUtil.useTemplate('vehicle_div', {
				brandHIDE         : shouldHide(brandImage),
				brandIMG          : fsgUtil.iconMaker(brandImage),
				enginePower       : `${thePower} ${getText('unit_hp')} / ${Intl.NumberFormat(modCollect.currentLocale).format(Math.trunc(thePower * 7.457)/10)} ${getText('unit_kw')}`,
				fillUnit          : `${theFill} ${getText('unit_l')} / ${Intl.NumberFormat(modCollect.currentLocale).format(Math.trunc(theFill * 0.01)/10)} ${getText('unit_m3')} / ${Intl.NumberFormat(modCollect.currentLocale).format(Math.trunc(theFill * 0.353147)/10)} ${getText('unit_ft3')}`,
				functions         : thisItem.functions.join('<br>'),
				iconIMG           : fsgUtil.iconMaker(modCollect.opts.look?.icons?.[storeitem] || null),
				itemName          : thisItem.name,
				itemTitle         : thisItem.type,
				maxSpeed          : `${maxSpeed} ${getText('unit_kph')} / ${Math.trunc(maxSpeed * 0.621371)} ${getText('unit_mph')}`,
				price             : Intl.NumberFormat(modCollect.currentLocale).format(thisItem.price),
				show_diesel       : shouldHide(thisItem.fuelType, 'diesel'),
				show_electric     : shouldHide(thisItem.fuelType, 'electriccharge'),
				show_enginePower  : shouldHide(thisItem?.specs?.power),
				show_fillUnit     : thisItem.fillLevel > 0 ? ''                                                                                                                                 : 'd-none',
				show_hasBeacons   : shouldHide(thisItem.hasBeacons),
				show_hasLights    : shouldHide(thisItem.hasLights),
				show_hasPaint     : shouldHide(thisItem.hasColor),
				show_hasWheels    : shouldHide(thisItem.hasWheelChoice),
				show_maxSpeed     : shouldHide(thisItem.specs.maxspeed),
				show_methane      : shouldHide(thisItem.fuelType, 'methane'),
				show_price        : shouldHide(thisItem.price),
				show_transmission : shouldHide(thisItem.transType),
				show_weight       : shouldHide(thisItem.weight),
				show_workWidth    : shouldHide(thisItem.specs.workingwidth),
				transmission      : thisItem.transType,
				typeDesc          : thisItem.typeDesc,
				weight            : `${Intl.NumberFormat(modCollect.currentLocale).format(thisItem.weight)} ${getText('unit_kg')} / ${Intl.NumberFormat(modCollect.currentLocale).format(Math.trunc(thisItem.weight/100)/10)} ${getText('unit_t')}`,
				workWidth         : `${theWidth} ${getText('unit_m')} / ${Intl.NumberFormat(modCollect.currentLocale).format(Math.trunc(theWidth *32.8084)/10)} ${getText('unit_ft')}`,
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


function shouldHide(item, wanted = null) {
	if ( typeof item === 'undefined' || item === null || item === false || item === '' ) {
		return 'd-none'
	}
	if ( wanted !== null && item.toLowerCase() !== wanted.toLowerCase() ) {
		return 'd-none'
	}
	return ''
}
