/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Find Window UI

/* global MA, DATA */

let fullList_data   = {}
let fullList_sort   = []
let fullList_filter = []
let filter_last     = ''
let filter_length   = 0

window.find_IPC.receive('find:filterText', (text) => {
	MA.byIdValue('mods__filter', text)
	doFilter()
})

function doFilter() {
	const filter_this = MA.byIdValueLC('mods__filter')

	MA.byId('mods__filter_clear').clsHide(filter_this === '')

	if ( filter_this === filter_last ) { return }
	if ( filter_this.length <= 2 && filter_length !== fullList_sort.length ) {
		fullList_filter = new Set(fullList_sort)
		filter_length = fullList_filter.size
		filter_last   = filter_this
		buildDisplay()
		return
	}

	const filter_new = new Set()

	for ( const key of fullList_sort ) {
		if ( fullList_data[key].search.includes(filter_this) ) {
			filter_new.add(key)
		}
	}

	if ( filter_new.size !== filter_length ) {
		fullList_filter = filter_new
		filter_length = fullList_filter.size
		filter_last   = filter_this
		buildDisplay()
	}
}

function buildObject(response) {
	fullList_data   = {}
	fullList_sort   = []
	fullList_filter = []

	const multiVersion = response.appSettings.multi_version
	const curVersion   = response.appSettings.game_version

	try {
		for ( const collectKey of response.set_Collections ) {
			if ( multiVersion && response.collectionNotes[collectKey].notes_version !== curVersion ) { continue }
			for ( const modKey of response.modList[collectKey].modSet ) {
				const mod = response.modList[collectKey].mods[modKey]
				if ( ! mod.canNotUse ) {
					fullList_data[mod.fileDetail.shortName] ??= {
						author    : DATA.escapeSpecial(mod.modDesc.author),
						collect   : [],
						icon      : mod.modDesc.iconImageCache,
						name      : mod.fileDetail.shortName,
						search    : [
							mod.fileDetail.shortName,
							DATA.escapeSpecial(mod.modDesc.author),
							DATA.escapeSpecial(mod.l10n.title),
						].join(' ').toLowerCase(),
						title     : DATA.escapeSpecial(mod.l10n.title),
					}
					fullList_data[mod.fileDetail.shortName].collect.push({
						fullId  : `${collectKey}--${mod.uuid}`,
						name    : response.collectionToName[collectKey],
						version : DATA.escapeSpecial(mod.modDesc.version),
					})
				}
			}
		}
	} catch (err) {
		window.log.warning('Failed to build search data', err.message)
	}

	fullList_sort   = Object.keys(fullList_data).sort((a, b) => a.localeCompare(b))
	fullList_filter = new Set(fullList_sort)
	filter_length   = fullList_filter.size

	buildDisplay()
}

function buildDisplay() {
	const displayNode = MA.byId('full_table')

	displayNode.innerHTML = ''

	for ( const key of fullList_sort ) {
		if ( ! fullList_filter.has(key) ) { continue }

		const item     = fullList_data[key]
		const itemNode = DATA.templateEngine('mod_entry', {
			author : item.author,
			icon   : `<img src="${DATA.iconMaker(item.icon)}" class="img-fluid">`,
			name   : item.name,
			title  : item.title,
		})

		const itemCollectNode = itemNode.querySelector('.versionList')
		for ( const cItem of item.collect ) {
			itemCollectNode.appendChild(DATA.templateEngine('version_entry', {
				name    : cItem.name,
				version : cItem.version,
			}))
		}

		itemNode.firstElementChild.addEventListener('contextmenu', () => {
			window.find_IPC.modContext(item)
		})

		displayNode.appendChild(itemNode)
	}
}

window.addEventListener('DOMContentLoaded', () => {
	window.find_IPC.all().then(buildObject)

	MA.byIdEventIfExists('mods__filter_clear', () => {
		MA.byIdValue('mods__filter', '')
		doFilter()
	})

	MA.byIdEventIfExists('mods__filter', window.find_IPC.inputContext, 'contextmenu')
	MA.byIdEventIfExists('mods__filter', doFilter, 'keyup')
})
