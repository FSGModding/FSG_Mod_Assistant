/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Detail window UI

/* global l10n, fsgUtil */


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
window.l10n.receive('fromMain_l10n_refresh', () => { processL10N() })


window.mods.receive('fromMain_collectionName', (collection, modList) => {
	thisCollection = collection

	fsgUtil.byId('collection_name').innerHTML     = modList[collection].name
	fsgUtil.byId('collection_location').innerHTML = modList[collection].fullPath

	processL10N()
})

window.mods.receive('fromMain_saveInfo', (modList, savegame) => {
	const fullModSet = new Set()
	const haveModSet = {}
	const fullModSetDetail = {}

	modList[thisCollection].mods.forEach((thisMod) => {
		haveModSet[thisMod.fileDetail.shortName] = thisMod
		fullModSet.add(thisMod.fileDetail.shortName)
	})

	Object.keys(savegame.mods).forEach((thisMod) => { fullModSet.add(thisMod) })

	Array.from(fullModSet).sort((a, b) => a - b).forEach((thisMod) => {
		fullModSetDetail[thisMod] = {
			title           : null,
			version         : null,
			scriptOnly      : false,
			isLoaded        : false,
			isUsed          : false,
			isPresent       : false,
			usedBy          : null,
			versionMismatch : false,
		}
		if ( typeof savegame.mods[thisMod] !== 'undefined' ) {
			fullModSetDetail[thisMod].version  = savegame.mods[thisMod].version
			fullModSetDetail[thisMod].title    = savegame.mods[thisMod].title
			fullModSetDetail[thisMod].isLoaded = true
			if ( savegame.mods[thisMod].farms.size > 0 ) {
				fullModSetDetail[thisMod].isUsed = true
				fullModSetDetail[thisMod].usedBy = savegame.mods[thisMod].farms
			}
		}
		if ( typeof haveModSet[thisMod] !== 'undefined' ) {
			fullModSetDetail[thisMod].isPresent = true
			if ( haveModSet[thisMod].modDesc.storeItems < 1 && haveModSet[thisMod].modDesc.scriptFiles > 0 ) {
				fullModSetDetail[thisMod].scriptOnly = true
				if ( fullModSet[thisMod].isLoaded ) {
					fullModSetDetail[thisMod].isUsed = true
				}
			}
			if ( fullModSetDetail[thisMod].version === null ) {
				fullModSetDetail[thisMod].version = haveModSet[thisMod].modDesc.version
			} else if ( fullModSetDetail[thisMod].version !== haveModSet[thisMod].modDesc.version ) {
				fullModSetDetail[thisMod].versionMismatch = true
			}
			fullModSetDetail[thisMod].title = haveModSet[thisMod].l10n.title
		}
	})

	console.log(fullModSetDetail)

	processL10N()
})
