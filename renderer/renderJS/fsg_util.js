/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// FSG Mod Assist Utilities

const fsgUtil = {
	byId       : ( id )    => { return document.getElementById( id ) },
	byCls      : ( cls )   => { return document.getElementsByClassName( cls ) },
	query      : ( query ) => { return document.querySelectorAll( query ) },
	getIconSVG : ( type )  => {
		switch (type) {
			case 'check':
				return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-circle" viewBox="0 0 16 16">'+
				'<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>' +
				'<path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>' +
				'</svg>'
			case 'x':
				return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-circle" viewBox="0 0 16 16">' +
				'<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>' +
				'<path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>' +
				'</svg>'
			case 'folder':
				return '<svg enable-background="new 0 0 347.479 347.479" version="1.1" viewBox="0 0 347.48 347.48" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" width="25" height="25">' +
				'<path d="m292.25 79.766h-188.61v-8.544c0-5.974-4.888-10.862-10.862-10.862h-62.368c-5.975 0-10.862 4.888-10.862 10.862v8.544h-3.258c-8.962 0-16.294 7.332-16.294 16.293v174.77c0 8.961 7.332 16.293 16.293 16.293h275.96c8.961 0 16.293-7.332 16.293-16.293v-174.77c1e-3 -8.961-7.331-16.293-16.293-16.293z" fill="#E0B03B"/>'+
				'<rect x="23.243" y="95.385" width="262.06" height="176.11" fill="#fff"/>' +
				'<path d="m312.43 271.29c-2.135 8.704-11.213 15.825-20.175 15.825h-275.96c-8.961 0-14.547-7.121-12.412-15.825l34.598-141.05c2.135-8.704 11.213-15.825 20.175-15.825h275.96c8.961 0 14.547 7.121 12.412 15.825l-34.598 141.05z" fill="#FFC843"/>' +
				'</svg>'
			default:
				return '&nbsp;'
		}
	},
	getIcon : ( type, cls ) => {
		return `<span class="text-${cls}">${fsgUtil.getIconSVG(type)}</span>`
	},
	classChanger : ( domID, className, doAdd = true ) => {
		const domIDs  =  ( typeof domID === 'string' )  ? [domID] : domID
	
		domIDs.forEach( (thisDomID) => {
			const curElement = document.getElementById(thisDomID)
			if ( curElement !== null ) {
				curElement.classList[( doAdd === true ? 'add' : 'remove' )](className)
			}
		})
	},
	classAdd : (domID, className) => { fsgUtil.classChanger(domID, className, true) },
	classRem : (domID, className) => { fsgUtil.classChanger(domID, className, false) },
	buildSelectOpt : (value, text, selected) => {
		return `<option value="${value}" ${( value === selected ) ? 'selected' : ''}>${text}</option>`
	},
	getAttribNullError : (element, attrib) => {
		const attribValue = element.getAttribute(attrib)
	
		if ( typeof attribValue === 'undefined' || attribValue === null ) {
			throw new TypeError(`attribute ${attrib} not defined on ${element}`)
		} else {
			return attribValue
		}
	},
	buildTR : (cls, id = null, extra = null) => {
		const thisID = ( id === null ) ? '' : ` id="${id}"`

		return `<tr class="${cls}"${thisID} ${(extra===null)?'':extra}>`
	},
	buildTD : (cls, data_bs = null) => {
		let thisBS = ''
		if ( data_bs !== null ) {
			data_bs.forEach((data) => {
				thisBS += ` data-bs-${data[0]}="${data[1]}"`
			})
		}
		return `<td class="${cls}"${thisBS}>`
	},
	bytesToHR : ( inBytes, locale ) => {
		let bytes = inBytes

		if (Math.abs(bytes) < 1024) { return '0 kB' }

		const units = ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
		let u = -1
		const r = 10**2

		do {
			bytes /= 1024
			++u
		} while (Math.round(Math.abs(bytes) * r) / r >= 1024 && u < units.length - 1)

		return [
			bytes.toLocaleString( locale, { minimumFractionDigits : 2, maximumFractionDigits : 2 } ),
			units[u]
		].join(' ')
	},
}
