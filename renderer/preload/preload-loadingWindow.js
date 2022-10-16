/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Debug window preLoad

const {ipcRenderer} = require('electron')

ipcRenderer.on('formMain_loadingTitles', (event, mainTitle, subTitle) => {
	document.getElementById('statusMessage').innerHTML = mainTitle
	document.getElementById('statusDetail').innerHTML  = subTitle
	document.getElementById('statusCount').classList.delete('d-none')
	document.getElementById('statusTotal').innerHTML   = '0'
	document.getElementById('statusCurrent').innerHTML = '0'
})

ipcRenderer.on('fromMain_loadingNoCount', () => {
	document.getElementById('statusCount').classList.add('d-none')
})

ipcRenderer.on('fromMain_loadingTotal', (event, count) => {
	const thisElement = document.getElementById('statusTotal')

	if ( thisElement !== null ) { thisElement.innerHTML = count}
})

ipcRenderer.on('fromMain_loadingCurrent', (event, count) => {
	const thisElement = document.getElementById('statusCurrent')

	if ( thisElement !== null ) { thisElement.innerHTML = count}
})
