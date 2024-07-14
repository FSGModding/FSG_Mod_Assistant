/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main Window UI

/* global MA, DATA, I18N, select_lib, bootstrap, fsgUtil */
// processL10N, fsgUtil, select_lib, __ */

// eslint-disable-next-line no-unused-vars
class StateManager {
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

	searchTagList = new Set()

	mapCollectionDropdown = new Map()
	mapCollectionFiles    = new Map()

	// MARK: process data
	async updateFromData(data) {
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
	
		for ( const [CIndex, CKey] of Object.entries([...data.set_Collections]) ) {
			if ( data.collectionNotes[CKey].notes_version !== this.flag.currentVersion ) { continue }

			this.orderMap.keys.push(CKey)
			this.orderMap.keyToNum[CKey]   = parseInt(CIndex)
			this.orderMap.numToKey[CIndex] = CKey
			this.orderMap.max              = Math.max(this.orderMap.max, parseInt(CIndex))
			
			this.mapCollectionDropdown.set(CKey, data.modList[CKey].fullName)
			this.mapCollectionFiles.set(CKey, data.modList[CKey].fullName)

			// eslint-disable-next-line no-await-in-loop
			const thisCol = await this.#addCollection(CKey, data.modList[CKey], data.collectionNotes[CKey], data.collectionToStatus[CKey])
			this.collections[CKey] = thisCol

			if ( !this.flag.folderEdit ) {
				this.mods[CKey] = {}

				for ( const [MKey, thisMod] of Object.entries(data.modList[CKey].mods) ) {
					const thisModName = thisMod.fileDetail.shortName

					// eslint-disable-next-line no-await-in-loop
					const thisModRec  = await this.#addMod(thisMod)

					for ( const tag of thisModRec.filters ) { this.searchTagList.add(tag) }

					thisCol.sorter.push([
						MKey,
						thisModRec.search.find_name,
						thisModRec.search.find_author,
						thisModRec.search.find_title,
						thisModRec.search.find_version
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

		this.updateUI()
		this.fixSorts()
		if ( this.track.openCollection !== null ) {
			this.collections[this.track.openCollection]?.modNode?.classList?.remove?.('d-none')
		}
		this.doDisplay()
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
		}
	}

	// MARK: update state
	updateState() {
		window.main_IPC.updateState().then((status) => {
			MA.byId('debug_danger_bubble').clsShow(status.dangerDebug)
			MA.byId('topBar-update').clsShow(status.updateReady)
			this.flag.gameRunning  = status.gameRunning
			this.flag.launchEnable = status.gameRunningEnabled
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
		const thisText = isGood && response.online ? response.playersOnline : ''
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
		// modSortOrder
	}

	// MARK: translated UI selects
	async updateI18NDrops() {
		const finds = ['find_all', 'find_author', 'find_title', 'find_name', 'find_version']
		const sorts = ['sort_name', 'sort_title', 'sort_author', 'sort_version']

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
					} else if ( this.track.selectedOnly ) { continue }

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

	doesSearchExclude(mod) {
		// reversed condition! false if OK!
		if ( this.track.searchString.length < 2 ) { return false }

		return mod.search[this.track.searchType].indexOf(this.track.searchString) === -1
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
				'<span class="no-mods-found d-block fst-italic small text-center d-none"><l10n name="empty_or_filtered"></l10n></span>',
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
			btnNode.appendChild(this.#buttonMaker('download_button', 'outline-warning', () => { window.main_IPC.collectDownload(CKey) }))
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

		btnNode.appendChild(this.#buttonMaker('export_button', 'outline-info', () => { window.main_IPC.collectExport(CKey) }))
		btnNode.appendChild(this.#buttonMaker('notes_button', 'primary', () => { window.main_IPC.dispatchNotes(CKey) }))
		btnNode.appendChild(this.#buttonMaker('check_save', 'primary', () => { window.main_IPC.dispatchSave(CKey) }))
	}

	// MARK: addMod
	async #addMod(thisMod) {
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
	
		mod.node.addEventListener('contextmenu', () => { this.modContext(thisMod.colUUID, thisMod.currentCollection) })
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
		for ( const badge of thisMod?.displayBadges?.filter?.((x) => x.name !== `fs${this.flag.currentVersion}`) || [] ) {
			badgeContain.appendChild(I18N.buildBadgeMod(badge))
		}

		return mod
	}

	// MARK: col actions
	colToggle(id) {
		this.track.lastID    = null
		this.track.lastIndex = null
		this.track.altClick  = null

		for ( const selected of this.track.selected ) {
			this.modToggle(selected, false)
		}

		if ( this.track.openCollection !== null ) {
			this.collections[this.track.openCollection].modNode.classList.add('d-none')
		}

		if ( this.track.openCollection === id ) {
			this.track.openCollection = null
		} else {
			this.track.openCollection = id
			this.collections[id].modNode.classList.remove('d-none')
		}
		this.doDisplay()
	}

	colContext(id) { window.main_IPC.contextCol(id) }


	// MARK: mod actions
	modContext(id, CKey) {
		const isHoldingPen = this.track.selected.size === 0 ? false : this.collections[CKey].notes.notes_holding
		window.main_IPC.contextMod(id, [...this.track.selected], isHoldingPen)
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
			MA.safeClsAdd(id, 'bg-success-subtle')
			MA.safeClsAdd(`${id}--scroller`, 'bg-success')
		} else {
			this.track.selected.delete(id)
			MA.safeClsRem(id, 'bg-success-subtle')
			MA.safeClsRem(`${id}--scroller`, 'bg-success')
		}
		
	}

	modDrag(e, id) {
		e.preventDefault()
		e.stopPropagation()

		if ( dragLib.preventRun ) { return }
		window.main_IPC.drag.out(id)
	}

	// MARK: safe refresh
	refreshSelected() {
		for ( const element of MA.query('.mod-row.bg-success-subtle') ) {
			element.classList.remove('bg-success-subtle')
		}
		for ( const element of MA.query('scroller-item.bg-success') ) {
			element.classList.remove('bg-success')
		}

		for ( const id of this.track.selected ) {
			if ( !id.startsWith(this.track.openCollection) ) {
				this.track.selected.remove(id)
			} else {
				MA.safeClsAdd(id, 'bg-success-subtle')
				MA.safeClsAdd(`${id}--scroller`, 'bg-success')
			}
		}
		this.select.count()
	}

	// MARK: selection toggles
	toggleSelectOnly() {
		this.track.selectedOnly = MA.byIdCheck('modFilter_selected')
	}

	changeSort() {
		this.track.sortOrder = MA.byIdValue('modSortOrder')
		this.doDisplay()
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

}














const mainState = {
	gameIsRunningFlag  : false,
	gameSetCollect     : {
		selected : null,
		all      : {},
	},
	modCollect         : null,
	win                : {
		collectMismatch : null,
		modInfo         : null,
	},
}


const mainLib = {
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

	doCacheClean : () => {
		fsgUtil.setById('clean_cache_size', '')
		fsgUtil.setById('clean_detail_cache_size', '')
		window.mods.cleanCache()
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

const fileOpLib = {
	countEnabled : 0,
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
		import    : 'copy',
		move      : 'move',
		multiCopy : 'copy',
		multiMove : 'move',
	},
	l10n_info : {
		copy      : 'confirm_copy_blurb',
		copyFavs  : 'confirm_copy_multi_blurb',
		delete    : 'confirm_delete_blurb',
		import    : 'confirm_import_blurb',
		move      : 'confirm_move_blurb',
		multiCopy : 'confirm_copy_multi_blurb',
		multiMove : 'confirm_move_multi_blurb',
	},
	l10n_title : {
		copy      : 'confirm_copy_title',
		copyFavs  : 'confirm_multi_copy_title',
		delete    : 'confirm_delete_title',
		import    : 'confirm_import_title',
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

		if ( fileOpLib.operation === 'import' ) {
			for ( const rawFile of fileOpLib.rawFiles ) {
				for ( const realDest of realDestinations ) {
					fileMap.push([
						realDest.id.replace('file_dest__', ''),
						'',
						rawFile
					])
				}
			}

			window.mods.realImportFile(fileMap, fileOpLib.isZipImport)
			return
		}

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
	goodFileCount : () => {
		if ( ! fileOpLib.dest_single.has(fileOpLib.operation) ) { return }
		const selectedDest = fsgUtil.valueById('fileOpCanvas-select-dest')

		fileOpLib.countEnabled = 0

		if ( selectedDest !== '0' ) {
			for ( const mod of fileOpLib.mods ) {
				const includeMeElement = fsgUtil.byId(`file_op__${mod.uuid}`)
		
				if ( includeMeElement.getAttribute('type') === 'checkbox' && includeMeElement.checked === true ) {
					fileOpLib.countEnabled++
				}
				if ( includeMeElement.getAttribute('type') === 'hidden' && includeMeElement.value ) {
					fileOpLib.countEnabled++
				}
			}
		}
		fsgUtil.setById('fileOpCanvas-goodFileCount', fileOpLib.countEnabled)
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
		fileOpLib.goodFileCount()
	},
	listMods : () => {
		const noConflict   = fileOpLib.noConflict()
		const confirmHTML  = []
		const selectedDest = fsgUtil.valueById('fileOpCanvas-select-dest')
		const multiDest    = fsgUtil.query('#fileOpCanvas-destination :checked')
		let   enableButton = false

		if ( noConflict ) {
			if ( fileOpLib.operation === 'delete' ) { enableButton = true }
			if ( multiDest.length !== 0 ) { enableButton = true }
		}

		for ( const thisMod of fileOpLib.mods ) {
			let destHTML = ''

			if ( !noConflict )	{
				switch ( true ) {
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

		for ( const rawFile of fileOpLib.rawFiles || [] ) {
			confirmHTML.push(fsgUtil.useTemplate('file_op_file_row', {
				printPath : rawFile,
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
		fileOpLib.goodFileCount()
	},
	noConflict   : () => fileOpLib.dest_multi.has(fileOpLib.operation) || fileOpLib.dest_none.has(fileOpLib.operation),
	startOverlay : (opPayload) => {
		fileOpLib.isZipImport = opPayload.isZipImport
		fileOpLib.isRunning   = true
		fileOpLib.operation   = opPayload.operation
		fileOpLib.mods        = opPayload.records
		fileOpLib.thisCollect = opPayload.originCollectKey
		fileOpLib.thisLimit   = opPayload.multiSource
		fileOpLib.rawFiles    = opPayload.rawFileList
		fileOpLib.thisFolder  = mainState.modCollect.collectionToFolderRelative[fileOpLib.thisCollect]

		fsgUtil.clsShowTrue('fileOpCanvas-zipImport', fileOpLib.isZipImport)

		const countText = fileOpLib.dest_single.has(fileOpLib.operation) ? ' [<span id="fileOpCanvas-goodFileCount">0</span>]' : ''

		fsgUtil.setById('fileOpCanvas-title', __(fileOpLib.l10n_title[fileOpLib.operation]))
		fsgUtil.setById('fileOpCanvas-info', __(fileOpLib.l10n_info[fileOpLib.operation]))
		fsgUtil.setById('fileOpCanvas-button', `${__(fileOpLib.l10n_button[fileOpLib.operation])}${countText}`)
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
	preventRun : false,

	dragDrop : (e) => {
		e.preventDefault()
		e.stopPropagation()
	
		if ( fileOpLib.isRunning ) { return }
		if ( dragLib.preventRun ) { return }
		
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
	
		if ( fileOpLib.isRunning ) { return }
		if ( dragLib.preventRun ) { return }

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
	dragOver : (e) => {
		e.preventDefault()
		e.stopPropagation()
	
		e.dataTransfer.dropEffect = (dragLib.isFolder ? 'link' : 'copy')
	},
}


// eslint-disable-next-line no-unused-vars
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
	updateCount(count, inMB = false) {
		const thisCount   = inMB ? DATA.bytesToMB(count, false) : count
		const thisElement = MA.byId('loadOverlay_statusCurrent')
		const thisProg    = MA.byId('loadOverlay_statusProgBarInner')
		const thisPercent = `${Math.max(Math.ceil((count / this.lastTotal) * 100), 0)}%`
	
		if ( thisProg !== null ) { thisProg.style.width = thisPercent }
	
		if ( thisElement !== null ) { thisElement.innerHTML = thisCount }
	
		if ( inMB ) {
			const perDone    = Math.max(1, Math.ceil((count / this.lastTotal) * 100))
			const perRem     = 100 - perDone
			const elapsedSec = (Date.now() - this.startTime) / 1000
			const estSpeed   = DATA.bytesToMBCalc(count, false) / elapsedSec // MB/sec
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
	updateTotal(count, inMB = false) {
		if ( inMB ) { this.startTime = Date.now() }
		const thisCount   = inMB ? DATA.bytesToMB(count) : count
		MA.byIdText('loadOverlay_statusTotal', thisCount)
		this.lastTotal = ( count < 1 ) ? 1 : count
	}
}