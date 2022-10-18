/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main Program



const { app, BrowserWindow, ipcMain, globalShortcut, shell, dialog, Menu, Tray } = require('electron')

const { autoUpdater } = require('electron-updater')

const devDebug  = false
const skipCache = false

if (process.platform === 'win32') { autoUpdater.checkForUpdatesAndNotify() }

const path       = require('path')
const fs         = require('fs')
const glob       = require('glob')
const xml2js     = require('xml2js')
const crypto     = require('crypto')

const userHome      = require('os').homedir()
const pathRender    = path.join(app.getAppPath(), 'renderer')
const pathPreload   = path.join(pathRender, 'preload')
const pathIcon      = path.join(app.getAppPath(), 'build', 'icon.ico')

const trayIcon = !app.isPackaged
	? path.join(app.getAppPath(), 'renderer', 'img', 'icon.ico')
	: path.join(process.resourcesPath, 'app.asar', 'renderer', 'img', 'icon.ico')

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

let tray    = null
const windows = {
	confirm : null,
	debug   : null,
	detail  : null,
	folder  : null,
	load    : null,
	main    : null,
	prefs   : null,
	resolve : null,
	save    : null,
	splash  : null,
	version : null,
}

let foldersDirty = true

let gameSettings    = mcStore.get('game_settings')
let gameSettingsXML = null
let overrideFolder  = null
let overrideIndex   = '999'
let overrideActive  = null



/*  _    _  ____  _  _  ____   _____  _    _  ___ 
   ( \/\/ )(_  _)( \( )(  _ \ (  _  )( \/\/ )/ __)
    )    (  _)(_  )  (  )(_) ) )(_)(  )    ( \__ \
   (__/\__)(____)(_)\_)(____/ (_____)(__/\__)(___/ */

function createSubWindow({show = true, parent = null, title = null, maximize = false, fixed = false, center = false, frame = true, move = true, width = 'detail_window_x', height = 'detail_window_y', preload = null} = {}) {
	const winOptions = {
		minimizable     : !fixed,
		center          : center,
		alwaysOnTop     : fixed && !devDebug,
		maximizable     : !fixed,
		fullscreenable  : !fixed,
		width           : ( typeof width === 'number' ) ? width : mcStore.get(width),
		height          : ( typeof height === 'number' ) ? height : mcStore.get(height),
	}
	const winTitle = ( title === null ) ? myTranslator.syncStringLookup('app_name') : title
	const thisWindow = new BrowserWindow({
		icon            : pathIcon,
		parent          : ( parent === null ) ? null : windows[parent],
		width           : winOptions.width,
		height          : winOptions.height,
		title           : winTitle,
		minimizable     : winOptions.minimizable,
		center          : winOptions.center,
		alwaysOnTop     : winOptions.alwaysOnTop,
		maximizable     : winOptions.maximizable,
		fullscreenable  : winOptions.fullscreenable,
		movable         : move,
		frame           : frame,
		show            : show,
		autoHideMenuBar : true,
		webPreferences  : {
			nodeIntegration  : false,
			contextIsolation : true,
			preload          : (preload === null ) ? null : path.join(pathPreload, `preload-${preload}.js`),
		},
	})
	if ( !devDebug ) { thisWindow.removeMenu()}
	if ( maximize ) { thisWindow.maximize() }
	return thisWindow
}

function createMainWindow () {
	windows.load = createSubWindow({ show : false, preload : 'loadingWindow', center : true, fixed : true, move : false, frame : false, width : 600, height : 300 })
	windows.load.loadFile(path.join(pathRender, 'loading.html'))
	windows.load.on('close', (event) => { event.preventDefault() })

	windows.main = createSubWindow({ show : devDebug, preload : 'mainWindow', width : 'main_window_x', height : 'main_window_y', maximize : mcStore.get('main_window_max') })

	windows.main.on('minimize', () => { if ( tray ) { windows.main.hide() }})
	windows.main.on('closed',   () => {
		if ( tray ) { tray.destroy() }
		windows.load.destroy()
	})

	if ( !devDebug ) {
		windows.splash = createSubWindow({ center : true, fixed : true, move : false, frame : false, width : 600, height : 300 })
		windows.splash.loadURL(`file://${path.join(pathRender, 'splash.html')}?version=${mcDetail.version}`)

		windows.splash.on('closed', () => { windows.splash = null })

		windows.main.once('ready-to-show', () => {
			setTimeout(() => { windows.main.show(); windows.splash.destroy() }, 2000)
		})
	}

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
	if ( modRecords.length < 1 ) { return }
	if ( windows.confirm ) { windows.confirm.focus(); return }

	const file_HTML  = `confirm-file${type.charAt(0).toUpperCase()}${type.slice(1)}.html`
	const file_JS    = `confirm${type.charAt(0).toUpperCase()}${type.slice(1)}`
	const collection = origList[0].split('--')[0]

	windows.confirm = createSubWindow({ parent : 'main', preload : file_JS, width : 750, height : 500, fixed : true, center : true })

	windows.confirm.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_confirmList', modRecords, modList, modFoldersMap, collection)
	})

	windows.confirm.loadFile(path.join(pathRender, file_HTML))

	windows.confirm.on('closed', () => { windows.confirm = null; windows.main.focus() })
}

function createFolderWindow() {
	if ( windows.folder ) {
		windows.folder.focus()
		windows.folder.webContents.send('fromMain_getFolders', modList)
		return
	}

	windows.folder = createSubWindow({ parent : 'main', center : true, preload : 'folderWindow' })

	windows.folder.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_getFolders', modList)
	})

	windows.folder.loadFile(path.join(pathRender, 'folders.html'))
	windows.folder.on('closed', () => { windows.folder = null; windows.main.focus(); processModFolders() })
}

function createDetailWindow(thisModRecord) {
	if ( thisModRecord === null ) { return }
	if ( windows.detail ) {
		windows.detail.focus()
		windows.detail.webContents.send('fromMain_modRecord', thisModRecord)
		return
	}

	windows.detail = createSubWindow({ parent : 'main', preload : 'detailWindow', maximize : mcStore.get('detail_window_max') })

	windows.detail.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_modRecord', thisModRecord)
		if ( devDebug ) { windows.detail.webContents.openDevTools() }
	})

	windows.detail.loadFile(path.join(pathRender, 'detail.html'))
	windows.detail.on('closed', () => { windows.detail = null; windows.main.focus() })
}

function createDebugWindow() {
	if ( windows.debug ) {
		windows.debug.focus()
		windows.debug.webContents.send('update-log', logger.toDisplayHTML)
		return
	}

	windows.debug = createSubWindow({ parent : 'main', preload : 'debugWindow', width : 800, height : 500 })

	windows.debug.webContents.on('did-finish-load', (event) => {
		event.sender.send('update-log', logger.toDisplayHTML)
	})

	windows.debug.loadFile(path.join(app.getAppPath(), 'renderer', 'debug.html'))
	windows.debug.on('closed', () => { windows.debug = null; windows.main.focus() })
}

function createPrefsWindow() {
	if ( windows.prefs ) {
		windows.prefs.focus()
		windows.prefs.webContents.send( 'fromMain_allSettings', mcStore.store )
		return
	}

	windows.prefs = createSubWindow({ parent : 'main', preload : 'prefsWindow', width : 800, height : 500, title : myTranslator.syncStringLookup('user_pref_title_main') })

	windows.prefs.webContents.on('did-finish-load', (event) => {
		event.sender.send( 'fromMain_allSettings', mcStore.store )
	})

	windows.prefs.loadFile(path.join(pathRender, 'prefs.html'))
	windows.prefs.on('closed', () => { windows.prefs = null; windows.main.focus() })
}

function createSavegameWindow(collection) {
	if ( windows.save ) {
		windows.save.focus()
		windows.save.webContents.send('fromMain_collectionName', collection, modList)
		return
	}

	windows.save = createSubWindow({ parent : 'main', preload : 'savegameWindow', maximize : mcStore.get('detail_window_max') })

	windows.save.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_collectionName', collection, modList)
		if ( devDebug ) { windows.save.webContents.openDevTools() }
	})

	windows.save.loadFile(path.join(pathRender, 'savegame.html'))
	windows.save.on('closed', () => { windows.save = null; windows.main.focus() })
}

function createResolveWindow(modSet, shortName) {
	if ( windows.resolve ) {
		windows.resolve.webContents.send('fromMain_modSet', modSet, shortName)
		windows.resolve.focus()
		return
	}

	windows.resolve = createSubWindow({ parent : 'version', preload : 'resolveWindow', width : 750, height : 600, fixed : true, center : true })

	windows.resolve.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_modSet', modSet, shortName)
		if ( devDebug ) { windows.resolve.webContents.openDevTools() }
	})

	windows.resolve.loadFile(path.join(pathRender, 'resolve.html'))
	windows.resolve.on('closed', () => { windows.resolve = null; windows.version.focus() })
}

function createVersionWindow() {
	if ( windows.version ) {
		windows.version.webContents.send('fromMain_modList', modList)
		windows.version.focus()
		return
	}

	windows.version = createSubWindow({ parent : 'main', preload : 'versionWindow', maximize : mcStore.get('detail_window_max') })

	windows.version.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_modList', modList)
		if ( devDebug ) { windows.version.webContents.openDevTools() }
	})

	windows.version.loadFile(path.join(pathRender, 'versions.html'))
	windows.version.on('closed', () => { windows.version = null; windows.main.focus() })
}

function loadingWindow_open(l10n) {
	const winTitle    = myTranslator.syncStringLookup(`loading_${l10n}_title`)
	const winSubTitle = myTranslator.syncStringLookup(`loading_${l10n}_subtitle`)
	if ( windows.load ) {
		windows.load.show()
		windows.load.focus()
		windows.load.webContents.send('formMain_loadingTitles', winTitle, winSubTitle)
		return
	}
}
function loadingWindow_total(amount, reset = false) {
	countTotal = ( reset ) ? amount : amount + countTotal

	windows.load.webContents.send('fromMain_loadingTotal', countTotal)
}
function loadingWindow_current(amount = 1, reset = false) {
	countMods = ( reset ) ? amount : amount + countMods

	windows.load.webContents.send('fromMain_loadingCurrent', countMods)
}
function loadingWindow_hide(time = 1250) {
	setTimeout(() => { windows.load.hide() }, time)
}
function loadingWindow_noCount() {
	windows.load.webContents.send('fromMain_loadingNoCount')
}

/*  ____  ____   ___ 
   (_  _)(  _ \ / __)
    _)(_  )___/( (__ 
   (____)(__)   \___) */

/** File operation buttons */
ipcMain.on('toMain_makeInactive', () => { parseSettings('DISABLE') })
ipcMain.on('toMain_makeActive',   (event, newList) => { parseSettings(modFoldersMap[newList]) })
ipcMain.on('toMain_openMods',     (event, mods) => {
	const thisCollectionFolder = modFoldersMap[mods[0].split('--')[0]]
	const thisMod = modIdToRecord(mods[0])

	if ( thisMod !== null ) {
		shell.showItemInFolder(path.join(thisCollectionFolder, path.basename(thisMod.fileDetail.fullPath)))
	}
})
ipcMain.on('toMain_openHub',     (event, mods) => {
	const thisMod = modIdToRecord(mods[0])

	if ( thisMod !== null ) {
		shell.openExternal(`https://www.farming-simulator.com/mod.php?hash=${thisMod.giantsHash}`)
	}
})

ipcMain.on('toMain_deleteMods',     (event, mods) => { createConfirmWindow('delete', modIdsToRecords(mods), mods) })
ipcMain.on('toMain_moveMods',       (event, mods) => { createConfirmWindow('move', modIdsToRecords(mods), mods) })
ipcMain.on('toMain_copyMods',       (event, mods) => { createConfirmWindow('copy', modIdsToRecords(mods), mods) })
ipcMain.on('toMain_realFileDelete', (event, fileMap) => { fileOperation('delete', fileMap) })
ipcMain.on('toMain_realFileMove',   (event, fileMap) => { fileOperation('move', fileMap) })
ipcMain.on('toMain_realFileCopy',   (event, fileMap) => { fileOperation('copy', fileMap) })
ipcMain.on('toMain_realFileVerCP',  (event, fileMap) => { fileOperation('copy', fileMap, 'resolve') })
/** END: File operation buttons */


/** Folder Window Operation */
ipcMain.on('toMain_addFolder', () => {
	dialog.showOpenDialog(windows.main, {
		properties : ['openDirectory'], defaultPath : userHome,
	}).then((result) => {
		if ( !result.canceled ) {
			let alreadyExists = false

			modFolders.forEach((thisPath) => {
				if ( path.relative(thisPath, result.filePaths[0]) === '' ) { alreadyExists = true }
			})

			if ( ! alreadyExists ) {
				modFolders.add(result.filePaths[0]); foldersDirty = true
				mcStore.set('modFolders', Array.from(modFolders))
				processModFolders(result.filePaths[0])
			} else {
				logger.notice('folderList', 'Add folder :: canceled, already exists in list')
			}
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
ipcMain.on('toMain_openModDetail', (event, thisMod) => { createDetailWindow(modIdToRecord(thisMod)) })
/** END: Detail window operation */


/** Debug window operation */
ipcMain.on('openDebugLogContents', () => { createDebugWindow(logger) })
ipcMain.on('getDebugLogContents',  (event) => { event.sender.send('update-log', logger.toDisplayHTML) })
ipcMain.on('saveDebugLogContents', () => {
	dialog.showSaveDialog(windows.main, {
		defaultPath : path.join(userHome, 'Documents', 'modAssistDebugLog.txt' ),
		filters     : [{ name : 'TXT', extensions : ['txt'] }],
	}).then((result) => {
		if ( result.canceled ) {
			logger.notice('logger', 'Save log file canceled')
		} else {
			try {
				fs.writeFileSync(result.filePath, logger.toDisplayText)
				dialog.showMessageBoxSync(windows.main, {
					message : myTranslator.syncStringLookup('save_log_worked'),
					type    : 'info',
				})
			} catch (err) {
				logger.fileError('logger', `Could not save log file : ${err}`)
				dialog.showMessageBoxSync(windows.main, {
					message : myTranslator.syncStringLookup('save_log_failed'),
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
	mcStore.set(name, value)
	if ( name === 'lock_lang' ) { mcStore.set('force_lang', myTranslator.currentLocale) }
	event.sender.send( 'fromMain_allSettings', mcStore.store )
})
ipcMain.on('toMain_cleanCacheFile', (event) => {
	const localStore = maCache.store
	const md5Set     = new Set()

	loadingWindow_open('cache')

	Object.keys(localStore).forEach((md5) => { md5Set.add(md5) })
	
	Object.keys(modList).forEach((collection) => {
		modList[collection].mods.forEach((mod) => { md5Set.delete(mod.md5Sum) })
	})

	loadingWindow_total(md5Set.size, true)
	loadingWindow_current(0, true)

	md5Set.forEach((md5) => { maCache.delete(md5); loadingWindow_current() })

	loadingWindow_hide(1500)
	event.sender.send('fromMain_l10n_refresh')
})
ipcMain.on('toMain_setPrefFile', (event) => {
	dialog.showOpenDialog(windows.prefs, {
		properties  : ['openFile'],
		defaultPath : path.join(pathBestGuess, 'gameSettings.xml'),
		filters     : [
			{ name : 'gameSettings.xml', extensions : ['xml'] },
			{ name : 'All', extensions : ['*'] },
		],
	}).then((result) => {
		if ( ! result.canceled ) {
			mcStore.set('game_settings', result.filePaths[0])
			gameSettings = result.filePaths[0]
			parseSettings()
			refreshClientModList()
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
		if ( !result.canceled ) {
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
ipcMain.on('toMain_versionResolve',  (event, shortName) => {
	const modSet = []
	Object.keys(modList).forEach((collection) => {
		modList[collection].mods.forEach((mod) => {
			if ( mod.fileDetail.shortName === shortName && !mod.fileDetail.isFolder ) {
				modSet.push([collection, mod.modDesc.version, mod, modList[collection].name])
			}
		})
	})
	createResolveWindow(modSet, shortName)
})
/** END: Version window operation */


/** Utility & Convenience Functions */
ipcMain.on('toMain_closeSubWindow', (event, thisWin) => { windows[thisWin].close() })
ipcMain.on('toMain_homeDirRevamp', (event, thisPath) => { event.returnValue = thisPath.replaceAll(userHome, '~') })


function refreshClientModList() {
	windows.main.webContents.send(
		'fromMain_modList',
		modList,
		[myTranslator.syncStringLookup('override_disabled'), myTranslator.syncStringLookup('override_unknown')],
		overrideIndex,
		modFoldersMap,
		newModsList
	)
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
	try {
		XMLString = fs.readFileSync(gameSettings, 'utf8')
	} catch (e) {
		logger.fileError('gameSettings', `Could not read game settings ${e}`)
		return
	}

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
		loadingWindow_open('set')
		loadingWindow_noCount()

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

		parseSettings()
		refreshClientModList()
		loadingWindow_hide(1500)
	}
}

function fileOperation(type, fileMap, srcWindow = 'confirm') {
	const fullPathMap = []

	fileMap.forEach((file) => {
		const thisFileName = path.basename(file[2])
		fullPathMap.push([
			path.join(modFoldersMap[file[1]], thisFileName), // source
			path.join(modFoldersMap[file[0]], thisFileName), // dest
		])
	})

	windows[srcWindow].close()
	windows.main.focus()

	foldersDirty = true

	loadingWindow_open('files', 'main')
	loadingWindow_total(fullPathMap.length, true)
	loadingWindow_current(0, true)

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

		loadingWindow_current()
	})

	processModFolders()
	if ( windows.version && windows.version.isVisible() ) {
		windows.version.webContents.send('fromMain_modList', modList)
	}

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

let loadingWait = null
function processModFolders(newFolder) {
	if ( !foldersDirty ) { return }

	loadingWindow_open('mods', 'main')
	loadingWindow_total(0, true)
	loadingWindow_current(0, true)

	loadingWait = setInterval(() => {
		if ( windows.load.isVisible() ) {
			clearInterval(loadingWait)
			processModFolders_post(newFolder)
		}
	}, 250)
}

function processModFolders_post(newFolder = false) {
	// if ( !foldersDirty ) { return }

	// loadingWindow_open('mods', 'main')
	// loadingWindow_total(0, true)
	// loadingWindow_current(0, true)

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

				loadingWindow_total(folderContents.length)

				let modIndex = -1
				folderContents.forEach((thisFile) => {
					if ( junkRegex.test(thisFile.name) ) {
						loadingWindow_current()
						return
					}

					modIndex++

					const thisFileStats = fileGetStats(folder, thisFile)

					if ( !thisFileStats.folder && !skipCache ) {
						const hashString = `${thisFile.name}-${thisFileStats.size}-${thisFileStats.date.toISOString()}`
						const thisMD5Sum = crypto.createHash('md5').update(hashString).digest('hex')

						if ( typeof localStore[thisMD5Sum] !== 'undefined') {
							modList[cleanName].mods[modIndex] = localStore[thisMD5Sum]
							loadingWindow_current()
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
						loadingWindow_current()
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

					loadingWindow_current()
				})
			} catch (e) {
				logger.fileError('folderError', `Couldn't process ${folder}: ${e}`)
			}
		}
	})
	foldersDirty = false

	parseSettings()
	refreshClientModList()
	loadingWindow_hide()
}
/** END: Business Functions */



app.whenReady().then(() => {
	globalShortcut.register('Alt+CommandOrControl+D', () => { createDebugWindow(logger) })
	
	if ( mcStore.has('force_lang') && mcStore.has('lock_lang') ) {
		// If language is locked, switch to it.
		myTranslator.currentLocale = mcStore.get('force_lang')
	}

	tray = new Tray(trayIcon)

	const template = [
		{ label : 'FSG Mod Assist', /*icon : pathIcon, */enabled : false },
		{ type  : 'separator' },
		{ label : myTranslator.syncStringLookup('tray_show'), click : () => { windows.main.show() } },
		{ label : myTranslator.syncStringLookup('tray_quit'), click : () => { windows.main.close() } },
	]
	const contextMenu = Menu.buildFromTemplate(template)
	tray.setContextMenu(contextMenu)
	tray.setToolTip('FSG Mod Assist')
	tray.on('click', () => { windows.main.show() })

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
