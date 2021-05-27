module.exports = {
	parser: '@babel/eslint-parser',
	'env': {
		'browser': true,
		'commonjs': true,
		'es2021': true,
		'node': true
	},
	'extends': 'eslint:recommended',
	'parserOptions': {
		'ecmaVersion': 12,
		'requireConfigFile' : false
	},
	'rules': {
		'no-prototype-builtins': 0,
		'indent': [
			'error',
			'tab',
			{
				'SwitchCase': 1
			}
		],
		'quotes': [
			'error',
			'single'
		],
		'semi': [
			'error',
			'never'
		],
		'no-unused-vars': [
			'error',
			{
				'varsIgnorePattern': '^_'
			}
		]
	}
}
