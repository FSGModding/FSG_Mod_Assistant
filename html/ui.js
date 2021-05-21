//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Renderer Thread - UI Functions

// (c) 2021 JTSage.  MIT License.

const {ipcRenderer} = require('electron');

ipcRenderer.on('trigger-i18n', (event, arg) => { doI18n(); });

doI18n = function() {
	for (const item of document.getElementsByClassName("i18n")) {
		item.innerHTML = ipcRenderer.sendSync('i18n-translate', item.getAttribute('data-i18n'));
	}
}

