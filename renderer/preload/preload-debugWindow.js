/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Debug window preLoad

const {contextBridge, ipcRenderer} = require('electron')
const autoUpdateTimeSeconds        = 30


ipcRenderer.on('update-log', ( _, logContents ) => {
	document.getElementById('debug_log').innerHTML = logContents.replaceAll('\n', '<br>\n')
})

contextBridge.exposeInMainWorld(
	'l10n', {
		getText_send    : ( text )  => { ipcRenderer.send('toMain_getText_send', text) },
		receive         : ( channel, func ) => {
			const validChannels = [
				'fromMain_getText_return',
				'fromMain_l10n_refresh'
			]
		
			if ( validChannels.includes( channel ) ) {
				ipcRenderer.on( channel, ( event, ...args ) => func( ...args ))
			}
		},
	}
)

contextBridge.exposeInMainWorld(
	'debug',
	{
		getDebugLogContents  : () => { ipcRenderer.send('getDebugLogContents') },
		saveDebugLogContents : () => { ipcRenderer.send('saveDebugLogContents') },
	}
)

window.addEventListener('DOMContentLoaded', () => {
	setInterval(() => {
		ipcRenderer.send('getDebugLogContents')
	}, (autoUpdateTimeSeconds * 1000))
})
