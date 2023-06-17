/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Looker window UI

/* global processL10N, fsgUtil, getText */
/*eslint complexity: ["warn", 17]*/

const knownFills = [
	'air', 'barley', 'boards', 'bread', 'butter', 'cake', 'canola', 'cereals', 'chaff', 'cheese', 'chicken', 'chocolate', 'clothes', 'cotton', 'cow', 'def', 'diesel', 'digestate', 'dog', 'drygrass_windrow', 'egg', 'electriccharge', 'fabric', 'fertilizer', 'flour', 'forage', 'forage_mixing', 'foragemix', 'furniture', 'grape', 'grapejuice', 'grass', 'grass_windrow', 'herbicide', 'honey', 'horse', 'lettuce', 'lime', 'liquidfertilizer', 'liquidmanure', 'maize', 'manure', 'methane', 'milk', 'mineral_feed', 'oat', 'oil_canola', 'oil_olive', 'oil_sunflower', 'oilradish', 'olive', 'pig', 'pigfood', 'poplar', 'potato', 'product', 'raisins', 'roadsalt', 'roundbalecotton', 'roundbalegrass', 'roundbalehay', 'roundbalesilage', 'roundbalestraw', 'roundbalewood', 'seeds', 'sheep', 'silage', 'silage_additive', 'snow', 'sorghum', 'soybean', 'squarebalecotton', 'squarebalegrass', 'squarebalehay', 'squarebalesilage', 'squarebalestraw', 'squarebalewood', 'stone', 'straw', 'strawberry', 'sugar', 'sugarbeet', 'sugarbeet_cut', 'sugarcane', 'sunflower', 'tarp', 'tomato', 'treesaplings', 'unknown', 'water', 'weed', 'wheat', 'woodchips', 'wool'
]
const knownBrand = [
	'brand_abi', 'brand_aebi', 'brand_agco', 'brand_agrisem', 'brand_agromasz', 'brand_albutt', 'brand_aldi', 'brand_alpego', 'brand_amazone', 'brand_amitytechnology', 'brand_andersongroup', 'brand_annaburger', 'brand_apv', 'brand_arcusin', 'brand_armatrac', 'brand_bednar', 'brand_bergmann', 'brand_berthoud', 'brand_bkt', 'brand_bmvolvo', 'brand_boeckmann', 'brand_bomech', 'brand_bourgault', 'brand_brantner', 'brand_bredal', 'brand_bremer', 'brand_brielmaier', 'brand_briri', 'brand_buehrer', 'brand_capello', 'brand_caseih', 'brand_challenger', 'brand_claas', 'brand_continental', 'brand_conveyall', 'brand_corteva', 'brand_dalbo', 'brand_damcon', 'brand_degelman', 'brand_demco', 'brand_deutzfahr', 'brand_dfm', 'brand_duevelsdorf', 'brand_easysheds', 'brand_einboeck', 'brand_elho', 'brand_elmersmfg', 'brand_elten', 'brand_engelbertstrauss', 'brand_ero', 'brand_faresin', 'brand_farmax', 'brand_farmet', 'brand_farmtech', 'brand_fendt', 'brand_fiat', 'brand_flexicoil', 'brand_fliegl', 'brand_fmz', 'brand_fortschritt', 'brand_fortuna', 'brand_fsi', 'brand_fuhrmann', 'brand_gessner', 'brand_giants', 'brand_goeweil', 'brand_goldhofer', 'brand_gorenc', 'brand_greatplains', 'brand_gregoirebesson', 'brand_grimme', 'brand_groha', 'brand_hardi', 'brand_hatzenbichler', 'brand_hauer', 'brand_hawe', 'brand_heizomat', 'brand_helm', 'brand_holaras', 'brand_holmer', 'brand_horsch', 'brand_husqvarna', 'brand_impex', 'brand_iseki', 'brand_jcb', 'brand_jenz', 'brand_johndeere', 'brand_jonsered', 'brand_joskin', 'brand_jungheinrich', 'brand_kaercher', 'brand_kaweco', 'brand_kemper', 'brand_kesla', 'brand_kingston', 'brand_kinze', 'brand_kline', 'brand_knoche', 'brand_koeckerling', 'brand_koller', 'brand_komatsu', 'brand_kongskilde', 'brand_kotschenreuther', 'brand_kotte', 'brand_kramer', 'brand_krampe', 'brand_kroeger', 'brand_krone', 'brand_kronetrailer', 'brand_ksag', 'brand_kubota', 'brand_kuhn', 'brand_kverneland', 'brand_lacotec', 'brand_landini', 'brand_lely', 'brand_lemken', 'brand_lindner', 'brand_lizard', 'brand_lizardbuilding', 'brand_lizardenergy', 'brand_lizardfarming', 'brand_lizardforestry', 'brand_lizardgoods', 'brand_lizardlawncare', 'brand_lizardlogistics', 'brand_lizardmotors', 'brand_lizardstorage', 'brand_lodeking', 'brand_mack', 'brand_mackhistorical', 'brand_magsi', 'brand_mahindra', 'brand_man', 'brand_manitou', 'brand_masseyferguson', 'brand_mccormack', 'brand_mccormick', 'brand_mcculloch', 'brand_meridian', 'brand_michelin', 'brand_michieletto', 'brand_mitas', 'brand_nardi', 'brand_neuero', 'brand_newholland', 'brand_nokian', 'brand_none', 'brand_nordsten', 'brand_olofsfors', 'brand_paladin', 'brand_pesslinstruments', 'brand_pfanzelt', 'brand_pioneer', 'brand_planet', 'brand_ploeger', 'brand_poettinger', 'brand_ponsse', 'brand_porschediesel', 'brand_prinoth', 'brand_provita', 'brand_provitis', 'brand_quicke', 'brand_rabe', 'brand_randon', 'brand_rau', 'brand_reform', 'brand_reiter', 'brand_riedler', 'brand_rigitrac', 'brand_risutec', 'brand_ropa', 'brand_rostselmash', 'brand_rottne', 'brand_rudolfhoermann', 'brand_rudolph', 'brand_salek', 'brand_salford', 'brand_samasz', 'brand_samporosenlew', 'brand_samsonagro', 'brand_schaeffer', 'brand_schaumann', 'brand_schouten', 'brand_schuitemaker', 'brand_schwarzmueller', 'brand_seppknuesel', 'brand_siloking', 'brand_sip', 'brand_stadia', 'brand_stara', 'brand_starkindustries', 'brand_stepa', 'brand_steyr', 'brand_stihl', 'brand_stoll', 'brand_strautmann', 'brand_suer', 'brand_tajfun', 'brand_tatra', 'brand_tenwinkel', 'brand_thueringeragrar', 'brand_thundercreek', 'brand_tmccancela', 'brand_treffler', 'brand_trelleborg', 'brand_tt', 'brand_unia', 'brand_unverferth', 'brand_vaederstad', 'brand_valtra', 'brand_valtravalmet', 'brand_veenhuis', 'brand_vermeer', 'brand_versatile', 'brand_vervaet', 'brand_vicon', 'brand_volvo', 'brand_volvobm', 'brand_volvokrabat', 'brand_vredestein', 'brand_walkabout', 'brand_warzee', 'brand_webermt', 'brand_welger', 'brand_westtech', 'brand_wilson', 'brand_zetor', 'brand_ziegler', 'brand_zunhammer'
]

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
					brandImage = ( knownBrand.includes(thisItem.brand.toLowerCase()) ) ? `img/brand/brand_${thisItem.brand.toLowerCase()}.png` : null
				}
			}

			const maxSpeed   = getDefault(thisItem?.specs?.maxspeed)
			const thePower   = getDefault(thisItem?.specs?.power)
			const getPower   = getDefault(thisItem?.specs?.neededpower)
			const theWidth   = getDefault(thisItem?.specs?.workingwidth, true)
			const theFill    = getDefault(thisItem.fillLevel)
			const fillImages = thisItem.fillTypes.map((thisFill) => knownFills.includes(thisFill) ? `<img style="height: 25px" src="img/fills/${thisFill}.png">` : '')
			

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
			const fillImages = thisItem.silo.types.map((thisFill) => knownFills.includes(thisFill) ? `<img style="height: 25px" src="img/fills/${thisFill}.png">` : '')

			storeItemsHTML.push(fsgUtil.useTemplate('place_div', {
				animalCount      : thisItem.husbandry.capacity,
				fillImages       : fillImages.join(' '),
				fillUnit         : formatManyNumber(thisItem.silo.capacity, modCollect.currentLocale, [
					{ factor : 1,         precision : 0, unit : 'unit_l' },
					{ factor : 0.001,     precision : 1, unit : 'unit_m3' },
					{ factor : 0.0353147, precision : 1, unit : 'unit_ft3' },
				]),
				functions        : thisItem.functions.join('<br>'),
				hasBee           : `${formatManyNumber(thisItem.beehive.radius, modCollect.currentLocale, [{factor : 1, precision : 0, unit : 'unit_m'}])} / ${formatManyNumber(thisItem.beehive.liters, modCollect.currentLocale, [{factor : 1, precision : 0, unit : 'unit_l'}])}`,
				iconIMG          : fsgUtil.iconMaker(modCollect.opts.look?.icons?.[storeitem] || null),
				income           : thisItem.incomePerHour ?? 0,
				itemName         : thisItem.name,
				itemTitle        : thisItem.type,
				objectCount      : thisItem.objectStorage ?? 0,
				price            : Intl.NumberFormat(modCollect.currentLocale).format(thisItem.price),
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
