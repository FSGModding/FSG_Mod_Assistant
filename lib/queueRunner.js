/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */
// MARK: QUEUE RUNNER

// Actual Sub-Process

const loopTimeDelay         = 100
const process               = require('node:process')
const { setTimeout }        = require('node:timers/promises')
const { parseModFirstPass } = require('fs_mod_parser_neon')

const [threadNum] = process.argv.slice(2)

const L_DEBUG  = 'debug'
const L_DANGER = 'danger'
const L_NOTICE = 'notice'

const workQueue = [{ type : 'start' }]
const emptyLog = {
	group : '',
	items : [],
}

process.on('message', (message) => { workQueue.push(message) })

const mainLoop = async () => {
	const thisWorkItem = workQueue.shift()

	if ( typeof thisWorkItem === 'object' && Object.hasOwn(thisWorkItem, 'type') ) {
		const workType = thisWorkItem.type
		const workData = thisWorkItem.data

		switch (workType) {
			case 'start' :
				log(L_DEBUG, ` -- Starting Worker Process : Thread # ${threadNum} -- `)
				break
			case 'mod' : {
				try {
					log(L_DEBUG, `Processing : ${workData.filePath} -- `)
					const thisModJSON = JSON.parse(parseModFirstPass(workData.filePath))

					thisModJSON.currentCollection = workData.collectKey
					thisModJSON.md5Sum = workData.md5Pre

					sendToParent({
						collectKey : workData.collectKey,
						logLines   : emptyLog,
						modRecord  : thisModJSON,
						type       : 'modRecord',
					})
				} catch (err) {
					log(L_DANGER, `Couldn't process file: ${workData.fullPath} :: ${err}`)
				}
				break
			}
			case 'exit' :
				if ( workQueue.length === 0 ) {
					log(L_DEBUG, ' -- Exit Call, Work Finished --')
					process.exit()
				} else {
					log(L_NOTICE, ' -- Ignoring Exit Call, More Work To Do --')
				}
				break
			default :
				break
		}
	}
	await setTimeout(workQueue.length !== 0 ? 10 : loopTimeDelay, null)
	mainLoop()
}

mainLoop()

function sendToParent(m) {
	if ( process.channel ) { process.send({...m, pid : `${threadNum}::${process.pid.toString().padStart(5, '0')}`}) }
}

function log(level, ...texts) {
	sendToParent({
		data  : [...texts],
		level : level,
		type  : 'log',
	})
}