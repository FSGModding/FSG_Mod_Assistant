/**
 * @typedef modRecord
 * @type {Object}
 * @property {modRecord_modDesc} modDesc Basic data from modDesc.xml
 * @property {string} md5Sum MD5 hash from location and date
 * @property {modRecord_uuid} uuid  MD5 hash from full path
 * @property {modRecord_collectKey} currentCollection Current collection of mod
 */

/**
 * @typedef modRecord_collectKey
 * @type {string}
 * @description col_[collection UUID from path]
 */

/**
 * @typedef modRecord_col_uuid
 * @type {string}
 * @description col_[collection UUID]__[mod UUID]
 */

/**
 * @typedef modRecord_uuid
 * @type {string}
 * @description MD5 hash from full path of file
 */

/**
 * @typedef modRecord_shortName
 * @type {string}
 * @description Part of the mod filename before the .ZIP
 */

/**
 * @typedef modRecord_modDesc
 * @type {Object}
 * @property {Object} actions Possible keyboard actions
 * @property {string} author Mod author
 * @property {Object} binds Keybinds
 * @property {modRecord_cropInfo} cropInfo crop info or false
 * @property {modRecord_cropWeather} cropWeather crop weather
 * @property {Array.<modRecord_shortName>} depend Dependents
 * @property {number} descVersion descVersion
 * @property {(string|boolean)} iconFileName icon filename or false
 * @property {?string} iconImageCache icon base64 or null
 * @property {?string} mapConfigFile map config file
 * @property {boolean} mapIsSouth map is in southern hemisphere
 * @property {boolean} multiPlayer can be used multiplayer
 * @property {number} scriptFiles number of script files
 * @property {number} storeItems number of store items
 * @property {string} version version of mod
 */