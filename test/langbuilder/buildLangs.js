/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Language Builder
/*eslint complexity: ["warn", 10]*/

const fs        = require('fs')
const xml2js    = require('xml2js')
const { globSync }             = require('glob')

const fileList    = globSync('gamefiles/*.xml')
const outputStruct = {}

for ( const thisFile of fileList ) {
	const langCode    = thisFile.slice(-6).slice(0, 2)
	const langContent = fs.readFileSync(thisFile, 'utf-8')

	outputStruct[langCode] = {}

	const XMLParser = new xml2js.Parser({
		async              : false,
		attrNameProcessors : [function(name) { return name.toUpperCase() }],
		normalizeTags      : true,
		strict             : false,
	})

	XMLParser.parseString(langContent, (err, result) => {
		if ( err === null ) {
			for ( const thisEntry of result.l10n.elements[0].e ) {
				if ( thisEntry.$.K.startsWith('typeDesc_') || thisEntry.$.K.startsWith('function_') || thisEntry.$.K.startsWith('info_transmission_') ) {
					outputStruct[langCode][thisEntry.$.K] = thisEntry.$.V
				}
			}
			
		}
	})
}

fs.writeFileSync('../../lib/modLookerLang.json', JSON.stringify(outputStruct, null, '  '))
