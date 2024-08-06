/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */
// MARK: WINDOW LIB
/**
 *  Window Control Library and Config
 * @module modAssist_window_lib
 */

const { screen, app, nativeTheme, dialog, shell, BrowserWindow, nativeImage, Menu } = require('electron')
const path      = require('node:path')
const { funcLib }  = require('./modAssist_func_lib.js')
const { serveIPC } = require('./modUtilLib.js')


module.exports.windowLib = class {
	//#region DevTools popup definition
	#dev = new Set([
		'basegame',
		// 'change',
		'compare',
		'debug',
		'detail',
		'find',
		'gamelog',
		// 'import',
		'importjson',
		// 'load',
		'main',
		// 'mini',
		'notes',
		'resolve',
		'save',
		'save_manage',
		'save_track',
		'setup',
		// 'splash',
		'version',
	])
	//#endregion

	//#region Named Windows
	/** @type {Object.<string, subWindow_def>} */
	winDefs = {
		basegame : { //done
			callback        : () => { return },
			handleURLinWin  : true,
			HTMLFile        : 'basegame.html',
			subWindowArgs   : { preload : 'sharedWindow' },
			winName         : 'basegame',
		},
		change : { //done
			callback        : () => { return },
			handleURLinWin  : true,
			HTMLFile        : 'a_changelog.html',
			subWindowArgs   : { parent : 'main', fixed : true, preload : 'sharedWindow' },
			winName         : 'change',
		},
		compare : { //done
			callback        : () => { return },
			handleURLinWin  : true,
			HTMLFile        : 'compare.html',
			subWindowArgs   : { preload : 'sharedWindow' },
			winName         : 'compare',
		},
		debug : { //done
			callback        : () => { return },
			HTMLFile        : 'debug.html',
			subWindowArgs   : { preload : 'sharedWindow' },
			winName         : 'debug',
		},
		detail : { //done
			callback        : () => { return },
			handleURLinWin  : true,
			HTMLFile        : 'detail.html',
			subWindowArgs   : { preload : 'sharedWindow' },
			winName         : 'detail',
		},
		find : { //done
			callback        : () => { return },
			HTMLFile        : 'find.html',
			refocusCallback : true,
			subWindowArgs   : { preload : 'sharedWindow' },
			winName         : 'find',
		},
		gamelog : { //done
			callback        : () => { return },
			HTMLFile        : 'gamelog.html',
			subWindowArgs   : { preload : 'sharedWindow' },
			winName         : 'gamelog',
		},
		importjson : {
			callback        : (windowArgs) => { this.sendModList(windowArgs, 'fromMain_importData', 'importjson', false ) },
			handleURLinWin  : true,
			HTMLFile        : 'importjson.html',
			subWindowArgs   : { preload : 'importjsonWindow' },
			winName         : 'importjson',
		},
		mini : {
			callback        : () => { serveIPC.refFunc.refreshClientModList() },
			extraCloseFunc  : () => { serveIPC.refFunc.refreshClientModList() },
			HTMLFile        : 'mini.html',
			refocusCallback : true,
			subWindowArgs   : { fixed : true,  noChrome : true, preload : 'miniWindow', sizeable : false },
			winName         : 'mini',
		},
		notes : { //done
			callback        : (windowArgs) => { this.sendToValidWindow('notes', 'settings:collection:id', windowArgs.collectKey) },
			extraCloseFunc  : () => { serveIPC.refFunc.refreshClientModList() },
			handleURLinWin  : true,
			HTMLFile        : 'notes.html',
			refocusCallback : true,
			subWindowArgs   : { preload : 'sharedWindow' },
			winName         : 'notes',
		},
		resolve : { // done
			callback        : (windowArgs) => { this.sendToValidWindow('resolve', 'resolve:shortname', windowArgs.shortName) },
			extraCloseFunc  : () => { serveIPC.refFunc.processModFolders() },
			HTMLFile        : 'resolve.html',
			refocusCallback : true,
			subWindowArgs   : { parent : 'version', preload : 'sharedWindow', fixed : true },
			winName         : 'resolve',
		},
		save : {
			callback        : (windowArgs) => { this.sendModList(windowArgs, 'fromMain_collectionName', 'save', false ) },
			extraCloseFunc  : () => {
				serveIPC.cacheGameSave = null
				serveIPC.refFunc.refreshClientModList()
			},
			HTMLFile        : 'savegame.html',
			refocusCallback : true,
			subWindowArgs   : { preload : 'savegameWindow' },
			winName         : 'save',
		},
		save_manage : {
			callback        : (windowArgs) => { this.sendModList(windowArgs, 'fromMain_saveInfo', 'save_manage', false ) },
			HTMLFile        : 'savemanage.html',
			refocusCallback : true,
			subWindowArgs   : { preload : 'savemanageWindow' },
			winName         : 'save_manage',
		},
		save_track : {
			callback        : () => { return },
			HTMLFile        : 'savetrack.html',
			subWindowArgs   : { preload : 'savetrackWindow' },
			winName         : 'save_track',
		},
		setup : {
			callback        : () => { return },
			extraCloseFunc  : () => { serveIPC.refFunc.processModFolders() },
			handleURLinWin  : true,
			HTMLFile        : 'setup.html',
			subWindowArgs   : { preload : 'setupWindow' },
			winName         : 'setup',
		},
		version : { // done
			callback        : () => { return },
			HTMLFile        : 'version.html',
			refocusCallback : true,
			subWindowArgs   : { preload : 'sharedWindow' },
			winName         : 'version',
		},
	}
	//#endregion

	contextIcons = {}

	devTools = {}

	#cssKeys = {}

	// MARK: active windows
	win = {
		basegame    : null,
		change      : null,
		compare     : null,
		confirm     : null,
		debug       : null,
		detail      : null,
		find        : null,
		gamelog     : null,
		import      : null,
		importjson  : null,
		load        : null,
		main        : null,
		notes       : null,
		resolve     : null,
		save        : null,
		save_manage : null,
		save_track  : null,
		setup       : null,
		splash      : null,
		version     : null,
	}

	multiWin = []

	tray = null

	#themeColors = {
		'dark'  : { background : '#2b3035', font : '#6d757a' },
		'light' : { background : '#f8f9fa', font : '#7b8fa0' },
	}
	#themeCurrentColor = 'dark'

	#log      = serveIPC.log
	
	l10n      = serveIPC.l10n

	#debug    = !app.isPackaged
	#settings = null
	loading   = null
	#path     = {
		icon    : path.join(app.getAppPath(), 'build', 'icon.ico'),
		preload : path.join(app.getAppPath(), 'renderer', 'preload'),
		render  : path.join(app.getAppPath(), 'renderer'),
	}

	/**
	 * create new windowing library
	 * MARK: constructor
	 */
	constructor() {
		this.loading  = new loadingWindow(this)
		serveIPC.loadWindow = this.loading
		serveIPC.loadJSON   = new loadingWindow(this, 'importjson')

		this.populateContextIcons()

		nativeTheme.on('updated', () => {
			this.changeTheme()
			this.populateContextIcons()
			this.trayContextMenu()

			if ( this.#settings.get('color_theme') === 'system' ) {
				this.themeUpdater()
			}
		})
	}

	/**
	 * Get native image icon for context menus
	 * MARK: getNativeImage
	 * @param {string} icon Icon name (file)
	 * @param {boolean} noDark Disable dark mode
	 * @returns {object} nativeImage instance
	 */
	#getNativeImage(icon, noDark = false) {
		const basePath = !app.isPackaged
			? path.join(app.getAppPath(), 'renderer', 'img', 'context-icons')
			: path.join(process.resourcesPath, 'app.asar', 'renderer', 'img', 'context-icons')

		const isDark = noDark || nativeTheme.shouldUseDarkColors ? '' : 'blk-'

		return new nativeImage.createFromPath(path.join(basePath, `${isDark}${icon}.png`))
	}

	/**
	 * populate nativeImage context icons for later use
	 * MARK: populateIcons
	 */
	populateContextIcons() {
		this.contextIcons.active          = this.#getNativeImage('ui-icon-active')
		this.contextIcons.collection      = this.#getNativeImage('ui-icon-collection')
		this.contextIcons.copy            = this.#getNativeImage('ui-icon-copy')
		this.contextIcons.cut             = this.#getNativeImage('ui-icon-cut')
		this.contextIcons.depend          = this.#getNativeImage('ui-icon-depend')
		this.contextIcons.externalSite    = this.#getNativeImage('ui-icon-external-site')
		this.contextIcons.externalSiteSet = this.#getNativeImage('ui-icon-external-site-add')
		this.contextIcons.fileCopy        = this.#getNativeImage('ui-icon-file-copy')
		this.contextIcons.fileDelete      = this.#getNativeImage('ui-icon-file-delete')
		this.contextIcons.fileMove        = this.#getNativeImage('ui-icon-file-move')
		this.contextIcons.fsgMA           = this.#getNativeImage('ui-icon-fsgma', true)
		this.contextIcons.log             = this.#getNativeImage('ui-icon-log')
		this.contextIcons.mini            = this.#getNativeImage('ui-icon-mini')
		this.contextIcons.mod             = this.#getNativeImage('ui-icon-mod')
		this.contextIcons.modDetail       = this.#getNativeImage('ui-icon-mod-detail')
		this.contextIcons.openExplorer    = this.#getNativeImage('ui-icon-open-explorer')
		this.contextIcons.openZip         = this.#getNativeImage('ui-icon-file-zip')
		this.contextIcons.paste           = this.#getNativeImage('ui-icon-paste')
		this.contextIcons.quit            = this.#getNativeImage('ui-icon-quit')
		this.contextIcons.required        = this.#getNativeImage('ui-icon-required')
		this.contextIcons.save            = this.#getNativeImage('ui-icon-save')
		this.contextIcons.sendCheck       = this.#getNativeImage('ui-icon-send-check')
		this.contextIcons.thumbDown       = this.#getNativeImage('ui-icon-thumb-down')
		this.contextIcons.thumbUp         = this.#getNativeImage('ui-icon-thumb-up')
		this.contextIcons.launch          = this.#getNativeImage(`ui-icon-launch-${serveIPC.storeSet?.get?.('game_version', 22) || 22}`, true)
	}

	/**
	 * Run the tray icon context menu
	 * MARK: trayContext
	 * @returns null
	 */
	trayContextMenu() {
		if ( !this.tray || this.tray.isDestroyed() ) { return }
		this.tray.setContextMenu(Menu.buildFromTemplate([
			funcLib.menu.iconL10n('app_name', () => { this.win.main.show() }, 'fsgMA'),
			funcLib.menu.sep,
			funcLib.menu.iconL10n('launch_game', () => { serveIPC.refFunc.gameLauncher() }, 'launch'),
			funcLib.menu.iconL10n('mini_mode_button__title', () => { serveIPC.refFunc.toggleMiniWindow() }, 'mini'),
			funcLib.menu.iconL10n('tray_quit', () => { this.win.main.close() }, 'quit'),
		]))
	}

	// #region sanity & state
	/**
	 * Check if a window name exist, the window exists, and it's not destroyed
	 * @param {string} name window
	 * @returns {boolean}
	 */
	isValid(name) {
		return ( Object.hasOwn(this.win, name) && this.win[name] !== null && !this.win[name].isDestroyed() )
	}

	/**
	 * Check if a window is always on top
	 * @param {string} name window
	 * @returns {boolean}
	 */
	isAlwaysOnTop(name) {
		return this.isValid(name) && this.win[name].isAlwaysOnTop()
	}

	/**
	 * Toggle window always on top status (or force true)
	 * @param {string} name window
	 * @param {boolean} force force on top
	 */
	toggleAlwaysOnTop(name, force = false) {
		if ( this.isValid(name) ) {
			this.win[name].setAlwaysOnTop(force ? true : !this.win[name].isAlwaysOnTop(), 'screen-saver')
		}
	}

	/**
	 * Check if window is visible
	 * @param {string} name window
	 * @returns {boolean}
	 */
	isVisible(name) {
		return this.win[name] !== null && this.win[name]?.isVisible()
	}

	/**
	 * Safely close a window
	 * @param {string} name window
	 */
	safeClose(name) {
		if ( this.isValid(name) && this.isVisible(name) ) {
			this.win[name].close()
		}
	}

	/**
	 * Safely close all sub windows
	 */
	closeAllSubWin() {
		for ( const thisWin in this.win ) {
			if ( thisWin !== 'main' && this.isValid(thisWin) ) {
				this.win[thisWin].destroy()
			}
		}
	}

	/**
	 * Force a window to be focused
	 * @param {string} name window
	 */
	forceFocus (name) {
		if ( this.isValid(name) ) {
			this.win[name].show()
			this.win[name].focus()
		}
	}

	/**
	 * Raise or create the named window, run the callback on completion
	 * @param {string} name window
	 * @param {function} callback 
	 */
	raiseOrOpen(name, callback) {
		let timeoutAmount = 0
		if ( !this.isValid(name) ) {
			timeoutAmount = 500
			this.createNamedWindow(name)
		} else if ( !this.isVisible(name) ) {
			this.forceFocus(name)
		}
		setTimeout(() => { callback() }, timeoutAmount)
	}

	/**
	 * Destroy named window, focus mini or main window after
	 * @param {string} name window
	 */
	destroyAndFocus (name) {
		this.win[name] = null
		if ( this.isValid('main') ) {
			if ( !this.isVisible('main') && this.isValid('mini')  && this.isVisible('mini') ) {
				this.win.mini.focus()
			} else {
				this.win.main.focus()
			}
		}
	}

	destroyAndFocusMulti () {
		this.multiWin = this.multiWin.filter((x) => !x.isDestroyed())
		if ( this.isValid('main') ) {
			if ( !this.isVisible('main') && this.isValid('mini')  && this.isVisible('mini') ) {
				this.win.mini.focus()
			} else {
				this.win.main.focus()
			}
		}
	}

	/**
	 * Send a command to a window (unsafe, no checks)
	 * @param {string} name window
	 * @param {string} command 
	 * @param  {...any} args 
	 */
	sendToWindow(name, command, ...args) {
		this.win[name].webContents.send(command, ...args)
	}

	/**
	 * Send a command to a window if it is valid
	 * @param {string} name window
	 * @param {string} command 
	 * @param  {...any} args 
	 */
	sendToValidWindow(name, command, ...args) {
		if ( this.isValid(name) ) { this.sendToWindow(name, command, ...args) }
	}

	/**
	 * Send a command to a window if it is valid, and focus it
	 * @param {string} name window
	 * @param {string} command 
	 * @param  {...any} args 
	 */
	sendAndFocusValid(name, command, ...args) {
		if ( this.isValid(name) ) {
			this.win[name].focus()
			this.sendToWindow(name, command, ...args)
		}
	}
	// #endregion

	/**
	 * Send the mod list to a window
	 * MARK: sendModList [dep]
	 * @param {Object} extraArgs extra data
	 * @param {string} eventName command
	 * @param {string} toWindow window
	 * @param {boolean} closeLoader close loader if open
	 */
	sendModList(extraArgs = {}, eventName = 'fromMain_modList', toWindow = 'main', closeLoader = true) {
		serveIPC.modCollect.toRenderer(extraArgs).then((modCollection) => {
			this.sendToValidWindow(toWindow, eventName, modCollection)
	
			if ( toWindow === 'main' && this.isVisible('version') ) {
				this.sendToValidWindow('version', eventName, modCollection)
			}
			if ( toWindow === 'main' && this.isValid('mini') ) {
				this.sendToValidWindow('mini', eventName, modCollection)
			}
			if ( closeLoader && !serveIPC.isProcessing ) { this.loading.hide(1500) }
		})
	}

	/**
	 * load window settings, theme, tray menu
	 */
	loadSettings() {
		this.#settings = serveIPC.storeSet
		this.changeTheme()
		this.populateContextIcons()
		this.trayContextMenu()
	}

	// #region color theme
	/** @type {string} */
	set themeCurrentColor(name) { this.changeTheme(name) }
	get themeCurrentColor()     { return this.#themeCurrentColor }
	
	/**
	 * Change the current theme
	 * @param {string} newTheme 
	 */
	changeTheme(newTheme = null ) {
		if (newTheme !== null) {
			this.#settings.set('color_theme', newTheme)
		}

		const currentSetting = this.#settings.get('color_theme')

		if ( nativeTheme.themeSource !== currentSetting ) {
			nativeTheme.themeSource = currentSetting
		}

		this.#themeCurrentColor = ( currentSetting === 'system' ) ?
			(nativeTheme.shouldUseDarkColors ? 'dark' : 'light') :
			currentSetting

		if (newTheme !== null) {
			this.populateContextIcons()
			this.trayContextMenu()
			this.themeUpdater()
		}
	}

	/**
	 * update window theme
	 */
	themeUpdater() {
		for ( const thisWinKey in this.win ) {
			if ( this.isVisible(thisWinKey) ) {
				this.sendToWindow(thisWinKey, 'fromMain_themeSetting', this.#themeCurrentColor)
				this.win[thisWinKey].setTitleBarOverlay({
					color       : this.#themeColors[this.#themeCurrentColor].background,
					symbolColor : this.#themeColors[this.#themeCurrentColor].font,
				})
			}
		}
	}
	// #endregion

	// #region size & position
	/**
	 * Safely center a window
	 * @param {string} name window
	 * @returns {Object<number, number>} x,y
	 */
	getRealCenter (name) {
		const realCenter  = { x : null, y : null }
		const winSettings = this.#settings.get(`wins.${name}`)
	
		if ( name !== 'main' && this.win.main !== null ) {
			const winMainBounds = this.win.main.getBounds()
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

	/**
	 * reset all window positions
	 */
	resetPositions() {
		this.#settings.reset('wins')
		const mainBounds = this.#settings.get('wins.main')
		this.win.main.unmaximize()
		try {
			this.win.main.setBounds({width : Math.floor(mainBounds.w), height : Math.floor(mainBounds.h)})
		} catch (err) {
			this.#log.debug('reset-windows', 'Window reset failed', err)
		}
		this.win.main.center()
	}

	/**
	 * Correct window placement x,y to be on a existing monitor
	 * @param {Object} winSettings 
	 * @returns {Object}
	 */
	checkValidPlacement(winSettings) {
		const newWinSettings = winSettings

		if ( winSettings.x !== -1 || winSettings.y !== -1 ) {
			const potentialDisplays = screen.getAllDisplays()
			let maxX = 0
			let maxY = 0
			for ( const thisDisplay of potentialDisplays ) {
				maxX = Math.max(thisDisplay.workArea.x + thisDisplay.workArea.width, maxX, maxY)
				maxY = Math.max(thisDisplay.workArea.y + thisDisplay.workArea.height, maxY)
			}

			if ( winSettings.x > maxX || winSettings.y > maxY ) {
				newWinSettings.x = -1
				newWinSettings.y = -1
			}
		}
		return newWinSettings
	}

	/**
	 * Handle CTRL+A, CTRL+SHIFT+A, CTRL+I, and CTRL+ALT+D
	 * @param {object} thisWindow Window object
	 */
	#handleSelectKeys(thisWindow) {
		thisWindow.webContents.on('before-input-event', (event, input) => {
			if (input.control && !input.shift && input.code === 'KeyA') {
				thisWindow.webContents.send('select:all')
				event.preventDefault()
			}
			if (input.control && input.shift && input.code === 'KeyA') {
				thisWindow.webContents.send('select:none')
				event.preventDefault()
			}
			if (input.control && input.code === 'KeyI') {
				thisWindow.webContents.send('select:invert')
				event.preventDefault()
			}
			if ( input.alt && input.control && input.code === 'KeyD' ) {
				this.createNamedWindow('debug')
				event.preventDefault()
			}
		})
	}

	/**
	 * Set up handlers for moving and resizing (to save)
	 * @param {object} thisWindow window object
	 * @param {string} winName window key
	 */
	#handleMoveResize (thisWindow, winName) {
		thisWindow.on('moved', () => {
			const newRect = thisWindow.getBounds()
			this.#settings.set(`wins.${winName}.x`, newRect.x)
			this.#settings.set(`wins.${winName}.y`, newRect.y)
		})
		thisWindow.on('resized', () => {
			const newRect = thisWindow.getBounds()
			this.#settings.set(`wins.${winName}.w`, newRect.width)
			this.#settings.set(`wins.${winName}.h`, newRect.height)
		})
		thisWindow.on('maximize',   () => { this.#settings.set(`wins.${winName}.m`, true) })
		thisWindow.on('unmaximize', () => { this.#settings.set(`wins.${winName}.m`, false) })

		thisWindow.on('focus', () => { thisWindow.webContents.send('fromMain_clearTooltips') })
	}
	// #endregion

	/**
	 * Refresh a single window or all windows with new a new language code
	 * MARK: refresh i18n
	 * @param {string} newLocale lang code
	 * @param {?string} name window
	 */
	// FIXME: update
	refreshL10n(newLocale, name = null) {
		if ( name !== null ) {
			this.sendToValidWindow(name, 'fromMain_l10n_refresh', newLocale)
		} else {
			for ( const thisWinKey in this.win ) {
				this.sendToValidWindow(thisWinKey, 'fromMain_l10n_refresh', newLocale)
			}
		}
	}

	/**
	 * change font size
	 * MARK: refresh font size
	 */
	// FIXME: update
	fontUpdater() {
		for ( const thisWinKey in this.win ) {
			if ( this.isVisible(thisWinKey) && thisWinKey !== 'mini' ) {
				const removeKey   = this.#cssKeys[thisWinKey] ?? null

				if ( removeKey !== null ) {
					this.win[thisWinKey].webContents.removeInsertedCSS(removeKey)
				}

				const newFontSize = this.#settings.get('font_size')

				this.win[thisWinKey].webContents.insertCSS(
					`:root { --bs-root-font-size: ${newFontSize}px !important; }`, { cssOrigin : 'user'}
				).then((key) => { this.#cssKeys[thisWinKey] = key})
			}
		}
	}

	// MARK: cNamedMulti
	createNamedMulti(winName, windowArgs, extraCallback = null) {
		const subWinDef   = this.winDefs[winName]
		const thisWinName = subWinDef.winName
	
		const thisWindow = this.createSubWindow(thisWinName, subWinDef.subWindowArgs)

		this.multiWin.push(thisWindow)

		thisWindow.webContents.on('did-finish-load', async () => {
			subWinDef.callback(windowArgs)
			if ( typeof extraCallback === 'function' ) { extraCallback() }
	
			if ( this.#debug && this.#dev.has(thisWinName) ) {
				thisWindow.webContents.openDevTools()
			}
		})
	
		const HTMLFileFull = path.join(this.#path.render, subWinDef.HTMLFile)

		if ( typeof windowArgs.queryString === 'undefined' ) {
			thisWindow.loadFile(HTMLFileFull)
		} else {
			thisWindow.loadURL(`file://${HTMLFileFull}?${windowArgs.queryString}`)
		}
	
		thisWindow.on('closed', () => {
			if ( typeof subWinDef.extraCloseFunc === 'function' ) {
				subWinDef.extraCloseFunc()
			}
			this.destroyAndFocusMulti()
		})
	
		if ( subWinDef.handleURLinWin ) {
			thisWindow.webContents.setWindowOpenHandler(({ url }) => {
				shell.openExternal(url)
				return { action : 'deny' }
			})
		}
	}

	/**
	 * Create a named window
	 * MARK: cNamed
	 * @param {string} winName window
	 * @param {Object} windowArgs arguments for window callback
	 * @param {?function} extraCallback additional callback
	 */
	createNamedWindow(winName, windowArgs, extraCallback = null) {
		const subWinDef   = this.winDefs[winName]
		const thisWinName = subWinDef.winName
	
		if ( this.isValid(thisWinName) ) {
			if ( this.win[thisWinName].isMinimized() ) { this.win[thisWinName].restore() }
			this.win[thisWinName].focus()
			if ( subWinDef.refocusCallback ) {
				subWinDef.callback(windowArgs)
				if ( typeof extraCallback === 'function' ) { extraCallback() }
			}
			return
		}

		this.win[thisWinName] = this.createSubWindow(thisWinName, subWinDef.subWindowArgs)

		this.win[thisWinName].webContents.on('did-finish-load', async () => {
			// FIXME: some of this is un-needed
			this.sendToWindow(thisWinName, 'fromMain_themeSetting', this.#themeCurrentColor)
			subWinDef.callback(windowArgs)

			if ( typeof extraCallback === 'function' ) { extraCallback() }
	
			if ( this.#debug && this.#dev.has(thisWinName) && ( !Object.hasOwn(this.devTools, thisWinName) || this.devTools[thisWinName] === null ) ) {
				this.devTools[thisWinName] = this.createSubWindow('devtools', {
					show           : true,
					useCustomTitle : false,
				})
				this.win[thisWinName].webContents.setDevToolsWebContents(this.devTools[thisWinName].webContents)
				this.win[thisWinName].webContents.openDevTools({
					activate : false,
					mode     : 'detach',
				})
				this.devTools[thisWinName].minimize()

				setTimeout(() => {
					if ( this.isValid(thisWinName) ) {
						this.devTools[thisWinName].setTitle(`DevTools - ${thisWinName} - ${subWinDef.HTMLFile}`)
					}
				}, 1500)
			}
		})
	
		this.win[thisWinName].loadFile(path.join(this.#path.render, subWinDef.HTMLFile))
	
		this.win[thisWinName].on('closed', () => {
			this.destroyAndFocus(thisWinName)
			if ( typeof subWinDef.extraCloseFunc === 'function' ) {
				subWinDef.extraCloseFunc()
			}
			if ( this.#debug && this.#dev.has(thisWinName) && this.devTools[thisWinName] !== null && !this.devTools[thisWinName].isDestroyed() ) {
				this.devTools[thisWinName].close()
				this.devTools[thisWinName] = null
			}
			
		})
	
		if ( subWinDef.handleURLinWin ) {
			this.win[thisWinName].webContents.setWindowOpenHandler(({ url }) => {
				shell.openExternal(url)
				return { action : 'deny' }
			})
		}
	}

	/**
	 * Create a sub window
	 * MARK: cSubWindow
	 * @param {string} winName window
	 * @param {subWindow_args} options window arguments
	 * @returns {Electron.BrowserWindow}
	 */
	/* eslint-disable-next-line complexity */
	createSubWindow(winName, { sizeable = true, noChrome = false, useCustomTitle = true, skipTaskbar = false, noSelect = true, show = true, parent = null, title = null, fixed = false, frame = true, move = true, preload = null, fixedOnTop = true} = {}) {
		const realCenter  = this.getRealCenter(winName)
		const winSettings = this.checkValidPlacement(this.#settings.get(`wins.${winName}`))
		const winTitle = ( title === null ) ? this.l10n.syncStringLookup('app_name') : title
		const thisWindow = new BrowserWindow({
			alwaysOnTop     : fixedOnTop && fixed,
			autoHideMenuBar : true,
			frame           : frame,
			fullscreenable  : !fixed,
			height          : winSettings.h,
			icon            : this.#path.icon,
			maximizable     : !fixed,
			minimizable     : !fixed,
			movable         : move,
			parent          : ( parent === null || this.win[parent] === null ) ? null : this.win[parent],
			resizable       : sizeable,
			show            : show,
			skipTaskbar     : skipTaskbar,
			title           : winTitle,
			width           : winSettings.w,
			x               : winSettings.x > -1 ? Math.floor(winSettings.x) : realCenter.x,
			y               : winSettings.y > -1 ? Math.floor(winSettings.y) : realCenter.y,
		
			// titleBarOverlay : false,
			
			titleBarOverlay : noChrome ? false : {
				color       : this.#themeColors[this.#themeCurrentColor].background,
				symbolColor : this.#themeColors[this.#themeCurrentColor].font,
				height      : 25,
			},
			titleBarStyle   : useCustomTitle ? 'hidden' : 'default',
		
			webPreferences  : {
				contextIsolation : true,
				nodeIntegration  : false,
				preload          : (preload === null ) ? null : path.join(this.#path.preload, `preload-${preload}.js`),
				spellcheck       : false,
			},
		})
	
		if ( noSelect ) { this.#handleSelectKeys(thisWindow) }

		if ( winName === 'mini' ) {
			thisWindow.webContents.on('before-input-event', (event, input) => {
				if ( input.control && input.code === 'Space' ) {
					serveIPC.refFunc.gameLauncher()
					event.preventDefault()
				}
			})
		}

		if ( winName !== 'splash' ) { this.#handleMoveResize(thisWindow, winName) }
	
		if ( !this.#debug )   { thisWindow.removeMenu() }
		if ( winSettings.m )  { thisWindow.maximize() }
		return thisWindow
	}

	/**
	 * Create main window
	 * MARK: cMainWindow
	 * @param {function} openCallback 
	 */
	createMainWindow (openCallback) {
		const doSplashScreen = true

		this.win.main = this.createSubWindow('main', { noSelect : false, show : !doSplashScreen, preload : 'mainWindow' })
		
		this.win.main.on('closed', () => {
			this.win.main = null
			app.quit()
		})
	
		if ( doSplashScreen ) {
			this.win.splash = this.createSubWindow('splash', { center : true, fixed : true, frame : false, move : false, useCustomTitle : false })
			this.win.splash.loadURL(`file://${path.join(this.#path.render, 'splash.html')}?version=${app.getVersion()}`)
	
			this.win.splash.on('closed', () => { this.win.splash = null })
		}
	
		this.win.main.loadFile(path.join(this.#path.render, 'main.html'))
	
		this.win.main.webContents.session.setPermissionCheckHandler((_, permission) => {
			if (permission === 'hid') { return true }
			return false
		})
	
		this.win.main.webContents.session.on('select-hid-device', (event, details, callback) => {
			event.preventDefault()
			const selectedDevice = details.deviceList.find((device) => {
				return device.vendorId === 0x340d && device.productId === 0x1710
			})
			callback(selectedDevice?.deviceId)
		})
	
		this.win.main.webContents.on('did-finish-load', () => {
			if ( doSplashScreen ) {
				setTimeout(() => {
					this.win.main.show()
					this.safeClose('splash')
					this.destroyAndFocus('splash')
				}, 2000)
			}

			const currentFontSize = this.#settings.get('font_size')

			this.win.main.webContents.insertCSS(
				`:root { --bs-root-font-size: ${currentFontSize}px !important; }`, { cssOrigin : 'user'}
			).then((key) => { this.#cssKeys.main = key})

			const showCount = setInterval(() => {
				if ( this.isVisible('main') ) {
					clearInterval(showCount)
					this.sendToWindow('main', 'fromMain_themeSetting', this.#themeCurrentColor)
					openCallback()
					if ( this.#debug && ( !Object.hasOwn(this.devTools, 'main') || this.devTools.main === null ) ) {
						this.devTools.main = this.createSubWindow('devtools', {
							show           : true,
							useCustomTitle : false,
						})
						this.win.main.webContents.setDevToolsWebContents(this.devTools.main.webContents)
						this.win.main.webContents.openDevTools({
							activate : false,
							mode     : 'detach',
						})
						this.devTools.main.minimize()

						setTimeout(() => {
							this.devTools.main.setTitle('DevTools - main - main.html')
						}, 1500)
					}
				}
			}, 250)
		})
	
		this.win.main.webContents.on('before-input-event', (event, input) => {
			if (input.control && input.code === 'KeyA') {
				this.win.main.webContents.send('fromMain_selectAllOpen')
				event.preventDefault()
			}
			if (input.control && input.shift && input.code === 'KeyA' ) {
				this.win.main.webContents.send('fromMain_selectNoneOpen')
				event.preventDefault()
			}
			if (input.control && input.code === 'KeyI') {
				this.win.main.webContents.send('fromMain_selectInvertOpen')
				event.preventDefault()
			}
			if ( input.alt && input.control && input.code === 'KeyD' ) {
				this.createNamedWindow('debug')
				event.preventDefault()
			}
			if ( input.code === 'F3' ) {
				this.createNamedWindow('find')
				event.preventDefault()
			}
			if ( input.control && input.code === 'Space' ) {
				serveIPC.refFunc.gameLauncher()
				event.preventDefault()
			}
		})
		
		this.win.main.webContents.setWindowOpenHandler(({ url }) => {
			shell.openExternal(url)
			return { action : 'deny' }
		})
	}

	/**
	 * send main window to tray icon
	 * MARK: sendToTray
	 */
	sendToTray () {
		if ( this.tray ) {
			if ( serveIPC.isFirstMinimize ) {
				this.tray.displayBalloon({
					icon    : serveIPC.icon.tray,
					title   : this.l10n.syncStringLookup('minimize_message_title'),
					content : this.l10n.syncStringLookup('minimize_message'),
				})
	
				setTimeout(() => {
					if ( this.tray && !this.tray.isDestroyed() ) { this.tray.removeBalloon() }
				}, 5000)
			}
			
			serveIPC.isFirstMinimize = false
			this.win.main.hide()
		}
	}

	// MARK: reset win URL
	setWindowURL(page, query = null) {
		if ( ! this.isValid(page) ) { return }
		const thisFile = this.winDefs[page].HTMLFile
		const thisQuery = query === null ? '' : `?${new URLSearchParams(query).toString()}`

		this.win[page].loadURL(`file://${path.join(this.#path.render, thisFile)}${thisQuery}`)
	}

	/**
	 * Show a dialog box (sync)
	 * MARK: doDialogBox
	 * @param {string} attachTo window to attach
	 * @param {Object} options options
	 * @param {string} options.type type of dialog
	 * @param {?string} options.message message of dialog
	 * @param {?string} options.messageL10n l10n key of dialog message
	 * @param {?string} options.title title of dialog
	 * @param {?string} options.titleL10n l10n key of title
	 */
	doDialogBox(attachTo, {type = 'info', message = null, messageL10n = null, title = null, titleL10n = null }) {
		const attachWin   = ( attachTo === null ) ? null : this.win[attachTo]
		const thisTitle   = ( title !== null ) ? title : this.l10n.syncStringLookup(( titleL10n === null ) ? 'app_name' : titleL10n)
		const thisMessage = ( message !== null ) ? message : this.l10n.syncStringLookup(messageL10n)
	
		dialog.showMessageBoxSync(attachWin, {
			title   : thisTitle,
			message : thisMessage,
			type    : type,
		})
	}
}

/**
 * loadingWindow class
 * MARK: loadingWindow
 * @class
 */
class loadingWindow {
	#win = null

	#parent = null

	#total   = 0
	#current = 0

	/**
	 * Create loading window interface
	 * @param {module:modAssist_window_lib.windowLib} win 
	 */
	constructor(win, parent = 'main') {
		this.#parent = parent
		this.#win = win
	}

	/**
	 * Increase (or reset) counter current value
	 * @param {number} amount amount to increase
	 * @param {boolean} reset use amount as new value
	 * @param {boolean} inMB use megabytes
	 */
	current (amount = 1, reset = false, inMB = false) {
		this.#doCount('current', amount, reset, inMB)
	}

	/**
	 * Increase (or reset) counter total
	 * @param {number} amount amount to increase
	 * @param {boolean} reset use amount as new value
	 * @param {boolean} inMB use megabytes
	 */
	total (amount, reset = false, inMB = false) {
		this.#doCount('total', amount, reset, inMB)
	}
	
	/**
	 * Run callback when ready
	 * @param {function} callback 
	 */
	doReady (callback) {
		if ( this.isReady ) { callback(); return }
		setTimeout(() => { this.doReady(callback) }, 250)
	}

	/** @type {boolean} */
	get isReady () { return this.#win.isVisible(this.#parent) }

	#doCount (whichCount, amount, reset, inMB) {
		const thisCounter = `#${whichCount}`
		this[thisCounter] = ( reset ) ? amount : amount + this[thisCounter]
		
		if ( whichCount === 'current' && this.#win.isVisible(this.#parent) ) {
			this.#win.win.main.setProgressBar(Math.max(0, Math.min(1, this.#current / this.#total)))
		}
		
		this.#win.sendToValidWindow(this.#parent, `loading:${whichCount}`, this[thisCounter], inMB)
	}
	
	/**
	 * Hide the loading window
	 * @param {number} time 
	 */
	hide (time = 1250) {
		setTimeout(() => {
			if ( this.#win.isValid(this.#parent) ) { this.#win.win.main.setProgressBar(-1)}
			this.#win.sendToValidWindow(this.#parent, 'loading:hide')
		}, time)
	}

	/**
	 * Do not display the count in the loading window
	 */
	noCount () {
		this.#win.sendToValidWindow(this.#parent, 'loading:noCount')
	}

	/**
	 * Open the loading window
	 * @param {string} l10nKey localization key for text
	 * @param {boolean} isDownload show download cancel button
	 */
	open ( l10nKey, isDownload = false ) {
		const winTitle    = this.#win.l10n.syncStringLookup((l10nKey) !== 'launch' ? `loading_${l10nKey}_title` : 'app_name')
		const winSubTitle = this.#win.l10n.syncStringLookup((l10nKey) !== 'launch' ? `loading_${l10nKey}_subtitle` : 'launch_game')
		const dlCancel    = this.#win.l10n.syncStringLookup('cancel_download')

		this.#win.sendToValidWindow(this.#parent, 'loading:titles', winTitle, winSubTitle, dlCancel)
		if ( isDownload ) {
			this.#win.sendToValidWindow(this.#parent, 'loading:download')
		}
	}
}

/**
 * defaultSettings class
 * MARK: default settings
 * @class
 */
module.exports.defaultSettings = class {
	constructor() {}

	get migrateSite () { return {
		'<=2.1.1' : (store) => {
			store.set('FS22_UniversalAutoload', 'https://github.com/loki79uk/FS22_UniversalAutoload/')
			store.set('FS22_Courseplay', 'https://github.com/Courseplay/Courseplay_FS22/')
			store.set('FS22_AutoDrive', 'https://github.com/Stephan-S/FS22_AutoDrive')
			store.set('FS22_SimpleInspector', 'https://github.com/jtsage/FS22_simpleInspector/')
			store.set('FS22_ProductionInspector', 'https://github.com/jtsage/FS22_ProductionInspector/')
		},
	} }

	get defaults () { return {
		cache_version     : { type : 'string',  default : '0.0.0' },
		color_theme       : { type : 'string',  default : 'dark', enum : ['dark', 'light', 'system']},
		font_size         : { type : 'number',  default : 14 },
		force_lang        : { type : 'string',  default : '' },
		game_log_auto     : { type : 'boolean', default : true },
		game_log_file     : { type : ['string', 'null'], default : null },
		game_version      : { type : 'number',  default : 22, enum : [25, 22, 19, 17, 15, 13]},
		led_active        : { type : 'boolean', default : true },
		lock_lang         : { type : 'boolean', default : false },
		modFolders        : { type : 'array',   default : [] },
		multi_version     : { type : 'boolean', default : false },
		poll_game         : { type : 'boolean', default : true },
		rel_notes         : { type : 'string',  default : '0.0.0' },
		show_tooltips     : { type : 'boolean', default : true },
		suppress_malware  : { type : 'array',   default : [] },
		use_discord       : { type : 'boolean', default : true },
		use_discord_c1    : { type : 'string',  default : ''},
		use_discord_c2    : { type : 'string',  default : ''},
		use_one_drive     : { type : 'boolean', default : false },

		game_args         : { type : 'string', default : '' },
		game_path         : { type : 'string', default : serveIPC.path.game || '' },
		game_settings     : { type : 'string', default : serveIPC.path.setFile || '' },

		game_args_25      : { type : 'string',  default : '' },
		game_enabled_25   : { type : 'boolean', default : false},
		game_path_25      : { type : 'string',  default : '' },
		game_settings_25  : { type : 'string',  default : '' },

		game_args_22      : { type : 'string',  default : '' },
		game_enabled_22   : { type : 'boolean', default : true},
		game_path_22      : { type : 'string',  default : serveIPC.path.game || '' },
		game_settings_22  : { type : 'string',  default : serveIPC.path.setFile || '' },

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
			basegame      : this.#winDef(1000, 650),
			change        : this.#winDef(650, 350),
			compare       : this.#winDef(1000, 650),
			debug         : this.#winDef(1000, 500),
			detail        : this.#winDef(800, 500),
			devtools      : this.#winDef(1000, 700),
			find          : this.#winDef(800, 600),
			folder        : this.#winDef(800, 500),
			gamelog       : this.#winDef(1000, 500),
			import        : this.#winDef(750, 500),
			importjson    : this.#winDef(900, 700),
			main          : this.#winDef(1000, 700),
			mini          : this.#winDef(400, 50),
			notes         : this.#winDef(800, 500),
			resolve       : this.#winDef(750, 600),
			save          : this.#winDef(900, 500),
			save_manage   : this.#winDef(900, 500),
			save_track    : this.#winDef(900, 500),
			setup         : this.#winDef(900, 700),
			splash        : this.#winDef(600, 300),
			version       : this.#winDef(800, 500),
		}},
	} }

	#winDef (w, h) { return {
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
}
