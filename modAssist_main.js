/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main Program

const { app, BrowserWindow, ipcMain, shell, dialog, Menu, Tray, net, screen, clipboard } = require('electron')

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
const skipCache     = false && !(app.isPackaged)
const crashLog      = path.join(app.getPath('userData'), 'crash.log')
let updaterInterval = null

log.log.info(`ModAssist Logger: ${app.getVersion()}`)
log.log.info(` - Node.js Version: ${process.versions.node}`)
log.log.info(` - Electron Version: ${process.versions.electron}`)
log.log.info(` - Chrome Version: ${process.versions.chrome}`)


function handleUnhandled(type, err, origin) {
	const rightNow = new Date()
	fs.appendFileSync(
		crashLog,
		`${type} Timestamp : ${rightNow.toISOString()}\n\nCaught ${type}: ${err}\n\nOrigin: ${origin}\n\n${err.stack}`
	)
	if ( !isNetworkError(err) ) {
		dialog.showMessageBoxSync(null, {
			title   : `Uncaught ${type} - Quitting`,
			message : `Caught ${type}: ${err}\n\nOrigin: ${origin}\n\n${err.stack}\n\n\nCan't Continue, exiting now!\n\nTo send file, please see ${crashLog}`,
			type    : 'error',
		})
		if ( gameLogFile ) { gameLogFile.close() }
		app.quit()
	} else {
		log.log.debug(`Network error: ${err}`, `net-error-${type}`)
	}
}
process.on('uncaughtException', (err, origin) => { handleUnhandled('exception', err, origin) })
process.on('unhandledRejection', (err, origin) => { handleUnhandled('rejection', err, origin) })

const translator       = require('./lib/translate.js')
const myTranslator     = new translator.translator(translator.getSystemLocale())
myTranslator.mcVersion = app.getVersion()
myTranslator.iconOverrides = {
	preferences_button : 'list',
	export_button      : 'filetype-csv',
	notes_button       : 'journal-text',
	admin_button       : 'globe2',
	download_button    : 'cloud-download',
	search_all         : 'search',
	admin_pass_button  : 'key',
	folder_top_button  : 'align-top',
	folder_up_button   : 'chevron-up',
	folder_down_button : 'chevron-down',
	folder_bot_button  : 'align-bottom',
	button_gamelog     : 'file-earmark-text',
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
			type    : 'info',
			buttons : [myTranslator.syncStringLookup('update_restart'), myTranslator.syncStringLookup('update_later')],
			title   : myTranslator.syncStringLookup('update_title'),
			message : process.platform === 'win32' ? releaseNotes : releaseName,
			detail  : myTranslator.syncStringLookup('update_detail'),
		}
		dialog.showMessageBox(windows.main, dialogOpts).then((returnValue) => {
			if (returnValue.response === 0) {
				if ( tray ) { tray.destroy() }
				if ( gameLogFile ) { gameLogFile.close() }
				Object.keys(windows).forEach((thisWin) => {
					if ( thisWin !== 'main' && windows[thisWin] !== null ) {
						windows[thisWin].destroy()
					}
				})
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

let gameLogFile       = null
let gameLogFileBounce = false

const gameExeName = 'FarmingSimulator2022.exe'
const gameGuesses = [
	'C:\\Program Files (x86)\\Farming Simulator 2022\\',
	'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Farming Simulator 22'
]
const pathGuesses = [
	path.join(app.getPath('documents'), 'My Games', 'FarmingSimulator2022'),
	path.join(userHome, 'OneDrive', 'Documents', 'My Games', 'FarmingSimulator2022'),
	path.join(userHome, 'Documents', 'My Games', 'FarmingSimulator2022')
]

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

const { modFileCollection } = require('./lib/modCheckLib.js')

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
	use_one_drive     : { type : 'boolean', default : false },
	force_lang        : { type : 'string', default : '' },
	game_settings     : { type : 'string', default : path.join(pathBestGuess, 'gameSettings.xml') },
	game_path         : { type : 'string', default : foundGame },
	cache_version     : { type : 'string', default : '0.0.0' },
	rel_notes         : { type : 'string', default : '0.0.0' },
	game_args         : { type : 'string', default : '' },
	led_active        : { type : 'boolean', default : true },
	wins              : { type : 'object', default : {}, properties : {
		load          : { type : 'object', default : {}, properties : winDef(600, 300), additionalProperties : false },
		splash        : { type : 'object', default : {}, properties : winDef(600, 300), additionalProperties : false },
		change        : { type : 'object', default : {}, properties : winDef(650, 350), additionalProperties : false },
		confirm       : { type : 'object', default : {}, properties : winDef(750, 500), additionalProperties : false },
		debug         : { type : 'object', default : {}, properties : winDef(1000, 500), additionalProperties : false },
		detail        : { type : 'object', default : {}, properties : winDef(800, 500), additionalProperties : false },
		find          : { type : 'object', default : {}, properties : winDef(800, 600), additionalProperties : false },
		folder        : { type : 'object', default : {}, properties : winDef(800, 500), additionalProperties : false },
		gamelog       : { type : 'object', default : {}, properties : winDef(1000, 500), additionalProperties : false },
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
const makeZip = require('archiver')

const { saveFileChecker } = require('./lib/savegame-parser.js')

const mcStore = new Store({schema : settingsSchema, migrations : settingsMig, clearInvalidConfig : true })
const maCache = new Store({name : 'mod_cache', clearInvalidConfig : true})
const modNote = new Store({name : 'col_notes', clearInvalidConfig : true})

const modCollect = new modFileCollection(
	log,
	modNote,
	maCache,
	app.getPath('home'),
	{
		hide  : loadingWindow_hide,
		count : loadingWindow_current,
	},
	myTranslator.deferCurrentLocale,
	skipCache
)

const loadWindowCount = { total : 0, current : 0}

let modFolders       = new Set()
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
	log.log.warning('Invalid Mod Cache (very old), resetting.')
	maCache.clear()
	log.log.info('Mod Cache Cleared')
} else if ( semverGt('1.9.3', mcStore.get('cache_version'))) {
	log.log.debug('Mod Cache 1.9.3 Update Running')
	const oldCache = maCache.store
	const tagRegEx = /"mod_badge_(.+?)"/g

	Object.keys(oldCache).forEach((key) => {
		if ( typeof oldCache[key].badgeArray === 'undefined' ) {
			oldCache[key].badgeArray = []

			if ( typeof oldCache[key].badges !== 'undefined' ) {
				const tagMatch = [...oldCache[key].badges.matchAll(tagRegEx)]

				tagMatch.forEach((match) => { oldCache[key].badgeArray.push(match[1].toLowerCase()) })
				delete oldCache[key].badges
			}
		}
	})
	maCache.store = oldCache

} else {
	log.log.debug('Mod Cache Version Good')
}

mcStore.set('cache_version', app.getVersion())

/** END: Upgrade Cache Version Here */


function debugDangerCallback() {
	if ( windows.main !== null ) { windows.main.webContents.send('fromMain_debugLogDanger') }
}

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

function createSubWindow(winName, {noSelect = true, show = true, parent = null, title = null, fixed = false, frame = true, move = true, preload = null, fixedOnTop = true} = {}) {
	const realCenter  = getRealCenter(winName)
	const winSettings = mcStore.get(`wins.${winName}`)

	const winOptions = {
		minimizable     : !fixed,
		alwaysOnTop     : fixedOnTop && fixed,
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
			if (input.control && input.code === 'KeyA') {
				thisWindow.webContents.send('fromMain_subWindowSelectAll')
				event.preventDefault()
			}
			if (input.control && input.shift && input.code === 'KeyA') {
				thisWindow.webContents.send('fromMain_subWindowSelectNone')
				event.preventDefault()
			}
			if ( input.alt && input.control && input.code === 'KeyD' ) {
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
	windows.load = createSubWindow('load', { fixedOnTop : false, show : false, preload : 'loadingWindow', fixed : true, move : false, frame : false })
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
	windows.main.on('closed',   () => {
		windows.main = null
		if ( tray ) { tray.destroy() }
		windows.load.destroy()
		gameLogFile.close()
		app.quit()
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
			createDebugWindow()
			event.preventDefault()
		}
	})
	
	windows.main.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url)
		return { action : 'deny' }
	})
}

function createConfirmFav(windowArgs) {
	if ( windows.confirm ) { windows.confirm.focus(); return }

	windows.confirm = createSubWindow('confirm', { parent : 'main', preload : 'confirmMulti', fixed : true })

	windows.confirm.webContents.on('did-finish-load', async () => {
		sendModList(windowArgs, 'fromMain_confirmList', 'confirm', false)

		if ( devDebug ) { windows.confirm.webContents.openDevTools() }
	})

	windows.confirm.loadFile(path.join(pathRender, 'confirm-multi.html'))

	windows.confirm.on('closed', () => { destroyAndFocus('confirm') })
}

function createConfirmWindow(type, modRecords, origList) {
	if ( modRecords.length < 1 ) { return }
	if ( windows.confirm ) { windows.confirm.focus(); return }

	const file_HTML  = `confirm-file${type.charAt(0).toUpperCase()}${type.slice(1)}.html`
	const file_JS    = `confirm${type.charAt(0).toUpperCase()}${type.slice(1)}`
	const collection = origList[0].split('--')[0]

	windows.confirm = createSubWindow('confirm', { parent : 'main', preload : file_JS, fixed : true })

	windows.confirm.webContents.on('did-finish-load', async () => {
		sendModList(
			{
				records : modRecords,
				originCollectKey : collection,
			},
			'fromMain_confirmList',
			'confirm',
			false
		)
		if ( devDebug ) { windows.confirm.webContents.openDevTools() }
	})

	windows.confirm.loadFile(path.join(pathRender, file_HTML))

	windows.confirm.on('closed', () => { destroyAndFocus('confirm') })
}

function createChangeLogWindow() {
	if ( windows.change ) {
		windows.change.focus()
		return
	}

	windows.change = createSubWindow('change', { parent : 'main', fixed : true, preload : 'aChangelogWindow' })

	windows.change.loadFile(path.join(pathRender, 'a_changelog.html'))
	windows.change.on('closed', () => { destroyAndFocus('change') })
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
	windows.folder.on('closed', () => { destroyAndFocus('folder'); processModFolders() })
}

function createDetailWindow(thisModRecord) {
	if ( thisModRecord === null ) { return }
	//const modhubRecord = modCollect.modHubFullRecord(thisModRecord)

	if ( windows.detail ) {
		windows.detail.focus()
		// TODO: this is wrong!  Get rid of modhubRecord
		windows.detail.webContents.send('fromMain_modRecord', thisModRecord, modhubRecord, modCollect.bindConflict, myTranslator.currentLocale)
		return
	}

	windows.detail = createSubWindow('detail', { parent : 'main', preload : 'detailWindow' })

	windows.detail.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_modRecord', thisModRecord, modhubRecord, modCollect.bindConflict, myTranslator.currentLocale)
		if ( devDebug ) { windows.detail.webContents.openDevTools() }
	})

	windows.detail.loadFile(path.join(pathRender, 'detail.html'))
	windows.detail.on('closed', () => { destroyAndFocus('detail') })

	windows.detail.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url)
		return { action : 'deny' }
	})
}

function createFindWindow() {
	if ( windows.find ) {
		windows.find.focus()
		windows.find.webContents.send('fromMain_modRecords', modList)
		return
	}

	windows.find = createSubWindow('find', { preload : 'findWindow' })

	windows.find.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_modRecords', modList)
		if ( devDebug ) { windows.find.webContents.openDevTools() }
	})

	windows.find.loadFile(path.join(pathRender, 'find.html'))
	windows.find.on('closed', () => { destroyAndFocus('find') })
}

function createDebugWindow() {
	if ( windows.debug ) {
		windows.debug.focus()
		windows.debug.webContents.send('fromMain_debugLog', log.htmlLog)
		return
	}

	windows.debug = createSubWindow('debug', { preload : 'debugWindow' })

	windows.debug.webContents.on('did-finish-load', (event) => {
		event.sender.send('fromMain_debugLog', log.htmlLog)
	})

	windows.debug.loadFile(path.join(app.getAppPath(), 'renderer', 'debug.html'))
	windows.debug.on('closed', () => { destroyAndFocus('debug') })
}
function createGameLogWindow() {
	if ( windows.gamelog ) {
		windows.gamelog.focus()
		readGameLog()
		return
	}

	windows.gamelog = createSubWindow('gamelog', { preload : 'gamelogWindow' })

	windows.gamelog.webContents.on('did-finish-load', () => {
		readGameLog()
		if ( devDebug ) { windows.gamelog.webContents.openDevTools() }
	})

	windows.gamelog.loadFile(path.join(app.getAppPath(), 'renderer', 'gamelog.html'))
	windows.gamelog.on('closed', () => { destroyAndFocus('gamelog') })
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
	windows.prefs.on('closed', () => { destroyAndFocus('prefs') })

	windows.prefs.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url)
		return { action : 'deny' }
	})
}

function createSavegameWindow(collection) {
	if ( windows.save ) {
		windows.save.focus()
		windows.save.webContents.send('fromMain_collectionName', collection, modList)
		return
	}

	windows.save = createSubWindow('save', { preload : 'savegameWindow' })

	windows.save.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_collectionName', collection, modList)
		if ( devDebug ) { windows.save.webContents.openDevTools() }
	})

	windows.save.loadFile(path.join(pathRender, 'savegame.html'))
	windows.save.on('closed', () => { destroyAndFocus('save') })
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
	windows.notes.on('closed', () => { destroyAndFocus('notes'); processModFolders() })
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
	windows.resolve.on('closed', () => { destroyAndFocus('resolve') })
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
	windows.version.on('closed', () => { destroyAndFocus('version') })
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
function loadingWindow_doCount(whichCount, amount, reset, inMB) {
	loadWindowCount[whichCount] = ( reset ) ? amount : amount + loadWindowCount[whichCount]

	if ( ! windows.load.isDestroyed() ) {
		windows.load.webContents.send(`fromMain_loading_${whichCount}`, loadWindowCount.total, inMB)
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

ipcMain.on('toMain_populateClipboard', (event, text) => { clipboard.writeText(text, 'selection') })

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
	const thisModId = modHubData.modHubList.mods[thisMod.fileDetail.shortName] || null

	if ( thisModId !== null ) {
		shell.openExternal(`https://www.farming-simulator.com/mod.php?mod_id=${thisModId}`)
	}
})

ipcMain.on('toMain_copyFavorites',  () => {
	const sourceCollections      = []
	const destinationCollections = []
	const sourceFiles            = []

	modCollect.collections.forEach((collectKey) => {
		const isFavorite = modNote.get(`${collectKey}.notes_favorite`, false)

		if ( isFavorite ) {
			sourceCollections.push(collectKey)
		} else {
			destinationCollections.push(collectKey)
		}
	})

	sourceCollections.forEach((collectKey) => {
		const thisCollection = modCollect.getModCollection(collectKey)
		thisCollection.modSet.forEach((modKey) => {
			sourceFiles.push({
				fullPath   : thisCollection.mods[modKey].fileDetail.fullPath,
				collectKey : collectKey,
				shortName  : thisCollection.mods[modKey].fileDetail.shortName,
				title      : thisCollection.mods[modKey].l10n.title,
			})
		})
	})

	if ( sourceFiles.length > 0 ) {
		createConfirmFav({
			sourceFiles  : sourceFiles,
			destinations : destinationCollections,
			sources      : sourceCollections,
		})
	}
})
ipcMain.on('toMain_deleteMods',     (event, mods) => { createConfirmWindow('delete', modCollect.modColUUIDsToRecords(mods), mods) })
ipcMain.on('toMain_moveMods',       (event, mods) => { createConfirmWindow('move', modCollect.modColUUIDsToRecords(mods), mods) })
ipcMain.on('toMain_copyMods',       (event, mods) => { createConfirmWindow('copy', modCollect.modColUUIDsToRecords(mods), mods) })
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


ipcMain.on('toMain_reorderFolderAlpha', () => {
	const newOrder = []
	const collator = new Intl.Collator()

	Object.keys(modList).forEach((collection) => {
		newOrder.push({name : modList[collection].name, collection : collection})
	})

	newOrder.sort((a, b) =>
		collator.compare(a.name, b.name) ||
		collator.compare(a.collection, b.collection)
	)

	const newModFolders    = new Set()
	const newModList       = {}
	const newModFoldersMap = {}

	newOrder.forEach((order) => {
		newModFolders.add(modFoldersMap[order.collection])
		newModList[order.collection]       = modList[order.collection]
		newModFoldersMap[order.collection] = modFoldersMap[order.collection]
	})

	modFolders    = newModFolders
	modList       = newModList
	modFoldersMap = newModFoldersMap

	mcStore.set('modFolders', Array.from(modFolders))

	windows.folder.webContents.send('fromMain_getFolders', modList)
	foldersDirty = true
})


/** Logging Operation */
ipcMain.on('toMain_log', (event, level, process, text) => { log.log[level](text, process) })
/** END: Logging Operation */

/** l10n Operation */
ipcMain.on('toMain_langList_change', (event, lang) => {
	myTranslator.currentLocale = lang

	mcStore.set('force_lang', myTranslator.currentLocale)

	Object.keys(windows).forEach((thisWindow) => {
		if ( windows[thisWindow] !== null ) {
			windows[thisWindow].webContents.send('fromMain_l10n_refresh')
		}
	})
})
ipcMain.on('toMain_langList_send',   (event) => {
	myTranslator.getLangList().then((langList) => {
		event.sender.send('fromMain_langList_return', langList, myTranslator.deferCurrentLocale())
	})
})

ipcMain.on('toMain_getText_sync', (event, text) => {
	event.returnValue = myTranslator.syncStringLookup(text)
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
				if ( text === null || text === '' ) {
					log.log.debug(`Null or empty translator string: ${l10nEntry} :: locale: ${myTranslator.currentLocale}`)
				}
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


ipcMain.on('toMain_modContextMenu', async (event, modID) => {
	const thisMod   = modIdToRecord(modID)
	const thisModId = modHubData.mods[thisMod.fileDetail.shortName] || null

	const template = [
		{ label : thisMod.fileDetail.shortName},
		{ type : 'separator' },
		{ label : myTranslator.syncStringLookup('context_mod_detail'), click : () => {
			createDetailWindow(thisMod)
		}},
		{ type : 'separator' },
		{ label : myTranslator.syncStringLookup('open_folder'), click : () => {
			const thisCollectionFolder = modFoldersMap[modID.split('--')[0]]

			if ( thisMod !== null ) {
				shell.showItemInFolder(path.join(thisCollectionFolder, path.basename(thisMod.fileDetail.fullPath)))
			}
		}}
	]
	
	if ( thisModId !== null ) {
		template.push({ label : myTranslator.syncStringLookup('open_hub'), click : () => {
			shell.openExternal(`https://www.farming-simulator.com/mod.php?mod_id=${thisModId}`)
		}})
	}

	template.push({ type : 'separator' })
	template.push({ label : myTranslator.syncStringLookup('copy_to_list'), click : () => {
		createConfirmWindow('copy', [thisMod], [modID])
	}})
	template.push({ label : myTranslator.syncStringLookup('move_to_list'), click : () => {
		createConfirmWindow('move', [thisMod], [modID])
	}})
	template.push({ label : myTranslator.syncStringLookup('remove_from_list'), click : () => {
		createConfirmWindow('delete', [thisMod], [modID])
	}})

	const menu = Menu.buildFromTemplate(template)
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})

ipcMain.on('toMain_mainContextMenu', async (event, collection) => {
	const tagLine  = modNote.get(`${collection}.notes_tagline`, null)
	const subLabel = `${modList[collection].name}${tagLine === null ? '' : ` :: ${tagLine}`}`
	const template = [
		{ label : myTranslator.syncStringLookup('context_main_title').padEnd(subLabel.length, ' '), sublabel : subLabel },
		{ type : 'separator' },
		{ label : myTranslator.syncStringLookup('list-active'), click : () => {
			parseSettings({
				newFolder  : modFoldersMap[collection],
				userName   : modNote.get(`${collection}.notes_username`, null),
				password   : modNote.get(`${collection}.notes_password`, null),
				serverName : modNote.get(`${collection}.notes_server`, null),
			})
		}},
		{ type : 'separator' },
		{ label : myTranslator.syncStringLookup('open_folder'), click : () => {
			shell.openPath(modFoldersMap[collection])
		}}
	]

	const noteItems = ['username', 'password', 'website', 'admin', 'server']
	let foundOne = false
	
	noteItems.forEach((noteItem) => {
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
	})
	
	const menu = Menu.buildFromTemplate(template)
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})


/** Debug window operation */
ipcMain.on('toMain_openGameLog',    () => { createGameLogWindow() })
ipcMain.on('toMain_openGameLogFolder', () => { shell.showItemInFolder(path.join(path.dirname(gameSettings), 'log.txt')) })
ipcMain.on('toMain_getGameLog', () => { readGameLog() })

function readGameLog() {
	if ( windows.gamelog === null ) { return }
	try {
		const gameLogContents = fs.readFileSync(path.join(path.dirname(gameSettings), 'log.txt'), {encoding : 'utf8', flag : 'r'})

		windows.gamelog.webContents.send('fromMain_gameLog', gameLogContents)
	} catch (e) {
		log.log.warning(`Could not read game log file: ${e}`, 'game-log')
	}
}
/** END: Debug window operation */

/** Debug window operation */
ipcMain.on('toMain_openDebugLog',    () => { createDebugWindow() })
ipcMain.on('toMain_openDebugFolder', () => { shell.showItemInFolder(log.pathToLog) })
ipcMain.on('toMain_getDebugLog',     (event) => { event.sender.send('fromMain_debugLog', log.htmlLog) })
/** END: Debug window operation */

/** Game launcher */
function gameLauncher() {
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
		dialog.showMessageBox(windows.main, dialogOpts)
		log.log.warning('Game path not set or invalid!', 'game-launcher')
	}
}

ipcMain.on('toMain_startFarmSim', () => { gameLauncher() })
/** END: game launcher */

/** Find window operation */
ipcMain.on('toMain_openFind', () => { createFindWindow() })

ipcMain.on('toMain_findContextMenu', async (event, thisMod) => {
	const template = [
		{ label : myTranslator.syncStringLookup('select_in_main'), sublabel : thisMod.name },
		{ type : 'separator' },
	]
	thisMod.collect.forEach((instance) => {
		template.push({
			label : `${instance.name} :: ${instance.version}`,
			click : () => {
				windows.main.focus()
				windows.main.webContents.send('fromMain_selectOnlyFilter', instance.fullId, thisMod.name)
			},
		})
	})
	
	const menu = Menu.buildFromTemplate(template)
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})
/** END : Find window operation*/

/** Preferences window operation */
ipcMain.on('toMain_getCollDesc', (event, collection) => {
	const tagLine = modNote.get(`${collection}.notes_tagline`, null)

	event.returnValue = ( tagLine !== null ) ? ` [${tagLine}]` : ''
})
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

	setTimeout(() => {
		loadingWindow_total(md5Set.size, true)
		loadingWindow_current(0, true)

		md5Set.forEach((md5) => { maCache.delete(md5); loadingWindow_current() })

		loadingWindow_hide(1500)
		event.sender.send('fromMain_l10n_refresh')
	}, 1500)
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
	const dirtyActions = [
		'notes_website',
		'notes_websiteDL',
		'notes_favorite',
		'notes_tagline',
		'notes_admin',
	]
	if ( dirtyActions.includes(id) ) { foldersDirty = true }

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
		message : `${myTranslator.syncStringLookup('download_started')} :: ${modCollect.mapCollectionToName(collection)}\n${myTranslator.syncStringLookup('download_finished')}`,
		type    : 'info',
	})

	log.log.info(`Downloading Collection : ${collection}`, 'mod-download')
	log.log.info(`Download Link : ${thisLink}`, 'mod-download')

	const dlReq = net.request(thisLink)

	dlReq.on('response', (response) => {
		log.log.info(`Got download: ${response.statusCode}`, 'mod-download')

		if ( response.statusCode < 200 || response.statusCode >= 400 ) {
			dialog.showMessageBoxSync(windows.main, {
				title   : myTranslator.syncStringLookup('download_title'),
				message : `${myTranslator.syncStringLookup('download_failed')} :: ${modList[collection].name}`,
				type    : 'error',
			})
		} else {
			loadingWindow_open('download')

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
						log.log.warning(`Download unzip failed : ${err}`, 'mod-download')
					})

					zipReadStream.on('end', () => {
						log.log.info('Unzipping complete', 'mod-download')
						zipReadStream.close()
						foldersDirty = true
						fs.unlinkSync(dlPath)
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
	dlReq.on('error', (error) => { log.log.warning(`Network error : ${error}`, 'mod-download'); loadingWindow_hide() })
	dlReq.end()
})

/** END: download operation */

/** Export operation */
ipcMain.on('toMain_exportList', (event, collection) => {
	const csvTable = []
	csvTable.push('"Mod","Title","Version","Author","ModHub","Link"')

	modList[collection].mods.forEach((mod) => {
		const modHubID    = modHubList.mods[mod.fileDetail.shortName] || null
		const modHubLink  = ( modHubID !== null ) ? `https://www.farming-simulator.com/mod.php?mod_id=${modHubID}` : ''
		const modHubYesNo = ( modHubID !== null ) ? 'yes' : 'no'
		csvTable.push(`"${mod.fileDetail.shortName}.zip","${mod.l10n.title.replaceAll('"', '\'')}","${mod.modDesc.version}","${mod.modDesc.author.replaceAll('"', '\'')}","${modHubYesNo}","${modHubLink}"`)
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

ipcMain.on('toMain_exportZip', (event, selectedMods) => {
	const filePaths = []

	modIdsToRecords(selectedMods).forEach((mod) => {
		filePaths.push([mod.fileDetail.shortName, mod.fileDetail.fullPath])
	})

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
				})

				zipArchive.on('error', (err) => {
					loadingWindow_hide()
					log.log.warning(`Could not create zip file : ${err}`, 'zip-export')
					setTimeout(() => {
						dialog.showMessageBoxSync(windows.main, {
							message : myTranslator.syncStringLookup('save_zip_failed'),
							type    : 'warning',
						})
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
				filePaths.forEach((thisFile) => {
					zipArchive.file(thisFile[1], { name : `${thisFile[0]}.zip` })
				})
				zipArchive.finalize().then(() => { loadingWindow_hide() })

			} catch (err) {
				log.log.warning(`Could not create zip file : ${err}`, 'zip-export')
				loadingWindow_hide()
				setTimeout(() => {
					dialog.showMessageBoxSync(windows.main, {
						message : myTranslator.syncStringLookup('save_zip_failed'),
						type    : 'warning',
					})
				}, 1500)
			}
		}
	}).catch((unknownError) => {
		log.log.warning(`Could not create zip file : ${unknownError}`, 'zip-export')
	})
})
/** END: Export operation */

/** Savegame window operation */
ipcMain.on('toMain_openSave',       (event, collection) => { createSavegameWindow(collection) })
ipcMain.on('toMain_selectInMain',   (event, selectList) => {
	windows.main.focus()
	windows.main.webContents.send('fromMain_selectOnly', selectList)
})
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
			currentLocale          : myTranslator.deferCurrentLocale(),
			l10n                   : {
				disable : myTranslator.syncStringLookup('override_disabled'),
				unknown : myTranslator.syncStringLookup('override_unknown'),
			},
			activeCollection       : overrideIndex,
		},
		'fromMain_modList',
		'main',
		closeLoader
	)
}

/** END: Utility & Convenience Functions */

/** Business Functions */
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

function parseSettings({disable = null, newFolder = null, userName = null, serverName = null, password = null } = {}) {
	if ( ! gameSettings.endsWith('.xml') ) {
		log.log.danger(`Game settings is not an xml file ${gameSettings}, fixing`, 'game-settings')
		gameSettings = path.join(pathBestGuess, 'gameSettings.xml')
		mcStore.set('game_settings', gameSettings)
	}

	if ( gameLogFile === null ) {
		gameLogFile = fs.watch(path.join(path.dirname(gameSettings), 'log.txt'), (event, filename) => {
			if ( filename ) {
				if ( gameLogFileBounce ) return
				gameLogFileBounce = setTimeout(() => {
					gameLogFileBounce = false
					readGameLog()
				}, 1000)
			}
		})
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
			username : gameSettingsXML.gameSettings?.onlinePresenceName || '',
			password : gameSettingsXML.gameSettings?.joinGame?.['@_password'] || '',
			server   : gameSettingsXML.gameSettings?.joinGame?.['@_serverName'] || '',
		}

	} catch (e) {
		log.log.danger(`Could not read game settings ${e}`, 'game-settings')
	}

	if ( overrideActive === 'false' || overrideActive === false ) {
		overrideIndex = '0'
	} else {
		overrideIndex = modCollect.mapFolderToCollection(overrideFolder) || '999'
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

		if ( password !== null && typeof gameSettingsXML.gameSettings?.joinGame?.['@_password'] !== 'undefined' ) {
			gameSettingsXML.gameSettings.joinGame['@_password'] = password
		}

		if ( serverName !== null && typeof gameSettingsXML.gameSettings?.joinGame?.['@_serverName'] !== 'undefined') {
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
			path.join(modCollect.mapCollectionToFolder(file[1]), thisFileName), // source
			path.join(modCollect.mapCollectionToFolder(file[0]), thisFileName), // dest
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
}

let loadingWait = null
async function processModFolders() {
	if ( !foldersDirty ) { loadingWindow_hide(); return }

	loadingWindow_open('mods', 'main')
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

	// Cleaner for no-longer existing folders, count contents of others
	modFolders.forEach((folder) => {
		if ( ! fs.existsSync(folder) ) { modFolders.delete(folder) }
	})

	mcStore.set('modFolders', Array.from(modFolders))

	modFolders.forEach((folder) => {
		const thisCollectionStats = modCollect.addCollection(folder)

		loadingWindow_total(thisCollectionStats.fileCount)
	})

	modCollect.processMods()

	modCollect.processPromise.then(() => {
		parseSettings()
		parseGameXML()
		refreshClientModList()

		if ( mcStore.get('rel_notes') !== app.getVersion() ) {
			mcStore.set('rel_notes', app.getVersion() )
			log.log.info('New version detected, show changelog')
			createChangeLogWindow()
		}
	})
}

function loadSaveFile(filename) {
	try {
		const rawData  = fs.readFileSync(path.join(app.getPath('userData'), filename))
		const jsonData = JSON.parse(rawData)

		switch (filename) {
			case 'modHubData.json' :
				modCollect.modHubList = jsonData
				break
			case 'modHubVersion.json' :
				modCollect.modHubVersion = jsonData
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
			{ label : myTranslator.syncStringLookup('launch_fs22'), click : () => { gameLauncher() } },
			{ label : myTranslator.syncStringLookup('tray_quit'), click : () => { windows.main.close() } },
		]
		const contextMenu = Menu.buildFromTemplate(template)
		tray.setContextMenu(contextMenu)
		tray.setToolTip('FSG Mod Assist')
		tray.on('click', () => { windows.main.show() })

		dlSaveFile(hubURL, 'modHubData.json')
		dlSaveFile(hubVerURL, 'modHubVersion.json')

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
