const { screen } = require('electron')

module.exports.subWindowDev = new Set([
	// 'change',
	// 'confirm',
	// 'debug',
	'detail',
	// 'find',
	// 'folder',
	// 'gamelog',
	// 'import',
	// 'load',
	'looker',
	'main',
	// 'notes',
	// 'prefs',
	// 'resolve',
	// 'save',
	'save_track',
	// 'splash',
	'version',
])

module.exports.settingsSchema = (foundGame, pathBestGuess) => { return {
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
		looker        : winDef(800, 650),
		main          : winDef(1000, 700),
		notes         : winDef(800, 500),
		prefs         : winDef(800, 500),
		resolve       : winDef(750, 600),
		save          : winDef(900, 500),
		save_track    : winDef(900, 500),
		splash        : winDef(600, 300),
		version       : winDef(800, 500),
	}},
} }
const windows = {
	change     : null,
	confirm    : null,
	debug      : null,
	detail     : null,
	find       : null,
	folder     : null,
	gamelog    : null,
	import     : null,
	load       : null,
	looker     : null,
	main       : null,
	notes      : null,
	prefs      : null,
	resolve    : null,
	save       : null,
	save_track : null,
	splash     : null,
	version    : null,
}
module.exports.windows = windows

module.exports.subWindowDefinitions = (sendModList, processModFolders, refreshClientModList, log, readGameLog, mcStore, devControls) => {
	/* eslint-disable sort-keys */
	return {
		confirmFav : {
			winName         : 'confirm',
			HTMLFile        : 'confirm-multi.html',
			subWindowArgs   : { parent : 'main', preload : 'confirmCombi', fixed : true },
			callback        : (windowArgs) => { sendModList(windowArgs, 'fromMain_confirmList', 'confirm', false) },
		},
		confirmCopy : {
			winName         : 'confirm',
			HTMLFile        : 'confirm-fileCopy.html',
			subWindowArgs   : { parent : 'main', preload : 'confirmCombi', fixed : true },
			callback        : (windowArgs) => { sendModList(windowArgs, 'fromMain_confirmList', 'confirm', false) },
		},
		confirmMove : {
			winName         : 'confirm',
			HTMLFile        : 'confirm-fileMove.html',
			subWindowArgs   : { parent : 'main', preload : 'confirmCombi', fixed : true },
			callback        : (windowArgs) => { sendModList(windowArgs, 'fromMain_confirmList', 'confirm', false) },
		},
		confirmMultiCopy : {
			winName         : 'confirm',
			HTMLFile        : 'confirm-fileMultiCopy.html',
			subWindowArgs   : { parent : 'main', preload : 'confirmCombi', fixed : true },
			callback        : (windowArgs) => { sendModList(windowArgs, 'fromMain_confirmList', 'confirm', false) },
		},
		confirmMultiMove : {
			winName         : 'confirm',
			HTMLFile        : 'confirm-fileMultiMove.html',
			subWindowArgs   : { parent : 'main', preload : 'confirmCombi', fixed : true },
			callback        : (windowArgs) => { sendModList(windowArgs, 'fromMain_confirmList', 'confirm', false) },
		},
		confirmDelete : {
			winName         : 'confirm',
			HTMLFile        : 'confirm-fileDelete.html',
			subWindowArgs   : { parent : 'main', preload : 'confirmCombi', fixed : true },
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
			callback        : (windowArgs) => { sendModList(windowArgs, 'fromMain_confirmList', 'import', false) },
		},
	}
	/* eslint-enable sort-keys */
}

module.exports.destroyAndFocus = (winName) => {
	windows[winName] = null
	if ( windows.main !== null ) {
		if ( windows.load !== null && !windows.load.isDestroyed() && !windows.load.isVisible() ) {
			windows.main.focus()
		}
	}
}


module.exports.getRealCenter = (mcStore) => {
	return (winName) => {
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
}

const path = require('path')
module.exports.getWindowOpts = (winSettings, parent, fixed, fixedOnTop, frame, move, show, skipTaskbar, winTitle, pathIcon, themeColors, currentColorTheme, preload, pathPreload, useCustomTitle, realCenter) => { return {
	alwaysOnTop     : fixedOnTop && fixed,
	autoHideMenuBar : true,
	frame           : frame,
	fullscreenable  : !fixed,
	height          : winSettings.h,
	icon            : pathIcon,
	maximizable     : !fixed,
	minimizable     : !fixed,
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
} }

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
