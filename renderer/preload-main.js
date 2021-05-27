//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Mod File Parser - Electron Preload
//  (IPC and UI triggers that interact with the browser process)

// (c) 2021 JTSage.  MIT License.

const {contextBridge, ipcRenderer} = require('electron')

const iconGreenCheckMark = '<span class="text-success"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-circle" viewBox="0 0 16 16">'+
	'<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>' +
	'<path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>' +
	'</svg></span>'
const iconRedX = '<span class="text-danger"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-circle" viewBox="0 0 16 16">' +
	'<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>' +
	'<path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>' +
	'</svg></span>'

let dataIsLoaded = false

const byId     = (domID) => { return document.getElementById(domID) }
const classAdd = (domID, className) => {
	/* Add a class <className> to <domID> */
	const domIDs =  ( typeof domID === 'string' )  ? [domID] : domID
		
	domIDs.forEach( (thisDomID) => {
		document.getElementById(thisDomID).classList.add(className)
	})
}
const classRem = (domID, className) => {
	/* Remove a class <className> from <domID> */
	const domIDs  = ( typeof domID === 'string' ) ? [domID] : domID
		
	domIDs.forEach( (thisDomID) => {
		document.getElementById(thisDomID).classList.remove(className)
	})
}

const buildOpt = (value, text, selected) => {
	/* Build an option for a select box */
	return `<option value="${value}" ${( value === selected ) ? 'selected' : ''}>${text}</option>`
}

const buildTableRow = (columnValues, colNames = []) => {
	/* Build a table row for display */
	let thisRow = ''

	for ( let i = 0; i < columnValues.length; i++ ) {
		let sort = null
		let text = null
		let cssClass = ''

		if ( colNames.length > 0 ) { cssClass = colNames[i] }
		switch (typeof columnValues[i]) {
		
			case 'string' :
				sort = columnValues[i].toString().toLowerCase()
				text = columnValues[i]
				break
			case 'boolean' :
				sort = ( columnValues[i] ? 1 : 0 )
				text = ( columnValues[i] ? iconGreenCheckMark : iconRedX )
				break
			default : // Object or Array
				sort = columnValues[i][1]
				text = columnValues[i][0]
				break
		}

		thisRow += `<td class="${cssClass}" data-sort="${sort}">${text}</td>`
	}
	return  `<tr>${thisRow}</tr>`
}

const buildBrokenList = (name, path, bullets, copyName) => {
	/* Build the broken list (multi level UL) */
	const onlyFolderClass = ( bullets.length === 1 && bullets[0] === 'INFO_NO_MULTIPLAYER_UNZIPPED' ) ? 'just-folder-error' : ''

	let thisListItem = '' +
		`<li data-path="${path}" class="${onlyFolderClass} mod-record list-group-item list-group-item-action d-flex justify-content-between align-items-start">` +
		'<div class="ms-2 me-auto">' +
		`<div><strong>${name}</strong> <em class="small">${path}</em></div>` +
		'<ul style="list-style-type: disc">'

	if ( copyName !== null ) {
		const existence = ( copyName[1] ) ? 'file_error_copy_exists' : 'file_error_copy_missing'
		const identCopy = ( copyName[2] ) ? '<span class="i18n" data-i18n="file_error_copy_identical"></span>' : ''
		thisListItem += `<li class="mt-2"><span class="i18n" data-i18n="file_error_copy_name"></span> <span class="fst-italic fw-bold">${copyName[0]}</span>.`
		thisListItem += ` <span class="i18n" data-i18n="${existence}"></span> ${identCopy}`
		thisListItem += '</li>'
	}

	bullets.forEach((thisBullet) => {
		thisListItem += `<li class="mt-2 i18n" data-i18n="${thisBullet}"></li>`
	})
	
	return thisListItem += '</ul></div></li>'
}

const buildConflictList = (name, title, message, path) => {
	/* Build the conflict list (multi level UL) */
	
	return '' +
		`<li data-path="${path}" class="mod-record list-group-item list-group-item-action d-flex justify-content-between align-items-start">` +
		`<div class="ms-2 me-auto"><div><strong>${name}</strong> <em class="small">${title}</em></div>` +
		`<ul style="list-style: disc"><li class="mt-2">${message}</li></ul></div></li>`
}




/*
  _____  _____  _______   _______  ______ _______ __   _ _______        _______ _______ _______
    |   |_____] |       .    |    |_____/ |_____| | \  | |______ |      |_____|    |    |______
  __|__ |       |_____  .    |    |    \_ |     | |  \_| ______| |_____ |     |    |    |______
                                                                                               
*/
ipcRenderer.on('trigger-i18n-select', (event, langList, locale) => {
	/* Load language options into language pick list */
	const newOpts = langList.map((x) => { return buildOpt(x[0], x[1], locale) })

	byId('language_select').innerHTML = newOpts.join('')
})

ipcRenderer.on('trigger-i18n-on-data', () => {
	if ( dataIsLoaded ) {
		ipcRenderer.send('askBrokenList')
		ipcRenderer.send('askMissingList')
		ipcRenderer.send('askConflictList')
		ipcRenderer.send('askExploreList', 0)
		ipcRenderer.send('askGamesActive')
	}
})

ipcRenderer.on('trigger-i18n', () => {
	/* Get all i18n items in the UI and translate them */
	const sendSet = new Set()
	for (const item of document.getElementsByClassName('i18n')) {
		sendSet.add(item.getAttribute('data-i18n'))
	}
	sendSet.forEach( (thisStringID ) => {
		ipcRenderer.send('i18n-translate', thisStringID)
	})
})

ipcRenderer.on('i18n-translate-return', (event, dataPoint, newText) => {
	/* Receive the translated text of an i18n item, update it everywhere it appears */
	const changeThese = document.querySelectorAll(`[data-i18n='${dataPoint}']`)
	changeThese.forEach((changeThis) => {
		changeThis.innerHTML = newText
	})
})




/*
  _____  _____  _______   _______  _____  __   _ _______ _____  ______
    |   |_____] |       . |       |     | | \  | |______   |   |  ____
  __|__ |       |_____  . |_____  |_____| |  \_| |       __|__ |_____|
                                                                      
*/
ipcRenderer.on('newFileConfig', (event, arg) => {
	/* Get notification of loading a new config file */
	if ( arg.error ) {
		classRem('load_error', 'd-none')
	} else {
		classAdd('load_error', 'd-none')
	}
	
	if ( arg.valid ) {
		classRem('button_process', 'disabled')
	} else {
		classAdd('button_process', 'disabled')
	}
		
	byId('location_savegame_folder').innerHTML = arg.saveDir
	byId('location_mod_folder').innerHTML      = arg.modDir

	classAdd(['process_bar_working', 'process_bar_done'], 'd-none')
	byId('button_process').focus()
})


/*
  _____  _____  _______    _____   ______  _____  _______ _______ _______ _______
    |   |_____] |       . |_____] |_____/ |     | |       |______ |______ |______
  __|__ |       |_____  . |       |    \_ |_____| |_____  |______ ______| ______|
                                                                                 
*/
ipcRenderer.on('processModsDone', () => {
	classAdd('process_bar_working', 'd-none')
	classRem('process_bar_done', 'd-none')
	classRem(['button_process', 'button_load'], 'disabled')
	
	// Fuzzy logic.  Used to request reload of display data when changing l10n setting.
	dataIsLoaded = true

	ipcRenderer.send('askBrokenList')
	ipcRenderer.send('askMissingList')
	ipcRenderer.send('askConflictList')
	ipcRenderer.send('askExploreList', 0)
	ipcRenderer.send('askGamesActive')
})



/*
  _____  _____  _______   ______   ______  _____  _     _ _______ __   _
    |   |_____] |       . |_____] |_____/ |     | |____/  |______ | \  |
  __|__ |       |_____  . |_____] |    \_ |_____| |    \_ |______ |  \_|
                                                                        
*/
ipcRenderer.on('gotBrokenList', (event, list) => {
	const newContent = list.map((x) => { return buildBrokenList(...x) })
	byId('broken_list').innerHTML = newContent.join('')

	const sendSet = new Set()
	for (const item of byId('broken_list').getElementsByClassName('i18n')) {
		sendSet.add(item.getAttribute('data-i18n'))
	}
	sendSet.forEach( (thisStringID ) => {
		ipcRenderer.send('i18n-translate', thisStringID)
	})
})



/*
  _____  _____  _______   _______  _____  __   _ _______        _____ _______ _______ _______
    |   |_____] |       . |       |     | | \  | |______ |        |   |          |    |______
  __|__ |       |_____  . |_____  |_____| |  \_| |       |_____ __|__ |_____     |    ______|
                                                                                             
*/
ipcRenderer.on('gotConflictList', (event, list) => {
	const newContent = list.map((x) => { return buildConflictList(...x) })
	byId('conflict_list').innerHTML = newContent.join('')
})



/*
  _____  _____  _______   _______ _____ _______ _______ _____ __   _  ______
    |   |_____] |       . |  |  |   |   |______ |______   |   | \  | |  ____
  __|__ |       |_____  . |  |  | __|__ ______| ______| __|__ |  \_| |_____|
                                                                            
*/
ipcRenderer.on('gotMissingList', (event, list) => {
	const newContent = list.map((x) => { return buildTableRow(x) })
	
	byId('table_missing').innerHTML = newContent.join('')
})


/*
  _____  _____  _______   _______ _     _  _____          _____   ______ _______
    |   |_____] |       . |______  \___/  |_____] |      |     | |_____/ |______
  __|__ |       |_____  . |______ _/   \_ |       |_____ |_____| |    \_ |______
                                                                                
*/
ipcRenderer.on('gotExploreList', (event, list) => {
	const colNames = [
		'col_mod_name',
		'col_mod_title',
		'col_mod_version',
		'col_mod_size',
		'col_mod_is_active',
		'col_mod_active_games',
		'col_mod_is_used',
		'col_mod_used_games',
		'col_mod_full_path',
		'col_mod_has_scripts'
	]

	const newContent = list.map((x) => { return buildTableRow(x, colNames) })

	byId('table_explore').innerHTML = newContent.join('')

	byId('col_mod_name_switch').dispatchEvent(new Event('change'))
})




/*
  _____  _____  _______   _______ _______ _______ _____ _    _ _______
    |   |_____] |       . |_____| |          |      |    \  /  |______
  __|__ |       |_____  . |     | |_____     |    __|__   \/   |______
                                                                      
*/
ipcRenderer.on('gotGamesActive', (event, list, saveGameText, allText) => {
	/* Change explore list based on save game filter */
	let newOptions = buildOpt(0, allText, 0)

	list.forEach((thisGame) => {
		newOptions += buildOpt(thisGame, saveGameText + thisGame, 0)
	})

	byId('savegame_select').innerHTML = newOptions

	const sendSet = new Set()
	for (const item of byId('savegame_select').getElementsByClassName('i18n')) {
		sendSet.add(item.getAttribute('data-i18n'))
	}
	sendSet.forEach( (thisStringID ) => {
		ipcRenderer.send('i18n-translate', thisStringID)
	})
})





/*
  _______ _     _  _____   _____  _______ _______ ______       _______  _____  _____
  |______  \___/  |_____] |     | |______ |______ |     \      |_____| |_____]   |  
  |______ _/   \_ |       |_____| ______| |______ |_____/      |     | |       __|__
                                                                                    
Functions that are exposed to the UI renderer process
*/
contextBridge.exposeInMainWorld(
	'ipc',
	{
		changeLangList : () => {
			ipcRenderer.send('i18n-change-locale', byId('language_select').value)
		},
		loadButton : () => {
			ipcRenderer.send('openConfigFile')
			dataIsLoaded = false
		},
		processButton : () => {
			ipcRenderer.send('processMods')
			classAdd(['button_process', 'button_load'], 'disabled')
			classAdd('process_bar_done', 'd-none')
			classRem('process_bar_working', 'd-none')
		},
		changeExplore : () => {
			ipcRenderer.send('askExploreList', byId('savegame_select').value)
		},
		changeExploreActiveUnused : () => {
			ipcRenderer.send('askExploreList', 0, -1)
		},
		changeExploreInActive : () => {
			ipcRenderer.send('askExploreList', -1)
		},
		changeExploreScripts : () => {
			ipcRenderer.send('askExploreList', 0, 0, 'hasScripts')
			byId('col_mod_has_scripts_switch').checked = true
		},
	}
)



/*
  _______ _______ __   _ _     _ _______
  |  |  | |______ | \  | |     | |______
  |  |  | |______ |  \_| |_____| ______|
                                        
Listeners on the renderer that need privileged execution (ipc usually)
*/

window.addEventListener('DOMContentLoaded', () => {
	const table_handler = (e, domID) => {
		e.preventDefault()
		
		if ( e.target.matches('td') ) {
			const theseHeaders = Array.from(
				byId(domID).parentNode.firstElementChild.querySelectorAll('th.i18n'),
				(th) => [th.innerText, th.getAttribute('data-i18n')]
			)
			const theseValues = Array.from(
				e.target.parentNode.childNodes,
				(td) => td.innerText
			)
			ipcRenderer.send('show-context-menu-table', theseHeaders, theseValues)
		}
	}
	const table_dblclick = (e) => {
		e.preventDefault()
		
		if ( e.target.matches('td') ) {
			const thisMod = e.target.parentNode.childNodes[0].innerText
			ipcRenderer.send('show-mod-detail', thisMod)
		}
	}
	const list_handler = (e) => {
		e.preventDefault()

		const closestEntry = e.target.closest('.mod-record')
		
		if ( closestEntry !== null ) {
			ipcRenderer.send('show-context-menu-list', closestEntry.getAttribute('data-path'))
		}
	}

	byId('broken_list').addEventListener('contextmenu', (e) => { list_handler(e) })
	byId('conflict_list').addEventListener('contextmenu', (e) => {list_handler(e) })

	byId('table_missing_parent').addEventListener('dblclick', (e) => { table_dblclick(e) })
	byId('table_explore_parent').addEventListener('dblclick', (e) => { table_dblclick(e) })

	byId('table_missing_parent').addEventListener('contextmenu', (e) => { table_handler(e, 'table_missing') })
	byId('table_explore_parent').addEventListener('contextmenu', (e) => { table_handler(e, 'table_explore') })
})