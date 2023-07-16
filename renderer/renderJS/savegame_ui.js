/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Detail window UI

/* eslint complexity: ["warn", 20] */
/* global fsgUtil, processL10N */

let thisCollection = null
const alwaysUsedActive = [
	'FS22_BetterContracts',
	'FS22_PrecisionFarmingAnhydrousReady',
	'FS22_precisionFarming',
]

const selectList = {
	active   : [],
	inactive : [],
	nohub    : [],
	unused   : [],
}
const selectCount = {
	active     : 0,
	dlc        : 0,
	inactive   : 0,
	isloaded   : 0,
	isused     : 0,
	missing    : 0,
	nohub      : 0,
	scriptonly : 0,
	unused     : 0,
}

window.mods.receive('fromMain_collectionName', (modCollect) => {
	thisCollection = modCollect.opts.collectKey

	fsgUtil.byId('collection_name').innerHTML     = modCollect.collectionToName[thisCollection]
	fsgUtil.byId('collection_location').innerHTML = modCollect.collectionToFolderRelative[thisCollection]

	processL10N()
})

window.mods.receive('fromMain_saveInfo', (modCollect) => {
	const savegame   = modCollect.opts.thisSaveGame
	const fullModArr = []
	const haveModSet = {}
	const modSetHTML = []

	selectList.inactive = []
	selectList.unused   = []
	selectList.nohub    = []
	selectList.active   = []

	selectCount.isloaded   = 0
	selectCount.dlc        = 0
	selectCount.missing    = 0
	selectCount.scriptonly = 0
	selectCount.isused     = 0
	selectCount.unused     = 0
	selectCount.inactive   = 0
	selectCount.nohub      = 0
	selectCount.active     = 0

	if ( savegame.errorList.length > 0 ) {
		const errors = savegame.errorList.map((error) => `<l10n name="${error[0]}"></l10n> ${error[1]}`)

		modSetHTML.push(fsgUtil.useTemplate('savegame_error', { errors : errors.join(', ')}))
	}

	for ( const thisMod of Object.values(modCollect.modList[thisCollection].mods) ) {
		haveModSet[thisMod.fileDetail.shortName] = thisMod
		fullModArr.push(thisMod.fileDetail.shortName)
	}

	const fullModSet = new Set(fullModArr.concat(Object.keys(savegame.mods)).sort((a, b) => {
		if (a.toLowerCase() < b.toLowerCase()) return -1
		if (a.toLowerCase() > b.toLowerCase()) return 1
		return 0
	}))

	for ( const thisMod of fullModSet ) {
		if ( thisMod.endsWith('.csv') ) { continue }
		const thisModDetail = {
			isDLC           : false,
			isLoaded        : false,
			isModHub        : typeof modCollect.modHub.list.mods[thisMod] !== 'undefined',
			isPresent       : false,
			isUsed          : false,
			scriptOnly      : false,
			title           : null,
			usedBy          : null,
			version         : null,
			versionMismatch : false,
		}

		
		if ( thisMod.startsWith('pdlc_')) {
			thisModDetail.isDLC     = true
			thisModDetail.isPresent = true
		}

		if ( typeof savegame.mods[thisMod] !== 'undefined' ) {
			thisModDetail.version  = savegame.mods[thisMod].version
			thisModDetail.title    = savegame.mods[thisMod].title
			thisModDetail.isLoaded = true

			if ( savegame.mods[thisMod].farms.size > 0 ) {
				thisModDetail.isUsed = true
				thisModDetail.usedBy = savegame.mods[thisMod].farms
			}
		}

		if ( typeof haveModSet[thisMod] !== 'undefined' ) {
			if ( haveModSet[thisMod].modDesc.storeItems < 1 && haveModSet[thisMod].modDesc.scriptFiles > 0 ) {
				thisModDetail.scriptOnly = true
				thisModDetail.isUsed     = thisModDetail.isLoaded
			} else if ( alwaysUsedActive.includes(thisMod) ) {
				// Catch a few special cases
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

		const thisUUID = haveModSet?.[thisMod]?.uuid
		

		if ( typeof thisUUID !== 'undefined' && thisUUID !== null ) {
			if ( thisModDetail.isUsed === false ) { selectList.unused.push(`${thisCollection}--${thisUUID}`) }
			if ( thisModDetail.isLoaded === false ) { selectList.inactive.push(`${thisCollection}--${thisUUID}`) }
			if ( thisModDetail.isModHub === false ) { selectList.nohub.push(`${thisCollection}--${thisUUID}`) }
			if ( thisModDetail.isLoaded === true ) { selectList.active.push(`${thisCollection}--${thisUUID}`) }
		}

		modSetHTML.push(makeLine(thisMod, thisModDetail, savegame.singleFarm, modCollect.modHub.list.mods[thisMod]))
	}

	fsgUtil.byId('modList').innerHTML = modSetHTML.join('')

	selectCount.nohub    = selectList.nohub.length
	selectCount.inactive = selectList.inactive.length
	selectCount.unused   = selectList.unused.length
	selectCount.active   = selectList.active.length

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

function makeLine(name, mod, singleFarm, hubID) {
	const badges       = ['versionMismatch', 'scriptOnly', 'isUsed', 'isLoaded']
	const displayBadge = []
	let colorClass     = ''

	switch ( true ) {
		case ( !mod.isPresent ) :
			colorClass = 'list-group-item-danger'
			break
		case ( mod.versionMismatch ) :
			colorClass = 'list-group-item-info'
			break
		case ( mod.isUsed ) :
			colorClass = 'list-group-item-success'
			break
		case ( mod.isLoaded ) :
			colorClass = 'list-group-item-warning'
			break
		default :
			colorClass = 'list-group-item-secondary'
			break
	}


	if ( !mod.isModHub && !mod.isDLC ) {
		displayBadge.push(['nohub', 'info'])
	}
	if ( mod.isDLC ) {
		displayBadge.push(['dlc', 'info']); selectCount.dlc++
	}
	if ( !mod.isPresent ) {
		displayBadge.push(['missing', 'danger']); selectCount.missing++
	}
	if ( !mod.isUsed ) {
		displayBadge.push(['unused', 'warning'])
	}
	if ( !mod.isLoaded ) {
		displayBadge.push(['inactive', 'warning'])
	}

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
