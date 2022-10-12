/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main Program



//const { app, Menu, BrowserWindow, ipcMain, globalShortcut, shell, dialog, screen } = require('electron')
const { app, BrowserWindow, ipcMain, globalShortcut, shell, dialog, screen } = require('electron')

// const { autoUpdater } = require('electron-updater')

const devDebug = true

// if (process.platform === 'win32') {
// 	autoUpdater.checkForUpdatesAndNotify()
// }

const path       = require('path')
const fs         = require('fs')
const glob       = require('glob')
const xml2js     = require('xml2js')

const userHome  = require('os').homedir()


const translator               = require('./lib/translate.js')
const { mcLogger }             = require('./lib/logger.js')
const { modFileChecker }       = require('./lib/single-mod-checker.js')
const mcDetail                 = require('./package.json')


const Store   = require('electron-store')
const mcStore = new Store()

const myTranslator     = new translator.translator(translator.getSystemLocale())
myTranslator.mcVersion = mcDetail.version


const logger = new mcLogger()


let modFolders    = new Set()
let modFoldersMap = {}
let modList       = {}
let modListCache  = {}
let countTotal    = 0
let countMods     = 0

let win          = null // Main window
let splash       = null // Splash screen
let confirmWin   = null // Confirmation Window
let foldersDirty = true
let quickRescan  = false

let workWidth  = 0
let workHeight = 0

let gameSettings    = mcStore.get('game_settings', path.join(userHome, 'Documents', 'My Games', 'FarmingSimulator2022', 'gameSettings.xml'))
let gameSettingsXML = null
let overrideFolder  = null
let overrideIndex   = '999'
let overrideActive  = null


function parseSettings(newSetting = false) {
	const XMLOptions      = {strict : true, async : false, normalizeTags : false }
	const strictXMLParser = new xml2js.Parser(XMLOptions)
	const XMLString       = fs.readFileSync(gameSettings, 'utf8')
	
	strictXMLParser.parseString(XMLString, (err, result) => {
		gameSettingsXML = result
		overrideFolder = gameSettingsXML.gameSettings.modsDirectoryOverride[0].$.directory
		overrideActive = gameSettingsXML.gameSettings.modsDirectoryOverride[0].$.active
	})

	if ( overrideActive === 'false' || overrideActive === false ) {
		overrideIndex = '0'
	} else {
		overrideIndex = '999'
		Object.keys(modFoldersMap).forEach((cleanName) => {
			if ( modFoldersMap[cleanName] === overrideFolder ) {
				overrideIndex = cleanName
			}
		})
	}

	if ( newSetting !== false ) {
		win.webContents.send('fromMain_showListSet')
		if ( newSetting === 'DISABLE' ) {
			gameSettingsXML.gameSettings.modsDirectoryOverride[0].$.active    = false
		} else {
			gameSettingsXML.gameSettings.modsDirectoryOverride[0].$.active    = true
			gameSettingsXML.gameSettings.modsDirectoryOverride[0].$.directory = newSetting
		}

		const builder   = new xml2js.Builder({
			xmldec : {
				'version' : '1.0', 'encoding' : 'UTF-8', 'standalone' : false,
			},
			renderOpts : {
				'pretty' : true, 'indent' : '    ', 'newline' : '\n',
			},
		})
		let   outputXML = builder.buildObject(gameSettingsXML)

		outputXML = outputXML.replace('<ingameMapFruitFilter/>', '<ingameMapFruitFilter></ingameMapFruitFilter>')

		try {
			fs.writeFileSync(gameSettings, outputXML)
		} catch (e) {
			logger.fileError('gameSettings', `Could not write game settings ${e}`)
		}
		setTimeout(() => { win.webContents.send('fromMain_hideListSet') }, 1500)
	}
}

function createWindow () {
	win = new BrowserWindow({
		icon            : path.join(app.getAppPath(), 'build', 'icon.png'),
		width           : mcStore.get('main_window_x', 1000),
		height          : mcStore.get('main_window_y', 700),
		show            : devDebug,
		autoHideMenuBar : !devDebug,
		webPreferences  : {
			nodeIntegration  : false,
			contextIsolation : true,
			preload          : path.join(app.getAppPath(), 'renderer', 'preload', 'preload-mainWindow.js'),
		},
	})



	if ( !devDebug ) {
		splash = new BrowserWindow({
			width           : 500,
			height          : 250,
			transparent     : true,
			frame           : false,
			alwaysOnTop     : true,
			autoHideMenuBar : true,
		})
		
		const pos_left = (workWidth / 2)  - ( 500 / 2 )
		const pos_top  = (workHeight / 2) - ( 250 / 2 )

		splash.setPosition(pos_left, pos_top)

		splash.loadURL(`file://${path.join(app.getAppPath(), 'renderer', 'splash.html')}?version=${mcDetail.version}`)

		win.removeMenu()

		win.once('ready-to-show', () => {
			setTimeout(() => {
				win.show()
				splash.destroy()
			}, 1500)
		})
	}



	if ( mcStore.has('main_window_max') && mcStore.get('main_window_max') ) {
		win.maximize()
	}

	win.loadFile(path.join(app.getAppPath(), 'renderer', 'main.html'))

	
	win.webContents.on('did-finish-load', () => {
		const showCount = setInterval(() => {
			if ( win.isVisible() ) {
				clearInterval(showCount)
				if ( mcStore.has('modFolders') ) {
					modFolders   = new Set(mcStore.get('modFolders'))
					foldersDirty = true
					setTimeout(() => { processModFolders() }, 1500)
				}
				win.webContents.openDevTools()
			}
		}, 250)


		myTranslator.stringLookup('app_name').then((title) => {
			win.title = title
		})
	})
	win.webContents.setWindowOpenHandler(({ url }) => {
		require('electron').shell.openExternal(url)
		return { action : 'deny' }
	})
	
}

ipcMain.on('toMain_makeInactive', () => { parseSettings('DISABLE') })
ipcMain.on('toMain_makeActive', (event, newList) => { parseSettings(modFoldersMap[newList]) })

ipcMain.on('toMain_openMods', (event, mods) => {
	const thisMod = modIdToRecord(mods[0])

	if ( thisMod !== null ) { shell.showItemInFolder(thisMod.fileDetail.fullPath) }
})

ipcMain.on('toMain_realFileMove', (event, fileMap) => { copyORmove('move', fileMap) })
ipcMain.on('toMain_realFileCopy', (event, fileMap) => { copyORmove('copy', fileMap) })
ipcMain.on('toMain_realFileDelete', async (event, collection, uuid) => {
	const foundMod = modIdToRecord(`${collection}--${uuid}`)
	await shell.trashItem(foundMod.fileDetail.fullPath)
	foldersDirty = true
	quickRescan  = true
	confirmWin.close()
	processModFolders()
})



function copyORmove(type, fileMap) {
	const fullPathMap = []

	fileMap.forEach((file) => {
		fullPathMap.push([file[2], file[2].replaceAll(modFoldersMap[file[1]], modFoldersMap[file[0]])])
	})

	confirmWin.close()
	win.focus()

	foldersDirty = true
	quickRescan  = true

	incrementTotal(0, true)
	incrementDone(0, true)

	incrementTotal(fullPathMap.length)

	win.webContents.send('fromMain_showLoading')

	setTimeout(() => {
		fullPathMap.forEach((file) => {
			try {
				if ( type === 'copy' ) {
					fs.copyFileSync(file[0], file[1])
				} else {
					fs.renameSync(file[0], file[1])
				}
			} catch (e) {
				logger.fileError(`${type}File`, `Could not ${type} file : ${e}`)
			}
			incrementDone()
		})
		
		
		processModFolders()
	}, 1000)
}

ipcMain.on('toMain_deleteMods', (event, mods) => {
	const thisMod = modIdToRecord(mods[0])
	if ( thisMod !== null ) { openConfirm('delete', thisMod, mods) }
})

ipcMain.on('toMain_moveMods', (event, mods) => {
	const theseMods = []
	mods.forEach((inMod) => { theseMods.push(modIdToRecord(inMod)) })
	if ( theseMods.length > 0 ) { openConfirm('move', theseMods, mods) }
})

ipcMain.on('toMain_copyMods', (event, mods) => {
	const theseMods = []
	mods.forEach((inMod) => { theseMods.push(modIdToRecord(inMod)) })
	if ( theseMods.length > 0 ) { openConfirm('copy', theseMods, mods) }
})


function openConfirm(type, modRecords, origList) {
	if (confirmWin) { confirmWin.focus(); return }

	const file_HTML  = `confirm-file${type.charAt(0).toUpperCase()}${type.slice(1)}.html`
	const file_JS    = `preload-confirm${type.charAt(0).toUpperCase()}${type.slice(1)}.js`
	const collection = origList[0].split('--')[0]

	confirmWin = new BrowserWindow({
		width           : 750,
		height          : 500,
		alwaysOnTop     : true,
		title           : myTranslator.syncStringLookup('app_name'),
		autoHideMenuBar : !devDebug,
		webPreferences  : {
			nodeIntegration  : false,
			contextIsolation : true,
			preload          : path.join(app.getAppPath(), 'renderer', 'preload', file_JS),
		},
	})

	const pos_left = (workWidth / 2)  - ( 750 / 2 )
	const pos_top  = (workHeight / 2) - ( 500 / 2 )

	confirmWin.setPosition(pos_left, pos_top)

	if ( !devDebug ) { confirmWin.removeMenu() }

	confirmWin.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_confirmList', modRecords, modList, modFoldersMap, collection)
	})

	confirmWin.loadFile(path.join(app.getAppPath(), 'renderer', file_HTML))

	confirmWin.on('closed', () => { confirmWin = null })
}




ipcMain.on('toMain_addFolder', () => {
	const homedir  = require('os').homedir()
	
	dialog.showOpenDialog(win, {
		properties  : ['openDirectory'],
		defaultPath : homedir,
	}).then((result) => {
		if ( result.canceled ) {
			logger.notice('folderList', 'Add folder :: canceled')
		} else {
			let alreadyExists = false
			modFolders.forEach((thisPath) => {
				if ( path.relative(thisPath, result.filePaths[0]) === '' ) { alreadyExists = true }
			})
			if ( ! alreadyExists ) {
				modFolders.add(result.filePaths[0])
				foldersDirty = true
			}

			mcStore.set('modFolders', Array.from(modFolders))
			processModFolders(result.filePaths[0])
		}
	}).catch((unknownError) => {
		// Read of file failed? Permissions issue maybe?  Not sure.
		logger.notice('folderList', `Could not read specified add folder : ${unknownError}`)
	})
})


let folderWindow = null

ipcMain.on('toMain_editFolders', () => { openFolderWindow() })

function openFolderWindow() {
	if (folderWindow) { folderWindow.focus(); return }

	folderWindow = new BrowserWindow({
		icon            : path.join(app.getAppPath(), 'build', 'icon.png'),
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
			preload          : path.join(app.getAppPath(), 'renderer', 'preload', 'preload-folderWindow.js'),
		},
	})

	if ( mcStore.has('detail_window_max') && mcStore.get('detail_window_max') ) { folderWindow.maximize() }

	if ( !devDebug ) { folderWindow.removeMenu() }

	folderWindow.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_getFolders', modList)
	})

	folderWindow.loadFile(path.join(app.getAppPath(), 'renderer', 'folders.html'))

	folderWindow.on('closed', () => {
		folderWindow = null
		processModFolders()
	})
}

ipcMain.on('toMain_openFolder', (event, folder) => { shell.openPath(folder) })
ipcMain.on('toMain_removeFolder', (event, folder) => {
	if ( modFolders.delete(folder) ) {
		logger.notice('folderManager', `Folder removed from list ${folder}`)
		mcStore.set('modFolders', Array.from(modFolders))
		foldersDirty = true
	} else {
		logger.notice('folderManager', `Folder NOT removed from list ${folder}`)
	}
})



ipcMain.on('toMain_langList_change', (event, lang) => {
	myTranslator.currentLocale = lang
	event.sender.send('fromMain_l10n_refresh')
})

ipcMain.on('toMain_langList_send', (event) => {
	myTranslator.getLangList().then((langList) => {
		event.sender.send('fromMain_langList_return', langList, myTranslator.deferCurrentLocale())
	})
})

ipcMain.on('toMain_getText_send', (event, l10nSet) => {
	l10nSet.forEach((l10nEntry) => {
		if ( l10nEntry === 'app_version' ) {
			event.sender.send('fromMain_getText_return', [l10nEntry, mcDetail.version])
		} else {
			myTranslator.stringLookup(l10nEntry).then((text) => {
				event.sender.send('fromMain_getText_return', [l10nEntry, text])
			})
		}
	})
})





let detailWindow = null

ipcMain.on('toMain_openModDetail', (event, thisMod) => {
	const thisModParts  = thisMod.split('--')
	let   thisModDetail = null
	let   foundMod      = false

	try {
		modList[thisModParts[0]].mods.forEach((checkMod) => {
			if ( !foundMod && checkMod.uuid === thisModParts[1] ) {
				foundMod      = true
				thisModDetail = checkMod
			}
		})
	} catch (e) {
		this.log.info('detail', `Request for ${thisMod} failed: ${e}`)
	}
	if ( thisModDetail !== null ) {
		openDetailWindow(thisModDetail)
	}
})


function openDetailWindow(thisModRecord) {
	if (detailWindow) { detailWindow.focus(); return }

	thisModRecord.populateL10n()
	thisModRecord.populateIcon()
	thisModRecord.currentLocale = translator.currentLocale

	detailWindow = new BrowserWindow({
		icon            : path.join(app.getAppPath(), 'build', 'icon.png'),
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
			preload          : path.join(app.getAppPath(), 'renderer', 'preload', 'preload-detailWindow.js'),
		},
	})

	if ( mcStore.has('detail_window_max') && mcStore.get('detail_window_max') ) {
		detailWindow.maximize()
	}

	if ( !devDebug ) { detailWindow.removeMenu() }

	detailWindow.webContents.on('did-finish-load', async (event) => {
		event.sender.send('fromMain_modRecord', thisModRecord)
	})

	detailWindow.loadFile(path.join(app.getAppPath(), 'renderer', 'detail.html'))

	detailWindow.on('closed', () => { detailWindow = null })
}










let debugWindow = null

function openDebugWindow(logClass) {
	if (debugWindow) { debugWindow.focus(); return }

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
			preload          : path.join(app.getAppPath(), 'renderer', 'preload', 'preload-debugWindow.js'),
		},
	})
	if ( !devDebug ) { debugWindow.removeMenu() }

	debugWindow.webContents.on('did-finish-load', (event) => {
		const logContents = logClass.toDisplayHTML
		event.sender.send('update-log', logContents)
	})

	debugWindow.loadFile(path.join(app.getAppPath(), 'renderer', 'debug.html'))

	debugWindow.on('closed', () => { debugWindow = null })
}

ipcMain.on('openDebugLogContents', () => { openDebugWindow(logger) })
ipcMain.on('getDebugLogContents',  (event) => { event.sender.send('update-log', logger.toDisplayHTML) })
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

ipcMain.on('toMain_homeDirRevamp', (event, thisPath) => {
	event.returnValue = thisPath.replaceAll(userHome, '~')
})








// ipcMain.on('askOpenPreferencesWindow', () => {
// 	openPrefWindow()
// })

// ipcMain.on('setPreference', (event, settingName, settingValue) => {
// 	if ( settingName === 'lock_lang') {
// 		if ( settingValue === true ) {
// 			mcStore.set('force_lang', myTranslator.currentLocale)
// 			mcStore.set('lock_lang', true)
// 		} else {
// 			mcStore.delete('force_lang')
// 			mcStore.set('lock_lang', false)
// 		}
// 	} else {
// 		mcStore.set(settingName, settingValue)
// 	}
// })

// ipcMain.on('refreshPreferences', (event) => {
// 	event.sender.send(
// 		'got-pref-settings',
// 		mcStore.store,
// 		myTranslator.syncStringLookup('language_name')
// 	)
// })

// function openPrefWindow() {
// 	if (prefWindow) {
// 		prefWindow.focus()
// 		return
// 	}

// 	prefWindow = new BrowserWindow({
// 		icon            : path.join(app.getAppPath(), 'build', 'icon.png'),
// 		width           : 800,
// 		height          : 500,
// 		title           : myTranslator.syncStringLookup('user_pref_title_main'),
// 		minimizable     : false,
// 		fullscreenable  : false,
// 		autoHideMenuBar : !devDebug,
// 		webPreferences  : {
// 			nodeIntegration  : false,
// 			contextIsolation : true,
// 			preload          : path.join(app.getAppPath(), 'renderer', 'preload-pref.js'),
// 		},
// 	})
// 	if ( !devDebug ) { prefWindow.removeMenu() }

// 	prefWindow.webContents.on('did-finish-load', (event) => {
// 		event.sender.send(
// 			'got-pref-settings',
// 			mcStore.store,
// 			myTranslator.syncStringLookup('language_name')
// 		)
// 		event.sender.send('trigger-i18n')
// 	})

// 	prefWindow.loadFile(path.join(app.getAppPath(), 'renderer', 'prefs.html'))

// 	prefWindow.on('closed', () => {
// 		prefWindow = null
// 	})
// }


function incrementTotal(amount, reset = false) {
	if ( reset ) {
		countTotal = 0
	} else {
		countTotal += amount
	}
	win.webContents.send('fromMain_loadingTotal', countTotal)
}
function incrementDone(amount = 1, reset = false) {
	if ( reset ) {
		countMods = 0
	} else {
		countMods += amount
	}
	win.webContents.send('fromMain_loadingDone', countMods)
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

function modCacheSearch(collection, path) {
	let foundMod = null
	modListCache[collection].mods.forEach((mod) => {
		if ( foundMod === null && mod.fileDetail.fullPath === path ) {
			foundMod = mod
		}
	})
	return foundMod
}


function processModFolders(newFolder = false) {
	if ( quickRescan ) { modListCache = modList }
	if ( !foldersDirty ) { return }
	win.webContents.send('fromMain_showLoading')

	incrementTotal(0, true)
	incrementDone(0, true)

	if ( newFolder === false ) { modList = {}; modFoldersMap = {}}

	// Cleaner for no-longer existing folders.
	modFolders.forEach((folder) => { if ( ! fs.existsSync(folder) ) { modFolders.delete(folder) } })
	mcStore.set('modFolders', Array.from(modFolders))

	modFolders.forEach((folder) => {
		
		const cleanName = folder.replaceAll('\\', '-').replaceAll(':', '').replaceAll(' ', '_')
		const shortName = path.basename(folder)
		if ( folder === newFolder || newFolder === false ) {
			modFoldersMap[cleanName] = folder
			modList[cleanName] = { name : shortName, fullPath : folder, mods : [] }

			const folderContents = fs.readdirSync(folder, {withFileTypes : true})
			incrementTotal(folderContents.length)

			folderContents.forEach((thisFile) => {
				let skipEntry = false
				if ( quickRescan ) {
					const thisMod = modCacheSearch(cleanName, path.join(folder, thisFile.name))
					if ( thisMod !== null ) {
						modList[cleanName].mods.push(thisMod)
						skipEntry = true
					}
				}
				if ( !skipEntry ) {
					let isFolder = false
					let date     = null
					let size     = 0
					
					if ( thisFile.isSymbolicLink() ) {
						const thisSymLink     = fs.readlinkSync(path.join(folder, thisFile.name))
						const thisSymLinkStat = fs.lstatSync(path.join(folder, thisSymLink))
						isFolder = thisSymLinkStat.isDirectory()

						if ( ! isFolder ) {
							size = thisSymLinkStat.size
						}
						date     = thisSymLinkStat.ctime
					} else {
						isFolder = thisFile.isDirectory()
					}

					if ( ! thisFile.isSymbolicLink() ) {
						const theseStats = fs.statSync(path.join(folder, thisFile.name))
						if ( ! isFolder ) { size = theseStats.size }
						date = theseStats.ctime
					}
					if ( isFolder ) {
						let bytes = 0
						// BUG: with a *lot* of folders, this is going to be a pretty big performance hit.
						glob.sync('**', { cwd : path.join(folder, thisFile.name) }).forEach((file) => {
							try {
								const stats = fs.statSync(path.join(folder, thisFile.name, file))
								if ( stats.isFile() ) { bytes += stats.size }
							} catch { /* Do Nothing if we can't read it. */ }
						})
						size = bytes
					}

					modList[cleanName].mods.push( new modFileChecker(
						path.join(folder, thisFile.name),
						isFolder,
						size,
						date,
						logger,
						myTranslator.deferCurrentLocale
					))
				}
				incrementDone()
			})
		}
	})
	quickRescan  = false
	foldersDirty = false
	modListCache = {}
	parseSettings()
	win.webContents.send(
		'fromMain_modList',
		modList,
		[myTranslator.syncStringLookup('override_disabled'), myTranslator.syncStringLookup('override_unknown')],
		overrideIndex
	)
	setTimeout(() => { win.webContents.send('fromMain_hideLoading') }, 1000)
}









app.whenReady().then(() => {
	globalShortcut.register('Alt+CommandOrControl+D', () => { openDebugWindow(logger) })

	workWidth  = screen.getPrimaryDisplay().size.width
	workHeight = screen.getPrimaryDisplay().size.height
	
	if ( mcStore.has('force_lang') && mcStore.has('lock_lang') ) {
		// If language is locked, switch to it.
		myTranslator.currentLocale = mcStore.get('force_lang')
	}

	createWindow()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) { createWindow() }
	})
})

app.setAboutPanelOptions({
	applicationName    : 'FS Mod Assist',
	applicationVersion : mcDetail.version,
	copyright          : '(c) 2022-present FSG Modding',
	credits            : 'J.T.Sage <jtsage+datebox@gmail.com>',
	website            : 'https://github.com/FSGModding/FSG_Mod_Assistant',
	iconPath           : path.join(app.getAppPath(), 'build', 'icon.png'),
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') { app.quit() }
})
