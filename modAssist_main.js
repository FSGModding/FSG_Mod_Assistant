/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */
/*eslint complexity: ["warn", 17]*/
// Main Program

const { app, BrowserWindow, ipcMain, shell, dialog, Menu, Tray, net, screen, clipboard, nativeImage, nativeTheme } = require('electron')

const isPortable = typeof process.env.PORTABLE_EXECUTABLE_DIR !== 'undefined'
const gotTheLock = app.requestSingleInstanceLock()

if ( !gotTheLock ) { app.quit() }

const { autoUpdater } = require('electron-updater')
const { ma_logger }   = require('./lib/ma-logger.js')
const semverGt        = require('semver/functions/gt')
const log             = new ma_logger('modAssist', app, 'assist.log', gotTheLock, debugDangerCallback)
const path            = require('path')
const fs              = require('fs')

const devDebug      = !(app.isPackaged)
const devTools      = true && !(app.isPackaged)
const skipCache     = false && !(app.isPackaged)
const crashLog      = path.join(app.getPath('userData'), 'crash.log')
let updaterInterval = null

log.log.info(`ModAssist Logger: ${app.getVersion()}`)
log.log.info(` - Node.js Version: ${process.versions.node}`)
log.log.info(` - Electron Version: ${process.versions.electron}`)
log.log.info(` - Chrome Version: ${process.versions.chrome}`)

function debugDangerCallback() {
	if ( typeof windows.main !== 'undefined' && windows.main !== null ) { windows.main.webContents.send('fromMain_debugLogDanger') }
}

function handleUnhandled(type, err, origin) {
	const rightNow = new Date()
	fs.appendFileSync(
		crashLog,
		`${type} Timestamp : ${rightNow.toISOString()}\n\nCaught ${type}: ${err}\n\nOrigin: ${origin}\n\n${err.stack}`
	)
	if ( !isNetworkError(err) ) {
		dialog.showMessageBoxSync(null, {
			message : `Caught ${type}: ${err}\n\nOrigin: ${origin}\n\n${err.stack}\n\n\nCan't Continue, exiting now!\n\nTo send file, please see ${crashLog}`,
			title   : `Uncaught ${type} - Quitting`,
			type    : 'error',
		})
		if ( gameLogFileWatch ) { gameLogFileWatch.close() }
		app.quit()
	} else {
		log.log.debug(`Network error: ${err}`, `net-error-${type}`)
	}
}
process.on('uncaughtException', (err, origin) => { handleUnhandled('exception', err, origin) })
process.on('unhandledRejection', (err, origin) => { handleUnhandled('rejection', err, origin) })

const translator       = require('./lib/translate.js')
const myTranslator     = new translator.translator(translator.getSystemLocale(), log)
myTranslator.mcVersion = app.getVersion()
myTranslator.iconOverrides = {
	admin_button           : 'globe2',
	admin_pass_button      : 'key',
	button_gamelog         : 'file-earmark-text',
	download_button        : 'cloud-download',
	export_button          : 'filetype-csv',
	folder_bot_button      : 'align-bottom',
	folder_down_button     : 'chevron-down',
	folder_top_button      : 'align-top',
	folder_up_button       : 'chevron-up',
	game_admin_pass_button : 'person-lock',
	help_button            : 'question-circle',
	min_tray_button        : 'chevron-bar-down',
	notes_button           : 'journal-text',
	preferences_button     : 'gear',
	search_all             : 'search',
}

if ( process.platform === 'win32' && app.isPackaged && gotTheLock && !isPortable ) {
	autoUpdater.logger = log.log
	autoUpdater.on('update-checking-for-update', () => { log.log.debug('Checking for update', 'auto-update') })
	autoUpdater.on('update-available', () => { log.log.info('Update Available', 'auto-update') })
	autoUpdater.on('update-not-available', () => { log.log.debug('No Update Available', 'auto-update') })
	autoUpdater.on('error', (message) => { log.log.warning(`Updater Failed: ${message}`, 'auto-update') })

	autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
		clearInterval(updaterInterval)
		const dialogOpts = {
			buttons : [myTranslator.syncStringLookup('update_restart'), myTranslator.syncStringLookup('update_later')],
			detail  : myTranslator.syncStringLookup('update_detail'),
			message : process.platform === 'win32' ? releaseNotes : releaseName,
			title   : myTranslator.syncStringLookup('update_title'),
			type    : 'info',
		}
		dialog.showMessageBox(windows.main, dialogOpts).then((returnValue) => {
			if (returnValue.response === 0) {
				if ( tray ) { tray.destroy() }
				if ( gameLogFileWatch ) { gameLogFileWatch.close() }
				for ( const thisWin in windows ) {
					if ( thisWin !== 'main' && windows[thisWin] !== null ) {
						windows[thisWin].destroy()
					}
				}
				autoUpdater.quitAndInstall()
			}
		})
	})

	autoUpdater.checkForUpdatesAndNotify().catch((err) => log.log.warning(`Updater Issue: ${err}`, 'auto-update'))

	updaterInterval = setInterval(() => {
		autoUpdater.checkForUpdatesAndNotify().catch((err) => log.log.warning(`Updater Issue: ${err}`, 'auto-update'))
	}, ( 30 * 60 * 1000))
}

const fxml          = require('fast-xml-parser')
const oldModHub     = require('./lib/oldModHub.json')
const userHome      = app.getPath('home')
const pathRender    = path.join(app.getAppPath(), 'renderer')
const pathPreload   = path.join(pathRender, 'preload')
const pathIcon      = path.join(app.getAppPath(), 'build', 'icon.ico')
const hubURL        = 'https://jtsage.dev/modHubData.json'
const hubVerURL     = 'https://jtsage.dev/modHubVersion.json'
const trayIcon      = !app.isPackaged
	? path.join(app.getAppPath(), 'renderer', 'img', 'icon.ico')
	: path.join(process.resourcesPath, 'app.asar', 'renderer', 'img', 'icon.ico')
const convertPath   = !app.isPackaged
	? path.join(app.getAppPath(), 'texconv.exe')
	: path.join(process.resourcesPath, 'texconv.exe')

let pathBestGuess = userHome
let foundGame     = ''

const themeColors = {
	'dark' : {
		background : '#2b3035',
		font       : '#6d757a',
	},
	'light' : {
		background : '#f8f9fa',
		font       : '#7b8fa0',
	},
}
let gameLogFileWatch  = null
let gameLogFileBounce = false

const gameExeName = 'FarmingSimulator2022.exe'
const gameExePick = {
	13 : 'FarmingSimulator2013.exe',
	15 : 'FarmingSimulator2015.exe',
	17 : 'FarmingSimulator2017.exe',
	19 : 'FarmingSimulator2019.exe',
	22 : 'FarmingSimulator2022.exe',
}
const gameGuesses = [
	'C:\\Program Files (x86)\\Farming Simulator 2022\\',
	'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Farming Simulator 22'
]
const pathGuesses = [
	path.join(app.getPath('documents'), 'My Games', 'FarmingSimulator2022'),
	path.join(userHome, 'OneDrive', 'Documents', 'My Games', 'FarmingSimulator2022'),
	path.join(userHome, 'Documents', 'My Games', 'FarmingSimulator2022')
]

for ( const testPath of gameGuesses ) {
	if ( fs.existsSync(path.join(testPath, gameExeName)) ) {
		foundGame = path.join(testPath, gameExeName)
	}
}

for ( const testPath of pathGuesses ) {
	if ( fs.existsSync(testPath) ) {
		pathBestGuess = testPath
		break
	}
}

const { modFileCollection } = require('./lib/modCheckLib.js')
const { modLooker }         = require('./lib/modLookerLib.js')

const winDef = (w, h) => { return {
	additionalProperties : false,
	default              : {},
	properties           : {
		h : { type : 'number',  default : h },
		w : { type : 'number',  default : w },

		m : { type : 'boolean', default : false },

		x : { type : 'number',  default : -1 },
		y : { type : 'number',  default : -1 },
	},
	type                 : 'object',
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
	cache_version     : { type : 'string', default : '0.0.0' },
	color_theme       : { type : 'string', default : 'dark', enum : ['dark', 'light', 'system']},
	force_lang        : { type : 'string', default : '' },
	game_log_auto     : { type : 'boolean', default : true },
	game_log_file     : { type : ['string', 'null'], default : null },
	game_version      : { type : 'number',  default : 22, enum : [22, 19, 17, 15, 13]},
	led_active        : { type : 'boolean', default : true },
	lock_lang         : { type : 'boolean', default : false },
	modFolders        : { type : 'array',   default : [] },
	multi_version     : { type : 'boolean', default : false },
	rel_notes         : { type : 'string',  default : '0.0.0' },
	use_one_drive     : { type : 'boolean', default : false },

	game_args         : { type : 'string', default : '' },
	game_path         : { type : 'string', default : foundGame },
	game_settings     : { type : 'string', default : path.join(pathBestGuess, 'gameSettings.xml') },

	game_args_19      : { type : 'string',  default : '' },
	game_enabled_19   : { type : 'boolean', default : false},
	game_path_19      : { type : 'string',  default : '' },
	game_settings_19  : { type : 'string',  default : '' },

	game_args_17      : { type : 'string',  default : '' },
	game_enabled_17   : { type : 'boolean', default : false},
	game_path_17      : { type : 'string',  default : '' },
	game_settings_17  : { type : 'string',  default : '' },

	game_args_15      : { type : 'string',  default : '' },
	game_enabled_15   : { type : 'boolean', default : false},
	game_path_15      : { type : 'string',  default : '' },
	game_settings_15  : { type : 'string',  default : '' },

	game_args_13      : { type : 'string',  default : '' },
	game_enabled_13   : { type : 'boolean', default : false},
	game_path_13      : { type : 'string',  default : '' },
	game_settings_13  : { type : 'string',  default : '' },

	wins              : { type : 'object', default : {}, properties : {
		change        : winDef(650, 350),
		confirm       : winDef(750, 500),
		debug         : winDef(1000, 500),
		detail        : winDef(800, 500),
		find          : winDef(800, 600),
		folder        : winDef(800, 500),
		gamelog       : winDef(1000, 500),
		import        : winDef(750, 500),
		load          : winDef(600, 300),
		looker        : winDef(800, 500),
		main          : winDef(1000, 700),
		notes         : winDef(800, 500),
		prefs         : winDef(800, 500),
		resolve       : winDef(750, 600),
		save          : winDef(900, 500),
		splash        : winDef(600, 300),
		version       : winDef(800, 500),
	}},
}

const siteMigrate = {
	'<=2.1.1' : (store) => {
		store.set('FS22_UniversalAutoload', 'https://github.com/loki79uk/FS22_UniversalAutoload/')
		store.set('FS22_Courseplay', 'https://github.com/Courseplay/Courseplay_FS22/')
		store.set('FS22_AutoDrive', 'https://github.com/Stephan-S/FS22_AutoDrive')
		store.set('FS22_SimpleInspector', 'https://github.com/jtsage/FS22_simpleInspector/')
		store.set('FS22_ProductionInspector', 'https://github.com/jtsage/FS22_ProductionInspector/')
	},
}

const Store   = require('electron-store')
const unzip   = require('unzip-stream')
const makeZip = require('archiver')

const { saveFileChecker } = require('./lib/savegame-parser.js')

const mcStore = new Store({schema : settingsSchema, migrations : settingsMig, clearInvalidConfig : true })
const maCache = new Store({name : 'mod_cache', clearInvalidConfig : true})
const modNote = new Store({name : 'col_notes', clearInvalidConfig : true})
const modSite = new Store({name : 'mod_source_site', migrations : siteMigrate, clearInvalidConfig : true})

const modCollect = new modFileCollection(
	log,
	modNote,
	maCache,
	app.getPath('home'),
	{
		hide  : loadingWindow_hide,
		count : loadingWindow_current,
	},
	mcStore,
	myTranslator.deferCurrentLocale,
	skipCache
)

const loadWindowCount = { total : 0, current : 0}

let modFolders       = new Set()
let modFoldersWatch  = []
let lastFolderLoc    = null
let lastGameSettings = {}

let tray    = null
const windows = {
	change  : null,
	confirm : null,
	debug   : null,
	detail  : null,
	find    : null,
	folder  : null,
	gamelog : null,
	import  : null,
	load    : null,
	looker  : null,
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

let currentColorTheme = mcStore.get('color_theme')
if ( currentColorTheme === 'system' ) { currentColorTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light' }

let gameSettingsXML = null
let gameXML         = null
let overrideFolder  = null
let overrideIndex   = '999'
let overrideActive  = null
const devControls     = {
	13 : false,
	15 : false,
	17 : false,
	19 : false,
	22 : false,
}

/** Upgrade Cache Version Here */

if ( semverGt('1.0.2', mcStore.get('cache_version'))) {
	log.log.warning('Invalid Mod Cache (very old), resetting.')
	maCache.clear()
	log.log.info('Mod Cache Cleared')
} else if ( semverGt('2.4.0', mcStore.get('cache_version'))) {
	log.log.warning('Invalid Mod Cache (old), resetting.')
	maCache.clear()
	log.log.info('Mod Cache Cleared')
} else if ( semverGt('1.9.3', mcStore.get('cache_version'))) {
	log.log.debug('Mod Cache 1.9.3 Update Running')
	const oldCache = maCache.store
	const tagRegEx = /"mod_badge_(.+?)"/g

	for ( const key in oldCache ) {
		if ( typeof oldCache[key].badgeArray === 'undefined' ) {
			oldCache[key].badgeArray = []

			if ( typeof oldCache[key].badges !== 'undefined' ) {
				for ( const match of [...oldCache[key].badges.matchAll(tagRegEx)] ) {
					oldCache[key].badgeArray.push(match[1].toLowerCase())
				}

				delete oldCache[key].badges
			}
		}
	}
	maCache.store = oldCache

} else {
	log.log.debug('Mod Cache Version Good')
}

mcStore.set('cache_version', app.getVersion())

/** END: Upgrade Cache Version Here */




/*  _    _  ____  _  _  ____   _____  _    _  ___ 
   ( \/\/ )(_  _)( \( )(  _ \ (  _  )( \/\/ )/ __)
    )    (  _)(_  )  (  )(_) ) )(_)(  )    ( \__ \
   (__/\__)(____)(_)\_)(____/ (_____)(__/\__)(___/ */

function destroyAndFocus(winName) {
	windows[winName] = null
	if ( windows.main !== null ) { windows.main.focus() }
}

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

function createSubWindow(winName, { useCustomTitle = true, skipTaskbar = false, noSelect = true, show = true, parent = null, title = null, fixed = false, frame = true, move = true, preload = null, fixedOnTop = true} = {}) {
	const realCenter  = getRealCenter(winName)
	const winSettings = mcStore.get(`wins.${winName}`)

	const winOptions = {
		alwaysOnTop     : fixedOnTop && fixed,
		fullscreenable  : !fixed,
		maximizable     : !fixed,
		minimizable     : !fixed,
	}
	const winTitle = ( title === null ) ? myTranslator.syncStringLookup('app_name') : title
	const thisWindow = new BrowserWindow({
		alwaysOnTop     : winOptions.alwaysOnTop,
		autoHideMenuBar : true,
		frame           : frame,
		fullscreenable  : winOptions.fullscreenable,
		height          : winSettings.h,
		icon            : pathIcon,
		maximizable     : winOptions.maximizable,
		minimizable     : winOptions.minimizable,
		movable         : move,
		parent          : ( parent === null ) ? null : windows[parent],
		show            : show,
		skipTaskbar     : skipTaskbar,
		title           : winTitle,
		width           : winSettings.w,
		x               : winSettings.x > -1 ? Math.floor(winSettings.x) : realCenter.x,
		y               : winSettings.y > -1 ? Math.floor(winSettings.y) : realCenter.y,

		titleBarOverlay : {
			color       : themeColors[currentColorTheme].background,
			symbolColor : themeColors[currentColorTheme].font,
			height      : 25,
		},
		titleBarStyle   : useCustomTitle ? 'hidden' : 'default',

		webPreferences  : {
			contextIsolation : true,
			nodeIntegration  : false,
			preload          : (preload === null ) ? null : path.join(pathPreload, `preload-${preload}.js`),
			spellcheck       : false,
		},
	})

	if ( noSelect ) {
		thisWindow.webContents.on('before-input-event', (event, input) => {
			if (input.control && input.code === 'KeyA') {
				thisWindow.webContents.send('fromMain_subWindowSelectAll')
				event.preventDefault()
			}
			if (input.control && input.shift && input.code === 'KeyA') {
				thisWindow.webContents.send('fromMain_subWindowSelectNone')
				event.preventDefault()
			}
			if ( input.alt && input.control && input.code === 'KeyD' ) {
				createNamedWindow('debug')
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

		thisWindow.on('focus', () => {
			thisWindow.webContents.send('fromMain_clearTooltips')
		})
	}

	if ( !devDebug ) { thisWindow.removeMenu()}
	if ( winSettings.m )  { thisWindow.maximize() }
	return thisWindow
}

function createMainWindow () {
	windows.load = createSubWindow('load', {
		fixed          : true,
		fixedOnTop     : false,
		frame          : false,
		move           : false,
		preload        : 'loadingWindow',
		show           : false,
		skipTaskbar    : true,
		useCustomTitle : false,
	})
	windows.load.loadFile(path.join(pathRender, 'loading.html'))
	windows.load.on('close', (event) => { event.preventDefault() })

	windows.main = createSubWindow('main', { noSelect : false, show : devDebug, preload : 'mainWindow' })
	
	windows.main.on('closed',   () => {
		windows.main = null
		if ( tray ) { tray.destroy() }
		windows.load.destroy()
		if ( gameLogFileWatch ) { gameLogFileWatch.close() }
		app.quit()
	})

	if ( !devDebug ) {
		windows.splash = createSubWindow('splash', { center : true, fixed : true, frame : false, move : false, useCustomTitle : false })
		windows.splash.loadURL(`file://${path.join(pathRender, 'splash.html')}?version=${app.getVersion()}`)

		windows.splash.on('closed', () => { windows.splash = null })

		windows.main.once('ready-to-show', () => {
			setTimeout(() => { windows.main.show(); windows.splash.destroy() }, 2000)
		})
	}

	windows.main.loadFile(path.join(pathRender, 'main.html'))

	windows.main.webContents.session.setPermissionCheckHandler((webContents, permission) => {
		if (permission === 'hid') { return true }
		return false
	})

	windows.main.webContents.session.on('select-hid-device', (event, details, callback) => {
		event.preventDefault()
		const selectedDevice = details.deviceList.find((device) => {
			return device.vendorId === 0x340d && device.productId === 0x1710
		})
		callback(selectedDevice?.deviceId)
	})

	windows.main.webContents.on('did-finish-load', () => {
		const showCount = setInterval(() => {
			if ( windows.main.isVisible() ) {
				clearInterval(showCount)
				windows.main.webContents.send('fromMain_themeSetting', currentColorTheme)
				if ( mcStore.has('modFolders') ) {
					modFolders   = new Set(mcStore.get('modFolders'))
					foldersDirty = true
					setTimeout(() => { processModFolders() }, 1500)
				}
				if ( devDebug && devTools) { windows.main.webContents.openDevTools() }
			}
		}, 250)
	})

	windows.main.webContents.on('before-input-event', (event, input) => {
		if (input.control && input.code === 'KeyA') {
			windows.main.webContents.send('fromMain_selectAllOpen')
			event.preventDefault()
		}
		if (input.control && input.shift && input.code === 'KeyA' ) {
			windows.main.webContents.send('fromMain_selectNoneOpen')
			event.preventDefault()
		}
		if (input.control && input.code === 'KeyI') {
			windows.main.webContents.send('fromMain_selectInvertOpen')
			event.preventDefault()
		}
		if ( input.alt && input.control && input.code === 'KeyD' ) {
			createNamedWindow('debug')
			event.preventDefault()
		}
	})
	
	windows.main.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url)
		return { action : 'deny' }
	})
}

function createNamedWindow(winName, windowArgs) {
	const subWinDef  = subWindows[winName]
	const thisWindow = subWinDef.winName

	if ( windows[thisWindow] ) {
		windows[thisWindow].focus()
		if ( subWinDef.refocusCallback ) { subWinDef.callback(windowArgs) }
		return
	}

	windows[thisWindow] = createSubWindow(subWinDef.winName, subWinDef.subWindowArgs)

	windows[thisWindow].webContents.on('did-finish-load', async () => {
		windows[thisWindow].webContents.send('fromMain_themeSetting', currentColorTheme)
		subWinDef.callback(windowArgs)

		if ( devDebug && devTools && subWindowDev.has(subWinDef.winName) ) {
			windows[thisWindow].webContents.openDevTools()
		}
	})

	windows[thisWindow].loadFile(path.join(pathRender, subWinDef.HTMLFile))

	windows[thisWindow].on('closed', () => {
		destroyAndFocus(subWinDef.winName)
		if ( typeof subWinDef.extraCloseFunc === 'function' ) {
			subWinDef.extraCloseFunc()
		}
		
	})

	if ( subWinDef.handleURLinWin ) {
		windows[thisWindow].webContents.setWindowOpenHandler(({ url }) => {
			shell.openExternal(url)
			return { action : 'deny' }
		})
	}
}

/* eslint-disable sort-keys */
const subWindowDev = new Set(['import', 'save', 'find', 'looker', 'notes', 'version', 'resolve', 'gamelog', 'folder'])
const subWindows   = {
	confirmFav : {
		winName         : 'confirm',
		HTMLFile        : 'confirm-multi.html',
		subWindowArgs   : { parent : 'main', preload : 'confirmMulti', fixed : true },
		callback        : (windowArgs) => { sendModList(windowArgs, 'fromMain_confirmList', 'confirm', false) },
	},
	confirmCopy : {
		winName         : 'confirm',
		HTMLFile        : 'confirm-fileCopy.html',
		subWindowArgs   : { parent : 'main', preload : 'confirmCopy', fixed : true },
		callback        : (windowArgs) => { sendModList(windowArgs, 'fromMain_confirmList', 'confirm', false) },
	},
	confirmMove : {
		winName         : 'confirm',
		HTMLFile        : 'confirm-fileMove.html',
		subWindowArgs   : { parent : 'main', preload : 'confirmMove', fixed : true },
		callback        : (windowArgs) => { sendModList(windowArgs, 'fromMain_confirmList', 'confirm', false) },
	},
	confirmDelete : {
		winName         : 'confirm',
		HTMLFile        : 'confirm-fileDelete.html',
		subWindowArgs   : { parent : 'main', preload : 'confirmDelete', fixed : true },
		callback        : (windowArgs) => { sendModList(windowArgs, 'fromMain_confirmList', 'confirm', false) },
	},
	change : {
		winName         : 'change',
		HTMLFile        : 'a_changelog.html',
		subWindowArgs   : { parent : 'main', fixed : true, preload : 'aChangelogWindow' },
		callback        : () => { return },
		handleURLinWin  : true,
	},
	folder : {
		winName         : 'folder',
		HTMLFile        : 'folders.html',
		subWindowArgs   : { parent : 'main', preload : 'folderWindow' },
		callback        : () => { sendModList({}, 'fromMain_getFolders', 'folder', false ) },
		refocusCallback : true,
		extraCloseFunc  : () => { processModFolders() },
	},
	debug : {
		winName         : 'debug',
		HTMLFile        : 'debug.html',
		subWindowArgs   : { preload : 'debugWindow' },
		callback        : () => {
			windows.debug.webContents.send('fromMain_debugLog', log.htmlLog)
			windows.main.webContents.send('fromMain_debugLogNoDanger')
		},
		refocusCallback : true,
	},
	gamelog : {
		winName         : 'gamelog',
		HTMLFile        : 'gamelog.html',
		subWindowArgs   : { preload : 'gamelogWindow' },
		callback        : () => { readGameLog() },
		refocusCallback : true,
	},
	prefs : {
		winName         : 'prefs',
		HTMLFile        : 'prefs.html',
		subWindowArgs   : { parent : 'main', preload : 'prefsWindow' },
		callback        : () => { windows.prefs.webContents.send( 'fromMain_allSettings', mcStore.store, devControls ) },
		refocusCallback : true,
		handleURLinWin  : true,
		extraCloseFunc  : () => { refreshClientModList() },
	},
	detail : {
		winName         : 'detail',
		HTMLFile        : 'detail.html',
		subWindowArgs   : { parent : 'main', preload : 'detailWindow' },
		callback        : (windowArgs) => { sendModList(windowArgs, 'fromMain_modRecord', 'detail', false) },
		refocusCallback : true,
		handleURLinWin  : true,
	},
	looker : {
		winName         : 'looker',
		HTMLFile        : 'looker.html',
		subWindowArgs   : { parent : 'main', preload : 'lookerWindow' },
		callback        : (windowArgs) => { sendModList(windowArgs, 'fromMain_modRecord', 'looker', false) },
		refocusCallback : true,
		handleURLinWin  : true,
	},
	find : {
		winName         : 'find',
		HTMLFile        : 'find.html',
		subWindowArgs   : { preload : 'findWindow' },
		callback        : () => { sendModList({}, 'fromMain_modRecords', 'find', false ) },
		refocusCallback : true,
	},
	notes : {
		winName         : 'notes',
		HTMLFile        : 'notes.html',
		subWindowArgs   : { parent : 'main', preload : 'notesWindow' },
		callback        : (windowArgs) => { sendModList(windowArgs, 'fromMain_collectionName', 'notes', false ) },
		refocusCallback : true,
		extraCloseFunc  : () => { refreshClientModList() },
	},
	version : {
		winName         : 'version',
		HTMLFile        : 'versions.html',
		subWindowArgs   : { parent : 'main', preload : 'versionWindow' },
		callback        : () => { sendModList({}, 'fromMain_modList', 'version', false ) },
		refocusCallback : true,
	},
	resolve : {
		winName         : 'resolve',
		HTMLFile        : 'resolve.html',
		subWindowArgs   : { parent : 'version', preload : 'resolveWindow', fixed : true },
		callback        : (windowArgs) => { windows.resolve.webContents.send('fromMain_modSet', windowArgs.modSet, windowArgs.shortName) },
		refocusCallback : true,
	},
	save : {
		winName         : 'save',
		HTMLFile        : 'savegame.html',
		subWindowArgs   : { preload : 'savegameWindow' },
		callback        : (windowArgs) => { sendModList(windowArgs, 'fromMain_collectionName', 'save', false ) },
		refocusCallback : true,
	},
	import : {
		winName         : 'import',
		HTMLFile        : 'confirm-import.html',
		subWindowArgs   : { parent : 'main', preload : 'confirmImport', fixed : true },
		callback        : (windowArgs) => { sendModList(windowArgs, 'fromMain_confirmList', 'import', false) },
	},
}
/* eslint-enable sort-keys */


function loadingWindow_open(l10n, isDownload = false) {
	const newCenter   = getRealCenter('load')
	const winTitle    = myTranslator.syncStringLookup((l10n) !== 'launch' ? `loading_${l10n}_title` : 'app_name')
	const winSubTitle = myTranslator.syncStringLookup((l10n) !== 'launch' ? `loading_${l10n}_subtitle` : 'launch_game')
	const dlCancel    = myTranslator.syncStringLookup('cancel_download')
	if ( windows.load ) {
		try {
			windows.load.setBounds({x : newCenter.x, y : newCenter.y})
		} catch (e) {
			windows.load.center()
			log.log.debug(`Center window in display failed : ${e}`, 'load-window')
		}
		windows.load.show()
		windows.load.focus()
		windows.load.webContents.send('formMain_loadingTitles', winTitle, winSubTitle, dlCancel)
		setTimeout(() => {
			windows.load.show()
			windows.load.focus()
			if ( isDownload ) {
				windows.load.webContents.send('fromMain_loadingDownload')
			}
		}, 250)
		return
	}
}
function loadingWindow_doCount(whichCount, amount, reset, inMB) {
	loadWindowCount[whichCount] = ( reset ) ? amount : amount + loadWindowCount[whichCount]

	if ( whichCount === 'current' && windows.main !== null && ! windows.main.isDestroyed() ) {
		windows.main.setProgressBar(Math.max(0, Math.min(1, loadWindowCount.current / loadWindowCount.total)))
	}

	if ( ! windows.load.isDestroyed() ) {
		windows.load.webContents.send(`fromMain_loading_${whichCount}`, loadWindowCount[whichCount], inMB)
	}
}
function loadingWindow_total(amount, reset = false, inMB = false) {
	loadingWindow_doCount('total', amount, reset, inMB)
}
function loadingWindow_current(amount = 1, reset = false, inMB = false) {
	loadingWindow_doCount('current', amount, reset, inMB)
}
function loadingWindow_hide(time = 1250) {
	setTimeout(() => {
		if ( windows.main !== null && ! windows.main.isDestroyed() ) {
			windows.main.setProgressBar(-1)
		}
		if ( windows.load !== null && ! windows.load.isDestroyed() ) {
			windows.load.hide()
		}
	}, time)
}
function loadingWindow_noCount() {
	if ( ! windows.load.isDestroyed() ) {
		windows.load.webContents.send('fromMain_loadingNoCount')
	}
}

function isNetworkError(errorObject) { return errorObject.message.startsWith('net::ERR_') }

/*  ____  ____   ___ 
   (_  _)(  _ \ / __)
    _)(_  )___/( (__ 
   (____)(__)   \___) */

ipcMain.on('toMain_sendMainToTray', () => {
	if ( tray ) {
		if ( firstMin ) {
			const bubbleOpts = {
				icon    : trayIcon,
				title   : myTranslator.syncStringLookup('minimize_message_title'),
				content : myTranslator.syncStringLookup('minimize_message'),
			}

			tray.displayBalloon(bubbleOpts)

			setTimeout(() => {
				if ( tray && !tray.isDestroyed() ) {
					tray.removeBalloon()
				}
			}, 5000)
		}
		
		firstMin = false
		windows.main.hide()
	}
})
ipcMain.on('toMain_populateClipboard', (event, text) => { clipboard.writeText(text, 'selection') })

/** File operation buttons */
ipcMain.on('toMain_makeInactive', () => { parseSettings({ disable : true }) })
ipcMain.on('toMain_makeActive',   (event, newList) => { newSettingsFile(newList) })
ipcMain.on('toMain_openMods',     (event, mods) => {
	const thisCollectionFolder = modCollect.mapCollectionToFolder(mods[0].split('--')[0])
	const thisMod              = modCollect.modColUUIDToRecord(mods[0])

	if ( thisMod !== null ) {
		shell.showItemInFolder(path.join(thisCollectionFolder, path.basename(thisMod.fileDetail.fullPath)))
	}
})
ipcMain.on('toMain_openHelpSite', () => { shell.openExternal('https://fsgmodding.github.io/FSG_Mod_Assistant/') })
ipcMain.on('toMain_openHub',     (event, mods) => {
	const thisMod   = modCollect.modColUUIDToRecord(mods[0])
	const thisModId = thisMod.modHub.id

	if ( thisModId !== null ) {
		shell.openExternal(`https://www.farming-simulator.com/mod.php?mod_id=${thisModId}`)
	}
})
ipcMain.on('toMain_openExt',     (event, mods) => {
	const thisMod     = modCollect.modColUUIDToRecord(mods[0])
	const thisModSite = modSite.get(thisMod.fileDetail.shortName, null)

	if ( thisModSite !== null ) { shell.openExternal(thisModSite) }
})

ipcMain.on('toMain_copyFavorites',  () => {

	const sourceCollections      = []
	const destinationCollections = []
	const sourceFiles            = []

	const multi_version = mcStore.get('multi_version')
	const current_version = mcStore.get('game_version')

	for ( const collectKey of modCollect.collections ) {
		if ( multi_version && current_version !== modNote.get(`${collectKey}.notes_version`, 22)) { continue }

		if ( modNote.get(`${collectKey}.notes_favorite`, false) ) {
			sourceCollections.push(collectKey)
		} else {
			destinationCollections.push(collectKey)
		}
	}

	for ( const collectKey of sourceCollections ) {
		const thisCollection = modCollect.getModCollection(collectKey)
		for ( const modKey of thisCollection.modSet ) {
			const thisMod = thisCollection.mods[modKey]
			sourceFiles.push({
				collectKey : collectKey,
				fullPath   : thisMod.fileDetail.fullPath,
				shortName  : thisMod.fileDetail.shortName,
				title      : thisMod.l10n.title,
			})
		}
	}

	if ( sourceFiles.length > 0 ) {
		createNamedWindow(
			'confirmFav',
			{
				destinations : destinationCollections,
				sourceFiles  : sourceFiles,
				sources      : sourceCollections,
			}
		)
	}
})

function handleCopyMoveDelete(windowName, modIDS, modRecords = null) {
	if ( modIDS.length > 0 ) {
		createNamedWindow(windowName, {
			records : ( modRecords === null ) ? modCollect.modColUUIDsToRecords(modIDS) : modRecords,
			originCollectKey : modIDS[0].split('--')[0],
		})
	}
}

ipcMain.on('toMain_deleteMods',     (event, mods) => { handleCopyMoveDelete('confirmDelete', mods) })
ipcMain.on('toMain_moveMods',       (event, mods) => { handleCopyMoveDelete('confirmMove', mods) })
ipcMain.on('toMain_copyMods',       (event, mods) => { handleCopyMoveDelete('confirmCopy', mods) })
ipcMain.on('toMain_realFileDelete', (event, fileMap) => { fileOperation('delete', fileMap) })
ipcMain.on('toMain_realFileMove',   (event, fileMap) => { fileOperation('move', fileMap) })
ipcMain.on('toMain_realFileCopy',   (event, fileMap) => { fileOperation('copy', fileMap) })
ipcMain.on('toMain_realFileImport', (event, fileMap) => { fileOperation('import', fileMap, 'import') })
ipcMain.on('toMain_realFileVerCP',  (event, fileMap) => {
	fileOperation('copy', fileMap, 'resolve')
	setTimeout(() => {
		sendModList({}, 'fromMain_modList', 'version', false )
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

			for ( const thisPath of modFolders ) {
				if ( path.relative(thisPath, result.filePaths[0]) === '' ) { alreadyExists = true }
			}

			lastFolderLoc = path.resolve(path.join(result.filePaths[0], '..'))

			if ( ! alreadyExists ) {
				modFolders.add(result.filePaths[0]); foldersDirty = true
				mcStore.set('modFolders', Array.from(modFolders))
				const thisFolderCollectKey = modCollect.getFolderHash(result.filePaths[0])
				modNote.set(`${thisFolderCollectKey}.notes_version`, mcStore.get('game_version'))
				modNote.set(`${thisFolderCollectKey}.notes_add_date`, new Date())
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
ipcMain.on('toMain_editFolders',    () => { createNamedWindow('folder') })
ipcMain.on('toMain_openFolder',     (event, collectKey) => { shell.openPath(modCollect.mapCollectionToFolder(collectKey)) })
ipcMain.on('toMain_refreshFolders', () => { foldersDirty = true; processModFolders() })
ipcMain.on('toMain_removeFolder',   (event, collectKey) => {
	const folder = modCollect.mapCollectionToFolder(collectKey)
	if ( modFolders.delete(folder) ) {
		log.log.notice(`Folder removed from list ${folder}`, 'folder-opts')
		mcStore.set('modFolders', Array.from(modFolders))

		const collectKey = modCollect.mapFolderToCollection(folder)

		modCollect.removeCollection(collectKey)
		
		sendModList({},	'fromMain_getFolders', 'folder', false )

		foldersDirty = true
		sendFoldersDirtyUpdate()
	} else {
		log.log.warning(`Folder NOT removed from list ${folder}`, 'folder-opts')
	}
})
ipcMain.on('toMain_reorderFolder', (event, from, to) => {
	const newOrder    = Array.from(modFolders)
	const item        = newOrder.splice(from, 1)[0]

	newOrder.splice(to, 0, item)

	const newSetOrder = newOrder.map((path) => modCollect.mapFolderToCollection(path))

	modFolders                    = new Set(newOrder)
	modCollect.newCollectionOrder = new Set(newSetOrder)

	mcStore.set('modFolders', Array.from(modFolders))

	sendModList({},	'fromMain_getFolders', 'folder', false )
	foldersDirty = true
	sendFoldersDirtyUpdate()
})
ipcMain.on('toMain_reorderFolderAlpha', () => {
	const newOrder = []
	const collator = new Intl.Collator()

	for ( const collectKey of modCollect.collections ) {
		newOrder.push({
			collectKey : collectKey,
			name       : modCollect.mapCollectionToName(collectKey),
			path       : modCollect.mapCollectionToFolder(collectKey),
		})
	}

	newOrder.sort((a, b) =>
		collator.compare(a.name, b.name) ||
		collator.compare(a.collectKey, b.collectKey)
	)

	const newModFolders    = new Set()
	const newModSetOrder   = new Set()

	for ( const orderPart of newOrder ) {
		newModFolders.add(orderPart.path)
		newModSetOrder.add(orderPart.collectKey)
	}

	modFolders                    = newModFolders
	modCollect.newCollectionOrder = newModSetOrder

	mcStore.set('modFolders', Array.from(modFolders))

	sendModList({},	'fromMain_getFolders', 'folder', false )
	foldersDirty = true
	sendFoldersDirtyUpdate()
})
ipcMain.on('toMain_dropFolder', (event, newFolder) => {
	if ( ! modFolders.has(newFolder) ) {
		modFolders.add(newFolder)
		foldersDirty = true
		mcStore.set('modFolders', Array.from(modFolders))
		const thisFolderCollectKey = modCollect.getFolderHash(newFolder)
		modNote.set(`${thisFolderCollectKey}.notes_version`, mcStore.get('game_version'))
		processModFolders()
	} else {
		log.log.notice('Add folder :: canceled, already exists in list', 'folder-opts')
		doDialogBox('main', {
			type        : 'error',
			messageL10n : 'drop_folder_exists',
		})
	}
})
ipcMain.on('toMain_dropFiles', (event, files) => {
	createNamedWindow('import', { files : files })
})
/** END: Folder Window Operation */

/** Logging Operation */
ipcMain.on('toMain_log', (event, level, process, text) => { log.log[level](text, process) })
/** END: Logging Operation */

/** l10n Operation */
ipcMain.on('toMain_langList_change', (event, lang) => {
	myTranslator.currentLocale = lang

	mcStore.set('force_lang', myTranslator.currentLocale)

	for ( const thisWindow in windows ) {
		if ( windows[thisWindow] !== null ) {
			windows[thisWindow].webContents.send('fromMain_l10n_refresh', myTranslator.currentLocale)
		}
	}
})
ipcMain.on('toMain_themeList_change', (event, theme) => {
	mcStore.set('color_theme', theme)

	currentColorTheme = ( theme === 'system' ) ? (nativeTheme.shouldUseDarkColors ? 'dark' : 'light') : theme

	themeUpdater()
})
nativeTheme.on('updated', () => {
	const savedTheme = mcStore.get('color_theme')

	if ( savedTheme === 'system' ) {
		currentColorTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
		themeUpdater()
	}
})
function themeUpdater() {
	for ( const thisWinKey in windows ) {
		if ( windows[thisWinKey] !== null && windows[thisWinKey].isVisible() ) {
			windows[thisWinKey].webContents.send('fromMain_themeSetting', currentColorTheme)
			windows[thisWinKey].setTitleBarOverlay({
				color       : themeColors[currentColorTheme].background,
				symbolColor : themeColors[currentColorTheme].font,
			})
		}
	}
}

ipcMain.on('toMain_langList_send',   (event) => {
	myTranslator.getLangList().then((langList) => {
		event.sender.send('fromMain_langList_return', langList, myTranslator.deferCurrentLocale())
	})
})
ipcMain.on('toMain_themeList_send',   (event) => {
	const themeOpts = [
		['system', myTranslator.syncStringLookup('theme_name_system')],
		['light', myTranslator.syncStringLookup('theme_name_light')],
		['dark', myTranslator.syncStringLookup('theme_name_dark')],
	]
	
	event.sender.send('fromMain_themeList_return', themeOpts, currentColorTheme)
})
ipcMain.on('toMain_getText_sync', (event, text) => {
	event.returnValue = myTranslator.syncStringLookup(text)
})
ipcMain.on('toMain_getText_send', (event, l10nSet) => {
	let cacheSize = 0

	event.sender.send('fromMain_getText_return', ['__currentLocale__', myTranslator.currentLocale])

	for ( const l10nEntry of l10nSet ) {
		switch ( l10nEntry ) {
			case 'app_version' :
				event.sender.send('fromMain_getText_return', [l10nEntry, app.getVersion()])
				break
			case 'game_icon' :
				event.sender.send('fromMain_getText_return', [l10nEntry,
					`<img src="img/fs${mcStore.get('game_version')}.png" style="height: 20px; margin-right: 5px; margin-top: 1px;" class="float-start img-fluid"/>`
				])
				break
			case 'game_icon_lg' :
				event.sender.send('fromMain_getText_return', [l10nEntry,
					`<img src="img/fs${mcStore.get('game_version')}_256.png" class="img-fluid" style="height: 69px;"/>`
				])
				myTranslator.stringTitleLookup(l10nEntry).then((text) => {
					if ( text !== null ) { event.sender.send('fromMain_getText_return_title', [l10nEntry, text]) }
				})
				break
			case 'game_version' :
				if ( mcStore.get('multi_version') || mcStore.get('game_version') !== 22 ) {
					myTranslator.stringLookup(`mod_badge_fs${mcStore.get('game_version')}`).then((text) => {
						event.sender.send('fromMain_getText_return', [l10nEntry, text])
					})
				} else {
					event.sender.send('fromMain_getText_return', [l10nEntry, ''])
				}
				break
			case 'clean_cache_size' :
				cacheSize = 0
				try {
					const cacheStats = fs.statSync(path.join(app.getPath('userData'), 'mod_cache.json'))
					cacheSize = cacheStats.size/(1024*1024)
				} catch { /* ignore */ }

				event.sender.send('fromMain_getText_return', [l10nEntry, `${myTranslator.syncStringLookup(l10nEntry)} ${cacheSize.toFixed(2)}MB`])
				break
			default :
				myTranslator.stringLookup(l10nEntry).then((text) => {
					if ( text === null || text === '' ) {
						log.log.debug(`Null or empty translator string: ${l10nEntry} :: locale: ${myTranslator.currentLocale}`)
					}
					event.sender.send('fromMain_getText_return', [l10nEntry, text])
				})
				myTranslator.stringTitleLookup(l10nEntry).then((text) => {
					if ( text !== null ) { event.sender.send('fromMain_getText_return_title', [l10nEntry, text]) }
				})
				break
		}
	}
})
/** END: l10n Operation */


/** Detail window operation */
ipcMain.on('toMain_openModDetail', (event, thisMod) => { createNamedWindow('detail', {selected : modCollect.modColUUIDToRecord(thisMod) }) })
ipcMain.on('toMain_lookInMod', (event, thisMod) => {
	const thisModRecord = modCollect.modColUUIDToRecord(thisMod)
	
	const thisModLook = new modLooker(
		convertPath,
		app.getPath('temp'),
		thisModRecord,
		modCollect.modColUUIDToFolder(thisMod),
		log,
		myTranslator.currentLocale
	)

	thisModLook.getInfo().then((results) => {
		createNamedWindow(
			'looker', {
				selected : modCollect.modColUUIDToRecord(thisMod),
				look     : results,
			})
	})
	
})

/** END: Detail window operation */

/** Changelog window operation */
ipcMain.on('toMain_showChangelog', () => { createNamedWindow('change') } )
/** END: Changelog window operation */


/** Main window context menus */
ipcMain.on('toMain_dragOut', (event, modID) => {
	const thisMod    = modCollect.modColUUIDToRecord(modID)
	const thisFolder = modCollect.modColUUIDToFolder(modID)

	let iconDataURL = thisMod.modDesc.iconImageCache
	iconDataURL ??= 'data:image/png;base64,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'

	event.sender.startDrag({
		file : path.join(thisFolder, path.basename(thisMod.fileDetail.fullPath)),
		icon : nativeImage.createFromDataURL(iconDataURL),
	})
})
ipcMain.on('toMain_modContextMenu', async (event, modID) => {
	const thisMod   = modCollect.modColUUIDToRecord(modID)
	const thisSite  = modSite.get(thisMod.fileDetail.shortName, '')

	const template = [
		{ label : thisMod.fileDetail.shortName},
		{ type : 'separator' },
		{ label : myTranslator.syncStringLookup('context_mod_detail'), click : () => {
			createNamedWindow('detail', {selected : thisMod})
		}},
	]

	if ( thisMod.gameVersion > 19 && thisMod.modDesc.storeItems > 0 && (typeof thisMod.modDesc.cropInfo === 'undefined' || thisMod.modDesc.cropInfo === false)) {
		template.push({ label : myTranslator.syncStringLookup('look_detail_button'), click : () => {
			const thisModLook = new modLooker(
				convertPath,
				app.getPath('temp'),
				thisMod,
				modCollect.modColUUIDToFolder(modID),
				log,
				myTranslator.currentLocale
			)

			thisModLook.getInfo().then((results) => {
				createNamedWindow( 'looker', {
					selected : thisMod,
					look     : results,
				})
			})
		}})
	}

	template.push({ type : 'separator' })
	template.push({ label : myTranslator.syncStringLookup('open_folder'), click : () => {
		const thisCollectionFolder = modCollect.mapCollectionToFolder(modID.split('--')[0])

		if ( thisMod !== null ) {
			shell.showItemInFolder(path.join(thisCollectionFolder, path.basename(thisMod.fileDetail.fullPath)))
		}
	}})
	
	if ( thisMod.modHub.id !== null ) {
		template.push({ label : myTranslator.syncStringLookup('open_hub'), click : () => {
			shell.openExternal(`https://www.farming-simulator.com/mod.php?mod_id=${thisMod.modHub.id}`)
		}})
	}

	template.push({ type : 'separator' })
	template.push({ label : myTranslator.syncStringLookup('context_set_website'), click : () => {
		windows.main.webContents.send('fromMain_modInfoPop', thisMod, thisSite)
	}})
	if ( thisSite !== '' ) {
		template.push({ label : myTranslator.syncStringLookup('context_open_website'), click : () => {
			shell.openExternal(thisSite)
		}})
	}

	template.push({ type : 'separator' })
	template.push({ label : myTranslator.syncStringLookup('copy_to_list'), click : () => {
		handleCopyMoveDelete('confirmCopy', [modID], [thisMod])
	}})
	template.push({ label : myTranslator.syncStringLookup('move_to_list'), click : () => {
		handleCopyMoveDelete('confirmMove', [modID], [thisMod])
	}})
	template.push({ label : myTranslator.syncStringLookup('remove_from_list'), click : () => {
		handleCopyMoveDelete('confirmDelete', [modID], [thisMod])
	}})

	const menu = Menu.buildFromTemplate(template)
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})
ipcMain.on('toMain_mainContextMenu', async (event, collection) => {
	const subLabel  = modCollect.mapCollectionToFullName(collection)
	const colFolder = modCollect.mapCollectionToFolder(collection)
	const template  = [
		{ label : myTranslator.syncStringLookup('context_main_title').padEnd(subLabel.length, ' '), sublabel : subLabel },
		{ type  : 'separator' },
		{ label : myTranslator.syncStringLookup('list-active'), enabled : (colFolder !== overrideFolder), click : () => { newSettingsFile(collection) } },
		{ type  : 'separator' },
		{ label : myTranslator.syncStringLookup('open_folder'), click : () => { shell.openPath(modCollect.mapCollectionToFolder(collection)) }}
	]

	const noteItems = ['username', 'password', 'website', 'admin', 'server']
	let foundOne = false
	
	for ( const noteItem of noteItems ) {
		const thisNoteItem = modNote.get(`${collection}.notes_${noteItem}`, null)
		if ( thisNoteItem !== null ) {
			if ( !foundOne ) {
				template.push({ type : 'separator' })
				foundOne = true
			}

			template.push({
				label : `${myTranslator.syncStringLookup('context_main_copy')} : ${myTranslator.syncStringLookup(`notes_title_${noteItem}`)}`,
				click : () => {
					clipboard.writeText(thisNoteItem, 'selection') },
			})
		}
	}
	
	const menu = Menu.buildFromTemplate(template)
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})
ipcMain.on('toMain_notesContextMenu', async (event) => {
	const template  = [
		{ role : 'cut', label : myTranslator.syncStringLookup('context_cut') },
		{ role : 'copy', label : myTranslator.syncStringLookup('context_copy') },
		{ role : 'paste', label : myTranslator.syncStringLookup('context_paste') },
	]

	const menu = Menu.buildFromTemplate(template)
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})
ipcMain.on('toMain_logContextMenu', async (event) => {
	const template  = [
		{ role : 'copy', label : myTranslator.syncStringLookup('context_copy') },
	]

	const menu = Menu.buildFromTemplate(template)
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})
/** END: Main window context menus */


/** Game log window operation */
ipcMain.on('toMain_openGameLog',       () => {
	if ( gameLogFileWatch === null ) {
		if ( mcStore.get('game_log_file') === null ) {
			const currentVersion       =  mcStore.get('game_version')
			const gameSettingsKey      = ( currentVersion === 22 ) ? 'game_settings' : `game_settings_${currentVersion}`
			const gameSettingsFileName = mcStore.get(gameSettingsKey, '')
			mcStore.set('game_log_file', path.join(path.dirname(gameSettingsFileName), 'log.txt'))
		}
		loadGameLog()
	}

	createNamedWindow('gamelog')
})
ipcMain.on('toMain_openGameLogFolder', () => { shell.showItemInFolder(mcStore.get('game_log_file')) })
ipcMain.on('toMain_getGameLog',        () => { readGameLog() })
ipcMain.on('toMain_guessGameLog', () => {
	mcStore.set('game_log_auto', true)
	loadGameLog()
	readGameLog()
})
ipcMain.on('toMain_changeGameLog',     () => {
	dialog.showOpenDialog(windows.prefs, {
		properties  : ['openFile'],
		defaultPath : path.join(pathBestGuess, 'log.txt'),
		filters     : [
			{ name : 'Log Files', extensions : ['txt'] },
			{ name : 'All', extensions : ['*'] },
		],
	}).then((result) => {
		if ( ! result.canceled ) {
			loadGameLog(result.filePaths[0])
			readGameLog()
		}
	}).catch((unknownError) => {
		log.log.danger(`Could not read specified log : ${unknownError}`, 'game-log')
	})
})

function readGameLog() {
	if ( windows.gamelog === null ) { return }

	let thisGameLog = null

	if ( mcStore.get('game_log_auto') ) {
		const currentVersion = mcStore.get('game_version')
		const gameSettings   = mcStore.get( currentVersion === 22 ? 'game_settings' : `game_settings_${currentVersion}`)
		thisGameLog = path.join(path.dirname(gameSettings), 'log.txt')
		// guess from gamesettings
	} else {
		thisGameLog = mcStore.get('game_log_file', null)
	}

	if ( thisGameLog === null ) { return }

	try {
		const gameLogContents = fs.readFileSync(thisGameLog, {encoding : 'utf8', flag : 'r'})

		windows.gamelog.webContents.send('fromMain_gameLog', gameLogContents, thisGameLog)
	} catch (e) {
		log.log.warning(`Could not read game log file: ${e}`, 'game-log')
	}
}
/** END: Game log window operation */

/** Debug window operation */
ipcMain.on('toMain_openDebugLog',    () => { createNamedWindow('debug') })
ipcMain.on('toMain_openDebugFolder', () => { shell.showItemInFolder(log.pathToLog) })
ipcMain.on('toMain_getDebugLog',     (event) => { event.sender.send('fromMain_debugLog', log.htmlLog) })
/** END: Debug window operation */

/** Game launcher */
function gameLauncher() {
	const currentVersion = mcStore.get('game_version')
	const gamePathKey    = ( currentVersion === 22 ) ? 'game_path' : `game_path_${currentVersion}`
	const gameArgsKey    = ( currentVersion === 22 ) ? 'game_args' : `game_args_${currentVersion}`
	const progPath       = mcStore.get(gamePathKey)
	if ( progPath !== '' && fs.existsSync(progPath) ) {
		loadingWindow_open('launch')
		loadingWindow_noCount()
		loadingWindow_hide(3500)
		const cp = require('child_process')
		try {
			const child = cp.spawn(progPath, mcStore.get(gameArgsKey).split(' '), { detached : true, stdio : ['ignore', 'ignore', 'ignore'] })
			child.on('error', (err) => {
				log.log.danger(`Game launch failed ${err}!`, 'game-launcher')
			})
			child.unref()
		} catch (e) {
			log.log.danger(`Game launch failed: ${e}`, 'game-launcher')
		}
	} else {
		const dialogOpts = {
			type    : 'info',
			title   : myTranslator.syncStringLookup('launcher_error_title'),
			message : myTranslator.syncStringLookup('launcher_error_message'),
		}
		dialog.showMessageBox(windows.main, dialogOpts)
		log.log.warning('Game path not set or invalid!', 'game-launcher')
	}
}
ipcMain.on('toMain_startFarmSim', () => { gameLauncher() })
/** END: game launcher */

/** Find window operation */
ipcMain.on('toMain_openFind', () => {  createNamedWindow('find') })
ipcMain.on('toMain_findContextMenu', async (event, thisMod) => {
	const template = [
		{ label : myTranslator.syncStringLookup('select_in_main'), sublabel : thisMod.name },
		{ type : 'separator' },
	]
	for ( const instance of thisMod.collect ) {
		template.push({
			label : `${instance.name} :: ${instance.version}`,
			click : () => {
				windows.main.focus()
				windows.main.webContents.send('fromMain_selectOnlyFilter', instance.fullId, thisMod.name)
			},
		})
	}
	
	const menu = Menu.buildFromTemplate(template)
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})
/** END : Find window operation*/

/** Preferences window operation */
ipcMain.on('toMain_openPrefs', () => { createNamedWindow('prefs') })
ipcMain.on('toMain_getPref', (event, name) => { event.returnValue = mcStore.get(name) })
ipcMain.on('toMain_setModInfo', (event, mod, site) => {
	modSite.set(mod, site)
	refreshClientModList()
})
ipcMain.on('toMain_setPref', (event, name, value) => {

	switch ( name ) {
		case 'dev_mode' :
			parseGameXML(22, value)
			break
		case 'dev_mode_19':
		case 'dev_mode_17':
		case 'dev_mode_15':
		case 'dev_mode_13':
			parseGameXML(parseInt(name.slice(-2), 10), value)
			break
		case 'lock_lang':
			mcStore.set('force_lang', myTranslator.currentLocale)
			// falls through
		default :
			mcStore.set(name, value)
			break
	}

	if ( name.startsWith('game_enabled') ) {
		parseGameXML(19, null)
		parseGameXML(17, null)
		parseGameXML(15, null)
		parseGameXML(13, null)
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
ipcMain.on('toMain_clearCacheFile', () => {
	maCache.clear()
	foldersDirty = true
	processModFolders()
})
ipcMain.on('toMain_cleanCacheFile', (event) => {
	const localStore = maCache.store
	const md5Set     = new Set(Object.keys(localStore))

	loadingWindow_open('cache')
	
	for ( const collectKey of modCollect.collections ) {
		for ( const thisSum of Array.from(Object.values(modCollect.getModListFromCollection(collectKey)), (mod) => mod.md5Sum).filter((x) => x !== null) ) {
			md5Set.delete(thisSum)
		}
	}

	loadingWindow_total(md5Set.size, true)
	loadingWindow_current(0, true)

	setTimeout(() => {
		loadingWindow_total(md5Set.size, true)
		loadingWindow_current(0, true)

		for ( const md5 of md5Set ) { delete localStore[md5]; loadingWindow_current() }

		maCache.store = localStore

		loadingWindow_hide(1500)
		event.sender.send('fromMain_l10n_refresh', myTranslator.currentLocale)
	}, 1500)
})
ipcMain.on('toMain_setPrefFile', (event, version) => {
	const pathBestGuessNew = pathBestGuess.replace(/FarmingSimulator20\d\d/, `FarmingSimulator20${version}`)
	dialog.showOpenDialog(windows.prefs, {
		properties  : ['openFile'],
		defaultPath : path.join(pathBestGuessNew, 'gameSettings.xml'),
		filters     : [
			{ name : 'gameSettings.xml', extensions : ['xml'] },
			{ name : 'All', extensions : ['*'] },
		],
	}).then((result) => {
		if ( ! result.canceled ) {
			switch ( version ) {
				case 22 :
					mcStore.set('game_settings', result.filePaths[0])
					break
				case 19 :
				case 17 :
				case 15 :
				case 13 :
					mcStore.set(`game_settings_${version}`, result.filePaths[0])
					break
				default :
					log.log.danger('Unknown version for game settings', 'game-settings')
					break
			}

			parseSettings()
			refreshClientModList()
			event.sender.send( 'fromMain_allSettings', mcStore.store, devControls )
		}
	}).catch((unknownError) => {
		log.log.danger(`Could not read specified gamesettings : ${unknownError}`, 'game-settings')
	})
})
ipcMain.on('toMain_setGamePath', (event, version) => {
	dialog.showOpenDialog(windows.prefs, {
		properties  : ['openFile'],
		defaultPath : path.join(userHome, gameExePick[version]),
		filters     : [
			{ name : gameExePick[version], extensions : ['exe'] },
			{ name : 'All', extensions : ['*'] },
		],
	}).then((result) => {
		if ( ! result.canceled ) {
			switch ( version ) {
				case 22:
					mcStore.set('game_path', result.filePaths[0])
					break
				case 19 :
				case 17 :
				case 15 :
				case 13 :
					mcStore.set(`game_path_${version}`, result.filePaths[0])
					break
				default:
					log.log.danger('Unknown game path setting!', 'game-path')
					break
			}
			parseSettings()
			refreshClientModList()
			event.sender.send( 'fromMain_allSettings', mcStore.store, devControls )
		}
	}).catch((unknownError) => {
		log.log.danger(`Could not read specified game EXE : ${unknownError}`, 'game-path')
	})
})
ipcMain.on('toMain_setGameVersion', (event, newVersion) => {
	mcStore.set('game_version', newVersion)
	parseSettings()
	loadGameLog()
	readGameLog()
	refreshClientModList()
})
/** END: Preferences window operation */


/** Notes Operation */
ipcMain.on('toMain_openNotes', (event, collectKey) => {
	createNamedWindow('notes', {
		collectKey : collectKey,
		lastGameSettings : lastGameSettings,
	})
})
ipcMain.on('toMain_setNote', (event, id, value, collectKey) => {
	const cleanValue = ( id === 'notes_version' ) ? parseInt(value, 10) : value

	if ( cleanValue === '' ) {
		modNote.delete(`${collectKey}.${id}`)
	} else {
		modNote.set(`${collectKey}.${id}`, cleanValue)
	}

	createNamedWindow('notes', {
		collectKey : collectKey,
		lastGameSettings : lastGameSettings,
	})
})
/** END: Notes Operation */

let dlReq      = null
let dlProgress = false

/** Download operation */
ipcMain.on('toMain_cancelDownload', () => {
	if ( dlReq !== null ) { dlReq.abort() }
})
ipcMain.on('toMain_downloadList', (event, collection) => {
	if ( dlProgress ) { windows.load.focus(); return }
	const thisSite = modNote.get(`${collection}.notes_website`, null)
	const thisDoDL = modNote.get(`${collection}.notes_websiteDL`, false)
	const thisLink = `${thisSite}all_mods_download?onlyActive=true`

	if ( thisSite === null || !thisDoDL ) { return }

	doDialogBox('main', { titleL10n : 'download_title', message : `${myTranslator.syncStringLookup('download_started')} :: ${modCollect.mapCollectionToName(collection)}\n${myTranslator.syncStringLookup('download_finished')}` })

	dlProgress = true
	log.log.info(`Downloading Collection : ${collection}`, 'mod-download')
	log.log.info(`Download Link : ${thisLink}`, 'mod-download')

	dlReq = net.request(thisLink)

	dlReq.on('response', (response) => {
		log.log.info(`Got download: ${response.statusCode}`, 'mod-download')

		if ( response.statusCode < 200 || response.statusCode >= 400 ) {
			doDialogBox('main', { type : 'error', titleL10n : 'download_title', message : `${myTranslator.syncStringLookup('download_failed')} :: ${modCollect.mapCollectionToName(collection)}` })
			dlProgress = false
		} else {
			loadingWindow_open('download', true)

			loadingWindow_total(response.headers['content-length'] || 0, true, true)
			loadingWindow_current(0, true, true)

			const dlPath      = path.join(app.getPath('temp'), `${collection}.zip`)
			const writeStream = fs.createWriteStream(dlPath)

			response.pipe(writeStream)
			response.on('data', (chunk) => { loadingWindow_current(chunk.length, false, true) })

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
						dlProgress = false
						log.log.warning(`Download unzip failed : ${err}`, 'mod-download')
					})

					zipReadStream.on('end', () => {
						log.log.info('Unzipping complete', 'mod-download')
						zipReadStream.close()
						foldersDirty = true
						fs.unlinkSync(dlPath)
						dlProgress = false
						processModFolders()
					})

					zipReadStream.pipe(unzip.Extract({ path : modCollect.mapCollectionToFolder(collection) }))
				} catch (e) {
					log.log.warning(`Download failed : (${response.statusCode}) ${e}`, 'mod-download')
					loadingWindow_hide()
				}
			})
		}
	})
	dlReq.on('abort', () => { log.log.notice('Download canceled', 'mod-download'); dlProgress = false; loadingWindow_hide() })
	dlReq.on('error', (error) => { log.log.warning(`Network error : ${error}`, 'mod-download'); dlProgress = false; loadingWindow_hide() })
	dlReq.end()
})
/** END: download operation */

/** Export operation */
const csvRow = (entries) => entries.map((entry) => `"${entry.replaceAll('"', '""')}"`).join(',')

ipcMain.on('toMain_exportList', (event, collection) => {
	const csvTable = []

	csvTable.push(csvRow(['Mod', 'Title', 'Version', 'Author', 'ModHub', 'Link']))

	for ( const mod of modCollect.getModListFromCollection(collection) ) {
		const modHubID    = mod.modHub.id
		const modHubLink  = ( modHubID !== null ) ? `https://www.farming-simulator.com/mod.php?mod_id=${modHubID}` : ''
		const modHubYesNo = ( modHubID !== null ) ? 'yes' : 'no'
		csvTable.push(csvRow([
			`${mod.fileDetail.shortName}.zip`,
			mod.l10n.title,
			mod.modDesc.version,
			mod.modDesc.author,
			modHubYesNo,
			modHubLink
		]))
	}

	dialog.showSaveDialog(windows.main, {
		defaultPath : path.join(app.getPath('desktop'), `${modCollect.mapCollectionToName(collection)}.csv`),
		filters     : [{ name : 'CSV', extensions : ['csv'] }],
	}).then(async (result) => {
		if ( result.canceled ) {
			log.log.debug('Save CSV Cancelled', 'csv-export')
		} else {
			try {
				fs.writeFileSync(result.filePath, csvTable.join('\n'))
				app.addRecentDocument(result.filePath)
				doDialogBox('main', { messageL10n : 'save_csv_worked' })
			} catch (err) {
				log.log.warning(`Could not save csv file : ${err}`, 'csv-export')
				doDialogBox('main', { type : 'warning', messageL10n : 'save_csv_failed' })
			}
		}
	}).catch((unknownError) => {
		log.log.warning(`Could not save csv file : ${unknownError}`, 'csv-export')
	})
})
ipcMain.on('toMain_exportZip', (event, selectedMods) => {
	const filePaths = []

	for ( const mod of modCollect.modColUUIDsToRecords(selectedMods) ) {
		filePaths.push([mod.fileDetail.shortName, mod.fileDetail.fullPath])
	}

	dialog.showSaveDialog(windows.main, {
		defaultPath : app.getPath('desktop'),
		filters     : [
			{ name : 'ZIP', extensions : ['zip'] },
		],
	}).then(async (result) => {
		if ( result.canceled ) {
			log.log.debug('Export ZIP Cancelled', 'zip-export')
		} else {
			try {
				loadingWindow_open('makezip')
				loadingWindow_total(filePaths.length, true)
				loadingWindow_current(0, true)
				const zipOutput  = fs.createWriteStream(result.filePath)
				const zipArchive = makeZip('zip', {
					zlib : { level : 6 },
				})
				
				zipOutput.on('close', () => {
					log.log.info(`ZIP file created : ${result.filePath}`, 'zip-export')
					app.addRecentDocument(result.filePath)
				})

				zipArchive.on('error', (err) => {
					loadingWindow_hide()
					log.log.warning(`Could not create zip file : ${err}`, 'zip-export')
					setTimeout(() => {
						doDialogBox('main', { type : 'warning', messageL10n : 'save_zip_failed' })
					}, 1500)
				})

				zipArchive.on('warning', (err) => {
					log.log.warning(`Problem with ZIP file : ${err}`, 'zip-export')
				})

				zipArchive.on('entry', (entry) => {
					loadingWindow_current()
					log.log.info(`Added file to ZIP : ${entry.name}`, 'zip-export')
				})

				zipArchive.pipe(zipOutput)

				for ( const thisFile of filePaths ) {
					zipArchive.file(thisFile[1], { name : `${thisFile[0]}.zip` })
				}

				zipArchive.finalize().then(() => { loadingWindow_hide() })

			} catch (err) {
				log.log.warning(`Could not create zip file : ${err}`, 'zip-export')
				loadingWindow_hide()
				setTimeout(() => {
					doDialogBox('main', { type : 'warning', messageL10n : 'save_zip_failed' })
				}, 1500)
			}
		}
	}).catch((unknownError) => {
		log.log.warning(`Could not create zip file : ${unknownError}`, 'zip-export')
	})
})
/** END: Export operation */

/** Savegame window operation */
ipcMain.on('toMain_openSave',       (event, collection) => { createNamedWindow('save', { collectKey : collection }) })
ipcMain.on('toMain_selectInMain',   (event, selectList) => {
	windows.main.focus()
	windows.main.webContents.send('fromMain_selectOnly', selectList)
})
ipcMain.on('toMain_openSaveFolder', () => { openSaveGame(false) })
ipcMain.on('toMain_openSaveZIP',    () => { openSaveGame(true) })
ipcMain.on('toMain_openSaveDrop',   (event, type, path) => {
	const isFolder      = ( type !== 'zip')
	if ( isFolder ) {
		const folderStats = fs.statSync(path)
		if ( !folderStats.isDirectory ) { return }
	}
	const thisSavegame = new saveFileChecker(path, isFolder, log)

	sendModList({ thisSaveGame : thisSavegame }, 'fromMain_saveInfo', 'save', false )
})
ipcMain.on('toMain_openHubByID',    (event, hubID) => {
	shell.openExternal(`https://www.farming-simulator.com/mod.php?mod_id=${hubID}`)
})

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

				sendModList({ thisSaveGame : thisSavegame }, 'fromMain_saveInfo', 'save', false )
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
ipcMain.on('toMain_versionCheck',    () => { createNamedWindow('version') })
ipcMain.on('toMain_refreshVersions', () => { sendModList({}, 'fromMain_modList', 'version', false ) } )
ipcMain.on('toMain_versionResolve',  (event, shortName) => {
	const modSet = []
	const foundMods = modCollect.shortNames[shortName]

	for ( const modPointer of foundMods ) {
		const mod = modCollect.modColAndUUID(modPointer[0], modPointer[1])
		
		if ( !mod.fileDetail.isFolder ) {
			modSet.push({
				collectKey  : modPointer[0],
				collectName : modCollect.mapCollectionToName(modPointer[0]),
				modRecord   : mod,
				version     : mod.modDesc.version,
			})
		}
	}
	createNamedWindow('resolve', {
		modSet    : modSet,
		shortName : shortName,
	})
})
/** END: Version window operation */


/** Utility & Convenience Functions */
ipcMain.on('toMain_closeSubWindow', (event) => { BrowserWindow.fromWebContents(event.sender).close() })


function sendModList(extraArgs = {}, eventName = 'fromMain_modList', toWindow = 'main', closeLoader = true) {
	modCollect.toRenderer(extraArgs).then((modCollection) => {
		windows[toWindow].webContents.send(eventName, modCollection)

		if ( toWindow === 'main' && windows.version && windows.version.isVisible() ) {
			windows.version.webContents.send(eventName, modCollection)
		}
		if ( closeLoader ) { loadingWindow_hide(1500) }
	})
}

function refreshClientModList(closeLoader = true) {
	sendModList(
		{
			activeCollection       : overrideIndex,
			currentLocale          : myTranslator.deferCurrentLocale(),
			foldersDirty           : foldersDirty,
			l10n                   : {
				disable : myTranslator.syncStringLookup('override_disabled'),
				unknown : myTranslator.syncStringLookup('override_unknown'),
			},
			modSites               : modSite.store,
		},
		'fromMain_modList',
		'main',
		closeLoader
	)
}

/** END: Utility & Convenience Functions */


/** Business Functions */
function loadGameLog(newPath = false) {
	if ( newPath ) {
		mcStore.set('game_log_file', newPath)
		mcStore.set('game_log_auto', false)
	}

	if ( gameLogFileWatch !== null ) {
		gameLogFileWatch.close()
		gameLogFileWatch = null
	}

	let thisGameLog = null

	if ( mcStore.get('game_log_auto') ) {
		const currentVersion = mcStore.get('game_version')
		const gameSettings   = mcStore.get( currentVersion === 22 ? 'game_settings' : `game_settings_${currentVersion}`)
		thisGameLog = path.join(path.dirname(gameSettings), 'log.txt')
	} else {
		thisGameLog = mcStore.get('game_log_file', null)
	}

	if ( thisGameLog !== null && gameLogFileWatch === null ) {
		log.log.debug(`Trying to open game log: ${thisGameLog}`, 'game-log')

		if ( fs.existsSync(thisGameLog) ) {
			gameLogFileWatch = fs.watch(thisGameLog, (event, filename) => {
				if ( filename ) {
					if ( gameLogFileBounce ) return
					gameLogFileBounce = setTimeout(() => {
						gameLogFileBounce = false
						readGameLog()
					}, 5000)
				}
			})
			gameLogFileWatch.on('error', (err) => {
				log.log.warning(`Error with game log: ${err}`, 'game-log')
				gameLogFileWatch = null
			})
		} else {
			log.log.warning(`Game Log not found at: ${thisGameLog}`, 'game-log')
			mcStore.set('game_log_file', null)
		}
	}
}
function parseGameXML(version = 22, devMode = null) {
	const gameSettingsKey     = version === 22 ? 'game_settings' : `game_settings_${version}`
	const gameEnabledValue    = version === 22 ? true : mcStore.get(`game_enabled_${version}`)
	const thisGameSettingsXML = mcStore.get(gameSettingsKey)
	const gameXMLFile         = thisGameSettingsXML.replace('gameSettings.xml', 'game.xml')

	if ( !gameEnabledValue ) { return }

	let   XMLString = ''
	const XMLParser = new fxml.XMLParser({
		commentPropName    : '#comment',
		ignoreAttributes   : false,
		numberParseOptions : { leadingZeros : true, hex : true, skipLike : /[0-9]\.[0-9]{6}/ },
	})
	
	try {
		if ( ! fs.existsSync(gameXMLFile) ) {
			throw `File Not Found ${gameXMLFile}`
		}
		XMLString = fs.readFileSync(gameXMLFile, 'utf8')
	} catch (e) {
		log.log.danger(`Could not read game xml (version:${version}) ${e}`, 'game-xml')
		return
	}

	try {
		gameXML = XMLParser.parse(XMLString)
		devControls[version] = gameXML.game.development.controls
	} catch (e) {
		log.log.danger(`Could not read game xml (version:${version}) ${e}`, 'game-xml')
	}
	
	if ( devMode !== null ) {
		gameXML.game.development.controls = devMode

		const builder    = new fxml.XMLBuilder({
			commentPropName           : '#comment',
			format                    : true,
			ignoreAttributes          : false,
			indentBy                  : '    ',
			suppressBooleanAttributes : false,
			suppressEmptyNode         : true,
		})

		try {
			fs.writeFileSync(gameXMLFile, builder.build(gameXML))
		} catch (e) {
			log.log.danger(`Could not write game xml ${e}`, 'game-xml')
		}

		parseGameXML(version, null)
	}
}

function newSettingsFile(newList) {
	parseSettings({
		newFolder  : modCollect.mapCollectionToFolder(newList),
		password   : modNote.get(`${newList}.notes_password`, null),
		serverName : modNote.get(`${newList}.notes_server`, null),
		userName   : modNote.get(`${newList}.notes_username`, null),
	})
}

function parseSettings({disable = null, newFolder = null, userName = null, serverName = null, password = null } = {}) {
	// Version must be the one of the newFolder *or* the current
	let operationFailed = false
	const currentVersion = ( newFolder === null ) ?
		mcStore.get('game_version', 22) :
		modNote.get(`${modCollect.mapFolderToCollection(newFolder)}.notes_version`, 22)

	const gameSettingsKey = ( currentVersion === 22 ) ? 'game_settings' : `game_settings_${currentVersion}`
	const gameSettingsFileName = mcStore.get(gameSettingsKey, '')

	let   XMLString = ''
	const XMLParser = new fxml.XMLParser({
		commentPropName    : '#comment',
		ignoreAttributes   : false,
		numberParseOptions : { leadingZeros : true, hex : true, skipLike : /[0-9]\.[0-9]{6}/ },
	})
	
	try {
		if ( ! fs.existsSync(gameSettingsFileName) ) {
			operationFailed = true
			throw `File Not Found: ${gameSettingsFileName}`
		}

		XMLString       = fs.readFileSync(gameSettingsFileName, 'utf8')
		gameSettingsXML = XMLParser.parse(XMLString)
		overrideActive  = (gameSettingsXML.gameSettings.modsDirectoryOverride['@_active'] === 'true')
		overrideFolder  = gameSettingsXML.gameSettings.modsDirectoryOverride['@_directory']
		lastGameSettings = {
			username : gameSettingsXML.gameSettings?.onlinePresenceName || gameSettingsXML.gameSettings?.player?.name || '',
			password : gameSettingsXML.gameSettings?.joinGame?.['@_password'] || '',
			server   : gameSettingsXML.gameSettings?.joinGame?.['@_serverName'] || '',
		}
	} catch (e) {
		operationFailed = true
		log.log.danger(`Could not read game settings ${e}`, 'game-settings')
	}

	overrideIndex = ( !overrideActive ) ? '0' : modCollect.mapFolderToCollection(overrideFolder) || '999'

	if ( ! operationFailed ) {
		if ( disable !== null || newFolder !== null || userName !== null || password !== null || serverName !== null ) {
			modNote.set(`${modCollect.mapFolderToCollection(newFolder)}.notes_last`, new Date())
			writeGameSettings(gameSettingsFileName, gameSettingsXML, {
				disable    : disable,
				newFolder  : newFolder,
				password   : password,
				serverName : serverName,
				userName   : userName,
				version    : currentVersion,
			})
		}
	}
}

function writeGameSettings(gameSettingsFileName, gameSettingsXML, opts) {
	loadingWindow_open('set')
	loadingWindow_noCount()

	gameSettingsXML.gameSettings.modsDirectoryOverride['@_active']    = ( opts.disable === false || opts.disable === null )
	gameSettingsXML.gameSettings.modsDirectoryOverride['@_directory'] = ( opts.newFolder !== null ) ? opts.newFolder : ''

	if ( opts.version === 22 || opts.version === 19 ) {
		if ( typeof gameSettingsXML.gameSettings.joinGame === 'undefined' ) { gameSettingsXML.gameSettings.joinGame = {} }
		if ( opts.userName !== null && opts.version === 22 ) { gameSettingsXML.gameSettings.onlinePresenceName = opts.userName }
		if ( opts.userName !== null && opts.version === 19 ) { gameSettingsXML.gameSettings.player.name = opts.userName }
		if ( opts.password !== null ) { gameSettingsXML.gameSettings.joinGame['@_password'] = opts.password }
		if ( opts.serverName !== null ) { gameSettingsXML.gameSettings.joinGame['@_serverName'] = opts.serverName }
	}

	const builder    = new fxml.XMLBuilder({
		commentPropName           : '#comment',
		format                    : true,
		ignoreAttributes          : false,
		indentBy                  : '    ',
		suppressBooleanAttributes : false,
		suppressEmptyNode         : true,
	})

	try {
		let outputXML = builder.build(gameSettingsXML)

		outputXML = outputXML.replace('<ingameMapFruitFilter/>', '<ingameMapFruitFilter></ingameMapFruitFilter>')

		fs.writeFileSync(gameSettingsFileName, outputXML)
	} catch (e) {
		log.log.danger(`Could not write game settings ${e}`, 'game-settings')
	}

	parseSettings()
	refreshClientModList()
}

let fileWait = null
function fileOperation(type, fileMap, srcWindow = 'confirm') {
	if ( typeof fileMap !== 'object' ) { return }
	windows[srcWindow].close()

	loadingWindow_open('files')
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

	for ( const file of fileMap ) {
		// fileMap is [destCollectKey, sourceCollectKey, fullPath (guess)]
		// fullPathMap is [source, destination]
		const thisFileName = path.basename(file[2])
		if ( type !== 'import' ) {
			fullPathMap.push([
				path.join(modCollect.mapCollectionToFolder(file[1]), thisFileName), // source
				path.join(modCollect.mapCollectionToFolder(file[0]), thisFileName), // dest
			])
		} else {
			fullPathMap.push([
				file[2],
				path.join(modCollect.mapCollectionToFolder(file[0]), thisFileName), // dest
			])
		}
	}

	foldersDirty = true
	let sourceFileStat = null

	for ( const file of fullPathMap ) {
		try {
			switch (type) {
				case 'copy' :
				case 'import' :
					log.log.info(`Copy File : ${file[0]} -> ${file[1]}`, 'file-ops')

					sourceFileStat = fs.statSync(file[0])
					
					if ( ! sourceFileStat.isDirectory() ) {
						fs.copyFileSync(file[0], file[1])
					} else {
						fs.cpSync(file[0], file[1], { recursive : true })
					}
					break
				case 'move':
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
					log.log.warning(`Unknown file operation called: ${type}`, 'file-ops')
			}
		} catch (e) {
			log.log.danger(`Could not ${type} file : ${e}`, `${type}-file`)
		}

		loadingWindow_current()
	}

	processModFolders()
}

let loadingWait = null
async function processModFolders() {
	if ( !foldersDirty ) { loadingWindow_hide(); return }

	loadingWindow_open('mods')
	loadingWindow_total(0, true)
	loadingWindow_current(0, true)

	loadingWait = setInterval(() => {
		if ( windows.load.isVisible() ) {
			clearInterval(loadingWait)
			processModFoldersOnDisk()
		}
	}, 250)
}
function processModFoldersOnDisk() {
	modCollect.syncSafe     = mcStore.get('use_one_drive', false)
	modCollect.clearAll()

	modFoldersWatch.forEach((oldWatcher) => { oldWatcher.close() })
	modFoldersWatch = []
	// Cleaner for no-longer existing folders, set watcher for others
	for ( const folder of modFolders ) {
		if ( ! fs.existsSync(folder) ) {
			modFolders.delete(folder)
		} else {
			const thisWatch = fs.watch(folder, (eventType, fileName) => { updateFolderDirtyWatch(eventType, fileName, folder) })
			thisWatch.on('error', () => { log.log.warning(`Folder Watch Error: ${folder}`, 'folder-watcher') })
			modFoldersWatch.push(thisWatch)
		}
	}

	mcStore.set('modFolders', Array.from(modFolders))

	for ( const folder of modFolders ) {
		const thisCollectionStats = modCollect.addCollection(folder)

		loadingWindow_total(thisCollectionStats.fileCount)
	}

	modCollect.processMods()

	modCollect.processPromise.then(() => {
		foldersDirty = false
		parseSettings()
		parseGameXML(22, null)
		parseGameXML(19, null)
		parseGameXML(17, null)
		parseGameXML(15, null)
		parseGameXML(13, null)
		refreshClientModList()

		if ( mcStore.get('rel_notes') !== app.getVersion() ) {
			mcStore.set('rel_notes', app.getVersion() )
			log.log.info('New version detected, show changelog')
			createNamedWindow('change')
		}
	})
}
function updateFolderDirtyWatch(eventType, fileName, folder) {
	if ( eventType === 'rename' ) {
		if ( ! fileName.endsWith('.tmp') && ! fileName.endsWith('.crdownload')) {
			log.log.debug(`Folders now dirty due to ${path.basename(folder)} :: ${fileName}`, 'folder-watcher')

			foldersDirty = true
			sendFoldersDirtyUpdate()
		}
	}
}
function sendFoldersDirtyUpdate() {
	windows.main.webContents.send('fromMain_dirtyUpdate', foldersDirty)
}

function loadSaveFile(filename) {
	try {
		const rawData  = fs.readFileSync(path.join(app.getPath('userData'), filename))
		const jsonData = JSON.parse(rawData)
		let merger = null

		switch (filename) {
			case 'modHubData.json' :
				merger = { ...oldModHub.mods, ...jsonData.mods}
				jsonData.mods = merger
				modCollect.modHubList = jsonData
				break
			case 'modHubVersion.json' :
				merger = { ...oldModHub.versions, ...jsonData}
				modCollect.modHubVersion = merger
				break
			default :
				break
		}

		log.log.debug(`Loaded ${filename}`, 'local-cache')
	} catch (e) {
		log.log.warning(`Loading ${filename} failed: ${e}`, 'local-cache')
	}
}

function dlSaveFile(url, filename) {
	if ( net.isOnline() ) {
		const request = net.request(url)

		request.setHeader('pragma', 'no-cache')

		request.on('response', (response) => {
			log.log.info(`Got ${filename}: ${response.statusCode}`, 'local-cache')
			let responseData = ''
			response.on('data', (chunk) => { responseData = responseData + chunk.toString() })
			response.on('end',  () => {
				fs.writeFileSync(path.join(app.getPath('userData'), filename), responseData)
				loadSaveFile(filename)
			})
		})
		request.on('error', (error) => {
			loadSaveFile(filename)
			log.log.info(`Network error : ${url} :: ${error}`, 'net-request')
		})
		request.end()
	}
}
/** END: Business Functions */

function doDialogBox(attachTo, {type = 'info', message = null, messageL10n = null, title = null, titleL10n = null }) {
	const attachWin = ( attachTo === null ) ? null : windows[attachTo]

	const thisTitle = ( title !== null ) ? title : myTranslator.syncStringLookup(( titleL10n === null ) ? 'app_name' : titleL10n)
	const thisMessage = ( message !== null ) ? message : myTranslator.syncStringLookup(messageL10n)

	dialog.showMessageBoxSync(attachWin, {
		title   : thisTitle,
		message : thisMessage,
		type    : type,
	})
}





app.whenReady().then(() => {
	if ( gotTheLock ) {
		if ( mcStore.has('force_lang') && mcStore.get('lock_lang', false) ) {
			// If language is locked, switch to it.
			myTranslator.currentLocale = mcStore.get('force_lang')
		}

		if (process.platform === 'win32') {
			app.setAppUserModelId('jtsage.fsmodassist')
		}
		
		tray = new Tray(trayIcon)

		const template = [
			{ label : 'FSG Mod Assist', /*icon : pathIcon, */enabled : false },
			{ type  : 'separator' },
			{ label : myTranslator.syncStringLookup('tray_show'), click : () => { windows.main.show() } },
			{ label : myTranslator.syncStringLookup('launch_game'), click : () => { gameLauncher() } },
			{ label : myTranslator.syncStringLookup('tray_quit'), click : () => { windows.main.close() } },
		]
		const contextMenu = Menu.buildFromTemplate(template)
		tray.setContextMenu(contextMenu)
		tray.setToolTip('FSG Mod Assist')
		tray.on('click', () => { windows.main.show() })

		dlSaveFile(hubURL, 'modHubData.json')
		dlSaveFile(hubVerURL, 'modHubVersion.json')

		app.on('second-instance', (event, argv) => {
			// Someone tried to run a second instance, we should focus our window.
			if ( argv.includes('--start-game') ) { gameLauncher() }
			if (windows.main) {
				if ( windows.main.isMinimized()) { windows.main.show() }
				windows.main.focus()
			}
		})

		app.setUserTasks([
			{
				arguments : '--start-game',
				description : '',
				iconIndex : 0,
				iconPath  : trayIcon,
				program   : process.execPath,
				title     : myTranslator.syncStringLookup('launch_game'),
			}
		])

		createMainWindow()

		app.on('activate', () => {if (BrowserWindow.getAllWindows().length === 0) { createMainWindow() } })
	}
})

app.setAboutPanelOptions({
	applicationName    : 'FS Mod Assist',
	applicationVersion : app.getVersion(),
	copyright          : '(c) 2022-present FSG Modding',
	credits            : 'J.T.Sage <jtsage+datebox@gmail.com>',
	iconPath           : pathIcon,
	website            : 'https://github.com/FSGModding/FSG_Mod_Assistant',
})

app.on('window-all-closed', () => {	if (process.platform !== 'darwin') { app.quit() } })
