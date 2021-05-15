#  _______           __ ______ __                __               
# |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
# |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
# |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

# Utilities

# (c) 2021 JTSage.  MIT License.

""" Small and reusable utility functions that do not fit elsewhere """

import sys
import os

# cSpell:disable
# Added most languages FS19 seems to support.  Un-commented as translations
# become available
langList = {
	'English'             : "en",
	'Deutsch'             : "de",
	# 'Nederlands'          : "nl",
	# 'Français'            : "fr",
	# 'Español'             : "es",
	# 'Italiano'            : "it",
	# 'Magyar'              : "hu",
	# 'Português'           : "pt",
	# '中国人'               : "cs",
	# 'Português Brasileiro': "br",
	# 'Türk'                : "tr",
	# 'Română'              : "ro",
	# '日本語'               : "jp",
	# 'русский'             : "ru",
	# 'Polski'              : "pl",
	# 'Čeština'             : "cz",
	# '한국어'               : "ko",
	# 'Slovenščina'         : "sl",
}
# cSpell:enable

def set_locale(thisLocale) :
	"""Set the chosen locale for the locale package (number formats)

	Args:
		thisLocale (str): String locale, probably 2-letter that matches FS19 language code

	Issues:
		This is going to break if/when we have a Brazillian Portuguese translation. "br" is *not* the Brazillian locale, but we might get away with it because the number format might be right anyway.
	"""
	import locale
	locale.setlocale(locale.LC_ALL, thisLocale)

def get_lang_list() :
	""" Get a list of languages (picker widget) """
	return [x for x in langList.keys()]

def get_lang_code(lang) :
	"""Get language code from text language name

	Args:
		lang (str): Full language name

	Returns:
		str: Language code
	"""
	return langList[lang]

def get_resource_path(relative_path) :
	"""Get absolute path to resource, works for dev and for PyInstaller

	Args:
		relative_path (str): String path

	Returns:
		str: String path, normailzed or MEIPASS prefixed.
	"""
	try:
		base_path = sys._MEIPASS # pylint: disable=no-member
	except AttributeError:
		base_path = os.path.abspath(".")

	return os.path.join(base_path, relative_path)