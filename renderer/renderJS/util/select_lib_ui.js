/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Selection library, split for readability of main ui script

/* es lint complexity: ["warn", 20]*/
/* exported select_lib */
/* global fsgUtil mainState */

const select_lib = {
	last_alt_hash     : false,
	last_alt_select   : null,

	last_select_mod   : null,
	last_select_table : null,

	debounceC         : null,
	debounceF         : null,

	clear_scroll_color      : () => {
		fsgUtil.clsRemoveFromAll('.scroll_mod', ['bg-success', 'rounded-top', 'rounded-bottom'])
	},
	clear_scroll_display      : () => {
		fsgUtil.clsAddToAll('.scroll_mod', 'd-none')
	},
	scroll_hide : (modID) => {
		fsgUtil.clsAddToAll(`.${modID}`, 'd-none')
	},
	update_scroll     : () => {
		select_lib.clear_scroll_display()

		for ( const tableID of select_lib.get_open_tables() ) {
			const modsClass = tableID.id

			fsgUtil.clsRemoveFromAll(`.${modsClass}`, 'd-none')
		}
	},

	close_all         : (openTable = false) => {
		fsgUtil.clsRemoveFromAll('.collapse.show', 'show')
		fsgUtil.clsAddToAll('.folder-name:not(.collapsed),.folder-icon:not(.collapsed)', 'collapsed')

		if ( openTable !== false ) { select_lib.open_table(openTable) }
	},
	open_table        : (tableID) => {
		fsgUtil.clsAddId(tableID, 'show')
		fsgUtil.clsRemoveFromAll(`[data-bs-target="#${tableID}"]`, 'collapsed')
	},
	
	clear_all         : () => {
		const allMods       = fsgUtil.query('.mod-row')
		const moveButtons   = fsgUtil.byId('moveButtons').querySelectorAll('button')
		const allModChecks  = fsgUtil.query('.mod-row-checkbox:checked')
		const filterInput   = fsgUtil.byId('filter_input')
		const filterTags    = fsgUtil.query('.filter_tag_buttons:checked')
		const filterOutTags = fsgUtil.query('.filter_out_tag_buttons:checked')
		const filterChecks  = fsgUtil.query('.mod-row-filter_check:not(:checked)')

		filterInput.value = ''
		fsgUtil.checkChangeAll(filterTags, false)
		fsgUtil.checkChangeAll(filterOutTags, false)
		fsgUtil.checkChangeAll(allModChecks, false)
		fsgUtil.checkChangeAll(filterChecks, true)
		fsgUtil.clsAddToAll(moveButtons, 'disabled')
		fsgUtil.clsRemoveFromAll(allMods, 'd-none')

		select_lib.clear_range()
	},
	clear_range       : () => {
		select_lib.last_select_mod = null
		select_lib.last_select_table = null
		select_lib.update_color()
	},
	clear_range_then_filter        : () => {
		select_lib.last_select_mod = null
		select_lib.last_select_table = null
		select_lib.update_color()
		select_lib.filter_begin()
	},

	click_all         : () => {
		for ( const tableID of select_lib.get_open_tables() ) {
			for ( const element of select_lib.get_checks(tableID.id) ) {
				if ( ! element.parentElement.parentElement.classList.contains('d-none') ) {
					element.checked = true
				}
			}
		}
		select_lib.clear_range_then_filter()
	},
	click_alt         : (modID) => {
		select_lib.last_alt_select = modID

		if ( fsgUtil.clsIdHas(modID, 'has-hash') ) {
			select_lib.last_alt_hash = true
			fsgUtil.clsEnable('moveButton_hub')
		}
		if ( fsgUtil.clsIdHas(modID, 'has-ext-site') ) {
			select_lib.last_alt_hash = true
			fsgUtil.clsEnable('moveButton_site')
		}
		
		fsgUtil.clsEnable('moveButton_open')
		
	},
	click_invert      : () => {
		for ( const tableID of select_lib.get_open_tables() ) {
			for ( const element of select_lib.get_checks(tableID.id) ) {
				if ( ! element.parentElement.parentElement.classList.contains('d-none') ) {
					element.checked = !element.checked
				}
			}
		}
		select_lib.clear_range_then_filter()
	},
	click_none        : () => {
		fsgUtil.checkChangeAll(fsgUtil.byId('mod-collections').querySelectorAll('.mod-row-checkbox:checked'), false)

		select_lib.clear_range_then_filter()
	},
	click_only        : (tableID, checkList) => {
		const checkListSet = new Set(checkList)
		fsgUtil.valueById('filter_input', '')
		for ( const element of select_lib.get_checks(tableID) ) {
			const modRow = element.parentElement.parentElement
			element.checked = checkListSet.has(element.id)
			if ( modRow.classList.contains('mod-disabled') && modRow.querySelector('.mod-short-name').innerText.endsWith('.csv') ) {
				element.checked = false
			}
		}
		select_lib.clear_range_then_filter()
	},
	

	click_mod         : (e) => {
		console.log(e)
	},

	click_row         : (modID) => {
		if ( window.event.altKey ) {
			select_lib.click_alt(modID)
			return
		}
		
		select_lib.last_alt_select = null
		select_lib.last_alt_hash   = false
		const isShift   = window.event.shiftKey
		const thisTable = fsgUtil.byId(modID).closest('table').closest('tr').id

		if ( !isShift || select_lib.last_select_mod === null || select_lib.last_select_table !== thisTable ) {
			// Non shifted, or not in the same table as the last selection
			const thisCheck = fsgUtil.byId(`${modID}__checkbox`)

			thisCheck.checked = !thisCheck.checked
			select_lib.last_select_mod   = modID
			select_lib.last_select_table = fsgUtil.byId(modID).closest('table').closest('tr').id
		} else {
			// shifted range
			const tableRows = fsgUtil.byId(thisTable).querySelectorAll('.mod-row')
			let thisPosition = null
			let lastPosition = null

			for ( const [i, tableRow] of tableRows.entries() ) {
				if ( tableRow.id === modID ) {
					thisPosition = i
				}
				if ( tableRow.id === select_lib.last_select_mod ) {
					lastPosition = i
				}
			}

			const selectionStart = Math.min(thisPosition, lastPosition)
			const selectionEnd   = Math.max(thisPosition, lastPosition)
			const checkValue     = fsgUtil.byId(`${select_lib.last_select_mod}__checkbox`).checked

			for ( let i=selectionStart; i<=selectionEnd; i++) {
				if ( ! tableRows[i].classList.contains('d-none') ) {
					tableRows[i].querySelector('.mod-row-checkbox').checked = checkValue
				}
			}
			select_lib.last_select_mod = modID
		}
		select_lib.update_color()
		select_lib.filter_begin(select_lib.last_select_table)
	},
	
	update_color : () => {
		select_lib.debounceC = setTimeout(() => {
			select_lib.debounceC = null
			select_lib.update_color_post()
		}, 50)
	},
	update_color_post    : () => {
		select_lib.clear_scroll_color()
		const allModRows    = select_lib.get_visible_mods()
		let   countSelected = 0
		let   hasHash       = false
		let   hasExtSite    = false
		let   isFirst       = true
		let   wasLast       = null

		for ( const thisRow of allModRows ) {
			const isChecked = thisRow.querySelector(`#${thisRow.id}__checkbox`).checked

			if ( isChecked ) {
				countSelected += 1
				hasHash    = ( countSelected === 1 ) && thisRow.classList.contains('has-hash')
				hasExtSite = ( countSelected === 1 ) && thisRow.classList.contains('has-ext-site')

				const thisScroller = fsgUtil.queryF(`.${thisRow.id}`)
				wasLast = thisScroller
				thisScroller.classList.add('bg-success')
				if ( isFirst ) {
					thisScroller.classList.add('rounded-top')
					isFirst = false
				}
			} else {
				isFirst = true
				wasLast = select_lib.update_do_last(wasLast)
			}

			if ( isChecked ) {
				fsgUtil.clsAddToAll(thisRow.querySelectorAll('td'), 'table-success')
			} else {
				fsgUtil.clsRemoveFromAll(thisRow.querySelectorAll('td'), 'table-success')
			}
		}
		
		wasLast = select_lib.update_do_last(wasLast)

		fsgUtil.clsDisableFalse('moveButton_move', countSelected > 0)
		fsgUtil.clsDisableFalse('moveButton_copy', countSelected > 0)
		fsgUtil.clsDisableFalse('moveButton_delete', countSelected > 0)
		fsgUtil.clsDisableFalse('moveButton_zip', countSelected > 0)

		fsgUtil.clsDisableFalse('moveButton_open', countSelected === 1)
		fsgUtil.clsDisableFalse('moveButton_hub', hasHash)
		fsgUtil.clsDisableFalse('moveButton_site', hasExtSite)

		fsgUtil.clsEnable('moveButton_fav')
		fsgUtil.clsEnable('moveButton_ver')
		
		select_lib.change_count(countSelected)
	},
	update_do_last       : (element) => {
		if ( typeof element === 'object' && element !== null ) {
			element.classList.add('rounded-bottom')
			return null
		}
	},

	filter_begin : (_, forceValue = false) => {
		select_lib.debounceF = setTimeout(() => {
			select_lib.debounceF = null
			select_lib.filter_post(forceValue)
		}, 350)
	},
	filter_getFilterHides : (tags) => {
		const returnArray = []
		for ( const thisTag of tags ) {
			returnArray.push(...mainState.searchTagMap[thisTag])
		}
		return new Set(returnArray)
	},
	filter_getFilterShows : (tags) => {
		const fullArrays  = []
		let   finalArray  = []

		for ( const thisTag of tags ) {
			if ( Object.hasOwn(mainState.searchTagMap, thisTag) ) {
				fullArrays.push(mainState.searchTagMap[thisTag])
			}
		}

		if ( fullArrays.length !== 0 ) {
			finalArray = fullArrays.reduce((resultArray, currentArray) => {
				return resultArray.filter((el) => currentArray.includes(el))
			})
		}

		return new Set(finalArray)
	},
	filter_parse : (element) => element.id.split('__')[2],
	filter_post : (forceValue = false) => {
		select_lib.update_scroll()

		if ( forceValue !== false ) {
			fsgUtil.valueById('filter_input', forceValue)
		}

		const onlySelected  = fsgUtil.byId('tag_filter__selected').checked
		const tagHidden     = fsgUtil.queryA('.tag_filter__hide:checked').map((x) => select_lib.filter_parse(x))
		const tagOnly       = fsgUtil.queryA('.tag_filter__exclusive:checked').map((x) => select_lib.filter_parse(x))
		const theseMods     = select_lib.get_visible_mods()
		const rawSearchTerm = fsgUtil.valueByIdLC('filter_input')
		const inverseSearch = rawSearchTerm.startsWith('!')
		const searchTerm    = ( inverseSearch ) ? rawSearchTerm.substring(1) : rawSearchTerm

		fsgUtil.clsHideTrue('filter_clear', rawSearchTerm === '')

		const hideUUIDByTags = select_lib.filter_getFilterHides(tagHidden)
		const showUUIDByTags = select_lib.filter_getFilterShows(tagOnly)

		for ( const modRow of theseMods ) {
			const modRowUUID = modRow.id

			modRow.classList.remove('d-none')

			if ( modRow.querySelector('.mod-row-checkbox').checked ) { continue }

			if ( onlySelected ) {
				select_lib.scroll_hide(modRowUUID)
				modRow.classList.add('d-none')
				continue
			}

			if ( tagHidden.length !== 0 && hideUUIDByTags.has(modRowUUID) ) {
				select_lib.scroll_hide(modRowUUID)
				modRow.classList.add('d-none')
				continue
			}

			if ( tagOnly.length !== 0 && ! showUUIDByTags.has(modRowUUID) ) {
				select_lib.scroll_hide(modRowUUID)
				modRow.classList.add('d-none')
				continue
			}

			if ( searchTerm.length < 2 ) { continue }

			const modText = mainState.searchStringMap[modRowUUID]
			const showMe  = ( inverseSearch ) ? !modText.match(searchTerm) : modText.match(searchTerm)

			if ( !showMe ) {
				select_lib.scroll_hide(modRowUUID)
				modRow.classList.add('d-none')
			}
		}

		for ( const table of fsgUtil.query('.mod-table-folder-detail') ) {
			const shownRows = table.querySelectorAll('.mod-row:not(.d-none)')
			if ( shownRows.length === 0 ) {
				table.querySelector('span.no-mods-found').classList.remove('d-none')
			} else {
				table.querySelector('span.no-mods-found').classList.add('d-none')
			}
		}
	},
	

	change_count      : ( newCount ) => {
		fsgUtil.setById('select_quantity', newCount)
	},
	get_checks        : (tableID) => {
		return fsgUtil.byId(tableID).querySelectorAll('.mod-row-checkbox')
	},
	get_open_tables   : () => {
		return fsgUtil.byId('mod-collections').querySelectorAll('.collapse.show')
	},
	get_visible_mods  : () => {
		return fsgUtil.byId('mod-collections').querySelectorAll('.collapse.show .mod-row')
	},

	new_tag_fake_disable : (id) => {
		fsgUtil.queryF(`label[for="tag_filter__show__${id}"]`).classList.remove('fake-disable')
		fsgUtil.queryF(`label[for="tag_filter__hide__${id}"]`).classList.remove('fake-disable')
	},

	new_tag : (action, id) => {
		const newValue    = fsgUtil.byId(`tag_filter__${action}__${id}`).checked
		const wasDisabled = fsgUtil.queryF(`label[for="tag_filter__show__${id}"]`).classList.contains('fake-disable')
		
		if ( action === 'hide' ) {
			select_lib.new_tag_fake_disable(id)
			fsgUtil.byId(`tag_filter__show__${id}`).checked = !newValue
			fsgUtil.byId(`tag_filter__exclusive__${id}`).checked = false
		} else if ( action === 'show' ) {
			select_lib.new_tag_fake_disable(id)
			fsgUtil.byId(`tag_filter__exclusive__${id}`).checked = false
			if ( wasDisabled ) {
				fsgUtil.byId(`tag_filter__hide__${id}`).checked = false
				fsgUtil.byId(`tag_filter__show__${id}`).checked = true
			} else {
				fsgUtil.byId(`tag_filter__hide__${id}`).checked = !newValue
			}
		} else if ( newValue ) {
			fsgUtil.queryF(`label[for="tag_filter__show__${id}"]`).classList.add('fake-disable')
			fsgUtil.queryF(`label[for="tag_filter__hide__${id}"]`).classList.add('fake-disable')
			fsgUtil.byId(`tag_filter__show__${id}`).checked = true
			fsgUtil.byId(`tag_filter__hide__${id}`).checked = false
		} else {
			select_lib.new_tag_fake_disable(id)
			fsgUtil.byId(`tag_filter__show__${id}`).checked = true
			fsgUtil.byId(`tag_filter__hide__${id}`).checked = false
		}

		const countOnly = fsgUtil.query('.tag_filter__exclusive:checked').length
		const countHide = fsgUtil.query('.tag_filter__hide:checked').length

		fsgUtil.clsOrGate(
			'tag_filter_full_count',
			countHide === 0 && countOnly === 0,
			'bg-body-secondary',
			'bg-danger'
		)
		select_lib.filter_begin()
	},
	new_tag_reset : () => {
		const allHide = fsgUtil.query('.tag_filter__hide')
		const allShow = fsgUtil.query('.tag_filter__show')
		const allOnly = fsgUtil.query('.tag_filter__exclusive')
		fsgUtil.clsRemoveFromAll('.fake-disable', 'fake-disable')
		fsgUtil.byId('tag_filter__selected').checked = false
		for ( const element of allHide ) { element.checked = false }
		for ( const element of allShow ) { element.checked = true }
		for ( const element of allOnly ) { element.checked = false }
		fsgUtil.clsOrGate(
			'tag_filter_full_count',
			true,
			'bg-body-secondary',
			'bg-danger'
		)
		select_lib.filter_begin()
	},
}