/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Version window preLoad

const {contextBridge, ipcRenderer} = require('electron')

contextBridge.exposeInMainWorld(
	'log', {
		log     : (text, process) => { ipcRenderer.send('toMain_log', 'debug', `render-${process}`, text) },
		debug   : (text, process) => { ipcRenderer.send('toMain_log', 'debug', `render-${process}`, text) },
		info    : (text, process) => { ipcRenderer.send('toMain_log', 'info', `render-${process}`, text) },
		notice  : (text, process) => { ipcRenderer.send('toMain_log', 'notice', `render-${process}`, text) },
		warning : (text, process) => { ipcRenderer.send('toMain_log', 'warning', `render-${process}`, text) },
		danger  : (text, process) => { ipcRenderer.send('toMain_log', 'danger', `render-${process}`, text) },
	}
)

contextBridge.exposeInMainWorld(
	'l10n', {
		getText_send    : ( text )  => { ipcRenderer.send('toMain_getText_send', text) },
		receive         : ( channel, func ) => {
			const validChannels = [
				'fromMain_getText_return',
				'fromMain_getText_return_title',
				'fromMain_l10n_refresh'
			]
		
			if ( validChannels.includes( channel ) ) {
				ipcRenderer.on( channel, ( event, ...args ) => func( ...args ))
			}
		},
	}
)

contextBridge.exposeInMainWorld(
	'mods', {
		closeWindow  : () => { ipcRenderer.send('toMain_closeSubWindow', 'resolve') },
		refreshList  : () => { ipcRenderer.send('toMain_refreshVersions') },
		realCopyFile : ( fileMap ) => { ipcRenderer.send('toMain_realFileVerCP', fileMap) },
		receive      : ( channel, func ) => {
			const validChannels = [
				'fromMain_modSet',
			]
		
			if ( validChannels.includes( channel ) ) {
				ipcRenderer.on( channel, ( event, ...args ) => func( ...args ))
			}
		},
	}
)