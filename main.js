//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Main Program

// (c) 2021 JTSage.  MIT License.

const { app, BrowserWindow } = require('electron')
const path       = require('path')
const {ipcMain}  = require('electron')
const xml2js     = require('xml2js');
const translator = require('./translations/translate.js');
const modReader  = require('./fs-mod-parse/mod-reader');

let myTranslator = new translator("de");
var location_savegame;
var location_modfolder;
var location_valid = false;
var modList;

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

ipcMain.on('openConfigFile', (event, arg) => {
	const {dialog} = require('electron') 
	const fs = require('fs');
	const homedir = require('os').homedir();

	dialog.showOpenDialog({
		properties: ['openFile'],
		defaultPath: path.join(homedir, "Documents" , "My Games", "FarmingSimulator2019" ),
		filters: [
			{ name: 'XML', extensions: ['xml'] },
			{ name: 'All', extensions: ['*'] }
		]
	}).then(result => {
		if ( result.canceled ) {
			location_valid = false;
			event.sender.send("newFileConfig", {valid: false, error: false, saveDir:"--", modDir:"--"});
		} else {
			var XMLOptions = {strict : true, async: false, normalizeTags: true, attrNameProcessors : [function(name) { return name.toUpperCase();} ]};
			var strictXMLParser = new xml2js.Parser(XMLOptions);

			location_savegame = path.dirname(result.filePaths[0]);

			strictXMLParser.parseString(fs.readFileSync(result.filePaths[0]), (xmlErr, xmlTree) => {
				var overrideAttr;

				try {
					overrideAttr = xmlTree["gamesettings"]["modsdirectoryoverride"][0]['$'];
				} catch {
					overrideAttr = false;
					location_valid = false;
					event.sender.send("newFileConfig", {valid: false, error:true, saveDir:"--", modDir:"--"});
				}

				if ( overrideAttr !== false ) {
					if ( overrideAttr.ACTIVE == "true" ) {
						location_modfolder = overrideAttr.DIRECTORY;
					} else {
						location_modfolder = path.join(location_savegame, "mods");
					}

					location_valid = true;
					event.sender.send("newFileConfig", {valid: true, error:false, saveDir:location_savegame, modDir:location_modfolder });
				}
			});
		}
	}).catch(err => {
		console.log(err)
	})
})

ipcMain.on('processMods', (event, arg) => {
	if ( location_valid ) {
		modList = new modReader(
			location_savegame,
			location_modfolder,
			( arg ) => event.sender.send("statusUpdate", arg),
			myTranslator.stringLookup("language_code"));
	} else {
		console.log("Something Went Wrong"); // TODO: handle UI got process, was not ready
	}

	event.sender.send("processModsDone"); // TODO: reading went wrong somehow?  catch errors?
});


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