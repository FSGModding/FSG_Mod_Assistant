/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Loading window preLoad

const {ipcRenderer, contextBridge} = require('electron')

let lastTotal = 1
let startTime = Date.now()

ipcRenderer.on('formMain_loadingTitles', (_, mainTitle, subTitle, dlCancel) => {
	document.getElementById('statusMessage').innerHTML = mainTitle
	document.getElementById('statusDetail').innerHTML  = subTitle
	document.getElementById('statusCount').classList.remove('d-none')
	document.getElementById('statusProgBar').classList.remove('d-none')
	document.getElementById('statusTotal').innerHTML   = '0'
	document.getElementById('statusCurrent').innerHTML = '0'
	document.getElementById('downloadCancel').classList.add('d-none')
	document.getElementById('speed').classList.add('d-none')
	document.getElementById('downloadCancelButton').innerHTML = dlCancel
})

ipcRenderer.on('fromMain_loadingDownload', () => {
	document.getElementById('downloadCancel').classList.remove('d-none')
	document.getElementById('speed').classList.remove('d-none')
})

ipcRenderer.on('fromMain_loadingNoCount', () => {
	document.getElementById('statusCount').classList.add('d-none')
	document.getElementById('statusProgBar').classList.add('d-none')
})

ipcRenderer.on('fromMain_loading_total', (_, count, inMB = false) => {
	if ( inMB ) { startTime = Date.now() }
	const thisCount   = inMB ? toMB(count) : count
	const thisElement = document.getElementById('statusTotal')
	lastTotal = ( count < 1 ) ? 1 : count

	if ( thisElement !== null ) { thisElement.innerHTML = thisCount }
})

ipcRenderer.on('fromMain_loading_current', (_, count, inMB = false) => {
	const thisCount   = inMB ? toMB(count, false) : count
	const thisElement = document.getElementById('statusCurrent')
	const thisProg    = document.getElementById('statusProgBarInner')
	const thisPercent = `${Math.ceil((count / lastTotal) * 100)}%` || '0%'

	if ( thisProg !== null ) { thisProg.style.width = thisPercent }

	if ( thisElement !== null ) { thisElement.innerHTML = thisCount }

	if ( inMB ) {
		const perDone    = Math.max(1, Math.ceil((count / lastTotal) * 100))
		const perRem     = 100 - perDone
		const endTime    = Date.now()
		const elapsedMS  = endTime - startTime
		const elapsedSec = elapsedMS / 1000
		const estSpeed   = toMB(count, false) / elapsedSec // MB/sec
		const secRemain  = elapsedSec / perDone * perRem

		const prettyMinRemain = Math.floor(secRemain / 60)
		const prettySecRemain = secRemain % 60

		document.getElementById('speed_speed').innerHTML = `${estSpeed.toFixed(1)} MB/s`
		document.getElementById('speed_time').innerHTML = `~ ${prettyMinRemain.toFixed(0).padStart(2, '0')}:${prettySecRemain.toFixed(0).padStart(2, '0')}`
	}
})


contextBridge.exposeInMainWorld(
	'mods', {
		cancelDownload  : ( ) => { ipcRenderer.send('toMain_cancelDownload') },
	}
)

function toMB(count, suffix = true) {
	return `${Math.round((count / ( 1024 * 1024)*100))/100}${suffix?' MB':''}`
}
