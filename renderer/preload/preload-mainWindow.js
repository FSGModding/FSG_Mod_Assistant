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
		addFolder : () => { ipcRenderer.send('toMain_addFolder') },
		debugLog  : () => { ipcRenderer.send('openDebugLogContents') },


		receive   : ( channel, func ) => {
			const validChannels = [
				'fromMain_modList',
			]
		
			if ( validChannels.includes( channel ) ) {
				ipcRenderer.on( channel, ( event, ...args ) => func( ...args ))
			}
		},
	}
)




// /*
//   _____  _____  _______   _______  _____  __   _ _______ _____  ______
//     |   |_____] |       . |       |     | | \  | |______   |   |  ____
//   __|__ |       |_____  . |_____  |_____| |  \_| |       __|__ |_____|
                                                                      
// */
// ipcRenderer.on('newFileConfig', (event, arg) => {
// 	/* Get notification of loading a new config file */
// 	if ( arg.error ) {
// 		classRem('load_error', 'd-none')
// 	} else {
// 		classAdd('load_error', 'd-none')
// 	}
	
// 	if ( arg.valid ) {
// 		classRem('button_process', 'disabled')
// 	} else {
// 		classAdd('button_process', 'disabled')
// 	}
	
// 	byId('location_savegame_folder').innerHTML   = arg.saveDir === null ? '--' : arg.saveDir
// 	byId('location_mod_folder').innerHTML        = arg.modDir === null ? '--' : arg.modDir

// 	byId('button_process').focus()
// })







// /*
//   _______ _     _ _______  _____   _____   ______  _____  _______ _______ _______ _______
//   |_____| |     |    |    |     | |_____] |_____/ |     | |       |______ |______ |______
//   |     | |_____|    |    |_____| |       |    \_ |_____| |_____  |______ ______| ______|
                                                                                         
// */
// // Because of earlier choices, it's easiest to fake a click in the renderer so that all the
// // events go to the right place.

// ipcRenderer.on('trigger_version', (event, versionNum) => {
// 	if ( versionNum === 19 ) {
// 		classRem(['ver_icon_19'], 'd-none')
// 		classAdd(['ver_icon_22'], 'd-none')
// 	} else {
// 		classAdd(['ver_icon_19'], 'd-none')
// 		classRem(['ver_icon_22'], 'd-none')
// 	}
// })

// ipcRenderer.on('autoProcess', () => {
// 	ipcRenderer.send('processMods')
// 	classRem(['tab_broken', 'tab_missing', 'tab_conflict', 'tab_explore'], 'flashonce')
// 	classAdd(['button_process', 'button_load', 'button_load_folder'], 'disabled')
// 	classRem('loading_modal_backdrop', 'd-none')
// 	classAdd(['loadingModal', 'loading_modal_backdrop'], 'show')
// 	byId('counter_mods_done').innerHTML  = 0
// 	byId('counter_mods_total').innerHTML = 0
// 	document.getElementById('loadingModal').style.display = 'block'
// })



// /*
//   _______ _     _  _____   _____  _______ _______ ______       _______  _____  _____
//   |______  \___/  |_____] |     | |______ |______ |     \      |_____| |_____]   |  
//   |______ _/   \_ |       |_____| ______| |______ |_____/      |     | |       __|__
                                                                                    
// Functions that are exposed to the UI renderer process
// */
// contextBridge.exposeInMainWorld(
// 	'ipc',
// 	{
// 		getL10nText : (text) => {
// 			ipcRenderer.send('main_l10n-get-text', text)
// 		},
// 		changeLangList : () => {
// 			ipcRenderer.send('i18n-change-locale', byId('language_select').value)
// 		},
// 		openPreferences : () => {
// 			ipcRenderer.send('askOpenPreferencesWindow')
// 		},
// 		loadButton : () => {
// 			ipcRenderer.send('openConfigFile')
// 			dataIsLoaded = false
// 		},
// 		loadFolder : () => {
// 			ipcRenderer.send('openOtherFolder')
// 			dataIsLoaded = false
// 		},
// 		setVer2019 : () => {
// 			ipcRenderer.send('setGameVersion', 19)
// 			classRem(['ver_icon_19'], 'd-none')
// 			classAdd(['ver_icon_22'], 'd-none')
// 			dataIsLoaded = false
// 		},
// 		setVer2022 : () => {
// 			ipcRenderer.send('setGameVersion', 22)
// 			classAdd(['ver_icon_19'], 'd-none')
// 			classRem(['ver_icon_22'], 'd-none')
// 			dataIsLoaded = false
// 		},
// 		processButton : () => {
// 			ipcRenderer.send('processMods')
// 			classRem(['tab_broken', 'tab_missing', 'tab_conflict', 'tab_explore'], 'flashonce')
// 			classAdd(['button_process', 'button_load', 'button_load_folder'], 'disabled')
// 			classRem('loading_modal_backdrop', 'd-none')
// 			classAdd(['loadingModal', 'loading_modal_backdrop'], 'show')
// 			byId('counter_mods_done').innerHTML  = 0
// 			byId('counter_mods_total').innerHTML = 0
// 			document.getElementById('loadingModal').style.display = 'block'
// 		},
// 		changeExplore : () => {
// 			ipcRenderer.send('askExploreList', byId('savegame_select').value)
// 		},
// 		changeExploreActiveUnused : () => {
// 			ipcRenderer.send('askExploreList', 0, -1)
// 		},
// 		changeExploreInActive : () => {
// 			ipcRenderer.send('askExploreList', -1)
// 		},
// 		changeExploreScripts : () => {
// 			ipcRenderer.send('askExploreList', 0, 0, 'hasScripts')
// 			byId('col_mod_has_scripts_switch').checked = true
// 		},
// 		openDebugLogContents : () => {
// 			ipcRenderer.send('openDebugLogContents')
// 		},
// 		refreshBroken : () => {
// 			ipcRenderer.send('askBrokenList')
// 		},
// 		refreshMissing : () => {
// 			ipcRenderer.send('askMissingList')
// 		},
// 		refreshConflict : () => {
// 			ipcRenderer.send('askConflictList')
// 		},
// 		refreshExplore : () => {
// 			ipcRenderer.send('askExploreList', 0)
// 		},

// 	}
// )



// /*
//   _______ _______ __   _ _     _ _______
//   |  |  | |______ | \  | |     | |______
//   |  |  | |______ |  \_| |_____| ______|
                                        
// Listeners on the renderer that need privileged execution (ipc usually)
// */

// window.addEventListener('DOMContentLoaded', () => {
// 	// const table_handler = (e, domID) => {
// 	// 	e.preventDefault()
		
// 	// 	if ( e.target.matches('td') ) {
// 	// 		const theseHeaders = Array.from(
// 	// 			byId(domID).parentNode.firstElementChild.querySelectorAll('th.i18n'),
// 	// 			(th) => [th.innerText, th.getAttribute('data-i18n')]
// 	// 		)
// 	// 		const theseValues = Array.from(
// 	// 			e.target.parentNode.childNodes,
// 	// 			(td) => td.innerText
// 	// 		)
// 	// 		ipcRenderer.send('show-context-menu-table', theseHeaders, theseValues)
// 	// 	}
// 	// }
// 	// const table_dblclick = (e) => {
// 	// 	e.preventDefault()
		
// 	// 	if ( e.target.matches('td') ) {
// 	// 		const thisMod = e.target.parentNode.childNodes[0].innerText
// 	// 		ipcRenderer.send('show-mod-detail', thisMod)
// 	// 	}
// 	// }
// 	// const list_handler = (e) => {
// 	// 	e.preventDefault()

// 	// 	const closestEntry = e.target.closest('.mod-record')
		
// 	// 	if ( closestEntry !== null ) {
// 	// 		ipcRenderer.send('show-context-menu-list', closestEntry.getAttribute('data-path'), closestEntry.getAttribute('data-name'))
// 	// 	}
// 	// }

// 	// byId('broken_list').addEventListener('contextmenu', (e) => { list_handler(e) })
// 	// byId('conflict_list').addEventListener('contextmenu', (e) => {list_handler(e) })

// 	// byId('table_missing_parent').addEventListener('dblclick', (e) => { table_dblclick(e) })
// 	// byId('table_explore_parent').addEventListener('dblclick', (e) => { table_dblclick(e) })

// 	// byId('table_missing_parent').addEventListener('contextmenu', (e) => { table_handler(e, 'table_missing') })
// 	// byId('table_explore_parent').addEventListener('contextmenu', (e) => { table_handler(e, 'table_explore') })
// })