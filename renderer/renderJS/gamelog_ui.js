/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Debug window UI

/* global l10n, fsgUtil, bootstrap */


/*  __ ____   ______        
   |  |_   | |      |.-----.
   |  |_|  |_|  --  ||     |
   |__|______|______||__|__| */

function processL10N()          { clientGetL10NEntries() }
function clientChangeL10N()     { l10n.langList_change(fsgUtil.byId('language_select').value) }
function clientGetL10NEntries() {
	const l10nSendItems = new Set()

	fsgUtil.query('l10n').forEach((thisL10nItem) => {
		l10nSendItems.add(fsgUtil.getAttribNullEmpty(thisL10nItem, 'name'))
	})

	l10n.getText_send(l10nSendItems)
}

window.l10n.receive('fromMain_getText_return', (data) => {
	fsgUtil.query(`l10n[name="${data[0]}"]`).forEach((item) => { item.innerHTML = data[1] })
})
window.l10n.receive('fromMain_l10n_refresh', () => { processL10N() })


window.gamelog.receive('fromMain_gameLog', (data, fileName) => {
	fsgUtil.byId('gameLogPath').innerHTML = fileName
	const autoScroll = fsgUtil.byId('auto_scroll').checked || false
	const showThese  = new Set()
	const showData   = []
	const logRegExp  = {
		time : {
			regex : [
				new RegExp(/(^\d\d\d\d-\d\d-\d\d \d\d:\d\d )/)
			],
			wrap  : ['<em class="text-info-emphasis">', '</em>'],
		},
		error : {
			regex     : [
				new RegExp(/Error:/),
				new RegExp(/ERROR/),
				new RegExp(/Error \(.+?\):/),
			],
			className : 'text-danger',
			filter : 'error',
		},
		warning : {
			regex     : [
				new RegExp(/Warning:/),
				new RegExp(/Warning \(.+?\):/),
			],
			className : 'text-warning',
			filter : 'warning',
		},
		info : {
			regex     : [
				new RegExp(/Info:/),
				new RegExp(/Info \(.+?\):/),
			],
			className : 'text-info',
			filter : 'info',
		},
		mod_load : {
			regex     : [
				new RegExp(/Available dlc:/),
				new RegExp(/Available mod:/),
				new RegExp(/Load mod:/),
				new RegExp(/Load dlc:/),
				new RegExp(/ExtraContent:/),
				new RegExp(/ {6}adding mod/),
			],
			className : 'text-success',
			filter : 'mod_loading',
		},
		lua_intro : {
			regex     : [
				new RegExp(/LUA call stack:/),
			],
			className : 'text-danger-emphasis',
			filter : 'lua_error',
		},
		lua_stack : {
			regex     : [
				new RegExp(/\.lua/),
				new RegExp(/^ {2}=\[/),
			],
			className : 'text-danger-emphasis fst-italic',
			filter : 'lua_error',
		},
		cpp_stack : {
			regex     : [
				new RegExp(/\.cpp/),
			],
			className : 'text-danger',
			filter : 'lua_error',
		},
		cp_ad : {
			regex     : [
				new RegExp(/:\d\d \[/),
				new RegExp(/\[AD\]/),
				new RegExp(/\[AutoDrive\]/),
				new RegExp(/\[AutoDriveSync\]/),
			],
			className : 'text-light-emphasis',
			filter : 'cpad',
		},
	}
	

	document.querySelectorAll('.filter_only:checked').forEach((element) => {
		showThese.add(element.id.replace('debug_', '').toLowerCase())
	})


	let lineNum    = 0
	let dupeCount  = 1
	let lastLine   = null
	let classList  = null
	let thisLine   = null
	let filterList = null
	let showMe     = true
	const showDupes  = showThese.has('dupes')

	data.split('\n').forEach((line) => {

		if ( lastLine === line && !showDupes ) {
			dupeCount++
		} else {
			if ( lastLine !== null ) {
				showMe = true
				filterList.forEach((filter) => {
					if ( !showThese.has(filter) ) { showMe = false }
				})
				const dupePart = `<td class="py-0 my-0 text-center">${dupeCount > 1? `<span class="badge rounded-pill text-bg-danger">${dupeCount}</span>` :''}</td>`
				const thisLineHTML = `<tr class="ps-3 ${showMe ? '' : 'd-none'}">
					${!showDupes ? dupePart : ''}
					<td class="logLineName py-0 my-0 border-end text-white-50 fst-italic">${lineNum}</td>
					<td class="${[...classList].join(' ')}">${thisLine}</td>
				</tr>`

				showData.push(thisLineHTML)
			}
			dupeCount  = 1
			lastLine   = line
			classList  = new Set(['logLine', 'py-0', 'my-0'])
			filterList = new Set()
			thisLine   = line
		
			Object.keys(logRegExp).forEach((regType) => {
				if ( typeof logRegExp[regType].wrap !== 'undefined' ) {
					logRegExp[regType].regex.forEach((thisRegExp) => {
						thisLine = line.replace(thisRegExp, `${logRegExp[regType].wrap[0]}$1${logRegExp[regType].wrap[1]}`)
					})
				} else {
					logRegExp[regType].regex.forEach((thisRegExp) => {
						if ( line.match(thisRegExp) ) {
							filterList.add(logRegExp[regType].filter)
							classList.add(logRegExp[regType].className)
						}
					})
				}
			})

			if ( filterList.size < 1 ) { filterList.add('other') }
		}
		lineNum++
	})

	if ( thisLine !== '' ) {
		showMe = true
		filterList.forEach((filter) => {
			if ( !showThese.has(filter) ) { showMe = false }
		})
		const dupePart = `<td class="py-0 my-0 text-center">${dupeCount > 1? `<span class="badge rounded-pill text-bg-danger">${dupeCount}</span>` :''}</td>`
		showData.push( `<tr class="ps-3">
				${!showDupes ? dupePart : ''}
				<td class="logLineName py-0 my-0 border-end text-white-50 fst-italic">${lineNum}</td>
				<td class="${[...classList].join(' ')}">${thisLine}</td>
			</tr>`)
	}

	document.getElementById('game_log').innerHTML = showData.join('')

	if ( autoScroll ) {
		window.scrollTo(0, document.body.scrollHeight)
	}
})

function clientResetButtons() {
	fsgUtil.query('.filter_only').forEach((element) => {
		if ( element.id === 'debug_dupes' ) {
			element.checked = false
		} else {
			element.checked = true
		}
	})
	window.gamelog.getGameLogContents()
}

window.addEventListener('DOMContentLoaded', () => {
	processL10N()

	const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
	tooltipTriggerList.map((tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl) )
})
