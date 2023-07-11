/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Debug window UI

/* global processL10N, fsgUtil, bootstrap */


window.gamelog.receive('fromMain_gameLog', (data, fileName) => {
	fsgUtil.byId('gameLogPath').innerHTML = fileName
	const autoScroll = fsgUtil.byId('auto_scroll').checked || false
	const showThese  = new Set(fsgUtil.queryA('.filter_only:checked').map((element) => element.id.replace('debug_', '').toLowerCase() ))
	const showData   = []
	const logRegExp  = {
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
		cpp_stack : {
			regex     : [
				new RegExp(/\.cpp/),
			],
			className : 'text-danger',
			filter : 'lua_error',
		},
		error : {
			regex     : [
				new RegExp(/Error:/),
				new RegExp(/ERROR/),
				new RegExp(/Error \(.+?\):/),
				new RegExp(/CollisionFlag-Check/),
			],
			className : 'text-danger',
			filter : 'error',
		},
		info : {
			regex     : [
				new RegExp(/Application: /),
				new RegExp(/(?<!Dev)Info:/),
				new RegExp(/Info \(.+?\):/),
			],
			className : 'text-info',
			filter : 'info',
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
		time : {
			regex : [
				new RegExp(/(^\d\d\d\d-\d\d-\d\d \d\d:\d\d )/)
			],
			wrap  : ['<em class="text-info-emphasis">', '</em>'],
		},
		warning : {
			regex     : [
				new RegExp(/(?<!Dev)Warning:/),
				new RegExp(/Warning \(.+?\):/),
			],
			className : 'text-warning',
			filter : 'warning',
		},

		dev_info : {
			regex     : [
				new RegExp(/DevInfo:/),
			],
			className : 'text-info fst-italic',
			filter : 'dev_info',
			
		},
		dev_warning : {
			regex     : [
				new RegExp(/DevWarning:/),
			],
			className : 'text-warning fst-italic',
			filter : 'dev_warning',
			
		},
	}

	let   lineNum    = 0
	let   dupeCount  = 1
	let   lastLine   = null
	let   classList  = null
	let   thisLine   = null
	let   filterList = null
	const showDupes  = showThese.has('dupes')

	for ( const line of data.split('\n') ) {
		if ( lastLine === line && !showDupes ) {
			
			dupeCount++
		} else {
			if ( lastLine !== null ) {
				showData.push(doLine(filterList, showThese, dupeCount, showDupes, classList, lineNum, thisLine))
			}

			dupeCount  = 1
			lastLine   = line
			classList  = new Set(['logLine', 'py-0', 'my-0'])
			filterList = new Set()
			thisLine   = line
		
			for ( const regType in logRegExp ) {
				if ( typeof logRegExp[regType].wrap !== 'undefined' ) {
					for ( const thisRegExp of logRegExp[regType].regex ) {
						thisLine = line.replace(thisRegExp, `${logRegExp[regType].wrap[0]}$1${logRegExp[regType].wrap[1]}`)
					}
				} else {
					for ( const thisRegExp of logRegExp[regType].regex ) {
						if ( line.match(thisRegExp) ) {
							filterList.add(logRegExp[regType].filter)
							classList.add(logRegExp[regType].className)
						}
					}
				}
			}

			if ( filterList.size < 1 ) { filterList.add('other') }
		}
		lineNum++
	}

	if ( thisLine !== '' ) {
		showData.push(doLine(filterList, showThese, dupeCount, showDupes, classList, lineNum, thisLine))
	}

	document.getElementById('game_log').innerHTML = showData.join('')

	clientFind(true, true)
	if ( autoScroll ) {
		window.scrollTo(0, document.body.scrollHeight)
	}
})

function doLine(filterList, showThese, dupeCount, showDupes, classList, lineNum, thisLine) {
	let showMe = true
	for ( const filter of filterList ) { if ( !showThese.has(filter) ) { showMe = false } }
	const dupePart = `<td class="py-0 my-0 text-center">${dupeCount > 1? `<span class="badge rounded-pill text-bg-danger">${dupeCount}</span>` :''}</td>`
	return `<tr class="ps-3 ${showMe ? '' : 'd-none'}">
		${!showDupes ? dupePart : ''}
		<td class="logLineName py-0 my-0 border-end text-white-50 fst-italic">${lineNum}</td>
		<td class="${[...classList].join(' ')}">${thisLine}</td>
	</tr>`
}

function clientResetButtons() {
	for ( const element of fsgUtil.query('.filter_only') ) {
		element.checked = ! ( element.id === 'debug_dupes' )
	}
	window.gamelog.getGameLogContents()
}

let lastFind = null
let findIdx  = 0
function clientFind(doForward = false, isReload = false) {
	const finds = []
	const thisFind = fsgUtil.byId('gamelog_find').value.toLowerCase()
	const allLines = fsgUtil.query('.logLine')

	/* clear current */
	for ( const thisLine of allLines ) {
		thisLine.classList.remove('bg-warning', 'bg-opacity-25', 'bg-opacity-50', 'text-white')
	}

	/* too short, exit */
	if ( thisFind.length < 2 ) { lastFind = null; return }

	/* is new? */
	if ( lastFind === null || thisFind !== lastFind ) {
		lastFind = thisFind
		findIdx  = 0
	} else {
		findIdx = !isReload ? findIdx + ( doForward ? 1 : -1 ) : findIdx
	}

	/* highlight them */
	for ( const thisLine of allLines ) {
		if ( thisLine.innerText.toLowerCase().includes(thisFind) ) {
			thisLine.classList.add('bg-warning', 'bg-opacity-25')
			finds.push(thisLine)
		}
	}
	if ( finds.length > 0 && !isReload ) {
		let thisRealIndex = findIdx % (finds.length )
		thisRealIndex = thisRealIndex < 0 ? thisRealIndex + finds.length : thisRealIndex
		finds[thisRealIndex].classList.remove('bg-opacity-25')
		finds[thisRealIndex].classList.add('bg-opacity-50', 'text-white')
		window.scrollTo({top : finds[thisRealIndex].offsetTop, behavior : 'instant'})
	}
}

function clientClearInput() {
	fsgUtil.byId('gamelog_find').value = ''
	clientFind(true)
}

function clientCatchEnter(e) {
	if ( e.code === 'Enter' || e.code === 'NumpadEnter' ) {
		e.preventDefault()
		clientFind(true)
	}
}

window.addEventListener('DOMContentLoaded', () => {
	processL10N()

	fsgUtil.queryA('[data-bs-toggle="tooltip"]').map((element) => new bootstrap.Tooltip(element))
})
