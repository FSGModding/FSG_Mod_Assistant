/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

/* global DATA, MA, __, clientGetKeyMapSimple */

let modName = ''

window.addEventListener('DOMContentLoaded', () => {
	const urlParams = new URLSearchParams(window.location.search)
	const modColUUID = urlParams.get('mod')

	window.detail.getMod(modColUUID).then(async (thisMod) => {
		modName      = thisMod.fileDetail.shortName

		const locale = await window.i18n.lang()

		step_table(thisMod, locale)
		step_keyBinds(thisMod, locale)
	})
})

function step_keyBinds(thisMod, locale) {
	const keyBinds = []
	for ( const action in thisMod.modDesc.binds ) {
		const thisBinds = thisMod.modDesc.binds[action].map((keyCombo) => clientGetKeyMapSimple(keyCombo, locale))
		keyBinds.push(`${action} :: ${thisBinds.join('<span class="mx-3">/</span>')}`)
	}
	DATA.joinArrayOrI18N(keyBinds, 'detail_key_none').then((value) => {
		MA.byIdHTML('keyBinds', value)
	})
	MA.clsOrGateArr('keyBinds', keyBinds, 'text-info')
}

async function step_table(thisMod, locale) {
	const idMap = {
		bigFiles       : await DATA.joinArrayOrI18N(thisMod.fileDetail.tooBigFiles),
		depends        : await DATA.joinArrayOrI18N(thisMod.modDesc.depend, 'detail_depend_clean'),
		description    : DATA.escapeDesc(thisMod.l10n.description),
		extraFiles     : await DATA.joinArrayOrI18N(thisMod.fileDetail.extraFiles),
		file_date      : (new Date(Date.parse(thisMod.fileDetail.fileDate))).toLocaleString(locale, {timeZoneName : 'short'}),
		filesize       : await DATA.bytesToHR(thisMod.fileDetail.fileSize),
		has_scripts    : DATA.checkX(thisMod.modDesc.scriptFiles),
		i3dFiles       : thisMod.fileDetail.i3dFiles.join('\n'),
		is_multiplayer : DATA.checkX(thisMod.modDesc.multiPlayer, false),
		mh_version     : ( thisMod.modHub.id !== null ) ?
			`<a href="https://www.farming-simulator.com/mod.php?mod_id=${thisMod.modHub.id}" target="_BLANK">${thisMod.modHub.version}</a>` :
			`<em>${await __(thisMod.modHub.id === null ? 'mh_norecord' : 'mh_unknown' )}</em>`,
		mod_author     : DATA.escapeSpecial(thisMod.modDesc.author),
		mod_location   : thisMod.fileDetail.fullPath,
		pngTexture     : await DATA.joinArrayOrI18N(thisMod.fileDetail.pngTexture),
		spaceFiles     : await DATA.joinArrayOrI18N(thisMod.fileDetail.spaceFiles),
		store_items    : DATA.checkX(thisMod.modDesc.storeItems),
		title          : (( thisMod.l10n.title !== null && thisMod.l10n.title !== '--' ) ? DATA.escapeSpecial(thisMod.l10n.title) : thisMod.fileDetail.shortName),
		version        : DATA.escapeSpecial(thisMod.modDesc.version),
	}
	for ( const [id, content] of Object.entries(idMap)) {
		MA.byIdHTML(id, content)
	}
	MA.clsOrGateArr('pngTexture', thisMod.fileDetail.pngTexture)
	MA.clsOrGateArr('spaceFiles', thisMod.fileDetail.spaceFiles)
	MA.clsOrGateArr('extraFiles', thisMod.fileDetail.extraFiles)
	MA.clsOrGateArr('bigFiles', thisMod.fileDetail.tooBigFiles)

	for ( const element of MA.query('#description a') ) { element.target = '_BLANK' }

	MA.byIdHTMLorHide(
		'icon_div',
		`<img class="img-fluid" src="${thisMod.modDesc.iconImageCache}" />`,
		thisMod.modDesc.iconImageCache
	)
}