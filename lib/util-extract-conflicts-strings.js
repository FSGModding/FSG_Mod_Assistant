/*  _______           __ ______ __                __               
   |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
   |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
   |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  */

// Extract the translatable strings from the conflict list

const conflictListData = require('./mod-checker-conflicts')
const fs               = require('fs')

const newData = {}

for ( const [modName, conflictDetails] of Object.entries(conflictListData.conflictMods)) {
	const thisString = conflictDetails.message.en
	
	newData[modName] = thisString
}

fs.writeFileSync('conflicts.json', JSON.stringify(newData))
process.stdout.write('written\n')