/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main Program

const { app, BrowserWindow, ipcMain, shell, dialog, Menu, Tray, net, screen } = require('electron')

const isPortable = typeof process.env.PORTABLE_EXECUTABLE_DIR !== 'undefined'
const gotTheLock = app.requestSingleInstanceLock()

if ( !gotTheLock ) { app.quit() }

const { autoUpdater } = require('electron-updater')
const { ma_logger }   = require('./lib/ma-logger.js')
const semverGt        = require('semver/functions/gt')
const log             = new ma_logger('modAssist', app, 'assist.log', gotTheLock)
const path            = require('path')
const fs              = require('fs')

const devDebug      = !(app.isPackaged)
const skipCache     = false && !(app.isPackaged)
const crashLog      = path.join(app.getPath('userData'), 'crash.log')
let updaterInterval = null

log.log.info(`ModAssist Logger: ${app.getVersion()}`)

process.on('uncaughtException', (err, origin) => {
	fs.appendFileSync(
		crashLog,
		`Caught exception: ${err}\n\nException origin: ${origin}\n\n${err.stack}`
	)
	if ( !isNetworkError(err) ) {
		dialog.showMessageBoxSync(null, {
			title   : 'Uncaught Error - Quitting',
			message : `Caught exception: ${err}\n\nException origin: ${origin}\n\n${err.stack}\n\n\nCan't Continue, exiting now!\n\nTo send file, please see ${crashLog}`,
			type    : 'error',
		})
		app.quit()
	} else {
		log.log.debug(`Network error: ${err}`, 'net-error-exception')
	}
})
process.on('unhandledRejection', (err, origin) => {
	fs.appendFileSync(
		crashLog,
		`Caught rejection: ${err}\n\nRejection origin: ${origin}\n\n${err.stack}`
	)
	if ( !isNetworkError(err) ) {
		dialog.showMessageBoxSync(null, {
			title   : 'Uncaught Error - Quitting',
			message : `Caught rejection: ${err}\n\nRejection origin: ${origin}\n\n${err.stack}\n\n\nCan't Continue, exiting now!\n\nTo send file, please see ${crashLog}`,
			type    : 'error',
		})
		app.quit()
	} else {
		log.log.debug(`Network error: ${err}`, 'net-error-rejection')
	}
})

const translator       = require('./lib/translate.js')
const myTranslator     = new translator.translator(translator.getSystemLocale())
myTranslator.mcVersion = app.getVersion()

if ( process.platform === 'win32' && app.isPackaged && gotTheLock && !isPortable ) {
	autoUpdater.on('update-checking-for-update', () => { log.log.debug('Checking for update', 'auto-update') })
	autoUpdater.on('update-available', () => { log.log.info('Update Available', 'auto-update') })
	autoUpdater.on('update-not-available', () => { log.log.debug('No Update Available', 'auto-update') })
	autoUpdater.on('error', (message) => { log.log.warning(`Updater Failed: ${message}`, 'auto-update') })

	autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
		clearInterval(updaterInterval)
		const dialogOpts = {
			type    : 'info',
			buttons : [myTranslator.syncStringLookup('update_restart'), myTranslator.syncStringLookup('update_later')],
			title   : myTranslator.syncStringLookup('update_title'),
			message : process.platform === 'win32' ? releaseNotes : releaseName,
			detail  : myTranslator.syncStringLookup('update_detail'),
		}
		dialog.showMessageBox(dialogOpts).then((returnValue) => {
			if (returnValue.response === 0) { autoUpdater.quitAndInstall() }
		})
	})

	autoUpdater.checkForUpdatesAndNotify().catch((err) => log.log.warning(`Updater Issue: ${err}`, 'auto-update'))

	updaterInterval = setInterval(() => {
		autoUpdater.checkForUpdatesAndNotify().catch((err) => log.log.warning(`Updater Issue: ${err}`, 'auto-update'))
	}, ( 30 * 60 * 1000))
}

const glob       = require('glob')
const fxml       = require('fast-xml-parser')
const crypto     = require('crypto')

const userHome      = require('os').homedir()
const pathRender    = path.join(app.getAppPath(), 'renderer')
const pathPreload   = path.join(pathRender, 'preload')
const pathIcon      = path.join(app.getAppPath(), 'build', 'icon.ico')
const hubURL        = 'https://jtsage.dev/modHubData.json'
const hubVerURL     = 'https://jtsage.dev/modHubVersion.json'
const trayIcon      = !app.isPackaged
	? path.join(app.getAppPath(), 'renderer', 'img', 'icon.ico')
	: path.join(process.resourcesPath, 'app.asar', 'renderer', 'img', 'icon.ico')

let pathBestGuess = userHome
let foundPath     = false
let foundGame     = ''

const gameExeName = 'FarmingSimulator2022.exe'
const gameGuesses = [
	'C:\\Program Files (x86)\\Farming Simulator 2022\\',
	'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Farming Simulator 22'
]
const pathGuesses = [
	path.join(userHome, 'OneDrive', 'Documents', 'My Games', 'FarmingSimulator2022'),
	path.join(userHome, 'Documents', 'My Games', 'FarmingSimulator2022')
]
try {
	const winUtil    = require('windows')
	const userFolder = winUtil.registry('HKEY_CURRENT_USER/SOFTWARE/Microsoft/Windows/CurrentVersion/Explorer/User Shell Folders').Personal.value
	pathGuesses.unshift(path.join(userFolder, 'My Games', 'FarmingSimulator2022'))
} catch { /* do nothing */ }

gameGuesses.forEach((testPath) => {
	if ( fs.existsSync(path.join(testPath, gameExeName)) ) {
		foundGame = path.join(testPath, gameExeName)
	}
})

pathGuesses.forEach((testPath) => {
	if ( !foundPath && fs.existsSync(testPath) ) {
		foundPath     = true
		pathBestGuess = testPath
	}
})

const { modFileChecker, notModFileChecker } = require('./lib/single-mod-checker.js')

const winDef = (w, h) => { return {
	x : { type : 'number', default : -1 },
	y : { type : 'number', default : -1 },
	w : { type : 'number', default : w },
	h : { type : 'number', default : h },
	m : { type : 'boolean', default : false },
}}

const settingsMig = {
	'>=1.2.1' : (store) => {
		store.delete('main_window_x')
		store.delete('main_window_y')
		store.delete('main_window_max')
		store.delete('detail_window_x')
		store.delete('detail_window_y')
		store.delete('detail_window_max')
	},
}

const settingsSchema = {
	modFolders        : { type : 'array', default : [] },
	lock_lang         : { type : 'boolean', default : false },
	force_lang        : { type : 'string', default : '' },
	game_settings     : { type : 'string', default : path.join(pathBestGuess, 'gameSettings.xml') },
	game_path         : { type : 'string', default : foundGame },
	cache_version     : { type : 'string', default : '0.0.0' },
	rel_notes         : { type : 'string', default : '0.0.0' },
	game_args         : { type : 'string', default : '' },
	wins              : { type : 'object', default : {}, properties : {
		load          : { type : 'object', default : {}, properties : winDef(600, 300), additionalProperties : false },
		splash        : { type : 'object', default : {}, properties : winDef(600, 300), additionalProperties : false },
		change        : { type : 'object', default : {}, properties : winDef(650, 350), additionalProperties : false },
		confirm       : { type : 'object', default : {}, properties : winDef(750, 500), additionalProperties : false },
		debug         : { type : 'object', default : {}, properties : winDef(1000, 500), additionalProperties : false },
		detail        : { type : 'object', default : {}, properties : winDef(800, 500), additionalProperties : false },
		folder        : { type : 'object', default : {}, properties : winDef(800, 500), additionalProperties : false },
		main          : { type : 'object', default : {}, properties : winDef(1000, 700), additionalProperties : false },
		notes         : { type : 'object', default : {}, properties : winDef(800, 500), additionalProperties : false },
		prefs         : { type : 'object', default : {}, properties : winDef(800, 500), additionalProperties : false },
		resolve       : { type : 'object', default : {}, properties : winDef(750, 600), additionalProperties : false },
		save          : { type : 'object', default : {}, properties : winDef(900, 500), additionalProperties : false },
		version       : { type : 'object', default : {}, properties : winDef(800, 500), additionalProperties : false },
	}},
}

const Store   = require('electron-store')
const unzip   = require('unzip-stream')
const { saveFileChecker } = require('./lib/savegame-parser.js')

const mcStore = new Store({schema : settingsSchema, migrations : settingsMig })
const maCache = new Store({name : 'mod_cache'})
const modNote = new Store({name : 'col_notes'})

const newModsList = []

let modFolders    = new Set()
let modFoldersMap = {}
let modList       = {}
let bindConflict  = {}
let countTotal    = 0
let countMods     = 0
let modHubList    = {}
let modHubVersion = {}
let lastFolderLoc = null
let lastGameSettings = {}


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
	change  : null,
	confirm : null,
	debug   : null,
	detail  : null,
	folder  : null,
	load    : null,
	main    : null,
	notes   : null,
	prefs   : null,
	resolve : null,
	save    : null,
	splash  : null,
	version : null,
}

let foldersDirty = true
let firstMin     = true

let gameSettings    = mcStore.get('game_settings')

if ( ! gameSettings.endsWith('.xml') ) {
	gameSettings = path.join(pathBestGuess, 'gameSettings.xml')
	mcStore.set('game_settings', gameSettings)
}

let gameSettingsXML = null
let gameXML         = null
let overrideFolder  = null
let overrideIndex   = '999'
let overrideActive  = null
let devControls     = false

/** Upgrade Cache Version Here */

if ( semverGt('1.0.2', mcStore.get('cache_version'))) {
	log.log.warning('Invalid Mod Cache (old), resetting.')
	maCache.clear()
	log.log.info('Mod Cache Cleared')
} else {
	log.log.debug('Mod Cache Version Good')
}

mcStore.set('cache_version', app.getVersion())

/** END: Upgrade Cache Version Here */


/*  _    _  ____  _  _  ____   _____  _    _  ___ 
   ( \/\/ )(_  _)( \( )(  _ \ (  _  )( \/\/ )/ __)
    )    (  _)(_  )  (  )(_) ) )(_)(  )    ( \__ \
   (__/\__)(____)(_)\_)(____/ (_____)(__/\__)(___/ */
function getRealCenter(winName) {
	const realCenter  = { x : null, y : null }
	const winSettings = mcStore.get(`wins.${winName}`)

	if ( winName !== 'main' && windows.main !== null ) {
		const winMainBounds = windows.main.getBounds()
		const whichScreen = screen.getDisplayNearestPoint({x : winMainBounds.x, y : winMainBounds.y})
		realCenter.x = (whichScreen.workArea.width / 2) + whichScreen.workArea.x
		realCenter.y = (whichScreen.workArea.height / 2) + whichScreen.workArea.y
	} else {
		const primary = screen.getPrimaryDisplay()
		realCenter.x = (primary.workArea.width / 2) + primary.workArea.x
		realCenter.y = (primary.workArea.height / 2) + primary.workArea.y
	}
	realCenter.x = Math.floor(realCenter.x - ( winSettings.w / 2 ))
	realCenter.y = Math.floor(realCenter.y - ( winSettings.h / 2 ))
	return realCenter
}

function createSubWindow(winName, {noSelect = true, show = true, parent = null, title = null, fixed = false, frame = true, move = true, preload = null} = {}) {
	const realCenter  = getRealCenter(winName)
	const winSettings = mcStore.get(`wins.${winName}`)

	const winOptions = {
		minimizable     : !fixed,
		alwaysOnTop     : fixed && !devDebug,
		maximizable     : !fixed,
		fullscreenable  : !fixed,
	}
	const winTitle = ( title === null ) ? myTranslator.syncStringLookup('app_name') : title
	const thisWindow = new BrowserWindow({
		icon            : pathIcon,
		parent          : ( parent === null ) ? null : windows[parent],
		x               : winSettings.x > -1 ? Math.floor(winSettings.x) : realCenter.x,
		y               : winSettings.y > -1 ? Math.floor(winSettings.y) : realCenter.y,
		width           : winSettings.w,
		height          : winSettings.h,
		title           : winTitle,
		minimizable     : winOptions.minimizable,
		//center          : winSettings.x === -1 && winSettings.y === -1,
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
	if ( noSelect ) {
		thisWindow.webContents.on('before-input-event', (event, input) => {
			if (input.control && input.key.toLowerCase() === 'a') {
				event.preventDefault()
			}
			if ( input.alt && input.control && input.key.toLowerCase() === 'd' ) {
				createDebugWindow()
				event.preventDefault()
			}
		})
	}
	if ( winName !== 'load' && winName !== 'splash' ) {
		thisWindow.on('moved', () => {
			const newRect = thisWindow.getBounds()
			mcStore.set(`wins.${winName}.x`, newRect.x)
			mcStore.set(`wins.${winName}.y`, newRect.y)
		})
		thisWindow.on('resized', () => {
			const newRect = thisWindow.getBounds()
			mcStore.set(`wins.${winName}.w`, newRect.width)
			mcStore.set(`wins.${winName}.h`, newRect.height)
		})
		thisWindow.on('maximize', () => { mcStore.set(`wins.${winName}.m`, true) })
		thisWindow.on('unmaximize', () => { mcStore.set(`wins.${winName}.m`, false) })
	}

	if ( !devDebug ) { thisWindow.removeMenu()}
	if ( winSettings.m )  { thisWindow.maximize() }
	return thisWindow
}

function createMainWindow () {
	windows.load = createSubWindow('load', { show : false, preload : 'loadingWindow', fixed : true, move : false, frame : false })
	windows.load.loadFile(path.join(pathRender, 'loading.html'))
	windows.load.on('close', (event) => { event.preventDefault() })

	windows.main = createSubWindow('main', { noSelect : false, show : devDebug, preload : 'mainWindow' })

	windows.main.on('minimize', () => {
		if ( tray ) {
			if ( firstMin ) {
				const bubbleOpts = {
					icon    : trayIcon,
					title   : myTranslator.syncStringLookup('minimize_message_title'),
					content : myTranslator.syncStringLookup('minimize_message'),
				}

				tray.displayBalloon(bubbleOpts)

				setTimeout(() => { tray.removeBalloon() }, 5000)
			}
			
			firstMin = false
			windows.main.hide()
		}
	})
	windows.main.on('closed',   () => {
		if ( tray ) { tray.destroy() }
		windows.load.destroy()
	})

	if ( !devDebug ) {
		windows.splash = createSubWindow('splash', { center : true, fixed : true, move : false, frame : false })
		windows.splash.loadURL(`file://${path.join(pathRender, 'splash.html')}?version=${app.getVersion()}`)

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

	windows.main.webContents.on('before-input-event', (event, input) => {
		if (input.control && input.key.toLowerCase() === 'a') {
			windows.main.webContents.send('fromMain_selectAllOpen')
			event.preventDefault()
		}
		if (input.control && input.shift && input.key.toLowerCase() === 'a') {
			windows.main.webContents.send('fromMain_selectNoneOpen')
			event.preventDefault()
		}
		if (input.control && input.key.toLowerCase() === 'i') {
			windows.main.webContents.send('fromMain_selectInvertOpen')
			event.preventDefault()
		}
		if ( input.alt && input.control && input.key.toLowerCase() === 'd' ) {
			createDebugWindow()
			event.preventDefault()
		}
	})
	
	windows.main.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url)
		return { action : 'deny' }
	})
}

function createConfirmFav(mods, destinations) {
	if ( mods.length < 1 ) { return }
	if ( windows.confirm ) { windows.confirm.focus(); return }

	windows.confirm = createSubWindow('confirm', { parent : 'main', preload : 'confirmMulti', fixed : true })

	windows.confirm.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_confirmList', mods, destinations, modList)
	})

	windows.confirm.loadFile(path.join(pathRender, 'confirm-multi.html'))

	windows.confirm.on('closed', () => { windows.confirm = null; windows.main.focus() })
}

function createConfirmWindow(type, modRecords, origList) {
	if ( modRecords.length < 1 ) { return }
	if ( windows.confirm ) { windows.confirm.focus(); return }

	const file_HTML  = `confirm-file${type.charAt(0).toUpperCase()}${type.slice(1)}.html`
	const file_JS    = `confirm${type.charAt(0).toUpperCase()}${type.slice(1)}`
	const collection = origList[0].split('--')[0]

	windows.confirm = createSubWindow('confirm', { parent : 'main', preload : file_JS, fixed : true })

	windows.confirm.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_confirmList', modRecords, modList, modFoldersMap, collection)
	})

	windows.confirm.loadFile(path.join(pathRender, file_HTML))

	windows.confirm.on('closed', () => { windows.confirm = null; windows.main.focus() })
}

function createChangeLogWindow() {
	if ( windows.change ) {
		windows.change.focus()
		return
	}

	windows.change = createSubWindow('change', { parent : 'main', fixed : true, preload : 'aChangelogWindow' })

	windows.change.loadFile(path.join(pathRender, 'a_changelog.html'))
	windows.change.on('closed', () => { windows.change = null; windows.main.focus() })
}

function createFolderWindow() {
	if ( windows.folder ) {
		windows.folder.focus()
		windows.folder.webContents.send('fromMain_getFolders', modList)
		return
	}

	windows.folder = createSubWindow('folder', { parent : 'main', preload : 'folderWindow' })

	windows.folder.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_getFolders', modList)
	})

	windows.folder.loadFile(path.join(pathRender, 'folders.html'))
	windows.folder.on('closed', () => { windows.folder = null; windows.main.focus(); processModFolders() })
}

function createDetailWindow(thisModRecord) {
	if ( thisModRecord === null ) { return }
	const modhubRecord = modRecordToModHub(thisModRecord)

	if ( windows.detail ) {
		windows.detail.focus()
		windows.detail.webContents.send('fromMain_modRecord', thisModRecord, modhubRecord, bindConflict, myTranslator.currentLocale)
		return
	}

	windows.detail = createSubWindow('detail', { parent : 'main', preload : 'detailWindow' })

	windows.detail.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_modRecord', thisModRecord, modhubRecord, bindConflict, myTranslator.currentLocale)
		if ( devDebug ) { windows.detail.webContents.openDevTools() }
	})

	windows.detail.loadFile(path.join(pathRender, 'detail.html'))
	windows.detail.on('closed', () => { windows.detail = null; windows.main.focus() })

	windows.detail.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url)
		return { action : 'deny' }
	})
}

function createDebugWindow() {
	if ( windows.debug ) {
		windows.debug.focus()
		windows.debug.webContents.send('fromMain_debugLog', log.htmlLog)
		return
	}

	windows.debug = createSubWindow('debug', { parent : 'main', preload : 'debugWindow' })

	windows.debug.webContents.on('did-finish-load', (event) => {
		event.sender.send('fromMain_debugLog', log.htmlLog)
	})

	windows.debug.loadFile(path.join(app.getAppPath(), 'renderer', 'debug.html'))
	windows.debug.on('closed', () => { windows.debug = null; windows.main.focus() })
}

function createPrefsWindow() {
	if ( windows.prefs ) {
		windows.prefs.focus()
		windows.prefs.webContents.send( 'fromMain_allSettings', mcStore.store, devControls )
		return
	}

	windows.prefs = createSubWindow('prefs', { parent : 'main', preload : 'prefsWindow', title : myTranslator.syncStringLookup('user_pref_title_main') })

	windows.prefs.webContents.on('did-finish-load', (event) => {
		event.sender.send( 'fromMain_allSettings', mcStore.store, devControls )
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

	windows.save = createSubWindow('save', { parent : 'main', preload : 'savegameWindow' })

	windows.save.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_collectionName', collection, modList)
		if ( devDebug ) { windows.save.webContents.openDevTools() }
	})

	windows.save.loadFile(path.join(pathRender, 'savegame.html'))
	windows.save.on('closed', () => { windows.save = null; windows.main.focus() })
}

function createNotesWindow(collection) {
	if ( windows.notes ) {
		windows.notes.focus()
		windows.notes.webContents.send('fromMain_collectionName', collection, modList[collection].name, modNote.store, lastGameSettings)
		return
	}

	windows.notes = createSubWindow('notes', { parent : 'main', preload : 'notesWindow' })

	windows.notes.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_collectionName', collection, modList[collection].name, modNote.store, lastGameSettings)
		if ( devDebug ) { windows.notes.webContents.openDevTools() }
	})

	windows.notes.loadFile(path.join(pathRender, 'notes.html'))
	windows.notes.on('closed', () => { windows.notes = null; windows.main.focus(); processModFolders() })
}

function createResolveWindow(modSet, shortName) {
	if ( windows.resolve ) {
		windows.resolve.webContents.send('fromMain_modSet', modSet, shortName)
		windows.resolve.focus()
		return
	}

	windows.resolve = createSubWindow('resolve', { parent : 'version', preload : 'resolveWindow', fixed : true })

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

	windows.version = createSubWindow('version', { parent : 'main', preload : 'versionWindow' })

	windows.version.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_modList', modList)
		if ( devDebug ) { windows.version.webContents.openDevTools() }
	})

	windows.version.loadFile(path.join(pathRender, 'versions.html'))
	windows.version.on('closed', () => { windows.version = null; windows.main.focus() })
}

function loadingWindow_open(l10n) {
	const newCenter   = getRealCenter('load')
	const winTitle    = myTranslator.syncStringLookup((l10n) !== 'launch' ? `loading_${l10n}_title` : 'app_name')
	const winSubTitle = myTranslator.syncStringLookup((l10n) !== 'launch' ? `loading_${l10n}_subtitle` : 'launch_fs22')
	if ( windows.load ) {
		try {
			windows.load.setBounds({x : newCenter.x, y : newCenter.y})
		} catch (e) {
			windows.load.center()
			log.log.debug(`Center window in display failed : ${e}`, 'load-window')
		}
		windows.load.show()
		windows.load.focus()
		windows.load.webContents.send('formMain_loadingTitles', winTitle, winSubTitle)
		setTimeout(() => {
			windows.load.show()
			windows.load.focus()
		}, 250)
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

function isNetworkError(errorObject) {
	return errorObject.message.startsWith('net::ERR_')// ||
	// errorObject.message === 'net::ERR_INTERNET_DISCONNECTED' ||
	// errorObject.message === 'net::ERR_PROXY_CONNECTION_FAILED' ||
	// errorObject.message === 'net::ERR_CONNECTION_RESET' ||
	// errorObject.message === 'net::ERR_CONNECTION_CLOSE' ||
	// errorObject.message === 'net::ERR_NAME_NOT_RESOLVED' ||
	// errorObject.message === 'net::ERR_CONNECTION_TIMED_OUT' ||
	// errorObject.message === 'net::ERR_SSL_PROTOCOL_ERROR'
}

/*  ____  ____   ___ 
   (_  _)(  _ \ / __)
    _)(_  )___/( (__ 
   (____)(__)   \___) */

/** File operation buttons */
ipcMain.on('toMain_makeInactive', () => { parseSettings({ disable : true }) })
ipcMain.on('toMain_makeActive',   (event, newList) => {
	parseSettings({
		newFolder  : modFoldersMap[newList],
		userName   : modNote.get(`${newList}.notes_username`, null),
		password   : modNote.get(`${newList}.notes_password`, null),
		serverName : modNote.get(`${newList}.notes_server`, null),
	})
})
ipcMain.on('toMain_openMods',     (event, mods) => {
	const thisCollectionFolder = modFoldersMap[mods[0].split('--')[0]]
	const thisMod = modIdToRecord(mods[0])

	if ( thisMod !== null ) {
		shell.showItemInFolder(path.join(thisCollectionFolder, path.basename(thisMod.fileDetail.fullPath)))
	}
})
ipcMain.on('toMain_openHub',     (event, mods) => {
	const thisMod = modIdToRecord(mods[0])
	const thisModId = modHubList.mods[thisMod.fileDetail.shortName] || null

	if ( thisModId !== null ) {
		shell.openExternal(`https://www.farming-simulator.com/mod.php?mod_id=${thisModId}`)
	}
})

ipcMain.on('toMain_copyFavorites',  () => {
	const favCols     = []
	const sourceFiles = []
	let destCols      = Object.keys(modList)

	Object.keys(modNote.store).forEach((collection) => {
		if ( modNote.get(`${collection}.notes_favorite`, false) === true ) { favCols.push(collection) }
	})

	favCols.forEach((collection) => {
		destCols = destCols.filter((item) => item !== collection )
		modList[collection].mods.forEach((thisMod) => {
			sourceFiles.push([
				thisMod.fileDetail.fullPath,
				collection,
				thisMod.fileDetail.shortName,
				thisMod.l10n.title
			])
		})
	})

	createConfirmFav(sourceFiles, destCols)
})
ipcMain.on('toMain_deleteMods',     (event, mods) => { createConfirmWindow('delete', modIdsToRecords(mods), mods) })
ipcMain.on('toMain_moveMods',       (event, mods) => { createConfirmWindow('move', modIdsToRecords(mods), mods) })
ipcMain.on('toMain_copyMods',       (event, mods) => { createConfirmWindow('copy', modIdsToRecords(mods), mods) })
ipcMain.on('toMain_realFileDelete', (event, fileMap) => { fileOperation('delete', fileMap) })
ipcMain.on('toMain_realFileMove',   (event, fileMap) => { fileOperation('move', fileMap) })
ipcMain.on('toMain_realFileCopy',   (event, fileMap) => { fileOperation('copy', fileMap) })
ipcMain.on('toMain_realFileVerCP',  (event, fileMap) => {
	fileOperation('copy', fileMap, 'resolve')
	setTimeout(() => {
		windows.version.webContents.send('fromMain_modList', modList)
	}, 1500)
})
/** END: File operation buttons */


/** Folder Window Operation */
ipcMain.on('toMain_addFolder', () => {
	dialog.showOpenDialog(windows.main, {
		properties : ['openDirectory'], defaultPath : (lastFolderLoc !== null) ? lastFolderLoc : userHome,
	}).then((result) => {
		if ( !result.canceled ) {
			let alreadyExists = false

			modFolders.forEach((thisPath) => {
				if ( path.relative(thisPath, result.filePaths[0]) === '' ) { alreadyExists = true }
			})

			lastFolderLoc = path.resolve(path.join(result.filePaths[0], '..'))

			if ( ! alreadyExists ) {
				modFolders.add(result.filePaths[0]); foldersDirty = true
				mcStore.set('modFolders', Array.from(modFolders))
				processModFolders(result.filePaths[0])
			} else {
				log.log.notice('Add folder :: canceled, already exists in list', 'folder-opts')
			}
		} else {
			log.log.debug('Add folder :: canceled by user', 'folder-opts')
		}
	}).catch((unknownError) => {
		log.log.danger(`Could not read specified add folder : ${unknownError}`, 'folder-opts')
	})
})
ipcMain.on('toMain_editFolders',    () => { createFolderWindow() })
ipcMain.on('toMain_openFolder',     (event, folder) => { shell.openPath(folder) })
ipcMain.on('toMain_refreshFolders', () => { foldersDirty = true; processModFolders() })
ipcMain.on('toMain_removeFolder',   (event, folder) => {
	if ( modFolders.delete(folder) ) {
		log.log.notice(`Folder removed from list ${folder}`, 'folder-opts')
		mcStore.set('modFolders', Array.from(modFolders))
		Object.keys(modList).forEach((collection) => {
			if ( modList[collection].fullPath === folder ) { delete modList[collection] }
		})
		Object.keys(modFoldersMap).forEach((collection) => {
			if ( modFoldersMap[collection] === folder ) { delete modFoldersMap[collection]}
		})
		windows.folder.webContents.send('fromMain_getFolders', modList)
		foldersDirty = true

	} else {
		log.log.warning(`Folder NOT removed from list ${folder}`, 'folder-opts')
	}
})

ipcMain.on('toMain_reorderFolder', (event, from, to) => {
	const newOrder = Array.from(modFolders)
	const item     = newOrder.splice(from, 1)[0]
	newOrder.splice(to, 0, item)
	
	const reorder_modList       = {}
	const reorder_modFoldersMap = {}

	newOrder.forEach((path) => {
		Object.keys(modFoldersMap).forEach((collection) => {
			if ( modFoldersMap[collection] === path ) {
				reorder_modFoldersMap[collection] = modFoldersMap[collection]
			}
		})
		Object.keys(modList).forEach((collection) => {
			if ( modList[collection].fullPath === path ) {
				reorder_modList[collection] = modList[collection]
			}
		})
	})

	modFolders    = new Set(newOrder)
	modList       = reorder_modList
	modFoldersMap = reorder_modFoldersMap

	mcStore.set('modFolders', Array.from(modFolders))

	windows.folder.webContents.send('fromMain_getFolders', modList)
	foldersDirty = true
})
/** END: Folder Window Operation */


/** Logging Operation */
ipcMain.on('toMain_log', (event, level, process, text) => { log.log[level](text, process) })
/** END: Logging Operation */

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
			event.sender.send('fromMain_getText_return', [l10nEntry, app.getVersion()])
		} else if ( l10nEntry === 'clean_cache_size' ) {
			const cleanString = myTranslator.syncStringLookup(l10nEntry)
			let cacheSize = 0
			try {
				const cacheStats = fs.statSync(path.join(app.getPath('userData'), 'mod_cache.json'))
				cacheSize = cacheStats.size/(1024*1024)
			} catch { /* ignore */ }

			event.sender.send('fromMain_getText_return', [l10nEntry, `${cleanString} ${cacheSize.toFixed(2)}MB`])
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
ipcMain.on('toMain_showChangelog', () => { createChangeLogWindow() } )
/** END: Detail window operation */


/** Debug window operation */
ipcMain.on('openDebugLogContents', () => { createDebugWindow() })
ipcMain.on('openDebugLogFolder',   () => { shell.showItemInFolder(log.pathToLog) })
ipcMain.on('getDebugLogContents',  (event) => { event.sender.send('fromMain_debugLog', log.htmlLog) })
/** END: Debug window operation */


/** Game launcher */
ipcMain.on('toMain_startFarmSim', () => {
	const progPath = mcStore.get('game_path')
	if ( progPath !== '' && fs.existsSync(progPath) ) {
		loadingWindow_open('launch')
		loadingWindow_noCount()
		loadingWindow_hide(3500)
		const cp       = require('child_process')
		const child    = cp.spawn(progPath, mcStore.get('game_args').split(' '), { detached : true, stdio : ['ignore', 'ignore', 'ignore'] })
		child.unref()
	} else {
		const dialogOpts = {
			type    : 'info',
			title   : myTranslator.syncStringLookup('launcher_error_title'),
			message : myTranslator.syncStringLookup('launcher_error_message'),
		}
		dialog.showMessageBox(dialogOpts)
		log.log.warning('Game path not set or invalid!', 'game-launcher')
	}
})
/** END: game launcher */

/** Preferences window operation */
ipcMain.on('toMain_openPrefs', () => { createPrefsWindow() })
ipcMain.on('toMain_getPref', (event, name) => { event.returnValue = mcStore.get(name) })
ipcMain.on('toMain_setPref', (event, name, value) => {
	if ( name === 'dev_mode' ) {
		parseGameXML(value)
	} else {
		mcStore.set(name, value)
		if ( name === 'lock_lang' ) { mcStore.set('force_lang', myTranslator.currentLocale) }
	}
	event.sender.send( 'fromMain_allSettings', mcStore.store, devControls )
})
ipcMain.on('toMain_resetWindows', () => {
	mcStore.reset('wins')
	const mainBounds = mcStore.get('wins.main')
	const prefBounds = mcStore.get('wins.prefs')
	windows.main.unmaximize()
	windows.prefs.unmaximize()
	try {
		windows.main.setBounds({width : Math.floor(mainBounds.w), height : Math.floor(mainBounds.h)})
		windows.prefs.setBounds({width : Math.floor(prefBounds.w), height : Math.floor(prefBounds.h)})
	} catch (e) {
		log.log.debug(`Reset failed : ${e}`, 'reset-windows')
	}
	windows.main.center()
	windows.prefs.center()
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
			event.sender.send( 'fromMain_allSettings', mcStore.store, devControls )
		}
	}).catch((unknownError) => {
		log.log.danger(`Could not read specified gamesettings : ${unknownError}`, 'game-settings')
	})
})
ipcMain.on('toMain_setGamePath', (event) => {
	dialog.showOpenDialog(windows.prefs, {
		properties  : ['openFile'],
		defaultPath : path.join(userHome, gameExeName),
		filters     : [
			{ name : gameExeName, extensions : ['exe'] },
			{ name : 'All', extensions : ['*'] },
		],
	}).then((result) => {
		if ( ! result.canceled ) {
			mcStore.set('game_path', result.filePaths[0])
			parseSettings()
			refreshClientModList()
			event.sender.send( 'fromMain_allSettings', mcStore.store, devControls )
		}
	}).catch((unknownError) => {
		log.log.danger(`Could not read specified game EXE : ${unknownError}`, 'game-path')
	})
})
/** END: Preferences window operation */


/** Notes Operation */
ipcMain.on('toMain_openNotes', (event, collection) => { createNotesWindow(collection) })
ipcMain.on('toMain_setNote', (event, id, value, collection) => {
	if ( id === 'notes_website' || id === 'notes_websiteDL' || id === 'notes_favorite' ) { foldersDirty = true }

	if ( value === '' ) {
		modNote.delete(`${collection}.${id}`)
	} else {
		modNote.set(`${collection}.${id}`, value)
	}

	createNotesWindow(collection)
})

/** END: Notes Operation */

/** Download operation */
ipcMain.on('toMain_downloadList', (event, collection) => {
	const thisSite = modNote.get(`${collection}.notes_website`, null)
	const thisDoDL = modNote.get(`${collection}.notes_websiteDL`, false)
	const thisLink = `${thisSite}all_mods_download?onlyActive=true`

	if ( thisSite === null || !thisDoDL ) { return }

	dialog.showMessageBoxSync(windows.main, {
		title   : myTranslator.syncStringLookup('download_title'),
		message : `${myTranslator.syncStringLookup('download_started')} :: ${modList[collection].name}\n${myTranslator.syncStringLookup('download_finished')}`,
		type    : 'info',
	})

	log.log.info(`Downloading Collection : ${collection}`, 'mod-download')
	log.log.info(`Download Link : ${thisLink}`, 'mod-download')

	loadingWindow_open('download')

	const dlReq = net.request(thisLink)

	dlReq.on('response', (response) => {
		log.log.info(`Got download: ${response.statusCode}`, 'mod-download')

		if ( response.statusCode < 200 || response.statusCode >= 400 ) {
			dialog.showMessageBoxSync(windows.main, {
				title   : myTranslator.syncStringLookup('download_title'),
				message : `${myTranslator.syncStringLookup('download_failed')} :: ${modList[collection].name}`,
				type    : 'error',
			})
		}

		loadingWindow_total(response.headers['content-length'] || 0, true)

		const dlPath      = path.join(app.getPath('temp'), `${collection}.zip`)
		const writeStream = fs.createWriteStream(dlPath)

		response.pipe(writeStream)
		response.on('data', (chunk) => { loadingWindow_current(chunk.length) })

		writeStream.on('finish', () => {
			writeStream.close()
			log.log.info('Download complete, unzipping', 'mod-download')
			try {
				let zipBytesSoFar   = 0
				const zipBytesTotal = fs.statSync(dlPath).size

				loadingWindow_open('zip')
				loadingWindow_total(100, true)

				const zipReadStream  = fs.createReadStream(dlPath)

				zipReadStream.on('data', (chunk) => {
					zipBytesSoFar += chunk.length
					loadingWindow_current(((zipBytesSoFar/zipBytesTotal)*100).toFixed(2), true)
				})

				zipReadStream.on('error', (err) => {
					loadingWindow_hide()
					log.log.warning(`Download unzip failed : ${err}`, 'mod-download')
				})

				zipReadStream.on('end', () => {
					log.log.info('Unzipping complete', 'mod-download')
					zipReadStream.close()
					foldersDirty = true
					fs.unlinkSync(dlPath)
					processModFolders()
				})

				zipReadStream.pipe(unzip.Extract({ path : modList[collection].fullPath }))
			} catch (e) {
				log.log.warning(`Download failed : (${response.statusCode}) ${e}`, 'mod-download')
				loadingWindow_hide()
			}
		})
	})
	dlReq.on('error', (error) => { log.log.warning(`Network error : ${error}`, 'mod-download'); loadingWindow_hide() })
	dlReq.end()
})

/** END: download operation */

/** Export operation */
ipcMain.on('toMain_exportList', (event, collection) => {
	const csvTable = []
	csvTable.push('"Mod","Title","Version","Author","Link"')

	modList[collection].mods.forEach((mod) => {
		const modHubID   = modHubList.mods[mod.fileDetail.shortName] || null
		const modHubLink = ( modHubID !== null ) ? `https://www.farming-simulator.com/mod.php?mod_id=${modHubID}` : ''
		csvTable.push(`"${mod.fileDetail.shortName}.zip","${mod.l10n.title.replaceAll('"', '\'')}","${mod.modDesc.version}","${mod.modDesc.author.replaceAll('"', '\'')}","${modHubLink}"`)
	})

	dialog.showSaveDialog(windows.main, {
		defaultPath : path.join(app.getPath('desktop'), `${modList[collection].name}.csv`),
		filters     : [
			{ name : 'CSV', extensions : ['csv'] },
		],
	}).then(async (result) => {
		if ( result.canceled ) {
			log.log.debug('Save CSV Cancelled', 'csv-export')
		} else {
			try {
				fs.writeFileSync(result.filePath, csvTable.join('\n'))
				dialog.showMessageBoxSync(windows.main, {
					message : myTranslator.syncStringLookup('save_csv_worked'),
					type    : 'info',
				})
			} catch (err) {
				log.log.warning(`Could not save csv file : ${err}`, 'csv-export')
				dialog.showMessageBoxSync(windows.main, {
					message : myTranslator.syncStringLookup('save_csv_failed'),
					type    : 'warning',
				})
			}
		}
	}).catch((unknownError) => {
		log.log.warning(`Could not save csv file : ${unknownError}`, 'csv-export')
	})
})
/** END: Export operation */

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
				const thisSavegame = new saveFileChecker(result.filePaths[0], !zipMode, log)
				windows.save.webContents.send('fromMain_saveInfo', modList, thisSavegame, modHubList)
			} catch (e) {
				log.log.danger(`Load failed: ${e}`, 'savegame')
			}
		}
	}).catch((unknownError) => {
		log.log.danger(`Could not read specified file/folder : ${unknownError}`, 'savegame')
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
		myTranslator.deferCurrentLocale(),
		modList,
		[myTranslator.syncStringLookup('override_disabled'), myTranslator.syncStringLookup('override_unknown')],
		overrideIndex,
		modFoldersMap,
		newModsList,
		modHubList,
		modHubVersion,
		bindConflict,
		modNote.store
	)
}

function modRecordToModHub(mod) {
	const modId = modHubList.mods[mod.fileDetail.shortName] || null
	return [modId, (modHubVersion[modId] || null), modHubList.last.includes(modId)]
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


function parseGameXML(devMode = null) {
	const gameXMLFile = gameSettings.replace('gameSettings.xml', 'game.xml')

	let   XMLString = ''
	const XMLParser = new fxml.XMLParser({
		commentPropName    : '#comment',
		ignoreAttributes   : false,
		numberParseOptions : { leadingZeros : true, hex : true, skipLike : /[0-9]\.[0-9]{6}/ },
	})
	
	try {
		XMLString = fs.readFileSync(gameXMLFile, 'utf8')
	} catch (e) {
		log.log.danger(`Could not read game xml ${e}`, 'game-xml')
		return
	}

	try {
		gameXML = XMLParser.parse(XMLString)
		devControls = gameXML.game.development.controls
	} catch (e) {
		log.log.danger(`Could not read game xml ${e}`, 'game-xml')
	}
	
	if ( devMode !== null ) {
		gameXML.game.development.controls = devMode

		const builder    = new fxml.XMLBuilder({
			commentPropName           : '#comment',
			ignoreAttributes          : false,
			suppressBooleanAttributes : false,
			format                    : true,
			indentBy                  : '    ',
			suppressEmptyNode         : true,
		})

		try {
			fs.writeFileSync(gameXMLFile, builder.build(gameXML))
		} catch (e) {
			log.log.danger(`Could not write game xml ${e}`, 'game-xml')
		}

		parseGameXML(null)
	}
}
/** Business Functions */
function parseSettings({disable = null, newFolder = null, userName = null, serverName = null, password = null } = {}) {
	if ( ! gameSettings.endsWith('.xml') ) {
		log.log.danger(`Game settings is not an xml file ${gameSettings}, fixing`, 'game-settings')
		gameSettings = path.join(pathBestGuess, 'gameSettings.xml')
		mcStore.set('game_settings', gameSettings)
	}

	let   XMLString = ''
	const XMLParser = new fxml.XMLParser({
		commentPropName    : '#comment',
		ignoreAttributes   : false,
		numberParseOptions : { leadingZeros : true, hex : true, skipLike : /[0-9]\.[0-9]{6}/ },
	})
	
	try {
		XMLString = fs.readFileSync(gameSettings, 'utf8')
	} catch (e) {
		log.log.danger(`Could not read game settings ${e}`, 'game-settings')
		return
	}

	try {
		gameSettingsXML = XMLParser.parse(XMLString)
		overrideActive  = gameSettingsXML.gameSettings.modsDirectoryOverride['@_active']
		overrideFolder  = gameSettingsXML.gameSettings.modsDirectoryOverride['@_directory']
		lastGameSettings = {
			username : gameSettingsXML.gameSettings.onlinePresenceName || '',
			password : gameSettingsXML.gameSettings.joinGame['@_password'] || '',
			server   : gameSettingsXML.gameSettings.joinGame['@_serverName'] || '',
		}

	} catch (e) {
		log.log.danger(`Could not read game settings ${e}`, 'game-settings')
	}

	if ( overrideActive === 'false' || overrideActive === false ) {
		overrideIndex = '0'
	} else {
		overrideIndex = '999'
		Object.keys(modFoldersMap).forEach((cleanName) => {
			if ( modFoldersMap[cleanName] === overrideFolder ) { overrideIndex = cleanName }
		})
	}

	if ( disable !== null || newFolder !== null || userName !== null || password !== null || serverName !== null ) {
		loadingWindow_open('set')
		loadingWindow_noCount()

		if ( newFolder !== null ) {
			gameSettingsXML.gameSettings.modsDirectoryOverride['@_active']    = true
			gameSettingsXML.gameSettings.modsDirectoryOverride['@_directory'] = newFolder
		}

		if ( disable === true ) {
			gameSettingsXML.gameSettings.modsDirectoryOverride['@_active']    = true
			gameSettingsXML.gameSettings.modsDirectoryOverride['@_directory'] = ''
		}

		if ( userName !== null ) {
			gameSettingsXML.gameSettings.onlinePresenceName = userName
		}

		if ( password !== null ) {
			gameSettingsXML.gameSettings.joinGame['@_password'] = password
		}

		if ( serverName !== null ) {
			gameSettingsXML.gameSettings.joinGame['@_serverName'] = serverName
		}

		
		const builder    = new fxml.XMLBuilder({
			commentPropName           : '#comment',
			ignoreAttributes          : false,
			suppressBooleanAttributes : false,
			format                    : true,
			indentBy                  : '    ',
			suppressEmptyNode         : true,
		})

		try {
			let outputXML = builder.build(gameSettingsXML)

			outputXML = outputXML.replace('<ingameMapFruitFilter/>', '<ingameMapFruitFilter></ingameMapFruitFilter>')

			fs.writeFileSync(gameSettings, outputXML)
		} catch (e) {
			log.log.danger(`Could not write game settings ${e}`, 'game-settings')
		}

		parseSettings()
		refreshClientModList()
		loadingWindow_hide(1500)
	}
}

let fileWait = null
function fileOperation(type, fileMap, srcWindow = 'confirm') {
	windows[srcWindow].close()

	loadingWindow_open('files', 'main')
	loadingWindow_total(fileMap.length, true)
	loadingWindow_current(0, true)

	fileWait = setInterval(() => {
		if ( windows.load.isVisible() ) {
			clearInterval(fileWait)
			fileOperation_post(type, fileMap)
		}
	}, 250)
}


function fileOperation_post(type, fileMap) {
	const fullPathMap = []

	fileMap.forEach((file) => {
		const thisFileName = path.basename(file[2])
		fullPathMap.push([
			path.join(modFoldersMap[file[1]], thisFileName), // source
			path.join(modFoldersMap[file[0]], thisFileName), // dest
		])
	})

	foldersDirty = true

	fullPathMap.forEach((file) => {
		try {
			switch ( type ) {
				case 'copy' :
					log.log.info(`Copy File : ${file[0]} -> ${file[1]}`, 'file-ops')
					fs.copyFileSync(file[0], file[1])
					break
				case 'move' :
					if ( path.parse(file[0]).root !== path.parse(file[1]).root ) {
						log.log.info(`Move (cp+rm) File : ${file[0]} -> ${file[1]}`, 'file-ops')
						fs.copyFileSync(file[0], file[1])
						fs.rmSync(file[0])
					} else {
						log.log.info(`Move (rename) File : ${file[0]} -> ${file[1]}`, 'file-ops')
						fs.renameSync(file[0], file[1])
					}
					break
				case 'delete' :
					log.log.info(`Delete File : ${file[0]}`, 'file-ops')
					fs.rmSync(file[0], { recursive : true } )
					break
				default :
					break
			}
		} catch (e) {
			log.log.danger(`Could not ${type} file : ${e}`, `${type}-file`)
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
	if ( !foldersDirty ) { loadingWindow_hide(); return }

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
	if ( newFolder === false ) { modList = {}; modFoldersMap = {}}

	// Cleaner for no-longer existing folders.
	modFolders.forEach((folder) => { if ( ! fs.existsSync(folder) ) { modFolders.delete(folder) } })
	mcStore.set('modFolders', Array.from(modFolders))

	modFolders.forEach((folder) => {
		const cleanName = `col_${crypto.createHash('md5').update(folder).digest('hex')}`
		//const cleanName = folder.replaceAll('\\', '-').replaceAll(':', '').replace(/[^\w-]/gi, '_')
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
							log.log.debug(`Adding mod FROM cache: ${localStore[thisMD5Sum].fileDetail.shortName}`, `mod-${localStore[thisMD5Sum].uuid}`)
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
							log
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
							log,
							myTranslator.deferCurrentLocale
						)
						modList[cleanName].mods[modIndex] = thisModDetail
						if ( thisModDetail.md5Sum !== null ) {
							log.log.info('Adding mod to cache', `mod-${thisModDetail.uuid}`)
							newModsList.push(thisModDetail.md5Sum)
							maCache.set(thisModDetail.md5Sum, thisModDetail.storable)
						}
					} catch (e) {
						log.log.danger(`Couldn't process ${thisFile.name}: ${e}`, 'folder-reader')
					}

					loadingWindow_current()
				})
			} catch (e) {
				log.log.danger(`Couldn't process ${folder}: ${e}`, 'folder-reader')
			}
		}
	})
	foldersDirty = false

	bindConflict = {}

	Object.keys(modList).forEach((collection) => {
		bindConflict[collection] = {}
		const collectionBinds    = {}

		modList[collection].mods.forEach((thisMod) => {
			Object.keys(thisMod.modDesc.binds).forEach((actName) => {
				thisMod.modDesc.binds[actName].forEach((keyCombo) => {
					if ( keyCombo === '' ) { return }

					const safeCat   = thisMod.modDesc.actions[actName] || 'UNKNOWN'
					const thisCombo = `${safeCat}--${keyCombo}`

					collectionBinds[thisCombo] ??= []
					collectionBinds[thisCombo].push(thisMod.fileDetail.shortName)
				})
			})
		})
		Object.keys(collectionBinds).forEach((keyCombo) => {
			if ( collectionBinds[keyCombo].length > 1 ) {
				collectionBinds[keyCombo].forEach((modName) => {
					bindConflict[collection][modName] ??= {}
					bindConflict[collection][modName][keyCombo] = collectionBinds[keyCombo].filter((w) => w !== modName)
					if ( bindConflict[collection][modName][keyCombo].length === 0 ) {
						delete bindConflict[collection][modName][keyCombo]
					}
				})
			}
		})
		Object.keys(bindConflict).forEach((collection) => {
			Object.keys(bindConflict[collection]).forEach((modName) => {
				if ( Object.keys(bindConflict[collection][modName]).length === 0 ) {
					delete bindConflict[collection][modName]
				}
			})
		})
	})

	parseSettings()
	parseGameXML()
	refreshClientModList()
	loadingWindow_hide()

	if ( mcStore.get('rel_notes') !== app.getVersion() ) {
		mcStore.set('rel_notes', app.getVersion() )
		log.log.info('New version detected, show changelog')
		createChangeLogWindow()
	}
}

function loadModHub() {
	try {
		const rawData = fs.readFileSync(path.join(app.getPath('userData'), 'modHubData.json'))
		modHubList = JSON.parse(rawData)
		log.log.debug('Loaded modHubData.json', 'local-cache')
	} catch (e) {
		log.log.warning('Loading modHubData.json failed: ${e}', 'local-cache')
	}
}
function loadModHubVer() {
	try {
		const rawData = fs.readFileSync(path.join(app.getPath('userData'), 'modHubVersion.json'))
		modHubVersion = JSON.parse(rawData)
		log.log.debug('Loaded modHubVersion.json', 'local-cache')
	} catch (e) {
		log.log.warning('Loading modHubVersion.json failed: ${e}', 'local-cache')
	}
}
/** END: Business Functions */



app.whenReady().then(() => {
	if ( gotTheLock ) {
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

		const request = net.request(hubURL)

		request.on('response', (response) => {
			log.log.info(`Got modHubData.json: ${response.statusCode}`, 'local-cache')
			let mhResp = ''
			response.on('data', (chunk) => { mhResp = mhResp + chunk.toString() })
			response.on('end',  () => {
				fs.writeFileSync(path.join(app.getPath('userData'), 'modHubData.json'), mhResp)
				loadModHub()
			})
		})
		request.on('error', (error) => { log.log.info(`Network error : ${error}`, 'net-request') })
		request.end()

		const request2 = net.request(hubVerURL)

		request2.on('response', (response) => {
			log.log.info(`Got modHubVersion.json: ${response.statusCode}`, 'local-cache')
			let mhResp = ''
			response.on('data', (chunk) => { mhResp = mhResp + chunk.toString() })
			response.on('end',  () => {
				fs.writeFileSync(path.join(app.getPath('userData'), 'modHubVersion.json'), mhResp)
				loadModHubVer()
			})
		})
		request2.on('error', (error) => { log.log.info(`Network error : ${error}`, 'net-request') })
		request2.end()

		app.on('second-instance', () => {
			// Someone tried to run a second instance, we should focus our window.
			if (windows.main) {
				if ( windows.main.isMinimized()) { windows.main.show() }
				windows.main.focus()
			}
		})

		createMainWindow()

		app.on('activate', () => {if (BrowserWindow.getAllWindows().length === 0) { createMainWindow() } })
	}
})

app.setAboutPanelOptions({
	applicationName    : 'FS Mod Assist',
	applicationVersion : app.getVersion(),
	copyright          : '(c) 2022-present FSG Modding',
	credits            : 'J.T.Sage <jtsage+datebox@gmail.com>',
	website            : 'https://github.com/FSGModding/FSG_Mod_Assistant',
	iconPath           : pathIcon,
})

app.on('window-all-closed', () => {	if (process.platform !== 'darwin') { app.quit() } })
