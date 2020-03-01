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
	emoji: [":emoji:", "629134046332583946", "surround"],
	admins: [":gear~1:", "646624018643943425"],
	upvote: [":upvote:", "674675568993894412"],
	downvote: [":downvote:", "674675569404674059"],
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
		html: (args: Args) => string;
		discord: (args: Args, info: Info) => string;
	};
} = {
	Heading: {
		confirm: args => {
			assert.equal(args.length, 1);
		},
		html: args => {
			if (globalSummaryDepth > 0)
				return rawhtml`<h3 class="heading">${args[0].safe}</h3>`;
			return rawhtml`<h2 class="heading">${args[0].safe}</h2>`;
		},
		discord: (args, info) => {
			return `==== **${args[0].safe}** ====`;
		},
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
	Required: {
		confirm: args => assert.equal(args.length, 1),
		html: args => rawhtml`<span class="required">${args[0].safe}</span>`,
		discord: args => "<" + args[0].safe + ">",
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
			`**you**: ${safe(info.prefix)}${inlineOrBlockQuote(args[0].safe)}`,
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
				<span class="bottag">BOT</span>
			</div>
			<div class="msgcontent">${args[0].safe}</div>
		</div>`,
		discord: args =>
			`**inter·punct** [BOT]: ${inlineOrBlockQuote(args[0].safe)}`,
	},
	Role: {
		confirm: args => assert.equal(args.length, 1),
		html: args => "@" + args[0].safe,
		discord: args => "@​" + args[0].safe, // OK because everyone => every[ZWSP]one
	},
	Channel: {
		confirm: args => assert.equal(args.length, 1),
		html: args => rawhtml`<span class="tag">#${args[0].safe}</span>`,
		discord: args => "#" + args[0].safe,
	},
	Duration: {
		confirm: () => {},
		html: () => "duration, NIY",
		discord: () => "duration",
	},
	Bold: {
		confirm: args => assert.equal(args.length, 1),
		html: args => rawhtml`<b>${args[0].safe}</b>`,
		discord: args => "**" + (args[0].safe || "\u200B") + "**",
	},
	Reaction: {
		confirm: args => assert.equal(args.length, 2),
		html: args =>
			rawhtml`<div class="reaction"><div class="reactionemoji">${commands.Emoji.html(
				[args[0]],
			)}</div><div class="reactioncount">${args[1].safe}</div></div>`,
		discord: (args, info) =>
			"[" +
			commands.Emoji.discord([args[0]], info) +
			" " +
			args[1].safe +
			"] ",
	},
	Atmention: {
		confirm: args => assert.equal(args.length, 1),
		html: args => rawhtml`<span class="tag">@${args[0].safe}</span>`,
		discord: args => "@" + args[0].safe,
	},
	Screenshot: {
		confirm: args => assert.equal(args.length, 1),
		html: args =>
			rawhtml`<img src="${safehtml(args[0].raw)}" class="sizimg" />`,
		discord: args => `screenshot: <${args[0].safe}>`,
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
		discord: args => "`" + (args[0].safe || "\u200B") + "`",
	},
	Blockquote: {
		confirm: args => assert.equal(args.length, 1),
		html: args =>
			rawhtml`<div class="blockquote-container"><div class="blockquote-divider"></div><blockquote>${args[0].safe}</blockquote></div>`,
		discord: args =>
			args[0].safe
				.split("\n")
				.map(l => "> " + l)
				.join("\n"),
	},
	CmdSummary: {
		confirm: args => {
			assert.equal(args.length, 1);
		},
		html: args => {
			const command = globalCommandNS[args[0].raw];
			if (!command)
				return "" + commands.Command.html(args) + " — Error :(";
			return commands.UsageSummary.html([
				{ raw: command.docsPath, safe: "never" },
			]);
		},
		discord: (args, info) => {
			const command = globalCommandNS[args[0].raw];
			if (!command)
				return (
					"- " + commands.Command.discord(args, info) + " — Error :("
				);
			return commands.UsageSummary.discord(
				[{ raw: command.docsPath, safe: "never" }],
				info,
			);
		},
	},
	UsageSummary: {
		confirm: args => {
			assert.equal(args.length, 1);
		},
		html: args => {
			const docs = globalDocs[args[0].raw];
			if (!docs) return "" + commands.Command.html(args) + " — Error :(";
			if (globalSummaryDepth >= 1)
				return rawhtml`${dgToHTML(docs.summaries.usage)} — ${dgToHTML(
					docs.summaries.description,
				)}`;
			globalSummaryDepth++;
			const result = rawhtml`${commands.Blockquote.html([
				{
					raw: "no",
					safe: rawhtml`${dgToHTML(docs.body)}`,
				},
			])}`;
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
	},
	LinkSummary: {
		confirm: args => {
			assert.equal(args.length, 1);
		},
		html: args => {
			const docs = globalDocs[args[0].raw];
			if (!docs) return "" + commands.Command.html(args) + " — Error :(";
			if (globalSummaryDepth >= 1)
				return rawhtml`<a href="${safehtml(docs.path)}">${dgToHTML(
					docs.summaries.title,
				)}</a> — ${dgToHTML(docs.summaries.description)}`;
			globalSummaryDepth++;
			const result = rawhtml`${commands.Blockquote.html([
				{
					raw: "no",
					safe: rawhtml`${dgToHTML(docs.body)}`,
				},
			])}`;
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
				commands.Command.discord(
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
	},
	LinkDocs: {
		confirm: args => {
			assert.equal(args.length, 1);
		},
		html: args => {
			const docs = globalDocs[args[0].raw];
			if (!docs) return "Error :(";

			return rawhtml`<a href="${safehtml(docs.path)}">${dgToHTML(
				docs.summaries.title,
			)}</a>`;
		},
		discord: (args, info) => {
			const docs = globalDocs[args[0].raw];
			if (!docs) return "- " + args[0].safe + " — Error :(";
			return (
				// renderdiscord`{Command|${docs.path.split("/").join(" ")}}` would be nice
				commands.Command.discord(
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
	},
	Enum: {
		confirm: args => assert.ok(args.length > 0),
		html: args => args.map(a => a.safe).join("|"),
		discord: args => args.map(a => a.safe).join("|"),
	},
	Divider: {
		confirm: args => assert.equal(args.length, 1),
		html: args => rawhtml`<span class="divider">${args[0].safe}</span>`,
		discord: args => "--- " + args[0].safe + " ---",
	},
	Link: {
		confirm: args => {
			assert.ok(args.length === 1 || args.length === 2);
		},
		html: args =>
			rawhtml`<a href="${safehtml(args[0].raw)}">${args[1]?.safe ||
				args[0].safe}</a>`,
		discord: args => "<" + args[0].safe + ">",
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
		if (!commands[fn]) {
			return "Uh oh! " + messages.emoji.failure;
		}
		return commands[fn].discord(args, info);
	});
	return res.safe.replace(/\n\n+/g, "\n\n");
}

export function dgToHTML(text: string) {
	const res = parseDG(
		text.replace(/(\n\s*\n)|(\n)/g, (q, a, b) =>
			a ? "\n" : b ? "\n" : "uh oh",
		),
		(fn, args) => {
			if (!fn)
				return safehtml`<span class="safetext">${args[0].raw}</span>`;
			if (!commands[fn]) {
				return "Uh oh! " + messages.emoji.failure;
			}
			return commands[fn].html(args);
		},
	);
	return res.safe;
}
