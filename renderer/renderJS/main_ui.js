/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Main Window UI

/* global MA, StateManager */

// MARK: async events
window.operations.receive('select:invert', () => {
	if ( ! window.state.files.flags.isRunning ) { window.state.select.invert() }
	else { window.state.files.key_invert() }
})

window.operations.receive('select:none', () => {
	if ( ! window.state.files.flags.isRunning ) { window.state.select.none() }
	else { window.state.files.key_none() }
})

window.operations.receive('select:all', () => {
	if ( ! window.state.files.flags.isRunning ) { window.state.select.all() }
	else { window.state.files.key_all() }
})

window.main_IPC.receive('select:list', (list) => {
	const tableID = `${list[0].split('--')[0]}_mods`
	window.state.colToggle(tableID)
	window.state.track.selected = new Set(list)
	window.state.doDisplay()
})

window.main_IPC.receive('select:withText', (list, text) => {
	const tableID = list.split('--')[0]
	window.state.colToggle(tableID)
	window.state.track.selected = new Set([list])
	window.state.filter.findForce(text)
})

window.main_IPC.receive('mods:list', (modCollect) => {
	window.state.updateFromData(modCollect)
})
window.main_IPC.receive('mods:site', (mod) => {
	window.state.action.openModInfo(mod)
})

// MARK: Loader Overlay
window.main_IPC.receive('loading:show',     () => { window.state.loader.show() })
window.main_IPC.receive('loading:hide',     () => { window.state.loader.hide() })
window.main_IPC.receive('loading:download', () => { window.state.loader.startDownload() })
window.main_IPC.receive('loading:noCount',  () => { window.state.loader.hideCount() })
window.main_IPC.receive('loading:titles',   (main, sub, cancel) => { window.state.loader.updateText(main, sub, cancel) })
window.main_IPC.receive('loading:total',    (count, inMB) => { window.state.loader.updateTotal(count, inMB) })
window.main_IPC.receive('loading:current',  (count, inMB) => { window.state.loader.updateCount(count, inMB) })

// File Operations
// window.mods.receive('fromMain_fileOperation', (opPayload) => { fileOpLib.startOverlay(opPayload) })

//MARK: top bar event
function topBarHandlers() {
	MA.byIdEventIfExists('topBar-launch',      () => { window.state.action.launchGame() })
	MA.byIdEventIfExists('topBar-update',      () => { window.main_IPC.updateApplication() })
	MA.byIdEventIfExists('topBar-preferences', () => { window.state.prefs.open() })
	MA.byIdEventIfExists('topBar-tray',        () => { window.main_IPC.minimizeToTray() })
	MA.byIdEventIfExists('topBar-basegame',    () => { window.main_IPC.dispatch('basegame') })
	MA.byIdEventIfExists('topBar-savetrack',   () => { window.main_IPC.dispatch('savetrack') })
	MA.byIdEventIfExists('topBar-find',        () => { window.main_IPC.dispatch('find') })
	MA.byIdEventIfExists('topBar-gamelog',     () => { window.main_IPC.dispatch('gamelog') })
	MA.byIdEventIfExists('topBar-help',        () => { window.main_IPC.dispatch('help') })
	MA.byIdEventIfExists('topBar-mini',        () => { window.main_IPC.dispatch('mini') })
	MA.byIdEventIfExists('bottomBar-debug',    () => { window.main_IPC.dispatch('debug') })
}
//MARK: side bar event
function sideBarHandlers() {
	MA.byIdEventIfExists('moveButton_ver', () => { window.main_IPC.dispatch('version') })
	MA.byIdEventIfExists('moveButton_fav', () => { window.state.startFile('favs') })

	MA.byIdEventIfExists('moveButton_move',   () => { window.state.startFile('move') })
	MA.byIdEventIfExists('moveButton_copy',   () => { window.state.startFile('copy') })
	MA.byIdEventIfExists('moveButton_delete', () => { window.state.startFile('delete') })
	MA.byIdEventIfExists('moveButton_zip',    () => { window.state.startFile('zip') })

	MA.byIdEventIfExists('moveButton_open', () => { window.state.startFile('openMods') })
	MA.byIdEventIfExists('moveButton_hub',  () => { window.state.startFile('openHub') })
	MA.byIdEventIfExists('moveButton_site', () => { window.state.startFile('openExt') })
}
// MARK: top UI event
function topUIHandlers() {
	MA.byIdEventIfExists('selectButtonNone',   () => { window.state.select.none() })
	MA.byIdEventIfExists('selectButtonAll',    () => { window.state.select.all() })
	MA.byIdEventIfExists('selectButtonInvert', () => { window.state.select.invert() })

	MA.byIdEventIfExists('modSortOrder', () => { window.state.changeSort() }, 'change')
	MA.byIdEventIfExists('modFindType',  () => { window.state.filter.findType()}, 'change')
	MA.byIdEventIfExists('modFilter_selected', () => { window.state.toggleSelectOnly()}, 'change')
	MA.byIdEventIfExists('filter_input', () => { window.main_IPC.contextInput() }, 'contextmenu')
	MA.byIdEventIfExists('filter_input', () => { window.state.filter.findTerm() }, 'keyup')
	MA.byIdEventIfExists('filter_input', () => { window.state.filter.findTerm() }, 'blur')
	MA.byIdEventIfExists('filter_clear', () => { window.state.filter.findClear() }, 'click')

	MA.byIdEventIfExists('folderAddButton',    () => { window.main_IPC.folder.add() })
	MA.byIdEventIfExists('folderEditButton',   () => { window.main_IPC.folder.edit() })
	MA.byIdEventIfExists('folderReloadButton', () => { window.main_IPC.folder.reload() })

	MA.byIdEventIfExists('collectButtonActive',   () => { window.state.action.collectActive() })
	MA.byIdEventIfExists('collectButtonInActive', () => { window.state.action.collectInActive() })
}

function popUIHandlers() {
	MA.byIdEventIfExists('loadOverlay_downloadCancelButton', () => { window.main_IPC.cancelDownload() })
	MA.byIdEventIfExists('mismatchLaunchIgnore', () => { window.state.action.launchGame_IGNORE() })
	MA.byIdEventIfExists('mismatchLaunchFix',    () => { window.state.action.launchGame_FIX() })

	MA.byIdEventIfExists('mod_info_input',  () => { window.main_IPC.contextInput() }, 'contextmenu')
	MA.byIdEventIfExists('mod_info_button', () => { window.state.action.setModInfo() })
}

// MARK: On Load
window.addEventListener('DOMContentLoaded', () => {
	window.state = new StateManager()

	topBarHandlers()
	sideBarHandlers()
	topUIHandlers()
	popUIHandlers()

	window.addEventListener('hidden.bs.collapse', () => { window.state.select.none() })
	window.addEventListener('shown.bs.collapse',  () => { window.state.select.none() })

	setInterval(() => { window.state.updateState() }, 5000)
})


window.addEventListener('beforeunload', (e) => {
	if ( MA.byId('prefcanvas').classList.contains('show') ) {
		window.state.prefs.overlay.hide()
		e.preventDefault()
	} else if ( MA.byId('fileOpCanvas').classList.contains('show') ) {
		window.state.files.overlay.hide()
		e.preventDefault()
	}
})
