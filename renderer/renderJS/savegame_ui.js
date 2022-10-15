/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Detail window UI

/* global l10n, fsgUtil, bootstrap */


/*  __ ____   ______        
   |  |_   | |      |.-----.
   |  |_|  |_|  --  ||     |
   |__|______|______||__|__| */

let thisCollection = null

function processL10N()          { clientGetL10NEntries() }
function clientGetL10NEntries() {
	const l10nSendItems = new Set()

	fsgUtil.query('l10n').forEach((thisL10nItem) => {
		l10nSendItems.add(fsgUtil.getAttribNullError(thisL10nItem, 'name'))
	})

	l10n.getText_send(l10nSendItems)
}

window.l10n.receive('fromMain_getText_return', (data) => {
	fsgUtil.query(`l10n[name="${data[0]}"]`).forEach((item) => { item.innerHTML = data[1] })
})
window.l10n.receive('fromMain_getText_return_title', (data) => {
	fsgUtil.query(`l10n[name="${data[0]}"]`).forEach((item) => {
		item.closest('span').title = data[1]
		new bootstrap.Tooltip(item.closest('span'))
	})
})
window.l10n.receive('fromMain_l10n_refresh', () => { processL10N() })


window.mods.receive('fromMain_collectionName', (collection, modList) => {
	thisCollection = collection

	fsgUtil.byId('collection_name').innerHTML     = modList[collection].name
	fsgUtil.byId('collection_location').innerHTML = modList[collection].fullPath

	processL10N()
})

window.mods.receive('fromMain_saveInfo', (modList, savegame) => {
	const fullModSet       = new Set()
	const haveModSet       = {}
	const modSetHTML       = []

	modList[thisCollection].mods.forEach((thisMod) => {
		haveModSet[thisMod.fileDetail.shortName] = thisMod
		fullModSet.add(thisMod.fileDetail.shortName)
	})

	Object.keys(savegame.mods).forEach((thisMod) => { fullModSet.add(thisMod) })

	Array.from(fullModSet).sort().forEach((thisMod) => {
		const thisModDetail = {
			title           : null,
			version         : null,
			scriptOnly      : false,
			isLoaded        : false,
			isUsed          : false,
			isPresent       : false,
			usedBy          : null,
			versionMismatch : false,
		}

		if ( thisMod === savegame.mapMod ) {
			thisModDetail.isUsed = true
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
			thisModDetail.title = haveModSet[thisMod].l10n.title
		}

		if ( thisMod === savegame.mapMod ) {
			thisModDetail.isUsed   = true
			thisModDetail.isLoaded = true
			thisModDetail.usedBy   = null
		}
		modSetHTML.push(makeLine(thisMod, thisModDetail))
	})

	fsgUtil.byId('modList').innerHTML = modSetHTML.join('')

	processL10N()
})

function makeLine(name, mod) {
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
	
	thisHTML.push(`<li class="list-group-item d-flex justify-content-between align-items-start ${colorClass}">`)
	thisHTML.push('<div class="ms-2 me-auto">')
	thisHTML.push(`<div class="fw-bold">${name}</div>`)
	thisHTML.push(`<div class="small">${mod.title}</div>`)
	if ( mod.usedBy !== null ) {
		thisHTML.push(`<div class="text-black small ps-3"><l10n name="savegame_farms"></l10n>: ${Array.from(mod.usedBy).join(', ')}</div>`)
	}
	thisHTML.push('</div>')

	if ( !mod.isPresent ) {
		thisHTML.push('<span class="badge bg-danger bg-gradient rounded-1 ms-1"><l10n name="savegame_missing"></l10n></span>')
	}
	if ( !mod.isLoaded ) {
		thisHTML.push('<span class="badge bg-warning bg-gradient rounded-1 ms-1"><l10n name="savegame_inactive"></l10n></span>')
	}
	badges.forEach((badge) => {
		if ( mod[badge] === true ) {
			thisHTML.push(`<span class="badge bg-dark bg-gradient rounded-1 ms-1"><l10n name="savegame_${badge.toLowerCase()}"></l10n></span>`)
		}
	})

	thisHTML.push('</li>')

	return thisHTML.join('')
}
