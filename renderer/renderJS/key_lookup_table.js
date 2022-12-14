function clientGetKeyMapSimple(keys, locale) {
	return keys.split(' ').map((key) => { return getKeyMap(key, locale)} ).join('+')
}
function clientGetKeyMap(keys, locale) {
	return keys.split('--')[1].split(' ').map((key) => { return getKeyMap(key, locale)}).join('+')
}
function getKeyMap(key, locale) {
	let thisKey = null

	thisKey ??= keyMap[key]
	thisKey ??= localKeys?.[locale]?.[key]
	thisKey ??= localKeys.en[key]

	return `<span class="btn disabled btn-sm btn-outline-light small">${thisKey}</span>`
}
const keyMap = {
	'AXIS_X+'                 : '⤱ X+',
	'AXIS_Y+'                 : '⤱ Y+',
	'AXIS_X-'                 : '⤱ X-',
	'AXIS_Y-'                 : '⤱ Y-',
	'KEY_backspace'           : '⌫',
	'KEY_return'              : '⏎',
	'KEY_tab'                 : '⇥',
	'KEY_exclaim'             : '!',
	'KEY_quotedbl'            : '"',
	'KEY_hash'                : '#',
	'KEY_dollar'              : '$',
	'KEY_ampersand'           : '&',
	'KEY_quote'               : '\'',
	'KEY_leftparen'           : '[',
	'KEY_rightparen'          : ']',
	'KEY_asterisk'            : '*',
	'KEY_plus'                : '+',
	'KEY_comma'               : ',',
	'KEY_minus'               : '-',
	'KEY_period'              : '.',
	'KEY_slash'               : '/',
	'KEY_0'                   : '0',
	'KEY_1'                   : '1',
	'KEY_2'                   : '2',
	'KEY_3'                   : '3',
	'KEY_4'                   : '4',
	'KEY_5'                   : '5',
	'KEY_6'                   : '6',
	'KEY_7'                   : '7',
	'KEY_8'                   : '8',
	'KEY_9'                   : '9',
	'KEY_colon'               : ':',
	'KEY_semicolon'           : ';',
	'KEY_less'                : '<',
	'KEY_equals'              : '=',
	'KEY_greater'             : '>',
	'KEY_question'            : '?',
	'KEY_at'                  : '@',
	'KEY_leftbracket'         : '{',
	'KEY_backslash'           : '\\',
	'KEY_rightbracket'        : '}',
	'KEY_caret'               : '~',
	'KEY_underscore'          : '_',
	'KEY_backquote'           : '`',
	'KEY_a'                   : 'A',
	'KEY_b'                   : 'B',
	'KEY_c'                   : 'C',
	'KEY_d'                   : 'D',
	'KEY_e'                   : 'E',
	'KEY_f'                   : 'F',
	'KEY_g'                   : 'G',
	'KEY_h'                   : 'H',
	'KEY_i'                   : 'I',
	'KEY_j'                   : 'J',
	'KEY_k'                   : 'K',
	'KEY_l'                   : 'L',
	'KEY_m'                   : 'M',
	'KEY_n'                   : 'N',
	'KEY_o'                   : 'O',
	'KEY_p'                   : 'P',
	'KEY_q'                   : 'Q',
	'KEY_r'                   : 'R',
	'KEY_s'                   : 'S',
	'KEY_t'                   : 'T',
	'KEY_u'                   : 'U',
	'KEY_v'                   : 'V',
	'KEY_w'                   : 'W',
	'KEY_x'                   : 'X',
	'KEY_y'                   : 'Y',
	'KEY_z'                   : 'Z',
	'KEY_KP_0'                : 'KEYPAD 0',
	'KEY_KP_1'                : 'KEYPAD 1',
	'KEY_KP_2'                : 'KEYPAD 2',
	'KEY_KP_3'                : 'KEYPAD 3',
	'KEY_KP_4'                : 'KEYPAD 4',
	'KEY_KP_5'                : 'KEYPAD 5',
	'KEY_KP_6'                : 'KEYPAD 6',
	'KEY_KP_7'                : 'KEYPAD 7',
	'KEY_KP_8'                : 'KEYPAD 8',
	'KEY_KP_9'                : 'KEYPAD 9',
	'KEY_KP_period'           : 'KEYPAD .',
	'KEY_KP_divide'           : 'KEYPAD /',
	'KEY_KP_multiply'         : 'KEYPAD *',
	'KEY_KP_minus'            : 'KEYPAD -',
	'KEY_KP_plus'             : 'KEYPAD +',
	'KEY_KP_enter'            : 'KEYPAD ⏎',
	'KEY_KP_equals'           : 'KEYPAD =',
	'KEY_up'                  : '↑',
	'KEY_down'                : '↓',
	'KEY_right'               : '→',
	'KEY_left'                : '←',
	'KEY_f1'                  : 'F1',
	'KEY_f2'                  : 'F2',
	'KEY_f3'                  : 'F3',
	'KEY_f4'                  : 'F4',
	'KEY_f5'                  : 'F5',
	'KEY_f6'                  : 'F6',
	'KEY_f7'                  : 'F7',
	'KEY_f8'                  : 'F8',
	'KEY_f9'                  : 'F9',
	'KEY_f10'                 : 'F10',
	'KEY_f11'                 : 'F11',
	'KEY_f12'                 : 'F12',
	'KEY_f13'                 : 'F13',
	'KEY_f14'                 : 'F14',
	'KEY_f15'                 : 'F15',
	'KEY_menu'                : '▤',
	'AXIS_X'                  : '⤱ X',
	'AXIS_1'                  : '⤱ 1',
	'AXIS_Y'                  : '⤱ Y',
	'AXIS_2'                  : '⤱ 2',
	'AXIS_Z'                  : '⤱ Z',
	'AXIS_3'                  : '⤱ 3',
	'AXIS_W'                  : '⤱ W',
	'AXIS_4'                  : '⤱ 4',
	'AXIS_5'                  : '⤱ 5',
	'AXIS_6'                  : '⤱ 6',
	'AXIS_7'                  : '⤱ 7',
	'AXIS_8'                  : '⤱ 8',
	'AXIS_9'                  : '⤱ 9',
	'AXIS_10'                 : '⤱ 10',
	'AXIS_11'                 : '⤱ 11',
	'AXIS_12'                 : '⤱ 12',
	'AXIS_13'                 : '⤱ 13',
	'AXIS_14'                 : '⤱ 14',
	'KEY_clear'               : 'CLR',
	'KEY_scrolllock'          : 'SCROLL',
	'KEY_print'               : 'PrintScr',
	'MOUSE_BUTTON_NONE'       : '🖯 NONE',
	'KEY_lwin'                : '⊞',
	'KEY_rwin'                : '⊞',
	'MOUSE_BUTTON_X1'         : '🖯 4',
	'MOUSE_BUTTON_X2'         : '🖯 5',
}

const localKeys = {
	'en' : {
		'KEY_pause'               : 'PAUSE',
		'KEY_esc'                 : 'ESC',
		'KEY_space'               : 'SPACE',
		'KEY_delete'              : 'DELETE',
		'KEY_insert'              : 'INSERT',
		'KEY_home'                : 'HOME',
		'KEY_end'                 : 'END',
		'KEY_pageup'              : 'PAGE UP',
		'KEY_pagedown'            : 'PAGE DOWN',

		'KEY_rshift'              : 'RIGHT SHIFT',
		'KEY_lshift'              : 'LEFT SHIFT',
		'KEY_rctrl'               : 'RIGHT CTRL',
		'KEY_lctrl'               : 'CTRL',
		'KEY_ralt'                : 'RIGHT ALT',
		'KEY_lalt'                : 'ALT',

		'MOUSE_BUTTON_LEFT'       : '🖯 LEFT',
		'MOUSE_BUTTON_MIDDLE'     : '🖯 MIDDLE',
		'MOUSE_BUTTON_RIGHT'      : '🖯 RIGHT',
		'MOUSE_BUTTON_WHEEL_UP'   : '🖯 WHEEL UP',
		'MOUSE_BUTTON_WHEEL_DOWN' : '🖯 WHEEL DOWN',
	},
	'de' : {
		'KEY_pause'               : 'PAUSE',
		'KEY_esc'                 : 'ESC',
		'KEY_space'               : 'LEER',
		'KEY_delete'              : 'LÖSCHEN',
		'KEY_insert'              : 'EINFÜGEN',
		'KEY_home'                : 'POS1',
		'KEY_end'                 : 'ENDE',
		'KEY_pageup'              : 'BILD HOCH',
		'KEY_pagedown'            : 'BILD RUNTER',

		'KEY_rshift'              : 'UMSCHALT RECHTS',
		'KEY_lshift'              : 'UMSCHALT LINKS',
		'KEY_rctrl'               : 'STRG RECHTS',
		'KEY_lctrl'               : 'STRG',
		'KEY_ralt'                : 'ALT RECHTS',
		'KEY_lalt'                : 'ALT',

		'MOUSE_BUTTON_LEFT'       : '🖯 LINKS',
		'MOUSE_BUTTON_MIDDLE'     : '🖯 MITTE',
		'MOUSE_BUTTON_RIGHT'      : '🖯 RECHTS',
		'MOUSE_BUTTON_WHEEL_UP'   : '🖯 MAUSRAD HOCH',
		'MOUSE_BUTTON_WHEEL_DOWN' : '🖯 MAUSRAD RUNTER',
	},
	'es' : {
		'KEY_pause'               : 'PAUSA',
		'KEY_esc'                 : 'ASCEND',
		'KEY_space'               : 'ESPACIO',
		'KEY_delete'              : 'SUPR',
		'KEY_insert'              : 'INSERTAR',
		'KEY_home'                : 'INICIO',
		'KEY_end'                 : 'FIN',
		'KEY_pageup'              : 'RE PÁG',
		'KEY_pagedown'            : 'AV PÁG',

		'KEY_rshift'              : 'MAYÚS DER',
		'KEY_lshift'              : 'MAYÚS IZQ',
		'KEY_rctrl'               : 'CTRL DER',
		'KEY_lctrl'               : 'CTRL',
		'KEY_ralt'                : 'ALT DERr',
		'KEY_lalt'                : 'ALT',

		'MOUSE_BUTTON_LEFT'       : '🖯 IZQUIERDA',
		'MOUSE_BUTTON_MIDDLE'     : '🖯 CENTRO',
		'MOUSE_BUTTON_RIGHT'      : '🖯 DERECHA',
		'MOUSE_BUTTON_WHEEL_UP'   : '🖯 RUEDA ARRIBA',
		'MOUSE_BUTTON_WHEEL_DOWN' : '🖯 RUEDA ABAJO',
	},
	'fr' : {
		'KEY_pause'               : 'PAUSE',
		'KEY_esc'                 : 'ÉCHAP',
		'KEY_space'               : 'ESPACE',
		'KEY_delete'              : 'SUPPR',
		'KEY_insert'              : 'INSER',
		'KEY_home'                : 'DÉBUT',
		'KEY_end'                 : 'FIN',
		'KEY_pageup'              : 'PG PRÉC',
		'KEY_pagedown'            : 'PG SUIV',

		'KEY_rshift'              : 'MAJ DROITE',
		'KEY_lshift'              : 'MAJ GAUCHE',
		'KEY_rctrl'               : 'CTRL DROITE',
		'KEY_lctrl'               : 'CTRL',
		'KEY_ralt'                : 'ALT DROITE',
		'KEY_lalt'                : 'ALT',

		'MOUSE_BUTTON_LEFT'       : '🖯 GAUCHE',
		'MOUSE_BUTTON_MIDDLE'     : '🖯 MILIEU',
		'MOUSE_BUTTON_RIGHT'      : '🖯 DROITE',
		'MOUSE_BUTTON_WHEEL_UP'   : '🖯 MOLETTE BAS',
		'MOUSE_BUTTON_WHEEL_DOWN' : '🖯 MOLETTE HAUT',
	},
	'nl' : {
		'KEY_pause'               : 'PAUSE',
		'KEY_esc'                 : 'ESC',
		'KEY_space'               : 'SPATIEBALK',
		'KEY_delete'              : 'DELETE',
		'KEY_insert'              : 'INSERT',
		'KEY_home'                : 'HOME',
		'KEY_end'                 : 'END',
		'KEY_pageup'              : 'PAGE UP',
		'KEY_pagedown'            : 'PAGE DOWN',

		'KEY_rshift'              : 'RECHTER SHIFT',
		'KEY_lshift'              : 'LINKER SHIFT',
		'KEY_rctrl'               : 'RECHTER CTRL',
		'KEY_lctrl'               : 'CTRL',
		'KEY_ralt'                : 'RECHTER ALT',
		'KEY_lalt'                : 'ALT',

		'MOUSE_BUTTON_LEFT'       : '🖯 LINKS',
		'MOUSE_BUTTON_MIDDLE'     : '🖯 MIDDEN',
		'MOUSE_BUTTON_RIGHT'      : '🖯 RECHTS',
		'MOUSE_BUTTON_WHEEL_UP'   : '🖯 SCROLL OMHOOG',
		'MOUSE_BUTTON_WHEEL_DOWN' : '🖯 SCROLL OMLAAG',
	},
	'ru' : {
		'KEY_pause'               : 'PAUSE',
		'KEY_esc'                 : 'ESC',
		'KEY_space'               : 'ПРОБЕЛ',
		'KEY_delete'              : 'DELETE',
		'KEY_insert'              : 'INSERT',
		'KEY_home'                : 'HOME',
		'KEY_end'                 : 'END',
		'KEY_pageup'              : 'PAGE UP',
		'KEY_pagedown'            : 'PAGE DOWN',

		'KEY_rshift'              : 'ПРАВЫЙ SHIFT',
		'KEY_lshift'              : 'ЛЕВЫЙ SHIFT',
		'KEY_rctrl'               : 'ПРАВЫЙ CTRL',
		'KEY_lctrl'               : 'CTRL',
		'KEY_ralt'                : 'ПРАВЫЙ ALT',
		'KEY_lalt'                : 'ALT',
		
		'MOUSE_BUTTON_LEFT'       : 'ЛЕВАЯ КЛАВИША МЫШИ',
		'MOUSE_BUTTON_MIDDLE'     : 'СРЕДНЯЯ КЛАВИША МЫШИ',
		'MOUSE_BUTTON_RIGHT'      : 'ПРАВАЯ КЛАВИША МЫШИ',
		'MOUSE_BUTTON_WHEEL_UP'   : 'КОЛЁСИКО МЫШИ ВВЕРХ',
		'MOUSE_BUTTON_WHEEL_DOWN' : 'КОЛЁСИКО МЫШИ ВНИЗ',
	},
}