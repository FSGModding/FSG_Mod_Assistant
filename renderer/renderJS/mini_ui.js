/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Mini Window UI

/* global MA, DATA */

window.mini_IPC.receive('mods:list', (modCollect) => {
	window.state.updateFromData(modCollect)
})

// MARK: StateManager
class StateManager {
	flag = {
		activeCollect  : null,
		currentVersion : 22,
		gameRunning    : false,
		launchEnable   : false,
		pinMini        : false,
	}
	track = {
		lastPayload    : null,
	}

	mapCollectionDropdown = new Map()

	flasherInterval = null
	flasherCounter  = 0

	constructor() {
		MA.byId('active_button').addEventListener('click', () => { this.action.collectActive() })
		MA.byId('launch_button').addEventListener('click', () => { this.action.launchGame() } )
		MA.byId('gameLogButton').addEventListener('click', () => { window.mini_IPC.dispatchLog() } )
		MA.byId('window-pin-button').addEventListener('click', () => { window.mini_IPC.togglePin() })
		window.mini_IPC.receive('status:all', () => this.updateState() )
	}

	async updateFromData(data) {
		this.track.lastPayload   = data
		this.flag.activeCollect  = data.opts.activeCollection
		this.flag.currentVersion = data.appSettings.game_version
		this.flag.gameRunning    = data.opts.gameRunning
		this.flag.launchEnable   = data.opts.gameRunningEnable
		this.flag.pinMini        = data.opts.pinMini

		this.mapCollectionDropdown = new Map()
		this.mapCollectionDropdown.set(0, `--${data.opts.l10n.disable}--`)

		for ( const [_, CKey] of Object.entries([...data.set_Collections]) ) {
			if ( data.collectionNotes[CKey].notes_version !== this.flag.currentVersion ) { continue }
			this.mapCollectionDropdown.set(CKey, data.modList[CKey].fullName)
		}
		this.mapCollectionDropdown.set(999, `--${data.opts.l10n.unknown}--`)

		const optList = []
		for (const [value, text] of this.mapCollectionDropdown) {
			optList.push(DATA.optionFromArray([value, text], this.flag.activeCollect))
		}
		MA.byIdHTML('collectionSelect', optList.join(''))
		this.displayState()
	}

	displayState() {
		MA.byId('window-pin-pinned').clsShow(this.flag.pinMini)
		MA.byId('window-pin-not-pinned').clsHide(this.flag.pinMini)
		if ( !this.flag.launchEnable ) {
			MA.byId('gameOnGarth').clsHide()
			MA.byId('gameOffWayne').clsShow()
		} else {
			MA.byId('gameOffWayne').clsHide(this.flag.gameRunning)
			MA.byId('gameOnGarth').clsShow(this.flag.gameRunning)
		}
	}

	updateState() {
		window.mini_IPC.updateState().then((status) => {
			this.flag.gameRunning  = status.gameRunning
			this.flag.launchEnable = status.gameRunningEnabled
			this.flag.pinMini      = status.pinMini

			this.displayState()
		})
	}

	action = {
		collectActive : async () => {
			const activePick = MA.byIdValue('collectionSelect').replace('collection--', '')
		
			if ( activePick !== '0' && activePick !== '999' ) {
				LEDLib.blinkLED()
				
				MA.byId('active_button').clsOrGate(true, 'btn-success', 'btn-warning')
				this.flasherCounter  = 0
				this.flasherInterval = setInterval(() => {
					this.flasherCounter++
					if ( this.flasherCounter > 7 ) {
						clearInterval(this.flasherInterval)
						this.flasherInterval = null
						MA.byId('active_button').clsOrGate(false, 'btn-success', 'btn-warning')
						MA.byId('launch_button').disabled = false
					} else {
						MA.byId('active_button').clsOrGate(this.flasherCounter%2 === 0, 'btn-success', 'btn-warning')
					}
				}, 250)
				
				window.mini_IPC.setActive(activePick)
				
			}
		},
		launchGame : () => {
			const currentList = MA.byIdValue('collectionSelect')
			if ( currentList === this.flag.activeCollect ) {
				// Selected is active, no confirm
				LEDLib.spinLED()
				window.mini_IPC.startFarmSim()
			} else if ( this.flasherInterval === null ) {
				// Different, ask confirmation
				LEDLib.fastBlinkLED()
				MA.byId('launch_button').disabled = true
				MA.byId('active_button').clsOrGate(true, 'btn-danger', 'btn-warning')
				this.flasherCounter  = 0
				this.flasherInterval = setInterval(() => {
					this.flasherCounter++
					if ( this.flasherCounter > 10 ) {
						clearInterval(this.flasherInterval)
						this.flasherInterval = null
						MA.byId('active_button').clsOrGate(false, 'btn-danger', 'btn-warning')
					}
					MA.byId('active_button').clsOrGate(this.flasherCounter%2 === 0, 'btn-danger', 'btn-warning')
				}, 250)
			}
		},
	}
}

// MARK: LEDLib
const LEDLib = {
	ledUSB : { filters : [{ vendorId : MA.led.vendor, productId : MA.led.product }] },

	blinkLED     : async () => { LEDLib.operateLED('blink') },
	fastBlinkLED : async () => { LEDLib.operateLED('blink', 1000) },
	spinLED      : async () => { LEDLib.operateLED('spin') },

	operateLED   : async (type = 'spin', time = 2500) => {
		if ( ! await window.settings.get('led_active') ) {
			window.log.debug('LED is not active')
			return
		}
		
		try {
			const clientLED = await navigator.hid.requestDevice(LEDLib.ledUSB)

			if ( clientLED.length === 0 ) { return }

			const clientLEDDevice = clientLED[0]

			await clientLEDDevice.open()
			await clientLEDDevice.sendReport(0x00, MA.led[type])
			setTimeout(async () => {
				await clientLEDDevice.sendReport(0x00, MA.led.off)
				await clientLEDDevice.close()
			}, time)
		} catch (err) {
			window.log.debug('Unable to spin LED (no light?)', err.message)
		}
	},
}

// MARK: onLoad
window.addEventListener('DOMContentLoaded', () => {
	window.state = new StateManager()

	setInterval(() => { window.state.updateState() }, 5000)
})