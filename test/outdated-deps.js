/* eslint no-console: off */

const { exec } = require('node:child_process')

exec('npm outdated --save false', (error, stdout) => {
	if (error && stdout.length === 0) {
		console.error(`exec error: ${error}`)
		return
	}
	if ( stdout.length === 0 ) {
		process.exit(1)
	}
	console.log('## Outdated Dependencies\n')
	let firstLine = true
	stdout.split('\n').forEach((line) => {
		if ( line.length !== 0 ) {
			console.log(`|${line.replaceAll(/\s\s+/g, '|')}|`)
			if ( firstLine ) {
				console.log('|---|---|---|---|---|---|')
				firstLine = false
			}
		}
	})
})