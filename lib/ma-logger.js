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

	constructor( defaultProcess, app, fileName = null) {
		this.#process = defaultProcess

		if ( app !== null ) {
			this.#isPacked = app.isPackaged
			this.#dataPath = app.getPath('userData')

			if ( fileName !== null ) {
				this.#fullFileName = path.join(this.#dataPath, fileName)
				fs.writeFileSync(this.#fullFileName, '')
			}
		}
	}

	#trans = {
		console : (text) => { if ( ! this.#isPacked ) { console.log(text) } },
		file    : (text) => { if ( this.#fullFileName !== null ) { fs.appendFileSync(this.#fullFileName, text) } },
	}

	#addToLog(level, process, text) {
		const logTime = new Date()
		const logTimeString = `${logTime.getFullYear()}-${(logTime.getMonth()+1).toString().padStart(2, '0')}-${(logTime.getDate()).toString().padStart(2, '0')} ${(logTime.getHours()).toString().padStart(2, '0')}:${(logTime.getMinutes()).toString().padStart(2, '0')}:${(logTime.getSeconds()).toString().padStart(2, '0')}`
		const cleanProcess  = process === null || process === this.#process ? '' : `${process} >> `
		const simpleText    = `${logTimeString} | ${level.toUpperCase()} | ${cleanProcess}${text}`
		const htmlText      = `<em>${logTimeString}</em> | <span class="${this.#level_to_color[level]}">${level.toUpperCase()}</span> | ${cleanProcess}${text}`

		Object.keys(this.#trans).forEach((transport) => {
			this.#trans[transport](simpleText)
		})
		this.#textLog.push(htmlText)
	}

	log = {
		debug   : (text, process = null) => { this.#addToLog('debug', process, text) },
		info    : (text, process = null) => { this.#addToLog('info', process, text) },
		notice  : (text, process = null) => { this.#addToLog('notice', process, text) },
		warning : (text, process = null) => { this.#addToLog('warning', process, text) },
		danger  : (text, process = null) => { this.#addToLog('danger', process, text) },
	}

	get textLog() { return this.#textLog.join('\n') }
	get htmlLog() { return this.#htmlLog.join('\n') }
}


module.exports = {
	ma_logger  : ma_logger,
}