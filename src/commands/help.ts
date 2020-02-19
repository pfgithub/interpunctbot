import * as nr from "../NewRouter";
import { parseDG } from "../parseDG";
import { messages, safe, raw, templateGenerator } from "../../messages";
import assert from "assert";
import Info from "../Info";

export function escapeHTML(html: string) {
	return html
		.split("&")
		.join("&amp;")
		.split('"')
		.join("&quot;")
		.split("<")
		.join("&lt;")
		.split(">")
		.join("&gt;");
}

export const rawhtml = templateGenerator((v: string) => v);
export const safehtml = templateGenerator((v: string) => escapeHTML(v));

export const emoji: { [key: string]: [string, string, string?] } = {
	success: [":success:", "508840840416854026"],
	failure: [":failure:", "508841130503438356"],
	emoji: [":emoji:", "629134046332583946", "surround"],
	admins: [":gear~1:", "646624018643943425"],
};

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
		html: args => rawhtml`<h1>${args[0].safe}</h1>`,
		discord: (args, info) => {
			return `==== **${args[0].safe}** ====`;
		},
	},
	Command: {
		confirm: args => {
			assert.equal(args.length, 1);
		},
		html: args => rawhtml`<span class="command">ip!${args[0].safe}</span>`,
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
		html: () =>
			commands.Atmention.html([{ raw: "never", safe: "inter·punct" }]),
		discord: (args, info) => info.atme,
	},
	Optional: {
		confirm: args => assert.equal(args.length, 1),
		html: args =>
			rawhtml`<span class="optional"><span class="optionallabel">Optional</span> ${args[0].safe}</span>`,
		discord: args => "[" + args[0].safe + "]",
	},
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
		confirm: args => assert.equal(args.length, 1),
		html: () => "NIY",
		discord: args => "@​" + args[0].safe, // OK because everyone => every[ZWSP]one
	},
	Channel: {
		confirm: args => assert.equal(args.length, 1),
		html: args => rawhtml`<a class="tag">${args[0].safe}</a>`,
		discord: args => "#" + args[0].safe,
	},
	Duration: {
		confirm: () => {},
		html: () => "NIY",
		discord: () => "bad",
	},
	Atmention: {
		confirm: args => assert.equal(args.length, 1),
		html: args => rawhtml`<a class="tag">@${args[0].safe}</a>`,
		discord: args => "@" + args[0].safe,
	},
	Emoji: {
		confirm: args => {
			assert.equal(args.length, 1);
			if (!emoji[args[0].raw]) {
				throw new Error("Invalid emoji " + args[0].raw);
			}
		},
		html: args => {
			const [emojiname, emojiid] = emoji[args[0].raw] || [
				":err_no_emoji:",
				"err_no_emoji",
			];
			return rawhtml`<img class="emoji" src="https://cdn.discordapp.com/emojis/${emojiid}.png" title="${safehtml(
				emojiname,
			)}" aria-label="${emojiname}" alt="${emojiname}" draggable="false" />`;
		},
		discord: args => {
			const [emojiname, emojiid, surround] = emoji[args[0].raw] || [
				":err_no_emoji:",
				"err_no_emoji",
			];
			if (surround) {
				return `\`<${emojiname}${emojiid}>\``;
			}
			return `<${emojiname}${emojiid}>`;
		},
	},
	Code: {
		confirm: args => {
			assert.equal(args.length, 1);
		},
		html: () => "NIY",
		discord: args => "`" + args[0].safe + "`",
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
