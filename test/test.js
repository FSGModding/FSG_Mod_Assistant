/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program

// Define tests here, using the file name.  Called with .test(<log library class>)
const testList   = [
	'translations', // Translation file check
	'modtrack',     // Mod tracking
	'modlook',      // Mod Internal Looker
	'modcheck',     // Mod Checker
	'savegame',     // Savegame Reading
	'sourcecode',   // ESLint Source code
]

const c       = require('ansi-colors')
const path    = require('path')
const os      = require('os')
const { ma_logger, ddsDecoder, maIPC } = require('../lib/modUtilLib.js')

maIPC.log = new ma_logger('multi-test')
maIPC.log.forceNoConsole()

maIPC.decode = new ddsDecoder(path.join(__dirname, '..', '..', 'texconv.exe'), os.tmpdir())


module.exports.testLib = class {
	#steps    = []
	#title    = null
	#didFail  = false

	constructor(name) {	this.#title = name }

	step(text) { this.#steps.push([false, `${text}.`]) }

	error (text) {
		process.exitCode = 1
		this.#didFail = true
		this.#steps.push([true, text])
	}

	end() {
		/* eslint-disable no-console */
		console.log(
			!this.#didFail ?
				c.greenBright(`✓ PASSED: ${c.green(this.#title)}`) :
				c.redBright(`🗙 FAILED: ${c.red(this.#title)}`)
		)
		console.log(
			this.#steps.map((x) => c.gray(` --${c[x[0] ? 'red' : 'cyan'](`  ${x[1]}`)}`)).join('\n'),
			'\n'
		)
		/* eslint-enable no-console */
	}
}

for ( const thisTest of testList ) {
	require(`./tests/${thisTest}.js`).test()
}