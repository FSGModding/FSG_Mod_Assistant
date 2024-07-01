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
	byIdHTMLorHide : ( id, content, test ) => {
		if ( test === null || test === '' ) {
			MA.byId(id).classList.add('d-none')
		} else {
			MA.byIdHTML(id, content)
		}
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

	
	clsOrGate   : ( id, test, ifTrue, ifFalse ) => {
		const element = MA.byId(id)
		if ( test ) {
			element.classList.add(ifTrue)
			element.classList.remove(ifFalse)
		} else {
			element.classList.add(ifFalse)
			element.classList.remove(ifTrue)
		}
	},
	clsOrGateArr : (id, arr, ifTrue = 'text-danger', ifFalse = 'text-success') => {
		MA.clsOrGate(id, (Array.isArray(arr) && arr.length !== 0), ifTrue, ifFalse )
	},

	prefixNotEmpty : (text, prefix = '') => text.length === 0 ? text : `${prefix}${text}`,

	clearTooltips   : () => { for ( const tooltip of MA.query('.tooltip') ) { tooltip?.hide?.() } },

	interceptLog : (page) => {
		window.console.log = (...args) => window.log.log([...args].map((x) => x.toString()).join(''), page)
		window.console.error = (...args) => window.log.error([...args].map((x) => x.toString()).join(''), page)
	},

	start : () => {
		MA.updateFontSize()
		MA.updateTheme()
	},
	updateFontSize : () => {
		window.settings.get('font_size').then((value) => {
			window.fontSheet.replaceSync(`:root { --bs-root-font-size: ${value}px !important; }`)
		})
	},
	updateTheme : () => {
		window.settings.theme().then((value) => {
			document.body.setAttribute('data-bs-theme', value)
		})
	},
}

const DATA = {
	checkX : (amount, showCount = true) =>
		`${(showCount)?`${amount} `:''}${(amount>0)?DATA.getIcon('check', 'success'):DATA.getIcon('x', 'danger')}`,

	getIcon    : ( type, cls ) => `<span class="text-${cls}">${DATA.getIconSVG(type)}</span>`,
	getIconCLR : ( currentlyActive = false, colorIndex = 0 ) => {
		const defaultColor = ['#FFC843', '#E0B03B', '#7F7F00']
		return currentlyActive ?
			['#225511', '#44BB22', '#4C4C00'] :
			[
				defaultColor,
				['#FFAF00', '#FFBB27', '#7E5700'],
				['#FF6201', '#FF7A27', '#7E3000'],
				['#DB277E', '#E668A5', '#5B1033'],
				['#8A13BD', '#C45FEF', '#2C053C'],
				['#7958EF', '#7E5EF0', '#2F0FA1'],
				['#638AFF', '#4E7BFF', '#002CB1'],
				['#63F6FF', '#9DF9FF', '#009BA4'],
				['#84FF82', '#C5FFC4', '#417E40'],
			][colorIndex] ?? defaultColor
	},
	getIconSVG : ( type, isFav = false, isAct = false, isDrop = false, colorIndex = 0, isDetail = false )  => {
		const colors = DATA.getIconCLR(isAct, colorIndex)
		const style = !isDetail ? 'margin-left: 1rem; margin-top: 0.3rem;' : 'margin-left: 0.25rem; margin-right: 0.75rem;'

		switch (type) {
			case 'check':
				return '<i class="bi bi-check2-circle"></i>'
			case 'x':
				return '<i class="bi bi-x-circle"></i>'
			case 'folder':
				return [
					`<svg style="width: 2rem; ${style}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 990 673">`,
					`<path fill="${colors[1]}" d="M833 55H295V31c0-17-14-31-31-31H87C70 0 56 14 56 31v24H46C21 55 0 76 0 102v498c0 25 21 46 46 46h787c25 0 46-21 46-46V102c0-26-21-47-46-47Z"/>`,
					`<path fill="${colors[2]}" d="M66 100h747v502H66z"/>`,
					`<path fill="${colors[0]}" d="M890 601c-6 25-32 45-57 45H46c-25 0-41-20-35-45l99-402c6-25 32-45 57-45h786c26 0 42 20 36 45l-99 402Z"/>`,
					isFav ? `<path fill="${colors[2]}" d="m487 175 63 179h188L583 455l63 175-159-109-159 109 63-175-155-101h189l62-179Z"/>` : '',
					isDrop && !(isFav || isAct) ? `<path fill="${colors[2]}" fill-rule="evenodd" d="M396 552c0-10 9-18 19-18h331a18 18 0 0 1 0 37H415c-10 0-19-9-19-19m0-147c0-10 9-18 19-18h331a18 18 0 0 1 0 37H415c-10 0-19-9-19-19m0-147c0-10 9-18 19-18h331a18 18 0 0 1 0 37H415c-10 0-19-9-19-19m-110 37a37 37 0 1 0 0-73 37 37 0 0 0 0 73m0 147a37 37 0 1 0 0-73 37 37 0 0 0 0 73m0 147a37 37 0 1 0 0-73 37 37 0 0 0 0 73"/>` : '',
					isAct ? '<path fill="#fff" d="M827 3 334 545 133 324l-58 67 259 282L885 67 827 3z"/>' : '',
					'</svg>'
				].join('')
			default:
				return '&nbsp;'
		}
	},

	bytesToHR : async ( inBytes, { forceMB = false, showSuffix = true } = {} ) => {
		const thisLocale = await window.i18n.lang() ?? 'en'
		let bytes = inBytes

		if (Math.abs(bytes) < 1024) { return '0 kB' }

		const units = ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
		let u = -1
		const r = 10**2

		if ( !forceMB ) {
			do {
				bytes /= 1024
				++u
			} while (Math.round(Math.abs(bytes) * r) / r >= 1024 && u < units.length - 1)
		} else {
			bytes = Math.round((bytes / ( 1024 * 1024) * 100 )) / 100
		}

		return [
			bytes.toLocaleString( thisLocale, { minimumFractionDigits : 2, maximumFractionDigits : 2 } ),
			showSuffix ? (forceMB ? 'MB' : units[u]) : null
		].filter((x) => x !== null).join(' ')
	},
	bytesToMB     : async (count, suffix = true) => DATA.bytesToHR(count, { forceMB : true, showSuffix : suffix}),

	escapeDesc    : ( text ) => typeof text === 'string' ? text.replaceAll(/&/g, '&amp;').replaceAll(/<(?!(a |\/a))/g, '&lt;') : text,
	escapeSpecial : ( text ) => typeof text === 'string' ? DATA.unescapeText(text).replaceAll(/&/g, '&amp;').replaceAll(/</g, '&lt;').replaceAll(/>/g, '&gt;').replaceAll(/"/g, '&quot;').replaceAll(/'/g, '&#39;') : text,
	unescapeText  : (encodedString) => {
		const translate_re = /&(nbsp|amp|quot|lt|gt);/g
		const translate = {
			'amp'  : '&',
			'gt'   : '>',
			'lt'   : '<',
			'nbsp' : ' ',
			'quot' : '"',
		}
		return encodedString.replace(translate_re, (_, entity) => {
			return translate[entity]
		}).replace(/&#(\d+);/gi, (_, numStr) => {
			return String.fromCharCode(parseInt(numStr, 10))
		})
	},

	joinArrayOrI18N : async (arr, l10nKey = 'detail_extra_clean') =>
		Array.isArray(arr) && arr.length !== 0 ?
			arr.join('\n') :
			I18N.buildElement(l10nKey),
}


const I18N = {
	buildElement : async (key) =>
		window.i18n.get(key).then((result) =>
			`<l10n name="${key}" data-done="true">${result.entry}</l10n>`),
	clearTooltip : () => {
		while ( pageSTATE.tooltips.length !== 0 ) {
			const oldTooltip = pageSTATE.tooltips.pop()
			oldTooltip?.dispose?.()
		}
	},
	pageLang : () => {
		window.i18n.lang().then((value) => {
			document.documentElement.setAttribute('lang', value)
		})
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

const __ = I18N.buildElement

window.addEventListener('DOMContentLoaded', () => {
	window.fontSheet = new CSSStyleSheet()
	document.adoptedStyleSheets.push(window.fontSheet)

	MA.start()

	I18N.refresh()

	const newConsole = ((oldConsole) => {
		return {
			debug : (...args) => {
				oldConsole.debug(...args)
				window.log.debug(...args)
			},
			error : (...args) => {
				oldConsole.error(...args)
				window.log.error(...args)
			},
			local : (...args) => {
				oldConsole.info(...args)
			},
			log : (...args) => {
				oldConsole.info(...args)
				window.log.log(...args)
			},
		}
	})(window.console)
	
	window.console = newConsole

	document.addEventListener('keydown', (event) => {
		if (event.code === 'Escape' && ! document.location.href.includes('main.html') ) {
			window.operations.close()
		}
	})
})

//TODO: theme change
window?.operations?.receive('win:updateTheme', MA.updateTheme)
window?.operations?.receive('win:updateFontSize', MA.updateFontSize)
window?.operations?.receive('win:removeTooltips', MA.clearTooltips)
window.addEventListener('click', MA.clearTooltips)
