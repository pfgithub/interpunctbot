import { parseDG } from "../src/parseDG";
import assert from "assert";

console.log("parse dg");
assert.deepStrictEqual(
	parseDG(`{{Message|Hello!|Argument 2}}`, {
		cleanText: txt => "(clean: `" + txt + "`)",
		callFunction: (fn, args) => "(`" + fn + "`: " + args.join(", ") + ")",
	}),
	{
		remaining: "",
		res: "(clean: ``)(`Message`: (clean: `Hello!`), (clean: `Argument 2`))",
	},
);

assert.deepStrictEqual(
	parseDG(`Hi!`, {
		cleanText: txt => "(clean: `" + txt + "`)",
		callFunction: (fn, args) => "(`" + fn + "`: " + args.join(", ") + ")",
	}),
	{
		remaining: "",
		res: "(clean: `Hi!`)",
	},
);

assert.deepStrictEqual(
	parseDG(`text before {{Entity}} text after`, {
		cleanText: txt => "(clean: `" + txt + "`)",
		callFunction: (fn, args) => "(`" + fn + "`: " + args.join(", ") + ")",
	}),
	{
		remaining: "",
		res: "(clean: `text before `)(`Entity`: )(clean: ` text after`)",
	},
);

assert.deepStrictEqual(
	parseDG(`{{Entity|Something {{Sub-Entity|Arg}} |Arg two}}`, {
		cleanText: txt => "(clean: `" + txt + "`)",
		callFunction: (fn, args) => "(`" + fn + "`: " + args.join(", ") + ")",
	}),
	{
		remaining: "",
		res:
			"(clean: ``)(`Entity`: (clean: `Something `)(`Sub-Entity`: (clean: `Arg`))(clean: ` `), (clean: `Arg two`))",
	},
);

assert.deepStrictEqual(
	parseDG(
		`{{Heading|Hey there! Here is a {{Link|link to the website|https://www.google.com/}}. I hope it's helpful!}}`,
		{
			cleanText: txt => txt.toLowerCase().replace(/[^a-z0-9]/g, "-"),
			callFunction: (fn, args) =>
				fn === "Heading"
					? `<h1>${args[0]}</h1>`
					: fn === "Link"
					? `<a href="${args[1]}">${args[0]}</a>`
					: "{{Errorbad!}}",
		},
	),
	{
		remaining: ``,
		res: `<h1>hey-there--here-is-a-<a href="https---www-google-com-">link-to-the-website</a>--i-hope-it-s-helpful-</h1>`,
	},
);
