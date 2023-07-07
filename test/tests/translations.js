/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program - Language Files

const path      = require('path')
const fs        = require('fs')
const {testLib} = require('../test.js')

module.exports.test = () => {
	const test     = new testLib('Language Test')
	const langPath = path.join(__dirname, '..', '..', 'translations')
	
	test.step('Loading English Language')
	fs.readFile(path.join(langPath, 'en.json'), (err, enData) => {
		if ( err ) {
			test.error(err)
		} else {
			const enFile = JSON.parse(enData)

			fs.readdir(langPath, {withFileTypes : true}, (err2, checkFiles) => {
				if ( err2 ) {
					test.error(err2)
				} else {
					for ( const thisFile of checkFiles ) {
						try {
							const errors = []
							const rawFileContents = fs.readFileSync(path.join(langPath, thisFile.name))
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

							if ( errors.length > 0 ) {
								test.error(`${thisFile.name} has ${errors.join(' and ')} Keys`)
							} else {
								test.step(`${thisFile.name} is correct`)
							}
						} catch (e) {
							test.error(`${thisFile.name} :: ${e}`)
						}
					}
				}
				test.end()
			})
		}
	})
}