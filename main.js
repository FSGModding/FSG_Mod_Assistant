//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Main Program

// (c) 2021 JTSage.  MIT License.

const { app, Menu, BrowserWindow, ipcMain, clipboard, globalShortcut, shell, dialog, screen } = require('electron')

const { autoUpdater } = require('electron-updater')

const devDebug = true

if (process.platform === 'win32') {
	autoUpdater.checkForUpdatesAndNotify()
}

const path       = require('path')
const xml2js     = require('xml2js')
const fs         = require('fs')

const translator               = require('./lib/translate.js')
const { modReader, mcLogger }  = require('./lib/mod-checker.js')
const mcDetail                 = require('./package.json')
const mcSettings               = require('electron-settings')

if ( !mcSettings.hasSync('remember_last') ) {
	mcSettings.setSync('remember_last', true)
}

const myTranslator     = new translator.translator(translator.getSystemLocale())
myTranslator.mcVersion = mcDetail.version

if ( mcSettings.hasSync('force_lang') && mcSettings.hasSync('lock_lang') ) {
	myTranslator.currentLocale = mcSettings.getSync('force_lang')
}

const logger = new mcLogger()

let location_settings  = null
let location_savegame  = null
let location_modfolder = null
let location_valid     = false
let location_error     = false

let modList = null

let counterInterval = null
let counterRuntime  = 0

const counterTick    = 100 //ms between counter update.
const counterMaxTick = 300000 //ms for total counter time max

let win    = null // Main window.
let splash = null

let workWidth  = 0
let workHeight = 0



/*
 
   ______ _______ _______ _______ _______ ______  _______  ______       ______ _______ _______ _______ _______ _______ _______ _______ _____ __   _  ______ _______
  |_____/ |______ |  |  | |______ |  |  | |_____] |______ |_____/      |  ____ |_____| |  |  | |______ |______ |______    |       |      |   | \  | |  ____ |______
  |    \_ |______ |  |  | |______ |  |  | |_____] |______ |    \_      |_____| |     | |  |  | |______ ______| |______    |       |    __|__ |  \_| |_____| ______|
                                                                                                                                                                   
 
*/

function openSavedSettings(event) {
	const XMLOptions = {strict : true, async : false, normalizeTags : true, attrNameProcessors : [function(name) { return name.toUpperCase() }] }
	const strictXMLParser = new xml2js.Parser(XMLOptions)
			
	location_savegame = path.dirname(mcSettings.getSync('gamesettings'))
	location_settings = mcSettings.getSync('gamesettings')

	let fileContents = ''
	try {
		fileContents = fs.readFileSync(mcSettings.getSync('gamesettings'))
	} catch {
		logger.fatal('loader', 'Saved gameSettings.xml unreadable')
		location_settings = null
		location_savegame = null
		mcSettings.unsetSync('gamesettings')
		return
	}

	strictXMLParser.parseString(fileContents, (xmlErr, xmlTree) => {
		if ( xmlErr !== null ) {
			/* Could not parse the settings file. */
			location_savegame = null
			location_settings = null
			location_error    = true
			logger.fatal('loader', `Unable to parse gameSettings.xml : ${xmlErr.toString()}`)
			sendNewConfig(event)
			return
		}
				
		if ( ! ('gamesettings' in xmlTree) ) {
			/* Not a valid config */
			location_savegame = null
			location_settings = null
			location_error    = true
			logger.fatal('loader', 'gameSettings.xml does not contain the root gamesettings tag (not a settings file)')
			sendNewConfig(event)
			return
		}
				
		let overrideAttr = false

		try {
			overrideAttr = xmlTree.gamesettings.modsdirectoryoverride[0].$
		} catch {
			overrideAttr   = false
			logger.notice('loader', 'Did not find override directive in gameSettings.xml (recovering)')
		}

		if ( overrideAttr !== false && overrideAttr.ACTIVE === 'true' ) {
			location_modfolder = overrideAttr.DIRECTORY
		} else {
			location_modfolder = path.join(location_savegame, 'mods')
		}
				
		location_valid = true

		sendNewConfig(event)
	})
}
/*
  _______  _____  _    _ _______      _______  _____  ______ 
  |  |  | |     |  \  /  |______      |  |  | |     | |     \
  |  |  | |_____|   \/   |______      |  |  | |_____| |_____/
                                                             
*/
async function moveMod(modName) {
	if ( !mcSettings.hasSync('use_move') || !mcSettings.hasSync('move_destination') || !mcSettings.getSync('use_move') ) {
		dialog.showMessageBoxSync(win, {
			message : await myTranslator.stringLookup('move_mod_no_folder'),
			type    : 'warning',
		})
		return false
	}
	const response = dialog.showMessageBoxSync(win, {
		message : `${await myTranslator.stringLookup('move_mod_message')} ${modName}`,
		type    : 'warning',
		buttons : [
			await myTranslator.stringLookup('move_mod_cancel'),
			await myTranslator.stringLookup('move_mod_ok')
		],
		defaultId : 0,
		cancelId  : 0,
	})
	if ( response === 1 ) {
		try {
			fs.renameSync(
				modList.fullList[modName].fullPath,
				path.join(mcSettings.getSync('move_destination'), modList.fullList[modName].filename)
			)
			modList.fullList[modName].ignoreMe = true
			dialog.showMessageBoxSync(win, {
				message : await myTranslator.stringLookup('move_mod_worked'),
				type    : 'warning',
			})
			win.webContents.send('did-move-mod', modName)
			
		} catch (moveError) {
			logger.fileError('moveFile', `File move failed : ${moveError}`)
			dialog.showMessageBoxSync(win, {
				message : await myTranslator.stringLookup('move_mod_failed'),
				type    : 'warning',
			})
		}
	}
}


/*
  _______ _______ _____ __   _      _  _  _ _____ __   _ ______   _____  _  _  _
  |  |  | |_____|   |   | \  |      |  |  |   |   | \  | |     \ |     | |  |  |
  |  |  | |     | __|__ |  \_|      |__|__| __|__ |  \_| |_____/ |_____| |__|__|
                                                                                
*/
function createWindow () {
	win = new BrowserWindow({
		icon            : path.join(app.getAppPath(), 'build', 'icon.png'),
		width           : mcSettings.hasSync('main_window_x') ? mcSettings.getSync('main_window_x') : 1000,
		height          : mcSettings.hasSync('main_window_y') ? mcSettings.getSync('main_window_y') : 700,
		show            : devDebug,
		autoHideMenuBar : !devDebug,
		webPreferences  : {
			nodeIntegration  : false,
			contextIsolation : true,
			preload          : path.join(app.getAppPath(), 'renderer', 'preload-main.js'),
		},
	})
	

	if ( !devDebug ) {
		splash = new BrowserWindow({
			width           : 800,
			height          : 400,
			transparent     : true,
			frame           : false,
			alwaysOnTop     : true,
			autoHideMenuBar : true,
		})

		splash.setPosition(((workWidth/2)-200), ((workHeight/2)-200))

		splash.loadFile(path.join(app.getAppPath(), 'renderer', 'splash.html'))

		win.removeMenu()

		win.once('ready-to-show', () => {
			setTimeout(() => {
				splash.destroy()
				win.show()
			}, 1500)
		})
	}

	if ( mcSettings.hasSync('main_window_max') && mcSettings.getSync('main_window_max') ) {
		win.maximize()
	}

	win.loadFile(path.join(app.getAppPath(), 'renderer', 'main.html'))

	win.webContents.on('did-finish-load', (event) => {
		if ( mcSettings.hasSync('gamesettings') ) {
			console.log('ask to load old')
			openSavedSettings(event)
		}
		if ( modList !== null ) {
			modList.safeResend().then((isIt) => {
				if ( isIt ) {
					event.sender.send('processModsDone')
				}
			})
		}
		event.sender.send('trigger-i18n')
		myTranslator.getLangList().then((langList) => {
			event.sender.send('trigger-i18n-select', langList, myTranslator.deferCurrentLocale())
		})
		myTranslator.stringLookup('title').then((title) => {
			win.title = title
		})
	})
	win.webContents.setWindowOpenHandler(({ url }) => {
		require('electron').shell.openExternal(url)
		return { action : 'deny' }
	})
	
}


ipcMain.on('setPreference', (event, settingName, settingValue) => {
	if ( settingName === 'lock_lang') {
		if ( settingValue === true ) {
			mcSettings.setSync('force_lang', myTranslator.currentLocale)
			mcSettings.setSync('lock_lang', true)
		} else {
			mcSettings.unsetSync('force_lang')
			mcSettings.setSync('lock_lang', false)
		}
	} else {
		mcSettings.setSync(settingName, settingValue)
	}
})

ipcMain.on('refreshPreferences', (event) => {
	event.sender.send(
		'got-pref-settings',
		mcSettings.getSync(),
		myTranslator.syncStringLookup('language_name')
	)
})


/*
  _____  _____  _______   _______ _______ __   _ _     _ _______
    |   |_____] |       . |  |  | |______ | \  | |     | |______
  __|__ |       |_____  . |  |  | |______ |  \_| |_____| ______|
                                                                
*/
ipcMain.on('show-context-menu-list', async (event, fullPath, modName) => {
	const template = [
		{
			label : await myTranslator.stringLookup('menu_open_explorer'),
			click : () => { shell.showItemInFolder(fullPath) },
		},
		{ type : 'separator' }
	]

	if ( mcSettings.hasSync('move_destination') && mcSettings.hasSync('use_move') && mcSettings.getSync('use_move') ) {
		template.push({
			label : await myTranslator.stringLookup('menu_move_file'),
			click : () => { moveMod(modName) },
		},
		{ type : 'separator' })
	}

	template.push({
		label : await myTranslator.stringLookup('menu_copy_full_path'),
		click : () => { clipboard.writeText(fullPath) },
	})
	
	const menu = Menu.buildFromTemplate(template)
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})

ipcMain.on('show-mod-detail', (event, thisMod) => {
	let thisModDetail = null

	try {
		thisModDetail = modList.fullList[thisMod]
	} catch (err) {
		this.log.info(`detail-${thisMod}`, `Did not find mod details. This should be impossible: ${err}`)
	}

	if ( thisModDetail !== null ) {
		openDetailWindow(thisModDetail)
	}
})

ipcMain.on('askOpenPreferencesWindow', () => {
	openPrefWindow()
})

ipcMain.on('show-context-menu-table', async (event, theseHeaders, theseValues) => {
	const template = [
		{
			label : `${await myTranslator.stringLookup('menu_details')} : ${theseValues[0]}`,
			click : () => { openDetailWindow(modList.fullList[theseValues[0]]) },
		},
		{ type : 'separator' },
	]
	if ( modList.fullList[theseValues[0]].isMissing ) {
		template.push({
			label : await myTranslator.stringLookup('menu_find_on_mod_hub'),
			click : () => {
				const url = `https://www.farming-simulator.com/mods.php?title=fs2019&searchMod= ${theseValues[1]}`
				require('electron').shell.openExternal(url)
			},
		}, {
			label : await myTranslator.stringLookup('menu_find_on_google'),
			click : () => {
				const url = `https://www.google.com/search?q=FS19 ${theseValues[1]}`
				require('electron').shell.openExternal(url)
			},
		}, {
			label : await myTranslator.stringLookup('menu_find_on_duck'),
			click : () => {
				const url = `https://duckduckgo.com/?q=FS19 ${theseValues[1]}`
				require('electron').shell.openExternal(url)
			},
		}, {
			label : await myTranslator.stringLookup('menu_find_on_bing'),
			click : () => {
				const url = `https://www.bing.com/search?q=FS19 ${theseValues[1]}`
				require('electron').shell.openExternal(url)
			},
		}, { type : 'separator' })
	} else {
		template.push({
			label : await myTranslator.stringLookup('menu_open_explorer'),
			click : () => { shell.showItemInFolder(modList.fullList[theseValues[0]].fullPath) },
		},
		{ type : 'separator' })

		if ( mcSettings.hasSync('move_destination') && mcSettings.hasSync('use_move') && mcSettings.getSync('use_move') ) {
			template.push({
				label : await myTranslator.stringLookup('menu_move_file'),
				click : () => { moveMod(theseValues[0]) },
			},
			{ type : 'separator' })
		}
	}
	const blackListColumns = ['header_mod_is_used', 'header_mod_is_active', 'header_mod_has_scripts', 'header_mod_multiplayer']
	const copyString       = await myTranslator.stringLookup('menu_copy_general')

	for ( let i = 0; i < theseHeaders.length; i++ ) {
		if ( blackListColumns.includes(theseHeaders[i][1]) ) { continue }
		template.push({
			label : copyString + theseHeaders[i][0],
			click : () => { clipboard.writeText(theseValues[i]) },
		})
		
	}

	const menu = Menu.buildFromTemplate(template)
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})




/*
  _____  _____  _______   _______  ______ _______ __   _ _______        _______ _______ _______
    |   |_____] |       .    |    |_____/ |_____| | \  | |______ |      |_____|    |    |______
  __|__ |       |_____  .    |    |    \_ |     | |  \_| ______| |_____ |     |    |    |______
                                                                                               
*/
ipcMain.on('i18n-translate', (event, arg) => {
	myTranslator.stringLookup(arg).then((text) => {
		event.sender.send('i18n-translate-return', arg, text)
	})
})

ipcMain.on('i18n-change-locale', (event, arg) => {
	myTranslator.currentLocale = arg
	event.sender.send('trigger-i18n')
	event.sender.send('trigger-i18n-on-data')
})




/*
  _____  _____  _______   _______  _____  __   _ _______ _____  ______
    |   |_____] |       . |       |     | | \  | |______   |   |  ____
  __|__ |       |_____  . |_____  |_____| |  \_| |       __|__ |_____|
                                                                      
*/
ipcMain.on('openCleanDir', () => {
	if ( mcSettings.hasSync('move_destination') && mcSettings.hasSync('use_move') && mcSettings.getSync('use_move') ) {
		shell.openPath(mcSettings('move_destination'))
	}
})

function sendNewConfig(event) {
	event.sender.send(
		'newFileConfig',
		{
			valid    : location_valid,
			error    : location_error,
			saveDir  : location_savegame,
			modDir   : location_modfolder,
		}
	)
}

ipcMain.on('setMoveFolder', (event) => {
	const homedir  = require('os').homedir()

	dialog.showOpenDialog(prefWindow, {
		properties  : ['openDirectory'],
		defaultPath : homedir,
	}).then((result) => {
		if ( result.canceled ) {
			logger.notice('loader', 'Set move folder canceled')
		} else {
			mcSettings.setSync('use_move', true)
			mcSettings.setSync('move_destination', result.filePaths[0])
			console.log('new clean', result.filePaths[0])

			event.sender.send(
				'got-pref-settings',
				mcSettings.getSync(),
				myTranslator.syncStringLookup('language_name')
			)
		}
	}).catch((unknownError) => {
		// Read of file failed? Permissions issue maybe?  Not sure.
		mcSettings.setSync('use_move', false)
		mcSettings.unsetSync('move_destination')
		logger.fatal('loader', `Could not read specified move-to folder : ${unknownError}`)

		event.sender.send(
			'got-pref-settings',
			mcSettings.getSync(),
			myTranslator.syncStringLookup('language_name')
		)
	})
})

ipcMain.on('openOtherFolder', (event) => {
	const homedir  = require('os').homedir()
	location_valid     = false
	location_error     = false
	location_modfolder = null
	location_savegame  = null
	location_settings  = null

	dialog.showOpenDialog(win, {
		properties  : ['openDirectory'],
		defaultPath : homedir,
	}).then((result) => {
		if ( result.canceled ) {
			sendNewConfig(event)
			logger.notice('loader', 'Open new folder canceled')
		} else {
			location_modfolder = result.filePaths[0]
			location_valid     = true
			sendNewConfig(event)
		}
	}).catch((unknownError) => {
		// Read of file failed? Permissions issue maybe?  Not sure.
		location_valid    = false
		location_savegame = null
		location_error    = true
		logger.fatal('loader', `Could not read specified mod folder : ${unknownError}`)
		sendNewConfig(event)
	})
})

ipcMain.on('openConfigFile', (event) => {
	const homedir  = require('os').homedir()
	location_valid     = false
	location_error     = false
	location_modfolder = null
	location_savegame  = null
	location_settings  = null

	dialog.showOpenDialog(win, {
		properties  : ['openFile'],
		defaultPath : path.join(homedir, 'Documents', 'My Games', 'FarmingSimulator2019', 'gameSettings.xml' ),
		filters     : [
			{ name : 'XML', extensions : ['xml'] },
			{ name : 'All', extensions : ['*'] },
		],
	}).then((result) => {
		if ( result.canceled ) {
			sendNewConfig(event)
			logger.notice('loader', 'Open new xml canceled')
		} else {
			const XMLOptions = {strict : true, async : false, normalizeTags : true, attrNameProcessors : [function(name) { return name.toUpperCase() }] }
			const strictXMLParser = new xml2js.Parser(XMLOptions)
			
			location_savegame = path.dirname(result.filePaths[0])
			location_settings = result.filePaths[0]

			strictXMLParser.parseString(fs.readFileSync(result.filePaths[0]), (xmlErr, xmlTree) => {
				if ( xmlErr !== null ) {
					/* Could not parse the settings file. */
					location_savegame = null
					location_settings = null
					location_error    = true
					logger.fatal('loader', `Unable to parse gameSettings.xml : ${xmlErr.toString()}`)
					sendNewConfig(event)
					return
				}
				
				if ( ! ('gamesettings' in xmlTree) ) {
					/* Not a valid config */
					location_savegame = null
					location_settings = null
					location_error    = true
					logger.fatal('loader', 'gameSettings.xml does not contain the root gamesettings tag (not a settings file)')
					sendNewConfig(event)
					return
				}
				
				let overrideAttr = false

				try {
					overrideAttr = xmlTree.gamesettings.modsdirectoryoverride[0].$
				} catch {
					overrideAttr   = false
					logger.notice('loader', 'Did not find override directive in gameSettings.xml (recovering)')
				}

				if ( overrideAttr !== false && overrideAttr.ACTIVE === 'true' ) {
					location_modfolder = overrideAttr.DIRECTORY
				} else {
					location_modfolder = path.join(location_savegame, 'mods')
				}
				
				location_valid = true

				if ( location_settings !== null ) {
					if ( mcSettings.hasSync('remember_last') && mcSettings.getSync('remember_last') ) {
						mcSettings.setSync('gamesettings', location_settings)
					}
				}
				sendNewConfig(event)
			})
		}
	}).catch((unknownError) => {
		// Read of file failed? Permissions issue maybe?  Not sure.
		location_valid    = false
		location_savegame = null
		location_settings = null
		location_error    = true
		logger.fatal('loader', `Could not read gameSettings.xml : ${unknownError}`)
		sendNewConfig(event)
	})
})



/*
  _____  _____  _______    _____   ______  _____  _______ _______ _______ _______
    |   |_____] |       . |_____] |_____/ |     | |       |______ |______ |______
  __|__ |       |_____  . |       |    \_ |_____| |_____  |______ ______| ______|
                                                                                 
*/
ipcMain.on('processMods', (event) => {
	if ( location_valid ) {
		try {
			modList = new modReader(
				location_savegame,
				location_modfolder,
				logger,
				myTranslator.deferCurrentLocale)
		} catch (createError) {
			location_valid     = false
			location_error     = true
			location_modfolder = null
			location_savegame  = null
			logger.fatal('reader', `Could not get modList instance: ${createError.toString()}`)
			sendNewConfig(event)
		}

		if ( modList !== null ) {
			counterRuntime = 0
			counterInterval = setInterval(() => {
				const counterValues = modList.testStatus
				event.sender.send('processModsCounter', counterValues)
				counterRuntime++
				if ( counterValues[0] === counterValues[1] || counterRuntime > (counterMaxTick / counterTick) ) {
					clearInterval(counterInterval)
					if (  counterRuntime > (counterMaxTick / counterTick) ) {
						logger.info('reader', `Test counter timed out (${counterMaxTick}ms). This is odd.`)
					}
					
				}
			}, counterTick)
			modList.readAll().then(() => {
				event.sender.send('processModsDone')
			}).catch((useError) => {
				location_valid     = false
				location_error     = true
				location_modfolder = null
				location_savegame  = null
				logger.fatal('reader', `Could not use modList instance: ${useError.toString()}`)
				sendNewConfig(event)
			})
		}
	} else {
		// This should be unreachable.  But it means that the process button was clicked before loading
		// a valid config.  Let's just start over with empty entries.
		location_valid     = false
		location_error     = true
		location_modfolder = null
		location_savegame  = null
		logger.notice('reader', 'Unreachable code point (apparently not)')
		sendNewConfig(event)
	}
})




/*
  _____  _____  _______   ______   ______  _____  _     _ _______ __   _
    |   |_____] |       . |_____] |_____/ |     | |____/  |______ | \  |
  __|__ |       |_____  . |_____] |    \_ |_____| |    \_ |______ |  \_|
                                                                        
*/
ipcMain.on('askBrokenList', (event) => {
	modList.search({
		columns : ['filenameSlash', 'fullPath', 'howIsModBroken', 'copyName', 'shortName'],
		terms   : ['isModBroken'],
	}).then((searchResults) => {
		event.sender.send('gotBrokenList', searchResults)
	}).catch((unknownError) => {
		// Shouldn't happen.  No idea
		logger.notice('ipcProcess', `Could not get "broken list" : ${unknownError}`)
		// Explicitly return an empty list, as the UI will not remove the "testing" modal
		// until this event happens.
		event.sender.send('gotBrokenList', [])
	})
})




/*
  _____  _____  _______   _______  _____  __   _ _______        _____ _______ _______ _______
    |   |_____] |       . |       |     | | \  | |______ |        |   |          |    |______
  __|__ |       |_____  . |_____  |_____| |  \_| |       |_____ __|__ |_____     |    ______|
                                                                                             
*/
ipcMain.on('askConflictList', async (event) => {

	modList.conflictList().then((searchResults) => {
		event.sender.send('gotConflictList', searchResults)
	}).catch((unknownError) => {
		// Shouldn't happen.  No idea
		// No need to return empty, this is not a pre-requisite for UI updates.
		logger.notice('ipcProcess', `Could not get "conflict list" : ${unknownError}`)
	})
})




/*
  _____  _____  _______   _______ _____ _______ _______ _____ __   _  ______
    |   |_____] |       . |  |  |   |   |______ |______   |   | \  | |  ____
  __|__ |       |_____  . |  |  | __|__ ______| ______| __|__ |  \_| |_____|
                                                                            
*/
ipcMain.on('askMissingList', (event) => {
	modList.search({
		columns : ['shortName', 'title', 'activeGames', 'usedGames'],
		terms   : ['isMissing'],
	}).then((searchResults) => {
		event.sender.send('gotMissingList', searchResults)
	}).catch((unknownError) => {
		// Shouldn't happen.  No idea
		// No need to return empty, this is not a pre-requisite for UI updates.
		logger.notice('ipcProcess', `Could not get "missing list" : ${unknownError}`)
	})
})



/*
  _____  _____  _______   _______ _______ _______ _____ _    _ _______
    |   |_____] |       . |_____| |          |      |    \  /  |______
  __|__ |       |_____  . |     | |_____     |    __|__   \/   |______
                                                                      
  This is a form control we are populating.
*/
ipcMain.on('askGamesActive', (event) => {
	modList.getActive().then(async (activeSet) => {
		event.sender.send(
			'gotGamesActive',
			activeSet,
			await myTranslator.stringLookup('filter_savegame'),
			await myTranslator.stringLookup('filter_savegame_all')
		)
	}).catch((unknownError) => {
		// Shouldn't happen.  No idea
		// No need to return empty, this is not a pre-requisite for UI updates.
		logger.notice('ipcProcess', `Could not get "list of active games" : ${unknownError}`)
	})
})



/*
  _____  _____  _______   _______ _     _  _____          _____   ______ _______
    |   |_____] |       . |______  \___/  |_____] |      |     | |_____/ |______
  __|__ |       |_____  . |______ _/   \_ |       |_____ |_____| |    \_ |______
                                                                                
*/
ipcMain.on('askExploreList', (event, activeGame, usedGame = 0, extraTerms = []) => {
	modList.search({
		columns             : [
			'shortName', 'title', 'mod_version', 'fileSizeMap', 'stringDate',
			'isActive', 'activeGames', 'isUsed', 'usedGames',
			'fullPath', 'hasScripts', 'isMultiplayer'
		],
		activeGame          : parseInt(activeGame),
		usedGame            : parseInt(usedGame),
		allTerms            : true,
		terms               : ['isNotMissing', 'didTestingPassEnough'].concat(extraTerms),
	}).then((searchResults) => {
		event.sender.send('gotExploreList', searchResults)
	}).catch((unknownError) => {
		// Shouldn't happen.  No idea
		// No need to return empty, this is not a pre-requisite for UI updates.
		logger.notice('ipcProcess', `Could not get "explore list" : ${unknownError}`)
	})
})




/*
  ______  _______ _______ _______ _____             _  _  _ _____ __   _ ______   _____  _  _  _
  |     \ |______    |    |_____|   |   |           |  |  |   |   | \  | |     \ |     | |  |  |
  |_____/ |______    |    |     | __|__ |_____      |__|__| __|__ |  \_| |_____/ |_____| |__|__|
                                                                                                
*/
let detailWindow = null

function openDetailWindow(thisModRecord) {
	if (detailWindow) {
		detailWindow.focus()
		return
	}

	detailWindow = new BrowserWindow({
		icon            : path.join(app.getAppPath(), 'build', 'icon.png'),
		width           : mcSettings.hasSync('detail_window_x') ? mcSettings.getSync('detail_window_x') : 800,
		height          : mcSettings.hasSync('detail_window_y') ? mcSettings.getSync('detail_window_y') : 500,
		title           : thisModRecord.title,
		minimizable     : false,
		maximizable     : true,
		fullscreenable  : false,
		autoHideMenuBar : !devDebug,
		webPreferences  : {
			nodeIntegration  : false,
			contextIsolation : true,
			preload          : path.join(app.getAppPath(), 'renderer', 'preload-detail.js'),
		},
	})

	if ( mcSettings.hasSync('detail_window_max') && mcSettings.getSync('detail_window_max') ) {
		detailWindow.maximize()
	}

	if ( !devDebug ) { detailWindow.removeMenu() }

	detailWindow.webContents.on('did-finish-load', async (event) => {
		const sendData = {
			total_games    : modList.activeArray,
			title          : thisModRecord.title,
			version        : thisModRecord.mod_version,
			filesize       : thisModRecord.fileSizeString,
			active_games   : thisModRecord.activeGames,
			used_games     : thisModRecord.usedGames,
			active_game    : thisModRecord.activeGame,
			used_game      : thisModRecord.usedGame,
			has_scripts    : thisModRecord.hasScripts,
			description    : thisModRecord.descDescription,
			store_items    : thisModRecord.countStoreItems,
			mod_author     : thisModRecord.mod_author,
			is_multiplayer : thisModRecord.isMultiplayer,
			date           : thisModRecord.date,
		}
		event.sender.send('mod-record', sendData)
		event.sender.send('trigger-i18n')

		thisModRecord.getIcon().then((iconData) => {
			event.sender.send('mod-icon', ( iconData === null || iconData === false ) ? null : iconData)
		}).catch((unknownError) => {
			// Shouldn't happen.  No idea
			logger.notice('ipcProcess', `Could not get "mod icon" : ${unknownError}`)
		})
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
	if (debugWindow) {
		debugWindow.focus()
		return
	}

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
			preload          : path.join(app.getAppPath(), 'renderer', 'preload-debug.js'),
		},
	})
	if ( !devDebug ) { debugWindow.removeMenu() }

	debugWindow.webContents.on('did-finish-load', (event) => {
		const logContents = logClass.toDisplayHTML
		event.sender.send('update-log', logContents)
		event.sender.send('trigger-i18n')
	})

	debugWindow.loadFile(path.join(app.getAppPath(), 'renderer', 'debug.html'))

	debugWindow.on('closed', () => {
		debugWindow = null
	})
}

ipcMain.on('openDebugLogContents', () => {
	openDebugWindow(logger)
})

ipcMain.on('getDebugLogContents', (event) => {
	const logContents = logger.toDisplayHTML
	event.sender.send('update-log', logContents)
})

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
   _____   ______ _______ _______ _______      _  _  _ _____ __   _ ______   _____  _  _  _
  |_____] |_____/ |______ |______ |______      |  |  |   |   | \  | |     \ |     | |  |  |
  |       |    \_ |______ |       ______|      |__|__| __|__ |  \_| |_____/ |_____| |__|__|
*/

let prefWindow = null

function openPrefWindow() {
	if (prefWindow) {
		prefWindow.focus()
		return
	}

	prefWindow = new BrowserWindow({
		icon            : path.join(app.getAppPath(), 'build', 'icon.png'),
		width           : 800,
		height          : 500,
		title           : myTranslator.syncStringLookup('user_pref_title_main'),
		minimizable     : false,
		fullscreenable  : false,
		autoHideMenuBar : !devDebug,
		webPreferences  : {
			nodeIntegration  : false,
			contextIsolation : true,
			preload          : path.join(app.getAppPath(), 'renderer', 'preload-pref.js'),
		},
	})
	if ( !devDebug ) { prefWindow.removeMenu() }

	prefWindow.webContents.on('did-finish-load', (event) => {
		event.sender.send(
			'got-pref-settings',
			mcSettings.getSync(),
			myTranslator.syncStringLookup('language_name')
		)
		event.sender.send('trigger-i18n')
	})

	prefWindow.loadFile(path.join(app.getAppPath(), 'renderer', 'prefs.html'))

	prefWindow.on('closed', () => {
		prefWindow = null
	})
}


app.whenReady().then(() => {
	globalShortcut.register('Alt+CommandOrControl+D', () => {
		openDebugWindow(logger)
	})

	workWidth = screen.getPrimaryDisplay().workAreaSize.width
	workHeight = screen.getPrimaryDisplay().workAreaSize.height

	createWindow()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	})
})

app.setAboutPanelOptions({
	applicationName    : 'FS19 Mod Checker',
	applicationVersion : mcDetail.version,
	copyright          : '(c) 2021 J.T.Sage',
	credits            : 'J.T.Sage <jtsage+datebox@gmail.com>',
	website            : 'https://github.com/jtsage/FS19_Mod_Checker',
	iconPath           : path.join(app.getAppPath(), 'build', 'icon.png'),
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})
