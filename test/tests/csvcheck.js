
const path                = require('node:path')
const { csvFileChecker } = require('../../lib/modCheckLib.js')
const {testLib}           = require('../test.js')

module.exports.test = () => {
	return Promise.allSettled([
		testGood(new testLib('CSV Reader - Good File')),
		testBad(new testLib('CSV Reader - Bad File')),
	])
}

const testBad = (test) => {
	const fullPath = path.join(__dirname, 'savegame', 'testcollectbad.csv')

	return new csvFileChecker(fullPath, false).getInfo().then((results) => {
		if ( results.mapMod === null ) {
			test.step('Expected empty result set received')
		} else {
			test.error('Got a non-empty result set')
		}
	}).catch((err) => {
		test.error(`Unexpected Error :: ${err}`)
	}).finally(() => {
		test.end()
	})
}

const testGood = (test) => {
	const fullPath = path.join(__dirname, 'savegame', 'testcollect.csv')
	
	return new csvFileChecker(fullPath, false).getInfo().then((results) => {
		if ( results.mapMod !== null ) {
			test.step('Got expected map name')
		} else {
			test.error('Got unexpected map name')
		}

		if ( Object.keys(results.farms).length === 2 ) {
			test.step('Got expected number of farms (2)')
		} else {
			test.error('Got unexpected number of farms')
		}

		if ( Object.keys(results.mods).length === 166 ) {
			test.step('Got expected number of mods (166)')
		} else {
			test.error('Got unexpected number of mods')
		}
	}).catch((err) => {
		test.error(`Unexpected Error :: ${err}`)
	}).finally(() => {
		test.end()
	})
}
