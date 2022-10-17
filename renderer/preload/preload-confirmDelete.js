/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// delete confirm window preLoad

const {contextBridge, ipcRenderer} = require('electron')

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
	'mods', {
		closeWindow    : ( ) => { ipcRenderer.send('toMain_closeSubWindow', 'confirm') },
		homeDirMap     : ( path ) => { return ipcRenderer.sendSync('toMain_homeDirRevamp', path) },
		realDeleteFile : ( collection, uuid ) => { ipcRenderer.send('toMain_realFileDelete', collection, uuid) },
		receive        : ( channel, func ) => {
			const validChannels = [
				'fromMain_confirmList',
			]
		
			if ( validChannels.includes( channel ) ) {
				ipcRenderer.on( channel, ( event, ...args ) => func( ...args ))
			}
		},
	}
)