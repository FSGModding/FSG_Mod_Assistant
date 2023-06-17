/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Language Builder
/*eslint complexity: ["warn", 10]*/

const fs            = require('fs')
const { XMLParser } = require('fast-xml-parser')
const { globSync }  = require('glob')

const fileList    = globSync('gamefiles/*.xml')
const outputStruct = {}

const patternToInclude = [
	'typeDesc_',
	'function_',
	'info_transmission_',
	'fillType_',
	'shopItem_',
	'storeItem_',
	'object_',
]

const langParser = new XMLParser({
	attributeNamePrefix    : '',
	attributesGroupName    : '$',
	ignoreAttributes       : false,
	ignoreDeclaration      : true,
	ignorePiTags           : true,
	parseAttributeValue    : true,
	parseTagValue          : true,
	transformAttributeName : (name) => name.toUpperCase(),
	transformTagName       : (name) => name.toLowerCase(),
	trimValues             : true,
})

for ( const thisFile of fileList ) {
	const langCode    = thisFile.slice(-6).slice(0, 2)
	const langContent = fs.readFileSync(thisFile, 'utf-8')

	outputStruct[langCode] = {}

	try {
		const result = langParser.parse(langContent)
	
		for ( const thisEntry of result.l10n.elements.e ) {
			for ( const pattern of patternToInclude ) {
				if ( thisEntry.$.K.startsWith(pattern) ) {
					outputStruct[langCode][thisEntry.$.K] = thisEntry.$.V
				}
			}
		}
	} catch { /* do not care */}
}

fs.writeFileSync('../../lib/modLookerLang.json', JSON.stringify(outputStruct, null, '  '))
