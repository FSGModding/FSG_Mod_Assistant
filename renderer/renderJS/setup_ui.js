/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Folder window UI

/* global processL10N, fsgUtil, __ */

function makeGameButton(setting, value, extraText = '') {
	const buttonColor = value === lastPreferences[setting] ? 'success btn-thumb-up' : 'outline-secondary btn-check-mark'
	const buttonText  = value === lastPreferences[setting] ? 'wizard_using_this'    : 'wizard_use_this'

	return [
		extraText !== '' ? `<div class="col-1 align-self-center">${extraText}</div>` : '',
		`<div class="col-${extraText !== '' ? '8' : '9'} align-self-center small">${value}</div>`,
		`<div class="col-3"><button onclick="window.mods.setPref('${setting}', '${value.replaceAll('\\', '\\\\')}')" class="btn btn-${buttonColor} w-100"><l10n name="${buttonText}"></l10n></button></div>`,
	].join('')
}


function doSettingStep (step = 2, version = 22) {
	const gameSettings = version === 22 ? 'game_settings' : `game_settings_${version}`
	const gamePath     = version === 22 ? 'game_path' : `game_path_${version}`
	const divSettings  = `found_${version}_settings`
	const divPath      = `found_${version}_game`

	if ( lastWizard.settings[version].length === 0 ) {
		fsgUtil.setById(divSettings, `<div class="text-center fw-bold text-warning">${__(`wizard_step_${step}_fail_settings`)}</div>`)
	} else {
		fsgUtil.setById(divSettings, [
			'<div class="row my-2 gy-2">',
			...lastWizard.settings[version].map((x) => makeGameButton(gameSettings, x)),
			'</div>',
		])
	}

	if ( lastWizard.games[version].length === 0 ) {
		fsgUtil.setById(divPath, `<div class="text-center fw-bold text-warning">${__(`wizard_step_${step}_fail_exe`)}</div>`)
	} else {
		fsgUtil.setById(divPath, [
			'<div class="row my-2 gy-2">',
			...lastWizard.games[version].map((x) => makeGameButton(gamePath, x[1], x[0])),
			'</div>',
		])
	}
}

function folderAddLine(folder, alreadyExists) {
	const buttonClass = alreadyExists ? 'secondary disabled' : 'info'
	return [
		`<div class="row border-bottom pb-2 mb-2"><div class="col-9 align-self-center ${alreadyExists ? 'text-decoration-line-through' : ''}">${folder}</div>`,
		'<div class="col-3 align-self-center">',
		alreadyExists ?
			`<div class="small text-center fst-italic">${__('wizard_mods_exists')}</div>` :
			`<button onclick="window.mods.addFolder('${folder.replaceAll('\\', '\\\\')}')"class="btn btn-sm btn-check-mark w-100 btn-outline-${buttonClass}">${__('folder_add')}</button>`,
		'</div></div>',
	].join('')
}

function doCollectionStep() {
	if ( lastWizard.mods.isModFolder ) {
		fsgUtil.setById('step_3_base', [
			'<div class="row border-bottom pb-2 mb-2"><l10n class="col-12"name="wizard_mods_files"></l10n></div>',
			folderAddLine(
				lastWizard.mods.baseModFolder,
				lastFolder.includes(lastWizard.mods.baseModFolder)
			)
		])
	}

	if ( lastWizard.mods.hasCollections.length !== 0 ) {
		fsgUtil.setById('step_3_folder', [
			`<div class="row border-bottom pb-2 mb-2 ${lastWizard.mods.isModFolder ? 'mt-5' : ''}"><l10n class="col-12"name="wizard_mods_folders"></l10n></div>`,
			...lastWizard.mods.hasCollections.map((x) => folderAddLine(
				x,
				lastFolder.includes(x)
			))
		])
	}
}

let lastPreferences = null
let lastWizard      = null
let lastFolder      = null

window.mods.receive('fromMain_modList', (modCollect) => {
	lastPreferences = modCollect.appSettings
	lastWizard      = modCollect.opts.wizardSettings
	lastFolder      = modCollect.opts.folders

	doSettingStep(2, 22)
	doSettingStep(4, 19)
	doSettingStep(4, 17)
	doSettingStep(4, 15)
	doSettingStep(4, 13)
	doCollectionStep()
	updatePreferences()
})

window.mods.receive('fromMain_allSettings', (allSettings, _, folders) => {
	lastFolder      = folders
	lastPreferences = allSettings
	doSettingStep(2, 22)
	doSettingStep(4, 19)
	doSettingStep(4, 17)
	doSettingStep(4, 15)
	doSettingStep(4, 13)
	doCollectionStep()
	updatePreferences()
})

window.addEventListener('DOMContentLoaded', () => {
	window.l10n.langList_send()
	window.l10n.themeList_send()
	processL10N()
})

function updatePreferences() {
	for ( const name in lastPreferences ) {
		const formControl = fsgUtil.byId(`uPref_${name}`)
		if ( formControl !== null ) {
			if ( formControl.getAttribute('type') === 'checkbox' ) {
				formControl.checked = lastPreferences[name]
			} else if ( name === 'font_size' ) {
				formControl.value = (lastPreferences[name] / 14) * 100
			} else if ( formControl.tagName === 'DIV' ) {
				formControl.innerHTML = lastPreferences[name]
			} else {
				formControl.value = lastPreferences[name]
			}
		}
	}

	fsgUtil.setById('font_size_value', `${Math.floor((lastPreferences.font_size / 14) * 100)}%`)

	fsgUtil.classPerTest('.multi-version-pref', lastPreferences.multi_version)

	fsgUtil.classPerTest('.game_enabled_19', lastPreferences.game_enabled_19)
	fsgUtil.classPerTest('.game_enabled_17', lastPreferences.game_enabled_17)
	fsgUtil.classPerTest('.game_enabled_15', lastPreferences.game_enabled_15)
	fsgUtil.classPerTest('.game_enabled_13', lastPreferences.game_enabled_13)

	fsgUtil.classPerTest('.game_disabled_19', !lastPreferences.game_enabled_19)
	fsgUtil.classPerTest('.game_disabled_17', !lastPreferences.game_enabled_17)
	fsgUtil.classPerTest('.game_disabled_15', !lastPreferences.game_enabled_15)
	fsgUtil.classPerTest('.game_disabled_13', !lastPreferences.game_enabled_13)

	processL10N()
}

function clientDragFontSize() {
	fsgUtil.setById('font_size_value', `${fsgUtil.valueById('uPref_font_size')}%`)
}

function clientSetPref(id) {
	const formControl = fsgUtil.byId(`uPref_${id}`)

	if ( formControl.getAttribute('type') === 'checkbox' ) {
		window.mods.setPref(id, formControl.checked)
	} else if ( id === 'font_size' ) {
		window.mods.setPref(id, (formControl.value / 100) * 14)
	} else {
		window.mods.setPref(id, formControl.value)
	}
}

function clientChangeTheme()    { window.l10n.themeList_change(fsgUtil.valueById('theme_select')) }
function clientChangeL10N()     { window.l10n.langList_change(fsgUtil.valueById('language_select')) }
