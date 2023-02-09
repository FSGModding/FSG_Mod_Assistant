/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program - dependencies
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
	for ( const line of stdout.split('\n') ) {
		if ( line.length !== 0 ) {
			console.log(`|${line.replaceAll(/\s\s+/g, '|')}|`)
			if ( firstLine ) {
				console.log('|---|---|---|---|---|---|')
				firstLine = false
			}
		}
	}
})