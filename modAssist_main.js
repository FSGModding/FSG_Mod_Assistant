/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main Program



//const { app, Menu, BrowserWindow, ipcMain, globalShortcut, shell, dialog, screen } = require('electron')
const { app, BrowserWindow, ipcMain, globalShortcut, dialog, screen } = require('electron')

// const { autoUpdater } = require('electron-updater')

const devDebug = true

// if (process.platform === 'win32') {
// 	autoUpdater.checkForUpdatesAndNotify()
// }

const path       = require('path')
const fs         = require('fs')


const translator               = require('./lib/translate.js')
const { mcLogger }             = require('./lib/logger.js')
const { modFileChecker }       = require('./lib/single-mod-checker.js')
const mcDetail                 = require('./package.json')


const Store   = require('electron-store')
const mcStore = new Store()

const myTranslator     = new translator.translator(translator.getSystemLocale())
myTranslator.mcVersion = mcDetail.version


const logger = new mcLogger()


let modFolders = new Set()
let modList    = {}

let win          = null // Main window
let splash       = null // Splash screen
let detailWindow = null // Detail window
//let prefWindow   = null // Preferences window

let workWidth  = 0
let workHeight = 0





/*
  _______ _______ _____ __   _      _  _  _ _____ __   _ ______   _____  _  _  _
  |  |  | |_____|   |   | \  |      |  |  |   |   | \  | |     \ |     | |  |  |
  |  |  | |     | __|__ |  \_|      |__|__| __|__ |  \_| |_____/ |_____| |__|__|
                                                                                
*/
function createWindow () {
	win = new BrowserWindow({
		icon            : path.join(app.getAppPath(), 'build', 'icon.png'),
		width           : mcStore.get('main_window_x', 1000),
		height          : mcStore.get('main_window_y', 700),
		show            : devDebug,
		autoHideMenuBar : !devDebug,
		webPreferences  : {
			nodeIntegration  : false,
			contextIsolation : true,
			preload          : path.join(app.getAppPath(), 'renderer', 'preload', 'preload-mainWindow.js'),
		},
	})



	if ( !devDebug ) {
		splash = new BrowserWindow({
			width           : 500,
			height          : 250,
			transparent     : true,
			frame           : false,
			alwaysOnTop     : true,
			autoHideMenuBar : true,
		})
		
		const pos_left = (workWidth / 2)  - ( 500 / 2 )
		const pos_top  = (workHeight / 2) - ( 250 / 2 )

		splash.setPosition(pos_left, pos_top)

		splash.loadURL(`file://${path.join(app.getAppPath(), 'renderer', 'splash.html')}?version=${mcDetail.version}`)

		win.removeMenu()

		win.once('ready-to-show', () => {
			setTimeout(() => {
				win.show()
				splash.destroy()
			}, 1500)
		})
	}



	if ( mcStore.has('main_window_max') && mcStore.get('main_window_max') ) {
		win.maximize()
	}

	win.loadFile(path.join(app.getAppPath(), 'renderer', 'main.html'))

	
	win.webContents.on('did-finish-load', () => {
		const showCount = setInterval(() => {
			if ( win.isVisible() ) {
				clearInterval(showCount)
				if ( mcStore.has('modFolders') ) {
					modFolders = new Set(mcStore.get('modFolders'))
					processModFolders()
				}
			}
		}, 250)


		myTranslator.stringLookup('title').then((title) => {
			win.title = title
		})
	})
	win.webContents.setWindowOpenHandler(({ url }) => {
		require('electron').shell.openExternal(url)
		return { action : 'deny' }
	})
	
}



ipcMain.on('toMain_addFolder', () => {
	const homedir  = require('os').homedir()
	
	dialog.showOpenDialog(win, {
		properties  : ['openDirectory'],
		defaultPath : homedir,
	}).then((result) => {
		if ( result.canceled ) {
			logger.notice('folderList', 'Add folder :: canceled')
		} else {
			let alreadyExists = false
			modFolders.forEach((thisPath) => {
				if ( path.relative(thisPath, result.filePaths[0]) === '' ) { alreadyExists = true }
			})
			if ( ! alreadyExists ) {
				modFolders.add(result.filePaths[0])
			}

			mcStore.set('modFolders', Array.from(modFolders))
			processModFolders(result.filePaths[0])
		}
	}).catch((unknownError) => {
		// Read of file failed? Permissions issue maybe?  Not sure.
		logger.notice('folderList', `Could not read specified add folder : ${unknownError}`)
	})
})

/*
  _____  _____  _______   _______  ______ _______ __   _ _______        _______ _______ _______
    |   |_____] |       .    |    |_____/ |_____| | \  | |______ |      |_____|    |    |______
  __|__ |       |_____  .    |    |    \_ |     | |  \_| ______| |_____ |     |    |    |______
                                                                                               
*/

ipcMain.on('toMain_langList_change', (event, lang) => {
	myTranslator.currentLocale = lang
	event.sender.send('fromMain_l10n_refresh')
})

ipcMain.on('toMain_langList_send', (event) => {
	myTranslator.getLangList().then((langList) => {
		event.sender.send('fromMain_langList_return', langList, myTranslator.deferCurrentLocale())
	})
})

ipcMain.on('toMain_getText_send', (event, l10nSet) => {
	l10nSet.forEach((l10nEntry) => {
		if ( l10nEntry === 'app_version' ) {
			event.sender.send('fromMain_getText_return', [l10nEntry, mcDetail.version])
		} else {
			myTranslator.stringLookup(l10nEntry).then((text) => {
				event.sender.send('fromMain_getText_return', [l10nEntry, text])
			})
		}
	})
})

/*
  ______  _______ _______ _______ _____             _  _  _ _____ __   _ ______   _____  _  _  _
  |     \ |______    |    |_____|   |   |           |  |  |   |   | \  | |     \ |     | |  |  |
  |_____/ |______    |    |     | __|__ |_____      |__|__| __|__ |  \_| |_____/ |_____| |__|__|
                                                                                                
*/


ipcMain.on('toMain_openModDetail', (event, thisMod) => {
	const thisModParts  = thisMod.split('--')
	let   thisModDetail = null
	let   foundMod      = false

	try {
		modList[thisModParts[0]].mods.forEach((checkMod) => {
			if ( !foundMod && checkMod.uuid === thisModParts[1] ) {
				foundMod      = true
				thisModDetail = checkMod
			}
		})
	} catch (e) {
		this.log.info('detail', `Request for ${thisMod} failed: ${e}`)
	}
	if ( thisModDetail !== null ) {
		openDetailWindow(thisModDetail)
	}
})


function openDetailWindow(thisModRecord) {
	if (detailWindow) { detailWindow.focus(); return }

	thisModRecord.populateL10n()
	thisModRecord.populateIcon()

	detailWindow = new BrowserWindow({
		icon            : path.join(app.getAppPath(), 'build', 'icon.png'),
		width           : mcStore.get('detail_window_x', 800),
		height          : mcStore.get('detail_window_y', 500),
		title           : thisModRecord.l10n.title,
		minimizable     : false,
		maximizable     : true,
		fullscreenable  : false,
		autoHideMenuBar : !devDebug,
		webPreferences  : {
			nodeIntegration  : false,
			contextIsolation : true,
			preload          : path.join(app.getAppPath(), 'renderer', 'preload', 'preload-detailWindow.js'),
		},
	})

	if ( mcStore.has('detail_window_max') && mcStore.get('detail_window_max') ) {
		detailWindow.maximize()
	}

	if ( !devDebug ) { detailWindow.removeMenu() }

	detailWindow.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_modRecord', thisModRecord)
		detailWindow.webContents.openDevTools()
	})

	detailWindow.loadFile(path.join(app.getAppPath(), 'renderer', 'detail.html'))

	detailWindow.on('closed', () => { detailWindow = null })
}









/*
  ______  _______ ______  _     _  ______      _  _  _ _____ __   _ ______   _____  _  _  _
  |     \ |______ |_____] |     | |  ____      |  |  |   |   | \  | |     \ |     | |  |  |
  |_____/ |______ |_____] |_____| |_____|      |__|__| __|__ |  \_| |_____/ |_____| |__|__|
                                                                                           
*/
let debugWindow = null

function openDebugWindow(logClass) {
	if (debugWindow) { debugWindow.focus(); return }

	debugWindow = new BrowserWindow({
		icon            : path.join(app.getAppPath(), 'build', 'icon.png'),
		width           : 800,
		height          : 500,
		title           : 'Debug Log',
		minimizable     : false,
		fullscreenable  : false,
		autoHideMenuBar : !devDebug,
		webPreferences  : {
			nodeIntegration  : false,
			contextIsolation : true,
			preload          : path.join(app.getAppPath(), 'renderer', 'preload', 'preload-debugWindow.js'),
		},
	})
	if ( !devDebug ) { debugWindow.removeMenu() }

	debugWindow.webContents.on('did-finish-load', (event) => {
		const logContents = logClass.toDisplayHTML
		event.sender.send('update-log', logContents)
	})

	debugWindow.loadFile(path.join(app.getAppPath(), 'renderer', 'debug.html'))

	debugWindow.on('closed', () => { debugWindow = null })
}

ipcMain.on('openDebugLogContents', () => { openDebugWindow(logger) })
ipcMain.on('getDebugLogContents',  (event) => { event.sender.send('update-log', logger.toDisplayHTML) })
ipcMain.on('saveDebugLogContents', () => {
	const homedir  = require('os').homedir()

	dialog.showSaveDialog(win, {
		defaultPath : path.join(homedir, 'Documents', 'modCheckDebugLog.txt' ),
		filters     : [
			{ name : 'TXT', extensions : ['txt'] },
			{ name : 'All', extensions : ['*'] },
		],
	}).then(async (result) => {
		if ( result.canceled ) {
			logger.notice('logger', 'Save log file canceled')
		} else {
			const logContents = logger.toDisplayText

			try {
				fs.writeFileSync(result.filePath, logContents)
				dialog.showMessageBoxSync(win, {
					message : await myTranslator.stringLookup('save_log_worked'),
					type    : 'info',
				})
			} catch (err) {
				logger.fileError('logger', `Could not save log file : ${err}`)
				dialog.showMessageBoxSync(win, {
					message : await myTranslator.stringLookup('save_log_failed'),
					type    : 'warning',
				})
			}
		}
	}).catch((unknownError) => {
		// Save of file failed? Permissions issue maybe?  Not sure.
		logger.fileError('logger', `Could not save log file : ${unknownError}`)
	})
})







/*
   _____   ______ _______ _______ _______  ______ _______ __   _ _______ _______ _______
  |_____] |_____/ |______ |______ |______ |_____/ |______ | \  | |       |______ |______
  |       |    \_ |______ |       |______ |    \_ |______ |  \_| |_____  |______ ______|
                                                                                        
*/

// ipcMain.on('askOpenPreferencesWindow', () => {
// 	openPrefWindow()
// })

// ipcMain.on('setPreference', (event, settingName, settingValue) => {
// 	if ( settingName === 'lock_lang') {
// 		if ( settingValue === true ) {
// 			mcStore.set('force_lang', myTranslator.currentLocale)
// 			mcStore.set('lock_lang', true)
// 		} else {
// 			mcStore.delete('force_lang')
// 			mcStore.set('lock_lang', false)
// 		}
// 	} else {
// 		mcStore.set(settingName, settingValue)
// 	}
// })

// ipcMain.on('refreshPreferences', (event) => {
// 	event.sender.send(
// 		'got-pref-settings',
// 		mcStore.store,
// 		myTranslator.syncStringLookup('language_name')
// 	)
// })

// function openPrefWindow() {
// 	if (prefWindow) {
// 		prefWindow.focus()
// 		return
// 	}

// 	prefWindow = new BrowserWindow({
// 		icon            : path.join(app.getAppPath(), 'build', 'icon.png'),
// 		width           : 800,
// 		height          : 500,
// 		title           : myTranslator.syncStringLookup('user_pref_title_main'),
// 		minimizable     : false,
// 		fullscreenable  : false,
// 		autoHideMenuBar : !devDebug,
// 		webPreferences  : {
// 			nodeIntegration  : false,
// 			contextIsolation : true,
// 			preload          : path.join(app.getAppPath(), 'renderer', 'preload-pref.js'),
// 		},
// 	})
// 	if ( !devDebug ) { prefWindow.removeMenu() }

// 	prefWindow.webContents.on('did-finish-load', (event) => {
// 		event.sender.send(
// 			'got-pref-settings',
// 			mcStore.store,
// 			myTranslator.syncStringLookup('language_name')
// 		)
// 		event.sender.send('trigger-i18n')
// 	})

// 	prefWindow.loadFile(path.join(app.getAppPath(), 'renderer', 'prefs.html'))

// 	prefWindow.on('closed', () => {
// 		prefWindow = null
// 	})
// }




function processModFolders(newFolder = false) {
	win.webContents.send('fromMain_showLoading')

	if ( newFolder === false ) { modList = {} }

	modFolders.forEach((folder) => {
		const cleanName = folder.replaceAll('\\', '-').replaceAll(':', '').replaceAll(' ', '_')
		const shortName = path.basename(folder)
		if ( folder === newFolder || newFolder === false ) {
			modList[cleanName] = { name : shortName, mods : [] }

			const folderContents = fs.readdirSync(folder, {withFileTypes : true})

			folderContents.forEach((thisFile) => {
				let isFolder = false
				
				if ( thisFile.isSymbolicLink() ) {
					const thisSymLink     = fs.readlinkSync(path.join(folder, thisFile.name))
					const thisSymLinkStat = fs.lstatSync(path.join(folder, thisSymLink))
					isFolder = thisSymLinkStat.isDirectory()
				} else {
					isFolder = thisFile.isDirectory()
				}

				console.log(isFolder)
				modList[cleanName].mods.push( new modFileChecker(
					path.join(folder, thisFile.name),
					isFolder,
					logger,
					myTranslator.deferCurrentLocale
				))
			})
		}
	})
	win.webContents.send('fromMain_modList', modList)
	win.webContents.send('fromMain_hideLoading')
}








/*
  _______  _____   _____     ______ _______ _______ ______  __   __
  |_____| |_____] |_____] . |_____/ |______ |_____| |     \   \_/  
  |     | |       |       . |    \_ |______ |     | |_____/    |   
                                                                   
*/


app.whenReady().then(() => {
	globalShortcut.register('Alt+CommandOrControl+D', () => { openDebugWindow(logger) })

	workWidth  = screen.getPrimaryDisplay().size.width
	workHeight = screen.getPrimaryDisplay().size.height
	
	if ( mcStore.has('force_lang') && mcStore.has('lock_lang') ) {
		// If language is locked, switch to it.
		myTranslator.currentLocale = mcStore.get('force_lang')
	}

	createWindow()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) { createWindow() }
	})
})

app.setAboutPanelOptions({
	applicationName    : 'FS Mod Assist',
	applicationVersion : mcDetail.version,
	copyright          : '(c) 2022-present FSG Modding',
	credits            : 'J.T.Sage <jtsage+datebox@gmail.com>',
	website            : 'https://github.com/FSGModding/FSG_Mod_Assistant',
	iconPath           : path.join(app.getAppPath(), 'build', 'icon.png'),
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') { app.quit() }
})
