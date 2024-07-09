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
			context     : ()         => ipcRenderer.send('context:cutCopyPaste'),
			openFolder  : (folder)   => ipcRenderer.invoke('basegame:folder', folder),
			sendCompare : (aCompare) => ipcRenderer.send('dispatch:compare', aCompare),
		},
		validAsync : new Set(['basegame:setPage']),
	},
	'compare' : {
		functions : {
			get     : ()    => ipcRenderer.invoke('compare:get'),
			clear   : ()    => ipcRenderer.invoke('compare:clear'),
			remove  : (key) => ipcRenderer.invoke('compare:remove', key),
		},
		validAsync : new Set(),
	},
	'debug' : {
		functions : {
			all     : () => ipcRenderer.invoke('debug:all'),
			context : () => ipcRenderer.send('context:copy'),
		},
		validAsync : new Set(['debug:item']),
	},
	'detail' : {
		functions : {
			getBinds   : ()    => ipcRenderer.invoke('collect:bindConflict'),
			getMalware : ()    => ipcRenderer.invoke('collect:malware'),
			getMod     : (key) => ipcRenderer.invoke('mod:modColUUID', key),
			getStore   : (key) => ipcRenderer.invoke('store:modColUUID', key),

			sendBase    : (pageObject)   => ipcRenderer.send('dispatch:basegame', pageObject),
			sendCompare : (compareArray) => ipcRenderer.send('dispatch:compare', compareArray),
		},
		validAsync : new Set(),
	},
	'find' : {
		functions : {
			inputContext : ()     => ipcRenderer.send('context:cutCopyPaste'),
			modContext   : (data) => ipcRenderer.send('context:find', data),
			all          : ()     => ipcRenderer.invoke('collect:all'),
		},
		validAsync : new Set(['find:filterText']),
	},
	'gamelog' : {
		functions : {
			auto         : () => ipcRenderer.invoke('gamelog:auto'),
			filename     : () => ipcRenderer.invoke('gamelog:getFile'),
			get          : () => ipcRenderer.invoke('gamelog:get'),
			inputContext : () => ipcRenderer.send('context:cutCopyPaste'),
			logContext   : () => ipcRenderer.send('context:copy'),
			openFolder   : () => ipcRenderer.send('gamelog:folder'),
			pickFile     : () => ipcRenderer.invoke('gamelog:open'),
		},
		validAsync : new Set(),
	},
	'notes' : {
		functions : {
			active       : ()    => ipcRenderer.invoke('settings:activeCollection'),
			collectName  : (key) => ipcRenderer.invoke('collect:name', key),
			get          : (key) => ipcRenderer.invoke('settings:collection:get', key),
			getSetting   : (key) => ipcRenderer.invoke('settings:get', key),
			inputContext : ()    => ipcRenderer.send('context:cutCopyPaste'),
			last         : ()    => ipcRenderer.invoke('settings:lastGame'),
			verList      : ()    => ipcRenderer.invoke('settings:verList'),

			set          : (collect, key, value) => ipcRenderer.invoke('settings:collection:set', collect, key, value),
		},
		validAsync : new Set(['settings:collection:id']),
	},
	'resolve' : {
		functions : {
			fileOp : ( object ) => ipcRenderer.invoke('file:operation', object),
			get    : ( key ) => ipcRenderer.invoke('collect:resolveList', key),
		},
		validAsync : new Set(['resolve:shortname']),
	},
	'version' : {
		functions : {
			get     : ()    => ipcRenderer.invoke('collect:all'),
			resolve : (key) => ipcRenderer.send('dispatch:resolve', key),
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
		debug   : (...args) => ipcRenderer.send('debug:log', 'debug', `render-${pageName}`, ...args),
		error   : (...args) => ipcRenderer.send('debug:log', 'danger', `render-${pageName}`, ...args),
		log     : (...args) => ipcRenderer.send('debug:log', 'info', `render-${pageName}`, ...args),
		warning : (...args) => ipcRenderer.send('debug:log', 'warning', `render-${pageName}`, ...args),
	}
)

contextBridge.exposeInMainWorld(
	'i18n', {
		get  : (key)       => ipcRenderer.invoke('i18n:get', key),
		lang : (nv = null) => ipcRenderer.invoke('i18n:lang', nv),

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
		get   : (key) => ipcRenderer.invoke('settings:get', key),
		theme : ()    => ipcRenderer.invoke('settings:theme'),
		units : ()    => ipcRenderer.invoke('settings:units'),
	}
)

contextBridge.exposeInMainWorld(
	'operations', {
		close   : () => { ipcRenderer.send('win:close') },
		clip    : (value) => { ipcRenderer.send('win:clipboard', value)},

		receive : ( channel, func ) => {
			const validChannels = new Set([
				'win:updateFontSize', // TODO: not yet implemented
				'win:removeTooltips',
				'win:updateTheme', // TODO : theme switch not implemented yet
				'win:forceRefresh',

				'select:all',
				'select:none',
				'select:invert',
			])
		
			if ( validChannels.has( channel ) ) {
				ipcRenderer.on( channel, ( _, ...args ) => func( ...args ))
			}
		},
	}
)
