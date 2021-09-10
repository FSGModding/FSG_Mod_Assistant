/*  _______           __ ______ __                __               
   |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
   |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
   |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  */

// Mod File Parser - Electron Preload (Detail Window)
//  (IPC and UI triggers that interact with the browser process)

// (c) 2021 JTSage.  MIT License.

const {contextBridge, ipcRenderer} = require('electron')
const autoUpdateTimeSeconds = 30

/*
  _____  _____  _______           _____   ______      _______  _____  __   _ _______ _______ __   _ _______
    |   |_____] |       . |      |     | |  ____      |       |     | | \  |    |    |______ | \  |    |   
  __|__ |       |_____  . |_____ |_____| |_____|      |_____  |_____| |  \_|    |    |______ |  \_|    |   
                                                                                                           
*/
ipcRenderer.on('update-log', ( event, logContents ) => {
	document.getElementById('debug_log').innerHTML = logContents
})


contextBridge.exposeInMainWorld(
	'ipc',
	{
		getDebugLogContents : () => { ipcRenderer.send('getDebugLogContents') },
		saveDebugLogContents : () => { ipcRenderer.send('saveDebugLogContents') },
	}
)

window.addEventListener('DOMContentLoaded', () => {
	setInterval(() => {
		ipcRenderer.send('getDebugLogContents')
	}, (autoUpdateTimeSeconds * 1000))
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

