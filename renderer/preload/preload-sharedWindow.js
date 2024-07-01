/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// preload file.  all windows.

const {contextBridge, ipcRenderer} = require('electron')

const pageName = window.location.pathname.split('/').pop().replace('.html', '')

const pageAPI = {
	'debug' : {
		functions : {
			all     : () => ipcRenderer.invoke('debug:all'),
			context : () => ipcRenderer.invoke('debug:context'),
		},
		validAsync : new Set([
			'debug:item',
		]),
	},
	'detail' : {
		functions : {
			getMod : (key) => ipcRenderer.invoke('mod:modColUUID', key),
		},
		validAsync : new Set(),
	},
}

if ( typeof pageAPI[pageName] !== 'undefined' ) {
	contextBridge.exposeInMainWorld(
		pageName, {
			...pageAPI[pageName].functions,

			receive   : ( channel, func ) => {
				if ( pageAPI[pageName].validAsync.has( channel ) ) {
					ipcRenderer.on( channel, ( _, ...args ) => func( ...args ))
				}
			},
		}
	)
}

contextBridge.exposeInMainWorld(
	'log', {
		debug   : (...args) => ipcRenderer.invoke('debug:log', 'debug', `render-${pageName}`, ...args),
		error   : (...args) => ipcRenderer.invoke('debug:log', 'danger', `render-${pageName}`, ...args),
		log     : (...args) => ipcRenderer.invoke('debug:log', 'info', `render-${pageName}`, ...args),
	}
)

contextBridge.exposeInMainWorld(
	'i18n', {
		get  : (key) => ipcRenderer.invoke('i18n:get', key),
		lang : (newValue = null) => ipcRenderer.invoke('i18n:lang', newValue),

		receive   : ( channel, func ) => {
			const validChannels = new Set([
				'i18n:refresh',
			])
		
			if ( validChannels.has( channel ) ) {
				ipcRenderer.on( channel, ( _, ...args ) => func( ...args ))
			}
		},
	}
)

contextBridge.exposeInMainWorld(
	'settings', {
		get : (key) => ipcRenderer.invoke('settings:get', key),
		theme : () => ipcRenderer.invoke('settings:theme'),
	}
)

// contextBridge.exposeInMainWorld(
// 	'l10n', {
// 		getLocale        : () => { return ipcRenderer.sendSync('toMain_getText_locale') },
// 		getText_send     : ( text )  => { ipcRenderer.send('toMain_getText_send', text) },
// 		getText_sync     : ( items ) => { return ipcRenderer.sendSync('toMain_getText_sync', items) },
// 		getTextBase_send : ( text )  => { ipcRenderer.send('toMain_getTextBase_send', text) },
// 		receive          : ( channel, func ) => {
// 			const validChannels = new Set([
// 				'fromMain_getText_return',
// 				'fromMain_getText_return_base',
// 				'fromMain_getText_return_title',
// 				'fromMain_l10n_refresh'
// 			])
		
// 			if ( validChannels.has( channel ) ) {
// 				ipcRenderer.on( channel, ( _, ...args ) => func( ...args ))
// 			}
// 		},
// 	}
// )


contextBridge.exposeInMainWorld(
	'operations', {
		close   : () => { ipcRenderer.invoke('win:close') },
		receive : ( channel, func ) => {
			const validChannels = new Set([
				'win:updateFontSize',
				'win:removeTooltips',
				'win:updateTheme',
			])
		
			if ( validChannels.has( channel ) ) {
				ipcRenderer.on( channel, ( _, ...args ) => func( ...args ))
			}
		},
	}
)

