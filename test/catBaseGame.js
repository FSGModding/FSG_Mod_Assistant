/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Base Game data generator (cat parts back together - create parts from generateBaseGame.js)
// HUGE NOTE: this doesn't work out-of-the-box, it'll run out of memory.

const {base}    = require('./bgBuilder/output/baseGameData')
const {dlc}     = require('./bgBuilder/output/baseGameData-dlc')
const {vehicle} = require('./bgBuilder/output/baseGameData-vehicle')
const {premium} = require('./bgBuilder/output/baseGameData-premium')
const {obj}     = require('./bgBuilder/output/baseGameData-nonvehicle')
const path      = require('node:path')
const fs        = require('node:fs')
const merge     = require('deepmerge')

const goodObject = merge.all([dlc, vehicle, premium, obj])


const fromBase = [
	'brandMap',
	'brandMap_icon',
	'brands',
	'category',
	'topLevel',
]

for ( const key of fromBase ) {
	goodObject[key] = base[key]
}

fs.writeFileSync(
	path.join(__dirname, '..', 'renderer', 'renderJS', 'util', 'baseGameData.js'),
	`/* eslint-disable indent, key-spacing, quotes, comma-dangle, sort-keys */\n/* cSpell:disable */\nconst client_BGData = ${JSON.stringify(goodObject, null, 2)}`
)
