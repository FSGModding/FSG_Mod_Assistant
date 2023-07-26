/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */
// Crop Calendar Rendering

/* eslint-disable sort-keys */
const knownCrops = {
	wheat         : {	name : 'croptype_wheat',			icon : 'crop_wheat.png' },
	barley        : {	name : 'croptype_barley',			icon : 'crop_barley.png' },
	canola        : {	name : 'croptype_canola',			icon : 'crop_canola.png' },
	oat           : {	name : 'croptype_oat',				icon : 'crop_oat.png' },
	sorghum       : {	name : 'croptype_sorghum',			icon : 'crop_sorghum.png' },
	cotton        : {	name : 'croptype_cotton',			icon : 'crop_cotton.png' },
	maize         : {	name : 'croptype_maize',			icon : 'crop_maize.png' },
	sunflower     : {	name : 'croptype_sunflower',		icon : 'crop_sunflower.png' },
	soybean       : {	name : 'croptype_soybean',			icon : 'crop_soybean.png' },
	potato        : {	name : 'croptype_potato',			icon : 'crop_potato.png' },
	sugarbeet     : {	name : 'croptype_sugarbeet',		icon : 'crop_sugarbeet.png' },
	sugarcane     : {	name : 'croptype_sugarcane',		icon : 'crop_sugarCane.png' },
	poplar        : {	name : 'croptype_poplar',			icon : 'crop_poplar.png' },
	oilseedradish : {	name : 'croptype_oilseedradish',	icon : 'crop_oilseedRadish.png' },
	grass         : {	name : 'croptype_grass',			icon : 'crop_grass.png' },
	grape         : {	name : 'croptype_grape',			icon : 'crop_grape.png' },
	olive         : {	name : 'croptype_olive',			icon : 'crop_olive.png' },
	clover        : {	name : 'croptype_clover',			icon : 'crop_clover.png' },
	alfalfa       : {	name : 'croptype_alfalfa',			icon : 'crop_alfalfa.png' },
}
/* eslint-enable sort-keys */

const nameMonth = ['mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb']

function getCropInfo(name) {
	if ( typeof knownCrops[name] === 'undefined' ) {
		return `${name.slice(0, 1).toUpperCase()}${name.slice(1)}`
	}
	return `<img style="width: 30px; height: 30px;" src="cropcal/${knownCrops[name].icon}"> <l10n name="${knownCrops[name].name}"></l10n>`
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
		makeTD(['text-center'], '<img src="cropcal/period_spring.png">', false, 3),
		makeTD(['text-center'], '<img src="cropcal/period_summer.png">', false, 3),
		makeTD(['text-center'], '<img src="cropcal/period_fall.png">', false, 3),
		makeTD(['text-center'], '<img src="cropcal/period_winter.png">', false, 3),
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