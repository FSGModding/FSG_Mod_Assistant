/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program - ESLint Source Code

const path             = require('node:path')
const { globSync }     = require('glob')
const fs               = require('node:fs')
const crypto           = require('node:crypto')
const { testLib }      = require('../test.js')
const { HtmlValidate } = require('html-validate')


module.exports.test = async () => {
	const test     = new testLib('HTML Source Code Test')
	return tester(test).then(() => {test.end(false, false)})
}

async function tester (test) {
	const promiseArray = []
	const rootPath = path.join(__dirname, '..', '..')

	const thisPath  = path.join(__dirname, '..', '..', 'renderer', '**', '*.html').split(path.sep).join('/')
	const htmlFiles = globSync(thisPath, { absolute : true })
	let   errorTotal = 0
	let   errorFiles = 0

	const thisValidator = new HtmlValidate({
		extends : ['html-validate:recommended'],
		rules   : {
			'element-name'                : ['error', { whitelist : ['l10n'] }],
			'element-required-ancestor'   : 'off',
			'element-required-attributes' : 'off',
			'empty-heading'               : 'off',
			'no-inline-style'             : 'off',
			'no-trailing-whitespace'      : 'off',
			'prefer-native-element'       : ['error', { exclude : ['progressbar']}],
			'prefer-tbody'                : 'off',
			'text-content'                : 'off',
			'valid-id'                    : ['error', {'relaxed' : true}],
		},
	})

	for ( const file of htmlFiles ) {
		const thisFile = path.relative(rootPath, file)
		const fileContents = fs.readFileSync(file, { encoding : 'utf8' }).replace(/{{uuid}}/g, () => crypto.randomUUID())

		promiseArray.push(thisValidator.validateString(fileContents).then((result) => {
			if ( result.errorCount === 0 ) {
				test.step(`${thisFile} is clean`)
			} else {
				errorFiles++
				errorTotal += result.errorCount
				test.error(`${thisFile} has ${result.errorCount} Errors`)
				for ( const thisError of result.results[0].messages ) {
					test.step_log(`${thisFile} :: [${thisError.line}] {${thisError.ruleId}} ${thisError.message}`)
				}
				
			}
		}))
	}
	return Promise.all(promiseArray).then(() => {
		if ( errorTotal > 0 ) { test.error(`Total Errors Found : ${errorTotal} in ${errorFiles} files`)}
	})
}
