//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Mod File Parser - Electron Preload
//  (IPC and UI triggers that interact with the browser process)

// (c) 2021 JTSage.  MIT License.

const {contextBridge, ipcRenderer} = require('electron')

const iconGreenCheckMark = "<span class=\"text-success\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-check-circle\" viewBox=\"0 0 16 16\">"+
	"<path d=\"M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z\"/>" +
	"<path d=\"M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z\"/>" +
	"</svg></span>"
const iconRedX = "<span class=\"text-danger\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-x-circle\" viewBox=\"0 0 16 16\">" + 
	"<path d=\"M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z\"/>" + 
	"<path d=\"M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z\"/>" +
	"</svg></span>"

const byId     = (domID) => { return document.getElementById(domID) }
const classAdd = (domID, className) => { 
	/* Add a class <className> to <domID> */
	const domIDs =  ( typeof domID === "string" )  ? [domID] : domID
		
	domIDs.forEach((thisDomID) => { 
		document.getElementById(thisDomID).classList.add(className)
	} )
}
const classRem = (domID, className) => {
	/* Remove a class <className> from <domID> */
	const domIDs  = ( typeof domID === "string" ) ? [domID] : domID
		
	domIDs.forEach((thisDomID) => { 
		document.getElementById(thisDomID).classList.remove(className)
	} )
}

const buildOpt = (value, text, selected) => {
	/* Build an option for a select box */
	return `<option value=\"${value}"\"" ${( value == selected ) ? "selected" : ""}>${text}</option>`
}

const buildTableRow = (columnValues, colNames = []) => {
	/* Build a table row for display */
	let thisRow = "<tr>"

	for ( let i = 0; i < columnValues.length; i++ ) {
		let sort = ""
		let text = ""
		let cssClass = ""

		if ( colNames.length > 0 ) { cssClass = colNames[i] }
		switch (typeof columnValues[i]) {
			case "string" :
				sort = columnValues[i].toString().toLowerCase()
				text = columnValues[i]
				break
			case "boolean" :
				sort = ( columnValues[i] ? 1 : 0 )
				text = ( columnValues[i] ? iconGreenCheckMark : iconRedX )
				break
			default : // Object or Array
				sort = columnValues[i][1]
				text = columnValues[i][0]
				break
		}

		thisRow += `<td class=\"${cssClass}\" data-sort=\"${sort}\">${text}</td>`
	}
	return thisRow + "</tr>"
}

const buildBrokenList = (name, path, bullets, copyName) => {
	/* Build the broken list (multi level UL) */
	let safeID = name.replace(/\W/g, "-")
	let thisListItem = "" +
		`<li id=\"broken_${safeID}\" data-path=\"${path}\" class=\"mod-record list-group-item d-flex justify-content-between align-items-start\">` +
		"<div class=\"ms-2 me-auto\">" +
		`<div><span class=\"fw-bold\">${name}</span> <span class=\"small fst-italic\">${path}</span></div>` +
		"<ul style=\"list-style: disc\">"

	if ( copyName !== null ) {
		const existence = ( copyName[1] ) ? "file_error_copy_exists" : "file_error_copy_missing"
		thisListItem += `<li><span class=\"i18n\" data-i18n=\"file_error_copy_name\"></span> <span class=\"fst-italic fw-bold\">${copyName[0]}</span>.`
		thisListItem += ` <span class=\"i18n\" data-i18n=\"${existence}\"></span>`
		thisListItem += (copyName[2]) ? " <span class=\"i18n\" data-i18n=\"file_error_copy_identical\"></span>" : ""
		thisListItem += "</li>"
	}

	bullets.forEach((thisBullet) => {
		thisListItem += `<li class=\"i18n\" data-i18n=\"${thisBullet}\"></li>`
	})
	
	return thisListItem += "</ul></div></li>"
}


ipcRenderer.on('trigger-i18n-select', (event, langList, locale) => {
	/* Load language options into language pick list */
	// TODO: Figure out how to pull a sane default language
	const newOpts = langList.map((x) => { return buildOpt(x[0], x[1], locale) })

	byId("language_select").innerHTML = newOpts.join("")
})

ipcRenderer.on('trigger-i18n', () => {
	/* Get all i18n items in the UI and translate them */
	let sendSet = new Set()
	for (const item of document.getElementsByClassName("i18n")) {
		sendSet.add(item.getAttribute('data-i18n'))
	}
	sendSet.forEach( (thisStringID ) => {
		ipcRenderer.send('i18n-translate', thisStringID)
	})
})

ipcRenderer.on('i18n-translate-return', (event, dataPoint, newText) => {
	/* Receive the translated text of an i18n item, update it everywhere it appears */
	let changeThese = document.querySelectorAll(`[data-i18n='${dataPoint}']`)
	changeThese.forEach((changeThis) => {
		changeThis.innerHTML = newText
	})
})

ipcRenderer.on('newFileConfig', (event, arg) => {
	/* Get notification of loading a new config file */
	if ( arg.error ) {
		classRem("load_error", "d-none")
	} else {
		classAdd("load_error", "d-none")
	}
	
	if ( arg.valid ) {
		classRem("button_process", "disabled")
	} else {
		classAdd("button_process", "disabled")
	}
		
	byId("location_savegame_folder").innerHTML = arg.saveDir
	byId("location_mod_folder").innerHTML      = arg.modDir

	classAdd(["process_bar_working", "process_bar_done"], "d-none")
})

ipcRenderer.on('processModsDone', (event, arg) => {
 	classAdd("process_bar_working","d-none")
 	classRem("process_bar_done", "d-none")
 	classRem(["button_process","button_load"], "disabled")
 	// TODO: still need conflicts.  And the subsystem for that.
	ipcRenderer.send('askBrokenList')
	ipcRenderer.send('askMissingList')
	ipcRenderer.send('askExploreList', 0)
	ipcRenderer.send('askGamesActive')
})

ipcRenderer.on('gotBrokenList', (event, list) => {
	const newContent = list.map((x) => { return buildBrokenList(x[0], x[1], x[2], x[3]) })
	byId("broken_list").innerHTML = newContent.join("")

	let sendSet = new Set()
	for (const item of byId("broken_list").getElementsByClassName("i18n")) {
		sendSet.add(item.getAttribute('data-i18n'))
	}
	sendSet.forEach( (thisStringID ) => {
		ipcRenderer.send('i18n-translate', thisStringID)
	})
	classRem("button_un_hide_broken", "d-none")
})


ipcRenderer.on('gotMissingList', (event, list) => {
	const newContent = list.map((x) => { return buildTableRow(x) })
	
	byId("table_missing").innerHTML = newContent.join("")
})

ipcRenderer.on('gotExploreList', (event, list) => {
	const colNames = [
		"col_mod_name",
		"col_mod_title",
		"col_mod_version",
		"col_mod_size",
		"col_mod_active_games",
		"col_mod_used_games",
		"col_mod_full_path",
		"col_mod_is_active",
		"col_mod_is_used",
	]

	const newContent = list.map((x) => { return buildTableRow(x, colNames) })

	byId("table_explore").innerHTML = newContent.join("")

	byId("col_mod_name_switch").dispatchEvent(new Event('change'))
})

ipcRenderer.on('gotGamesActive', (event, list, saveGameText, allText) => {
	/* Change explore list based on save game filter */
	let newOptions = buildOpt(0, allText, 0)

	list.forEach((thisGame) => { 
		newOptions += buildOpt(thisGame, saveGameText + thisGame, 0)
	})

	byId("savegame_select").innerHTML = newOptions

	let sendSet = new Set()
	for (const item of byId("savegame_select").getElementsByClassName("i18n")) {
		sendSet.add(item.getAttribute('data-i18n'))
	}
	sendSet.forEach( (thisStringID ) => {
		ipcRenderer.send('i18n-translate', thisStringID)
	})
})


ipcRenderer.on('hideByID', (event, id) => {
	/* Hide a row by ID */
	classAdd(id, "d-none")
})



/* Functions that are exposed to the UI renderer process */
contextBridge.exposeInMainWorld(
	'ipc', 
	{
		changeLangList : () => { 
			ipcRenderer.send("i18n-change-locale", byId("language_select").value)
		},
		loadButton : () => {
			ipcRenderer.send('openConfigFile')
		},
		processButton : () => {
			ipcRenderer.send('processMods')
			classAdd(["button_process","button_load"], "disabled")
			classAdd("process_bar_done", "d-none")
			classRem("process_bar_working", "d-none")
		},
		changeExplore : () => {
			ipcRenderer.send('askExploreList', byId("savegame_select").value)
		}
	}
)



/* Listeners on the renderer that need privileged execution (ipc usually) */

window.addEventListener('DOMContentLoaded', () => {
	byId("broken_list").addEventListener('contextmenu', (e) => {
		/* Right click on a mod entry in the broken list */
		e.preventDefault()

		const closestEntry = e.target.closest(".mod-record")
		
		if ( closestEntry !== null ) {
			ipcRenderer.send('show-context-menu-broken', closestEntry.id, closestEntry.getAttribute("data-path"))
		}
	})

	byId("table_missing_parent").addEventListener('contextmenu', (e) => {
		/* Right click on a mod entry in the missing list */
		e.preventDefault()
		
		if ( e.target.matches("td") ) {
			const theseHeaders = Array.from(
				byId("table_missing").parentNode.firstElementChild.querySelectorAll("th.i18n"),
				th => th.innerText
			)
			const theseValues = Array.from(
				e.target.parentNode.childNodes,
				td => td.innerText
			)
			ipcRenderer.send('show-context-menu-table', theseHeaders, theseValues)
		}
	})

	byId("table_explore_parent").addEventListener('contextmenu', (e) => {
		/* Right click on a mod entry in the explore list */
		e.preventDefault()
		
		if ( e.target.matches("td") ) {
			const theseHeaders = Array.from(
				byId("table_explore").parentNode.firstElementChild.querySelectorAll("th.i18n"),
				th => th.innerText
			)
			const theseValues = Array.from(
				e.target.parentNode.childNodes,
				td => td.innerText
			)
			console.log("right click!", theseHeaders, theseValues)
			ipcRenderer.send('show-context-menu-table', theseHeaders, theseValues)
		}
	})
})