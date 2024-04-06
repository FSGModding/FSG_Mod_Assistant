/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main process function library

const { app, dialog, net, shell, clipboard } = require('electron')
const { autoUpdater } = require('electron-updater')
const { saveFileChecker, saveGameManager } = require('./modCheckLib.js')

const path         = require('node:path')
const fs           = require('node:fs')
const fxml         = require('fast-xml-parser')
const unzip        = require('unzip-stream')
const makeZip      = require('archiver')
const { serveIPC } = require('./modUtilLib.js')

const crashLog  = path.join(app.getPath('userData'), 'crash.log')

const general = {
	getPackPathAsar   : (...parts) => app.isPackaged ?
		path.join(process.resourcesPath, 'app.asar', ...parts) :
		path.join(app.getAppPath(), ...parts),
	getPackPathRender : (...parts) => general.getPackPathAsar('renderer', ...parts),
	getPackPathRoot   : (...parts) => app.isPackaged ?
		path.join(process.resourcesPath, '..', ...parts) :
		path.join(app.getAppPath(), ...parts),

	doBootLog : () => {
		const thisLog = serveIPC.log.group('app-startup')
		thisLog.info(`FSG ModAssist       : v${app.getVersion()}`)
		thisLog.info(` - Node.js Version  : v${process.versions.node}`)
		thisLog.info(` - Electron Version : v${process.versions.electron}`)
		thisLog.info(` - Chrome Version   : v${process.versions.chrome}`)
	},
	doChangelog     : () => {
		if ( serveIPC.storeSet.get('rel_notes') !== app.getVersion() ) {
			serveIPC.storeSet.set('rel_notes', app.getVersion() )
			serveIPC.log.info('app-startup', 'New version detected, showing changelog')
			if ( !serveIPC.isFirstRun ) {
				serveIPC.windowLib.createNamedWindow('change')
			}
		}
	},
	doModCacheCheck : () => {
		const thisLog = serveIPC.log.group('mod-cache')
		const [appVerMajor, appVerMinor] = serveIPC.storeSet.get('cache_version').split('.').map((x) => parseInt(x))
		const updateMajor  = 3
		const updateMinor  = 1
		const scriptMinor  = 5
		let updateRequired = false
		let scriptRequired = false

		if ( appVerMajor < updateMajor ) { updateRequired = true; scriptRequired = true }
		else if ( appVerMajor === updateMajor && appVerMinor < updateMinor ) { updateRequired = true }
		else if ( appVerMajor === updateMajor && appVerMinor < scriptMinor ) { scriptRequired = true }

		if ( scriptRequired && !updateRequired ) {
			thisLog.warning('Invalidating script mods.')
			let scriptModCount = 0
			for ( const thisUUID of serveIPC.storeCache.keys ) {
				const thisMod = serveIPC.storeCache.getMod(thisUUID)
				if ( thisMod.modDesc.scriptFiles !== 0 ) {
					scriptModCount++
					serveIPC.storeCache.remMod(thisUUID)
				}
			}
			thisLog.notice('Invalidated script mods', scriptModCount)
		}

		if ( updateRequired ) {
			thisLog.warning('Invalid Mod Cache (old), resetting.')
			serveIPC.storeCache.clearAll()
			thisLog.notice('Mod Cache Cleared')
		} else {
			thisLog.debug('Mod Cache Version Good')
		}

		if ( serveIPC.storeSet.get('cache_version') !== app.getVersion() ) {
			thisLog.notice('Version Changed, Mod Detail Cache Cleared')
			serveIPC.storeCacheDetail.clear()
		}

		serveIPC.storeSet.set('cache_version', app.getVersion())

		// Expire old details (1 week)
		const detailCache = serveIPC.storeCacheDetail.store
		const oneWeek     = Date.now() - ( 1000 * 60 * 60 * 24 * 7)
		let   deleteCount = 0

		for ( const uuidKey in detailCache ) {
			if ( Date.parse(detailCache[uuidKey].date) < oneWeek ) {
				deleteCount++
				delete detailCache[uuidKey]
			}
		}
		thisLog.debug('Expired Detail Cache Entries', deleteCount)
		serveIPC.storeCacheDetail.store = detailCache
	},
	doModHub : (mhID) => `https://www.farming-simulator.com/mod.php?mod_id=${mhID}`,

	handleUnhandled : (type, err, origin) => {
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
			serveIPC.log.debug(`net-error-${type}`, 'Network error', err)
		}
	},

	toggleFolderDirty : (newValue = true) => {
		serveIPC.isFoldersDirty = newValue
		serveIPC.windowLib.toggleMainDirtyFlag(newValue)
	},

	initUpdater : () => {
		const updateLog    = serveIPC.log.group('auto-update')
		autoUpdater.logger = updateLog
		autoUpdater.on('update-checking-for-update', () => { updateLog.debug('Checking for update') })
		autoUpdater.on('update-available',           () => { updateLog.info('Update Available') })
		autoUpdater.on('update-not-available',       () => { updateLog.debug('No Update Available') })

		autoUpdater.on('error', (message) => { updateLog.warning('Updater Failed', message) })

		autoUpdater.on('update-downloaded', () => {
			clearInterval(serveIPC.interval.update)
			updateLog.info('Update Downloaded and Ready')
			serveIPC.modCollect.updateIsReady = true
			serveIPC.refFunc.processModFolders()

			const bubbleOpts = {
				icon    : serveIPC.icon.tray,
				title   : serveIPC.__('app_name'),
				content : serveIPC.__('update_ready__title'),
			}

			if ( serveIPC.windowLib.tray && !serveIPC.windowLib.tray.isDestroyed() ) {
				serveIPC.windowLib.tray.displayBalloon(bubbleOpts)
			}
		})

		autoUpdater.checkForUpdatesAndNotify().catch((err) => updateLog.warning('Updater Issue', err))

		serveIPC.interval.update = setInterval(() => {
			autoUpdater.checkForUpdatesAndNotify().catch((err) => updateLog.warning('Updater Issue', err))
		}, ( 30 * 60 * 1000))
		serveIPC.autoUpdater = autoUpdater
	},

	pollGame : async () => {
		if ( ! serveIPC.isGamePolling ) {
			serveIPC.refFunc.refreshTransientStatus()
			return
		}
	
		return require('node:child_process').exec('tasklist /fi "IMAGENAME eq FarmingSimulator2022Game.exe" /fo csv /nh', (err, stdout) => {
			if ( err ) {
				serveIPC.log.notice('game-process-poll', 'Polling failed', err)
				return
			}
	
			let gameIsRunning = false
	
			for ( const psLine of stdout.split('\n') ) {
				if ( psLine.split(',')?.[0] === '"FarmingSimulator2022Game.exe"' ) {
					gameIsRunning = true
				}
			}
	
			if ( gameIsRunning && !serveIPC.isGameRunning ) {
				// log.log.debug('Game Started since last check', 'game-process-poll')
			} else if ( !gameIsRunning && serveIPC.isGameRunning ) {
				// log.log.debug('Game Stopped since last check', 'game-process-poll')
			}
			serveIPC.isGameRunning = gameIsRunning
			serveIPC.refFunc.refreshTransientStatus()
		})
	},

	doCSVRow  : (entries) => entries.map((entry) => `"${typeof entry === 'string' ? entry.replaceAll('"', '""') : entry }"`).join(','),
	exportCSV : (collection) => {
		const csvTable = []
		const csvLog   = serveIPC.log.group('csv-export')

		csvTable.push(general.doCSVRow(['Mod', 'Title', 'Version', 'Author', 'ModHub', 'Link']))

		for ( const mod of serveIPC.modCollect.getModListFromCollection(collection) ) {
			const modHubID    = mod.modHub.id
			const modHubLink  = ( modHubID !== null ) ? general.doModHub(modHubID) : ''
			const siteLink    = serveIPC.storeSites.get(mod.fileDetail.shortName, '')
			const modHubYesNo = ( modHubID !== null ) ? 'yes' : 'no'
			csvTable.push(general.doCSVRow([
				`${mod.fileDetail.shortName}.zip`,
				mod.l10n.title,
				mod.modDesc.version,
				mod.modDesc.author,
				modHubYesNo,
				modHubLink !== '' ? modHubLink : siteLink
			]))
		}

		dialog.showSaveDialog(serveIPC.windowLib.win.main, {
			defaultPath : path.join(app.getPath('desktop'), `${serveIPC.modCollect.mapCollectionToName(collection)}.csv`),
			filters     : [{ name : 'CSV', extensions : ['csv'] }],
		}).then(async (result) => {
			if ( result.canceled ) {
				csvLog.debug('Save CSV Cancelled')
			} else {
				try {
					fs.writeFileSync(result.filePath, csvTable.join('\n'))
					app.addRecentDocument(result.filePath)
					serveIPC.windowLib.doDialogBox('main', { messageL10n : 'save_csv_worked' })
				} catch (err) {
					csvLog.warning('Could not save csv file', err)
					serveIPC.windowLib.doDialogBox('main', { type : 'warning', messageL10n : 'save_csv_failed' })
				}
			}
		}).catch((err) => {
			csvLog.warning('Could not save csv file', err)
		})
	},
	exportJSON : (collection) => {
		const jsonLog   = serveIPC.log.group('json-export')

		dialog.showSaveDialog(serveIPC.windowLib.win.main, {
			defaultPath : path.join(app.getPath('desktop'), `${serveIPC.modCollect.mapCollectionToName(collection)}.json`),
			filters     : [{ name : 'JSON', extensions : ['json'] }],
		}).then(async (result) => {
			if ( result.canceled ) {
				jsonLog.debug('Save JSON Cancelled')
			} else {
				try {
					fs.writeFileSync(result.filePath, JSON.stringify({
						collection_color       : parseInt(serveIPC.modCollect.getSafeNote(collection, 'color')),
						collection_description : serveIPC.modCollect.getSafeNote(collection, 'tagline'),
						download_direct        : [],
						download_unzip         : [],
						force_frozen           : serveIPC.modCollect.getSafeNote(collection, 'frozen'),
						game_version           : serveIPC.modCollect.getSafeNote(collection, 'version'),
						server_downloads       : serveIPC.modCollect.getSafeNote(collection, 'websiteDL'),
						server_id              : serveIPC.modCollect.getSafeNote(collection, 'fsg_bot'),
						server_name            : serveIPC.modCollect.getSafeNote(collection, 'server'),
						server_password        : serveIPC.modCollect.getSafeNote(collection, 'password'),
						server_website         : serveIPC.modCollect.getSafeNote(collection, 'website'),
					}, null, 4))
					app.addRecentDocument(result.filePath)
					serveIPC.windowLib.doDialogBox('main', { messageL10n : 'save_json_worked' })
				} catch (err) {
					jsonLog.warning('Could not save json file', err)
					serveIPC.windowLib.doDialogBox('main', { type : 'warning', messageL10n : 'save_json_failed' })
				}
			}
		}).catch((err) => {
			jsonLog.warning('Could not save json file', err)
		})
	},
	exportZIP : (selectedMods) => {
		const filePaths = []
		const zipLog    = serveIPC.log.group('zip-export')
	
		for ( const mod of serveIPC.modCollect.modColUUIDsToRecords(selectedMods) ) {
			filePaths.push([mod.fileDetail.shortName, mod.fileDetail.fullPath, mod.fileDetail.isFolder])
		}
	
		dialog.showSaveDialog(serveIPC.windowLib.win.main, {
			defaultPath : app.getPath('desktop'),
			filters     : [
				{ name : 'ZIP', extensions : ['zip'] },
			],
		}).then(async (result) => {
			if ( result.canceled ) {
				zipLog.debug('Export ZIP Cancelled')
			} else {
				try {
					serveIPC.loadWindow.open('makezip')
					serveIPC.loadWindow.total(filePaths.length, true)
					serveIPC.loadWindow.current(0, true)
	
					const zipOutput  = fs.createWriteStream(result.filePath)
					const zipArchive = makeZip('zip', {
						zlib : { level : 6 },
					})
					
					zipOutput.on('close', () => {
						zipLog.info('ZIP file created', result.filePath)
						app.addRecentDocument(result.filePath)
						serveIPC.loadWindow.hide()
					})
	
					zipArchive.on('error', (err) => {
						serveIPC.loadWindow.hide()
						zipLog.warning('Could not create zip file', err)
						setTimeout(() => {
							serveIPC.windowLib.doDialogBox('main', { type : 'warning', messageL10n : 'save_zip_failed' })
						}, 1500)
					})
	
					zipArchive.on('warning', (err) => {
						zipLog.warning('Could not create zip file', err)
					})
	
					zipArchive.on('entry', (entry) => {
						serveIPC.loadWindow.current()
						zipLog.info('Added file to ZIP', entry.name)
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
					zipLog.warning('Could not create zip file', err)
					serveIPC.loadWindow.hide()
					setTimeout(() => {
						serveIPC.windowLib.doDialogBox('main', { type : 'warning', messageL10n : 'save_zip_failed' })
					}, 1500)
				}
			}
		}).catch((err) => {
			zipLog.warning('Could not create zip file', err)
		})
	},
	importZIP : (collection) => {
		if ( serveIPC.isDownloading ) { return }
		const modDLLog = serveIPC.log.group('mod-download')
		const thisSite = serveIPC.storeNote.get(`${collection}.notes_website`, null)
		const thisDoDL = serveIPC.storeNote.get(`${collection}.notes_websiteDL`, false)
		const thisLink = `${thisSite}all_mods_download?onlyActive=true`

		if ( thisSite === null || !thisDoDL ) { return }

		serveIPC.windowLib.doDialogBox('main', {
			titleL10n : 'download_title',
			message   : `${serveIPC.__('download_started')} :: ${serveIPC.modCollect.mapCollectionToName(collection)}\n${serveIPC.__('download_finished')}`,
		})

		serveIPC.isDownloading = true
		modDLLog.info('Downloading Collection', collection)
		modDLLog.debug('Download Link', thisLink)

		serveIPC.dlRequest = net.request(thisLink)

		serveIPC.dlRequest.on('response', (response) => {
			modDLLog.info('Got download', response.statusCode)

			if ( response.statusCode < 200 || response.statusCode >= 400 ) {
				serveIPC.windowLib.doDialogBox('main', {
					type      : 'error',
					titleL10n : 'download_title',
					message   : `${serveIPC.__('download_failed')} :: ${serveIPC.modCollect.mapCollectionToName(collection)}`,
				})
				serveIPC.isDownloading = false
			} else {
				serveIPC.loadWindow.open('download', true)

				serveIPC.loadWindow.total(response.headers['content-length'] || 0, true, true)
				serveIPC.loadWindow.current(0, true, true)

				const dlPath      = path.join(app.getPath('temp'), `${collection}.zip`)
				const writeStream = fs.createWriteStream(dlPath)

				response.pipe(writeStream)
				response.on('data', (chunk) => { serveIPC.loadWindow.current(chunk.length, false, true) })

				writeStream.on('finish', () => {
					writeStream.close()
					modDLLog.info('Download complete, unzipping')
					try {
						let zipBytesSoFar   = 0
						const zipBytesTotal = fs.statSync(dlPath).size

						serveIPC.loadWindow.open('zip')
						serveIPC.loadWindow.total(100, true)

						const zipReadStream  = fs.createReadStream(dlPath)

						zipReadStream.on('data', (chunk) => {
							zipBytesSoFar += chunk.length
							serveIPC.loadWindow.current(((zipBytesSoFar/zipBytesTotal)*100).toFixed(2), true)
						})

						zipReadStream.on('error', (err) => {
							serveIPC.loadWindow.hide()
							serveIPC.isDownloading = false
							modDLLog.danger('Download unzip failed', err)
						})

						zipReadStream.on('end', () => {
							modDLLog.info('Unzipping complete')
							zipReadStream.close()
							fs.unlinkSync(dlPath)
							serveIPC.isDownloading = false
							serveIPC.refFunc.processModFolders(true)
						})
						const extract = unzip.Extract({ path : serveIPC.modCollect.mapCollectionToFolder(collection) })

						zipReadStream.pipe(extract)

						extract.on('error', (err) => {
							serveIPC.loadWindow.hide()
							serveIPC.isDownloading = false
							modDLLog.danger('Download unzip failed', err)
						})
					} catch (err) {
						modDLLog.danger('Download failed', response.statusCode, err)
						serveIPC.loadWindow.hide()
					}
				})
			}
		})
		serveIPC.dlRequest.on('abort', () => {
			modDLLog.notice('Download canceled')
			serveIPC.isDownloading = false
			serveIPC.loadWindow.hide()
		})
		serveIPC.dlRequest.on('error', (err) => {
			serveIPC.windowLib.doDialogBox('main', {
				type      : 'error',
				titleL10n : 'download_title',
				message   : `${serveIPC.__('download_failed')} :: ${err}`,
			})
			modDLLog.warning('Network error', err)
			serveIPC.isDownloading = false
			serveIPC.loadWindow.hide()
		})
		serveIPC.dlRequest.end()
	},

	showFileDialog : ({isFolder = true, defaultPath = null, filterAll = true, extraFilter = null, callback = null, parent = 'main'} = {}) => {
		const filters = []

		if ( extraFilter !== null ) { filters.push(extraFilter) }
		if ( filterAll !== null )   { filters.push({ name : 'All', extensions : ['*'] })}
		
		dialog.showOpenDialog(serveIPC.windowLib.win[parent], {
			properties  : [isFolder ? 'openDirectory' :'openFile'],
			defaultPath : defaultPath || app.getPath('home'),
			filters     : filters,
		}).then((result) => {
			if ( ! result.canceled ) {
				if ( typeof callback === 'function' ) {
					callback(result)
				} else {
					serveIPC.log.debug('file-folder-chooser', 'Invalid callback supplied')
				}
			} else {
				serveIPC.log.info('file-folder-chooser', 'Action canceled by user')
			}
		}).catch((err) => {
			serveIPC.log.danger('file-folder-chooser', 'Could not read specified file', err)
		})
	},
	
	importJSON_process : (filename) => {
		const jsonLog = serveIPC.log.group('json-import')
		try {
			const import_json = JSON.parse(fs.readFileSync(filename))
			const [isValid, errors] = general.importJSON_check(import_json)
			if ( !isValid ) {
				serveIPC.windowLib.doDialogBox('main', { type : 'warning', messageL10n : 'import_json_read_failed' })
				const errorList = errors.map((x) => x.message).join(' -- ')
				jsonLog.warning('Could not validate JSON file', errorList)
				return
			}
			serveIPC.windowLib.createNamedWindow('importjson', {
				thisImport   : import_json,
			})
		} catch (err) {
			jsonLog.warning('Could not load JSON file', err)
			serveIPC.windowLib.doDialogBox('main', { type : 'warning', messageL10n : 'import_json_load_failed' })
		}
	},

	importJSON_check : (parsed_json) => {
		const Ajv           = require('ajv')
		const addFormats    = require('ajv-formats')
		const ajv           = new Ajv({strict : false})
		addFormats(ajv)
		const import_schema = {
			properties : {
				collection_color       : { type : 'integer', maximum : 8, minimum : 0 },
				collection_description : { type : 'string', maxLength : 255 },
				download_direct        : {
					type  : 'array',
					items : { type : 'string', format : 'uri' },
				},
				download_unzip        : {
					type  : 'array',
					items : { type : 'string', format : 'uri' },
				},
				force_frozen          : { type : 'boolean', default : false },
				game_version          : {
					type : 'integer',
					enum : [22, 19, 17, 15, 13],
				},
				server_downloads      : { type : 'boolean', default : false },
				server_id             : { type : 'string', maxLength : 255 },
				server_name           : { type : 'string', maxLength : 255 },
				server_password       : { type : 'string', maxLength : 100 },
				server_website        : { anyOf : [
					{ type : 'string', maxLength : 255, format : 'uri' },
					{ type : 'string', maxLength : 0 },
				]},
			},
			required   : [
				'collection_color',
				'collection_description',
				'force_frozen',
				'game_version',
				'server_downloads',
				'server_id',
				'server_name',
				'server_password',
				'server_website'
			],
			type       : 'object',
		}
		const isValid = ajv.validate(import_schema, parsed_json)
		return [isValid, ajv.errors]
	},

	importJSON_download : (uri, unpack, collection) => {
		if ( serveIPC.isDownloading ) { return }
		const modDLLog = serveIPC.log.group('mod-download')

		serveIPC.isDownloading = true
		modDLLog.info('Downloading Collection', collection)
		modDLLog.debug('Download Link', uri)

		serveIPC.dlRequest = net.request(uri)

		serveIPC.dlRequest.on('response', (response) => {
			modDLLog.info('Got download', response.statusCode)

			if ( response.statusCode < 200 || response.statusCode >= 400 ) {
				serveIPC.windowLib.doDialogBox('importjson', {
					type      : 'error',
					titleL10n : 'download_title',
					message   : `${serveIPC.__('download_failed')} :: ${serveIPC.modCollect.mapCollectionToName(collection)}`,
				})
				serveIPC.isDownloading = false
			} else {
				serveIPC.loadJSON.open('download', true)

				serveIPC.loadJSON.total(response.headers['content-length'] || 0, true, true)
				serveIPC.loadJSON.current(0, true, true)

				const dlFile = new URL(uri).pathname.split('/').filter(Boolean).pop()

				const dlPath      = unpack ?
					path.join(app.getPath('temp'), `${collection}.zip`) :
					path.join(serveIPC.modCollect.mapCollectionToFolder(collection), dlFile)
				
				if ( !unpack && fs.existsSync(dlPath) ) { fs.rmSync(dlPath) }
				
				const writeStream = fs.createWriteStream(dlPath)

				response.pipe(writeStream)
				response.on('data', (chunk) => { serveIPC.loadJSON.current(chunk.length, false, true) })

				writeStream.on('finish', () => {
					writeStream.close()
					if ( !unpack ) {
						modDLLog.info('Download complete, finished!')
						modDLLog.info('Unzipping complete')
						serveIPC.isDownloading = false
						serveIPC.loadJSON.hide()
						serveIPC.refFunc.processModFolders(true)
						return
					}

					modDLLog.info('Download complete, unzipping')
					try {
						let zipBytesSoFar   = 0
						const zipBytesTotal = fs.statSync(dlPath).size

						serveIPC.loadJSON.open('zip')
						serveIPC.loadJSON.total(100, true)

						const zipReadStream  = fs.createReadStream(dlPath)

						zipReadStream.on('data', (chunk) => {
							zipBytesSoFar += chunk.length
							serveIPC.loadJSON.current(((zipBytesSoFar/zipBytesTotal)*100).toFixed(2), true)
						})

						zipReadStream.on('error', (err) => {
							serveIPC.loadJSON.hide()
							serveIPC.isDownloading = false
							modDLLog.danger('Download unzip failed', err)
						})

						zipReadStream.on('end', () => {
							modDLLog.info('Unzipping complete')
							zipReadStream.close()
							fs.unlinkSync(dlPath)
							serveIPC.isDownloading = false
							serveIPC.loadJSON.hide()
							serveIPC.refFunc.processModFolders(true)
						})
						const extract = unzip.Extract({ path : serveIPC.modCollect.mapCollectionToFolder(collection) })

						zipReadStream.pipe(extract)

						extract.on('error', (err) => {
							serveIPC.loadJSON.hide()
							serveIPC.isDownloading = false
							modDLLog.danger('Download unzip failed', err)
						})
					} catch (err) {
						modDLLog.danger('Download failed', response.statusCode, err)
						serveIPC.loadJSON.hide()
					}
				})
			}
		})
		serveIPC.dlRequest.on('abort', () => {
			modDLLog.notice('Download canceled')
			serveIPC.isDownloading = false
			serveIPC.loadJSON.hide()
		})
		serveIPC.dlRequest.on('error', (err) => {
			serveIPC.windowLib.doDialogBox('importjson', {
				type      : 'error',
				titleL10n : 'download_title',
				message   : `${serveIPC.__('download_failed')} :: ${err}`,
			})
			modDLLog.warning('Network error', err)
			serveIPC.isDownloading = false
			serveIPC.loadJSON.hide()
		})
		serveIPC.dlRequest.end()
	},
}

const discord = {
	discordID  : '1165310050013827123',
	DiscordRPC : require('discord-rpc'),
	thisLog    : null,
	thisRPC    : null,

	init       : () => {
		discord.thisLog = serveIPC.log.group('discord-rpc')
		if ( ! serveIPC.storeSet.get('use_discord', true ) ) {
			discord.thisLog.notice('Discord Rich Presence Disabled')
			return
		}
		discord.thisLog.notice('Discord Rich Presence Enabled')
		discord.thisRPC = new discord.DiscordRPC.Client({transport : 'ipc'})
		discord.thisRPC.login({ clientId : discord.discordID }).catch((err) => {
			discord.thisLog.notice('Discord Error', err)
		})
		discord.thisRPC.on('ready', () => {
			setInterval(() => { discord.setActivity() }, 15e3)
		})
		discord.thisRPC.on('error', (err) => {
			discord.thisLog.notice('Discord Error', err)
		})
	},
	setActivity : async () => {
		if ( !discord.thisRPC ) { return }
		if ( !serveIPC.windowLib.win.main ) { return }
	
		const custom_state  = serveIPC.storeSet.get('use_discord_c1', '' )
		const custom_detail = serveIPC.storeSet.get('use_discord_c2', '' )
		const discord_verb  = serveIPC.isGameRunning ? 'Playing' : 'Active'
	
		discord.thisRPC.setActivity({
			details        : custom_detail !== '' ? custom_detail : `${discord_verb} Collection: \n${serveIPC.gameSetOverride.folder !== null ? path.basename(serveIPC.gameSetOverride.folder) : '--'}`,
			instance       : true,
			largeImageKey  : 'fsgmaicon_large',
			largeImageText : `FSG Mod Assistant v.${!app.isPackaged ? 'NEXT' : app.getVersion()}`,
			state          : custom_state !== '' ? custom_state : `Managing ${serveIPC.modCollect.modFullCount} Mods`,
	
			buttons : [
				{label : 'Get Mod Assistant', url : 'https://github.com/FSGModding/FSG_Mod_Assistant/releases/latest'},
				{label : 'Visit FSG Website', url : 'https://farmsimgame.com/'}
			],
		}).catch((err) => {
			discord.thisLog.notice('Discord Error', err)
		})
	},
}

const wizard = {
	initMain    : () => {
		const theseFinds = wizard.getSettings(true, true)

		if ( theseFinds.games[22].length !== 0 ) {
			serveIPC.path.game = theseFinds.games[22][0][1]
		}
		if ( theseFinds.settings[22].length !== 0 ) {
			serveIPC.path.setFile = theseFinds.settings[22][0]
		}
		serveIPC.path.setFolder = theseFinds.settings.base
	},

	getSettings : (only22 = false, noMods = false) => {
		const settings     = wizard.getSettings_settings()
		const games        = wizard.getSettings_game(only22)
		const useMulti     = { 13 : false, 15 : false, 17 : false, 19 : false }
		let   multiVersion = false

		if ( !only22 ) {
			for ( const versionKey of [19, 17, 15, 13] ) {
				if ( games[versionKey].length !== 0 && settings[versionKey].length !== 0) {
					useMulti[versionKey] = true
					multiVersion         = true
				}
			}
		}

		return {
			games        : games,
			mods         : !noMods ? wizard.getSettings_mods(settings[22]) : null,
			multiVersion : multiVersion,
			settings     : settings,
			useMulti     : useMulti,
		}
	},
	getSettings_game : (only22 = false) => {
		let steamPath2VDF = null
		let steamFolders = []
		try {
			const steamPathRaw = require('node:child_process').spawnSync('reg query HKLM\\SOFTWARE\\Wow6432Node\\Valve\\Steam /v InstallPath', { shell : true })
			if ( steamPathRaw.error ) {
				steamPath2VDF = false
			} else {
				steamPath2VDF = [...steamPathRaw.stdout.toString().matchAll(/REG_SZ\s*(.+?)$/gm)][0][1]
			}
		} catch (err) {
			steamPath2VDF = false
		}

		if ( steamPath2VDF !== false && steamPath2VDF !== null ){
			const steamVDFFullPath = path.join(steamPath2VDF, 'steamapps', 'libraryfolders.vdf')
			if ( fs.existsSync(steamVDFFullPath) ) {
				const steamVDFFile = fs.readFileSync(steamVDFFullPath, {encoding : 'utf8'})
				steamFolders = [...steamVDFFile.matchAll(/^\s+"path"\s+"(.+?)"/gm)].map((x) => x[1])
			}
		}
		
		const allGameGuesses = {
			13 : [
				['eShop', 'C:\\Program Files (x86)\\Farming Simulator 2013\\FarmingSimulator2013.exe'],
				['Steam', 'steamapps\\common\\Farming Simulator 13\\FarmingSimulator2013.exe'],
				['Epic',  'C:\\Program Files\\Epic Games\\FarmingSimulator13\\FarmingSimulator2013.exe'],
			],
			15 : [
				['Epic',  'C:\\Program Files\\Epic Games\\FarmingSimulator15\\FarmingSimulator2015Game.exe'],
				['eShop', 'C:\\Program Files (x86)\\Farming Simulator 15\\FarmingSimulator2015Game.exe'],
				['Steam', 'steamapps\\common\\Farming Simulator 15\\FarmingSimulator2015Game.exe'],
			],
			17 : [
				['Epic',  'C:\\Program Files\\Epic Games\\FarmingSimulator17\\FarmingSimulator2017.exe'],
				['eShop', 'C:\\Program Files (x86)\\Farming Simulator 2017\\FarmingSimulator2017.exe'],
				['Steam', 'steamapps\\common\\Farming Simulator 17\\FarmingSimulator2017.exe'],
			],
			19 : [
				['eShop', 'C:\\Program Files (x86)\\Farming Simulator 2019\\FarmingSimulator2019.exe'],
				['Steam', 'steamapps\\common\\Farming Simulator 19\\FarmingSimulator2019.exe'],
				['Epic',  'C:\\Program Files\\Epic Games\\FarmingSimulator19\\FarmingSimulator2019.exe'],
				['XBox',  'C:\\XboxGames\\Farming Simulator 19 - Window 10 Edition\\Content\\gamelaunchhelper.exe'],
			],
			22 : [
				['eShop', 'C:\\Program Files (x86)\\Farming Simulator 2022\\FarmingSimulator2022.exe'],
				['Steam', 'steamapps\\common\\Farming Simulator 22\\FarmingSimulator2022.exe'],
				['Epic',  'C:\\Program Files\\Epic Games\\FarmingSimulator22\\FarmingSimulator2022.exe'],
				['XBox',  'C:\\XboxGames\\Farming Simulator 22 - Window 10 Edition\\Content\\gamelaunchhelper.exe'],
			],
		}

		const foundGames = {}
		for ( const versionKey of only22 ? [22] : Object.keys(allGameGuesses) ) {
			const gameTypes = allGameGuesses[versionKey]
			foundGames[versionKey] = []
			for ( const [typeKey, typePath] of Object.values(gameTypes) ) {
				if ( typeKey !== 'Steam' ) {
					if ( fs.existsSync(typePath) ) {
						foundGames[versionKey].push([typeKey, typePath])
					}
				} else {
					for ( const thisSteam of steamFolders ) {
						if ( fs.existsSync(path.join(thisSteam, typePath)) ) {
							foundGames[versionKey].push([typeKey, path.join(thisSteam, typePath)])
						}
					}
				}
			}
		}
		return foundGames
	},
	getSettings_mods : (settingsPaths) => {
		const returnObj = {
			isModFolder : false,
			baseModFolder : null,
			hasCollections : [],
		}
		for ( const modFolder of settingsPaths ) {
			const thisModFolder = path.join(path.dirname(modFolder), 'mods')
			if ( fs.existsSync(thisModFolder) ) {
				returnObj.baseModFolder = thisModFolder
				const folderContents = fs.readdirSync(thisModFolder, { withFileTypes : true })
				for ( const thisEntry of folderContents ) {
					if ( thisEntry.isDirectory() && ! thisEntry.name.startsWith('FS22')) {
						returnObj.hasCollections.push(path.join(thisModFolder, thisEntry.name))
					}
					if ( !returnObj.isModFolder && thisEntry.name.endsWith('.zip') ) {
						returnObj.isModFolder = true
					}
				}
			}
		}
		return returnObj
	},
	getSettings_settings : () => {
		const settingsPaths = {
			base : new Set([
				path.join(app.getPath('documents'), 'My Games'),
				path.join(app.getPath('home'), 'OneDrive', 'Documents', 'My Games'),
				path.join(app.getPath('home'), 'Documents', 'My Games')
			]),
			ver : [
				[22, 'FarmingSimulator2022'],
				[19, 'FarmingSimulator2019'],
				[17, 'FarmingSimulator2017'],
				[15, 'FarmingSimulator2015'],
				[13, 'FarmingSimulator2013'],
			],
		}
		const foundSettings = { base : '' }
		for ( const version of settingsPaths.ver ) {
			const thesePaths = [...settingsPaths.base].map((basePath) => {
				if ( version[0] === 22 && foundSettings.base === '' ) {
					const containFolder = path.join(basePath, version[1])
					if ( fs.existsSync(containFolder) ) {
						foundSettings.base = containFolder
					}
				}
				const fullPath = path.join(basePath, version[1], 'gameSettings.xml')
				return fs.existsSync(fullPath) ? fullPath : null
			}).filter((x) => x !== null)
			foundSettings[version[0]] = thesePaths
		}

		return foundSettings
	},
}

const commonSend = {
	settings : () => [
		serveIPC.storeSet.store,
		serveIPC.devControls,
		[...serveIPC.modFolders]
	],
}

const menu = {
	icon : (label, click = null, icon = null, extras = {}) => {
		const thisMenuItem = extras
		thisMenuItem.label = label
		if ( click !== null ) { thisMenuItem.click = click }
		if ( icon !== null )  { thisMenuItem.icon = serveIPC.windowLib.contextIcons[icon] }
		return thisMenuItem
	},
	iconL10n : (label, click = null, icon = null, extras = {}) => menu.icon(serveIPC.__(label), click, icon, extras),
	text     : (label, click = null, extras = {}) => menu.icon(label, click, null, extras),
	textL10n : (label, click = null, extras = {}) => menu.icon(serveIPC.__(label), click, null, extras),

	sep : { type : 'separator' },

	page_find : ( thisMod ) => [
		menu.iconL10n('select_in_main', null, 'mod', {sublabel : thisMod.name} ),
		menu.sep,
		...thisMod.collect.map((x) => menu.icon(
			`${x.name} :: ${x.version}`,
			() => {
				serveIPC.windowLib.sendAndFocusValid('main', 'fromMain_selectOnlyFilter', x.fullId, thisMod.name)
			},
			'sendCheck'
		))
	],
	page_main_col : ( collection ) => {
		const subLabel  = serveIPC.modCollect.mapCollectionToFullName(collection)
		const colFolder = serveIPC.modCollect.mapCollectionToFolder(collection)
		return [
			{
				icon     : serveIPC.windowLib.contextIcons.collection,
				label    : serveIPC.__('context_main_title').padEnd(subLabel.length, ' '),
				sublabel : subLabel,
			},
			menu.sep,
			{
				click   : () => { gameSet.change(collection) },
				enabled : (colFolder !== serveIPC.gameSetOverride.folder),
				icon    : serveIPC.windowLib.contextIcons.active,
				label   : serveIPC.__('list-active'),
			},
			menu.sep,
			{
				click : () => { shell.openPath(serveIPC.modCollect.mapCollectionToFolder(collection))},
				icon  : serveIPC.windowLib.contextIcons.openExplorer,
				label : serveIPC.__('open_folder'),
			},
			menu.sep,
			{
				click : () => { general.exportJSON(collection) },
				icon  : serveIPC.windowLib.contextIcons.save,
				label : serveIPC.__('save_json'),
			}
		]
	},

	snip_copy : () => [menu.iconL10n('context_copy', null, 'copy', { role : 'copy' })],
	snip_cut_copy_paste : () => [
		menu.iconL10n('context_select_all', null, 'active', { role : 'selectAll' } ),
		menu.sep,
		menu.iconL10n('context_cut', null, 'cut', { role : 'cut' }),
		...menu.snip_copy(),
		menu.iconL10n('context_paste', null, 'paste', { role : 'paste' }),
	],

	doDepReq : (x, thisCollect) => {
		const thisMenuItem = menu.getDepReq(x, thisCollect)
		return {
			click : () => {
				switch ( thisMenuItem[0] ) {
					case 2:
						// select in main window
						serveIPC.windowLib.sendToValidWindow('main', 'fromMain_selectOnlyFilter', thisMenuItem[2], x)
						break
					case 1:
						// send to find window
						serveIPC.windowLib.raiseOrOpen('find', () => {
							serveIPC.windowLib.sendToValidWindow('find', 'fromMain_forceFilter', x)
						})
						break
					default:
						clipboard.writeText(x, 'selection')
						break
				}
			},
			label : x,
			icon  : thisMenuItem[1],
		}
	},

	getDepReq : (shortName, collectKey) => {
		const thisShortMap = serveIPC.modCollect.shortNames[shortName]
		if ( Array.isArray(thisShortMap) ) {
			for ( const thisEntry of thisShortMap ) {
				if (thisEntry[0] === collectKey) {
					// found in current collection
					return [2, serveIPC.windowLib.contextIcons.thumbUp, `${collectKey}--${thisEntry[1]}`]
				}
			}
		} else {
			// not found at all
			return [0, serveIPC.windowLib.contextIcons.thumbDown, null]
		}
		// found in different collection
		return [1, serveIPC.windowLib.contextIcons.externalSite, null]
	},
}

const modHub = {
	file   : 'modHubDataCombo.json',
	isInit : false,
	log    : null,
	path   : null,

	init : () => {
		if ( ! modHub.isInit ) {
			modHub.log    = serveIPC.log.group('modhub-cache')
			modHub.isInit = true
			modHub.path   = path.join(app.getPath('userData'), modHub.file)
		}
	},
	load : () => {
		modHub.init()
		try {
			const oldModHub = require('./oldModHub.json')
			const rawData   = fs.readFileSync(modHub.path)
			const jsonData  = JSON.parse(rawData)

			serveIPC.modCollect.modHubList = {
				mods : { ...oldModHub.mods, ...jsonData.mods},
				last : jsonData.recent,
			}
			serveIPC.modCollect.modHubVersion = { ...oldModHub.versions, ...jsonData.version}

			modHub.log.debug('Loaded', modHub.file)
		} catch (err) {
			modHub.log.warning('Loading failed', modHub.file, err)
		}
	},
	refresh : () => {
		modHub.init()
		if ( net.isOnline() ) {
			const request = net.request('https://jtsage.dev/modHubData22_combo.json')

			request.setHeader('pragma', 'no-cache')

			request.on('response', (response) => {
				modHub.log.info('Got', modHub.file, response.statusCode)
				let responseData = ''

				response.on('error', (err) => {
					modHub.log.info('Network error', err)
				})

				response.on('data', (chunk) => { responseData = responseData + chunk.toString() })
				response.on('end',  () => {
					fs.writeFileSync(modHub.path, responseData)
					modHub.load()
				})
			})
			request.on('abort', () => {
				modHub.load()
				modHub.log.info('Network abort')
			})
			request.on('error', (err) => {
				modHub.load()
				modHub.log.info('Network error', err)
			})
			request.end()
		}
	},
}

const processor = {
	isInit : false,
	log    : null,

	init : () => {
		if ( ! processor.isInit ) {
			processor.log    = serveIPC.log.group('mod-processor')
			processor.isInit = true
		}
	},

	watcher : (eventType, fileName, folder) => {
		if ( eventType === 'rename' && ! fileName.endsWith('.tmp') && ! fileName.endsWith('.crdownload')) {
			processor.log.debug('Folders now dirty', path.basename(folder), fileName)
			general.toggleFolderDirty()
		}
	},

	handleMissing : (hash, fullPath) => {
		const retValue = {
			doDelete  : true, // Unchecked, but default action
			doMove    : false,
			doOffline : false,
			folder    : 'fullPath',
			newFolder : null,
		}
		
		const folderInfo = serveIPC.storeNote.get(hash)
		const hasExtra   = typeof folderInfo === 'object'
		
		const thisMessage = [
			serveIPC.__('bad_folder_blurb'),
			'\n\n',
			serveIPC.__('bad_folder_folder'),
			fullPath,
			hasExtra ? `\n\n${serveIPC.__('bad_folder_extra')}` : ''
		].join('')
		
		const userChoice = dialog.showMessageBoxSync(serveIPC.windowLib.win.main, {
			cancelId  : 1,
			defaultId : 0,
			message   : thisMessage,
			title     : serveIPC.__('bad_folder_title'),
			type      : 'question',
		
			buttons : [
				serveIPC.__('bad_folder_action_delete'),
				serveIPC.__('bad_folder_action_offline'),
				serveIPC.__('bad_folder_action_move'),
			],
		})
		
		switch (userChoice) {
			case 1:
				retValue.doOffline = true
				break
			case 2: {
				const newFolder = dialog.showOpenDialogSync(serveIPC.windowLib.win.main, {
					properties  : ['openDirectory'],
					defaultPath : serveIPC.path.last ?? app.getPath('home'),
				})
				if ( typeof newFolder !== 'undefined') {
					const potentialFolder = newFolder[0]
				
					serveIPC.path.last = path.resolve(path.join(potentialFolder, '..'))
				
					for ( const thisPath of serveIPC.modFolders ) {
						if ( path.relative(thisPath, potentialFolder) === '' ) {
							processor.log.notice('Move Folder', 'canceled, already tracked!')
							return retValue
						}
					}
				
					const newCollectKey = serveIPC.modCollect.getFolderHash(potentialFolder)
		
					retValue.newFolder = potentialFolder
					retValue.doMove    = true
					for ( const key in folderInfo ) {
						serveIPC.storeNote.set(`${newCollectKey}.${key}`, folderInfo[key])
					}
					serveIPC.storeNote.delete(hash)
				}
				break
			}
			default:
				break
		}
		
		return retValue
	},

	readOnDisk : () => {
		processor.init()
		serveIPC.modCollect.syncSafe = serveIPC.storeSet.get('use_one_drive', false)
		serveIPC.modCollect.clearAll()
	
		const offlineFolders = []
	
		for ( const oldWatcher of serveIPC.watch.folders ) { oldWatcher.close() }
	
		serveIPC.watch.folders = []
		// Cleaner for no-longer existing folders, set watcher for others
		for ( const folder of serveIPC.modFolders ) {
			if ( ! fs.existsSync(folder) ) {
				const colHash     = serveIPC.modCollect.getMD5FromFolder(folder)
				const isRemovable = serveIPC.storeNote.get(`${colHash}.notes_removable`, false)
	
				if ( !isRemovable ) {
					const folderAction = processor.handleMissing(colHash, folder)
	
					if ( folderAction.doOffline ) {
						serveIPC.storeNote.set(`${colHash}.notes_removable`, true)
						offlineFolders.push(folder)
					} else if ( folderAction.doMove ) {
						serveIPC.modFolders.add(folderAction.newFolder)
						serveIPC.modFolders.delete(folder)
	
						const thisWatch = fs.watch(folderAction.newFolder, (eventType, fileName) => { processor.watcher(eventType, fileName, folderAction.newFolder) })
						thisWatch.on('error', (err) => { processor.log.warning('Folder Watch Error', folderAction.newFolder, err) })
						serveIPC.watch.folders.push(thisWatch)
					} else {
						processor.log.warning('Folder missing, removing', folder)
						serveIPC.modFolders.delete(folder)
					}
				} else {
					offlineFolders.push(folder)
				}
			} else {
				const thisWatch = fs.watch(folder, (eventType, fileName) => { processor.watcher(eventType, fileName, folder) })
				thisWatch.on('error', (err) => { processor.log.warning('Folder Watch Error', folder, err) })
				serveIPC.watch.folders.push(thisWatch)
			}
		}
	
		prefs.saveFolders()
	
		for ( const folder of serveIPC.modFolders ) {
			if ( ! offlineFolders.includes(folder) ) {
				const thisCollectionStats = serveIPC.modCollect.addCollection(folder)
	
				serveIPC.loadWindow.total(thisCollectionStats?.fileCount ?? 0)
			} else {
				serveIPC.modCollect.addCollection(folder, true)
			}
		}
	
		serveIPC.modCollect.processMods()
	},

	addFolderTracking : (folder, json_import = false) => {
		const collectKey = serveIPC.modCollect.getFolderHash(folder)
		if ( serveIPC.modCollect.collections.has(collectKey) ) {
			if ( json_import ) { return }
			serveIPC.windowLib.doDialogBox('main', {
				type        : 'error',
				messageL10n : 'drop_folder_exists',
			})
			return
		}
		serveIPC.modFolders.add(folder)
		general.toggleFolderDirty()
		prefs.saveFolders()
		serveIPC.storeNote.set(`${collectKey}.notes_version`, serveIPC.storeSet.get('game_version', 22))
		serveIPC.storeNote.set(`${collectKey}.notes_add_date`, new Date())
	},
}

const prefs = {
	saveFolders : () => {
		serveIPC.storeSet.set('modFolders', [...serveIPC.modFolders])
	},

	unVerKey : (key) => parseInt(key.split('_')[2] || 22),
	verGet   : (key, version = 22 ) => serveIPC.storeSet.get(prefs.verKey(key, version)),
	verKey   : (key, version = 22 ) => version === 22 ? key : `${key}_${version}`,
	verSet   : (key, value, version = 22) => {
		serveIPC.storeSet.set(prefs.verKey(key, version), value)
	},
	
	gameLogFile : () => {
		if ( serveIPC.storeSet.get('game_log_auto') ) {
			return path.join(path.dirname(prefs.verGet('game_settings', serveIPC.storeSet.get('game_version'))), 'log.txt')
		}
		return serveIPC.storeSet.get('game_log_file', null)
	},

	changeFilePath : (version, isGame = false) => {
		general.showFileDialog({
			defaultPath : isGame ?
				path.join(app.getPath('home'), `FarmingSimulator20${version}.exe`) :
				serveIPC.path.setFolder.replace(/FarmingSimulator20\d\d/, `FarmingSimulator20${version}`),
			extraFilter : isGame ?
				{ name : `FarmingSimulator20${version}.exe`, extensions : ['exe'] } :
				{ name : 'gameSettings.xml', extensions : ['xml'] },
			isFolder : false,

			callback : (result) => {
				if ( isGame ) {
					prefs.verSet('game_path', result.filePaths[0], version)
				} else {
					prefs.verSet('game_settings', result.filePaths[0], version)
				}

				gameSet.read()
				serveIPC.refFunc.refreshClientModList()
				serveIPC.windowLib.sendToValidWindow(
					'main',
					'fromMain_allSettings',
					...commonSend.settings()
				)
			},
		})
	},
	changeGameVersion : (newVersion) => {
		serveIPC.storeSet.set('game_version', newVersion)
		serveIPC.windowLib.populateContextIcons()
		serveIPC.windowLib.trayContextMenu()
		gameSet.read()
		gameSet.loadGameLog()
		gameSet.readGameLog()
		serveIPC.refFunc.refreshClientModList()
	},
	setNamed : (name, value) => {
		if ( name.startsWith('dev_mode') ) {
			gameSet.gameXML(prefs.unVerKey(name), value)
		} else if ( name.startsWith('game_path') ) {
			prefs.verSet('game_path', value, prefs.unVerKey(name))
		} else if ( name.startsWith('game_settings') ) {
			prefs.verSet('game_settings', value, prefs.unVerKey(name))
		} else if ( name.startsWith('game_enabled') ) {
			gameSet.gameXML(19)
			gameSet.gameXML(17)
			gameSet.gameXML(15)
			gameSet.gameXML(13)
		} else {
			switch ( name ) {
				case 'show_tooltips':
					serveIPC.storeSet.set(name, value)
					serveIPC.windowLib.refreshL10n()
					break
				case 'font_size':
					serveIPC.storeSet.set(name, parseFloat(value))
					serveIPC.windowLib.fontUpdater()
					break
				case 'poll_game':
					serveIPC.storeSet.set(name, value)
					serveIPC.isGamePolling = serveIPC.storeSet.get('game_version', 22) === 22 && value
					break
				case 'lock_lang':
					serveIPC.storeSet.set('force_lang', serveIPC.l10n.currentLocale)
					// falls through
				default :
					serveIPC.storeSet.set(name, value)
					break
			}
		}
	
		serveIPC.windowLib.sendToValidWindow(
			'main',
			'fromMain_allSettings',
			...commonSend.settings()
		)
	},
}

const gameSet = {
	isInit : false,
	log    : null,

	init : () => {
		if ( ! gameSet.isInit ) {
			gameSet.log    = serveIPC.log.group('game-settings')
			gameSet.isInit = true
		}
	},

	_getXMLDoc : ( filename ) => {
		const XMLParser = new fxml.XMLParser({
			commentPropName    : '#comment',
			ignoreAttributes   : false,
			numberParseOptions : { leadingZeros : true, hex : true, skipLike : /\d\.\d{6}/ },
		})
	
		try {
			return XMLParser.parse(fs.readFileSync(filename, 'utf8'))
		} catch (err) {
			gameSet.log.danger('Could not read XML file', filename, err)
			return null
		}
	},
	_parse_xml : (XMLDoc) => {
		return {
			password   : XMLDoc.gameSettings?.joinGame?.['@_password'] ?? '',
			server     : XMLDoc.gameSettings?.joinGame?.['@_serverName'] ?? '',
			unit_acre  : XMLDoc.gameSettings?.units?.acre ?? false,
			unit_mile  : XMLDoc.gameSettings?.units?.miles ?? false,
			unit_money : XMLDoc.gameSettings?.units?.money ?? 0,
			unit_temp  : XMLDoc.gameSettings?.units?.fahrenheit ?? false,
			username   : XMLDoc.gameSettings?.onlinePresenceName ?? XMLDoc.gameSettings?.player?.name ?? '',
		}
	},
	_write : (filename, inputXML, opts) => {
		let workingXML = inputXML
	
		if ( workingXML === null || typeof workingXML.gameSettings === 'undefined' ) {
			gameSet.log.danger('Could not write game settings (read failed)')
			gameSet.read()
			serveIPC.refFunc.refreshClientModList()
			return
		}
	
		serveIPC.loadWindow.open('set')
		serveIPC.loadWindow.noCount()
	
		workingXML.gameSettings.modsDirectoryOverride['@_active']    = ( opts.disable === false || opts.disable === null )
		workingXML.gameSettings.modsDirectoryOverride['@_directory'] = ( opts.newFolder !== null ) ? opts.newFolder : ''
	
		workingXML = gameSet._write_units(workingXML, opts)
		workingXML = gameSet._write_mp(workingXML, opts)
	
		const builder    = new fxml.XMLBuilder({
			commentPropName           : '#comment',
			format                    : true,
			ignoreAttributes          : false,
			indentBy                  : '    ',
			suppressBooleanAttributes : false,
			suppressEmptyNode         : true,
		})
	
		try {
			let outputXML = builder.build(workingXML)
	
			outputXML = outputXML.replace('<ingameMapFruitFilter/>', '<ingameMapFruitFilter></ingameMapFruitFilter>')
	
			fs.writeFileSync(filename, outputXML)
		} catch (err) {
			gameSet.log.danger('Could not write game settings', err)
		}
	
		gameSet.read()
		serveIPC.refFunc.refreshClientModList()
	},
	_write_mp : (xml, opts) => {
		if ( opts.version === 22 || opts.version === 19 ) {
			xml.gameSettings.joinGame ??= {}
	
			if ( opts.userName !== null && opts.version === 22 ) { xml.gameSettings.onlinePresenceName = opts.userName }
			if ( opts.userName !== null && opts.version === 19 ) { xml.gameSettings.player.name = opts.userName }
			if ( opts.password !== null ) { xml.gameSettings.joinGame['@_password'] = opts.password }
			if ( opts.serverName !== null ) { xml.gameSettings.joinGame['@_serverName'] = opts.serverName }
		}
		return xml
	},
	_write_units : (xml, opts) => {
		if ( opts.version === 22 ) {
			if ( opts.unit_acre !== null )  { xml.gameSettings.units.acre = opts.unit_acre }
			if ( opts.unit_miles !== null ) { xml.gameSettings.units.miles = opts.unit_miles }
			if ( opts.unit_money !== null ) { xml.gameSettings.units.money = opts.unit_money }
			if ( opts.unit_temp !== null )  { xml.gameSettings.units.fahrenheit = opts.unit_temp }
		}
		return xml
	},

	change : (collectKey) => {
		const currentVersion = serveIPC.storeNote.get(`${serveIPC.modCollect.mapFolderToCollection(collectKey)}.notes_version`, 22)
		const filename       = prefs.verGet('game_settings', currentVersion)

		gameSet._write(
			filename,
			gameSet._getXMLDoc(filename),
			{
				disable    : false,
				newFolder  : serveIPC.modCollect.mapCollectionToFolder(collectKey),
				password   : serveIPC.storeNote.get(`${collectKey}.notes_password`, null),
				serverName : serveIPC.storeNote.get(`${collectKey}.notes_server`, null),
				unit_acre  : serveIPC.storeNote.get(`${collectKey}.notes_unit_acre`, null),
				unit_miles : serveIPC.storeNote.get(`${collectKey}.notes_unit_miles`, null),
				unit_money : serveIPC.storeNote.get(`${collectKey}.notes_unit_money`, null),
				unit_temp  : serveIPC.storeNote.get(`${collectKey}.notes_unit_temp`, null),
				userName   : serveIPC.storeNote.get(`${collectKey}.notes_username`, null),
				version    : currentVersion,
			}
		)
	},
	disable : () => {
		const currentVersion = serveIPC.storeSet.get('game_version', 22)
		const filename       = prefs.verGet('game_settings', currentVersion)

		gameSet._write(
			filename,
			gameSet._getXMLDoc(filename),
			{
				disable    : true,
				newFolder  : null,
				password   : null,
				serverName : null,
				unit_acre  : null,
				unit_miles : null,
				unit_money : null,
				unit_temp  : null,
				userName   : null,
				version    : currentVersion,
			}
		)
	},
	read_broken : (version, backName, origName, backExist) => {
		gameSet.log.warning('gameSettings.xml is empty - trying to fix')
		const fixGameXML = dialog.showMessageBoxSync(serveIPC.windowLib.win.main, {
			cancelId  : 1,
			defaultId : 1,
			message   : backExist ? serveIPC.__('bad_game_set_xml_message_back') : serveIPC.__('bad_game_set_xml_message_no_back'),
			title     : `${serveIPC.__('bad_game_set_xml_title')} ${version}`,
			type      : 'question',
		
			buttons : [
				backExist ? serveIPC.__('bad_game_xml_restore') : serveIPC.__('bad_game_xml_delete'),
				serveIPC.__('bad_game_xml_nothing'),
			],
		})

		switch (fixGameXML) {
			case 0 : {
				if ( backExist ) { // restore backup
					try {
						fs.copyFileSync(backName, origName)
						general.toggleFolderDirty(true)
					} catch {
						gameSet.log.warning('gameSettings.xml is empty - backup restore failed!')
					}
				} else {
					fs.rmSync(origName)
				}
				break
			}
			default: // do nothing
				break
		}
	},

	read : ( newCollectKey = null ) => {
		gameSet.init()

		// Version must be the one of the newFolder *or* the current
		const currentVersion = ( newCollectKey === null ) ?
			serveIPC.storeSet.get('game_version', 22) :
			serveIPC.storeNote.get(`${serveIPC.modCollect.mapFolderToCollection(newCollectKey)}.notes_version`, 22)

		const filename = prefs.verGet('game_settings', currentVersion)
		const XMLDoc   = gameSet._getXMLDoc(filename)

		const backupFileName = path.join(app.getPath('userData'), `gameSettings_${currentVersion}_xml.bak`)
		const backupExists   = fs.existsSync(backupFileName)

		if ( XMLDoc !== null && Object.keys(XMLDoc).length === 0 ) {
			gameSet.read_broken(currentVersion, backupFileName, filename, backupExists)
			return
		}

		try {
			serveIPC.gameSetOverride.active = XMLDoc.gameSettings.modsDirectoryOverride['@_active'] === 'true'
			serveIPC.gameSetOverride.folder = XMLDoc.gameSettings.modsDirectoryOverride['@_directory']
			serveIPC.gameSetOverride.xml    = gameSet._parse_xml(XMLDoc)
			serveIPC.gameSetOverride.index  = ( !serveIPC.gameSetOverride.active ) ? '0' : serveIPC.modCollect.mapFolderToCollection(serveIPC.gameSetOverride.folder) || '999'

			try {
				fs.copyFileSync(filename, backupFileName)
			} catch {
				gameSet.log.warning('gameSettings.xml - backup create/update failed!')
			}
		} catch (err) {
			gameSet.log.danger('Could not parse game settings', err)
		}
	},

	gameXML_broken : (version, backName, origName, backExist) => {
		gameSet.log.warning('game.xml is empty - trying to fix')
		const fixGameXML = dialog.showMessageBoxSync(serveIPC.windowLib.win.main, {
			cancelId  : 1,
			defaultId : 1,
			message   : backExist ? serveIPC.__('bad_game_xml_message_back') : serveIPC.__('bad_game_xml_message_no_back'),
			title     : `${serveIPC.__('bad_game_xml_title')} ${version}`,
			type      : 'question',
		
			buttons : [
				backExist ? serveIPC.__('bad_game_xml_restore') : serveIPC.__('bad_game_xml_delete'),
				serveIPC.__('bad_game_xml_nothing'),
			],
		})

		switch (fixGameXML) {
			case 0 : {
				if ( backExist ) { // restore backup
					try {
						fs.copyFileSync(backName, origName)
						general.toggleFolderDirty(true)
					} catch {
						gameSet.log.warning('game.xml is empty - backup restore failed!')
					}
				} else {
					fs.rmSync(origName)
				}
				break
			}
			default: // do nothing
				break
		}
	},

	gameXML : (version = 22, setDevMode = null) => {
		const gameEnabledValue    = version === 22 ? true : (serveIPC.storeSet.get(`game_enabled_${version}`) && serveIPC.storeSet.get('multi_version', false))
		const thisGameSettingsXML = prefs.verGet('game_settings', version)
		const gameXMLFile         = thisGameSettingsXML.replace('gameSettings.xml', 'game.xml')
		const backupFileName      = path.join(app.getPath('userData'), `game_${version}_xml.bak`)
		const backupExists        = fs.existsSync(backupFileName)
	
		if ( !gameEnabledValue ) { return }
	
		const XMLDoc = gameSet._getXMLDoc(gameXMLFile)

		if ( XMLDoc !== null && Object.keys(XMLDoc).length === 0) {
			gameSet.gameXML_broken(version, backupFileName, gameXMLFile, backupExists)
			return
		}

		try {
			if ( XMLDoc !== null && Object.keys(XMLDoc).length !== 0 ) {
				serveIPC.devControls[version] = XMLDoc.game.development.controls
				// Good version, we should create a backup (only if we're not altering it)
				if ( setDevMode === null ) {
					try {
						fs.copyFileSync(gameXMLFile, backupFileName)
					} catch {
						gameSet.log.warning('game.xml - backup create/update failed!')
					}
				}
			}
			
			if ( setDevMode !== null && XMLDoc !== null && Object.keys(XMLDoc).length !== 0 ) {
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
					// Good version saved, we should update/create a backup
					fs.writeFileSync(gameXMLFile, builder.build(XMLDoc))
					fs.writeFileSync(backupFileName, builder.build(XMLDoc))
				} catch (err) {
					gameSet.log.danger('Could not write game xml', err)
				}
		
				gameSet.gameXML(version)
			}
		} catch (err) {
			gameSet.log.danger('Could not read game xml', err)
		}
	},

	loadGameLog : (newPath = false) => {
		if ( newPath ) {
			serveIPC.storeSet.set('game_log_file', newPath)
			serveIPC.storeSet.set('game_log_auto', false)
		}
	
		if ( serveIPC.watch.log !== null ) {
			serveIPC.watch.log.close()
			serveIPC.watch.log = null
		}
	
		const thisGameLog = prefs.gameLogFile()
	
		if ( thisGameLog !== null && serveIPC.watch.log === null ) {
			serveIPC.log.debug('game-log', 'Trying to open game log', thisGameLog)
	
			if ( fs.existsSync(thisGameLog) ) {
				serveIPC.watch.log = fs.watch(thisGameLog, (_, filename) => {
					if ( filename ) {
						if ( serveIPC.interval.gameLog ) return
						serveIPC.interval.gameLog = setTimeout(() => {
							serveIPC.interval.gameLog = null
							gameSet.readGameLog()
						}, 5000)
					}
				})
				serveIPC.watch.log.on('error', (err) => {
					serveIPC.log.warning('game-log', 'Error with game log', err)
					serveIPC.watch.log = null
				})
			} else {
				serveIPC.log.warning('game-log', 'Game Log not found', thisGameLog)
				serveIPC.storeSet.set('game_log_file', null)
			}
		}
	},
	readGameLog : () => {
		if ( ! serveIPC.windowLib.isVisible('gamelog') ) { return }

		const thisGameLog = prefs.gameLogFile()

		if ( thisGameLog === null || !fs.existsSync(thisGameLog) ) { return }

		try {
			serveIPC.log.debug('game-log', 'Begin log read', thisGameLog)
			fs.readFile(thisGameLog, {encoding : 'utf8', flag : 'r'}, (err, contents) => {
				if ( err ) { throw err }
				serveIPC.log.debug('game-log', 'Done log read', thisGameLog)
				serveIPC.windowLib.sendToValidWindow(
					'gamelog',
					'fromMain_gameLog',
					contents,
					thisGameLog
				)
			})
		} catch (err) {
			serveIPC.log.warning('game-log', 'Failed log read', thisGameLog, err)
		}
	},
}

const realFileOperation = (type, fileMap) => {
	const fileLog     = serveIPC.log.group('file-opts')
	const fullPathMap = []
	const cleanupSet  = new Set()

	for ( const file of fileMap ) {
		// fileMap is [destCollectKey, sourceCollectKey, fullPath (guess)]
		const thisFileName = path.basename(file[2])
		if ( type !== 'import' && type !== 'importZIP' ) {
			fullPathMap.push({
				src  : path.join(serveIPC.modCollect.mapCollectionToFolder(file[1]), thisFileName), // source
				dest : path.join(serveIPC.modCollect.mapCollectionToFolder(file[0]), thisFileName), // dest
			})
			if ( type === 'move_multi' ) {
				cleanupSet.add(path.join(serveIPC.modCollect.mapCollectionToFolder(file[1]), thisFileName))
			}
		} else {
			fullPathMap.push({
				src  : file[2],
				dest : path.join(serveIPC.modCollect.mapCollectionToFolder(file[0]), thisFileName), // dest
			})
		}
	}

	general.toggleFolderDirty()

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
						fileLog.info('Delete Existing Folder First', file.dest)
						fs.rmSync(file.dest, { recursive : true })
					}
					fs.cpSync(file.src, file.dest, { recursive : true })
				}
			}

			if ( typeMoveDel.has(type) ) {
				fileLog.info('Delete File', file.src)
				fs.rmSync(file.src, { recursive : true } )
			}
		} catch (err) {
			fileLog.danger(`Could not ${type} file`, err)
		}

		serveIPC.loadWindow.current()
	}

	if ( type === 'move_multi' ) {
		for ( const thisFile of cleanupSet ) {
			try {
				fileLog.info('Delete File', thisFile)
				fs.rmSync(thisFile, { recursive : true } )
			} catch (err) {
				fileLog.danger('Could not delete file', err)
			}
		}
	}

	if ( type === 'importZIP' ) {
		let pathsToProcess = fullPathMap.length
		for ( const file of fullPathMap ) {
			const destPath = path.dirname(file.dest)

			const extract = unzip.Extract({ path : destPath })
			extract.on('error', (err) => {
				fileLog.danger('Import unzip failed', destPath, err)
			})
			fs.createReadStream(file.src)
				.pipe(extract)
				.on('error', (err) => {
					fileLog.danger('Import unzip failed', destPath, err)
				})
				.on('close', () => {
					fileLog.info('Import unzipping complete', destPath)
					pathsToProcess--
					serveIPC.loadWindow.current()
					if ( pathsToProcess <= 0 ) { serveIPC.refFunc.processModFolders() }
				})
		}
	} else {
		serveIPC.refFunc.processModFolders()
	}
}

const saveManage = {
	isInit : false,
	log    : null,

	init : () => {
		if ( ! saveManage.isInit ) {
			saveManage.log    = serveIPC.log.group('save-manager')
			saveManage.isInit = true
		}
	},

	delete : (fullPath) => {
		saveManage.init()
		try {
			saveManage.log.info('Delete Existing Save', fullPath)
			fs.rmSync(fullPath, { recursive : true })
		} catch (err) {
			saveManage.log.warning('Save Remove Failed', err)
		}
		saveManage.refresh()
	},
	export : (fullPath) => {
		saveManage.init()
		dialog.showSaveDialog(serveIPC.windowLib.win.main, {
			defaultPath : app.getPath('desktop'),
			filters     : [
				{ name : 'ZIP', extensions : ['zip'] },
			],
		}).then(async (result) => {
			if ( result.canceled ) {
				saveManage.log.debug('Export ZIP Cancelled')
			} else {
				try {
					const zipOutput  = fs.createWriteStream(result.filePath)
					const zipArchive = makeZip('zip', {
						zlib : { level : 6 },
					})
					
					zipOutput.on('close', () => {
						saveManage.log.info('ZIP file created', result.filePath)
						app.addRecentDocument(result.filePath)
					})

					zipArchive.on('error', (err) => {
						saveManage.log.warning('Could not create zip file', err)
						setTimeout(() => {
							serveIPC.windowLib.doDialogBox('main', { type : 'warning', messageL10n : 'save_zip_failed' })
						}, 1500)
					})

					zipArchive.on('warning', (err) => {
						saveManage.log.warning('Problem with ZIP file', err)
					})

					zipArchive.on('entry', (entry) => {
						saveManage.log.info('Added file to ZIP', entry.name)
					})

					zipArchive.pipe(zipOutput)

					zipArchive.directory(fullPath, false)

					zipArchive.finalize()

				} catch (err) {
					saveManage.log.warning(`Could not create zip file : ${err}`)
					setTimeout(() => {
						serveIPC.windowLib.doDialogBox('main', { type : 'warning', messageL10n : 'save_zip_failed' })
					}, 1500)
				}
			}
		}).catch((err) => {
			saveManage.log.warning(`Could not create zip file : ${err}`)
		})
	},
	refresh : () => {
		saveManage.init()
		const thisSaveManage = new saveGameManager(serveIPC.storeSet.get('game_settings'))

		thisSaveManage.getInfo().then((results) => {
			serveIPC.windowLib.createNamedWindow('save_manage', { saveInfo : results } )
		})
	},
	restore : (fullPath, newSlot) => {
		saveManage.init()
		try {
			const newSlotFull = path.join(path.dirname(serveIPC.storeSet.get('game_settings')), `savegame${newSlot}`)
	
			if ( fs.existsSync(newSlotFull) ) {
				saveManage.log.info('Delete Existing Save First', newSlotFull)
				fs.rmSync(newSlotFull, { recursive : true })
			}
	
			saveManage.log.info(`Restoring Save : ${fullPath} -> ${newSlot}`)
			fs.cpSync(fullPath, newSlotFull, { recursive : true })
		} catch (err) {
			saveManage.log.warning('Save Restore Failed', err)
		}
		saveManage.refresh()
	},

	doImport : (fullPath, newSlot) => {
		saveManage.init()
		const newSlotFull = path.join(path.dirname(serveIPC.storeSet.get('game_settings')), `savegame${newSlot}`)
		try {
			if ( fs.existsSync(newSlotFull) ) {
				saveManage.log.info('Delete Existing Save First', newSlotFull)
				fs.rmSync(newSlotFull, { recursive : true })
			}
	
			saveManage.log.info(`Importing Save : ${fullPath} -> ${newSlot}`, newSlotFull)
	
			fs.mkdirSync(newSlotFull)
	
			fs.createReadStream(fullPath)
				.pipe(unzip.Parse())
				.on('error', (err) => {
					saveManage.log.warning('Import unzip failed', err)
				})
				.on('entry', (entry) => {
					if ( entry.type === 'File' ) {
						entry.pipe(fs.createWriteStream(path.join(newSlotFull, entry.path)))
					} else {
						entry.autodrain()
					}
				})
				.on('end', () => {
					saveManage.log.info('Import unzipping complete')
					saveManage.refresh()
				})
		} catch (err) {
			saveManage.log.warning('Save Restore Failed', err)
			saveManage.refresh()
		}
	},
	getImport : () => {
		saveManage.init()

		const options = {
			properties  : ['openFile'],
			defaultPath : app.getPath('home'),
			filters     : [{ name : 'ZIP Files', extensions : ['zip'] }],
		}
	
		dialog.showOpenDialog(serveIPC.windowLib.win.save_manage, options).then((result) => {
			if ( !result.canceled ) {
				new saveFileChecker(result.filePaths[0], false).getInfo().then((results) => {
					if ( results.errorList.length === 0 ) {
						serveIPC.windowLib.sendToValidWindow('save_manage', 'fromMain_saveImport', result.filePaths[0])
					} else {
						serveIPC.windowLib.doDialogBox('save_manage', { type : 'warning', titleL10n : 'load_save_import_title', messageL10n : 'load_save_import_failed' })
						saveManage.log.danger('Invalid Save File')
					}
				})
			}
		}).catch((err) => {
			saveManage.log.danger('Could not read specified file', err)
		})
	},
}

const gameLauncher = () => {
	const launchLog      = serveIPC.log.group('game-launcher')
	const currentVersion = serveIPC.storeSet.get('game_version')
	const gameArgs       = prefs.verGet('game_args', currentVersion)
	const progPath       = prefs.verGet('game_path', currentVersion)

	if ( progPath !== '' && fs.existsSync(progPath) ) {
		serveIPC.loadWindow.open('launch')
		serveIPC.loadWindow.noCount()
		serveIPC.loadWindow.hide(3500)

		try {
			const child = require('node:child_process').spawn(progPath, gameArgs.split(' '), { detached : true, stdio : ['ignore', 'ignore', 'ignore'] })

			child.on('error', (err) => { launchLog.danger('Game launch failed', err) })
			child.unref()
		} catch (err) {
			launchLog.danger('Game launch failed', err)
		}
	} else {
		const dialogOpts = {
			type    : 'info',
			title   : serveIPC.__('launcher_error_title'),
			message : serveIPC.__('launcher_error_message'),
		}
		dialog.showMessageBox(null, dialogOpts)
		launchLog.danger('Game path not set or invalid!')
	}
}

module.exports.funcLib = {
	autoUpdater       : autoUpdater,
	commonSend        : commonSend,
	discord           : discord,
	gameLauncher      : gameLauncher,
	gameSet           : gameSet,
	general           : general,
	menu              : menu,
	modHub            : modHub,
	prefs             : prefs,
	processor         : processor,
	realFileOperation : realFileOperation,
	saveManage        : saveManage,
	wizard            : wizard,
}