/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Save Manage window UI

/* global fsgUtil, processL10N, bootstrap */

let lastLocale = 'en'
let uuidMap    = {}

window.mods.receive('fromMain_saveInfo', (modCollect) => {
	lastLocale = modCollect.currentLocale
	uuidMap    = {}
	const theseSaves = modCollect.opts.saveInfo

	const activeIDS      = Object.keys(theseSaves).filter((x) => theseSaves[x].active !== false)
	const backIDS        = Object.keys(theseSaves).filter((x) => theseSaves[x].backups.length !== 0 )

	const activeGameHTML = []
	const backGameHTML   = []

	for ( const thisID of activeIDS ) {
		uuidMap[theseSaves[thisID].active.uuid] = {
			path : theseSaves[thisID].active.fullPath,
			name : theseSaves[thisID].active.fullName,
		}
		activeGameHTML.push(doSaveTemplate(thisID, theseSaves[thisID].active))
	}

	for ( const thisID of backIDS ) {
		for ( const thisRecord of theseSaves[thisID].backups ) {
			uuidMap[thisRecord.uuid] = {
				path : thisRecord.fullPath,
				name : thisRecord.fullName,
			}
			backGameHTML.push(doSaveTemplate(thisID, thisRecord, 'savegame_backup_buttons'))
		}
	}

	fsgUtil.byId('active_games').innerHTML = activeGameHTML.join('')
	fsgUtil.byId('backup_games').innerHTML = backGameHTML.join('')
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
				<td class="text-end">${Intl.NumberFormat(lastLocale, {maximumFractionDigits : 0}).format(thisFarm.money)}</td>
				<td class="text-end">${Intl.NumberFormat(lastLocale, {maximumFractionDigits : 0}).format(thisFarm.loan)}</td>
			</tr>`
		)
	}
	return `<table class="table table-sm table-borderless">${returnHTML.join('')}</table>`
}

let deleteDialog  = null
let restoreDialog = null
let collectDialog = null

window.addEventListener('DOMContentLoaded', () => {
	deleteDialog = new bootstrap.Modal(document.getElementById('delete_savegame_modal'), {backdrop : 'static', keyboard : false})
	deleteDialog.hide()
	restoreDialog = new bootstrap.Modal(document.getElementById('restore_savegame_modal'), {backdrop : 'static', keyboard : false})
	restoreDialog.hide()
	collectDialog = new bootstrap.Modal(document.getElementById('collect_savegame_modal'), {backdrop : 'static', keyboard : false})
	collectDialog.show()
})
