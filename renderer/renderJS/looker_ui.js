/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Looker window UI

/*eslint complexity: off*/
/* global processL10N, fsgUtil */


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
			
			const maxSpeed = typeof parseInt(thisItem.specs.maxspeed) !== 'undefined' ? parseInt(thisItem.specs.maxspeed) : 0
			storeItemsHTML.push(fsgUtil.useTemplate('vehicle_div', {
				brandHIDE         : shouldHide(brandImage),
				brandIMG          : fsgUtil.iconMaker(brandImage),
				enginePower       : thisItem.specs.power,
				fillUnit          : Intl.NumberFormat(modCollect.currentLocale).format(thisItem.fillLevel),
				functions         : thisItem.functions.join('<br>'),
				iconIMG           : fsgUtil.iconMaker(modCollect.opts.look?.icons?.[storeitem] || null),
				itemName          : thisItem.name,
				itemTitle         : thisItem.type,
				maxSpeed          : `${maxSpeed} kph / ${Math.trunc(maxSpeed * 0.621371)} mph`,
				price             : Intl.NumberFormat(modCollect.currentLocale).format(thisItem.price),
				show_diesel       : shouldHide(thisItem.fuelType, 'diesel'),
				show_electric     : shouldHide(thisItem.fuelType, 'electricCharge'),
				show_enginePower  : shouldHide(thisItem.specs.power),
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
				weight            : `${Intl.NumberFormat(modCollect.currentLocale).format(thisItem.weight)} kg / ${Intl.NumberFormat(modCollect.currentLocale).format(thisItem.weight/1000)} t`,
				workWidth         : thisItem.specs.workingwidth,
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
	if ( wanted !== null && item !== wanted ) {
		return 'd-none'
	}
	return ''
}
