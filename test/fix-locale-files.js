/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Language file clean & sync
// For full operation, requires a deepL api key in <project_root>/.deepl_key
//   - If the deepL key is not found, defaults to syncing with the english translation instead

const path        = require('node:path')
const fs          = require('node:fs')
const { testLib } = require('./test.js')

const testPath       = path.join(__dirname, '../translations')
const baseLocaleData = JSON.parse(fs.readFileSync(path.join(testPath, 'en.json')))
const baseLocaleKeys = new Set(Object.keys(baseLocaleData).sort(Intl.Collator().compare))
const test           = new testLib('Local File Fixer')

const deepl          = require('deepl-node')
let   deeplKey       = 'xxx'

if ( fs.existsSync(path.join(__dirname, '..', '.deepl_key'))) {
	deeplKey = fs.readFileSync(path.join(__dirname, '..', '.deepl_key'), 'utf8').trim()
}

const translator     = new deepl.Translator(deeplKey)

const fileMap = {
	cs : 'ZH',
	cz : 'CS',
	de : 'DE',
	es : 'ES',
	fr : 'FR',
	lv : 'LV',
	nl : 'NL',
	pl : 'PL',
	pt : 'PT-PT',
	ru : 'RU',
}

/* Clean indentation and sort ENGLISH file */
fileWriter(baseLocaleData, 'en')

checkFiles().catch((err) => {
	test.error(`Unexpected error: ${err}`)
}).finally(() => {
	test.end()
})

async function checkFiles() {
	const fileChecks = []
	for ( const thisFileName of Object.keys(fileMap) ) {
		fileChecks.push(testFile(thisFileName).then((contents) => { fileWriter(contents, thisFileName) }))
	}

	return Promise.allSettled(fileChecks)
}

async function testFile(file) {
	let thisFile = {}

	try {
		thisFile = JSON.parse(fs.readFileSync(path.join(testPath, `${file}.json`)))
		const thisFileKeys = new Set(Object.keys(thisFile))
		const extraKeys    = new Set([...thisFileKeys].filter((x) => !baseLocaleKeys.has(x)))
		const missingKeys  = new Set([...baseLocaleKeys].filter((x) => !thisFileKeys.has(x)))

		if ( extraKeys.size !== 0 ) {
			test.warn(`${file} :: Extra keys removed : ${[...extraKeys].join(', ')}`)
			for ( const thisKey of extraKeys ) { delete thisFile[thisKey] }
		}
		if ( missingKeys.size !== 0 ) {
			test.warn(`${file} :: Missing keys added : ${[...missingKeys].join(', ')}`)
			const stringsToTranslate = [...missingKeys].map((x) => baseLocaleData[x])

			await translator.translateText(
				stringsToTranslate,
				'en',
				fileMap[file]
			).then((results) => {
				for ( const [idx, thisKey] of [...missingKeys].entries() ) {
					thisFile[thisKey] = results[idx].text
				}
				test.step(`${file} :: Got Translated Data`)
			}).catch((err) => {
				for ( const thisKey of missingKeys ) {
					thisFile[thisKey] = baseLocaleData[thisKey]
				}
				test.error(`${file} :: Translation failed, added english : ${err}`)
			})
		}
	} catch (err) {
		test.error(`Could not process ${file} :: ${err}`)
	}

	return thisFile
}

function fileWriter(data, file) {
	test.step(`${file} :: Writing Clean File`)
	const keysToWrite = Object.keys(data).sort(Intl.Collator().compare)
	const longestKey  = keysToWrite.reduce((a, b) => a.length <= b.length ? b : a).length
	const fileLines   = []

	for ( const thisKey of keysToWrite ) {
		fileLines.push(`\t"${thisKey}"${' '.padEnd(longestKey - thisKey.length)}: ${JSON.stringify(data[thisKey])}`)
	}

	fs.writeFileSync(path.join(testPath, `${file}.json`), `{\n${fileLines.join(',\n')}\n}\n`)
}
