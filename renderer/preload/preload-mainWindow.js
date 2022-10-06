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
		openMod   : (modID) => { ipcRenderer.send('toMain_openModDetail', modID) },


		receive   : ( channel, func ) => {
			const validChannels = [
				'fromMain_modList',
				'fromMain_showLoading',
				'fromMain_hideLoading',
				'fromMain_loadingTotal',
				'fromMain_loadingDone'
			]
		
			if ( validChannels.includes( channel ) ) {
				ipcRenderer.on( channel, ( event, ...args ) => func( ...args ))
			}
		},
	}
)


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