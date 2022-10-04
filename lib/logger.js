/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Logger Class

class mcLogger {
	logContents = []

	/**
	 * Log "info"
	 * 
	 * @param  {} caller Closest process caller.
	 * @param  {} text Text to log
	 */
	info(caller, text) {
		this.logContents.push(['INFO', 'fw-bold text-info', new Date(), caller, text])
	}

	/**
	 * Log "notice"
	 * 
	 * @param  {} caller Closest process caller.
	 * @param  {} text Text to log
	 */
	notice(caller, text) {
		this.logContents.push(['NOTICE', 'fw-bold text-warning', new Date(), caller, text])
	}

	/**
	 * Log "file error"
	 * 
	 * @param  {} caller Closest process caller.
	 * @param  {} text Text to log
	 */
	fileError(caller, text) {
		this.logContents.push(['FILE-ERROR', 'fw-bold text-danger', new Date(), caller, text])
	}

	/**
	 * Log "fatal error"
	 * 
	 * @param  {} caller Closest process caller.
	 * @param  {} text Text to log
	 */
	fatal(caller, text) {
		this.logContents.push(['FATAL', 'text-white bg-danger', new Date(), caller, text])
	}

	/**
	 * Log "icon" (anything having to do with icon load & display)
	 * 
	 * @param  {} caller Closest process caller.
	 * @param  {} text Text to log
	 */
	icon(caller, text) {
		this.logContents.push(['ICON-ERROR', 'fw-bold text-muted', new Date(), caller, text])
	}

	/** Get log contents as a simple string */
	get toDisplayText() {
		return this.logContents.map((item) => { return `${item[0]}: ${item[2].toISOString()} (${item[3]}) ${item[4]}`}).join('\n')
	}

	/** Get log contents as styled HTML (bootstrap v5) */
	get toDisplayHTML() {
		return this.logContents.map((item) => { return `<span class="${item[1]}" style="margin-left: -10px">${item[0]}:</span> <em>${item[2].toISOString()}</em> (${item[3]}) ${item[4]}`}).join('\n')
	}
}


module.exports = {
	mcLogger  : mcLogger,
}