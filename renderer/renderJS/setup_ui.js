/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Folder window UI

/* global MA, I18N */

window.addEventListener('DOMContentLoaded', () => {
	window.prefs = new PrefLib()
})

class PrefLib {
	currentDev = null
	overlay    = null
	folders    = null
	wizard     = null

	inputs = {
		game_enabled_13 : {
			set    : (input) => { this.#processCheck('game_enabled_13', input, true) },
			update : (input) => { this.#processCheck('game_enabled_13', input, false) },
		},
		game_enabled_15 : {
			set    : (input) => { this.#processCheck('game_enabled_15', input, true) },
			update : (input) => { this.#processCheck('game_enabled_15', input, false) },
		},
		game_enabled_17 : {
			set    : (input) => { this.#processCheck('game_enabled_17', input, true) },
			update : (input) => { this.#processCheck('game_enabled_17', input, false) },
		},
		game_enabled_19 : {
			set    : (input) => { this.#processCheck('game_enabled_19', input, true) },
			update : (input) => { this.#processCheck('game_enabled_19', input, false) },
		},
		game_enabled_22 : {
			set    : (input) => { this.#processCheck('game_enabled_22', input, true) },
			update : (input) => { this.#processCheck('game_enabled_22', input, false) },
		},
		game_enabled_25 : {
			set    : (input) => { this.#processCheck('game_enabled_25', input, true) },
			update : (input) => { this.#processCheck('game_enabled_25', input, false) },
		},
		show_tooltips : {
			set    : (input) => { this.#processCheck('show_tooltips', input, true) },
			update : (input) => { this.#processCheck('show_tooltips', input, false) },
		},
	}

	#processCheck(key, input, setValue = false) {
		if ( !setValue ) {
			window.settings.get(key).then((value) => {
				input.checked = value
			})
		} else {
			window.settings.set(key, input.checked).then((value) => {
				input.checked = value
			})
		}
	}

	update = []

	constructor () {
		window.settings.receive('settings:invalidate', () => { this.forceUpdate() })
		this.init()
	}

	init() {
		for ( const element of document.querySelectorAll('page-replace')) {
			const replaceType = element.safeAttribute('data-type')
			const replaceKey  = element.safeAttribute('data-name')
			const replaceExt  = element.safeAttribute('data-extra')
			const replaceKeyO = element.safeAttribute('data-key')
	
			switch ( replaceType ) {
				case 'special-input' :
					element.replaceWith(this.#doSpecial(replaceKey))
					break
				case 'switch-input':
					element.replaceWith(this.#doSwitch(replaceKey, replaceKeyO, replaceExt || 2))
					break
				case 'settings-input':
					element.replaceWith(this.#doSettings(replaceKey))
					break
				case 'path-input':
					element.replaceWith(this.#doPath(replaceKey))
					break
				default :
					break
			}
		}

		this.update.push(() => { this.#doFolders() })

		this.forceUpdate()
	}

	forceUpdate() {
		window.setup_IPC.update().then((results) => {
			this.folders = results.folders
			this.wizard  = results.wizard

			for ( const update of this.update ) {
				update()
			}
		})
	}

	open() {
		this.forceUpdate()
	}

	#doFolderLine(folder, alreadyExists, version) {
		const buttonClass = alreadyExists ? 'secondary disabled' : 'info'
		const node = document.createElement('div')
		node.classList.add('row', 'border-bottom', 'pb-2', 'mb-2')

		node.innerHTML = [
			`<div class="col-9 align-self-center ${alreadyExists ? 'text-decoration-line-through' : ''}"><i class="fsico-ver-${version}"></i> ${folder}</div>`,
			'<div class="col-3 align-self-center">',
			alreadyExists ?
				'<div class="small text-center fst-italic"><i18n-text data-key="wizard_mods_exists"></i18n-text></div>' :
				`<i18n-text class="btn btn-sm btn-check-mark w-100 btn-outline-${buttonClass}" data-key="folder_add"></button>`,
			'</div>',
		].join('')

		if ( !alreadyExists ) {
			node.querySelector('.btn').addEventListener('click', () => {
				window.wizard_IPC.addFolder(folder, version)
			})
		}
		return node
	}

	#doFolders() {
		const fullHTML = []
		for ( const propCollect of this.wizard.mods ) {
			if ( propCollect.isModFolder ) {
				fullHTML.push(this.#doFolderLine(
					propCollect.baseModFolder,
					this.folders.includes(propCollect.baseModFolder),
					propCollect.ver
				))
			}
			if ( propCollect.hasCollections.length !== 0 ) {
				fullHTML.push(...propCollect.hasCollections.map((x) => this.#doFolderLine(
					x,
					this.folders.includes(x),
					propCollect.ver
				)))
			}
		}

		MA.byIdNodeArray('step_3_folders', fullHTML)
	}

	#doButton(key, newValue, curValue, extraText = '') {
		const node = document.createElement('div')
		node.classList.add('row', 'mt-1')

		const buttonColor = newValue === curValue ? 'success btn-thumb-up' : 'outline-secondary btn-check-mark'
		const buttonText  = newValue === curValue ? 'wizard_using_this'    : 'wizard_use_this'
		
		node.innerHTML = [
			extraText !== '' ? `<div class="col-1 align-self-center">${extraText}</div>` : '',
			`<div class="col-${extraText !== '' ? '8' : '9'} align-self-center small">${newValue}</div>`,
			`<div class="col-3"><button class="btn btn-${buttonColor} w-100"><i18n-text data-key="${buttonText}"></i18n-text></button></div>`,
		].join('')

		if ( newValue !== curValue ) {
			node.querySelector('button').addEventListener('click', () => {
				window.settings.set(key, newValue).then(() => {
					this.forceUpdate()
				})
			})
		} else {
			node.querySelector('button').disabled = true
		}
		return node
	}

	#doPath(version) {
		const iVer    = parseInt(version)
		const fullKey = `game_path_${version}`
		const node    = document.createElement('div')
		node.innerHTML = [
			'<i18n-text class="inset-block-header" data-key="user_pref_title_game_path"></i18n-text>',
			'<i18n-text class="inset-block-blurb-option mb-3" data-key="user_pref_blurb_game_path"></i18n-text>',
			'<div class="row inset-block-lined-row">',
			'<div class="col"><i18n-text data-key="wizard_current"></i18n-text></div>',
			'<div class="col-auto fst-italic small current_game_path"></div>',
			'</div><div class="found_paths"></div>',
		].join('')

		const buttons = node.querySelector('.found_paths')

		const updater = () => {
			window.settings.get(fullKey).then((value) => {
				buttons.innerHTML = ''
				node.querySelector('.current_game_path').textContent = value !== '' ? value : '--'

				if ( this.wizard.games[iVer].length === 0 ) {
					buttons.appendChild(I18N.__('wizard_step_4_fail_exe', ['text-center', 'd-block']))
				} else {
					for ( const gamePath of this.wizard.games[iVer] ) {
						buttons.appendChild(this.#doButton(
							fullKey,
							gamePath[1],
							value,
							gamePath[0]
						))
					}
				}
			})
		}

		this.update.push(updater)
		return node
	}

	#doSettings(version) {
		const iVer    = parseInt(version)
		const fullKey = `game_settings_${version}`
		const node    = document.createElement('div')
		node.innerHTML = [
			'<i18n-text class="inset-block-header" data-key="user_pref_title_game_settings"></i18n-text>',
			'<i18n-text class="inset-block-blurb-option mb-3" data-key="user_pref_blurb_game_settings"></i18n-text>',
			'<div class="row inset-block-lined-row">',
			'<div class="col"><i18n-text data-key="wizard_current"></i18n-text></div>',
			'<div class="col-auto fst-italic small current_game_settings"></div>',
			'</div>',
			'<div class="found_settings"></div>',
		].join('')

		const buttons = node.querySelector('.found_settings')

		const updater = () => {
			window.settings.get(fullKey).then((value) => {
				buttons.innerHTML = ''
				node.querySelector('.current_game_settings').textContent = value !== '' ? value : '--'

				if ( this.wizard.settings[iVer].length === 0 ) {
					buttons.appendChild(I18N.__('wizard_step_4_fail_settings', ['text-center', 'd-block']))
				} else {
					for ( const setPath of this.wizard.settings[iVer] ) {
						buttons.appendChild(this.#doButton(
							fullKey,
							setPath,
							value
						))
					}
				}
			})
		}

		this.update.push(updater)
		return node
	}

	#doSwitch(key, keyOver = null, size = 2) {
		const i18nKey = keyOver !== null ? keyOver : key
		const node = document.createElement('div')
		node.innerHTML = [
			`<i18n-text class="inset-block-header" data-key="user_pref_title_${i18nKey}"></i18n-text>`,
			'<div class="row">',
			`<i18n-text class="inset-block-blurb-option col-${12-size}" data-key="user_pref_blurb_${i18nKey}"></i18n-text>`,
			`<div class="col-${size} form-switch custom-switch">`,
			'<input class="form-check-input" type="checkbox" role="switch">',
			'</div></div>',
		].join('')
		const input = node.querySelector('input')
		input.addEventListener('change', () => { this.inputs[key].set(input) })
		this.update.push(() => { this.inputs[key].update(input) })
		return node
	}

	#doSpecial(key) {
		const node = document.createElement('div')
		switch (key) {
			case 'font_size' : {
				node.innerHTML = [
					'<i18n-text class="inset-block-header" data-key="user_pref_title_font_size"></i18n-text>',
					'<div class="row">',
					'<i18n-text class="inset-block-blurb-option col-10" data-key="user_pref_blurb_font_size"></i18n-text>',
					'<div class="col-2 text-center small text-body-emphasis" id="pref--font_size_value">XX</div>',
					'<div class="col-12 mt-2">',
					'<input id="pref--font_size_input" type="range" class="form-range" min="70" max="150" step="1" >',
					'<div class="p-0" style="margin-top: -0.95rem"><i style="margin-left: calc(38% - 0.5rem)" class="text-body-tertiary bi-caret-up"></i></div>',
					'</div><div class="col-10 offset-1 mt-2">',
					'<i18n-text id="pref--font_size_reset" class="d-block btn btn-outline-primary btn-sm w-100 mx-auto" data-key="user_pref_font_size_default"></i18n-text>',
					'</div></div>',
				].join('')

				const font_size_number = node.querySelector('#pref--font_size_value')
				const font_size_slider = node.querySelector('#pref--font_size_input')
				const font_size_reset  = node.querySelector('#pref--font_size_reset')

				font_size_reset.addEventListener('click', () => {
					window.settings.set('font_size', 14).then((value) => {
						const percent = (value / 100) * 14
						font_size_slider.value       = value
						font_size_number.textContent = `${percent}%`
					})
				})
				font_size_slider.addEventListener('input', () => {
					font_size_number.textContent = `${Math.floor(font_size_slider.value)}%`
				})
				font_size_slider.addEventListener('change', () => {
					const numberValue = (font_size_slider.value / 100) * 14
					window.settings.set('font_size', numberValue).then((value) => {
						const percent = (value / 14) * 100
						font_size_slider.value       = value
						font_size_number.textContent = `${Math.floor(percent)}%`
					})
				})

				const font_size_update = () => {
					window.settings.get('font_size').then((value) => {
						const percent = (value / 14) * 100
						font_size_slider.value       = percent
						font_size_number.textContent = `${Math.floor(percent)}%`
					})
				}
				
				window?.operations?.receive('win:updateFontSize', font_size_update)

				this.update.push(font_size_update)
				break
			}
			case 'theme_color' : {
				node.innerHTML = [
					'<i18n-text class="inset-block-header" data-key="user_pref_title_theme_color"></i18n-text>',
					'<i18n-text class="inset-block-blurb-option" data-key="user_pref_blurb_theme_color"></i18n-text>',
					'<select class="form-select mt-3 px-4" name="theme_select" id="theme_select"></select>',
				].join('')

				const theme_select = node.querySelector('select')
				
				theme_select.addEventListener('change', () => {
					window.settings.themeChange(theme_select.value)
				})

				const theme_update = () => {
					window.settings.themeList().then((values) => {
						theme_select.innerHTML = ''
						for ( const value of values ) {
							const opt = document.createElement('option')
							opt.value = value[0]
							opt.textContent = value[1]
							theme_select.appendChild(opt)
						}
						window.settings.get('color_theme').then((value) => {
							theme_select.value = value
						})
					})
				}

				this.update.push(theme_update)
				window?.operations?.receive('win:updateTheme', theme_update)
				break
			}
			case 'lang' : {
				node.innerHTML = [
					'<i18n-text class="inset-block-header" data-key="user_pref_title_lang"></i18n-text>',
					'<i18n-text class="inset-block-blurb-option" data-key="user_pref_blurb_lang"></i18n-text>',
					'<select class="form-select mt-3 px-4" name="language_select" id="language_select"></select>',
					'<div class="row mt-2">',
					'<i18n-text class="inset-block-blurb-option col-9 fst-italic" data-key="user_pref_blurb2_lang"></i18n-text>',
					'<div class="col-3 form-check form-switch custom-switch">',
					'<input id="uPref_lock_lang" class="form-check-input" type="checkbox" role="switch">',
					'</div></div>'
				].join('')

				const lang_lock   = node.querySelector('input')
				const lang_select = node.querySelector('select')

				lang_lock.addEventListener('change', () => {
					window.settings.set('lang_lock', lang_lock.checked).then((value) => {
						lang_lock.checked = value
					})
				})
				lang_select.addEventListener('change', () => {
					window.i18n.lang(lang_select.value).then((value) => {
						lang_select.value = value
					})
				})

				const lang_update = () => {
					window.i18n.list().then((values) => {
						lang_select.innerHTML = ''
						for ( const value of values ) {
							const opt = document.createElement('option')
							opt.value = value[0]
							opt.textContent = value[1]
							lang_select.appendChild(opt)
						}
						window.i18n.lang().then((value) => {
							lang_select.value = value
						})
					})
					window.settings.get('lang_lock').then((value) => {
						lang_lock.checked = value
					})
				}

				this.update.push(lang_update)
				window?.i18n?.receive('i18n:refresh', lang_update)
				break
			}
			default :
				break
		}

		return node
	}
}