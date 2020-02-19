import * as nr from "../NewRouter";
import { parseDG } from "../parseDG";
import { messages, safe, raw } from "../../messages";
import assert from "assert";
import Info from "../Info";

type Args = { raw: string; safe: string }[];
const commands: {
	[cmd: string]: {
		confirm: (args: Args) => never | void;
		html: (args: Args) => string;
		discord: (args: Args, info: Info) => string;
	};
} = {
	Heading: {
		confirm: args => {
			assert.equal(args.length, 1);
		},
		html: args => "Not Implemented",
		discord: (args, info) => {
			return `[ **${args[0].safe}** ]`;
		},
	},
	Command: {
		confirm: args => {
			assert.equal(args.length, 1);
		},
		html: args => "NIY",
		discord: (args, info) => {
			return safe`\`${info.prefix}${
				/[a-zA-Z]$/.exec(info.prefix) ? " " : ""
			}${raw(args[0].safe)}\``;
		},
	},
	Interpunct: {
		confirm: args => {
			assert.equal(args.length, 0);
		},
		html: () => "NIY",
		discord: (args, info) => info.atme,
	},
	Optional: { confirm: () => {}, html: () => "NIY", discord: () => "bad" },
	ExampleUserMessage: {
		confirm: () => {},
		html: () => "NIY",
		discord: () => "bad",
	},
	ExampleBotMessage: {
		confirm: () => {},
		html: () => "NIY",
		discord: () => "bad",
	},
	Role: {
		confirm: () => {},
		html: () => "NIY",
		discord: () => "bad",
	},
	Channel: {
		confirm: () => {},
		html: () => "NIY",
		discord: () => "bad",
	},
	Duration: {
		confirm: () => {},
		html: () => "NIY",
		discord: () => "bad",
	},
	Atmention: {
		confirm: () => {},
		html: () => "NIY",
		discord: () => "bad",
	},
	Emoji: {
		confirm: () => {},
		html: () => "NIY",
		discord: () => "bad",
	},
	Code: {
		confirm: () => {},
		html: () => "NIY",
		discord: () => "bad",
	},
};

export function confirmDocs(text: string) {
	const res = parseDG(
		text,
		() => "[[ConfirmClean]]",
		(fn, args) => {
			if (!commands[fn]) {
				throw new Error("dg function {{" + fn + "}} not found");
			}
			commands[fn].confirm(args);
			return "[[Confirm{{" + fn + "}}]]";
		},
	);
	if (res.remaining) throw new Error("imbalanced dg curlies}}");
}

export function parseDiscord(text: string, info: Info) {
	const res = parseDG(
		text,
		txt => safe`${txt}`,
		(fn, args) => {
			if (!commands[fn]) {
				return "Uh oh! " + messages.emoji.failure;
			}
			return commands[fn].discord(args, info);
		},
	);
	return res.resClean;
}

nr.addErrorDocsPage("/errors/help-path-not-found", {
	overview:
		"That help page could not be found. For all help, use {{Command|help}}",
	detail: "",
});

nr.globalCommand(
	"/help/help/help", // hmm
	"help",
	{
		usage: "help {{Optional|command}}",
		description: "Bot help",
		examples: [],
	},
	nr.list(...nr.a.words()),
	async ([cmd], info) => {
		const docsPage =
			nr.globalDocs[cmd || "/help"] ||
			nr.globalDocs[
				nr.globalCommandNS[cmd.toLowerCase()]?.docsPath || ""
			];
		if (docsPage) {
			const bodyText = parseDiscord(docsPage.body, info);
			await info.result(
				bodyText +
					"\n" +
					"> <https://interpunct.info" +
					docsPage.path +
					">",
			);
		} else {
			await info.help("/errors/help-path-not-found", "error");
		}
	},
);
