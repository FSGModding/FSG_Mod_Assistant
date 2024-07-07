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
	'loader', {
		receive   : ( channel, func ) => {
			const validChannels = new Set([
				'formMain_loading_show',
				'formMain_loading_hide',
				'formMain_loadingTitles',
				'fromMain_loadingDownload',
				'fromMain_loadingNoCount',
				'fromMain_loading_total',
				'fromMain_loading_current',
			])
		
			if ( validChannels.has( channel ) ) {
				ipcRenderer.on( channel, ( _, ...args ) => func( ...args ))
			}
		},
	}
)

contextBridge.exposeInMainWorld(
	'mods', {
		copyFavorites   : () => { ipcRenderer.send('toMain_copyFavorites') },
		cutCopyPaste    : () => ipcRenderer.send('context:cutCopyPaste'),
		debugLog        : () => ipcRenderer.send('dispatch:debug'),
		isLEDActive     : () => { return ipcRenderer.sendSync('toMain_getPref', 'led_active') },
		openBaseGame    : () => ipcRenderer.send('dispatch:basegame'),
		openFindAll     : () => ipcRenderer.send('dispatch:find'),
		openGameLog     : () => ipcRenderer.send('dispatch:gamelog'),
		openHelp        : () => { ipcRenderer.send('toMain_openHelpSite') },
		openMini        : () => { ipcRenderer.send('toMain_openMiniMode') },
		openPreferences : () => { ipcRenderer.send('toMain_openPrefs') },
		openSaveManage  : () => { ipcRenderer.send('toMain_openSaveManage') },
		popClipboard    : (text) => { ipcRenderer.send('toMain_populateClipboard', text )},
		runUpdate       : () => { ipcRenderer.send('toMain_runUpdateInstall') },
		sendToTray      : () => { ipcRenderer.send('toMain_sendMainToTray') },
		startFarmSim    : () => { ipcRenderer.send('toMain_startFarmSim') },
		versionCheck    : () => { ipcRenderer.send('toMain_versionCheck' ) },

		addFolder       : () => { ipcRenderer.send('toMain_addFolder') },
		cancelDownload  : () => { ipcRenderer.send('toMain_cancelDownload') },
		changeVersion   : (ver) => { ipcRenderer.send('toMain_setGameVersion', ver) },
		editFolders     : () => { ipcRenderer.send('toMain_editFolders') },
		makeActive      : (list) => { ipcRenderer.send('toMain_makeActive', list) },
		makeInactive    : () => { ipcRenderer.send('toMain_makeInactive' ) },
		refreshFolders  : () => { ipcRenderer.send('toMain_refreshFolders') },

		removeFolder  : ( collectKey ) => { ipcRenderer.send('toMain_removeFolder', collectKey) },
		reorderAlpha  : ( )            => { ipcRenderer.send('toMain_reorderFolderAlpha') },
		reorderFolder : ( from, to )   => { ipcRenderer.send('toMain_reorderFolder', from, to) },

		copyMods   : (selectedMods) => { ipcRenderer.send('toMain_copyMods', selectedMods) },
		copyMulti  : (selectedMods) => { ipcRenderer.send('toMain_copyMultiMods', selectedMods) },
		deleteMods : (selectedMods) => { ipcRenderer.send('toMain_deleteMods', selectedMods) },
		download   : (collection)   => { ipcRenderer.send('toMain_downloadList', collection) },
		exportList : (collection)   => { ipcRenderer.send('toMain_exportList', collection ) },
		modCText   : (selectedMod, selectedMods, isHoldingPen )  => { ipcRenderer.send('toMain_modContextMenu', selectedMod, selectedMods, isHoldingPen ) },
		moveMods   : (selectedMods) => { ipcRenderer.send('toMain_moveMods', selectedMods) },
		moveMulti  : (selectedMods) => { ipcRenderer.send('toMain_moveMultiMods', selectedMods) },
		openCText  : (collection)   => { ipcRenderer.send('toMain_mainContextMenu', collection ) },
		openExt    : (selectedMods) => { ipcRenderer.send('toMain_openExt', selectedMods) },
		openHub    : (selectedMods) => { ipcRenderer.send('toMain_openHub', selectedMods) },
		openMod    : (modID)        => ipcRenderer.send('dispatch:detail', modID),
		openMods   : (selectedMods) => { ipcRenderer.send('toMain_openMods', selectedMods) },
		openNotes  : (collection)   => { ipcRenderer.send('dispatch:notes', collection ) },
		openSave   : (collection)   => { ipcRenderer.send('toMain_openSave', collection) },
		openTrack  : ()             => { ipcRenderer.send('toMain_openSaveTrack') },
		setModInfo : (mod, site)    => { ipcRenderer.send('toMain_setModInfo', mod, site) },
		zipMods    : (selectedMods) => { ipcRenderer.send('toMain_exportZip', selectedMods) },

		dragOut    : (modID)  => { ipcRenderer.send('toMain_dragOut', modID ) },
		dropFiles  : (files)  => { ipcRenderer.send('toMain_dropFiles', files) },
		dropFolder : (folder) => { ipcRenderer.send('toMain_dropFolder', folder) },

		cleanCache    : () => { ipcRenderer.send('toMain_cleanCacheFile') },
		clearCache    : () => { ipcRenderer.send('toMain_clearCacheFile') },
		clearDetailCache : () => { ipcRenderer.send('toMain_clearDetailCacheFile') },
		clearMalware  : () => { ipcRenderer.send('toMain_clearCacheMalware') },
		resetWindows  : () => { ipcRenderer.send('toMain_resetWindows') },
		setGamePath   : (ver = 22) => { ipcRenderer.send('toMain_setGamePath', ver) },
		setPref       : ( name, value ) => { ipcRenderer.send('toMain_setPref', name, value) },
		setPrefFile   : (ver = 22) => { ipcRenderer.send('toMain_setPrefFile', ver) },
		showChangelog : () => ipcRenderer.send('dispatch:changelog'),
		showWizard    : () => { ipcRenderer.send('toMain_showSetupWizard') },

		realCopyFile      : ( fileMap )          => { ipcRenderer.send('toMain_realFileCopy', fileMap) },
		realCopyMultiFile : ( fileMap )          => { ipcRenderer.send('toMain_realMultiFileCopy', fileMap) },
		realDeleteFile    : ( fileMap )          => { ipcRenderer.send('toMain_realFileDelete', fileMap) },
		realImportFile    : ( fileMap, unzipMe ) => { ipcRenderer.send('toMain_realFileImport', fileMap, unzipMe) },
		realMoveFile      : ( fileMap )          => { ipcRenderer.send('toMain_realFileMove', fileMap) },
		realMoveMultiFile : ( fileMap )          => { ipcRenderer.send('toMain_realMultiFileMove', fileMap) },

		receive   : ( channel, func ) => {
			const validChannels = new Set([
				'fromMain_allSettings',
				'fromMain_debugLogDangerFlag',
				'fromMain_dirtyUpdate',
				'fromMain_fileOperation',
				'fromMain_filterOnly',
				'fromMain_gameUpdate',
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
