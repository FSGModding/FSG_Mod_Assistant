const conflictListData = require('./mod-checker-conflicts')
const fs               = require('fs')

const newData = {}

for ( const [modName, conflictDetails] of Object.entries(conflictListData.conflictMods)) {
	const thisString = conflictDetails.message.en
	
	newData[modName] = thisString
}

fs.writeFileSync('conflicts.json', JSON.stringify(newData))
console.log('written')