/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Detail window UI

/* global fsgUtil, processL10N */

let thisCollection = null
/* CSpell: disable */
const alwaysUsedActive = new Set([
	'FS22_BetterContracts',
	'FS22_PrecisionFarmingAnhydrousReady',
	'FS22_precisionFarming',
])

const consumableOnly = new Set([
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


const empty_list = () => { return {
	active   : [],
	inactive : [],
	nohub    : [],
	unused   : [],
} }

const empty_count = () => { return {
	active     : 0,
	dlc        : 0,
	inactive   : 0,
	isloaded   : 0,
	isused     : 0,
	missing    : 0,
	nohub      : 0,
	scriptonly : 0,
	unused     : 0,
}}

const final_count = () => {
	selectCount.nohub    = selectList.nohub.length
	selectCount.inactive = selectList.inactive.length
	selectCount.unused   = selectList.unused.length
	selectCount.active   = selectList.active.length
}

const getFarms   = (modFarms, allFarms) => {
	if ( modFarms.size === 0 ) { return null }
	return [...modFarms].map((x) => allFarms[x])
}
const scriptOnly = (modDesc) => ( modDesc.storeItems < 1 && modDesc.scriptFiles > 0 )

const newRecord = (isMH) => { return {
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

const buildSets = (mods, save_mods) => {
	const haveModSet  = {}
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

const updateSelectList = (thisModDetail, thisUUID) => {
	if ( thisUUID === null ) { return }
	if ( thisModDetail.isUsed === false ) { selectList.unused.push(`${thisCollection}--${thisUUID}`) }
	if ( thisModDetail.isLoaded === false ) { selectList.inactive.push(`${thisCollection}--${thisUUID}`) }
	if ( thisModDetail.isModHub === false ) { selectList.nohub.push(`${thisCollection}--${thisUUID}`) }
	if ( thisModDetail.isLoaded === true ) { selectList.active.push(`${thisCollection}--${thisUUID}`) }
}



const buildSaveInfo = () => {
	const detailSend = { collectKey : thisCollection, modList : {} }
	const modCollect = cacheSaveGame
	const savegame   = modCollect.opts.thisSaveGame
	const isCSV      = savegame.mapMod === 'csvLoaded'
	const {haveModSet, fullModSet} = buildSets(modCollect.modList[thisCollection].mods, Object.keys(savegame.mods))
	const modSetHTML = []

	selectList  = empty_list()
	selectCount = empty_count()

	if ( savegame.errorList.length !== 0 ) {
		const errors = savegame.errorList.map((error) => `<l10n name="${error[0]}"></l10n> ${error[1]}`)

		modSetHTML.push(fsgUtil.useTemplate('savegame_error', { errors : errors.join(', ')}))
	}

	for ( const thisMod of fullModSet ) {
		if ( thisMod.endsWith('.csv') ) { continue }
		const thisModDetail = newRecord(Object.hasOwn(modCollect.modHub.list.mods, thisMod))
		
		if ( thisMod.startsWith('pdlc_')) {
			thisModDetail.isDLC     = true
			thisModDetail.isPresent = true
		}

		if ( Object.hasOwn(savegame.mods, thisMod) ) {
			thisModDetail.version  = savegame.mods[thisMod].version
			thisModDetail.title    = savegame.mods[thisMod].title
			thisModDetail.isLoaded = true
			thisModDetail.isUsed   = isCSV || savegame.mods[thisMod].farms.size !== 0
			thisModDetail.usedBy   = getFarms(savegame.mods[thisMod].farms, savegame.farms)
		}

		if ( typeof haveModSet[thisMod] === 'object' ) {
			thisModDetail.scriptOnly = scriptOnly(haveModSet[thisMod].modDesc)
			thisModDetail.consumable = consumableOnly.has(thisMod)

			if ( scriptOnly(haveModSet[thisMod].modDesc) || alwaysUsedActive.has(thisMod) || consumableOnly.has(thisMod) ) {
				thisModDetail.isUsed     = thisModDetail.isLoaded
			}

			thisModDetail.isPresent         = true
			thisModDetail.version         ??= haveModSet[thisMod].modDesc.version
			thisModDetail.versionMismatch   = ( thisModDetail.version !== haveModSet[thisMod].modDesc.version )
			thisModDetail.title             = fsgUtil.escapeSpecial(haveModSet[thisMod].l10n.title)
		}

		if ( thisMod === savegame.mapMod ) {
			thisModDetail.isUsed   = true
			thisModDetail.isLoaded = true
			thisModDetail.usedBy   = null
		}

		updateSelectList(thisModDetail, haveModSet?.[thisMod]?.uuid ?? null)

		detailSend.modList[thisMod] = thisModDetail
		modSetHTML.push(makeLine(thisMod, thisModDetail, savegame.singleFarm, modCollect.modHub.list.mods[thisMod]))
	}

	window.mods.cacheDetails(detailSend)
	fsgUtil.setById('modList', modSetHTML)

	final_count()
	updateCounts()
	processL10N()
}

const setHeader = (collectKey) => {
	fsgUtil.setById('collection_name',  collectKey === null ? '--' : cacheSaveGame.collectionToName[thisCollection])
	fsgUtil.setById('collection_location',  collectKey === null ? '--' : cacheSaveGame.collectionToFolderRelative[thisCollection])
}

let cacheSaveGame = null
let selectList    = null
let selectCount   = null

window.mods.receive('fromMain_collectionName', (modCollect) => {
	cacheSaveGame  = modCollect
	thisCollection = modCollect.opts.collectKey

	setHeader(thisCollection)

	if ( thisCollection === null ) {
		const checkVer   = modCollect.appSettings.game_version
		const selectHTML = [
			fsgUtil.buildSelectOpt('--', '--', '--')
		]

		for ( const collectKey of modCollect.set_Collections ) {
			if ( checkVer === false || modCollect.collectionNotes[collectKey].notes_version === checkVer ) {
				selectHTML.push(fsgUtil.buildSelectOpt(collectKey, modCollect.collectionToFullName[collectKey]), '--')
			}
		}
		fsgUtil.clsHide('loadButtons')
		fsgUtil.clsShow('pickCollect')
		fsgUtil.setById('pickCollectSelect', selectHTML)
	} else {
		fsgUtil.clsShow('loadButtons')
		fsgUtil.clsHide('pickCollect')
	}
	processL10N()
})

window.mods.receive('fromMain_saveInfo', (modCollect) => {
	cacheSaveGame = modCollect
	buildSaveInfo()
})

function clientPickCollect() {
	const collectKey = fsgUtil.valueById('pickCollectSelect')
	if ( collectKey !== '--' ) {
		thisCollection = collectKey
		setHeader(thisCollection)
		buildSaveInfo()
	}
}

function updateCounts() {
	for ( const element of fsgUtil.query('[data-for^="check_savegame"]') ) {
		const labelName = element.getAttribute('data-for').replace('check_savegame_', '')
		const quantity  = element.querySelector('.quantity')
		quantity.innerHTML = selectCount[labelName]
	}
	for ( const element of fsgUtil.query('[for^="check_savegame"]') ) {
		const labelName = element.getAttribute('for').replace('check_savegame_', '')
		const quantity  = element.querySelector('.quantity')
		quantity.innerHTML = selectCount[labelName]
	}
}

function getColor(mod) {
	if ( !mod.isPresent )      { return 'list-group-item-danger' }
	if ( mod.versionMismatch ) { return 'list-group-item-info' }
	if ( mod.isUsed )          { return 'list-group-item-success' }
	if ( mod.isLoaded )        { return 'list-group-item-warning' }
	return 'list-group-item-secondary'
}

function getBadges(mod) {
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

function makeLine(name, mod, singleFarm, hubID) {
	const badges       = ['versionMismatch', 'consumable', 'scriptOnly', 'isUsed', 'isLoaded']
	const displayBadge = getBadges(mod)
	const colorClass   = getColor(mod)

	if ( mod.isDLC )      { selectCount.dlc++ }
	if ( !mod.isPresent ) { selectCount.missing++ }

	for ( const badge of badges ) {
		if ( mod[badge] === true ) {
			if ( badge === 'scriptOnly' ) { selectCount.scriptonly++ }
			if ( badge === 'isUsed' )     { selectCount.isused++ }
			if ( badge === 'isLoaded' )   { selectCount.isloaded++ }
			displayBadge.push([badge.toLowerCase(), 'dark'])
		}
	}

	return fsgUtil.useTemplate('savegame_mod', {
		badges        : displayBadge.map((part) => fsgUtil.badge(`${part[1]} bg-gradient rounded-1 ms-1`, `savegame_${part[0]}`, true)).join(''),
		colorClass    : colorClass,
		farms         : mod.usedBy !== null ? [...mod.usedBy].join(', ') : '',
		hideShowFarms : ( mod.usedBy !== null && !singleFarm ) ? '' : 'd-none',
		hubID         : hubID,
		hubIDHide     : typeof hubID !== 'undefined' ? '' : 'd-none',
		name          : name,
		title         : mod.title,
	})
}

function clientCopyVisible() {
	const shownMods = fsgUtil.queryA('.mod-item').filter((x) => !x.classList.contains('d-none')).map((x) => x.querySelector('.fw-bold').innerHTML)
	window.mods.popClipboard(shownMods.join('\n'))
}

function clientSelectMain(type) {
	if ( selectList[type].length !== 0 ) {
		window.mods.selectInMain(selectList[type])
	}
}

function clientChangeFilter() {
	const filtersActive = fsgUtil.query('.filter_only:checked').length
	const modItems      = fsgUtil.query('.mod-item')
	const filters = ['dlc', 'missing', 'scriptonly', 'isloaded', 'isused', 'inactive', 'unused', 'nohub']

	if ( filtersActive === 0 ) {
		for ( const modItem of modItems ) { modItem.classList.remove('d-none') }
	} else {
		const activeFilters = filters.filter((key) => fsgUtil.byId(`check_savegame_${key}`).checked )
		
		for ( const modItem of modItems ) {
			let allBadgesFound = true
			for ( const thisFilter of activeFilters ) {
				if ( modItem.querySelector(`[name="savegame_${thisFilter}"]`) === null ) {
					allBadgesFound = false
					break
				}
			}
			modItem.classList[( allBadgesFound ) ? 'remove' : 'add']('d-none')
		}
	}
}


window.addEventListener('DOMContentLoaded', () => {
	const dragTarget = fsgUtil.byId('drag_target')

	dragTarget.addEventListener('dragenter', clientDragEnter )
	dragTarget.addEventListener('dragleave', clientDragLeave )
	dragTarget.addEventListener('dragover',  clientDragOver )
	dragTarget.addEventListener('drop',      clientDragDrop )
})

let dragDropOperation = false
let dragDropIsFolder = false
let dragDropIsBad    = false

function clientDragDrop(e) {
	e.preventDefault()
	e.stopPropagation()

	dragDropOperation = false
	if ( !dragDropIsBad ) {
		const dt    = e.dataTransfer
		const files = dt.files

		const thisPath = files[0].path

		if ( dragDropIsFolder ) {
			window.mods.openDropFolder(thisPath)
		} else {
			window.mods.openDropZIP(thisPath)
		}
	}

	fsgUtil.clsHide('drag_back')
	fsgUtil.clsHide('drop_file')
	fsgUtil.clsHide('drop_folder')
	fsgUtil.clsHide('drop_bad')

	dragDropIsFolder    = false
	dragDropIsBad       = false
}

function clientDragLeave(e) {
	e.preventDefault()
	e.stopPropagation()

	if ( e.x <= 0 && e.y <= 0 ) {
		dragDropOperation   = false
		dragDropIsFolder    = false
		dragDropIsBad       = false
		fsgUtil.clsHide('drag_back')
		fsgUtil.clsHide('drop_file')
		fsgUtil.clsHide('drop_folder')
		fsgUtil.clsHide('drop_bad')
	}
}

function clientDragEnter(e) {
	e.preventDefault()
	e.stopPropagation()

	
	if ( !dragDropOperation ) {
		fsgUtil.clsShow('drag_back')
	
		if ( e.dataTransfer.items.length === 1 && e.dataTransfer.items[0].type === '' ) {
			fsgUtil.clsShow('drop_folder')
			dragDropIsFolder = true
		} else if ( e.dataTransfer.items.length === 1 && e.dataTransfer.items[0].type === 'application/x-zip-compressed' ) {
			fsgUtil.clsShow('drop_file')
		} else {
			fsgUtil.clsShow('drop_bad')
			dragDropIsBad = true
		}
	}

	dragDropOperation = true
}

function clientDragOver(e) {
	e.preventDefault()
	e.stopPropagation()

	e.dataTransfer.dropEffect = 'copy'
}
