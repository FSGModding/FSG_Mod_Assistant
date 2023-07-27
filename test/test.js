/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program

// Define tests here, using the file name.  Called with .test(<log library class>)
const startTime  = Date.now()
const testList   = [
	'modcheck',     // Mod Checker
	'modcollect',   // Collection test
	'modlook',      // Mod Internal Looker
	'modtrack',     // Mod tracking
	'savegame',     // Savegame Reading
	'sourcecode',   // ESLint Source code
	'translations', // Translation file check
]

const c       = require('ansi-colors')
const path    = require('path')
const os      = require('os')
// const process = require('process')
const { ma_logger, ddsDecoder, maIPC } = require('../lib/modUtilLib.js')


maIPC.log = new ma_logger('multi-test')
maIPC.log.forceNoConsole()

maIPC.decode = new ddsDecoder(path.join(__dirname, '..', '..', 'texconv.exe'), os.tmpdir())

maIPC.notes    = { store : {}, get : () => null }
maIPC.settings = { store : {}, get : () => null }
maIPC.modCache = { store : {}, get : () => null }
maIPC.sites    = { store : {}, get : () => null }

const envLines = []
const failedTests = new Set()
const testLib = class {
	#setENV   = false
	#steps    = []
	#title    = null
	#didFail  = false
	#softFail = false

	constructor(name, silentFail = false, setENV = false ) {
		this.#title    = name
		this.#softFail = silentFail
		this.#setENV   = setENV
	}

	step(text) { this.#steps.push([false, `${text}.`, false]) }
	step_fmt(text) { this.#steps.push([false, text, true]) }

	error (text) {
		if ( ! this.#softFail ) {
			failedTests.add(this.#title)
		}
		process.exitCode = 1
		this.#didFail = true
		this.#steps.push([true, text, false])
	}

	end(doEnv = false) {
		/* eslint-disable no-console */
		if ( this.#setENV ) {
			envLines.push(!this.#didFail ?
				`## ✓ PASSED: ${this.#title}` :
				`## 🗙 FAILED: ${this.#title}`
			, '')
			envLines.push(...this.#steps.map((x) => `${x[2] ? '' : ' - '}${x[1]}`), '')
		}

		console.log(
			!this.#didFail ?
				c.greenBright(`✓ PASSED: ${c.green(this.#title)}`) :
				c.redBright(`🗙 FAILED: ${c.red(this.#title)}`)
		)
		console.log(
			this.#steps.map((x) => c.gray(` --${c[x[0] ? 'red' : 'cyan'](`  ${x[1]}`)}`)).join('\n'),
			'\n'
		)
		if ( doEnv ) {
			process.env.GITHUB_STEP_SUMMARY =['# Testing Results', '', ...envLines].join('\n')
		}
		/* eslint-enable no-console */
	}
}

module.exports.testLib = testLib

const runTests = []
for ( const thisTest of testList ) {
	runTests.push(require(`./tests/${thisTest}.js`).test())
}

Promise.allSettled(runTests).then(() => {
	const rootTest = new testLib('All Tests', true, true)
	if ( failedTests.size !== 0 ) {
		for ( const thisTest of failedTests ) {
			rootTest.error(`${thisTest} -- Failed`)
		}
	} else {
		rootTest.step('All Tests Passed')
	}
	
	rootTest.step(`Tests took ${Date.now() - startTime}ms to complete`)
	require('./tests/packagestat.js').test().then(() => {
		rootTest.end(true)
	})
	
	// console.log(maIPC.log.textLog)
})