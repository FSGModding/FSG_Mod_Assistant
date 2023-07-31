/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

/* eslint no-console: off */
// Test Program

const path       = require('node:path')
const fs         = require('node:fs')
const testPath   = path.join(__dirname, '../translations')

const raw_en = fs.readFileSync(path.join(testPath, 'en.json'))
const trans_data = JSON.parse(raw_en)

console.log('FSG Mod Assistant : Translations')
console.log('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\n')

let exitCode = 0
let folderContents = []

try {
	folderContents = fs.readdirSync(testPath, {withFileTypes : true})
} catch (err) {
	console.log(`Couldn't open test folder :: ${err}`)
	exitCode = 1
	process.exit(exitCode)
}

for ( const thisFile of folderContents ) {
	if ( thisFile.name === 'en.json' ) { continue }

	let noneFound = true
	const entryMissing = {}
	const entryExtra   = {}

	console.log(`Testing ${thisFile.name}...`)

	try {
		const rawFileContents = fs.readFileSync(path.join(testPath, thisFile.name))
		const fileContents = JSON.parse(rawFileContents)

		for ( const expectedKey in trans_data ) {
			if ( ! ( expectedKey in fileContents ) ) {
				noneFound = false
				entryMissing[expectedKey] = trans_data[expectedKey]
				fileContents[expectedKey] = trans_data[expectedKey]
			}
		}
		for ( const expectedKey in fileContents ) {
			if ( ! ( expectedKey in trans_data ) ) {
				noneFound = false
				entryExtra[expectedKey] = fileContents[expectedKey]
				delete fileContents[expectedKey]
			}
		}

		if ( Object.keys(entryExtra).length !== 0 ) {
			console.log('  --Extra Keys Removed:')
			console.log(JSON.stringify(entryExtra, null, '  '))
			console.log('\n')
		}
		if ( Object.keys(entryMissing).length !== 0 ) {
			console.log('  --Missing Keys Added:')
			console.log(JSON.stringify(entryMissing, null, '  '))
			console.log('\n')
		}
		if ( noneFound ) {
			console.log('  --Keys Match!')
			console.log('\n')
		}
		if ( !noneFound ) {
			fs.writeFileSync(path.join(testPath, thisFile.name), JSON.stringify(fileContents, null, '\t'))
		}
	} catch (err) {
		console.log(`Issue with file ${thisFile.name} :: ${err}`)
		exitCode = 1
	}
}


console.log(`\n\nExiting with code ${exitCode}\n`)
process.exit(exitCode)
