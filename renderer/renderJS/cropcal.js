/*eslint complexity: ["warn", 25]*/

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

function clientMakeCropCalendar(elementID, theData) {
	const theTable      = document.getElementById(elementID)
	const tableLines    = []
	const theseLines    = ['', '']
	let   evenRow       = false

	tableLines.push([
		'<tr class="crophead"><td></td>',
		makeTD(['text-center'], '<img src="cropcal/period_spring.png">', false, 3),
		makeTD(['text-center'], '<img src="cropcal/period_summer.png">', false, 3),
		makeTD(['text-center'], '<img src="cropcal/period_fall.png">', false, 3),
		makeTD(['text-center'], '<img src="cropcal/period_winter.png">', false, 3),
		'</tr>'].join('')
	)

	theseLines[0] = `${makeTD(['p-0'], '', true)}`
	theseLines[1] = '<td></td>'
	
	for ( const month in nameMonth ) {
		theseLines[0] += makeTD(['p-0 text-center text-white'], `<l10n name="cropmonth_${nameMonth[month]}"></l10n>`, true)
	}
	tableLines.push(`<tr class="crophead">${theseLines[0]}</tr>`)

	for ( const crop of theData ) {
		theseLines[0] = makeTD(
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
		theseLines[1] = ''

		for ( let idx = 1; idx < 13; idx++ ) {
			theseLines[0] += makeTD(
				[
					'crop-box',
					`crop-row-${ evenRow ? 'even' : 'odd' }`,
					`crop-col-${idx % 2 === 0 ? 'even' : 'odd'}`,
					crop.plantPeriods.includes(idx) ? 'crop_plant' : ''
				]
			)

			theseLines[1] += makeTD(
				[
					'crop-box',
					`crop-row-${ evenRow ? 'even' : 'odd' }`,
					`crop-col-${idx % 2 === 0 ? 'even' : 'odd'}`,
					crop.harvestPeriods.includes(idx) ? 'crop_harvest' : ''
				]
			)
		}

		tableLines.push(`<tr>${theseLines[0]}</tr>`)
		tableLines.push(`<tr>${theseLines[1]}</tr>`)
		evenRow = !evenRow
	}

	theTable.innerHTML = tableLines.join('')
}