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
	if ( modFarms.size < 1 ) { return null }
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
		fullModSet : new Set(fullModArr.concat(save_mods).sort(Intl.Collator().compare)),
	}
}

const updateSelectList = (thisModDetail, thisUUID) => {
	if ( thisUUID === null ) { return }
	if ( thisModDetail.isUsed === false ) { selectList.unused.push(`${thisCollection}--${thisUUID}`) }
	if ( thisModDetail.isLoaded === false ) { selectList.inactive.push(`${thisCollection}--${thisUUID}`) }
	if ( thisModDetail.isModHub === false ) { selectList.nohub.push(`${thisCollection}--${thisUUID}`) }
	if ( thisModDetail.isLoaded === true ) { selectList.active.push(`${thisCollection}--${thisUUID}`) }
}

let selectList  = null
let selectCount = null

window.mods.receive('fromMain_collectionName', (modCollect) => {
	thisCollection = modCollect.opts.collectKey

	fsgUtil.byId('collection_name').innerHTML     = modCollect.collectionToName[thisCollection]
	fsgUtil.byId('collection_location').innerHTML = modCollect.collectionToFolderRelative[thisCollection]

	processL10N()
})

window.mods.receive('fromMain_saveInfo', (modCollect) => {
	const savegame   = modCollect.opts.thisSaveGame
	const {haveModSet, fullModSet} = buildSets(modCollect.modList[thisCollection].mods, Object.keys(savegame.mods))
	const modSetHTML = []

	selectList  = empty_list()
	selectCount = empty_count()

	if ( savegame.errorList.length > 0 ) {
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
			thisModDetail.isUsed   = savegame.mods[thisMod].farms.size > 0
			thisModDetail.usedBy   = getFarms(savegame.mods[thisMod].farms, savegame.farms)
		}

		if ( typeof haveModSet[thisMod] !== 'undefined' ) {
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

		modSetHTML.push(makeLine(thisMod, thisModDetail, savegame.singleFarm, modCollect.modHub.list.mods[thisMod]))
	}

	fsgUtil.byId('modList').innerHTML = modSetHTML.join('')

	final_count()
	updateCounts()
	processL10N()
})

function updateCounts() {
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
		farms         : mod.usedBy !== null ? Array.from(mod.usedBy).join(', ') : '',
		hideShowFarms : ( mod.usedBy !== null && !singleFarm ) ? '' : 'd-none',
		hubID         : hubID,
		hubIDHide     : typeof hubID !== 'undefined' ? '' : 'd-none',
		name          : name,
		title         : mod.title,
	})
}


function clientSelectMain(type) {
	if ( selectList[type].length > 0 ) {
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

	fsgUtil.byId('drag_back').classList.add('d-none')

	fsgUtil.byId('drop_file').classList.add('d-none')
	fsgUtil.byId('drop_folder').classList.add('d-none')
	fsgUtil.byId('drop_bad').classList.add('d-none')

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
		fsgUtil.byId('drag_back').classList.add('d-none')

		fsgUtil.byId('drop_file').classList.add('d-none')
		fsgUtil.byId('drop_folder').classList.add('d-none')
		fsgUtil.byId('drop_bad').classList.add('d-none')
	}
}

function clientDragEnter(e) {
	e.preventDefault()
	e.stopPropagation()

	
	if ( !dragDropOperation ) {
		fsgUtil.byId('drag_back').classList.remove('d-none')
	
		if ( e.dataTransfer.items.length === 1 && e.dataTransfer.items[0].type === '' ) {
			fsgUtil.byId('drop_folder').classList.remove('d-none')
			dragDropIsFolder = true
		} else if ( e.dataTransfer.items.length === 1 && e.dataTransfer.items[0].type === 'application/x-zip-compressed' ) {
			fsgUtil.byId('drop_file').classList.remove('d-none')
		} else {
			fsgUtil.byId('drop_bad').classList.remove('d-none')
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
