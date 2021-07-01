//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Test to make sure the mod reader is working as expected

// (c) 2021 JTSage.  MIT License.
require('colors')
const path      = require('path')
const c         = require('ansi-colors')
const Diff      = require('diff')

const gameFolder = path.join(__dirname, 'testRunnerMods')
const fileFolder = path.join(gameFolder, 'mods')

const { modReader, mcLogger }  = require('../lib/mod-checker.js')
const translator   = require('../lib/translate.js')
const myTranslator = new translator.translator('en')

let exitCode  = 0
const logger  = new mcLogger()
const modList = new modReader(gameFolder, fileFolder, logger, myTranslator.deferCurrentLocale)

const expectedConflictList = [
	'EXAMPLE_Fake_Cracked_DLC',
	'EXAMPLE_Good_Mod (1), EXAMPLE_Good_Mod - Copy, EXAMPLE_Good_Mod, EXAMPLE_Good_Mod_Folder_and_Zip, EXAMPLE_Good_Mod_No_Original - Copy, EXAMPLE_Good_Mod_Folder_Warning',
	'EXAMPLE_Good_Mod_Folder_and_Zip',
	'EXAMPLE_Good_Mod_Folder_Warning'
]
const expectedBrokenList = [
	['EXAMPLE_Broken_Zip_File',
		['FILE_ERROR_UNREADABLE_ZIP']
	],
	['EXAMPLE_Garbage_File',
		['FILE_ERROR_NAME_INVALID', 'FILE_ERROR_GARBAGE_FILE']
	],
	['EXAMPLE_Good_Mod (1)',
		['FILE_ERROR_LIKELY_COPY', 'FILE_ERROR_NAME_INVALID']
	],
	['EXAMPLE_Good_Mod - Copy',
		['FILE_ERROR_LIKELY_COPY', 'FILE_ERROR_NAME_INVALID']
	],
	['EXAMPLE_Good_Mod_No_Original - Copy',
		['FILE_ERROR_LIKELY_COPY', 'FILE_ERROR_NAME_INVALID']
	],
	['EXAMPLE_Icon_Not_Found',
		['MOD_ERROR_NO_MOD_ICON']
	],
	['EXAMPLE_Malformed_ModDesc',
		['MOD_ERROR_MODDESC_DAMAGED_RECOVERABLE']
	],
	['EXAMPLE_Missing_ModDesc',
		['NOT_MOD_MODDESC_MISSING']
	],
	['EXAMPLE_No_Icon',
		['MOD_ERROR_NO_MOD_ICON']
	],
	['EXAMPLE_No_Version',
		['MOD_ERROR_NO_MOD_VERSION']
	],
	['EXAMPLE_Old_ModDesc',
		['NOT_MOD_MODDESC_VERSION_OLD_OR_MISSING']
	],
	['EXAMPLE_Really_Malformed_ModDesc',
		['MOD_ERROR_MODDESC_DAMAGED_RECOVERABLE', 'MOD_ERROR_NO_MOD_ICON']
	]
]
const expectedGoodList = [
	['EXAMPLE_Bad_ModDesc_CRC', 'Bulbulator', '1.0.0.0'],
	['EXAMPLE_Fake_Cracked_DLC', 'Fake Cracked DLC', '1.0.0.0'],
	['EXAMPLE_Good_Mod', 'Totally valid FS19 Mod', '1.0.0.0'],
	['EXAMPLE_Good_Mod_Folder_and_Zip', 'Totally valid FS19 Mod', '1.0.0.0'],
	['EXAMPLE_Good_Mod_Folder_Warning', 'Totally valid FS19 Mod', '1.0.0.0'],
	['EXAMPLE_Malformed_ModDesc', 'Mod with malformed XML', '1.0.0.0']
]


modList.readAll().then(() => {
	console.log(c.cyan('NOTICE: File Read Done, Testing Proceeding Async - Calling First Search, will return when testing is complete.'))

	/* Check broken list */
	modList.getBrokenList(['shortName', 'failedTestList']).then((results) => {
		if (JSON.stringify(expectedBrokenList) === JSON.stringify(results)) {
			console.log(c.green('PASS: Broken list is as expected'))
		} else {
			exitCode = 1
			console.log(c.red('FAIL: Broken list is not as expected'))
			const diff = Diff.diffChars(JSON.stringify(expectedBrokenList), JSON.stringify(results))
 
			diff.forEach((part) => {
				const color = part.added ? 'green' :
					part.removed ? 'red' : 'grey'
				process.stderr.write(part.value[color])
			})
			console.log()
		}
	})

	/* Check conflict list */
	modList.conflictList('').then((results) => {
		const simpleResults = results.map((x) => { return x[0] })
		if (JSON.stringify(simpleResults) === JSON.stringify(expectedConflictList)) {
			console.log(c.green('PASS: Conflict list is as expected'))
		} else {
			exitCode = 1
			console.log(c.red('FAIL: Conflict list is not as expected'))
			const diff = Diff.diffChars(JSON.stringify(expectedConflictList), JSON.stringify(simpleResults))
 
			diff.forEach((part) => {
				const color = part.added ? 'green' :
					part.removed ? 'red' : 'grey'
				process.stderr.write(part.value[color])
			})
			console.log()
		}
	})

	/* Check good list */
	modList.search({
		columns             : ['shortName', 'title', 'mod_version'],
		allTerms            : true,
		terms               : ['isNotMissing', 'didTestingPassEnough'],
	}).then((results) => {
		if (JSON.stringify(expectedGoodList) === JSON.stringify(results)) {
			console.log(c.green('PASS: Good list is as expected'))
		} else {
			exitCode = 1
			console.log(c.red('FAIL: Good list is not as expected'))
			const diff = Diff.diffChars(JSON.stringify(expectedGoodList), JSON.stringify(results))
 
			diff.forEach((part) => {
				const color = part.added ? 'green' :
					part.removed ? 'red' : 'grey'
				process.stderr.write(part.value[color])
			})
			console.log()
		}
		if ( exitCode === 1 ) {
			console.log(logger.toDisplayText)
		}
		process.exit(exitCode)
	})
})


console.log(c.cyan('NOTICE: End File Code. There may (should!) still be running async processes'))