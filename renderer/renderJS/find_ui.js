/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main Window UI

/* global processL10N, fsgUtil*/

//TODO : make version aware

let fullList     = {}
let fullListSort = []

window.mods.receive('fromMain_modRecords', (modCollect) => {
	fullList = {}
	modCollect.set_Collections.forEach((collectKey) => {
		modCollect.modList[collectKey].modSet.forEach((modKey) => {
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
		})
	})
	
	fullListSort = Object.keys(fullList).sort( (a, b) => {
		if (a.toLowerCase() < b.toLowerCase()) return -1
		if (a.toLowerCase() > b.toLowerCase()) return 1
		return 0
	})

	const modTable = []

	fullListSort.forEach((key) => {
		modTable.push(makeModRow(fullList[key]))
	})

	fsgUtil.byId('full_table').innerHTML = modTable.join('')
})


function makeModRow(thisMod) {
	const id       = `${thisMod.name}__mod`
	const versions = []

	thisMod.collect.forEach((collection) => {
		versions.push(`<dt class="col-9 mb-1 overflow-hidden">${collection.name}</dt><dd class="col-3 mb-1 ps-1">${collection.version}</dd>`)
	})

	return `<tr id="${id}">
	<td style="width: 64px; height: 64px">
		<img class="img-fluid" src="${fsgUtil.iconMaker(thisMod.icon)}" />
	</td>
	<td>
		<div class="search-string">${thisMod.name}<br /><small>${thisMod.title} - <em>${thisMod.author}</em></small></div>
	</td>
	<td class="text-end pe-4">
		<small><dl class="row g-0">${versions.join('')}</dl></small>
	</td>
</tr>`
}

function clientClearInput() {
	fsgUtil.byId('mods__filter').value = ''
	clientFilter()
}

function clientFilter() {
	const filterText = fsgUtil.byId('mods__filter').value.toLowerCase()

	fsgUtil.byId('mods__filter_clear').classList[( filterText !== '' ) ? 'remove':'add']('d-none')

	fsgUtil.byId('full_table').querySelectorAll('tr').forEach((element) => {
		element.classList.remove('d-none')
		if ( filterText.length > 1 ) {
			const searchText = element.querySelector('.search-string').innerText.toLowerCase()
			if ( !searchText.includes(filterText) ) {
				element.classList.add('d-none')
			}
		}
	})
}

function clientRightClick(id) {
	const thisMod = fullList[id.replace('__mod', '')]

	if ( typeof thisMod !== 'undefined' ) {
		window.mods.rightClick({
			name    : thisMod.name,
			collect : thisMod.collect,
		})
	}
}
window.addEventListener('DOMContentLoaded', () => {
	processL10N()
	document.getElementById('full_table').addEventListener('contextmenu', (e) => {
		clientRightClick(e.target.closest('tr').id)
	})
})
