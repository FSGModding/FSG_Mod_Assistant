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
const ft_known = new Set(["cat-attach-has","cat-attach-need","cat-brand","cat-object","cat-placeable","cat-tool","cat-vehicle","fill-air","fill-alfalfa","fill-alfalfawindrow","fill-anhydrous","fill-armoire","fill-balenet","fill-baletwine","fill-balewrap","fill-barley","fill-barleycut","fill-barrel","fill-bathtub","fill-beer","fill-birdhouse","fill-boards","fill-bowl","fill-bread","fill-bucket","fill-buffalo","fill-buffalomilkbottled","fill-buffalomozzarella","fill-butter","fill-cake","fill-cannedpeas","fill-canola","fill-canolacut","fill-carrot","fill-cartonroll","fill-cattree","fill-cement","fill-cementbrick","fill-cereals","fill-chaff","fill-chair","fill-cheese","fill-chicken","fill-chilli","fill-chips","fill-chocolate","fill-clothes","fill-clover","fill-cloverwindrow","fill-compost","fill-corncut","fill-cotton","fill-cow","fill-cowmilkbottled","fill-def","fill-diesel","fill-digestate","fill-dog","fill-doghouse","fill-dryalfalfawindrow","fill-drycloverwindrow","fill-drygrasswindrow","fill-drymaize2","fill-easel","fill-egg","fill-electriccharge","fill-emptybottle","fill-emptypallet","fill-enoki","fill-fabric","fill-fermentednapacabbage","fill-fertilizer","fill-floortiles","fill-flour","fill-forage","fill-foragemix","fill-furniture","fill-garlic","fill-goat","fill-goatcheese","fill-goatmilkbottled","fill-grape","fill-grapejuice","fill-grass","fill-grasswindrow","fill-greenbean","fill-haypellets","fill-herbicide","fill-honey","fill-horse","fill-ironore","fill-jarredgreenbeans","fill-lettuce","fill-lime","fill-liquidfertilizer","fill-liquidmanure","fill-maize","fill-manure","fill-metal","fill-methane","fill-milkbuffalo","fill-milkcow","fill-milkgoat","fill-milkoat","fill-milksoy","fill-mineralfeed","fill-napacabbage","fill-noodlesoup","fill-oat","fill-oatcut","fill-oatmilkbottled","fill-oilcanola","fill-oilcorn","fill-oilolive","fill-oilradish","fill-oilsoy","fill-oilsunflower","fill-olive","fill-oyster","fill-pancake","fill-paperroll","fill-parsnip","fill-pea","fill-peppergrinder","fill-piano","fill-pictureframe","fill-pig","fill-pigfood","fill-plankslong","fill-popcorn","fill-poplar","fill-potato","fill-prefabwall","fill-preservedfoodbeetroot","fill-preservedfoodcarrot","fill-preservedfoodparsnip","fill-pressurewasheradditive","fill-product","fill-propane","fill-raisins","fill-redbeet","fill-redcabbage","fill-rice","fill-ricebags","fill-riceboxes","fill-riceflour","fill-ricelonggrain","fill-riceoil","fill-ricerolls","fill-ricesaplings","fill-roadsalt","fill-rockpowder","fill-roofplate","fill-rope","fill-roundbalecotton","fill-roundbalegrass","fill-roundbalehay","fill-roundbalesilage","fill-roundbalestraw","fill-roundbalewood","fill-rye","fill-seeds","fill-seedtreatingliquid","fill-sheep","fill-shingle","fill-silage","fill-silageadditive","fill-snow","fill-sodiumchloride","fill-sorghum","fill-sorghumcut","fill-soupcan","fill-soupcanbeetroot","fill-soupcancarrot","fill-soupcanparsnip","fill-soupcanpotato","fill-soybean","fill-soybeancut","fill-soyflour","fill-soymilkbottled","fill-spelt","fill-spinach","fill-spinachbags","fill-springonion","fill-squarebalecotton","fill-squarebalegrass","fill-squarebalehay","fill-squarebalesilage","fill-squarebalestraw","fill-squarebalewood","fill-stagecoach","fill-staircaserailing","fill-stone","fill-straw","fill-strawberry","fill-strawpellets","fill-sugar","fill-sugarbeet","fill-sugarbeetcut","fill-sugarcane","fill-sun","fill-sunflower","fill-table","fill-tarp","fill-tomato","fill-toytractor","fill-unknown","fill-water","fill-weed","fill-wheat","fill-wheatcut","fill-whiskey","fill-wine","fill-wood","fill-woodbeam","fill-woodchips","fill-wool","look-beacons","look-diesel","look-electric","look-engine","look-fillunit","look-income","look-info","look-key","look-lights","look-methane","look-objects","look-paintable","look-price","look-prod-cycle","look-prod-input","look-prod-output","look-speed","look-speedlimit","look-timer","look-transmission","look-weight","look-wheels","look-width","look-year","ma-large","ma-small","season-fall","season-spring","season-summer","season-winter","sort-down","sort-none","sort-up","ver-13","ver-15","ver-17","ver-19","ver-22","ver-25","weather-1","weather-2","weather-3","weather-4","weather-5","weather-6","weather-7","weather-8","weather-9"])
/* eslint-enable comma-spacing, quotes */

const ft_map = {
	'barleyflour'                   : 'flour',
	'beanstraw'                     : 'soybeancut',
	'beetroot'                      : 'redbeet',
	'canolaoil'                     : 'oilcanola',
	'cardboard'                     : 'cartonroll',
	'carton-roll'                   : 'cartonroll',
	'cereal'                        : 'cereals',
	'chaffsilage'                   : 'silage',
	'concentrate'                   : 'mineralfeed',
	'corn'                          : 'maize',
	'corndryer'                     : 'drymaize2',
	'cornstalks'                    : 'corncut',
	'cottonroundbale'               : 'roundbalecotton',
	'cottonsquarebale'              : 'squarebalecotton',
	'digestaterawmethane'           : 'methane',
	'dryalfalfa'                    : 'dryalfalfawindrow',
	'dryclover'                     : 'drycloverwindrow',
	'drymaize2'                     : 'drymaize2',
	'eggs'                          : 'egg',
	'emptypallets'                  : 'emptypallet',
	'europallet'                    : 'emptypallet',
	'fabriccotton'                  : 'fabric',
	'fabricwool'                    : 'fabric',
	'factorypower'                  : 'electriccharge',
	'fermenterslurry'               : 'liquidmanure',
	'firtree'                       : 'wood',
	'foragemixing'                  : 'foragemix',
	'grape-juice'                   : 'grapejuice',
	'grapes'                        : 'grape',
	'grasscut'                      : 'grasswindrow',
	'grassdryer'                    : 'drygrasswindrow',
	'grasssilage'                   : 'silage',
	'gsicorndryer'                  : 'drymaize2',
	'hay'                           : 'drygrasswindrow',
	'haysilage'                     : 'silage',
	'herbizidproduktion'            : 'herbicide',
	'hudeuropallet'                 : 'emptypallet',
	'liquidfermenterslurry'         : 'liquidmanure',
	'manurein'                      : 'manure',
	'milk'                          : 'milkcow',
	'oatflour'                      : 'flour',
	'oilseedradish'                 : 'oilradish',
	'oliveoil'                      : 'oilolive',
	'olives'                        : 'olive',
	'palletfurniture'               : 'furniture',
	'palletherbicide'               : 'herbicide',
	'palletprowash'                 : 'pressurewasheradditive',
	'palletseeds'                   : 'seeds',
	'palletseedtreatingliquid'      : 'seedtreatingliquid',
	'palletsilageadditive'          : 'silageadditive',
	'palletsolidfertilizerl'        : 'fertilizer',
	'pallettreesaplings'            : 'wood',
	'pigfoodmixer'                  : 'pigfood',
	'planks'                        : 'boards',
	'poplartree'                    : 'poplar',
	'poppy'                         : 'mohn',
	'potatochips'                   : 'chips',
	'potatoe'                       : 'potato',
	'potatoes'                      : 'potato',
	'potatos'                       : 'potato',
	'rawmethane'                    : 'methane',
	'roundbale'                     : 'roundbalestraw',
	'silagein'                      : 'silage',
	'slurry'                        : 'liquidmanure',
	'sodiumchlorid'                 : 'sodiumchloride',
	'soldableelectricity'           : 'electriccharge',
	'soldablemethane'               : 'methane',
	'solidfertilizer'               : 'fertilizer',
	'sorghumflour'                  : 'flour',
	'soybeans'                      : 'soybean',
	'soybeanstraw'                  : 'soybeancut',
	'soymilk'                       : 'milksoy',
	'squarebale'                    : 'squarebalestraw',
	'stones'                        : 'stone',
	'storablefermentationresidue'   : 'digestate',
	'storablemethane'               : 'methane',
	'strawberries'                  : 'strawberry',
	'strawpellets'                  : 'strawpellets',
	'strawroundbale'                : 'roundbalestraw',
	'strawsquarebale'               : 'squarebalestraw',
	'sugarbeetcutin'                : 'sugarbeetcut',
	'sugarbeetcutsugar'             : 'sugar',
	'sugarbeetsugar'                : 'sugar',
	'sugarcanesugar'                : 'sugar',
	'sunfloweroil'                  : 'oilsunflower',
	'sunflowers'                    : 'sunflower',
	'tmrmixer'                      : 'foragemix',
	'tomatoes'                      : 'tomato',
	'treesapling'                   : 'wood',
	'treesaplings'                  : 'wood',
	'wheatflour'                    : 'flour',
	'wind'                          : 'air',
	'woodchipsroundbale'            : 'roundbalewood',
	'woodchipssquarebale'           : 'squarebalewood',
	'woodwoodbeams'                 : 'woodbeam',
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
	sanitizedName = sanitizedName.replaceAll('-', '')

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