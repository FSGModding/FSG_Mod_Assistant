/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main Window UI

/* global processL10N, fsgUtil, select_lib, __ */

const mainState = {
	collectOrder       : { map : {}, numeric : {}, max : 0 },
	currentGameVersion : 22,
	gameIsRunningFlag  : false,
	gameSetCollect     : {
		selected : null,
		all      : {},
	},
	isMultiVersion     : false,
	modCollect         : null,
	searchStringMap    : {},
	searchTagMap       : {},
	win                : {
		collectMismatch : null,
		modInfo         : null,
	},

	add_searchTagMap : (tag, uuid) => {
		mainState.searchTagMap?.[tag.toLowerCase()]?.push?.(uuid)
	},

	empty_searchStringMap : () => { mainState.searchStringMap = {} },
	empty_searchTagMap    : () => { mainState.searchTagMap = {
		broken      : [],
		depend      : [],
		depend_flag : [],
		folder      : [],
		keys_bad    : [],
		keys_ok     : [],
		log         : [],
		map         : [],
		new         : [],
		nomp        : [],
		nonmh       : [],
		notmod      : [],
		pconly      : [],
		problem     : [],
		recent      : [],
		require     : [],
		savegame    : [],
		update      : [],
	}},

	toggleDebugLogDangerFlag : (status) => {
		fsgUtil.clsShowTrue('debug_danger_bubble', status)
	},
	toggleDirtyUpdate : (dirtyFlag) => {
		fsgUtil.clsHideFalse('dirty_folders', dirtyFlag)
	},
	toggleGameStatus(status = false, show = true) {
		mainState.gameIsRunningFlag = status.gameRunning
		fsgUtil.clsHideFalse('gameRunningBubble', show)
		fsgUtil.clsOrGate('gameRunningBubble', status, 'text-success', 'text-danger')
	},
	updateBotStatus : (botObject) => {
		if ( Object.keys(botObject.response).length === 0 ) { return }
	
		for ( const [collectKey, IDs] of Object.entries(botObject.requestMap) ) {
			const thisBotDiv = fsgUtil.byId(`${collectKey}__bot`)
			if ( thisBotDiv === null ) { continue }
			if ( IDs.length === 0 ) {
				thisBotDiv.innerHTML = ''
				thisBotDiv.classList.add('d-none')
				continue
			}
	
			const thisCollectHTML = []
	
			for ( const thisID of IDs ) {
				thisCollectHTML.push(mainLib.getBotStatusLine(
					thisID,
					botObject.response[thisID],
					botObject.response[thisID].status === 'Good',
					botObject.l10nMap
				))
			}
			thisBotDiv.classList.remove('d-none')
			thisBotDiv.innerHTML = thisCollectHTML.join('')
		}
	},
}

const mainLib = {
	keyBoard : (action) => {
		const lastOpenAcc = fsgUtil.queryF('.accordion-collapse.show')

		if ( lastOpenAcc !== null ) { select_lib[`click_${action}`](lastOpenAcc.id) }
	},

	checkVersion : (verFlag, verList, isFrozen, thisMod) => {
		if ( !verFlag && !isFrozen && !thisMod.fileDetail.isFolder ) {
			return (
				Object.hasOwn(verList, thisMod.fileDetail.shortName) &&
				verList[thisMod.fileDetail.shortName] !== thisMod.modDesc.version
			) ? 1 : 2
		}
		return 0
	},

	getBadgeHTML    : (thisMod) => {
		const displayBadges = []
		
		if ( !Array.isArray(thisMod.displayBadges ) ) { return '' }
	
		for ( const badge of thisMod.displayBadges ) {
			displayBadges.push(fsgUtil.badge_main(badge))
			mainState.add_searchTagMap(badge[0], thisMod.colUUID)
		}
		return displayBadges.join('')
	},
	getBotStatusLine : (id, response, isGood,  l10n) => {
		const thisStatus = !isGood ? 'broken' : response.online ? 'online' : 'offline'
		const thisTitle  = !isGood ?
			`${id} ${l10n.unknown}` :
			response.online ?
				`${response.name} :: ${response.playersOnline} / ${response.slotCount} ${l10n.online}` :
				`${response.name} ${l10n.offline}`
		const thisText = isGood && response.online ? response.playersOnline : ''
	
		return [
			`<a title="${thisTitle}" target="_blank" href="https://www.farmsimgame.com/Server/${id}">`,
			`<span class="bot-status bot-${thisStatus}">${thisText}</span>`,
			'</a>'
		].join('')
	},
	getCollectSelect : (modCollect) => {
		const optList          = []
		const activeCollection = modCollect.opts.activeCollection
		const multiVersion     = modCollect.appSettings.multi_version
		const curVersion       = modCollect.appSettings.game_version
	
		mainState.gameSetCollect.selected = ( activeCollection !== '999' && activeCollection !== '0') ? `collection--${modCollect.opts.activeCollection}` : modCollect.opts.activeCollection
		mainState.gameSetCollect.all = {
			0   : `--${modCollect.opts.l10n.disable}--`,
			999 : `--${modCollect.opts.l10n.unknown}--`,
		}
		
		optList.push(fsgUtil.buildSelectOpt(
			'0',
			`--${modCollect.opts.l10n.disable}--`,
			mainState.gameSetCollect.selected,
			true
		))
	
		for ( const collectKey of modCollect.set_Collections ) {
			const thisVersion = modCollect.collectionNotes[collectKey].notes_version
			const fullKey     = `collection--${collectKey}`
	
			mainState.gameSetCollect.all[fullKey] = modCollect.modList[collectKey].fullName
	
			if ( !multiVersion || thisVersion === curVersion ) {
				optList.push(fsgUtil.buildSelectOpt(
					fullKey,
					modCollect.modList[collectKey].fullName,
					mainState.gameSetCollect.selected,
					false,
					modCollect.collectionToFolder[collectKey]
				))
			}
			if ( multiVersion && fullKey === mainState.gameSetCollect.selected && thisVersion !== curVersion ) {
				mainState.gameSetCollect.selected = '999'
			}
		}
	
		optList.push(fsgUtil.buildSelectOpt(
			'999',
			`--${modCollect.opts.l10n.unknown}--`,
			mainState.gameSetCollect.selected,
			true
		))
	
		return optList.join('')
	},
	getPrintDate : (textDate) => {
		const year2000 = 949381200000
		const date = typeof textDate === 'string' ? new Date(Date.parse(textDate)) : textDate

		if ( date < year2000 ) { return __('mh_unknown')}

		return `<span class="text-body-emphasis">${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${(date.getDate()).toString().padStart(2, '0')}</span>`
	},
	getSearchString : (thisMod) => {([
		thisMod.fileDetail.shortName,
		thisMod.l10n.title,
		thisMod.modDesc.author
	].join(' ').toLowerCase())},

	getFilterButton : ( name, isHide = false ) => {
		const id     = `${isHide ? 'tag_filter_out__' : 'tag_filter__'}${name}`
		const cls    = isHide ? 'filter_out_tag_buttons' : 'filter_tag_buttons'
		const l10n   = `mod_badge_${name}`
		const qty    = mainState.searchTagMap?.[name]?.length ?? null
		const color  = name === 'keys_bad' || name === 'depend' ? 'danger' : 'success'
	
		return `
			<input type="checkbox" id="${id}" onchange="select_lib.filter_begin()" class="btn-check ${cls}" autocomplete="off">
			<label class="btn btn-outline-${color}" for="${id}"><l10n name="${l10n}"></l10n>${qty !== null ? ` [${qty}]` : ''}</label>
		`
	},
	getFilterReset : (isHide = false) =>
		`<button class="btn btn-outline-warning text-center" onclick="select_lib.${isHide ? 'out_tag_reset' : 'tag_reset'}()"><l10n name="filter_tag_reset"></l10n></button>`,
	setDropDownFilters : ( l10n ) => {
		// Dynamically build filter lists based on what is in the collections
		const tagOrder = Object.keys(l10n)
			.sort((a, b) => new Intl.Collator().compare(l10n[a], l10n[b]))
			.filter((x) => Object.hasOwn(mainState.searchTagMap, x) && mainState.searchTagMap[x].length !== 0)
	
		const hiderTags = tagOrder.map((x) => mainLib.getFilterButton(x, true))
		const limitTags = tagOrder.map((x) => mainLib.getFilterButton(x, false))
	
		hiderTags.unshift(mainLib.getFilterReset(true))
		limitTags.unshift(mainLib.getFilterReset(false))
	
		fsgUtil.setById('filter_out__tags', hiderTags)
		fsgUtil.setById('filter__tags',     limitTags)
	},

	// Order Buttons
	getOrderNext : (key) => {
		const thisIndex = mainState.collectOrder.map[key]
	
		if ( typeof thisIndex === 'undefined' ) { return null }
	
		for ( let i = thisIndex + 1; i <= mainState.collectOrder.max; i++ ) {
			if ( typeof mainState.collectOrder.numeric[i] !== 'undefined' ) { return i }
		}
		return null
	},
	getOrderPrev : (key) => {
		const thisIndex = mainState.collectOrder.map[key]
		
		if ( typeof thisIndex === 'undefined' ) { return null }
	
		for ( let i = thisIndex - 1; i >= 0; i-- ) {
			if ( typeof mainState.collectOrder.numeric[i] !== 'undefined' ) { return i }
		}
		return null
	},
	setItemOrder : (collectKey, moveUpInList, forceLast = false) => {
		const curIndex = mainState.collectOrder.map[collectKey]
		const newIndex = forceLast ?
			moveUpInList ? 0 : mainState.collectOrder.max :
			moveUpInList ? mainLib.getOrderPrev(collectKey) : mainLib.getOrderNext(collectKey)
	
		if ( curIndex !== null && newIndex !== null ) {
			window.mods.reorderFolder(curIndex, newIndex)
		}
	},
	setOrderButtons : (keys, doSomething) => {
		if ( !doSomething ) { return }
		for ( const key of keys ) {
			fsgUtil.clsDisableTrue(`${key}_order_up_last`, mainLib.getOrderPrev(key) === null)
			fsgUtil.clsDisableTrue(`${key}_order_up`, mainLib.getOrderPrev(key) === null)
			fsgUtil.clsDisableTrue(`${key}_order_down`, mainLib.getOrderNext(key) === null)
			fsgUtil.clsDisableTrue(`${key}_order_down_last`, mainLib.getOrderNext(key) === null)
		}
	},
	
	// launch game
	launchGame() {
		const currentList = fsgUtil.valueById('collectionSelect')
		if ( currentList === mainState.gameSetCollect.selected ) {
			// Selected is active, no confirm
			LEDLib.spinLED()
			window.mods.startFarmSim()
		} else {
			// Different, ask confirmation
			fsgUtil.setById('no_match_game_list', mainState.gameSetCollect.all[mainState.gameSetCollect.selected])
			fsgUtil.setById('no_match_ma_list', mainState.gameSetCollect.all[currentList])
			LEDLib.fastBlinkLED()
			mainState.win.collectMismatch.show()
		}
	},
	launchGame_FIX : () => {
		mainState.win.collectMismatch.hide()
		actionLib.setCollectionActive()
	},
	launchGame_IGNORE : () => {
		mainState.win.collectMismatch.hide()
		LEDLib.spinLED()
		fsgUtil.valueById('collectionSelect', mainState.gameSetCollect.selected)
		window.mods.startFarmSim()
	},
}

const actionLib = {
	clearInput : () => { select_lib.filter_begin(null, '') },
	openMod : (enabled, modID) => {
		if ( enabled === 'true' ) { window.mods.openMod(modID) }
	},
	openModContext : (id) => {
		const allModRows     = fsgUtil.queryA('.mod-row .mod-row-checkbox:checked')
		const selectedMods   = allModRows.map((thisRow) => thisRow.id.replace('__checkbox', ''))
		const isHoldingPen   = selectedMods.length === 0 ? false : fsgUtil.byId(`${selectedMods[0].split('--')[0]}_mods`).classList.contains('is-holding-pen')
		window.mods.modCText(id, selectedMods, isHoldingPen)
	},
	setCollectionActive : () => {
		const activePick = fsgUtil.valueById('collectionSelect').replace('collection--', '')
	
		if ( activePick !== '0' && activePick !== '999' ) {
			LEDLib.blinkLED()
			window.mods.makeActive(activePick)
			if ( mainState.gameIsRunningFlag ) { alert(window.l10n.getText_sync('game_running_warning')) }
		}
	},
	setCollectionInactive : () => {
		fsgUtil.valueById('collectionSelect', 0)
		window.mods.makeInactive()
	},
	setGameVersion : (version) => {
		window.mods.changeVersion(parseInt(version, 10))
	},
	setModInfo : () => {
		window.mods.setModInfo(
			fsgUtil.htmlById('mod_info_mod_name'),
			fsgUtil.valueById('mod_info_input')
		)
		mainState.win.modInfo.hide()
	},
}

const prefLib = {
	currentDev : null,
	currentSet : null,

	state : (settings = null, devControls = null ) => {
		if ( settings !== null )    { prefLib.currentSet = settings }
		if ( devControls !== null ) { prefLib.currentDev = devControls }
	},

	dragFontSize : () => {
		fsgUtil.setById('font_size_value', `${fsgUtil.valueById('uPref_font_size')}%`)
	},
	setL10n : () => {
		window.l10n.langList_change(fsgUtil.valueById('language_select'))
	},
	setPref : (id) => {
		const formControl = fsgUtil.byId(`uPref_${id}`)
	
		if ( formControl.getAttribute('type') === 'checkbox' ) {
			window.mods.setPref(id, formControl.checked)
		} else if ( id === 'font_size' ) {
			window.mods.setPref(id, (formControl.value / 100) * 14)
		} else {
			window.mods.setPref(id, formControl.value)
		}
	},
	setTheme : () => {
		window.l10n.themeList_change(fsgUtil.valueById('theme_select'))
	},
	update : () => {
		for ( const name in prefLib.currentSet ) {
			const formControl = fsgUtil.byId(`uPref_${name}`)
			if ( formControl !== null ) {
				if ( formControl.getAttribute('type') === 'checkbox' ) {
					formControl.checked = prefLib.currentSet[name]
				} else if ( name === 'font_size' ) {
					formControl.value = (prefLib.currentSet[name] / 14) * 100
				} else {
					formControl.value = prefLib.currentSet[name]
				}
			}
		}
	
		fsgUtil.setById('font_size_value', `${Math.floor((prefLib.currentSet.font_size / 14) * 100)}%`)
	
		fsgUtil.classPerTest('.multi-version-pref', prefLib.currentSet.multi_version)
	
		fsgUtil.byId('uPref_dev_mode').checked = prefLib.currentDev[22]

		for ( const version of [19, 17, 15, 13] ) {
			fsgUtil.byId(`uPref_dev_mode_${version}`).checked = prefLib.currentDev[version]
			fsgUtil.classPerTest(`.game_enabled_${version}`, prefLib.currentSet[`game_enabled_${version}`])
			fsgUtil.classPerTest(`.game_disabled_${version}`, !prefLib.currentSet[`game_enabled_${version}`])
		}
	
		processL10N()
	},
}

const LEDLib = {
	ledUSB : { filters : [{ vendorId : fsgUtil.led.vendor, productId : fsgUtil.led.product }] },

	blinkLED     : async () => { LEDLib.operateLED('blink') },
	fastBlinkLED : async () => { LEDLib.operateLED('blink', 1000) },
	spinLED      : async () => { LEDLib.operateLED('spin') },

	operateLED   : async (type = 'spin', time = 2500) => {
		if ( ! window.mods.isLEDActive() ) { return }
		
		try {
			const clientLED = await navigator.hid.requestDevice(LEDLib.ledUSB)

			if ( clientLED.length === 0 ) { return }

			const clientLEDDevice = clientLED[0]

			await clientLEDDevice.open()
			await clientLEDDevice.sendReport(0x00, fsgUtil.led[type])
			setTimeout(async () => {
				await clientLEDDevice.sendReport(0x00, fsgUtil.led.off)
				await clientLEDDevice.close()
			}, time)
		} catch (err) {
			window.log.debug(`Unable to spin LED (no light?) : ${err}`, 'main')
		}
	},
}

const loaderLib = {
	overlay : null,

	lastTotal : 1,
	startTime : Date.now(),

	hide : () => { loaderLib.overlay?.hide() },
	show : () => { loaderLib.overlay?.show() },

	hideCount : () => {
		fsgUtil.clsHide('loadOverlay_statusCount')
		fsgUtil.clsHide('loadOverlay_statusProgBar')
	},
	startDownload : () => {
		loaderLib.startTime = Date.now()
		fsgUtil.clsShow('loadOverlay_downloadCancel')
		fsgUtil.clsShow('loadOverlay_speed')
	},
	updateCount : (count, inMB = false) => {
		const thisCount   = inMB ? fsgUtil.bytesToMB(count, false) : count
		const thisElement = fsgUtil.byId('loadOverlay_statusCurrent')
		const thisProg    = fsgUtil.byId('loadOverlay_statusProgBarInner')
		const thisPercent = `${Math.ceil((count / loaderLib.lastTotal) * 100)}%` || '0%'
	
		if ( thisProg !== null ) { thisProg.style.width = thisPercent }
	
		if ( thisElement !== null ) { thisElement.innerHTML = thisCount }
	
		if ( inMB ) {
			const perDone    = Math.max(1, Math.ceil((count / loaderLib.lastTotal) * 100))
			const perRem     = 100 - perDone
			const elapsedSec = (Date.now() - loaderLib.startTime) / 1000
			const estSpeed   = fsgUtil.bytesToMBCalc(count, false) / elapsedSec // MB/sec
			const secRemain  = elapsedSec / perDone * perRem
	
			const prettyMinRemain = Math.floor(secRemain / 60)
			const prettySecRemain = secRemain % 60
	
			fsgUtil.setById('loadOverlay_speed_speed', `${estSpeed.toFixed(1)} MB/s`)
			fsgUtil.setById('loadOverlay_speed_time', `~ ${prettyMinRemain.toFixed(0).padStart(2, '0')}:${prettySecRemain.toFixed(0).padStart(2, '0')}`)
		}
	},
	updateText : (mainTitle, subTitle, dlCancel) => {
		fsgUtil.setById('loadOverlay_statusMessage', mainTitle)
		fsgUtil.setById('loadOverlay_statusDetail', subTitle)
		fsgUtil.setById('loadOverlay_statusTotal', '0')
		fsgUtil.setById('loadOverlay_statusCurrent', '0')
		fsgUtil.setById('loadOverlay_downloadCancelButton', dlCancel)
	
		fsgUtil.clsShow('loadOverlay_statusCount')
		fsgUtil.clsShow('loadOverlay_statusProgBar')
	
		fsgUtil.clsHide('loadOverlay_downloadCancel')
		fsgUtil.clsHide('loadOverlay_speed')
		
		loaderLib.show()
	},
	updateTotal : (count, inMB = false) => {
		if ( inMB ) { loaderLib.startTime = Date.now() }
		const thisCount   = inMB ? fsgUtil.bytesToMB(count) : count
		fsgUtil.setById('loadOverlay_statusTotal', thisCount)
		loaderLib.lastTotal = ( count < 1 ) ? 1 : count
	},
}

const fileOpLib = {
	isRunning    : false,
	isZipImport  : false,
	mods         : null,
	operation    : null,
	overlay      : null,
	rawFiles     : null,
	thisCollect  : null,
	thisFolder   : null,
	thisLimit    : null,
	validCollect : [],

	dest_multi  : new Set(['import', 'multiCopy', 'multiMove', 'copyFavs']),
	dest_none   : new Set(['delete']),
	dest_single : new Set(['copy', 'move']),

	l10n_button : {
		copy      : 'copy',
		copyFavs  : 'copy',
		delete    : 'delete',
		move      : 'move',
		multiCopy : 'copy',
		multiMove : 'move',
	},
	l10n_info : {
		copy      : 'confirm_copy_blurb',
		copyFavs  : 'confirm_copy_multi_blurb',
		delete    : 'confirm_delete_blurb',
		move      : 'confirm_move_blurb',
		multiCopy : 'confirm_copy_multi_blurb',
		multiMove : 'confirm_move_multi_blurb',
	},
	l10n_title : {
		copy      : 'confirm_copy_title',
		copyFavs  : 'confirm_multi_copy_title',
		delete    : 'confirm_delete_title',
		move      : 'confirm_move_title',
		multiCopy : 'confirm_multi_copy_title',
		multiMove : 'confirm_move_title',
	},

	findConflict : (collectKey, shortName, folder) => {
		for ( const modKey of mainState.modCollect.modList[collectKey].modSet ) {
			const thisMod = mainState.modCollect.modList[collectKey].mods[modKey]
	
			if ( shortName === thisMod.fileDetail.shortName && folder === thisMod.fileDetail.isFolder ) {
				return true
			}
		}
		return false
	},
	goButton : () => {
		if ( fileOpLib.operation === 'delete' ) {
			fileOpLib.goButton_delete()
		} else if ( fileOpLib.operation === 'move' || fileOpLib.operation === 'copy' ) {
			fileOpLib.goButton_single()
		} else if ( fileOpLib.dest_multi.has(fileOpLib.operation) ) {
			fileOpLib.goButton_multi()
		}
		fileOpLib.overlay.hide()
	},
	goButton_delete : () => {
		window.mods.realDeleteFile(fileOpLib.mods.map((thisMod) => [
			fileOpLib.thisCollect,
			fileOpLib.thisCollect,
			thisMod.fileDetail.fullPath
		]))
	},
	goButton_multi  : () => {
		const realDestinations = fsgUtil.query('#fileOpCanvas-destination :checked')
		const fileMap          = []

		if ( fileOpLib.operation === 'import' ) { return }

		for ( const mod of fileOpLib.mods ) {
			for ( const realDest of realDestinations ) {
				fileMap.push([
					realDest.id.replace('file_dest__', ''),
					mod.currentCollection,
					mod.fileDetail.fullPath
				])
			}
		}

		if ( fileOpLib.operation === 'multiCopy' ) { window.mods.realCopyMultiFile(fileMap) }
		if ( fileOpLib.operation === 'multiMove' ) { window.mods.realMoveMultiFile(fileMap) }
		if ( fileOpLib.operation === 'copyFavs'  ) { window.mods.realCopyMultiFile(fileMap)}
	},
	goButton_single : () => {
		const destination = fsgUtil.valueById('fileOpCanvas-select-dest')
		const fileMap     = []

		if ( destination === '0' ) { return false }

		for ( const mod of fileOpLib.mods ) {
			const includeMeElement = fsgUtil.byId(`file_op__${mod.uuid}`)
	
			if ( includeMeElement.getAttribute('type') === 'checkbox' && includeMeElement.checked === true ) {
				fileMap.push([destination, fileOpLib.thisCollect, mod.fileDetail.fullPath])
			}
			if ( includeMeElement.getAttribute('type') === 'hidden' && includeMeElement.value ) {
				fileMap.push([destination, fileOpLib.thisCollect, mod.fileDetail.fullPath])
			}
		}
		if ( fileOpLib.operation === 'move' ) { window.mods.realMoveFile(fileMap) }
		if ( fileOpLib.operation === 'copy' ) { window.mods.realCopyFile(fileMap) }
	},
	initBatchOp : (mode) => {
		const allModRows     = fsgUtil.queryA('.mod-row .mod-row-checkbox:checked')
		const selectedMods   = allModRows.map((thisRow) => thisRow.id.replace('__checkbox', ''))
		const alternateMod   = select_lib.last_alt_select !== null ? [select_lib.last_alt_select] : selectedMods
	
		if ( selectedMods.length === 0 ) { return }
	
		const isHoldingPen   = fsgUtil.clsIdHas(`${selectedMods[0].split('--')[0]}_mods`, 'is-holding-pen')
	
		switch ( mode ) {
			case 'copy' :
			case 'move' :
				window.mods[`${mode}${isHoldingPen ? 'Multi' : 'Mods'}`](selectedMods)
				break
			case 'delete' :
			case 'zip' :
				window.mods[`${mode}Mods`](selectedMods)
				break
			case 'openMods' :
			case 'openHub' :
			case 'openExt' :
				if ( alternateMod.length === 1 ) {
					window.mods[mode](alternateMod)
				}
				break
			default :
				break
		}
	},
	keyBoard     : (action) => {
		for ( const element of fsgUtil.query('.fileOpCanvas-check') ) {
			switch ( action ) {
				case 'invert':
					element.checked = !element.checked; break
				case 'all':
					element.checked = true; break
				default:
					element.checked = false; break
			}
		}
	},
	listMods : () => {
		const noConflict   = fileOpLib.noConflict()
		const confirmHTML  = []
		const selectedDest = fsgUtil.valueById('fileOpCanvas-select-dest')
		const multiDest    = fsgUtil.query('#fileOpCanvas-destination :checked')
		let   enableButton = false

		for ( const thisMod of fileOpLib.mods ) {
			let destHTML = ''

			switch ( true ) {
				case noConflict && fileOpLib.operation === 'delete':
					enableButton = true
					break
				case noConflict:
					if ( multiDest.length !== 0 ) { enableButton = true }
					break
				case selectedDest === '0':
					destHTML = fsgUtil.useTemplate('file_op_no_dest', {})
					break
				case fileOpLib.findConflict(selectedDest, thisMod.fileDetail.shortName, thisMod.fileDetail.isFolder) :
					enableButton = true
					destHTML = fsgUtil.useTemplate('file_op_conflict_dest', { uuid : thisMod.uuid })
					break
				default :
					enableButton = true
					destHTML = fsgUtil.useTemplate('file_op_clear_dest', { uuid : thisMod.uuid })
					break
			}

			confirmHTML.push(fsgUtil.useTemplate('file_op_mod_row', {
				destHTML  : destHTML,
				icon      : fsgUtil.iconMaker(thisMod.modDesc.iconImageCache),
				isAFolder : thisMod.fileDetail.isFolder ? '' : 'd-none',
				printPath : `${fileOpLib.thisFolder}\\${fsgUtil.basename(thisMod.fileDetail.fullPath)}`,
				shortname : thisMod.fileDetail.shortName,
				title     : fsgUtil.escapeSpecial(thisMod.l10n.title),
			}))
		}

		fsgUtil.clsDelId('fileOpCanvas-button', 'btn-success', 'btn-danger', 'btn-warning')
		fsgUtil.clsAddId(
			'fileOpCanvas-button',
			fileOpLib.operation === 'delete' ?
				'btn-danger' :
				enableButton ? 'btn-success' : 'btn-warning'
		)
		fsgUtil.clsDisableFalse('fileOpCanvas-button', enableButton)
		fsgUtil.setById('fileOpCanvas-source', confirmHTML)
		processL10N()
	},
	noConflict   : () => fileOpLib.dest_multi.has(fileOpLib.operation) || fileOpLib.dest_none.has(fileOpLib.operation),
	startOverlay : (opPayload) => {
		console.log(opPayload)
		fileOpLib.isZipImport = opPayload.isZipImport
		fileOpLib.isRunning   = true
		fileOpLib.operation   = opPayload.operation
		fileOpLib.mods        = opPayload.records
		fileOpLib.thisCollect = opPayload.originCollectKey
		fileOpLib.thisLimit   = opPayload.multiSource
		fileOpLib.rawFiles    = opPayload.rawFileList
		fileOpLib.thisFolder  = mainState.modCollect.collectionToFolderRelative[fileOpLib.thisCollect]

		fsgUtil.setById('fileOpCanvas-title', __(fileOpLib.l10n_title[fileOpLib.operation]))
		fsgUtil.setById('fileOpCanvas-info', __(fileOpLib.l10n_info[fileOpLib.operation]))
		fsgUtil.setById('fileOpCanvas-button', __(fileOpLib.l10n_button[fileOpLib.operation]))
		fsgUtil.clsShow('fileOpCanvas-destination-block')

		if ( fileOpLib.dest_single.has(fileOpLib.operation) ) {
			fsgUtil.setById('fileOpCanvas-destination', [
				'<select onchange="fileOpLib.listMods()" id="fileOpCanvas-select-dest" class="form-select">',
				fsgUtil.buildSelectOpt(0, '...', 0),
				...fileOpLib.validCollect.filter((x) => x[0] !== fileOpLib.thisCollect).map((x) => fsgUtil.buildSelectOpt(x[0], x[1], 0)),
				'</select>'
			])
		} else if ( fileOpLib.dest_multi.has(fileOpLib.operation) ) {
			fsgUtil.setById('fileOpCanvas-destination', [
				'<div class="row gy-2 align-items-center">',
				...fileOpLib.validCollect
					.filter((x) => x[0] !== fileOpLib.thisCollect && ( fileOpLib.thisLimit === null || !fileOpLib.thisLimit.includes(x[0]) ))
					.map((x) =>
						fsgUtil.useTemplate('file_op_collect_box', {
							id     : x[0],
							name   : x[1],
							folder : mainState.modCollect.collectionToFolderRelative[x[0]],
						})
					),
				'</div>',
			])
		} else {
			fsgUtil.clsHide('fileOpCanvas-destination-block')
		}

		fileOpLib.listMods()

		fileOpLib.overlay.show()
		processL10N()
	},
	stop : () => {
		fileOpLib.isRunning   = false
		fileOpLib.mods        = []
		fileOpLib.thisCollect = null
		fileOpLib.thisFolder  = null
		fileOpLib.operation   = null
	},
}

const dragLib = {
	isFolder  : false,
	isRunning : false,

	dragDrop : (e) => {
		e.preventDefault()
		e.stopPropagation()
	
		dragLib.isRunning = false
	
		fsgUtil.clsHide('drag_back')
		fsgUtil.clsDelId('drag_add_file', 'bg-primary')
		fsgUtil.clsDelId('drag_add_folder', 'd-none', 'bg-primary')
	
		const dt    = e.dataTransfer
		const files = dt.files
	
	
		if ( dragLib.isFolder ) {
			const newFolder = files[0].path
			window.mods.dropFolder(newFolder)
		} else {
			const fileList = []
			for ( const thisFile of files ) { fileList.push(thisFile.path) }
			window.mods.dropFiles(fileList)
		}
	
		dragLib.isFolder = false
	},
	dragEnter : (e) => {
		e.preventDefault()
		e.stopPropagation()
	
		if ( !dragLib.isRunning ) {
			fsgUtil.clsShow('drag_back')
		
			const isCSV = e.dataTransfer.items[0].type === 'text/csv'
	
			fsgUtil.clsHideTrue('csv-no', isCSV)
			fsgUtil.clsHideTrue('csv-no-text', isCSV)
			fsgUtil.clsHideFalse('csv-yes', isCSV)
			fsgUtil.clsHideFalse('csv-yes-text', isCSV)
	
			if ( e.dataTransfer.items.length > 1 || e.dataTransfer.items[0].type !== '' ) {
				// multiple, so can't add as collection or non-empty type
				fsgUtil.clsHide('drag_add_folder')
			}
	
		} else {
			const addFolder = fsgUtil.byId('drag_add_folder')
			const addFile   = fsgUtil.byId('drag_add_file')
			let   thisID    = e.target.id
			const thePath   = e.composedPath()
	
			if ( thisID !== 'drag_add_folder' && thisID !== 'drag_add_file' ) {
				if ( thePath.includes(addFolder) ) { thisID = 'drag_add_folder' }
				if ( thePath.includes(addFile) )   { thisID = 'drag_add_file' }
			}
			if ( thisID === 'drag_add_folder' ) {
				addFolder.classList.add('bg-primary')
				addFile.classList.remove('bg-primary')
				dragLib.isFolder = true
			}
			if ( thisID === 'drag_add_file' ) {
				addFolder.classList.remove('bg-primary')
				addFile.classList.add('bg-primary')
				dragLib.isFolder = false
			}
		}
	
		dragLib.isRunning = true
	},
	dragLeave : (e) => {
		e.preventDefault()
		e.stopPropagation()
	
		if ( e.x <= 0 && e.y <= 0 ) {
			dragLib.isRunning = false
			dragLib.isFolder  = false
			fsgUtil.clsHide('drag_back')
	
			fsgUtil.clsDelId('drag_add_file', 'bg-primary')
			fsgUtil.clsDelId('drag_add_folder', 'd-none', 'bg-primary')
		}
	},
	dragOut : (e) => {
		e.preventDefault()
		e.stopPropagation()
	
		const thePath = e.composedPath()
	
		for ( const thisPath of thePath ) {
			if ( thisPath.nodeName === 'TR' ) {
				window.mods.dragOut(thisPath.id)
				break
			}
		}
	},
	dragOver : (e) => {
		e.preventDefault()
		e.stopPropagation()
	
		e.dataTransfer.dropEffect = (dragLib.isFolder ? 'link' : 'copy')
	},
}