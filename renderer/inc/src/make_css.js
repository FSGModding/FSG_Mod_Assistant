const CleanCSS = require('clean-css')
const fs = require('fs')
const path = require('path')

const file_bootstrap = fs.readFileSync(path.join(__dirname, 'bootstrap.css'))
const file_icons     = fs.readFileSync(path.join(__dirname, 'bootstrap-icons.css'))
const file_override  = fs.readFileSync(path.join(__dirname, 'overrides.css'))

const input = [file_bootstrap, file_icons, file_override].join('\n')

const options = { }
const output = new CleanCSS(options).minify(input)

fs.writeFileSync(path.join(path.join(__dirname, 'dist', 'bootstrap.css')), input)
fs.writeFileSync(path.join(path.join(__dirname, 'dist', 'bootstrap.min.css')), output.styles)
