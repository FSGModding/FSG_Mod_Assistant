const { screen } = require('electron')

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
		confirmMultiCopy : {
			winName         : 'confirm',
			HTMLFile        : 'confirm-fileMultiCopy.html',
			subWindowArgs   : { parent : 'main', preload : 'confirmMultiCopy', fixed : true },
			callback        : (windowArgs) => { sendModList(windowArgs, 'fromMain_confirmList', 'confirm', false) },
		},
		confirmMultiMove : {
			winName         : 'confirm',
			HTMLFile        : 'confirm-fileMultiMove.html',
			subWindowArgs   : { parent : 'main', preload : 'confirmMultiMove', fixed : true },
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
			subWindowArgs   : { parent : 'main', preload : 'confirmImport', fixed : true },
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

module.exports.winDef = (w, h) => { return {
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