/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main Window UI

/* global MA, DATA, I18N, bootstrap*/

// eslint-disable-next-line no-unused-vars
class StateManager {
	selectClass     = 'bg-mod-selected'
	malwareSkip     = []
	malwareSuppress = []

	flag = {
		activeCollect  : null,
		currentVersion : 22,
		debugMode      : false,
		folderDirty    : false,
		folderEdit     : false,
		gameRunning    : false,
		launchEnable   : false,
		miniMode       : false,
		updateReady    : false,
		versionTool    : false,
	}
	track = {
		altClick       : null,
		filter_must    : new Set(),
		filter_not     : new Set(),
		lastID         : null,
		lastIndex      : null,
		lastPayload    : null,
		newFolder      : null,
		openCollection : null,
		scrollPosition : 0,
		searchString   : '',
		searchType     : 'find_all',
		selected       : new Set(),
		selectedOnly   : false,
		sortOrder      : 'sort_name',
	}
	orderMap = { keys : [], keyToNum : {}, max : 0, numToKey : {} }

	collections = {}
	mods        = {}
	verList     = {}
	extSites    = {}

	loader = null

	modal = {
		mismatch : null,
		modInfo  : null,
	}

	searchTagList = new Set()

	mapCollectionDropdown = new Map()
	mapCollectionFiles    = new Map()

	// MARK: constructor
	constructor() {
		this.dragDrop = new DragDropLib()
		this.loader   = new LoaderLib()
		this.files    = new FileLib()
		this.prefs    = new PrefLib()
		this.modal.mismatch = new ModalOverlay('#open_game_modal')
		this.modal.modInfo  = new ModalOverlay('#open_mod_info_modal')

		window.main_IPC.receive('status:all', () => this.updateState() )
	}

	#updateTracking(data) {
		const lastColSet = this.track.lastPayload?.set_Collections || null

		if ( lastColSet !== null ) {
			const newFolderSet = data.set_Collections.difference(lastColSet)
			if ( newFolderSet.size === 1 ) {
				this.track.newFolder = [...newFolderSet][0]
			} else {
				this.track.newFolder = null
			}
		} else {
			this.track.newFolder = null
		}

		this.track.lastPayload   = data
		this.flag.activeCollect  = data.opts.activeCollection
		this.flag.currentVersion = data.appSettings.game_version
		this.flag.debugMode      = data.opts.isDev
		this.flag.folderDirty    = data.opts.foldersDirty
		this.flag.folderEdit     = data.opts.foldersEdit
		this.flag.gameRunning    = data.opts.gameRunning
		this.flag.launchEnable   = data.opts.gameRunningEnable
		this.flag.miniMode       = data.opts.showMini
		this.flag.updateReady    = data.updateReady
		this.flag.versionTool    = false

		this.extSites            = data.opts.modSites
		this.malwareSkip         = data.dangerModsSkip
		this.malwareSuppress     = data.appSettings.suppress_malware

		this.searchTagList       = new Set()
		this.collections         = {}
		this.mods                = {}
		this.orderMap            = { keys : [], keyToNum : {}, max : 0, numToKey : {} }

		this.mapCollectionFiles    = new Map()
		this.mapCollectionDropdown = new Map()
		this.mapCollectionDropdown.set(0, `--${data.opts.l10n.disable}--`)
	}
	// MARK: process data
	async updateFromData(data) {
		this.#updateTracking(data)
	
		for ( const [CIndex, CKey] of Object.entries([...data.set_Collections]) ) {
			if ( data.collectionNotes[CKey].notes_version !== this.flag.currentVersion ) { continue }

			this.orderMap.keys.push(CKey)
			this.orderMap.keyToNum[CKey]   = parseInt(CIndex)
			this.orderMap.numToKey[CIndex] = CKey
			this.orderMap.max              = Math.max(this.orderMap.max, parseInt(CIndex))
			
			this.mapCollectionDropdown.set(CKey, data.modList[CKey].fullName)
			this.mapCollectionFiles.set(CKey, {
				color  : data.collectionNotes[CKey].notes_color,
				folder : data.collectionToFolderRelative[CKey],
				name   : data.modList[CKey].name,
				tag    : data.collectionNotes[CKey].notes_tagline,
			})

			// eslint-disable-next-line no-await-in-loop
			const thisCol = await this.#addCollection(CKey, data.modList[CKey], data.collectionNotes[CKey], data.collectionToStatus[CKey])
			this.collections[CKey] = thisCol

			if ( !this.flag.folderEdit ) {
				this.mods[CKey] = {}

				for ( const [MKey, thisMod] of Object.entries(data.modList[CKey].mods) ) {
					const thisModName = thisMod.fileDetail.shortName

					// eslint-disable-next-line no-await-in-loop
					const thisModRec  = await this.#addMod(thisMod, this.getSaveBadges(CKey, thisMod))

					for ( const tag of thisModRec.filters ) { this.searchTagList.add(tag) }

					thisCol.sorter.push([
						MKey,
						thisModRec.search.find_name,
						thisModRec.search.find_author,
						thisModRec.search.find_title,
						thisModRec.search.find_version,
						thisMod.fileDetail.fileDate
					])

					this.mods[CKey][MKey] = thisModRec

					if ( thisModRec.filters.has('map') ) {
						thisCol.mapList.push({
							icon  : thisMod.modDesc.iconImageCache,
							key   : thisMod.colUUID,
							title : thisMod.fileDetail.shortName,
						})
					}

					if ( thisCol.notes.notes_frozen ) { continue }
					if ( this.flag.versionTool ) { continue }
					if ( typeof this.verList[thisModName] !== 'undefined' && this.verList[thisModName] !== thisMod.modDesc.version ) {
						this.flag.versionTool = true
						continue
					}
					this.verList[thisModName] = thisMod.modDesc.version
				}
				this.#processCollection_std(CKey)
			}
		}
		this.mapCollectionDropdown.set(999, `--${data.opts.l10n.unknown}--`)

		if ( this.flag.folderEdit ) {
			for ( const CKey of Object.keys(this.collections) ) {
				this.#processCollection_edit(CKey)
			}
		}

		this.updateVerPick(data)
		this.updateUI()
		this.fixSorts()
		if ( this.track.openCollection !== null ) {
			this.collections[this.track.openCollection]?.modNode?.classList?.remove?.('d-none')
		}
		this.prefs.forceUpdate()
		this.doDisplay()

		if ( this.track.newFolder !== null ) {
			this.colScroll(this.track.newFolder)
		}
	}

	updateVerPick(data) {
		const versionPicker = MA.byId('farm_sim_versions')
		versionPicker.innerHTML = ''
		for ( const ver of [25, 22, 19, 17, 15, 13] ) {
			const verNode = this.doVersionChanger(ver, data.appSettings, data)
			if ( verNode !== null ) { versionPicker.appendChild(verNode) }
		}
	}

	getSaveBadges(CKey, mod) {
		if ( this.track.lastPayload.opts?.cacheGameSave?.collectKey !== CKey ) { return null }
		return this.track.lastPayload.opts?.cacheGameSave?.modList?.[mod.fileDetail.shortName] ?? null
	}

	// MARK: finish sort trees
	fixSorts() {
		for ( const CKey of this.orderMap.keys ) {
			const thisCol = this.collections[CKey]
			thisCol.sorter       = thisCol.sorter.sort((a, b) => Intl.Collator().compare(a[1], b[1]))
			thisCol.sort_name    = thisCol.sorter.map((x) => x[0])
			thisCol.sort_author  = thisCol.sorter.sort((a, b) => Intl.Collator().compare(a[2], b[2])).map((x) => x[0])
			thisCol.sort_title   = thisCol.sorter.sort((a, b) => Intl.Collator().compare(a[3], b[3])).map((x) => x[0])
			thisCol.sort_version = thisCol.sorter.sort((a, b) => Intl.Collator().compare(a[4], b[4])).map((x) => x[0])
			thisCol.sort_date    = thisCol.sorter.sort((a, b) => Intl.Collator().compare(b[5], a[5])).map((x) => x[0])
		}
	}

	// MARK: update state
	updateState() {
		window.main_IPC.updateState().then((status) => {
			MA.byId('debug_danger_bubble').clsShow(status.dangerDebug)
			MA.byId('topBar-update').clsShow(status.updateReady)
			this.flag.folderDirty  = status.foldersDirty
			this.flag.gameRunning  = status.gameRunning
			this.flag.launchEnable = status.gameRunningEnabled
			MA.byId('dirty_folders').clsShow(this.flag.folderDirty)
			MA.byId('gameRunningBubble')
				.clsShow(this.flag.launchEnable)
				.clsOrGate(this.flag.gameRunning, 'text-success', 'text-danger')

			
			if ( Object.keys(status.botStatus.response).length === 0 ) { return }
				
			for ( const [CKey, IDs] of Object.entries(status.botStatus.requestMap) ) {
				const thisBotDiv = this.collections?.[CKey]?.nodeBot ?? null

				if ( thisBotDiv === null ) { continue }
				thisBotDiv.innerHTML = ''

				for ( const thisID of IDs ) {
					thisBotDiv.appendChild(this.#botEntry(
						thisID,
						status.botStatus.response[thisID],
						status.botStatus.response[thisID].status === 'Good',
						status.botStatus.l10nMap
					))
				}
			}
		})
	}

	#botEntry(id, response, isGood, l10n) {
		const thisStatus = !isGood ? 'broken' : response.online ? 'online' : 'offline'
		const thisTitle  = !isGood ?
			`${id} ${l10n.unknown}` :
			response.online ?
				`${response.name} :: ${response.playersOnline} / ${response.slotCount} ${l10n.online}` :
				`${response.name} ${l10n.offline}`
		const thisText = isGood && response.online ? response.playersOnline : '-'
		const node = document.createElement('a')
		node.setAttribute('title', thisTitle)
		node.innerHTML = `<span class="bot-status bot-${thisStatus}">${thisText}</span>`
		node.addEventListener('click', (e) => {
			e.stopPropagation()
			window.operations.url(`https://www.farmsimgame.com/Server/${id}`)
		})
		return node
	}

	// MARK: update UI
	updateUI() {
		const todayIS = new Date()
		if ( this.flag.debugMode ) {
			MA.byId('drag_target', 'fsg-back-3')
		} else if ( todayIS.getMonth() === 3 && todayIS.getDate() === 1 ) {
			MA.byId('drag_target', 'fsg-back-2')
		}

		MA.queryF('[data-key="game_icon_lg"]').setAttribute('refresh', 'true')
		MA.queryF('[data-key="game_icon"]').setAttribute('refresh', 'true')

		document.body.setAttribute('data-version', this.flag.currentVersion)

		MA.byId('topBar-mini').clsOrGate(this.flag.miniMode, 'text-info', null)
		MA.byId('topBar-update').clsShow(this.flag.updateReady)
		MA.byId('dirty_folders').clsShow(this.flag.folderDirty)
		MA.byId('moveButton_ver').clsOrGate(this.flag.versionTool, 'btn-danger', 'btn-success')
		MA.byId('folderEditButton').clsOrGate(this.flag.folderEdit, 'btn-primary', 'btn-outline-primary')

		const optList = []
		for (const [value, text] of this.mapCollectionDropdown) {
			optList.push(DATA.optionFromArray([value, text], this.flag.activeCollect))
		}
		MA.byIdHTML('collectionSelect', optList.join(''))

		this.updateI18NDrops()
	}

	// MARK: translated UI selects
	async updateI18NDrops() {
		const finds = ['find_all', 'find_author', 'find_title', 'find_name']
		const sorts = ['sort_name', 'sort_title', 'sort_author', 'sort_date', 'sort_version']

		const findOptions = finds.map((x) =>
			window.i18n.get(x).then((r) => DATA.optionFromArray([x, r.entry], this.track.searchType))
		)
		const sortOptions = sorts.map((x) =>
			window.i18n.get(x).then((r) => DATA.optionFromArray([x, r.entry], this.track.sortOrder))
		)
		Promise.all(findOptions).then((r) => {
			MA.byIdHTML('modFindType', r.join(''))
		})
		Promise.all(sortOptions).then((r) => {
			MA.byIdHTML('modSortOrder', r.join(''))
		})
	}

	// MARK: update sideBar
	doSideBar() {
		MA.byId('moveButton_move').clsDisable(this.track.selected.size === 0)
		MA.byId('moveButton_copy').clsDisable(this.track.selected.size === 0)
		MA.byId('moveButton_delete').clsDisable(this.track.selected.size === 0)
		MA.byId('moveButton_zip').clsDisable(this.track.selected.size === 0)

		MA.byId('moveButton_open').clsEnable(this.track.selected.size === 1 || this.track.altClick !== null)

		if ( this.track.selected.size !== 1 && this.track.altClick === null ) {
			MA.byId('moveButton_hub').clsDisable()
			MA.byId('moveButton_site').clsDisable()
		} else {
			const singleModID = this.track.altClick !== null ? this.track.altClick : [...this.track.selected][0]
			const element = MA.byId(singleModID)
			MA.byId('moveButton_hub').clsEnable(element !== null && element.classList.contains('has-hash'))
			MA.byId('moveButton_site').clsEnable(element !== null && element.classList.contains('has-ext-site'))
		}
		this.select.count()
	}

	// MARK: update display
	doDisplay() {
		const scrollFrag = document.createDocumentFragment()
		const docFrag    = document.createDocumentFragment()

		if ( this.flag.folderEdit ) {
			const editNode = document.createElement('tr')
			editNode.classList.add('mod-table-folder', 'border-bottom')
			editNode.innerHTML = '<td colspan="3" class="py-2"><i18n-text type="button" class="w-75 mx-auto d-block btn btn-sm btn-primary" data-key="folder_alpha"></i18n-text></td>'
			editNode.querySelector('i18n-text').addEventListener('click', () => {
				window.main_IPC.folder.alpha()
			})
			docFrag.appendChild(editNode)
		} else {
			this.filter.build()
		}

		for ( const CKey of this.orderMap.keys ) {
			const thisCol = this.collections[CKey]
			thisCol.nodeIcon.innerHTML = DATA.makeFolderIcon(
				this.track.openCollection === CKey,
				thisCol.notes.notes_favorite,
				this.flag.activeCollect === CKey,
				thisCol.notes.notes_holding,
				thisCol.notes.notes_color
			)

			scrollFrag.appendChild(thisCol.scroll)
			docFrag.appendChild(thisCol.node)

			if ( ! this.flag.folderEdit && this.track.openCollection === CKey ) {
				thisCol.modNodePoint.innerHTML = ''
				for ( const MKey of thisCol[this.track.sortOrder] ) {
					const modRec = this.mods[CKey][MKey]
					const modKey = `${CKey}--${MKey}`
					if ( ! this.track.selected.has(modKey) ) {
						if ( this.doesSearchExclude(modRec) ) { continue }
						if ( this.doesTagExclude(modRec)    ) { continue }
						if ( this.track.selectedOnly        ) { continue }
					}

					thisCol.modNodePoint.appendChild(modRec.node)
					scrollFrag.appendChild(modRec.scroll)
				}
			}

			docFrag.appendChild(thisCol.modNode)
		}
		MA.byId('mod-collections').innerHTML = ''
		MA.byId('mod-collections').appendChild(docFrag)
		MA.byId('scroll-bar-fake').innerHTML = ''
		MA.byId('scroll-bar-fake').appendChild(scrollFrag)
		this.doSideBar()
		this.refreshSelected()
	}

	doVersionChanger(version, options, modCollect) {
		const counts = { collect : 0, mods : 0 }
		
		if ( !options[`game_enabled_${version}`] && version !== this.flag.currentVersion ) { return null }
		
		for ( const collectKey of modCollect.set_Collections ) {
			if ( modCollect.collectionNotes[collectKey].notes_version === version ) {
				counts.collect++
				counts.mods += modCollect.modList[collectKey].alphaSort.length
			}
		}

		const node = DATA.templateEngine('version_row', {
			collections     : counts.collect,
			mods            : counts.mods,
			version         : version,
		}, {}, {
			'.versionIcon' : `fsico-ver-${version}`,
		})

		node.firstElementChild.classList.add(version === this.flag.currentVersion ? 'bg-success' : 'bg-primary')
		node.firstElementChild.addEventListener('click', () => {
			window.settings.set('game_version', version).then(() => {
				window.main_IPC.folder.reload()
			})
		})
		return node
	}

	doesSearchExclude(mod) {
		// reversed condition! false if OK!
		if ( this.track.searchString.length < 2 ) { return false }

		const termNotFound = mod.search[this.track.searchType].indexOf(this.track.searchString) === -1

		return ( this.track.searchString.startsWith('!') ) ? !termNotFound : termNotFound
	}

	doesTagExclude(mod) {
		if ( this.track.filter_must.size === 0 && this.track.filter_not.size === 0 ) { return false }

		for ( const excludeTag of this.track.filter_not ) {
			if ( mod.filters.has(excludeTag) ) { return true }
		}

		for ( const mustTag of this.track.filter_must ) {
			if ( ! mod.filters.has(mustTag) ) { return true }
		}
		return false
	}

	// MARK: addCollection
	async #addCollection(CKey, collection, notes, online) {
		const colRec = {
			data         : collection,
			mapList      : [],
			modNode      : document.createElement('tr'),
			modNodePoint : null,
			node         : document.createElement('tr'),
			nodeBot      : null,
			nodeIcon     : null,
			notes        : notes,
			online       : online,
			scroll       : document.createElement('scroller-item'),
			sorter       : [],

			sort_author   : [],
			sort_date     : [],
			sort_name     : [],
			sort_title    : [],
			sort_version  : [],
		}

		colRec.scroll.id = `${CKey}--scroller`
		colRec.node.id   = CKey
		colRec.node.classList.add('mod-table-folder', 'border-bottom')
		colRec.node.addEventListener('contextmenu', () => { this.colContext(CKey)} )
		

		if ( ! this.flag.folderEdit ) {
			colRec.node.appendChild(DATA.templateEngine('item_collect', {
				folderSize : colRec.online ? await DATA.bytesToHR(collection.folderSize) : I18N.defer('removable_offline', false),
				name       : collection.name,
				tagLine    : notes.notes_tagline,
				totalCount : collection.alphaSort.length > 999 ? '999+' : collection.alphaSort.length,
			}))

			colRec.node.children[0].addEventListener('click',       () => { this.colToggle(CKey)} )
			colRec.node.children[1].addEventListener('click',       () => { this.colToggle(CKey)} )

			colRec.nodeBot  = colRec.node.querySelector('.botInfo')
			colRec.nodeIcon = colRec.node.querySelector('.folder-icon-svg')

			colRec.modNode.id = `${CKey}--mods`
			colRec.modNode.classList.add('mod-table-folder-detail', 'd-none')
			colRec.modNode.innerHTML = [
				'<td class="mod-table-folder-details px-0 ps-4" colspan="3">',
				'<i18n-text class="no-mods-found d-block fst-italic small text-center d-none" data-key="empty_or_filtered"></i18n-text>',
				'<table class="w-100 py-0 my-0 table table-sm table-hover table-striped"></table>',
				'</td>'
			].join('')

			colRec.modNodePoint = colRec.modNode.querySelector('table')
		} else {
			colRec.node.appendChild(DATA.templateEngine('item_collect_edit', {
				dateAdd    : DATA.dateToString(notes.notes_add_date),
				dateUsed   : DATA.dateToString(notes.notes_last),
				folderSize : colRec.online ? await DATA.bytesToHR(collection.folderSize) : I18N.defer('removable_offline', false),
				name       : collection.name,
				tagLine    : notes.notes_tagline,
				totalCount : collection.alphaSort.length > 999 ? '999+' : collection.alphaSort.length,
			}))
			colRec.nodeIcon = colRec.node.querySelector('.folder-icon-svg')
		}
		return colRec
	}

	// MARK: collect buttons
	#buttonMaker(text, color, callback, disabled = false) {
		const node = document.createElement('i18n-text')
		node.classList.add('btn', `btn-${color}`, 'btn-sm')
		node.setAttribute('data-key', text)
		node.addEventListener('click', callback)
		if ( disabled ) { node.clsDisable() }
		return node
	}

	#processCollection_edit(CKey) {
		const col     = this.collections[CKey]
		const btnNode = col.node.querySelector('.collect-line-buttons')

		btnNode.innerHTML = ''
		btnNode.appendChild(this.#buttonMaker(
			'folder_top_button',
			'secondary',
			() => { this.order.set(CKey, true, true) },
			this.order.prev(CKey) === null
		))
		btnNode.appendChild(this.#buttonMaker(
			'folder_up_button',
			'secondary',
			() => { this.order.set(CKey, true, false) },
			this.order.prev(CKey) === null
		))
		btnNode.appendChild(this.#buttonMaker(
			'folder_down_button',
			'secondary',
			() => { this.order.set(CKey, false, false) },
			this.order.next(CKey) === null
		))
		btnNode.appendChild(this.#buttonMaker(
			'folder_bot_button',
			'secondary',
			() => { this.order.set(CKey, false, true) },
			this.order.next(CKey) === null
		))
		btnNode.appendChild(this.#buttonMaker(
			'remove_folder',
			'danger',
			() => { window.main_IPC.folder.remove(CKey) }
		))
		btnNode.appendChild(this.#buttonMaker(
			'basegame_button_folder',
			'success',
			() => { window.main_IPC.folder.open(CKey) }
		))
	}
	#processCollection_std(CKey) {
		const col     = this.collections[CKey]
		const note    = col.notes
		const btnNode = col.node.querySelector('.collect-line-buttons')

		btnNode.innerHTML = ''

		if ( col.mapList.length === 1 ) {
			const map = col.mapList[0]
			const node = document.createElement('div')
			node.classList.add('btn', 'btn-outline-primary', 'btn-sm', 'p-0')
			node.setAttribute('title', map.title)
			node.innerHTML = `<img src="${DATA.iconMaker(map.icon)}" alt="" class="img-fluid rounded" style="width: 27px; height: 27px;">`
			node.addEventListener('click', () => { window.main_IPC.dispatchDetail(map.key) })
			btnNode.appendChild(node)
		} else if ( col.mapList.length > 1 ) {
			const maps = col.mapList.sort((a, b) => Intl.Collator().compare(a.title, b.title))
			const node = document.createElement('div')
			node.classList.add('dropdown', 'd-inline-block')
			node.innerHTML = [
				'<button class="btn btn-outline-primary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">',
				'<i18n-text data-key="map_multi_button"></i18n-text>',
				'</button>',
				'<ul class="dropdown-menu dropdown-menu-end" style="min-width: 30vw; max-width: 50vw;">',
				'</ul></div>',
			].join('')

			const mapNodeP = node.querySelector('ul')
			for ( const map of maps ) {
				const mNode = document.createElement('li')
				mNode.innerHTML = [
					`<a class="dropdown-item" title="${map.title}">`,
					`<img alt="" class="img-fluid rounded me-2" style="width: 27px; height: 27px;" src="${DATA.iconMaker(map.icon)}">`,
					map.title,
					'</a>'
				].join('')
				mNode.querySelector('a').addEventListener('click', () => { window.main_IPC.dispatchDetail(map.key) })
				mapNodeP.appendChild(mNode)
			}
			btnNode.appendChild(node)
		}

		if ( note.notes_removable ) {
			btnNode.appendChild(this.#buttonMaker('removable_button', 'outline-secondary', () => { return }))
		}
		if ( note.notes_websiteDL ) {
			btnNode.appendChild(this.#buttonMaker('download_button', 'outline-warning', () => { window.main_IPC.folder.download(CKey) }))
		}
		if ( note.notes_game_admin !== null ) {
			btnNode.appendChild(this.#buttonMaker('game_admin_pass_button', 'outline-success', () => { window.operations.clip(note.notes_game_admin) }))
		}
		if ( note.notes_admin !== null ) {
			btnNode.appendChild(this.#buttonMaker('admin_pass_button', 'outline-info', () => { window.operations.clip(note.notes_admin) }))
		}
		if ( note.notes_website !== null ) {
			btnNode.appendChild(this.#buttonMaker('admin_button', 'outline-info', () => { window.operations.url(note.notes_website) }))
		}
		const colTime = typeof note.notes_add_date === 'string' ?
			new Date(note.notes_add_date).getTime() :
			note.notes_add_date !== null ?
				note.notes_add_date.getTime() :
				0
		const recTime = (new Date().getTime()) - (1000*60*60)
		if ( colTime > recTime ) {
			col.node.classList.add('bg-info-subtle')
		} else {
			col.node.classList.remove('bg-info-subtle')
		}

		btnNode.appendChild(this.#buttonMaker('export_button', 'outline-info', () => { window.main_IPC.folder.export(CKey) }))
		btnNode.appendChild(this.#buttonMaker('notes_button', 'primary', () => { window.main_IPC.dispatchNotes(CKey) }))
		btnNode.appendChild(this.#buttonMaker('check_save', 'primary', () => { window.main_IPC.dispatchSave(CKey) }))
	}

	// MARK: addMod
	async #addMod(thisMod, overBadges = null) {
		const mod = {
			filters : new Set(thisMod?.displayBadges?.map?.((x) => x.name) || []),
			node    : document.createElement('tr'),
			scroll  : document.createElement('scroller-item'),
			search  : {
				find_author  : DATA.escapeSpecial(thisMod.modDesc.author).toLowerCase(),
				find_name    : thisMod.fileDetail.shortName.toLowerCase(),
				find_title   : DATA.escapeSpecial(thisMod.l10n.title).toLowerCase(),
				find_version : DATA.escapeSpecial(thisMod.modDesc.version).toLowerCase(),
			},
		}
		mod.search.find_all = Object.values(mod.search).join(' ')

		mod.scroll.id  = `${thisMod.colUUID}--scroller`

		mod.node.classList.add(...[
			'mod-row',
			'border-bottom',
			this.extSites[thisMod.fileDetail.shortName] ? 'has-ext-site' : null,
			thisMod.modHub.id ? 'has-hash' : null,
			...( thisMod.canNotUse === true || this.flag.currentVersion !== thisMod.gameVersion ) ?
				['mod-disabled', 'bg-secondary-subtle', 'bg-opacity-25'] :
				[]
		].filter((x) => x !== null))
	
		mod.node.id = thisMod.colUUID
		mod.node.setAttribute('draggable', true)
	
		mod.node.addEventListener('contextmenu', () => { this.modContext(thisMod.colUUID) })
		mod.node.addEventListener('dragstart',   (e) => { this.modDrag(e, thisMod.colUUID) })
		mod.node.addEventListener('click',       (e) => { this.modClick(e, thisMod.colUUID) })

		if ( ! thisMod.badgeArray.includes('notmod') && ! thisMod.badgeArray.includes('savegame') ) {
			mod.node.addEventListener('dblclick',  () => {
				if ( thisMod.badgeArray.includes('log') ) {
					window.main_IPC.dispatchLog(thisMod.fileDetail.fullPath)
				} else {
					window.main_IPC.dispatchDetail(thisMod.colUUID)
				}
			})
		}

		mod.node.appendChild(DATA.templateEngine('item_mod', {
			author     : DATA.escapeSpecial(thisMod.modDesc.author),
			fileSize   : ( thisMod.fileDetail.fileSize > 0 ) ? await DATA.bytesToHR(thisMod.fileDetail.fileSize) : '',
			folderIcon : thisMod.badgeArray.includes('folder') ? '<i class="bi bi-folder2-open mod-folder-overlay"></i>' : '',
			iconImage  : `<img alt="" class="img-fluid" src="${DATA.iconMaker(thisMod.modDesc.iconImageCache)}">`,
			shortname  : thisMod.fileDetail.shortName,
			title      : DATA.escapeSpecial(thisMod.l10n.title),
			version    : DATA.escapeSpecial(thisMod.modDesc.version),
		}))

		const badgeContain = mod.node.querySelector('.issue_badges')

		if ( overBadges !== null ) {
			badgeContain.innerHTML = overBadges
		} else {
			for ( const badge of thisMod?.displayBadges?.filter?.((x) => x.name !== `fs${this.flag.currentVersion}`) || [] ) {
				badgeContain.appendChild(I18N.buildBadgeMod(badge))
			}
		}

		return mod
	}

	// MARK: col actions
	colToggle(id, stayOpen = false) {
		this.track.lastID    = null
		this.track.lastIndex = null
		this.track.altClick  = null

		for ( const selected of this.track.selected ) {
			this.modToggle(selected, false)
		}

		if ( this.track.openCollection !== null ) {
			this.collections[this.track.openCollection].modNode.classList.add('d-none')
		}

		if ( this.track.openCollection === id && !stayOpen ) {
			this.forceSelectOnly(false)
			this.track.openCollection = null
		} else {
			this.track.openCollection = id
			this.collections[id].modNode.classList.remove('d-none')
		}
		this.doDisplay()
	}

	colScroll(id) {
		const top = MA.byId(id)?.offsetTop ?? 0
		MA.byId('mod-collections').parentElement.scrollTo({top : top, behavior : 'instant'})
	}

	colContext(id) { window.main_IPC.contextCol(id) }


	// MARK: mod actions
	modContext(id) {
		window.main_IPC.contextMod(id, [...this.track.selected])
	}

	modClick(e, id) {
		if ( e.altKey ) {
			this.track.altClick = id
			this.doSideBar()
			return
		}

		this.track.altClick = null

		const thisRow   = e.target.closest('.mod-row')
		const theTable  = thisRow.closest('table')
		const thisIndex = [...theTable.children].indexOf(thisRow)

		if ( !e.shiftKey || this.track.lastIndex === null || thisIndex === this.track.lastIndex ) {
			this.track.lastIndex = thisIndex
			this.track.lastID    = id
			this.modToggle(id)
			this.doSideBar()
			return
		}

		const shiftOn     = this.track.selected.has(this.track.lastID)
		const index_start = Math.min(thisIndex, this.track.lastIndex)
		const index_end   = Math.max(thisIndex, this.track.lastIndex)

		for ( let i = index_start; i <= index_end; i++ ) {
			this.modToggle(theTable.children[i].id, shiftOn)
		}

		this.track.lastIndex = thisIndex
		this.track.lastID    = id
		this.doSideBar()
	}

	modToggle(id, force = null) {
		let doAdd = !this.track.selected.has(id)

		if ( force === false ) {
			doAdd = false
		} else if ( force === true ) {
			doAdd = true
		}

		if ( doAdd ) {
			this.track.selected.add(id)
			MA.safeClsAdd(id, this.selectClass)
			MA.safeClsAdd(`${id}--scroller`, 'bg-success')
		} else {
			this.track.selected.delete(id)
			MA.safeClsRem(id, this.selectClass)
			MA.safeClsRem(`${id}--scroller`, 'bg-success')
		}
		
	}

	modDrag(e, id) {
		e.preventDefault()
		e.stopPropagation()

		if ( this.dragDrop.flags.preventRun ) { return }
		window.main_IPC.drag.out(id)
	}

	// MARK: safe refresh
	refreshSelected() {
		for ( const element of MA.query(`.mod-row.${this.selectClass}`) ) {
			element.classList.remove(this.selectClass)
		}
		for ( const element of MA.query('scroller-item.bg-success') ) {
			element.classList.remove('bg-success')
		}

		for ( const id of this.track.selected ) {
			if ( !id.startsWith(this.track.openCollection) ) {
				this.track.selected.delete(id)
			} else {
				MA.safeClsAdd(id, this.selectClass)
				MA.safeClsAdd(`${id}--scroller`, 'bg-success')
			}
		}
		this.select.count()
	}

	// MARK: selection toggles
	forceSelectOnly(nv = true) {
		MA.byId('modFilter_selected').checked = nv
		this.track.selectedOnly = nv
	}

	toggleSelectOnly() {
		this.track.selectedOnly = MA.byIdCheck('modFilter_selected')
		this.doDisplay()
	}

	changeSort() {
		this.track.sortOrder = MA.byIdValue('modSortOrder')
		this.doDisplay()
	}

	startFile(mode) {
		this.files.start(mode, this.track.selected, this.track.altClick)
	}

	// MARK: filters
	filter = {
		build : () => {
			MA.byIdText('tag_filter_full_count', this.track.filter_must.size + this.track.filter_not.size)
			const dropNode = document.createDocumentFragment()
			const textNode = document.createElement('i18n-text')
			textNode.classList.add('text-center', 'd-block', 'pb-1')
			textNode.setAttribute('data-key', 'filter_tag_title')

			dropNode.appendChild(textNode)

			const allTags = []
			for ( const tag of [...this.searchTagList].filter((x) => x !== `fs${this.flag.currentVersion}`).sort() ) {
				allTags.push(this.filter.buildTag(tag.toLowerCase()))
			}

			const halfMark = Math.ceil(allTags.length / 2)

			for ( let i = 0; i < halfMark; i++ ) {
				const tagNode = document.createElement('div')
				tagNode.classList.add('row', 'filter-row', 'border-top', 'mt-0', 'py-0', 'mx-0')
				tagNode.appendChild(allTags[i])
				if ( typeof allTags[i+halfMark] !== 'undefined') {
					tagNode.appendChild(allTags[i+halfMark])
				}
				dropNode.appendChild(tagNode)
			}

			const resetNode = document.createElement('i18n-text')
			resetNode.classList.add('btn', 'btn-primary', 'btn-sm', 'w-75', 'mx-auto', 'd-block', 'my-2')
			resetNode.setAttribute('data-key', 'filter_tag_reset')
			resetNode.addEventListener('click', () => {
				this.track.filter_must.clear()
				this.track.filter_not.clear()
				this.doDisplay()
			})
			dropNode.appendChild(resetNode)

			MA.byIdHTML('filter_new_style', '')
			MA.byId('filter_new_style').appendChild(dropNode)
		},
		buildTag : (tag) => {
			const must    = this.track.filter_must.has(tag)
			const mustNot = this.track.filter_not.has(tag)
			const may     = !must && !mustNot
			
			const tagNode    = document.createDocumentFragment()
			const tagNodeTag = document.createElement('div')
			tagNodeTag.classList.add('col-3', 'text-center', 'py-1')
			tagNodeTag.appendChild(I18N.buildBadgeMod({name : tag, class : []}))
			tagNode.appendChild(tagNodeTag)

			const tagNodeBtn = document.createElement('div')
			tagNodeBtn.classList.add('col-3', 'py-1')
			tagNodeBtn.innerHTML = [
				`<input type="radio" class="btn-check" name="tag_filters__${tag}" id="tag_filters__${tag}__may" value="may" autocomplete="off" ${may ? 'checked' : ''}>`,
				`<label for="tag_filters__${tag}__may" class="btn btn-sm btn-outline-success rounded-0 rounded-start"><i18n-text data-key="tag_filter__show"></i18n-text></label>`,
				`<input type="radio" class="btn-check" name="tag_filters__${tag}" id="tag_filters__${tag}__not" value="not" autocomplete="off" ${mustNot ? 'checked' : ''}>`,
				`<label for="tag_filters__${tag}__not" class="btn btn-sm btn-outline-warning rounded-0"><i18n-text data-key="tag_filter__hide"></i18n-text></label>`,
				`<input type="radio" class="btn-check" name="tag_filters__${tag}" id="tag_filters__${tag}__must" value="must" autocomplete="off" ${must ? 'checked' : ''}>`,
				`<label for="tag_filters__${tag}__must" class="btn btn-sm btn-outline-danger rounded-0 rounded-end"><i18n-text data-key="tag_filter__exclusive"></i18n-text></label>`,
			].join('')
			for ( const element of tagNodeBtn.querySelectorAll('input') ) {
				element.addEventListener('change', (e) => {
					const value = e.target.value
					if ( value === 'may' ) {
						this.track.filter_must.delete(tag)
						this.track.filter_not.delete(tag)
					} else if ( value === 'must') {
						this.track.filter_must.add(tag)
						this.track.filter_not.delete(tag)
					} else {
						this.track.filter_must.delete(tag)
						this.track.filter_not.add(tag)
					}
					this.doDisplay()
				})
			}
			tagNode.appendChild(tagNodeBtn)

			return tagNode
		},

		findClear : () => {
			MA.byIdValue('filter_input', '')
			this.track.searchString = ''
			this.doDisplay()
		},
		findForce : (text) => {
			MA.byIdValue('filter_input', text)
			this.filter.findTerm()
		},
		findTerm : () => {
			const newValue = MA.byIdValueLC('filter_input')
			const needsUpdate = this.track.searchString.length >= 2 ||
				(this.track.searchString.length <= 2 && newValue.length >= 2)
	
			this.track.searchString = MA.byIdValueLC('filter_input')
			MA.byId('filter_clear').clsHide(this.track.searchString.length === 0)
	
			if ( needsUpdate ) { this.doDisplay() }
		},
		findType : () => {
			this.track.searchType = MA.byIdValue('modFindType')
			this.doDisplay()
		},
	}

	select = {
		all : () => {
			if ( this.track.openCollection === null ) { return }

			const CKey = this.track.openCollection

			for ( const MKey of Object.keys(this.mods[CKey]) ) {
				this.track.selected.add(`${CKey}--${MKey}`)
			}
			this.refreshSelected()
		},
		count : () => {
			MA.byIdText('select_quantity', this.track.selected.size)
		},
		invert : () => {
			if ( this.track.openCollection === null ) { return }

			const CKey    = this.track.openCollection
			const allMods = new Set(Object.keys(this.mods[CKey]).map((MKey) => `${CKey}--${MKey}`))

			this.track.selected = allMods.difference(this.track.selected)
			this.refreshSelected()
		},
		none : () => {
			this.track.selected.clear()
			this.refreshSelected()
		},
	}

	// MARK: collect order
	order = {
		next : (key) => {
			const thisIndex = this.orderMap.keyToNum[key]

			if ( typeof thisIndex === 'undefined' ) { return null }

			for ( let i = thisIndex + 1; i <= this.orderMap.max; i++ ) {
				if ( typeof this.orderMap.numToKey[i] !== 'undefined' ) { return i }
			}
			return null
		},
		prev : (key) => {
			const thisIndex = this.orderMap.keyToNum[key]

			if ( typeof thisIndex === 'undefined' ) { return null }

			for ( let i = thisIndex - 1; i >= 0; i-- ) {
				if ( typeof this.orderMap.numToKey[i] !== 'undefined' ) { return i }
			}
			return null
		},
		set : (CKey, moveUp, forceLast = false) => {
			const curIndex = this.orderMap.keyToNum[CKey]
			const newIndex = forceLast ?
				moveUp ? 0 : this.orderMap.max :
				moveUp ? this.order.prev(CKey) : this.order.next(CKey)

			if ( curIndex !== null && newIndex !== null ) {
				this.track.scrollPosition = MA.byId('mod-collections').offsetParent.scrollTop
				window.main_IPC.folder.set(curIndex, newIndex)
			}
		},
	}

	// MARK: actions
	action = {
		collectActive : async () => {
			const activePick = MA.byIdValue('collectionSelect').replace('collection--', '')
		
			if ( activePick !== '0' && activePick !== '999' ) {
				LEDLib.blinkLED()
				
				return window.main_IPC.folder.active(activePick).then((result) => {
					if ( this.flag.gameRunning ) {
						window.l18n.get('game_running_warning').then((entry) => {
							alert(entry.entry)
						})
					}
					return result
				})
				
			}
		},
		collectInActive : async () => {
			MA.byIdValue('collectionSelect', 0)
			return window.main_IPC.folder.active(null)
		},
		launchGame() {
			const currentList = MA.byIdValue('collectionSelect')
			if ( currentList === window.state.flag.activeCollect ) {
				// Selected is active, no confirm
				LEDLib.spinLED()
				window.main_IPC.dispatch('game')
			} else {
				// Different, ask confirmation
				MA.byIdHTML('no_match_game_list', window.state.mapCollectionDropdown.get(window.state.flag.activeCollect))
				MA.byIdHTML('no_match_ma_list', window.state.mapCollectionDropdown.get(currentList))
				LEDLib.fastBlinkLED()
				window.state.modal.mismatch.show()
			}
		},
		launchGame_FIX : () => {
			window.state.modal.mismatch.hide()
			window.state.action.collectActive().then(() => {
				window.main_IPC.dispatch('game')
			})
		},
		launchGame_IGNORE : () => {
			window.state.modal.mismatch.hide()
			LEDLib.spinLED()
			MA.byIdValue('collectionSelect', window.state.flag.activeCollect)
			window.main_IPC.dispatch('game')
		},
		openModInfo : (mod) => {
			window.settings.site(mod.fileDetail.shortName, false).then((value) => {
				MA.byIdHTML('mod_info_mod_name', mod.fileDetail.shortName)
				MA.byIdValue('mod_info_input', value)
				this.modal.modInfo.show()
			})
		},
		setModInfo : () => {
			window.settings.site(
				MA.byIdHTML('mod_info_mod_name'),
				MA.byIdValue('mod_info_input')
			)
			this.modal.modInfo.hide()
		},
	}
}

// MARK: SUB MODULES



// MARK: LEDLib
const LEDLib = {
	ledUSB : { filters : [{ vendorId : MA.led.vendor, productId : MA.led.product }] },

	blinkLED     : async () => { LEDLib.operateLED('blink') },
	fastBlinkLED : async () => { LEDLib.operateLED('blink', 1000) },
	spinLED      : async () => { LEDLib.operateLED('spin') },

	operateLED   : async (type = 'spin', time = 2500) => {
		if ( ! await window.settings.get('led_active') ) {
			window.log.debug('LED is not active')
			return
		}
		
		try {
			const clientLED = await navigator.hid.requestDevice(LEDLib.ledUSB)

			if ( clientLED.length === 0 ) { return }

			const clientLEDDevice = clientLED[0]

			await clientLEDDevice.open()
			await clientLEDDevice.sendReport(0x00, MA.led[type])
			setTimeout(async () => {
				await clientLEDDevice.sendReport(0x00, MA.led.off)
				await clientLEDDevice.close()
			}, time)
		} catch (err) {
			window.log.debug('Unable to spin LED (no light?)', err.message)
		}
	},
}

// MARK: PrefLib
class PrefLib {

	currentDev = null
	overlay    = null

	buttons = {
		changelog : {
			callback : () => { window.main_IPC.dispatch('changelog') },
			icon     : 'check2-circle',
		},
		reset_window : {
			callback : () => { window.settings.winReset() },
			icon     : 'check2-circle',
		},
		wizard : {
			callback : () => { window.main_IPC.dispatch('wizard') },
			icon     : 'check2-circle',
		},
	}

	inputs = {
		led : {
			set    : (input) => { this.#processCheck('led_active', input, true) },
			update : (input) => { this.#processCheck('led_active', input, false) },
		},
		poll_game : {
			set    : (input) => { this.#processCheck('poll_game', input, true) },
			update : (input) => { this.#processCheck('poll_game', input, false) },
		},
		show_tooltips : {
			set    : (input) => { this.#processCheck('show_tooltips', input, true) },
			update : (input) => { this.#processCheck('show_tooltips', input, false) },
		},
		use_one_drive : {
			set    : (input) => { this.#processCheck('use_one_drive', input, true) },
			update : (input) => { this.#processCheck('use_one_drive', input, false) },
		},
	}

	#processCheck(key, input, setValue = false) {
		if ( !setValue ) {
			window.settings.get(key).then((value) => {
				input.checked = value
			})
		} else {
			window.settings.set(key, input.checked).then((value) => {
				input.checked = value
			})
		}
	}

	update = []

	constructor () {
		this.overlay = new bootstrap.Offcanvas('#prefcanvas')
		MA.byId('prefcanvas').addEventListener('hide.bs.offcanvas', () => {
			window.state.dragDrop.flags.preventRun = false
		})
		MA.byId('prefcanvas').addEventListener('show.bs.offcanvas', () => {
			MA.byId('prefcanvas').querySelector('.offcanvas-body').scrollTop = 0
			window.state.dragDrop.flags.preventRun = true
		})
		MA.byId('prefs--close-btn').addEventListener('click', () => {
			this.overlay.hide()
		})
		window.settings.receive('settings:invalidate', () => { this.forceUpdate() })
		this.init()
	}

	init() {
		for ( const element of MA.byId('prefcanvas').querySelectorAll('page-replace')) {
			const replaceType = element.safeAttribute('data-type')
			const replaceKey  = element.safeAttribute('data-name')
			const replaceExt  = element.safeAttribute('data-extra')
	
			switch ( replaceType ) {
				case 'version-input' :
					element.replaceWith(this.#doVersion(replaceKey))
					break
				case 'button-input':
					element.replaceWith(this.#doButton(replaceKey))
					break
				case 'special-input' :
					element.replaceWith(this.#doSpecial(replaceKey))
					break
				case 'switch-input':
					element.replaceWith(this.#doSwitch(replaceKey, replaceExt || 3))
					break
				default :
					break
			}
		}
	}

	forceUpdate() {
		for ( const update of this.update ) {
			update()
		}
	}

	open() {
		this.forceUpdate()
		this.overlay.show()
	}

	#doButton(key) {
		const node = document.createElement('div')
		node.innerHTML = [
			`<i18n-text class="inset-block-header" data-key="user_pref_title_${key}"></i18n-text>`,
			'<div class="row">',
			`<i18n-text class="inset-block-blurb-option col-9" data-key="user_pref_blurb_${key}"></i18n-text>`,
			`<div class="btn btn-primary btn-sm col-3 align-self-start"><i class="bi-${this.buttons[key].icon}"></i></div>`,
			'</div>'
		].join('')
		node.querySelector('.btn').addEventListener('click', this.buttons[key].callback)

		return node
	}

	#doSwitch(key, size = 3) {
		const node = document.createElement('div')
		node.innerHTML = [
			`<i18n-text class="inset-block-header" data-key="user_pref_title_${key}"></i18n-text>`,
			'<div class="row">',
			`<i18n-text class="inset-block-blurb-option col-${12-size}" data-key="user_pref_blurb_${key}"></i18n-text>`,
			`<div class="col-${size} form-switch custom-switch">`,
			'<input class="form-check-input" type="checkbox" role="switch">',
			'</div></div>',
		].join('')
		const input = node.querySelector('input')
		input.addEventListener('change', () => { this.inputs[key].set(input) })
		this.update.push(() => { this.inputs[key].update(input) })
		return node
	}

	#doSpecial(key) {
		const node = document.createElement('div')
		switch (key) {
			case 'font_size' : {
				node.innerHTML = [
					'<i18n-text class="inset-block-header" data-key="user_pref_title_font_size"></i18n-text>',
					'<div class="row">',
					'<i18n-text class="inset-block-blurb-option col-10" data-key="user_pref_blurb_font_size"></i18n-text>',
					'<div class="col-2 text-center small text-body-emphasis" id="pref--font_size_value">XX</div>',
					'<div class="col-12 mt-2">',
					'<input id="pref--font_size_input" type="range" class="form-range" min="70" max="150" step="1" >',
					'<div class="p-0" style="margin-top: -0.95rem"><i style="margin-left: calc(38% - 0.5rem)" class="text-body-tertiary bi-caret-up"></i></div>',
					'</div><div class="col-10 offset-1 mt-2">',
					'<i18n-text id="pref--font_size_reset" class="d-block btn btn-outline-primary btn-sm w-100 mx-auto" data-key="user_pref_font_size_default"></i18n-text>',
					'</div></div>',
				].join('')

				const font_size_number = node.querySelector('#pref--font_size_value')
				const font_size_slider = node.querySelector('#pref--font_size_input')
				const font_size_reset  = node.querySelector('#pref--font_size_reset')

				font_size_reset.addEventListener('click', () => {
					window.settings.set('font_size', 14).then((value) => {
						const percent = (value / 100) * 14
						font_size_slider.value       = value
						font_size_number.textContent = `${percent}%`
					})
				})
				font_size_slider.addEventListener('input', () => {
					font_size_number.textContent = `${Math.floor(font_size_slider.value)}%`
				})
				font_size_slider.addEventListener('change', () => {
					const numberValue = (font_size_slider.value / 100) * 14
					window.settings.set('font_size', numberValue).then((value) => {
						const percent = (value / 14) * 100
						font_size_slider.value       = value
						font_size_number.textContent = `${Math.floor(percent)}%`
					})
				})

				const font_size_update = () => {
					window.settings.get('font_size').then((value) => {
						const percent = (value / 14) * 100
						font_size_slider.value       = percent
						font_size_number.textContent = `${Math.floor(percent)}%`
					})
				}
				
				window?.operations?.receive('win:updateFontSize', font_size_update)

				this.update.push(font_size_update)
				break
			}
			case 'theme_color' : {
				node.innerHTML = [
					'<i18n-text class="inset-block-header" data-key="user_pref_title_theme_color"></i18n-text>',
					'<i18n-text class="inset-block-blurb-option" data-key="user_pref_blurb_theme_color"></i18n-text>',
					'<select class="form-select mt-3 px-4" name="theme_select" id="theme_select"></select>',
				].join('')

				const theme_select = node.querySelector('select')
				
				theme_select.addEventListener('change', () => {
					window.settings.themeChange(theme_select.value)
				})

				const theme_update = () => {
					window.settings.themeList().then((values) => {
						theme_select.innerHTML = ''
						for ( const value of values ) {
							const opt = document.createElement('option')
							opt.value = value[0]
							opt.textContent = value[1]
							theme_select.appendChild(opt)
						}
						window.settings.get('color_theme').then((value) => {
							theme_select.value = value
						})
					})
				}

				this.update.push(theme_update)
				window?.operations?.receive('win:updateTheme', theme_update)
				break
			}
			case 'lang' : {
				node.innerHTML = [
					'<i18n-text class="inset-block-header" data-key="user_pref_title_lang"></i18n-text>',
					'<i18n-text class="inset-block-blurb-option" data-key="user_pref_blurb_lang"></i18n-text>',
					'<select class="form-select mt-3 px-4" name="language_select" id="language_select"></select>',
					'<div class="row mt-2">',
					'<i18n-text class="inset-block-blurb-option col-9 fst-italic" data-key="user_pref_blurb2_lang"></i18n-text>',
					'<div class="col-3 form-check form-switch custom-switch">',
					'<input id="uPref_lock_lang" class="form-check-input" type="checkbox" role="switch">',
					'</div></div>'
				].join('')

				const lang_lock   = node.querySelector('input')
				const lang_select = node.querySelector('select')

				lang_lock.addEventListener('change', () => {
					window.settings.set('lang_lock', lang_lock.checked).then((value) => {
						lang_lock.checked = value
					})
				})
				lang_select.addEventListener('change', () => {
					window.i18n.lang(lang_select.value).then((value) => {
						lang_select.value = value
					})
				})

				const lang_update = () => {
					window.i18n.list().then((values) => {
						lang_select.innerHTML = ''
						for ( const value of values ) {
							const opt = document.createElement('option')
							opt.value = value[0]
							opt.textContent = value[1]
							lang_select.appendChild(opt)
						}
						window.i18n.lang().then((value) => {
							lang_select.value = value
						})
					})
					window.settings.get('lang_lock').then((value) => {
						lang_lock.checked = value
					})
					window.state.updateI18NDrops()
				}

				this.update.push(lang_update)
				window?.i18n?.receive('i18n:refresh', lang_update)
				break
			}
			case 'use_discord' : {
				node.innerHTML = [
					'<i18n-text class="inset-block-header" data-key="user_pref_title_use_discord"></i18n-text>',
					'<div class="row gy-2">',
					'<i18n-text class="inset-block-blurb-option col-10" data-key="user_pref_blurb_use_discord"></i18n-text>',
					'<div class="form-check form-switch custom-switch col-2">',
					'<input id="pref--use-discord-check" class="form-check-input" type="checkbox" role="switch">',
					'</div>',
					'<i18n-text class="col-6" data-key="user_pref_setting_discord_2"></i18n-text>',
					'<div class="col-6 px-0"><input type="text" class="form-control" id="pref--use-discord-c2" style="font-size: 70%"></div>',
					'<i18n-text class="col-6" data-key="user_pref_setting_discord_1"></i18n-text>',
					'<div class="col-6 px-0"><input type="text" class="form-control" id="pref--use-discord-c1" style="font-size: 70%"></div>',
					'</div>',
				].join('')
				const discord_check = node.querySelector('#pref--use-discord-check')
				const discord_text_1 = node.querySelector('#pref--use-discord-c1')
				const discord_text_2 = node.querySelector('#pref--use-discord-c2')

				discord_check.addEventListener('change', () => {
					window.settings.set('use_discord', discord_check.checked).then((value) => {
						discord_check.checked = value
					})
				})

				discord_text_1.addEventListener('change', () => {
					window.settings.set('use_discord_c1', discord_text_1.value).then((value) => {
						discord_text_1.value = value
					})
				})

				discord_text_2.addEventListener('change', () => {
					window.settings.set('use_discord_c2', discord_text_2.value).then((value) => {
						discord_text_2.value = value
					})
				})

				this.update.push(() => {
					window.settings.get('use_discord').then((value) => {
						discord_check.checked = value
					})
					window.settings.get('use_discord_c1').then((value) => {
						discord_text_1.value = value
					})
					window.settings.get('use_discord_c2').then((value) => {
						discord_text_2.value = value
					})
				})
				break
			}
			case 'cache_manage' :
				node.innerHTML = [
					'<i18n-text class="inset-block-header" data-key="user_pref_title_clean_cache"></i18n-text>',
					'<i18n-text class="inset-block-blurb-option" data-key="user_pref_blurb_clean_cache"></i18n-text>',
					'<i18n-text class="inset-block-blurb-option text-body-emphasis py-1" data-key="clean_cache_size" id="clean_cache_size"></i18n-text>',
					'<i18n-text class="inset-block-blurb-option text-body-emphasis py-1" data-key="clean_detail_cache_size" id="clean_detail_cache_size"></i18n-text>',
					'<i18n-text class="d-block btn btn-success btn-sm w-75 mt-2 mx-auto mb-3" id="pref--cache-clean-btn" data-key="user_pref_button_clean_cache"></i18n-text>',
					'<i18n-text class="d-block btn btn-warning btn-sm w-75 mt-2 mx-auto mb-3" id="pref--cache-clean-detail-btn" data-key="user_pref_button_clear_detail_cache"></i18n-text>',
					'<i18n-text class="inset-block-blurb-option" data-key="user_pref_blurb_clear_cache"></i18n-text>',
					'<i18n-text class="d-block btn btn-danger btn-sm w-75 mt-2 mx-auto" id="pref--cache-clear-btn" data-key="user_pref_button_clear_cache"></i18n-text>',
					'<i18n-text class="inset-block-blurb-option mt-2" data-key="user_pref_blurb_clear_malware"></i18n-text>',
					'<i18n-text class="inset-block-blurb-option mt-2 text-body-emphasis py-1 fst-italic mx-3" data-key="clear_malware_size" id="clear_malware_size"></i18n-text>',
					'<i18n-text class="d-block btn btn-warning btn-sm w-75 mt-2 mx-auto" id="pref--cache-malware-btn" data-key="user_pref_button_clear_malware"></i18n-text>',
				].join('')

				this.update.push(() => {
					MA.byId('clear_malware_size').setAttribute('refresh', 'true')
					MA.byId('clean_cache_size').setAttribute('refresh', 'true')
					MA.byId('clean_detail_cache_size').setAttribute('refresh', 'true')
				})

				node.querySelector('#pref--cache-clean-btn').addEventListener('click', () => {
					window.main_IPC.cache.clean()
				})
				node.querySelector('#pref--cache-clean-detail-btn').addEventListener('click', () => {
					window.main_IPC.cache.detail()
				})
				node.querySelector('#pref--cache-clear-btn').addEventListener('click', () => {
					window.main_IPC.cache.clear()
				})
				node.querySelector('#pref--cache-malware-btn').addEventListener('click', () => {
					window.main_IPC.cache.malware()
				})
				break
			default :
				break
		}

		return node
	}

	#doVersion(ver) {
		const node = document.createElement('div')
		node.classList.add('col-12', 'inset-block')
		node.innerHTML = [
			'<div>',
			`<div class="inset-block-header"><i18n-text data-key="game_title_farming_simulator"></i18n-text> 20${ver}</div>`,
			'<div class="row">',

			'<div class="col-12 mt-3 inset-block"><div>',
			'<i18n-text class="inset-block-header" data-key="user_pref_title_game_settings"></i18n-text>',
			'<div class="input-group ">',
			`<input type="text" class="form-control" id="pref--${ver}-game-settings" readonly style="font-size: 70%">`,
			`<button class="btn btn-outline-secondary" id="pref--${ver}-game-settings-btn" type="button"><i class="bi bi-folder"></i></button>`,
			'</div>',
			'<i18n-text class="inset-block-subtext" data-key="user_pref_blurb_game_settings"></i18n-text>',
			'</div></div>',

			'<div class="col-12 mt-3 inset-block"><div>',
			'<i18n-text class="inset-block-header" data-key="user_pref_title_game_path"></i18n-text>',
			'<div class="input-group ">',
			`<input type="text" class="form-control" id="pref--${ver}-game-path" readonly style="font-size: 70%">`,
			`<button class="btn btn-outline-secondary" id="pref--${ver}-game-path-btn" type="button"><i class="bi bi-folder"></i></button>`,
			'</div>',
			'<i18n-text class="inset-block-subtext" data-key="user_pref_blurb_game_path"></i18n-text>',
			'</div></div>',

			'<div class="col-12 mt-3 inset-block"><div>',
			'<i18n-text class="inset-block-header" data-key="user_pref_setting_game_args"></i18n-text>',
			`<input type="text" class="form-control" id="pref--${ver}-game-args" style="font-size: 70%">`,
			'<i18n-text class="inset-block-subtext" data-key="user_pref_setting_game_args_example"></i18n-text>',
			'</div></div>',

			'<div class="col-12"><div class="row">',

			'<div class="col-6 mt-3 inset-block"><div>',
			'<i18n-text class="inset-block-header" data-key="user_pref_title_game_enabled"></i18n-text>',
			'<div class="row">',
			'<i18n-text class="inset-block-blurb-option col-10 align-self-center" data-key="user_pref_blurb_game_enabled"></i18n-text>',
			'<div class="form-check form-switch custom-switch col-2">',
			`<input id="pref--${ver}-game-enabled" class="form-check-input" type="checkbox" role="switch">`,
			'</div></div></div></div>',

			'<div class="col-6 mt-3 inset-block"><div>',
			'<i18n-text class="inset-block-header" data-key="user_pref_title_dev"></i18n-text>',
			'<div class="row">',
			'<i18n-text class="inset-block-blurb-option col-10 align-self-center" data-key="user_pref_blurb_dev"></i18n-text>',
			'<div class="form-check form-switch custom-switch col-2">',
			`<input id="pref--${ver}-dev-mode" class="form-check-input" type="checkbox" role="switch">`,
			'</div></div></div></div>',
			'</div></div>',

			'</div>',
			'</div>'
		].join('')

		const button_game_path = node.querySelector(`#pref--${ver}-game-path-btn`)
		const button_set_path  = node.querySelector(`#pref--${ver}-game-settings-btn`)
		const value_game_path  = node.querySelector(`#pref--${ver}-game-path`)
		const value_set_path   = node.querySelector(`#pref--${ver}-game-settings`)
		const value_args       = node.querySelector(`#pref--${ver}-game-args`)
		const switch_dev_mode  = node.querySelector(`#pref--${ver}-dev-mode`)
		const switch_enabled   = node.querySelector(`#pref--${ver}-game-enabled`)

		const updater = () => {
			window.settings.dev().then((dev) => {
				this.currentDev = dev

				window.settings.get(`game_settings_${ver}`).then((value) => {
					value_set_path.value = value
				})
				window.settings.get(`game_path_${ver}`).then((value) => {
					value_game_path.value = value
				})
				window.settings.get(`game_args_${ver}`).then((value) => {
					value_args.value = value
				})
				window.settings.get(`game_enabled_${ver}`).then((value) => {
					switch_enabled.checked = value
				})
				switch_dev_mode.checked = this.currentDev[ver]
			})
		}

		button_game_path.addEventListener('click', () => {
			window.settings.setGamePath(ver)
		})

		button_set_path.addEventListener('click', () => {
			window.settings.setPrefFile(ver)
		})

		value_args.addEventListener('change', () => {
			window.settings.set(`game_args_${ver}`, value_args.value).then((value) => {
				value_args.value = value
			})
		})

		switch_dev_mode.addEventListener('change', () => {
			window.settings.set(`dev_mode_${ver}`, switch_dev_mode.checked).then(() => {
				window.settings.dev().then((value) => {
					this.currentDev = value
					switch_dev_mode.checked = this.currentDev[ver]
				})
			})
		})

		switch_enabled.addEventListener('change', () => {
			window.settings.set(`game_enabled_${ver}`, switch_enabled.checked).then((value) => {
				switch_enabled.checked = value
			})
		})


		this.update.push(updater)
		return node

	}
}

// MARK: DragDropLib
class DragDropLib {
	flags = {
		isFolder   : false,
		isRunning  : false,
		preventRun : false,
	}

	feedback = {
		backdrop         : null,
		file             : null,
		folder           : null,
		icon_csv_file    : null,
		icon_normal_file : null,
		text_csv_file    : null,
		text_normal_file : null,
	}

	constructor() {
		/*
		drag	...a dragged item (element or text selection) is dragged.
		dragend	...a drag operation ends
		dragenter	...a dragged item enters a valid drop target.
		dragleave	...a dragged item leaves a valid drop target.
		dragover	...a dragged item is being dragged over a valid drop target, every few hundred milliseconds.
		dragstart	...the user starts dragging an item.
		drop	...an item is dropped on a valid drop target.
		*/

		const dragTarget = MA.byId('drag_target')
		dragTarget.addEventListener('dragenter', (e) => { this.dragEnter(e) } )
		dragTarget.addEventListener('dragleave', (e) => { this.dragLeave(e) } )
		dragTarget.addEventListener('dragover',  (e) => { this.dragOver(e) } )
		dragTarget.addEventListener('drop',      (e) => { this.dragDrop(e) } )

		this.feedback.backdrop         = MA.byId('drag_back')
		this.feedback.file             = MA.byId('drag_add_file')
		this.feedback.folder           = MA.byId('drag_add_folder')
		this.feedback.text_csv_file    = MA.byId('csv-yes-text')
		this.feedback.text_normal_file = MA.byId('csv-no-text')
		this.feedback.icon_csv_file    = MA.byId('csv-yes')
		this.feedback.icon_normal_file = MA.byId('csv-no')
		
	}

	resetArea(area) {
		area.classList.remove('d-none', 'bg-primary')
	}

	csvTrueSwitch(isCSV) {
		this.feedback.text_csv_file.clsShow(isCSV)
		this.feedback.text_normal_file.clsHide(isCSV)
		this.feedback.icon_csv_file.clsShow(isCSV)
		this.feedback.icon_normal_file.clsHide(isCSV)
	}

	dragDrop (e) {
		e.preventDefault()
		e.stopPropagation()
	
		if ( window.state.files.flags.isRunning ) { return }
		if ( this.flags.preventRun ) { return }
		
		this.flags.isRunning = false
	
		this.feedback.backdrop.clsHide()
		this.resetArea(this.feedback.file)
		this.resetArea(this.feedback.folder)
	
		const dt    = e.dataTransfer
		const files = dt.files

		if ( this.flags.isFolder ) {
			window.main_IPC.folder.drop(files[0])
		} else {
			window.main_IPC.files.drop(files).then((result) => {
				if ( typeof result !== 'undefined' ) {
					window.state.files.start_external('import', result)
				}
			})
		}
	
		this.flags.isFolder = false
	}

	dragEnter (e) {
		e.preventDefault()
		e.stopPropagation()
	
		if ( window.state.files.flags.isRunning ) { return }
		if ( this.flags.preventRun ) { return }

		if ( !this.flags.isRunning ) {
			this.feedback.backdrop.clsShow()
		
			const isCSV = e.dataTransfer.items[0].type === 'text/csv'
	
			this.csvTrueSwitch(isCSV)
	
			if ( e.dataTransfer.items.length > 1 || e.dataTransfer.items[0].type !== '' ) {
				// multiple or non-empty type
				this.feedback.folder.clsHide()
			}
	
		} else {
			let   thisID    = e.target.id
			const thePath   = e.composedPath()
	
			if ( thisID !== 'drag_add_folder' && thisID !== 'drag_add_file' ) {
				if ( thePath.includes(this.feedback.folder) ) { thisID = 'drag_add_folder' }
				if ( thePath.includes(this.feedback.file) )   { thisID = 'drag_add_file' }
			}
			if ( thisID === 'drag_add_folder' ) {
				this.feedback.folder.classList.add('bg-primary')
				this.feedback.file.classList.remove('bg-primary')
				this.flags.isFolder = true
			}
			if ( thisID === 'drag_add_file' ) {
				this.feedback.folder.classList.remove('bg-primary')
				this.feedback.file.classList.add('bg-primary')
				this.flags.isFolder = false
			}
		}
	
		this.flags.isRunning = true
	}
	dragLeave (e) {
		e.preventDefault()
		e.stopPropagation()
	
		if ( e.x <= 0 && e.y <= 0 ) {
			this.flags.isRunning = false
			this.flags.isFolder  = false
			this.feedback.backdrop.clsHide()
	
			this.resetArea(this.feedback.file)
			this.resetArea(this.feedback.folder)
		}
	}
	dragOver (e) {
		e.preventDefault()
		e.stopPropagation()
	
		e.dataTransfer.dropEffect = (this.flags.isFolder ? 'link' : 'copy')
	}
}

// MARK: modal overlays
class ModalOverlay {
	overlay = null

	constructor(id) {
		this.overlay = new bootstrap.Modal(id, {backdrop : 'static'})
		this.overlay.hide()
	}

	show() {
		this.overlay.show()
	}

	hide() {
		this.overlay.hide()
	}
}

// MARK: LoaderLib
class LoaderLib {
	overlay = null

	lastTotal = 1
	startTime = Date.now()

	constructor() {
		this.overlay = new bootstrap.Modal('#loadOverlay', { backdrop : 'static', keyboard : false })
	}

	hide() { this.overlay?.hide() }
	show() { this.overlay?.show() }

	hideCount() {
		MA.byId('loadOverlay_statusCount').clsHide()
		MA.byId('loadOverlay_statusProgBar').clsHide()
	}
	startDownload() {
		this.startTime = Date.now()
		MA.byId('loadOverlay_downloadCancel').clsShow()
		MA.byId('loadOverlay_speed').clsShow()
	}
	async updateCount(count, inMB = false) {
		const thisCount   = inMB ? await DATA.bytesToMB(count, false) : count
		const thisElement = MA.byId('loadOverlay_statusCurrent')
		const thisProg    = MA.byId('loadOverlay_statusProgBarInner')
		const thisPercent = `${Math.max(Math.ceil((count / this.lastTotal) * 100), 0)}%`
	
		if ( thisProg !== null ) { thisProg.style.width = thisPercent }
	
		if ( thisElement !== null ) { thisElement.innerHTML = thisCount }
	
		if ( inMB ) {
			const perDone    = Math.max(1, Math.ceil((count / this.lastTotal) * 100))
			const perRem     = 100 - perDone
			const elapsedSec = (Date.now() - this.startTime) / 1000
			const estSpeed   = await DATA.bytesToMBCalc(count, false) / elapsedSec // MB/sec
			const secRemain  = elapsedSec / perDone * perRem
	
			const prettyMinRemain = Math.floor(secRemain / 60)
			const prettySecRemain = secRemain % 60
	
			MA.byIdText('loadOverlay_speed_speed', `${estSpeed.toFixed(1)} MB/s`)
			MA.byIdText('loadOverlay_speed_time', `~ ${prettyMinRemain.toFixed(0).padStart(2, '0')}:${prettySecRemain.toFixed(0).padStart(2, '0')}`)
		}
	}
	updateText(mainTitle, subTitle, dlCancel) {
		MA.byIdHTML('loadOverlay_statusMessage', mainTitle)
		MA.byIdHTML('loadOverlay_statusDetail', subTitle)
		MA.byIdText('loadOverlay_statusTotal', '0')
		MA.byIdText('loadOverlay_statusCurrent', '0')
		MA.byIdHTML('loadOverlay_downloadCancelButton', dlCancel)
	
		MA.byId('loadOverlay_statusCount').clsShow()
		MA.byId('loadOverlay_statusProgBar').clsShow()
	
		MA.byId('loadOverlay_downloadCancel').clsHide()
		MA.byId('loadOverlay_speed').clsHide()
		
		this.show()
	}
	async updateTotal(count, inMB = false) {
		if ( inMB ) { this.startTime = Date.now() }
		const thisCount   = inMB ? await DATA.bytesToMB(count) : count
		MA.byIdText('loadOverlay_statusTotal', thisCount)
		this.lastTotal = ( count < 1 ) ? 1 : count
	}
}

// MARK: FileLib
class FileLib {
	flags = {
		count      : 0,
		isRunning  : false,
		operation  : null,
	}

	overlay      = null
	feedback     = null

	dest_multi  = new Set(['import', 'multiCopy', 'multiMove', 'copyFavs'])
	dest_none   = new Set(['delete'])
	dest_single = new Set(['copy', 'move'])

	l10n_button = {
		copy      : 'copy',
		delete    : 'delete',
		favs      : 'copy',
		import    : 'copy',
		move      : 'move',
		multiCopy : 'copy',
		multiMove : 'move',
	}
	l10n_info = {
		copy      : 'confirm_copy_blurb',
		delete    : 'confirm_delete_blurb',
		favs      : 'confirm_copy_multi_blurb',
		import    : 'confirm_import_blurb',
		move      : 'confirm_move_blurb',
		multiCopy : 'confirm_copy_multi_blurb',
		multiMove : 'confirm_move_multi_blurb',
	}
	l10n_title = {
		copy      : 'confirm_copy_title',
		delete    : 'confirm_delete_title',
		favs      : 'confirm_multi_copy_title',
		import    : 'confirm_import_title',
		move      : 'confirm_move_title',
		multiCopy : 'confirm_multi_copy_title',
		multiMove : 'confirm_move_title',
	}

	lastPayload  = null
	selectedDest = new Set()
	buttonDest   = new Map()
	selectedMods = {}

	constructor() {
		this.overlay  = new bootstrap.Offcanvas('#fileOpCanvas')
		this.feedback = new bootstrap.Modal('#fileOpProgress', { backdrop : 'static', keyboard : false })
		MA.byId('fileOpCanvas').addEventListener('hide.bs.offcanvas', () => {
			this.stop()
		})
		MA.byId('fileOpCanvas').addEventListener('show.bs.offcanvas', () => {
			MA.byId('fileOpCanvas').querySelector('.offcanvas-body').scrollTop = 0
		})
		MA.byId('fileOpCanvas-button').addEventListener('click', () => { this.process() })
		MA.byId('fileOpCanvas-button-close').addEventListener('click', () => {
			this.overlay.hide()
		})

		window.main_IPC.receive('files:operation', (mode, mods) => {
			this.start_external(mode, mods)
		})
	}

	// MARK: start (ext module)
	start_external(mode, mods) {
		this.flags.operation = mode
		this.flags.isRunning = true

		this.selectedDest.clear()
		this.buttonDest.clear()
		this.lastPayload = null

		this.display(mode, mods)
	}

	// MARK: start (button)
	start(mode, selectAll, selectOne) {
		if ( selectAll.length === 0 ) { return }

		const realSelect = selectOne !== null ? new Set([selectOne]) : selectAll

		this.flags.operation = mode
		this.flags.isRunning = true

		this.selectedDest.clear()
		this.buttonDest.clear()
		this.lastPayload = null

		switch (mode) {
			case 'favs' :
				window.main_IPC.files.listFavs().then((files) => {
					this.display(mode, files)
				})
				break
			case 'copy' :
			case 'move' :
			case 'delete' :
				window.main_IPC.files.list(mode, [...realSelect]).then((files) => {
					this.display(mode, files)
				})
				break
			case 'zip' :
				window.main_IPC.files.exportZIP([...realSelect])
				this.stop()
				break
			case 'openMods' :
				return window.main_IPC.files.openExplore([...realSelect][0])
			case 'openHub' :
				return window.main_IPC.files.openModHub([...realSelect][0])
			case 'openExt' :
				return window.main_IPC.files.openExtSite([...realSelect][0])
			default :
				break
		}
	}

	// MARK: user buttons
	selectDestination(single = true, dest) {
		if ( this.selectedDest.has(dest) ) {
			this.selectedDest.delete(dest)
		} else if ( single ) {
			this.selectedDest.clear()
			this.selectedDest.add(dest)
		} else {
			this.selectedDest.add(dest)
		}
		for ( const [key, button] of this.buttonDest ) {
			button.clsOrGate(this.selectedDest.has(key), 'bg-success-subtle', 'bg-danger-subtle')
		}
		const selectArray = [...this.selectedDest]
		for ( const mod of Object.values(this.selectedMods) ) {
			if ( single && this.flags.operation !== 'delete') {
				mod.doAction = false
			}
			mod.destinations = selectArray
		}
		this.updateMods()
	}

	toggleMod(key) {
		this.selectedMods[key].doAction = !this.selectedMods[key].doAction
		this.updateMods()
	}

	// MARK: check conflict
	doesNewConflict(path) {
		if ( this.lastPayload.isZipImport ) { return false }
		const shortNameParts = path.split('\\')
		const shortNameExt   = shortNameParts.pop()
		const thisKey      = [...this.selectedDest][0]

		if ( shortNameExt.indexOf('.') !== -1 ) {
			if ( shortNameExt.endsWith('.zip') ) {
				const shortName = shortNameExt.replace('.zip', '')
				for ( const modKey of window.state.track.lastPayload.modList[thisKey].modSet ) {
					const checkMod = window.state.track.lastPayload.modList[thisKey].mods[modKey]
					if ( shortName === checkMod.fileDetail.shortName && !checkMod.fileDetail.isFolder ) {
						return true
					}
				}
				return false
			}
			return false
		}
		
		for ( const modKey of window.state.track.lastPayload.modList[thisKey].modSet ) {
			const checkMod = window.state.track.lastPayload.modList[thisKey].mods[modKey]
			if ( shortNameExt === checkMod.fileDetail.shortName && checkMod.fileDetail.isFolder ) {
				return true
			}
		}
		return false
	}

	doesModConflict(mod) {
		if ( this.selectedDest.size === 0 ) { return true }

		const thisKey = [...this.selectedDest][0]

		for ( const modKey of window.state.track.lastPayload.modList[thisKey].modSet ) {
			const checkMod = window.state.track.lastPayload.modList[thisKey].mods[modKey]
			if ( mod.fileDetail.shortName === checkMod.fileDetail.shortName && mod.fileDetail.isFolder === checkMod.fileDetail.isFolder ) {
				return true
			}
		}
		return false
	}

	// MARK: update display
	updateButton() {
		this.flags.count = 0

		if ( this.selectedDest.size !== 0 || this.flags.operation === 'delete' ) {
			for ( const mod of Object.values(this.selectedMods) ) {
				if ( mod.doAction ) { this.flags.count++ }
			}
		}

		const lookupOp = this.lastPayload.multiDestination ? `multi${this.flags.operation.slice(0, 1).toUpperCase()}${this.flags.operation.slice(1)}` : this.flags.operation

		MA.byIdHTML('fileOpCanvas-button', `${I18N.defer(this.l10n_button[lookupOp], false)} [${this.flags.count}]`)
		MA.byId('fileOpCanvas-button').clsEnable(this.flags.count)
	}

	showMod_known(mod) {
		return DATA.templateEngine('file_op_mod', {
			folderIcon : mod.fileDetail.isFolder ? '<i class="bi bi-folder2-open mod-folder-overlay"></i>' : '',
			iconImage  : `<img alt="" class="img-fluid" src="${DATA.iconMaker(mod.modDesc.iconImageCache)}">`,
			shortname  : mod.fileDetail.shortName,
			title      : DATA.escapeSpecial(mod.l10n.title),
		})
	}

	showMod_new(path, zipFiles = null) {
		const shortNameParts = path.split('\\')
		const shortNameExt   = shortNameParts.pop()
		const isFolder       = shortNameExt.indexOf('.') === -1
		const shortName      = isFolder ? shortNameExt : shortNameExt.split('.')[0]

		return DATA.templateEngine('file_op_mod', {
			folderIcon : '',
			iconImage  : isFolder ?
				`<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" fill="currentColor" class="bi bi-folder-plus" viewBox="0 0 16 16">
					<path d="m.5 3 .04.87a2 2 0 0 0-.342 1.311l.637 7A2 2 0 0 0 2.826 14H9v-1H2.826a1 1 0 0 1-.995-.91l-.637-7A1 1 0 0 1 2.19 4h11.62a1 1 0 0 1 .996 1.09L14.54 8h1.005l.256-2.819A2 2 0 0 0 13.81 3H9.828a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 6.172 1H2.5a2 2 0 0 0-2 2m5.672-1a1 1 0 0 1 .707.293L7.586 3H2.19q-.362.002-.683.12L1.5 2.98a1 1 0 0 1 1-.98z"/>
					<path d="M13.5 9a.5.5 0 0 1 .5.5V11h1.5a.5.5 0 1 1 0 1H14v1.5a.5.5 0 1 1-1 0V12h-1.5a.5.5 0 0 1 0-1H13V9.5a.5.5 0 0 1 .5-.5"/>
				</svg>` :
				`<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" fill="currentColor" class="bi bi-file-earmark-plus" viewBox="0 0 16 16">
					<path d="M8 6.5a.5.5 0 0 1 .5.5v1.5H10a.5.5 0 0 1 0 1H8.5V11a.5.5 0 0 1-1 0V9.5H6a.5.5 0 0 1 0-1h1.5V7a.5.5 0 0 1 .5-.5"/>
					<path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5z"/>
				</svg>`,
			shortname  : shortName,
			title      : zipFiles === null ? path.replaceAll('\\', '\\<wbr>') : [...zipFiles].join('<br>'),
		})
	}

	showMod(mod, hasDest, isDelete, isMulti) {
		const modPointer = this.flags.operation === 'import' ? mod : mod.colUUID
		let doesConflict = false
		if ( hasDest && !isDelete && !isMulti ) {
			if ( this.flags.operation !== 'import' ) {
				doesConflict = this.doesModConflict(mod)
			} else {
				doesConflict = this.doesNewConflict(mod)
			}
		}

		const node = this.flags.operation !== 'import' ?
			this.showMod_known(mod) :
			this.showMod_new(mod, this.lastPayload.isZipImport ? this.lastPayload.zipFiles : null)

		if ( isMulti || isDelete ) {
			node.querySelector('.no-dest').clsHide()
			node.querySelector('.conf-dest').clsHide()
			node.querySelector('.over-dest').clsHide()
			node.querySelector('.clear-dest').clsHide()
		} else if ( !hasDest ) {
			node.querySelector('.no-dest').clsShow()
			node.querySelector('.conf-dest').clsHide()
			node.querySelector('.over-dest').clsHide()
			node.querySelector('.clear-dest').clsHide()
		} else {
			node.querySelector('.no-dest').clsHide()
			if ( doesConflict ) {
				node.firstElementChild.setAttribute('style', 'cursor:pointer')
				node.firstElementChild.addEventListener('click', () => { this.toggleMod(modPointer)} )
			} else {
				this.selectedMods[modPointer].doAction = true
			}
			node.querySelector('.conf-dest').clsShow((doesConflict && !this.selectedMods[modPointer].doAction))
			node.querySelector('.over-dest').clsShow((doesConflict && this.selectedMods[modPointer].doAction))
			node.querySelector('.clear-dest').clsShow(!doesConflict)
		}

		node.firstElementChild.children[0].clsOrGate(this.selectedMods[modPointer].doAction, 'bg-file-op-good', 'bg-file-op-bad')

		return node
	}

	updateMods() {
		const isDelete      = this.flags.operation === 'delete'
		const isMulti       = this.lastPayload.multiDestination
		const hasDest       = this.selectedDest.size !== 0

		const modList = MA.byId('fileOpCanvas-source')

		modList.innerHTML = ''
		if ( this.flags.operation !== 'import' ) {
			for ( const mod of this.lastPayload.records ) {
				modList.appendChild(this.showMod(mod, hasDest, isDelete, isMulti))
			}
		} else {
			for ( const mod of this.lastPayload.rawFileList ) {
				modList.appendChild(this.showMod(mod, hasDest, isDelete, isMulti))
			}
		}
		this.updateButton()
	}

	// MARK: prepare display
	display(mode, mods) {
		this.lastPayload = mods

		const lookupOp = mods.multiDestination ? `multi${this.flags.operation.slice(0, 1).toUpperCase()}${this.flags.operation.slice(1)}` : this.flags.operation

		MA.byIdHTML('fileOpCanvas-title', I18N.defer(this.l10n_title[lookupOp], false))
		MA.byIdHTML('fileOpCanvas-info', I18N.defer(this.l10n_info[lookupOp], false))
		MA.byIdHTML('fileOpCanvas-button', `${I18N.defer(this.l10n_button[lookupOp], false)} [${this.flags.count}]`)
		MA.byId('fileOpCanvas-zipImport').clsShow(mods.isZipImport)

		const isSingle = mode !== 'delete' && !mods.multiDestination

		const collectPick = MA.byId('fileOpCanvas-destination')
		collectPick.innerHTML = ''
		collectPick.clsHide(mode === 'delete')

		if ( mode !== 'delete' ) {
			for ( const [key, info] of window.state.mapCollectionFiles ) {
				const node = DATA.templateEngine('file_op_collect_option', {
					icon : DATA.makeFolderIcon(
						false,
						false,
						false,
						false,
						info.color
					),
					name : info.name,
					tag  : info.tag === null ? '' : `<br><span class="small fst-italic">${info.tag}</span>`,
				})
				node.firstElementChild.addEventListener('click', () => { this.selectDestination(isSingle, key) })
				node.firstElementChild.setAttribute('title', info.folder)
				this.buttonDest.set(key, node.querySelector('.collect-indicate'))
				collectPick.appendChild(node)
			}
		}
		
		this.overlay.show()

		// NOTE: FILE OPS
		// destinations      : [thisCheck.value],
		// source_collectKey : sourceMod.collectKey,
		// source_modUUID    : sourceMod.uuid,
		// source_rawPath    : string (for drag-drop)
		// type              : 'copy','move','delete'

		if ( this.flags.operation === 'import' ) {
			for ( const file of this.lastPayload.rawFileList ) {
				this.selectedMods[file] = {
					destinations      : [],
					doAction          : false,
					source_collectKey : null,
					source_modUUID    : null,
					source_rawPath    : file,
					type              : this.lastPayload.isZipImport ? 'unzip' : 'copy',
				}
			}
		} else {
			for ( const mod of this.lastPayload.records ) {
				this.selectedMods[mod.colUUID] = {
					destinations      : [],
					doAction          : mode === 'delete' || this.lastPayload.multiDestination,
					source_collectKey : mod.currentCollection,
					source_modUUID    : mod.uuid,
					source_rawPath    : null,
					type              : this.flags.operation,
				}
			}
		}
		this.updateMods()
	}

	process() {
		const filePayload = Object.values(this.selectedMods).filter((x) => x.doAction)

		if ( filePayload.length === 0 ) { return }

		this.feedback.show()
		MA.byId('fileOpWorking').clsShow()
		MA.byId('fileOpSuccess').clsHide()
		MA.byId('fileOpDanger').clsHide()
		MA.byId('badFileFeedback').clsHide()

		window.main_IPC.files.process(filePayload).then((opResult) => {
			const didFail = opResult.some((x) => x.status === false )
			if ( didFail ) {
				MA.byId('fileOpDanger').clsShow()
				MA.byId('fileOpWorking').clsHide()
				MA.byId('badFileFeedback').clsShow()
				const badFiles = opResult
					.filter((x) => x.status === false)
					.map((x) => {
						if ( x.type === 'delete' ) {
							return `<i class="bi bi-trash3"></i> ${x.source}`
						}
						return `-> ${x.dest}<br>`
					})
				MA.byId('badFileList').innerHTML = badFiles.join('')
			} else {
				MA.byId('fileOpSuccess').clsShow()
				MA.byId('fileOpWorking').clsHide()
			}

			setTimeout(() => {
				this.feedback.hide()
				this.overlay.hide()
				window.state.select.none()
				window.main_IPC.folder.reload()
			}, didFail ? 5000 : 1500)
		})
	}
	
	// MARK: keyboard interaction
	key(type) {
		if ( this.selectedDest.size === 0 ) { return }
		if ( this.flags.operation === 'delete' ) { return }
		if ( this.lastPayload.multiDestination ) { return }

		for ( const data of Object.values(this.selectedMods) ) {
			switch (type) {
				case 'all' :
					data.doAction = true
					break
				case 'invert' :
					data.doAction = !data.doAction
					break
				default :
					data.doAction = false
					break
			}
		}
		this.updateMods()
	}

	key_all()    { this.key('all') }
	key_invert() { this.key('invert') }
	key_none()   { this.key('none') }

	// MARK: stop operation and hide
	stop() {
		this.flags.count     = 0
		this.flags.isRunning = false
		this.flags.operation = null
		this.lastPayload     = null
		this.selectedMods    = {}
		this.selectedDest.clear()
		this.buttonDest.clear()
	}
}