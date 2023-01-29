/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main window preLoad

const {contextBridge, ipcRenderer} = require('electron')

contextBridge.exposeInMainWorld(
	'log', {
		log     : (text, process) => { ipcRenderer.send('toMain_log', 'debug', `render-${process}`, text) },
		debug   : (text, process) => { ipcRenderer.send('toMain_log', 'debug', `render-${process}`, text) },
		info    : (text, process) => { ipcRenderer.send('toMain_log', 'info', `render-${process}`, text) },
		notice  : (text, process) => { ipcRenderer.send('toMain_log', 'notice', `render-${process}`, text) },
		warning : (text, process) => { ipcRenderer.send('toMain_log', 'warning', `render-${process}`, text) },
		danger  : (text, process) => { ipcRenderer.send('toMain_log', 'danger', `render-${process}`, text) },
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
		getCollDesc     : (coll) => { return ipcRenderer.sendSync('toMain_getCollDesc', coll) },
		startFarmSim    : () => { ipcRenderer.send('toMain_startFarmSim') },
		openPreferences : () => { ipcRenderer.send('toMain_openPrefs') },
		openFindAll     : () => { ipcRenderer.send('toMain_openFind') },
		openGameLog     : () => { ipcRenderer.send('toMain_openGameLog') },
		addFolder       : () => { ipcRenderer.send('toMain_addFolder') },
		editFolders     : () => { ipcRenderer.send('toMain_editFolders') },
		refreshFolders  : () => { ipcRenderer.send('toMain_refreshFolders') },
		copyFavorites   : () => { ipcRenderer.send('toMain_copyFavorites') },
		versionCheck    : () => { ipcRenderer.send('toMain_versionCheck' ) },
		makeActive      : (list) => { ipcRenderer.send('toMain_makeActive', list) },
		makeInactive    : () => { ipcRenderer.send('toMain_makeInactive' ) },
		isLEDActive     : () => { return ipcRenderer.sendSync('toMain_getPref', 'led_active') },
		popClipboard    : (text) => { ipcRenderer.send('toMain_populateClipboard', text )},

		openSave   : (collection)   => { ipcRenderer.send('toMain_openSave', collection) },
		exportList : (collection)   => { ipcRenderer.send('toMain_exportList', collection ) },
		download   : (collection)   => { ipcRenderer.send('toMain_downloadList', collection) },
		openNotes  : (collection)   => { ipcRenderer.send('toMain_openNotes', collection ) },
		openCText  : (collection)   => { ipcRenderer.send('toMain_mainContextMenu', collection ) },
		modCText   : (selectedMod)  => { ipcRenderer.send('toMain_modContextMenu', selectedMod ) },
		copyMods   : (selectedMods) => { ipcRenderer.send('toMain_copyMods', selectedMods) },
		moveMods   : (selectedMods) => { ipcRenderer.send('toMain_moveMods', selectedMods) },
		deleteMods : (selectedMods) => { ipcRenderer.send('toMain_deleteMods', selectedMods) },
		zipMods    : (selectedMods) => { ipcRenderer.send('toMain_exportZip', selectedMods) },
		openMods   : (selectedMods) => { ipcRenderer.send('toMain_openMods', selectedMods) },
		openHub    : (selectedMods) => { ipcRenderer.send('toMain_openHub', selectedMods) },

		debugLog  : () => { ipcRenderer.send('toMain_openDebugLog') },
		openMod   : (modID) => { ipcRenderer.send('toMain_openModDetail', modID) },

		receive   : ( channel, func ) => {
			const validChannels = [
				'fromMain_modList',
				'fromMain_selectAllOpen',
				'fromMain_selectNoneOpen',
				'fromMain_selectInvertOpen',
				'fromMain_selectOnly',
				'fromMain_selectOnlyFilter',
			]
		
			if ( validChannels.includes( channel ) ) {
				ipcRenderer.on( channel, ( event, ...args ) => func( ...args ))
			}
		},
	}
)
