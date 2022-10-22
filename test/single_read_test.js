/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program

const { ma_logger }            = require('../lib/ma-logger.js')
const { modFileChecker }       = require('../lib/single-mod-checker.js')

const logger = new ma_logger('single-test')

console.log('FSG Mod Assistant : Test Mod Reader')
console.log('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\n')

if ( process.argv.length < 3 ) {
	console.log('File not provided')
	process.exit(1)
}
const thisModFile = process.argv[2]

console.log(` --Testing: ${thisModFile}`)

const thisMod = new modFileChecker(
	thisModFile,
	false,
	0,
	new Date(1970, 1, 1, 0, 0, 0, 0),
	logger,
	() => { return 'en'}
)

console.log(thisMod.debugDump)

