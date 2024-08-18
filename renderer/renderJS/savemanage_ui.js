/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Save Manage window UI

/* global MA, DATA, bootstrap */

class stateManager {
	collectDialog = null
	deleteDialog  = null
	importDialog  = null
	restoreDialog = null

	uuidMap = {}
	langCode = 'en'

	constructor() {
		MA.byIdEventIfExists('compare_save_btn',     () => { this.compare.go() })
		MA.byIdEventIfExists('delete_save_btn',      () => { this.delete.go() })
		MA.byIdEventIfExists('import_save_btn',      () => { this.import.go() })
		MA.byIdEventIfExists('import_save_load_btn', () => { this.import.load() })
		MA.byIdEventIfExists('importButton',         () => { this.import.open() })
		MA.byIdEventIfExists('restore_save_btn',     () => { this.restore.go() })

		this.collectDialog = new bootstrap.Modal('#collect_savegame_modal', { backdrop : 'static', keyboard : false })
		this.deleteDialog  = new bootstrap.Modal('#delete_savegame_modal',  { backdrop : 'static', keyboard : false })
		this.importDialog  = new bootstrap.Modal('#import_savegame_modal',  { backdrop : 'static', keyboard : false })
		this.restoreDialog = new bootstrap.Modal('#restore_savegame_modal', { backdrop : 'static', keyboard : false })

		this.collectDialog.hide()
		this.deleteDialog.hide()
		this.importDialog.hide()
		this.restoreDialog.hide()

		window.savemanage_IPC.receive('savemanage:info', (modCollect) => {
			this.processData(modCollect)
		})
		window.savemanage_IPC.receive('savemanage:import', (savePath) => {
			MA.byIdText('save_import_path', savePath)
		})
	}

	async processData(data) {
		await this.updateLang()

		this.uuidMap    = {}
		const theseSaves = data.opts.saveInfo

		const activeIDS      = Object.keys(theseSaves).filter((x) => typeof theseSaves[x].active === 'object' && theseSaves[x].active?.error === false)
		const backIDS        = Object.keys(theseSaves).filter((x) => Array.isArray(theseSaves[x].backups) && theseSaves[x].backups.length !== 0 )

		const activeGameHTML = []
		const backGameHTML   = []
		const compareHTML    = []

		for ( const collectKey of data.set_Collections ) {
			if ( data.appSettings.game_version === data.collectionNotes[collectKey].notes_version ) {
				compareHTML.push(DATA.optionFromArray([collectKey, data.collectionToFullName[collectKey]]))
			}
		}

		for ( const thisID of activeIDS ) {
			this.uuidMap[theseSaves[thisID].active.uuid] = {
				path : theseSaves[thisID].active.fullPath,
				name : theseSaves[thisID].active.fullName,
			}
			activeGameHTML.push(this.doTemplate(thisID, theseSaves[thisID].active))
		}

		for ( const thisID of backIDS ) {
			theseSaves[thisID].backups.reverse()
			for ( const thisRecord of theseSaves[thisID].backups ) {
				this.uuidMap[thisRecord.uuid] = {
					path : thisRecord.fullPath,
					name : thisRecord.fullName,
				}
				backGameHTML.push(this.doTemplate(thisID, thisRecord, 'savegame_backup_buttons'))
			}
		}

		MA.byIdHTML('save_collect_choice', compareHTML.join(''))
		MA.byIdNodeArray('active_games', activeGameHTML)
		MA.byIdNodeArray('backup_games', backGameHTML)
	}

	async updateLang() {
		return window.i18n.lang().then((value) => {
			this.langCode = value
		})
	}

	doTemplate(id, record, buttonID = 'savegame_active_buttons') {
		const buttonNode = DATA.templateEngine(buttonID)

		buttonNode.querySelector('.do-compare-save-btn').addEventListener('click', () => {
			this.compare.btn(record.uuid)
		})
		buttonNode.querySelector('.do-export-save-btn').addEventListener('click', () => {
			this.export.btn(record.uuid)
		})
		buttonNode.querySelector('.do-restore-save-btn').addEventListener('click', () => {
			this.restore.btn(record.uuid)
		})
		buttonNode.querySelector('.do-delete-save-btn').addEventListener('click', () => {
			this.delete.btn(record.uuid)
		})
		const node = DATA.templateEngine('savegame_record', {
			farms        : this.doFarms(record.farms),
			saveDate     : record.saveDate,
			saveMap      : record.map,
			saveModCount : record.modCount,
			saveName     : record.name,
			saveNumber   : id,
			savePath     : record.fullPath,
			savePlayTime : record.playTime,
			saveRealDate : this.doDate(record.fileDate),
		})

		node.querySelector('.buttonDiv').appendChild(buttonNode)
		return node
	}

	doDate(date) {
		return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
	}
	
	doFarms(farms) {
		const returnHTML = [
			'<tr><td></td><td class="text-end"><i18n-text class="fst-italic" data-key="save_manage_money"></i18n-text></td><td class="text-end"><i18n-text class="fst-italic" data-key="save_manage_loan"></i18n-text></td></tr>'
		]

		for ( const thisFarm of farms ) {
			returnHTML.push(`
				<tr>
					<td><span class="farm_${thisFarm.color.toString().padStart(2, '0')}">${thisFarm.name}</span></td>
					<td class="text-end">${Intl.NumberFormat(this.langCode, {maximumFractionDigits : 0}).format(thisFarm.money)}</td>
					<td class="text-end">${Intl.NumberFormat(this.langCode, {maximumFractionDigits : 0}).format(thisFarm.loan)}</td>
				</tr>`
			)
		}
		return `<table class="table table-sm table-borderless table-striped">${returnHTML.join('')}</table>`
	}

	import = {
		open : () => { this.importDialog.show() },
		load : () => { window.savemanage_IPC.importLoad() },
		go   : () => {
			const destSlot = MA.byIdValue('save_import_choice')
			const srcFile  = MA.byIdText('save_import_path')
			if ( destSlot !== '--' && srcFile !== '' ) {
				window.savemanage_IPC.import(srcFile, destSlot)
				this.importDialog.hide()
			}
		},
	}
	delete = {
		go : () => {
			window.savemanage_IPC.delete(MA.byIdText('save_delete_path'))
			this.deleteDialog.hide()
		},
		btn : (uuid) => {
			MA.byIdText('save_delete_name', this.uuidMap[uuid].name)
			MA.byIdText('save_delete_path', this.uuidMap[uuid].path)
			this.deleteDialog.show()
		},
	}
	restore = {
		go : () => {
			const destSlot = MA.byIdValue('save_restore_choice')
			if ( destSlot !== '--') {
				window.savemanage_IPC.restore(MA.byIdText('save_restore_path'), destSlot)
				this.restoreDialog.hide()
			}
		},
		btn : (uuid) => {
			MA.byIdText('save_restore_name', this.uuidMap[uuid].name)
			MA.byIdText('save_restore_path', this.uuidMap[uuid].path)
			this.restoreDialog.show()
		},
	}
	compare = {
		go : () => {
			const collectKey = MA.byIdValue('save_collect_choice')
			if ( collectKey !== '--') {
				window.savemanage_IPC.compare(MA.byIdText('save_collect_path'), collectKey)
				this.collectDialog.hide()
			}
		},
		btn : (uuid) => {
			MA.byIdText('save_collect_name', this.uuidMap[uuid].name)
			MA.byIdText('save_collect_path', this.uuidMap[uuid].path)
			this.collectDialog.show()
		},
	}
	export = {
		btn : (uuid) => {
			window.savemanage_IPC.export(this.uuidMap[uuid].path)
		},
	}
}

window.addEventListener('DOMContentLoaded', () => {
	window.state = new stateManager()
})