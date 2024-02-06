/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main Window UI

/* global processL10N, fsgUtil, bootstrap, select_lib, __, mainState, mainLib, prefLib, fileOpLib, loaderLib, dragLib */

window.mods.receive('fromMain_selectInvertOpen', () => {
	if ( ! fileOpLib.isRunning ) { mainLib.keyBoard('invert') }
	else { fileOpLib.keyBoard('invert') }
})

window.mods.receive('fromMain_selectNoneOpen', () => {
	if ( ! fileOpLib.isRunning ) { mainLib.keyBoard('none') }
	else { fileOpLib.keyBoard('none') }
})

window.mods.receive('fromMain_selectAllOpen', () => {
	if ( ! fileOpLib.isRunning ) { mainLib.keyBoard('all') }
	else { fileOpLib.keyBoard('all') }
})

window.mods.receive('fromMain_selectOnly', (selectList) => {
	const tableID   = `${selectList[0].split('--')[0]}_mods`
	const checkList = selectList.map((id) => `${id}__checkbox`)

	select_lib.close_all(tableID)
	select_lib.click_only(tableID, checkList)
})

window.mods.receive('fromMain_selectOnlyFilter', (selectMod, filterText) => {
	const tableID = `${selectMod.split('--')[0]}_mods`
	const checkList = [`${selectMod}__checkbox`]
	
	select_lib.close_all(tableID)
	select_lib.click_only(tableID, checkList)
	select_lib.filter_begin(tableID, filterText)
})

window.mods.receive('fromMain_dirtyUpdate', (status) => { mainState.toggleDirtyUpdate(status) })
window.mods.receive('fromMain_debugLogDangerFlag', (status) => { mainState.toggleDebugLogDangerFlag(status) })

window.mods.receive('fromMain_modInfoPop', (thisMod, thisSite) => {
	fsgUtil.setById('mod_info_mod_name', thisMod.fileDetail.shortName)
	fsgUtil.setById('mod_info_input', thisSite)
	mainState.win.modInfo.show()
})

window.mods.receive('fromMain_gameUpdate', (status) => {
	mainState.toggleGameStatus(status.gameRunning, status.gameRunningEnabled)
	fsgUtil.clsShowTrue('update-is-ready-button', status.updateReady)
	mainState.updateBotStatus(status.botStatus)
})

window.mods.receive('fromMain_allSettings', (allSettings, devControls) => {
	prefLib.state(allSettings, devControls)
	prefLib.update()
})

window.mods.receive('fromMain_modList', (modCollect) => {
	mainState.isMultiVersion     = modCollect.appSettings.multi_version
	mainState.currentGameVersion = modCollect.appSettings.game_version
	mainState.modCollect         = modCollect
	mainState.collectOrder       = { map : {}, numeric : {}, max : 0 }

	fileOpLib.validCollect.length = 0

	prefLib.state(modCollect.appSettings, modCollect.opts.devControls)

	mainState.empty_searchStringMap()
	mainState.empty_searchTagMap()

	document.body.setAttribute('data-version', mainState.currentGameVersion)

	fsgUtil.clsOrGate('folderEditButton', modCollect.opts.foldersEdit, 'btn-primary', 'btn-outline-primary')
	fsgUtil.clsOrGate('mini_button', modCollect.opts.showMini, 'btn-outline-light', null)
	fsgUtil.clsShowTrue('update-is-ready-button', modCollect.updateReady)
	fsgUtil.clsShowTrue('dirty_folders', modCollect.opts.foldersDirty)
	fsgUtil.clsShowTrue('multi_version_button', mainState.isMultiVersion)

	fsgUtil.setById('farm_sim_versions', [22, 19, 17, 15, 13].map((version) =>  makeVersionRow(version, modCollect.appSettings, modCollect)))

	const lastOpenAcc = fsgUtil.queryF('.accordion-collapse.show')
	const lastOpenID  = lastOpenAcc?.id ?? null
	const lastOpenQ   = (lastOpenAcc !== null) ? fsgUtil.valueById('filter_input') : ''
	const scrollStart = window.scrollY

	const modTable     = []
	const scrollTable  = []
	const verList      = {}
	let   verFlag      = false

	/* List selection */
	fsgUtil.setById('collectionSelect', mainLib.getCollectSelect(modCollect))
	/* END : List selection */

	for ( const [folderIndex, collectKey] of Object.entries([...modCollect.set_Collections]) ) {
		if ( mainState.isMultiVersion && modCollect.collectionNotes[collectKey].notes_version !== mainState.currentGameVersion ) { continue }

		fileOpLib.validCollect.push([collectKey, modCollect.collectionToFullName[collectKey]])

		const thisCollection = modCollect.modList[collectKey]
		const collectNotes   = modCollect.collectionNotes[collectKey]
		const collectFreeze  = collectNotes.notes_frozen
		const modRows        = []
		const scrollRows     = []
		const sizeOfFolder   = thisCollection.folderSize
		const mapIcons       = []
		const mapNames       = []

		mainState.collectOrder.map[collectKey]      = parseInt(folderIndex)
		mainState.collectOrder.numeric[folderIndex] = collectKey
		mainState.collectOrder.max                  = Math.max(mainState.collectOrder.max, parseInt(folderIndex))

		if ( !modCollect.opts.foldersEdit ) {
			for ( const modKey of thisCollection.alphaSort ) {
				try {
					const thisMod       = thisCollection.mods[modKey.split('::')[1]]

					switch ( mainLib.checkVersion(verFlag, verList, collectFreeze, thisMod) ) {
						case 1: // toggle flag true
							verFlag = true; break
						case 2: // add to list
							verList[thisMod.fileDetail.shortName] = thisMod.modDesc.version
							break
						default:
							break
					}

					mainState.searchStringMap[thisMod.colUUID] = mainLib.getSearchString(thisMod)

					scrollRows.push(fsgUtil.buildScrollMod(collectKey, thisMod.colUUID))
					
					const thisModEntry = makeModRow(
						thisMod.colUUID,
						thisMod,
						mainLib.getBadgeHTML(thisMod),
						thisMod.modHub.id,
						modCollect.appSettings.game_version,
						Object.hasOwn(modCollect.opts.modSites, thisMod.fileDetail.shortName)
					)
					
					modRows.push(thisModEntry[0])

					if ( thisModEntry[1] !== null ) {
						mapIcons.push(thisModEntry[1])
						mapNames.push(thisModEntry.slice(2))
					}
				} catch (err) {
					window.log.notice(`Error building mod row: ${modKey} :: ${err}`, 'main')
				}
			}
		}
		
		const isOnline = modCollect.collectionToStatus[collectKey]
		const fullName = `${thisCollection.name} <small>[${isOnline ? fsgUtil.bytesToHR(sizeOfFolder) : __('removable_offline') }]</small>`

		modTable.push(makeModCollection({
			adminPass     : collectNotes.notes_admin,
			dateAdd       : collectNotes.notes_add_date,
			dateUsed      : collectNotes.notes_last,
			dlEnabled     : collectNotes.notes_websiteDL,
			favorite      : collectNotes.notes_favorite,
			folderColor   : parseInt(collectNotes.notes_color),
			foldersEdit   : modCollect.opts.foldersEdit,
			gameAdminPass : collectNotes.notes_game_admin,
			id            : collectKey,
			isActive      : modCollect.opts.activeCollection === collectKey,
			isHolding     : collectNotes.notes_holding,
			isOnline      : isOnline,
			mapNames      : mapNames[0],
			modCount      : modRows.length,
			modsRows      : modRows,
			name          : fullName,
			removable     : collectNotes.notes_removable,
			singleMapIcon : fsgUtil.firstOrNull(mapIcons),
			tagLine       : [collectNotes.notes_tagline, (mapIcons.length === 1 ? mapNames[0][0] : null)].filter((x) => x !== null).join(' - '),
			website       : collectNotes.notes_website,
		}))
		scrollTable.push(fsgUtil.buildScrollCollect(collectKey, scrollRows))
	}
	
	fsgUtil.setById('mod-collections', modTable)
	fsgUtil.setById('scroll-bar-fake', scrollTable)

	fsgUtil.clsOrGate('verButton', verFlag, 'btn-danger', 'btn-success')

	mainState.toggleGameStatus(modCollect.opts.gameRunning)
	mainState.updateBotStatus(modCollect.bot)
	mainLib.setDropDownFilters(modCollect.badgeL10n)
	mainLib.setOrderButtons(Object.keys(mainState.collectOrder.map), modCollect.opts.foldersEdit)

	select_lib.clear_range()

	try {
		select_lib.open_table(lastOpenID)

		if ( lastOpenQ !== '' ) {
			select_lib.filter_begin(lastOpenID, lastOpenQ)
		}
		window.scrollTo(0, scrollStart)
	} catch { /* Don't Care */ }

	select_lib.filter_begin()
	processL10N()
})

// Main Interface builders

const makeModCollection = (data) => fsgUtil.useTemplate('collect_row', {
	bootstrap_data              : `data-bs-toggle="collapse" data-bs-target="#${data.id}_mods"`,
	class_hideDownload          : data.dlEnabled ? '' : 'd-none',
	class_hideFolderEdit        : data.foldersEdit ? '' : 'd-none',
	class_hideGameAdminPassword : data.gameAdminPass !== null ? '' : 'd-none',
	class_hidePassword          : data.adminPass !== null ? '' : 'd-none',
	class_hideRemovable         : data.removable ? '' : 'd-none',
	class_hideWebsite           : data.website !== null ? '' : 'd-none',
	class_isHolding             : data.isHolding ? 'is-holding-pen' : '',
	class_mapIcon               : data.singleMapIcon === null ? 'd-none' : '',
	class_showFolderEdit        : !data.foldersEdit ? '' : 'd-none',
	class_status                : !data.isOnline ? 'text-decoration-line-through' : '',
	dateAdd                     : mainLib.getPrintDate(data.dateAdd),
	dateUsed                    : mainLib.getPrintDate(data.dateUsed),
	folderSVG                   : fsgUtil.getIconSVG('folder', data.favorite, data.isActive, data.isHolding, data.folderColor),
	game_admin_password         : data.gameAdminPass,
	id                          : data.id,
	mapClick                    : data.mapNames?.[2],
	mapIcon                     : fsgUtil.iconMaker(data.singleMapIcon),
	mapTitle                    : data.mapNames?.[1],
	mod_rows                    : `<table class="w-100 py-0 my-0 table table-sm table-hover table-striped">${data.modsRows.join('')}</table>`,
	name                        : data.name,
	password                    : data.adminPass,
	tagLine                     : data.tagLine !== '' ? `${!data.foldersEdit ? '<br>' : ''}<span class="ps-3 small fst-italic">${data.tagLine}</span>` : '',
	totalCount                  : data.modCount > 999 ? '999+' : data.modCount,
	website                     : data.website,
})

const makeModRow = (id, thisMod, badges, modId, currentGameVersion, hasExtSite) => {
	return [
		fsgUtil.useTemplate('mod_row', {
			author            : fsgUtil.escapeSpecial(thisMod.modDesc.author),
			badges            : badges,
			class_hasHash     : modId!==null ? ' has-hash' : '',
			class_hasSite     : hasExtSite ? ' has-ext-site' : '',
			class_isAFolder   : !thisMod.badgeArray.includes('folder') ? 'd-none' : '',
			class_modColor    : thisMod.canNotUse === true ? '  bg-danger' : ( currentGameVersion !== thisMod.gameVersion ? ' bg-warning' : '' ),
			class_modDisabled : ( thisMod.canNotUse===true || currentGameVersion !== thisMod.gameVersion ) ? ' mod-disabled bg-secondary-subtle bg-opacity-25':'',
			click_modEnabled  : ! ( thisMod.badgeArray.includes('savegame') || thisMod.badgeArray.includes('notmod') ),
			fileSize          : ( thisMod.fileDetail.fileSize > 0 ) ? fsgUtil.bytesToHR(thisMod.fileDetail.fileSize) : '',
			icon              : fsgUtil.iconMaker(thisMod.modDesc.iconImageCache),
			id                : id,
			shortname         : thisMod.fileDetail.shortName,
			title             : fsgUtil.escapeSpecial(thisMod.l10n.title),
			version           : fsgUtil.escapeSpecial(thisMod.modDesc.version),
		}),
		thisMod.modDesc.mapConfigFile ? thisMod.modDesc.iconImageCache : null,
		thisMod.fileDetail.shortName,
		fsgUtil.escapeSpecial(thisMod.l10n.title),
		id,
	]
}

const makeVersionRow = (version, options, modCollect) => {
	const thisVersionEnabled = version === 22 ? true : options[`game_enabled_${version}`]
	const counts = { collect : 0, mods : 0 }

	if ( !thisVersionEnabled && version !== options.game_version ) { return '' }

	for ( const collectKey of modCollect.set_Collections ) {
		if ( modCollect.collectionNotes[collectKey].notes_version === version ) {
			counts.collect++
			counts.mods += modCollect.modList[collectKey].alphaSort.length
		}
	}
	return fsgUtil.useTemplate('version_row', {
		backgroundClass : version === options.game_version ? 'bg-success' : 'bg-primary',
		collections     : counts.collect,
		mods            : counts.mods,
		version         : version,
	})
}

// Loader Overlay
window.loader.receive('formMain_loading_show',    () => { loaderLib.show() })
window.loader.receive('formMain_loading_hide',    () => { loaderLib.hide() })
window.loader.receive('fromMain_loadingDownload', () => { loaderLib.startDownload() })
window.loader.receive('fromMain_loadingNoCount',  () => { loaderLib.hideCount() })
window.loader.receive('formMain_loadingTitles',   (mainTitle, subTitle, dlCancel) => {
	loaderLib.updateText(mainTitle, subTitle, dlCancel)
})
window.loader.receive('fromMain_loading_total',   (count, inMB) => {
	loaderLib.updateTotal(count, inMB)
})
window.loader.receive('fromMain_loading_current', (count, inMB ) => {
	loaderLib.updateCount(count, inMB)
})

// File Operations
window.mods.receive('fromMain_fileOperation', (opPayload) => { fileOpLib.startOverlay(opPayload) })

// On Load
window.addEventListener('DOMContentLoaded', () => {
	processL10N()

	mainState.win.collectMismatch = new bootstrap.Modal('#open_game_modal', {backdrop : 'static'})
	mainState.win.collectMismatch.hide()

	mainState.win.modInfo = new bootstrap.Modal('#open_mod_info_modal', {backdrop : 'static'})
	mainState.win.modInfo.hide()

	loaderLib.overlay = new bootstrap.Modal('#loadOverlay', { backdrop : 'static', keyboard : false })
	fileOpLib.overlay = new bootstrap.Offcanvas('#fileOpCanvas')

	const todayIs = new Date()
	if ( todayIs.getMonth() === 3 && todayIs.getDate() === 1 ) {
		fsgUtil.clsAddId('drag_target', 'fsg-back-2')
	}

	window.l10n.langList_send()
	window.l10n.themeList_send()

	fsgUtil.byId('fileOpCanvas').addEventListener('hide.bs.offcanvas', () => {
		fileOpLib.stop()
	})
	fsgUtil.byId('prefcanvas').addEventListener('hide.bs.offcanvas', () => {
		fsgUtil.clearTooltips()
	})
	fsgUtil.byId('prefcanvas').addEventListener('show.bs.offcanvas', () => {
		prefLib.update()
	})
	window.addEventListener('hidden.bs.collapse', () => { select_lib.click_none() })
	window.addEventListener('shown.bs.collapse',  () => { select_lib.click_none() })

	const dragTarget = fsgUtil.byId('drag_target')
	dragTarget.addEventListener('dragenter', dragLib.dragEnter )
	dragTarget.addEventListener('dragleave', dragLib.dragLeave )
	dragTarget.addEventListener('dragover',  dragLib.dragOver )
	dragTarget.addEventListener('drop',      dragLib.dragDrop )
})

window?.l10n?.receive('fromMain_getText_return', (data) => {
	if ( data[0] === '__currentLocale__'  ) {
		setTimeout(() => {
			const topperHeight = fsgUtil.byId('main-header').offsetHeight
			const bottomHeight = fsgUtil.byId('main-footer').offsetHeight
			fsgUtil.byId('moveButtons').style.height = `calc(100vh - ${topperHeight + bottomHeight + 10}px)`
			fsgUtil.byId('moveButtons').style.top = `${topperHeight + 5}px`
		}, 250)
	}
})
