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
		getText_send    : ( text )  => { ipcRenderer.send('toMain_getText_send', text) },
		getText_sync    : ( text )  => { return ipcRenderer.sendSync('toMain_getText_sync', text ) },
		receive         : ( channel, func ) => {
			const validChannels = [
				'fromMain_getText_return_title',
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
		copyFavorites   : () => { ipcRenderer.send('toMain_copyFavorites') },
		cutCopyPaste    : () => { ipcRenderer.send('toMain_notesContextMenu') },
		debugLog        : () => { ipcRenderer.send('toMain_openDebugLog') },
		isLEDActive     : () => { return ipcRenderer.sendSync('toMain_getPref', 'led_active') },
		openFindAll     : () => { ipcRenderer.send('toMain_openFind') },
		openGameLog     : () => { ipcRenderer.send('toMain_openGameLog') },
		openHelp        : () => { ipcRenderer.send('toMain_openHelpSite') },
		openPreferences : () => { ipcRenderer.send('toMain_openPrefs') },
		popClipboard    : (text) => { ipcRenderer.send('toMain_populateClipboard', text )},
		sendToTray      : () => { ipcRenderer.send('toMain_sendMainToTray') },
		startFarmSim    : () => { ipcRenderer.send('toMain_startFarmSim') },
		versionCheck    : () => { ipcRenderer.send('toMain_versionCheck' ) },

		addFolder       : () => { ipcRenderer.send('toMain_addFolder') },
		changeVersion   : (ver) => { ipcRenderer.send('toMain_setGameVersion', ver) },
		editFolders     : () => { ipcRenderer.send('toMain_editFolders') },
		makeActive      : (list) => { ipcRenderer.send('toMain_makeActive', list) },
		makeInactive    : () => { ipcRenderer.send('toMain_makeInactive' ) },
		refreshFolders  : () => { ipcRenderer.send('toMain_refreshFolders') },

		copyMods   : (selectedMods) => { ipcRenderer.send('toMain_copyMods', selectedMods) },
		deleteMods : (selectedMods) => { ipcRenderer.send('toMain_deleteMods', selectedMods) },
		download   : (collection)   => { ipcRenderer.send('toMain_downloadList', collection) },
		exportList : (collection)   => { ipcRenderer.send('toMain_exportList', collection ) },
		modCText   : (selectedMod)  => { ipcRenderer.send('toMain_modContextMenu', selectedMod ) },
		moveMods   : (selectedMods) => { ipcRenderer.send('toMain_moveMods', selectedMods) },
		openCText  : (collection)   => { ipcRenderer.send('toMain_mainContextMenu', collection ) },
		openExt    : (selectedMods) => { ipcRenderer.send('toMain_openExt', selectedMods) },
		openHub    : (selectedMods) => { ipcRenderer.send('toMain_openHub', selectedMods) },
		openMod    : (modID)        => { ipcRenderer.send('toMain_openModDetail', modID) },
		openMods   : (selectedMods) => { ipcRenderer.send('toMain_openMods', selectedMods) },
		openNotes  : (collection)   => { ipcRenderer.send('toMain_openNotes', collection ) },
		openSave   : (collection)   => { ipcRenderer.send('toMain_openSave', collection) },
		setModInfo : (mod, site)    => { ipcRenderer.send('toMain_setModInfo', mod, site) },
		zipMods    : (selectedMods) => { ipcRenderer.send('toMain_exportZip', selectedMods) },

		dragOut    : (modID)  => { ipcRenderer.send('toMain_dragOut', modID ) },
		dropFiles  : (files)  => { ipcRenderer.send('toMain_dropFiles', files) },
		dropFolder : (folder) => { ipcRenderer.send('toMain_dropFolder', folder) },

		receive   : ( channel, func ) => {
			const validChannels = [
				'fromMain_debugLogDanger',
				'fromMain_dirtyUpdate',
				'fromMain_modInfoPop',
				'fromMain_modList',
				'fromMain_selectAllOpen',
				'fromMain_selectInvertOpen',
				'fromMain_selectNoneOpen',
				'fromMain_selectOnly',
				'fromMain_selectOnlyFilter',
			]
		
			if ( validChannels.includes( channel ) ) {
				ipcRenderer.on( channel, ( event, ...args ) => func( ...args ))
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
				ipcRenderer.on( channel, ( event, ...args ) => func( ...args ))
			}
		},
	}
)
