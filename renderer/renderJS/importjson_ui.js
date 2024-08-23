/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Import Collection window UI

/* global MA, DATA, bootstrap */

window.addEventListener('DOMContentLoaded', () => {
	window.state = new windowState()
})

// MARK: page state
class windowState {
	loader = null

	importJSON = null
	importKey  = null

	constructor() {
		this.loader = new LoaderLib()

		MA.byIdEventIfExists('loadOverlay_downloadCancelButton', () => { window.importjson_IPC.cancelDownload() })
		MA.byIdEventIfExists('setFolderButton', () => { window.importjson_IPC.setFolder() })
		MA.byIdEventIfExists('apply_button', () => { this.applyButton() })

		window.importjson_IPC.receive('loading:show',     () => { window.state.loader.show() })
		window.importjson_IPC.receive('loading:hide',     () => { window.state.loader.hide() })
		window.importjson_IPC.receive('loading:download', () => { window.state.loader.startDownload() })
		window.importjson_IPC.receive('loading:noCount',  () => { window.state.loader.hideCount() })
		window.importjson_IPC.receive('loading:titles',   (main, sub, cancel) => { window.state.loader.updateText(main, sub, cancel) })
		window.importjson_IPC.receive('loading:total',    (count, inMB) => { window.state.loader.updateTotal(count, inMB) })
		window.importjson_IPC.receive('loading:current',  (count, inMB) => { window.state.loader.updateCount(count, inMB) })

		window.importjson_IPC.receive('importjson:folder', (data) => { this.gotFolder(data) })
		window.importjson_IPC.receive('importjson:data', (data) => { this.gotJSON(data) })
	}

	applyButton() {
		window.importjson_IPC.setNote(this.importKey, 'notes_color', this.importJSON.collection_color.toString())
		window.importjson_IPC.setNote(this.importKey, 'notes_tagline', this.importJSON.collection_description)
		window.importjson_IPC.setNote(this.importKey, 'notes_version', this.importJSON.game_version)
		window.importjson_IPC.setNote(this.importKey, 'notes_server', this.importJSON.server_name)
		window.importjson_IPC.setNote(this.importKey, 'notes_fsg_bot', this.importJSON.server_id)
		window.importjson_IPC.setNote(this.importKey, 'notes_password', this.importJSON.server_password)
		window.importjson_IPC.setNote(this.importKey, 'notes_website', this.importJSON.server_website)
		window.importjson_IPC.setNote(this.importKey, 'notes_websiteDL', this.importJSON.server_downloads)
		window.importjson_IPC.setNote(this.importKey, 'notes_frozen', this.importJSON.force_frozen)
		MA.byId('apply_button').classList.remove('btn-primary')
		MA.byId('apply_button').classList.add('btn-success')
		window.importjson_IPC.doReload()
	}

	gotJSON(data) {
		this.importJSON = data.opts.thisImport
		MA.byIdHTML('notes_collection_color', DATA.makeFolderIcon(false, false, false, this.importJSON.collection_color ))
		MA.byIdHTML('notes_collection_description', this.getEmpty(this.importJSON.collection_description))
		MA.byIdHTML('notes_game_version',           this.getEmpty(this.importJSON.game_version))
		MA.byIdHTML('notes_server_name',            this.getEmpty(this.importJSON.server_name))
		MA.byIdHTML('notes_server_id',              this.getEmpty(this.importJSON.server_id))
		MA.byIdHTML('notes_server_password',        this.getEmpty(this.importJSON.server_password))
		MA.byIdHTML('notes_server_website',         this.getEmpty(this.importJSON.server_website))
		MA.byIdHTML('notes_server_downloads',       this.getBool(this.importJSON.server_downloads))
		MA.byIdHTML('notes_force_frozen',           this.getBool(this.importJSON.force_frozen))

		const packDL   = this.importJSON.download_unzip.map((x) => this.getButton(x, true) )
		const singleDL = this.importJSON.download_direct.map((x) => this.getButton(x, false) )
		MA.byIdNodeArray('import_mod_packs', packDL)
		MA.byIdNodeArray('import_mod_singles', singleDL)
	}

	gotFolder(data) {
		this.importKey = data.collectKey
		MA.byIdText('folder_location', data.folder)
		MA.byId('folder_location_empty').clsShow(data.contents === 0 )
		MA.byId('folder_location_not_empty').clsShow(data.contents !== 0 )
		MA.byId('apply_button').clsEnable()
		for ( const element of MA.query('.btn-download') ) {
			element.classList.remove('disabled')
		}
	}

	getEmpty(text)  {
		return text !== '' ? text : '<em><i18n-text data-key="import_json_not_set"></i18n-text</em>'
	}

	getBool(value) {
		return value ?
			'<i class="text-success bi bi-check2-circle"></i><i18n-text data=key="import_json_yes"></i18n-text>':
			'<i class="text-danger bi bi-x-circle"></i><i18n-text data=key="import_json_no"></i18n-text>'
	}

	getButton(uri, isPack = true) {
		const node = document.createElement('div')

		node.classList.add('w-75', 'd-block', 'mx-auto', 'btn', 'btn-primary', 'btn-sm', 'disabled', 'btn-download', 'mb-2')
		node.innerHTML = `<i18n-text data-key="import_json_step_2_download${isPack ? '_unpack' : ''}"></i18n-text> :: ${uri}`
		node.addEventListener('click', () => {
			node.classList.remove('btn-primary')
			node.classList.add('btn-success', 'disabled')
			window.importjson_IPC.doDownload(this.importKey, uri, isPack)
		})

		return node
	}

}

// MARK: LoaderLib
class LoaderLib {
	overlay = null

	lastTotal = 1
	startTime = Date.now()

	constructor() {
		this.overlay = new bootstrap.Modal('#loadOverlay', { backdrop : 'static', keyboard : false })
	}

	hide() { this.overlay?.hide() }
	show() { this.overlay?.show() }

	hideCount() {
		MA.byId('loadOverlay_statusCount').clsHide()
		MA.byId('loadOverlay_statusProgBar').clsHide()
	}
	startDownload() {
		this.startTime = Date.now()
		MA.byId('loadOverlay_downloadCancel').clsShow()
		MA.byId('loadOverlay_speed').clsShow()
	}
	async updateCount(count, inMB = false) {
		const thisCount   = inMB ? await DATA.bytesToMB(count, false) : count
		const thisElement = MA.byId('loadOverlay_statusCurrent')
		const thisProg    = MA.byId('loadOverlay_statusProgBarInner')
		const thisPercent = `${Math.max(Math.ceil((count / this.lastTotal) * 100), 0)}%`
	
		if ( thisProg !== null ) { thisProg.style.width = thisPercent }
	
		if ( thisElement !== null ) { thisElement.innerHTML = thisCount }
	
		if ( inMB ) {
			const perDone    = Math.max(1, Math.ceil((count / this.lastTotal) * 100))
			const perRem     = 100 - perDone
			const elapsedSec = (Date.now() - this.startTime) / 1000
			const estSpeed   = await DATA.bytesToMBCalc(count, false) / elapsedSec // MB/sec
			const secRemain  = elapsedSec / perDone * perRem
	
			const prettyMinRemain = Math.floor(secRemain / 60)
			const prettySecRemain = secRemain % 60
	
			MA.byIdText('loadOverlay_speed_speed', `${estSpeed.toFixed(1)} MB/s`)
			MA.byIdText('loadOverlay_speed_time', `~ ${prettyMinRemain.toFixed(0).padStart(2, '0')}:${prettySecRemain.toFixed(0).padStart(2, '0')}`)
		}
	}
	updateText(mainTitle, subTitle, dlCancel) {
		MA.byIdHTML('loadOverlay_statusMessage', mainTitle)
		MA.byIdHTML('loadOverlay_statusDetail', subTitle)
		MA.byIdText('loadOverlay_statusTotal', '0')
		MA.byIdText('loadOverlay_statusCurrent', '0')
		MA.byIdHTML('loadOverlay_downloadCancelButton', dlCancel)
	
		MA.byId('loadOverlay_statusCount').clsShow()
		MA.byId('loadOverlay_statusProgBar').clsShow()
	
		MA.byId('loadOverlay_downloadCancel').clsHide()
		MA.byId('loadOverlay_speed').clsHide()
		
		this.show()
	}
	async updateTotal(count, inMB = false) {
		if ( inMB ) { this.startTime = Date.now() }
		const thisCount   = inMB ? await DATA.bytesToMB(count) : count
		MA.byIdText('loadOverlay_statusTotal', thisCount)
		this.lastTotal = ( count < 1 ) ? 1 : count
	}
}