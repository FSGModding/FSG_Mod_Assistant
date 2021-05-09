#  _______           __ ______ __                __               
# |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
# |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
# |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

# Utilities

# (c) 2021 JTSage.  MIT License.
import sys
import os

def set_win32_lang() :
	if sys.platform.startswith('win'):
		import locale
		if os.getenv('LANG') is None:
			lang, enc = locale.getdefaultlocale() # pylint: disable=unused-variable
			os.environ['LANG'] = lang

def get_resource_path(relative_path) :
	# Get absolute path to resource, works for dev and for PyInstaller
	#
	# This bit is needed for the created .EXE file
	try:
		# PyInstaller creates a temp folder and stores path in _MEIPASS
		base_path = sys._MEIPASS # pylint: disable=no-member
	except AttributeError:
		base_path = os.path.abspath(".")

	return os.path.join(base_path, relative_path)