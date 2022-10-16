/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main Program


const { app, BrowserWindow, ipcMain, globalShortcut, shell, dialog, screen } = require('electron')

const { autoUpdater } = require('electron-updater')

const devDebug  = true
const skipCache = false

if (process.platform === 'win32') {
	autoUpdater.checkForUpdatesAndNotify()
}

const path       = require('path')
const fs         = require('fs')
const glob       = require('glob')
const xml2js     = require('xml2js')
const crypto     = require('crypto')

const userHome      = require('os').homedir()
const pathRender    = path.join(app.getAppPath(), 'renderer')
const pathPreload   = path.join(pathRender, 'preload')
const pathIcon      = path.join(app.getAppPath(), 'build', 'icon.ico')
let   pathBestGuess = path.join(userHome, 'OneDrive', 'Documents', 'My Games', 'FarmingSimulator2022')

if ( ! fs.existsSync(pathBestGuess) ) {
	pathBestGuess = path.join(userHome, 'Documents', 'My Games', 'FarmingSimulator2022')
}

const translator                            = require('./lib/translate.js')
const { mcLogger }                          = require('./lib/logger.js')
const { modFileChecker, notModFileChecker } = require('./lib/single-mod-checker.js')
const mcDetail                              = require('./package.json')

const settingsSchema = {
	main_window_x     : { type : 'number', maximum : 4096, minimum : 100, default : 1000 },
	main_window_y     : { type : 'number', maximum : 4096, minimum : 100, default : 700 },
	main_window_max   : { type : 'boolean', default : false },
	detail_window_x   : { type : 'number', maximum : 4096, minimum : 100, default : 800 },
	detail_window_y   : { type : 'number', maximum : 4096, minimum : 100, default : 500 },
	detail_window_max : { type : 'boolean', default : false },
	modFolders        : { type : 'array', default : [] },
	lock_lang         : { type : 'boolean', default : false },
	force_lang        : { type : 'string', default : '' },
	game_settings     : { type : 'string', default : path.join(pathBestGuess, 'gameSettings.xml') },
}

const Store   = require('electron-store')
const { saveFileChecker } = require('./lib/savegame-parser.js')
const mcStore = new Store({schema : settingsSchema})
const maCache = new Store({name : 'mod_cache'})

const newModsList = []

const myTranslator     = new translator.translator(translator.getSystemLocale())
myTranslator.mcVersion = mcDetail.version

const logger = new mcLogger()

let modFolders    = new Set()
let modFoldersMap = {}
let modList       = {}
let countTotal    = 0
let countMods     = 0

const ignoreList = [
	'^npm-debug\\.log$',
	'^\\..*\\.swp$',
	'^Thumbs\\.db$',
	'^thumbs\\.db$',
	'^ehthumbs\\.db$',
	'^Desktop\\.ini$',
	'^desktop\\.ini$',
	'@eaDir$',
]

const junkRegex = new RegExp(ignoreList.join('|'))

const windows = {
	main    : null,
	splash  : null,
	confirm : null,
	detail  : null,
	prefs   : null,
	folder  : null,
	debug   : null,
	save    : null,
	version : null,
}

let foldersDirty = true

let workWidth  = 0
let workHeight = 0

let gameSettings    = mcStore.get('game_settings')
let gameSettingsXML = null
let overrideFolder  = null
let overrideIndex   = '999'
let overrideActive  = null



/*  _    _  ____  _  _  ____   _____  _    _  ___ 
   ( \/\/ )(_  _)( \( )(  _ \ (  _  )( \/\/ )/ __)
    )    (  _)(_  )  (  )(_) ) )(_)(  )    ( \__ \
   (__/\__)(____)(_)\_)(____/ (_____)(__/\__)(___/ */

function createMainWindow () {
	windows.main = new BrowserWindow({
		icon            : pathIcon,
		width           : mcStore.get('main_window_x', 1000),
		height          : mcStore.get('main_window_y', 700),
		title           : myTranslator.syncStringLookup('app_name'),
		show            : devDebug,
		autoHideMenuBar : !devDebug,
		webPreferences  : {
			nodeIntegration  : false,
			contextIsolation : true,
			preload          : path.join(pathPreload, 'preload-mainWindow.js'),
		},
	})


	if ( !devDebug ) {
		windows.splash = new BrowserWindow({
			width           : 600,
			height          : 300,
			transparent     : true,
			frame           : false,
			alwaysOnTop     : true,
			autoHideMenuBar : true,
		})
		
		const pos_left = (workWidth / 2)  - ( 600 / 2 )
		const pos_top  = (workHeight / 2) - ( 300 / 2 )

		windows.splash.setPosition(pos_left, pos_top)
		windows.splash.loadURL(`file://${path.join(pathRender, 'splash.html')}?version=${mcDetail.version}`)

		windows.main.removeMenu()
		windows.main.once('ready-to-show', () => {
			setTimeout(() => { windows.main.show(); windows.splash.destroy() }, 2000)
		})
	}

	if ( mcStore.get('main_window_max', false) ) { windows.main.maximize() }

	windows.main.loadFile(path.join(pathRender, 'main.html'))

	windows.main.webContents.on('did-finish-load', () => {
		const showCount = setInterval(() => {
			if ( windows.main.isVisible() ) {
				clearInterval(showCount)
				if ( mcStore.has('modFolders') ) {
					modFolders   = new Set(mcStore.get('modFolders'))
					foldersDirty = true
					setTimeout(() => { processModFolders() }, 1500)
				}
				if ( devDebug ) { windows.main.webContents.openDevTools() }
			}
		}, 250)
	})
	
	windows.main.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url)
		return { action : 'deny' }
	})
}

function createConfirmWindow(type, modRecords, origList) {
	if ( windows.confirm ) { windows.confirm.focus(); return }

	const file_HTML  = `confirm-file${type.charAt(0).toUpperCase()}${type.slice(1)}.html`
	const file_JS    = `preload-confirm${type.charAt(0).toUpperCase()}${type.slice(1)}.js`
	const collection = origList[0].split('--')[0]

	windows.confirm = new BrowserWindow({
		icon            : pathIcon,
		width           : 750,
		height          : 500,
		alwaysOnTop     : true,
		title           : myTranslator.syncStringLookup('app_name'),
		autoHideMenuBar : !devDebug,
		webPreferences  : {
			nodeIntegration  : false,
			contextIsolation : true,
			preload          : path.join(pathPreload, file_JS),
		},
	})

	const pos_left = (workWidth / 2)  - ( 750 / 2 )
	const pos_top  = (workHeight / 2) - ( 500 / 2 )

	windows.confirm.setPosition(pos_left, pos_top)

	if ( !devDebug ) { windows.confirm.removeMenu() }

	windows.confirm.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_confirmList', modRecords, modList, modFoldersMap, collection)
	})

	windows.confirm.loadFile(path.join(pathRender, file_HTML))

	windows.confirm.on('closed', () => { windows.confirm = null; windows.main.focus() })
}

function createFolderWindow() {
	if ( windows.folder ) { windows.folder.focus(); return }

	windows.folder = new BrowserWindow({
		icon            : pathIcon,
		width           : mcStore.get('detail_window_x', 800),
		height          : mcStore.get('detail_window_y', 500),
		title           : myTranslator.syncStringLookup('app_name'),
		minimizable     : false,
		maximizable     : true,
		fullscreenable  : false,
		autoHideMenuBar : !devDebug,
		webPreferences  : {
			nodeIntegration  : false,
			contextIsolation : true,
			preload          : path.join(pathPreload, 'preload-folderWindow.js'),
		},
	})

	if ( !devDebug ) { windows.folder.removeMenu() }

	windows.folder.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_getFolders', modList)
	})

	windows.folder.loadFile(path.join(pathRender, 'folders.html'))
	windows.folder.on('closed', () => { windows.folder = null; windows.main.focus(); processModFolders() })
}

function createDetailWindow(thisModRecord) {
	if ( windows.detail ) { windows.detail.focus(); return }

	thisModRecord.currentLocale = translator.currentLocale

	windows.detail = new BrowserWindow({
		icon            : pathIcon,
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
			preload          : path.join(pathPreload, 'preload-detailWindow.js'),
		},
	})

	if ( mcStore.get('detail_window_max', false) ) { windows.detail.maximize() }

	if ( !devDebug ) { windows.detail.removeMenu() }

	windows.detail.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_modRecord', thisModRecord)
		if ( devDebug ) { windows.detail.webContents.openDevTools() }
	})

	windows.detail.loadFile(path.join(pathRender, 'detail.html'))
	windows.detail.on('closed', () => { windows.detail = null; windows.main.focus() })
}

function createDebugWindow(logClass) {
	if ( windows.debug ) { windows.debug.focus(); return }

	windows.debug = new BrowserWindow({
		icon            : pathIcon,
		width           : 800,
		height          : 500,
		title           : 'Debug',
		minimizable     : false,
		fullscreenable  : false,
		autoHideMenuBar : !devDebug,
		webPreferences  : {
			nodeIntegration  : false,
			contextIsolation : true,
			preload          : path.join(pathPreload, 'preload-debugWindow.js'),
		},
	})

	windows.debug.webContents.on('did-finish-load', (event) => {
		event.sender.send('update-log', logClass.toDisplayHTML)
	})

	windows.debug.removeMenu()
	windows.debug.loadFile(path.join(app.getAppPath(), 'renderer', 'debug.html'))
	windows.debug.on('closed', () => { windows.debug = null; windows.main.focus() })
}

function createPrefsWindow() {
	if ( windows.prefs ) { windows.prefs.focus(); return }

	windows.prefs = new BrowserWindow({
		icon            : pathIcon,
		width           : 800,
		height          : 500,
		title           : myTranslator.syncStringLookup('user_pref_title_main'),
		minimizable     : false,
		fullscreenable  : false,
		autoHideMenuBar : !devDebug,
		webPreferences  : {
			nodeIntegration  : false,
			contextIsolation : true,
			preload          : path.join(pathPreload, 'preload-prefsWindow.js'),
		},
	})
	if ( !devDebug ) { windows.prefs.removeMenu() }

	windows.prefs.webContents.on('did-finish-load', (event) => {
		event.sender.send( 'fromMain_allSettings', mcStore.store )
	})

	windows.prefs.loadFile(path.join(pathRender, 'prefs.html'))
	windows.prefs.on('closed', () => { windows.prefs = null; windows.main.focus() })
}

function createSavegameWindow(collection) {
	if ( windows.save ) { windows.save.focus(); return }

	windows.save = new BrowserWindow({
		icon            : pathIcon,
		width           : mcStore.get('detail_window_x', 800),
		height          : mcStore.get('detail_window_y', 500),
		title           : myTranslator.syncStringLookup('app_name'),
		minimizable     : false,
		maximizable     : true,
		fullscreenable  : false,
		autoHideMenuBar : !devDebug,
		webPreferences  : {
			nodeIntegration  : false,
			contextIsolation : true,
			preload          : path.join(pathPreload, 'preload-savegameWindow.js'),
		},
	})

	if ( mcStore.get('detail_window_max', false) ) { windows.save.maximize() }

	if ( !devDebug ) { windows.save.removeMenu() }

	windows.save.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_collectionName', collection, modList)
		if ( devDebug ) { windows.save.webContents.openDevTools() }
	})

	windows.save.loadFile(path.join(pathRender, 'savegame.html'))
	windows.save.on('closed', () => { windows.save = null; windows.main.focus() })
}

function createVersionWindow() {
	if ( windows.version ) {
		windows.version.webContents.send('fromMain_modList', modList)
		windows.version.focus()
		return
	}

	windows.version = new BrowserWindow({
		icon            : pathIcon,
		width           : mcStore.get('detail_window_x', 800),
		height          : mcStore.get('detail_window_y', 500),
		title           : myTranslator.syncStringLookup('app_name'),
		minimizable     : false,
		maximizable     : true,
		fullscreenable  : false,
		autoHideMenuBar : !devDebug,
		webPreferences  : {
			nodeIntegration  : false,
			contextIsolation : true,
			preload          : path.join(pathPreload, 'preload-versionWindow.js'),
		},
	})

	if ( mcStore.get('detail_window_max', false) ) { windows.version.maximize() }

	if ( !devDebug ) { windows.version.removeMenu() }

	windows.version.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_modList', modList)
		if ( devDebug ) { windows.version.webContents.openDevTools() }
	})

	windows.version.loadFile(path.join(pathRender, 'versions.html'))
	windows.version.on('closed', () => { windows.version = null; windows.main.focus() })
}

/*  ____  ____   ___ 
   (_  _)(  _ \ / __)
    _)(_  )___/( (__ 
   (____)(__)   \___) */

/** File operation buttons */
ipcMain.on('toMain_makeInactive', () => { parseSettings('DISABLE') })
ipcMain.on('toMain_makeActive', (event, newList) => { parseSettings(modFoldersMap[newList]) })
ipcMain.on('toMain_openMods', (event, mods) => {
	const thisMod = modIdToRecord(mods[0])
	if ( thisMod !== null ) { shell.showItemInFolder(thisMod.fileDetail.fullPath) }
})

ipcMain.on('toMain_realFileDelete', (event, fileMap) => { fileOperation('delete', fileMap) })
ipcMain.on('toMain_deleteMods',     (event, mods) => {
	/* Delete confirm window */
	const theseMods = modIdsToRecords(mods)
	if ( theseMods.length > 0  ) { createConfirmWindow('delete', theseMods, mods) }
})

ipcMain.on('toMain_realFileMove', (event, fileMap) => { fileOperation('move', fileMap) })
ipcMain.on('toMain_moveMods',     (event, mods) => {
	/* Move confirm window */
	const theseMods = modIdsToRecords(mods)
	if ( theseMods.length > 0 ) { createConfirmWindow('move', theseMods, mods) }
})

ipcMain.on('toMain_realFileCopy', (event, fileMap) => { fileOperation('copy', fileMap) })
ipcMain.on('toMain_copyMods',     (event, mods) => {
	/* Copy confirm window */
	const theseMods = modIdsToRecords(mods)
	if ( theseMods.length > 0 ) { createConfirmWindow('copy', theseMods, mods) }
})
/** END: File operation buttons */


/** Folder Window Operation */
ipcMain.on('toMain_addFolder', () => {
	dialog.showOpenDialog(windows.main, {
		properties : ['openDirectory'], defaultPath : userHome,
	}).then((result) => {
		if ( result.canceled ) {
			logger.notice('folderList', 'Add folder :: canceled')
		} else {
			let alreadyExists = false

			modFolders.forEach((thisPath) => {
				if ( path.relative(thisPath, result.filePaths[0]) === '' ) { alreadyExists = true }
			})

			if ( ! alreadyExists ) {
				modFolders.add(result.filePaths[0]); foldersDirty = true
			} else {
				logger.notice('folderList', 'Add folder :: canceled, already exists in list')
			}

			mcStore.set('modFolders', Array.from(modFolders))
			processModFolders(result.filePaths[0])
		}
	}).catch((unknownError) => {
		logger.notice('folderList', `Could not read specified add folder : ${unknownError}`)
	})
})
ipcMain.on('toMain_editFolders',    () => { createFolderWindow() })
ipcMain.on('toMain_openFolder',     (event, folder) => { shell.openPath(folder) })
ipcMain.on('toMain_refreshFolders', () => { foldersDirty = true; processModFolders() })
ipcMain.on('toMain_removeFolder',   (event, folder) => {
	if ( modFolders.delete(folder) ) {
		logger.notice('folderManager', `Folder removed from list ${folder}`)
		mcStore.set('modFolders', Array.from(modFolders))
		foldersDirty = true
	} else {
		logger.notice('folderManager', `Folder NOT removed from list ${folder}`)
	}
})
/** END: Folder Window Operation */



/** l10n Operation */
ipcMain.on('toMain_langList_change', (event, lang) => { myTranslator.currentLocale = lang; event.sender.send('fromMain_l10n_refresh') })
ipcMain.on('toMain_langList_send',   (event) => {
	myTranslator.getLangList().then((langList) => {
		event.sender.send('fromMain_langList_return', langList, myTranslator.deferCurrentLocale())
	})
})
ipcMain.on('toMain_getText_send', (event, l10nSet) => {
	l10nSet.forEach((l10nEntry) => {
		if ( l10nEntry === 'app_version' ) {
			event.sender.send('fromMain_getText_return', [l10nEntry, mcDetail.version])
		} else if ( l10nEntry === 'clean_cache_size' ) {
			const cleanString = myTranslator.syncStringLookup(l10nEntry)
			const cacheStats = fs.statSync(path.join(app.getPath('userData'), 'mod_cache.json'))

			event.sender.send('fromMain_getText_return', [l10nEntry, `${cleanString} ${(cacheStats.size/(1024*1024)).toFixed(2)}MB`])
		} else {
			myTranslator.stringLookup(l10nEntry).then((text) => {
				event.sender.send('fromMain_getText_return', [l10nEntry, text])
			})
			myTranslator.stringTitleLookup(l10nEntry).then((text) => {
				if ( text !== null ) {
					event.sender.send('fromMain_getText_return_title', [l10nEntry, text])
				}
			})
		}
	})
})
/** END: l10n Operation */


/** Detail window operation */
ipcMain.on('toMain_openModDetail', (event, thisMod) => {
	const thisModDetail = modIdToRecord(thisMod)

	if ( thisModDetail !== null ) { createDetailWindow(thisModDetail) }
})
/** END: Detail window operation */


/** Debug window operation */
ipcMain.on('openDebugLogContents', () => { createDebugWindow(logger) })
ipcMain.on('getDebugLogContents',  (event) => { event.sender.send('update-log', logger.toDisplayHTML) })
ipcMain.on('saveDebugLogContents', () => {
	dialog.showSaveDialog(windows.main, {
		defaultPath : path.join(userHome, 'Documents', 'modAssistDebugLog.txt' ),
		filters     : [
			{ name : 'TXT', extensions : ['txt'] },
			{ name : 'All', extensions : ['*'] },
		],
	}).then(async (result) => {
		if ( result.canceled ) {
			logger.notice('logger', 'Save log file canceled')
		} else {
			try {
				fs.writeFileSync(result.filePath, logger.toDisplayText)
				dialog.showMessageBoxSync(windows.main, {
					message : await myTranslator.stringLookup('save_log_worked'),
					type    : 'info',
				})
			} catch (err) {
				logger.fileError('logger', `Could not save log file : ${err}`)
				dialog.showMessageBoxSync(windows.main, {
					message : await myTranslator.stringLookup('save_log_failed'),
					type    : 'warning',
				})
			}
		}
	}).catch((unknownError) => {
		logger.fileError('logger', `Could not save log file : ${unknownError}`)
	})
})
/** END: Debug window operation */


/** Preferences window operation */
ipcMain.on('toMain_openPrefs', () => { createPrefsWindow() })
ipcMain.on('toMain_getPref', (event, name) => { event.returnValue = mcStore.get(name) })
ipcMain.on('toMain_setPref', (event, name, value) => {
	if ( name === 'lock_lang' ) { mcStore.set('force_lang', myTranslator.currentLocale) }
	if ( name === 'game_settings' ) { gameSettings = value }
	mcStore.set(name, value)
	event.sender.send( 'fromMain_allSettings', mcStore.store )
})
ipcMain.on('toMain_cleanCacheFile', (event) => {
	const localStore = maCache.store
	const md5Set = new Set()
	Object.keys(localStore).forEach((md5) => { md5Set.add(md5) })
	
	Object.keys(modList).forEach((collection) => {
		modList[collection].mods.forEach((mod) => {
			md5Set.delete(mod.md5Sum)
		})
	})

	md5Set.forEach((md5) => { maCache.delete(md5) })

	const options = {
		type    : 'info',
		title   : myTranslator.syncStringLookup('user_pref_title_clean_cache'),
		message : myTranslator.syncStringLookup('user_pref_clean_cache_did'),
	}
	
	dialog.showMessageBox(null, options)
	console.log(md5Set)

	event.sender.send('fromMain_l10n_refresh')
})
ipcMain.on('toMain_setPrefFile', (event) => {
	dialog.showOpenDialog(windows.prefs, {
		properties  : ['openFile'],
		defaultPath : pathBestGuess,
		filters     : [
			{ name : 'gameSettings.xml', extensions : ['xml'] },
			{ name : 'All', extensions : ['*'] },
		],
	}).then((result) => {
		if ( result.canceled ) {
			logger.notice('gameSettings', 'New gamesettings :: canceled')
		} else {
			mcStore.set('game_settings', result.filePaths[0])
			gameSettings = result.filePaths[0]
			parseSettings()
			event.sender.send( 'fromMain_allSettings', mcStore.store )
		}
	}).catch((unknownError) => {
		logger.notice('gameSettings', `Could not read specified gamesettings : ${unknownError}`)
	})
	
})
/** END: Preferences window operation */


/** Savegame window operation */
ipcMain.on('toMain_openSave',       (event, collection) => { createSavegameWindow(collection) })
ipcMain.on('toMain_openSaveFolder', () => { openSaveGame(false) })
ipcMain.on('toMain_openSaveZIP',    () => { openSaveGame(true) })

function openSaveGame(zipMode = false) {
	const options = {
		properties  : [(zipMode) ? 'openFile' : 'openDirectory'],
		defaultPath : pathBestGuess,
	}
	if ( zipMode ) {
		options.filters = [{ name : 'ZIP Files', extensions : ['zip'] }]
	}

	dialog.showOpenDialog(windows.save, options).then((result) => {
		if ( result.canceled ) {
			logger.notice('savegame', 'Load canceled')
		} else {
			try {
				const thisSavegame = new saveFileChecker(result.filePaths[0], !zipMode, logger)
				windows.save.webContents.send('fromMain_saveInfo', modList, thisSavegame)
			} catch (e) {
				logger.notice('savegame', `Load failed: ${e}`)
			}
		}
	}).catch((unknownError) => {
		logger.notice('savegame', `Could not read specified file/folder : ${unknownError}`)
	})
}
/** END: Savegame window operation */


/** Version window operation */
ipcMain.on('toMain_versionCheck',    () => { createVersionWindow() })
ipcMain.on('toMain_refreshVersions', (event) => { event.sender.send('fromMain_modList', modList) } )
/** END: Version window operation */



/** Main Window Modal Functions */
function pop_load_show() { windows.main.webContents.send('fromMain_showLoading') }
function pop_list_show() { windows.main.webContents.send('fromMain_showListSet') }
function pop_load_hide(time = 1000) { setTimeout(() => { windows.main.webContents.send('fromMain_hideLoading') }, time) }
function pop_list_hide(time = 1000) { setTimeout(() => { windows.main.webContents.send('fromMain_hideListSet') }, time) }
/** END: Main Window Modal Functions */

/** Utility & Convenience Functions */
ipcMain.on('toMain_homeDirRevamp', (event, thisPath) => { event.returnValue = thisPath.replaceAll(userHome, '~') })

function incrementTotal(amount, reset = false) {
	countTotal += ( reset ) ? ( -1 * countTotal ) : amount

	windows.main.webContents.send('fromMain_loadingTotal', countTotal)
}

function incrementDone(amount = 1, reset = false) {
	countMods += ( reset ) ? ( -1 * countMods ) : amount

	windows.main.webContents.send('fromMain_loadingDone', countMods)
}

function modIdToRecord(id) {
	const idParts = id.split('--')
	let foundMod  = null
	let foundCol  = null

	modList[idParts[0]].mods.forEach((mod) => {
		if ( foundMod === null && mod.uuid === idParts[1] ) {
			foundMod = mod
			foundCol = idParts[0]
		}
	})
	foundMod.currentCollection = foundCol
	return foundMod
}

function modIdsToRecords(mods) {
	const theseMods = []
	mods.forEach((inMod) => { theseMods.push(modIdToRecord(inMod)) })
	return theseMods
}
/** END: Utility & Convenience Functions */


/** Business Functions */
function parseSettings(newSetting = false) {
	const strictXMLParser = new xml2js.Parser({strict : true, async : false, normalizeTags : false })
	let XMLString = ''
	let canContinue = true
	try {
		XMLString = fs.readFileSync(gameSettings, 'utf8')
	} catch (e) {
		logger.fileError('gameSettings', `Could not read game settings ${e}`)
		canContinue = false
	}

	if ( !canContinue ) { return }

	try {
		strictXMLParser.parseString(XMLString, (err, result) => {
			if ( err !== null ) {
				logger.fileError('gameSettings', `Could not read game settings ${err}`)
			}
			gameSettingsXML = result
			overrideFolder  = gameSettingsXML.gameSettings.modsDirectoryOverride[0].$.directory
			overrideActive  = gameSettingsXML.gameSettings.modsDirectoryOverride[0].$.active
		})
	} catch (e) {
		logger.fileError('gameSettings', `Could not read game settings ${e}`)
	}

	if ( overrideActive === 'false' || overrideActive === false ) {
		overrideIndex = '0'
	} else {
		overrideIndex = '999'
		Object.keys(modFoldersMap).forEach((cleanName) => {
			if ( modFoldersMap[cleanName] === overrideFolder ) { overrideIndex = cleanName }
		})
	}

	if ( newSetting !== false ) {
		pop_list_show()

		gameSettingsXML.gameSettings.modsDirectoryOverride[0].$.active    = ( newSetting !== 'DISABLE' )
		gameSettingsXML.gameSettings.modsDirectoryOverride[0].$.directory = ( newSetting !== 'DISABLE' ) ? newSetting : ''

		const builder   = new xml2js.Builder({
			xmldec     : { version : '1.0', encoding : 'UTF-8', standalone : false },
			renderOpts : { pretty : true, indent : '    ', newline : '\n' },
		})

		try {
			let outputXML = builder.buildObject(gameSettingsXML)

			outputXML = outputXML.replace('<ingameMapFruitFilter/>', '<ingameMapFruitFilter></ingameMapFruitFilter>')

			fs.writeFileSync(gameSettings, outputXML)
		} catch (e) {
			logger.fileError('gameSettings', `Could not write game settings ${e}`)
		}

		pop_list_hide(1500)
	}
}

function fileOperation(type, fileMap) {
	const fullPathMap = []

	fileMap.forEach((file) => {
		fullPathMap.push([file[2], file[2].replaceAll(modFoldersMap[file[1]], modFoldersMap[file[0]])])
	})

	windows.confirm.close()
	windows.main.focus()

	foldersDirty = true

	incrementTotal(0, true)
	incrementDone(0, true)
	incrementTotal(fullPathMap.length)
	pop_load_show()

	setTimeout(() => {
		fullPathMap.forEach((file) => {
			try {
				switch ( type ) {
					case 'copy' :
						fs.copyFileSync(file[0], file[1])
						break
					case 'move' :
						fs.renameSync(file[0], file[1])
						break
					case 'delete' :
						fs.rmSync(file[0], { recursive : true } )
						break
					default :
						break
				}
			} catch (e) {
				logger.fileError(`${type}File`, `Could not ${type} file : ${e}`)
			}
			incrementDone()
		})

		processModFolders()
	}, 1000)
}

function fileGetStats(folder, thisFile) {
	let isFolder = null
	let date     = null
	let size     = null

	if ( thisFile.isSymbolicLink() ) {
		const thisSymLink     = fs.readlinkSync(path.join(folder, thisFile.name))
		const thisSymLinkStat = fs.lstatSync(path.join(folder, thisSymLink))
		isFolder = thisSymLinkStat.isDirectory()
		date     = thisSymLinkStat.ctime

		if ( !isFolder ) { size = thisSymLinkStat.size }
	} else {
		isFolder = thisFile.isDirectory()
	}

	if ( ! thisFile.isSymbolicLink() ) {
		const theseStats = fs.statSync(path.join(folder, thisFile.name))
		if ( !isFolder ) { size = theseStats.size }
		date = theseStats.ctime
		
	}
	if ( isFolder ) {
		let bytes = 0
		glob.sync('**', { cwd : path.join(folder, thisFile.name) }).forEach((file) => {
			try {
				const stats = fs.statSync(path.join(folder, thisFile.name, file))
				if ( stats.isFile() ) { bytes += stats.size }
			} catch { /* Do Nothing if we can't read it. */ }
		})
		size = bytes
	}
	return {
		folder : isFolder,
		size   : size,
		date   : date,
	}
}

function processModFolders(newFolder = false) {
	if ( !foldersDirty ) { return }

	pop_load_show()
	incrementTotal(0, true)
	incrementDone(0, true)

	if ( newFolder === false ) { modList = {}; modFoldersMap = {}}

	// Cleaner for no-longer existing folders.
	modFolders.forEach((folder) => { if ( ! fs.existsSync(folder) ) { modFolders.delete(folder) } })
	mcStore.set('modFolders', Array.from(modFolders))

	modFolders.forEach((folder) => {
		const cleanName = folder.replaceAll('\\', '-').replaceAll(':', '').replaceAll(' ', '_')
		const shortName = path.basename(folder)
		const localStore = maCache.store

		if ( folder === newFolder || newFolder === false ) {
			modFoldersMap[cleanName] = folder
			modList[cleanName]       = { name : shortName, fullPath : folder, mods : [] }

			try {
				const folderContents = fs.readdirSync(folder, {withFileTypes : true})

				incrementTotal(folderContents.length)

				let modIndex = -1
				folderContents.forEach((thisFile) => {
					if ( junkRegex.test(thisFile.name) ) {
						incrementDone()
						return
					}

					modIndex++

					const thisFileStats = fileGetStats(folder, thisFile)

					if ( !thisFileStats.folder && !skipCache ) {
						const hashString = `${thisFile.name}-${thisFileStats.size}-${thisFileStats.date.toISOString()}`
						const thisMD5Sum = crypto.createHash('md5').update(hashString).digest('hex')

						if ( typeof localStore[thisMD5Sum] !== 'undefined') {
							modList[cleanName].mods[modIndex] = localStore[thisMD5Sum]
							incrementDone()
							return
						}
					}

					if ( !thisFileStats.folder && !thisFile.name.endsWith('.zip') ) {
						modList[cleanName].mods[modIndex] = new notModFileChecker(
							path.join(folder, thisFile.name),
							false,
							thisFileStats.size,
							thisFileStats.date,
							logger
						)
						incrementDone()
						return
					}

					try {
						const thisModDetail = new modFileChecker(
							path.join(folder, thisFile.name),
							thisFileStats.folder,
							thisFileStats.size,
							thisFileStats.date,
							logger,
							myTranslator.deferCurrentLocale
						)
						modList[cleanName].mods[modIndex] = thisModDetail
						if ( thisModDetail.md5Sum !== null ) {
							newModsList.push(thisModDetail.md5Sum)
							maCache.set(thisModDetail.md5Sum, thisModDetail.storable)
						}
					} catch (e) {
						logger.fileError(thisFile.name, `Couldn't test and add mod: ${e}`)
					}

					incrementDone()
				})
			} catch (e) {
				logger.fileError('folderError', `Couldn't process ${folder}: ${e}`)
			}
		}
	})
	foldersDirty = false

	parseSettings()

	windows.main.webContents.send(
		'fromMain_modList',
		modList,
		[myTranslator.syncStringLookup('override_disabled'), myTranslator.syncStringLookup('override_unknown')],
		overrideIndex,
		modFoldersMap,
		newModsList
	)

	pop_load_hide()
}
/** END: Business Functions */



app.whenReady().then(() => {
	globalShortcut.register('Alt+CommandOrControl+D', () => { createDebugWindow(logger) })

	workWidth  = screen.getPrimaryDisplay().size.width
	workHeight = screen.getPrimaryDisplay().size.height
	
	if ( mcStore.has('force_lang') && mcStore.has('lock_lang') ) {
		// If language is locked, switch to it.
		myTranslator.currentLocale = mcStore.get('force_lang')
	}

	createMainWindow()

	app.on('activate', () => {if (BrowserWindow.getAllWindows().length === 0) { createMainWindow() } })
})

app.setAboutPanelOptions({
	applicationName    : 'FS Mod Assist',
	applicationVersion : mcDetail.version,
	copyright          : '(c) 2022-present FSG Modding',
	credits            : 'J.T.Sage <jtsage+datebox@gmail.com>',
	website            : 'https://github.com/FSGModding/FSG_Mod_Assistant',
	iconPath           : pathIcon,
})

app.on('window-all-closed', () => {	if (process.platform !== 'darwin') { app.quit() } })
