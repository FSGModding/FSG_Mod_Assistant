//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Renderer Thread - UI Functions that don't require data from browser process

// (c) 2021 JTSage.  MIT License.

const byId = function( id ) { return document.getElementById( id ) }

function unHideAllBroken () {
	let hiddenList = byId("broken_list").querySelectorAll(".d-none")
	hiddenList.forEach((node) => { node.classList.remove("d-none") })
}
function unHideAllConflict () {
	let hiddenList = byId("conflict_list").querySelectorAll(".d-none")
	hiddenList.forEach((node) => { node.classList.remove("d-none") })
}

function changeActiveGame() {
	// TODO: add the select, make this do something
}

function toggleExploreColumns () {
	const columns = [
		"mod_name",
		"mod_title",
		"mod_version",
		"mod_size",
		"mod_is_active",
		"mod_active_games",
		"mod_is_used",
		"mod_used_games",
		"mod_full_path",
	]
	columns.forEach((thisCol) => {
		const theseItems = byId("table_explore_parent").querySelectorAll(".col_"+thisCol)
		const colStatus = byId("col_"+thisCol+"_switch").checked

		theseItems.forEach((thisRow) => {
			if ( colStatus === true ) {
				thisRow.classList.remove("d-none")
			} else {
				thisRow.classList.add("d-none")
			}
		})
	})
}

window.addEventListener('DOMContentLoaded', () => {
	toggleExploreColumns()
})