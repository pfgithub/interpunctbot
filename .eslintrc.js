module.exports = {
	// http://eslint.org/docs/rules/
	//"parser": "esprima",
	// "parser": "espree",
	parser: "@typescript-eslint/parser",
	parserOptions: {
		tsconfigRootDir: __dirname,
		project: ["./tsconfig.json"],
	},

	globals: {},

	plugins: ["@typescript-eslint"],
	extends: [
		"plugin:@typescript-eslint/eslint-recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:@typescript-eslint/recommended-requiring-type-checking",
	],

	rules: {
		// enabled
		"prefer-const": 1, // maybe don't auto fix though
		"@typescript-eslint/no-floating-promises": 2, // this should be a default in typescript, how are people expected to have the node process crash for unhandled promises when it's so hard to actually know
		"@typescript-eslint/restrict-template-expressions": [
			1,
			{ allowNumber: true },
		], // I have [object Object] in template string so often

		// disabled
		"@typescript-eslint/require-await": 0, // sometimes it's necessary to have a function return a promise even though it doesn't await itself
		"@typescript-eslint/explicit-function-return-type": 0, // I don't personally like this, idk.
		"@typescript-eslint/no-namespace": 0, // declare global
		"@typescript-eslint/no-use-before-define": 0, // function a(){b();} function b(){a();}, not sure why this rule is enabled by default.
		"@typescript-eslint/no-non-null-assertion": 0, // discord.js and Info still have lots of types where one thing being true doesn't mark something else as true, so for example if(msg.guild) msg.db!.send() needs ! because I just did a check
		"@typescript-eslint/no-explicit-any": 0, // I wish I could have this on, but there are some libraries without typescript definitions I don't want to waste time writing definitions for
		"@typescript-eslint/ban-ts-ignore": 0, // "ts-ignore is bad because it ignores errors"... yeah, that's the point.
		"@typescript-eslint/camelcase": 0, // I can't control what other libraries use
		"@typescript-eslint/no-empty-function": 0, // what's the point of this?
	},
};
