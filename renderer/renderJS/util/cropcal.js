/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */
// MARK: Crop Calendar

/* global I18N */

/* eslint-disable sort-keys */
const knownCrops = {
	wheat         : {	name : 'croptype_wheat',			icon : 'wheat' },
	barley        : {	name : 'croptype_barley',			icon : 'barley' },
	canola        : {	name : 'croptype_canola',			icon : 'canola' },
	oat           : {	name : 'croptype_oat',				icon : 'oat' },
	sorghum       : {	name : 'croptype_sorghum',			icon : 'sorghum' },
	cotton        : {	name : 'croptype_cotton',			icon : 'cotton' },
	maize         : {	name : 'croptype_maize',			icon : 'maize' },
	sunflower     : {	name : 'croptype_sunflower',		icon : 'sunflower' },
	soybean       : {	name : 'croptype_soybean',			icon : 'soybean' },
	potato        : {	name : 'croptype_potato',			icon : 'potato' },
	sugarbeet     : {	name : 'croptype_sugarbeet',		icon : 'sugarbeet' },
	sugarcane     : {	name : 'croptype_sugarcane',		icon : 'sugarcane' },
	poplar        : {	name : 'croptype_poplar',			icon : 'poplar' },
	oilseedradish : {	name : 'croptype_oilseedradish',	icon : 'oilradish' },
	grass         : {	name : 'croptype_grass',			icon : 'grass' },
	grape         : {	name : 'croptype_grape',			icon : 'grape' },
	olive         : {	name : 'croptype_olive',			icon : 'olive' },
	clover        : {	name : 'croptype_clover',			icon : 'clover' },
	alfalfa       : {	name : 'croptype_alfalfa',			icon : 'alfalfa' },
	onion         : {	name : 'croptype_onion',			icon : 'onion' },
	carrot        : {	name : 'croptype_carrot',			icon : 'carrot' },
	whitecabbage  : {	name : 'croptype_whitecabbage',		icon : 'whitecabbage' },
	redcabbage    : {	name : 'croptype_redcabbage',		icon : 'redcabbage' },
	rye           : {	name : 'croptype_rye',				icon : 'rye' },
	poppy         : {	name : 'croptype_poppy',			icon : 'poppy' },
	spelt         : {	name : 'croptype_spelt',			icon : 'spelt' },
}
/* eslint-enable sort-keys */

const nameMonth = ['mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb']

async function getCropInfo(name) {
	if ( ! Object.hasOwn(knownCrops, name) ) {
		return `${name.slice(0, 1).toUpperCase()}${name.slice(1)}`
	}
	const theName = I18N.defer(knownCrops[name].name, false)
	return `<fillType style="font-size: calc(1.35rem + .6vw)" name="${knownCrops[name].icon}"></fillType> ${theName}`
}

function makeTD(classes, text = '', isHeader = false, span = 1, rows = 1) {
	return `<${isHeader?'th':'td'} ${rows > 1 ? `rowspan="${rows}"` :'' } ${span > 1 ? `colspan="${span}"` :'' } class="${classes.join(' ')}">${text}</${isHeader?'th':'td'}>`
}

function orderLine(lineArray, isSouth) {
	if ( isSouth ) {
		return `${lineArray.slice(6).join('')}${lineArray.slice(0, 6).join('')}`
	}
	return lineArray.join('')
}

const c2f = (value) => Math.floor((value * 9/5) + 32)

async function clientMakeCropCalendar(theData, isSouth = false, weather = null) {
	const tableLines    = []
	let   evenRow       = false

	tableLines.push([
		'<tr class="crophead"><td></td>',
		makeTD(['text-center'], '<i style="font-size: 3rem;" class="fsico-season-spring"></i>', false, 3),
		makeTD(['text-center'], '<i style="font-size: 3rem;" class="fsico-season-summer"></i>', false, 3),
		makeTD(['text-center'], '<i style="font-size: 3rem;" class="fsico-season-fall"></i>', false, 3),
		makeTD(['text-center'], '<i style="font-size: 3rem;" class="fsico-season-winter"></i>', false, 3),
		'</tr>'].join('')
	)
	if ( weather !== null ) {
		tableLines.push([
			'<tr class="crophead"><td></td>',
			makeTD(['text-center small'], `${weather.spring.min}°C ⟶ ${weather.spring.max}°C`, false, 3),
			makeTD(['text-center small'], `${weather.summer.min}°C ⟶ ${weather.summer.max}°C`, false, 3),
			makeTD(['text-center small'], `${weather.autumn.min}°C ⟶ ${weather.autumn.max}°C`, false, 3),
			makeTD(['text-center small'], `${weather.winter.min}°C ⟶ ${weather.winter.max}°C`, false, 3),
			'</tr>'].join(''), [
			'<tr class="crophead"><td></td>',
			makeTD(['text-center small'], `${c2f(weather.spring.min)}°F ⟶ ${c2f(weather.spring.max)}°F`, false, 3),
			makeTD(['text-center small'], `${c2f(weather.summer.min)}°F ⟶ ${c2f(weather.summer.max)}°F`, false, 3),
			makeTD(['text-center small'], `${c2f(weather.autumn.min)}°F ⟶ ${c2f(weather.autumn.max)}°F`, false, 3),
			makeTD(['text-center small'], `${c2f(weather.winter.min)}°F ⟶ ${c2f(weather.winter.max)}°F`, false, 3),
			'</tr>'].join('')
		)
	}

	const monthLabels = []
	
	for ( const month in nameMonth ) {
		monthLabels.push(makeTD(['p-0 text-center text-white'], `<i18n-text data-key="cropmonth_${nameMonth[month]}"></i18n-text>`, true))
	}

	tableLines.push(`<tr class="crophead">${makeTD(['p-0'], '', true)}${orderLine(monthLabels, isSouth)}</tr>`)

	for ( const crop of theData ) {
		try {
			const cropNameCell = makeTD(
				[
					'border-info',
					`crop-row-${ evenRow ? 'even' : 'odd' }`,
					'align-middle',
					'fw-bold',
					'text-white',
					'pe-2'
				],
				// eslint-disable-next-line no-await-in-loop
				await getCropInfo(crop.name),
				false,
				1,
				2
			)

			const plantLines   = []
			const harvestLines = []

			for ( let idx = 1; idx < 13; idx++ ) {
				plantLines.push(makeTD(
					[
						'crop-box',
						`crop-row-${ evenRow ? 'even' : 'odd' }`,
						`crop-col-${idx % 2 === 0 ? 'even' : 'odd'}`,
						crop.plantPeriods.includes(idx) ? 'crop_plant' : ''
					]
				))

				harvestLines.push(makeTD(
					[
						'crop-box',
						`crop-row-${ evenRow ? 'even' : 'odd' }`,
						`crop-col-${idx % 2 === 0 ? 'even' : 'odd'}`,
						crop.harvestPeriods.includes(idx) ? 'crop_harvest' : ''
					]
				))
			}

			tableLines.push(
				`<tr>${cropNameCell}${orderLine(plantLines, isSouth)}</tr>`,
				`<tr>${orderLine(harvestLines, isSouth)}</tr>`
			)
			evenRow = !evenRow
		} catch (err) {
			window.log.warning(`Unable to build calendar row :: ${err}`, 'cropcal')
		}
	}

	return tableLines.join('')
}