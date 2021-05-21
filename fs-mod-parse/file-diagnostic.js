//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Mod File Parser - Failure Diagnostics

// (c) 2021 JTSage.  MIT License.

module.exports = class fileFails {
	failFlags = {
		first_digit        : false,
		probable_copy      : false,
		probable_zippack   : false,
		other_archive      : false,
		name_failed        : false,
		garbage_file       : false,
		bad_zip            : false,
		no_modDesc         : false,
		bad_modDesc        : false,
		bad_modDesc_no_rec : false,
		bad_modDesc_ver    : false,
		no_modVer          : false,
		no_modIcon         : false,
	};

	get first_digit()      { return this.failFlags["first_digit"];}
	set first_digit(value) { this.failFlags["first_digit"] = this.#realBool(value); }

	get probable_copy()      { return this.failFlags["probable_copy"];}
	set probable_copy(value) { this.failFlags["probable_copy"] = this.#realBool(value); }

	get probable_zippack()      { return this.failFlags["probable_zippack"];}
	set probable_zippack(value) { this.failFlags["probable_zippack"] = this.#realBool(value); }

	get other_archive()      { return this.failFlags["other_archive"];}
	set other_archive(value) { this.failFlags["other_archive"] = this.#realBool(value); }

	get name_failed()      { return this.failFlags["name_failed"];}
	set name_failed(value) { this.failFlags["name_failed"] = this.#realBool(value); }

	get garbage_file()      { return this.failFlags["garbage_file"];}
	set garbage_file(value) { this.failFlags["garbage_file"] = this.#realBool(value); }

	get bad_zip()      { return this.failFlags["bad_zip"];}
	set bad_zip(value) { this.failFlags["bad_zip"] = this.#realBool(value); }

	get no_modDesc()      { return this.failFlags["no_modDesc"];}
	set no_modDesc(value) { this.failFlags["no_modDesc"] = this.#realBool(value); }

	get bad_modDesc()      { return this.failFlags["bad_modDesc"];}
	set bad_modDesc(value) { this.failFlags["bad_modDesc"] = this.#realBool(value); }

	get bad_modDesc_rec()      { return this.failFlags["bad_modDesc_rec"];}
	set bad_modDesc_rec(value) { this.failFlags["bad_modDesc_rec"] = this.#realBool(value); }

	get bad_modDesc_ver()      { return this.failFlags["bad_modDesc_ver"];}
	set bad_modDesc_ver(value) { this.failFlags["bad_modDesc_ver"] = this.#realBool(value); }

	get no_modVer()      { return this.failFlags["no_modVer"];}
	set no_modVer(value) { this.failFlags["no_modVer"] = this.#realBool(value); }

	get no_modIcon()      { return this.failFlags["no_modIcon"];}
	set no_modIcon(value) { this.failFlags["no_modIcon"] = this.#realBool(value); }

	get isBad() {
		for (const [key, value] of Object.entries(this.failFlags)) {
			if ( value === true ){
				return true;
			}
		};
		return false;
	}

	get isGood() {
		return !this.IsBad;
	}

	get diagnoseMessage() {
		var errorMessages = [];
		if ( this.failFlags["garbage_file"] ) {
			errorMessages.push("FILE_ERROR_GARBAGE_FILE");
		}

		if ( this.failFlags["bad_zip"] ) {
			errorMessages.push("FILE_ERROR_UNREADABLE_ZIP");
		}
		
		if ( this.failFlags["first_digit"] ) {
			errorMessages.push("FILE_ERROR_NAME_STARTS_DIGIT");
		}

		if ( this.failFlags["no_modDesc"] ) {
			errorMessages.push("NOT_MOD_MODDESC_MISSING");
		}

		if ( this.failFlags["bad_modDesc_no_rec"] ) {
			errorMessages.push("NOT_MOD_MODDESC_PARSE_ERROR");
		}

		if ( this.failFlags["bad_modDesc_ver"] ) {
			errorMessages.push("NOT_MOD_MODDESC_VERSION_OLD_OR_MISSING");
		}

		if ( this.failFlags["no_modVer"] ) {
			errorMessages.push("MOD_ERROR_NO_MOD_VERSION");
		}

		if ( this.failFlags["no_modIcon"] ) {
			errorMessages.push("MOD_ERROR_NO_MOD_ICON");
		}

		if ( this.failFlags["name_failed"] ) {
			errorMessages.push("FILE_ERROR_NAME_INVALID");
		}

		if ( this.failFlags["bad_modDesc"] ) {
			errorMessages.push("MOD_ERROR_MODDESC_DAMAGED_RECOVERABLE");
		}

		if ( this.failFlags["probable_copy"] ) {
			errorMessages.push("FILE_ERROR_LIKELY_COPY");
		}

		if ( this.failFlags["probable_zippack"] ) {
			errorMessages.push("FILE_ERROR_LIKELY_ZIP_PACK");
		}

		if ( this.failFlags["other_archive"] ) {
			errorMessages.push("FILE_ERROR_UNSUPPORTED_ARCHIVE");
		}

		return errorMessages;
	}

	#realBool(input) {
		if ( input === true || input === false ) { return input; }
		return ( input ) ? true : false;
	}

};