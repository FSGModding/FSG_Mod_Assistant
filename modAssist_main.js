/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */
// Main Program

const superDebugCache = false

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

/**
 * @typedef referenceFunctions
 * @property {function} gameLauncher launch the game
 * @property {function} processModFolders process mod folders
 * @property {function} readGameLog read the game log
 * @property {function} refreshClientModList refresh mod list in client
 * @property {function} refreshTransientStatus refresh status flags in client
 * @property {function} toggleMiniWindow toggle mini window on and off
 */

serveIPC.refFunc = {
	gameLauncher           : funcLib.gameLauncher,
	processModFolders      : processModFolders,
	refreshClientModList   : refreshClientModList,
	refreshTransientStatus : refreshTransientStatus,
	toggleMiniWindow       : toggleMiniWindow,
}

serveIPC.windowLib = new (require('./lib/modAssist_window_lib.js')).windowLib()
serveIPC.log.dangerCallBack = () => { serveIPC.isDebugDanger = true }

serveIPC.isModCacheDisabled = superDebugCache && !(app.isPackaged)

process.on('uncaughtException',  (err, origin) => { funcLib.general.handleUnhandled('exception', err, origin) })
process.on('unhandledRejection', (err, origin) => { funcLib.general.handleUnhandled('rejection', err, origin) })

if ( process.platform === 'win32' && app.isPackaged && gotTheLock && !isPortable ) { funcLib.general.initUpdater() }

funcLib.wizard.initMain()

const { modFileCollection, modPackChecker, saveFileChecker, savegameTrack, csvFileChecker } = require('./lib/modCheckLib.js')

const settingDefault = new (require('./lib/modAssist_window_lib.js')).defaultSettings()

serveIPC.isFirstRun = !fs.existsSync(path.join(app.getPath('userData'), 'config.json'))

serveIPC.storeSet         = new Store({schema : settingDefault.defaults, migrations : settingDefault.migrateBase, clearInvalidConfig : true })
serveIPC.storeCache       = new (require('./lib/modUtilLib.js')).modCacheManager(app.getPath('userData'))
serveIPC.storeSites       = new Store({name : 'mod_source_site', migrations : settingDefault.migrateSite, clearInvalidConfig : true})
serveIPC.storeNote        = new Store({name : 'col_notes', clearInvalidConfig : true})
serveIPC.storeCacheDetail = new Store({name : 'mod_detail_cache', clearInvalidConfig : true})

serveIPC.windowLib.loadSettings()

funcLib.general.doModCacheCheck() // Check and upgrade Mod Cache & Mod Detail Cache

serveIPC.modCollect = new modFileCollection( app.getPath('home'), modQueueRunner )

// MARK: sidebar buttons
ipcMain.on('files:openModHubID', (_, hubID) => { shell.openExternal(funcLib.general.doModHub(hubID)) })
ipcMain.on('files:openModHub',   (_, modID) => {
	const thisMod   = serveIPC.modCollect.modColUUIDToRecord(modID)

	if ( thisMod.modHub.id !== null ) {
		shell.openExternal(funcLib.general.doModHub(thisMod.modHub.id))
	}
})
ipcMain.on('files:openExtSite',  (_, modID) => {
	const thisMod     = serveIPC.modCollect.modColUUIDToRecord(modID)
	const thisModSite = serveIPC.storeSites.get(thisMod.fileDetail.shortName, null)

	if ( thisModSite !== null ) { shell.openExternal(thisModSite) }
})

ipcMain.on('files:openExplore',  (_, modID)    => {
	const thisMod = serveIPC.modCollect.modColUUIDToFolderAndRecord(modID)

	if ( thisMod.mod !== null ) {
		shell.showItemInFolder(path.join(thisMod.folder, path.basename(thisMod.mod.fileDetail.fullPath)))
	}
})

// MARK: file manage
ipcMain.handle('files:list',      (_, mode, mods) => getCopyMoveDelete(mode, mods))
ipcMain.handle('files:list:favs', ()              => getCopyMoveDelete('copyFavs', ...serveIPC.modCollect.getFavoriteCollectionFiles()))
ipcMain.handle('files:drop', async (_, files) => {
	if ( files.length === 1 && files[0].endsWith('.csv') ) {
		new csvFileChecker(files[0]).getInfo().then((results) => {
			serveIPC.windowLib.createNamedWindow('save', {
				collectKey   : null,
				thisSaveGame : results,
			})
		})
		return
	} else if ( files.length === 1 && files[0].endsWith('.json') ) {
		// TODO: HANDLE JSON IMPORT
		funcLib.general.importJSON_process(files[0])
	} else if ( files.length === 1 && files[0].endsWith('.zip') ) {
		return getCopyMoveDelete('import', null, null, files, await new modPackChecker(files[0]).getInfo())
	} else {
		return getCopyMoveDelete('import', null, null, files, false)
	}
})

function sendCopyMoveDelete(operation, modIDS) {
	serveIPC.windowLib.sendToValidWindow('main', 'files:operation', operation, getCopyMoveDelete(operation, modIDS))
}

function getCopyMoveDelete(operation, modIDS, multiSource = null, fileList = null, zipImport = false) {
	if ( modIDS === null || modIDS.length !== 0 ) {
		const isHolding = modIDS !== null ? serveIPC.storeNote.get(`${modIDS[0].split('--')[0]}.notes_holding`, false) : false
		return {
			isHoldingPen     : isHolding,
			isZipImport      : zipImport === false ? false : zipImport[0],
			multiDestination : isHolding && ( operation === 'copy' || operation === 'move' ),
			multiSource      : multiSource,
			operation        : operation,
			originCollectKey : modIDS !== null ? modIDS[0].split('--')[0] : '',
			rawFileList      : fileList,
			records          : modIDS !== null ? serveIPC.modCollect.modColUUIDsToRecords(modIDS) : [],
			zipFiles         : zipImport === false || zipImport[0] === false ? null : zipImport[1],
		}
	}
	return null
}

// MARK: folder manage
ipcMain.handle('folders:activate', async (_, CKey) => funcLib.gameSet.change(CKey) )
ipcMain.on('folders:addDirect', (event, potentialFolder) => {
	funcLib.processor.addFolderTracking(potentialFolder)
	event.sender.send( 'fromMain_allSettings', ...funcLib.commonSend.settings() )
})
ipcMain.on('folders:addDrop', (_, newFolder) => {
	funcLib.processor.addFolderTracking(newFolder)
	processModFolders()
})
ipcMain.on('folders:add', (notify_import = false) => {
	funcLib.general.showFileDialog({
		defaultPath : serveIPC.path.last ?? app.getPath('home'),
		filterAll   : false,
		parent      : notify_import ? 'importjson' : 'main',
		
		callback    : (result) => {
			const potentialFolder = result.filePaths[0]

			serveIPC.path.last = path.resolve(path.join(potentialFolder, '..'))
			funcLib.processor.addFolderTracking(potentialFolder, notify_import)
			if ( notify_import ) {
				serveIPC.windowLib.sendToValidWindow('importjson', 'fromMain_importFolder', {
					folder     : result.filePaths[0],
					collectKey : serveIPC.modCollect.getFolderHash(result.filePaths[0]),
					contents   : fs.readdirSync(result.filePaths[0]).length,
				})
			}
			processModFolders()
		},
	})
})
ipcMain.on('folders:edit',    () => {
	serveIPC.isFoldersEdit = ! serveIPC.isFoldersEdit
	refreshClientModList(false)
	if ( ! serveIPC.isFoldersEdit ) { processModFolders() }
})
ipcMain.on('folders:reload', () => { processModFolders(true) })
ipcMain.on('folders:open',   (_, CKey) => { shell.openPath(serveIPC.modCollect.mapCollectionToFolder(CKey)) })
ipcMain.on('folders:remove', (_, CKey) => {
	const folder = serveIPC.modCollect.mapCollectionToFolder(CKey)
	const userChoice = dialog.showMessageBoxSync(serveIPC.windowLib.win.main, {
		cancelId  : 1,
		defaultId : 1,
		message   : `${__('remove_folder_message')}\n\n${folder}`,
		title     : __('remove_folder__title'),
		type      : 'question',

		buttons : [
			serveIPC.__('bad_folder_action_delete'),
			serveIPC.__('save_manage_button_cancel'),
		],
	})

	switch (userChoice) {
		case 0: {
			if ( serveIPC.modFolders.delete(folder) ) {
				serveIPC.log.notice('folder-opts', 'Folder removed from tracking', folder)
				funcLib.prefs.saveFolders()
				serveIPC.modCollect.removeCollection(CKey)
				funcLib.general.toggleFolderDirty()
				refreshClientModList(false)
			} else {
				serveIPC.log.warning('folder-opts', 'Folder NOT removed from tracking', folder)
			}
			break
		}
		default :
			serveIPC.log.info('folder-opts', 'Folder remove canceled', folder)
	}
})
ipcMain.on('folders:alpha', () => {
	const newOrder = []
	const collator = new Intl.Collator()

	for ( const collectKey of serveIPC.modCollect.collections ) {
		newOrder.push({
			collectKey : collectKey,
			name       : serveIPC.modCollect.mapCollectionToName(collectKey),
			path       : serveIPC.modCollect.mapCollectionToFolder(collectKey),
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

	serveIPC.modFolders.modFolders         = newModFolders
	serveIPC.modCollect.newCollectionOrder = newModSetOrder

	funcLib.prefs.saveFolders()

	refreshClientModList(false)
})
ipcMain.on('folders:set', (_, from, to) => {
	const newOrder    = [...serveIPC.modFolders]
	const item        = newOrder.splice(from, 1)[0]

	newOrder.splice(to, 0, item)

	const newSetOrder = newOrder.map((thisPath) => serveIPC.modCollect.mapFolderToCollection(thisPath))

	serveIPC.modFolders                    = new Set(newOrder)
	serveIPC.modCollect.newCollectionOrder = new Set(newSetOrder)

	funcLib.prefs.saveFolders()

	refreshClientModList(false)
})


ipcMain.on('toMain_import_json_download', (_, collectKey, uri, unpack) => {
	funcLib.general.importJSON_download(uri, unpack, collectKey)
})


// l10n Operations


// MARK: i18n
ipcMain.on('toMain_getText_sync',   (event, l10nItem) => { event.returnValue = __(l10nItem) })
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
			case 'clear_malware_size' :
				sendEntry(l10nEntry, `[ ${serveIPC.storeSet.get('suppress_malware', []).join(', ')} ]`)
				break
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

ipcMain.handle('i18n:langList',   () => serveIPC.l10n.getLangList() )
ipcMain.handle('i18n:lang', (_e, newValue = null) => {
	if ( newValue !== null ) {
		serveIPC.l10n.currentLocale = newValue
		serveIPC.storeSet.set('force_lang', serveIPC.l10n.currentLocale)
		serveIPC.windowLib.refreshL10n()
	}
	return serveIPC.l10n.currentLocale
})
ipcMain.handle('i18n:get', async (_, key) => {
	switch (key) {
		case 'app_name':
			return serveIPC.l10n.getTextOverride(key, { prefix : '<i class="fsico-ma-large"></i>' })
		case 'app_version' :
			return serveIPC.l10n.getTextOverride(key, { newText : !app.isPackaged ? app.getVersion().toString() : '' })
		case 'game_icon' :
			return serveIPC.l10n.getTextOverride(key, { newText : `<i class="fsico-ver-${serveIPC.storeSet.get('game_version')}"></i>` })
		case 'game_icon_lg' :
			return serveIPC.l10n.getTextOverride(key, { newText : `<i class="fsico-ver-${serveIPC.storeSet.get('game_version')}"></i>` })
		case 'clean_cache_size' : {
			try {
				const cacheSize = fs.statSync(path.join(app.getPath('userData'), 'mod_cache.json')).size/(1024*1024)
				const iconSize  = fs.statSync(path.join(app.getPath('userData'), 'mod_icons.json')).size/(1024*1024)
				return serveIPC.l10n.getTextOverride(key, { suffix : ` ${cacheSize.toFixed(2)}MB / ${iconSize.toFixed(2)}MB` })
			} catch {
				return serveIPC.l10n.getTextOverride(key, { suffix : ' 0.00MB' })
			}
		}
		case 'clean_detail_cache_size' : {
			try {
				const cacheSize = fs.statSync(path.join(app.getPath('userData'), 'mod_detail_cache.json')).size/(1024*1024)
				return serveIPC.l10n.getTextOverride(key, { suffix : ` ${cacheSize.toFixed(2)}MB` })
			} catch {
				return serveIPC.l10n.getTextOverride(key, { suffix : ' 0.00MB' })
			}
		}
		case 'clear_malware_size' :
			return serveIPC.l10n.getTextOverride(key, { newText : `[ ${serveIPC.storeSet.get('suppress_malware', []).join(', ')} ]` })
		default :
			return serveIPC.l10n.getText(key)
	}
})
// END: l10n Operations


// #region COLLECT IPC
ipcMain.handle('collect:bindConflict', () => serveIPC.modCollect.renderBindConflict() )
ipcMain.handle('collect:malware',      () => ({ dangerModsSkip : serveIPC.whiteMalwareList, suppressList : serveIPC.storeSet.get('suppress_malware', []) }))
ipcMain.handle('collect:all',          () => serveIPC.modCollect.toRenderer())

ipcMain.handle('collect:resolveList',  (_, shortName) => serveIPC.modCollect.modVerListFiltered(shortName))
ipcMain.handle('collect:name',         (_, key) => serveIPC.modCollect.mapCollectionToName(key))

ipcMain.handle('mod:modColUUID', (_, fullUUID) => serveIPC.modCollect.renderMod(fullUUID))

ipcMain.handle('store:modColUUID', (_, fullUUID) => getStoreItems(fullUUID))
// #endregion


// MARK: detail
ipcMain.on('dispatch:detail', (_, thisMod) => { openDetailWindow(thisMod) })

function openDetailWindow(thisMod) {
	return serveIPC.windowLib.createNamedMulti('detail', { queryString : `mod=${thisMod}` })
}

async function getStoreItems(fullUUID) {
	const thisPromise   = Promise.withResolvers()
	const thisMod       = serveIPC.modCollect.modColUUIDToRecord(fullUUID)
	const thisCacheUUID = thisMod.uuid

	if ( !thisMod.fileDetail.isFolder && serveIPC.storeCacheDetail.has(thisCacheUUID) ) {
		const thisCache = serveIPC.storeCacheDetail.get(thisCacheUUID)
		serveIPC.storeCacheDetail.set(thisCacheUUID, { // refresh date
			date    : new Date(),
			results : thisCache.results,
		})
		thisPromise.resolve(thisCache.results)
		serveIPC.log.info('mod-look', 'Loaded details from cache', thisCacheUUID)
	} else {
		modStoreItems({
			thisMod : thisMod,
			cacheUUID : thisCacheUUID,
			thisPromise : thisPromise,
		})
	}

	return thisPromise.promise
}
// #endregion MOD DETAIL WINDOW


// MARK: compare
ipcMain.on('dispatch:compare', (_, compareArray) => openCompareWindow(compareArray))
ipcMain.handle('compare:get', () => Object.fromEntries(serveIPC.compareMap))
ipcMain.handle('compare:clear', () => {
	serveIPC.compareMap.clear()
	return Object.fromEntries(serveIPC.compareMap)
})
ipcMain.handle('compare:remove', (_, compareObj) => {
	serveIPC.compareMap.delete(compareObj)
	return Object.fromEntries(serveIPC.compareMap)
})
function openCompareWindow(compareArray) {
	if ( Array.isArray(compareArray) ) {
		for ( const compareObj of compareArray ) {
			const compareKey = compareObj.internal ? compareObj.key : `${compareObj.source}--${compareObj.key}`
			serveIPC.compareMap.set(compareKey, compareObj)
		}
	}
	serveIPC.windowLib.raiseOrOpen('compare', () => {
		serveIPC.windowLib.sendToValidWindow('compare', 'win:forceRefresh')
	})
}


// MARK: basegame
ipcMain.on('dispatch:basegame', (_, pageObj = { type : null, page : null}) => { openBaseGameWindow(pageObj.type, pageObj.page) })
ipcMain.on('basegame:folder', (_e, folderParts) => {
	const gamePath = path.dirname(funcLib.prefs.verGet('game_path', 22))

	if ( typeof gamePath !== 'string') { return }

	const dataPathParts = gamePath.split(path.sep)
	const dataPath      = path.join(...(dataPathParts[dataPathParts.length - 1] === 'x64' ? dataPathParts.slice(0, -1) : dataPathParts), 'data', ...folderParts)
	
	shell.openPath(dataPath)
})

function openBaseGameWindow(type = null, page = null) {
	serveIPC.windowLib.raiseOrOpen('basegame', () => {
		serveIPC.windowLib.setWindowURL(
			'basegame',
			( type === null || page === null ) ? null : { page : page, type : type }
		)
	})
}


// #region CONTEXT
ipcMain.on('context:copy', (event) => {
	const menu = Menu.buildFromTemplate(funcLib.menu.snip_copy())
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})
ipcMain.on('context:cutCopyPaste', (event) => {
	const menu = Menu.buildFromTemplate(funcLib.menu.snip_cut_copy_paste())
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})
ipcMain.on('context:find', (event, thisMod) => {
	const menu = Menu.buildFromTemplate(funcLib.menu.page_find(thisMod))
	menu.popup(BrowserWindow.fromWebContents(event.sender))
})
ipcMain.on('main:dragOut', (event, modID) => {
	const thisMod     = serveIPC.modCollect.modColUUIDToRecord(modID)
	const thisFolder  = serveIPC.modCollect.modColUUIDToFolder(modID)

	event.sender.startDrag({
		file : path.join(thisFolder, path.basename(thisMod.fileDetail.fullPath)),
		icon : serveIPC.windowLib.contextIcons.fileCopy,
	})
})
ipcMain.on('context:mod', async (event, modID, modIDs) => {
	const thisCollect = modID.split('--')[0]
	const thisMod     = serveIPC.modCollect.modColUUIDToRecord(modID)
	const thisSite    = serveIPC.storeSites.get(thisMod.fileDetail.shortName, '')
	const thisPath    = serveIPC.modCollect.mapDashedToFullPath(modID)
	const isSave      = thisMod.badgeArray.includes('savegame')
	const notMod      = thisMod.badgeArray.includes('notmod')
	const isLog       = thisMod.badgeArray.includes('log')

	const template = [
		funcLib.menu.icon(thisMod.fileDetail.shortName, null, 'mod'),
		funcLib.menu.sep,
	]

	if ( !isSave && !notMod && !isLog ) {
		template.push(funcLib.menu.iconL10n(
			'context_mod_detail',
			() => { openDetailWindow(modID) },
			'modDetail'
		))
	} else if ( isLog ) {
		template.push(funcLib.menu.iconL10n(
			'button_gamelog__title',
			() => {
				funcLib.gameSet.setGameLog(thisPath)
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
				icon  : serveIPC.windowLib.contextIcons.collection,
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
				submenu : thisMod.modDesc.depend.map((x) => funcLib.menu.doDepReq(x, thisCollect)),
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
				submenu : requireBy[thisMod.fileDetail.shortName].map((x) => funcLib.menu.doDepReq(x, thisCollect)),
			}
		)
	}

	template.push(
		funcLib.menu.sep,
		funcLib.menu.iconL10n(
			'context_set_website',
			() => { serveIPC.windowLib.sendToWindow('main', 'mods:site', thisMod) },
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
				() => { sendCopyMoveDelete('copy', modIDs) },
				'fileCopy'
			),
			funcLib.menu.iconL10n(
				'move_selected_to_list',
				() => { sendCopyMoveDelete('move', modIDs) },
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
ipcMain.on('context:collection', async (event, collection) => {
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
// #endregion


// MARK: game log
ipcMain.handle('gamelog:auto', () => {
	funcLib.gameSet.setGameLog(false)
	return funcLib.gameSet.streamGameLog()
})
ipcMain.handle('gamelog:open', () => {
	return dialog.showOpenDialog(serveIPC.windowLib.win.gamelog, {
		properties  : ['openFile'],
		defaultPath : path.join(serveIPC.path.setFolder, 'log.txt'),
		filters     : [{ name : 'Log Files', extensions : ['txt'] }],
	}).then((result) => {
		if ( ! result.canceled ) { funcLib.gameSet.setGameLog(result.filePaths[0]) }

		return funcLib.gameSet.streamGameLog()
	}).catch((err) => {
		serveIPC.log.danger('file-folder-chooser', 'Could not read specified file', err)
	})
})
ipcMain.handle('gamelog:get',     () => funcLib.gameSet.streamGameLog())
ipcMain.handle('gamelog:getFile', () => funcLib.prefs.gameLogFile())
ipcMain.on('gamelog:folder',   () => shell.showItemInFolder(funcLib.prefs.gameLogFile()) )
ipcMain.on('dispatch:gamelog', () => { serveIPC.windowLib.createNamedWindow('gamelog') })


// MARK : mini window
ipcMain.on('mini:togglePin', () => { serveIPC.windowLib.toggleAlwaysOnTop('mini'); refreshClientModList() })
ipcMain.on('dispatch:mini',  () => { toggleMiniWindow() })
function toggleMiniWindow () {
	if ( serveIPC.windowLib.isValid('mini') && serveIPC.windowLib.isVisible('mini') ) {
		serveIPC.windowLib.safeClose('mini')
	} else {
		serveIPC.windowLib.createNamedWindow('mini')
		serveIPC.windowLib.toggleAlwaysOnTop('mini', true)
	}
}

// MARK: settings IPC
ipcMain.handle('settings:dev',      () => serveIPC.devControls )
ipcMain.handle('settings:get',      (_, key) => {
	return serveIPC.storeSet.get(key)
})
ipcMain.handle('settings:set',      (_, key, value) => {
	funcLib.prefs.setNamed(key, value)
	return serveIPC.storeSet.get(key)
})
ipcMain.handle('settings:themeList', () => [
	['system', __('theme_name_system')],
	['light',  __('theme_name_light')],
	['dark',   __('theme_name_dark')],
])
ipcMain.handle('settings:verList',  ()       => funcLib.gameSet.verList() )
ipcMain.handle('settings:theme',    ()       => serveIPC.windowLib.themeCurrentColor )
ipcMain.handle('settings:units',    ()       => serveIPC.l10n.currentUnits )
ipcMain.handle('settings:lastGame', ()       => serveIPC.gameSetOverride.xml)
ipcMain.handle('settings:activeCollection', () => serveIPC.gameSetOverride.index )

ipcMain.on('settings:themeChange',  (_, theme) => { serveIPC.windowLib.changeTheme(theme) })
ipcMain.on('settings:resetWindows', () => { serveIPC.windowLib.resetPositions() })
ipcMain.on('settings:clearCache',   () => {
	serveIPC.storeCache.clearAll()
	serveIPC.windowLib.forceFocus('main')
	processModFolders(true)
})
ipcMain.on('settings:clearMalware', () => {
	serveIPC.storeSet.set('suppress_malware', [])
	processModFolders(true)
})
ipcMain.on('settings:clearDetail', () => {
	serveIPC.storeCacheDetail.clear()
	return true
})
ipcMain.on('cache:clear', () => {
	serveIPC.storeCache.clearAll()
	serveIPC.windowLib.forceFocus('main')
	processModFolders(true)
})
ipcMain.on('cache:malware', () => {
	serveIPC.storeSet.set('suppress_malware', [])
	processModFolders(true)
})
ipcMain.on('cache:detail', () => {
	serveIPC.storeCacheDetail.clear()
	serveIPC.windowLib.sendToValidWindow('main', 'settings:invalidate')
})
ipcMain.on('cache:clean', () => {
	const md5Set     = new Set(serveIPC.storeCache.keys)
	
	for ( const collectKey of serveIPC.modCollect.collections ) {
		for ( const thisSum of Array.from(Object.values(serveIPC.modCollect.getModListFromCollection(collectKey)), (mod) => mod.md5Sum).filter((x) => x !== null) ) {
			md5Set.delete(thisSum)
		}
	}

	for ( const md5 of md5Set ) { delete serveIPC.storeCache.remMod(md5) }

	serveIPC.storeCache.saveFile()

	setTimeout(() => {
		serveIPC.windowLib.sendToValidWindow('main', 'settings:invalidate')
	}, 500)
})
ipcMain.on('settings:prefFile',    (_, version) => { funcLib.prefs.changeFilePath(version, false) })
ipcMain.on('settings:gamePath',    (_, version) => { funcLib.prefs.changeFilePath(version, true) })


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
			'mods:list',
			'setup',
			false
		)
	})
}
// END : Setup Wizard Functions


// MARK: notes & sites
ipcMain.on('dispatch:notes', (_, key) => { serveIPC.windowLib.createNamedWindow('notes', { collectKey : key }) })
ipcMain.handle('settings:collection:get',   (_, collectKey) => serveIPC.modCollect.renderCollectNotes(collectKey) )
ipcMain.handle('settings:collection:set',   (_, collectKey, key, value) => {
	const cleanValue = ( key === 'notes_version' ) ? parseInt(value) : value

	funcLib.prefs.setOrDelete(serveIPC.storeNote, `${collectKey}.${key}`, cleanValue)
	return serveIPC.modCollect.renderCollectNotes(collectKey)
})

ipcMain.handle('settings:site', (_, mod, site = false) => {
	if ( site !== false ) {
		if ( site === '' || site === null ) {
			serveIPC.storeSites.delete(mod)
		} else {
			serveIPC.storeSites.set(mod, site)
		}
		refreshClientModList()
	}
	return serveIPC.storeSites.get(mod, '')
})

// MARK: download
ipcMain.on('file:downloadCancel', () => { if ( serveIPC.dlRequest !== null ) { serveIPC.dlRequest.abort() } })
ipcMain.on('file:download',   (_, CKey) => { funcLib.general.importZIP(CKey) })


// MARK: export
ipcMain.on('file:exportCSV', (_, CKey) => { funcLib.general.exportCSV(CKey) })
ipcMain.on('file:exportZIP', (_, mods) => { funcLib.general.exportZIP(mods) })


// Save game manager operation
ipcMain.on('dispatch:savemanage', () => { funcLib.saveManage.refresh() })
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
ipcMain.on('dispatch:savetrack',   () => { serveIPC.windowLib.createNamedWindow('save_track') })
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
ipcMain.on('dispatch:save',       (_, collection) => { serveIPC.windowLib.createNamedWindow('save', { collectKey : collection }) })
ipcMain.on('select:listInMain', (_, selectList) => {
	if ( serveIPC.windowLib.isValid('main') ) {
		serveIPC.windowLib.win.main.focus()
		serveIPC.windowLib.sendToWindow('main', 'select:list', selectList)
	}
})
ipcMain.on('save:folder', () => { saveCompare_open(false) })
ipcMain.on('save:file',    () => { saveCompare_open(true) })
ipcMain.on('save:drop',   (_, type, thisPath) => {
	if ( type !== 'zip' && !fs.statSync(thisPath).isDirectory() ) { return }
	saveCompare_read(thisPath, type !== 'zip')
})
ipcMain.on('save:cacheGameSave', (_, payload) => {
	serveIPC.cacheGameSave = payload
	refreshClientModList()
})

function saveCompare_read(thisPath, isFolder) {
	try {
		new saveFileChecker(thisPath, isFolder).getInfo().then((results) => {
			serveIPC.windowLib.sendModList({ thisSaveGame : results }, 'save:saveInfo', 'save', false )
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

// MARK: version resolve
ipcMain.on('dispatch:version', () => { serveIPC.windowLib.createNamedWindow('version') })
ipcMain.on('dispatch:resolve', (_, key) => { serveIPC.windowLib.createNamedWindow('resolve', { shortName : key }) })

// MARK: debug log
ipcMain.on('debug:log', (_e, level, process, ...args) => { serveIPC.log[level](process, ...args) })
ipcMain.handle('debug:all', () => serveIPC.log.htmlLog )
ipcMain.on('dispatch:debug', () => {
	serveIPC.isDebugDanger = false
	serveIPC.windowLib.createNamedWindow('debug')
})

// MARK: misc window.
ipcMain.on('dispatch:changelog', () => { serveIPC.windowLib.createNamedWindow('change') } )
ipcMain.on('dispatch:find', () => { serveIPC.windowLib.createNamedWindow('find') } )
ipcMain.on('dispatch:game', ()         => { funcLib.gameLauncher() })
ipcMain.on('dispatch:help', ()         => { shell.openExternal('https://fsgmodding.github.io/FSG_Mod_Assistant/') })
ipcMain.on('win:clipboard', (_, value) => clipboard.writeText(value, 'selection') )
ipcMain.on('win:openURL',   (_, url)   => { shell.openExternal(url) })
ipcMain.on('win:close',     (e)        => { BrowserWindow.fromWebContents(e.sender).close() })

ipcMain.on('main:minimizeToTray',   () => { serveIPC.windowLib.sendToTray() })
ipcMain.on('main:runUpdateInstall', () => {
	if ( serveIPC.modCollect.updateIsReady ) {
		serveIPC.autoUpdater.quitAndInstall()
	} else {
		serveIPC.log.debug('auto-update', 'Auto-Update Called Before Ready.')
	}
})


// MARK: app status flags
ipcMain.handle('state:all', () => { return {
	botStatus          : serveIPC.modCollect.botDetails,
	dangerDebug        : serveIPC.isDebugDanger,
	gameRunning        : serveIPC.isGameRunning,
	gameRunningEnabled : serveIPC.isGamePolling,
	pinMini            : serveIPC.windowLib.isAlwaysOnTop('mini'),
	updateReady        : serveIPC.modCollect.updateIsReady,
}})

// MARK: refresh status
function refreshTransientStatus() {
	serveIPC.windowLib.sendToValidWindow('main', 'status:all')
	serveIPC.windowLib.sendToValidWindow('mini', 'status:all')
}

// MARK: refresh list
function refreshClientModList(closeLoader = true) {
	// DATA STRUCT - send mod list
	const currentVersion = serveIPC.storeSet.get('game_version', 22)
	const pollGame       = serveIPC.storeSet.get('poll_game', true)
	serveIPC.isGamePolling = currentVersion > 17 && pollGame
	
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
			isDev                  : !app.isPackaged,
			l10n                   : {
				disable    : __('override_disabled'),
				unknown    : __('override_unknown'),
			},
			modSites               : serveIPC.storeSites.store,
			pinMini                : serveIPC.windowLib.isAlwaysOnTop('mini'),
			showMini               : serveIPC.windowLib.isVisible('mini'),
		},
		'mods:list',
		'main',
		closeLoader
	)
	serveIPC.windowLib.sendToValidWindow('version', 'win:forceRefresh')
}


// MARK: FILE OPS
ipcMain.handle('file:operation', async (_, operations) => funcLib.fileOperation.process(operations))


// MARK: run scan
async function processModFolders(force = false) {
	if ( serveIPC.isProcessing ) { return }
	if ( !force && !serveIPC.isFoldersDirty ) { serveIPC.loadWindow.hide(500); return }

	serveIPC.isProcessing = true

	serveIPC.loadWindow.open('mods')
	serveIPC.loadWindow.total(0, true)
	serveIPC.loadWindow.current(0, true)
	serveIPC.loadWindow.doReady(() => { funcLib.processor.readOnDisk() })
}

// MARK: run scan (post)
modQueueRunner.on('process-mods-done', () => {
	funcLib.general.toggleFolderDirty(false)
	funcLib.gameSet.read()
	funcLib.gameSet.gameXML(22)
	funcLib.gameSet.gameXML(19)
	funcLib.gameSet.gameXML(17)
	funcLib.gameSet.gameXML(15)
	funcLib.gameSet.gameXML(13)
	refreshClientModList()

	serveIPC.isProcessing = false

	if ( serveIPC.modCollect.isDangerMods ) {
		const trashPromises = []
		const currentSavedIgnoreList = new Set(serveIPC.storeSet.get('suppress_malware', []))

		for (const thisBadMod of serveIPC.modCollect.dangerMods ) {
			// Ignore during run, we answered once.
			if ( serveIPC.ignoreMalwareList.has(thisBadMod) ) { continue }

			const thisMod = serveIPC.modCollect.modColUUIDToRecord(thisBadMod)

			// Always ignore, user has whitelisted file
			if ( currentSavedIgnoreList.has(thisMod.fileDetail.shortName) ) { continue }
			// Always ignore, file added to master whitelist
			if ( serveIPC.whiteMalwareList.has(thisMod.fileDetail.shortName) ) { continue }

			const thisMessage = [
				__('malware_dialog_intro'),
				'\n\n',
				__('malware_dialog_shortname'), ' : ', thisMod.fileDetail.shortName, '\n',
				__('malware_dialog_path'), ' : ', thisMod.fileDetail.fullPath, '\n',
				'\n',
				__('malware_dialog_outro'),
			].join('')

			const userChoice = dialog.showMessageBoxSync(serveIPC.windowLib.win.main, {
				cancelId  : 1,
				defaultId : 0,
				message   : thisMessage,
				title     : __('malware_dialog_title'),
				type      : 'question',
		
				buttons : [
					serveIPC.__('malware_button_delete'),
					serveIPC.__('malware_button_keep'),
					serveIPC.__('malware_button_false'),
				],
			})
			switch (userChoice) {
				case 0: {
					// delete the file.
					const fileName = path.basename(thisMod.fileDetail.fullPath)
					const pathName = serveIPC.modCollect.modColUUIDToFolder(thisBadMod)

					trashPromises.push(
						shell.trashItem(path.join(pathName, fileName)).then(() => {
							serveIPC.log.warning('malware-detector', 'Sent to trash', thisMod.fileDetail.fullPath)
							funcLib.general.toggleFolderDirty(true)
						}).catch((err) => {
							serveIPC.log.danger('malware-detector', 'Unable to remove', thisMod.fileDetail.fullPath, err)
						})
					)
					break
				}
				case 2:
					// whitelist the file, forever
					currentSavedIgnoreList.add(thisMod.fileDetail.shortName)
					serveIPC.storeSet.set('suppress_malware', [...currentSavedIgnoreList])
					serveIPC.log.warning('malware-detector', 'Whitelisted forever', thisMod.fileDetail.shortName)
					break
				default:
					// keep the file for this session only
					serveIPC.ignoreMalwareList.add(thisBadMod)
					serveIPC.log.warning('malware-detector', 'Ignoring for this session', thisMod.fileDetail.shortName)
					break
			}
		}
		Promise.allSettled(trashPromises).then(() => { funcLib.general.doChangelog(); processModFolders() })
	} else {
		funcLib.general.doChangelog()
	}
})

// MARK: APP START
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
		serveIPC.windowLib.trayContextMenu()

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

		serveIPC.log.on('logAdded', (level, item) => { serveIPC.windowLib.sendToValidWindow('debug', 'debug:item', level, item) })

		app.on('quit',     () => {
			if ( serveIPC.windowLib.tray ) { serveIPC.windowLib.tray.destroy() }
			if ( serveIPC.watch.log ) { serveIPC.watch.log.close() }
		})
	}
})

app.on('window-all-closed', () => {	if (process.platform !== 'darwin') { app.quit() } })


// #region ModLook
function modStoreItems({ thisMod = null, cacheUUID = null, thisPromise = null} = {}) {
	const lookThread = require('node:child_process').fork(path.join(__dirname, 'lib', 'queueRunner.js'), [
		23,
		serveIPC.decodePath,
		serveIPC.l10n.deferCurrentLocale(),
		serveIPC.__('unit_hp')
	])
	lookThread.on('message', (m) => {
		if ( Object.hasOwn(m, 'type') ) {
			switch (m.type) {
				case 'log' :
					serveIPC.log[m.level](`worker-thread-${m.pid}`, m.data.join(' '))
					break
				case 'modLook' : {
					for ( const logLine of m.logLines.items ) {
						serveIPC.log[logLine[0]](m.logLines.group, logLine[1])
					}
	
					if ( typeof m.modLook === 'undefined' ) {
						serveIPC.log.danger(`worker-thread-${m.pid}`, 'Unable to read mod file/folder!')
						break
					}
	
					if ( ! thisMod.isFolder ) {
						serveIPC.storeCacheDetail.set(cacheUUID, {
							date    : new Date(),
							results : m.modLook,
						})
					}
					
					thisPromise.resolve(m.modLook)
					serveIPC.log.debug(`worker-thread-${m.pid}`, `To main - modLook :: ${Object.keys(m.modLook.items).length} items`)
					break
				}
				case 'modLookFail' :
					thisPromise.reject(m.error)
					break
				default :
					break
			}
		}
		// doModLook_response(m, thisMod, thisUUID) })
	})

	lookThread.send({
		type : 'look',
		data : {
			modRecord  : thisMod,
			searchPath : serveIPC.modCollect.modColUUIDToFolder(thisMod.colUUID),
		},
	})
	lookThread.send({ type : 'exit' })
}
// #endregion ModLook Thread