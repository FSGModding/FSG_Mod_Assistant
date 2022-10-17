/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main window preLoad

const {contextBridge, ipcRenderer} = require('electron')

contextBridge.exposeInMainWorld(
	'l10n', {
		langList_change : ( lang )  => { ipcRenderer.send('toMain_langList_change', lang) },
		langList_send   : ()        => { ipcRenderer.send('toMain_langList_send') },
		getText_send    : ( text )  => { ipcRenderer.send('toMain_getText_send', text) },
		receive         : ( channel, func ) => {
			const validChannels = [
				'fromMain_getText_return_title',
				'fromMain_getText_return',
				'fromMain_langList_return',
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
		openPreferences : () => { ipcRenderer.send('toMain_openPrefs') },
		addFolder       : () => { ipcRenderer.send('toMain_addFolder') },
		editFolders     : () => { ipcRenderer.send('toMain_editFolders') },
		refreshFolders  : () => { ipcRenderer.send('toMain_refreshFolders') },
		versionCheck    : () => { ipcRenderer.send('toMain_versionCheck' ) },
		makeActive      : (list) => { ipcRenderer.send('toMain_makeActive', list) },
		makeInactive     : () => { ipcRenderer.send('toMain_makeInactive' ) },

		openSave   : (collection)   => { ipcRenderer.send('toMain_openSave', collection) },
		copyMods   : (selectedMods) => { ipcRenderer.send('toMain_copyMods', selectedMods) },
		moveMods   : (selectedMods) => { ipcRenderer.send('toMain_moveMods', selectedMods) },
		deleteMods : (selectedMods) => { ipcRenderer.send('toMain_deleteMods', selectedMods) },
		openMods   : (selectedMods) => { ipcRenderer.send('toMain_openMods', selectedMods) },
		openHub    : (selectedMods) => { ipcRenderer.send('toMain_openHub', selectedMods) },

		debugLog  : () => { ipcRenderer.send('openDebugLogContents') },
		openMod   : (modID) => { ipcRenderer.send('toMain_openModDetail', modID) },

		receive   : ( channel, func ) => {
			const validChannels = [
				'fromMain_modList',
				'fromMain_showLoading',
				'fromMain_hideLoading',
				'fromMain_showListSet',
				'fromMain_hideListSet',
				'fromMain_loadingTotal',
				'fromMain_loadingDone'
			]
		
			if ( validChannels.includes( channel ) ) {
				ipcRenderer.on( channel, ( event, ...args ) => func( ...args ))
			}
		},
	}
)
