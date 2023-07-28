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

const failedTests = new Set()
const testLib = class {
	#steps    = []
	#title    = null
	#didFail  = false
	#softFail = false

	constructor(name, silentFail = false ) {
		this.#title    = name
		this.#softFail = silentFail
	}

	step(text) { this.#steps.push([false, `${text}.`]) }

	error (text) {
		if ( ! this.#softFail ) {
			failedTests.add(this.#title)
		}
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

module.exports.testLib = testLib

const runTests = []
for ( const thisTest of testList ) {
	runTests.push(require(`./tests/${thisTest}.js`).test())
}

Promise.allSettled(runTests).then(() => {
	const rootTest = new testLib('All Tests', true)
	if ( failedTests.size !== 0 ) {
		for ( const thisTest of failedTests ) {
			rootTest.error(`${thisTest} -- Failed`)
		}
	} else {
		rootTest.step('All Tests Passed')
	}
	rootTest.end()
})