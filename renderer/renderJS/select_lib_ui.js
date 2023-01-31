/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Selection library, split for readability of main ui script

/* exported select_lib */
/* global fsgUtil searchStringMap searchTagMap */

const select_lib = {
	last_alt_select   : null,
	last_alt_hash     : false,
	last_select_mod   : null,
	last_select_table : null,
	clear_scroll_display      : () => {
		fsgUtil.query('.scroll_mod').forEach((element) => {
			element.classList.add('d-none')
		})
	},
	clear_scroll_color      : () => {
		fsgUtil.query('.scroll_mod').forEach((element) => {
			element.classList.remove('bg-success')
			element.classList.remove('rounded-top')
			element.classList.remove('rounded-bottom')
		})
	},
	update_scroll     : () => {
		const openTables = select_lib.get_open_tables()

		select_lib.clear_scroll_display()

		openTables.forEach((tableID) => {
			const modsClass = tableID.id
			const scrollMods = fsgUtil.query(`.${modsClass}`)
			scrollMods.forEach((element) => { element.classList.remove('d-none') })
		})
	},
	open_table        : (tableID) => {
		fsgUtil.byId(tableID).classList.add('show')
		document.querySelectorAll(`[data-bs-target="#${tableID}"]`).forEach((element) => {
			element.classList.remove('collapsed')
		})
	},
	close_all         : (openTable = false) => {
		document.querySelectorAll('.collapse.show').forEach((element) => {
			element.classList.remove('show')
		})
		document.querySelectorAll('.folder-name:not(.collapsed),.folder-icon:not(.collapsed)').forEach((element) => {
			element.classList.add('collapsed')
		})
		if ( openTable !== false ) { select_lib.open_table(openTable) }
	},
	clear_range       : () => {
		select_lib.last_select_mod = null
		select_lib.last_select_table = null
		select_lib.update_color()
	},
	click_alt         : (modID) => {
		select_lib.last_alt_select = modID
		const moveButtons = fsgUtil.byId('moveButtonsInt').querySelectorAll('button')

		if ( fsgUtil.byId(modID).classList.contains('has-hash') ) {
			select_lib.last_alt_hash = true
			moveButtons[4].classList.remove('disabled')

		}
		moveButtons[3].classList.remove('disabled')
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
			select_lib.last_select_mod   = modID
		}
		select_lib.update_color()
		select_lib.filter(select_lib.last_select_table)
	},
	get_checks        : (tableID) => {
		return document.getElementById(tableID).querySelectorAll('.mod-row-checkbox')
	},
	bulk_table        : () => {
		select_lib.clear_range()
		select_lib.filter()
	},
	change_count      : ( newCount ) => {
		fsgUtil.byId('select_quantity').innerHTML = newCount
	},
	click_only        : (tableID, checkList) => {
		fsgUtil.byId('filter_input').value = ''
		select_lib.get_checks(tableID).forEach((check) => {
			const modRow = check.parentElement.parentElement
			check.checked = checkList.includes(check.id)
			if ( modRow.classList.contains('mod-disabled') && modRow.querySelector('.mod-short-name').innerText.endsWith('.csv') ) {
				check.checked = false
			}
		})
		select_lib.bulk_table()
	},
	click_none        : () => {
		fsgUtil.byId('mod-collections').querySelectorAll('.mod-row-checkbox:checked').forEach((check) => {
			check.checked = false
		})
		select_lib.bulk_table()
	},
	click_all         : () => {
		select_lib.get_open_tables().forEach((tableID) => {
			select_lib.get_checks(tableID.id).forEach((check) => {
				if ( ! check.parentElement.parentElement.classList.contains('d-none') ) {
					check.checked = true
				}
			})
		})
		select_lib.bulk_table()
	},
	click_invert      : () => {
		select_lib.get_open_tables().forEach((tableID) => {
			select_lib.get_checks(tableID.id).forEach((check) => {
				if ( ! check.parentElement.parentElement.classList.contains('d-none') ) {
					check.checked = !check.checked
				}
			})
		})
		select_lib.bulk_table()
	},
	get_open_tables   : () => {
		return fsgUtil.byId('mod-collections').querySelectorAll('.collapse.show')
	},
	clear_all         : () => {
		const allMods       = fsgUtil.query('.mod-row')
		const moveButtons   = fsgUtil.byId('moveButtonsInt').querySelectorAll('button')
		const allModChecks  = fsgUtil.query('.mod-row-checkbox')
		const filterInput   = fsgUtil.byId('filter_input')
		const filterTags    = fsgUtil.query('.filter_tag_buttons')
		const filterOutTags = fsgUtil.query('.filter_out_tag_buttons')
		const filterChecks  = fsgUtil.query('.mod-row-filter_check')

		filterInput.value = ''
		filterTags.forEach(   (thisCheck) => { thisCheck.checked = false })
		filterOutTags.forEach((thisCheck) => { thisCheck.checked = false })
		allModChecks.forEach( (thisCheck) => { thisCheck.checked = false })
		filterChecks.forEach( (thisCheck) => { thisCheck.checked = true })
		moveButtons.forEach(  (button)    => { button.classList.add('disabled') })
		allMods.forEach(      (thisMod)   => { thisMod.classList.remove('d-none') })

		select_lib.clear_range()
		select_lib.update_color()
	},
	update_color      : () => {
		select_lib.clear_scroll_color()
		const allModRows    = fsgUtil.query('.mod-row')
		let   countSelected = 0
		let   hasHash       = false
		let   isFirst       = true
		let   wasLast       = null

		allModRows.forEach((thisRow) => {
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

			thisRow.querySelectorAll('td').forEach((thisTD) => {
				thisTD.classList[( isChecked ? 'add' : 'remove' )]('table-success')
			})
		})
		
		if ( wasLast !== null ) {
			wasLast.classList.add('rounded-bottom')
			wasLast = null
		}

		const moveButtons = fsgUtil.byId('moveButtonsInt').querySelectorAll('button')

		moveButtons[0].classList[(countSelected > 0)?'remove':'add']('disabled')
		moveButtons[1].classList[(countSelected > 0)?'remove':'add']('disabled')
		moveButtons[2].classList[(countSelected > 0)?'remove':'add']('disabled')
		moveButtons[3].classList[(countSelected === 1)?'remove':'add']('disabled')
		moveButtons[4].classList[(hasHash)?'remove':'add']('disabled')
		moveButtons[5].classList[(countSelected === 0)?'remove':'add']('disabled')
		moveButtons[6].classList[(countSelected > 0)?'remove':'add']('disabled')

		select_lib.change_count(countSelected)
	},
	filter : (table, forceValue = false) => {
		select_lib.update_scroll()
		if ( forceValue !== false ) {
			fsgUtil.byId('filter_input').value = forceValue
		}

		const tagLimit      = fsgUtil.byId('filter__tags').querySelectorAll(':checked')
		const tagHiders     = fsgUtil.byId('filter_out__tags').querySelectorAll(':checked')
		const theseMods     = fsgUtil.byId('mod-collections').querySelectorAll('.mod-row')
		const rawSearchTerm = fsgUtil.byId('filter_input').value.toLowerCase()
		const inverseSearch = rawSearchTerm.startsWith('!')
		const searchTerm    = ( inverseSearch ) ? rawSearchTerm.substring(1) : rawSearchTerm

		fsgUtil.byId('tag_filter_count').innerHTML = tagLimit.length
		fsgUtil.byId('tag_filter_out_count').innerHTML = tagHiders.length
		fsgUtil.byId('filter_clear').classList[(rawSearchTerm === '') ? 'add' : 'remove']('d-none')

		const shownByTags_sets = []
		const hideByTags_array = []

		let showOnlyTags = false

		if ( tagHiders.length > 0 ) {
			tagHiders.forEach((element) => {
				const thisTag = element.id.split('__')[1]
				hideByTags_array.push(...searchTagMap[thisTag])
			})
		}

		const hideByTags_set = new Set(hideByTags_array)

		if ( tagLimit.length > 0 ) {
			tagLimit.forEach((element) => {
				const thisTag = element.id.split('__')[1]
				shownByTags_sets.push(searchTagMap[thisTag])
			})

			showOnlyTags = select_lib.setIntersection(shownByTags_sets)
		}
	
		theseMods.forEach((modRow) => {
			const modRowUUID = modRow.id

			modRow.classList.remove('d-none')

			if ( modRow.querySelector('.mod-row-checkbox').checked ) { return }
		
			if ( hideByTags_set.has(modRowUUID) ) {
				select_lib.scroll_hide(modRowUUID)
				modRow.classList.add('d-none')
				return
			}

			if ( showOnlyTags !== false ) {
				if ( ! showOnlyTags.has(modRowUUID) ) {
					select_lib.scroll_hide(modRowUUID)
					modRow.classList.add('d-none')
					return
				}
			}

			if ( searchTerm.length < 2 ) { return }
		
			const modText = searchStringMap[modRowUUID]
			const showMe  = ( inverseSearch ) ? !modText.match(searchTerm) : modText.match(searchTerm)

			if ( !showMe ) {
				select_lib.scroll_hide(modRowUUID)
				modRow.classList.add('d-none')
			}
		})

		fsgUtil.query('.mod-table-folder-detail').forEach((table) => {
			const shownRows = table.querySelectorAll('.mod-row:not(.d-none)')
			if ( shownRows.length === 0 ) {
				table.querySelector('span.no-mods-found').classList.remove('d-none')
			} else {
				table.querySelector('span.no-mods-found').classList.add('d-none')
			}

		})
	},
	scroll_hide : (modID) => {
		fsgUtil.query(`.${modID}`).forEach((element) => {element.classList.add('d-none')})
	},
	tag_reset : () => {
		const filterTags   = fsgUtil.query('.filter_tag_buttons')

		filterTags.forEach(  (thisCheck) => { thisCheck.checked = false })
		select_lib.filter()
	},
	out_tag_reset : () => {
		const filterTags   = fsgUtil.query('.filter_out_tag_buttons')

		filterTags.forEach(  (thisCheck) => { thisCheck.checked = false })
		select_lib.filter()
	},
	setIntersection : (sets) => {
		sets.sort((a, b) => b.length - a.length)
		
		const smallestSet = sets[sets.length-1]
		const returnSet   = new Set(sets[sets.length-1])

		if ( sets.length === 1 ) { return returnSet }

		smallestSet.forEach((thisMod) => {
			for (let i = 0; i < sets.length-1; i++ ) {
				if ( ! sets[i].includes(thisMod) ) { returnSet.delete(thisMod) }
			}
		})
		return returnSet
	},
}