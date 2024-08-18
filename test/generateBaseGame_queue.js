/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Actual Sub-Process

const loopTimeDelay  = 100
const os             = require('node:os')
const process        = require('node:process')
const { setTimeout } = require('node:timers/promises')
const { requiredItems, ddsDecoder } = require('../lib/workerThreadLib.js')
const { baseLooker } = require('./generateBaseGame_lib.js')

const [threadNum, convertPath, locale, l10nHP] = process.argv.slice(2)

const L_DEBUG  = 'debug'
const L_DANGER = 'danger'
const L_NOTICE = 'notice'

requiredItems.currentLocale = locale
requiredItems.iconDecoder   = new ddsDecoder(convertPath, os.tmpdir())
requiredItems.l10n_hp       = l10nHP

const workQueue = [{ type : 'start' }]

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
			case 'look' : {
				const thisLooker = new baseLooker(
					workData.fullPath,
					workData.dataPath
				)
				await thisLooker.getInfo().then((results) => {
					sendToParent({
						fileDetails : workData.fileDetails,
						logLines    : results.log,
						modLook     : results.record,
						results     : results,
						type        : 'modLook',
					})
				}).catch((err) => {
					log(L_DANGER, `Couldn't process file: ${workData.fullPath} :: ${err}`)
					sendToParent({
						type     : 'modLookFail',
						error    : `${err}`,
					})
				})
				break
			}
			case 'exit' :
				if ( workQueue.length === 0 ) {
					log(L_DEBUG, ' -- Exit Call, Work Finished --')
					requiredItems.iconDecoder.clearTemp()
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