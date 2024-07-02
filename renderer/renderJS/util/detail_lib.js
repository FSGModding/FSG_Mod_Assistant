/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// FSG Mod Assist Utilities (detail windows)

/* global Chart, client_BGData, ST */ //, fsgUtil, __, _l */

const _f = (type, width = '2rem') => `<fillType style="font-size: ${width}" name="${type}"></fillType>`

const dtLib = {
	
	
	getDataTypes : (type) => ( typeof ST.typeMap[type] !== 'undefined' ) ? ST.typeMap[type] : ST.typeMap.default,


	safeBrandFromRecord : ( brand, lookRecord, { extraHTML = null, width = '12vw' } = {} ) => {
		if ( typeof lookRecord?.brands?.[brand]?.icon !== 'undefined' ) {
			return ST.safeStaticImage(lookRecord.brands[brand].icon, { extraHTML : extraHTML, width : width })
		}
		return ST.safeBrandImage(brand, { extraHTML : extraHTML, width : width })
	},
	safeBrandImage : ( brand, { extraHTML = null, width = '12vw' } = {} ) => {
		const testBrand = ST.checkBrand(brand)
		if ( ! testBrand && brand !== null && typeof brand !== 'undefined' ) { window.log.warning(`Missing Brand: ${brand}`, 'basegame_ui')}
		return ST.safeStaticImage(testBrand ? `img/brand/brand_${testBrand}.webp` : null, { width : width, extraHTML : extraHTML })
	},
	safeDataImage : (imgData, { extraHTML = null, width = '12vw' } = {}) => {
		if ( ! fsgUtil.onlyText(imgData) ) { return '' }

		return ST.safeStaticImage(imgData.startsWith('data:') ? imgData : `img/baseCategory/${imgData}.webp`, { width : width, extraHTML : extraHTML })
	},
	safeGameIcon : (icon, { width = '10vw' } = {}) =>
		typeof icon !== 'string' ?
			'' :
			icon.startsWith('fill-') ?
				`<fillType style="font-size : ${width}" name="${icon.substring(5)}"></fillType>` :
				`<i style="font-size : ${width}" class="fsico-${icon}"></i>`,
	safeStaticImage : (imgSrc, { extraHTML = null, width = '12vw'}) => imgSrc === null ?
		'' :
		`${extraHTML !== null ? extraHTML : ''}<img class="mb-3 rounded-2" style="width: ${width}" src="${imgSrc}">`,
	

	





	getCleanParentID  : ( parentFile ) => {
		if ( typeof parentFile !== 'string' ) { return null }
		const attemptKey = parentFile.replace('.xml', '').replace('$data/', '').replaceAll('/', '_')
		return ( typeof client_BGData.records[attemptKey] !== 'undefined' ) ? attemptKey : null
	},

	

	wrap : {
		item : ( itemID ) => {
			const thisItem         = client_BGData.records[itemID]
			const thisItemData     = ST.getInfo(thisItem)
			let   dataItems        = null
			const attemptKey       = ST.getCleanParentID(thisItem.parentFile)

			if ( attemptKey !== null ) {
				const attemptItem = client_BGData.records[attemptKey]
				const newItemData = ST.getInfo(attemptItem)
				dataItems = ST.getDataTypes(attemptItem.type).map((x) => ST.doDataType(x, newItemData[x])).join('')
			} else {
				dataItems = ST.getDataTypes(thisItem.type).map((x) => ST.doDataType(x, thisItemData[x])).join('')
			}
			
			return fsgUtil.useTemplate('store_item', {
				brandString    : ST.safeBrandImage(thisItem.brand, { extraHTML : '<br>' }),
				dataItems      : dataItems,
				dlc            : thisItem.dlcKey !== null ? thisItem.dlcKey : '',
				hasParentFile  : attemptKey !== null ? 'notRealItem' : '',
				iconString     : ST.safeDataImage(thisItem.icon),
				name           : __(thisItem.name, { skipIfNotBase : true }),
				page           : attemptKey !== null ? attemptKey : itemID,
				showCompButton : thisItem.masterType === 'vehicle' ? '' : 'd-none',
			})
		},
		pRow  : (content) => `<div class="d-flex flex-wrap justify-content-center align-items-center">${content}</div>`,
		pRowS : (icon, amount = '') => ST.wrap.pRow(`${icon}${amount}`),
		row : (HTMLArray, extraClass = 'g-2')  =>
			`<div class="row ${extraClass}">${ typeof HTMLArray !== 'object' ? HTMLArray : HTMLArray.join('') }</div>`,
		single : ({ name = null, brand = null, icon = null, fsIcon = null, type = 'item', page = null, noTrans = false} = {}) =>
			[
				'<div class="col-2 text-center">',
				'<div class="p-2 border rounded-3 h-100">',
				`<a class="text-decoration-none text-white-50" href="?type=${type}&page=${page}">`,
				`${ST.safeDataImage(icon)}${ST.safeBrandImage(brand)}${ST.safeGameIcon(fsIcon)}<br />`,
				`${__(name, { skipAlways : noTrans })}</a></div></div>`
			].join(''),
	},

	doProductions : (prodRecords) => {
		if ( typeof prodRecords === 'undefined' || prodRecords === null ) { return ''}
		const prodHTML = []
	
		for ( const thisProduction of prodRecords ) {
			const cycleMultiplier = thisProduction.cycles
	
			const inputHTML = []
	
			for ( const inputMix in thisProduction.inputs ) {
				if ( inputMix !== 'no_mix' ) {
					inputHTML.push(ST.wrap.pRow(
						thisProduction.inputs[inputMix].map((x) =>
							`${ST.numFmtMulti(x.amount, cycleMultiplier)}${_f(x.filltype)}`
						).join('<i class="text-info bi-distribute-horizontal mx-1"></i>')
					))
				}
			}
	
			inputHTML.push(...thisProduction.inputs.no_mix.map((x) => {
				return ST.wrap.pRowS(ST.numFmtMulti(x.amount, cycleMultiplier), _f(x.filltype))
			}))
	
			if ( thisProduction.boosts.length !== 0 ) {
				inputHTML.unshift(ST.wrap.pRow(thisProduction.boosts.map((x) =>
					`<div class="d-flex align-items-center">${ST.numFmtMulti(x.amount, cycleMultiplier)}${_f(x.filltype)}<span class="ms-1">(${x.boostFac * 100}%)</span></div>`
				).join('<i class="text-info bi-plus-slash-minus mx-1"></i>')))
			}

			prodHTML.push(fsgUtil.useTemplate('prod_div', {
				prodCost         : ST.numFmtNoFrac(thisProduction.cost),
				prodCycles       : thisProduction.cycles,
				prodInputs       : inputHTML.join(ST.wrap.pRow('<i class="text-success bi-plus-lg"></i>')),
				prodName         : __(thisProduction.name, {skipIfNotBase : true}),
				prodOutput       : thisProduction.outputs.map((x) =>
					ST.wrap.pRowS(ST.numFmtMulti(x.amount, cycleMultiplier), _f(x.filltype))
				).join(ST.wrap.pRow('<i class="text-success bi-plus-lg"></i>')),
			}))
		}
		return prodHTML.join('')
	},

	doChart : (thisItem, thisItemUUID, chartUnits) => {
		return async () => {
			new Chart(
				fsgUtil.byId(`${thisItemUUID}_canvas_hp`),
				{
					type : 'line',
					data : {
						datasets : [
							...thisItem.motorInfo.hp,
						],
					},
					options : {
						interaction : {
							intersect : false,
							mode      : 'dataset',
						},
						plugins : {
							legend     : { display : false },
							tooltip    : {
								bodyAlign      : 'right',
								bodyFontFamily : 'courier',
								callbacks      : {
									label : (context) => `${context.parsed.y}${chartUnits.unit_hp} @ ${context.parsed.x} ${chartUnits.unit_rpm}`,
								},
								mode           : 'dataset',
								titleAlign     : 'center',
							},
						},
						scales  : {
							x : {
								display : true,
								title   : {
									text    : chartUnits.unit_rpm,
									display : true,
								},
								type    : 'linear',
							},
							y : {
								
								display  : true,
								position : 'left',
								title    : {
									text    : chartUnits.unit_hp,
									display : true,
								},
								type     : 'linear',
							},
						},
						stacked : false,
					},
				}
			)
			new Chart(
				fsgUtil.byId(`${thisItemUUID}_canvas_kph`),
				{
					type : 'line',
					data : {
						datasets : [
							...thisItem.motorInfo.kph,
						],
					},
					options : {
						interaction : {
							intersect : false,
							mode      : 'index',
						},
						plugins : {
							legend     : { display : false },
							tooltip    : {
								bodyAlign      : 'right',
								bodyFontFamily : 'courier',
								callbacks      : {
									label : (context) => `${context.dataset.label} : ${context.parsed.y} ${chartUnits.unit_kph}`,
									title : (context) => `@ ${context[0].label} ${chartUnits.unit_rpm}`,
								},
								mode           : 'index',
								titleAlign     : 'center',
							},
						},
						scales  : {
							x : {
								display : true,
								title   : {
									text    : chartUnits.unit_rpm,
									display : true,
								},
								type    : 'linear',
							},
							y : {
								
								display  : true,
								position : 'left',
								title    : {
									text    : chartUnits.unit_kph,
									display : true,
								},
								type     : 'linear',
							},
						},
						stacked : false,
					},
				}
			)
			new Chart(
				fsgUtil.byId(`${thisItemUUID}_canvas_mph`),
				{
					type : 'line',
					data : {
						datasets : [
							...thisItem.motorInfo.mph,
						],
					},
					options : {
						interaction : {
							intersect : false,
							mode      : 'index',
						},
						plugins : {
							legend     : { display : false },
							tooltip    : {
								bodyAlign      : 'right',
								bodyFontFamily : 'courier',
								callbacks      : {
									label : (context) => `${context.dataset.label} : ${context.parsed.y} ${chartUnits.unit_mph}`,
									title : (context) => `@ ${context[0].label} ${chartUnits.unit_rpm}`,
								},
								mode           : 'index',
								titleAlign     : 'center',
							},
						},
						scales  : {
							x : {
								display : true,
								title   : {
									text    : chartUnits.unit_rpm,
									display : true,
								},
								type    : 'linear',
							},
							y : {
								
								display  : true,
								position : 'left',
								title    : {
									text    : chartUnits.unit_mph,
									display : true,
								},
								type     : 'linear',
							},
						},
						stacked : false,
					},
				}
			)
		}
	},
}