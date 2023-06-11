/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Folder window UI

/* global processL10N, fsgUtil */

let lastScroll = null


window.mods.receive('fromMain_getFolders', (modCollect) => {
	let   folderNum       = 0
	const localFolderList = []
	const lastFolder      = modCollect.set_Collections.size - 1

	for ( const collectKey of modCollect.set_Collections ) {
		localFolderList.push(makeFolderLine(
			{
				collectKey : collectKey,
				dateAdd    : getPrintDate(modCollect.collectionNotes[collectKey].notes_add_date),
				dateUsed   : getPrintDate(modCollect.collectionNotes[collectKey].notes_last),
				multiVer   : modCollect.appSettings.multi_version,
				name       : modCollect.collectionToName[collectKey],
				pathRel    : modCollect.collectionToFolderRelative[collectKey],
				tag        : modCollect.collectionNotes[collectKey].notes_tagline,
				version    : modCollect.collectionNotes[collectKey].notes_version,
			},
			folderNum,
			lastFolder
		))
		folderNum++
	}

	fsgUtil.byId('folderList').innerHTML = localFolderList.join('')

	processL10N()

	try {
		if ( lastScroll !== null ) {
			window.scrollTo(0, lastScroll)
			lastScroll = null
		}
	} catch { /* ignore */ }
})

function getPrintDate(textDate) {
	const year2000 = 949381200000
	const date = typeof textDate === 'string' ? new Date(Date.parse(textDate)) : textDate

	if ( date < year2000 ) { return '<l10n name="mh_unknown"></l10n>'}

	return `<span class="text-body-emphasis">${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${(date.getDate()).toString().padStart(2, '0')}</span>`
}
function moveBtn(icon, num, dest, disable) {
	return `<button onclick="clientMoveItem(${num}, ${dest})" class="btn btn-sm btn-outline-secondary ${disable?'disabled':''}"><l10n name="${icon}"></l10n></button>`
}

const upBtn = (num, disable) => `${moveBtn('folder_top_button', num, 0, disable)}${moveBtn('folder_up_button', num, num-1, disable)}`
const dnBtn = (num, last, disable) => `${moveBtn('folder_down_button', num, num+1, disable)}${moveBtn('folder_bot_button', num, last, disable)}`


const makeFolderLine = (details, num, last) => fsgUtil.useTemplate('folder_line', {
	collectKey  : details.collectKey,
	dateAdd     : details.dateAdd,
	dateUsed    : details.dateUsed,
	downButtons : dnBtn(num, last, num === last),
	name        : details.name,
	pathRel     : details.pathRel,
	tagLine     : details.tag === null ? '' : details.tag,
	upButtons   : upBtn(num, num < 1),
	version     : details.multiVer ? `<l10n class="small" name="mod_badge_fs${details.version}"></l10n>` : '',
})


function clientMoveItem(from, to) {
	lastScroll = window.scrollY
	window.mods.reorderFolder(from, to)
}

function clientCollectFunc(type, collectKey) {
	lastScroll = window.scrollY

	switch (type) {
		case 'open' :
			window.mods.openFolder(collectKey)
			break
		case 'remove' :
			window.mods.removeFolder(collectKey)
			break
		case 'detail' :
			window.mods.openNotes(collectKey)
			break
		default :
			break
	}
}
