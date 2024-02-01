/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Base game window UI

/* global __, _l, dtLib, processL10N, fsgUtil, client_BGData */

const itemList      = new Set()

window.mods.receive('fromMain_addBaseItem', (itemID) => {
	addItem(client_BGData.records[itemID], null, itemID)
})

window.mods.receive('fromMain_addModItem', (itemDetails, source) => {
	addItem(itemDetails, source, itemDetails.uuid_name)
})

window.addEventListener('DOMContentLoaded', () => { processL10N() })

function addItem(thisItem, source, uuid_name) {
	if ( thisItem.masterType !== 'vehicle' ) { return }

	const identity   = `${source === null ? 'BASEGAME' : source }_${uuid_name.replaceAll('.', '_')}`
	
	if ( itemList.has(identity) ) { return }

	itemList.add(identity)
	
	const uuid     = crypto.randomUUID()
	const thisData = dtLib.getInfo(thisItem)
	const locale   = _l()

	const addHTML  = fsgUtil.useTemplate('item_div', {
		engineHigh        : dtLib.numFmtMany(thisData.powerSpan[1], locale, [dtLib.unit.hp], true),
		engineHigh_raw    : thisData.powerSpan[1],
		engineLow         : dtLib.numFmtMany(thisData.powerSpan[0] || thisData.needPower, locale, [dtLib.unit.hp], true),
		engineLow_raw     : thisData.powerSpan[0] || thisData.needPower,
		fillunit          : dtLib.numFmtMany(thisData.fillLevel, locale, [dtLib.unit.l], true),
		fillunit_raw      : thisData.fillLevel,
		iconImage         : dtLib.safeDataImage(thisItem.icon, { width : '50%'}),
		maxspeed          : dtLib.numFmtMany(thisData.maxSpeed || thisData.speedLimit, locale, [dtLib.unit.kph], true),
		maxspeed_raw      : thisData.maxSpeed || thisData.speedLimit,
		name              : __(thisItem.name, {skipIfNotBase : true}),
		price             : dtLib.numFmtNoFrac(thisItem.price),
		price_raw         : thisItem.price,
		source            : source || __('basegame_title'),
		uuid              : uuid,
		weight            : dtLib.numFmtMany(thisData.weight, locale, [dtLib.unit.kg], true),
		weight_raw        : thisData.weight,
		width             : dtLib.numFmtMany(thisData.workWidth, locale, [dtLib.unit.m], true),
		width_raw         : thisData.workWidth,
	})
	const appendDiv = document.createElement('tr')

	appendDiv.id = uuid
	appendDiv.setAttribute('data-identity', identity)
	appendDiv.innerHTML = addHTML
	fsgUtil.byId('displayTable').append(appendDiv)
	processL10N()
}

function clientSortBy(sortType) {
	const isDownNow    = fsgUtil.byId(`head_${sortType}`).querySelector('.fsico-sort-down') !== null
	const shouldBeDown = !isDownNow

	fsgUtil.clsRemoveFromAll('.sort-icon', ['fsico-sort-down', 'fsico-sort-up'])
	fsgUtil.clsAddToAll('.sort-icon', 'fsico-sort-none')

	fsgUtil.query(`#head_${sortType} .sort-icon`)[0].classList.remove('fsico-sort-none')
	fsgUtil.query(`#head_${sortType} .sort-icon`)[0].classList.add(shouldBeDown ? 'fsico-sort-down' : 'fsico-sort-up')
	
	const currentRows = fsgUtil.byId('displayTable').querySelectorAll('tr')

	const sortRows = []
	for ( const [thisIdx, thisRow] of currentRows.entries() ) {
		const thisValue = thisRow.querySelector(`[data-type="${sortType}"]`).getAttribute('data-sort')
		sortRows.push({idx : thisIdx, value : thisValue, row : thisRow.outerHTML })
	}

	sortRows.sort((a, b) => !shouldBeDown ? a.value - b.value : b.value - a.value )

	fsgUtil.setById('displayTable', sortRows.map((x) => x.row))
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