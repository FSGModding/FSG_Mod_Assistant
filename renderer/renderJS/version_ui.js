/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */
// MARK: VERSION UI

/* global MA, DATA, I18N */

// MARK: process data
function processVersions(modCollect) {
	const thisVersion        = modCollect.appSettings.game_version
	const modDisplayData     = {}
	const collectKeyName     = {}

	for ( const collectKey of modCollect.set_Collections ) {
		const theseNotes = modCollect?.collectionNotes?.[collectKey]

		if ( theseNotes?.notes_frozen === true ) {
			continue
		}

		if ( theseNotes?.notes_version !== thisVersion ) {
			continue
		}

		collectKeyName[collectKey] = modCollect.collectionToName[collectKey]

		for ( const modKey of modCollect.modList[collectKey].modSet ) {
			const thisMod = modCollect.modList[collectKey].mods[modKey]
			const modName = thisMod.fileDetail.shortName

			if ( thisMod.fileDetail.isFolder ) { continue }
			modDisplayData[modName] ??= {
				icon    : thisMod.modDesc.iconImageCache,
				match   : true,
				modhub  : modCollect.modHub.version?.[modCollect.modHub.list.mods?.[modName]] || null,
				title   : DATA.escapeSpecial(thisMod.l10n.title),
				verList : [],
			}

			modDisplayData[modName].verList.push([collectKey, thisMod.modDesc.version])
		}
	}

	const orderMatch = []
	const orderDiff  = []

	for ( const [key, entry] of Object.entries(modDisplayData) ) {
		if ( entry.verList.length < 2 ) {
			delete modDisplayData[key]
			continue
		}
		entry.verList = entry.verList
			.map((x) => ({ name : collectKeyName[x[0]], version : x[1]}))
			.sort((a, b) => Intl.Collator().compare(a.name, b.name))

		const firstFoundVersion = entry.verList[0].version
		entry.match = entry.verList.every((x) => x.version === firstFoundVersion )
		if ( entry.match ) {
			orderMatch.push(key)
		} else {
			orderDiff.push(key)
		}
		
	}

	return {
		data       : modDisplayData,
		order      : [
			...orderDiff.sort().map((x) => [true, x]),
			...orderMatch.sort().map((x) => [false, x]),
		],
	}
}

// MARK: display data
async function displayData(data) {
	const listDiv = MA.byId('modList')

	listDiv.innerHTML = ''

	for ( const [isDiff, key] of data.order ) {
		const thisItem = data.data[key]

		const badgePromise = [
			I18N.buildBadgeNoI18N({
				name : `MH:${thisItem.modhub}`,
				class : ['badge-mod-notmod'],
				skip : !isDiff || thisItem.modhub === null,
			}),
			I18N.buildBadgeBare({
				name : isDiff ? 'version_diff' : 'version_same',
				class : [],
			}),
		]

		const collectionList = thisItem.verList.map((x) => [
			'<li>',
			`<span class="fw-bold">${x.name}</span>`,
			isDiff ? ` <span class="fst-italic">${x.version}</span>` : '',
			'</li>'
		].join(''))

		const node = DATA.templateEngine('version_line', {
			collections : collectionList.join(''),
			iconImage   : `<img class="img-fluid" src="${DATA.iconMaker(thisItem.icon)}" />`,
			realName    : thisItem.title,
			shortName   : key,
		})

		node.querySelector('.collection-list').classList.add( isDiff ? 'collection-list-diff' : 'collection-list-same')

		if ( isDiff ) {
			const actionButton = document.createElement('button')
			actionButton.setAttribute('type', 'button')
			actionButton.classList.add('btn', 'btn-primary', 'w-75', 'btn-sm', 'mt-4', 'ms-auto', 'me-0')
			actionButton.innerHTML = I18N.defer('resolve_version_window', false)

			actionButton.addEventListener('click', () => {
				window.version_IPC.resolve(key)
			})

			node.querySelector('.actionButton').appendChild(actionButton)
		}

		node.firstElementChild.classList.add(isDiff ? 'bg-danger-subtle' : 'bg-primary-subtle')

		Promise.allSettled(badgePromise).then((result) => {
			const badgeContain = node.querySelector('.badgeContainer')
			for ( const thisBadge of result ) {
				badgeContain.appendChild(thisBadge.value)
			}

			listDiv.appendChild(node)
		})
	}

}

// MARK: PAGE LOAD
window.addEventListener('DOMContentLoaded', () => {
	window.version_IPC.get().then((modCollect) => {
		displayData(processVersions(modCollect))
	})
})