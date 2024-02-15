/**
 * @typedef modRecord
 * @type {Object}
 * @description full mod record
 * @property {modRecord_modDesc} modDesc Basic data from modDesc.xml
 * @property {modRecord_md5Sum} md5Sum MD5 hash from location and date
 * @property {modRecord_uuid} uuid  MD5 hash from full path
 * @property {modRecord_collectKey} currentCollection Current collection of mod
 * @property {modRecord_fileDetail} fileDetail mod file details
 * @property {boolean} canNotUse Mod cannot be used in game
 * @property {modRecord_badges} badgeArray Array of badges
 * @property {Object} l10n localization from mod
 * @property {Array.<string>} issues Array of issue string keys
 */

/**
 * @typedef modRecord_badges
 * @type {Array.<string>}
 * @description modRecord badges
 * @property {string} broken mod is broken
 * @property {string} folder mod is a folder
 * @property {string} malware mod may be malware
 * @property {string} noMP mod can't do MP
 * @property {string} notmod mod isn't a mod
 * @property {string} pconly mod is PC only
 * @property {string} problem mod has a problem
 * @property {string} savegame mod is a savegame, not a mod
 */

/**
 * @typedef modRecord_md5Sum
 * @type {string}
 * @description MD5 sum from location and date
 */

/**
 * @typedef modRecord_storable
 * @type {Object}
 * @property {Array.<Array>} log Log lines generated from processing
 * @property {modRecord} record the mod record
 */

/**
 * @typedef modRecord_collectKey
 * @type {string}
 * @description special string col_[collection UUID from path]
 */

/**
 * @typedef modRecord_col_uuid
 * @type {string}
 * @description special string col_[collection UUID]__[mod UUID]
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
 * @description modDesc portion of modRecord
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

/**
 * @typedef modRecord_fileDetail
 * @type {Object}
 * @description file detail portion of modRecord
 * @property {(string|boolean)} copyName if suspected copy, original name suggestion
 * @property {Array} extraFiles Out-of-spec files in archive
 * @property {string} fileDate ISO date of file
 * @property {number} fileSize mod size
 * @property {string} fullPath full path to file
 * @property {Array.<string>} i3dFiles List of I3D files
 * @property {Array.<string>} imageDDS List of DDS files
 * @property {Array.<string>} imageNonDDS List of non-DDS images
 * @property {boolean} isFolder mod is a folder
 * @property {boolean} isSaveGame is actually a savegame
 * @property {Array.<string>} pngTexture List of PNG files
 * @property {modRecord_shortName} shortName short name of mod
 * @property {Array.<string>} spaceFiles List of files with a space in them
 * @property {Array.<string>} tooBigFiles Files out of spec for size
 */

/**
 * @typedef cropData_crop
 * @type {Object}
 * @description a single crop from the crop calendar
 * @property {number} growthTime periods of growth
 * @property {Array.<number>} harvestPeriods periods allowing harvest
 * @property {string} name l10n key
 * @property {Array.<number>} plantPeriods periods allowing planting
 */

/**
 * @typedef cropData_weather
 * @type {Object}
 * @description full weather from the crop calendar
 * @property {cropData_weather_minmax} spring spring period
 * @property {cropData_weather_minmax} summer summer period
 * @property {cropData_weather_minmax} autumn autumn period
 * @property {cropData_weather_minmax} winter winter period
 */

/**
 * @typedef cropData_weather_minmax
 * @type {Object}
 * @description a single period of the crop calendar weather
 * @property {number} min Min temperature for period
 * @property {number} max Max temperature for period
 */

/**
 * @typedef lookRecord_return
 * @type {Object}
 * @description Child process modLook return
 * @property {Array.<Array>} log Log lines generated from processing
 * @property {lookRecord} record the look record
 */

/**
 * @typedef lookRecord
 * @type {Object}
 * @description full lookRecord returned by modLook
 * @property {Object.<lookRecord_brand>} brands key is brand ID
 * @property {Object.<string>} icon key is xml storeitem, value is base64 icon
 * @property {Object.<(lookRecord_item_vehicle|lookRecord_item_place)>} items key is xml storeitem
 * @property {?string} mapImage base64 map image if available
 */

/**
 * @typedef lookRecord_brand
 * @type {Object}
 * @description lookRecord part, brand
 * @property {string} title Name of brand, translated
 * @property {string} icon Base64 webp icon
 */

/**
 * @typedef lookRecord_item_joints
 * @type {Object}
 * @description modLook record part - attacher joints
 * @property {Array.<string>} canUse types this can haul
 * @property {Array.<string>} needs types this connects to
 */

/**
 * @typedef lookRecord_item_motor
 * @type {Object}
 * @description modLook record part - motor info
 * @property {Array} hp chart.js data for HP graph
 * @property {Array} kph chart.js data for KPH graph
 * @property {Array} mph chart.js data for MPH graph
 * @property {Array} speed fallback speed
 */

/**
 * @typedef lookRecord_item_vehicle
 * @type {Object}
 * @description modLook record for a vehicle
 * @property {string} brand Brand ID, uppercase
 * @property {string} category Category Name
 * @property {number} fillLevel Fill capacity
 * @property {Array.<string>} fillTypes Valid fill types
 * @property {(string|boolean)} fuelType Type of fuel
 * @property {Array.<string>} functions Functions of item
 * @property {boolean} hasBeacons Has beacon lights
 * @property {boolean} hasColor Color can be changed
 * @property {boolean} hasLights Has lighting
 * @property {boolean} hasWheelChoice Has multiple wheel sets
 * @property {?string} icon Base64 icon
 * @property {boolean} isEnterable can be entered by player
 * @property {boolean} isMotorized has a motor
 * @property {lookRecord_item_joints} joints attacher joints
 * @property {string} masterType type of record, will be "vehicle"
 * @property {lookRecord_item_motor} motorInfo Motor graph data
 * @property {string} name name of item
 * @property {number} price price of item
 * @property {Object} specs direct info from XML specs, includes combinations if any
 * @property {number} speedLimit max speed of item
 * @property {?Object} sprayTypes spraytypes by width
 * @property {(string|boolean)} transType transmission type
 * @property {string} typeDesc type description
 * @property {number} weight weight of item (kg)
 * @property {number} year year of item
 * @property {string} uuid_name name safe for use as html ID
 */

/**
 * @typedef lookRecord_item_beehive
 * @type {Object}
 * @description modLook record part for beehives
 * @property {boolean} exist is a beehive
 * @property {number} radius area of effect
 * @property {number} liters liters per hour production
 */

/**
 * @typedef lookRecord_item_husbandry
 * @type {Object}
 * @description modLook record part for husbandry
 * @property {boolean} exists is a husbandry
 * @property {string} type animal type
 * @property {number} capacity number of animals
 */

/**
 * @typedef lookRecord_item_silo
 * @type {Object}
 * @description modLook record portion for silo
 * @property {boolean} exists is a silo
 * @property {Array.<string>} types fill types for silo
 * @property {number} capacity capacity of silo
 */

/**
 * @typedef lookRecord_item_place
 * @type {Object}
 * @description modLook Record for a placeable
 * @property {string} category Category Name
 * @property {Array.<string>} functions Functions of item
 * @property {boolean} hasColor Color can be changed
 * @property {?string} icon icon KEY
 * @property {string} masterType type of record, will be "placable"
 * @property {string} name name of item
 * @property {number} price price of item
 * @property {string} type full internal type of item
 * @property {lookRecord_item_beehive} beehive beehive details
 * @property {lookRecord_item_husbandry} husbandry husbandry details
 * @property {?number} incomePerHour income
 * @property {?number} objectStorage number of objects storable
 * @property {Array.<Object>} productions production recipe info
 * @property {lookRecord_item_silo} silo silo details
 * 
 */
