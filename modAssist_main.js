/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */
// Main Program

const { app, BrowserWindow, ipcMain, shell, dialog, Menu, Tray, net, clipboard, nativeImage } = require('electron')

const isPortable = Object.hasOwn(process.env, 'PORTABLE_EXECUTABLE_DIR')
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
	gameRunning     : false,
	gameSettings    : {},
	intervalFile    : null,
	intervalGameRun : null,
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
const { maIPC, ma_logger, translator, modCacheManager} = require('./lib/modUtilLib')
const { EventEmitter }           = require('node:events')

const path             = require('node:path')
const fs               = require('node:fs')
const DiscordRPC       = require('discord-rpc')
const discordID        = '1165310050013827123'

const log              = new ma_logger('modAssist', app, 'assist.log', gotTheLock)

maIPC.log = log

log.log.info(`ModAssist Logger    : ${app.getVersion()}`)
log.log.info(` - Node.js Version  : ${process.versions.node}`)
log.log.info(` - Electron Version : ${process.versions.electron}`)
log.log.info(` - Chrome Version   : ${process.versions.chrome}`)

const disRPC    = new DiscordRPC.Client({transport : 'ipc'})

const myTranslator     = new translator(null, !app.isPackaged)
myTranslator.mcVersion = app.getVersion()

maIPC.l10n = myTranslator

class queueEmitter extends EventEmitter {}
const modQueueRunner = new queueEmitter()

const win             = new (require('./lib/modAssist_window_lib.js')).windowLib(
	{
		gameLauncher         : gameLauncher,
		processModFolders    : processModFolders,
		readGameLog          : readGameLog,
		refreshClientModList : refreshClientModList,
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

maIPC.decodePath   = !app.isPackaged
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

const { modFileCollection, modPackChecker, saveFileChecker, savegameTrack, saveGameManager } = require('./lib/modCheckLib.js')

const settingDefault = new (require('./lib/modAssist_window_lib.js')).defaultSettings(mainProcessFlags)

const Store   = require('electron-store')
const unzip   = require('unzip-stream')
const makeZip = require('archiver')

const mcStore = new Store({schema : settingDefault.defaults, clearInvalidConfig : true })
const mdCache = new Store({name : 'mod_detail_cache', clearInvalidConfig : true})
const modNote = new Store({name : 'col_notes', clearInvalidConfig : true})
const modSite = new Store({name : 'mod_source_site', migrations : settingDefault.migrateSite, clearInvalidConfig : true})

const newMaCache = new modCacheManager(app.getPath('userData'))

maIPC.modCache = newMaCache
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
const updateMajor  = 3
const updateMinor  = 1
let updateRequired = false

if ( appVerMajor < updateMajor ) { updateRequired = true }
if ( !updateRequired && appVerMajor === updateMajor && appVerMinor < updateMinor ) { updateRequired = true }

if ( updateRequired ) {
	log.log.warning('Invalid Mod Cache (old), resetting.', 'mod-cache')
	newMaCache.clearAll()
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

async function setActivity() {
	if (!disRPC || !win.win.main ) { return }

	const custom_state  = mcStore.get('use_discord_c1', '' )
	const custom_detail = mcStore.get('use_discord_c2', '' )
	const discord_verb  = mainProcessFlags.gameRunning ? 'Playing' : 'Active'

	disRPC.setActivity({
		details        : custom_detail !== '' ? custom_detail : `${discord_verb} Collection: \n${gameSetOverride.folder !== null ? path.basename(gameSetOverride.folder) : '--'}`,
		instance       : true,
		largeImageKey  : 'fsgmaicon_large',
		largeImageText : 'FSG Mod Assistant',
		state          : custom_state !== '' ? custom_state : `Managing ${modCollect.modFullCount} Mods`,

		buttons : [
			{label : 'Get Mod Assistant', url : 'https://github.com/FSGModding/FSG_Mod_Assistant/releases/latest'},
			{label : 'Visit FSG Website', url : 'https://farmsimgame.com/'}
		],
	}).catch((err) => {
		log.log.notice(err, 'discord-rpc')
	})
}

//TODO: trap user option for discord
if ( mcStore.get('use_discord', true ) ) {
	log.log.notice('Discord Rich Presence Enabled', 'discord-rpc')
	disRPC.on('ready', () => {
		setActivity()

		// activity can only be set every 15 seconds
		setInterval(() => { setActivity() }, 15e3)
	})

	disRPC.login({ clientId : discordID }).catch((err) => {
		log.log.notice(err, 'discord-rpc')
	})
	disRPC.on('error', (err) => {
		log.log.notice(err, 'discord-rpc')
	})
} else {
	log.log.notice('Discord Rich Presence Disabled', 'discord-rpc')
}

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

	if ( sourceFiles.length !== 0 ) {
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
	if ( modIDS.length !== 0 ) {
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
ipcMain.on('toMain_realFileImport',    (_, fileMap, unzipMe) => { fileOperation(unzipMe ? 'importZIP' : 'import', fileMap, 'import') })
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

		mcStore.set('modFolders', [...mainProcessFlags.modFolders])
		modNote.set(`${thisFolderCollectKey}.notes_version`, mcStore.get('game_version'))
		modNote.set(`${thisFolderCollectKey}.notes_add_date`, new Date())
		processModFolders()
	}}).catch((err) => {
		log.log.danger(`Could not read specified add folder : ${err}`, 'folder-opts')
	})
})
ipcMain.on('toMain_editFolders',    () => { win.createNamedWindow('folder') })
ipcMain.on('toMain_refreshFolders', () => { processModFolders(true) })
ipcMain.on('toMain_openFolder',     (_, collectKey) => { shell.openPath(modCollect.mapCollectionToFolder(collectKey)) })
ipcMain.on('toMain_removeFolder',   (_, collectKey) => {
	const folder = modCollect.mapCollectionToFolder(collectKey)
	if ( mainProcessFlags.modFolders.delete(folder) ) {
		log.log.notice(`Folder removed from tracking ${folder}`, 'folder-opts')
		mcStore.set('modFolders', [...mainProcessFlags.modFolders])

		modCollect.removeCollection(collectKey)
		
		win.sendModList({},	'fromMain_getFolders', 'folder', false )

		mainProcessFlags.foldersDirty = true
		win.toggleMainDirtyFlag(mainProcessFlags.foldersDirty)
	} else {
		log.log.warning(`Folder NOT removed from tracking ${folder}`, 'folder-opts')
	}
})
ipcMain.on('toMain_reorderFolder', (_, from, to) => {
	log.log.debug(`Reorder Call:: FROM : ${from} | TO : ${to}`, 'folder-reorder')
	log.log.debug(`Order IN: \n${[...mainProcessFlags.modFolders].join('\n')}`, 'folder-reorder')
	const newOrder    = [...mainProcessFlags.modFolders]
	const oldSetOrder = newOrder.map((thisPath) => modCollect.mapFolderToCollection(thisPath))
	log.log.debug(`Order IN SET: \n${[...oldSetOrder].join('\n')}`, 'folder-reorder')
	const item        = newOrder.splice(from, 1)[0]

	newOrder.splice(to, 0, item)
	log.log.debug(`Order OUT: \n${newOrder.join('\n')}`, 'folder-reorder')

	const newSetOrder = newOrder.map((thisPath) => modCollect.mapFolderToCollection(thisPath))
	log.log.debug(`Order OUT SET: \n${[...newSetOrder].join('\n')}`, 'folder-reorder')

	mainProcessFlags.modFolders   = new Set(newOrder)
	modCollect.newCollectionOrder = new Set(newSetOrder)

	mcStore.set('modFolders', [...mainProcessFlags.modFolders])

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

	mcStore.set('modFolders', [...mainProcessFlags.modFolders])

	win.sendModList({},	'fromMain_getFolders', 'folder', false )
	mainProcessFlags.foldersDirty = true
	win.toggleMainDirtyFlag(mainProcessFlags.foldersDirty)
})
ipcMain.on('toMain_dropFolder', (_, newFolder) => {
	if ( ! mainProcessFlags.modFolders.has(newFolder) ) {
		const thisFolderCollectKey = modCollect.getFolderHash(newFolder)

		mainProcessFlags.modFolders.add(newFolder)
		mcStore.set('modFolders', [...mainProcessFlags.modFolders])
		modNote.set(`${thisFolderCollectKey}.notes_version`, mcStore.get('game_version'))
		processModFolders(true)
	} else {
		win.doDialogBox('main', {
			type        : 'error',
			messageL10n : 'drop_folder_exists',
		})
	}
})
ipcMain.on('toMain_dropFiles', (_, files) => {
	let isZipImport = false
	if ( files.length === 1 && files[0].endsWith('.zip') ) {
		isZipImport = new modPackChecker(files[0]).getInfo()
	}
	win.createNamedWindow('import', { files : files, isZipImport : isZipImport })
})
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

ipcMain.on('toMain_getText_sync', (event, l10nSet) => {
	const returnValues = {}
	for ( const l10nEntry of l10nSet ) {
		returnValues[l10nEntry] = myTranslator.syncStringLookup(l10nEntry)
	}
	event.returnValue = returnValues
})

ipcMain.on('toMain_getText_send', (event, l10nSet) => {
	const sendEntry = (entry, text) => { event.sender.send('fromMain_getText_return', [entry, text]) }
	const doTitle   = mcStore.get('show_tooltips', true)

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
					const iconSize  = fs.statSync(path.join(app.getPath('userData'), 'mod_icons.json')).size/(1024*1024)
					sendEntry(
						l10nEntry,
						`${myTranslator.syncStringLookup(l10nEntry)} ${cacheSize.toFixed(2)}MB / ${iconSize.toFixed(2)}MB`
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
				if ( doTitle ) {
					myTranslator.stringTitleLookup(l10nEntry).then((text) => {
						if ( text !== null ) { event.sender.send('fromMain_getText_return_title', [l10nEntry, text]) }
					})
				}
				break
		}
	}
})
ipcMain.on('toMain_getTextBase_send', (event, l10nSet) => {
	const sendEntry = (entry, text) => { event.sender.send('fromMain_getTextBase_return', [entry, text]) }

	for ( const l10nEntry of l10nSet ) {
		myTranslator.baseStringLookup(l10nEntry).then((text) => { sendEntry(l10nEntry, text) })
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
	const lookThread = require('node:child_process').fork(path.join(__dirname, 'lib', 'queueRunner.js'), [
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
			} catch (err) {
				log.log.notice(`Failed to load store items :: ${err}`, 'mod-look')
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
	const iconDataURL = 'data:image/png;base64,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'

	event.sender.startDrag({
		file : path.join(thisFolder, path.basename(thisMod.fileDetail.fullPath)),
		icon : nativeImage.createFromDataURL(iconDataURL),
	})
})
ipcMain.on('toMain_modContextMenu', async (event, modID) => {
	const thisMod   = modCollect.modColUUIDToRecord(modID)
	const thisSite  = modSite.get(thisMod.fileDetail.shortName, '')
	const isSave    = thisMod.badgeArray.includes('savegame')
	const notMod    = thisMod.badgeArray.includes('notmod')
	const isLog     = thisMod.badgeArray.includes('log')

	const template = [
		{ label : thisMod.fileDetail.shortName},
		{ type : 'separator' },
	]

	if ( !isSave && !notMod && !isLog ) {
		template.push({
			label : myTranslator.syncStringLookup('context_mod_detail'),
			click : () => { openDetailWindow(thisMod) },
		})
	} else if ( isLog ) {
		const thisFolder  = modCollect.mapCollectionToFolder(modID.split('--')[0])
		const logPath     = path.join(thisFolder, path.basename(thisMod.fileDetail.fullPath))

		template.push({
			label : myTranslator.syncStringLookup('button_gamelog__title'),
			click : () => {
				loadGameLog(logPath)
				win.createNamedWindow('gamelog')
			},
		})

	} else if ( isSave ) {
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
						setTimeout(() => { readSaveGame(savePath, thisMod.fileDetail.isFolder) }, 250)
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

	let didDep = false
	if ( Array.isArray(thisMod.modDesc.depend) && thisMod.modDesc.depend.length !== 0 ) {
		didDep = true
		const subMenu     = []
		for ( const thisDep of thisMod.modDesc.depend ) {
			subMenu.push({ label : thisDep })
		}
		template.push(
			{ type : 'separator' },
			{
				label   : myTranslator.syncStringLookup('menu_depend_on'),
				submenu : subMenu,
			}
		)
	}

	const requireBy = modCollect.getModCollection(modID.split('--')[0]).requireBy
	
	if ( Object.hasOwn(requireBy, thisMod.fileDetail.shortName) ) {
		const subMenu     = []
		for ( const thisReq of requireBy[thisMod.fileDetail.shortName] ) {
			subMenu.push({ label : thisReq })
		}
		
		if ( ! didDep ) { template.push({ type : 'separator' }) }

		template.push(
			{
				label   : myTranslator.syncStringLookup('menu_require_by'),
				submenu : subMenu,
			}
		)
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

	if ( noteMenuItems.length !== 0 ) {
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
ipcMain.on('toMain_clearGameLog',      () => {
	const thisGameLog = gameLogFilename()

	if ( thisGameLog === null || !fs.existsSync(thisGameLog) ) { return }

	try {
		fs.writeFileSync(thisGameLog, '')
	} catch (err)  {
		log.log.danger(`Could not clear specified log : ${err}`, 'game-log')
	}
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
	}).catch((err) => {
		log.log.danger(`Could not read specified log : ${err}`, 'game-log')
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
	} catch (err) {
		log.log.warning(`Could not read game log file: ${err}`, 'game-log')
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
			const child = require('node:child_process').spawn(progPath, gameArgs.split(' '), { detached : true, stdio : ['ignore', 'ignore', 'ignore'] })

			child.on('error', (err) => { launchLog.danger(`Game launch failed ${err}!`) })
			child.unref()
		} catch (err) {
			launchLog.danger(`Game launch failed: ${err}`)
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


ipcMain.on('toMain_openBaseGame', () => {  win.createNamedWindow('basegame') })
ipcMain.on('toMain_openBaseFolder', (_, folderParts) => {
	shell.openPath(path.join(path.dirname(versionConfigGet('game_path', 22)), 'data', ...folderParts))
})
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
					win.sendToValidWindow('main', 'fromMain_selectOnlyFilter', instance.fullId, thisMod.name)
				}
			},
		})
	}
	
	const menu = Menu.buildFromTemplate(template)
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})
/** END : Find window operation*/

ipcMain.on('toMain_toggleMiniPin', () => { win.toggleAlwaysOnTop('mini'); refreshClientModList() })
ipcMain.on('toMain_openMiniMode',  () => { toggleMiniWindow() })

const toggleMiniWindow = () => {
	if ( win.isValid('mini') && win.isVisible('mini') ) {
		win.safeClose('mini')
	} else {
		win.createNamedWindow('mini')
		win.toggleAlwaysOnTop('mini', true)
	}
}
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
		case 'show_tooltips':
			mcStore.set(name, value)
			win.refreshL10n()
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
	newMaCache.clearAll()
	win.forceFocus('main')
	processModFolders(true)
})
ipcMain.on('toMain_clearDetailCacheFile', () => {
	mdCache.clear()
	win.sendToValidWindow('prefs', 'fromMain_l10n_refresh', myTranslator.currentLocale)
})
ipcMain.on('toMain_cleanCacheFile', () => {
	const md5Set     = new Set(newMaCache.keys)
	
	for ( const collectKey of modCollect.collections ) {
		for ( const thisSum of Array.from(Object.values(modCollect.getModListFromCollection(collectKey)), (mod) => mod.md5Sum).filter((x) => x !== null) ) {
			md5Set.delete(thisSum)
		}
	}

	for ( const md5 of md5Set ) { delete newMaCache.remMod(md5) }

	newMaCache.saveFile()

	setTimeout(() => {
		win.sendToValidWindow('prefs', 'fromMain_l10n_refresh', myTranslator.currentLocale)
	}, 1000)
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
	}).catch((err) => {
		log.log.danger(`Could not read specified gamesettings : ${err}`, 'game-settings')
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
	}).catch((err) => {
		log.log.danger(`Could not read specified game EXE : ${err}`, 'game-path')
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
				} catch (err) {
					modDLLog.warning(`Download failed : (${response.statusCode}) ${err}`)
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
		win.doDialogBox('main', {
			type      : 'error',
			titleL10n : 'download_title',
			message   : `${myTranslator.syncStringLookup('download_failed')} :: ${error}`,
		})
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
	}).catch((err) => {
		csvLog.warning(`Could not save csv file : ${err}`)
	})
})
ipcMain.on('toMain_exportZip', (_, selectedMods) => {
	const filePaths = []
	const zipLog    = log.group('zip-export')

	for ( const mod of modCollect.modColUUIDsToRecords(selectedMods) ) {
		filePaths.push([mod.fileDetail.shortName, mod.fileDetail.fullPath, mod.fileDetail.isFolder])
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
					win.loading.hide()
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
					if ( thisFile[2] ) {
						zipArchive.directory(thisFile[1], thisFile[0])
					} else {
						zipArchive.file(thisFile[1], { name : `${thisFile[0]}.zip` })
					}
				}

				zipArchive.finalize()

			} catch (err) {
				zipLog.warning(`Could not create zip file : ${err}`)
				win.loading.hide()
				setTimeout(() => {
					win.doDialogBox('main', { type : 'warning', messageL10n : 'save_zip_failed' })
				}, 1500)
			}
		}
	}).catch((err) => {
		zipLog.warning(`Could not create zip file : ${err}`)
	})
})
/** END: Export operation */

/** Savegame manager operation */
function refreshSaveManager() {
	const saveManage = new saveGameManager(mcStore.get('game_settings'))

	saveManage.getInfo().then((results) => {
		win.createNamedWindow('save_manage', { saveInfo : results } )
	})
}
ipcMain.on('toMain_openSaveManage', () => { refreshSaveManager() })
ipcMain.on('toMain_saveManageCompare', (_, fullPath, collectKey) => {
	win.createNamedWindow('save', { collectKey : collectKey })
	setTimeout(() => { readSaveGame(fullPath, true) }, 250)
})
ipcMain.on('toMain_saveManageDelete', (_, fullPath) => {
	try {
		log.log.info(`Delete Existing Save : ${fullPath}`, 'save-manager')
		fs.rmSync(fullPath, { recursive : true })
	} catch (err) {
		log.log.warning(`Save Remove Failed : ${err}`, 'save-manager')
	}
	refreshSaveManager()
})
ipcMain.on('toMain_saveManageExport', (_, fullPath) => {
	const zipLog    = log.group('zip-export')

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
				const zipOutput  = fs.createWriteStream(result.filePath)
				const zipArchive = makeZip('zip', {
					zlib : { level : 6 },
				})
				
				zipOutput.on('close', () => {
					zipLog.info(`ZIP file created : ${result.filePath}`)
					app.addRecentDocument(result.filePath)
				})

				zipArchive.on('error', (err) => {
					zipLog.warning(`Could not create zip file : ${err}`)
					setTimeout(() => {
						win.doDialogBox('main', { type : 'warning', messageL10n : 'save_zip_failed' })
					}, 1500)
				})

				zipArchive.on('warning', (err) => {
					zipLog.warning(`Problem with ZIP file : ${err}`)
				})

				zipArchive.on('entry', (entry) => {
					zipLog.info(`Added file to ZIP : ${entry.name}`)
				})

				zipArchive.pipe(zipOutput)

				// append files from a sub-directory, putting its contents at the root of archive
				zipArchive.directory(fullPath, false)

				zipArchive.finalize()

			} catch (err) {
				zipLog.warning(`Could not create zip file : ${err}`)
				setTimeout(() => {
					win.doDialogBox('main', { type : 'warning', messageL10n : 'save_zip_failed' })
				}, 1500)
			}
		}
	}).catch((err) => {
		zipLog.warning(`Could not create zip file : ${err}`)
	})
})
ipcMain.on('toMain_saveManageRestore', (_, fullPath, newSlot) => {
	try {
		const newSlotFull = path.join(path.dirname(mcStore.get('game_settings')), `savegame${newSlot}`)

		if ( fs.existsSync(newSlotFull) ) {
			log.log.info(`Delete Existing Save First : ${newSlotFull}`, 'save-manager')
			fs.rmSync(newSlotFull, { recursive : true })
		}

		log.log.info(`Restoring Save : ${fullPath} -> ${newSlot}`, 'save-manager')
		fs.cpSync(fullPath, newSlotFull, { recursive : true })
	} catch (err) {
		log.log.warning(`Save Restore Failed : ${err}`, 'save-manager')
	}
	refreshSaveManager()
})
ipcMain.on('toMain_saveManageImport', (_, fullPath, newSlot) => {
	const saveImportLog = log.group('save-manager-import')
	const newSlotFull = path.join(path.dirname(mcStore.get('game_settings')), `savegame${newSlot}`)
	try {
		if ( fs.existsSync(newSlotFull) ) {
			saveImportLog.info(`Delete Existing Save First : ${newSlotFull}`, 'save-manager')
			fs.rmSync(newSlotFull, { recursive : true })
		}

		saveImportLog.info(`Importing Save : ${fullPath} -> ${newSlot} -> ${newSlotFull}`, 'save-manager')

		fs.mkdirSync(newSlotFull)

		fs.createReadStream(fullPath)
			.pipe(unzip.Parse())
			.on('error', (err) => {
				saveImportLog.warning(`Import unzip failed : ${err}`)
			})
			.on('entry', (entry) => {
				if ( entry.type === 'File' ) {
					entry.pipe(fs.createWriteStream(path.join(newSlotFull, entry.path)))
				} else {
					entry.autodrain()
				}
			})
			.on('end', () => {
				saveImportLog.info('Import unzipping complete')
				refreshSaveManager()
			})
	} catch (err) {
		saveImportLog.warning(`Save Restore Failed : ${err}`, 'save-manager')
		refreshSaveManager()
	}
})
ipcMain.on('toMain_saveManageGetImport', () => {
	const options = {
		properties  : ['openFile'],
		defaultPath : userHome,
		filters     : [{ name : 'ZIP Files', extensions : ['zip'] }],
	}

	dialog.showOpenDialog(win.win.save_manage, options).then((result) => {
		if ( !result.canceled ) {
			new saveFileChecker(result.filePaths[0], false).getInfo().then((results) => {
				if ( results.errorList.length === 0 ) {
					win.sendToValidWindow('save_manage', 'fromMain_saveImport', result.filePaths[0])
				} else {
					log.log.danger('Invalid Save File', 'save-manage')
				}
			})
		}
	}).catch((err) => {
		log.log.danger(`Could not read specified file : ${err}`, 'save-manage')
	})
})

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
			} catch (err) {
				log.log.danger(`Load failed: ${err}`, 'save-track')
			}
		}
	}).catch((err) => {
		log.log.danger(`Could not read specified folder : ${err}`, 'save-track')
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
	} catch (err) {
		log.log.danger(`Load failed: ${err}`, 'save-check')
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
	}).catch((err) => {
		log.log.danger(`Could not read specified file/folder : ${err}`, 'save-check')
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
		const frozen = modNote.get(`${modPointer[0]}.notes_frozen`, false)
		const mod    = modCollect.modColAndUUID(modPointer[0], modPointer[1])
		
		if ( !mod.fileDetail.isFolder && !frozen ) {
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

async function updateGameRunning() {
	return require('node:child_process').exec('tasklist /fo csv', (err, stdout) => {
		if ( err ) {
			log.log.notice('Polling failed', 'game-process-poll')
			return
		}

		let gameIsRunning = false

		for ( const psLine of stdout.split('\n') ) {
			if ( psLine.split(',')?.[0] === '"FarmingSimulator2022Game.exe"' ) {
				log.log.debug('Game is Running', 'game-process-poll')
				gameIsRunning = true
			}
		}

		if ( gameIsRunning && !mainProcessFlags.gameRunning ) {
			log.log.debug('Game Started since last check', 'game-process-poll')
		} else if ( !gameIsRunning && mainProcessFlags.gameRunning ) {
			log.log.debug('Game Stopped since last check', 'game-process-poll')
		}
		mainProcessFlags.gameRunning = gameIsRunning
		win.sendToValidWindow('main', 'fromMain_gameUpdate', {gameRunning : mainProcessFlags.gameRunning, updateReady : modCollect.updateIsReady})
	})
}

function refreshClientModList(closeLoader = true) {
	updateGameRunning()
	win.sendModList(
		{
			activeCollection       : gameSetOverride.index,
			currentLocale          : myTranslator.deferCurrentLocale(),
			foldersDirty           : mainProcessFlags.foldersDirty,
			gameRunning            : mainProcessFlags.gameRunning,
			l10n                   : {
				disable    : myTranslator.syncStringLookup('override_disabled'),
				unknown    : myTranslator.syncStringLookup('override_unknown'),
				runMessage : myTranslator.syncStringLookup('game_running_warning'),
			},
			modSites               : modSite.store,
			pinMini                : win.isAlwaysOnTop('mini'),
			showMini               : win.isVisible('mini'),
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
		numberParseOptions : { leadingZeros : true, hex : true, skipLike : /\d\.\d{6}/ },
	})
	
	try {
		XMLString = fs.readFileSync(gameXMLFile, 'utf8')
	} catch (err) {
		log.log.danger(`Could not read game xml (version:${version}) ${err}`, 'game-xml')
		return
	}

	try {
		XMLDoc = XMLParser.parse(XMLString)
		mainProcessFlags.devControls[version] = XMLDoc.game.development.controls
	} catch (err) {
		log.log.danger(`Could not read game xml (version:${version}) ${err}`, 'game-xml')
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
		} catch (err) {
			log.log.danger(`Could not write game xml ${err}`, 'game-xml')
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
		unit_acre  : modNote.get(`${newList}.notes_unit_acre`, null),
		unit_miles : modNote.get(`${newList}.notes_unit_miles`, null),
		unit_money : modNote.get(`${newList}.notes_unit_money`, null),
		unit_temp  : modNote.get(`${newList}.notes_unit_temp`, null),
		userName   : modNote.get(`${newList}.notes_username`, null),
	})
}

function parseSettingsXML(XMLDoc) {
	return {
		password   : XMLDoc.gameSettings?.joinGame?.['@_password'] ?? '',
		server     : XMLDoc.gameSettings?.joinGame?.['@_serverName'] ?? '',
		unit_acre  : XMLDoc.gameSettings?.units?.acre ?? false,
		unit_mile  : XMLDoc.gameSettings?.units?.miles ?? false,
		unit_money : XMLDoc.gameSettings?.units?.money ?? 0,
		unit_temp  : XMLDoc.gameSettings?.units?.fahrenheit ?? false,
		username   : XMLDoc.gameSettings?.onlinePresenceName ?? XMLDoc.gameSettings?.player?.name ?? '',
	}
}

function parseSettings({
	disable = null,
	newFolder = null,
	userName = null,
	serverName = null,
	password = null,
	unit_money = null,
	unit_acre = null,
	unit_temp = null,
	unit_miles = null,
} = {}) {
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
		numberParseOptions : { leadingZeros : true, hex : true, skipLike : /\d\.\d{6}/ },
	})
	
	try {
		XMLString = fs.readFileSync(gameSettingsFileName, 'utf8')
		XMLDoc    = XMLParser.parse(XMLString)

		gameSetOverride.active = (XMLDoc.gameSettings.modsDirectoryOverride['@_active'] === 'true')
		gameSetOverride.folder = XMLDoc.gameSettings.modsDirectoryOverride['@_directory']

		mainProcessFlags.gameSettings = parseSettingsXML(XMLDoc)

		gameSetOverride.index = ( !gameSetOverride.active ) ? '0' : modCollect.mapFolderToCollection(gameSetOverride.folder) || '999'
	} catch (err) {
		log.log.danger(`Could not read game settings ${err}`, 'game-settings')
		return
	}

	if ( disable !== null || newFolder !== null || userName !== null || password !== null || serverName !== null ) {
		modNote.set(`${modCollect.mapFolderToCollection(newFolder)}.notes_last`, new Date())
		writeGameSettings(gameSettingsFileName, XMLDoc, {
			disable    : disable,
			newFolder  : newFolder,
			password   : password,
			serverName : serverName,
			unit_acre  : unit_acre,
			unit_miles : unit_miles,
			unit_money : unit_money,
			unit_temp  : unit_temp,
			userName   : userName,
			version    : currentVersion,
		})
	}
}

/* eslint-disable complexity */
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

	if ( opts.version === 22 ) {
		if ( opts.unit_acre !== null )  { gameSettingsXML.gameSettings.units.acre = opts.unit_acre }
		if ( opts.unit_miles !== null ) { gameSettingsXML.gameSettings.units.miles = opts.unit_miles }
		if ( opts.unit_money !== null ) { gameSettingsXML.gameSettings.units.money = opts.unit_money }
		if ( opts.unit_temp !== null )  { gameSettingsXML.gameSettings.units.fahrenheit = opts.unit_temp }
	}

	if ( opts.version === 22 || opts.version === 19 ) {
		gameSettingsXML.gameSettings.joinGame ??= {}

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
	} catch (err) {
		log.log.danger(`Could not write game settings ${err}`, 'game-settings')
	}

	parseSettings()
	refreshClientModList()
}
/* eslint-enable complexity */

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
		if ( type !== 'import' && type !== 'importZIP' ) {
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

	const typeCopyMove = new Set(['move_multi', 'copy_multi', 'copy', 'move', 'import'])
	const typeMoveDel  = new Set(['move', 'delete'])

	for ( const file of fullPathMap ) {
		try {
			if ( typeCopyMove.has(type) ) {
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

			if ( typeMoveDel.has(type) ) {
				fileLog.info(`Delete File : ${file.src}`)
				fs.rmSync(file.src, { recursive : true } )
			}
		} catch (err) {
			fileLog.danger(`Could not ${type} file : ${err}`)
		}

		win.loading.current()
	}

	if ( type === 'move_multi' ) {
		for ( const thisFile of cleanupSet ) {
			try {
				fileLog.info(`Delete File : ${thisFile}`)
				fs.rmSync(thisFile, { recursive : true } )
			} catch (err) {
				fileLog.danger(`Could not delete file : ${err}`)
			}
		}
	}

	if ( type === 'importZIP' ) {
		let pathsToProcess = fullPathMap.length
		for ( const file of fullPathMap ) {
			const destPath = path.dirname(file.dest)

			fs.createReadStream(file.src)
				.pipe(unzip.Extract({ path : destPath }))
				.on('error', (err) => {
					fileLog.warning(`Import unzip failed : ${destPath} :: ${err}`)
				})
				.on('close', () => {
					fileLog.info(`Import unzipping complete (${destPath})`)
					pathsToProcess--
					if ( pathsToProcess <= 0 ) { processModFolders() }
				})
		}
	} else {
		processModFolders()
	}
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

function processMissingFolder(hash, fullPath) {
	const retValue = {
		doDelete  : true, // Unchecked, but default action
		doMove    : false,
		doOffline : false,
		folder    : 'fullPath',
		newFolder : null,
	}

	const folderInfo = modNote.get(hash)
	const hasExtra   = typeof folderInfo === 'object'

	const thisMessage = `${myTranslator.syncStringLookup('bad_folder_blurb')}\n\n${myTranslator.syncStringLookup('bad_folder_folder')} ${fullPath}${hasExtra?`\n\n${myTranslator.syncStringLookup('bad_folder_extra')}`:''}`

	const userChoice = dialog.showMessageBoxSync(win.win.main, {
		cancelId  : 1,
		defaultId : 0,
		message   : thisMessage,
		title     : myTranslator.syncStringLookup('bad_folder_title'),
		type      : 'question',

		buttons : [
			myTranslator.syncStringLookup('bad_folder_action_delete'),
			myTranslator.syncStringLookup('bad_folder_action_offline'),
			myTranslator.syncStringLookup('bad_folder_action_move'),
		],
	})

	switch (userChoice) {
		case 1:
			retValue.doOffline = true
			break
		case 2: {
			const newFolder = dialog.showOpenDialogSync(win.win.main, {
				properties  : ['openDirectory'],
				defaultPath : mainProcessFlags.lastFolderLoc ?? userHome,
			})
			if ( typeof newFolder !== 'undefined') {
				const potentialFolder = newFolder[0]
		
				mainProcessFlags.lastFolderLoc = path.resolve(path.join(potentialFolder, '..'))
		
				for ( const thisPath of mainProcessFlags.modFolders ) {
					if ( path.relative(thisPath, potentialFolder) === '' ) {
						log.log.notice('Move folder :: canceled, already exists in list', 'folder-opts')
						return retValue
					}
				}
		
				const newCollectKey = modCollect.getFolderHash(potentialFolder)

				retValue.newFolder = potentialFolder
				retValue.doMove    = true
				for ( const key in folderInfo ) {
					modNote.set(`${newCollectKey}.${key}`, folderInfo[key])
				}
				modNote.delete(hash)
			}
			break
		}
		default:
			break
	}

	return retValue
}

function processModFoldersOnDisk() {
	modCollect.syncSafe = mcStore.get('use_one_drive', false)
	modCollect.clearAll()

	const offlineFolders = []

	for ( const oldWatcher of mainProcessFlags.watchModFolder ) { oldWatcher.close() }

	mainProcessFlags.watchModFolder = []
	// Cleaner for no-longer existing folders, set watcher for others
	for ( const folder of mainProcessFlags.modFolders ) {
		if ( ! fs.existsSync(folder) ) {
			const colHash     = modCollect.getMD5FromFolder(folder)
			const isRemovable = modNote.get(`${colHash}.notes_removable`, false)

			if ( !isRemovable ) {
				const folderAction = processMissingFolder(colHash, folder)

				if ( folderAction.doOffline ) {
					modNote.set(`${colHash}.notes_removable`, true)
					offlineFolders.push(folder)
				} else if ( folderAction.doMove ) {
					mainProcessFlags.modFolders.add(folderAction.newFolder)
					mainProcessFlags.modFolders.delete(folder)

					const thisWatch = fs.watch(folderAction.newFolder, (eventType, fileName) => { updateFolderDirtyWatch(eventType, fileName, folderAction.newFolder) })
					thisWatch.on('error', (err) => { log.log.warning(`Folder Watch Error: ${folderAction.newFolder} :: ${err}`, 'folder-watcher') })
					mainProcessFlags.watchModFolder.push(thisWatch)
				} else {
					log.log.warning(`Folder no longer exists, removing: ${folder}`, 'mod-processor')
					mainProcessFlags.modFolders.delete(folder)
				}
			} else {
				offlineFolders.push(folder)
			}
		} else {
			const thisWatch = fs.watch(folder, (eventType, fileName) => { updateFolderDirtyWatch(eventType, fileName, folder) })
			thisWatch.on('error', (err) => { log.log.warning(`Folder Watch Error: ${folder} :: ${err}`, 'folder-watcher') })
			mainProcessFlags.watchModFolder.push(thisWatch)
		}
	}

	mcStore.set('modFolders', [...mainProcessFlags.modFolders])

	for ( const folder of mainProcessFlags.modFolders ) {
		if ( ! offlineFolders.includes(folder) ) {
			const thisCollectionStats = modCollect.addCollection(folder)

			win.loading.total(thisCollectionStats?.fileCount ?? 0)
		} else {
			modCollect.addCollection(folder, true)
		}
	}

	modCollect.processMods()
}

function updateFolderDirtyWatch(eventType, fileName, folder) {
	if ( eventType === 'rename' && ! fileName.endsWith('.tmp') && ! fileName.endsWith('.crdownload')) {
		log.log.debug(`Folders now dirty due to ${path.basename(folder)} :: ${fileName}`, 'folder-watcher')

		mainProcessFlags.foldersDirty = true
		win.toggleMainDirtyFlag(mainProcessFlags.foldersDirty)
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
	} catch (err) {
		log.log.warning(`Loading ${filename} failed: ${err}`, 'modhub-cache')
	}
}

function dlSaveFile(url, filename) {
	if ( net.isOnline() ) {
		const request = net.request(url)

		request.setHeader('pragma', 'no-cache')

		request.on('response', (response) => {
			log.log.info(`Got ${filename}: ${response.statusCode}`, 'modhub-cache')
			let responseData = ''

			response.on('error', (err) => {
				log.log.info(`Network error : ${url} :: ${err}`, 'modhub-cache')
			})

			response.on('data', (chunk) => { responseData = responseData + chunk.toString() })
			response.on('end',  () => {
				fs.writeFileSync(path.join(app.getPath('userData'), filename), responseData)
				loadSaveFile(filename)
			})
		})
		request.on('abort', () => {
			loadSaveFile(filename)
			log.log.info(`Network abort : ${url}`, 'modhub-cache')
		})
		request.on('error', (err) => {
			loadSaveFile(filename)
			log.log.info(`Network error : ${url} :: ${err}`, 'modhub-cache')
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
				label : myTranslator.syncStringLookup('mini_mode_button__title'),
				click : () => { toggleMiniWindow() },
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
			mainProcessFlags.intervalGameRun = setInterval(() => {
				updateGameRunning()
			}, 15 * 1000)
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
