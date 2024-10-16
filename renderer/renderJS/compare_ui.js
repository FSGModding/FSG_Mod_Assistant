/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */
// MARK: COMPARE UI

/* global DATA, MA, ST, NUM, client_BGData */

// MARK: PAGE LOAD
window.addEventListener('DOMContentLoaded', async () => {
	window.state = new windowState()
})

class windowState {
	locale  = 'en'
	sorting = null

	// MARK: init
	constructor() {
		window.i18n.lang().then((result) => {
			this.locale   = result
			window.locale = result

			this.getSorting()

			window.compare_IPC.get().then((compareList) => { this.processList(compareList) })
		})

		for ( const element of MA.query('.sort-up, .sort-down') ) {
			element.addEventListener('click', (e) => { this.changeSort(e) })
		}
	
		MA.byId('clearButton').addEventListener('click', () => {
			window.compare_IPC.clear().then((compareList) => { this.processList(compareList) })
		})
	}

	// MARK: clicks
	changeSort(e) {
		const sortType = e.target.closest('th').safeAttribute('data-sort')
		const sortDirection = e.target.classList.contains('sort-down') ? 'sort-down' : 'sort-up'
		location.search = `?type=${sortType}&direction=${sortDirection}`
	}

	getSorting() {
		const urlParams     = new URLSearchParams(window.location.search)

		this.sorting = {
			type : urlParams.get('type') || 'price',
			dir  : urlParams.get('direction') || 'sort-down',
		}

		for ( const element of MA.query('.sort-active')) {
			element.classList.remove('sort-active')
		}

		const sortMarker = MA.query(`th[data-sort="${this.sorting.type}"] .${this.sorting.dir}`)
		if ( sortMarker.length === 1 ) {
			sortMarker[0].classList.add('sort-active')
		}
	}

	
	noNull(value) { return value === null ? 0 : value }

	// MARK: process
	processList(list) {
		const keyArray   = Object.keys(list)
		const dataObject = {}

		for ( const key of keyArray ) {
			const record     = list[key]
			const thisItem   = record.internal ?
				client_BGData.records[key] :
				record.contents
			const thisData   = ST.getInfo(thisItem)

			const thisObject = {
				info : {
					brand  : ST.resolveBrand(thisItem.brandIcon || null, thisItem.brand),
					icon   : ST.resolveIcon(thisItem.icon),
					name   : thisItem.name,
					source : record.internal ? '' : record.source,
				},
				value : {
					'engine-high' : this.noNull(thisData.powerSpan[1]),
					'engine-low'  : this.noNull(thisData.powerSpan[0] ||thisData.needPower),
					'fill'        : this.noNull(thisData.fillLevel),
					'price'       : this.noNull(thisItem.price),
					'speed'       : this.noNull(thisData.maxSpeed || thisData.speedLimit),
					'weight'      : this.noNull(thisData.weight),
					'width'       : this.noNull(thisData.workWidth),
				},
				text : {
					'engine-high' : NUM.fmtMany(thisData.powerSpan[1], this.locale, [ST.unit.hp], true),
					'engine-low'  : NUM.fmtMany(thisData.powerSpan[0] || thisData.needPower, this.locale, [ST.unit.hp], true),
					'fill'        : NUM.fmtMany(thisData.fillLevel, this.locale, [ST.unit.l], true),
					'price'       : NUM.fmtNoFrac(thisItem.price),
					'speed'       : NUM.fmtMany(thisData.maxSpeed || thisData.speedLimit, this.locale, [ST.unit.kph], true),
					'weight'      : NUM.fmtMany(thisData.weight, this.locale, [ST.unit.kg], true),
					'width'       : NUM.fmtMany(thisData.workWidth, this.locale, [ST.unit.m], true),
				},
			}
			dataObject[key] = thisObject
		}

		keyArray.sort()
		keyArray.sort((a, b) => {
			return this.sorting.dir === 'sort-up' ?
				dataObject[a].value[this.sorting.type] - dataObject[b].value[this.sorting.type] : //ASC
				dataObject[b].value[this.sorting.type] - dataObject[a].value[this.sorting.type] //DESC
		})
		this.updateTable(keyArray, dataObject)
	}

	// MARK: table
	updateTable(order, data) {
		const tableElement = MA.byId('displayTable')

		tableElement.innerHTML = ''

		for ( const key of order ) {
			const thisItem = data[key]
			const thisElement = DATA.templateEngine('item_div', {
				brandImage : `<img src="${thisItem.info.brand}" class="img-fluid store-brand-image">`,
				iconImage  : `<img src="${thisItem.info.icon}" class="img-fluid store-thumb-image">`,

				name       : thisItem.info.name,
				source     : thisItem.info.source,

				engineHigh : thisItem.text['engine-high'],
				engineLow  : thisItem.text['engine-low'],
				fillunit   : thisItem.text.fill,
				maxspeed   : thisItem.text.speed,
				price      : thisItem.text.price,
				weight     : thisItem.text.weight,
				width      : thisItem.text.width,
			})

			thisElement.querySelector('.removeButton').addEventListener('click', () => {
				window.compare_IPC.remove(key).then((newList) => { this.processList(newList) })
			})
			tableElement.appendChild(thisElement)
		}
	}
}
