//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Renderer Thread - UI Functions

// (c) 2021 JTSage.  MIT License.

const {ipcRenderer} = require('electron');
const byId = function( id ) { return document.getElementById( id ); }

ipcRenderer.on('trigger-i18n', () => { doI18n(); }); // TODO: CRITICAL: this needs to be async
ipcRenderer.on('trigger-i18n-select', (event, langList, locale) => { doLangList(langList, locale); });
ipcRenderer.on('statusUpdate', (event, arg) => { byId("process_percentage_bar").style.width = arg + "%"; });
ipcRenderer.on('processModsDone', (event, arg) => {
	byId("process_percentage").classList.add("d-none");
	byId("process_percentage_done").classList.remove("d-none");
	byId("button_process").classList.remove("disabled");
	byId("button_load").classList.remove("disabled");
	// TODO: update all the data now!
});

ipcRenderer.on('newFileConfig', (event, arg) => {
	if ( arg.error ) {
		byId("load_error").classList.remove("d-none");
	} else {
		byId("load_error").classList.add("d-none");
	}
	if ( arg.valid ) {
		byId("button_process").classList.remove("disabled");
	} else {
		byId("button_process").classList.add("disabled");
	}
	
	byId("location_savegame_folder").innerHTML = arg.saveDir;
	byId("location_mod_folder").innerHTML = arg.modDir;
	byId("process_percentage_done").classList.add("d-none");
	byId("process_percentage").classList.add("d-none");
});

doI18n = function() {
	for (const item of document.getElementsByClassName("i18n")) {
		item.innerHTML = ipcRenderer.sendSync('i18n-translate', item.getAttribute('data-i18n'));
	}
}
doLangList = function(allLangs, locale) {
	var newOptions = ""
	allLangs.forEach((lang) => {
		newOptions += "<option value=\"" + lang[0] + "\"" + ((locale == lang[0]) ? " selected" : "") + ">"  + lang[1] + "</option>";
	})
	byId("language_select").innerHTML = newOptions
}

changeLangList = () => {
	ipcRenderer.send("i18n-change-locale", byId("language_select").value);
}

processButton = () => {
	ipcRenderer.send('processMods');
	byId("button_process").classList.add("disabled");
	byId("button_load").classList.add("disabled");
	byId("process_percentage_done").classList.add("d-none");
	byId("process_percentage").classList.remove("d-none");
}

loadButton = () => { ipcRenderer.send('openConfigFile'); }

