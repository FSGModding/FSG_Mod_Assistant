//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Main Program

// (c) 2021 JTSage.  MIT License.

const { app, BrowserWindow } = require('electron')
const path       = require('path')
const {ipcMain}  = require('electron')  
const translator = require('./translations/translate.js');
const modReader  = require('./fs-mod-parse/mod-reader');

let myTranslator = new translator("de");

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