/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Detail window UI

/* global MA, DATA */

window.savetrack_IPC.receive('savetrack:results', (modCollect) => {
	const saveInfo = modCollect.opts.saveInfo

	if ( saveInfo === null || !Array.isArray(saveInfo.current) || saveInfo.current.length === 0 ) {
		MA.byId('no_list_yet').clsShow()
		return
	}

	const newHTML  = []

	MA.byId('no_list_yet').clsHide()

	saveInfo.current.sort(Intl.Collator().compare)
	
	newHTML.push(DATA.templateEngine('savetrack_current', {
		savegameID : saveInfo.saveID,
		modList    : saveInfo.current.map((x) => `<div class="col"><div class="border p-1">${x}</div></div>`).join(''),
	}))

	for ( const thisBack of saveInfo.byDate ) {
		thisBack.onlyBackup.sort(Intl.Collator().compare)
		thisBack.onlyOriginal.sort(Intl.Collator().compare)

		const dateParts = thisBack.date.split('_')

		const node = DATA.templateEngine('savetrack_backup', {
			backupDate    : `${dateParts[0]} ${dateParts[1].replace(/-/, ':')}`,
			onlyBackup    : thisBack.onlyBackup.map((x) => `<div class="col"><div class="border p-1">${x}</div></div>`).join(''),
			onlyCurrent   : thisBack.onlyOriginal.map((x) => `<div class="col"><div class="border p-1">${x}</div></div>`).join(''),
		})

		node.querySelector('.is_duplicate').clsShow(thisBack.duplicate)
		node.querySelector('.is_not_duplicate').clsHide(thisBack.duplicate)

		newHTML.push(node)
	}

	MA.byIdNodeArray('modList', newHTML)
})

window.addEventListener('DOMContentLoaded', () => {
	MA.byIdEventIfExists('openFolderButton', () => { window.savetrack_IPC.openFolder() })
})

