//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Mod File Parser - Electron Preload
//  (IPC and UI triggers that interact with the browser process)

// (c) 2021 JTSage.  MIT License.

const {contextBridge, ipcRenderer} = require('electron')

const byId     = (domID) => { return document.getElementById(domID) }
const classAdd = (domID, className) => { document.getElementById(domID).classList.add(className) }
const classRem = (domID, className) => { document.getElementById(domID).classList.remove(className) }

const buildOpt = (value, text, selected) => {
	return "<option value=\"" + value + "\"" + (( value == selected ) ? " selected>" : ">") + text + "</option>"
}


ipcRenderer.on('trigger-i18n-select', (event, langList, locale) => {
	let newOptions = ""
	langList.forEach((lang) => { newOptions += buildOpt(lang[0], lang[1], locale) })
	byId("language_select").innerHTML = newOptions
})

ipcRenderer.on('trigger-i18n', () => {
	let sendSet = new Set()
	for (const item of document.getElementsByClassName("i18n")) {
		sendSet.add(item.getAttribute('data-i18n'))
	}
	sendSet.forEach( (thisStringID ) => {
		ipcRenderer.send('i18n-translate', thisStringID)
	})
})

ipcRenderer.on('i18n-translate-return', (event, dataPoint, newText) => {
	let changeThese = document.querySelectorAll("[data-i18n='" + dataPoint + "']")
	changeThese.forEach((changeThis) => {
		changeThis.innerHTML = newText
	})
})

ipcRenderer.on('newFileConfig', (event, arg) => {
	if ( arg.error ) {
		classRem("load_error", "d-none")
	} else {
		classAdd("load_error", "d-none")
	}
	
	if ( arg.valid ) {
		classRem("button_process", "disabled")
	} else {
		classAdd("button_process", "disabled")
	}
		
	byId("location_savegame_folder").innerHTML = arg.saveDir
	byId("location_mod_folder").innerHTML      = arg.modDir

	classAdd("process_bar_working", "d-none")
	classAdd("process_bar_done", "d-none")
})



contextBridge.exposeInMainWorld(
	'ipc', 
	{
		changeLangList : () => { 
			ipcRenderer.send("i18n-change-locale", byId("language_select").value)
		},
		loadButton : () => {
			ipcRenderer.send('openConfigFile')
		}
	}
)




window.addEventListener('DOMContentLoaded', () => {
	// Do nothing on load.  Leaving this here until I'm sure I don't need it.
})