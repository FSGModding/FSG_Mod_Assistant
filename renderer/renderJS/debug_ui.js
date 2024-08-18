/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// MARK: DEBUG UI

/* global MA */

// MARK: PAGE LOAD
window.addEventListener('DOMContentLoaded', () => {
	window.state = new windowState()
})

class windowState {
	levelStyleSheet = null
	levelNames      = new Set(['debug', 'info', 'notice', 'warning', 'danger'])
	
	constructor() {
		window.debug_IPC.receive('debug:item', (level, item) => { this.addItem(level, item) })

		this.init()
	}

	init() {
		for ( const element of MA.queryA('input.filter_only') ) {
			element.addEventListener('change', (e) => {
				const thisLevel = e.target.id.replace(/^debug_/, '')

				for ( const [index, cssRule] of Object.entries(this.levelStyleSheet.cssRules) ) {
					if ( cssRule.selectorText.endsWith(thisLevel) ) {
						this.levelStyleSheet.deleteRule(index)
						break
					}
				}
				this.levelStyleSheet.insertRule(`.debug_log_item.${thisLevel} { display : ${e.target.checked ? 'block' : 'none' } }`)
			})
		}

		const viewStyle = document.createElement('style')

		document.head.appendChild(viewStyle)

		this.levelStyleSheet = viewStyle.sheet

		this.initialViewRules()

		MA.byId('debug_reset').addEventListener('click', () => { this.resetViewRules() })
		MA.byId('debug_log').addEventListener('contextmenu', window.debug_IPC.context)
		this.getAll()
	}

	// MARK: OUTPUT BUILD
	clearOutput() {
		MA.byIdText('debug_log', '')
	}

	addItem(level, html) {
		const thisDiv = document.createElement('div')
		thisDiv.innerHTML = html
		thisDiv.classList.add('debug_log_item', level)
		MA.byIdAppend('debug_log', thisDiv)
	}

	getAll() {
		this.clearOutput()
		window.debug_IPC.all().then((results) => {
			for ( const thisItem of results ) {
				this.addItem(...thisItem)
			}
		})
	}

	// MARK: DYNAMIC CSS
	resetViewRules() {
		while ( this.levelStyleSheet.cssRules.length !== 0 ) {
			this.levelStyleSheet.deleteRule(0)
		}
		for ( const thisLevel of this.levelNames ) {
			MA.byId(`debug_${thisLevel}`).checked = thisLevel !== 'debug'
		}
		this.initialViewRules()
	}

	initialViewRules() {
		for ( const thisLevel of this.levelNames ) {
			this.levelStyleSheet.insertRule(`.debug_log_item.${thisLevel} { display : ${thisLevel === 'debug' ? 'none' : 'block' } }`)
		}
	}
}
