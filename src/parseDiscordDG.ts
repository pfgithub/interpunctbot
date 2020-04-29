import assert from "assert";
import { messages, raw, safe, templateGenerator } from "../messages";
import Info from "./Info";
import { parseDG } from "./parseDGv2";
import { globalCommandNS, globalDocs } from "./NewRouter";

export function escapeHTML(html: string) {
	return html
		.split("&")
		.join("&amp;")
		.split('"')
		.join("&quot;")
		.split("<")
		.join("&lt;")
		.split(">")
		.join("&gt;")
		.split("\n")
		.join("<br />");
}

export const rawhtml = templateGenerator((v: string) => v);
export const safehtml = templateGenerator((v: string) => escapeHTML(v));

export const emoji: { [key: string]: [string, string, string?] } = {
	success: [":success:", "508840840416854026"],
	failure: [":failure:", "508841130503438356"],
	warning: [":warning:", "508841130503438356"],
	emoji: [":emoji:", "685668888842993833", "surround"],
	admins: [":gear~1:", "646624018643943425"],
	upvote: [":upvote:", "674675568993894412"],
	downvote: [":downvote:", "674675569404674059"],
	sub10: [":sub10:", "443555771972845568"],
	sub15: [":sub15:", "443555772031434763"],
	sub20: [":sub20:", "443555771783839747"],
};

let globalSummaryDepth = 0;

const inlineOrBlockQuote = (text: string) =>
	text.includes("\n")
		? "\n" +
		  text
				.split("\n")
				.map(q => "> " + q)
				.join("\n")
		: text;

type Args = { raw: string; safe: string }[];
const commands: {
	[cmd: string]: {
		confirm: (args: Args) => never | void;
		html: (args: Args, pageURL: string) => string;
		discord?: (args: Args, info: Info) => string;
		md: (args: Args) => string;
	};
} = {
	Heading: {
		confirm: args => {
			assert.equal(args.length, 1);
		},
		html: args => {
			if (globalSummaryDepth > 0)
				return rawhtml`<h4 class="heading">${args[0].safe}</h4>`;
			return rawhtml`<h2 class="heading">${args[0].safe}</h2>`;
		},
		discord: args => {
			return `== **${args[0].safe}** ==`;
		},
		md: args => `## ${args[0].safe}`,
	},
	Title: {
		confirm: args => {
			assert.equal(args.length, 1);
		},
		html: (args, pageURL) => {
			if (globalSummaryDepth > 0)
				return rawhtml`<h3 class="heading"><a href="${safehtml(
					pageURL,
				)}">${args[0].safe}</a></h3>`;
			return rawhtml`<h1 class="heading">${args[0].safe}</h1>`;
		},
		discord: args => {
			return `==== **${args[0].safe}** ====`;
		},
		md: args => `# ${args[0].safe}`,
	},
	Command: {
		confirm: args => {
			assert.ok(args.length >= 1 && args.length <= 2);
		},
		html: args => {
			if (args[1])
				return rawhtml`<a href="${safehtml(
					args[1].raw,
				)}" class="command">ip!${args[0].safe}</a>`;
			return rawhtml`<span class="command">ip!${args[0].safe}</span>`;
		},
		discord: (args, info) => {
			return safe`\`${info.prefix}${
				/[a-zA-Z]$/.exec(info.prefix) ? " " : ""
			}${raw(args[0].safe)}\``;
		},
		md: args => {
			return safe`\`ip!${raw(args[0].safe)}\``;
		},
	},
	Interpunct: {
		confirm: args => {
			assert.equal(args.length, 0);
		},
		html: (_, pageURL) =>
			commands.Atmention.html(
				[{ raw: "never", safe: "inter·punct" }],
				pageURL,
			),
		discord: (_, info) => info.atme,
		md: () => `@inter·punct`,
	},
	Optional: {
		confirm: args => assert.equal(args.length, 1),
		html: args =>
			rawhtml`<span class="optional"><span class="optionallabel">Optional</span> ${args[0].safe}</span>`,
		md: args => "[" + args[0].safe + "]",
	},
	Required: {
		confirm: args => assert.equal(args.length, 1),
		html: args => rawhtml`<span class="required">${args[0].safe}</span>`,
		md: args => "<" + args[0].safe + ">",
	},
	ExampleUserMessage: {
		confirm: args => assert.equal(args.length, 1),
		html: args => rawhtml`
			<div class="message">
				<img
					class="profile"
					src="https://cdn.discordapp.com/embed/avatars/0.png"
				/>
				<div class="author you">you</div>
				<div class="msgcontent">ip!${args[0].safe}</div>
			</div>`,
		discord: (args, info) =>
			`**you**: ${inlineOrBlockQuote(safe(info.prefix) + args[0].safe)}`,
		md: args => `**you**: ${inlineOrBlockQuote("ip!" + args[0].safe)}`,
	},
	ExampleUserMessageNoPfx: {
		confirm: args => assert.equal(args.length, 1),
		html: args => rawhtml`
			<div class="message">
				<img
					class="profile"
					src="https://cdn.discordapp.com/embed/avatars/0.png"
				/>
				<div class="author you">you</div>
				<div class="msgcontent">${args[0].safe}</div>
			</div>`,
		md: args => `**you**: ${inlineOrBlockQuote(args[0].safe)}`,
	},
	ExampleBotMessage: {
		confirm: args => assert.equal(args.length, 1),
		html: args => rawhtml`<div class="message">
			<img
				class="profile"
				src="https://cdn.discordapp.com/avatars/433078185555656705/bcc3d8799adc00afd50b9c3168b4743e.png"
			/>
			<div class="author bot">
				inter·punct
				<span class="bottag"><svg aria-label="Verified Bot" class="botcheck" aria-hidden="false" width="16" height="16" viewBox="0 0 16 15.2"><path d="M7.4,11.17,4,8.62,5,7.26l2,1.53L10.64,4l1.36,1Z" fill="currentColor"></path></svg>BOT</span>
			</div>
			<div class="msgcontent">${args[0].safe}</div>
		</div>`,
		md: args =>
			`**inter·punct** [BOT]: ${inlineOrBlockQuote(args[0].safe)}`,
	},
	Role: {
		confirm: args => assert.equal(args.length, 1),
		html: args => "@" + args[0].safe,
		md: args => "@​" + args[0].safe, // OK because everyone => every[ZWSP]one
	},
	Channel: {
		confirm: args => assert.equal(args.length, 1),
		html: args => rawhtml`<span class="tag">#${args[0].safe}</span>`,
		md: args => "#" + args[0].safe,
	},
	Duration: {
		confirm: () => {},
		html: () => "duration eg. 10h 5min",
		md: () => "duration eg. 10h 5min",
	},
	Bold: {
		confirm: args => assert.equal(args.length, 1),
		html: args => rawhtml`<b>${args[0].safe}</b>`,
		md: args => "**" + (args[0].safe || "\u200B") + "**",
	},
	Reaction: {
		confirm: args => assert.equal(args.length, 2),
		html: (args, pageURL) =>
			rawhtml`<div class="reaction"><div class="reactionemoji">${commands.Emoji.html(
				[args[0]],
				pageURL,
			)}</div><div class="reactioncount">${args[1].safe}</div></div>`,
		discord: (args, info) =>
			"[" +
			commands.Emoji.discord!([args[0]], info) +
			" " +
			args[1].safe +
			"] ",
		md: args =>
			"[" + commands.Emoji.md([args[0]]) + " " + args[1].safe + "] ",
	},
	Atmention: {
		confirm: args => assert.equal(args.length, 1),
		html: args => rawhtml`<span class="tag">@${args[0].safe}</span>`,
		md: args => "@" + args[0].safe,
	},
	Screenshot: {
		confirm: args => assert.equal(args.length, 1),
		html: args =>
			rawhtml`<img src="${safehtml(
				args[0].raw,
			)}" alt="screenshot" class="sizimg" />`,
		discord: args => `screenshot: <${encodeURI(args[0].raw)}>`,
		md: args => `![screenshot](${encodeURI(args[0].raw)})`,
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
			)}" aria-label="${emojiname}" alt="${emojiname}" draggable="false">`;
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
		md: args => {
			const [emojiname, emojiid, surround] = emoji[args[0].raw] || [
				":err_no_emoji:",
				"err_no_emoji",
			];
			if (surround) {
				return `\`![${emojiname}](${emojiid})\``;
			}
			return `![${emojiname}](${emojiid})`;
		},
	},
	Code: {
		confirm: args => {
			assert.equal(args.length, 1);
		},
		html: args => "<code>" + args[0].safe + "</code>",
		md: args => "`" + (args[0].safe || "\u200B") + "`",
	},
	Blockquote: {
		confirm: args => assert.equal(args.length, 1),
		html: args =>
			rawhtml`<div class="blockquote-container"><div class="blockquote-divider"></div><blockquote>${args[0].safe}</blockquote></div>`,
		md: args =>
			args[0].safe
				.split("\n")
				.map(l => "> " + l)
				.join("\n"),
	},
	CmdSummary: {
		confirm: args => {
			assert.equal(args.length, 1);
		},
		html: (args, truePageURL) => {
			const pageURL = args[0].raw.toLowerCase();
			const command = globalCommandNS[pageURL];
			if (!command)
				return (
					"" +
					commands.Command.html(args, truePageURL) +
					" — Error :("
				);
			return commands.UsageSummary.html(
				[{ raw: command.docsPath, safe: "never" }],
				pageURL,
			);
		},
		discord: (args, info) => {
			const command = globalCommandNS[args[0].raw.toLowerCase()];
			if (!command)
				return (
					"- " + commands.Command.discord!(args, info) + " — Error :("
				);
			return commands.UsageSummary.discord!(
				[{ raw: command.docsPath, safe: "never" }],
				info,
			);
		},
		md: args => {
			const command = globalCommandNS[args[0].raw.toLowerCase()];
			if (!command)
				return "- " + commands.Command.md(args) + " — Error :(";
			return commands.UsageSummary.md([
				{ raw: command.docsPath, safe: "never" },
			]);
		},
	},
	UsageSummary: {
		confirm: args => {
			assert.equal(args.length, 1);
		},
		html: (args, truePageURL) => {
			const pageURL = args[0].raw;
			const docs = globalDocs[args[0].raw];
			if (!docs)
				return (
					"" +
					commands.Command.html(args, truePageURL) +
					" — Error :("
				);
			if (globalSummaryDepth >= 1)
				return rawhtml`${dgToHTML(
					docs.summaries.usage,
					truePageURL,
				)} — ${dgToHTML(docs.summaries.description, truePageURL)}`;
			globalSummaryDepth++;
			const result = rawhtml`${commands.Blockquote.html(
				[
					{
						raw: "no",
						safe: rawhtml`${dgToHTML(docs.body, pageURL)}`,
					},
				],
				pageURL,
			)}`;
			globalSummaryDepth--;
			return result;
		},
		discord: (args, info) => {
			const docs = globalDocs[args[0].raw];
			if (!docs) return "- " + args[0].safe + " — Error :(";
			return (
				"- " +
				dgToDiscord(docs.summaries.usage, info) +
				" — " +
				dgToDiscord(docs.summaries.description, info)
			);
		},
		md: args => {
			const docs = globalDocs[args[0].raw];
			if (!docs) return "- " + args[0].safe + " — Error :(";
			return (
				"- " +
				dgToMD(docs.summaries.usage) +
				" — " +
				dgToMD(docs.summaries.description)
			);
		},
	},
	LinkSummary: {
		confirm: args => {
			assert.equal(args.length, 1);
		},
		html: (args, truePageURL) => {
			const pageURL = args[0].raw;
			const docs = globalDocs[pageURL];
			if (!docs)
				return (
					"" +
					commands.Command.html(args, truePageURL) +
					" — Error :("
				);
			if (globalSummaryDepth >= 1)
				return rawhtml`<a href="${safehtml(docs.path)}">${dgToHTML(
					docs.summaries.title,
					truePageURL,
				)}</a> — ${dgToHTML(docs.summaries.description, truePageURL)}`;
			globalSummaryDepth++;
			const result = rawhtml`${commands.Blockquote.html(
				[
					{
						raw: "no",
						safe: rawhtml`${dgToHTML(docs.body, pageURL)}`,
					},
				],
				pageURL,
			)}`;
			globalSummaryDepth--;
			return result;
		},
		discord: (args, info) => {
			const docs = globalDocs[args[0].raw];
			if (!docs) return "- " + args[0].safe + " — Error :(";
			return (
				"- " +
				dgToDiscord(docs.summaries.title, info) +
				": " +
				// renderdiscord`{Command|${docs.path.split("/").join(" ")}}` would be nice
				commands.Command.discord!(
					[
						{
							safe:
								docs.path.split("/")[1] === "help"
									? safe(
											docs.path
												.slice(1)
												.split("/")
												.join(" "),
									  )
									: "help " + safe(docs.path),
							raw: "never",
						},
					],
					info,
				) +
				" — " +
				dgToDiscord(docs.summaries.description, info)
			);
		},
		md: args => {
			const docs = globalDocs[args[0].raw];
			if (!docs) return "- " + args[0].safe + " — Error :(";
			return (
				"- [" +
				dgToMD(docs.summaries.title) +
				"](https://interpunct.info" +
				docs.path +
				"): " +
				dgToMD(docs.summaries.description)
			);
		},
	},
	LinkDocs: {
		confirm: args => {
			assert.equal(args.length, 1);
		},
		html: (args, pageURL) => {
			const docs = globalDocs[args[0].raw];
			if (!docs) return "Error :(";

			return rawhtml`<a href="${safehtml(docs.path)}">${dgToHTML(
				docs.summaries.title,
				pageURL,
			)}</a>`;
		},
		discord: (args, info) => {
			const docs = globalDocs[args[0].raw];
			if (!docs) return "- " + args[0].safe + " — Error :(";
			return (
				// renderdiscord`{Command|${docs.path.split("/").join(" ")}}` would be nice
				commands.Command.discord!(
					[
						{
							safe:
								docs.path.split("/")[1] === "help"
									? safe(
											docs.path
												.slice(1)
												.split("/")
												.join(" "),
									  )
									: "help " + safe(docs.path),
							raw: "never",
						},
					],
					info,
				)
			);
		},
		md: args => {
			const docs = globalDocs[args[0].raw];
			if (!docs) return "Error :(";

			return `[${dgToMD(docs.summaries.title)}](https://interpunct.info${
				docs.path
			})`;
		},
	},
	Enum: {
		confirm: args => assert.ok(args.length > 0),
		html: args => args.map(a => a.safe).join("|"),
		md: args => args.map(a => a.safe).join("|"),
	},
	Divider: {
		confirm: args => assert.equal(args.length, 1),
		html: args => rawhtml`<span class="divider">${args[0].safe}</span>`,
		md: args => "--- " + args[0].safe + " ---",
	},
	Link: {
		confirm: args => {
			assert.ok(args.length === 1 || args.length === 2);
		},
		html: args =>
			rawhtml`<a href="${safehtml(args[0].raw)}">${args[1]?.safe ||
				args[0].safe}</a>`,
		discord: args => "<" + encodeURI(args[0].raw) + ">",
		md: args =>
			"[" +
			(args[1]?.safe || args[0].safe) +
			"](" +
			encodeURI(args[0].safe) +
			")",
	},
	Nothing: {
		confirm: args => assert.equal(args.length, 0),
		html: () => "",
		md: () => "",
	},
	Comment: {
		confirm: () => {},
		html: () => "",
		md: () => "",
	},
};

export function confirmDocs(text: string) {
	parseDG(text, (fn, args) => {
		if (!fn) return "[[ConfirmClean]]";
		if (!commands[fn]) {
			throw new Error("dg function {" + fn + "} not found");
		}
		commands[fn].confirm(args);
		return "[[Confirm{" + fn + "}]]";
	});
}

export function dgToDiscord(text: string, info: Info) {
	const res = parseDG(text, (fn, args) => {
		if (!fn) return safe(args[0].raw);
		const cmd = commands[fn];
		if (!cmd) {
			return "Uh oh! " + messages.emoji.failure;
		}
		if (!cmd.discord) return cmd.md(args);
		return cmd.discord(args, info);
	});
	return res.safe.replace(/\n\n+/g, "\n\n");
}

export function dgToMD(text: string) {
	const res = parseDG(text, (fn, args) => {
		if (!fn) return safe(args[0].raw);
		const cmd = commands[fn];
		if (!cmd) {
			return "Uh oh! " + messages.emoji.failure;
		}
		return cmd.md(args);
	});
	return res.safe.replace(/\n\n+/g, "\n\n");
}

export function dgToHTML(text: string, pageURL: string) {
	const res = parseDG(
		text.replace(/(\n\s*\n)|(\n)/g, (_, a, b) =>
			a ? "\n" : b ? "\n" : "uh oh",
		),
		(fn, args) => {
			if (!fn)
				return safehtml`<span class="safetext">${args[0].raw}</span>`;
			if (!commands[fn]) {
				return "Uh oh! " + messages.emoji.failure;
			}
			return commands[fn].html(args, pageURL);
		},
	);
	return res.safe;
}
