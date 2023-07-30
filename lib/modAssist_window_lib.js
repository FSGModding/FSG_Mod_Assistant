/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Window Control Library and Config

const { screen, app, nativeTheme, dialog, shell, BrowserWindow } = require('electron')
const { maIPC } = require('./modUtilLib.js')
const path       = require('path')

module.exports.windowLib = class {
	#dev = new Set([
		// 'change',
		// 'confirm',
		// 'debug',
		'detail',
		// 'find',
		// 'folder',
		'gamelog',
		// 'import',
		// 'load',
		'main',
		// 'notes',
		// 'prefs',
		// 'resolve',
		// 'save',
		'save_track',
		// 'splash',
		'version',
	])

	/* eslint-disable sort-keys */
	winDefs = {
		confirmFav : {
			winName         : 'confirm',
			HTMLFile        : 'confirm-multi.html',
			subWindowArgs   : { parent : 'main', preload : 'confirmCombi', fixed : true },
			callback        : (windowArgs) => { this.sendModList(windowArgs, 'fromMain_confirmList', 'confirm', false) },
		},
		confirmCopy : {
			winName         : 'confirm',
			HTMLFile        : 'confirm-fileCopy.html',
			subWindowArgs   : { parent : 'main', preload : 'confirmCombi', fixed : true },
			callback        : (windowArgs) => { this.sendModList(windowArgs, 'fromMain_confirmList', 'confirm', false) },
		},
		confirmMove : {
			winName         : 'confirm',
			HTMLFile        : 'confirm-fileMove.html',
			subWindowArgs   : { parent : 'main', preload : 'confirmCombi', fixed : true },
			callback        : (windowArgs) => { this.sendModList(windowArgs, 'fromMain_confirmList', 'confirm', false) },
		},
		confirmMultiCopy : {
			winName         : 'confirm',
			HTMLFile        : 'confirm-fileMultiCopy.html',
			subWindowArgs   : { parent : 'main', preload : 'confirmCombi', fixed : true },
			callback        : (windowArgs) => { this.sendModList(windowArgs, 'fromMain_confirmList', 'confirm', false) },
		},
		confirmMultiMove : {
			winName         : 'confirm',
			HTMLFile        : 'confirm-fileMultiMove.html',
			subWindowArgs   : { parent : 'main', preload : 'confirmCombi', fixed : true },
			callback        : (windowArgs) => { this.sendModList(windowArgs, 'fromMain_confirmList', 'confirm', false) },
		},
		confirmDelete : {
			winName         : 'confirm',
			HTMLFile        : 'confirm-fileDelete.html',
			subWindowArgs   : { parent : 'main', preload : 'confirmCombi', fixed : true },
			callback        : (windowArgs) => { this.sendModList(windowArgs, 'fromMain_confirmList', 'confirm', false) },
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
			callback        : () => { this.sendModList({}, 'fromMain_getFolders', 'folder', false ) },
			refocusCallback : true,
			extraCloseFunc  : () => { this.#refFunc.processModFolders() },
		},
		debug : {
			winName         : 'debug',
			HTMLFile        : 'debug.html',
			subWindowArgs   : { preload : 'debugWindow' },
			callback        : () => {
				this.sendToValidWindow('debug', 'fromMain_debugLog', this.#log.htmlLog)
				this.sendToValidWindow('main', 'fromMain_debugLogNoDanger')
			},
			refocusCallback : true,
		},
		gamelog : {
			winName         : 'gamelog',
			HTMLFile        : 'gamelog.html',
			subWindowArgs   : { preload : 'gamelogWindow' },
			callback        : () => { this.#refFunc.readGameLog() },
			refocusCallback : true,
		},
		prefs : {
			winName         : 'prefs',
			HTMLFile        : 'prefs.html',
			subWindowArgs   : { parent : 'main', preload : 'prefsWindow' },
			callback        : () => {
				this.sendToValidWindow('prefs', 'fromMain_allSettings', this.#settings.store, this.#flags.devControls )
			},
			refocusCallback : true,
			handleURLinWin  : true,
			extraCloseFunc  : () => { this.#refFunc.refreshClientModList() },
		},
		detail : {
			winName         : 'detail',
			HTMLFile        : 'detail.html',
			subWindowArgs   : { parent : 'main', preload : 'detailWindow' },
			callback        : (windowArgs) => { this.sendModList(windowArgs, 'fromMain_modRecord', 'detail', false) },
			refocusCallback : true,
			handleURLinWin  : true,
		},
		find : {
			winName         : 'find',
			HTMLFile        : 'find.html',
			subWindowArgs   : { preload : 'findWindow' },
			callback        : () => { this.sendModList({}, 'fromMain_modRecords', 'find', false ) },
			refocusCallback : true,
		},
		notes : {
			winName         : 'notes',
			HTMLFile        : 'notes.html',
			subWindowArgs   : { parent : 'main', preload : 'notesWindow' },
			callback        : (windowArgs) => { this.sendModList(windowArgs, 'fromMain_collectionName', 'notes', false ) },
			refocusCallback : true,
			extraCloseFunc  : () => { this.#refFunc.refreshClientModList() },
		},
		version : {
			winName         : 'version',
			HTMLFile        : 'versions.html',
			subWindowArgs   : { parent : 'main', preload : 'versionWindow' },
			callback        : () => { this.sendModList({}, 'fromMain_modList', 'version', false ) },
			refocusCallback : true,
		},
		resolve : {
			winName         : 'resolve',
			HTMLFile        : 'resolve.html',
			subWindowArgs   : { parent : 'version', preload : 'resolveWindow', fixed : true },
			callback        : (windowArgs) => {
				this.sendToValidWindow('resolve', 'fromMain_modSet', windowArgs.modSet, windowArgs.shortName)
			},
			refocusCallback : true,
		},
		save : {
			winName         : 'save',
			HTMLFile        : 'savegame.html',
			subWindowArgs   : { preload : 'savegameWindow' },
			callback        : (windowArgs) => { this.sendModList(windowArgs, 'fromMain_collectionName', 'save', false ) },
			refocusCallback : true,
		},
		save_track : {
			winName         : 'save_track',
			HTMLFile        : 'savetrack.html',
			subWindowArgs   : { preload : 'savetrackWindow' },
			callback        : () => { return },
			refocusCallback : true,
		},
		import : {
			winName         : 'import',
			HTMLFile        : 'confirm-import.html',
			subWindowArgs   : { parent : 'main', preload : 'confirmCombi', fixed : true },
			callback        : (windowArgs) => { this.sendModList(windowArgs, 'fromMain_confirmList', 'import', false) },
		},
		/* eslint-enable sort-keys */
	}

	devTools = {}

	win = {
		change     : null,
		confirm    : null,
		debug      : null,
		detail     : null,
		find       : null,
		folder     : null,
		gamelog    : null,
		import     : null,
		load       : null,
		main       : null,
		notes      : null,
		prefs      : null,
		resolve    : null,
		save       : null,
		save_track : null,
		splash     : null,
		version    : null,
	}

	tray = null

	#themeColors = {
		'dark'  : { background : '#2b3035', font : '#6d757a' },
		'light' : { background : '#f8f9fa', font : '#7b8fa0' },
	}
	#themeCurrentColor = 'dark'

	#log      = maIPC.log
	l10n      = maIPC.l10n

	#debug    = !app.isPackaged
	#settings = null
	#collect  = null
	loading   = null
	#refFunc  = {}
	#flags    = {}
	#path     = {
		icon    : path.join(app.getAppPath(), 'build', 'icon.ico'),
		preload : path.join(app.getAppPath(), 'renderer', 'preload'),
		render  : path.join(app.getAppPath(), 'renderer'),
	}

	constructor(refFunc = {}, flags) {
		this.#flags   = flags
		this.#refFunc = refFunc

		this.loading  = new loadingWindow(this)
		maIPC.loading = this.loading

		nativeTheme.on('updated', () => {
			this.changeTheme()

			if ( this.#settings.get('color_theme') === 'system' ) {
				this.themeUpdater()
			}
		})
	}

	isValid(name) {
		return ( typeof this.win[name] !== 'undefined' && this.win[name] !== null && !this.win[name].isDestroyed() )
	}

	isVisible(name) {
		return this.win[name] !== null && this.win[name].isVisible()
	}

	safeClose(name) {
		if ( this.isValid(name) && this.isVisible(name) ) {
			this.win[name].close()
		}
	}

	closeAllSubWin() {
		for ( const thisWin in this.win ) {
			if ( thisWin !== 'main' && this.isValid(thisWin) ) {
				this.win[thisWin].destroy()
			}
		}
	}

	destroyAndFocus (name) {
		this.win[name] = null
		if ( this.isValid('main') ) {
			this.win.main.focus()
		}
	}

	sendToWindow(name, command, ...args) {
		this.win[name].webContents.send(command, ...args)
	}

	sendToValidWindow(name, command, ...args) {
		if ( this.isValid(name) ) { this.sendToWindow(name, command, ...args) }
	}

	sendModList(extraArgs = {}, eventName = 'fromMain_modList', toWindow = 'main', closeLoader = true) {
		this.#collect.toRenderer(extraArgs).then((modCollection) => {
			this.sendToValidWindow(toWindow, eventName, modCollection)
	
			if ( toWindow === 'main' && this.isVisible('version') ) {
				this.sendToWindow('version', eventName, modCollection)
			}
			if ( closeLoader ) { if ( !maIPC.processing ) { this.loading.hide(1500) } }
		})
	}

	loadSettings() { this.#settings = maIPC.settings; this.changeTheme() }

	set modCollect(newCollect)  { this.#collect = newCollect }
	set themeCurrentColor(name) { this.#themeCurrentColor = name }
	get themeCurrentColor()     { return this.#themeCurrentColor }
	
	changeTheme(newTheme = null ) {
		if (newTheme !== null) {
			this.#settings.set('color_theme', newTheme)
		}

		const currentSetting = this.#settings.get('color_theme')

		this.#themeCurrentColor = ( currentSetting === 'system' ) ?
			(nativeTheme.shouldUseDarkColors ? 'dark' : 'light') :
			currentSetting

		if (newTheme !== null) { this.themeUpdater() }
	}

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

	resetPositions() {
		this.#settings.reset('wins')
		const mainBounds = this.#settings.get('wins.main')
		const prefBounds = this.#settings.get('wins.prefs')
		this.win.main.unmaximize()
		this.win.prefs.unmaximize()
		try {
			this.win.main.setBounds({width : Math.floor(mainBounds.w), height : Math.floor(mainBounds.h)})
			this.win.prefs.setBounds({width : Math.floor(prefBounds.w), height : Math.floor(prefBounds.h)})
		} catch (e) {
			this.#log.log.debug(`Reset failed : ${e}`, 'reset-windows')
		}
		this.win.main.center()
		this.win.prefs.center()
	}

	refreshL10n(newLocale, name = null) {
		if ( name !== null ) {
			this.sendToValidWindow(name, 'fromMain_l10n_refresh', newLocale)
		} else {
			for ( const thisWinKey in this.win ) {
				this.sendToValidWindow(thisWinKey, 'fromMain_l10n_refresh', newLocale)
			}
		}
	}

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

	toggleMainDangerFlag() {
		if ( this.isValid('main') ) { this.sendToWindow('main', 'fromMain_debugLogDanger') }
	}
	toggleMainDirtyFlag(foldersDirty) {
		this.sendToValidWindow('main', 'fromMain_dirtyUpdate', foldersDirty)
	}

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

	createNamedWindow(winName, windowArgs, extraCallback = null) {
		const subWinDef   = this.winDefs[winName]
		const thisWinName = subWinDef.winName
	
		if ( this.isValid(thisWinName) ) {
			this.win[thisWinName].focus()
			if ( subWinDef.refocusCallback ) {
				subWinDef.callback(windowArgs)
				if ( typeof extraCallback === 'function' ) { extraCallback() }
			}
			return
		}
	
		this.win[thisWinName] = this.createSubWindow(thisWinName, subWinDef.subWindowArgs)
	
		this.win[thisWinName].webContents.on('did-finish-load', async () => {
			this.sendToWindow(thisWinName, 'fromMain_themeSetting', this.#themeCurrentColor)
			subWinDef.callback(windowArgs)

			if ( typeof extraCallback === 'function' ) { extraCallback() }
	
			if ( this.#debug && this.#dev.has(thisWinName) && ( typeof this.devTools[thisWinName] === 'undefined' || this.devTools[thisWinName] === null ) ) {
				this.devTools[thisWinName] = this.createSubWindow('devtools', {
					show           : true,
					useCustomTitle : false,
				})
				this.win[thisWinName].webContents.setDevToolsWebContents(this.devTools[thisWinName].webContents)
				this.win[thisWinName].webContents.openDevTools({ mode : 'detach', activate : false })

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

	createSubWindow(winName, { useCustomTitle = true, skipTaskbar = false, noSelect = true, show = true, parent = null, title = null, fixed = false, frame = true, move = true, preload = null, fixedOnTop = true} = {}) {
		const realCenter  = this.getRealCenter(winName)
		const winSettings = this.#settings.get(`wins.${winName}`)
	
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
			show            : show,
			skipTaskbar     : skipTaskbar,
			title           : winTitle,
			width           : winSettings.w,
			x               : winSettings.x > -1 ? Math.floor(winSettings.x) : realCenter.x,
			y               : winSettings.y > -1 ? Math.floor(winSettings.y) : realCenter.y,
		
			titleBarOverlay : {
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
					this.createNamedWindow('debug')
					event.preventDefault()
				}
			})
		}
	
		if ( winName !== 'splash' ) {
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
	
			thisWindow.on('focus', () => {
				thisWindow.webContents.send('fromMain_clearTooltips')
			})
		}
	
		if ( !this.#debug )   { thisWindow.removeMenu() }
		if ( winSettings.m )  { thisWindow.maximize() }
		return thisWindow
	}

	createMainWindow (openCallback) {
		this.win.main = this.createSubWindow('main', { noSelect : false, show : this.#debug, preload : 'mainWindow' })
		
		this.win.main.on('closed', () => {
			this.win.main = null
			app.quit()
		})
	
		if ( !this.#debug ) {
			this.win.splash = this.createSubWindow('splash', { center : true, fixed : true, frame : false, move : false, useCustomTitle : false })
			this.win.splash.loadURL(`file://${path.join(this.#path.render, 'splash.html')}?version=${app.getVersion()}`)
	
			this.win.splash.on('closed', () => { this.win.splash = null })
	
			this.win.main.once('ready-to-show', () => {
				setTimeout(() => { this.win.main.show(); this.win.splash.destroy() }, 2000)
			})
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
			const showCount = setInterval(() => {
				if ( this.isVisible('main') ) {
					clearInterval(showCount)
					this.sendToWindow('main', 'fromMain_themeSetting', this.#themeCurrentColor)
					openCallback()
					if ( this.#debug && ( typeof this.devTools.main === 'undefined' || this.devTools.main === null ) ) {
						this.devTools.main = this.createSubWindow('devtools', {
							show           : true,
							useCustomTitle : false,
						})
						this.win.main.webContents.setDevToolsWebContents(this.devTools.main.webContents)
						this.win.main.webContents.openDevTools({ mode : 'detach', activate : false })

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
		})
		
		this.win.main.webContents.setWindowOpenHandler(({ url }) => {
			shell.openExternal(url)
			return { action : 'deny' }
		})
	}
}

class loadingWindow {
	#win = null

	#total   = 0
	#current = 0

	constructor(win) {
		this.#win = win
	}

	current (amount = 1, reset = false, inMB = false) {
		this.#doCount('current', amount, reset, inMB)
	}

	total (amount, reset = false, inMB = false) {
		this.#doCount('total', amount, reset, inMB)
	}
	
	get isReady () { return this.#win.isVisible('main') }

	#doCount (whichCount, amount, reset, inMB) {
		const thisCounter = `#${whichCount}`
		this[thisCounter] = ( reset ) ? amount : amount + this[thisCounter]
		
		if ( whichCount === 'current' && this.#win.isVisible('main') ) {
			this.#win.win.main.setProgressBar(Math.max(0, Math.min(1, this.#current / this.#total)))
		}
		
		this.#win.sendToValidWindow('main', `fromMain_loading_${whichCount}`, this[thisCounter], inMB)
	}
	
	hide (time = 1250) {
		setTimeout(() => {
			if ( this.#win.isValid('main') ) { this.#win.win.main.setProgressBar(-1)}
			this.#win.sendToValidWindow('main', 'formMain_loading_hide')
		}, time)
	}

	noCount () {
		this.#win.sendToValidWindow('main', 'fromMain_loadingNoCount')
	}

	open ( l10nKey, isDownload = false ) {
		const winTitle    = this.#win.l10n.syncStringLookup((l10nKey) !== 'launch' ? `loading_${l10nKey}_title` : 'app_name')
		const winSubTitle = this.#win.l10n.syncStringLookup((l10nKey) !== 'launch' ? `loading_${l10nKey}_subtitle` : 'launch_game')
		const dlCancel    = this.#win.l10n.syncStringLookup('cancel_download')

		this.#win.sendToValidWindow('main', 'formMain_loadingTitles', winTitle, winSubTitle, dlCancel)
		if ( isDownload ) {
			this.#win.sendToValidWindow('main', 'fromMain_loadingDownload')
		}
	}
}


module.exports.defaultSettings = class {
	#flags = {}

	constructor(flags) {
		this.#flags = flags
	}

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
		game_path         : { type : 'string', default : this.#flags.pathGameGuess },
		game_settings     : { type : 'string', default : path.join(this.#flags.pathBestGuess, 'gameSettings.xml') },

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
			change        : this.#winDef(650, 350),
			confirm       : this.#winDef(750, 500),
			debug         : this.#winDef(1000, 500),
			detail        : this.#winDef(800, 500),
			devtools      : this.#winDef(1000, 700),
			find          : this.#winDef(800, 600),
			folder        : this.#winDef(800, 500),
			gamelog       : this.#winDef(1000, 500),
			import        : this.#winDef(750, 500),
			load          : this.#winDef(600, 300),
			main          : this.#winDef(1000, 700),
			notes         : this.#winDef(800, 500),
			prefs         : this.#winDef(800, 500),
			resolve       : this.#winDef(750, 600),
			save          : this.#winDef(900, 500),
			save_track    : this.#winDef(900, 500),
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
