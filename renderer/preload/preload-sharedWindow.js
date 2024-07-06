/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// preload file.  all windows.

const {contextBridge, ipcRenderer} = require('electron')

const pageName = window.location.pathname.split('/').pop().replace('.html', '')

const pageAPI = {
	'basegame' : {
		functions : {
			context     : () => ipcRenderer.invoke('context:cutCopyPaste'),
			openFolder  : (folder) => ipcRenderer.invoke('basegame:folder', folder),
			sendCompare : (compareArray) => ipcRenderer.invoke('dispatch:compare', compareArray),
		},
		validAsync : new Set(['basegame:setPage']),
	},
	'compare' : {
		functions : {
			get     : () => ipcRenderer.invoke('compare:get'),
			clear   : () => ipcRenderer.invoke('compare:clear'),
			remove  : (key) => ipcRenderer.invoke('compare:remove', key),
		},
		validAsync : new Set(),
	},
	'debug' : {
		functions : {
			all     : () => ipcRenderer.invoke('debug:all'),
			context : () => ipcRenderer.invoke('context:copy'),
		},
		validAsync : new Set(['debug:item']),
	},
	'detail' : {
		functions : {
			getBinds   : ()    => ipcRenderer.invoke('collect:bindConflict'),
			getMalware : ()    => ipcRenderer.invoke('collect:malware'),
			getMod     : (key) => ipcRenderer.invoke('mod:modColUUID', key),
			getStore   : (key) => ipcRenderer.invoke('store:modColUUID', key),

			sendBase    : (pageObject)   => ipcRenderer.invoke('dispatch:basegame', pageObject),
			sendCompare : (compareArray) => ipcRenderer.invoke('dispatch:compare', compareArray),
		},
		validAsync : new Set(),
	},
	'find' : {
		functions : {
			inputContext : ()     => ipcRenderer.invoke('context:cutCopyPaste'),
			modContext   : (data) => ipcRenderer.invoke('context:find', data),
			all          : ()     => ipcRenderer.invoke('collect:all'),
		},
		validAsync : new Set(['find:filterText']),
	},
	'gamelog' : {
		functions : {
			auto         : () => ipcRenderer.invoke('gamelog:auto'),
			filename     : () => ipcRenderer.invoke('gamelog:getFile'),
			get          : () => ipcRenderer.invoke('gamelog:get'),
			inputContext : () => ipcRenderer.invoke('context:cutCopyPaste'),
			logContext   : () => ipcRenderer.invoke('context:copy'),
			openFolder   : () => ipcRenderer.invoke('gamelog:folder'),
			pickFile     : () => ipcRenderer.invoke('gamelog:open'),
		},
		validAsync : new Set(),
	},
}

if ( typeof pageAPI[pageName] !== 'undefined' ) {
	contextBridge.exposeInMainWorld(
		`${pageName}_IPC`, {
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
		warning : (...args) => ipcRenderer.invoke('debug:log', 'warning', `render-${pageName}`, ...args),
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
		units : () => ipcRenderer.invoke('settings:units'),
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
		clip    : (value) => { ipcRenderer.invoke('win:clipboard', value)},

		receive : ( channel, func ) => {
			const validChannels = new Set([
				'win:updateFontSize', // TODO: not yet implemented
				'win:removeTooltips',
				'win:updateTheme', // TODO : theme switch not implemented yet
				'win:forceRefresh',
			])
		
			if ( validChannels.has( channel ) ) {
				ipcRenderer.on( channel, ( _, ...args ) => func( ...args ))
			}
		},
	}
)

