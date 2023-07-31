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
const { modLooker, requiredItems, modFileChecker, ddsDecoder } = require('./workerThreadLib.js')

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

	if ( typeof thisWorkItem !== 'undefined' && Object.hasOwn(thisWorkItem, 'type') ) {
		const workType = thisWorkItem.type
		const workData = thisWorkItem.data

		switch (workType) {
			case 'start' :
				log(L_DEBUG, ` -- Starting Worker Process : Thread # ${threadNum} -- `)
				break
			case 'mod' : {
				const thisModCheck = new modFileChecker(
					workData.filePath,
					workData.isFolder,
					workData.size,
					workData.date,
					workData.md5Pre
				)
				await thisModCheck.getInfo().then((results) => {
					sendToParent({
						collectKey : workData.collectKey,
						logLines   : results.log,
						modRecord  : results.record,
						type       : 'modRecord',
					})
				}).catch((err) => {
					log(L_DANGER, `Couldn't process file: ${workData.fullPath} :: ${err}`)
				})
				break
			}
			case 'look' : {
				const thisLooker = new modLooker(
					workData.modRecord,
					workData.searchPath
				)
				await thisLooker.getInfo().then((results) => {
					sendToParent({
						logLines : results.log,
						modLook  : results.record,
						type     : 'modLook',
					})
				}).catch((err) => {
					log(L_DANGER, `Couldn't process file: ${workData.fullPath} :: ${err}`)
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
	if ( process.channel ) { process.send({...m, pid : `${threadNum}::${process.pid}`}) }
}

function log(level, ...texts) {
	sendToParent({
		data  : [...texts],
		level : level,
		type  : 'log',
	})
}