//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Mod File Parser - Electron Preload (Detail Window)
//  (IPC and UI triggers that interact with the browser process)

// (c) 2021 JTSage.  MIT License.

const {ipcRenderer} = require('electron')

const iconGreenCheckMark = '<span class="text-success"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-circle" viewBox="0 0 16 16">'+
	'<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>' +
	'<path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>' +
	'</svg></span>'
const iconRedX = '<span class="text-danger"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-circle" viewBox="0 0 16 16">' +
	'<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>' +
	'<path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>' +
	'</svg></span>'

const byId     = (domID) => { return document.getElementById(domID) }





/*
  _____  _____  _______   _______  _____  ______       ______  _______ _______ _______ _____       
    |   |_____] |       . |  |  | |     | |     \      |     \ |______    |    |_____|   |   |     
  __|__ |       |_____  . |  |  | |_____| |_____/      |_____/ |______    |    |     | __|__ |_____
                                                                                                   
*/
ipcRenderer.on('mod-record', ( event, modDetails ) => {
	byId('title').innerHTML        = modDetails.title
	byId('version').innerHTML      = modDetails.version
	byId('filesize').innerHTML     = modDetails.filesize
	byId('has_scripts').innerHTML  = ((modDetails.has_scripts) ? iconGreenCheckMark : iconRedX)
	byId('description').innerHTML  = modDetails.description

	const row_legend = modDetails.total_games.map((thisGame) => { return `<td class="text-center fw-bold">${thisGame}</td>`})
	const row_active = modDetails.total_games.map((thisGame) => { return `<td class="${(modDetails.active_game[thisGame])?'bg-success':'bg-danger'}">&nbsp;</td>`})
	const row_used   = modDetails.total_games.map((thisGame) => { return `<td class="${(modDetails.used_game[thisGame])?'bg-success':'bg-danger'}">&nbsp;</td>`})

	byId('used_active_table').innerHTML = `<tr><th class="i18n" data-i18n="active_used_table_savegame"></th>${row_legend.join('')}</tr><tr><th class="i18n" data-i18n="active_used_table_active"></th>${row_active.join('')}</tr><tr><th class="i18n" data-i18n="active_used_table_used"></th>${row_used.join('')}</tr>`

})

ipcRenderer.on('mod-icon', (event, pngData) => {
	if ( pngData !== null ) {
		byId('icon_div').innerHTML = `<img class="img-fluid" src="${pngData}" />`
	} else {
		byId('icon_div').classList.add('d-none')
	}
})




/*
  _____  _____  _______   _______  ______ _______ __   _ _______        _______ _______ _______
    |   |_____] |       .    |    |_____/ |_____| | \  | |______ |      |_____|    |    |______
  __|__ |       |_____  .    |    |    \_ |     | |  \_| ______| |_____ |     |    |    |______
                                                                                               
*/

ipcRenderer.on('trigger-i18n', () => {
	/* Get all i18n items in the UI and translate them */
	const sendSet = new Set()
	for (const item of document.getElementsByClassName('i18n')) {
		sendSet.add(item.getAttribute('data-i18n'))
	}
	sendSet.forEach( (thisStringID ) => {
		ipcRenderer.send('i18n-translate', thisStringID)
	})
})

ipcRenderer.on('i18n-translate-return', (event, dataPoint, newText) => {
	/* Receive the translated text of an i18n item, update it everywhere it appears */
	const changeThese = document.querySelectorAll(`[data-i18n='${dataPoint}']`)
	changeThese.forEach((changeThis) => {
		changeThis.innerHTML = newText
	})
})

