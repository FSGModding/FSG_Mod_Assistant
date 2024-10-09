/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program - Language Files

const path      = require('node:path')
const fs        = require('node:fs/promises')
const {testLib} = require('../test.js')

module.exports.test = async () => {
	return Promise.all([
		checkLangs()
	])
}

const expectFiles = new Set([
	'cs.json',
	'cz.json',
	'de.json',
	'en.json',
	'es.json',
	'fr.json',
	'it.json',
	'lv.json',
	'nl.json',
	'pl.json',
	'pt.json',
	'ru.json',
])

const checkLangs = () => {
	const test     = new testLib('Language Test')
	const langPath = path.join(__dirname, '..', '..', 'translations')
	
	test.step('Loading \'en.json\' as Known Good')
	return fs.readFile(path.join(langPath, 'en.json')).then(async (enData) => {
		const enFile = JSON.parse(enData)
		
		const checkFiles = await fs.readdir(langPath, {withFileTypes : true})
		const fileChecks = []

		for ( const thisFile of checkFiles ) {
			if ( !expectFiles.has(thisFile.name) ) {
				test.error(`Unexpected File: ${thisFile.name}`)
			} else {
				expectFiles.delete(thisFile.name)
			}

			fileChecks.push(fs.readFile(path.join(langPath, thisFile.name)).then((rawFileContents) => {
				const errors = []
				const fileContents = JSON.parse(rawFileContents)

				for ( const expectedKey in enFile ) {
					if ( ! ( expectedKey in fileContents ) ) {
						errors.push('missing')
						break
					}
				}
				for ( const expectedKey in fileContents ) {
					if ( ! ( expectedKey in enFile ) ) {
						errors.push('extra')
						break
					}
				}

				if ( errors.length !== 0 ) {
					test.warn(`${thisFile.name} has ${errors.join(' and ')} Keys`)
				} else {
					test.step(`${thisFile.name} is correct`)
				}
			}).catch((err) => {
				test.error(`${thisFile.name} :: ${err}`)
			}))
		}
		
		return Promise.all(fileChecks)
	}).catch((err) => {
		test.error(err)
	}).finally(() => {
		if ( expectFiles.size !== 0 ) {
			for ( const neededFile of expectFiles ) {
				test.error(`Expected File Not Found: ${neededFile}`)
			}
		}
		test.end()
	})
}