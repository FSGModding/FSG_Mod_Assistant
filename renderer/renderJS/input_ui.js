/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// MARK: INPUT MANAGE UI

/* global MA, I18N, DATA, clientGetKeyMapSmall, bootstrap */


// MARK: PAGE LOAD
window.addEventListener('DOMContentLoaded', () => {
	window.state = new windowState()
})

const HALF = false
const FULL = true

class windowState {

	/* cSpell: disable */
	actionSkip = new Set([
		'ADD_NOTE',
		'ARENA_HELP',
		'ARENA_OBSERVER_CAMERA_FAST',
		'ARENA_OBSERVER_CAMERA_LOOK_LEFTRIGHT',
		'ARENA_OBSERVER_CAMERA_LOOK_UPDOWN',
		'ARENA_OBSERVER_CAMERA_MIRROR',
		'ARENA_OBSERVER_CAMERA_MODE',
		'ARENA_OBSERVER_CAMERA_MOVE_FORWARD',
		'ARENA_OBSERVER_CAMERA_MOVE_SIDE',
		'ARENA_OBSERVER_CAMERA_MOVE_UPDOWN',
		'ARENA_OBSERVER_CAMERA_PLAYER_1_BLUE',
		'ARENA_OBSERVER_CAMERA_PLAYER_1_RED',
		'ARENA_OBSERVER_CAMERA_PLAYER_2_BLUE',
		'ARENA_OBSERVER_CAMERA_PLAYER_2_RED',
		'ARENA_OBSERVER_CAMERA_PLAYER_3_BLUE',
		'ARENA_OBSERVER_CAMERA_PLAYER_3_RED',
		'ARENA_OBSERVER_CAMERA_POI_0',
		'ARENA_OBSERVER_CAMERA_POI_1',
		'ARENA_OBSERVER_CAMERA_POI_2',
		'ARENA_OBSERVER_CAMERA_POI_3',
		'ARENA_OBSERVER_CAMERA_POI_4',
		'ARENA_OBSERVER_CAMERA_POI_5',
		'ARENA_OBSERVER_CAMERA_POI_6',
		'ARENA_OBSERVER_CAMERA_POI_7',
		'ARENA_OBSERVER_CAMERA_POI_8',
		'ARENA_OBSERVER_CAMERA_POI_9',
		'ARENA_OBSERVER_CAMERA_SLOW',
		'ARENA_OBSERVER_CAMERA_SPLINE_0',
		'ARENA_OBSERVER_CAMERA_SPLINE_1',
		'ARENA_OBSERVER_TOGGLE_GHOST_MODE',
		'ARENA_START_GAME_TEAM_BLUE',
		'ARENA_START_GAME_TEAM_RANDOM',
		'ARENA_START_GAME_TEAM_RED',
		'AXIS_CONSTRUCTION_ACTION_SECONDARY',
		'AXIS_CONSTRUCTION_MENU_LEFT_RIGHT',
		'AXIS_CONSTRUCTION_MENU_UP_DOWN',
		'AXIS_LOOK_LEFTRIGHT_DRAG',
		'AXIS_LOOK_UPDOWN_DRAG',
		'AXIS_MTO_SCROLL',
		'BALESTACKING_CAMERA_1_VEHICLE_INDOOR',
		'BALESTACKING_CAMERA_1_VEHICLE',
		'BALESTACKING_CAMERA_1',
		'BALESTACKING_CAMERA_2_VEHICLE_INDOOR',
		'BALESTACKING_CAMERA_2_VEHICLE',
		'BALESTACKING_CAMERA_2',
		'BALESTACKING_CAMERA_3_VEHICLE_INDOOR',
		'BALESTACKING_CAMERA_3_VEHICLE',
		'BALESTACKING_CAMERA_3',
		'BALESTACKING_CAMERA_4_VEHICLE_INDOOR',
		'BALESTACKING_CAMERA_4_VEHICLE',
		'BALESTACKING_CAMERA_4',
		'BALESTACKING_CAMERA_5_VEHICLE_INDOOR',
		'BALESTACKING_CAMERA_5_VEHICLE',
		'BALESTACKING_CAMERA_5',
		'BALESTACKING_CAMERA_6_VEHICLE_INDOOR',
		'BALESTACKING_CAMERA_6_VEHICLE',
		'BALESTACKING_CAMERA_6',
		'BALESTACKING_FINISH_GAME',
		'BALESTACKING_HELP_SHOW',
		'BALESTACKING_RESET_GAME',
		'BALESTACKING_START_GAME',
		'CONSOLE_ALT_COMMAND_BUTTON',
		'CONSOLE_ALT_COMMAND2_BUTTON',
		'CONSOLE_ALT_COMMAND3_BUTTON',
		'CONSOLE_DEBUG_FILLUNIT_DEC',
		'CONSOLE_DEBUG_FILLUNIT_INC',
		'CONSOLE_DEBUG_FILLUNIT_NEXT',
		'CONSOLE_DEBUG_TOGGLE_FPS',
		'CONSOLE_DEBUG_TOGGLE_STATS',
		'CONSTRUCTION_DESTRUCT_TOGGLE',
		'DEBUG_PLAYER_ENABLE',
		'DEBUG_PLAYER_UP_DOWN',
		'DEBUG_VEHICLE_1',
		'DEBUG_VEHICLE_2',
		'DEBUG_VEHICLE_3',
		'DEBUG_VEHICLE_4',
		'DEBUG_VEHICLE_5',
		'DEBUG_VEHICLE_6',
		'DEBUG_VEHICLE_7',
		'DEBUG_VEHICLE_8',
		'DEBUG_VEHICLE_9',
		'GAMING_STATION_TOGGLE_LANGUAGE',
		'MENU_AXIS_UP_DOWN_SECONDARY',
		'MENU_EXTRA_1',
		'MENU_EXTRA_2',
		'MOUSE_ALT_COMMAND_BUTTON',
		'MOUSE_ALT_COMMAND2_BUTTON',
		'MOUSE_ALT_COMMAND3_BUTTON',
		'MOUSE_ALT_COMMAND4_BUTTON',
		'RELOAD_GAME',
		'SWITCH_HANDTOOL',
		'CONSTRUCTION_ACTION_FOURTH',
	])

	actionOrder = new Set([
		'PLAYER_MOVEMENT',
		'CONSTRUCTION',
		'VEHICLE_DRIVING',
		'PLAYER_INTERACTIVE',
		'VEHICLE',
		'VEHICLE_WORK',
		'VEHICLE_FRONTLOADER',
		'CRANE',
		'PLACEABLE',
		'CAMERA',
		'GAME',
		'VEHICLE_GEARBOX',
		'VEHICLE_LIGHTS',
		'RADIO',
		'PRECISION_FARMING',
		'PLATINUM_EXPANSION',
		'PREMIUM_EXPANSION',
		'KUBOTA_PACK',
		'GOWEIL_PACK',
		'VERMEER_PACK',
	])

	actionKnown = null
	actionMods  = []
	conMap      = null
	overlay     = null
	goodVersion = new Set([])

	modalDelete   = null
	modalRestore  = null
	modalCopy     = null
	currentSource = null

	actions = {
		CAMERA : [
			{ id : 'CAMERA_SWITCH', axis : HALF },
		],
		CONSTRUCTION : [
			{ id : 'TOGGLE_CONSTRUCTION', axis : HALF },
			{ id : 'AXIS_CONSTRUCTION_CAMERA_ZOOM', axis : FULL },
			{ id : 'AXIS_CONSTRUCTION_CAMERA_ROTATE', axis : FULL },
			{ id : 'AXIS_CONSTRUCTION_CAMERA_TILT', axis : FULL },
			{ id : 'AXIS_CONSTRUCTION_CURSOR_ROTATE', axis : FULL },
			{ id : 'CONSTRUCTION_ACTION_PRIMARY', axis : HALF },
			{ id : 'CONSTRUCTION_ACTION_SECONDARY', axis : HALF },
			{ id : 'CONSTRUCTION_ACTION_TERTIARY', axis : HALF },
			{ id : 'CONSTRUCTION_ACTION_SNAPPING', axis : HALF },
			{ id : 'AXIS_CONSTRUCTION_ACTION_PRIMARY', axis : FULL },
		],
		CRANE : [
			{ id : 'AXIS_CRANE_ARM', axis : FULL },
			{ id : 'AXIS_CRANE_ARM2', axis : FULL },
			{ id : 'AXIS_CRANE_ARM3', axis : FULL },
			{ id : 'AXIS_CRANE_ARM4', axis : FULL },
			{ id : 'AXIS_CRANE_TOOL', axis : FULL },
			{ id : 'AXIS_CRANE_TOOL2', axis : FULL },
			{ id : 'AXIS_CRANE_TOOL3', axis : FULL },
			{ id : 'AXIS_CRANE_SUPPORT', axis : FULL },
		],
		GAME : [
			{ id : 'MENU_AXIS_UP_DOWN', axis : FULL },
			{ id : 'MENU_AXIS_LEFT_RIGHT', axis : FULL },
			{ id : 'AXIS_MAP_ZOOM_IN', axis : HALF },
			{ id : 'AXIS_MAP_ZOOM_OUT', axis : HALF },
			{ id : 'AXIS_MAP_SCROLL_LEFT_RIGHT', axis : FULL },
			{ id : 'AXIS_MAP_SCROLL_UP_DOWN', axis : FULL },
			{ id : 'PAUSE', axis : HALF },
			{ id : 'SKIP_MESSAGE_BOX', axis : HALF },
			{ id : 'MENU', axis : HALF },
			{ id : 'TOGGLE_STORE', axis : HALF },
			{ id : 'TOGGLE_MAP', axis : HALF },
			{ id : 'TOGGLE_CHARACTER_CREATION', axis : HALF },
			{ id : 'PUSH_TO_TALK', axis : HALF },
			{ id : 'TOGGLE_MAP_SIZE', axis : HALF },
			{ id : 'INGAMEMAP_ACCEPT', axis : HALF },
			{ id : 'MENU_ACTIVATE', axis : HALF },
			{ id : 'MENU_ACCEPT', axis : HALF },
			{ id : 'MENU_CANCEL', axis : HALF },
			{ id : 'MENU_BACK', axis : HALF },
			{ id : 'MENU_PAGE_PREV', axis : HALF },
			{ id : 'MENU_PAGE_NEXT', axis : HALF },
			{ id : 'TAKE_SCREENSHOT', axis : HALF },
			{ id : 'CHAT', axis : HALF },
			{ id : 'TOGGLE_HELP_TEXT', axis : HALF },
			{ id : 'INCREASE_TIMESCALE', axis : HALF },
			{ id : 'DECREASE_TIMESCALE', axis : HALF },
			{ id : 'RESET_HEAD_TRACKING', axis : HALF },
		],
		PLACEABLE : [
			{ id : 'AXIS_DOOR', axis : FULL },
			{ id : 'AXIS_DOOR_2', axis : FULL },
			{ id : 'AXIS_DOOR_3', axis : FULL },
		],
		PLAYER_INTERACTIVE : [
			{ id : 'AXIS_ROTATE_HANDTOOL', axis : FULL },
			{ id : 'ACTIVATE_HANDTOOL', axis : HALF },
			{ id : 'ROTATE_OBJECT_LEFT_RIGHT', axis : FULL },
			{ id : 'ROTATE_OBJECT_UP_DOWN', axis : FULL },
			{ id : 'INTERACT', axis : HALF },
			{ id : 'THROW_OBJECT', axis : HALF },
			{ id : 'TOGGLE_LIGHTS_FPS', axis : HALF },
			{ id : 'ACTIVATE_OBJECT', axis : HALF },
			{ id : 'ANIMAL_PET', axis : HALF },
		],
		PLAYER_MOVEMENT : [
			{ id : 'AXIS_MOVE_FORWARD_PLAYER', axis : FULL },
			{ id : 'AXIS_MOVE_SIDE_PLAYER', axis : FULL },
			{ id : 'AXIS_LOOK_UPDOWN_PLAYER', axis : FULL },
			{ id : 'AXIS_LOOK_LEFTRIGHT_PLAYER', axis : FULL },
			{ id : 'AXIS_RUN', axis : HALF },
			{ id : 'JUMP', axis : HALF },
			{ id : 'CROUCH', axis : HALF },
		],
		RADIO : [
			{ id : 'RADIO_TOGGLE', axis : HALF },
			{ id : 'RADIO_NEXT_CHANNEL', axis : HALF },
			{ id : 'RADIO_PREVIOUS_CHANNEL', axis : HALF },
			{ id : 'RADIO_NEXT_ITEM', axis : HALF },
			{ id : 'RADIO_PREVIOUS_ITEM', axis : HALF },
		],
		VEHICLE : [
			{ id : 'AXIS_HYDRAULICATTACHER1', axis : FULL },
			{ id : 'AXIS_HYDRAULICATTACHER2', axis : FULL },
			{ id : 'AXIS_PIPE', axis : FULL },
			{ id : 'AXIS_PIPE2', axis : FULL },
			{ id : 'AXIS_DRAWBAR', axis : FULL },
			{ id : 'AXIS_DRAWBAR2', axis : FULL },
			{ id : 'ENTER', axis : HALF },
			{ id : 'CAMERA_ZOOM_IN', axis : HALF },
			{ id : 'CAMERA_ZOOM_OUT', axis : HALF },
			{ id : 'SWITCH_VEHICLE', axis : HALF },
			{ id : 'SWITCH_VEHICLE_BACK', axis : HALF },
			{ id : 'ATTACH', axis : HALF },
			{ id : 'DETACH', axis : HALF },
			{ id : 'SWITCH_IMPLEMENT', axis : HALF },
			{ id : 'SWITCH_IMPLEMENT_BACK', axis : HALF },
			{ id : 'TOGGLE_TIPSTATE', axis : HALF },
			{ id : 'TOGGLE_TIPSIDE', axis : HALF },
			{ id : 'TOGGLE_TENSION_BELTS', axis : HALF },
			{ id : 'TOGGLE_BALE_TYPES', axis : HALF },
			{ id : 'VEHICLE_ACTION_CONTROL', axis : HALF },
			{ id : 'LOWER_IMPLEMENT', axis : HALF },
			{ id : 'IMPLEMENT_EXTRA', axis : HALF },
			{ id : 'IMPLEMENT_EXTRA2', axis : HALF },
			{ id : 'IMPLEMENT_EXTRA3', axis : HALF },
			{ id : 'IMPLEMENT_EXTRA4', axis : HALF },
			{ id : 'TOGGLE_SEEDS', axis : HALF },
			{ id : 'TOGGLE_SEEDS_BACK', axis : HALF },
			{ id : 'TOGGLE_PIPE', axis : HALF },
			{ id : 'TOGGLE_COVER', axis : HALF },
			{ id : 'TOGGLE_CHOPPER', axis : HALF },
			{ id : 'TOGGLE_TIPSTATE_GROUND', axis : HALF },
			{ id : 'LOWER_ALL_IMPLEMENTS', axis : HALF },
			{ id : 'TURN_ON_ALL_IMPLEMENTS', axis : HALF },
			{ id : 'FOLD_ALL_IMPLEMENTS', axis : HALF },
			{ id : 'UNLOAD', axis : HALF },
		],
		VEHICLE_DRIVING : [
			{ id : 'AXIS_ACCELERATE_VEHICLE', axis : HALF },
			{ id : 'AXIS_BRAKE_VEHICLE', axis : HALF },
			{ id : 'AXIS_MOVE_SIDE_VEHICLE', axis : FULL },
			{ id : 'AXIS_LOOK_UPDOWN_VEHICLE', axis : FULL },
			{ id : 'AXIS_LOOK_LEFTRIGHT_VEHICLE', axis : FULL },
			{ id : 'AXIS_WHEEL_BASE', axis : FULL },
			{ id : 'AXIS_CRUISE_CONTROL', axis : FULL },
			{ id : 'HONK', axis : HALF },
			{ id : 'TOGGLE_MOTOR_STATE', axis : HALF },
			{ id : 'TOGGLE_CRABSTEERING', axis : HALF },
			{ id : 'TOGGLE_CRABSTEERING_BACK', axis : HALF },
			{ id : 'CHANGE_DRIVING_DIRECTION', axis : HALF },
			{ id : 'TOGGLE_CRUISE_CONTROL', axis : HALF },
			{ id : 'CRABSTEERING_ALLWHEEL', axis : HALF },
			{ id : 'CRABSTEERING_CRABLEFT', axis : HALF },
			{ id : 'CRABSTEERING_CRABRIGHT', axis : HALF },
		],
		VEHICLE_FRONTLOADER : [
			{ id : 'AXIS_FRONTLOADER_ARM', axis : FULL },
			{ id : 'AXIS_FRONTLOADER_ARM2', axis : FULL },
			{ id : 'AXIS_FRONTLOADER_TOOL', axis : FULL },
			{ id : 'AXIS_FRONTLOADER_TOOL2', axis : FULL },
			{ id : 'AXIS_FRONTLOADER_TOOL3', axis : FULL },
			{ id : 'AXIS_FRONTLOADER_TOOL4', axis : FULL },
			{ id : 'AXIS_FRONTLOADER_TOOL5', axis : FULL },
		],
		VEHICLE_GEARBOX : [
			{ id : 'AXIS_CLUTCH_VEHICLE', axis : HALF },
			{ id : 'SHIFT_GEAR_UP', axis : HALF },
			{ id : 'SHIFT_GEAR_DOWN', axis : HALF },
			{ id : 'SHIFT_GEAR_SELECT_1', axis : HALF },
			{ id : 'SHIFT_GEAR_SELECT_2', axis : HALF },
			{ id : 'SHIFT_GEAR_SELECT_3', axis : HALF },
			{ id : 'SHIFT_GEAR_SELECT_4', axis : HALF },
			{ id : 'SHIFT_GEAR_SELECT_5', axis : HALF },
			{ id : 'SHIFT_GEAR_SELECT_6', axis : HALF },
			{ id : 'SHIFT_GEAR_SELECT_7', axis : HALF },
			{ id : 'SHIFT_GEAR_SELECT_8', axis : HALF },
			{ id : 'SHIFT_GROUP_UP', axis : HALF },
			{ id : 'SHIFT_GROUP_DOWN', axis : HALF },
			{ id : 'SHIFT_GROUP_SELECT_1', axis : HALF },
			{ id : 'SHIFT_GROUP_SELECT_2', axis : HALF },
			{ id : 'SHIFT_GROUP_SELECT_3', axis : HALF },
			{ id : 'SHIFT_GROUP_SELECT_4', axis : HALF },
			{ id : 'DIRECTION_CHANGE', axis : HALF },
			{ id : 'DIRECTION_CHANGE_POS', axis : HALF },
			{ id : 'DIRECTION_CHANGE_NEG', axis : HALF },
		],
		VEHICLE_LIGHTS : [
			{ id : 'TOGGLE_LIGHTS', axis : HALF },
			{ id : 'TOGGLE_LIGHTS_BACK', axis : HALF },
			{ id : 'TOGGLE_BEACON_LIGHTS', axis : HALF },
			{ id : 'TOGGLE_TURNLIGHT_LEFT', axis : HALF },
			{ id : 'TOGGLE_TURNLIGHT_RIGHT', axis : HALF },
			{ id : 'TOGGLE_TURNLIGHT_HAZARD', axis : HALF },
			{ id : 'TOGGLE_WORK_LIGHT_BACK', axis : HALF },
			{ id : 'TOGGLE_WORK_LIGHT_FRONT', axis : HALF },
			{ id : 'TOGGLE_HIGH_BEAM_LIGHT', axis : HALF },
			{ id : 'TOGGLE_LIGHT_FRONT', axis : HALF },
		],
		VEHICLE_WORK : [
			{ id : 'AXIS_CUTTER_REEL', axis : FULL },
			{ id : 'AXIS_CUTTER_REEL2', axis : FULL },
			{ id : 'AXIS_SPRAYER_ARM', axis : FULL },
			{ id : 'TOGGLE_AI', axis : HALF },
			{ id : 'TOGGLE_WORKMODE', axis : HALF },
			{ id : 'DOUBLED_SPRAY_AMOUNT', axis : HALF },
			{ id : 'VARIABLE_WORK_WIDTH_LEFT', axis : FULL },
			{ id : 'VARIABLE_WORK_WIDTH_RIGHT', axis : FULL },
			{ id : 'VARIABLE_WORK_WIDTH_TOGGLE', axis : HALF },
			{ id : 'TOGGLE_CUT_LENGTH_BACK', axis : HALF },
			{ id : 'WOOD_HARVESTER_DROP', axis : HALF },
			{ id : 'TOGGLE_WOOD_HARVESTER_TILT', axis : HALF },
			{ id : 'WORKMODE_MIDDLE', axis : HALF },
			{ id : 'WORKMODE_LEFT', axis : HALF },
			{ id : 'WORKMODE_RIGHT', axis : HALF },
		],

		GOWEIL_PACK : [
			{ id : 'BALE_WRAPPER_DROP_BALE_ON_END_TURNER', axis : HALF },
			{ id : 'TOGGLE_LIGHTS_EXTERNAL', axis : HALF },
			{ id : 'FOLD_STATE_NEXT_POS', axis : HALF },
			{ id : 'FOLD_STATE_NEXT_NEG', axis : HALF },
			{ id : 'GOEWEIL_BALE_COUNTER_RESET', axis : HALF },
		],
		KUBOTA_PACK : [
			{ id : 'SWITCH_SEAT', axis : HALF },
		],
		PLATINUM_EXPANSION : [
			{ id : 'SPRAYCAN_CHANGE_MARKER', axis : HALF },
			{ id : 'YARDER_CARRIAGE_CONTROL_LEFTRIGHT', axis : FULL },
			{ id : 'YARDER_CARRIAGE_CONTROL_UPDOWN', axis : FULL },
			{ id : 'YARDER_CARRIAGE_FOLLOW_ME', axis : HALF },
			{ id : 'YARDER_CARRIAGE_FOLLOW_HOME', axis : HALF },
			{ id : 'YARDER_CARRIAGE_FOLLOW_PICKUP', axis : HALF },
			{ id : 'YARDER_CARRIAGE_ATTACH', axis : HALF },
			{ id : 'YARDER_CARRIAGE_DETACH', axis : HALF },
			{ id : 'YARDER_SETUP_ROPE', axis : HALF },
			{ id : 'TREE_AUTOMATIC_ALIGN', axis : HALF },
			{ id : 'WINCH_CONTROL', axis : FULL },
			{ id : 'WINCH_CONTROL_VEHICLE', axis : FULL },
			{ id : 'WINCH_ATTACH_MODE', axis : HALF },
			{ id : 'WINCH_ATTACH', axis : HALF },
			{ id : 'WINCH_DETACH', axis : HALF },
		],
		PRECISION_FARMING : [
			{ id : 'PRECISIONFARMING_SPRAY_AMOUNT', axis : FULL },
			{ id : 'PRECISIONFARMING_SPRAY_AMOUNT_MODE', axis : HALF },
			{ id : 'PRECISIONFARMING_SEED_RATE', axis : FULL },
			{ id : 'PRECISIONFARMING_SEED_RATE_MODE', axis : HALF },
			{ id : 'PRECISIONFARMING_TOGGLE_CROP_SENSOR', axis : HALF },
		],
		PREMIUM_EXPANSION : [
			{ id : 'PALLET_FILLER_BUY_PALLETS', axis : HALF },
		],
		VERMEER_PACK : [
			{ id : 'BALE_COUNTER_RESET', axis : HALF },
		],
	}

	actionCatOverride = {
		GOWEIL_PACK        : 'GÖWEIL Pack',
		KUBOTA_PACK        : 'Kubota Pack',
		PLATINUM_EXPANSION : 'Platinum Expansion',
		PRECISION_FARMING  : 'Precision Farming',
		PREMIUM_EXPANSION  : 'Premium Expansion',
		VERMEER_PACK       : 'Vermeer Pack',
	}

	deviceName = {
		PS_GAMEPAD     : 'DUALSHOCK(R)4',
		SAITEK_PANEL   : 'Saitek Side Panel Control Deck',
		SAITEK_WHEEL   : 'Saitek Heavy Eqpt. Wheel & Pedal',
		STADIA_GAMEPAD : 'Stadia Controller',
		SWITCH_GAMEPAD : 'Nintendo Controller',
		XBOX_GAMEPAD   : 'XBox Controller',
		XINPUT_GAMEPAD : 'Controller',
	}

	currentLocale = 'en'

	/* cSpell: enable */
	constructor() {
		this.init()

		this.actionKnown = new Set(this.actionSkip)

		for ( const items of Object.values(this.actions) ) {
			for ( const item of items ) {
				this.actionKnown.add(item.id)
			}
		}
	}

	#simpleTD(content, classList = ['text-end']) {
		const node = document.createElement('td')
		if ( typeof content === 'string' ) {
			node.textContent = content
		} else {
			node.appendChild(content)
		}
		node.classList.add(...classList)
		return node
	}

	#makeButton(icon, text, color = 'primary') {
		const node = document.createElement('button')

		node.classList.add('btn', 'btn-sm', `btn-${color}`, 'ms-1')

		const iNode = document.createElement('i')
		iNode.classList.add('bi', `bi-${icon}`)
		node.append(
			iNode,
			' ',
			I18N.__(text)
		)
		return node
	}

	#actActive(item) {
		const node = document.createElement('td')
		node.classList.add('text-end')

		const view = this.#makeButton('eye', 'input_manage_action_view')
		const copy = this.#makeButton('file-plus', 'input_manage_action_copy', 'success')

		view.addEventListener('click', () => {
			window.input_IPC.loadBindings(item.path).then((result) => this.initViewer(result))
		})
		copy.addEventListener('click', () => {
			MA.byIdValue('input_copy_new', '')
			MA.byId('copy_dest_file_version').checked = true
			this.modalCopy.version = item.version
			this.modalCopy.src = item.path
			this.updateCopyModal()
			this.modalCopy.show()
		})

		node.append(copy, view)
		return node
	}

	#actBackup(item) {
		const node = document.createElement('td')
		node.classList.add('text-end')

		const view   = this.#makeButton('eye', 'input_manage_action_view')
		const copy   = this.#makeButton('file-arrow-down', 'input_manage_action_restore', 'success')
		const remove = this.#makeButton('trash3', 'input_manage_action_delete', 'danger')

		view.addEventListener('click', () => {
			window.input_IPC.loadBindings(item.path).then((result) => this.initViewer(result))
		})
		remove.addEventListener('click', () => {
			MA.byIdText('delete_source_file', item.file)
			this.modalDelete.src = item.path
			this.modalDelete.show()
		})
		copy.addEventListener('click', () => {
			const opts = [
				DATA.optionFromArray([0, '--'], item.version),
				...[...this.goodVersion].map((x) => DATA.optionFromArray([x, `20${x}`], item.version)),
			]
			MA.byIdText('restore_source_file', item.file)
			MA.byIdHTML('restore_version', opts.join(''))
			this.modalRestore.src = item.path
			this.modalRestore.version = item.version
			this.updateRestoreModal()
			this.modalRestore.show()
		})
		
		node.append(remove, copy, view)
		return node

	}

	#doLine(item, thisLocale) {
		const node  = document.createElement('tr')

		if ( item.type === 'active' ) { this.goodVersion.add(item.version) }

		node.append(
			this.#simpleTD(I18N.buildBadgeMod({
				name : `fs${item.version}`,
				class : [],
			}), ['text-center']),
			this.#simpleTD(I18N.__(`input_manage_${item.type}`)),
			this.#simpleTD(item.file),
			this.#simpleTD(new Date(item.date).toLocaleString(thisLocale))
		)
		
		if ( item.type === 'active' ) {
			node.append(this.#actActive(item))
		} else {
			node.append(this.#actBackup(item))
		}
		return node
	}

	updateRestoreModal() {
		this.modalRestore.dest = MA.byIdValue('restore_version')
		if ( this.modalRestore.dest === '0' || this.modalRestore.dest === null ) {
			this.modalRestore.buttonGo.classList.add('disabled')
		} else {
			this.modalRestore.buttonGo.classList.remove('disabled')
		}
	}

	updateCopyModal() {
		const text = MA.byIdValue('input_copy_new')
		if ( text === null || text === '' ) {
			this.modalCopy.buttonGo.classList.add('disabled')
			this.modalCopy.dest = ''
		} else {
			this.modalCopy.buttonGo.classList.remove('disabled')
			this.modalCopy.dest = `${text.replaceAll(/[^\w-]/g, '_')}${!MA.byIdCheck('copy_dest_file_version') ? '' : `_fs${this.modalCopy.version}`}.xml`
		}
		MA.byIdText('copy_dest_file', this.modalCopy.dest)
	}

	init() {
		this.overlay  = new bootstrap.Offcanvas('#viewCanvas')

		this.modalDelete = new ModalOverlay('delete_backup_modal', (src) => {
			window.input_IPC.deleteBindings(src).then((result) => { this.populateList(result) })
		})
		this.modalCopy = new ModalOverlay('copy_backup_modal', (src, dest) => {
			window.input_IPC.copyBindings(src, dest).then((result) => { this.populateList(result) })
		})
		this.modalRestore = new ModalOverlay('restore_backup_modal', (src, dest) => {
			window.input_IPC.restoreBindings(src, dest).then((result) => { this.populateList(result) })
		})

		MA.byId('input_copy_new').addEventListener('keyup', () => { this.updateCopyModal() })
		MA.byId('copy_dest_file_version').addEventListener('change', () => { this.updateCopyModal() })
		MA.byId('restore_version').addEventListener('change', () => { this.updateRestoreModal() })

		MA.byId('viewCanvas-button-close').addEventListener('click', () => {
			this.overlay.hide()
		})

		this.conMap = {
			'AXIS_1+' : this.#doConImg('Left_Stick', '→'),
			'AXIS_1-' : this.#doConImg('Left_Stick', '←'),
			'AXIS_2+' : this.#doConImg('Left_Stick', '↑'),
			'AXIS_2-' : this.#doConImg('Left_Stick', '↓'),
			'AXIS_3+' : this.#doConImg('Right_Stick', '→'),
			'AXIS_3-' : this.#doConImg('Right_Stick', '←'),
			'AXIS_4+' : this.#doConImg('Right_Stick', '↑'),
			'AXIS_4-' : this.#doConImg('Right_Stick', '↓'),
			'AXIS_11' : this.#doConImg('RT'),
			'AXIS_12' : this.#doConImg('LT'),
			'BUTTON_1' : this.#doConImg('X'),
			'BUTTON_2' : this.#doConImg('A'),
			'BUTTON_3' : this.#doConImg('B'),
			'BUTTON_4' : this.#doConImg('Y'),
			'BUTTON_5' : this.#doConImg('LB'),
			'BUTTON_6' : this.#doConImg('RB'),
			'BUTTON_9' : this.#doConImg('View'),
			'BUTTON_10' : this.#doConImg('Menu'),
			'BUTTON_11' : this.#doConImg('Left_Stick_Click'),
			'BUTTON_12' : this.#doConImg('Right_Stick_Click'),
			'BUTTON_16' : '<span class="btn btn-vsm btn-outline-secondary small rounded-circle">16</span>',
			'BUTTON_17' : this.#doConImg('Dpad_Up'),
			'BUTTON_18' : this.#doConImg('Dpad_Right'),
			'BUTTON_19' : this.#doConImg('Dpad_Down'),
			'BUTTON_20' : this.#doConImg('Dpad_Left'),
			'HALF_AXIS_1' : this.#doConImg('RT'),
		}
		this.updateList()
	}

	async populateList(data) {
		this.goodVersion.clear()
		this.currentLocale = await window.i18n.lang() ?? 'en'
		const listFiles  = MA.byId('listFiles')
		listFiles.innerHTML = ''
		for ( const thisLine of data ) {
			listFiles.appendChild(this.#doLine(thisLine, this.currentLocale))
		}
	}

	updateList() {
		window.input_IPC.listBindings().then((result) => { this.populateList(result) })
	}

	#parseActionData(data) {
		const actionMap = {}
		this.actionMods = []

		if ( data !== null ) {
			const devMap = {}

			if ( typeof data.devices.device === 'object' ) {
				for ( const device of data.devices.device ) {
					devMap[device.$.ID] = [this.deviceName[device.$.NAME] ?? device.$.NAME, device.$.NAME]
				}
			}
			for ( const actBind of data.actionbinding ) {
				if ( this.actionSkip.has(actBind.$.ACTION) ) { continue }
				if ( ! this.actionKnown.has(actBind.$.ACTION) ) {
					this.actionMods.push(actBind.$.ACTION)
				}
				const binds = {
					'+'  : [null, null, null, null, null],
					'-'  : [null, null, null, null, null],
					full : false,
				}

				if ( typeof actBind.binding === 'object' ) {
					for ( const key of actBind.binding ) {
						if ( key.$.AXISCOMPONENT === '-' ) { binds.full = true }
						if ( key.$.DEVICE === 'KB_MOUSE_DEFAULT' ) {
							binds[key.$.AXISCOMPONENT][key.$.INDEX - 1] = key.$.INPUT
						} else {
							binds[key.$.AXISCOMPONENT][key.$.INDEX + 2] = [
								key.$.INPUT,
								devMap[key.$.DEVICE]?.[0] ?? `??-${key.$.DEVICE.slice(2, 15)}-??`,
								devMap[key.$.DEVICE]?.[1] ?? key.$.DEVICE,
							]
						}
					}
				}
				actionMap[actBind.$.ACTION] = binds
			}
		}

		return actionMap
	}

	initViewer(data) {
		const actionMap = this.#parseActionData(data)

		const tabHTML = []
		for ( const catKey of this.actionOrder ) {
			const catName = typeof this.actionCatOverride[catKey] !== 'undefined' ?
				this.actionCatOverride[catKey] :
				`<i18n-text data-key="$l10n_inputcategory_${catKey}"></i18n-text>`
			tabHTML.push(`<tr><td colspan="6" class="text-center text-secondary text-uppercase">${catName}</td></tr>`)

			for ( const catItem of this.actions[catKey] ) {
				if ( catItem.axis ) {
					tabHTML.push(this.#doFullBind(catItem.id, actionMap[catItem.id]))
				} else {
					tabHTML.push(this.#doHalfBind(catItem.id, actionMap[catItem.id]))
				}
			}

		}
		if ( this.actionMods.length !== 0 ) {
			tabHTML.push('<tr><td colspan="6" class="text-center text-secondary text-uppercase"><i18n-text data-key="input_manage_mod_actions"></i18n-text></td></tr>')
			for ( const modAction of this.actionMods ) {
				if ( actionMap[modAction].full ) {
					tabHTML.push(this.#doFullBind(modAction, actionMap[modAction], true))
				} else {
					tabHTML.push(this.#doHalfBind(modAction, actionMap[modAction], true))
				}
			}
		}

		MA.byIdHTML('bindMap', tabHTML.join(''))
		this.overlay.show()
	}

	#doFullBind(id, binds, isMod = false) {
		return [
			...this.#doHalfBind(`${id}_1`, binds, isMod, '+'),
			...this.#doHalfBind(`${id}_2`, binds, isMod, '-'),
		].join('')
	}

	#doHalfBind(id, binds, isMod = false, direction = '+') {
		return [
			'<tr>',
			isMod ? `<td>${id}</td>` : `<td><i18n-text data-key="$l10n_input_${id}"></i18n-text></td>`,
			`<td class="text-center align-middle small">${this.#prepBind_key(binds?.[direction][0])}</td>`,
			`<td class="text-center align-middle small">${this.#prepBind_key(binds?.[direction][1])}</td>`,
			`<td class="text-center align-middle small">${this.#prepBind_mouse(binds?.[direction][2])}</td>`,
			`<td class="text-center align-middle small">${this.#prepBind_gamepad(binds?.[direction][3])}</td>`,
			`<td class="text-center align-middle small">${this.#prepBind_gamepad(binds?.[direction][4])}</td>`,
			'</tr>',
		].join('')
	}

	#prepBind_key(key) {
		if ( key === null || typeof key === 'undefined' ) { return '' }
		return clientGetKeyMapSmall(key, this.currentLocale)
	}

	#prepBind_mouse(key) {
		if ( key === null || typeof key === 'undefined' ) { return '' }
		const altKey = key.replace(/AXIS_/, 'MOUSE_AXIS_')
		return clientGetKeyMapSmall(altKey, this.currentLocale)
	}

	#prepBind_gamepad(key) {
		if ( key === null || typeof key === 'undefined' ) { return '' }
		if ( key[2].endsWith('_GAMEPAD') || key[2] === 'Wireless Controller' ) {
			return `${this.#doGamePad(key[0])} <span class="text-secondary" style="white-space: nowrap;">[<i class="bi bi-controller"></i>]</span>`
		}
		return `${this.#doController(key[0])} <span class="text-secondary">[${key[1]}]</span>`
	}

	#doConImg(name, text = null) {
		return `<img style="width: 20px" src="img/controller/XboxSeriesX_${name}.png">${text ? ` ${text}` : ''}`
	}

	#doController(key) {
		return key.split(' ').map((x) => {
			if ( x.startsWith('AXIS_') ) {
				return `⤱${x.replace('AXIS_', '')}`
			} else if ( x.startsWith('BUTTON_') ) {
				return `<span class="btn btn-vsm btn-outline-secondary small rounded-circle">${x.replace('BUTTON_', '')}</span>`
			}
			return x
		}).join('<span class="mx-1">+</span>')
	}

	#doGamePad(key) {
		return key.split(' ').map((x) => this.conMap[x] ?? x).join('<span class="mx-1">+</span>')
	}
}


// MARK: modal overlays
class ModalOverlay {
	overlay = null
	src     = null
	dest    = null
	version = null

	buttonCancel = null
	buttonGo     = null

	constructor(id, goCallback) {
		this.buttonCancel = MA.byId(id).querySelector('.genericModalCancel')
		this.buttonGo     = MA.byId(id).querySelector('.genericModalGo')
		
		this.overlay = new bootstrap.Modal(`#${id}`, {backdrop : 'static', keyboard : false })
		this.overlay.hide()

		this.buttonCancel.addEventListener('click', () => {
			this.src     = null
			this.dest    = null
			this.version = null
			this.hide()
		})

		this.buttonGo.addEventListener('click', () => {
			goCallback(this.src, this.dest)
			this.src     = null
			this.dest    = null
			this.version = null
			this.hide()
		})
	}

	show() {
		this.overlay.show()
	}

	hide() {
		this.overlay.hide()
	}
}

window.addEventListener('beforeunload', (e) => {
	if ( MA.byId('viewCanvas').classList.contains('show') ) {
		window.state.overlay.hide()
		e.preventDefault()
	} else if ( MA.byId('delete_backup_modal').classList.contains('show') ) {
		e.preventDefault()
	} else if ( MA.byId('copy_backup_modal').classList.contains('show') ) {
		e.preventDefault()
	} else if ( MA.byId('restore_backup_modal').classList.contains('show') ) {
		e.preventDefault()
	}
})