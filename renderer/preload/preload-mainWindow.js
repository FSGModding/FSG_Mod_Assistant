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
	'main_IPC', {
		dispatch        : (win) => {
			const knownWindows = new Set([
				'compare', 'basegame', 'game', 'gamelog', 'help',
				'changelog', 'find', 'notes', 'version',
				'resolve', 'debug', 'savetrack', 'savemanage',
				'mini',
			])
			if ( knownWindows.has(win) ) {
				ipcRenderer.send(`dispatch:${win}`)
			}
		},
		dispatchDetail : (id)                => { ipcRenderer.send('dispatch:detail', id) },
		dispatchLog    : (file)              => { ipcRenderer.send('dispatch:gamelog', file) },
		dispatchNotes  : (CKey)              => { ipcRenderer.send('dispatch:notes', CKey) },
		dispatchSave   : (CKey, file = null) => { ipcRenderer.send('dispatch:save', CKey, file) },

		cancelDownload    : () => { ipcRenderer.send('file:downloadCancel') },
		minimizeToTray    : () => { ipcRenderer.send('main:minimizeToTray') },
		startFarmSim      : () => { ipcRenderer.send('dispatch:game') },
		updateApplication : () => { ipcRenderer.send('main:runUpdateInstall') },
		updateState       : () => ipcRenderer.invoke('state:all'),

		contextCol   : (CKey)         => { ipcRenderer.send('context:collection', CKey) },
		contextInput : ()             => ipcRenderer.send('context:cutCopyPaste'),
		contextMod   : (mod, select ) => { ipcRenderer.send('context:mod', mod, select ) },
		
		cache : {
			clean   : () => { ipcRenderer.send('cache:clean') },
			clear   : () => { ipcRenderer.send('cache:clear') },
			detail  : () => { ipcRenderer.send('cache:detail') },
			malware : () => { ipcRenderer.send('cache:malware') },
		},
		
		drag : {
			out : (modID)  => { ipcRenderer.send('main:dragOut', modID ) },
		},

		files : {
			drop        : (files)      => ipcRenderer.invoke('files:drop', files),
			exportZIP   : (MKey_s)     => { ipcRenderer.send('file:exportZIP', MKey_s) },
			list        : (mode, mods) => ipcRenderer.invoke('files:list', mode, mods),
			listFavs    : ()           => ipcRenderer.invoke('files:list:favs'),
			openExplore : (MKey_s)     => { ipcRenderer.send('files:openExplore', MKey_s) },
			openExtSite : (MKey_s)     => { ipcRenderer.send('files:openExtSite', MKey_s) },
			openModHub  : (MKey_s)     => { ipcRenderer.send('files:openModHub', MKey_s) },
			process     : ( object )   => ipcRenderer.invoke('file:operation', object),
		},

		folder : {
			active   : (CKey)   => ipcRenderer.invoke('folders:activate', CKey),
			add      : ()       => { ipcRenderer.send('folders:add') },
			alpha    : ()       => { ipcRenderer.send('folders:alpha') },
			download : (CKey)   => { ipcRenderer.send('file:download', CKey) },
			drop     : (folder) => { ipcRenderer.send('folders:addDrop', folder) },
			edit     : ()       => { ipcRenderer.send('folders:edit') },
			export   : (CKey)   => { ipcRenderer.send('file:exportCSV', CKey ) },
			inactive : ()       => ipcRenderer.invoke('folders:active', null),
			open     : (CKey)   => { ipcRenderer.send('folders:open', CKey) },
			reload   : ()       => { ipcRenderer.send('folders:reload') },
			remove   : (CKey)   => { ipcRenderer.send('folders:remove', CKey) },
			set      : (f, t)   => { ipcRenderer.send('folders:set', f, t) },
		},

		
		// TODO: finish below line


		receive   : ( channel, func ) => {
			const validChannels = new Set([
				'files:operation',
				'loading:current',
				'loading:download',
				'loading:hide',
				'loading:noCount',
				'loading:show',
				'loading:titles',
				'loading:total',
				'mods:list',
				'mods:site',
				'status:all',

				
				'fromMain_filterOnly',
				'fromMain_modInfoPop',
				'fromMain_selectOnly',
				'fromMain_selectOnlyFilter',
			])
		
			if ( validChannels.has( channel ) ) {
				ipcRenderer.on( channel, ( _, ...args ) => func( ...args ))
			}
		},
	}
)
window.main_IPC = window.mods

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

contextBridge.exposeInMainWorld(
	'i18n', {
		get  : (key)       => ipcRenderer.invoke('i18n:get', key),
		lang : (nv = null) => ipcRenderer.invoke('i18n:lang', nv),
		list : ()          => ipcRenderer.invoke('i18n:langList'),

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
		dev         : ()         => ipcRenderer.invoke('settings:dev'),
		get         : (key)      => ipcRenderer.invoke('settings:get', key),
		set         : (k, v)     => ipcRenderer.invoke('settings:set', k, v),
		setGamePath : (ver = 22) => { ipcRenderer.send('settings:gamePath', ver) },
		setPrefFile : (ver = 22) => { ipcRenderer.send('settings:prefFile', ver) },
		site        : (k, v)     => ipcRenderer.invoke('settings:site', k, v),
		theme       : ()         => ipcRenderer.invoke('settings:theme'),
		themeChange : (k)        => { ipcRenderer.send('settings:themeChange', k) },
		themeList   : ()         => ipcRenderer.invoke('settings:themeList'),
		units       : ()         => ipcRenderer.invoke('settings:units'),
		winReset    : ()         => { ipcRenderer.send('settings:resetWindows') },

		receive   : ( channel, func ) => {
			const validChannels = new Set([
				'settings:invalidate',
			])
		
			if ( validChannels.has( channel ) ) {
				ipcRenderer.on( channel, ( _, ...args ) => func( ...args ))
			}
		},
	}
)

contextBridge.exposeInMainWorld(
	'operations', {
		clip    : (value) => { ipcRenderer.send('win:clipboard', value)},
		close   : ()      => { ipcRenderer.send('win:close') },
		url     : (url)   => { ipcRenderer.send('win:openURL', url)},

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
