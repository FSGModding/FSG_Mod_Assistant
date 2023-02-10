/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Selection library, split for readability of main ui script

/*eslint complexity: ["warn", 20]*/
/* exported select_lib */
/* global fsgUtil searchStringMap searchTagMap */

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

			for ( const element of fsgUtil.query(`.${modsClass}`) ) {
				element.classList.remove('d-none')
			}
		}
	},

	close_all         : (openTable = false) => {
		fsgUtil.clsRemoveFromAll('.collapse.show', 'show')
		fsgUtil.clsAddToAll('.folder-name:not(.collapsed),.folder-icon:not(.collapsed)', 'collapsed')

		if ( openTable !== false ) { select_lib.open_table(openTable) }
	},
	open_table        : (tableID) => {
		fsgUtil.byId(tableID).classList.add('show')
		fsgUtil.clsRemoveFromAll(`[data-bs-target="#${tableID}"]`, 'collapsed')
	},
	
	clear_all         : () => {
		const allMods       = fsgUtil.query('.mod-row')
		const moveButtons   = fsgUtil.byId('moveButtonsInt').querySelectorAll('button')
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
		select_lib.filter()
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
		const moveButtons = fsgUtil.byId('moveButtonsInt').querySelectorAll('button')

		if ( fsgUtil.byId(modID).classList.contains('has-hash') ) {
			select_lib.last_alt_hash = true
			moveButtons[5].classList.remove('disabled')

		}
		moveButtons[4].classList.remove('disabled')
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
		fsgUtil.byId('filter_input').value = ''
		for ( const element of select_lib.get_checks(tableID.id) ) {
			const modRow = element.parentElement.parentElement
			element.checked = checkList.includes(element.id)
			if ( modRow.classList.contains('mod-disabled') && modRow.querySelector('.mod-short-name').innerText.endsWith('.csv') ) {
				element.checked = false
			}
		}
		select_lib.clear_range_then_filter()
	},
	
	click_row         : (modID) => {
		if ( window.event.altKey ) {
			select_lib.click_alt(modID)
			return
		}
		
		select_lib.last_alt_select = null
		select_lib.last_alt_hash   = false
		const isShift   = window.event.shiftKey
		const thisTable = document.getElementById(modID).closest('table').closest('tr').id

		if ( !isShift || select_lib.last_select_mod === null || select_lib.last_select_table !== thisTable ) {
			// Non shifted, or not in the same table as the last selection
			const thisCheck = document.getElementById(`${modID}__checkbox`)

			thisCheck.checked = !thisCheck.checked
			select_lib.last_select_mod   = modID
			select_lib.last_select_table = document.getElementById(modID).closest('table').closest('tr').id
		} else {
			// shifted range
			const tableRows = document.getElementById(thisTable).querySelectorAll('.mod-row')
			let thisPosition = null
			let lastPosition = null

			for ( let i=0; i<tableRows.length; i++ ) {
				if ( tableRows[i].id === modID ) {
					thisPosition = i
				}
				if ( tableRows[i].id === select_lib.last_select_mod ) {
					lastPosition = i
				}
			}

			const selectionStart = Math.min(thisPosition, lastPosition)
			const selectionEnd   = Math.max(thisPosition, lastPosition)
			const checkValue     = document.getElementById(`${select_lib.last_select_mod}__checkbox`).checked

			for ( let i=selectionStart; i<=selectionEnd; i++) {
				if ( ! tableRows[i].classList.contains('d-none') ) {
					tableRows[i].querySelector('.mod-row-checkbox').checked = checkValue
				}
			}
			select_lib.last_select_mod = modID
		}
		select_lib.update_color()
		select_lib.filter(select_lib.last_select_table)
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
		let   isFirst       = true
		let   wasLast       = null

		for ( const thisRow of allModRows ) {
			const isChecked = thisRow.querySelector(`#${thisRow.id}__checkbox`).checked

			if ( isChecked ) {
				countSelected += 1
				hasHash = ( countSelected === 1 ) && thisRow.classList.contains('has-hash')

				const thisScroller = document.querySelector(`.${thisRow.id}`)
				wasLast = thisScroller
				thisScroller.classList.add('bg-success')
				if ( isFirst ) {
					thisScroller.classList.add('rounded-top')
					isFirst = false
				}
			} else {
				isFirst = true
				if ( wasLast !== null ) {
					wasLast.classList.add('rounded-bottom')
					wasLast = null
				}
			}

			if ( isChecked ) {
				fsgUtil.clsAddToAll(thisRow.querySelectorAll('td'), 'table-success')
			} else {
				fsgUtil.clsRemoveFromAll(thisRow.querySelectorAll('td'), 'table-success')
			}
		}
		
		if ( wasLast !== null ) {
			wasLast.classList.add('rounded-bottom')
			wasLast = null
		}

		const moveButtons = fsgUtil.byId('moveButtonsInt').querySelectorAll('button')

		moveButtons[0].classList[(countSelected > 0)?'remove':'add']('disabled') // move
		moveButtons[1].classList[(countSelected > 0)?'remove':'add']('disabled') // copy
		moveButtons[2].classList[(countSelected > 0)?'remove':'add']('disabled') // delete
		moveButtons[3].classList[(countSelected > 0)?'remove':'add']('disabled') //zip

		moveButtons[4].classList[(countSelected === 1)?'remove':'add']('disabled') // open
		moveButtons[5].classList[(hasHash)?'remove':'add']('disabled') // modhub

		moveButtons[6].classList.remove('disabled') //favs
		moveButtons[7].classList.remove('disabled') //versions
		
		select_lib.change_count(countSelected)
	},

	filter : (table, forceValue = false) => {
		select_lib.debounceF = setTimeout(() => {
			select_lib.debounceF = null
			select_lib.filter_post(table, forceValue)
		}, 350)
	},
	filter_post : (table, forceValue = false) => {
		select_lib.update_scroll()

		if ( forceValue !== false ) {
			fsgUtil.byId('filter_input').value = forceValue
		}

		const tagLimit      = fsgUtil.byId('filter__tags').querySelectorAll(':checked')
		const tagHiders     = fsgUtil.byId('filter_out__tags').querySelectorAll(':checked')
		const theseMods     = select_lib.get_visible_mods()
		const rawSearchTerm = fsgUtil.byId('filter_input').value.toLowerCase()
		const inverseSearch = rawSearchTerm.startsWith('!')
		const searchTerm    = ( inverseSearch ) ? rawSearchTerm.substring(1) : rawSearchTerm

		fsgUtil.byId('tag_filter_count').innerHTML     = tagLimit.length
		fsgUtil.byId('tag_filter_out_count').innerHTML = tagHiders.length
		fsgUtil.byId('filter_clear').classList[(rawSearchTerm === '') ? 'add' : 'remove']('d-none')


		const hideByTags_arr = []

		for ( const element of tagHiders ) {
			const thisTag = element.id.split('__')[1]
			hideByTags_arr.push(...searchTagMap[thisTag])
		}

		const hideUUIDByTags = hideByTags_arr.length > 0 ? new Set(hideByTags_arr) : false


		const showByTags_sets = []

		for ( const element of tagLimit ) {
			const thisTag = element.id.split('__')[1]
			showByTags_sets.push(searchTagMap[thisTag])
		}

		const showUUIDByTags = showByTags_sets.length > 0 ? select_lib.setIntersection(showByTags_sets) : false

		for ( const modRow of theseMods ) {
			const modRowUUID = modRow.id

			modRow.classList.remove('d-none')

			if ( modRow.querySelector('.mod-row-checkbox').checked ) { continue }
		
			if ( hideUUIDByTags !== false ) {
				if ( hideUUIDByTags.has(modRowUUID) ) {
					select_lib.scroll_hide(modRowUUID)
					modRow.classList.add('d-none')
					continue
				}
			}

			if ( showUUIDByTags !== false ) {
				if ( ! showUUIDByTags.has(modRowUUID) ) {
					select_lib.scroll_hide(modRowUUID)
					modRow.classList.add('d-none')
					continue
				}
			}

			if ( searchTerm.length < 2 ) { continue }
		
			const modText = searchStringMap[modRowUUID]
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
	
	out_tag_reset : () => {
		fsgUtil.checkChangeAll(fsgUtil.query('.filter_out_tag_buttons:checked', false))
		
		select_lib.filter()
	},
	tag_reset : () => {
		fsgUtil.checkChangeAll(fsgUtil.query('.filter_tag_buttons:checked', false))

		select_lib.filter()
	},
	

	change_count      : ( newCount ) => {
		fsgUtil.byId('select_quantity').innerHTML = newCount
	},
	get_checks        : (tableID) => {
		return document.getElementById(tableID).querySelectorAll('.mod-row-checkbox')
	},
	get_open_tables   : () => {
		return fsgUtil.byId('mod-collections').querySelectorAll('.collapse.show')
	},
	get_visible_mods  : () => {
		return fsgUtil.byId('mod-collections').querySelectorAll('.collapse.show .mod-row')
	},
	setIntersection : (sets) => {
		sets.sort((a, b) => b.length - a.length)
		
		const smallestSet = sets[sets.length-1]
		const returnSet   = new Set(sets[sets.length-1])

		if ( sets.length === 1 ) { return returnSet }

		for ( const thisMod of smallestSet ) {
			for (let i = 0; i < sets.length-1; i++ ) {
				if ( ! sets[i].includes(thisMod) ) {
					returnSet.delete(thisMod)
					break
				}
			}
		}
		return returnSet
	},
}