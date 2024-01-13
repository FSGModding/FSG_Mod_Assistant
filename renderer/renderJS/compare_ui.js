/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Base game window UI

/* global processL10N, fsgUtil, client_baseGameData */

let   currentLocale = 'en'
const itemList      = new Set()

window.mods.receive('fromMain_addBaseItem', (itemID) => {
	addItem(client_baseGameData.records[itemID], null, itemID)
	processL10N()
	clientGetL10NEntries2()
})

window.mods.receive('fromMain_addModItem', (itemDetails, source) => {
	addItem(itemDetails, source, itemDetails.uuid_name)
	processL10N()
	clientGetL10NEntries2()
})

window.addEventListener('DOMContentLoaded', () => {
	processL10N()
	clientGetL10NEntries2()
})

function getDefault(value, float = false, safe = 0) {
	const newValue = typeof value === 'number' || typeof value === 'string' ? value : safe
	return !float ? parseInt(newValue) : parseFloat(newValue)
}

function addItem(thisItem, source, uuid_name) {
	if ( thisItem.masterType !== 'vehicle' ) { return }

	const identity   = `${source === null ? 'BASEGAME' : source }_${uuid_name.replaceAll('.', '_')}`
	
	if ( itemList.has(identity) ) { return }

	itemList.add(identity)
	
	currentLocale    = document.querySelector('body').getAttribute('data-i18n') || 'en'
	const uuid       = crypto.randomUUID()
	const maxSpeed   = getDefault(thisItem?.specs?.maxspeed) || getDefault(thisItem?.speedLimit)
	const thePower   = getDefault(thisItem?.specs?.power)
	const getPower   = getDefault(thisItem?.specs?.neededpower)
	let   theWidth   = getDefault(thisItem?.specs?.workingwidth, true)
	const theFill    = getDefault(thisItem.fillLevel)
	const powerSpan  = fsgUtil.getMinMaxHP(thePower, thisItem?.motorInfo)
	
	if ( typeof thisItem.sprayTypes !== 'undefined' && thisItem.sprayTypes !== null && thisItem?.sprayTypes?.length !== 0 && theWidth === 0 ) {
		for ( const thisWidth of thisItem.sprayTypes ) {
			theWidth = Math.max(thisWidth.width, theWidth)
		}
	}

	const addHTML  = fsgUtil.useTemplate('item_div', {
		engineHigh        : fsgUtil.numFmtMany(powerSpan[1], currentLocale, [
			{ factor : 1,      precision : 0, unit : 'unit_hp' },
		], true),
		engineHigh_raw    : powerSpan[1],
		engineLow         : fsgUtil.numFmtMany(powerSpan[0] || getPower, currentLocale, [
			{ factor : 1,      precision : 0, unit : 'unit_hp' },
		], true),
		engineLow_raw     : powerSpan[0],
		fillunit          : fsgUtil.numFmtMany(theFill, currentLocale, [
			{ factor : 1,         precision : 0, unit : 'unit_l' },
		], true),
		fillunit_raw      : theFill,
		iconIMG           : thisItem.icon,
		maxspeed          : fsgUtil.numFmtMany(maxSpeed, currentLocale, [
			{ factor : 1,        precision : 0, unit : 'unit_kph' },
		], true),
		maxspeed_raw      : maxSpeed,
		name              : thisItem.name,
		price             : Intl.NumberFormat(currentLocale).format(thisItem.price),
		price_raw         : thisItem.price,
		source            : source || '<l10n name="basegame_title"></l10n>',
		uuid              : uuid,
		weight            : fsgUtil.numFmtMany(thisItem.weight, currentLocale, [
			{ factor : 1,    precision : 0, unit : 'unit_kg' },
		]),
		weight_raw        : thisItem.weight,
		width             : fsgUtil.numFmtMany(theWidth, currentLocale, [
			{ factor : 1,       precision : 1, unit : 'unit_m' },
		], true),
		width_raw         : theWidth,
	})
	const appendDiv = document.createElement('tr')

	appendDiv.id = uuid
	appendDiv.setAttribute('data-identity', identity)
	appendDiv.innerHTML = addHTML
	fsgUtil.byId('displayTable').append(appendDiv)
}

function clientSortBy(sortType) {
	const isDownNow = fsgUtil.byId(`head_${sortType}`).querySelector('.sort_icon_down') !== null
	const shouldBeDown = !isDownNow

	for ( const element of fsgUtil.query('.sort_icon') ) { element.remove() }

	const currentHTML = fsgUtil.byId(`head_${sortType}`).innerHTML
	const addHTML     = shouldBeDown ? '<i class="bi bi-chevron-double-down sort_icon sort_icon_down"></i>' : '<i class="bi bi-chevron-double-up sort_icon sort_icon_up"></i>'

	fsgUtil.byId(`head_${sortType}`).innerHTML = `${addHTML} ${currentHTML}`
	
	const currentRows = fsgUtil.byId('displayTable').querySelectorAll('tr')

	const sortRows = []
	for ( const [thisIdx, thisRow] of currentRows.entries() ) {
		const thisValue = thisRow.querySelector(`[data-type="${sortType}"]`).getAttribute('data-sort')
		sortRows.push({idx : thisIdx, value : thisValue, row : thisRow.outerHTML })
	}

	sortRows.sort((a, b) => !shouldBeDown ? a.value - b.value : b.value - a.value )

	fsgUtil.byId('displayTable').innerHTML = sortRows.map((x) => x.row).join('')
}

function clientRemoveItem(itemID) {
	itemList.delete(fsgUtil.byId(itemID).getAttribute('data-identity'))
	fsgUtil.byId(itemID).remove()
}

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