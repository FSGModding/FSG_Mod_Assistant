/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */
// MARK: FIND UI

/* global MA, DATA */

// MARK: PAGE LOAD
window.addEventListener('DOMContentLoaded', () => {
	window.state = new windowState()
})

class windowState {
	fullList_data   = {}
	fullList_sort   = []
	fullList_filter = []
	filter_last     = ''
	filter_length   = 0

	constructor() {
		window.find_IPC.all().then((results) => { this.buildObject(results) })

		MA.byIdEventIfExists('mods__filter_clear', () => {
			MA.byIdValue('mods__filter', '')
			this.doFilter()
		})

		MA.byIdEventIfExists('mods__filter', window.find_IPC.inputContext, 'contextmenu')
		MA.byIdEventIfExists('mods__filter', () => { this.doFilter() }, 'keyup')

		// MARK: force filter
		window.find_IPC.receive('find:filterText', (text) => {
			MA.byIdValue('mods__filter', text)
			this.doFilter()
		})
	}

	// MARK: doFilter
	doFilter() {
		const filter_this = MA.byIdValueLC('mods__filter')

		MA.byId('mods__filter_clear').clsHide(filter_this === '')

		if ( filter_this === this.filter_last ) { return }
		if ( filter_this.length <= 2 && this.filter_length !== this.fullList_sort.length ) {
			this.fullList_filter = new Set(this.fullList_sort)
			this.filter_length = this.fullList_filter.size
			this.filter_last   = filter_this
			this.buildDisplay()
			return
		}

		const filter_new = new Set()

		for ( const key of this.fullList_sort ) {
			if ( this.fullList_data[key].search.includes(filter_this) ) {
				filter_new.add(key)
			}
		}

		if ( filter_new.size !== this.filter_length ) {
			this.fullList_filter = filter_new
			this.filter_length = this.fullList_filter.size
			this.filter_last   = filter_this
			this.buildDisplay()
		}
	}

	// MARK: buildObject [data]
	buildObject(response) {
		this.fullList_data   = {}
		this.fullList_sort   = []
		this.fullList_filter = []

		const curVersion   = response.appSettings.game_version

		try {
			for ( const collectKey of response.set_Collections ) {
				if ( response.collectionNotes[collectKey].notes_version !== curVersion ) { continue }
				for ( const modKey of response.modList[collectKey].modSet ) {
					const mod = response.modList[collectKey].mods[modKey]
					if ( ! mod.canNotUse ) {
						this.fullList_data[mod.fileDetail.shortName] ??= {
							author    : DATA.escapeSpecial(mod.modDesc.author),
							collect   : [],
							icon      : mod.modDesc.iconImageCache,
							id        : mod.colUUID,
							name      : mod.fileDetail.shortName,
							search    : [
								mod.fileDetail.shortName,
								DATA.escapeSpecial(mod.modDesc.author),
								DATA.escapeSpecial(mod.l10n.title),
							].join(' ').toLowerCase(),
							title     : DATA.escapeSpecial(mod.l10n.title),
						}
						this.fullList_data[mod.fileDetail.shortName].collect.push({
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

		this.fullList_sort   = Object.keys(this.fullList_data).sort((a, b) => a.localeCompare(b))
		this.fullList_filter = new Set(this.fullList_sort)
		this.filter_length   = this.fullList_filter.size

		this.buildDisplay()
	}

	// MARK: buildDisplay [html]
	buildDisplay() {
		const displayNode = MA.byId('full_table')

		displayNode.innerHTML = ''

		for ( const key of this.fullList_sort ) {
			if ( ! this.fullList_filter.has(key) ) { continue }

			const item     = this.fullList_data[key]
			const itemNode = DATA.templateEngine('mod_entry', {
				author : item.author,
				icon   : `<img src="${DATA.iconMaker(item.icon)}" class="img-fluid">`,
				name   : item.name,
				title  : item.title,
			})

			const itemCollectNode = itemNode.querySelector('.versionList')
			for ( const cItem of item.collect ) {
				const node = DATA.templateEngine('version_entry', {
					name    : cItem.name,
					version : cItem.version,
				})
				node.querySelector('dt').addEventListener('click', () => {
					window.find_IPC.select(item.id, item.name)
				})
				itemCollectNode.appendChild(node)
			}

			itemNode.firstElementChild.addEventListener('contextmenu', () => {
				window.find_IPC.modContext(item)
			})

			displayNode.appendChild(itemNode)
		}
	}
}