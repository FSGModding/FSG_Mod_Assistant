/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// FSG Mod Assist Utilities (client side)

/* global l10n, bootstrap, ft_doReplace */
/* exported tableBuilder */

const getText     = (text, extraTitle = null) => `<l10n ${extraTitle!==null ? `data-extra-title="${extraTitle}"` : ''} name="${text}"></l10n>`
const getTextBase = (text, extraTitle = null) => `<l10nBase ${extraTitle!==null ? `data-extra-title="${extraTitle}"` : ''} name="${text}"></l10nBase>`
const _l = () => l10n.getLocale()
const __ = (text, { skipIfNotBase = false, skipOnSpace = true, skipAlways = false, title = null } = {} ) => {
	if ( skipAlways || typeof text !== 'string' || text.length === 0 ) { return text }

	if ( text.includes('[[') ) {
		let   newName      = text
		try {
			const nameParts    = text.match(/(.+?) \[\[(.+?)]]/)
			const replaceParts = nameParts[2].split('|')
			newName = nameParts[1]

			for ( const thisReplacement of replaceParts ) {
				newName = newName.replace(/%s/, __(thisReplacement, { skipIfNotBase : true }))
			}
		} catch { /* Ignore Problems Here */ }
		return newName
	}
	return text.startsWith('$l10n') ? getTextBase(text, title) : skipIfNotBase || (text.indexOf(' ') !== -1 && skipOnSpace) ? text :getText(text, title)
}

const fsgUtil = {
	badgeDefault : {
		broken      : 'danger',
		collect     : 'primary fw-bold fst-italic',
		depend      : 'danger',
		depend_flag : 'success',
		folder      : 'primary',
		fs0         : 'danger',
		fs11        : 'info border-danger',
		fs13        : 'info border-danger',
		fs15        : 'info border-danger',
		fs17        : 'info border-danger',
		fs19        : 'info border-danger',
		fs22        : 'info border-danger',
		keys_bad    : 'danger',
		keys_ok     : 'success',
		log         : 'info fw-bold fst-italic',
		map         : 'primary fst-italic',
		new         : 'success',
		nomp        : 'secondary',
		nonmh       : 'dark border-light-subtle',
		notmod      : 'danger',
		pconly      : 'info text-black',
		problem     : 'warning',
		recent      : 'success',
		require     : 'info text-black',
		savegame    : 'info fw-bold fst-italic',
		update      : 'light border-dark-subtle text-black',
		web         : 'light border-dark-subtle text-black',
	},
	led        : {
		product    : 0x1710,
		vendor     : 0x340d,

		blink      : new Uint8Array([0xFF, 0x07, 0xFF, 0x64, 0xFF, 0xEB, 0x7D, 0x9A, 0x03]),
		off        : new Uint8Array([0xFF, 0x00, 0x00, 0x64, 0x00, 0x32, 0x9E, 0xD7, 0x0D]),
		spin       : new Uint8Array([0xFF, 0x01, 0x66, 0xC8, 0xFF, 0xAD, 0x52, 0x81, 0xD6]),
	},

	byId      : ( id ) => document.getElementById( id ),
	htmlById  : (id) => fsgUtil.byId(id).innerHTML,
	valueById : (id, newValue) => {
		if ( typeof newValue !== 'undefined') {
			fsgUtil.byId(id).value = newValue
		} else {
			return fsgUtil.byId(id)?.value || null
		}
	},
	valueByIdLC : (id) => fsgUtil.byId(id).value.toLowerCase(),

	arrayJoinOrOther : (arr, l10nKey = 'detail_extra_clean') => Array.isArray(arr) && arr.length !== 0 ? arr.join('\n') : __(l10nKey),
	checkChangeAll : ( elements, newValue ) => {
		for ( const element of elements ) { element.checked = newValue}
	},
	checkX : (amount, showCount = true) =>
		`${(showCount)?`${amount} `:''}${(amount>0)?fsgUtil.getIcon('check', 'success'):fsgUtil.getIcon('x', 'danger')}`,

	clsAddId : (id, ...classes) => {
		const thisElement = fsgUtil.byId(id)
		if ( thisElement !== null ) { thisElement.classList.add(...classes) }
	},
	clsDelId : (id, ...classes) => {
		const thisElement = fsgUtil.byId(id)
		if ( thisElement !== null ) { thisElement.classList.remove(...classes) }
	},


	clsAddToAll : ( queryOrNodes, classList, callbackIsTrue = null ) => {
		const classArray = ( typeof classList === 'string' ) ? [classList] : classList
		const iterArray  = ( typeof queryOrNodes === 'string' ) ? fsgUtil.query(queryOrNodes) : queryOrNodes
		for ( const element of iterArray ) {
			if ( typeof callbackIsTrue !== 'function' || callbackIsTrue(element) ) {
				element.classList.add(...classArray)
			}
		}
	},
	clsDisable      : ( id ) => { fsgUtil.clsDisableTrue(id, true) },
	clsDisableFalse : ( id, test ) => { fsgUtil.clsDisableTrue(id, !test) },
	clsDisableTrue  : ( id, test ) => {
		const element = fsgUtil.byId(id)
		if ( test ) {
			element.classList.add('disabled')
		} else {
			element.classList.remove('disabled')
		}
	},
	clsEnable       : ( id ) => { fsgUtil.clsDisableTrue(id, false) },
	
	clsHide : ( id ) => { fsgUtil.clsHideTrue(id, true) },
	clsHideFalse : ( id, test ) => { fsgUtil.clsHideTrue(id, !test) },
	clsHideTrue  : ( id, test ) => {
		const element = fsgUtil.byId(id)
		if ( test ) {
			element.classList.add('d-none')
		} else {
			element.classList.remove('d-none')
		}
	},
	clsIdHas : (id, cls) => fsgUtil.byId(id).classList.contains(cls),
	clsOrGate   : ( id, test, ifTrue, ifFalse ) => {
		const element = fsgUtil.byId(id)
		if ( test ) {
			element.classList.add(ifTrue)
			element.classList.remove(ifFalse)
		} else {
			element.classList.add(ifFalse)
			element.classList.remove(ifTrue)
		}
	},
	clsOrGateArr : (id, arr, ifTrue = 'text-danger', ifFalse = 'text-success') => {
		fsgUtil.clsOrGate(id, (Array.isArray(arr) && arr.length !== 0), ifTrue, ifFalse )
	},
	clsRemoveFromAll : ( queryOrNodes, classList, callbackIsTrue = null ) => {
		const classArray = ( typeof classList === 'string' ) ? [classList] : classList
		const iterArray  = ( typeof queryOrNodes === 'string' ) ? fsgUtil.query(queryOrNodes) : queryOrNodes
		for ( const element of iterArray ) {
			if ( typeof callbackIsTrue !== 'function' || callbackIsTrue(element) ) {
				element.classList.remove(...classArray)
			}
		}
	},
	clsShow : ( id ) => { fsgUtil.clsShowTrue(id, true) },
	clsShowFalse : ( id, test ) => { fsgUtil.clsHideTrue(id, test) },
	clsShowTrue : ( id, test ) => { fsgUtil.clsHideFalse(id, test) },

	getHide     : (value, requiredValue = null) => fsgUtil.getHideBool(value, requiredValue) ? 'd-none' : '',
	getHideBool : (value, requiredValue = null) => {
		if ( typeof value === 'undefined' || value === null || value === false || value.length === 0 || value === 0 ) {
			return true
		}
		if ( Array.isArray(value) && value.filter((x) => x !== null).length === 0 ) { return true }
		if ( requiredValue !== null ) {
			if ( typeof value === 'string' && typeof requiredValue === 'string' && value.toLowerCase() === requiredValue.toLowerCase() ) {
				return false
			} else if ( typeof value === 'number' && typeof requiredValue === 'number' && value === requiredValue ) {
				return false
			}
			return true
		}
		return false
	},
	getShow     : (value, requiredValue = null) => !fsgUtil.getHideBool(value, requiredValue) ? 'd-none' : '',
	getShowBool : (value, requiredValue = null) => !fsgUtil.getHideBool(value, requiredValue),

	getAttribNullEmpty : (element, attrib) => {
		const attribValue = element.getAttribute(attrib)
	
		return ( typeof attribValue !== 'string' || attribValue === null ) ?
			null :
			attribValue
	},
	query      : ( query ) => document.querySelectorAll( query ),
	queryA     : ( query ) => [...document.querySelectorAll( query )],
	queryF     : ( query ) => document.querySelector(query),

	getIcon    : ( type, cls ) => `<span class="text-${cls}">${fsgUtil.getIconSVG(type)}</span>`,
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
		const colors = fsgUtil.getIconCLR(isAct, colorIndex)
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
	iconMaker : (icon = null) => {
		return ( typeof icon === 'string' ) ?
			icon :
			'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 903.2 904.2\'%3E%3Cpath d=\'M461.6 21a441.6 441.6 0 1 0 0 883.2 441.6 441.6 0 0 0 0-883.2Zm-313 673.4a387 387 0 0 1-76.4-231.8 386.9 386.9 0 0 1 114-275.4 388 388 0 0 1 275.4-114A386.9 386.9 0 0 1 744 194.7L148.6 694.4ZM737 737.9a388 388 0 0 1-275.3 114 386.9 386.9 0 0 1-279.1-117.8l595-499.3A387.5 387.5 0 0 1 851 462.6a386.9 386.9 0 0 1-114 275.3Z\'/%3E%3Cpath fill=\'%23711\' d=\'M441.6 0a441.6 441.6 0 1 0 0 883.2 441.6 441.6 0 0 0 0-883.2ZM129 674a387.4 387.4 0 0 1-76.9-232.4 386.9 386.9 0 0 1 114-275.4 388 388 0 0 1 275.4-114 386.9 386.9 0 0 1 283 122L129.2 674Zm587.8 43a388 388 0 0 1-275.3 114A386.9 386.9 0 0 1 163 713.6l595-499.1a387 387 0 0 1 73 227A386.9 386.9 0 0 1 717 717Z\'/%3E%3C/svg%3E'
	},

	arrayToTableRow : (items) => {
		if ( typeof items === 'string' ) {
			return `<tr><td>${items}</td></tr>`
		}

		const itemsHTML = items.map((item) => `<td>${item}</td>`)
		return `<tr>${itemsHTML.join('')}</tr>`
	},
	badge              : (color, name, fullName = false) => `<span class="border border-2 badge bg-${(color !== false)?color:fsgUtil.badgeDefault[name.toLowerCase()]}">${getText(`${(fullName)?'':'mod_badge_'}${name}`)}</span>`,
	badge_main         : (badgeRec) => {
		const badgeName  = badgeRec[0].toLowerCase()
		const badgeText  = getText(`mod_badge_${badgeName}`, badgeRec[1][1])
		const badgeColor = `bg-${fsgUtil.badgeDefault[badgeName]}`
		const badgeClass = ['border border-2 badge', badgeRec[1][0], badgeColor].join(' ')

		return `<span class="${badgeClass}">${badgeText}</span>`
	},
	buildScrollCollect : (collectKey, scrollRows) => `<div class="${collectKey} scroll_col flex-grow-1"></div>${scrollRows.join('')}`,
	buildScrollMod     : (collectKey, modUUID) => `<div class="${collectKey}_mods ${modUUID} scroll_mod d-none flex-grow-1 bg-opacity-25"></div>`,
	buildSelectOpt     : (value, text, selected, disabled = false, title = null) => `<option ${( title !== null ) ? `title="${title}"` : '' } value="${value}" ${( value === selected ) ? 'selected' : ''} ${( disabled ) ? 'disabled' : ''}>${text}</option>`,
	useTemplate        : ( templateName, replacements ) => {
		try {
			let thisTemplate = fsgUtil.byId(templateName).innerHTML

			for ( const key in replacements ) {
				thisTemplate = thisTemplate.replaceAll(new RegExp(`{{${key}}}`, 'g'), replacements[key])
			}

			return thisTemplate
		} catch (err) {
			window.log.warning(`Template usage failed :: ${err}`, templateName)
		}
	},
	
	basename  : (name, sep = '\\') => name.substr(name.lastIndexOf(sep) + 1),
	bytesToHR : ( inBytes, { forceMB = false, showSuffix = true } = {} ) => {
		const thisLocale = _l() ?? 'en'
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
	bytesToMB     : (count, suffix = true) => fsgUtil.bytesToHR(count, { forceMB : true, showSuffix : suffix}),
	bytesToMBCalc : (bytes) => Math.round((bytes / ( 1024 * 1024) * 100 )) / 100,
	escapeDesc    : ( text ) => typeof text === 'string' ? text.replaceAll(/&/g, '&amp;').replaceAll(/<(?!(a |\/a))/g, '&lt;') : text,
	escapeSpecial : ( text ) => typeof text === 'string' ? fsgUtil.unescapeText(text).replaceAll(/&/g, '&amp;').replaceAll(/</g, '&lt;').replaceAll(/>/g, '&gt;').replaceAll(/"/g, '&quot;').replaceAll(/'/g, '&#39;') : text,
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

	onlyText      : ( testString ) => typeof testString === 'string' || typeof testString === 'number',

	firstOrNull : ( arr ) => {
		if ( !Array.isArray(arr) || arr.length !== 1 ) { return null }
		return arr[0]
	},
	
	classPerTest : ( query, test, class_add_when_false = 'd-none' ) => {
		for ( const element of fsgUtil.query(query) ) {
			element.classList[test ? 'remove' : 'add'](class_add_when_false)
		}
	},
	setTextOrHide : ( id, content, test ) => {
		if ( test === null || test === '' ) {
			fsgUtil.byId(id).classList.add('d-none')
		} else {
			fsgUtil.setById(id, content)
		}
	},

	clearTooltips   : () => { for ( const tooltip of fsgUtil.query('.tooltip') ) { tooltip.remove() } },
	setTheme        : (theme) => { document.body.setAttribute('data-bs-theme', theme) },
	windowCheckAll  : () => { fsgUtil.windowCheckOp(true) },
	windowCheckInv  : () => {
		for ( const element of fsgUtil.query('[type="checkbox"]') ) { element.checked = !element.checked }
	},
	windowCheckNone : () => { fsgUtil.windowCheckOp(false) },
	windowCheckOp   : ( newChecked = true ) => {
		for ( const element of fsgUtil.query('[type="checkbox"]') ) { element.checked = newChecked }
	},

	setById         : (id, textOrArray, joinString = '') => {
		if ( Array.isArray(textOrArray) ) {
			fsgUtil.byId(id).innerHTML = textOrArray.join(joinString)
		} else {
			fsgUtil.byId(id).innerHTML = textOrArray
		}
	},
	setContent      : (kvPair) => {
		for ( const [id, value] of Object.entries(kvPair) ) {
			fsgUtil.setById(id, value)
		}
	},
	
	shortLongPaths  : () => {
		for ( const element of fsgUtil.query('.longPrintPath') ) {
			const currentValue = element.innerHTML
			const currentParts = currentValue.split('\\')

			if (
				element.getAttribute('title') !== null ||
				currentValue.length < 50 ||
				currentParts.length < 5 )
			{
				continue // Short or already done
			}
			
			element.innerHTML = [
				...currentParts.slice(0, 2),
				'<span style="top: -0.2em; position: relative;">...</span>',
				...currentParts.slice(-2),
			].join('\\')
			element.setAttribute('title', currentValue)
		}
	},
}

/*  __ ____   ______        
   |  |_   | |      |.-----.
   |  |_|  |_|  --  ||     |
   |__|______|______||__|__| */

function processL10N() {
	if ( typeof ft_doReplace === 'function' ) { ft_doReplace() }
	clientGetL10NEntries()
	clientGetL10NEntriesBase()
	fsgUtil.shortLongPaths()
}

function clientGetL10NEntries() {
	const l10nSendArray = fsgUtil.queryA('l10n').map((element) => fsgUtil.getAttribNullEmpty(element, 'name'))

	l10n.getText_send(new Set(l10nSendArray))
}

function clientGetL10NEntriesBase() {
	const l10nSendArray = fsgUtil.queryA('l10nBase').map((element) => fsgUtil.getAttribNullEmpty(element, 'name'))

	l10n.getTextBase_send(new Set(l10nSendArray))
}

window?.l10n?.receive('fromMain_getText_return', (data) => {
	if ( data[0] === '__currentLocale__'  ) {
		document.body.setAttribute('data-i18n', data[1])
	} else {
		for ( const item of fsgUtil.query(`l10n[name="${data[0]}"]`) ) { item.innerHTML = data[1] }
	}
})

window?.l10n?.receive('fromMain_getText_return_base', (data) => {
	for ( const item of fsgUtil.query(`l10nBase[name="${data[0]}"]`) ) { item.innerHTML = data[1] }
})

const currentTooltips = []
window?.l10n?.receive('fromMain_getText_return_title', (data) => {
	for ( const item of fsgUtil.query(`l10n[name="${data[0]}"]`) ) {
		const extTitle = item.getAttribute('data-extra-title')
		let thisTitle   = item.closest('button')
		thisTitle     ??= item.closest('span')
		thisTitle     ??= item.closest('label')

		if ( data[0] === 'game_icon_lg' ) { thisTitle = item.closest('#multi_version_button') }

		if ( thisTitle !== null ) {
			thisTitle.title = `${data[1]}${extTitle !== null && extTitle !== '' ? ` : ${extTitle}` : ''}`
			currentTooltips.push(new bootstrap.Tooltip(thisTitle))
		}
	}
})

window?.l10n?.receive('fromMain_l10n_refresh', (newLang) => {
	for ( const oldTooltip of currentTooltips ) {
		oldTooltip?.dispose?.()
	}
	currentTooltips.length = 0
	document.body.setAttribute('data-i18n', newLang)
	processL10N()
})

window?.l10n?.receive('fromMain_langList_return', (listData, selected) => {
	fsgUtil.byId('language_select').innerHTML = listData.map((x) => {
		return fsgUtil.buildSelectOpt(x[0], x[1], selected)
	}).join('')
})

window?.l10n?.receive('fromMain_themeList_return', (listData, selected) => {
	fsgUtil.byId('theme_select').innerHTML = listData.map((x) => {
		return fsgUtil.buildSelectOpt(x[0], x[1], selected)
	}).join('')
})


document.addEventListener('keydown', (event) => {
	const evt = event || window.event
	if (evt.code === 'Escape' && ! document.location.href.includes('main.html') ) {
		window.win_ops.closeWindow()
	}
})

window.addEventListener('error', (errorObj) => {
	if ( typeof errorObj === 'object' ) {
		window.log.warning(errorObj.message, errorObj.filename.split('/').pop())
	}
})

window?.win_ops?.receive('fromMain_themeSetting', (theme) => fsgUtil.setTheme(theme))
window?.win_ops?.receive('fromMain_clearTooltips', fsgUtil.clearTooltips)
window.addEventListener('click', fsgUtil.clearTooltips)