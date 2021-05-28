module.exports = {
	root: true,
	parser: "@typescript-eslint/parser",
	plugins: ["@typescript-eslint"],
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
	],
	rules: {
		// should be removed but will take a while to fix
		"no-mixed-spaces-and-tabs": "off", // annoying to fix

		// losening default rules
		"no-undef": "off",
		"@typescript-eslint/ban-ts-ignore": "off",
		"@typescript-eslint/ban-ts-comment": "off",
		"@typescript-eslint/no-unused-vars": ["warn", {args: "none"}],
		"@typescript-eslint/no-namespace": ["error", {allowDeclarations: true}],
		"@typescript-eslint/no-non-null-assertion": "off",
		"no-constant-condition": ["warn", {checkLoops: false}],
		"@typescript-eslint/no-empty-function": "off",
		"no-empty-pattern": "off", // required in nr.globalCommand
		"no-empty": "off",

		// stricter linting rules:
		"@typescript-eslint/no-shadow": ["warn", {allow: ["state", "_"]}],
		"eqeqeq": ["warn", "always", {null: "never"}],

		// style rules:
		"indent": ["warn", "tab", {'SwitchCase': 1, 'offsetTernaryExpressions': true, 'ignoredNodes': ["ConditionalExpression"]}],
		"@typescript-eslint/brace-style": ["warn", "1tbs", {allowSingleLine: true}],
		"@typescript-eslint/semi": ["warn", "always", {omitLastInOneLineBlock: true}],
		"@typescript-eslint/member-delimiter-style": [1, {
			multiline: {delimiter: "comma", requireLast: true},
			singleline: {delimiter: "comma", requireLast: false},
			overrides: {
				interface: {multiline: {delimiter: "semi", requireLast: true}, singleline: {delimiter: "semi", requireLast: false}}
			},
			multilineDetection: "last-member",
		}],
	},
	overrides: [{
		files: ["*.js", "*.jsx"],
		rules: {
			"@typescript-eslint/no-var-requires": 0,
			"@typescript-eslint/naming-convention": 0,
		},
	}, {
		files: ["*.ts", "*.tsx"],
		parserOptions: {
			project: "./tsconfig.json",
		},
		extends: [
			"plugin:@typescript-eslint/recommended-requiring-type-checking",
		],
		rules: {
			// looser rules:
			"@typescript-eslint/restrict-plus-operands": 0, // "" + number is used frequently
			"@typescript-eslint/require-await": 0, // ?? do you want me to function() {return new Promise(r => r())}??
			"@typescript-eslint/prefer-regexp-exec": 0, // imo more confusing
			"@typescript-eslint/no-unsafe-assignment": 0, // too much to fix
			"@typescript-eslint/no-explicit-any": 0, // nah
			"@typescript-eslint/no-unsafe-member-access": 0, // required for 'any' usage
			"@typescript-eslint/no-unsafe-call": 0, // required for 'any' usage
			"@typescript-eslint/no-unsafe-return": 0, // required for 'any' usage

			// stricter linting rules:
			"@typescript-eslint/no-floating-promises": "warn",
			/// disabled b/c way too much to fix
			// "@typescript-eslint/strict-boolean-expressions": "warn",

			// style rules:
			/// disabled b/c glhf applying style rules to this retroactively
			// "@typescript-eslint/naming-convention": ["warn",
			// 	{selector: ["variable", "function", "parameter"], format: ["snake_case"]},
			// 	{selector: ["variable", "function", "parameter"], format: ["snake_case"], prefix: ["__"], filter: {regex: "^__", match: true}},
			// 	{selector: ["variable", "function", "parameter"], types: ["function"], format: ["camelCase", "PascalCase"]},
			// 	{selector: ["variable", "function", "parameter"], types: ["function"], format: ["camelCase"], prefix: ["__"], filter: {regex: "^__", match: true}},
			// 	{selector: "typeLike", format: ["PascalCase"]},
			// ],
		}
	}],
};