failMessages = {
	first_digit        : "FILE_ERROR_NAME_STARTS_DIGIT",
	probable_copy      : "FILE_ERROR_LIKELY_COPY",
	probable_zippack   : "FILE_ERROR_LIKELY_ZIP_PACK",
	other_archive      : "FILE_ERROR_UNSUPPORTED_ARCHIVE",
	name_failed        : "FILE_ERROR_NAME_INVALID",
	garbage_file       : "FILE_ERROR_GARBAGE_FILE",
	bad_zip            : "FILE_ERROR_UNREADABLE_ZIP",
	no_modDesc         : "NOT_MOD_MODDESC_MISSING",
	bad_modDesc        : "MOD_ERROR_MODDESC_DAMAGED_RECOVERABLE",
	bad_modDesc_no_rec : "NOT_MOD_MODDESC_PARSE_ERROR",
	bad_modDesc_ver    : "NOT_MOD_MODDESC_VERSION_OLD_OR_MISSING",
	no_modVer          : "MOD_ERROR_NO_MOD_VERSION",
	no_modIcon         : "MOD_ERROR_NO_MOD_ICON",
	folder_and_zip     : "CONFLICT_ERROR_FOLDER_AND_FILE",
}

passFlags = [
	"bad_modDesc",
	"folder_and_zip"
]

let newTestArray = Object.keys(failMessages).filter(word => !passFlags.includes(word))

console.log(newTestArray);