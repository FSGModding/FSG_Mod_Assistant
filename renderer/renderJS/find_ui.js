/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main Window UI

/* global processL10N, fsgUtil*/

let fullList     = {}
let fullListSort = []

window.mods.receive('fromMain_modRecords', (modCollect) => {
	fullList = {}

	const multiVersion = modCollect.appSettings.multi_version
	const curVersion   = modCollect.appSettings.game_version

	for ( const collectKey of modCollect.set_Collections ) {
		if ( multiVersion && modCollect.collectionNotes[collectKey].notes_version !== curVersion ) { continue }
		for ( const modKey of modCollect.modList[collectKey].modSet ) {
			const mod = modCollect.modList[collectKey].mods[modKey]
			if ( ! mod.canNotUse ) {
				fullList[mod.fileDetail.shortName] ??= {
					name      : mod.fileDetail.shortName,
					title     : fsgUtil.escapeSpecial(mod.l10n.title),
					author    : fsgUtil.escapeSpecial(mod.modDesc.author),
					icon      : mod.modDesc.iconImageCache,
					collect   : [],
				}
				fullList[mod.fileDetail.shortName].collect.push({
					version : fsgUtil.escapeSpecial(mod.modDesc.version),
					name    : modCollect.collectionToName[collectKey],
					fullId  : `${collectKey}--${mod.uuid}`,
				})
			}
		}
	}
	
	fullListSort = Object.keys(fullList).sort( (a, b) => {
		if (a.toLowerCase() < b.toLowerCase()) return -1
		if (a.toLowerCase() > b.toLowerCase()) return 1
		return 0
	})

	fsgUtil.byId('full_table').innerHTML = fullListSort.map((key) => makeModRow(fullList[key])).join('')
})

const makeModRow = (thisMod) => fsgUtil.useTemplate('mod_entry', {
	id       : `${thisMod.name}__mod`,
	icon     : fsgUtil.iconMaker(thisMod.icon),
	name     : thisMod.name,
	title    : thisMod.title,
	author   : thisMod.author,
	versions : thisMod.collect.map((collection) => fsgUtil.useTemplate('version_entry', {
		name    : collection.name,
		version : collection.version,
	})).join(''),
})

function clientClearInput() {
	fsgUtil.byId('mods__filter').value = ''
	clientFilter()
}

function clientFilter() {
	const filterText = fsgUtil.byId('mods__filter').value.toLowerCase()

	fsgUtil.byId('mods__filter_clear').classList[( filterText !== '' ) ? 'remove':'add']('d-none')

	for ( const element of fsgUtil.queryA('#full_table tr') ){
		let foundText = true
		if ( filterText.length > 1 ) {
			const searchText = element.querySelector('.search-string').innerText.toLowerCase()
			foundText = searchText.includes(filterText)
		}
		element.classList[foundText?'remove':'add']('d-none')
	}
}

function clientRightClick(id) {
	const thisMod = fullList[id]

	if ( typeof thisMod !== 'undefined' ) { window.mods.rightClick(thisMod) }
}

window.addEventListener('DOMContentLoaded', () => { processL10N() })
