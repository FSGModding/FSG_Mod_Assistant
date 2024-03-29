/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Import Collection window UI

/* global processL10N, fsgUtil, __, bootstrap */


const formatEmpty = (text) => text !== '' ? text : `<em>${__('import_json_not_set')}</em>`
const formatBool  = (value) => value ?
	`<i class="text-success bi bi-check2-circle"></i> ${__('import_json_yes')}`:
	`<i class="text-danger bi bi-x-circle"></i> ${__('import_json_no')}`

const downloadButton = (uri, isPack = true) => {
	const thisID = crypto.randomUUID()
	return [
		`<div id="but_${thisID}" onclick="clientDoDownload('${thisID}','${uri}', ${isPack})" class="w-75 d-block mx-auto btn btn-primary btn-sm disabled btn-download">`,
		isPack ? __('import_json_step_2_download_unpack') : __('import_json_step_2_download'),
		' :: ',
		uri,
		'</div>'
	].join('')
}

let importJSON = null
let importKey = null

window.mods.receive('fromMain_importFolder', (folderData) => {
	importKey = folderData.collectKey
	fsgUtil.setById('folder_location', folderData.folder)
	fsgUtil.clsShowTrue('folder_location_empty', folderData.contents === 0 )
	fsgUtil.clsShowTrue('folder_location_not_empty', folderData.contents !== 0 )
	fsgUtil.clsEnable('apply_button')
	fsgUtil.clsRemoveFromAll('.btn-download', 'disabled')
})

window.mods.receive('fromMain_importData', (modCollect) => {
	importJSON = modCollect.opts.thisImport
	fsgUtil.setById('notes_collection_color', fsgUtil.getIconSVG('folder', false, false, false, importJSON.collection_color ))
	fsgUtil.setById('notes_collection_description', formatEmpty(importJSON.collection_description))
	fsgUtil.setById('notes_game_version', formatEmpty(importJSON.game_version))
	fsgUtil.setById('notes_server_name', formatEmpty(importJSON.server_name))
	fsgUtil.setById('notes_server_id', formatEmpty(importJSON.server_id))
	fsgUtil.setById('notes_server_password', formatEmpty(importJSON.server_password))
	fsgUtil.setById('notes_server_website', formatEmpty(importJSON.server_website))
	fsgUtil.setById('notes_server_downloads', formatBool(importJSON.server_downloads))
	fsgUtil.setById('notes_force_frozen', formatBool(importJSON.force_frozen))

	const packDL = importJSON.download_unzip.map((x) => downloadButton(x, true) )
	const singleDL = importJSON.download_direct.map((x) => downloadButton(x, false) )
	fsgUtil.setById('import_mod_packs', packDL.join(''))
	fsgUtil.setById('import_mod_singles', singleDL.join(''))

	processL10N()
})

function clientDoDownload(id, uri, isPack) {
	fsgUtil.clsDelId(`but_${id}`, 'btn-primary')
	fsgUtil.clsAddId(`but_${id}`, 'btn-success', 'disabled')
	window.mods.doDownload(importKey, uri, isPack)
}

function clientDoSettings() {
	window.mods.setNote('notes_color', importJSON.collection_color, importKey)
	window.mods.setNote('notes_tagline', importJSON.collection_description, importKey)
	window.mods.setNote('notes_version', importJSON.game_version, importKey)
	window.mods.setNote('notes_server', importJSON.server_name, importKey)
	window.mods.setNote('notes_fsg_bot', importJSON.server_id, importKey)
	window.mods.setNote('notes_password', importJSON.server_password, importKey)
	window.mods.setNote('notes_website', importJSON.server_website, importKey)
	window.mods.setNote('notes_websiteDL', importJSON.server_downloads, importKey)
	window.mods.setNote('notes_frozen', importJSON.force_frozen, importKey)
	fsgUtil.clsDelId('apply_button', 'btn-primary')
	fsgUtil.clsAddId('apply_button', 'btn-success')
	window.mods.doReload()
}

const loaderLib = {
	overlay : null,

	lastTotal : 1,
	startTime : Date.now(),

	hide : () => { loaderLib.overlay?.hide() },
	show : () => { loaderLib.overlay?.show() },

	hideCount : () => {
		fsgUtil.clsHide('loadOverlay_statusCount')
		fsgUtil.clsHide('loadOverlay_statusProgBar')
	},
	startDownload : () => {
		loaderLib.startTime = Date.now()
		fsgUtil.clsShow('loadOverlay_downloadCancel')
		fsgUtil.clsShow('loadOverlay_speed')
	},
	updateCount : (count, inMB = false) => {
		const thisCount   = inMB ? fsgUtil.bytesToMB(count, false) : count
		const thisElement = fsgUtil.byId('loadOverlay_statusCurrent')
		const thisProg    = fsgUtil.byId('loadOverlay_statusProgBarInner')
		const thisPercent = `${Math.ceil((count / loaderLib.lastTotal) * 100)}%` || '0%'
	
		if ( thisProg !== null ) { thisProg.style.width = thisPercent }
	
		if ( thisElement !== null ) { thisElement.innerHTML = thisCount }
	
		if ( inMB ) {
			const perDone    = Math.max(1, Math.ceil((count / loaderLib.lastTotal) * 100))
			const perRem     = 100 - perDone
			const elapsedSec = (Date.now() - loaderLib.startTime) / 1000
			const estSpeed   = fsgUtil.bytesToMBCalc(count, false) / elapsedSec // MB/sec
			const secRemain  = elapsedSec / perDone * perRem
	
			const prettyMinRemain = Math.floor(secRemain / 60)
			const prettySecRemain = secRemain % 60
	
			fsgUtil.setById('loadOverlay_speed_speed', `${estSpeed.toFixed(1)} MB/s`)
			fsgUtil.setById('loadOverlay_speed_time', `~ ${prettyMinRemain.toFixed(0).padStart(2, '0')}:${prettySecRemain.toFixed(0).padStart(2, '0')}`)
		}
	},
	updateText : (mainTitle, subTitle, dlCancel) => {
		fsgUtil.setById('loadOverlay_statusMessage', mainTitle)
		fsgUtil.setById('loadOverlay_statusDetail', subTitle)
		fsgUtil.setById('loadOverlay_statusTotal', '0')
		fsgUtil.setById('loadOverlay_statusCurrent', '0')
		fsgUtil.setById('loadOverlay_downloadCancelButton', dlCancel)
	
		fsgUtil.clsShow('loadOverlay_statusCount')
		fsgUtil.clsShow('loadOverlay_statusProgBar')
	
		fsgUtil.clsHide('loadOverlay_downloadCancel')
		fsgUtil.clsHide('loadOverlay_speed')
		
		loaderLib.show()
	},
	updateTotal : (count, inMB = false) => {
		if ( inMB ) { loaderLib.startTime = Date.now() }
		const thisCount   = inMB ? fsgUtil.bytesToMB(count) : count
		fsgUtil.setById('loadOverlay_statusTotal', thisCount)
		loaderLib.lastTotal = ( count < 1 ) ? 1 : count
	},
}

window.addEventListener('DOMContentLoaded', () => {
	loaderLib.overlay = new bootstrap.Modal('#loadOverlay', { backdrop : 'static', keyboard : false })
})

// Loader Overlay
window.loader.receive('formMain_loading_show',    () => { loaderLib.show() })
window.loader.receive('formMain_loading_hide',    () => { loaderLib.hide() })
window.loader.receive('fromMain_loadingDownload', () => { loaderLib.startDownload() })
window.loader.receive('fromMain_loadingNoCount',  () => { loaderLib.hideCount() })
window.loader.receive('formMain_loadingTitles',   (mainTitle, subTitle, dlCancel) => {
	loaderLib.updateText(mainTitle, subTitle, dlCancel)
})
window.loader.receive('fromMain_loading_total',   (count, inMB) => {
	loaderLib.updateTotal(count, inMB)
})
window.loader.receive('fromMain_loading_current', (count, inMB ) => {
	loaderLib.updateCount(count, inMB)
})
