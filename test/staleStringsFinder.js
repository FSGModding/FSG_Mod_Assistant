/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

const fs           = require('node:fs')
const path         = require('node:path')
const { globSync } = require('glob')
const c            = require('ansi-colors')

const filePaths = [
	...globSync('**/*.js', { absolute : true, cwd : path.join(__dirname, '..', 'renderer'), ignore : 'inc/**' }),
	...globSync('**/*.html', { absolute : true, cwd : path.join(__dirname, '..', 'renderer') }),
	...globSync('**/*.js', { absolute : true, cwd : path.join(__dirname, '..', 'lib') }),
	path.join(__dirname, '..', 'modAssist_main.js'),
]

const baseLocaleData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'translations', 'en.json')))
const baseLocaleKeys = new Set(Object.keys(baseLocaleData).sort(Intl.Collator().compare))

for ( const key of baseLocaleKeys ) {
	// remove titles
	if ( key.endsWith('__title') ) { baseLocaleKeys.delete(key) }
}

for ( const fileName of filePaths ) {
	const fileContents = fs.readFileSync(fileName, { encoding : 'utf8'} )
	for ( const searchTerm of baseLocaleKeys ) {
		if ( fileContents.indexOf(searchTerm) !== -1 ) {
			// eslint-disable-next-line no-console
			console.log(c.greenBright('found and stopped looking for'), c.green(searchTerm))
			baseLocaleKeys.delete(searchTerm)
			continue
		}
	}
}

for ( const key of baseLocaleKeys ) {
	// eslint-disable-next-line no-console
	console.log(c.yellowBright('possible unused'), c.gray(key))
}