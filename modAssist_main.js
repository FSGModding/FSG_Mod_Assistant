/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */
// Main Program

const { app, BrowserWindow, ipcMain, shell, dialog, Menu, Tray, net, clipboard, nativeImage } = require('electron')

const isPortable = typeof process.env.PORTABLE_EXECUTABLE_DIR !== 'undefined'
const gotTheLock = app.requestSingleInstanceLock()

if ( !gotTheLock ) { app.quit() }

const userHome         = app.getPath('home')
const mainProcessFlags = {
	devControls : {
		13 : false,
		15 : false,
		17 : false,
		19 : false,
		22 : false,
	},

	bounceGameLog   : false,
	dlProgress      : false,
	dlRequest       : null,
	firstMin        : true,
	foldersDirty    : true,
	gameSettings    : {},
	intervalFile    : null,
	intervalLoad    : null,
	intervalModHub  : null,
	intervalUpdate  : null,
	lastFolderLoc   : null,
	modFolders      : new Set(),
	pathBestGuess   : userHome,
	pathGameGuess   : '',
	processRunning  : false,
	watchGameLog    : null,
	watchModFolder  : [],
	
}

const { autoUpdater } = require('electron-updater')
const { maIPC, ma_logger, translator, ddsDecoder } = require('./lib/modUtilLib')
const { EventEmitter }           = require('events')

const path             = require('path')
const fs               = require('fs')

const log              = new ma_logger('modAssist', app, 'assist.log', gotTheLock)

maIPC.log = log

log.log.info(`ModAssist Logger    : ${app.getVersion()}`)
log.log.info(` - Node.js Version  : ${process.versions.node}`)
log.log.info(` - Electron Version : ${process.versions.electron}`)
log.log.info(` - Chrome Version   : ${process.versions.chrome}`)

const myTranslator     = new translator(null, !app.isPackaged)
myTranslator.mcVersion = app.getVersion()

maIPC.l10n = myTranslator

class queueEmitter extends EventEmitter {}
const modQueueRunner = new queueEmitter()

const win             = new (require('./lib/modAssist_window_lib.js')).windowLib(
	{
		refreshClientModList : refreshClientModList,
		processModFolders    : processModFolders,
		readGameLog          : readGameLog,
	},
	mainProcessFlags
)

log.dangerCallBack = () => { win.toggleMainDangerFlag() }

const skipCache     = false && !(app.isPackaged)
const crashLog      = path.join(app.getPath('userData'), 'crash.log')

function handleUnhandled(type, err, origin) {
	const rightNow = new Date()
	fs.appendFileSync(
		crashLog,
		`${type} Timestamp : ${rightNow.toISOString()}\n\nCaught ${type}: ${err}\n\nOrigin: ${origin}\n\n${err.stack}`
	)
	if ( !err.message.startsWith('net::ERR_') ) {
		if ( app.isReady() ) {
			dialog.showMessageBoxSync(null, {
				message : `Caught ${type}: ${err}\n\nOrigin: ${origin}\n\n${err.stack}\n\n\nCan't Continue, exiting now!\n\nTo send file, please see ${crashLog}`,
				title   : `Uncaught ${type} - Quitting`,
				type    : 'error',
			})
			app.quit()
		} else {
			app.exit()
		}
	} else {
		log.log.debug(`Network error: ${err}`, `net-error-${type}`)
	}
}
process.on('uncaughtException',  (err, origin) => { handleUnhandled('exception', err, origin) })
process.on('unhandledRejection', (err, origin) => { handleUnhandled('rejection', err, origin) })


if ( process.platform === 'win32' && app.isPackaged && gotTheLock && !isPortable ) {
	const updateLog    = log.group('auto-update')
	autoUpdater.logger = updateLog
	autoUpdater.on('update-checking-for-update', () => { updateLog.debug('Checking for update', 'auto-update') })
	autoUpdater.on('update-available',           () => { updateLog.info('Update Available', 'auto-update') })
	autoUpdater.on('update-not-available',       () => { updateLog.debug('No Update Available', 'auto-update') })

	autoUpdater.on('error', (message) => { updateLog.warning(`Updater Failed: ${message}`, 'auto-update') })

	autoUpdater.on('update-downloaded', () => {
		clearInterval(mainProcessFlags.intervalUpdate)
		updateLog.info('Update Downloaded and Ready', 'auto-update')
		modCollect.updateIsReady = true
		processModFolders()

		const bubbleOpts = {
			icon    : trayIcon,
			title   : myTranslator.syncStringLookup('app_name'),
			content : myTranslator.syncStringLookup('update_ready__title'),
		}

		if ( win.tray && !win.tray.isDestroyed() ) {
			win.tray.displayBalloon(bubbleOpts)
		}
	})

	autoUpdater.checkForUpdatesAndNotify().catch((err) => updateLog.warning(`Updater Issue: ${err}`, 'auto-update'))

	mainProcessFlags.intervalUpdate = setInterval(() => {
		autoUpdater.checkForUpdatesAndNotify().catch((err) => updateLog.warning(`Updater Issue: ${err}`, 'auto-update'))
	}, ( 30 * 60 * 1000))
}

const fxml          = require('fast-xml-parser')
const hubURLCombo   = 'https://jtsage.dev/modHubData22_combo.json'
const modHubURL     = 'https://www.farming-simulator.com/mod.php?mod_id='
const trayIcon      = !app.isPackaged
	? path.join(app.getAppPath(), 'renderer', 'img', 'icon.ico')
	: path.join(process.resourcesPath, 'app.asar', 'renderer', 'img', 'icon.ico')
const convertPath   = !app.isPackaged
	? path.join(app.getAppPath(), 'texconv.exe')
	: path.join(process.resourcesPath, '..', 'texconv.exe')

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

function guessPath(paths, file = '') {
	for ( const testPath of paths ) { if ( fs.existsSync(path.join(testPath, file)) ) { return path.join(testPath, file) } } return ''
}

mainProcessFlags.pathGameGuess = guessPath(gameGuesses, gameExeName)
mainProcessFlags.pathBestGuess = guessPath(pathGuesses)

const { modFileCollection, saveFileChecker, savegameTrack } = require('./lib/modCheckLib.js')
maIPC.decode     = new ddsDecoder(convertPath, app.getPath('temp'))
maIPC.decodePath = convertPath

const settingDefault = new (require('./lib/modAssist_window_lib.js')).defaultSettings(mainProcessFlags)

const Store   = require('electron-store')
const unzip   = require('unzip-stream')
const makeZip = require('archiver')

const mcStore = new Store({schema : settingDefault.defaults, clearInvalidConfig : true })
const maCache = new Store({name : 'mod_cache', clearInvalidConfig : true})
const mdCache = new Store({name : 'mod_detail_cache', clearInvalidConfig : true})
const modNote = new Store({name : 'col_notes', clearInvalidConfig : true})
const modSite = new Store({name : 'mod_source_site', migrations : settingDefault.migrateSite, clearInvalidConfig : true})

maIPC.modCache = maCache
maIPC.notes    = modNote
maIPC.settings = mcStore
maIPC.sites    = modSite

win.loadSettings()

const gameSetOverride = {
	folder : null,
	index  : 999,
	active : false,
}

/** Upgrade Cache Version Here */

const [appVerMajor, appVerMinor] = mcStore.get('cache_version').split('.').map((x) => parseInt(x))
const updateMajor  = 2
const updateMinor  = 4
let updateRequired = false

if ( appVerMajor < updateMajor ) { updateRequired = true }
if ( !updateRequired && appVerMajor === updateMajor && appVerMinor < updateMinor ) { updateRequired = true }

if ( updateRequired ) {
	log.log.warning('Invalid Mod Cache (old), resetting.', 'mod-cache')
	//maCache.clear()
	log.log.info('Mod Cache Cleared', 'mod-cache')
} else {
	log.log.debug('Mod Cache Version Good', 'mod-cache')
}

mcStore.set('cache_version', app.getVersion())
/** END: Upgrade Cache Version Here */

/** Expire old details (1 week) */
const detailCache = mdCache.store
const oneWeek     = Date.now() - ( 1000 * 60 * 60 * 24 * 7)

for ( const uuidKey in detailCache ) {
	if ( Date.parse(detailCache[uuidKey].date) < oneWeek ) {
		delete detailCache[uuidKey]
	}
}
mdCache.store = detailCache
/** END: Expire old details (1 week) */



const modCollect = new modFileCollection( app.getPath('home'), modQueueRunner, skipCache )

win.modCollect = modCollect

/*  ____  ____   ___ 
   (_  _)(  _ \ / __)
    _)(_  )___/( (__ 
   (____)(__)   \___) */

ipcMain.on('toMain_sendMainToTray', () => {
	if ( win.tray ) {
		if ( mainProcessFlags.firstMin ) {
			const bubbleOpts = {
				icon    : trayIcon,
				title   : myTranslator.syncStringLookup('minimize_message_title'),
				content : myTranslator.syncStringLookup('minimize_message'),
			}

			win.tray.displayBalloon(bubbleOpts)

			setTimeout(() => {
				if ( win.tray && !win.tray.isDestroyed() ) { win.tray.removeBalloon() }
			}, 5000)
		}
		
		mainProcessFlags.firstMin = false
		win.win.main.hide()
	}
})
ipcMain.on('toMain_runUpdateInstall', () => {
	if ( modCollect.updateIsReady ) {
		autoUpdater.quitAndInstall()
	} else {
		log.log.debug('Auto-Update Called Before Ready.', 'auto-update')
	}
})
ipcMain.on('toMain_populateClipboard', (_, text) => { clipboard.writeText(text, 'selection') })

/** File operation buttons */
ipcMain.on('toMain_makeInactive', () => { parseSettings({ disable : true }) })
ipcMain.on('toMain_makeActive',   (_, newList) => { newSettingsFile(newList) })
ipcMain.on('toMain_openMods',     (_, mods)    => {
	const thisFolderAndMod     = modCollect.modColUUIDToFolderAndRecord(mods[0])

	if ( thisFolderAndMod.mod !== null ) {
		shell.showItemInFolder(path.join(thisFolderAndMod.folder, path.basename(thisFolderAndMod.mod.fileDetail.fullPath)))
	}
})
ipcMain.on('toMain_openHelpSite', () => { shell.openExternal('https://fsgmodding.github.io/FSG_Mod_Assistant/') })
ipcMain.on('toMain_openHub',      (_, mods) => {
	const thisMod   = modCollect.modColUUIDToRecord(mods[0])

	if ( thisMod.modHub.id !== null ) {
		shell.openExternal(`${modHubURL}${thisMod.modHub.id}`)
	}
})
ipcMain.on('toMain_openExt',     (_, mods) => {
	const thisMod     = modCollect.modColUUIDToRecord(mods[0])
	const thisModSite = modSite.get(thisMod.fileDetail.shortName, null)

	if ( thisModSite !== null ) { shell.openExternal(thisModSite) }
})

ipcMain.on('toMain_copyFavorites',  () => {
	const sourceCollections      = []
	const destinationCollections = []
	const sourceFiles            = []

	const multi_version   = mcStore.get('multi_version')
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
		win.createNamedWindow(
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
		win.createNamedWindow(windowName, {
			records : ( modRecords === null ) ? modCollect.modColUUIDsToRecords(modIDS) : modRecords,
			originCollectKey : modIDS[0].split('--')[0],
		})
	}
}

ipcMain.on('toMain_deleteMods',     (_, mods) => { handleCopyMoveDelete('confirmDelete', mods) })
ipcMain.on('toMain_moveMods',       (_, mods) => { handleCopyMoveDelete('confirmMove', mods) })
ipcMain.on('toMain_copyMods',       (_, mods) => { handleCopyMoveDelete('confirmCopy', mods) })
ipcMain.on('toMain_moveMultiMods',  (_, mods) => { handleCopyMoveDelete('confirmMultiMove', mods) })
ipcMain.on('toMain_copyMultiMods',  (_, mods) => { handleCopyMoveDelete('confirmMultiCopy', mods) })

ipcMain.on('toMain_realFileDelete',    (_, fileMap) => { fileOperation('delete', fileMap) })
ipcMain.on('toMain_realFileMove',      (_, fileMap) => { fileOperation('move', fileMap) })
ipcMain.on('toMain_realFileCopy',      (_, fileMap) => { fileOperation('copy', fileMap) })
ipcMain.on('toMain_realMultiFileMove', (_, fileMap) => { fileOperation('move_multi', fileMap) })
ipcMain.on('toMain_realMultiFileCopy', (_, fileMap) => { fileOperation('copy_multi', fileMap) })
ipcMain.on('toMain_realFileImport',    (_, fileMap) => { fileOperation('import', fileMap, 'import') })
ipcMain.on('toMain_realFileVerCP',     (_, fileMap) => {
	fileOperation('copy', fileMap, 'resolve')
	setTimeout(() => { win.sendModList({}, 'fromMain_modList', 'version', false ) }, 1500)
})
/** END: File operation buttons */


/** Folder Window Operation */
ipcMain.on('toMain_addFolder', () => {
	dialog.showOpenDialog(win.win.main, {
		properties  : ['openDirectory'],
		defaultPath : mainProcessFlags.lastFolderLoc ?? userHome,
	}).then((result) => { if ( !result.canceled ) {
		const potentialFolder = result.filePaths[0]

		mainProcessFlags.lastFolderLoc = path.resolve(path.join(potentialFolder, '..'))

		for ( const thisPath of mainProcessFlags.modFolders ) {
			if ( path.relative(thisPath, potentialFolder) === '' ) {
				log.log.notice('Add folder :: canceled, already exists in list', 'folder-opts')
				return
			}
		}

		const thisFolderCollectKey = modCollect.getFolderHash(potentialFolder)

		mainProcessFlags.modFolders.add(potentialFolder)
		mainProcessFlags.foldersDirty = true

		mcStore.set('modFolders', Array.from(mainProcessFlags.modFolders))
		modNote.set(`${thisFolderCollectKey}.notes_version`, mcStore.get('game_version'))
		modNote.set(`${thisFolderCollectKey}.notes_add_date`, new Date())
		processModFolders()
	}}).catch((unknownError) => {
		log.log.danger(`Could not read specified add folder : ${unknownError}`, 'folder-opts')
	})
})
ipcMain.on('toMain_editFolders',    () => { win.createNamedWindow('folder') })
ipcMain.on('toMain_refreshFolders', () => { processModFolders(true) })
ipcMain.on('toMain_openFolder',     (_, collectKey) => { shell.openPath(modCollect.mapCollectionToFolder(collectKey)) })
ipcMain.on('toMain_removeFolder',   (_, collectKey) => {
	const folder = modCollect.mapCollectionToFolder(collectKey)
	if ( mainProcessFlags.modFolders.delete(folder) ) {
		log.log.notice(`Folder removed from tracking ${folder}`, 'folder-opts')
		mcStore.set('modFolders', Array.from(mainProcessFlags.modFolders))

		modCollect.removeCollection(collectKey)
		
		win.sendModList({},	'fromMain_getFolders', 'folder', false )

		mainProcessFlags.foldersDirty = true
		win.toggleMainDirtyFlag(mainProcessFlags.foldersDirty)
	} else {
		log.log.warning(`Folder NOT removed from tracking ${folder}`, 'folder-opts')
	}
})
ipcMain.on('toMain_reorderFolder', (_, from, to) => {
	const newOrder    = Array.from(mainProcessFlags.modFolders)
	const item        = newOrder.splice(from, 1)[0]

	newOrder.splice(to, 0, item)

	const newSetOrder = newOrder.map((thisPath) => modCollect.mapFolderToCollection(thisPath))

	mainProcessFlags.modFolders   = new Set(newOrder)
	modCollect.newCollectionOrder = new Set(newSetOrder)

	mcStore.set('modFolders', Array.from(mainProcessFlags.modFolders))

	win.sendModList({},	'fromMain_getFolders', 'folder', false )
	mainProcessFlags.foldersDirty = true
	win.toggleMainDirtyFlag(mainProcessFlags.foldersDirty)
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

	mainProcessFlags.modFolders   = newModFolders
	modCollect.newCollectionOrder = newModSetOrder

	mcStore.set('modFolders', Array.from(mainProcessFlags.modFolders))

	win.sendModList({},	'fromMain_getFolders', 'folder', false )
	mainProcessFlags.foldersDirty = true
	win.toggleMainDirtyFlag(mainProcessFlags.foldersDirty)
})
ipcMain.on('toMain_dropFolder', (_, newFolder) => {
	if ( ! mainProcessFlags.modFolders.has(newFolder) ) {
		const thisFolderCollectKey = modCollect.getFolderHash(newFolder)

		mainProcessFlags.modFolders.add(newFolder)
		mcStore.set('modFolders', Array.from(mainProcessFlags.modFolders))
		modNote.set(`${thisFolderCollectKey}.notes_version`, mcStore.get('game_version'))
		processModFolders(true)
	} else {
		win.doDialogBox('main', {
			type        : 'error',
			messageL10n : 'drop_folder_exists',
		})
	}
})
ipcMain.on('toMain_dropFiles', (_, files) => { win.createNamedWindow('import', { files : files }) })
/** END: Folder Window Operation */

/** Logging Operation */
ipcMain.on('toMain_log', (_, level, process, text) => { log.log[level](text, process) })
/** END: Logging Operation */

/** l10n Operation */
ipcMain.on('toMain_langList_change', (_, lang) => {
	myTranslator.currentLocale = lang

	mcStore.set('force_lang', myTranslator.currentLocale)

	win.refreshL10n(myTranslator.currentLocale)
})
ipcMain.on('toMain_themeList_change', (_, theme) => { win.changeTheme(theme) })


ipcMain.on('toMain_langList_send',   (event) => {
	myTranslator.getLangList().then((langList) => {
		event.sender.send('fromMain_langList_return', langList, myTranslator.deferCurrentLocale())
	})
})
ipcMain.on('toMain_themeList_send',   (event) => {
	const themeOpts = [
		['system', myTranslator.syncStringLookup('theme_name_system')],
		['light',  myTranslator.syncStringLookup('theme_name_light')],
		['dark',   myTranslator.syncStringLookup('theme_name_dark')],
	]
	
	event.sender.send('fromMain_themeList_return', themeOpts, win.themeCurrentColor)
})
ipcMain.on('toMain_getText_send', (event, l10nSet) => {
	const sendEntry = (entry, text) => { event.sender.send('fromMain_getText_return', [entry, text]) }

	sendEntry('__currentLocale__', myTranslator.currentLocale)

	for ( const l10nEntry of l10nSet ) {
		switch ( l10nEntry ) {
			case 'app_version' :
				sendEntry(l10nEntry, app.getVersion())
				break
			case 'game_icon' :
				sendEntry(
					l10nEntry,
					`<img src="img/fs${mcStore.get('game_version')}.webp" style="height: 20px; margin-right: 5px; margin-top: 1px;" class="float-start img-fluid"/>`
				)
				break
			case 'game_icon_lg' :
				sendEntry(
					l10nEntry,
					`<img src="img/fs${mcStore.get('game_version')}_256.webp" class="img-fluid" style="height: 69px;"/>`
				)
				myTranslator.stringTitleLookup(l10nEntry).then((text) => {
					if ( text !== null ) { event.sender.send('fromMain_getText_return_title', [l10nEntry, text]) }
				})
				break
			case 'game_version' :
				if ( mcStore.get('multi_version') || mcStore.get('game_version') !== 22 ) {
					myTranslator.stringLookup(`mod_badge_fs${mcStore.get('game_version')}`).then((text) => {
						sendEntry(l10nEntry, text)
					})
				} else {
					sendEntry(l10nEntry, '')
				}
				break
			case 'clean_cache_size' : {
				try {
					const cacheSize = fs.statSync(path.join(app.getPath('userData'), 'mod_cache.json')).size/(1024*1024)
					sendEntry(
						l10nEntry,
						`${myTranslator.syncStringLookup(l10nEntry)} ${cacheSize.toFixed(2)}MB`
					)
				} catch {
					sendEntry(
						l10nEntry,
						`${myTranslator.syncStringLookup(l10nEntry)} 0.00MB`
					)
				}
				break
			}
			case 'clean_detail_cache_size' : {
				try {
					const cacheSize = fs.statSync(path.join(app.getPath('userData'), 'mod_detail_cache.json')).size/(1024*1024)
					sendEntry(
						l10nEntry,
						`${myTranslator.syncStringLookup(l10nEntry)} ${cacheSize.toFixed(2)}MB`
					)
				} catch {
					sendEntry(
						l10nEntry,
						`${myTranslator.syncStringLookup(l10nEntry)} 0.00MB`
					)
				}
				break
			}
			default :
				myTranslator.stringLookup(l10nEntry).then((text) => { sendEntry(l10nEntry, text) })
				myTranslator.stringTitleLookup(l10nEntry).then((text) => {
					if ( text !== null ) { event.sender.send('fromMain_getText_return_title', [l10nEntry, text]) }
				})
				break
		}
	}
})
/** END: l10n Operation */

function doModLook_response(m, thisMod, thisUUID) {
	if ( Object.hasOwn(m, 'type') ) {
		switch (m.type) {
			case 'log' :
				log.log[m.level](m.data.join(' '), `worker-thread-${m.pid}`)
				break
			case 'modLook' : {
				for ( const logLine of m.logLines.items ) {
					log.log[logLine[0]](logLine[1], m.logLines.group)
				}
				const currentUnits = {
					hp  : myTranslator.syncStringLookup('unit_hp'),
					kph : myTranslator.syncStringLookup('unit_kph'),
					mph : myTranslator.syncStringLookup('unit_mph'),
					rpm : myTranslator.syncStringLookup('unit_rpm'),
				}

				if ( ! thisMod.isFolder ) {
					mdCache.set(thisUUID, {
						date    : new Date(),
						results : m.modLook,
					})
				}
				win.sendToValidWindow('detail', 'fromMain_lookRecord', m.modLook, currentUnits, myTranslator.currentLocale)

				log.log.debug(`Sent(got) modLook :: ${Object.keys(m.modLook.items).length} items`, `worker-thread-${m.pid}`)
				break
			}
			default :
				break
		}
	}
}

function doModLook_thread(thisMod, thisUUID) {
	const lookThread = require('child_process').fork(path.join(__dirname, 'lib', 'queueRunner.js'), [
		23,
		maIPC.decodePath,
		maIPC.l10n.deferCurrentLocale(),
		maIPC.l10n.syncStringLookup('unit_hp')
	])
	lookThread.on('message', (m) => { doModLook_response(m, thisMod, thisUUID) })
	lookThread.send({
		type : 'look',
		data : {
			modRecord  : thisMod,
			searchPath : modCollect.modColUUIDToFolder(thisMod.colUUID),
		},
	})
	lookThread.send({ type : 'exit' })
}

/** Detail window operation */
function openDetailWindow(thisMod) {
	const thisUUID  = thisMod.uuid
	const slowStore = thisMod.modDesc.storeItems > 0 && (thisMod.fileDetail.isFolder || !mdCache.has(thisUUID))
	win.createNamedWindow(
		'detail',
		{ selected : thisMod, hasStore : slowStore },
		async () => {
			try {
				if ( thisMod.modDesc.storeItems > 0 ) {
					if ( !thisMod.fileDetail.isFolder && mdCache.has(thisUUID) ) {
						const currentUnits = {
							hp  : myTranslator.syncStringLookup('unit_hp'),
							kph : myTranslator.syncStringLookup('unit_kph'),
							mph : myTranslator.syncStringLookup('unit_mph'),
							rpm : myTranslator.syncStringLookup('unit_rpm'),
						}
						const thisCache = mdCache.get(thisUUID)
						mdCache.set(thisUUID, {
							date    : new Date(),
							results : thisCache.results,
						})
						win.sendToValidWindow('detail', 'fromMain_lookRecord', thisCache.results, currentUnits, myTranslator.currentLocale)
						log.log.notice(`Loaded details from cache :: ${thisUUID}`, 'mod-look')
						return
					}
					doModLook_thread(thisMod, thisUUID)
				}
			} catch (e) {
				log.log.notice(`Failed to load store items :: ${e}`, 'mod-look')
			}
		}
	)
}

ipcMain.on('toMain_openModDetail', (_, thisMod) => { openDetailWindow(modCollect.modColUUIDToRecord(thisMod)) })


/** END: Detail window operation */

/** Changelog window operation */
ipcMain.on('toMain_showChangelog', () => { win.createNamedWindow('change') } )
/** END: Changelog window operation */


/** Main window context menus */
ipcMain.on('toMain_dragOut', (event, modID) => {
	const thisMod     = modCollect.modColUUIDToRecord(modID)
	const thisFolder  = modCollect.modColUUIDToFolder(modID)
	const iconDataURL = thisMod.modDesc.iconImageCache ?? 'data:image/png;base64,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'

	event.sender.startDrag({
		file : path.join(thisFolder, path.basename(thisMod.fileDetail.fullPath)),
		icon : nativeImage.createFromDataURL(iconDataURL),
	})
})
ipcMain.on('toMain_modContextMenu', async (event, modID) => {
	const thisMod   = modCollect.modColUUIDToRecord(modID)
	const thisSite  = modSite.get(thisMod.fileDetail.shortName, '')
	const isSave    = thisMod.badgeArray.includes('savegame') || thisMod.badgeArray.includes('notmod')

	const template = [
		{ label : thisMod.fileDetail.shortName},
		{ type : 'separator' },
	]

	if ( !isSave ) {
		template.push({
			label : myTranslator.syncStringLookup('context_mod_detail'),
			click : () => { openDetailWindow(thisMod) },
		})
	} else {
		const thisFolder  = modCollect.mapCollectionToFolder(modID.split('--')[0])
		const savePath    = path.join(thisFolder, path.basename(thisMod.fileDetail.fullPath))
		const subMenu     = []

		for ( const collectKey of modCollect.collections ) {
			const collectName = modCollect.mapCollectionToName(collectKey)
			const collectVer  = modNote.get(`${collectKey}.notes_version`, 22)
			
			if ( collectVer === 22 ) {
				subMenu.push({
					label : collectName,
					click : () => {
						win.createNamedWindow('save', { collectKey : collectKey })
						setTimeout(() => { readSaveGame(savePath, false) }, 250)
					},
				})
			}
		}
		template.push({
			label   : myTranslator.syncStringLookup('check_save'),
			submenu : subMenu,
		})
	}

	template.push(
		{ type : 'separator' },
		{
			label : myTranslator.syncStringLookup('open_folder'),
			click : () => {
				shell.showItemInFolder(path.join(modCollect.modColUUIDToFolder(modID), path.basename(thisMod.fileDetail.fullPath)))
			},
		}
	)
	
	if ( thisMod.modHub.id !== null ) {
		template.push({
			label : myTranslator.syncStringLookup('open_hub'),
			click : () => {
				shell.openExternal(`${modHubURL}${thisMod.modHub.id}`)
			},
		})
	}

	template.push(
		{ type : 'separator' },
		{
			label : myTranslator.syncStringLookup('context_set_website'),
			click : () => {
				win.sendToWindow('main', 'fromMain_modInfoPop', thisMod, thisSite)
			},
		}
	)

	if ( thisSite !== '' ) {
		template.push({
			label : myTranslator.syncStringLookup('context_open_website'),
			click : () => { shell.openExternal(thisSite) },
		})
	}

	template.push(
		{ type : 'separator' },
		{
			label : myTranslator.syncStringLookup('copy_to_list'),
			click : () => { handleCopyMoveDelete('confirmCopy', [modID], [thisMod]) },
		},
		{
			label : myTranslator.syncStringLookup('move_to_list'),
			click : () => { handleCopyMoveDelete('confirmMove', [modID], [thisMod]) },
		},
		{
			label : myTranslator.syncStringLookup('remove_from_list'),
			click : () => { handleCopyMoveDelete('confirmDelete', [modID], [thisMod]) },
		}
	)

	const menu = Menu.buildFromTemplate(template)
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})
ipcMain.on('toMain_mainContextMenu', async (event, collection) => {
	const subLabel  = modCollect.mapCollectionToFullName(collection)
	const colFolder = modCollect.mapCollectionToFolder(collection)
	const template  = [
		{ label : myTranslator.syncStringLookup('context_main_title').padEnd(subLabel.length, ' '), sublabel : subLabel },
		{ type  : 'separator' },
		{ label : myTranslator.syncStringLookup('list-active'), enabled : (colFolder !== gameSetOverride.folder), click : () => { newSettingsFile(collection) } },
		{ type  : 'separator' },
		{ label : myTranslator.syncStringLookup('open_folder'), click : () => { shell.openPath(modCollect.mapCollectionToFolder(collection)) }}
	]

	const noteItems     = ['username', 'password', 'website', 'admin', 'server']
	const noteMenuItems = []
	
	for ( const noteItem of noteItems ) {
		const thisNoteItem = modNote.get(`${collection}.notes_${noteItem}`, null)
		if ( thisNoteItem !== null ) {
			noteMenuItems.push({
				label : `${myTranslator.syncStringLookup('context_main_copy')} : ${myTranslator.syncStringLookup(`notes_title_${noteItem}`)}`,
				click : () => {
					clipboard.writeText(thisNoteItem, 'selection') },
			})
		}
	}

	if ( noteMenuItems.length > 0 ) {
		template.push({ type : 'separator' }, ...noteMenuItems)
	}
	
	const menu = Menu.buildFromTemplate(template)
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})
ipcMain.on('toMain_notesContextMenu', async (event) => {
	const template  = [
		{ role : 'cut',   label : myTranslator.syncStringLookup('context_cut') },
		{ role : 'copy',  label : myTranslator.syncStringLookup('context_copy') },
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
	if ( mainProcessFlags.watchGameLog === null ) {
		if ( mcStore.get('game_log_file') === null ) {
			const gameSettingsFileName = versionConfigGet('game_settings', mcStore.get('game_version'))
			mcStore.set('game_log_file', path.join(path.dirname(gameSettingsFileName), 'log.txt'))
		}
		loadGameLog()
	}

	win.createNamedWindow('gamelog')
})
ipcMain.on('toMain_openGameLogFolder', () => { shell.showItemInFolder(mcStore.get('game_log_file')) })
ipcMain.on('toMain_getGameLog',        () => { readGameLog() })
ipcMain.on('toMain_guessGameLog',      () => {
	mcStore.set('game_log_auto', true)
	loadGameLog()
	readGameLog()
})
ipcMain.on('toMain_changeGameLog',     () => {
	dialog.showOpenDialog(win.win.prefs, {
		properties  : ['openFile'],
		defaultPath : path.join(mainProcessFlags.pathBestGuess, 'log.txt'),
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
	if ( ! win.isVisible('gamelog') === null ) { return }

	const thisGameLog = gameLogFilename()

	if ( thisGameLog === null || !fs.existsSync(thisGameLog) ) { return }

	try {
		log.log.debug(`Starting log read: ${thisGameLog}`, 'game-log')
		fs.readFile(thisGameLog, {encoding : 'utf8', flag : 'r'}, (err, contents) => {
			if ( err ) { throw err }
			log.log.debug(`Finished log read: ${thisGameLog}`, 'game-log')
			win.sendToValidWindow(
				'gamelog',
				'fromMain_gameLog',
				contents,
				thisGameLog
			)
		})
	} catch (e) {
		log.log.warning(`Could not read game log file: ${e}`, 'game-log')
	}
}
/** END: Game log window operation */

/** Debug window operation */
ipcMain.on('toMain_openDebugLog',    () => { win.createNamedWindow('debug') })
ipcMain.on('toMain_openDebugFolder', () => { shell.showItemInFolder(log.pathToLog) })
ipcMain.on('toMain_getDebugLog',     (event) => { event.sender.send('fromMain_debugLog', log.htmlLog) })
/** END: Debug window operation */

/** Game launcher */
function gameLauncher() {
	const launchLog      = log.group('game-launcher')
	const currentVersion = mcStore.get('game_version')
	const gameArgs       = versionConfigGet('game_args', currentVersion)
	const progPath       = versionConfigGet('game_path', currentVersion)
	if ( progPath !== '' && fs.existsSync(progPath) ) {
		win.loading.open('launch')
		win.loading.noCount()
		win.loading.hide(3500)

		try {
			const child = require('child_process').spawn(progPath, gameArgs.split(' '), { detached : true, stdio : ['ignore', 'ignore', 'ignore'] })

			child.on('error', (err) => { launchLog.danger(`Game launch failed ${err}!`) })
			child.unref()
		} catch (e) {
			launchLog.danger(`Game launch failed: ${e}`)
		}
	} else {
		const dialogOpts = {
			type    : 'info',
			title   : myTranslator.syncStringLookup('launcher_error_title'),
			message : myTranslator.syncStringLookup('launcher_error_message'),
		}
		dialog.showMessageBox(null, dialogOpts)
		launchLog.warning('Game path not set or invalid!')
	}
}
ipcMain.on('toMain_startFarmSim', () => { gameLauncher() })
/** END: game launcher */

/** Find window operation */
ipcMain.on('toMain_openFind', () => {  win.createNamedWindow('find') })
ipcMain.on('toMain_findContextMenu', async (event, thisMod) => {
	const template = [
		{ label : myTranslator.syncStringLookup('select_in_main'), sublabel : thisMod.name },
		{ type : 'separator' },
	]
	for ( const instance of thisMod.collect ) {
		template.push({
			label : `${instance.name} :: ${instance.version}`,
			click : () => {
				if ( win.isValid('main') ) {
					win.win.main.focus()
					win.sendToWindow.send('main', 'fromMain_selectOnlyFilter', instance.fullId, thisMod.name)
				}
			},
		})
	}
	
	const menu = Menu.buildFromTemplate(template)
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})
/** END : Find window operation*/

/** Preferences window operation */
ipcMain.on('toMain_openPrefs',  () => { win.createNamedWindow('prefs') })
ipcMain.on('toMain_getPref',    (event, name) => { event.returnValue = mcStore.get(name) })
ipcMain.on('toMain_setModInfo', (_, mod, site) => {
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

	event.sender.send( 'fromMain_allSettings', mcStore.store, mainProcessFlags.devControls )
})
ipcMain.on('toMain_resetWindows',   () => { win.resetPositions() })
ipcMain.on('toMain_clearCacheFile', () => {
	maCache.clear()
	processModFolders(true)
})
ipcMain.on('toMain_clearDetailCacheFile', (event) => {
	mdCache.clear()
	event.sender.send('fromMain_l10n_refresh', myTranslator.currentLocale)
})
ipcMain.on('toMain_cleanCacheFile', (event) => {
	const localStore = maCache.store
	const md5Set     = new Set(Object.keys(localStore))
	
	for ( const collectKey of modCollect.collections ) {
		for ( const thisSum of Array.from(Object.values(modCollect.getModListFromCollection(collectKey)), (mod) => mod.md5Sum).filter((x) => x !== null) ) {
			md5Set.delete(thisSum)
		}
	}

	for ( const md5 of md5Set ) { delete localStore[md5] }

	maCache.store = localStore

	event.sender.send('fromMain_l10n_refresh', myTranslator.currentLocale)
})
ipcMain.on('toMain_setPrefFile', (event, version) => {
	const pathBestGuessNew = mainProcessFlags.pathBestGuess.replace(/FarmingSimulator20\d\d/, `FarmingSimulator20${version}`)
	dialog.showOpenDialog(win.win.prefs, {
		properties  : ['openFile'],
		defaultPath : path.join(pathBestGuessNew, 'gameSettings.xml'),
		filters     : [
			{ name : 'gameSettings.xml', extensions : ['xml'] },
			{ name : 'All', extensions : ['*'] },
		],
	}).then((result) => {
		if ( ! result.canceled ) {
			versionConfigSet('game_settings', result.filePaths[0], version)
			parseSettings()
			refreshClientModList()
			event.sender.send( 'fromMain_allSettings', mcStore.store, mainProcessFlags.devControls )
		}
	}).catch((unknownError) => {
		log.log.danger(`Could not read specified gamesettings : ${unknownError}`, 'game-settings')
	})
})
ipcMain.on('toMain_setGamePath', (event, version) => {
	dialog.showOpenDialog(win.win.prefs, {
		properties  : ['openFile'],
		defaultPath : path.join(userHome, `FarmingSimulator20${version}.exe`),
		filters     : [
			{ name : `FarmingSimulator20${version}.exe`, extensions : ['exe'] },
			{ name : 'All', extensions : ['*'] },
		],
	}).then((result) => {
		if ( ! result.canceled ) {
			versionConfigSet('game_path', result.filePaths[0], version)
			parseSettings()
			refreshClientModList()
			event.sender.send( 'fromMain_allSettings', mcStore.store, mainProcessFlags.devControls )
		}
	}).catch((unknownError) => {
		log.log.danger(`Could not read specified game EXE : ${unknownError}`, 'game-path')
	})
})
ipcMain.on('toMain_setGameVersion', (_, newVersion) => {
	mcStore.set('game_version', newVersion)
	parseSettings()
	loadGameLog()
	readGameLog()
	refreshClientModList()
})
/** END: Preferences window operation */


/** Notes Operation */
ipcMain.on('toMain_openNotes', (_, collectKey) => {
	win.createNamedWindow('notes', {
		collectKey       : collectKey,
		lastGameSettings : mainProcessFlags.gameSettings,
	})
})
ipcMain.on('toMain_setNote', (_, id, value, collectKey) => {
	const cleanValue = ( id === 'notes_version' ) ? parseInt(value, 10) : value

	if ( cleanValue === '' ) {
		modNote.delete(`${collectKey}.${id}`)
	} else {
		modNote.set(`${collectKey}.${id}`, cleanValue)
	}

	win.createNamedWindow('notes', {
		collectKey       : collectKey,
		lastGameSettings : mainProcessFlags.gameSettings,
	})
})
/** END: Notes Operation */



/** Download operation */
ipcMain.on('toMain_cancelDownload', () => { if ( mainProcessFlags.dlRequest !== null ) { mainProcessFlags.dlRequest.abort() } })
ipcMain.on('toMain_downloadList',   (_, collection) => {
	if ( mainProcessFlags.dlProgress ) { win.win.load.focus(); return }
	const modDLLog = log.group('mod-download')
	const thisSite = modNote.get(`${collection}.notes_website`, null)
	const thisDoDL = modNote.get(`${collection}.notes_websiteDL`, false)
	const thisLink = `${thisSite}all_mods_download?onlyActive=true`

	if ( thisSite === null || !thisDoDL ) { return }

	win.doDialogBox('main', {
		titleL10n : 'download_title',
		message   : `${myTranslator.syncStringLookup('download_started')} :: ${modCollect.mapCollectionToName(collection)}\n${myTranslator.syncStringLookup('download_finished')}`,
	})

	mainProcessFlags.dlProgress = true
	modDLLog.info(`Downloading Collection : ${collection}`)
	modDLLog.debug(`Download Link : ${thisLink}`)

	mainProcessFlags.dlRequest = net.request(thisLink)

	mainProcessFlags.dlRequest.on('response', (response) => {
		modDLLog.info(`Got download: ${response.statusCode}`)

		if ( response.statusCode < 200 || response.statusCode >= 400 ) {
			win.doDialogBox('main', {
				type      : 'error',
				titleL10n : 'download_title',
				message   : `${myTranslator.syncStringLookup('download_failed')} :: ${modCollect.mapCollectionToName(collection)}`,
			})
			mainProcessFlags.dlProgress = false
		} else {
			win.loading.open('download', true)

			win.loading.total(response.headers['content-length'] || 0, true, true)
			win.loading.current(0, true, true)

			const dlPath      = path.join(app.getPath('temp'), `${collection}.zip`)
			const writeStream = fs.createWriteStream(dlPath)

			response.pipe(writeStream)
			response.on('data', (chunk) => { win.loading.current(chunk.length, false, true) })

			writeStream.on('finish', () => {
				writeStream.close()
				modDLLog.info('Download complete, unzipping')
				try {
					let zipBytesSoFar   = 0
					const zipBytesTotal = fs.statSync(dlPath).size

					win.loading.open('zip')
					win.loading.total(100, true)

					const zipReadStream  = fs.createReadStream(dlPath)

					zipReadStream.on('data', (chunk) => {
						zipBytesSoFar += chunk.length
						win.loading.current(((zipBytesSoFar/zipBytesTotal)*100).toFixed(2), true)
					})

					zipReadStream.on('error', (err) => {
						win.loading.hide()
						mainProcessFlags.dlProgress = false
						modDLLog.warning(`Download unzip failed : ${err}`)
					})

					zipReadStream.on('end', () => {
						modDLLog.info('Unzipping complete')
						zipReadStream.close()
						fs.unlinkSync(dlPath)
						mainProcessFlags.dlProgress = false
						processModFolders(true)
					})

					zipReadStream.pipe(unzip.Extract({ path : modCollect.mapCollectionToFolder(collection) }))
				} catch (e) {
					modDLLog.warning(`Download failed : (${response.statusCode}) ${e}`)
					win.loading.hide()
				}
			})
		}
	})
	mainProcessFlags.dlRequest.on('abort', () => {
		modDLLog.notice('Download canceled')
		mainProcessFlags.dlProgress = false
		win.loading.hide()
	})
	mainProcessFlags.dlRequest.on('error', (error) => {
		modDLLog.warning(`Network error : ${error}`)
		mainProcessFlags.dlProgress = false
		win.loading.hide()
	})
	mainProcessFlags.dlRequest.end()
})
/** END: download operation */

/** Export operation */
const csvRow = (entries) => entries.map((entry) => `"${typeof entry === 'string' ? entry.replaceAll('"', '""') : entry }"`).join(',')

ipcMain.on('toMain_exportList', (_, collection) => {
	const csvTable = []
	const csvLog   = log.group('csv-export')

	csvTable.push(csvRow(['Mod', 'Title', 'Version', 'Author', 'ModHub', 'Link']))

	for ( const mod of modCollect.getModListFromCollection(collection) ) {
		const modHubID    = mod.modHub.id
		const modHubLink  = ( modHubID !== null ) ? `${modHubURL}${modHubID}` : ''
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

	dialog.showSaveDialog(win.win.main, {
		defaultPath : path.join(app.getPath('desktop'), `${modCollect.mapCollectionToName(collection)}.csv`),
		filters     : [{ name : 'CSV', extensions : ['csv'] }],
	}).then(async (result) => {
		if ( result.canceled ) {
			csvLog.debug('Save CSV Cancelled')
		} else {
			try {
				fs.writeFileSync(result.filePath, csvTable.join('\n'))
				app.addRecentDocument(result.filePath)
				win.doDialogBox('main', { messageL10n : 'save_csv_worked' })
			} catch (err) {
				csvLog.warning(`Could not save csv file : ${err}`)
				win.doDialogBox('main', { type : 'warning', messageL10n : 'save_csv_failed' })
			}
		}
	}).catch((unknownError) => {
		csvLog.warning(`Could not save csv file : ${unknownError}`)
	})
})
ipcMain.on('toMain_exportZip', (_, selectedMods) => {
	const filePaths = []
	const zipLog    = log.group('zip-export')

	for ( const mod of modCollect.modColUUIDsToRecords(selectedMods) ) {
		filePaths.push([mod.fileDetail.shortName, mod.fileDetail.fullPath])
	}

	dialog.showSaveDialog(win.win.main, {
		defaultPath : app.getPath('desktop'),
		filters     : [
			{ name : 'ZIP', extensions : ['zip'] },
		],
	}).then(async (result) => {
		if ( result.canceled ) {
			zipLog.debug('Export ZIP Cancelled')
		} else {
			try {
				win.loading.open('makezip')
				win.loading.total(filePaths.length, true)
				win.loading.current(0, true)

				const zipOutput  = fs.createWriteStream(result.filePath)
				const zipArchive = makeZip('zip', {
					zlib : { level : 6 },
				})
				
				zipOutput.on('close', () => {
					zipLog.info(`ZIP file created : ${result.filePath}`)
					app.addRecentDocument(result.filePath)
				})

				zipArchive.on('error', (err) => {
					win.loading.hide()
					zipLog.warning(`Could not create zip file : ${err}`)
					setTimeout(() => {
						win.doDialogBox('main', { type : 'warning', messageL10n : 'save_zip_failed' })
					}, 1500)
				})

				zipArchive.on('warning', (err) => {
					zipLog.warning(`Problem with ZIP file : ${err}`)
				})

				zipArchive.on('entry', (entry) => {
					win.loading.current()
					zipLog.info(`Added file to ZIP : ${entry.name}`)
				})

				zipArchive.pipe(zipOutput)

				for ( const thisFile of filePaths ) {
					zipArchive.file(thisFile[1], { name : `${thisFile[0]}.zip` })
				}

				zipArchive.finalize().then(() => { win.loading.hide() })

			} catch (err) {
				zipLog.warning(`Could not create zip file : ${err}`)
				win.loading.hide()
				setTimeout(() => {
					win.doDialogBox('main', { type : 'warning', messageL10n : 'save_zip_failed' })
				}, 1500)
			}
		}
	}).catch((unknownError) => {
		zipLog.warning(`Could not create zip file : ${unknownError}`)
	})
})
/** END: Export operation */

/** Savetrack window operation */
ipcMain.on('toMain_openSaveTrack',   () => { win.createNamedWindow('save_track') })
ipcMain.on('toMain_openTrackFolder', () => {
	const options = {
		properties  : ['openDirectory'],
		defaultPath : mainProcessFlags.pathBestGuess,
	}

	dialog.showOpenDialog(win.win.save_track, options).then((result) => {
		if ( !result.canceled ) {
			try {
				new savegameTrack(result.filePaths[0]).getInfo().then((results) => {
					win.sendModList({ saveInfo : results }, 'fromMain_saveInfo', 'save_track', false )
				})
			} catch (e) {
				log.log.danger(`Load failed: ${e}`, 'save-track')
			}
		}
	}).catch((unknownError) => {
		log.log.danger(`Could not read specified folder : ${unknownError}`, 'save-track')
	})
})

/** Savegame window operation */
ipcMain.on('toMain_openSave',       (_, collection) => { win.createNamedWindow('save', { collectKey : collection }) })
ipcMain.on('toMain_selectInMain',   (_, selectList) => {
	if ( win.isValid('main') ) {
		win.win.main.focus()
		win.sendToWindow('main', 'fromMain_selectOnly', selectList)
	}
})
ipcMain.on('toMain_openSaveFolder', () => { openSaveGame(false) })
ipcMain.on('toMain_openSaveZIP',    () => { openSaveGame(true) })
ipcMain.on('toMain_openSaveDrop',   (_, type, thisPath) => {
	if ( type !== 'zip' && !fs.statSync(thisPath).isDirectory() ) { return }

	readSaveGame(thisPath, type !== 'zip')
})
ipcMain.on('toMain_openHubByID',    (_, hubID) => { shell.openExternal(`${modHubURL}${hubID}`) })

function readSaveGame(thisPath, isFolder) {
	try {
		new saveFileChecker(thisPath, isFolder).getInfo().then((results) => {
			win.sendModList({ thisSaveGame : results }, 'fromMain_saveInfo', 'save', false )
		})
	} catch (e) {
		log.log.danger(`Load failed: ${e}`, 'save-check')
	}
}
function openSaveGame(zipMode = false) {
	const options = {
		properties  : [(zipMode) ? 'openFile' : 'openDirectory'],
		defaultPath : mainProcessFlags.pathBestGuess,
	}
	if ( zipMode ) {
		options.filters = [{ name : 'ZIP Files', extensions : ['zip'] }]
	}

	dialog.showOpenDialog(win.win.save, options).then((result) => {
		if ( !result.canceled ) {
			readSaveGame(result.filePaths[0], !zipMode)
		}
	}).catch((unknownError) => {
		log.log.danger(`Could not read specified file/folder : ${unknownError}`, 'save-check')
	})
}
/** END: Savegame window operation */


/** Version window operation */
ipcMain.on('toMain_versionCheck',    () => { win.createNamedWindow('version') })
ipcMain.on('toMain_refreshVersions', () => { win.sendModList({}, 'fromMain_modList', 'version', false ) } )
ipcMain.on('toMain_versionResolve',  (_, shortName) => {
	const modSet    = []
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
	win.createNamedWindow('resolve', {
		modSet    : modSet,
		shortName : shortName,
	})
})
/** END: Version window operation */


/** Utility & Convenience Functions */
ipcMain.on('toMain_closeSubWindow', (event) => { BrowserWindow.fromWebContents(event.sender).close() })


function refreshClientModList(closeLoader = true) {
	win.sendModList(
		{
			activeCollection       : gameSetOverride.index,
			currentLocale          : myTranslator.deferCurrentLocale(),
			foldersDirty           : mainProcessFlags.foldersDirty,
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
function gameLogFilename() {
	if ( mcStore.get('game_log_auto') ) {
		return path.join(path.dirname(versionConfigGet('game_settings', mcStore.get('game_version'))), 'log.txt')
	}
	return mcStore.get('game_log_file', null)
}

function loadGameLog(newPath = false) {
	if ( newPath ) {
		mcStore.set('game_log_file', newPath)
		mcStore.set('game_log_auto', false)
	}

	if ( mainProcessFlags.watchGameLog !== null ) {
		mainProcessFlags.watchGameLog.close()
		mainProcessFlags.watchGameLog = null
	}

	const thisGameLog = gameLogFilename()

	if ( thisGameLog !== null && mainProcessFlags.watchGameLog === null ) {
		log.log.debug(`Trying to open game log: ${thisGameLog}`, 'game-log')

		if ( fs.existsSync(thisGameLog) ) {
			mainProcessFlags.watchGameLog = fs.watch(thisGameLog, (_, filename) => {
				if ( filename ) {
					if ( mainProcessFlags.bounceGameLog ) return
					mainProcessFlags.bounceGameLog = setTimeout(() => {
						mainProcessFlags.bounceGameLog = false
						readGameLog()
					}, 5000)
				}
			})
			mainProcessFlags.watchGameLog.on('error', (err) => {
				log.log.warning(`Error with game log: ${err}`, 'game-log')
				mainProcessFlags.watchGameLog = null
			})
		} else {
			log.log.warning(`Game Log not found at: ${thisGameLog}`, 'game-log')
			mcStore.set('game_log_file', null)
		}
	}
}

function parseGameXML(version = 22, setDevMode = null) {
	const gameEnabledValue    = version === 22 ? true : mcStore.get(`game_enabled_${version}`)
	const thisGameSettingsXML = versionConfigGet('game_settings', version)
	const gameXMLFile         = thisGameSettingsXML.replace('gameSettings.xml', 'game.xml')

	if ( !gameEnabledValue ) { return }

	let   XMLString = ''
	let   XMLDoc    = null
	const XMLParser = new fxml.XMLParser({
		commentPropName    : '#comment',
		ignoreAttributes   : false,
		numberParseOptions : { leadingZeros : true, hex : true, skipLike : /[0-9]\.[0-9]{6}/ },
	})
	
	try {
		XMLString = fs.readFileSync(gameXMLFile, 'utf8')
	} catch (e) {
		log.log.danger(`Could not read game xml (version:${version}) ${e}`, 'game-xml')
		return
	}

	try {
		XMLDoc = XMLParser.parse(XMLString)
		mainProcessFlags.devControls[version] = XMLDoc.game.development.controls
	} catch (e) {
		log.log.danger(`Could not read game xml (version:${version}) ${e}`, 'game-xml')
	}
	
	if ( setDevMode !== null && XMLDoc !== null ) {
		XMLDoc.game.development.controls = setDevMode

		const builder    = new fxml.XMLBuilder({
			commentPropName           : '#comment',
			format                    : true,
			ignoreAttributes          : false,
			indentBy                  : '    ',
			suppressBooleanAttributes : false,
			suppressEmptyNode         : true,
		})

		try {
			fs.writeFileSync(gameXMLFile, builder.build(XMLDoc))
		} catch (e) {
			log.log.danger(`Could not write game xml ${e}`, 'game-xml')
		}

		parseGameXML(version, null)
	}
}

function versionConfigSet(key, value, version = 22) {
	mcStore.set(versionConfigKey(key, version), value)
}
function versionConfigGet(key, version = 22 ) {
	return mcStore.get(versionConfigKey(key, version))
}
function versionConfigKey(key, version = 22) {
	return ( version === 22 ) ? key : `${key}_${version}`
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
	let   XMLString = ''
	let   XMLDoc    = null

	// Version must be the one of the newFolder *or* the current
	const currentVersion = ( newFolder === null ) ?
		mcStore.get('game_version', 22) :
		modNote.get(`${modCollect.mapFolderToCollection(newFolder)}.notes_version`, 22)

	const gameSettingsFileName = versionConfigGet('game_settings', currentVersion)

	const XMLParser = new fxml.XMLParser({
		commentPropName    : '#comment',
		ignoreAttributes   : false,
		numberParseOptions : { leadingZeros : true, hex : true, skipLike : /[0-9]\.[0-9]{6}/ },
	})
	
	try {
		XMLString = fs.readFileSync(gameSettingsFileName, 'utf8')
		XMLDoc    = XMLParser.parse(XMLString)

		gameSetOverride.active = (XMLDoc.gameSettings.modsDirectoryOverride['@_active'] === 'true')
		gameSetOverride.folder = XMLDoc.gameSettings.modsDirectoryOverride['@_directory']

		mainProcessFlags.gameSettings = {
			username : XMLDoc.gameSettings?.onlinePresenceName || XMLDoc.gameSettings?.player?.name || '',
			password : XMLDoc.gameSettings?.joinGame?.['@_password'] || '',
			server   : XMLDoc.gameSettings?.joinGame?.['@_serverName'] || '',
		}

		gameSetOverride.index = ( !gameSetOverride.active ) ? '0' : modCollect.mapFolderToCollection(gameSetOverride.folder) || '999'
	} catch (e) {
		log.log.danger(`Could not read game settings ${e}`, 'game-settings')
		return
	}

	if ( disable !== null || newFolder !== null || userName !== null || password !== null || serverName !== null ) {
		modNote.set(`${modCollect.mapFolderToCollection(newFolder)}.notes_last`, new Date())
		writeGameSettings(gameSettingsFileName, XMLDoc, {
			disable    : disable,
			newFolder  : newFolder,
			password   : password,
			serverName : serverName,
			userName   : userName,
			version    : currentVersion,
		})
	}
}

function writeGameSettings(gameSettingsFileName, gameSettingsXML, opts) {
	if ( gameSettingsXML === null || typeof gameSettingsXML.gameSettings === 'undefined' ) {
		log.log.danger('Could not write game settings (read failed)', 'game-settings')
		parseSettings()
		refreshClientModList()
		return
	}

	win.loading.open('set')
	win.loading.noCount()

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


function fileOperation(type, fileMap, srcWindow = 'confirm') {
	if ( typeof fileMap !== 'object' ) { return }

	win.safeClose(srcWindow)

	win.loading.open('files')
	win.loading.total(fileMap.length, true)
	win.loading.current(0, true)

	mainProcessFlags.intervalFile = setInterval(() => {
		if ( win.loading.isReady ) {
			clearInterval(mainProcessFlags.intervalFile)
			fileOperation_post(type, fileMap)
		}
	}, 250)
}

function fileOperation_post(type, fileMap) {
	const fileLog     = log.group('file-opts')
	const fullPathMap = []
	const cleanupSet  = new Set()

	for ( const file of fileMap ) {
		// fileMap is [destCollectKey, sourceCollectKey, fullPath (guess)]
		const thisFileName = path.basename(file[2])
		if ( type !== 'import' ) {
			fullPathMap.push({
				src  : path.join(modCollect.mapCollectionToFolder(file[1]), thisFileName), // source
				dest : path.join(modCollect.mapCollectionToFolder(file[0]), thisFileName), // dest
			})
			if ( type === 'move_multi' ) {
				cleanupSet.add(path.join(modCollect.mapCollectionToFolder(file[1]), thisFileName))
			}
		} else {
			fullPathMap.push({
				src  : file[2],
				dest : path.join(modCollect.mapCollectionToFolder(file[0]), thisFileName), // dest
			})
		}
	}

	mainProcessFlags.foldersDirty = true

	for ( const file of fullPathMap ) {
		try {
			if ( ['move_multi', 'copy_multi', 'copy', 'move', 'import'].includes(type) ) {
				fileLog.info(`Copy File : ${file.src} -> ${file.dest}`)

				if ( ! fs.statSync(file.src).isDirectory() ) {
					fs.copyFileSync(file.src, file.dest)
				} else {
					if ( fs.existsSync(file.dest) ) {
						// remove **folder** to be overwritten (otherwise will merge)
						fileLog.info(`Delete Existing Folder First : ${file.dest}`)
						fs.rmSync(file.dest, { recursive : true })
					}
					fs.cpSync(file.src, file.dest, { recursive : true })
				}
			}

			if ( ['move', 'delete'].includes(type) ) {
				fileLog.info(`Delete File : ${file.src}`)
				fs.rmSync(file.src, { recursive : true } )
			}
		} catch (e) {
			fileLog.danger(`Could not ${type} file : ${e}`)
		}

		win.loading.current()
	}

	if ( type === 'move_multi' ) {
		for ( const thisFile of cleanupSet ) {
			try {
				fileLog.info(`Delete File : ${thisFile}`)
				fs.rmSync(thisFile, { recursive : true } )
			} catch (e) {
				fileLog.danger(`Could not delete file : ${e}`)
			}
		}
	}

	processModFolders()
}


async function processModFolders(force = false) {
	if ( mainProcessFlags.processRunning ) { return }
	if ( !force && !mainProcessFlags.foldersDirty ) { win.loading.hide(500); return }

	mainProcessFlags.processRunning = true
	maIPC.processing = true

	win.loading.open('mods')
	win.loading.total(0, true)
	win.loading.current(0, true)

	mainProcessFlags.intervalLoad = setInterval(() => {
		if ( win.loading.isReady ) {
			clearInterval(mainProcessFlags.intervalLoad)
			processModFoldersOnDisk()
		}
	}, 250)
}

modQueueRunner.on('process-mods-done', () => {
	mainProcessFlags.foldersDirty = false
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
		win.createNamedWindow('change')
	}
	mainProcessFlags.processRunning = false
	maIPC.processing = false
})

function processModFoldersOnDisk() {
	modCollect.syncSafe = mcStore.get('use_one_drive', false)
	modCollect.clearAll()

	const offlineFolders = []

	mainProcessFlags.watchModFolder.forEach((oldWatcher) => { oldWatcher.close() })
	mainProcessFlags.watchModFolder = []
	// Cleaner for no-longer existing folders, set watcher for others
	for ( const folder of mainProcessFlags.modFolders ) {
		if ( ! fs.existsSync(folder) ) {
			const colHash     = modCollect.getMD5FromFolder(folder)
			const isRemovable = modNote.get(`${colHash}.notes_removable`, false)

			if ( !isRemovable ) {
				mainProcessFlags.modFolders.delete(folder)
			} else {
				offlineFolders.push(folder)
			}
		} else {
			const thisWatch = fs.watch(folder, (eventType, fileName) => { updateFolderDirtyWatch(eventType, fileName, folder) })
			thisWatch.on('error', () => { log.log.warning(`Folder Watch Error: ${folder}`, 'folder-watcher') })
			mainProcessFlags.watchModFolder.push(thisWatch)
		}
	}

	mcStore.set('modFolders', Array.from(mainProcessFlags.modFolders))

	for ( const folder of mainProcessFlags.modFolders ) {
		if ( ! offlineFolders.includes(folder) ) {
			const thisCollectionStats = modCollect.addCollection(folder)

			win.loading.total(thisCollectionStats.fileCount)
		}
	}

	modCollect.processMods()
}

function updateFolderDirtyWatch(eventType, fileName, folder) {
	if ( eventType === 'rename' ) {
		if ( ! fileName.endsWith('.tmp') && ! fileName.endsWith('.crdownload')) {
			log.log.debug(`Folders now dirty due to ${path.basename(folder)} :: ${fileName}`, 'folder-watcher')

			mainProcessFlags.foldersDirty = true
			win.toggleMainDirtyFlag(mainProcessFlags.foldersDirty)
		}
	}
}

function loadSaveFile(filename) {
	try {
		const oldModHub = require('./lib/oldModHub.json')
		const rawData   = fs.readFileSync(path.join(app.getPath('userData'), filename))
		const jsonData  = JSON.parse(rawData)


		modCollect.modHubList = {
			mods : { ...oldModHub.mods, ...jsonData.mods},
			last : jsonData.recent,
		}
		modCollect.modHubVersion = { ...oldModHub.versions, ...jsonData.version}

		log.log.debug(`Loaded ${filename}`, 'modhub-cache')
	} catch (e) {
		log.log.warning(`Loading ${filename} failed: ${e}`, 'modhub-cache')
	}
}

function dlSaveFile(url, filename) {
	if ( net.isOnline() ) {
		const request = net.request(url)

		request.setHeader('pragma', 'no-cache')

		request.on('response', (response) => {
			log.log.info(`Got ${filename}: ${response.statusCode}`, 'modhub-cache')
			let responseData = ''
			response.on('data', (chunk) => { responseData = responseData + chunk.toString() })
			response.on('end',  () => {
				fs.writeFileSync(path.join(app.getPath('userData'), filename), responseData)
				loadSaveFile(filename)
			})
		})
		request.on('error', (error) => {
			loadSaveFile(filename)
			log.log.info(`Network error : ${url} :: ${error}`, 'modhub-cache')
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
		
		win.tray = new Tray(trayIcon)

		const template = [
			{ label : 'FSG Mod Assist', /*icon : pathIcon, */enabled : false },
			{ type  : 'separator' },
			{
				label : myTranslator.syncStringLookup('tray_show'),
				click : () => { win.win.main.show() },
			},
			{
				label : myTranslator.syncStringLookup('launch_game'),
				click : () => { gameLauncher() },
			},
			{
				label : myTranslator.syncStringLookup('tray_quit'),
				click : () => { win.win.main.close() },
			},
		]
		const contextMenu = Menu.buildFromTemplate(template)
		win.tray.setContextMenu(contextMenu)
		win.tray.setToolTip('FSG Mod Assist')
		win.tray.on('click', () => { win.win.main.show() })

		dlSaveFile(hubURLCombo, 'modHubDataCombo.json')

		mainProcessFlags.intervalModHub = setInterval(() => {
			dlSaveFile(hubURLCombo, 'modHubDataCombo.json')
		}, ( 6 * 60 * 60 * 1000))

		app.on('second-instance', (_, argv) => {
			// Someone tried to run a second instance, we should focus our window.
			if ( argv.includes('--start-game') ) { gameLauncher() }
			if ( win.isValid('main') ) {
				if ( win.win.main.isMinimized() || !win.win.main.isVisible() ) { win.win.main.show() }
				win.win.main.focus()
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

		win.createMainWindow(() => {
			if ( mcStore.has('modFolders') ) {
				mainProcessFlags.modFolders   = new Set(mcStore.get('modFolders'))
				mainProcessFlags.foldersDirty = true
				setTimeout(() => { processModFolders() }, 1500)
			}
		})

		app.on('activate', () => {if (BrowserWindow.getAllWindows().length === 0) {
			win.createMainWindow(() => {
				if ( mcStore.has('modFolders') ) {
					mainProcessFlags.modFolders   = new Set(mcStore.get('modFolders'))
					mainProcessFlags.foldersDirty = true
					setTimeout(() => { processModFolders() }, 1500)
				}
			})
		} })
		app.on('quit',     () => {
			if ( win.tray ) { win.tray.destroy() }
			if ( mainProcessFlags.watchGameLog ) { mainProcessFlags.watchGameLog.close() }
			maIPC.decode.clearTemp()
		})
	}
})

app.setAboutPanelOptions({
	applicationName    : 'FS Mod Assist',
	applicationVersion : app.getVersion(),
	copyright          : '(c) 2022-present FSG Modding',
	credits            : 'J.T.Sage <jtsage+datebox@gmail.com>',
	iconPath           : trayIcon,
	website            : 'https://github.com/FSGModding/FSG_Mod_Assistant',
})

app.on('window-all-closed', () => {	if (process.platform !== 'darwin') { app.quit() } })
