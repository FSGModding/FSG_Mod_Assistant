/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Detail window UI

/* global fsgUtil, processL10N */

window.mods.receive('fromMain_saveInfo', (modCollect) => {
	const saveInfo = modCollect.opts.saveInfo

	if ( saveInfo === null || typeof saveInfo.current === 'undefined' || saveInfo.current.length === 0 ) {
		fsgUtil.byId('no_list_yet').classList.remove('d-none')
		return
	}

	const newHTML  = []

	fsgUtil.byId('no_list_yet').classList.add('d-none')

	saveInfo.current.sort(Intl.Collator().compare)
	
	newHTML.push(fsgUtil.useTemplate('savetrack_current', {
		savegameID : saveInfo.saveID,
		modList    : saveInfo.current.map((x) => `<div class="col border p-2">${x}</div>`).join(''),
	}))

	for ( const thisBack of saveInfo.byDate ) {
		thisBack.onlyBackup.sort(Intl.Collator().compare)
		thisBack.onlyOriginal.sort(Intl.Collator().compare)

		const dateParts = thisBack.date.split('_')

		newHTML.push(fsgUtil.useTemplate('savetrack_backup', {
			backupDate    : `${dateParts[0]} ${dateParts[1].replace(/-/, ':')}`,
			class_isDupe  : thisBack.duplicate ? '' : 'd-none',
			class_notDupe : thisBack.duplicate ? 'd-none' : '',
			onlyBackup    : thisBack.onlyBackup.map((x) => `<div class="col border p-2">${x}</div>`).join(''),
			onlyCurrent   : thisBack.onlyOriginal.map((x) => `<div class="col border p-2">${x}</div>`).join(''),
		}))
	}

	fsgUtil.byId('modList').innerHTML = newHTML.join('')
	processL10N()
})

window.addEventListener('DOMContentLoaded', () => {
	processL10N()
})

