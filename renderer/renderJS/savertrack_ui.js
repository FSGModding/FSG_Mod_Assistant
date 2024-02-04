/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Detail window UI

/* global fsgUtil, processL10N */

window.mods.receive('fromMain_saveInfo', (modCollect) => {
	const saveInfo = modCollect.opts.saveInfo

	if ( saveInfo === null || !Array.isArray(saveInfo.current) || saveInfo.current.length === 0 ) {
		fsgUtil.clsShow('no_list_yet')
		return
	}

	const newHTML  = []

	fsgUtil.clsHide('no_list_yet')

	saveInfo.current.sort(Intl.Collator().compare)
	
	newHTML.push(fsgUtil.useTemplate('savetrack_current', {
		savegameID : saveInfo.saveID,
		modList    : saveInfo.current.map((x) => `<div class="col"><div class="border p-1">${x}</div></div>`).join(''),
	}))

	for ( const thisBack of saveInfo.byDate ) {
		thisBack.onlyBackup.sort(Intl.Collator().compare)
		thisBack.onlyOriginal.sort(Intl.Collator().compare)

		const dateParts = thisBack.date.split('_')

		newHTML.push(fsgUtil.useTemplate('savetrack_backup', {
			backupDate    : `${dateParts[0]} ${dateParts[1].replace(/-/, ':')}`,
			class_isDupe  : thisBack.duplicate ? '' : 'd-none',
			class_notDupe : thisBack.duplicate ? 'd-none' : '',
			onlyBackup    : thisBack.onlyBackup.map((x) => `<div class="col"><div class="border p-1">${x}</div></div>`).join(''),
			onlyCurrent   : thisBack.onlyOriginal.map((x) => `<div class="col"><div class="border p-1">${x}</div></div>`).join(''),
		}))
	}

	fsgUtil.setById('modList', newHTML)
	processL10N()
})

window.addEventListener('DOMContentLoaded', () => {
	processL10N()
})

