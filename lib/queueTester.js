const cp        = require('child_process')
const workQueue = cp.fork('./queueRunner.js')

workQueue.on('message', (m) => {
	if ( Object.hasOwn(m, 'type') ) {
		switch (m.type) {
			case 'log' :
				/* eslint-disable no-console */
				console.log('LOG::', ...m.data)
				/* eslint-enable no-console */
				break
			case 'modRecord' :
				// Dump modRecord to collection
				break
			case 'modLook' :
				// Dump modLook to display?
				break
			default :
				break
		}
	}
})


workQueue.send({ type : 'look', data : { a : '!', c : '!'} })
//workQueue.send({ type : 'exit' })