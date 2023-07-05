module.exports = {
	'env' : {
		'browser'  : true,
		'commonjs' : true,
		'es2021'   : true,
		'node'     : true,
	},
	'extends'       : 'eslint:recommended',
	'parser'        : '@babel/eslint-parser',
	'parserOptions' : {
		'ecmaVersion'       : 12,
		'requireConfigFile' : false,
	},
	'rules' : {
		'comma-dangle' : [
			'error',
			{
				'arrays'    : 'only-multiline',
				'exports'   : 'never',
				'functions' : 'never',
				'imports'   : 'never',
				'objects'   : 'always-multiline',
			}
		],
		'indent' : [
			'error',
			'tab',
			{
				'SwitchCase' : 1,
			},
		],
		'key-spacing' : [
			'error',
			{
				'afterColon'  : true,
				'beforeColon' : true,
				'mode'        : 'minimum',
			},
		],
		'no-trailing-spaces' : [
			'error',
			{
				'ignoreComments' : true,
				'skipBlankLines' : true,
			},
		],
		'no-unused-vars' : [
			'error',
			{
				'args' : 'all',
				'argsIgnorePattern' : '^_',
				'varsIgnorePattern' : '^_|^client',
			},
		],

		'array-bracket-spacing'           : ['error', 'never'],
		'arrow-parens'                    : 'error',
		'comma-spacing'                   : 'error',
		'default-case'                    : 'error',
		'dot-notation'                    : 'error',
		'eqeqeq'                          : 'error',
		'func-call-spacing'               : 'error',
		'keyword-spacing'                 : 'error',
		'no-await-in-loop'                : 'error',
		'no-console'                      : 'warn',
		'no-duplicate-imports'            : 'error',
		'no-else-return'                  : 'error',
		'no-global-assign'                : 'error',
		'no-implicit-globals'             : 'error',
		'no-lonely-if'                    : 'error',
		'no-multi-str'                    : 'error',
		'no-param-reassign'               : 'error',
		'no-promise-executor-return'      : 'error',
		'no-return-await'                 : 'error',
		'no-sequences'                    : 'error',
		'no-template-curly-in-string'     : 'error',
		'no-unneeded-ternary'             : 'error',
		'no-unused-expressions'           : 'error',
		'no-unused-private-class-members' : 'error',
		'no-useless-backreference'        : 'error',
		'no-useless-concat'               : 'error',
		'no-var'                          : 'error',
		'prefer-arrow-callback'           : 'error',
		'prefer-const'                    : 'error',
		'prefer-template'                 : 'error',
		'quotes'                          : ['error', 'single'],
		'require-atomic-updates'          : 'error',
		'semi'                            : ['error', 'never'],

		'complexity'                      : ['warn', 15],
		'sort-keys'                       : ['warn', 'asc', {'allowLineSeparatedGroups' : true, 'caseSensitive' : false, 'minKeys' : 4, 'natural' : true}],
		
	},
}
