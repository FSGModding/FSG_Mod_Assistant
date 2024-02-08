/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */
// Main Program

const { app, BrowserWindow, ipcMain, shell, dialog, Menu, Tray, clipboard } = require('electron')

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
	gameLauncher           : funcLib.gameLauncher,
	processModFolders      : processModFolders,
	readGameLog            : funcLib.gameSet.readGameLog,
	refreshClientModList   : refreshClientModList,
	refreshTransientStatus : refreshTransientStatus,
}

serveIPC.windowLib = new (require('./lib/modAssist_window_lib.js')).windowLib()
serveIPC.log.dangerCallBack = () => { serveIPC.windowLib.toggleMainDangerFlag() }

serveIPC.isModCacheDisabled = false && !(app.isPackaged)

process.on('uncaughtException',  (err, origin) => { funcLib.general.handleUnhandled('exception', err, origin) })
process.on('unhandledRejection', (err, origin) => { funcLib.general.handleUnhandled('rejection', err, origin) })

if ( process.platform === 'win32' && app.isPackaged && gotTheLock && !isPortable ) {
	funcLib.general.initUpdater()
}

funcLib.wizard.initMain()

const { modFileCollection, modPackChecker, saveFileChecker, savegameTrack, csvFileChecker } = require('./lib/modCheckLib.js')

const settingDefault = new (require('./lib/modAssist_window_lib.js')).defaultSettings()

serveIPC.isFirstRun = !fs.existsSync(path.join(app.getPath('userData'), 'config.json'))

serveIPC.storeSet         = new Store({schema : settingDefault.defaults, clearInvalidConfig : true })
serveIPC.storeCache       = new (require('./lib/modUtilLib.js')).modCacheManager(app.getPath('userData'))
serveIPC.storeSites       = new Store({name : 'mod_source_site', migrations : settingDefault.migrateSite, clearInvalidConfig : true})
serveIPC.storeNote        = new Store({name : 'col_notes', clearInvalidConfig : true})
serveIPC.storeCacheDetail = new Store({name : 'mod_detail_cache', clearInvalidConfig : true})

serveIPC.windowLib.loadSettings()

funcLib.general.doModCacheCheck() // Check and upgrade Mod Cache & Mod Detail Cache

serveIPC.modCollect = new modFileCollection( app.getPath('home'), modQueueRunner )

// Collection Buttons
ipcMain.on('toMain_makeInactive', () => { funcLib.gameSet.disable() })
ipcMain.on('toMain_makeActive',   (_, newList) => { funcLib.gameSet.change(newList) })
ipcMain.on('toMain_openMods',     (_, mods)    => {
	const thisMod = serveIPC.modCollect.modColUUIDToFolderAndRecord(mods[0])

	if ( thisMod.mod !== null ) {
		shell.showItemInFolder(path.join(thisMod.folder, path.basename(thisMod.mod.fileDetail.fullPath)))
	}
})
// END : Collection Buttons

// File & Collection Operations
ipcMain.on('toMain_copyFavorites',  () => { sendCopyMoveDelete('copyFavs', ...serveIPC.modCollect.getFavoriteCollectionFiles()) })
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
	setTimeout(() => { serveIPC.windowLib.sendModList({}, 'fromMain_modList', 'version', false ) }, 1500)
})
ipcMain.on('toMain_addFolder_direct', (event, potentialFolder) => {
	funcLib.processor.addFolderTracking(potentialFolder)
	event.sender.send( 'fromMain_allSettings', ...funcLib.commonSend.settings() )
})
ipcMain.on('toMain_addFolder', () => {
	funcLib.general.showFileDialog({
		defaultPath : serveIPC.path.last ?? app.getPath('home'),
		filterAll   : false,
		
		callback    : (result) => {
			const potentialFolder = result.filePaths[0]

			serveIPC.path.last = path.resolve(path.join(potentialFolder, '..'))
			funcLib.processor.addFolderTracking(potentialFolder)
			processModFolders()
		},
	})
})
ipcMain.on('toMain_editFolders',    () => {
	serveIPC.isFoldersEdit = ! serveIPC.isFoldersEdit
	refreshClientModList(false)
	if ( ! serveIPC.isFoldersEdit ) { processModFolders() }
})
ipcMain.on('toMain_refreshFolders', () => { processModFolders(true) })
ipcMain.on('toMain_openFolder',     (_, collectKey) => { shell.openPath(serveIPC.modCollect.mapCollectionToFolder(collectKey)) })
ipcMain.on('toMain_removeFolder',   (_, collectKey) => {
	const folder = serveIPC.modCollect.mapCollectionToFolder(collectKey)
	if ( serveIPC.modFolders.delete(folder) ) {
		serveIPC.log.notice('folder-opts', 'Folder removed from tracking', folder)
		funcLib.prefs.saveFolders()
		serveIPC.modCollect.removeCollection(collectKey)
		funcLib.general.toggleFolderDirty()
		refreshClientModList(false)
	} else {
		serveIPC.log.warning('folder-opts', 'Folder NOT removed from tracking', folder)
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
	funcLib.processor.addFolderTracking(newFolder)
	processModFolders()
})
ipcMain.on('toMain_dropFiles', (_, files) => {
	if ( files.length === 1 && files[0].endsWith('.csv') ) {
		new csvFileChecker(files[0]).getInfo().then((results) => {
			serveIPC.windowLib.createNamedWindow('save', {
				collectKey   : null,
				thisSaveGame : results,
			})
		})
		return
	} else if ( files.length === 1 && files[0].endsWith('.zip') ) {
		sendCopyMoveDelete('import', null, null, files, new modPackChecker(files[0]).getInfo())
	} else {
		sendCopyMoveDelete('import', null, null, files, false)
	}
})
function sendCopyMoveDelete(operation, modIDS, multiSource = null, fileList = null, isZipImport = false) {
	if ( modIDS === null || modIDS.length !== 0 ) {
		serveIPC.windowLib.sendToValidWindow('main', 'fromMain_fileOperation', {
			isZipImport      : isZipImport,
			multiSource      : multiSource,
			operation        : operation,
			originCollectKey : modIDS !== null ? modIDS[0].split('--')[0] : '',
			rawFileList      : fileList,
			records          : modIDS !== null ? serveIPC.modCollect.modColUUIDsToRecords(modIDS) : [],
		})
	}
}
// END: File & Collection Operations

// l10n Operations
ipcMain.on('toMain_langList_change', (_, lang) => {
	serveIPC.l10n.currentLocale = lang
	serveIPC.storeSet.set('force_lang', serveIPC.l10n.currentLocale)
	serveIPC.windowLib.refreshL10n(serveIPC.l10n.currentLocale)
})
ipcMain.on('toMain_themeList_change', (_, theme) => { serveIPC.windowLib.changeTheme(theme) })
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
		serveIPC.windowLib.themeCurrentColor
	)
})
ipcMain.on('toMain_getText_sync',   (event, l10nSet) => { event.returnValue = l10nSet.map((x) => ({ x : __(x) })) })
ipcMain.on('toMain_getText_locale', (event) => { event.returnValue = serveIPC.l10n.currentLocale })
ipcMain.on('toMain_getText_send', (event, l10nSet) => {
	const sendEntry  = (entry, text) => { returnL10n(event, entry, text) }
	const doTitle    = serveIPC.storeSet.get('show_tooltips', true)
	const curVersion = serveIPC.storeSet.get('game_version')

	sendEntry('__currentLocale__', serveIPC.l10n.currentLocale)

	for ( const l10nEntry of l10nSet ) {
		switch ( l10nEntry ) {
			case 'app_name':
				serveIPC.l10n.stringLookup(l10nEntry).then((text) => {
					sendEntry(l10nEntry, `<i class="fsico-ma-large"></i>${text}`)
				})
				break
			case 'app_version' :
				sendEntry(l10nEntry, app.isPackaged ? app.getVersion() : ''); break
			case 'game_icon' :
				sendEntry(l10nEntry, `<i class="fsico-ver-${curVersion}"></i>`); break
			case 'game_icon_lg' :
				sendEntry(l10nEntry, `<i class="fsico-ver-${curVersion}"></i>`)
				serveIPC.l10n.stringTitleLookup(l10nEntry).then((text) => { returnL10n(event, l10nEntry, text, 'title') })
				break
			case 'clean_cache_size' : {
				try {
					const cacheSize = fs.statSync(path.join(app.getPath('userData'), 'mod_cache.json')).size/(1024*1024)
					const iconSize  = fs.statSync(path.join(app.getPath('userData'), 'mod_icons.json')).size/(1024*1024)
					sendEntry(l10nEntry, `${__(l10nEntry)} ${cacheSize.toFixed(2)}MB / ${iconSize.toFixed(2)}MB` )
				} catch {
					sendEntry(l10nEntry, `${__(l10nEntry)} 0.00MB`)
				}
				break
			}
			case 'clean_detail_cache_size' : {
				try {
					const cacheSize = fs.statSync(path.join(app.getPath('userData'), 'mod_detail_cache.json')).size/(1024*1024)
					sendEntry(l10nEntry, `${__(l10nEntry)} ${cacheSize.toFixed(2)}MB` )
				} catch {
					sendEntry( l10nEntry, `${__(l10nEntry)} 0.00MB`)
				}
				break
			}
			default :
				serveIPC.l10n.stringLookup(l10nEntry).then((text) => { sendEntry(l10nEntry, text) })
				if ( doTitle ) {
					serveIPC.l10n.stringTitleLookup(l10nEntry).then((text) => {
						returnL10n(event, l10nEntry, text, 'title')
					})
				}
				break
		}
	}
})
ipcMain.on('toMain_getTextBase_send', (event, l10nSet) => {
	serveIPC.l10n.baseStringGroup(l10nSet).then((returnGroup) => {
		for ( const thisReturn of returnGroup ) {
			returnL10n(event, thisReturn[0], thisReturn[1], 'base')
		}
	})
})
function returnL10n(event, key, value, extra = null) {
	if ( value === null ) { return }
	event.sender.send(`fromMain_getText_return${extra !== null ? `_${extra}` : ''}`, [key, value])
}
// END: l10n Operations


// Detail window operation
function openDetailWindow(thisMod) {
	const thisUUID  = thisMod.uuid
	const slowStore = thisMod.modDesc.storeItems > 0 && (thisMod.fileDetail.isFolder || !serveIPC.storeCacheDetail.has(thisUUID))
	serveIPC.windowLib.createNamedWindow(
		'detail',
		{ selected : thisMod, hasStore : slowStore },
		async () => {
			try {
				if ( thisMod.modDesc.storeItems > 0 ) {
					if ( !thisMod.fileDetail.isFolder && serveIPC.storeCacheDetail.has(thisUUID) ) {
						const thisCache = serveIPC.storeCacheDetail.get(thisUUID)
						serveIPC.storeCacheDetail.set(thisUUID, { // refresh date
							date    : new Date(),
							results : thisCache.results,
						})
						serveIPC.windowLib.sendToValidWindow('detail', 'fromMain_lookRecord', thisCache.results, serveIPC.l10n.currentUnits, serveIPC.l10n.currentLocale)
						serveIPC.log.info('mod-look', 'Loaded details from cache', thisUUID)
						return
					}
					doModLook_thread(thisMod, thisUUID)
				}
			} catch (err) {
				serveIPC.log.notice('mod-look', 'Failed to load store items', err)
			}
		}
	)
}
ipcMain.on('toMain_openModDetail', (_, thisMod) => { openDetailWindow(serveIPC.modCollect.modColUUIDToRecord(thisMod)) })
// END : Detail window operation


// All Context menus
ipcMain.on('toMain_dragOut', (event, modID) => {
	const thisMod     = serveIPC.modCollect.modColUUIDToRecord(modID)
	const thisFolder  = serveIPC.modCollect.modColUUIDToFolder(modID)

	event.sender.startDrag({
		file : path.join(thisFolder, path.basename(thisMod.fileDetail.fullPath)),
		icon : serveIPC.windowLib.contextIcons.fileCopy,
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
		funcLib.menu.icon(thisMod.fileDetail.shortName, null, 'mod'),
		funcLib.menu.sep,
	]

	if ( !isSave && !notMod && !isLog ) {
		template.push(funcLib.menu.iconL10n(
			'context_mod_detail',
			() => { openDetailWindow(thisMod) },
			'modDetail'
		))
	} else if ( isLog ) {
		template.push(funcLib.menu.iconL10n(
			'button_gamelog__title',
			() => {
				funcLib.gameSet.loadGameLog(thisPath)
				serveIPC.windowLib.createNamedWindow('gamelog')
			},
			'log'
		))
	} else if ( isSave ) {
		const subMenu = [...serveIPC.modCollect.collections]
			.filter((x) => serveIPC.modCollect.versionSame(x, 22))
			.map(   (collectKey) => ({
				label : serveIPC.modCollect.mapCollectionToName(collectKey),
				click : () => {
					serveIPC.windowLib.createNamedWindow('save', { collectKey : collectKey })
					setTimeout(() => { saveCompare_read(thisPath, thisMod.fileDetail.isFolder) }, 250)
				},
			}))

		template.push(funcLib.menu.iconL10n('check_save_text', null, 'save', { submenu : subMenu }))
	}

	template.push(
		funcLib.menu.sep,
		funcLib.menu.iconL10n(
			'open_folder',
			() => { shell.showItemInFolder(thisPath) },
			'openExplorer'
		)
	)

	if ( thisPath.endsWith('.zip') ) {
		template.push(
			funcLib.menu.iconL10n(
				'open_zip',
				() => { shell.openPath(thisPath) },
				'openZip'
			)
		)
	}
	
	if ( thisMod.modHub.id !== null ) {
		template.push(funcLib.menu.iconL10n(
			'open_hub',
			() => { shell.openExternal(funcLib.general.doModHub(thisMod.modHub.id)) },
			'externalSite'
		))
	}

	const didDepend = Array.isArray(thisMod.modDesc.depend) && thisMod.modDesc.depend.length !== 0
	if ( didDepend ) {
		template.push(
			funcLib.menu.sep,
			{
				icon    : serveIPC.windowLib.contextIcons.depend,
				label   : __('menu_depend_on'),
				submenu : thisMod.modDesc.depend.map((x) => ( {
					click : () => { serveIPC.windowLib.sendToValidWindow('main', 'fromMain_filterOnly', x)},
					label : x,
				} )),
			}
		)
	}

	const requireBy = serveIPC.modCollect.getModCollectionFromDashed(modID).requireBy
	if ( Object.hasOwn(requireBy, thisMod.fileDetail.shortName) ) {
		if ( ! didDepend ) { template.push(funcLib.menu.sep) }

		template.push(
			{
				icon    : serveIPC.windowLib.contextIcons.required,
				label   : __('menu_require_by'),
				submenu : requireBy[thisMod.fileDetail.shortName].map((x) => ({
					click : () => { serveIPC.windowLib.sendToValidWindow('main', 'fromMain_filterOnly', x)},
					label : x,
				})),
			}
		)
	}

	template.push(
		funcLib.menu.sep,
		funcLib.menu.iconL10n(
			'context_set_website',
			() => { serveIPC.windowLib.sendToWindow('main', 'fromMain_modInfoPop', thisMod, thisSite) },
			'externalSiteSet'
		)
	)

	if ( thisSite !== '' ) {
		template.push(funcLib.menu.iconL10n(
			'context_open_website',
			() => { shell.openExternal(thisSite) },
			'externalSite'
		))
	}

	template.push(
		funcLib.menu.sep,
		funcLib.menu.iconL10n('copy_to_list', () => { sendCopyMoveDelete('copy', [modID]) }, 'fileCopy'),
		funcLib.menu.iconL10n('move_to_list', () => { sendCopyMoveDelete('move', [modID]) }, 'fileMove'),
		funcLib.menu.iconL10n('remove_from_list', () => { sendCopyMoveDelete('delete', [modID]) }, 'fileDelete')
	)

	if ( modIDs.length !== 0 ) {
		template.push(
			funcLib.menu.sep,
			funcLib.menu.iconL10n(
				'copy_selected_to_list',
				() => { sendCopyMoveDelete(isHoldingPen ? 'multiCopy' : 'copy', modIDs) },
				'fileCopy'
			),
			funcLib.menu.iconL10n(
				'move_selected_to_list',
				() => { sendCopyMoveDelete(isHoldingPen ? 'multiMove' : 'move', modIDs) },
				'fileMove'
			),
			funcLib.menu.iconL10n(
				'remove_selected_from_list',
				() => { sendCopyMoveDelete('delete', modIDs) },
				'fileDelete'
			)
		)
	}

	const menu = Menu.buildFromTemplate(template)
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})
ipcMain.on('toMain_mainContextMenu', async (event, collection) => {
	const template  = funcLib.menu.page_main_col(collection)

	const noteMenu = ['username', 'password', 'game_admin', 'website', 'admin', 'server']
		.map(   (x) => [x, serveIPC.storeNote.get(`${collection}.notes_${x}`, null)])
		.filter((x) => x[1] !== null )
		.map(   (x) => (funcLib.menu.icon(
			`${__('context_main_copy')} : ${__(`notes_title_${x[0]}`)}`,
			() => { clipboard.writeText(x[1], 'selection') },
			'copy'
		)))

	if ( noteMenu.length !== 0 ) {
		template.push(funcLib.menu.sep, ...noteMenu)
	}
	
	const menu = Menu.buildFromTemplate(template)
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})
ipcMain.on('toMain_notesContextMenu', async (event) => {
	const menu = Menu.buildFromTemplate(funcLib.menu.snip_cut_copy_paste())
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})
ipcMain.on('toMain_logContextMenu', async (event) => {
	const menu = Menu.buildFromTemplate(funcLib.menu.snip_copy())
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})
ipcMain.on('toMain_findContextMenu', async (event, thisMod) => {
	const menu = Menu.buildFromTemplate(funcLib.menu.page_find(thisMod))
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})
// END : Context Menus


// Game log window operation
ipcMain.on('toMain_openGameLog',       () => {
	serveIPC.windowLib.createNamedWindow('gamelog')
	if ( serveIPC.watch.log === null ) { funcLib.gameSet.loadGameLog() }
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
		serveIPC.log.danger('game-log', 'Could not clear specified log', err)
	}
	funcLib.gameSet.readGameLog()
})
ipcMain.on('toMain_changeGameLog',     () => {
	funcLib.general.showFileDialog({
		defaultPath : path.join(serveIPC.path.setFolder, 'log.txt'),
		extraFilter : { name : 'Log Files', extensions : ['txt'] },
		isFolder    : false,
		parent      : 'gamelog',

		callback : (result) => {
			funcLib.gameSet.loadGameLog(result.filePaths[0])
			funcLib.gameSet.readGameLog()
		},
	})
})
// END : Game log window operation

// Debug window operation
ipcMain.on('toMain_openDebugLog',    () => { serveIPC.windowLib.createNamedWindow('debug') })
ipcMain.on('toMain_openDebugFolder', () => { shell.showItemInFolder(serveIPC.log.pathToLog) })
ipcMain.on('toMain_getDebugLog',     (event) => { event.sender.send('fromMain_debugLog', serveIPC.log.htmlLog) })
// END : Debug window operation

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

// One-off window types.
ipcMain.on('toMain_showChangelog', () => { serveIPC.windowLib.createNamedWindow('change') } )
ipcMain.on('toMain_openFind',      () => { serveIPC.windowLib.createNamedWindow('find') })
// END : One-off window types.

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
ipcMain.on('toMain_saveCompareCacheSet', (_, payload) => {
	serveIPC.cacheGameSave = payload
	refreshClientModList()
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
ipcMain.on('toMain_log', (_, level, process, text) => { serveIPC.log[level](text, process) })
ipcMain.on('toMain_startFarmSim', () => { funcLib.gameLauncher() })
ipcMain.on('toMain_closeSubWindow', (event) => { BrowserWindow.fromWebContents(event.sender).close() })
ipcMain.on('toMain_openHubByID',    (_, hubID) => { shell.openExternal(funcLib.general.doModHub(hubID)) })
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
ipcMain.on('toMain_sendMainToTray',   () => { serveIPC.windowLib.sendToTray() })
ipcMain.on('toMain_runUpdateInstall', () => {
	if ( serveIPC.modCollect.updateIsReady ) {
		serveIPC.autoUpdater.quitAndInstall()
	} else {
		serveIPC.log.debug('auto-update', 'Auto-Update Called Before Ready.')
	}
})
ipcMain.on('toMain_populateClipboard', (_, text) => { clipboard.writeText(text, 'selection') })


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
			cacheGameSave          : serveIPC.cacheGameSave,
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
			funcLib.menu.textL10n('launch_game', () => { funcLib.gameLauncher() }),
			funcLib.menu.textL10n('tray_quit', () => { serveIPC.windowLib.win.main.close() }),
		]))

		funcLib.modHub.refresh()

		// 6 hour timer on refresh
		serveIPC.interval.modHub = setInterval(() => { funcLib.modHub.refresh() }, (216e5))

		app.on('second-instance', (_, argv) => {
			// Someone tried to run a second instance, we should focus our window.
			if ( argv.includes('--start-game') ) { funcLib.gameLauncher() }
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

app.on('window-all-closed', () => {	if (process.platform !== 'darwin') { app.quit() } })

// THREADS

// ModLook Threading
function doModLook_response(m, thisMod, thisUUID) {
	if ( Object.hasOwn(m, 'type') ) {
		switch (m.type) {
			case 'log' :
				serveIPC.log[m.level](`worker-thread-${m.pid}`, m.data.join(' '))
				break
			case 'modLook' : {
				for ( const logLine of m.logLines.items ) {
					serveIPC.log[logLine[0]](m.logLines.group, logLine[1])
				}

				if ( ! thisMod.isFolder ) {
					serveIPC.storeCacheDetail.set(thisUUID, {
						date    : new Date(),
						results : m.modLook,
					})
				}
				serveIPC.windowLib.sendToValidWindow('detail', 'fromMain_lookRecord', m.modLook, serveIPC.l10n.currentUnits, serveIPC.l10n.currentLocale)

				serveIPC.log.debug(`worker-thread-${m.pid}`, `To main - modLook :: ${Object.keys(m.modLook.items).length} items`)
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
// END : ModLook Threading