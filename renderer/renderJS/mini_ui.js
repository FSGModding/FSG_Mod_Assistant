/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main Window UI

/* global processL10N, fsgUtil */

let lastList          = null
let fullList          = {}

function toggleGameStatus(status = false, show = false) {
	if ( !show ) {
		fsgUtil.clsHide('gameOnGarth')
		fsgUtil.clsShow('gameOffWayne')
	} else {
		fsgUtil.clsHideTrue('gameOffWayne', status )
		fsgUtil.clsHideFalse('gameOnGarth', status )
	}
}

window.mods.receive('fromMain_gameUpdate', (status) => {
	toggleGameStatus(status.gameRunning, status.gameRunningEnabled)
	fsgUtil.clsShowTrue('update-is-ready-button', status.updateReady)
})

window.mods.receive('fromMain_modList', (modCollect) => {
	const isPinned = modCollect.opts.pinMini
	/* List selection */
	fsgUtil.setById('collectionSelect', buildCollectSelect(modCollect))
	/* END : List selection */
	fsgUtil.clsHideFalse('window-pin-pinned', isPinned)
	fsgUtil.clsHideTrue('window-pin-not-pinned', isPinned)
	toggleGameStatus(modCollect.opts.gameRunning, modCollect.opts.gameRunningEnabled)

	processL10N()
})

function clientMakeListActive() {
	fsgUtil.byId('launch_button').disabled = true
	const activePick = fsgUtil.valueById('collectionSelect').replace('collection--', '')

	if ( activePick !== '0' && activePick !== '999' ) {
		blinkLED()
		fsgUtil.clsOrGate('active_button', true, 'btn-success', 'btn-warning')
		flasherCounter  = 0
		flasherInterval = setInterval(() => {
			flasherCounter++
			if ( flasherCounter > 7 ) {
				clearInterval(flasherInterval)
				flasherInterval = null
				fsgUtil.clsOrGate('active_button', false, 'btn-success', 'btn-warning')
				fsgUtil.byId('launch_button').disabled = false
			} else {
				fsgUtil.clsOrGate('active_button', flasherCounter%2 === 0, 'btn-success', 'btn-warning')
			}
		}, 250)
		window.mods.makeActive(activePick)
	}
}

function buildCollectSelect(modCollect) {
	const optList          = []
	const activeCollection = modCollect.opts.activeCollection
	const multiVersion     = modCollect.appSettings.multi_version
	const curVersion       = modCollect.appSettings.game_version

	lastList = ( activeCollection !== '999' && activeCollection !== '0') ? `collection--${modCollect.opts.activeCollection}` : modCollect.opts.activeCollection
	fullList = {
		0   : `--${modCollect.opts.l10n.disable}--`,
		999 : `--${modCollect.opts.l10n.unknown}--`,
	}
	
	optList.push(fsgUtil.buildSelectOpt(
		'0',
		`--${modCollect.opts.l10n.disable}--`,
		lastList,
		true
	))

	for ( const collectKey of modCollect.set_Collections ) {
		const thisVersion = modCollect.collectionNotes[collectKey].notes_version
		const fullKey     = `collection--${collectKey}`

		fullList[fullKey] = modCollect.modList[collectKey].fullName

		if ( !multiVersion || thisVersion === curVersion ) {
			optList.push(fsgUtil.buildSelectOpt(
				fullKey,
				modCollect.modList[collectKey].fullName,
				lastList,
				false,
				modCollect.collectionToFolder[collectKey]
			))
		}
		if ( multiVersion && fullKey === lastList && thisVersion !== curVersion ) {
			lastList = '999'
		}
	}

	optList.push(fsgUtil.buildSelectOpt(
		'999',
		`--${modCollect.opts.l10n.unknown}--`,
		lastList,
		true
	))

	return optList.join('')
}

let flasherInterval = null
let flasherCounter  = 0

function clientOpenFarmSim() {
	const currentList = fsgUtil.valueById('collectionSelect')
	if ( currentList === lastList ) {
		// Selected is active, no confirm
		spinLED()
		window.mods.startFarmSim()
	} else if ( flasherInterval === null ) {
		// Different, ask confirmation
		fastBlinkLED()
		fsgUtil.byId('launch_button').disabled = true
		fsgUtil.clsOrGate('active_button', true, 'btn-danger', 'btn-warning')
		flasherCounter  = 0
		flasherInterval = setInterval(() => {
			flasherCounter++
			if ( flasherCounter > 10 ) {
				clearInterval(flasherInterval)
				flasherInterval = null
				fsgUtil.clsOrGate('active_button', false, 'btn-danger', 'btn-warning')
			}
			fsgUtil.clsOrGate('active_button', flasherCounter%2 === 0, 'btn-danger', 'btn-warning')
		}, 250)
	}
}


const giantsLED = {	filters : [{ vendorId : fsgUtil.led.vendor, productId : fsgUtil.led.product }] }

async function spinLED()      { operateLED('spin') }
async function blinkLED()     { operateLED('blink') }
async function fastBlinkLED() { operateLED('blink', 1000) }
async function operateLED(type = 'spin', time = 2500) {
	if ( ! window.mods.isLEDActive() ) { return }
	
	try {
		const clientLED = await navigator.hid.requestDevice(giantsLED)

		if ( clientLED.length === 0 ) { return }

		const clientLEDDevice = clientLED[0]

		await clientLEDDevice.open()
		await clientLEDDevice.sendReport(0x00, fsgUtil.led[type])
		setTimeout(async () => {
			await clientLEDDevice.sendReport(0x00, fsgUtil.led.off)
			await clientLEDDevice.close()
		}, time)
	} catch (err) {
		window.log.debug(`Unable to spin LED (no light?) : ${err}`, 'main')
	}
}



window.addEventListener('DOMContentLoaded', () => {
	processL10N()
})

