/*  _______           __ _______               __         __   
	 |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
	 |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
	 |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
	 (c) 2022-present FSG Modding.  MIT License. */

// DDS Library - based on
// https://github.com/kchapelier/decode-dxt (modernized)
//  and
// https://github.com/Jam3/parse-dds

/*eslint complexity: ["warn", 17]*/

const fs        = require('fs')
const path      = require('path')
const PNG       = require('pngjs').PNG
const JPEG      = require('jpeg-js')
const cp        = require('child_process')

const Util = {
	convert565ByteToRgb : (byte) => {
		return [
			Math.round(((byte >>> 11) & 31) * (255 / 31)),
			Math.round(((byte >>> 5) & 63) * (255 / 63)),
			Math.round((byte & 31) * (255 / 31))
		]
	},
	extractBitsFromUin16Array : (array, shift, length) => {
		// sadly while javascript operates with doubles, it does all its binary operations on 32 bytes integers
		// so we have to get a bit dirty to do the bit shifting on the 48 bytes integer for the alpha values of DXT5
	
		const height   = array.length
		const height_1 = height - 1
		const width    = 16
		const rowS     = ((shift / width) | 0)
		const rowE     = (((shift + length - 1) / width) | 0)
		let shiftS
		let shiftE
		let result
	
		if (rowS === rowE) {
			// all the requested bits are contained in a single uint16
			shiftS = (shift % width)
			result = (array[height_1 - rowS] >> shiftS) & (Math.pow(2, length) - 1)
		} else {
			// the requested bits are contained in two continuous uint16
			shiftS = (shift % width)
			shiftE = (width - shiftS)
			result = (array[height_1 - rowS] >> shiftS) & (Math.pow(2, length) - 1)
			result += (array[height_1 - rowE] & (Math.pow(2, length - shiftE) - 1)) << shiftE
		}
	
		return result
	},
	fourCCToInt32 : (value) => {
		return value.charCodeAt(0) +
			(value.charCodeAt(1) << 8) +
			(value.charCodeAt(2) << 16) +
			(value.charCodeAt(3) << 24)
	},
	getAlphaIndexBC3 : (alphaIndices, pixelIndex) => {
		return Util.extractBitsFromUin16Array(alphaIndices, (3 * (15 - pixelIndex)), 3)
	},
	getAlphaValueBC2 : (alphaValue, pixelIndex) => {
		return Util.extractBitsFromUin16Array(alphaValue, (4 * (15 - pixelIndex)), 4) * 17
	},
	int32ToFourCC : (value) => {
		return String.fromCharCode(
			value & 0xff,
			(value >> 8) & 0xff,
			(value >> 16) & 0xff,
			(value >> 24) & 0xff
		)
	},
	interpolateAlphaValues : (firstVal, secondVal) => {
		const alphaValues = [firstVal, secondVal]
	
		if (firstVal > secondVal) {
			alphaValues.push(
				Math.floor(Util.lerp(firstVal, secondVal, 1 / 7)),
				Math.floor(Util.lerp(firstVal, secondVal, 2 / 7)),
				Math.floor(Util.lerp(firstVal, secondVal, 3 / 7)),
				Math.floor(Util.lerp(firstVal, secondVal, 4 / 7)),
				Math.floor(Util.lerp(firstVal, secondVal, 5 / 7)),
				Math.floor(Util.lerp(firstVal, secondVal, 6 / 7))
			)
		} else {
			alphaValues.push(
				Math.floor(Util.lerp(firstVal, secondVal, 1 / 5)),
				Math.floor(Util.lerp(firstVal, secondVal, 2 / 5)),
				Math.floor(Util.lerp(firstVal, secondVal, 3 / 5)),
				Math.floor(Util.lerp(firstVal, secondVal, 4 / 5)),
				0,
				255
			)
		}
	
		return alphaValues
	},
	interpolateColorValues : (firstVal, secondVal, isDxt1) => {
		const firstColor  = Util.convert565ByteToRgb(firstVal)
		const secondColor = Util.convert565ByteToRgb(secondVal)
		const colorValues = [].concat(firstColor, 255, secondColor, 255)
	
		if (isDxt1 && firstVal <= secondVal) {
			colorValues.push(
				Math.round((firstColor[0] + secondColor[0]) / 2),
				Math.round((firstColor[1] + secondColor[1]) / 2),
				Math.round((firstColor[2] + secondColor[2]) / 2),
				255,
	
				0,
				0,
				0,
				0
			)
		} else {
			colorValues.push(
				Math.round(Util.lerp(firstColor[0], secondColor[0], 1 / 3)),
				Math.round(Util.lerp(firstColor[1], secondColor[1], 1 / 3)),
				Math.round(Util.lerp(firstColor[2], secondColor[2], 1 / 3)),
				255,
	
				Math.round(Util.lerp(firstColor[0], secondColor[0], 2 / 3)),
				Math.round(Util.lerp(firstColor[1], secondColor[1], 2 / 3)),
				Math.round(Util.lerp(firstColor[2], secondColor[2], 2 / 3)),
				255
			)
		}
	
		return colorValues
	},
	lerp : (v1, v2, r) => {
		return v1 * (1 - r) + v2 * r
	},
	multiply : (component, multiplier) => {
		if (!isFinite(multiplier) || multiplier === 0) { return 0 }
	
		return Math.round(component * multiplier)
	},
}

function parseHeaders (arrayBuffer) {
	const DDS_MAGIC        = 0x20534444
	const DDSD_MIPMAPCOUNT = 0x20000
	const DDPF_FOURCC      = 0x4

	const FOURCC_DXT1  = Util.fourCCToInt32('DXT1')
	const FOURCC_DXT3  = Util.fourCCToInt32('DXT3')
	const FOURCC_DXT5  = Util.fourCCToInt32('DXT5')
	const FOURCC_DX10  = Util.fourCCToInt32('DX10')
	const FOURCC_FP32F = 116 // DXGI_FORMAT_R32G32B32A32_FLOAT

	const DDSCAPS2_CUBEMAP                   = 0x200
	const D3D10_RESOURCE_DIMENSION_TEXTURE2D = 3
	const DXGI_FORMAT_R32G32B32A32_FLOAT     = 2
	const DXGI_FORMAT_BC7_UNORM              = 98
	const DXGI_FORMAT_BC7_UNORM_SRGB         = 99

	// The header length in 32 bit ints
	const headerLengthInt = 31

	// Offsets into the header array
	const off_magic       = 0
	const off_size        = 1
	const off_flags       = 2
	const off_height      = 3
	const off_width       = 4
	const off_mipmapCount = 7
	const off_pfFlags     = 20
	const off_pfFourCC    = 21
	const off_caps2       = 28

	const header = new Int32Array(arrayBuffer, 0, headerLengthInt)

	if (header[off_magic] !== DDS_MAGIC) {
		throw new Error('Invalid magic number in DDS header')
	}

	if (!header[off_pfFlags] & DDPF_FOURCC) {
		throw new Error('Unsupported format, must contain a FourCC code')
	}

	let blockBytes
	let format
	let dx10Header
	let resourceDimension
	const fourCC = header[off_pfFourCC]
	switch (fourCC) {
		case FOURCC_DXT1:
			blockBytes = 8
			format     = 'dxt1'
			break
		case FOURCC_DXT3:
			blockBytes = 16
			format     = 'dxt3'
			break
		case FOURCC_DXT5:
			blockBytes = 16
			format     = 'dxt5'
			break
		case FOURCC_FP32F:
			format = 'rgba32f'
			break
		case FOURCC_DX10:
			dx10Header        = new Uint32Array(arrayBuffer.slice(128, 128 + 20))
			blockBytes        = 16
			format            = dx10Header[0]
			resourceDimension = dx10Header[1]

			if ( resourceDimension !== D3D10_RESOURCE_DIMENSION_TEXTURE2D ) {
				throw new Error(`Unsupported DX10 resource dimension ${resourceDimension}`)
			}
			
			if ( format === DXGI_FORMAT_R32G32B32A32_FLOAT) {
				format = 'rgba32f'
			} else if ( format === DXGI_FORMAT_BC7_UNORM ) {
				format = 'dxt10'
			} else if ( format === DXGI_FORMAT_BC7_UNORM_SRGB ) {
				format = 'dxt10'
			} else {
				throw new Error(`Unsupported DX10 texture format ${format}`)
			}

			break
		default:
			throw new Error(`Unsupported FourCC code: ${Util.int32ToFourCC(fourCC)}`)
	}

	const flags       = header[off_flags]
	const mipmapCount = (flags & DDSD_MIPMAPCOUNT) ? Math.max(1, header[off_mipmapCount]) : 1

	const caps2 = header[off_caps2]
	
	if (caps2 & DDSCAPS2_CUBEMAP) {
		throw new Error('This version does not support cube maps')
	}

	let width       = header[off_width]
	let height      = header[off_height]
	const texWidth  = width
	const texHeight = height
	const images    = []
	let dataOffset  = header[off_size] + 4
	let dataLength

	if (fourCC === FOURCC_DX10) { dataOffset += 20 }

	for (let i = 0; i < mipmapCount; i++) {
		dataLength = Math.max(4, width) / 4 * Math.max(4, height) / 4 * blockBytes

		images.push({
			offset : dataOffset,
			length : dataLength,
			shape  : [width, height],
		})

		dataOffset += dataLength

		width  = Math.floor(width / 2)
		height = Math.floor(height / 2)
	}
	

	return {
		flags  : flags,
		format : format,
		images : images,
		shape  : [texWidth, texHeight],
	}
}

function decode (imageDataView, width, height, format = 'dxt1') {
	switch (format.toLowerCase()) {
		case decode.dxt1:
			return decoders.BC1(imageDataView, width, height)
		case decode.dxt2:
			return decoders.BC2(imageDataView, width, height, true)
		case decode.dxt3:
			return decoders.BC2(imageDataView, width, height, false)
		case decode.dxt4:
			return decoders.BC3(imageDataView, width, height, true)
		case decode.dxt5:
			return decoders.BC3(imageDataView, width, height, false)
		case decode.dxt10:
			throw new Error('Cannot decode dxt10 Images')
		default:
			throw new Error(`Unknown DXT format : '${format}'`)
	}
}

decode.dxt1  = 'dxt1'
decode.dxt2  = 'dxt2'
decode.dxt3  = 'dxt3'
decode.dxt4  = 'dxt4'
decode.dxt5  = 'dxt5'
decode.dxt10 = 'dxt10'



const decoders = {
	BC1 : (imageData, width, height) => {
		const rgba     = new Uint8Array(width * height * 4)
		const height_4 = (height / 4) | 0
		const width_4  = (width / 4) | 0
		let offset     = 0
		let colorValues
		let colorIndices
		let colorIndex
		let pixelIndex
		let rgbaIndex
		let h
		let w
		let x
		let y

		for (h = 0; h < height_4; h++) {
			for (w = 0; w < width_4; w++) {
				colorValues  = Util.interpolateColorValues(imageData.getUint16(offset, true), imageData.getUint16(offset + 2, true), true)
				colorIndices = imageData.getUint32(offset + 4, true)

				for (y = 0; y < 4; y++) {
					for (x = 0; x < 4; x++) {
						pixelIndex = (3 - x) + (y * 4)
						rgbaIndex = (h * 4 + 3 - y) * width * 4 + (w * 4 + x) * 4
						colorIndex = (colorIndices >> (2 * (15 - pixelIndex))) & 0x03
						rgba[rgbaIndex]     = colorValues[colorIndex * 4]
						rgba[rgbaIndex + 1] = colorValues[colorIndex * 4 + 1]
						rgba[rgbaIndex + 2] = colorValues[colorIndex * 4 + 2]
						rgba[rgbaIndex + 3] = colorValues[colorIndex * 4 + 3]
					}
				}

				offset += 8
			}
		}

		return rgba
	},
	BC2 : (imageData, width, height, premultiplied) => {
		const rgba     = new Uint8Array(width * height * 4)
		const height_4 = (height / 4) | 0
		const width_4  = (width / 4) | 0
		let offset = 0
		let alphaValues
		let alphaValue
		let multiplier
		let colorValues
		let colorIndices
		let colorIndex
		let pixelIndex
		let rgbaIndex
		let h
		let w
		let x
		let y
	
		for (h = 0; h < height_4; h++) {
			for (w = 0; w < width_4; w++) {
				alphaValues = [
					imageData.getUint16(offset + 6, true),
					imageData.getUint16(offset + 4, true),
					imageData.getUint16(offset + 2, true),
					imageData.getUint16(offset, true)
				] // reordered as big endian
	
				colorValues = Util.interpolateColorValues(
					imageData.getUint16(offset + 8, true),
					imageData.getUint16(offset + 10, true)
				)
				colorIndices = imageData.getUint32(offset + 12, true)
	
				for (y = 0; y < 4; y++) {
					for (x = 0; x < 4; x++) {
						pixelIndex = (3 - x) + (y * 4)
						rgbaIndex  = (h * 4 + 3 - y) * width * 4 + (w * 4 + x) * 4
						colorIndex = (colorIndices >> (2 * (15 - pixelIndex))) & 0x03
						alphaValue = Util.getAlphaValueBC2(alphaValues, pixelIndex)
	
						multiplier = premultiplied ? 255 / alphaValue : 1
	
						rgba[rgbaIndex]     = Util.multiply(colorValues[colorIndex * 4], multiplier)
						rgba[rgbaIndex + 1] = Util.multiply(colorValues[colorIndex * 4 + 1], multiplier)
						rgba[rgbaIndex + 2] = Util.multiply(colorValues[colorIndex * 4 + 2], multiplier)
						rgba[rgbaIndex + 3] = Util.getAlphaValueBC2(alphaValues, pixelIndex)
					}
				}
	
				offset += 16
			}
		}
	
		return rgba
	},
	BC3 : (imageData, width, height, premultiplied) => {
		const rgba     = new Uint8Array(width * height * 4)
		const height_4 = (height / 4) | 0
		const width_4  = (width / 4) | 0
		let offset = 0
		let alphaValues
		let alphaIndices
		let alphaIndex
		let alphaValue
		let multiplier
		let colorValues
		let colorIndices
		let colorIndex
		let pixelIndex
		let rgbaIndex
		let h
		let w
		let x
		let y
	
		for (h = 0; h < height_4; h++) {
			for (w = 0; w < width_4; w++) {
				alphaValues = Util.interpolateAlphaValues(
					imageData.getUint8(offset, true),
					imageData.getUint8(offset + 1, true),
					false
				)
				alphaIndices = [
					imageData.getUint16(offset + 6, true),
					imageData.getUint16(offset + 4, true),
					imageData.getUint16(offset + 2, true)
				] // reordered as big endian
	
				colorValues = Util.interpolateColorValues(
					imageData.getUint16(offset + 8, true),
					imageData.getUint16(offset + 10, true)
				)
				colorIndices = imageData.getUint32(offset + 12, true)
	
				for (y = 0; y < 4; y++) {
					for (x = 0; x < 4; x++) {
						pixelIndex = (3 - x) + (y * 4)
						rgbaIndex  = (h * 4 + 3 - y) * width * 4 + (w * 4 + x) * 4
						colorIndex = (colorIndices >> (2 * (15 - pixelIndex))) & 0x03
						alphaIndex = Util.getAlphaIndexBC3(alphaIndices, pixelIndex)
						alphaValue = alphaValues[alphaIndex]
	
						multiplier = premultiplied ? 255 / alphaValue : 1
	
						rgba[rgbaIndex]     = Util.multiply(colorValues[colorIndex * 4], multiplier)
						rgba[rgbaIndex + 1] = Util.multiply(colorValues[colorIndex * 4 + 1], multiplier)
						rgba[rgbaIndex + 2] = Util.multiply(colorValues[colorIndex * 4 + 2], multiplier)
						rgba[rgbaIndex + 3] = alphaValue
					}
				}
	
				offset += 16
			}
		}
	
		return rgba
	},
}


class ddsDecoder {
	#convertProg  = null
	#convertFlags_o = '-pow2 -px new_ -f DXT5 -srgb'
	#convertFlags_a = '-pow2 -px new_ -f DXT5 -srgb'
	#tempFolder   = null

	constructor(converter, tempFolder) {
		this.#convertProg = converter
		this.#tempFolder  = path.join(tempFolder, `fsgMod_this.${this.#getRand()}`)
	}

	#getRand(length = 5) {
		return 'x'.repeat(length).replace(/./g, () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62) ] )
	}

	clearTemp() {
		if ( fs.existsSync(this.#tempFolder) ) {
			try { fs.rmdirSync(this.#tempFolder) } catch { /* Don't care */ }
		}
	}

	parseDDS(fileBuffer, hasAlpha = false) {
		let realBuffer  = fileBuffer
		let ddsData     = null

		if ( realBuffer === null ) { return null }
		
		try {
			ddsData   = parseHeaders(realBuffer)
		} catch (e) {
			throw `DDS Header Error: ${e}`
		}

		try {
			if ( ddsData.format === 'dxt10' && this.#convertProg !== null && this.#tempFolder !== null ) {
				// If DXT10, convert to DXT5/BC3 and reload the file
				const tempFileNameIN  = `${this.#getRand(6)}.dds`
				const tempFileNameOUT = `new_${tempFileNameIN}`

				if ( !fs.existsSync(this.#tempFolder) ) { fs.mkdirSync(this.#tempFolder) }

				fs.writeFileSync(path.join(this.#tempFolder, tempFileNameIN), Buffer.from(realBuffer))
				cp.execSync(`"${this.#convertProg}" "${path.join(this.#tempFolder, tempFileNameIN)}" ${hasAlpha ? this.#convertFlags_a : this.#convertFlags_o} -o "${this.#tempFolder}"`)

				realBuffer = fs.readFileSync(path.join(this.#tempFolder, tempFileNameOUT)).buffer
				ddsData    = parseHeaders(realBuffer)

				fs.rmSync(path.join(this.#tempFolder, tempFileNameIN))
				fs.rmSync(path.join(this.#tempFolder, tempFileNameOUT))
			}
		} catch (e) {
			throw `DDS DXT10 Conversion Error: ${e}`
		}

		try {
			// get the first mipmap texture
			const image         = ddsData.images[0]
			const imageWidth    = image.shape[0]
			const imageHeight   = image.shape[1]
			const imageDataView = new DataView(realBuffer, image.offset, image.length)

			// convert the DXT texture to an Uint8Array containing RGBA data
			const rgbaData = decode(imageDataView, imageWidth, imageHeight, ddsData.format)

			// convert to PNG

			if ( hasAlpha ) {
				try {
					const pngData = new PNG({ width : imageWidth, height : imageHeight })

					pngData.data = rgbaData

					const pngBuffer = PNG.sync.write(pngData)

					return `data:image/png;base64, ${pngBuffer.toString('base64')}`
				} catch (e) {
					throw `PNG Conversion Error: ${e}`
				}
			} else {
				try {
					const jpgData = JPEG.encode({ width : imageWidth, height : imageHeight, data : rgbaData }, 70)

					return `data:image/jpeg;base64, ${jpgData.data.toString('base64')}`
				} catch (e) {
					throw `JPEG Conversion Error: ${e}`
				}
			}
		} catch (e) {
			throw `DDS Decode Error: ${e}`
		}
	}
}


class ma_logger {
	#isPacked     = false
	#dataPath     = null
	#fullFileName = null
	#dangerEvent  = null

	#fileHandle   = null

	#textLog = []
	#htmlLog = []
	#process = ''

	#level_to_color = {
		danger  : 'fw-bold text-danger',
		debug   : 'fw-bold text-muted',
		info    : 'fw-bold text-info',
		notice  : 'fw-bold text-success',
		warning : 'fw-bold text-warning',
	}

	constructor( defaultProcess, app = null, fileName = null, clearFile = true) {
		this.#process = defaultProcess

		if ( app !== null ) {
			this.#isPacked = app.isPackaged
			this.#dataPath = app.getPath('userData')

			if ( fileName !== null && clearFile ) {
				this.#fullFileName = path.join(this.#dataPath, fileName)
				this.#fileHandle   = fs.createWriteStream(this.#fullFileName)

				this.#fileHandle.on('error', (err) => {
					delete this.#trans.file
					this.#addToLog('danger', 'logging-class', `File write failed : ${err.message}`)
				})
			}
		}
	}

	set dangerCallBack(newCallback) { this.#dangerEvent = newCallback }
	
	forceNoConsole() { this.#isPacked = true }

	#trans = {
		// eslint-disable-next-line no-console
		console : (text) => { if ( ! this.#isPacked ) { console.log(text) } },
		file    : (text) => { if ( this.#fullFileName !== null ) { this.#fileHandle.write(`${text}\n`) } },
	}

	#addToLog(level, process, text) {
		if ( level === 'danger' && typeof this.#dangerEvent === 'function' ) { this.#dangerEvent() }
		const cleanTextLine = typeof text === 'string' ? text.replaceAll('\n', ' -- ') : text
		const logTime       = new Date()
		const logTimeString = `${logTime.getFullYear()}-${(logTime.getMonth()+1).toString().padStart(2, '0')}-${(logTime.getDate()).toString().padStart(2, '0')} ${(logTime.getHours()).toString().padStart(2, '0')}:${(logTime.getMinutes()).toString().padStart(2, '0')}:${(logTime.getSeconds()).toString().padStart(2, '0')}`
		const cleanProcess  = process === null || process === this.#process ? '' : `${process} >> `
		const simpleText    = `${logTimeString} | ${level.toUpperCase().padStart(7, ' ')} | ${cleanProcess}${cleanTextLine}`
		const htmlText      = `<em>${logTimeString}</em> | <span class="log_level ${this.#level_to_color[level]}">${level.toUpperCase().padStart(7, ' ')}</span> | ${cleanProcess}${cleanTextLine}`

		for (const transport in this.#trans) {
			this.#trans[transport](simpleText)
		}
		this.#htmlLog.push(htmlText)
		this.#textLog.push(simpleText)
	}

	log = {
		danger  : (text, process = null) => { this.#addToLog('danger', process, text) },
		debug   : (text, process = null) => { this.#addToLog('debug', process, text) },
		error   : (text, process = null) => { this.#addToLog('danger', process, text) },
		info    : (text, process = null) => { this.#addToLog('info', process, text) },
		notice  : (text, process = null) => { this.#addToLog('notice', process, text) },
		warn    : (text, process = null) => { this.#addToLog('warning', process, text) },
		warning : (text, process = null) => { this.#addToLog('warning', process, text) },
	}

	group = (process) => { return {
		danger  : (text) => { this.log.danger(text, process) },
		debug   : (text) => { this.log.debug(text, process) },
		error   : (text) => { this.log.danger(text, process) },
		info    : (text) => { this.log.info(text, process) },
		notice  : (text) => { this.log.notice(text, process) },
		warn    : (text) => { this.log.warning(text, process) },
		warning : (text) => { this.log.warning(text, process) },
	} }

	get pathToLog() { return this.#fullFileName }
	get textLog()   { return this.#textLog.join('\n') }
	get htmlLog()   { return this.#htmlLog.join('\n') }
}


const getSystemLocale = function () {
	const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale
	switch ( systemLocale ) {
		case 'pt-BR' :
			return 'br'
		case 'zh-CHT':
		case 'zh-Hant':
		case 'zh-HK':
		case 'zh-MO':
		case 'zh-TW':
			return 'ct'
		case 'zh':
		case 'zh-CHS':
		case 'zh-Hans':
		case 'zh-CN':
		case 'zh-SG':
			return 'cs'
		case 'cs':
			return 'cz'
		case 'ja':
			return 'jp'
		case 'ko':
			return 'kr'
		default :
			return systemLocale.slice(0, 2)
	}
}

class translator {
	#log               = null
	#debug             = false
	#currentLocale     = null
	#translatorStrings = new Map()
	#langPromise       = null
	mcVersion          = null
	iconOverrides      = {
		admin_button           : 'globe2',
		admin_pass_button      : 'key',
		button_gamelog         : 'file-earmark-text',
		download_button        : 'cloud-download',
		export_button          : 'filetype-csv',
		folder_bot_button      : 'align-bottom',
		folder_down_button     : 'chevron-down',
		folder_top_button      : 'align-top',
		folder_up_button       : 'chevron-up',
		game_admin_pass_button : 'person-lock',
		help_button            : 'question-circle',
		min_tray_button        : 'chevron-bar-down',
		notes_button           : 'journal-text',
		preferences_button     : 'gear',
		savegame_track         : 'calendar2-check',
		search_all             : 'search',
		update_ready           : 'cloud-download',
	}

	constructor(locale = null, debug = false) {
		this.#currentLocale = locale === null ? getSystemLocale() : locale
		this.#debug         = debug

		this.#log = maIPC.log.group('translate-lib')
		this.#log.info(`Starting i18n Library :: ${this.#currentLocale}`)

		this.#langPromise = this.loadLanguages()
	}

	deferCurrentLocale = () => { return this.#currentLocale }
	get currentLocale() { return this.#currentLocale }
	set currentLocale(value) {
		if ( this.#translatorStrings.has(value) ) {
			this.#currentLocale = value
		}
	}

	async loadLanguages() {
		
		const langJSON = fs.readdirSync(path.join(__dirname, '..', 'translations'))

		for ( const thisFile of langJSON ) {
			if ( path.extname(thisFile) === '.json' ) {
				try {
					const thisLang = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'translations', thisFile)))
					this.#translatorStrings.set(thisLang.language_code, new Map(Object.entries(thisLang)))
					this.#log.debug(`Loaded ${thisLang.language_code} Language`)
				} catch (e) {
					this.#log.warning(`Unable to load language: ${thisFile}`)
				}
			}
		}
	}

	async getLangList() {
		return this.#langPromise.then(() => {
			const returnArray = []
			returnArray.push(['en', 'English'])
			for ( const key of this.#translatorStrings.keys() ) {
				if ( key !== 'en' ) {
					returnArray.push([key, this.#translatorStrings.get(key)?.get('language_name')])
				}
			}
			return returnArray
		})
	}

	iconOverride(stringID) {
		const className = this.iconOverrides[stringID]
		return ( typeof className !== 'undefined' ) ?
			`<i class="bi bi-${className}"></i>` :
			null
	}

	syncStringLookup(stringID) {
		// Note: this could fail depending on when it's used.
		if ( stringID === null ) { return null }
		
		let   possibleValue = null
		const lcStringID    = stringID.toLowerCase()

		possibleValue ??= this.iconOverride(lcStringID)
		possibleValue ??= this.#translatorStrings.get(this.#currentLocale)?.get(lcStringID)
		possibleValue ??= this.#translatorStrings.get('en')?.get(lcStringID)
		possibleValue ??= `__${lcStringID}__`

		if ( this.#debug ) {
			if ( possibleValue === '' ) { this.#log.info(`Empty translation string : ${this.#currentLocale} :: ${lcStringID}`) }
			if ( possibleValue === `__${lcStringID}__` ) { this.#log.info(`Unknown translation string : ${this.#currentLocale} :: ${lcStringID}`) }
		}
		return possibleValue
	}

	async stringLookup(stringID) {
		return this.#langPromise.then(() => {
			return this.syncStringLookup(stringID)
		})
	}

	async stringTitleLookup(stringID) {
		return this.#langPromise.then(() => {
			if ( stringID === null ) { return null }
			
			const lcStringID = `${stringID.toLowerCase()}__title`

			if ( lcStringID === 'mc_ver_string' ) { return this.mcVersion }

			let possibleValue = this.#translatorStrings.get(this.#currentLocale)?.get(lcStringID)

			possibleValue ??= this.#translatorStrings.get('en')?.get(lcStringID)

			return typeof possibleValue !== 'undefined' ? possibleValue : null
		})
	}
}

const maIPC = {
	decode     : null,
	l10n       : { deferCurrentLocale : () => { return 'en' }},
	loading    : { current : () => {} },
	log        : null,
	modCache   : null,
	notes      : null,
	settings   : null,
}

module.exports = {
	ddsDecoder      : ddsDecoder,
	ma_logger       : ma_logger,
	maIPC           : maIPC,
	translator      : translator,
}
