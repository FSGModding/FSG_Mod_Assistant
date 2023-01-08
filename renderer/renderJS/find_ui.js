/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main Window UI

/* global l10n, fsgUtil, bootstrap*/


/*  __ ____   ______        
   |  |_   | |      |.-----.
   |  |_|  |_|  --  ||     |
   |__|______|______||__|__| */

function processL10N()          { clientGetL10NEntries() }
function clientChangeL10N()     { l10n.langList_change(fsgUtil.byId('language_select').value) }
function clientGetL10NEntries() {
	const l10nSendItems = new Set()

	fsgUtil.query('l10n').forEach((thisL10nItem) => {
		l10nSendItems.add(fsgUtil.getAttribNullError(thisL10nItem, 'name'))
	})

	l10n.getText_send(l10nSendItems)
}

window.l10n.receive('fromMain_langList_return', (listData, selected) => {
	fsgUtil.byId('language_select').innerHTML = listData.map((x) => {
		return fsgUtil.buildSelectOpt(x[0], x[1], selected)
	}).join('')
})
window.l10n.receive('fromMain_getText_return', (data) => {
	fsgUtil.query(`l10n[name="${data[0]}"]`).forEach((item) => { item.innerHTML = data[1] })
})
window.l10n.receive('fromMain_getText_return_title', (data) => {
	fsgUtil.query(`l10n[name="${data[0]}"]`).forEach((item) => {
		const buttonItem = item.closest('button')
		if ( buttonItem !== null ) {
			buttonItem.title = data[1]
			new bootstrap.Tooltip(buttonItem)
		} else {
			item.parentElement.title = data[1]
			new bootstrap.Tooltip(item.parentElement)
		}
	})
})
window.l10n.receive('fromMain_l10n_refresh', () => { processL10N() })

let fullList     = {}
let fullListSort = []

window.mods.receive('fromMain_modRecords', (modList) => {
	fullList = {}
	Object.keys(modList).forEach((collection) => {
		
		modList[collection].mods.forEach((mod) => {
			if ( ! mod.canNotUse ) {
				fullList[mod.fileDetail.shortName] ??= {
					name      : mod.fileDetail.shortName,
					title     : mod.l10n.title,
					author    : mod.modDesc.author,
					icon      : mod.modDesc.iconImageCache,
					collect   : [],
				}
				fullList[mod.fileDetail.shortName].collect.push({
					version : mod.modDesc.version,
					name    : modList[collection].name,
					fullId  : `${collection}--${mod.uuid}`,
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

window.addEventListener('click', () => {
	fsgUtil.query('.tooltip').forEach((tooltip) => { tooltip.remove() })
})



