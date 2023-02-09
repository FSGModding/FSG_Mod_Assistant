/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Logger Class

const fs   = require('fs')
const path = require('path')

class ma_logger {
	#isPacked     = false
	#dataPath     = null
	#fullFileName = null
	#dangerEvent  = null

	#fileHandle   = null

	#textLog = []
	#htmlLog = []
	#process = ''

	#level_to_color = {
		debug   : 'fw-bold text-muted',
		info    : 'fw-bold text-info',
		notice  : 'fw-bold text-success',
		warning : 'fw-bold text-warning',
		danger  : 'fw-bold text-danger',
	}

	constructor( defaultProcess, app = null, fileName = null, clearFile = true, dangerCallBack = null) {
		this.#process = defaultProcess
		this.#dangerEvent = dangerCallBack

		if ( app !== null ) {
			this.#isPacked = app.isPackaged
			this.#dataPath = app.getPath('userData')

			if ( fileName !== null && clearFile ) {
				this.#fullFileName = path.join(this.#dataPath, fileName)
				this.#fileHandle   = fs.createWriteStream(this.#fullFileName)

				this.#fileHandle.on('error', (err) => {
					delete this.#trans.file
					this.#addToLog('danger', 'logging-class', `File write failed : ${err.message}`)
				})
			}
		}
	}

	#trans = {
		// eslint-disable-next-line no-console
		console : (text) => { if ( ! this.#isPacked ) { console.log(text) } },
		file    : (text) => { if ( this.#fullFileName !== null ) { this.#fileHandle.write(`${text}\n`) } },
	}

	#addToLog(level, process, text) {
		if ( level === 'danger' ) { this.#dangerEvent() }
		const cleanTextLine = text.replaceAll('\n', ' -- ')
		const logTime       = new Date()
		const logTimeString = `${logTime.getFullYear()}-${(logTime.getMonth()+1).toString().padStart(2, '0')}-${(logTime.getDate()).toString().padStart(2, '0')} ${(logTime.getHours()).toString().padStart(2, '0')}:${(logTime.getMinutes()).toString().padStart(2, '0')}:${(logTime.getSeconds()).toString().padStart(2, '0')}`
		const cleanProcess  = process === null || process === this.#process ? '' : `${process} >> `
		const simpleText    = `${logTimeString} | ${level.toUpperCase().padStart(7, ' ')} | ${cleanProcess}${cleanTextLine}`
		const htmlText      = `<em>${logTimeString}</em> | <span class="log_level ${this.#level_to_color[level]}">${level.toUpperCase().padStart(7, ' ')}</span> | ${cleanProcess}${cleanTextLine}`

		for (const transport in this.#trans) {
			this.#trans[transport](simpleText)
		}
		this.#htmlLog.push(htmlText)
		this.#textLog.push(simpleText)
	}

	log = {
		debug   : (text, process = null) => { this.#addToLog('debug', process, text) },
		info    : (text, process = null) => { this.#addToLog('info', process, text) },
		notice  : (text, process = null) => { this.#addToLog('notice', process, text) },
		warning : (text, process = null) => { this.#addToLog('warning', process, text) },
		warn    : (text, process = null) => { this.#addToLog('warning', process, text) },
		danger  : (text, process = null) => { this.#addToLog('danger', process, text) },
		error   : (text, process = null) => { this.#addToLog('danger', process, text) },
	}

	get pathToLog() { return this.#fullFileName }
	get textLog()   { return this.#textLog.join('\n') }
	get htmlLog()   { return this.#htmlLog.join('\n') }
}


module.exports = {
	ma_logger  : ma_logger,
}