/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program - Mod Checker

const path      = require('node:path')
const os        = require('node:os')
const {testLib} = require('../test.js')

const { modFileChecker, requiredItems, ddsDecoder } = require('../../lib/workerThreadLib.js')

requiredItems.currentLocale = 'en'
requiredItems.iconDecoder   = new ddsDecoder(path.join(__dirname, '..', '..', 'texconv.exe'), os.tmpdir())

const basePath = path.join(__dirname, 'mods')

module.exports.test = async () => { return Promise.allSettled([
	testSingleFlag(
		'EXAMPLE_Fake_Cracked_DLC.zip',
		['INFO_MIGHT_BE_PIRACY', 'PERF_HAS_EXTRA'],
		new testLib('Mod Checker - Cracked DLC Warning')
	),

	testSingleFlag(
		'EXAMPLE_Bad_ModDesc_CRC.zip',
		['NOT_MOD_MODDESC_MISSING', 'MOD_ERROR_NO_MOD_ICON', 'PERF_L10N_NOT_SET'],
		new testLib('Mod Checker - Broken ZIP (Bad CRC) File')
	),

	testSingleFlag(
		'EXAMPLE_Broken_Zip_File.zip',
		['FILE_ERROR_UNREADABLE_ZIP', 'PERF_L10N_NOT_SET'],
		new testLib('Mod Checker - Invalid ZIP File')
	),

	testSingleFlag(
		'EXAMPLE_Garbage_File.txt',
		['FILE_ERROR_GARBAGE_FILE', 'FILE_ERROR_NAME_INVALID', 'PERF_L10N_NOT_SET'],
		new testLib('Mod Checker - Non-Mod File')
	),

	testSingleFlag(
		'EXAMPLE_Good_Mod (2).zip',
		['FILE_ERROR_NAME_INVALID', 'FILE_ERROR_LIKELY_COPY', 'PERF_L10N_NOT_SET'],
		new testLib('Mod Checker - Invalid Name (probable copy)')
	),

	testSingleFlag(
		'EXAMPLE_Icon_Not_Found.zip',
		['MOD_ERROR_NO_MOD_ICON'],
		new testLib('Mod Checker - modIcon Missing')
	),

	testSingleFlag(
		'EXAMPLE_Really_Malformed_ModDesc.zip',
		['NOT_MOD_MODDESC_PARSE_ERROR', 'MOD_ERROR_NO_MOD_ICON', 'PERF_L10N_NOT_SET'],
		new testLib('Mod Checker - Malformed modDesc.xml (unrecoverable)')
	),

	testSingleFlag(
		'EXAMPLE_No_Version.zip',
		['MOD_ERROR_NO_MOD_VERSION'],
		new testLib('Mod Checker - Missing Mod Version')
	),

	testSingleFlag(
		'EXAMPLE_No_DescVersion.zip',
		['MOD_ERROR_NO_MOD_VERSION', 'NOT_MOD_MODDESC_VERSION_OLD_OR_MISSING'],
		new testLib('Mod Checker - Missing descVersion')
	),

	testSingleFlag(
		'EXAMPLE_Missing_ModDesc.zip',
		['NOT_MOD_MODDESC_MISSING', 'MOD_ERROR_NO_MOD_ICON', 'PERF_L10N_NOT_SET'],
		new testLib('Mod Checker - Missing modDesc')
	),

	testSingleFlag(
		'EXAMPLE_Malicious_Code.zip',
		['MALICIOUS_CODE', 'PERF_SPACE_IN_FILE', 'MOD_ERROR_NO_MOD_ICON'],
		new testLib('Mod Checker - Malicious Script Code')
	),

	testSingleGood(
		'EXAMPLE_Good_Mod.zip',
		new testLib('Mod Checker - Good Mod')
	),
])}

const testSingleGood = (fileName, test) => {
	return new modFileChecker(
		path.join(basePath, fileName),
		false, 0, new Date(), null
	).getInfo().then((results) => {
		for ( const logLine of results.log.items ) {
			test.step_log(`Log :: ${logLine[0].padEnd(7)} -> ${logLine[1]}`)
		}
		if ( results.record.issues.length === 0 ) {
			test.step('No flags detected, good mod')
		} else {
			test.error(`Flags were found ${results.record.issues.join(' ')}`)
		}
	}).catch((err) => {
		test.error(`Unexpected Error :: ${err}`)
	}).finally(() => {
		test.end()
	})
}

const testSingleFlag = (fileName, flag, test) => {
	return new modFileChecker(
		path.join(basePath, fileName),
		false, 0, new Date()
	).getInfo().then((results) => {
		for ( const logLine of results.log.items ) {
			test.step_log(`Log :: ${logLine[0].padEnd(7)} -> ${logLine[1]}`)
		}
		checkIssues(results.record, test, flag)
	}).catch((err) => {
		test.error(`Unexpected Error :: ${err}`)
	}).finally(() => {
		test.end()
	})
}

const checkIssues = (modRecord, test, flag) => {
	for ( const expectFlag of flag ) {
		if ( modRecord.issues.includes(expectFlag) ) {
			test.step(`Expected Flag Detected     : ${expectFlag}`)
		} else {
			test.error(`Expected Flag NOT detected : ${expectFlag}`)
		}
	}
	for ( const actualFlag of modRecord.issues ) {
		if ( ! flag.includes(actualFlag) ) {
			test.error(`Un-Expected Flag Detected  : ${actualFlag}`)
		}
	}
}