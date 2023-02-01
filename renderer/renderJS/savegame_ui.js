/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Detail window UI

/* global l10n, fsgUtil, bootstrap, getText */


/*  __ ____   ______        
   |  |_   | |      |.-----.
   |  |_|  |_|  --  ||     |
   |__|______|______||__|__| */

let thisCollection = null
const selectList = {
	inactive : [],
	unused   : [],
	nohub    : [],
	active   : [],
}
const selectCount = {
	dlc        : 0,
	missing    : 0,
	scriptonly : 0,
	isloaded   : 0,
	isused     : 0,
	inactive   : 0,
	unused     : 0,
	nohub      : 0,
	active     : 0,
}

function processL10N()          { clientGetL10NEntries() }
function clientGetL10NEntries() {
	const l10nSendItems = new Set()

	fsgUtil.query('l10n').forEach((thisL10nItem) => {
		l10nSendItems.add(fsgUtil.getAttribNullEmpty(thisL10nItem, 'name'))
	})

	l10n.getText_send(l10nSendItems)
}

window.l10n.receive('fromMain_getText_return', (data) => {
	fsgUtil.query(`l10n[name="${data[0]}"]`).forEach((item) => { item.innerHTML = data[1] })
})
window.l10n.receive('fromMain_getText_return_title', (data) => {
	fsgUtil.query(`l10n[name="${data[0]}"]`).forEach((item) => {
		let thisTitle = item.closest('span')
		thisTitle ??= item.closest('label')
		if ( thisTitle === null ) {
			thisTitle = item.closest('button')
		}
		thisTitle.title = data[1]
		new bootstrap.Tooltip(thisTitle)
	})
})
window.l10n.receive('fromMain_l10n_refresh', () => { processL10N() })


window.mods.receive('fromMain_collectionName', (modCollect) => {
	thisCollection = modCollect.opts.collectKey

	fsgUtil.byId('collection_name').innerHTML     = modCollect.collectionToName[thisCollection]
	fsgUtil.byId('collection_location').innerHTML = modCollect.collectionToFolderRelative[thisCollection]

	processL10N()
})

window.mods.receive('fromMain_saveInfo', (modCollect) => {
	const savegame   = modCollect.opts.thisSaveGame
	const fullModSet = new Set()
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
		const errors = []

		savegame.errorList.forEach((error) => { errors.push(`<l10n name="${error[0]}"></l10n> ${error[1]}`) })

		modSetHTML.push(`<li class="mod-item list-group-item text-center justify-content-between list-group-item-danger">
			<div class="ms-2 me-auto">
				<div class="fw-bold"><l10n name="savegame_error"></div>
				<div class="small">${errors.join(', ')}</div>
			</div>
		</li>`)
	}

	
	Object.values(modCollect.modList[thisCollection].mods).forEach((thisMod) => {
		haveModSet[thisMod.fileDetail.shortName] = thisMod
		fullModSet.add(thisMod.fileDetail.shortName)
	})

	Object.keys(savegame.mods).forEach((thisMod) => { fullModSet.add(thisMod) })

	Array.from(fullModSet).sort().forEach((thisMod) => {
		if ( thisMod.endsWith('.csv') ) { return }
		const thisModDetail = {
			title           : null,
			version         : null,
			scriptOnly      : false,
			isLoaded        : false,
			isUsed          : false,
			isPresent       : false,
			isDLC           : false,
			usedBy          : null,
			versionMismatch : false,
			isModHub        : typeof modCollect.modHub.list.mods[thisMod] !== 'undefined',
		}

		if ( thisMod.startsWith('pdlc_')) {
			thisModDetail.isDLC     = true
			thisModDetail.isPresent = true
		}

		if ( thisMod === savegame.mapMod ) {
			thisModDetail.isUsed   = true
			thisModDetail.isLoaded = true
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
			thisModDetail.isPresent = true

			if ( haveModSet[thisMod].modDesc.storeItems < 1 && haveModSet[thisMod].modDesc.scriptFiles > 0 ) {
				thisModDetail.scriptOnly = true
				if ( thisModDetail.isLoaded ) { thisModDetail.isUsed = true }
			}

			if ( thisModDetail.version === null ) {
				thisModDetail.version = haveModSet[thisMod].modDesc.version
			} else if ( thisModDetail.version !== haveModSet[thisMod].modDesc.version ) {
				thisModDetail.versionMismatch = true
			}
			thisModDetail.title = fsgUtil.escapeSpecial(haveModSet[thisMod].l10n.title)
		}

		if ( thisMod === savegame.mapMod ) {
			thisModDetail.isUsed   = true
			thisModDetail.isLoaded = true
			thisModDetail.usedBy   = null
		}

		const thisUUID = haveModSet?.[thisMod]?.uuid

		if ( typeof thisUUID !== 'undefined' && thisUUID !== null ) {
			if ( thisModDetail.isUsed === false ) {
				selectList.unused.push(`${thisCollection}--${thisUUID}`)
			}
			if ( thisModDetail.isLoaded === false ) {
				selectList.inactive.push(`${thisCollection}--${thisUUID}`)
			}
			if ( thisModDetail.isModHub === false ) {
				selectList.nohub.push(`${thisCollection}--${thisUUID}`)
			}
			if ( thisModDetail.isLoaded === true ) {
				selectList.active.push(`${thisCollection}--${thisUUID}`)
			}
		}

		modSetHTML.push(makeLine(thisMod, thisModDetail, savegame.singleFarm))
	})

	fsgUtil.byId('modList').innerHTML = modSetHTML.join('')

	selectCount.nohub    = selectList.nohub.length
	selectCount.inactive = selectList.inactive.length
	selectCount.unused   = selectList.unused.length
	selectCount.active   = selectList.active.length

	updateCounts()
	processL10N()
})

function updateCounts() {
	fsgUtil.query('.quantity').forEach((qty) => {
		const labelName = qty.parentElement.parentElement.getAttribute('for').replace('check_savegame_', '')
		qty.innerHTML = selectCount[labelName]
	})
}

function makeLine(name, mod, singleFarm) {
	const badges   = ['versionMismatch', 'scriptOnly', 'isUsed', 'isLoaded']
	const thisHTML = []
	let colorClass = ''

	if ( !mod.isPresent ) {
		colorClass = 'list-group-item-danger'
	} else if ( mod.versionMismatch ) {
		colorClass = 'list-group-item-info'
	} else if ( mod.isUsed ) {
		colorClass = 'list-group-item-success'
	} else if ( mod.isLoaded ) {
		colorClass = 'list-group-item-warning'
	} else {
		colorClass = 'list-group-item-secondary'
	}
	
	thisHTML.push(`<li class="mod-item list-group-item d-flex justify-content-between align-items-start ${colorClass}">`)
	thisHTML.push('<div class="ms-2 me-auto">')
	thisHTML.push(`<div class="fw-bold">${name}</div>`)
	thisHTML.push(`<div class="small">${mod.title}</div>`)
	if ( mod.usedBy !== null && !singleFarm ) {
		thisHTML.push(`<div class="text-black small ps-3">${getText('savegame_farms')}: ${Array.from(mod.usedBy).join(', ')}</div>`)
	}
	thisHTML.push('</div>')

	if ( !mod.isModHub && !mod.isDLC ) {
		thisHTML.push(fsgUtil.badge('info bg-gradient rounded-1 ms-1', 'savegame_nohub', true))
	}
	if ( mod.isDLC ) {
		thisHTML.push(fsgUtil.badge('info bg-gradient rounded-1 ms-1', 'savegame_dlc', true))
		selectCount.dlc++
	}
	if ( !mod.isPresent ) {
		thisHTML.push(fsgUtil.badge('danger bg-gradient rounded-1 ms-1', 'savegame_missing', true))
		selectCount.missing++
	}
	if ( !mod.isUsed ) {
		thisHTML.push(fsgUtil.badge('warning bg-gradient rounded-1 ms-1', 'savegame_unused', true))
	}
	if ( !mod.isLoaded ) {
		thisHTML.push(fsgUtil.badge('warning bg-gradient rounded-1 ms-1', 'savegame_inactive', true))
	}
	badges.forEach((badge) => {
		if ( mod[badge] === true ) {
			if ( badge === 'scriptOnly' ) { selectCount.scriptonly++ }
			if ( badge === 'isUsed' )     { selectCount.isused++ }
			if ( badge === 'isLoaded' )   { selectCount.isloaded++ }
			thisHTML.push(fsgUtil.badge('dark bg-gradient rounded-1 ms-1', `savegame_${badge.toLowerCase()}`, true))
		}
	})

	thisHTML.push('</li>')

	return thisHTML.join('')
}


function clientSelectMain(type) {
	if ( selectList[type].length > 0 ) {
		window.mods.selectInMain(selectList[type])
	}
}

function clientChangeFilter() {
	const filtersActive = fsgUtil.query('.filter_only:checked').length
	const modItems      = fsgUtil.query('.mod-item')
	const filters = {
		dlc        : false,
		missing    : false,
		scriptonly : false,
		isloaded   : false,
		isused     : false,
		inactive   : false,
		unused     : false,
		nohub      : false,
	}

	if ( filtersActive === 0 ) {
		modItems.forEach((modItem) => { modItem.classList.remove('d-none') })
	} else {
		const activeFilters = []
		Object.keys(filters).forEach((key) => {
			if ( fsgUtil.byId(`check_savegame_${key}`).checked ) { activeFilters.push(key)}
		})
		modItems.forEach((modItem) => {
			let badgesFound = 0
			activeFilters.forEach((thisFilter) => {
				if ( modItem.querySelector(`[name="savegame_${thisFilter}"]`) !== null ) {
					badgesFound++
				}
			})
			modItem.classList[( badgesFound === activeFilters.length ) ? 'remove' : 'add']('d-none')
		})
	}
}

window.addEventListener('click', () => {
	fsgUtil.query('.tooltip').forEach((tooltip) => { tooltip.remove() })
})