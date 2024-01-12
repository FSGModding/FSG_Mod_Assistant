/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Base game window UI

/* global processL10N, fsgUtil, getText, client_baseGameData */

let currentLocale = 'en'

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

window.mods.receive('fromMain_addBaseItem', (itemID) => {
	addItem(client_baseGameData.records[itemID], null)
	processL10N()
	clientGetL10NEntries2()
})

window.mods.receive('fromMain_addModItem', (itemDetails, source) => {
	addItem(itemDetails, source)
	processL10N()
	clientGetL10NEntries2()
})

window.addEventListener('DOMContentLoaded', () => {
	processL10N()
	clientGetL10NEntries2()
})

function addItem(thisItem, source) {
	currentLocale    = document.querySelector('body').getAttribute('data-i18n') || 'en'

	const uuid       = crypto.randomUUID()
	const maxSpeed   = getDefault(thisItem?.specs?.maxspeed)
	const thePower   = getDefault(thisItem?.specs?.power)
	const getPower   = getDefault(thisItem?.specs?.neededpower)
	let   theWidth   = getDefault(thisItem?.specs?.workingwidth, true)
	const theFill    = getDefault(thisItem.fillLevel)
	
	if ( typeof thisItem.sprayTypes !== 'undefined' && thisItem.sprayTypes !== null && thisItem?.sprayTypes?.length !== 0 && theWidth === 0 ) {
		for ( const thisWidth of thisItem.sprayTypes ) {
			theWidth = Math.max(thisWidth.width, theWidth)
		}
	}
	
	const realPower = thePower || getPower || 0

	const addHTML  = fsgUtil.useTemplate('item_div', {
		engine            : realPower > 0 ? formatManyNumber(realPower, currentLocale, [
			{ factor : 1,      precision : 0, unit : 'unit_hp' },
		]) : '--',
		fillunit          : theFill > 0 ? formatManyNumber(theFill, currentLocale, [
			{ factor : 1,         precision : 0, unit : 'unit_l' },
		]) : '--',
		iconIMG           : thisItem.icon,
		maxspeed          : maxSpeed > 0 ? formatManyNumber(maxSpeed, currentLocale, [
			{ factor : 1,        precision : 0, unit : 'unit_kph' },
		]) : '--',
		name              : thisItem.name,
		price             : Intl.NumberFormat(currentLocale).format(thisItem.price),
		source            : source || '<l10n name="basegame_title"></l10n>',
		uuid              : uuid,
		weight            : formatManyNumber(thisItem.weight, currentLocale, [
			{ factor : 1,    precision : 0, unit : 'unit_kg' },
		]),
		width             : theWidth > 0 ? formatManyNumber(theWidth, currentLocale, [
			{ factor : 1,       precision : 1, unit : 'unit_m' },
		]) : '--',
	})
	const appendDiv = document.createElement('div')

	appendDiv.id = uuid
	appendDiv.classList.add('col')
	appendDiv.innerHTML = addHTML
	fsgUtil.byId('bgContent').append(appendDiv)
}

function clientRemoveItem(itemID) { fsgUtil.byId(itemID).remove() }

function clientOpenFolder() {
	const urlParams     = new URLSearchParams(window.location.search)
	const pageID        = urlParams.get('page')
	const folder        = pageID.split('_').slice(0, -1)

	window.mods.openBaseFolder(folder)
}


function clientGetL10NEntries2() {
	const l10nSendArray = fsgUtil.queryA('l10nBase').map((element) => fsgUtil.getAttribNullEmpty(element, 'name'))

	window.l10n.getTextBase_send(new Set(l10nSendArray))
}

window?.l10n?.receive('fromMain_getTextBase_return', (data) => {
	for ( const item of fsgUtil.query(`l10nBase[name="${data[0]}"]`) ) { item.innerHTML = data[1] }
})

window?.l10n?.receive('fromMain_l10n_refresh', () => {
	clientGetL10NEntries2()
})