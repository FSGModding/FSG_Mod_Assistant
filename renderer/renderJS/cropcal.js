/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */
// Crop Calendar Rendering

/* eslint-disable sort-keys */
const knownCrops = {
	wheat         : {	name : 'croptype_wheat',			icon : 'wheat.webp' },
	barley        : {	name : 'croptype_barley',			icon : 'barley.webp' },
	canola        : {	name : 'croptype_canola',			icon : 'canola.webp' },
	oat           : {	name : 'croptype_oat',				icon : 'oat.webp' },
	sorghum       : {	name : 'croptype_sorghum',			icon : 'sorghum.webp' },
	cotton        : {	name : 'croptype_cotton',			icon : 'cotton.webp' },
	maize         : {	name : 'croptype_maize',			icon : 'maize.webp' },
	sunflower     : {	name : 'croptype_sunflower',		icon : 'sunflower.webp' },
	soybean       : {	name : 'croptype_soybean',			icon : 'soybean.webp' },
	potato        : {	name : 'croptype_potato',			icon : 'potato.webp' },
	sugarbeet     : {	name : 'croptype_sugarbeet',		icon : 'sugarbeet.webp' },
	sugarcane     : {	name : 'croptype_sugarcane',		icon : 'sugarcane.webp' },
	poplar        : {	name : 'croptype_poplar',			icon : 'poplar.webp' },
	oilseedradish : {	name : 'croptype_oilseedradish',	icon : 'oilradish.webp' },
	grass         : {	name : 'croptype_grass',			icon : 'grass.webp' },
	grape         : {	name : 'croptype_grape',			icon : 'grape.webp' },
	olive         : {	name : 'croptype_olive',			icon : 'olive.webp' },
	clover        : {	name : 'croptype_clover',			icon : 'clover.webp' },
	alfalfa       : {	name : 'croptype_alfalfa',			icon : 'alfalfa.webp' },
}
/* eslint-enable sort-keys */

const nameMonth = ['mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb']

function getCropInfo(name) {
	if ( typeof knownCrops[name] === 'undefined' ) {
		return `${name.slice(0, 1).toUpperCase()}${name.slice(1)}`
	}
	return `<img style="width: 30px; height: 30px;" src="img/fills/${knownCrops[name].icon}"> <l10n name="${knownCrops[name].name}"></l10n>`
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

function clientMakeCropCalendar(elementID, theData, isSouth = false) {
	const theTable      = document.getElementById(elementID)
	const tableLines    = []
	let   evenRow       = false

	tableLines.push([
		'<tr class="crophead"><td></td>',
		makeTD(['text-center'], '<img src="img/period_spring.webp">', false, 3),
		makeTD(['text-center'], '<img src="img/period_summer.webp">', false, 3),
		makeTD(['text-center'], '<img src="img/period_fall.webp">', false, 3),
		makeTD(['text-center'], '<img src="img/period_winter.webp">', false, 3),
		'</tr>'].join('')
	)

	const monthLabels = []
	
	for ( const month in nameMonth ) {
		monthLabels.push(makeTD(['p-0 text-center text-white'], `<l10n name="cropmonth_${nameMonth[month]}"></l10n>`, true))
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
				getCropInfo(crop.name),
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

			tableLines.push(`<tr>${cropNameCell}${orderLine(plantLines, isSouth)}</tr>`)
			tableLines.push(`<tr>${orderLine(harvestLines, isSouth)}</tr>`)
			evenRow = !evenRow
		} catch (e) {
			window.log.warning(`Unable to build calendar row :: ${e}`, 'cropcal')
		}
	}

	theTable.innerHTML = tableLines.join('')
}