/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Debug window UI

/* global processL10N, fsgUtil, bootstrap */

// const maxLinesWatch = 10000
let   dataCache     = []
let   findCache     = []
let   dataCacheGood = false
let   showData      = []

window.gamelog.receive('fromMain_gameLog', (data, fileName) => {
	const autoScroll = fsgUtil.byId('auto_scroll').checked || false
	
	fsgUtil.byId('gameLogPath').innerHTML = fileName
	
	dataCacheGood = false
	showData      = []

	const logRegExp  = {
		cp_ad : {
			regex     : new RegExp(/(?::\d\d \[|\[AD\]|\[AutoDrive\]|\[AutoDriveSync\])/),
			className : 'text-light-emphasis',
			filter    : 'cpad',
		},
		cpp_stack : {
			regex     : new RegExp(/\.cpp/),
			className : 'text-danger',
			filter    : 'lua_error',
		},
		dev_info : {
			regex     : new RegExp(/DevInfo:/),
			className : 'text-info fst-italic',
			filter    : 'dev_info',
			
		},
		dev_warning : {
			regex     : new RegExp(/DevWarning:/),
			className : 'text-warning fst-italic',
			filter    : 'dev_warning',
		},
		error : {
			regex     : new RegExp(/(?:Error:|ERROR|Error \(.+?\):|CollisionFlag-Check)/),
			className : 'text-danger',
			filter    : 'error',
		},
		info : {
			regex     : new RegExp(/(?:Application: |(?<!Dev)Info:|Info \(.+?\):)/),
			className : 'text-info',
			filter    : 'info',
		},
		lua_intro : {
			regex     : new RegExp(/LUA call stack:/),
			className : 'text-danger-emphasis',
			filter    : 'lua_error',
		},
		lua_stack : {
			regex     : new RegExp(/(?:\.lua|^ {2}=\[)/),
			className : 'text-danger-emphasis fst-italic',
			filter    : 'lua_error',
		},
		mod_load : {
			regex     : new RegExp(/(?:Available dlc:|Available mod:|Load mod:|Load dlc:|ExtraContent:| {6}adding mod)/),
			className : 'text-success',
			filter : 'mod_loading',
		},
		time : {
			regex : new RegExp(/(^\d\d\d\d-\d\d-\d\d \d\d:\d\d )/),
			wrap  : ['<em class="text-info-emphasis">', '</em>'],
		},
		warning : {
			regex     : new RegExp(/(?:(?<!Dev)Warning:|Warning \(.+?\):)/),
			className : 'text-warning',
			filter    : 'warning',
		},
	}

	let   lineNum    = 0
	let   dupeCount  = 1
	let   lastLine   = null
	let   classList  = null
	let   thisLine   = null
	let   filterList = null
	
	const allLines   = data.split('\n')
	const showThese  = new Set(fsgUtil.queryA('.filter_only:checked').map((element) => element.id.replace('debug_', '').toLowerCase() ))
	const showDupes  = showThese.has('dupes')

	for ( const line of allLines ) {
		if ( lastLine === line && !showDupes ) {
			dupeCount++
		} else {
			if ( lastLine !== null ) {
				showData.push(doLine(filterList, dupeCount, showDupes, classList, lineNum, thisLine))
			}

			dupeCount  = 1
			lastLine   = line
			classList  = new Set(['logLine', 'py-0', 'my-0'])
			filterList = new Set()
			thisLine   = line
		
			for ( const regType in logRegExp ) {
				if ( typeof logRegExp[regType].wrap !== 'undefined' ) {
					thisLine = line.replace(logRegExp[regType].regex, `${logRegExp[regType].wrap[0]}$1${logRegExp[regType].wrap[1]}`)
				} else if ( line.match(logRegExp[regType].regex) ) {
					filterList.add(logRegExp[regType].filter)
					classList.add(logRegExp[regType].className)
				}
			}

			if ( filterList.size < 1 ) { filterList.add('other') }
		}
		lineNum++
	}

	if ( thisLine !== '' ) {
		showData.push(doLine(filterList, dupeCount, showDupes, classList, lineNum, thisLine))
	}

	clientBuildTable()

	clientFind(true, true)

	if ( autoScroll ) {
		fsgUtil.byId('game_log_contain').scrollTo(0, fsgUtil.byId('game_log_contain').scrollHeight)
	}
})

function filterLines() {
	if ( dataCacheGood ) { return dataCache }
	const showThese  = new Set(fsgUtil.queryA('.filter_only:checked').map((element) => element.id.replace('debug_', '').toLowerCase() ))
	const returnLines = []
	findCache         = []

	for ( const thisLine of showData ) {
		let goodData = true
		for ( const filter of thisLine[0] ) { if ( !showThese.has(filter) ) { goodData = false; break } }

		if ( goodData ) {
			returnLines.push(thisLine[1])
			findCache.push([thisLine[2], thisLine[3]])
		}
	}
	dataCache = returnLines
	dataCacheGood = true
	return returnLines
}

function clientBuildTable() {
	const theTable   = fsgUtil.byId('game_log')
	const theContain = fsgUtil.byId('game_log_contain')
	const rowHeight  = 19
	const thisData   = filterLines()

	
	if ( theContain.scrollTop > ((thisData.length - 1) * rowHeight) + 100 ) {
		theContain.scrollTo({top : ((thisData.length - 1) * rowHeight) - theContain.offsetHeight - 50, behavior : 'instant'})
	}
	
	const startAt   = Math.floor(theContain.scrollTop)
	const startIdx  = Math.floor(startAt / rowHeight)
	const totalShow = Math.floor( theContain.offsetHeight / rowHeight )
	const endIdx    = startIdx + totalShow
	const endPad    = Math.max(rowHeight * 2, ((thisData.length - 1) * rowHeight) - theContain.offsetHeight - startAt)
	
	theTable.innerHTML = `
		<tr style="height: ${startAt}px"><td class="py-0 my-0" style="width: 2em;"></td><td class="logLineName py-0 my-0" style="width: 4em;" ></td><td></td></tr>
		${thisData.slice(startIdx, endIdx).join('')}
		<tr style="height: ${endPad}px"><td class="py-0 my-0" style="width: 2em;"></td><td class="logLineName py-0 my-0" style="width: 4em;" ></td><td></td></tr>
	`
	highLightFinds()
}

function doLine(filterList, dupeCount, showDupes, classList, lineNum, thisLine) {
	return [filterList, `<tr style="height:19px;" class="ps-3">
		<td class="py-0 my-0 text-center" style="width: 2em;">
			${ !showDupes && dupeCount > 1 ? `<span class="badge rounded-pill text-bg-danger">${dupeCount}</span>` : '' }
		</td>
		<td class="logLineName py-0 my-0 border-end text-white-50 fst-italic" style="width: 4em;" >${lineNum}</td>
		<td class="${[...classList].join(' ')}">${thisLine}</td>
	</tr>`, thisLine, lineNum]
}

function clientChangeFilter() {
	window.gamelog.getGameLogContents()
}

function clientResetButtons() {
	for ( const element of fsgUtil.query('.filter_only') ) {
		element.checked = ! ( element.id === 'debug_dupes' )
	}
	window.gamelog.getGameLogContents()
}

function highLightFinds() {
	const thisFind = fsgUtil.byId('gamelog_find').value.toLowerCase()
	const allLines = fsgUtil.query('.logLine')

	/* too short, clear input and reset display */
	if ( thisFind.length < 2 ) {
		for ( const thisLine of allLines ) {
			thisLine.classList.remove('bg-warning', 'text-white', 'bg-opacity-50', 'bg-opacity-25')
		}
		return
	}

	for ( const thisLine of allLines ) {
		if ( thisLine.innerText.toLowerCase().includes(thisFind) ) {
			if ( finds[findIdx][1].toString() === thisLine.parentElement.querySelector('.logLineName').innerText ) {
				thisLine.classList.add('bg-warning', 'text-white', 'bg-opacity-50')
			} else {
				thisLine.classList.add('bg-warning', 'bg-opacity-25')
			}
		}
	}
}

let lastFind = null
let findIdx  = 0
let finds    = []
function clientFind(doForward = false, isReload = false) {
	finds    = []
	const thisFind = fsgUtil.byId('gamelog_find').value.toLowerCase()

	/* too short, clear input and reset display */
	if ( thisFind.length < 2 ) {
		if ( thisFind.length !== 0 ) {
			fsgUtil.byId('gamelog_find').value = ''
		}
		lastFind = null
		findIdx  = 0
		highLightFinds()
		return
	}

	/* is new? */
	if ( lastFind === null || thisFind !== lastFind ) {
		lastFind = thisFind
		findIdx  = 0
	} else {
		findIdx = !isReload ? findIdx + ( doForward ? 1 : -1 ) : findIdx
	}

	/* highlight them */
	for ( let i = 0; i < dataCache.length; i++ ) {
		if ( findCache[i][0].toLowerCase().includes(thisFind) ) {
			finds.push([i, findCache[i][1]])
		}
	}

	/* fix index if needed */
	if ( finds.length > 0 ) {
		findIdx = findIdx % (finds.length)
		findIdx = findIdx < 0 ? findIdx + finds.length : findIdx
	}
	
	if ( finds.length > 0 && !isReload ) {
		fsgUtil.byId('game_log_contain').scrollTo({top : finds[findIdx][0] * 19, behavior : 'instant'})
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
