const { app, BrowserWindow } = require('electron')
const path = require('path')
const {ipcMain} = require('electron')  
const modReader = require('./fs-mod-parse/mod-reader');
const translator = require('./translations/translate.js');

let myTranslator = new translator("de");

function _(stringID){	
	myTranslator.stringLookup(stringID);
}

function createWindow () {
	const win = new BrowserWindow({
		width: 1000,
		height: 700,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			preload: path.join(__dirname, 'preload.js')
		}
	})

	win.loadFile(path.join(__dirname, 'html', 'index.html'))

	win.webContents.on('did-finish-load', (e) => {
		e.sender.send('trigger-i18n');
	})
}

ipcMain.on('i18n-translate', (event, arg) => {
	event.returnValue = myTranslator.stringLookup(arg);
})



// ipcMain.handle('i18n-translate', async (event, ...args) => {
// 	console.log(...args);
	
// 	return _(...args);
// });

app.whenReady().then(() => {
	createWindow()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	})
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})