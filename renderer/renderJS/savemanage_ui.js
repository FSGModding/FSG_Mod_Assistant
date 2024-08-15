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

	constructor() {
		MA.byIdEventIfExists('importButton', () => {})
		this.collectDialog = new bootstrap.Modal('#collect_savegame_modal', { backdrop : 'static', keyboard : false })
		this.deleteDialog  = new bootstrap.Modal('#delete_savegame_modal',  { backdrop : 'static', keyboard : false })
		this.importDialog  = new bootstrap.Modal('#import_savegame_modal',  { backdrop : 'static', keyboard : false })
		this.restoreDialog = new bootstrap.Modal('#restore_savegame_modal', { backdrop : 'static', keyboard : false })

		this.collectDialog.hide()
		this.deleteDialog.hide()
		this.importDialog.hide()
		this.restoreDialog.hide()

		window.savemanage_IPC.receive('savemanage:import', (savePath) => {
			MA.byIdText('save_import_path', savePath)
		})
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
			MA.byIdText('save_delete_name', uuidMap[uuid].name)
			MA.byIdText('save_delete_path', uuidMap[uuid].path)
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
			MA.byIdText('save_restore_name', uuidMap[uuid].name)
			MA.byIdText('save_restore_path', uuidMap[uuid].path)
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
			MA.byIdText('save_collect_name', uuidMap[uuid].name)
			MA.byIdText('save_collect_path', uuidMap[uuid].path)
			this.collectDialog.show()
		},
	}
	export = {
		btn : (uuid) => {
			window.savemanage_IPC.export(this.uuidMap[uuid].path)
		},
	}
}



window.mods.receive('fromMain_saveInfo', (modCollect) => {
	uuidMap    = {}
	const theseSaves = modCollect.opts.saveInfo

	const activeIDS      = Object.keys(theseSaves).filter((x) => typeof theseSaves[x].active === 'object' && theseSaves[x].active?.error === false)
	const backIDS        = Object.keys(theseSaves).filter((x) => Array.isArray(theseSaves[x].backups) && theseSaves[x].backups.length !== 0 )

	const activeGameHTML = []
	const backGameHTML   = []
	const compareHTML    = []

	for ( const collectKey of modCollect.set_Collections ) {
		if ( modCollect.appSettings.game_version === modCollect.collectionNotes[collectKey].notes_version ) {
			compareHTML.push(fsgUtil.buildSelectOpt(collectKey, modCollect.collectionToFullName[collectKey]))
		}
	}

	for ( const thisID of activeIDS ) {
		uuidMap[theseSaves[thisID].active.uuid] = {
			path : theseSaves[thisID].active.fullPath,
			name : theseSaves[thisID].active.fullName,
		}
		activeGameHTML.push(doSaveTemplate(thisID, theseSaves[thisID].active))
	}

	for ( const thisID of backIDS ) {
		theseSaves[thisID].backups.reverse()
		for ( const thisRecord of theseSaves[thisID].backups ) {
			uuidMap[thisRecord.uuid] = {
				path : thisRecord.fullPath,
				name : thisRecord.fullName,
			}
			backGameHTML.push(doSaveTemplate(thisID, thisRecord, 'savegame_backup_buttons'))
		}
	}

	fsgUtil.setContent({
		active_games        : activeGameHTML.join(''),
		backup_games        : backGameHTML.join(''),
		save_collect_choice : compareHTML.join(''),
	})
	processL10N()
})

function doSaveTemplate(thisID, saveRecord, buttonID = 'savegame_active_buttons') {
	return fsgUtil.useTemplate('savegame_record', {
		buttons      : fsgUtil.useTemplate(buttonID, {
			uuid         : saveRecord.uuid,
		}),
		farms        : doFarms(saveRecord.farms),
		saveDate     : saveRecord.saveDate,
		saveMap      : saveRecord.map,
		saveModCount : saveRecord.modCount,
		saveName     : saveRecord.name,
		saveNumber   : thisID,
		savePath     : saveRecord.fullPath,
		savePlayTime : saveRecord.playTime,
		saveRealDate : formatDate(saveRecord.fileDate),
	})
}

function formatDate(date) {
	return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

function doFarms(farms) {
	const returnHTML = [
		'<tr><td></td><td class="text-end"><l10n class="fst-italic" name="save_manage_money"></l10n></td><td class="text-end"><l10n class="fst-italic" name="save_manage_loan"></l10n></td></tr>'
	]

	for ( const thisFarm of farms ) {
		returnHTML.push(`
			<tr>
				<td><span class="farm_${thisFarm.color.toString().padStart(2, '0')}">${thisFarm.name}</span></td>
				<td class="text-end">${Intl.NumberFormat(_l(), {maximumFractionDigits : 0}).format(thisFarm.money)}</td>
				<td class="text-end">${Intl.NumberFormat(_l(), {maximumFractionDigits : 0}).format(thisFarm.loan)}</td>
			</tr>`
		)
	}
	return `<table class="table table-sm table-borderless table-striped">${returnHTML.join('')}</table>`
}


window.addEventListener('DOMContentLoaded', () => {
	window.state = new stateManager()
})