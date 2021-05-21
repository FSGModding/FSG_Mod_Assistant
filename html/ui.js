const {ipcRenderer} = require('electron');
//let $ = require('jquery');

ipcRenderer.on('trigger-i18n', (event, arg) => {
	doI18n();
});

doI18n = function() {
	for (const item of document.getElementsByClassName("i18n")) {
		item.innerHTML = ipcRenderer.sendSync('i18n-translate', item.getAttribute('data-i18n'));
	}
}

