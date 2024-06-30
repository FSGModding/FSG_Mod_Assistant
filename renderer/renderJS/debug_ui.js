/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Debug window UI

/* global MA, bootstrap */

window.debug.receive('debug:item', (level, item) => { addItem(level, item) })

function clearOutput() {
	MA.byIdText('debug_log', '')
}

function addItem(level, html) {
	const thisDiv = document.createElement('div')
	thisDiv.innerHTML = html
	thisDiv.classList.add('debug_log_item', level)
	MA.byIdAppend('debug_log', thisDiv)
}

function getAll() {
	clearOutput()
	window.debug.all().then((results) => {
		for ( const thisItem of results ) {
			addItem(...thisItem)
		}
	})
}

function resetViewRules() {
	while ( levelStyleSheet.cssRules.length !== 0 ) {
		levelStyleSheet.deleteRule(0)
	}
	for ( const thisLevel of levelNames ) {
		MA.byId(`debug_${thisLevel}`).checked = thisLevel !== 'debug'
	}
	initialViewRules()
}

function initialViewRules() {
	for ( const thisLevel of levelNames ) {
		levelStyleSheet.insertRule(`.debug_log_item.${thisLevel} { display : ${thisLevel === 'debug' ? 'none' : 'block' } }`)
	}
}

let   levelStyleSheet = null
const levelNames      = new Set(['debug', 'info', 'notice', 'warning', 'danger'])

window.addEventListener('DOMContentLoaded', () => {
	for ( const element of MA.queryA('input.filter_only') ) {
		element.addEventListener('change', (e) => {
			const thisLevel = e.target.id.replace(/^debug_/, '')

			for ( const [index, cssRule] of Object.entries(levelStyleSheet.cssRules) ) {
				if ( cssRule.selectorText.endsWith(thisLevel) ) {
					levelStyleSheet.deleteRule(index)
					break
				}
			}
			levelStyleSheet.insertRule(`.debug_log_item.${thisLevel} { display : ${e.target.checked ? 'block' : 'none' } }`)
		})
	}

	const viewStyle = document.createElement('style')

	document.head.appendChild(viewStyle)

	levelStyleSheet = viewStyle.sheet

	initialViewRules()

	MA.queryA('[data-bs-toggle="tooltip"]').map((element) => new bootstrap.Tooltip(element, { trigger : 'hover', placement : 'bottom' }))
	MA.byId('debug_reset').addEventListener('click', resetViewRules)
	MA.byId('debug_log').addEventListener('contextmenu', window.debug.context)
	getAll()
})
