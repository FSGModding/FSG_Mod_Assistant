/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main window preLoad

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
		langList_change  : ( lang )  => { ipcRenderer.send('toMain_langList_change', lang) },
		langList_send    : ()        => { ipcRenderer.send('toMain_langList_send') },
		themeList_change : ( theme ) => { ipcRenderer.send('toMain_themeList_change', theme) },
		themeList_send   : ()        => { ipcRenderer.send('toMain_themeList_send') },

		getLocale        : () => { return ipcRenderer.sendSync('toMain_getText_locale') },
		getText_send     : ( text )  => { ipcRenderer.send('toMain_getText_send', text) },
		getText_sync     : ( items ) => { return ipcRenderer.sendSync('toMain_getText_sync', items) },
		getTextBase_send : ( text )  => { ipcRenderer.send('toMain_getTextBase_send', text) },
		receive          : ( channel, func ) => {
			const validChannels = new Set([
				'fromMain_getText_return',
				'fromMain_getText_return_base',
				'fromMain_getText_return_title',
				'fromMain_langList_return',
				'fromMain_themeList_return',
				'fromMain_l10n_refresh'
			])
		
			if ( validChannels.has( channel ) ) {
				ipcRenderer.on( channel, ( _, ...args ) => func( ...args ))
			}
		},
	}
)

contextBridge.exposeInMainWorld(
	'mods', {
		addFolder     : ( folder ) => { ipcRenderer.send('toMain_addFolder_direct', folder) },
		setPref       : ( name, value ) => { ipcRenderer.send('toMain_setPref', name, value) },

		receive   : ( channel, func ) => {
			const validChannels = new Set([
				'fromMain_modList',
				'fromMain_allSettings',
			])
		
			if ( validChannels.has( channel ) ) {
				ipcRenderer.on( channel, ( _, ...args ) => func( ...args ))
			}
		},
	}
)

contextBridge.exposeInMainWorld(
	'win_ops', {
		closeWindow        : () => { ipcRenderer.send('toMain_closeSubWindow') },
		receive            : ( channel, func ) => {
			const validChannels = new Set([
				'fromMain_clearTooltips',
				'fromMain_themeSetting',
			])
		
			if ( validChannels.has( channel ) ) {
				ipcRenderer.on( channel, ( _, ...args ) => func( ...args ))
			}
		},
	}
)
