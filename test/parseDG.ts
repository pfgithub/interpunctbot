import { parseDG } from "../src/parseDG";
import assert from "assert";

console.log("parse dg");
assert.deepStrictEqual(
	parseDG(
		`{{Message|Hello!|Argument 2}}`,
		txt => "(clean: `" + txt + "`)",
		(fn, args) =>
			"(`" + fn + "`: " + args.map(a => a.clean).join(", ") + ")",
	),
	{
		remaining: "",
		resClean:
			"(clean: ``)(`Message`: (clean: `Hello!`), (clean: `Argument 2`))",
		resRaw: "(`Message`: (clean: `Hello!`), (clean: `Argument 2`))",
	},
);

assert.deepStrictEqual(
	parseDG(
		`Hi!`,
		txt => "(clean: `" + txt + "`)",
		(fn, args) =>
			"(`" + fn + "`: " + args.map(a => a.clean).join(", ") + ")",
	),
	{
		remaining: "",
		resClean: "(clean: `Hi!`)",
		resRaw: "Hi!",
	},
);

assert.deepStrictEqual(
	parseDG(
		`text before {{Entity}} text after`,
		txt => "(clean: `" + txt + "`)",
		(fn, args) =>
			"(`" + fn + "`: " + args.map(a => a.clean).join(", ") + ")",
	),
	{
		remaining: "",
		resClean: "(clean: `text before `)(`Entity`: )(clean: ` text after`)",
		resRaw: "text before (`Entity`: ) text after",
	},
);

assert.deepStrictEqual(
	parseDG(
		`{{Entity|Something {{Sub-Entity|Arg}} |Arg two}}`,
		txt => "(clean: `" + txt + "`)",
		(fn, args) =>
			"(`" + fn + "`: " + args.map(a => a.clean).join(", ") + ")",
	),
	{
		remaining: "",
		resClean:
			"(clean: ``)(`Entity`: (clean: `Something `)(`Sub-Entity`: (clean: `Arg`))(clean: ` `), (clean: `Arg two`))",
		resRaw:
			"(`Entity`: (clean: `Something `)(`Sub-Entity`: (clean: `Arg`))(clean: ` `), (clean: `Arg two`))",
	},
);

assert.deepStrictEqual(
	parseDG(
		`{{Heading|Hey there! Here is a {{Link|link to the website|https://www.google.com/}}. I hope it's helpful!}}`,

		txt => txt.toLowerCase().replace(/[^a-z0-9]/g, "-"),
		(fn, args) =>
			fn === "Heading"
				? `<h1>${args[0].clean}</h1>`
				: fn === "Link"
				? `<a href="${args[1].raw}">${args[0].clean}</a>`
				: "{{Errorbad!}}",
	),
	{
		remaining: ``,
		resClean: `<h1>hey-there--here-is-a-<a href="https://www.google.com/">link-to-the-website</a>--i-hope-it-s-helpful-</h1>`,
		resRaw: `<h1>hey-there--here-is-a-<a href="https://www.google.com/">link-to-the-website</a>--i-hope-it-s-helpful-</h1>`,
	},
);
