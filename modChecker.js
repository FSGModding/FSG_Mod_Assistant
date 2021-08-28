//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// CLI Version - Really just here as an example on how to use the 
// reader / parser library - which might get split off to it's own
// project (npm module) eventually

// (c) 2021 JTSage.  MIT License.

const yargs       = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

const _homedir  = require('os').homedir()
const path      = require('path')
const xml2js    = require('xml2js')
const fs        = require('fs')

const translator               = require('./lib/translate.js')
const { modReader, mcLogger }  = require('./lib/mod-checker.js')

const defaultGameFolder = path.join(_homedir, 'Documents', 'My Games', 'FarmingSimulator2019', 'gameSettings.xml' )

const myArgs = yargs(hideBin(process.argv))
	.usage('Usage: $0 [options]')
	.option('gameSettings', {
		default     : defaultGameFolder,
		alias       : 'g',
		type        : 'string',
		description : 'gameSettings.xml location',
	})
	.option('modFolder', {
		default     : null,
		alias       : 'm',
		type        : 'string',
		description : 'Mod folder to scan (no save game scan)',
	})
	.option('lang', {
		default     : null,
		alias       : 'l',
		type        : 'string',
		description : 'Language to use',
	})
	.option('verbose', {
		default     : false,
		type        : 'boolean',
		alias       : 'v',
		description : 'Show run log at end',
	})
	.option('conflicts', {
		default     : true,
		type        : 'boolean',
		description : 'Show conflict list',
	})
	.option('broken', {
		default     : true,
		type        : 'boolean',
		description : 'Show broken list',
	})
	.option('missing', {
		default     : true,
		type        : 'boolean',
		description : 'Show missing list',
	})
	.option('inactive', {
		default     : true,
		type        : 'boolean',
		description : 'Show in-active list',
	})
	.option('unused', {
		default     : true,
		type        : 'boolean',
		description : 'Show unused list',
	})
	.example('$0 --gameSettings "c:\\path\\to\\gameSettings.xml"')
	.help('h')
	.alias('h', 'help')
	.epilog('copyright 2021')
	.argv


writeLn(' _______           __ ______ __                __               ')
writeLn('|   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.')
writeLn('|       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|')
writeLn('|__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  ')
writeLn('   (c) 2021 JTSage')

const myTranslator = new translator.translator(myArgs.lang === null ? translator.getSystemLocale() : myArgs.lang)

const logger  = new mcLogger()

let location_modfolder = null
let location_savegame  = null

if ( myArgs.modFolder === null ) {
	/* read gameSettings */
	const XMLOptions = {strict : true, async : false, normalizeTags : true, attrNameProcessors : [function(name) { return name.toUpperCase() }] }
	const strictXMLParser = new xml2js.Parser(XMLOptions)
			
	location_savegame = path.dirname(myArgs.gameSettings)

	strictXMLParser.parseString(fs.readFileSync(myArgs.gameSettings), (xmlErr, xmlTree) => {
		if ( xmlErr !== null ) {
			/* Could not parse the settings file. */
			location_savegame = null
			logger.fatal('loader', `Unable to parse gameSettings.xml : ${xmlErr.toString()}`)
			writeLn(logger.toDisplayText)
			process.exit(1)
		}
				
		if ( ! ('gamesettings' in xmlTree) ) {
			/* Not a valid config */
			location_savegame = null
			logger.fatal('loader', 'gameSettings.xml does not contain the root gamesettings tag (not a settings file)')
			writeLn(logger.toDisplayText)
			process.exit(1)
		}
				
		let overrideAttr = false

		try {
			overrideAttr = xmlTree.gamesettings.modsdirectoryoverride[0].$
		} catch {
			overrideAttr   = false
			logger.notice('loader', 'Did not find override directive in gameSettings.xml (recovering)')
		}

		if ( overrideAttr !== false && overrideAttr.ACTIVE === 'true' ) {
			location_modfolder = overrideAttr.DIRECTORY
		} else {
			location_modfolder = path.join(location_savegame, 'mods')
		}
	})
} else {
	location_modfolder = myArgs.modFolder
	myArgs.unused      = false
	myArgs.inactive    = false
	myArgs.missing     = false
}


const modList = new modReader(location_savegame, location_modfolder, logger, myTranslator.deferCurrentLocale)

modList.readAll().then(async () => {
	if ( myArgs.broken === true ) {
		writeLn('')
		sepLine()
		writeLn(await myTranslator.stringLookup('tab_broken'))
		writeLn('')
		writeLn(await myTranslator.stringLookup('broken_blurb'))
		sepLine()

		await modList.search({
			columns : ['filenameSlash', 'failedTestList', 'copyName', 'shortName'],
			terms   : ['didTestingFail'],
		}).then(async (searchResults) => {
			for ( let i = 0; i < searchResults.length; i++) {
				writeLn(searchResults[i][0])
				for ( let j = 0; j < searchResults[i][1].length; j++ ) {
					/* eslint-disable no-await-in-loop */
					writeLn(`  ${await myTranslator.stringLookup(searchResults[i][1][j])}`)
					/* eslint-enable */
				}
				writeLn('')
			}
		}).catch((unknownError) => {
			// Shouldn't happen.  No idea
			logger.notice('reader', `Could not get "broken list" : ${unknownError}`)
		})
	}

	if ( myArgs.conflicts === true ) {
		writeLn('')
		sepLine()
		writeLn(await myTranslator.stringLookup('tab_conflict'))
		writeLn('')
		writeLn(await myTranslator.stringLookup('conflict_blurb'))
		sepLine()

		const folderAndZipText = await myTranslator.stringLookup('conflict_error_folder_and_file')

		await modList.conflictList(folderAndZipText).then((searchResults) => {
			const output = searchResults.map((record) => {
				return `  ${record[0]} (${record[1]}) - ${record[2]}`
			})
			writeLn(output.join('\n\n'))
		}).catch((unknownError) => {
			// Shouldn't happen.  No idea
			logger.notice('reader', `Could not get "conflict list" : ${unknownError}`)
		})
	}

	if ( myArgs.missing === true ) {
		writeLn('')
		sepLine()
		writeLn(await myTranslator.stringLookup('tab_missing'))
		writeLn('')
		writeLn(await myTranslator.stringLookup('missing_blurb'))
		sepLine()
		const usedString = await myTranslator.stringLookup('detail_mod_used_games')

		await modList.search({
			columns : ['shortName', 'title', 'activeGames', 'usedGames'],
			terms   : ['isMissing'],
		}).then((searchResults) => {
			const output = searchResults.map((record) => {
				if ( record[3] !== '' ) {
					return `  ${record[0]} (${record[1]}) - ${usedString}: ${record[3]}`
				}
				return `  ${record[0]} (${record[1]})`
			})
			writeLn(output.join('\n'))
		}).catch((unknownError) => {
			// Shouldn't happen.  No idea
			logger.notice('reader', `Could not get "missing list" : ${unknownError}`)
		})
	}

	if ( myArgs.inactive === true ) {
		writeLn('')
		sepLine()
		writeLn(await myTranslator.stringLookup('explore_options_special_inactive'))
		sepLine()

		await modList.search({
			columns             : [
				'shortName', 'title', 'fileSizeMap',
			],
			activeGame          : -1,
			allTerms            : true,
			terms               : ['isNotMissing', 'didTestingPassEnough'],
		}).then((searchResults) => {
			const output = searchResults.map((record) => {
				return `  ${record[0]} (${record[1]}) - ${record[2][0]}`
			})
			writeLn(output.join('\n'))
		}).catch((unknownError) => {
			// Shouldn't happen.  No idea
			logger.notice('reader', `Could not get "explore list" : ${unknownError}`)
		})
	}

	if ( myArgs.unused === true ) {
		writeLn('')
		sepLine()
		writeLn(await myTranslator.stringLookup('explore_options_special_unused'))
		sepLine()

		await modList.search({
			columns             : [
				'shortName', 'title', 'fileSizeMap',
			],
			activeGame          : 0,
			usedGame            : -1,
			allTerms            : true,
			terms               : ['isNotMissing', 'didTestingPassEnough'],
		}).then((searchResults) => {
			const output = searchResults.map((record) => {
				return `  ${record[0]} (${record[1]}) - ${record[2][0]}`
			})
			writeLn(output.join('\n'))
		}).catch((unknownError) => {
			// Shouldn't happen.  No idea
			logger.notice('reader', `Could not get "explore list" : ${unknownError}`)
		})
	}

	if ( myArgs.verbose === true ) {
		writeLn('')
		sepLine()
		writeLn('Debug Log')
		sepLine()
		writeLn(logger.toDisplayText)
	}

})


function sepLine() {
	writeLn(' -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-')
}

function writeLn(text) { process.stdout.write(`${text}\n`) }

