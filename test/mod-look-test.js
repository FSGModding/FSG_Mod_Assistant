/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program
/* eslint no-console: off */

const isFolder = false
const fullPath = 'C:\\Users\\jtsag\\Documents\\My Games\\FarmingSimulator2022\\mods\\~test_mods\\'
// const fullPath = 'C:\\Users\\jtsag\\Documents\\My Games\\FarmingSimulator2022\\mods\\fsg_realism'
// const modName  = 'FS22_RedBarnPack'
const modName  = 'FS22_Large_Pole_Barn'
// const modName  = 'FSG_eTractors_Pack'
// const modName  = 'FSG_Color_Pack'
// const modName  = 'FS22_precisionFarming'
// const modName  = 'FS22_AnhydrousAmmoniaPack'
// const modName = 'FS22_AirFlex_Series'

const { ma_logger }         = require('../lib/ma-logger.js')
const { modLooker }         = require('../lib/modLookerLib.js')
const path = require('path')

const looker = new modLooker(
	path.join(process.cwd(), '..', 'texconv.exe'),
	process.cwd(),
	{
		fileDetail : {
			fullPath  : path.join(fullPath, `${modName}${isFolder===true?'':'.zip'}`),
			imageDDS  : [],
			isFolder  : isFolder,
			shortName : modName,
		},
	},
	fullPath,
	new ma_logger('multi-test'),
	'ru',
	false
)

looker.getInfo().then((result) => {
	console.dir(result, {depth : null})
})