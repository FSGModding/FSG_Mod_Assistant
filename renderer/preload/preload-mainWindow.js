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

		drag : {
			out : (modID)  => { ipcRenderer.send('main:dragOut', modID ) },
		},

		updateState       : () => ipcRenderer.invoke('state:all'),

		minimizeToTray    : () => { ipcRenderer.send('main:minimizeToTray') },
		updateApplication : () => { ipcRenderer.send('main:runUpdateInstall') },

		contextCol   : (CKey)         => { ipcRenderer.send('context:collection', CKey) },
		contextInput : ()             => ipcRenderer.send('context:cutCopyPaste'),
		contextMod   : (mod, select ) => { ipcRenderer.send('context:mod', mod, select ) },
		
		dispatchDetail : (id)                => { ipcRenderer.send('dispatch:detail', id) },
		dispatchLog    : (file)              => { ipcRenderer.send('dispatch:gamelog', file) },
		dispatchNotes  : (CKey)              => { ipcRenderer.send('dispatch:notes', CKey) },
		dispatchSave   : (CKey, file = null) => { ipcRenderer.send('dispatch:save', CKey, file) },

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
			drop     : (folder) => { ipcRenderer.send('folders:addDrop', folder) },
			edit     : ()       => { ipcRenderer.send('folders:edit') },
			inactive : ()       => ipcRenderer.invoke('folders:active', null),
			open     : (CKey)   => { ipcRenderer.send('folders:open', CKey) },
			reload   : ()       => { ipcRenderer.send('folders:reload') },
			remove   : (CKey)   => { ipcRenderer.send('folders:remove', CKey) },
			set      : (f, t)   => { ipcRenderer.send('folders:set', f, t) },
		},
		
		cancelDownload  : ()       => { ipcRenderer.send('file:downloadCancel') },
		collectDownload : (CKey)   => { ipcRenderer.send('file:download', CKey) },
		collectExport   : (CKey)   => { ipcRenderer.send('file:exportCSV', CKey ) },
		
		copyFavorites   : () => { ipcRenderer.send('toMain_copyFavorites') },
		cutCopyPaste    : () => ipcRenderer.send('context:cutCopyPaste'),

		startFarmSim    : () => { ipcRenderer.send('dispatch:game') },

		// TODO: finish below line


		openSave   : (collection)   => { ipcRenderer.send('toMain_openSave', collection) },
		
		setModInfo : (mod, site)    => { ipcRenderer.send('toMain_setModInfo', mod, site) },

		
		

		cleanCache    : () => { ipcRenderer.send('toMain_cleanCacheFile') },
		clearCache    : () => { ipcRenderer.send('toMain_clearCacheFile') },
		clearDetailCache : () => { ipcRenderer.send('toMain_clearDetailCacheFile') },
		clearMalware  : () => { ipcRenderer.send('toMain_clearCacheMalware') },
		setGamePath   : (ver = 22) => { ipcRenderer.send('toMain_setGamePath', ver) },
		setPref       : ( name, value ) => { ipcRenderer.send('toMain_setPref', name, value) },
		setPrefFile   : (ver = 22) => { ipcRenderer.send('toMain_setPrefFile', ver) },
		showChangelog : () => ipcRenderer.send('dispatch:changelog'),
		showWizard    : () => { ipcRenderer.send('toMain_showSetupWizard') },

		receive   : ( channel, func ) => {
			const validChannels = new Set([
				'loading:show',
				'loading:hide',
				'loading:titles',
				'loading:download',
				'loading:noCount',
				'loading:total',
				'loading:current',
				'status:all',
				'files:operation',

				'fromMain_allSettings',
				'fromMain_fileOperation',
				'fromMain_filterOnly',
				'fromMain_modInfoPop',
				'fromMain_modList',
				'fromMain_selectAllOpen',
				'fromMain_selectInvertOpen',
				'fromMain_selectNoneOpen',
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
		get         : (key)  => ipcRenderer.invoke('settings:get', key),
		set         : (k, v) => ipcRenderer.invoke('settings:set', k, v),
		theme       : ()     => ipcRenderer.invoke('settings:theme'),
		themeChange : (k)    => { ipcRenderer.send('settings:themeChange', k) },
		themeList   : ()     => ipcRenderer.invoke('settings:themeList'),
		units       : ()     => ipcRenderer.invoke('settings:units'),
		winReset    : ()     => { ipcRenderer.send('settings:resetWindows') },
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
