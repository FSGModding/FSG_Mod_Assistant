/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program - ESLint Source Code

const path         = require('node:path')
const { globSync } = require('glob')
// const { ESLint }   = require('eslint')
const { testLib }  = require('../test.js')
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

	const thisValidator = new HtmlValidate({
		extends : ['html-validate:recommended'],
		rules   : {
			'element-name'                : ['error', { whitelist : ['l10n'] }],
			'element-required-attributes' : 'off',
			'empty-heading'               : 'off',
			'no-inline-style'             : 'off',

			// 'doctype-style' : 'off',
			// 'attr-quotes' : 'off',
			'no-trailing-whitespace' : 'off',
			'text-content' : 'off',
			// 'void-style' : 'warn',
		},
	})

	for ( const file of htmlFiles ) {
		const thisFile = path.relative(rootPath, file)
		
		promiseArray.push(thisValidator.validateFile(file).then((result) => {
			if ( result.errorCount === 0 ) {
				test.step(`${thisFile} is clean`)
			} else {
				test.error(`${thisFile} has ${result.errorCount} Errors`)
				for ( const thisError of result.results[0].messages ) {
					test.step_log(`${thisFile} :: [${thisError.line}] {${thisError.ruleId}} ${thisError.message}`)
				}
				
			}
		}))
	}
	return Promise.all(promiseArray)
}
