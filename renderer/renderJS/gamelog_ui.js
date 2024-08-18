/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */
// MARK: DEBUG UI

/* global MA */

// MARK: PAGE LOAD
window.addEventListener('DOMContentLoaded', () => {
	window.state = new windowState()
})

class windowState {
	autoUpdateTimeSeconds = 15
	dataCache             = []
	findCache             = []
	dataCacheGood         = false
	showData              = []
	lastFind              = null
	findIdx               = 0
	finds                 = []

	logRegExp  = {
		cp_ad : {
			regex     : new RegExp(/:\d\d \[|\[AD]|\[AutoDrive]|\[AutoDriveSync]/),
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
			regex     : new RegExp(/Error:|ERROR|Error \(.+?\):|CollisionFlag-Check/),
			className : 'text-danger',
			filter    : 'error',
		},
		info : {
			regex     : new RegExp(/Application: |(?<!Dev)Info:|Info \(.+?\):/),
			className : 'text-info',
			filter    : 'info',
		},
		lua_intro : {
			regex     : new RegExp(/LUA call stack:/),
			className : 'text-danger-emphasis',
			filter    : 'lua_error',
		},
		lua_stack : {
			regex     : new RegExp(/\.lua|^ {2}=\[/),
			className : 'text-danger-emphasis fst-italic',
			filter    : 'lua_error',
		},
		mod_load : {
			regex     : new RegExp(/Available dlc:|Available mod:|Load mod:|Load dlc:|ExtraContent:| {6}adding mod/),
			className : 'text-success',
			filter : 'mod_loading',
		},
		time : {
			regex : new RegExp(/(^\d\d\d\d-\d\d-\d\d \d\d:\d\d )/),
			wrap  : ['<em class="text-info-emphasis">', '</em>'],
		},
		warning : {
			regex     : new RegExp(/(?<!Dev)Warning:|Warning \(.+?\):/),
			className : 'text-warning',
			filter    : 'warning',
		},
	}

	constructor() {
		this.getLogContents()
	
		for ( const element of MA.queryA('.filter_only') ) {
			element.addEventListener('click', () => { this.getLogContents() })
		}
	
		MA.byIdEventIfExists('filterGroupReset', () => {
			for ( const element of MA.query('.filter_only') ) {
				element.checked = ! ( element.id === 'debug_dupes' )
			}
			this.getLogContents()
		})
	
		MA.byIdEventIfExists('logActionRefresh', () => { this.getLogContents() })
		MA.byIdEventIfExists('logActionFolder', window.gamelog_IPC.openFolder)
		MA.byIdEventIfExists('logActionOpen', () => {
			window.gamelog_IPC.pickFile().then(async (data) => {
				const fileName = await window.gamelog_IPC.filename()
				this.processLogData(data, fileName)
			})
		})
		MA.byIdEventIfExists('logActionAuto', () => {
			window.gamelog_IPC.auto().then(async (data) => {
				const fileName = await window.gamelog_IPC.filename()
				this.processLogData(data, fileName)
			})
		})
	
		MA.byIdEventIfExists('game_log_contain', () => { this.buildDisplayTable() }, 'scroll')
		MA.byIdEventIfExists('game_log', window.gamelog_IPC.logContext, 'contextmenu')
	
		MA.byIdEventIfExists('findNext', () => { this.clientFind(true) })
		MA.byIdEventIfExists('findPrev', () => { this.clientFind(false) })
		MA.byIdEventIfExists('findClear', () => {
			MA.byIdValue('gamelog_find', '')
			this.clientFind(true)
		})
		MA.byIdEventIfExists('gamelog_find', window.gamelog_IPC.inputContext, 'contextmenu')
		MA.byIdEventIfExists('gamelog_find', (e) => {
			if ( e.code === 'Enter' || e.code === 'NumpadEnter' ) {
				e.preventDefault()
				this.clientFind(true)
			}
		}, 'keydown')
	
		setInterval(() => {
			this.getLogContents()
		}, (this.autoUpdateTimeSeconds * 1000))
	}

	// MARK: getLogContents
	async getLogContents() {
		const fileName = await window.gamelog_IPC.filename()

		window.gamelog_IPC.get().then((data) => {
			this.processLogData(data, fileName)
		})
	}

	// MARK: PROCESS LOG
	processLogData (data, fileName) {
		const autoScroll = MA.byId('auto_scroll').checked || false
		
		MA.byIdText('gameLogPath', fileName)
		
		this.dataCacheGood = false
		this.showData      = []

		let   lineNum    = 0
		let   dupeCount  = 1
		let   lastLine   = null
		let   classList  = null
		let   thisLine   = null
		let   filterList = null
		
		const allLines   = data.split('\n')
		const { showDupes } = this.getActiveFilters()

		for ( const line of allLines ) {
			if ( lastLine === line && !showDupes ) {
				dupeCount++
			} else {
				if ( lastLine !== null ) {
					this.showData.push(this.doLine(filterList, dupeCount, showDupes, classList, lineNum, thisLine))
				}

				dupeCount  = 1
				lastLine   = line
				classList  = new Set()
				filterList = new Set()
				thisLine   = line
			
				for ( const regType in this.logRegExp ) {
					if ( Array.isArray(this.logRegExp[regType].wrap) ) {
						thisLine = line.replace(this.logRegExp[regType].regex, `${this.logRegExp[regType].wrap[0]}$1${this.logRegExp[regType].wrap[1]}`)
					} else if ( line.match(this.logRegExp[regType].regex) ) {
						filterList.add(this.logRegExp[regType].filter)
						classList.add(this.logRegExp[regType].className)
					}
				}

				if ( filterList.size === 0 ) { filterList.add('other') }
			}
			lineNum++
		}

		if ( thisLine !== '' ) {
			this.showData.push(this.doLine(filterList, dupeCount, showDupes, classList, lineNum, thisLine))
		}

		this.buildDisplayTable()

		this.clientFind(true, true)

		if ( autoScroll ) {
			MA.byId('game_log_contain').scrollTo(0, MA.byId('game_log_contain').scrollHeight)
		}
	}

	// MARK: FILTER
	getActiveFilters() {
		const showThese  = new Set(MA.queryA('.filter_only:checked').map((element) => element.id.replace('debug_', '').toLowerCase() ))
		return { showDupes : showThese.has('dupes'), showThese : showThese }
	}

	filterLines() {
		if ( this.dataCacheGood ) { return this.dataCache }
		const { showThese } = this.getActiveFilters()
		const returnLines = []
		this.findCache    = []
	
		for ( const thisLine of this.showData ) {
			let goodData = true
			for ( const filter of thisLine[0] ) { if ( !showThese.has(filter) ) { goodData = false; break } }
	
			if ( goodData ) {
				const scrollColor =
					thisLine[0].has('warning') || thisLine[0].has('dev_warning') ?
						'warning' :
						thisLine[0].has('error') || thisLine[0].has('lua_error') ?
							'danger' :
							'transparent'
				returnLines.push([thisLine[1], scrollColor])
				this.findCache.push([thisLine[2], thisLine[3]])
			}
		}
		this.dataCache     = returnLines
		this.dataCacheGood = true
		return returnLines
	}

	// MARK: DISPLAY [part]
	buildDisplayTable() {
		const theTable   = MA.byId('game_log')
		const theContain = MA.byId('game_log_contain')
		const rowHeight  = 19
		const thisData   = this.filterLines()

		const overScrollCheck = (thisData.length * rowHeight) + (rowHeight * 2) - theContain.offsetHeight

		if ( theContain.scrollTop > overScrollCheck ) {
			theContain.scrollTo({top : overScrollCheck, behavior : 'instant'})
		}
		
		const startAt   = Math.floor(theContain.scrollTop)
		const startIdx  = Math.floor(startAt / rowHeight)
		const totalShow = Math.floor( theContain.offsetHeight / rowHeight )
		const endIdx    = startIdx + totalShow
		const endPad    = Math.max(rowHeight * 2, ((thisData.length - 1) * rowHeight) - theContain.offsetHeight - startAt)
		
		MA.byId('game_log_scroll').innerHTML = ( thisData.length < 5000 ) ?
			thisData.map((x) => `<div class="flex-grow-1 bg-${x[1]}"></div>`).join('') :
			''

		theTable.innerHTML = [
			this.lineEntry('', '', '', '', startAt),
			...thisData.slice(startIdx, endIdx).map((x) => x[0]),
			this.lineEntry('', '', '', '', endPad)
		].join('')

		this.highLightFinds()
	}

	// MARK: HTML Line
	lineEntry(cell1 = '', cell2 = '', cell3 = '', cell3ClassList = new Set(), height = '19') {
		return [
			`<tr style="height:${height}px">`,
			'<td>', cell1, '</td>',
			'<td class="logLineName">', cell2, '</td>',
			`<td class="logLine ${[...cell3ClassList].join(' ')}">`, cell3, '</td>',
			'</tr>'
		].join('')
	}

	// MARK: DATA Line
	doLine(filterList, dupeCount, showDupes, classList, lineNum, thisLine) {
		return [
			filterList,
			this.lineEntry(
				!showDupes && dupeCount > 1 ? `<span class="badge rounded-pill text-bg-danger">${dupeCount}</span>` : '',
				lineNum,
				thisLine,
				classList
			),
			thisLine,
			lineNum
		]
	}

	// MARK: highLightFinds
	highLightFinds() {
		const thisFind = MA.byIdValueLC('gamelog_find')
		const allLines = MA.query('.logLine')

		/* too short, clear input and reset display */
		if ( thisFind.length < 2 ) {
			for ( const thisLine of allLines ) {
				thisLine.classList.remove('bg-warning', 'text-white', 'bg-opacity-50', 'bg-opacity-25')
			}
			return
		}

		for ( const thisLine of allLines ) {
			if ( thisLine.innerText.toLowerCase().includes(thisFind) ) {
				if ( this.finds[this.findIdx][1].toString() === thisLine.parentElement.querySelector('.logLineName').innerText ) {
					thisLine.classList.add('bg-warning', 'text-white', 'bg-opacity-50')
				} else {
					thisLine.classList.add('bg-warning', 'bg-opacity-25')
				}
			}
		}
	}

	// MARK: clientFind [data]
	clientFind(doForward = false, isReload = false) {
		this.finds    = []
		const thisFind = MA.byIdValueLC('gamelog_find')

		/* too short, clear input and reset display */
		if ( thisFind.length < 2 ) {
			MA.byIdText('currentFindIndex', '0')
			MA.byIdText('currentFindTotal', '0')
			if ( thisFind.length !== 0 ) {
				MA.byIdHTML('gamelog_find', '')
			}
			this.lastFind = null
			this.findIdx  = 0
			this.highLightFinds()
			return
		}

		/* is new? */
		if ( this.lastFind === null || thisFind !== this.lastFind ) {
			this.lastFind = thisFind
			this.findIdx  = 0
		} else {
			this.findIdx = !isReload ? this.findIdx + ( doForward ? 1 : -1 ) : this.findIdx
		}

		/* highlight them */
		for ( let i = 0; i < this.dataCache.length; i++ ) {
			if ( this.findCache[i][0].toLowerCase().includes(thisFind) ) {
				this.finds.push([i, this.findCache[i][1]])
			}
		}

		/* fix index if needed */
		if ( this.finds.length !== 0 ) {
			this.findIdx = this.findIdx % (this.finds.length)
			this.findIdx = this.findIdx < 0 ? this.findIdx + this.finds.length : this.findIdx
			MA.byIdText('currentFindIndex', this.findIdx + 1)
			MA.byIdText('currentFindTotal', this.finds.length)
		} else {
			MA.byIdText('currentFindIndex', '0')
			MA.byIdText('currentFindTotal', '0')
		}
		
		if ( this.finds.length !== 0 && !isReload ) {
			MA.byId('game_log_contain').scrollTo({top : this.finds[this.findIdx][0] * 19, behavior : 'instant'})
		}
	}

	// MARK: CLICKERS
	clientClearInput() {
		MA.byIdValue('gamelog_find', '')
		this.clientFind(true)
	}

	clientCatchEnter(e) {
		if ( e.code === 'Enter' || e.code === 'NumpadEnter' ) {
			e.preventDefault()
			this.clientFind(true)
		}
	}
}
