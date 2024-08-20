/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program - Language Files

const path      = require('node:path')
const fs        = require('node:fs')
const {glob}    = require('glob')
const {testLib} = require('../test.js')
const imgSet    = new Set(['.jpg', '.png', '.psd', '.ico', '.icns', '.woff', '.woff2', '.webp'])
const knowSet   = new Set([...imgSet, '.css', '.scss', '.xml', '.js', '.json', '.html', '.md', '.zip'])
const pkgDetail = require('../../package.json')

module.exports.test = async () => {
	return Promise.all([
		countFiles(new testLib('Package Statistics', false, true))
	])
}

const countOthers = (arr) => {
	return {
		blank : 0,
		code : 0,
		comment : 0,
		size : arr.map((x) => x.size).reduce((total, x) => total + x, 0),
		total : arr.length,
	}
}

const countTextFile = (fileList, isJS = false) => {
	return fileList.reduce((total, x) => {
		const fileContents = fs.readFileSync(x.fullpath(), 'utf-8').replace(/\r/g, '')

		let   thisComment = (fileContents.match(/^[\t |]*\/\/.+\r*$/gm) ?? []).length
		const thisBlank   = (fileContents.match(/^[\t ]*\r*$/gm) || []).length
		const thisTotal   = fileContents.split('\n').length

		if ( isJS ) {
			const matches = fileContents.match(/(?<=\n|^|\n\s)\/\*.+?\*\//gs)
			if ( matches ) {
				for ( const thisMatch of matches ) {
					for ( const thisCommentLine of thisMatch.split('\n') ) {
						if ( thisCommentLine !== '' ) {
							thisComment++
						}
					}
				}
			}
		}

		total.code    += (thisTotal - thisComment - thisBlank)
		total.comment += thisComment
		total.blank   += thisBlank
		total.size    += x.size
		total.total++
		return total
	}, { blank : 0, code : 0, comment : 0, size : 0, total : 0 })
}

const padData   = (data, pad = 0) => data === 0 ? ''.padStart(pad) : data.toString().padStart(pad)

const toNum     = (num) => typeof num !== 'number' || num === 0 ? num : Intl.NumberFormat('en').format(num)
const toMByte   = (num) => typeof num !== 'number' ? num : Intl.NumberFormat('en', {maximumFractionDigits : 2, minimumFractionDigits : 2}).format(num / 1024 / 1024)

const makeLine  = (type, data) => {
	return [
		'| ', type.padEnd(11), ' |',
		padData(toNum(data.total), 6), ' |',
		padData(toNum(data.blank), 6), ' |',
		padData(toNum(data.code), 7), ' |',
		padData(toNum(data.comment), 7), ' |',
		padData(toNum(data.size), 11), ' |',
		padData(toMByte(data.size), 6), ' MB |'
	].join('')
}
const tblHeader = '| ----------- | ----: | ----: | -----: | -----: | ---------: | -------: |'

const countFiles = (test) => {
	return glob('**', { cwd : path.join(__dirname, '..', '..'), ignore : 'node_modules/**', stat : true, withFileTypes : true }).then((results) => {
		test.step(`Current App Version is ${pkgDetail.version}`)
		test.step('Current File Statistics:\n')
		const fileList = results.filter((x) => x.isFile())
		test.step_fmt(makeLine('', { blank : 'Blank', code : 'Code', comment : '/* */', size : 'Size', total : 'Files' }))
		test.step_fmt(tblHeader)
		test.step_fmt(makeLine('javaScript', countTextFile(fileList.filter((x) => path.extname(x.name) === '.js' && path.basename(x.name) !== 'baseGameData.js' && path.basename(x.name) !== 'baseGameData19.js'), true)))
		test.step_fmt(makeLine('JSON', countTextFile(fileList.filter((x) => path.extname(x.name) === '.json'))))
		test.step_fmt(makeLine('XML', countTextFile(fileList.filter((x) => path.extname(x.name) === '.xml'))))
		test.step_fmt(makeLine('HTML', countTextFile(fileList.filter((x) => path.extname(x.name) === '.html'))))
		test.step_fmt(makeLine('CSS', countTextFile(fileList.filter((x) => path.extname(x.name) === '.css' || path.extname(x.name) === '.scss'), true)))
		test.step_fmt(makeLine('markDown', countTextFile(fileList.filter((x) => path.extname(x.name) === '.md'))))
		test.step_fmt(makeLine('Images', countOthers(fileList.filter((x) => imgSet.has(path.extname(x.name)) ))))
		test.step_fmt(makeLine('ZIP Archive', countOthers(fileList.filter((x) => path.extname(x.name) === '.zip'))))
		test.step_fmt(makeLine('Other', countOthers(fileList.filter((x) => !knowSet.has(path.extname(x.name)) ))))
		// test.step_fmt(tblHeader)
		test.step_fmt(makeLine('TOTAL', countOthers(fileList)))
	}).catch((err) => {
		test.error(err)
	}).finally(() => {
		test.end()
	})
}