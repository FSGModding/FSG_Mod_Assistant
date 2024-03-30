/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program

// Define tests here, using the file name.  Called with .test(<log library class>)
const startTime  = Date.now()
const testList   = [
	'csvcheck',     // CSV Reader (collection compare)
	'modcheck',     // Mod Checker
	'modcollect',   // Collection test
	'modlook',      // Mod Internal Looker
	'modtrack',     // Mod tracking
	'savegame',     // Savegame Reading
	'sourcecode',   // ESLint Source code
	'sourcehtml',   // HTML Source
	'translations', // Translation file check
]
const args = process.argv.slice(2)

if ( args.length !== 0 ) {
	testList.length = 0
	testList.push(...args)
}

const c       = require('ansi-colors')
const path    = require('node:path')
const fs      = require('node:fs')

const { ma_logger, serveIPC } = require('../lib/modUtilLib.js')

const fakeStore = { store : {}, get : (defValue) => typeof defValue !== 'undefined' ? defValue : null }

serveIPC.log = new ma_logger('multi-test')
serveIPC.log.forceNoConsole()
serveIPC.isBotDisabled      = true
serveIPC.isModCacheDisabled = true

serveIPC.storeCacheDetail = fakeStore
serveIPC.storeNote        = fakeStore
serveIPC.storeSet         = fakeStore
serveIPC.storeSites       = fakeStore
serveIPC.storeCache       = { getMod : () => false, setMod : () => null, saveFile : () => null }
serveIPC.decodePath       = path.join(__dirname, '..', 'texconv.exe')

const L_LOG  = 0
const L_NORM = 1
const L_WARN = 2
const L_ERR  = 3

const envLines    = []
const failedTests = new Set()
const warnedTests = new Set()
const testLib     = class {
	#setENV   = false
	#steps    = []
	#title    = null
	#didFail  = false
	#didWarn  = false
	#softFail = false

	constructor(name, silentFail = false, setENV = false ) {
		this.#title    = name
		this.#softFail = silentFail
		this.#setENV   = setENV
	}

	#addStep(level, text, preFmt = false) {
		this.#steps.push({
			preFmt : preFmt,
			lvl    : level,
			text   : text,
		})
	}

	step(text)      { this.#addStep(L_NORM, text) }
	step_log(text)  { this.#addStep(L_LOG, text) }
	step_fmt(text)  { this.#addStep(L_LOG, text, true) }

	warn(text)      {
		if ( ! this.#softFail ) {
			warnedTests.add(this.#title)
		}
		this.#didWarn = true
		this.#addStep(L_WARN, text)
	}

	error (text)    {
		if ( ! this.#softFail ) {
			failedTests.add(this.#title)
		}
		process.exitCode = 1
		this.#didFail = true
		this.#addStep(L_ERR, text)
	}

	#getDisplayLine(step, color = true) {
		const spacer   = step.preFmt ? '' : !color ? '- ' : c.gray(' -- ')
		const realColor = ['gray', 'cyan', 'yellow', 'red'][step.lvl]

		if ( !color ) {
			return `${spacer}${step.text}`
		}
		return `${spacer}${c[realColor](step.text)}`
	}

	#getTestSummary(color = true) {
		if ( this.#didFail ) {
			return color ? c.redBright(`🗙 FAILED: ${c.red(this.#title)}`) : `## 🗙 FAILED: ${this.#title}`
		}
		if ( this.#didWarn ) {
			return color ? c.yellowBright(`⟁ WARNINGS: ${c.yellow(this.#title)}`) : `## ⟁ WARNINGS: ${this.#title}`
		}
		return color ? c.greenBright(`✓ PASSED: ${c.green(this.#title)}`) : `## ✓ PASSED: ${this.#title}`
	}

	end(doEnv = false, onlyError = false) {
		/* eslint-disable no-console */
		const displaySteps = onlyError && this.#didFail ? this.#steps.filter((x) => x.lvl === L_WARN || x.lvl === L_ERR): this.#steps
		if ( this.#setENV ) {
			envLines.push(
				this.#getTestSummary(false),
				'',
				...this.#steps.map((x) => this.#getDisplayLine(x, false)),
				''
			)
		}

		console.log(this.#getTestSummary())
		console.log(
			displaySteps.map((x) => this.#getDisplayLine(x)).join('\n'),
			'\n'
		)
		if ( doEnv ) {
			fs.writeFileSync(path.join(__dirname, '..', 'TEST_OUTPUT.md'), ['# Testing Results', '', ...envLines].join('\n'))
		}
		/* eslint-enable no-console */
	}
}

module.exports.testLib = testLib

if (require.main === module) {
	const runTests = []
	for ( const thisTest of testList ) {
		runTests.push(require(`./tests/${thisTest}.js`).test())
	}

	Promise.allSettled(runTests).then(() => {
		const rootTest = new testLib('All Tests', true, true)
		if ( failedTests.size !== 0 || warnedTests !== 0 ) {
			for ( const thisTest of failedTests ) {
				rootTest.error(`${thisTest} -- Failed`)
			}
			for ( const thisTest of warnedTests ) {
				rootTest.warn(`${thisTest} -- Warnings`)
			}
		} else {
			rootTest.step('All Tests Passed')
		}
		
		rootTest.step(`Tests took ${Date.now() - startTime}ms to complete`)

		if ( args.length === 0 ) {
			require('./tests/packagestat.js').test().then(() => {
				rootTest.end(true)
			})
		} else {
			rootTest.end(true)
		}

		// console.log(serveIPC.log.textLog)
	})
}