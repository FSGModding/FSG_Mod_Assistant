
const process = require('process')
const workQueue = [
	{ type : 'start' },
	{ type : 'mod', data : { a : 'n', c : 'd'} },
	{ type : 'look', data : { a : 'n', c : 'd'} },
	{ type : 'mod', data : { a : 'n', c : 'd'} },
	{ type : 'exit' },
	{ type : 'mod', data : { a : 'n', c : 'd'} },
	{ type : 'exit' },
]

process.on('message', (message) => {
	workQueue.push(message)
})

const mainLoop = setInterval(() => {
	const thisWorkItem = workQueue.shift()

	if ( typeof thisWorkItem !== 'undefined' && Object.hasOwn(thisWorkItem, 'type') ) {
		const workType = thisWorkItem.type
		const workData = thisWorkItem.data

		switch (workType) {
			case 'start' :
				log(' -- Starting Worker Process -- ')
				break
			case 'mod' :
				log(' -- Do Mod Parse with: ', workData)
				break
			case 'look' :
				log(' -- Do Mod Look with: ', workData)
				break
			case 'exit' :
				if ( workQueue.length === 0 ) {
					log(' -- Exit Call, Work Finished --')
					clearInterval(mainLoop)
					if ( process.channel ) { process.disconnect() }
				} else {
					log(' -- Ignoring Exit Call, More Work To Do --')
				}
				break
			default :
				break
		}
	}
}, 250)

function log(...text) {
	if ( process.channel ) {
		process.send({ type : 'log', data : [...text] })
	} else {
		/* eslint-disable no-console */
		console.log(...text)
		/* eslint-enable no-console */
	}

}