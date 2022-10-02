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
}
