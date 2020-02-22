import { parseDG, tokenizeDG } from "../src/parseDGv2";
import assert from "assert";

const defaultFormat = (fn: string, args: { raw: string; safe: string }[]) =>
	!fn
		? `safe("${args[0].raw}")`
		: `${fn}( ${args.map(a => `${a.safe}`).join(", ")} )`;

console.log("=== tokenize dg");
assert.deepStrictEqual(
	tokenizeDG(
		"Some text, \\{escaped curly brackets\\}, {Action|This is the action\\|<- escaped} | ||}{}",
	),
	[
		{ type: "text", text: "Some text, {escaped curly brackets}, " },
		{ type: "lbracket" },
		{ type: "text", text: "Action" },
		{ type: "argseparator" },
		{ type: "text", text: "This is the action|<- escaped" },
		{ type: "rbracket" },
		{ type: "text", text: " " },
		{ type: "argseparator" },
		{ type: "text", text: " " },
		{ type: "argseparator" },
		{ type: "argseparator" },
		{ type: "rbracket" },
		{ type: "lbracket" },
		{ type: "rbracket" },
	],
);

console.log("=== parse dg");
assert.deepStrictEqual(parseDG(`{Message|Hello!|Argument 2}`, defaultFormat), {
	safe: `Message( safe("Hello!"), safe("Argument 2") )`,
	raw: `Message( safe("Hello!"), safe("Argument 2") )`,
});

assert.deepStrictEqual(parseDG(`Hi!`, defaultFormat), {
	safe: `safe("Hi!")`,
	raw: "Hi!",
});

assert.deepStrictEqual(
	parseDG(`text before {Entity} text after`, defaultFormat),
	{
		safe: `safe("text before ")Entity(  )safe(" text after")`,
		raw: "text before Entity(  ) text after",
	},
);

assert.deepStrictEqual(
	parseDG(`{Entity|Something {Sub-Entity|Arg} |Arg two}`, defaultFormat),
	{
		safe: `Entity( safe("Something ")Sub-Entity( safe("Arg") )safe(" "), safe("Arg two") )`,
		raw: `Entity( safe("Something ")Sub-Entity( safe("Arg") )safe(" "), safe("Arg two") )`,
	},
);

assert.deepStrictEqual(
	parseDG(
		`{Heading|Hey there! Here is a {Link|link to the website|https://www.google.com/}. I hope it's helpful!}`,

		(fn, args) =>
			!fn
				? args[0].raw.toLowerCase().replace(/[^a-z0-9]/g, "-")
				: fn === "Heading"
				? `<h1>${args[0].safe}</h1>`
				: fn === "Link"
				? `<a href="${args[1].raw}">${args[0].safe}</a>`
				: "{Errorbad!}",
	),
	{
		safe: `<h1>hey-there--here-is-a-<a href="https://www.google.com/">link-to-the-website</a>--i-hope-it-s-helpful-</h1>`,
		raw: `<h1>hey-there--here-is-a-<a href="https://www.google.com/">link-to-the-website</a>--i-hope-it-s-helpful-</h1>`,
	},
);

assert.deepStrictEqual(parseDG(`\\{what\\|\\}`, defaultFormat), {
	safe: `safe("{what|}")`,
	raw: "{what|}",
});

{
	let res;
	try {
		res = parseDG("what{s a dg help please explain\\", defaultFormat);
	} catch (e) {
		assert.equal(
			e.message,
			"Expected [rbracket] or [argseparator] but got [EOF]",
		);
	}
	assert.equal(res, undefined);
}

{
	let res;
	try {
		res = parseDG("{action|oops\\", defaultFormat);
	} catch (e) {
		assert.equal(e.message, "Not all brackets exited before eof.");
	}
	assert.equal(res, undefined);
}

{
	let res;
	try {
		res = parseDG("hi{fdsfad}}\\||aa\\?", defaultFormat);
	} catch (e) {
		assert.equal(e.message, "Found [rbracket] in invalid position home");
	}
	assert.equal(res, undefined);
}

{
	let res;
	try {
		res = parseDG("ip!send help hi|bye", defaultFormat); // in zig this could just be if(res == error.TheError)
	} catch (e) {
		assert.equal(
			e.message,
			"Found [argseparator] in invalid position home",
		);
	}
	assert.equal(res, undefined);
}

{
	let res;
	try {
		res = parseDG(
			"huh it looks like {|this is missing an action name",
			defaultFormat,
		);
	} catch (e) {
		assert.equal(e.message, "Expected [text], got [argseparator]");
	}
	assert.equal(res, undefined);
}

{
	let res;
	try {
		res = parseDG("ano {oi{what}is going|on?}", defaultFormat);
	} catch (e) {
		assert.equal(
			e.message,
			"Expected [rbracket] or [argseparator] but got [lbracket]",
		);
	}
	assert.equal(res, undefined);
}

{
	let res;
	try {
		res = parseDG("I am {{used}} to the {{old|syntax}}", defaultFormat);
	} catch (e) {
		assert.equal(e.message, "Expected [text], got [lbracket]");
	}
	assert.equal(res, undefined);
}
