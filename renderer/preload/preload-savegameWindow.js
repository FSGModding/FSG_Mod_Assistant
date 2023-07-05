/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Detail window preLoad

const {contextBridge, ipcRenderer} = require('electron')

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
				'fromMain_getText_return_title',
				'fromMain_l10n_refresh'
			]
		
			if ( validChannels.includes( channel ) ) {
				ipcRenderer.on( channel, ( _, ...args ) => func( ...args ))
			}
		},
	}
)

contextBridge.exposeInMainWorld(
	'mods', {
		openDropFolder : (path)  => { ipcRenderer.send('toMain_openSaveDrop', 'folder', path)},
		openDropZIP    : (path)  => { ipcRenderer.send('toMain_openSaveDrop', 'zip', path)},
		openFolder     : ()      => { ipcRenderer.send('toMain_openSaveFolder')},
		openHUB        : (hubID) => { ipcRenderer.send('toMain_openHubByID', parseInt(hubID, 10) ) },
		openZIP        : ()      => { ipcRenderer.send('toMain_openSaveZIP')},
		selectInMain   : (list)  => { ipcRenderer.send('toMain_selectInMain', list)},

		receive      : ( channel, func ) => {
			const validChannels = [
				'fromMain_collectionName',
				'fromMain_saveInfo',
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