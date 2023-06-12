/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program
/* eslint no-console: off */

const fullPath = 'C:\\Users\\jtsag\\Documents\\My Games\\FarmingSimulator2022\\mods\\~test_mods\\'
// const modName  = 'FS22_RedBarnPack'
// const modName  = 'FSG_eTractors_Pack'
const modName  = 'FS22_AnhydrousAmmoniaPack'

const { ma_logger }         = require('../lib/ma-logger.js')
const { modLooker }         = require('../lib/modLookerLib.js')
const path = require('path')

const looker = new modLooker(
	{
		fileDetail : {
			fullPath  : path.join(fullPath, `${modName}`),
			imageDDS  : [],
			isFolder  : true,
			shortName : modName,
		},
	},
	fullPath,
	new ma_logger('multi-test'),
	'ru',
	true
)

looker.getInfo().then((result) => {
	console.dir(result, {depth : null})
})