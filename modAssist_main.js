/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */
// Main Program

const { app, BrowserWindow, ipcMain, shell, dialog, Menu, Tray, clipboard, nativeImage } = require('electron')

const isPortable = Object.hasOwn(process.env, 'PORTABLE_EXECUTABLE_DIR')
const gotTheLock = app.requestSingleInstanceLock()

if ( !gotTheLock ) { app.quit() }

const { serveIPC }     = require('./lib/modUtilLib.js')
const { funcLib }      = require('./lib/modAssist_func_lib.js')
const { EventEmitter } = require('node:events')
const path             = require('node:path')
const fs               = require('node:fs')
const Store            = require('electron-store')

serveIPC.log = new (require('./lib/modUtilLib')).ma_logger('modAssist', app, 'assist.log', gotTheLock)
funcLib.general.doBootLog()

serveIPC.l10n           = new (require('./lib/modUtilLib')).translator(null, !app.isPackaged)
serveIPC.l10n.mcVersion = app.getVersion()
serveIPC.icon.tray      = funcLib.general.getPackPathRender('img', 'icon.ico')
serveIPC.decodePath     = funcLib.general.getPackPathRoot('texconv.exe')

const __ = (x) => serveIPC.l10n.syncStringLookup(x)

class queueEmitter extends EventEmitter {}
const modQueueRunner = new queueEmitter()

serveIPC.refFunc = {
	gameLauncher           : gameLauncher,
	processModFolders      : processModFolders,
	readGameLog            : funcLib.gameSet.readGameLog,
	refreshClientModList   : refreshClientModList,
	refreshTransientStatus : refreshTransientStatus,
}

const win = new (require('./lib/modAssist_window_lib.js')).windowLib( serveIPC.refFunc )

serveIPC.windowLib = win
serveIPC.log.dangerCallBack = () => { serveIPC.windowLib.toggleMainDangerFlag() }

serveIPC.isModCacheDisabled = false && !(app.isPackaged)

process.on('uncaughtException',  (err, origin) => { funcLib.general.handleUnhandled('exception', err, origin) })
process.on('unhandledRejection', (err, origin) => { funcLib.general.handleUnhandled('rejection', err, origin) })

if ( process.platform === 'win32' && app.isPackaged && gotTheLock && !isPortable ) {
	funcLib.general.initUpdater()
}

funcLib.wizard.initMain()

const menuSep       = { type : 'separator' }

const { modFileCollection, modPackChecker, saveFileChecker, savegameTrack, csvFileChecker } = require('./lib/modCheckLib.js')

const settingDefault = new (require('./lib/modAssist_window_lib.js')).defaultSettings()

serveIPC.isFirstRun = !fs.existsSync(path.join(app.getPath('userData'), 'config.json'))

serveIPC.storeSet         = new Store({schema : settingDefault.defaults, clearInvalidConfig : true })
serveIPC.storeCache       = new (require('./lib/modUtilLib.js')).modCacheManager(app.getPath('userData'))
serveIPC.storeSites       = new Store({name : 'mod_source_site', migrations : settingDefault.migrateSite, clearInvalidConfig : true})
serveIPC.storeNote        = new Store({name : 'col_notes', clearInvalidConfig : true})
serveIPC.storeCacheDetail = new Store({name : 'mod_detail_cache', clearInvalidConfig : true})

win.loadSettings()

funcLib.general.doModCacheCheck() // Check and upgrade Mod Cache & Mod Detail Cache

serveIPC.modCollect = new modFileCollection( app.getPath('home'), modQueueRunner )

/*  ____  ____   ___ 
   (_  _)(  _ \ / __)
    _)(_  )___/( (__ 
   (____)(__)   \___) */

ipcMain.on('toMain_sendMainToTray',   () => { win.sendToTray() })
ipcMain.on('toMain_runUpdateInstall', () => {
	if ( serveIPC.modCollect.updateIsReady ) {
		serveIPC.autoUpdater.quitAndInstall()
	} else {
		serveIPC.log.debug('auto-update', 'Auto-Update Called Before Ready.')
	}
})
ipcMain.on('toMain_populateClipboard', (_, text) => { clipboard.writeText(text, 'selection') })

/** File operation buttons */
ipcMain.on('toMain_makeInactive', () => { funcLib.gameSet.disable() })
ipcMain.on('toMain_makeActive',   (_, newList) => { funcLib.gameSet.change(newList) })
ipcMain.on('toMain_openMods',     (_, mods)    => {
	const thisFolderAndMod     = serveIPC.modCollect.modColUUIDToFolderAndRecord(mods[0])

	if ( thisFolderAndMod.mod !== null ) {
		shell.showItemInFolder(path.join(thisFolderAndMod.folder, path.basename(thisFolderAndMod.mod.fileDetail.fullPath)))
	}
})
ipcMain.on('toMain_openHelpSite', () => { shell.openExternal('https://fsgmodding.github.io/FSG_Mod_Assistant/') })
ipcMain.on('toMain_openHub',      (_, mods) => {
	const thisMod   = serveIPC.modCollect.modColUUIDToRecord(mods[0])

	if ( thisMod.modHub.id !== null ) {
		shell.openExternal(funcLib.general.doModHub(thisMod.modHub.id))
	}
})
ipcMain.on('toMain_openExt',      (_, mods) => {
	const thisMod     = serveIPC.modCollect.modColUUIDToRecord(mods[0])
	const thisModSite = serveIPC.storeSites.get(thisMod.fileDetail.shortName, null)

	if ( thisModSite !== null ) { shell.openExternal(thisModSite) }
})

ipcMain.on('toMain_copyFavorites',  () => {
	const fav = {
		destinations : [],
		sourceFiles  : [],
		sources      : [],
	}

	const multi_version   = serveIPC.storeSet.get('multi_version')
	const current_version = serveIPC.storeSet.get('game_version')

	for ( const collectKey of serveIPC.modCollect.collections ) {
		if ( multi_version && serveIPC.modCollect.versionNotSame(collectKey, current_version) ) { continue }

		fav[serveIPC.storeNote.get(`${collectKey}.notes_favorite`, false) ? 'sources' : 'destinations' ].push(collectKey)
	}

	for ( const collectKey of fav.sources ) {
		const thisCollection = serveIPC.modCollect.getModCollection(collectKey)
		fav.sourceFiles.push(...[...thisCollection.modSet].map((x) => `${collectKey}--${x}`))
	}
	
	if ( fav.sourceFiles.length !== 0 ) {
		sendCopyMoveDelete('copyFavs', fav.sourceFiles, fav.sources)
	}
})

function handleCopyMoveDelete(windowName, modIDS, modRecords = null) {
	if ( modIDS.length !== 0 ) {
		win.createNamedWindow(windowName, {
			records          : ( modRecords === null ) ?
				serveIPC.modCollect.modColUUIDsToRecords(modIDS) :
				modRecords,
			originCollectKey : modIDS[0].split('--')[0],
		})
	}
}

function sendCopyMoveDelete(operation, modIDS, multiSource = null, fileList = null, isZipImport = false) {
	if ( modIDS === null || modIDS.length !== 0 ) {
		win.sendToValidWindow('main', 'fromMain_fileOperation', {
			isZipImport      : isZipImport,
			multiSource      : multiSource,
			operation        : operation,
			originCollectKey : modIDS !== null ? modIDS[0].split('--')[0] : '',
			rawFileList      : fileList,
			records          : modIDS !== null ? serveIPC.modCollect.modColUUIDsToRecords(modIDS) : [],
		})
	}
}

ipcMain.on('toMain_deleteMods',     (_, mods) => { sendCopyMoveDelete('delete', mods) })
ipcMain.on('toMain_moveMods',       (_, mods) => { sendCopyMoveDelete('move', mods) })
ipcMain.on('toMain_copyMods',       (_, mods) => { sendCopyMoveDelete('copy', mods) })
ipcMain.on('toMain_moveMultiMods',  (_, mods) => { sendCopyMoveDelete('multiMove', mods) })
ipcMain.on('toMain_copyMultiMods',  (_, mods) => { sendCopyMoveDelete('multiCopy', mods) })

ipcMain.on('toMain_realFileDelete',    (_, fileMap) => { doFileOperation('delete', fileMap) })
ipcMain.on('toMain_realFileMove',      (_, fileMap) => { doFileOperation('move', fileMap) })
ipcMain.on('toMain_realFileCopy',      (_, fileMap) => { doFileOperation('copy', fileMap) })
ipcMain.on('toMain_realMultiFileMove', (_, fileMap) => { doFileOperation('move_multi', fileMap) })
ipcMain.on('toMain_realMultiFileCopy', (_, fileMap) => { doFileOperation('copy_multi', fileMap) })

ipcMain.on('toMain_realFileImport',    (_, fileMap, unzipMe) => { doFileOperation(unzipMe ? 'importZIP' : 'import', fileMap) })
ipcMain.on('toMain_realFileVerCP',     (_, fileMap) => {
	doFileOperation('copy', fileMap, 'resolve')
	setTimeout(() => { win.sendModList({}, 'fromMain_modList', 'version', false ) }, 1500)
})
/** END: File operation buttons */


/** Folder Window Operation */
ipcMain.on('toMain_addFolder_direct', (event, potentialFolder) => {
	for ( const thisPath of serveIPC.modFolders ) {
		if ( path.relative(thisPath, potentialFolder) === '' ) {
			serveIPC.log.log.notice('Add folder :: canceled, already exists in list', 'folder-opts')
			return
		}
	}
	const thisFolderCollectKey = serveIPC.modCollect.getFolderHash(potentialFolder)

	serveIPC.modFolders.add(potentialFolder)
	funcLib.general.toggleFolderDirty()

	funcLib.prefs.saveFolders()
	serveIPC.storeNote.set(`${thisFolderCollectKey}.notes_version`, 22)
	serveIPC.storeNote.set(`${thisFolderCollectKey}.notes_add_date`, new Date())
	event.sender.send( 'fromMain_allSettings', ...funcLib.commonSend.settings() )
})

ipcMain.on('toMain_addFolder', () => {
	dialog.showOpenDialog(win.win.main, {
		properties  : ['openDirectory'],
		defaultPath : serveIPC.path.last ?? app.getPath('home'),
	}).then((result) => { if ( !result.canceled ) {
		const potentialFolder = result.filePaths[0]

		serveIPC.path.last = path.resolve(path.join(potentialFolder, '..'))

		for ( const thisPath of serveIPC.modFolders ) {
			if ( path.relative(thisPath, potentialFolder) === '' ) {
				serveIPC.log.log.notice('Add folder :: canceled, already exists in list', 'folder-opts')
				return
			}
		}

		const thisFolderCollectKey = serveIPC.modCollect.getFolderHash(potentialFolder)

		serveIPC.modFolders.add(potentialFolder)
		funcLib.general.toggleFolderDirty()

		funcLib.prefs.saveFolders()
		serveIPC.storeNote.set(`${thisFolderCollectKey}.notes_version`, serveIPC.storeSet.get('game_version'))
		serveIPC.storeNote.set(`${thisFolderCollectKey}.notes_add_date`, new Date())
		processModFolders()
	}}).catch((err) => {
		serveIPC.log.log.danger(`Could not read specified add folder : ${err}`, 'folder-opts')
	})
})
ipcMain.on('toMain_editFolders',    () => {
	serveIPC.isFoldersEdit = ! serveIPC.isFoldersEdit
	refreshClientModList(false)
})
ipcMain.on('toMain_refreshFolders', () => { processModFolders(true) })
ipcMain.on('toMain_openFolder',     (_, collectKey) => { shell.openPath(serveIPC.modCollect.mapCollectionToFolder(collectKey)) })
ipcMain.on('toMain_removeFolder',   (_, collectKey) => {
	const folder = serveIPC.modCollect.mapCollectionToFolder(collectKey)
	if ( serveIPC.modFolders.delete(folder) ) {
		serveIPC.log.log.notice(`Folder removed from tracking ${folder}`, 'folder-opts')
		funcLib.prefs.saveFolders()

		serveIPC.modCollect.removeCollection(collectKey)
		
		refreshClientModList(false)

		funcLib.general.toggleFolderDirty()
	} else {
		serveIPC.log.log.warning(`Folder NOT removed from tracking ${folder}`, 'folder-opts')
	}
})
ipcMain.on('toMain_reorderFolder', (_, from, to) => {
	const newOrder    = [...serveIPC.modFolders]
	const item        = newOrder.splice(from, 1)[0]

	newOrder.splice(to, 0, item)

	const newSetOrder = newOrder.map((thisPath) => serveIPC.modCollect.mapFolderToCollection(thisPath))

	serveIPC.modFolders                    = new Set(newOrder)
	serveIPC.modCollect.newCollectionOrder = new Set(newSetOrder)

	funcLib.prefs.saveFolders()

	refreshClientModList(false)
})

ipcMain.on('toMain_dropFolder', (_, newFolder) => {
	if ( ! serveIPC.modFolders.has(newFolder) ) {
		const thisFolderCollectKey = serveIPC.modCollect.getFolderHash(newFolder)

		serveIPC.modFolders.add(newFolder)
		funcLib.prefs.saveFolders()
		serveIPC.storeNote.set(`${thisFolderCollectKey}.notes_version`, serveIPC.storeSet.get('game_version'))
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
	if ( files.length === 1 && files[0].endsWith('.csv') ) {
		new csvFileChecker(files[0]).getInfo().then((results) => {
			win.createNamedWindow('save', {
				collectKey   : null,
				thisSaveGame : results,
			})
		})
		return
	}
	if ( files.length === 1 && files[0].endsWith('.zip') ) {
		isZipImport = new modPackChecker(files[0]).getInfo()
	}

	sendCopyMoveDelete('import', null, null, files, isZipImport)
})
/** END: Folder Window Operation */

/** Logging Operation */
ipcMain.on('toMain_log', (_, level, process, text) => { serveIPC.log.log[level](text, process) })
/** END: Logging Operation */

/** l10n Operation */
ipcMain.on('toMain_langList_change', (_, lang) => {
	serveIPC.l10n.currentLocale = lang
	serveIPC.storeSet.set('force_lang', serveIPC.l10n.currentLocale)
	win.refreshL10n(serveIPC.l10n.currentLocale)
})

ipcMain.on('toMain_themeList_change', (_, theme) => { win.changeTheme(theme) })


ipcMain.on('toMain_langList_send',   (event) => {
	serveIPC.l10n.getLangList().then((langList) => {
		event.sender.send('fromMain_langList_return', langList, serveIPC.l10n.currentLocale)
	})
})
ipcMain.on('toMain_themeList_send',   (event) => {
	event.sender.send(
		'fromMain_themeList_return',
		[
			['system', __('theme_name_system')],
			['light',  __('theme_name_light')],
			['dark',   __('theme_name_dark')],
		],
		win.themeCurrentColor
	)
})

ipcMain.on('toMain_getText_sync', (event, l10nSet) => {
	event.returnValue = l10nSet.map((x) => ({ x : __(x) }))
})
ipcMain.on('toMain_getText_locale', (event) => { event.returnValue = serveIPC.l10n.currentLocale })
ipcMain.on('toMain_getText_send', (event, l10nSet) => {
	const sendEntry = (entry, text) => { event.sender.send('fromMain_getText_return', [entry, text]) }
	const doTitle   = serveIPC.storeSet.get('show_tooltips', true)

	sendEntry('__currentLocale__', serveIPC.l10n.currentLocale)

	for ( const l10nEntry of l10nSet ) {
		switch ( l10nEntry ) {
			case 'app_name':
				serveIPC.l10n.stringLookup(l10nEntry).then((text) => {
					sendEntry(l10nEntry, `<i style="font-size: calc(1.6rem + .6vw); vertical-align: -0.08em; padding-right: 0.2em;" class="fsico-ma-large"></i>${text}`)
				})
				break
			case 'app_version' :
				sendEntry(l10nEntry, app.getVersion())
				break
			case 'game_icon' :
				sendEntry(
					l10nEntry,
					`<i class="fsico-ver-${serveIPC.storeSet.get('game_version')} float-start" style="font-size: 20px; margin-right: 4px; margin-top: -4px;"></i>`
				)
				break
			case 'game_icon_lg' :
				sendEntry(
					l10nEntry,
					`<i class="d-inline-block fsico-ver-${serveIPC.storeSet.get('game_version')}" style="margin: -30px 0px; font-size: 75px;"></i>`
				)
				serveIPC.l10n.stringTitleLookup(l10nEntry).then((text) => {
					if ( text !== null ) { event.sender.send('fromMain_getText_return_title', [l10nEntry, text]) }
				})
				break
			case 'game_version' :
				if ( serveIPC.storeSet.get('multi_version') || serveIPC.storeSet.get('game_version') !== 22 ) {
					serveIPC.l10n.stringLookup(`mod_badge_fs${serveIPC.storeSet.get('game_version')}`).then((text) => {
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
						`${__(l10nEntry)} ${cacheSize.toFixed(2)}MB / ${iconSize.toFixed(2)}MB`
					)
				} catch {
					sendEntry(
						l10nEntry,
						`${__(l10nEntry)} 0.00MB`
					)
				}
				break
			}
			case 'clean_detail_cache_size' : {
				try {
					const cacheSize = fs.statSync(path.join(app.getPath('userData'), 'mod_detail_cache.json')).size/(1024*1024)
					sendEntry(
						l10nEntry,
						`${__(l10nEntry)} ${cacheSize.toFixed(2)}MB`
					)
				} catch {
					sendEntry(
						l10nEntry,
						`${__(l10nEntry)} 0.00MB`
					)
				}
				break
			}
			default :
				serveIPC.l10n.stringLookup(l10nEntry).then((text) => { sendEntry(l10nEntry, text) })
				if ( doTitle ) {
					serveIPC.l10n.stringTitleLookup(l10nEntry).then((text) => {
						if ( text !== null ) { event.sender.send('fromMain_getText_return_title', [l10nEntry, text]) }
					})
				}
				break
		}
	}
})
ipcMain.on('toMain_getTextBase_send', (event, l10nSet) => {
	const sendEntry = (entry, text) => { event.sender.send('fromMain_getText_return_base', [entry, text]) }

	for ( const l10nEntry of l10nSet ) {
		serveIPC.l10n.baseStringLookup(l10nEntry).then((text) => { sendEntry(l10nEntry, text) })
	}
})
/** END: l10n Operation */

function doModLook_response(m, thisMod, thisUUID) {
	if ( Object.hasOwn(m, 'type') ) {
		switch (m.type) {
			case 'log' :
				serveIPC.log.log[m.level](m.data.join(' '), `worker-thread-${m.pid}`)
				break
			case 'modLook' : {
				for ( const logLine of m.logLines.items ) {
					serveIPC.log.log[logLine[0]](logLine[1], m.logLines.group)
				}

				if ( ! thisMod.isFolder ) {
					serveIPC.storeCacheDetail.set(thisUUID, {
						date    : new Date(),
						results : m.modLook,
					})
				}
				win.sendToValidWindow('detail', 'fromMain_lookRecord', m.modLook, serveIPC.l10n.currentUnits, serveIPC.l10n.currentLocale)

				serveIPC.log.log.debug(`Sent(got) modLook :: ${Object.keys(m.modLook.items).length} items`, `worker-thread-${m.pid}`)
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
		serveIPC.decodePath,
		serveIPC.l10n.deferCurrentLocale(),
		serveIPC.__('unit_hp')
	])
	lookThread.on('message', (m) => { doModLook_response(m, thisMod, thisUUID) })
	lookThread.send({
		type : 'look',
		data : {
			modRecord  : thisMod,
			searchPath : serveIPC.modCollect.modColUUIDToFolder(thisMod.colUUID),
		},
	})
	lookThread.send({ type : 'exit' })
}

/** Detail window operation */
function openDetailWindow(thisMod) {
	const thisUUID  = thisMod.uuid
	const slowStore = thisMod.modDesc.storeItems > 0 && (thisMod.fileDetail.isFolder || !serveIPC.storeCacheDetail.has(thisUUID))
	win.createNamedWindow(
		'detail',
		{ selected : thisMod, hasStore : slowStore },
		async () => {
			try {
				if ( thisMod.modDesc.storeItems > 0 ) {
					if ( !thisMod.fileDetail.isFolder && serveIPC.storeCacheDetail.has(thisUUID) ) {
						const thisCache = serveIPC.storeCacheDetail.get(thisUUID)
						serveIPC.storeCacheDetail.set(thisUUID, { // refresh data and details
							date    : new Date(),
							results : thisCache.results,
						})
						win.sendToValidWindow('detail', 'fromMain_lookRecord', thisCache.results, serveIPC.l10n.currentUnits, serveIPC.l10n.currentLocale)
						serveIPC.log.log.info(`Loaded details from cache :: ${thisUUID}`, 'mod-look')
						return
					}
					doModLook_thread(thisMod, thisUUID)
				}
			} catch (err) {
				serveIPC.log.log.notice(`Failed to load store items :: ${err}`, 'mod-look')
			}
		}
	)
}

ipcMain.on('toMain_openModDetail', (_, thisMod) => { openDetailWindow(serveIPC.modCollect.modColUUIDToRecord(thisMod)) })
/** END: Detail window operation */

/** Changelog window operation */
ipcMain.on('toMain_showChangelog', () => { win.createNamedWindow('change') } )
/** END: Changelog window operation */


/** Main window context menus */
ipcMain.on('toMain_dragOut', (event, modID) => {
	const thisMod     = serveIPC.modCollect.modColUUIDToRecord(modID)
	const thisFolder  = serveIPC.modCollect.modColUUIDToFolder(modID)
	const iconDataURL = 'data:image/png;base64,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'

	event.sender.startDrag({
		file : path.join(thisFolder, path.basename(thisMod.fileDetail.fullPath)),
		icon : nativeImage.createFromDataURL(iconDataURL),
	})
})
ipcMain.on('toMain_modContextMenu', async (event, modID, modIDs, isHoldingPen) => {
	const thisMod   = serveIPC.modCollect.modColUUIDToRecord(modID)
	const thisSite  = serveIPC.storeSites.get(thisMod.fileDetail.shortName, '')
	const thisPath  = serveIPC.modCollect.mapDashedToFullPath(modID)
	const isSave    = thisMod.badgeArray.includes('savegame')
	const notMod    = thisMod.badgeArray.includes('notmod')
	const isLog     = thisMod.badgeArray.includes('log')

	const template = [
		{
			label : thisMod.fileDetail.shortName,
			icon  : win.contextIcons.mod,
		},
		menuSep,
	]

	if ( !isSave && !notMod && !isLog ) {
		template.push({
			click : () => { openDetailWindow(thisMod) },
			icon  : win.contextIcons.modDetail,
			label : __('context_mod_detail'),
		})
	} else if ( isLog ) {
		template.push({
			click : () => {
				funcLib.gameSet.loadGameLog(thisPath)
				win.createNamedWindow('gamelog')
			},
			icon  : win.contextIcons.log,
			label : __('button_gamelog__title'),
		})
	} else if ( isSave ) {
		const subMenu = [...serveIPC.modCollect.collections]
			.filter((x) => serveIPC.modCollect.versionSame(x, 22))
			.map((collectKey) => ({
				label : serveIPC.modCollect.mapCollectionToName(collectKey),
				click : () => {
					win.createNamedWindow('save', { collectKey : collectKey })
					setTimeout(() => { saveCompare_read(thisPath, thisMod.fileDetail.isFolder) }, 250)
				},
			}))

		template.push({
			icon    : win.contextIcons.save,
			label   : __('check_save_text'),
			submenu : subMenu,
		})
	}

	template.push(
		menuSep,
		{
			click : () => { shell.showItemInFolder(thisPath) },
			icon  : win.contextIcons.openExplorer,
			label : __('open_folder'),
		}
	)
	
	if ( thisMod.modHub.id !== null ) {
		template.push({
			click : () => { shell.openExternal(funcLib.general.doModHub(thisMod.modHub.id)) },
			icon  : win.contextIcons.externalSite,
			label : __('open_hub'),
		})
	}

	const didDepend = Array.isArray(thisMod.modDesc.depend) && thisMod.modDesc.depend.length !== 0
	if ( didDepend ) {
		template.push(
			menuSep,
			{
				icon    : win.contextIcons.depend,
				label   : __('menu_depend_on'),
				submenu : thisMod.modDesc.depend.map((x) => ( { label : x } )),
			}
		)
	}

	const requireBy = serveIPC.modCollect.getModCollectionFromDashed(modID).requireBy
	if ( Object.hasOwn(requireBy, thisMod.fileDetail.shortName) ) {
		if ( ! didDepend ) { template.push(menuSep) }

		template.push(
			{
				icon    : win.contextIcons.required,
				label   : __('menu_require_by'),
				submenu : requireBy[thisMod.fileDetail.shortName].map((x) => ({ label : x })),
			}
		)
	}

	template.push(
		menuSep,
		{
			click : () => { win.sendToWindow('main', 'fromMain_modInfoPop', thisMod, thisSite) },
			icon  : win.contextIcons.externalSiteSet,
			label : __('context_set_website'),
		}
	)

	if ( thisSite !== '' ) {
		template.push({
			click : () => { shell.openExternal(thisSite) },
			icon  : win.contextIcons.externalSite,
			label : __('context_open_website'),
		})
	}

	template.push(
		menuSep,
		{
			click : () => { handleCopyMoveDelete('confirmCopy', [modID], [thisMod]) },
			icon  : win.contextIcons.fileCopy,
			label : __('copy_to_list'),
		},
		{
			click : () => { handleCopyMoveDelete('confirmMove', [modID], [thisMod]) },
			icon  : win.contextIcons.fileMove,
			label : __('move_to_list'),
		},
		{
			click : () => { handleCopyMoveDelete('confirmDelete', [modID], [thisMod]) },
			icon  : win.contextIcons.fileDelete,
			label : __('remove_from_list'),
		}
	)

	if ( modIDs.length !== 0 ) {
		template.push(
			menuSep,
			{
				click : () => {
					if (isHoldingPen) {
						handleCopyMoveDelete('confirmMultiCopy', modIDs)
					}  else {
						handleCopyMoveDelete('confirmCopy', modIDs)
					}
				},
				icon  : win.contextIcons.fileCopy,
				label : __('copy_selected_to_list'),
			},
			{
				click : () => {
					if (isHoldingPen) {
						handleCopyMoveDelete('confirmMultiMove', modIDs)
					}  else {
						handleCopyMoveDelete('confirmMove', modIDs)
					}
				},
				icon  : win.contextIcons.fileMove,
				label : __('move_selected_to_list'),
			},
			{
				click : () => { handleCopyMoveDelete('confirmDelete', modIDs) },
				icon  : win.contextIcons.fileDelete,
				label : __('remove_selected_from_list'),
			}
		)
	}

	const menu = Menu.buildFromTemplate(template)
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})

ipcMain.on('toMain_mainContextMenu', async (event, collection) => {
	const subLabel  = serveIPC.modCollect.mapCollectionToFullName(collection)
	const colFolder = serveIPC.modCollect.mapCollectionToFolder(collection)
	const template  = [
		{
			icon     : win.contextIcons.collection,
			label    : __('context_main_title').padEnd(subLabel.length, ' '),
			sublabel : subLabel,
		},
		menuSep,
		{
			click   : () => { funcLib.gameSet.change(collection) },
			enabled : (colFolder !== serveIPC.gameSetOverride.folder),
			icon    : win.contextIcons.active,
			label   : __('list-active'),
		},
		menuSep,
		{
			click : () => { shell.openPath(serveIPC.modCollect.mapCollectionToFolder(collection))},
			icon  : win.contextIcons.openExplorer,
			label : __('open_folder'),
		}
	]

	const noteMenu = ['username', 'password', 'website', 'admin', 'server']
		.map((x) => [x, serveIPC.storeNote.get(`${collection}.notes_${x}`, null)])
		.filter((x) => x[1] !== null )
		.map((x) => ({
			label : `${__('context_main_copy')} : ${__(`notes_title_${x[0]}`)}`,
			icon  : win.contextIcons.copy,
			click : () => { clipboard.writeText(x[1], 'selection') },
		}))

	if ( noteMenu.length !== 0 ) {
		template.push(menuSep, ...noteMenu)
	}
	
	const menu = Menu.buildFromTemplate(template)
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})
ipcMain.on('toMain_notesContextMenu', async (event) => {
	const template  = [
		{ role : 'cut',   label : __('context_cut'), icon : win.contextIcons.cut },
		{ role : 'copy',  label : __('context_copy'), icon : win.contextIcons.copy },
		{ role : 'paste', label : __('context_paste'), icon : win.contextIcons.paste },
	]

	const menu = Menu.buildFromTemplate(template)
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})
ipcMain.on('toMain_logContextMenu', async (event) => {
	const template  = [
		{ role : 'copy', label : __('context_copy'), icon : win.contextIcons.copy },
	]

	const menu = Menu.buildFromTemplate(template)
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})
/** END: Main window context menus */


/** Game log window operation */
ipcMain.on('toMain_openGameLog',       () => {
	if ( serveIPC.watch.log === null ) {
		if ( serveIPC.storeSet.get('game_log_file') === null ) {
			const gameSettingsFileName = funcLib.prefs.verGet('game_settings', serveIPC.storeSet.get('game_version'))
			serveIPC.storeSet.set('game_log_file', path.join(path.dirname(gameSettingsFileName), 'log.txt'))
		}
		funcLib.gameSet.loadGameLog()
	}

	win.createNamedWindow('gamelog')
})
ipcMain.on('toMain_openGameLogFolder', () => { shell.showItemInFolder(funcLib.prefs.gameLogFile()) })
ipcMain.on('toMain_getGameLog',        () => { funcLib.gameSet.readGameLog() })
ipcMain.on('toMain_guessGameLog',      () => {
	serveIPC.storeSet.set('game_log_auto', true)
	funcLib.gameSet.loadGameLog()
	funcLib.gameSet.readGameLog()
})
ipcMain.on('toMain_clearGameLog',      () => {
	const thisGameLog = funcLib.prefs.gameLogFile()

	if ( thisGameLog === null || !fs.existsSync(thisGameLog) ) { return }

	try {
		fs.writeFileSync(thisGameLog, '')
	} catch (err)  {
		serveIPC.log.log.danger(`Could not clear specified log : ${err}`, 'game-log')
	}
	funcLib.gameSet.readGameLog()
})
ipcMain.on('toMain_changeGameLog',     () => {
	dialog.showOpenDialog(win.win.prefs, {
		properties  : ['openFile'],
		defaultPath : path.join(serveIPC.path.setFolder, 'log.txt'),
		filters     : [
			{ name : 'Log Files', extensions : ['txt'] },
			{ name : 'All', extensions : ['*'] },
		],
	}).then((result) => {
		if ( ! result.canceled ) {
			funcLib.gameSet.loadGameLog(result.filePaths[0])
			funcLib.gameSet.readGameLog()
		}
	}).catch((err) => {
		serveIPC.log.log.danger(`Could not read specified log : ${err}`, 'game-log')
	})
})

/** END: Game log window operation */

/** Debug window operation */
ipcMain.on('toMain_openDebugLog',    () => { win.createNamedWindow('debug') })
ipcMain.on('toMain_openDebugFolder', () => { shell.showItemInFolder(serveIPC.log.pathToLog) })
ipcMain.on('toMain_getDebugLog',     (event) => { event.sender.send('fromMain_debugLog', serveIPC.log.htmlLog) })
/** END: Debug window operation */

/** Game launcher */
function gameLauncher() {
	const launchLog      = serveIPC.log.group('game-launcher')
	const currentVersion = serveIPC.storeSet.get('game_version')
	const gameArgs       = funcLib.prefs.verGet('game_args', currentVersion)
	const progPath       = funcLib.prefs.verGet('game_path', currentVersion)
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
			title   : __('launcher_error_title'),
			message : __('launcher_error_message'),
		}
		dialog.showMessageBox(null, dialogOpts)
		launchLog.warning('Game path not set or invalid!')
	}
}
ipcMain.on('toMain_startFarmSim', () => { gameLauncher() })
/** END: game launcher */


// Compare window operation
function compare_base(id) { serveIPC.windowLib.sendToValidWindow('compare', 'fromMain_addBaseItem', id) }
function compare_mod(content, source) { serveIPC.windowLib.sendToValidWindow('compare', 'fromMain_addModItem', content, source) }

ipcMain.on('toMain_openCompareBase', (_, baseGameItemID) => {
	serveIPC.windowLib.raiseOrOpen('compare', () => { compare_base(baseGameItemID) })
})
ipcMain.on('toMain_openCompareBaseMulti', (_, baseGameItemIDs) => {
	serveIPC.windowLib.raiseOrOpen('compare', () => {
		for ( const thisItemID of baseGameItemIDs ) { compare_base(thisItemID) }
	})
})
ipcMain.on('toMain_openCompareMulti', (_, itemMap, source) => {
	serveIPC.windowLib.raiseOrOpen('compare', () => {
		for ( const thisItem of itemMap ) {
			if ( thisItem.internal ) {
				compare_base(thisItem.key)
			} else {
				compare_mod(thisItem.contents, source)
			}
		}
	})
})
ipcMain.on('toMain_openCompareMod', (_, itemContents, source) => {
	serveIPC.windowLib.raiseOrOpen('compare', () => { compare_mod(itemContents, source) })
})
ipcMain.on('toMain_openBaseGame', () => {  serveIPC.windowLib.createNamedWindow('basegame') })
ipcMain.on('toMain_openBaseGameDeep', (_, type, page) => {
	serveIPC.windowLib.raiseOrOpen('basegame', () => {
		serveIPC.windowLib.sendToValidWindow('basegame', 'fromMain_forceNavigate', type, page)
	})
})
ipcMain.on('toMain_openBaseFolder', (_, folderParts) => {
	const gamePath = path.dirname(funcLib.prefs.verGet('game_path', 22))

	if ( typeof gamePath !== 'string') { return }

	const dataPathParts = gamePath.split(path.sep)
	const dataPath = path.join(...(dataPathParts[dataPathParts.length - 1] === 'x64' ? dataPathParts.slice(0, -1) : dataPathParts), 'data', ...folderParts)
	
	shell.openPath(dataPath)
})
// END : Compare window operation

// Find-All window operation
ipcMain.on('toMain_openFind', () => {  serveIPC.windowLib.createNamedWindow('find') })
ipcMain.on('toMain_findContextMenu', async (event, thisMod) => {
	const menu = Menu.buildFromTemplate(funcLib.menu.page_find(thisMod))
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})
// END : Find-All window operation

// Mini-mode operation
ipcMain.on('toMain_toggleMiniPin', () => { serveIPC.windowLib.toggleAlwaysOnTop('mini'); refreshClientModList() })
ipcMain.on('toMain_openMiniMode',  () => { toggleMiniWindow() })
const toggleMiniWindow = () => {
	if ( serveIPC.windowLib.isValid('mini') && serveIPC.windowLib.isVisible('mini') ) {
		serveIPC.windowLib.safeClose('mini')
	} else {
		serveIPC.windowLib.createNamedWindow('mini')
		serveIPC.windowLib.toggleAlwaysOnTop('mini', true)
	}
}
// END : Mini-mode operation

// Preferences operations
ipcMain.on('toMain_getPref', (event, name)    => { event.returnValue = serveIPC.storeSet.get(name) })
ipcMain.on('toMain_setPref', (_, name, value) => { funcLib.prefs.setNamed(name, value) })
ipcMain.on('toMain_resetWindows',   () => { serveIPC.windowLib.resetPositions() })
ipcMain.on('toMain_clearCacheFile', () => {
	serveIPC.storeCache.clearAll()
	serveIPC.windowLib.forceFocus('main')
	processModFolders(true)
})
ipcMain.on('toMain_clearDetailCacheFile', () => {
	serveIPC.storeCacheDetail.clear()
	serveIPC.windowLib.sendToValidWindow('main', 'fromMain_l10n_refresh', serveIPC.l10n.currentLocale)
})
ipcMain.on('toMain_cleanCacheFile', () => {
	const md5Set     = new Set(serveIPC.storeCache.keys)
	
	for ( const collectKey of serveIPC.modCollect.collections ) {
		for ( const thisSum of Array.from(Object.values(serveIPC.modCollect.getModListFromCollection(collectKey)), (mod) => mod.md5Sum).filter((x) => x !== null) ) {
			md5Set.delete(thisSum)
		}
	}

	for ( const md5 of md5Set ) { delete serveIPC.storeCache.remMod(md5) }

	serveIPC.storeCache.saveFile()

	setTimeout(() => {
		serveIPC.windowLib.sendToValidWindow('main', 'fromMain_l10n_refresh', serveIPC.l10n.currentLocale)
	}, 1000)
})
ipcMain.on('toMain_setPrefFile',    (_, version) => { funcLib.prefs.changeFilePath(version, false) })
ipcMain.on('toMain_setGamePath',    (_, version) => { funcLib.prefs.changeFilePath(version, true) })
ipcMain.on('toMain_setGameVersion', (_, version) => { funcLib.prefs.changeGameVersion(version) })
// END : Preferences operations

// Setup Wizard Functions
ipcMain.on('toMain_showSetupWizard', () => { openWizard() })
function openWizard() {
	serveIPC.windowLib.createNamedWindow('setup', {}, () => {
		serveIPC.windowLib.sendModList(
			{
				currentLocale          : serveIPC.l10n.currentLocale,
				devControls            : serveIPC.devControls,
				folders                : [...serveIPC.modFolders],
				wizardSettings         : funcLib.wizard.getSettings(),
			},
			'fromMain_modList',
			'setup',
			false
		)
	})
}
// END : Setup Wizard Functions

// Collection Settings Operation (notes)
function openNotesWindow(collectKey) {
	serveIPC.windowLib.createNamedWindow('notes', {
		collectKey       : collectKey,
		lastGameSettings : serveIPC.gameSetOverride.xml,
	})
}
ipcMain.on('toMain_openNotes', (_, collectKey) => { openNotesWindow(collectKey) })
ipcMain.on('toMain_setNote', (_, id, value, collectKey) => {
	const cleanValue = ( id === 'notes_version' ) ? parseInt(value, 10) : value

	if ( cleanValue === '' ) {
		serveIPC.storeNote.delete(`${collectKey}.${id}`)
	} else {
		serveIPC.storeNote.set(`${collectKey}.${id}`, cleanValue)
	}

	openNotesWindow(collectKey)
})
ipcMain.on('toMain_setModInfo', (_, mod, site) => {
	serveIPC.storeSites.set(mod, site)
	refreshClientModList()
})
// END : Collection Settings Operation (notes)

// Download operation
ipcMain.on('toMain_cancelDownload', () => { if ( serveIPC.dlRequest !== null ) { serveIPC.dlRequest.abort() } })
ipcMain.on('toMain_downloadList',   (_, collection) => { funcLib.general.importZIP(collection) })
// END : Download operation

// Export operations
ipcMain.on('toMain_exportList', (_, collection) => { funcLib.general.exportCSV(collection) })
ipcMain.on('toMain_exportZip', (_, selectedMods) => { funcLib.general.exportZIP(selectedMods) })
// END : Export operations

// Save game manager operation
ipcMain.on('toMain_openSaveManage', () => { funcLib.saveManage.refresh() })
ipcMain.on('toMain_saveManageCompare', (_, fullPath, collectKey) => {
	serveIPC.windowLib.createNamedWindow('save', { collectKey : collectKey })
	setTimeout(() => { saveCompare_read(fullPath, true) }, 250)
})
ipcMain.on('toMain_saveManageDelete',  (_, fullPath) => { funcLib.saveManage.delete(fullPath) })
ipcMain.on('toMain_saveManageExport',  (_, fullPath) => { funcLib.saveManage.export(fullPath) })
ipcMain.on('toMain_saveManageRestore', (_, fullPath, newSlot) => { funcLib.saveManage.restore(fullPath, newSlot) })
ipcMain.on('toMain_saveManageImport',  (_, fullPath, newSlot) => { funcLib.saveManage.doImport(fullPath, newSlot) })
ipcMain.on('toMain_saveManageGetImport', () => { funcLib.saveManage.getImport() })
// END : Save game manager operation

// Save game tracker window operation
ipcMain.on('toMain_openSaveTrack',   () => { serveIPC.windowLib.createNamedWindow('save_track') })
ipcMain.on('toMain_openTrackFolder', () => {
	const options = {
		properties  : ['openDirectory'],
		defaultPath : serveIPC.path.setFolder,
	}

	dialog.showOpenDialog(serveIPC.windowLib.win.save_track, options).then((result) => {
		if ( !result.canceled ) {
			try {
				new savegameTrack(result.filePaths[0]).getInfo().then((results) => {
					serveIPC.windowLib.sendModList({ saveInfo : results }, 'fromMain_saveInfo', 'save_track', false )
				})
			} catch (err) {
				serveIPC.log.danger('save-track', 'Load failed', err)
			}
		}
	}).catch((err) => {
		serveIPC.log.danger('save-track', 'Could not read specified folder', err)
	})
})
// END : Save game tracker window operation

// Savegame compare window operation
ipcMain.on('toMain_openSave',       (_, collection) => { serveIPC.windowLib.createNamedWindow('save', { collectKey : collection }) })
ipcMain.on('toMain_selectInMain',   (_, selectList) => {
	if ( serveIPC.windowLib.isValid('main') ) {
		serveIPC.windowLib.win.main.focus()
		serveIPC.windowLib.sendToWindow('main', 'fromMain_selectOnly', selectList)
	}
})
ipcMain.on('toMain_openSaveFolder', () => { saveCompare_open(false) })
ipcMain.on('toMain_openSaveZIP',    () => { saveCompare_open(true) })
ipcMain.on('toMain_openSaveDrop',   (_, type, thisPath) => {
	if ( type !== 'zip' && !fs.statSync(thisPath).isDirectory() ) { return }
	saveCompare_read(thisPath, type !== 'zip')
})

function saveCompare_read(thisPath, isFolder) {
	try {
		new saveFileChecker(thisPath, isFolder).getInfo().then((results) => {
			serveIPC.windowLib.sendModList({ thisSaveGame : results }, 'fromMain_saveInfo', 'save', false )
		})
	} catch (err) {
		serveIPC.log.danger('save-check', 'Load failed', err)
	}
}
function saveCompare_open(zipMode = false) {
	const options = {
		properties  : [(zipMode) ? 'openFile' : 'openDirectory'],
		defaultPath : serveIPC.path.setFolder,
		filters      : zipMode ?
			[{ name : 'ZIP Files', extensions : ['zip'] }] :
			null,
	}

	dialog.showOpenDialog(serveIPC.windowLib.win.save, options).then((result) => {
		if ( !result.canceled ) { saveCompare_read(result.filePaths[0], !zipMode) }
	}).catch((err) => {
		serveIPC.log.danger('save-check', 'Could not read specified file/folder', err)
	})
}
// END: Savegame compare window operation



// Version window operation
ipcMain.on('toMain_versionCheck',    () => { serveIPC.windowLib.createNamedWindow('version') })
ipcMain.on('toMain_refreshVersions', () => { serveIPC.windowLib.sendModList({}, 'fromMain_modList', 'version', false ) } )
ipcMain.on('toMain_versionResolve',  (_, shortName) => {
	const modSet    = []
	const foundMods = serveIPC.modCollect.shortNames[shortName]

	for ( const modPointer of foundMods ) {
		const frozen = serveIPC.storeNote.get(`${modPointer[0]}.notes_frozen`, false)
		const mod    = serveIPC.modCollect.modColAndUUID(modPointer[0], modPointer[1])
		
		if ( !mod.fileDetail.isFolder && !frozen ) {
			modSet.push({
				collectKey  : modPointer[0],
				collectName : serveIPC.modCollect.mapCollectionToName(modPointer[0]),
				modRecord   : mod,
				version     : mod.modDesc.version,
			})
		}
	}
	serveIPC.windowLib.createNamedWindow('resolve', {
		modSet    : modSet,
		shortName : shortName,
	})
})
// END: Version window operation */


// Common Handlers
ipcMain.on('toMain_closeSubWindow', (event) => { BrowserWindow.fromWebContents(event.sender).close() })
ipcMain.on('toMain_openHubByID',    (_, hubID) => { shell.openExternal(funcLib.general.doModHub(hubID)) })


// send status flags to main and mini
function refreshTransientStatus() {
	serveIPC.windowLib.sendToValidWindow('main', 'fromMain_gameUpdate', {
		botStatus          : serveIPC.modCollect.botDetails,
		gameRunning        : serveIPC.isGameRunning,
		gameRunningEnabled : serveIPC.isGamePolling,
		updateReady        : serveIPC.modCollect.updateIsReady,
	})
	serveIPC.windowLib.sendToValidWindow('mini', 'fromMain_gameUpdate', {
		gameRunning        : serveIPC.isGameRunning,
		gameRunningEnabled : serveIPC.isGamePolling,
	})
}

// Send mod list to main window
function refreshClientModList(closeLoader = true) {
	// DATA STRUCT - send mod list
	const currentVersion = serveIPC.storeSet.get('game_version', 22)
	const pollGame       = serveIPC.storeSet.get('poll_game', true)
	serveIPC.isGamePolling = currentVersion === 22 && pollGame
	
	// updateGameRunning()
	serveIPC.windowLib.sendModList(
		{
			activeCollection       : serveIPC.gameSetOverride.index,
			currentLocale          : serveIPC.l10n.currentLocale,
			devControls            : serveIPC.devControls,
			foldersDirty           : serveIPC.isFoldersDirty,
			foldersEdit            : serveIPC.isFoldersEdit,
			gameRunning            : serveIPC.isGameRunning,
			gameRunningEnable      : serveIPC.isGamePolling,
			l10n                   : {
				disable    : __('override_disabled'),
				unknown    : __('override_unknown'),
			},
			modSites               : serveIPC.storeSites.store,
			pinMini                : serveIPC.windowLib.isAlwaysOnTop('mini'),
			showMini               : serveIPC.windowLib.isVisible('mini'),
		},
		'fromMain_modList',
		'main',
		closeLoader
	)
}

// Start physical operation on file(s)
function doFileOperation(type, fileMap, srcWindow = null) {
	if ( typeof fileMap !== 'object' ) { return }

	if ( srcWindow !== null ) { serveIPC.windowLib.safeClose(srcWindow) }

	serveIPC.loadWindow.open('files')
	serveIPC.loadWindow.total(fileMap.length, true)
	serveIPC.loadWindow.current(0, true)

	serveIPC.loadWindow.doReady(() => { funcLib.realFileOperation(type, fileMap)})
}

// Launch mod scanner
async function processModFolders(force = false) {
	if ( serveIPC.isProcessing ) { return }
	if ( !force && !serveIPC.isFoldersDirty ) { serveIPC.loadWindow.hide(500); return }

	serveIPC.isProcessing = true

	serveIPC.loadWindow.open('mods')
	serveIPC.loadWindow.total(0, true)
	serveIPC.loadWindow.current(0, true)
	serveIPC.loadWindow.doReady(() => { funcLib.processor.readOnDisk() })
}

// Post Process on mod scanner
modQueueRunner.on('process-mods-done', () => {
	funcLib.general.toggleFolderDirty(false)
	funcLib.gameSet.read()
	funcLib.gameSet.gameXML(22)
	funcLib.gameSet.gameXML(19)
	funcLib.gameSet.gameXML(17)
	funcLib.gameSet.gameXML(15)
	funcLib.gameSet.gameXML(13)
	refreshClientModList()

	funcLib.general.doChangelog()

	serveIPC.isProcessing = false
})

// Application boot up
app.whenReady().then(() => {
	if ( gotTheLock ) {
		if ( serveIPC.storeSet.has('force_lang') && serveIPC.storeSet.get('lock_lang', false) ) {
			// If language is locked, switch to it.
			serveIPC.l10n.currentLocale = serveIPC.storeSet.get('force_lang')
		}

		if (process.platform === 'win32') {
			app.setAppUserModelId('jtsage.fsmodassist')
		}
		
		serveIPC.windowLib.tray = new Tray(serveIPC.icon.tray)
		serveIPC.windowLib.tray.setToolTip('FSG Mod Assist')
		serveIPC.windowLib.tray.on('click', () => { serveIPC.windowLib.win.main.show() })
		serveIPC.windowLib.tray.setContextMenu(Menu.buildFromTemplate([
			funcLib.menu.textL10n('app_name', () => { serveIPC.windowLib.win.main.show() }),
			funcLib.menu.sep,
			funcLib.menu.textL10n('mini_mode_button__title', () => { toggleMiniWindow() }),
			funcLib.menu.textL10n('launch_game', () => { gameLauncher() }),
			funcLib.menu.textL10n('tray_quit', () => { serveIPC.windowLib.win.main.close() }),
		]))

		funcLib.modHub.refresh()

		serveIPC.interval.modHub = setInterval(() => {
			funcLib.modHub.refresh()
		}, (6 * 60 * 60 * 1000))

		app.on('second-instance', (_, argv) => {
			// Someone tried to run a second instance, we should focus our window.
			if ( argv.includes('--start-game') ) { gameLauncher() }
			if ( serveIPC.windowLib.isValid('main') ) {
				if ( serveIPC.windowLib.win.main.isMinimized() || !serveIPC.windowLib.win.main.isVisible() ) { serveIPC.windowLib.win.main.show() }
				serveIPC.windowLib.win.main.focus()
			}
		})

		app.setUserTasks([
			{
				arguments : '--start-game',
				description : '',
				iconIndex : 0,
				iconPath  : serveIPC.icon.tray,
				program   : process.execPath,
				title     : __('launch_game'),
			}
		])

		serveIPC.windowLib.createMainWindow(() => {
			if ( serveIPC.storeSet.has('modFolders') ) {
				serveIPC.modFolders   = new Set(serveIPC.storeSet.get('modFolders'))
				funcLib.general.toggleFolderDirty()
				setTimeout(() => {
					if ( serveIPC.isFirstRun ) { openWizard() }
					processModFolders()
				}, 1500)
			}

			serveIPC.interval.gamePoll = setInterval(() => { funcLib.general.pollGame() }, 15e3)

			funcLib.discord.init()
		})

		app.on('quit',     () => {
			if ( serveIPC.windowLib.tray ) { serveIPC.windowLib.tray.destroy() }
			if ( serveIPC.watch.log ) { serveIPC.watch.log.close() }
		})
	}
})

// About panel
app.setAboutPanelOptions({
	applicationName    : 'FS Mod Assist',
	applicationVersion : app.getVersion(),
	copyright          : '(c) 2022-present FSG Modding',
	credits            : 'J.T.Sage <jtsage+datebox@gmail.com>',
	iconPath           : serveIPC.icon.tray,
	website            : 'https://github.com/FSGModding/FSG_Mod_Assistant',
})

app.on('window-all-closed', () => {	if (process.platform !== 'darwin') { app.quit() } })
