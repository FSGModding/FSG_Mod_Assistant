/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Savegame window UI

/* global MA, DATA, I18N */

// TODO: badge styling
// TODO: badges back to main (and style)

window.addEventListener('DOMContentLoaded', () => {
	window.state = new WindowState()
})

class WindowState {
	/* CSpell: disable */
	alwaysUsedActive = new Set([
		'FS22_BetterContracts',
		'FS22_PrecisionFarmingAnhydrousReady',
		'FS22_precisionFarming',
	])

	consumableOnly = new Set([
		'FS22_AGRAHIM_BigBagsPack',
		'FS22_Animal_Food_BigBag',
		'FS22_Bags_and_Support_Package',
		'FS22_BarrelsOfLiquids',
		'FS22_BigBagCattlePack',
		'FS22_BigBagsAsDefault',
		'FS22_BonsilageBulkTank',
		'FS22_BuyableProducts',
		'FS22_cfFertilisersPack',
		'FS22_CzeBigBag',
		'FS22_Diesel_Pallet',
		'FS22_DieselCanister',
		'FS22_DieselJerrican',
		'FS22_DynamicCrushableRocksPack',
		'FS22_Farm_Supply_Pack',
		'FS22_Fertilisers_Bigbag_Pack',
		'FS22_FertilizerBigBagsPack',
		'FS22_FinnishBagsNPallets',
		'FS22_ForagePack',
		'FS22_IBCstack',
		'FS22_IndustrialSugar',
		'FS22_Interactive_BigBags',
		'FS22_IronOreBigBagPE',
		'FS22_lizardFertilisersPack_crossplay',
		'FS22_MineralFood50l',
		'FS22_MultiPurchasePallet',
		'FS22_norwegianBigbags',
		'FS22_NZFertilizerPack',
		'FS22_oneHandSeeds',
		'FS22_Pallet_Pack',
		'FS22_Pallets_And_Bags_Pack',
		'FS22_Pioneer_Seeds',
		'FS22_PolandBigBags',
		'FS22_PolishBigBag',
		'FS22_PolishFertilizersBag50l',
		'FS22_PolishSeeds',
		'FS22_Potato_pallet',
		'FS22_Production_Pallets_Pack',
		'FS22_PulawyFertilizers',
		'FS22_RaisinAndGrapesPallet',
		'FS22_SackOldPack',
		'FS22_ScandagraBigBags',
		'FS22_Schaumann_Animal_Food_Pallet',
		'FS22_SilageDrum',
		'FS22_SmallLiquidTank',
		'FS22_StonePallet',
		'FS22_treeSaplingPallet120',
		'FS22_Water_And_Diesel_Tank',
		'FS22_Yara_Fertilizer_Pack',
		'FS22_Yara_Fertilizer_Pallets',
		'FS22_YaraBigBagFertilizer',
	])
	/* CSpell: enable */
	dragDrop       = null
	cacheSaveGame  = null
	collectKey     = null

	detailSend   = null
	selectList   = null
	noSelectList = null
	selectCount  = null

	constructor() {
		this.dragDrop     = new DragDropLib()
		this.selectList   = this.empty_list()
		this.selectCount  = this.empty_count()
		this.noSelectList = this.empty_list()

		window.savegame_IPC.receive('save:collectName', (modCollect) => {
			this.receiveCollectName(modCollect)
		})
		window.savegame_IPC.receive('save:saveInfo', (modCollect) => {
			this.cacheSaveGame = modCollect
			this.doSaveInfo()
		})

		MA.byId('pickCollectSelect').addEventListener('change', () => { this.action.pickCollect() })
		MA.byId('openFolderButton').addEventListener('click',   () => { window.savegame_IPC.open.folder() })
		MA.byId('openZipButton').addEventListener('click',      () => { window.savegame_IPC.open.file() })
		MA.byId('copyVisibleButton').addEventListener('click',  () => { this.action.copyVisible() })

		MA.byId('select_button_unused').addEventListener('click',   () => { this.action.selectInMain('unused') })
		MA.byId('select_button_inactive').addEventListener('click', () => { this.action.selectInMain('inactive') })
		MA.byId('select_button_active').addEventListener('click',   () => { this.action.selectInMain('active') })
		MA.byId('select_button_nohub').addEventListener('click',    () => { this.action.selectInMain('nohub') })

		MA.byId('check_savegame_dlc').addEventListener('change',        () => { this.doFilter() })
		MA.byId('check_savegame_missing').addEventListener('change',    () => { this.doFilter() })
		MA.byId('check_savegame_scriptonly').addEventListener('change', () => { this.doFilter() })
		MA.byId('check_savegame_isloaded').addEventListener('change',   () => { this.doFilter() })
		MA.byId('check_savegame_isused').addEventListener('change',     () => { this.doFilter() })
		MA.byId('check_savegame_unused').addEventListener('change',     () => { this.doFilter() })
		MA.byId('check_savegame_inactive').addEventListener('change',   () => { this.doFilter() })
		MA.byId('check_savegame_nohub').addEventListener('change',      () => { this.doFilter() })
	}

	receiveCollectName(modCollect) {
		this.cacheSaveGame  = modCollect
		this.collectKey     = modCollect.opts.collectKey

		this.doHeader()

		if ( this.collectKey === null ) {
			const checkVer   = modCollect.appSettings.game_version
			const selectHTML = [
				DATA.optionFromArray(['--', '--'], '--')
			]

			for ( const collectKey of modCollect.set_Collections ) {
				if ( checkVer === false || modCollect.collectionNotes[collectKey].notes_version === checkVer ) {
					selectHTML.push(DATA.optionFromArray([collectKey, modCollect.collectionToFullName[collectKey]], '--'))
				}
			}
			MA.byId('loadButtons').clsHide()
			MA.byId('pickCollect').clsShow()
			MA.byIdHTML('pickCollectSelect', selectHTML)
		} else {
			MA.byId('loadButtons').clsShow()
			MA.byId('pickCollect').clsHide()
		}
	}

	empty_list() { return {
		active   : [],
		inactive : [],
		nohub    : [],
		unused   : [],
	} }
	
	empty_count() { return {
		active     : 0,
		dlc        : 0,
		inactive   : 0,
		isloaded   : 0,
		isused     : 0,
		missing    : 0,
		nohub      : 0,
		scriptonly : 0,
		unused     : 0,

		s_active   : 0,
		s_inactive : 0,
		s_nohub    : 0,
		s_unused   : 0,
	}}

	final_count() {
		this.selectCount.s_nohub    = this.selectList.nohub.length
		this.selectCount.s_inactive = this.selectList.inactive.length
		this.selectCount.s_unused   = this.selectList.unused.length
		this.selectCount.s_active   = this.selectList.active.length

		this.selectCount.nohub    = this.selectList.nohub.length + this.noSelectList.nohub.length
		this.selectCount.inactive = this.selectList.inactive.length + this.noSelectList.inactive.length
		this.selectCount.unused   = this.selectList.unused.length + this.noSelectList.unused.length
		this.selectCount.active   = this.selectList.active.length + this.noSelectList.active.length
	}

	doCounts() {
		for ( const element of MA.query('[data-for^="check_savegame"]') ) {
			const labelName = element.getAttribute('data-for').replace('check_savegame_', '')
			const quantity  = element.querySelector('.quantity')
			quantity.innerHTML = this.selectCount[`s_${labelName}`]
		}
		for ( const element of MA.query('[for^="check_savegame"]') ) {
			const labelName = element.getAttribute('for').replace('check_savegame_', '')
			const quantity  = element.querySelector('.quantity')
			quantity.innerHTML = this.selectCount[labelName]
		}
	}

	doFilter() {
		console.log('hi!')
		const filtersActive = MA.query('.filter_only:checked').length
		const modItems      = MA.query('.mod-item')
		const filters = ['dlc', 'missing', 'scriptonly', 'isloaded', 'isused', 'inactive', 'unused', 'nohub']
	
		console.log(filtersActive)
		if ( filtersActive === 0 ) {
			for ( const modItem of modItems ) { modItem.classList.remove('d-none') }
		} else {
			const activeFilters = filters.filter((key) => MA.byId(`check_savegame_${key}`).checked )
			console.log(activeFilters)
			for ( const modItem of modItems ) {
				let allBadgesFound = true
				for ( const thisFilter of activeFilters ) {
					console.log(thisFilter)
					console.log(modItem.querySelector(`i18n-text[data-key="savegame_${thisFilter}"]`))
					if ( modItem.querySelector(`i18n-text[data-key="savegame_${thisFilter}"]`) === null ) {
						allBadgesFound = false
						break
					}
				}
				modItem.classList[( allBadgesFound ) ? 'remove' : 'add']('d-none')
			}
		}
	}

	doHeader() {
		MA.byIdHTML('collection_name',     this.collectKey === null ? '--' : this.cacheSaveGame.collectionToName[this.collectKey])
		MA.byIdHTML('collection_location', this.collectKey === null ? '--' : this.cacheSaveGame.collectionToFolderRelative[this.collectKey])
	}

	doLine(name, mod, singleFarm, hubID) {
		const badges       = ['versionMismatch', 'consumable', 'scriptOnly', 'isUsed', 'isLoaded']
		const displayBadge = this.getBadges(mod)
		const colorClass   = this.getColor(mod)
		
		if ( mod.isDLC )      { this.selectCount.dlc++ }
		if ( !mod.isPresent ) { this.selectCount.missing++ }
		
		for ( const badge of badges ) {
			if ( mod[badge] === true ) {
				if ( badge === 'scriptOnly' ) { this.selectCount.scriptonly++ }
				if ( badge === 'isUsed' )     { this.selectCount.isused++ }
				if ( badge === 'isLoaded' )   { this.selectCount.isloaded++ }
				displayBadge.push([badge.toLowerCase(), 'dark'])
			}
		}

		const node = DATA.templateEngine('savegame_mod', {
			farms         : mod.usedBy !== null ? [...mod.usedBy].join(', ') : '',
			name          : name,
			title         : mod.title,
		})

		const badgeDiv = node.querySelector('.badgeDiv')
		for ( const part of displayBadge.sort((a, b) => Intl.Collator().compare(a[0], b[0])) ) {
			const element = I18N.buildBadge({name : part[0], class : ['bg-gradient', 'rounded-1', 'ms-1'] }, { i18nPrefix : 'savegame_', classPrefix : 'badge-savegame' })
			badgeDiv.appendChild(element)
		}
		this.detailSend.modList[name] = badgeDiv.innerHTML
		node.querySelector('.mod-item').classList.add(colorClass)
		node.querySelector('.farmList').clsShow(mod.usedBy !== null && !singleFarm)

		if ( typeof hubID !== 'undefined' ) {
			node.querySelector('.hubButton').addEventListener('click', () => {
				window.savegame_IPC.openHub(hubID)
			})
		} else {
			node.querySelector('.hubButton').classList.add('d-none')
		}

		return node
	}

	doSaveInfo() {
		const modCollect = this.cacheSaveGame
		const savegame   = modCollect.opts.thisSaveGame
		const isCSV      = savegame.mapMod === 'csvLoaded'
		const {haveModSet, fullModSet} = this.getSets(modCollect.modList[this.collectKey].mods, Object.keys(savegame.mods))
		const modSetHTML = []

		this.detailSend = { collectKey : this.collectKey, modList : {} }
		this.selectList   = this.empty_list()
		this.selectCount  = this.empty_count()
		this.noSelectList = this.empty_list()
	
		if ( savegame.errorList.length !== 0 ) {
			const errors = savegame.errorList.map((error) => `<l10n name="${error[0]}"></l10n> ${error[1]}`)
			modSetHTML.push(DATA.templateEngine('savegame_error', { errors : errors.join(', ')}))
		}
	
		for ( const thisMod of fullModSet ) {
			if ( thisMod.endsWith('.csv') ) { continue }
			const thisModDetail = this.createModRecord(Object.hasOwn(modCollect.modHub.list.mods, thisMod))
			
			if ( thisMod.startsWith('pdlc_')) {
				thisModDetail.isDLC     = true
				thisModDetail.isPresent = true
			}
	
			if ( Object.hasOwn(savegame.mods, thisMod) ) {
				thisModDetail.version  = savegame.mods[thisMod].version
				thisModDetail.title    = savegame.mods[thisMod].title
				thisModDetail.isLoaded = true
				thisModDetail.isUsed   = isCSV || savegame.mods[thisMod].farms.size !== 0
				thisModDetail.usedBy   = this.getFarms(savegame.mods[thisMod].farms, savegame.farms)
			}
	
			if ( typeof haveModSet[thisMod] === 'object' ) {
				thisModDetail.scriptOnly = this.getScriptOnly(haveModSet[thisMod].modDesc)
				thisModDetail.consumable = this.consumableOnly.has(thisMod)
	
				if ( this.getScriptOnly(haveModSet[thisMod].modDesc) || this.alwaysUsedActive.has(thisMod) || this.consumableOnly.has(thisMod) ) {
					thisModDetail.isUsed     = thisModDetail.isLoaded
				}
	
				thisModDetail.isPresent         = true
				thisModDetail.version         ??= haveModSet[thisMod].modDesc.version
				thisModDetail.versionMismatch   = ( thisModDetail.version !== haveModSet[thisMod].modDesc.version )
				thisModDetail.title             = DATA.escapeSpecial(haveModSet[thisMod].l10n.title)
			}
	
			if ( thisMod === savegame.mapMod ) {
				thisModDetail.isUsed   = true
				thisModDetail.isLoaded = true
				thisModDetail.usedBy   = null
			}
	
			this.doSelectLists(thisModDetail, haveModSet?.[thisMod]?.uuid ?? null)
	
			// detailSend.modList[thisMod] = thisModDetail
			modSetHTML.push(this.doLine(thisMod, thisModDetail, savegame.singleFarm, modCollect.modHub.list.mods[thisMod]))
		}

		window.savegame_IPC.cacheDetails(this.detailSend)
		const modList = MA.byId('modList')
		modList.innerHTML = ''
		for ( const element of modSetHTML ) {
			modList.appendChild(element)
		}
	
		this.final_count()
		this.doCounts()
	}

	doSelectLists(thisModDetail, thisUUID) {
		const whichList = thisUUID === null ? 'noSelectList' : 'selectList'
		if ( thisModDetail.isUsed === false )   { this[whichList].unused.push(`${this.collectKey}--${thisUUID}`) }
		if ( thisModDetail.isLoaded === false ) { this[whichList].inactive.push(`${this.collectKey}--${thisUUID}`) }
		if ( thisModDetail.isModHub === false ) { this[whichList].nohub.push(`${this.collectKey}--${thisUUID}`) }
		if ( thisModDetail.isLoaded === true )  { this[whichList].active.push(`${this.collectKey}--${thisUUID}`) }
	}

	createModRecord(isMH) { return {
		consumable      : false,
		isDLC           : false,
		isLoaded        : false,
		isModHub        : isMH,
		isPresent       : false,
		isUsed          : false,
		scriptOnly      : false,
		title           : null,
		usedBy          : null,
		version         : null,
		versionMismatch : false,
	} }

	getBadges(mod) {
		const returnBadge = []
	
		if ( !mod.isModHub && !mod.isDLC ) {
			returnBadge.push(['nohub', 'info'])
		}
		if ( mod.isDLC ) {
			returnBadge.push(['dlc', 'info'])
		}
		if ( !mod.isPresent ) {
			returnBadge.push(['missing', 'danger'])
		}
		if ( !mod.isUsed ) {
			returnBadge.push(['unused', 'warning'])
		}
		if ( !mod.isLoaded ) {
			returnBadge.push(['inactive', 'warning'])
		}
		return returnBadge
	}

	getColor(mod) {
		if ( !mod.isPresent )      { return 'list-group-item-danger' }
		if ( mod.versionMismatch ) { return 'list-group-item-info' }
		if ( mod.isUsed )          { return 'list-group-item-success' }
		if ( mod.isLoaded )        { return 'list-group-item-warning' }
		return 'list-group-item-secondary'
	}

	getFarms(modFarms, allFarms) {
		if ( modFarms.size === 0 ) { return null }
		return [...modFarms].map((x) => allFarms[x])
	}

	getScriptOnly(modDesc) {
		return ( modDesc.storeItems < 1 && modDesc.scriptFiles > 0 )
	}

	getSets(mods, save_mods) {
		const haveModSet = {}
		const fullModArr = []
		for ( const thisMod of Object.values(mods) ) {
			haveModSet[thisMod.fileDetail.shortName] = thisMod
			fullModArr.push(thisMod.fileDetail.shortName)
		}
		
		return {
			haveModSet : haveModSet,
			fullModSet : new Set([...fullModArr, ...save_mods].sort(Intl.Collator().compare)),
		}
	}

	action = {
		copyVisible : () => {
			const shownMods = MA.queryA('.mod-item').filter((x) => !x.classList.contains('d-none')).map((x) => x.querySelector('template-var').innerHTML)
			window.operations.clip(shownMods.join('\n'))
		},
		pickCollect : () => {
			const collectKey = MA.byIdValue('pickCollectSelect')
			if ( collectKey !== '--' ) {
				this.collectKey = collectKey
				this.doHeader()
				this.doSaveInfo()
			}
		},
		selectInMain : (type) => {
			if ( this.selectList[type].length !== 0 ) {
				window.savegame_IPC.selectInMain(this.selectList[type])
			}
		},
	}
}




// MARK: drag-and-drop
class DragDropLib {
	operation = false
	isFolder  = false
	isBad     = false

	constructor() {
		const dragTarget = MA.byId('drag_target')
		
		dragTarget.addEventListener('dragenter', this.enter )
		dragTarget.addEventListener('dragleave', this.leave )
		dragTarget.addEventListener('dragover',  this.over )
		dragTarget.addEventListener('drop',      this.drop )
	}

	over(e) {
		e.preventDefault()
		e.stopPropagation()

		e.dataTransfer.dropEffect = 'copy'
	}

	leave(e) {
		e.preventDefault()
		e.stopPropagation()

		if ( e.x <= 0 && e.y <= 0 ) {
			this.operation = false
			this.isFolder  = false
			this.isBad     = false
			MA.byId('drag_back').clsHide()
			MA.byId('drop_file').clsHide()
			MA.byId('drop_folder').clsHide()
			MA.byId('drop_bad').clsHide()
		}
	}

	enter(e) {
		e.preventDefault()
		e.stopPropagation()

		
		if ( !this.operation ) {
			MA.byId('drag_back').clsShow()
		
			if ( e.dataTransfer.items.length === 1 && e.dataTransfer.items[0].type === '' ) {
				MA.byId('drop_folder').clsShow()
				this.isFolder = true
			} else if ( e.dataTransfer.items.length === 1 && e.dataTransfer.items[0].type === 'application/x-zip-compressed' ) {
				MA.byId('drop_file').clsShow()
			} else {
				MA.byId('drop_bad').clsShow()
				this.isBad = true
			}
		}

		this.operation = true
	}

	drop(e) {
		e.preventDefault()
		e.stopPropagation()

		this.operation = false
		if ( !this.isBad ) {
			const dt    = e.dataTransfer
			const files = dt.files

			const thisPath = files[0].path

			if ( this.isFolder ) {
				window.savegame_IPC.drop.folder(thisPath)
			} else {
				window.savegame_IPC.drop.file(thisPath)
			}
		}

		MA.byId('drag_back').clsHide()
		MA.byId('drop_file').clsHide()
		MA.byId('drop_folder').clsHide()
		MA.byId('drop_bad').clsHide()

		this.isFolder    = false
		this.isBad       = false
	}
}
