//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Renderer Thread - UI Functions

// (c) 2021 JTSage.  MIT License.

const {ipcRenderer} = require('electron');

ipcRenderer.on('trigger-i18n', () => { doI18n(); });
ipcRenderer.on('statusUpdate', (event, arg) => { document.getElementById("process_percentage_bar").style.width = arg + "%"; });
ipcRenderer.on('processModsDone', (event, arg) => {
	document.getElementById("process_percentage").classList.add("d-none");
	document.getElementById("process_percentage_done").classList.remove("d-none");
	document.getElementById("button_process").classList.remove("disabled");
	document.getElementById("button_load").classList.remove("disabled");
	// TODO: update all the data now!
});

ipcRenderer.on('newFileConfig', (event, arg) => {
	if ( arg.error ) {
		document.getElementById("load_error").classList.remove("d-none");
	} else {
		document.getElementById("load_error").classList.add("d-none");
	}
	if ( arg.valid ) {
		document.getElementById("button_process").classList.remove("disabled");
	} else {
		document.getElementById("button_process").classList.add("disabled");
	}
	
	document.getElementById("location_savegame_folder").innerHTML = arg.saveDir;
	document.getElementById("location_mod_folder").innerHTML = arg.modDir;
	document.getElementById("process_percentage_done").classList.add("d-none");
	document.getElementById("process_percentage").classList.add("d-none");
});

doI18n = function() {
	for (const item of document.getElementsByClassName("i18n")) {
		item.innerHTML = ipcRenderer.sendSync('i18n-translate', item.getAttribute('data-i18n'));
	}
}

processButton = () => {
	ipcRenderer.send('processMods');
	document.getElementById("button_process").classList.add("disabled");
	document.getElementById("button_load").classList.add("disabled");
	document.getElementById("process_percentage_done").classList.add("d-none");
	document.getElementById("process_percentage").classList.remove("d-none");
}

loadButton = () => { ipcRenderer.send('openConfigFile'); }

