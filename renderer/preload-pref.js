//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Mod File Parser - Electron Preload (Preferences Window)
//  (IPC and UI triggers that interact with the browser process)

// (c) 2021 JTSage.  MIT License.

const {contextBridge, ipcRenderer} = require('electron')

const byId     = (domID) => { return document.getElementById(domID) }

contextBridge.exposeInMainWorld(
	'ipc',
	{
		setLockLang : () => {
			ipcRenderer.send('setPreference', 'lock_lang', byId('lock_lang').checked )
		},
		setRememberLast : () => {
			ipcRenderer.send('setPreference', 'remember_last', byId('remember_last').checked )
		},
		setMainWindowX : () => {
			ipcRenderer.send('setPreference', 'main_window_x', parseInt(byId('main_window_x').value))
		},
		setMainWindowY : () => {
			ipcRenderer.send('setPreference', 'main_window_y', parseInt(byId('main_window_y').value))
		},
		setMainWindowMax : () => {
			ipcRenderer.send('setPreference', 'main_window_max', byId('main_window_max').checked)
		},

		setDetailWindowX : () => {
			ipcRenderer.send('setPreference', 'detail_window_x', parseInt(byId('detail_window_x').value))
		},
		setDetailWindowY : () => {
			ipcRenderer.send('setPreference', 'detail_window_y', parseInt(byId('detail_window_y').value))
		},
		setDetailWindowMax : () => {
			ipcRenderer.send('setPreference', 'detail_window_max', byId('detail_window_max').checked)
		},

		setUseMove : () => {
			// only if turning it off
			if ( byId('use_move').checked === false ) {
				
				ipcRenderer.send('setPreference', 'use_move', false)
				ipcRenderer.send('setPreference', 'move_destination', null)
				ipcRenderer.send('refreshPreferences')
			} else {
				ipcRenderer.send('refreshPreferences')
				return false
			}
		},

		chooseMoveFolder : () => {
			ipcRenderer.send('setMoveFolder')
		},
		openCleanDir : () => {
			ipcRenderer.send('openCleanDir')
		},

	}
)

ipcRenderer.on('got-pref-settings', (event, allPrefs, lang) => {
	console.log('here we are!!!')
	console.log({ allPrefs : allPrefs, lang : lang })

	byId('lock_lang').checked = ( 'lock_lang' in allPrefs ) ? allPrefs.lock_lang : false
	byId('current_lang').innerHTML = lang

	byId('remember_last').checked = ( 'remember_last' in allPrefs ) ? allPrefs.remember_last : true
	byId('current_gamesettings').innerHTML = ( 'gamesettings' in allPrefs ) ? allPrefs.gamesettings : '--'

	byId('main_window_x').value = ( 'main_window_x' in allPrefs ) ? allPrefs.main_window_x : 1000
	byId('main_window_y').value = ( 'main_window_y' in allPrefs ) ? allPrefs.main_window_y : 700
	byId('main_window_max').checked = ( 'main_window_max' in allPrefs ) ? allPrefs.main_window_max : false
	
	byId('detail_window_x').value = ( 'detail_window_x' in allPrefs ) ? allPrefs.detail_window_x : 800
	byId('detail_window_y').value = ( 'detail_window_y' in allPrefs ) ? allPrefs.detail_window_y : 500
	byId('detail_window_max').checked = ( 'detail_window_max' in allPrefs ) ? allPrefs.detail_window_max : false

	byId('use_move').checked = ( 'use_move' in allPrefs ) ? allPrefs.use_move : false
	byId('move_destination').innerHTML = ( 'move_destination' in allPrefs ) ? allPrefs.move_destination : false
})

/*
  _____  _____  _______   _______  ______ _______ __   _ _______        _______ _______ _______
    |   |_____] |       .    |    |_____/ |_____| | \  | |______ |      |_____|    |    |______
  __|__ |       |_____  .    |    |    \_ |     | |  \_| ______| |_____ |     |    |    |______
                                                                                               
*/

ipcRenderer.on('trigger-i18n', () => {
	/* Get all i18n items in the UI and translate them */
	const sendSet = new Set()
	for (const item of document.getElementsByClassName('i18n')) {
		sendSet.add(item.getAttribute('data-i18n'))
	}
	sendSet.forEach( (thisStringID ) => {
		ipcRenderer.send('i18n-translate', thisStringID)
	})
})

ipcRenderer.on('i18n-translate-return', (event, dataPoint, newText) => {
	/* Receive the translated text of an i18n item, update it everywhere it appears */
	const changeThese = document.querySelectorAll(`[data-i18n='${dataPoint}']`)
	changeThese.forEach((changeThis) => {
		changeThis.innerHTML = newText
	})
})

