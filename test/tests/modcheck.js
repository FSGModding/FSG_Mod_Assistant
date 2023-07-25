/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program - Mod Checker

const path                      = require('path')
const { modFileChecker }        = require('../../lib/modCheckLib_new.js')
const {testLib}                 = require('../test.js')

const basePath = path.join(__dirname, 'mods')

module.exports.test = async () => { return Promise.allSettled([
	testSingleFlag(
		'EXAMPLE_Fake_Cracked_DLC.zip',
		'INFO_MIGHT_BE_PIRACY',
		new testLib('Mod Checker - Cracked DLC Warning')
	),

	testSingleFlag(
		'EXAMPLE_Bad_ModDesc_CRC.zip',
		'NOT_MOD_MODDESC_MISSING',
		new testLib('Mod Checker - Broken ZIP (Bad CRC) File')
	),

	testSingleFlag(
		'EXAMPLE_Broken_Zip_File.zip',
		'FILE_ERROR_UNREADABLE_ZIP',
		new testLib('Mod Checker - Invalid ZIP File')
	),

	testSingleFlag(
		'EXAMPLE_Garbage_File.txt',
		'FILE_ERROR_GARBAGE_FILE',
		new testLib('Mod Checker - Non-Mod File')
	),

	testSingleFlag(
		'EXAMPLE_Good_Mod (2).zip',
		['FILE_ERROR_NAME_INVALID', 'FILE_ERROR_LIKELY_COPY'],
		new testLib('Mod Checker - Invalid Name (probable copy)')
	),

	testSingleFlag(
		'EXAMPLE_Icon_Not_Found.zip',
		'MOD_ERROR_NO_MOD_ICON',
		new testLib('Mod Checker - modIcon Missing')
	),

	testSingleFlag(
		'EXAMPLE_Really_Malformed_ModDesc.zip',
		'NOT_MOD_MODDESC_PARSE_ERROR',
		new testLib('Mod Checker - Malformed modDesc.xml (unrecoverable)')
	),

	testSingleFlag(
		'EXAMPLE_No_Version.zip',
		'MOD_ERROR_NO_MOD_VERSION',
		new testLib('Mod Checker - Missing Mod Version')
	),

	testSingleFlag(
		'EXAMPLE_No_DescVersion.zip',
		'NOT_MOD_MODDESC_VERSION_OLD_OR_MISSING',
		new testLib('Mod Checker - Missing descVersion')
	),

	testSingleFlag(
		'EXAMPLE_Missing_ModDesc.zip',
		'NOT_MOD_MODDESC_MISSING',
		new testLib('Mod Checker - Missing modDesc')
	),

	testSingleGood(
		'EXAMPLE_Good_Mod.zip',
		new testLib('Mod Checker - Good Mod')
	),
])}

const testSingleGood = (fileName, test) => {
	const modRecord = new modFileChecker(
		path.join(basePath, fileName),
		false, 0, new Date(), null
	)

	return modRecord.getInfo().then((results) => {
		if ( results.issues.length === 0 ) {
			test.step('No flags detected, good mod')
		} else {
			test.error('Flags were found')
		}
	}).catch((e) => {
		test.error(`Unexpected Error :: ${e}`)
	}).finally(() => {
		test.end()
	})
}

const testSingleFlag = (fileName, flag, test) => {
	const modRecord = new modFileChecker(
		path.join(basePath, fileName),
		false, 0, new Date()
	)

	return modRecord.getInfo().then((results) => {
		checkIssues(results, test, flag)
	}).catch((e) => {
		test.error(`Unexpected Error :: ${e}`)
	}).finally(() => {
		test.end()
	})
}

const checkIssues = (modRecord, test, flag) => {
	if ( typeof flag === 'string' ) {
		if ( modRecord.issues.includes(flag) ) {
			test.step(`Flag detected : ${flag}`)
		} else {
			test.error(`Flag NOT detected : ${flag}`)
		}
	} else {
		for ( const thisFlag of flag ) {
			if ( modRecord.issues.includes(thisFlag) ) {
				test.step(`Flag detected : ${thisFlag}`)
			} else {
				test.error(`Flag NOT detected : ${thisFlag}`)
			}
		}
	}
}