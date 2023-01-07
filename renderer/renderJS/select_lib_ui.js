/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Selection library, split for readability of main ui script

/* exported select_lib */
/* global fsgUtil */

const select_lib = {
	last_alt_select   : null,
	last_alt_hash     : false,
	last_select_mod   : null,
	last_select_table : null,
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
	clear_range       : () => { select_lib.last_select_mod = null; select_lib.last_select_table = null; select_lib.update_color() },
	click_alt         : (modID) => {
		select_lib.last_alt_select = modID
		const moveButtons = fsgUtil.byId('moveButtons').querySelectorAll('button')

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
	bulk_table        : (tableID) => {
		select_lib.clear_range()
		select_lib.update_color()
		select_lib.filter(tableID)
	},
	change_count      : ( newCount ) => {
		fsgUtil.byId('select_quantity').innerHTML = newCount
	},
	click_only        : (tableID, checkList) => {
		fsgUtil.byId(`${tableID}__filter`).value = ''
		select_lib.get_checks(tableID).forEach((check) => {
			const modRow = check.parentElement.parentElement
			check.checked = checkList.includes(check.id)
			if ( modRow.classList.contains('mod-disabled') && modRow.querySelector('.mod-short-name').innerText.endsWith('.csv') ) {
				check.checked = false
			}
		})
		select_lib.bulk_table(tableID)
	},
	click_none        : (tableID) => {
		select_lib.get_checks(tableID).forEach((check) => {check.checked = false})
		select_lib.bulk_table(tableID)
	},
	click_all         : (tableID) => {
		select_lib.get_checks(tableID).forEach((check) => {
			if ( ! check.parentElement.parentElement.classList.contains('d-none') ) {
				check.checked = true
			}
		})
		select_lib.bulk_table(tableID)
	},
	click_invert      : (tableID) => {
		select_lib.get_checks(tableID).forEach((check) => {
			if ( ! check.parentElement.parentElement.classList.contains('d-none') ) {
				check.checked = !check.checked
			}
		})
		select_lib.bulk_table(tableID)
	},
	clear_all         : () => {
		const allMods      = fsgUtil.query('.mod-row')
		const moveButtons  = fsgUtil.byId('moveButtons').querySelectorAll('button')
		const allModChecks = fsgUtil.query('.mod-row-checkbox')
		const filterBoxes  = fsgUtil.query('.mod-row-filter')
		const filterChecks = fsgUtil.query('.mod-row-filter_check')

		filterBoxes.forEach( (thisBox)   => { thisBox.value = '' })
		allModChecks.forEach((thisCheck) => { thisCheck.checked = false })
		filterChecks.forEach((thisCheck) => { thisCheck.checked = true })
		moveButtons.forEach( (button)    => { button.classList.add('disabled') })
		allMods.forEach(     (thisMod)   => { thisMod.classList.remove('d-none') })

		select_lib.clear_range()
		select_lib.update_color()
	},
	update_color      : () => {
		const allModRows    = fsgUtil.query('.mod-row')
		let   countSelected = 0
		let   hasHash       = false

		allModRows.forEach((thisRow) => {
			const isChecked = thisRow.querySelector(`#${thisRow.id}__checkbox`).checked

			if ( isChecked ) {
				countSelected += 1
				hasHash = ( countSelected === 1 ) && thisRow.classList.contains('has-hash')
			}

			thisRow.querySelectorAll('td').forEach((thisTD) => {
				thisTD.classList[( isChecked ? 'add' : 'remove' )]('table-success')
			})
		})

		const moveButtons = fsgUtil.byId('moveButtons').querySelectorAll('button')

		moveButtons[0].classList[(countSelected > 0)?'remove':'add']('disabled')
		moveButtons[1].classList[(countSelected > 0)?'remove':'add']('disabled')
		moveButtons[2].classList[(countSelected > 0)?'remove':'add']('disabled')
		moveButtons[3].classList[(countSelected === 1)?'remove':'add']('disabled')
		moveButtons[4].classList[(hasHash)?'remove':'add']('disabled')
		moveButtons[5].classList[(countSelected === 0)?'remove':'add']('disabled')

		select_lib.change_count(countSelected)
	},
	filter : (table, forceValue = false) => {
		if ( forceValue !== false ) {
			fsgUtil.byId(`${table}__filter`).value = forceValue
		}
		const theseMods     = fsgUtil.byId(table).querySelectorAll('.mod-row')
		const rawSearchTerm = fsgUtil.byId(`${table}__filter`).value.toLowerCase()
		const showNonMods   = fsgUtil.byId(`${table}__show_non_mod`).checked
		const showBroken    = fsgUtil.byId(`${table}__show_broken`).checked
		const inverseSearch = rawSearchTerm.startsWith('!')
		const searchTerm    = ( inverseSearch ) ? rawSearchTerm.substring(1) : rawSearchTerm

		fsgUtil.byId(`${table}__filter_clear`).classList[(rawSearchTerm === '') ? 'add' : 'remove']('d-none')
		
		theseMods.forEach((modRow) => {
			modRow.classList.remove('d-none')

			if ( modRow.querySelector('.mod-row-checkbox').checked ) { return }
		
			const modBadges = modRow.querySelector('.issue_badges').innerHTML
		
			if ( !showBroken  && modBadges.match('mod_badge_broken') ) { modRow.classList.add('d-none'); return }
			if ( !showNonMods && modBadges.match('mod_badge_notmod') ) { modRow.classList.add('d-none'); return }

			if ( searchTerm.length < 2 ) { modRow.classList.remove('d-none'); return }
		
			const modText = modRow.querySelector('td:nth-child(3)').innerText.toLowerCase()
			const showMe  = ( inverseSearch ) ? !modText.match(searchTerm) : modText.match(searchTerm)

			modRow.classList[(showMe?'remove':'add')]('d-none')
		})
	},
}