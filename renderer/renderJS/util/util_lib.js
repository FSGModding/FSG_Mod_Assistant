/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */
/* global bootstrap */
// FSG Mod Assist Utilities (client side)

const pageSTATE = {
	do_tooltips : false,
	tooltips    : [],
}

const MA = {
	attrib : (element, attrib, replacer = null) => {
		const attribValue = element.getAttribute(attrib)
	
		return ( typeof attribValue !== 'string' || attribValue === null || attribValue === '' ) ?
			replacer :
			attribValue
	},
	attribToString : (element, attrib ) => MA.attrib(element, attrib, ''),

	byId       : ( id ) => document.getElementById( id ),
	byIdAppend : ( id, element = null ) => {
		if ( element === null ) { return false }
		return MA.byId(id).appendChild(element)
	},
	byIdHTML   : ( id, newValue = null ) => {
		if ( newValue !== null ) { MA.byId(id).innerHTML = newValue }
		return MA.byId(id).innerHTML
	},
	byIdText   : ( id, newValue = null ) => {
		if ( newValue !== null ) { MA.byId(id).textContent = newValue }
		return MA.byId(id).textContent
	},
	byIdValue  : ( id, newValue = null ) => {
		if ( newValue !== null ) { MA.byId(id).value = newValue }
		return MA.byId(id)?.value || null
	},
	byTag      : ( tag )   => document.getElementsByTagName(tag),
	query      : ( query ) => document.querySelectorAll( query ),
	queryA     : ( query ) => [...document.querySelectorAll( query )],
	queryF     : ( query ) => document.querySelector(query),

	prefixNotEmpty : (text, prefix = '') => text.length === 0 ? text : `${prefix}${text}`,

	startUp : async () => {
		pageSTATE.do_tooltips = await window.settings.get('show_tooltips') === true
	},

	interceptLog : (page) => {
		window.console.log = (...args) => window.log.log([...args].map((x) => x.toString()).join(''), page)
		window.console.error = (...args) => window.log.error([...args].map((x) => x.toString()).join(''), page)
	},
}

const I18N = {
	clearTooltip : () => {
		while ( pageSTATE.tooltips.length !== 0 ) {
			const oldTooltip = pageSTATE.tooltips.pop()
			oldTooltip?.dispose?.()
		}
	},
	pageLang : () => {
		document.documentElement.setAttribute('lang', window.i18n.lang())
	},
	process : ( refresh = false ) => {
		const elements = ! refresh ?
			MA.query('l10n:not([data-done="true"]') :
			MA.query('l10n')
		for ( const element of elements ) {
			const key = MA.attrib(element, 'name')

			if ( key === null ) { continue }

			window.i18n.get(key).then((result) => {
				element.innerHTML = result.entry
				element.setAttribute('data-done', 'true')
				if ( result.title !== null && pageSTATE.do_tooltips ) {
					const extra        = MA.prefixNotEmpty(MA.attribToString(element, 'data-extra-title'), ' : ')
					const titleElement = ( result.entry_key === 'game_icon_lg' ) ?
						element.closest('#multi_version_button') :
						element.closest('button') || element.closest('span') || element.closest('label') || element.closest('a')

					titleElement.setAttribute('title', `${result.title}${extra}`)

					pageSTATE.tooltips.push(new bootstrap.Tooltip(titleElement, { trigger : 'hover' }))
				}
			})
		}
	},
	refresh : async () => {
		await I18N.start()
		I18N.pageLang()
		I18N.clearTooltip()
		I18N.process(true)
	},
	start : async () => {
		pageSTATE.do_tooltips = await window.settings.get('show_tooltips') === true
	},
}


window.addEventListener('DOMContentLoaded', () => {
	I18N.refresh()

	const newConsole = ((oldConsole) => {
		return {
			debug : (...args) => {
				oldConsole.debug(...args)
				window.log.debug(...args)
			},
			log : (...args) => {
				oldConsole.info(...args)
				window.log.log(...args)
			},
			error : (...args) => {
				oldConsole.error(...args)
				window.log.error(...args)
			},
		}
	})(window.console)
	
	window.console = newConsole
})

