/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Loading window preLoad

const {ipcRenderer} = require('electron')

let lastTotal = 1

ipcRenderer.on('formMain_loadingTitles', (event, mainTitle, subTitle) => {
	document.getElementById('statusMessage').innerHTML = mainTitle
	document.getElementById('statusDetail').innerHTML  = subTitle
	document.getElementById('statusCount').classList.remove('d-none')
	document.getElementById('statusProgBar').classList.remove('d-none')
	document.getElementById('statusTotal').innerHTML   = '0'
	document.getElementById('statusCurrent').innerHTML = '0'
})

ipcRenderer.on('fromMain_loadingNoCount', () => {
	document.getElementById('statusCount').classList.add('d-none')
	document.getElementById('statusProgBar').classList.add('d-none')
})

ipcRenderer.on('fromMain_loading_total', (event, count, inMB = false) => {
	const thisCount   = inMB ? toMB(count) : count
	const thisElement = document.getElementById('statusTotal')
	lastTotal = ( count < 1 ) ? 1 : count

	if ( thisElement !== null ) { thisElement.innerHTML = thisCount }
})

ipcRenderer.on('fromMain_loading_current', (event, count, inMB = false) => {
	const thisCount   = inMB ? toMB(count, false) : count
	const thisElement = document.getElementById('statusCurrent')
	const thisProg    = document.getElementById('statusProgBarInner')
	const thisPercent = `${Math.ceil((count / lastTotal) * 100)}%` || '0%'

	if ( thisProg !== null ) { thisProg.style.width = thisPercent }

	if ( thisElement !== null ) { thisElement.innerHTML = thisCount }
})

function toMB(count, suffix = true) {
	return `${Math.round((count / ( 1024 * 1024)*100))/100}${suffix?' MB':''}`
}
