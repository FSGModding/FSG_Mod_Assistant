/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program
/* eslint no-console: off */

const isFolder = false
// const fullPath = 'C:\\Users\\jtsag\\Documents\\My Games\\FarmingSimulator2022\\mods\\~test_mods\\'
const fullPath = 'C:\\Users\\jtsag\\Documents\\My Games\\FarmingSimulator2022\\mods\\fsg_realism\\'
const modName  = 'FS22_RedBarnPack'
// const modName  = 'FS22_Large_Pole_Barn'
// const modName  = 'FS22_LimeAndSugarbeetCutProduction'
// const modName  = 'FSG_eTractors_Pack'
// const modName  = 'FSG_Color_Pack'
// const modName  = 'FS22_precisionFarming'
// const modName  = 'FS22_AnhydrousAmmoniaPack'
// const modName  = 'FS22_AugerMaster'
// const modName  = 'FS22_AirFlex_Series'

const { ma_logger, ddsDecoder } = require('../lib/modUtilLib.js')
const { modLooker }             = require('../lib/modCheckLib.js')
const path = require('path')

const log        = new ma_logger('look-test')
const iconParser = new ddsDecoder(path.join(process.cwd(), '..', 'texconv.exe'), path.join(__dirname, 'temp'), log)

const looker = new modLooker(
	iconParser,
	{
		fileDetail : {
			fullPath  : path.join(fullPath, `${modName}${isFolder===true?'':'.zip'}`),
			imageDDS  : [],
			isFolder  : isFolder,
			shortName : modName,
		},
	},
	fullPath,
	log,
	'en',
	true
)

looker.getInfo().then((result) => {
	console.dir(result, {depth : null})
})