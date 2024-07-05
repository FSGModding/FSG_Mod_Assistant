/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main Window UI

/* global MA */

let fullList     = {}
let fullListSort = []

// window.mods.receive('fromMain_modRecords', (modCollect) => {
// 	fullList = {}

// 	const multiVersion = modCollect.appSettings.multi_version
// 	const curVersion   = modCollect.appSettings.game_version

// 	try {
// 		for ( const collectKey of modCollect.set_Collections ) {
// 			if ( multiVersion && modCollect.collectionNotes[collectKey].notes_version !== curVersion ) { continue }
// 			for ( const modKey of modCollect.modList[collectKey].modSet ) {
// 				const mod = modCollect.modList[collectKey].mods[modKey]
// 				if ( ! mod.canNotUse ) {
// 					fullList[mod.fileDetail.shortName] ??= {
// 						author    : fsgUtil.escapeSpecial(mod.modDesc.author),
// 						collect   : [],
// 						icon      : mod.modDesc.iconImageCache,
// 						name      : mod.fileDetail.shortName,
// 						title     : fsgUtil.escapeSpecial(mod.l10n.title),
// 					}
// 					fullList[mod.fileDetail.shortName].collect.push({
// 						fullId  : `${collectKey}--${mod.uuid}`,
// 						name    : modCollect.collectionToName[collectKey],
// 						version : fsgUtil.escapeSpecial(mod.modDesc.version),
// 					})
// 				}
// 			}
// 		}
// 	} catch (err) {
// 		window.log.warning(`Failed to build search data :: ${err}`, 'find-ui')
// 	}
	
// 	fullListSort = Object.keys(fullList).sort((a, b) => a.localeCompare(b))

// 	fsgUtil.setById('full_table', fullListSort.map((key) => makeModRow(fullList[key])))
// })

// const makeModRow = (thisMod) => fsgUtil.useTemplate('mod_entry', {
// 	author   : thisMod.author,
// 	icon     : fsgUtil.iconMaker(thisMod.icon),
// 	id       : `${thisMod.name}__mod`,
// 	name     : thisMod.name,
// 	search   : `${thisMod.name} ${thisMod.author} ${thisMod.title}`.toLowerCase(),
// 	title    : thisMod.title,
// 	versions : thisMod.collect.map((collection) => fsgUtil.useTemplate('version_entry', {
// 		name    : collection.name,
// 		version : collection.version,
// 	})).join(''),
// })

window.find_IPC.receive('find:filterText', (text) => {
	MA.byIdValue('mods__filter', text)
	doFilter()
})

function doClear() {
	MA.byIdValue('mods__filter', '')
	doFilter()
}



function doFilter() {
	const filterText = fsgUtil.valueByIdLC('mods__filter')

	fsgUtil.clsShowTrue('mods__filter_clear', filterText !== '' )

	fsgUtil.clsRemoveFromAll('#full_table tr.d-none', 'd-none')

	fsgUtil.clsAddToAll('#full_table tr', 'd-none', (element) => {
		return filterText.length > 1 && !element.querySelector('.search-string').getAttribute('data-search').includes(filterText)
	})
}

function clientRightClick(id) {
	if ( Object.hasOwn(fullList, id) ) { window.mods.rightClick(fullList[id]) }
}

window.addEventListener('DOMContentLoaded', () => {
	//window.find_IPC.
})
