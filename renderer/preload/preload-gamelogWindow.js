/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Debug window preLoad

const {contextBridge, ipcRenderer} = require('electron')
const autoUpdateTimeSeconds        = 30

contextBridge.exposeInMainWorld(
	'log', {
		danger  : (text, process) => { ipcRenderer.send('toMain_log', 'danger', `render-${process}`, text) },
		debug   : (text, process) => { ipcRenderer.send('toMain_log', 'debug', `render-${process}`, text) },
		info    : (text, process) => { ipcRenderer.send('toMain_log', 'info', `render-${process}`, text) },
		log     : (text, process) => { ipcRenderer.send('toMain_log', 'debug', `render-${process}`, text) },
		notice  : (text, process) => { ipcRenderer.send('toMain_log', 'notice', `render-${process}`, text) },
		warning : (text, process) => { ipcRenderer.send('toMain_log', 'warning', `render-${process}`, text) },
	}
)

contextBridge.exposeInMainWorld(
	'l10n', {
		getText_send    : ( text )  => { ipcRenderer.send('toMain_getText_send', text) },
		receive         : ( channel, func ) => {
			const validChannels = [
				'fromMain_getText_return',
				'fromMain_l10n_refresh'
			]
		
			if ( validChannels.includes( channel ) ) {
				ipcRenderer.on( channel, ( _, ...args ) => func( ...args ))
			}
		},
	}
)

contextBridge.exposeInMainWorld(
	'gamelog',
	{
		changeGameLogFile   : () => { ipcRenderer.send('toMain_changeGameLog') },
		getGameLogContents  : () => { ipcRenderer.send('toMain_getGameLog') },
		guessGameLogFile    : () => { ipcRenderer.send('toMain_guessGameLog') },
		openCText           : () => { ipcRenderer.send('toMain_logContextMenu') },
		openGameLogFolder   : () => { ipcRenderer.send('toMain_openGameLogFolder') },

		receive   : ( channel, func ) => {
			const validChannels = [
				'fromMain_gameLog',
			]
		
			if ( validChannels.includes( channel ) ) {
				ipcRenderer.on( channel, ( _, ...args ) => func( ...args ))
			}
		},
	}
)

contextBridge.exposeInMainWorld(
	'win_ops', {
		closeWindow        : () => { ipcRenderer.send('toMain_closeSubWindow') },
		receive            : ( channel, func ) => {
			const validChannels = [
				'fromMain_clearTooltips',
				'fromMain_themeSetting',
			]
		
			if ( validChannels.includes( channel ) ) {
				ipcRenderer.on( channel, ( _, ...args ) => func( ...args ))
			}
		},
	}
)

window.addEventListener('DOMContentLoaded', () => {
	setInterval(() => {
		ipcRenderer.send('toMain_getDebugLog')
	}, (autoUpdateTimeSeconds * 1000))
})
