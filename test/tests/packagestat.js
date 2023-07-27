/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Test Program - Language Files

const path      = require('path')
const {glob}    = require('glob')
const {testLib} = require('../test.js')
const imgSet    = new Set(['.jpg', '.png', '.psd', '.ico'])

module.exports.test = async () => {
	return Promise.all([
		countFiles(new testLib('Package Statistics'))
	])
}

const getSize = (arr) => {
	const realTotal = arr.map((x) => x.size).reduce((total, x) => total + x, 0)
	return [
		'(',
		Intl.NumberFormat('en').format(realTotal).padStart(11),
		' bytes) [',
		Intl.NumberFormat('en', {maximumFractionDigits : 2, minimumFractionDigits : 2}).format(realTotal / 1024 / 1024).padStart(5),
		' Mb]'
	].join('')
}

const countFiles = (test) => {
	return glob('**', { cwd : path.join(__dirname, '..', '..'), ignore : 'node_modules/**', stat : true, withFileTypes : true }).then((results) => {
		const fileList = results.filter((x) => x.isFile())

		const jsFiles   = fileList.filter((x) => path.extname(x.name) === '.js')
		const htmlFiles = fileList.filter((x) => path.extname(x.name) === '.html')
		const jsonFiles = fileList.filter((x) => path.extname(x.name) === '.json')
		const imgFiles  = fileList.filter((x) => imgSet.has(path.extname(x.name)) )

		test.step(`Total Files       : ${fileList.length.toString().padEnd(4)} ${getSize(fileList)}`)
		test.step(` Image Files      : ${imgFiles.length.toString().padEnd(4)} ${getSize(imgFiles)}`)
		test.step(` HTML Files       : ${htmlFiles.length.toString().padEnd(4)} ${getSize(htmlFiles)}`)
		test.step(` JSON Files       : ${jsonFiles.length.toString().padEnd(4)} ${getSize(jsonFiles)}`)
		test.step(` JavaScript Files : ${jsFiles.length.toString().padEnd(4)} ${getSize(jsFiles)}`)
	}).catch((err) => {
		test.error(err)
	}).finally(() => {
		test.end()
	})
}