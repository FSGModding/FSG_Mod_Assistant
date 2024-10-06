/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */
// MARK: MA Util Lib

enhanceElement()

// MARK: MA
const MA = {
	led        : {
		product    : 0x1710,
		vendor     : 0x340d,

		blink      : new Uint8Array([0xFF, 0x07, 0xFF, 0x64, 0xFF, 0xEB, 0x7D, 0x9A, 0x03]),
		off        : new Uint8Array([0xFF, 0x00, 0x00, 0x64, 0x00, 0x32, 0x9E, 0xD7, 0x0D]),
		spin       : new Uint8Array([0xFF, 0x01, 0x66, 0xC8, 0xFF, 0xAD, 0x52, 0x81, 0xD6]),
	},

	// MARK: id selectors
	safeClsAdd : ( id, ...classes ) => {
		const element = MA.byId(id)
		if ( element !== null ) { element.classList.add(...classes)}
	},
	safeClsRem : ( id, ...classes ) => {
		const element = MA.byId(id)
		if ( element !== null ) { element.classList.remove(...classes)}
	},

	byId       : ( id ) => document.getElementById( id ),
	byIdAppend : ( id, element = null ) => {
		if ( element === null ) { return false }
		return MA.byId(id).appendChild(element)
	},
	byIdCheck  : ( id ) => {
		const element = MA.byId(id)
		if ( element === null ) { return false }
		return element.checked
	},
	byIdEventIfExists : (id, handler, eventType = 'click') => {
		const element = MA.byId(id)
		if ( element === null ) { return }
		element.addEventListener(eventType, handler)
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
	byIdNodeArray : ( id, arr ) => {
		const parent = MA.byId(id)
		parent.innerHTML = ''
		for ( const element of arr ) {
			parent.appendChild(element)
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
	byIdValueLC  : ( id, newValue = null ) => {
		const testValue = MA.byIdValue(id, newValue)
		return testValue === null ? '' : testValue.toLowerCase()
	},
	// MARK: query selectors
	byTag      : ( tag )   => document.getElementsByTagName(tag),
	query      : ( query ) => document.querySelectorAll( query ),
	queryA     : ( query ) => [...document.querySelectorAll( query )],
	queryF     : ( query ) => document.querySelector(query),

	// MARK: display tests
	hideTest   : ( test ) => test ? 'd-none' : '',
	showTest   : ( test ) => test ? '' : 'd-none',

	hideTestVale      : (value, requiredValue = null) => MA.hideTestValueBool(value, requiredValue) ? 'd-none' : '',
	hideTestValueBool : (value, requiredValue = null) => {
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
	showTestValue     : (value, requiredValue = null) => !MA.hideTestValueBool(value, requiredValue) ? 'd-none' : '',
	showTestValueBool : (value, requiredValue = null) => !MA.hideTestValueBool(value, requiredValue),

	// MARK: async rcvd
	start : () => {
		MA.updateFontSize()
		MA.updateTheme()
	},
	updateFontSize : () => {
		window.settings.get('font_size').then((value) => {
			window.fontSheet.replaceSync(`:root { font-size: ${value}px; --bs-root-font-size: ${value}px; }`)
		})
	},
	updateTheme : () => {
		window.settings.theme().then((value) => {
			document.body.setAttribute('data-bs-theme', value)
		})
	},

	fileOpCheckAll  : () => { MA.fileOpCheckOp(true) },
	fileOpCheckInv  : () => {
		for ( const element of MA.query('.fileOpCheck[type="checkbox"]') ) { element.checked = !element.checked }
	},
	fileOpCheckNone : () => { MA.fileOpCheckOp(false) },
	fileOpCheckOp   : ( newChecked = true ) => {
		for ( const element of MA.query('.fileOpCheck[type="checkbox"]') ) { element.checked = newChecked }
	},
}
// MARK: DATA
const DATA = {
	makeFolderIcon : (isOpen = false, isFav = false, isAct = false, isDrop = false, colorIndex = 0) => {
		const colors = DATA.getIconCLR(isAct, colorIndex)
		const trans  = isOpen ? [40, 60] : [32, 54]
		const svgData = [
			'<svg style="width: 45px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150">',
			`<g data-name="folder-back" fill="${colors[0]}">`,
			'<path d="M5 134c-.6-1.1-1-2.4-1-3.7V32.8c0-3 2.3-5.4 5-5.4h3.8c3.8 0 7-3.3 7-7.4 0-4.2 3-7.5 6.9-7.5H66c2.6 0 5 1.5 6.1 4l3.4 7c1.1 2.4 3.5 4 6.1 4h45.5c2.8 0 5 2.3 5 5.3v31L5.2 134Z"/>',
			'<path fill="#111111" d="m4.6 136.1-.8-1.2c-.9-1.3-1.4-3-1.4-4.6V32.8c0-3.9 3-7.1 6.6-7.1h3.8c3 0 5.3-2.6 5.3-5.8 0-5 3.9-9.1 8.5-9.1H66c3.2 0 6 1.9 7.5 5l3.4 6.8a5 5 0 0 0 4.7 3.1H127c3.7 0 6.7 3.2 6.7 7.1v32L4.6 136.2ZM9 29.1c-1.9 0-3.4 1.7-3.4 3.7v97.5c0 .4 0 .9.2 1.3l124.8-68.8v-30c0-2-1.6-3.7-3.5-3.7H81.6c-3.2 0-6-1.9-7.6-5l-3.3-6.8a5 5 0 0 0-4.7-3.1H26.7c-3 0-5.4 2.6-5.4 5.7 0 5.1-3.8 9.2-8.5 9.2H9Z"/>',
			'</g>',
		]

		if ( isOpen ) {
			svgData.push(
				`<g data-name="folder-open" fill="${colors[1]}">`,
				'<path fill="#CCCCCC" d="M114.3 62.2V41c0-4-3-7.2-6.6-7.2H23.2c-3.6 0-6.6 3.2-6.6 7.2v23.2l97.7-2Z" />',
				'<path fill="#DDDDDD" d="M121.2 48.4v13H23.5v-13c0-4 3-7.1 6.6-7.1h84.5c3.7 0 6.6 3.2 6.6 7.1Z" />',
				'<path d="M12.1 137.2h114.3c5.2 0 10.1-4.8 11-10.7l8.5-60.6c.8-6-2.8-10.7-8-10.7H23.6c-5.2 0-10.1 4.8-11 10.7l-8.5 60.6c-.8 5.9 2.8 10.7 8 10.7Z" data-name="F_FRONT"/>',
				'<path fill="#111111" d="M126.4 139.2H12c-3 0-5.9-1.5-7.7-4a12.6 12.6 0 0 1-1.9-9L11 65.6c1-6.9 6.6-12.4 12.6-12.4H138c3 0 5.9 1.5 7.7 4 1.7 2.5 2.4 5.7 1.9 9l-8.5 60.6c-1 6.9-6.6 12.4-12.6 12.4Zm-102.8-82c-4.4 0-8.6 4-9.3 9l-8.5 60.6a8 8 0 0 0 1.2 5.7 6 6 0 0 0 5.1 2.7h114.3c4.5 0 8.7-4 9.4-9l8.4-60.7a8 8 0 0 0-1.1-5.7 6.1 6.1 0 0 0-5.2-2.6H23.6Z"/>',
				'</g>'
			)
		} else {
			svgData.push(
				`<g data-name="folder-closed" fill="${colors[1]}">`,
				'<path d="M13.3 138.8h111.5c5.1 0 9.3-5.8 9.3-13V52.5c0-7.2-4.2-13-9.3-13H13.3c-5.1 0-9.2 5.8-9.2 13v73.3c0 7.2 4.1 13 9.2 13Z" data-name="F_FRONT"/>',
				'<path fill="#111111" d="M125 141.2H13.7c-3 0-6-1.8-8-5-2-2.9-3.2-6.8-3.2-10.8V52.1c0-8.3 4.8-15 10.6-15h111.5c3 0 6 1.8 8 5 2 3 3.2 6.8 3.2 10.8v73.3c0 8.3-4.8 15-10.6 15ZM13.7 42c-4.4 0-8 4.9-8 11l.1 73.2c0 2.6.7 5 2 7s3.3 3.1 5.4 3.1h111.4c4.4 0 8-4.9 8-10.9l-.1-73.3c0-2.6-.7-5-2-7S127.2 42 125 42H13.6Z"/>',
				'</g>'
			)
		}

		if ( isFav ) {
			svgData.push(
				`<g fill="${colors[2]}" data-name="favorite" transform="translate(${trans[0]},${trans[1]})">`,
				'<path d="m 37 1.6 l 7 21.6 a 6.2 6.2 0 0 0 5.9 4.3 h 22.7 L 54.2 40.8 a 6.2 6.2 0 0 0 -2.2 7 l 7 21.5 L 40.6 56 a 6.2 6.2 0 0 0 -7.3 0 L 15 69.3 l 7 -21.6 c 0.8 -2.5 -0.1 -5.3 -2.3 -7 L 1.4 27.6 H 24 c 2.7 0 5.1 -1.8 6 -4.3 l 7 -21.6 Z"/>',
				'</g>'
			)
		}

		if ( !isFav && isDrop ) {
			svgData.push(
				`<g fill="${colors[2]}" data-name="closed-holding" transform="translate(${trans[0]},${trans[1]})">`,
				'<path d="M 60.8 17.5 c 0 -1.4 -0.2 -3.2 1.3 -4 c 0.9 -0.4 1.8 -0.3 2.5 0.3 l 6.3 4.6 c 2 1.4 4.9 3.3 2.1 5.6 l -8.2 6.2 c -0.8 0.6 -1.7 0.7 -2.6 0.3 c -2 -1 -1.1 -3.6 -1.3 -5.4 c 0 -0.5 0 -0.6 -0.5 -0.5 c -6.8 1.5 -11.6 7.1 -17 11.1 c -8.5 6 -17.5 17 -27.9 18.7 c -0.3 0 -0.5 0.2 -0.4 0.5 v 3.6 c 0.1 2 -2.3 3.3 -3.9 2 l -8.4 -6.4 a 2.3 2.3 0 0 1 0 -3.8 l 8.4 -6.3 c 1.5 -1.2 3.9 0 3.8 2 v 3.2 c 0 0.4 0 0.6 0.6 0.5 c 6.8 -1.6 11.7 -7.3 17.2 -11.4 c 8.5 -6 17.2 -16.8 27.6 -18.5 c 0.3 0 0.5 -0.1 0.5 -0.5 v -1.8 Z"/>',
				'<path d="M 15 17.5 v 2 c 0 0.2 0.1 0.3 0.4 0.4 c 7.3 0.8 12.5 6.2 18 10.6 c 1.2 0.9 1.3 2.3 0.5 3.4 c -0.9 1 -2.3 1.1 -3.4 0.2 c -2.8 -2.3 -5.5 -4.6 -8.5 -6.6 c -0.5 -0.6 -7.2 -4.1 -7 -2.5 v 3.3 c 0.1 2 -2.3 3.2 -3.8 2 l -8.4 -6.4 c -1.4 -1 -1.3 -2.7 0 -3.7 l 8.5 -6.4 c 1.6 -1.3 3.9 0 3.8 2 v 1.7 Z m 45.9 39.3 v -2 c 0 -0.2 0 -0.3 -0.3 -0.3 c -7.4 -1 -12.7 -6.3 -18.2 -10.7 c -1.4 -1.2 -1.1 -3.3 0.5 -4 c 1 -0.4 1.8 -0.2 2.5 0.4 l 6 4.9 c 2.7 2 5.7 4 9 4.6 c 0.4 0.1 0.5 0 0.5 -0.3 V 46 c -0.1 -2 2.4 -3.3 4 -2 l 8.2 6.2 c 1.4 1 1.4 2.9 0 4 l -8.4 6.2 c -1.5 1.3 -4 0 -3.9 -2 v -1.7 Z m -20.6 -36 V 26 c 0 3.3 -4.7 3.3 -4.7 0 V 15.5 c 0 -0.5 -0.1 -0.6 -0.6 -0.6 h -3 a 2.4 2.4 0 0 1 -2.1 -4 l 6.1 -8.2 c 1 -1.4 2.9 -1.4 4 0 l 6 8.3 c 0.6 0.8 0.8 1.6 0.3 2.6 c -0.9 2 -3.9 1.1 -5.7 1.3 c -0.3 0 -0.4 0 -0.4 0.4 v 5.5 Z m -4.7 32.7 v -5.2 c 0 -1.5 1 -2.5 2.4 -2.5 c 1.3 0 2.3 1 2.3 2.4 v 10.6 c 0 0.5 0.1 0.7 0.6 0.6 h 3 a 2.4 2.4 0 0 1 2.2 4 l -6.2 8.2 a 2.3 2.3 0 0 1 -3.9 0 l -6.2 -8.3 c -0.6 -0.8 -0.7 -1.6 -0.3 -2.5 c 1 -2 3.8 -1.2 5.7 -1.4 c 0.3 0 0.5 0 0.5 -0.4 v -5.5 Z"/>',
				'</g>'
			)
		}

		if ( isAct ) {
			svgData.push(
				'<g data-name="active">',
				'<path fill="#ffffff" d="M122.4 141.2c-1 0-2-.4-2.8-1.2l-8.9-8.7a4 4 0 0 1 0-5.7 4 4 0 0 1 5.7 0l5.2 5.2 13.2-21.4a4 4 0 1 1 6.8 4.2l-15.8 25.7a4 4 0 0 1-3.4 1.9Z"/>',
				'<path fill="#111111" d="M138.2 109.5c.4 0 .7.1 1 .3a2 2 0 0 1 .7 2.8L124 138.3a2 2 0 0 1-1.5 1h-.2a2 2 0 0 1-1.4-.7l-8.9-8.8a2 2 0 0 1 2.8-2.8l7.1 7 14.5-23.5c.4-.7 1-1 1.7-1m0-4a6 6 0 0 0-5.1 2.9l-11.9 19.2-3.4-3.4a5.6 5.6 0 0 0-4.2-1.8 6 6 0 0 0-6 6 6 6 0 0 0 1.7 4.3l8.9 8.8a6 6 0 0 0 5 1.7 6 6 0 0 0 4.3-2.8l15.8-25.7a6 6 0 0 0-5.1-9.2Z"/>',
				'</g>'
			)
		}
		svgData.push('</svg>')
		return svgData.join('')
	},

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
	bytesToMBCalc : (bytes) => Math.round((bytes / ( 1024 * 1024) * 100 )) / 100,

	dateToString : (textDate) => {
		const year2000 = 949381200000
		const date = typeof textDate === 'string' ? new Date(Date.parse(textDate)) : textDate

		if ( date < year2000 ) { return I18N.defer('mh_unknown', false) }

		return `<span class="text-body-emphasis">${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${(date.getDate()).toString().padStart(2, '0')}</span>`
	},
	escapeDesc    : ( text ) => typeof text === 'string' ? text.replaceAll(/&/g, '&amp;').replaceAll(/<(?!(a |\/a))/g, '&lt;') : text === null ? '' : text.toString(),
	escapeSpecial : ( text ) => typeof text === 'string' ? DATA.unescapeText(text).replaceAll(/&/g, '&amp;').replaceAll(/</g, '&lt;').replaceAll(/>/g, '&gt;').replaceAll(/"/g, '&quot;').replaceAll(/'/g, '&#39;') : text === null ? '' : text.toString(),
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
			I18N.defer(l10nKey, false),

	prefixNotEmpty : (text, prefix = '') => typeof text === 'undefined' ? '' : text.length === 0 ? text : `${prefix}${text}`,

	iconMaker : (icon = null) => ( typeof icon === 'string' && icon.startsWith('data:') ) ?
		icon :
		'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'-250 -250 1403.2 1404.2\'%3E%3Cpath style=\'fill: %23771111; filter: drop-shadow(10px 10px 5px rgb(0 0 0 / 0.4));\' opacity=\'0.3\' d=\'M441.6 0a441.6 441.6 0 1 0 0 883.2 441.6 441.6 0 0 0 0-883.2ZM129 674a387.4 387.4 0 0 1-76.9-232.4 386.9 386.9 0 0 1 114-275.4 388 388 0 0 1 275.4-114 386.9 386.9 0 0 1 283 122L129.2 674Zm587.8 43a388 388 0 0 1-275.3 114A386.9 386.9 0 0 1 163 713.6l595-499.1a387 387 0 0 1 73 227A386.9 386.9 0 0 1 717 717Z\' /%3E%3C/svg%3E',

	optionFromArray : ([value, text], select = '') => `<option value="${value}" ${value.toString() === select.toString() ? 'selected' : ''}>${text}</option>`,

	// MARK: ...Engine
	eventEngine : (nodeObject, selector, handler, eventType = 'click') => {
		for ( const element of nodeObject.querySelectorAll(selector) ) {
			element.addEventListener(eventType, handler)
		}
	},
	templateEngine : (id, variableReplacers = {}, idReplacers = {}, classAdditions = {}) => {
		const template = MA.byId(id)
		const clone    = template.content.cloneNode(true)

		for ( const [oldID, newID] of Object.entries(idReplacers) ) {
			clone.getElementById(oldID).id = newID
		}

		for ( const [query, classArgs] of Object.entries(classAdditions) ) {
			const classList = typeof classArgs === 'string' ? [classArgs] : classArgs
			const filterList = classList.filter((x) => x !== '')
			if ( filterList.length !== 0 ) {
				for ( const element of clone.querySelectorAll(query) ) {
					element.classList.add(...filterList)
				}
			}
		}

		for ( const thisVar of clone.querySelectorAll('template-var') ) {
			const thisVariableName = thisVar.textContent
			if ( typeof variableReplacers[thisVariableName] !== 'undefined' ) {
				thisVar.innerHTML = variableReplacers[thisVariableName]
			}
		}

		return clone
	},
}

// MARK: I18N
const I18N = {
	__ : (key, extraClassArr = null) => {
		const node = document.createElement('i18n-text')
		node.setAttribute('data-key', key)
		if ( extraClassArr !== null ) { node.classList.add(...extraClassArr)}
		return node
	},
	buildBadge : (badge, {classPrefix = 'badge', i18nPrefix = ''} = {}) => {
		const lcBadgeName = badge.name.toLowerCase()
		const badgeDiv    = document.createElement('i18n-text')
		badgeDiv.classList.add('badge', 'border', 'border-2', `${classPrefix}-${lcBadgeName}`, ...badge.class)
		badgeDiv.setAttribute('data-key', `${i18nPrefix}${lcBadgeName}`)
		return badgeDiv
	},
	buildBadgeMod   : (badge) => I18N.buildBadge(badge, {
		classPrefix : 'badge-mod',
		i18nPrefix  : 'mod_badge_',
	}),
	buildBadgeNoI18N : async ( badge ) => {
		const badgeDiv = document.createElement('div')
		if ( badge.skip !== true ) {
			badgeDiv.classList.add('badge', 'border', 'border-2', ...badge.class)
			badgeDiv.textContent = badge.name
		}
		return badgeDiv
	},
	defer : (key, skipNonBase = true) => {
		if ( key === null || key === '' ) { return '' }
		if ( key.includes('[[') ) {
			const nameParts    = key.match(/(.+?) \[\[(.+?)]]/)
			const replaceParts = nameParts[2] ?? null
			let   newName      = nameParts[1] ?? key

			if ( replaceParts !== null ) {
				const paramArray = replaceParts.split('|')
				let   matchNum = -1
				newName = newName.replace(/%s/g, () => {
					matchNum++
					
					return I18N.defer(paramArray[matchNum], skipNonBase) || '%s'
				})
			}

			return newName
		}
		return !skipNonBase || key.startsWith('$l10n') ? `<i18n-text data-key="${key}"></i18n-text>` : key
	},
	pageLang : () => {
		window.i18n.lang().then((value) => {
			document.documentElement.setAttribute('lang', value)
		})
	},
	refresh : async () => {
		I18N.pageLang()
	},
}

// MARK: ELEMENT clsHelp
function enhanceElement() {
	Element.prototype.clsOrGate = function ( test, ifTrue = 'text-success', ifFalse = 'text-danger' ) {
		if ( test ) {
			if ( ifTrue !== null ) { this.classList.add(ifTrue) }
			if ( ifFalse !== null ) { this.classList.remove(ifFalse) }
			return this
		}
		if ( ifFalse !== null ) { this.classList.add(ifFalse) }
		if ( ifTrue !== null ) { this.classList.remove(ifTrue) }
		return this
	}
	Element.prototype.clsOrGateArr = function ( arr, ifTrue = 'text-danger', ifFalse = 'text-success') {
		return this.clsOrGate((Array.isArray(arr) && arr.length !== 0), ifTrue, ifFalse )
	}

	Element.prototype.clsHideByValue = function (value, testValue = null) {
		return this.clsOrGate(!this.clsBoolTest(value, testValue), null, 'd-none')
	}
	Element.prototype.clsShowByValue = function (value, testValue = null) {
		return this.clsOrGate(this.clsBoolTest(value, testValue), null, 'd-none')
	}
	Element.prototype.clsDisableByValue = function (value, testValue = null) {
		return this.clsOrGate(!this.clsBoolTest(value, testValue), null, 'disabled')
	}
	Element.prototype.clsEnableByValue = function (value, testValue = null) {
		return this.clsOrGate(this.clsBoolTest(value, testValue), null, 'disabled')
	}

	Element.prototype.clsHide = function (test = true) {
		return this.clsOrGate(!test, null, 'd-none')
	}
	Element.prototype.clsShow = function (test = true) {
		return this.clsOrGate(test, null, 'd-none')
	}
	Element.prototype.clsDisable = function (test = true) {
		return this.clsOrGate(!test, null, 'disabled')
	}
	Element.prototype.clsEnable = function (test = true) {
		return this.clsOrGate(test, null, 'disabled')
	}
	Element.prototype.clsBoolTest = function (value, requiredValue = null ) {
		if ( typeof value === 'undefined' || value === null || value === false || value.length === 0 || value === 0 ) {
			return false
		}
		if ( Array.isArray(value) && value.filter((x) => x !== null).length === 0 ) { return true }
		if ( requiredValue !== null ) {
			if ( typeof value === 'string' && typeof requiredValue === 'string' && value.toLowerCase() === requiredValue.toLowerCase() ) {
				return true
			} else if ( typeof value === 'number' && typeof requiredValue === 'number' && value === requiredValue ) {
				return true
			}
			return false
		}
		return true
	}

	Element.prototype.safeAttribute = function (attrib, replacer = null) {
		const attribValue = this.getAttribute(attrib)

		return ( typeof attribValue !== 'string' || attribValue === null || attribValue === '' ) ?
			replacer :
			attribValue
	}
	Element.prototype.stringAttribute = function (attrib) {
		return this.safeAttribute(attrib, '')
	}
}

// MARK: custom i18n-text element
function enhanceI18N() {
	customElements.define('i18n-text', class extends HTMLElement {
		constructor() {
			super()
		}
		static get observedAttributes() { return ['refresh', 'data-key'] }

		get loading() {
			return JSON.parse(this.getAttribute('data-loading'))
		}
		set loading(v) {
			this.setAttribute('data-loading', JSON.stringify(v))
		}
		get response() {
			return JSON.parse(this.getAttribute('data-response'))
		}
		set response(v) {
			this.setAttribute('data-response', JSON.stringify(v))
		}
		get key() {
			return this.getAttribute('data-key')
		}
		get extra() {
			return DATA.prefixNotEmpty(this.stringAttribute('data-extra-title'), ' : ')
		}

		async getString() {
			if ( this.key === null ) { return }
			this.loading = true

			return window.i18n.get(this.key).then((result) => {
				this.response = result.entry
				
				console.log(window.use_tooltips)
				const parent = this.parentElement
				if ( parent !== null && (parent.tagName === 'BUTTON' || parent.tagName === 'LABEL' ) ) {
					if ( window.use_tooltips && result.title !== null ) {
						parent.setAttribute('title', `${result.title}${this.extra}`)
					} else {
						parent.removeAttribute('title')
					}
				} else if ( window.use_tooltips && result.title !== null ) {
					this.setAttribute('title', `${result.title}${this.extra}`)
				} else {
					this.removeAttribute('title')
				}

				this.loading = false
			})
		}

		async connectedCallback() {
			await this.getString()
		}
		disconnectedCallback() {}
		attributeChangedCallback(attrName, _oldVal, newVal) {
			if ( attrName === 'refresh' && newVal === true ) {
				this.removeAttribute('refresh')
			}
			this.loading = true
			this.render()
			this.getString().then(() => { this.render()})
		}
		render() {
			if (this.loading) {
				this.innerHTML = '...'
			} else {
				this.innerHTML = this.response
			}
		}
	})
}

// MARK: ERROR HANDLE
window.addEventListener('unhandledrejection', (e) => {
	window.log.error('Unhandled Rejection')
	window.log.warning(e?.reason?.message)
	window.log.warning(e?.reason?.stack)
})
window.addEventListener('error', (e) => {
	window.log.error('Uncaught Error')
	window.log.warning(e?.error?.message)
	window.log.warning(e?.error?.stack)
})

// MARK: PAGE LOAD
window.addEventListener('DOMContentLoaded', () => {
	window.settings.get('show_tooltips').then((value) => {
		window.use_tooltips = value
		enhanceI18N()
	})

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
	
	// eslint-disable-next-line no-constant-condition
	if ( true ) {
		window.console = newConsole
	}

	document.addEventListener('keydown', (event) => {
		if (event.code === 'Escape' && ! document.location.href.includes('main.html') ) {
			window.operations.close()
		}
	})
})

// MARK: ASYNC RECEIVERS
window?.operations?.receive('win:updateTheme', MA.updateTheme)
window?.operations?.receive('win:updateFontSize', MA.updateFontSize)
window?.operations?.receive('win:forceRefresh', () => { location.reload() })
window?.i18n?.receive('i18n:refresh', () => {
	window.settings.get('show_tooltips').then((value) => {
		window.use_tooltips = value
		for ( const element of MA.query('i18n-text') ) {
			element.setAttribute('refresh', true)
		}
	})
})
MA.byIdEventIfExists('pageActionRefresh', () => { location.reload() })
