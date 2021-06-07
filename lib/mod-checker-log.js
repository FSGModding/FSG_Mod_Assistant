//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Mod File Parser - Log Class
//  (collection, Mod Record, and Failure Diagnostics)

// (c) 2021 JTSage.  MIT License.

module.exports = class mcLogger {
	logContents = []

	info(caller, text) {
		this.logContents.push(['INFO', 'fw-bold text-info', new Date(), caller, text])
	}

	notice(caller, text) {
		this.logContents.push(['NOTICE', 'fw-bold text-warning', new Date(), caller, text])
	}

	fileError(caller, text) {
		this.logContents.push(['FILE-ERROR', 'fw-bold text-danger', new Date(), caller, text])
	}

	fatal(caller, text) {
		this.logContents.push(['FATAL', 'text-white bg-danger', new Date(), caller, text])
	}

	icon(caller, text) {
		this.logContents.push(['ICON-ERROR', 'fw-bold text-muted', new Date(), caller, text])
	}

	get toDisplayText() {
		return this.logContents.map((item) => { return `${item[0]}: ${item[2].toISOString()} (${item[3]}) ${item[4]}`}).join('\n')
	}

	get toDisplayHTML() {
		return this.logContents.map((item) => { return `<span class="${item[1]}" style="margin-left: -10px">${item[0]}:</span> <em>${item[2].toISOString()}</em> (${item[3]}) ${item[4]}`}).join('\n')
	}
}