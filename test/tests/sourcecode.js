/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program - ESLint Source Code

const {globSync}   = require('glob')
const {ESLint}     = require('eslint')
const path         = require('path')
const {testLib}    = require('../test.js')

module.exports.test =() => {
	const test     = new testLib('ESLint Source Code Test')
	tester(test).then(() => {test.end()})
}

async function tester (test) {
	const promiseArray = []
	const rootPath = path.join(__dirname, '..', '..')
	const eslint   = new ESLint()

	const thisPath = path.join(__dirname, '..', '..', '**', '*.js').split(path.sep).join('/')
	const jsFiles  = globSync(thisPath, { absolute : true })

	for ( const file of jsFiles ) {
		const thisFile = path.relative(rootPath, file)

		if ( thisFile.startsWith('node_modules') || thisFile.includes('inc') ) {
			continue
		}
		
		const problems = []

		promiseArray.push(eslint.lintFiles(file).then((result) => {
			if ( result[0].errorCount > 0 ) {
				problems.push(`${result[0].errorCount} Errors`)
			}
			if ( result[0].warningCount > 0 ) {
				problems.push(`${result[0].warningCount} Warnings`)
			}
			if ( problems.length > 0 ) {
				test.error(`${thisFile} has ${problems.join(' and ')}`)
			} else {
				test.step(`${thisFile} is clean`)
			}
		}).catch((e) => {
			test.error(e)
		}))
	}
	return Promise.all(promiseArray)
}
