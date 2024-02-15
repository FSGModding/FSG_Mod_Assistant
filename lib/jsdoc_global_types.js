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

/**
 * @typedef badgeHandleList
 * @type {Array}
 * @property {string} [0] key
 * @property {Array} [1] [class list, translated title]
 */

/**
 * @typedef saveManageRecord_return
 * @type {Object}
 * @property {Array.<saveManageRecord>} active Active saves
 * @property {Array.<saveManageRecord>} backups Backup saves
 */
/**
 * @typedef saveManageRecord
 * @type {Object}
 * @description Record of a savegame
 * @property {boolean} error true if error
 * @property {Array.<saveManageRecord_farm>} farms farms in save
 * @property {string} map map name in use
 * @property {number} modCount number of mods
 * @property {number} playTime play time
 * @property {string} saveDate save date, YYYY-MM-DD
 * @property {string} uuid HTML id safe ID
 * @property {string} fileDate file mtime
 * @property {string} fullName name of save folder
 * @property {string} fullPath path and folder for save
 */

/** 
 * @typedef saveTrackRecord
 * @type {Object}
 * @description tracking of a savegame
 * @property {Array.<modRecord_shortName>} mods mods in active
 * @property {string} saveID name of savegame
 * @property {Array.<saveTrack_byDate>} byDate backups by date
 */

/**
 * @typedef saveTrack_byDate
 * @type {Object}
 * @description Each backup of a save
 * @property {string} date date of backup
 * @property {boolean} duplicate mods the same as active save
 * @property {Array.<modRecord_shortName>} mods mods in save
 * @property {Array.<modRecord_shortName>} onlyBackup mods only in this backup
 * @property {Array.<modRecord_shortName>} onlyOriginal mods not in this backup
 */

/**
 * @typedef saveManageRecord_farm
 * @type {Object}
 * @description Farm in the save
 * @property {number} color index
 * @property {number} id index
 * @property {number} loan amount
 * @property {number} money amount
 * @property {string} name name of the farm
 */

/**
 * @typedef saveFileCheckerRecord
 * @type {Object}
 * @description save file check record
 * @property {Array} errorList Array of errors
 * @property {Object} farms Farms { id : farm Name }
 * @property {?string} mapMod Map name, null on error
 * @property {Object.<saveFileCheckerRecord_mods>} mods Mods found in save, key is shortName
 * @property {boolean} singleFarm Single farm save
 */

/**
 * @typedef saveFileCheckerRecord_mods
 * @type {Object}
 * @description Mod record from save
 * @property {string} version
 * @property {string} title
 * @property {Set} farms farms this is used on (by index)
 */

/**
 * @typedef modCollect_mods
 * @type {Object.<modRecord_uuid, modRecord>}
 * @description List of mods
 */

/**
 * @typedef modCollect_collection
 * @type {Object}
 * @description Individual collection
 * @property {modCollect_mods} mods all mod records
 * @property {Set.<modRecord_uuid>} modSet list of uuids
 * @property {number} folderSize size on disk
 * @property {Set.<modRecord_shortName>} dependSet list of shortNames
 * @property {Array.<string>} alphaSort suitable for sorting shortName + uuid
 * @property {Array.<modRecord_shortName>} requireArr array of all required mods
 * @property {Array.<modRecord_shortName.<Array.<modRecord_shortName>>>} requireBy array of individual requires
 */

/**
 * @typedef modHub_list
 * @type {Object}
 * @description ModHub data
 * @property {Object.<modRecord_shortName, number>} mods name and modhub id
 * @property {Array.<number>} last recent updates
 */

/**
 * @typedef modHub_version
 * @type {Object.<number, string>}
 * @description Last ModHub version for mods by modhub ID
 */

/**
 * @typedef modHub_record
 * @type {Object}
 * @description ModHub record for a mod
 * @property {number} id ModHub ID
 * @property {string} version last seen version
 * @property {boolean} recent Mod was recently updated
 */

/**
 * @typedef subWindow_def
 * @type {Object}
 * @description Set up for a sub window
 * @property {string} winName Window name, no spaces
 * @property {string} HTMLFile file to load
 * @property {subWindow_args} subWindowArgs
 * @property {function} callback called on load and reload
 * @property {boolean} refocusCallback fire callback when re-focused or "re-opened"
 * @property {function} extraCloseFunc callback to run after window close
 * @property {boolean} handleURLinWin intercept external href, redirect to system default browser
 */

/**
 * @typedef subWindow_args
 * @type {Object}
 * @description Arguments for a sub window
 * @property {boolean} sizeable can be resized, true
 * @property {boolean} noChrome disable window chrome, false
 * @property {boolean} useCustomTitle use custom title bar, true
 * @property {boolean} skipTaskbar hide from taskbar, false
 * @property {boolean} noSelect do not allow user selection, true
 * @property {boolean} show show immediately, true
 * @property {boolean} parent parent window, null
 * @property {boolean} title title of window, null
 * @property {boolean} fixed position is fixed, false
 * @property {boolean} frame show frame, true
 * @property {boolean} move can be moved, true
 * @property {boolean} preload preload file, null
 * @property {boolean} fixedOnTop always on top when fixed, true
 */