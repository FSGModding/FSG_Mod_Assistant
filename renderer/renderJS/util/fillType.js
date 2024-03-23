/* ______ _____  _____  _____ _____                    
*  |  ___/  ___|/ __  \/ __  \_   _|                   
*  | |_  \ `--. `' / /'`' / /' | |  ___ ___  _ __  ___ 
*  |  _|  `--. \  / /    / /   | | / __/ _ \| '_ \/ __|
*  | |   /\__/ /./ /___./ /____| || (_| (_) | | | \__ \
*  \_|   \____/ \_____/\_____/\___/\___\___/|_| |_|___/
*    Farming Simulator HUD Fill Icons - SVG Edition
*/
// fillType element replacer

/* cSpell:disable */
/* eslint-disable comma-spacing, quotes */
const ft_known = new Set(["cat-attach-has","cat-attach-need","cat-brand","cat-object","cat-placeable","cat-tool","cat-vehicle","fill-air","fill-alfalfa","fill-alfalfa-windrow","fill-anhydrous","fill-armoire","fill-bakedpoppy","fill-balenet","fill-baletwine","fill-barley","fill-barrel","fill-bathtub","fill-beanstraw","fill-beer","fill-birdhouse","fill-boards","fill-bowl","fill-bread","fill-bucket","fill-bun","fill-butter","fill-cake","fill-canola","fill-carp","fill-carrot","fill-carrotjuice","fill-carrotsalad","fill-cartonroll","fill-cattree","fill-cereals","fill-chaff","fill-chair","fill-cheese","fill-chicken","fill-chickenfeed","fill-chips","fill-chocolate","fill-chocolateicecream","fill-clothes","fill-clover","fill-clover-windrow","fill-coleslaw","fill-compost","fill-cornstalks","fill-cotton","fill-cow","fill-cream","fill-def","fill-diesel","fill-digestate","fill-dog","fill-doghouse","fill-dryalfalfa-windrow","fill-dryclover-windrow","fill-drygrass-windrow","fill-drymaize2","fill-duck","fill-easel","fill-egg","fill-electriccharge","fill-emptypallet","fill-ethanol","fill-fabric","fill-fertilizer","fill-fishfeed","fill-fishflour","fill-floortiles","fill-flour","fill-forage","fill-forage-mixing","fill-frenchfries","fill-furniture","fill-goat","fill-goatcheese","fill-goatmilk","fill-grape","fill-grapejuice","fill-grass","fill-grass-windrow","fill-greensalad","fill-haypellets","fill-herbicide","fill-honey","fill-horse","fill-ironore","fill-lettuce","fill-lime","fill-liquidfertilizer","fill-liquidmanure","fill-maize","fill-manure","fill-mashedpotato","fill-metal","fill-methane","fill-milk","fill-mineralfeed","fill-mohn","fill-molasses","fill-oat","fill-oatdrink","fill-oatmeal","fill-oatmilk","fill-oilradish","fill-oil-canola","fill-oil-olive","fill-oil-sunflower","fill-olive","fill-onion","fill-onionjuice","fill-paperroll","fill-parsnip","fill-pasta","fill-peppergrinder","fill-pickle-carrot","fill-pickle-parsnip","fill-pickle-redbeet","fill-pictureframe","fill-pig","fill-pigfood","fill-pike","fill-pizza","fill-plankslong","fill-pomace","fill-poplar","fill-poppyseedbun","fill-potato","fill-potatopancake","fill-potatosalad","fill-praline","fill-prefabwall","fill-pressurewasheradditive","fill-product","fill-propane","fill-raisins","fill-redbeet","fill-redcabbage","fill-roadsalt","fill-rockpowder","fill-roundbalecotton","fill-roundbalegrass","fill-roundbalehay","fill-roundbalesilage","fill-roundbalestraw","fill-roundbalewood","fill-rye","fill-salmon","fill-salt","fill-seeds","fill-seedtreatingliquid","fill-sheep","fill-shingle","fill-silage","fill-silageadditive","fill-snow","fill-sodiumchloride","fill-sorghum","fill-soup-carrot","fill-soup-parsnip","fill-soup-potato","fill-soup-redbeet","fill-soup-triple","fill-soybean","fill-soydrink","fill-soyflour","fill-soymilk","fill-spelt","fill-squarebalecotton","fill-squarebalegrass","fill-squarebalehay","fill-squarebalesilage","fill-squarebalestraw","fill-squarebalewood","fill-staircaserailing","fill-stone","fill-straw","fill-strawberry","fill-strawberrycreamcake","fill-strawberryicecream","fill-strawpellets","fill-strwberryjuice","fill-sugar","fill-sugarbeet","fill-sugarbeetcut","fill-sugarcane","fill-sunflower","fill-table","fill-tarp","fill-tomato","fill-tomatojuice","fill-tomatosalad","fill-unknown","fill-vinegar","fill-vitamins","fill-water","fill-weed","fill-wheat","fill-wheatsemolina","fill-whiskey","fill-whitecabbage","fill-wine","fill-wood","fill-woodbeam","fill-woodchips","fill-wool","look-beacons","look-diesel","look-electric","look-engine","look-fillunit","look-income","look-info","look-key","look-lights","look-methane","look-objects","look-paintable","look-price","look-prod-cycle","look-prod-input","look-prod-output","look-speed","look-speedlimit","look-timer","look-transmission","look-weight","look-wheels","look-width","look-year","ma-large","ma-small","season-fall","season-spring","season-summer","season-winter","sort-down","sort-none","sort-up","ver-13","ver-15","ver-17","ver-19","ver-22","weather-1","weather-2","weather-3","weather-4","weather-5","weather-6","weather-7","weather-8","weather-9"])
/* eslint-enable comma-spacing, quotes */

const ft_map = {
	'barley-flour'                  : 'flour',
	'canola-oil'                    : 'oil-canola',
	'canolaoil'                     : 'oil-canola',
	'cardboard'                     : 'palletroll',
	'carton-roll'                   : 'cartonroll',
	'cereal'                        : 'cereals',
	'chaff-silage'                  : 'silage',
	'concentrate'                   : 'mineralfeed',
	'corn'                          : 'maize',
	'corn-dryer'                    : 'drymaize2',
	'cottonroundbale'               : 'roundbalecotton',
	'cottonsquarebale'              : 'squarebalecotton',
	'digestate-raw-methane'         : 'methane',
	'dry-maize2'                    : 'drymaize2',
	'dryalfalfa'                    : 'dryalfalfa-windrow',
	'dryclover'                     : 'dryclover-windrow',
	'eggs'                          : 'egg',
	'empty-pallets'                 : 'emptypallet',
	'fabric-cotton'                 : 'fabric',
	'fabric-wool'                   : 'fabric',
	'factory-power'                 : 'electriccharge',
	'fermenter-slurry'              : 'liquidmanure',
	'firtree'                       : 'wood',
	'foragemix'                     : 'forage-mixing',
	'grape-juice'                   : 'grapejuice',
	'grapes'                        : 'grape',
	'grass-dryer'                   : 'drygrass-windrow',
	'grass-silage'                  : 'silage',
	'grasscut'                      : 'grass-windrow',
	'gsi-corn-dryer'                : 'drymaize2',
	'hay'                           : 'drygrass-windrow',
	'hay-pellets'                   : 'haypellets',
	'hay-silage'                    : 'silage',
	'herbizidproduktion'            : 'herbicide',
	'hud-europallet'                : 'emptypallet',
	'liquid-fermenter-slurry'       : 'liquidmanure',
	'manure-in'                     : 'manure',
	'mineral-feed'                  : 'mineralfeed',
	'oat-flour'                     : 'flour',
	'oilseedradish'                 : 'oilradish',
	'olive-oil'                     : 'oil-olive',
	'oliveoil'                      : 'oil-olive',
	'olives'                        : 'olive',
	'pallet-furniture'              : 'furniture',
	'pallet-herbicide'              : 'herbicide',
	'pallet-pro-wash'               : 'pressurewasheradditive',
	'pallet-seed-treating-liquid'   : 'seedtreatingliquid',
	'pallet-seeds'                  : 'seeds',
	'pallet-silage-additive'        : 'silageadditive',
	'pallet-solid-fertilizerl'      : 'fertilizer',
	'pallet-tree-saplings'          : 'wood',
	'paper-roll'                    : 'paperroll',
	'pigfood-mixer'                 : 'pigfood',
	'planks'                        : 'boards',
	'poplartree'                    : 'poplar',
	'potatochips'                   : 'chips',
	'potatoe'                       : 'potato',
	'potatoes'                      : 'potato',
	'potatos'                       : 'potato',
	'rawmethane'                    : 'methane',
	'round-bale-cotton'             : 'roundbalecotton',
	'roundbale'                     : 'roundbalestraw',
	'silage-additive'               : 'silageadditive',
	'silage-in'                     : 'silage',
	'slurry'                        : 'liquidmanure',
	'soldable-electricity'          : 'electriccharge',
	'soldable-methane'              : 'methane',
	'solid-fertilizer'              : 'fertilizer',
	'solidfertilizer'               : 'fertilizer',
	'sorghum-flour'                 : 'flour',
	'soybeans'                      : 'soybean',
	'soybeanstraw'                  : 'beanstraw',
	'spaghetti'                     : 'pasta',
	'square-bale-grass'             : 'squarebalegrass',
	'square-bale-silage'            : 'squarebalesilage',
	'square-bale-straw'             : 'squarebalestraw',
	'squarebale'                    : 'squarebalestraw',
	'stones'                        : 'stone',
	'storable-fermentation-residue' : 'digestate',
	'storable-methane'              : 'methane',
	'straw-pellets'                 : 'strawpellets',
	'strawberries'                  : 'strawberry',
	'strawroundbale'                : 'roundbalestraw',
	'strawsquarebale'               : 'squarebalestraw',
	'sugar-beet'                    : 'sugarbeet',
	'sugar-beet-cut'                : 'sugarbeetcut',
	'sugar-beet-cut-sugar'          : 'sugar',
	'sugar-beet-sugar'              : 'sugar',
	'sugarbeet-cut'                 : 'sugarbeetcut',
	'sugarbeetcut-in'               : 'sugarbeetcut',
	'sugarcane-sugar'               : 'sugar',
	'sunflower-oil'                 : 'oil-sunflower',
	'sunfloweroil'                  : 'oil-sunflower',
	'sunflowers'                    : 'sunflower',
	'tmr-mixer'                     : 'forage-mixing',
	'tomatoes'                      : 'tomato',
	'tree-saplings'                 : 'wood',
	'treesaplings'                  : 'wood',
	'wheat-flour'                   : 'flour',
	'wood-wood-beams'               : 'woodbeam',
	'woodchipsroundbale'            : 'roundbalewood',
	'woodchipssquarebale'           : 'squarebalewood',
}
/* cSpell:enable */

const ft_getAttrib = (element, attrib) => {
	const attribValue = element.getAttribute(attrib)

	return ( typeof attribValue !== 'string' || attribValue === null ) ? null :	attribValue.toLowerCase()
}

const ft_normalizeName = (name) => {
	if ( name === null ) { return null }
	let sanitizedName = name

	sanitizedName = sanitizedName.replaceAll(/[()[\]]/g, '')
	sanitizedName = sanitizedName.replace(/\.png$/, '')
	sanitizedName = sanitizedName.replace(/\.jpg$/, '')
	sanitizedName = sanitizedName.replace(/\.dds$/, '')
	sanitizedName = sanitizedName.replaceAll('_', '-')
	sanitizedName = sanitizedName.replace(/^fs22/, '')
	sanitizedName = sanitizedName.replace(/^hud-fill-/, '')
	sanitizedName = sanitizedName.replace(/^fill-/, '')
	sanitizedName = sanitizedName.replace(/^silo-/, '')
	sanitizedName = sanitizedName.replace(/^big-bag-/, '')

	if ( typeof ft_map[sanitizedName] !== 'undefined' ) {
		sanitizedName = ft_map[sanitizedName]
	}

	const addFill = `fill-${sanitizedName}`

	if ( ft_known.has(addFill) ) { return [addFill, sanitizedName] }

	/* eslint-disable no-console */
	console.error(`${name} not found (maybe ${sanitizedName} or ${addFill})`)
	return ['fill-unknown', name]
	/* eslint-enable no-console */
}

const ft_doReplace = () => {
	for ( const element of document.querySelectorAll('fillType') ) {
		const thisName = ft_getAttrib(element, 'name')
		const thisIcon = ft_normalizeName(thisName)
		if ( thisIcon === null ) { continue }
		element.innerHTML = `<i title="${thisIcon[1]}" class="fsico-${thisIcon[0]}"></i>`
	}
}

window.addEventListener('DOMContentLoaded', () => { ft_doReplace() })