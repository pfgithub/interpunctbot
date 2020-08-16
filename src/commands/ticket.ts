// oh my. this is what usingnamespace is for.
//@ts-ignore
import discordMarkdownAny from "discord-markdown";
import * as discord from "discord.js";
import * as fsync from "fs";
import htmlMinifier from "html-minifier";
import { raw } from "../../messages";
import Database, { TicketConfig } from "../Database";
import Info from "../Info";
import * as nr from "../NewRouter";
import { safehtml } from "../parseDiscordDG";
import { durationFormat } from "../durationFormat";

type DiscordMarkdownOptions = {
	/// Boolean (default: false), if it should parse embed contents (rules are slightly different)
	embed?: boolean;
	/// Boolean (default: true), if it should escape HTML
	escapeHTML?: boolean;
	/// Boolean (default: false), if it should only parse the discord-specific stuff
	discordOnly?: boolean;
	/// Object, callbacks used for discord parsing. Each receive an object with different properties, and are expected to return an HTML escaped string
	discordCallback?: {
		user?: (id: { id: string }) => string;
		channel?: (id: { id: string }) => string;
		role?: (id: { id: string }) => string;
		emoji?: (animated: boolean, name: string, id: string) => string;
		everyone?: () => string;
		here?: () => string;
	};
	/// Object, maps CSS class names to CSS module class names
	cssModuleNames?: object;
};
const discordMarkdown = discordMarkdownAny as {
	toHTML: (dsmd: string, options?: DiscordMarkdownOptions) => string;
};

const msgopts: discord.MessageOptions = {
	allowedMentions: { parse: [], roles: [], users: [] },
};

nr.addDocsWebPage(
	"/help/ticket/setup",
	"Ticket Setup",
	"ticket setup tutorial thing",
	`{Title|Ticket Setup}
	
{Heading|Basic Setup}
To set up tickets, you need 1 empty category and optionally 1-3 channels for logging. Something like this:
{Screenshot|https://i.imgur.com/FZ9zOrP.png}

Configure the permissions of the category to not allow @everyone to view. Make sure {Interpunct} still has permission to view it though. Like this:
{Screenshot|https://i.imgur.com/IgmAku7.png}
You can also add in any additional permissions you need, for example if you want {Atmention|✅︎ Score Verifiers} to be allowed to help with tickets, also set:
{Screenshot|https://i.imgur.com/sVMfxgF.png}

Once you have the category set up, tell Interpunct about it.
{ExampleUserMessage|ticket category RANK REQUESTS}
If anything is wrong, {Interpunct} will tell you what needs changing.

Now, create an invitation message. Users will react to this message to create a ticket. Something like this:
{ExampleUserMessageNoPfx|{Blockquote|React {Emoji|📬} to request a rank.}
{Reaction|📬|1}}
Right click or Tap and Hold on the invitation message and select "Copy Message Link". Desktop screenshot:
{Screenshot|https://i.imgur.com/IXXmWvX.png}

Paste it like this:
{ExampleUserMessage|ticket invitation (paste)https://discordapp.com/channels/407693624374067201/413910491484913675/737920767559335976}
If anything is wrong, {Interpunct} will tell you what needs changing.

Next, set a welcome message:
{ExampleUserMessage|ticket welcome Send messages here}

Tickets are set up. To try it out, click the reaction on your invitation message. If you haven't added one yet, add one and then click it after {Interpunct} replaces it.

{Heading|Ticket logs}
{Blockquote|For logs like this:
{Screenshot|https://i.imgur.com/3S6YtZI.png}
you need 2 channels. The second one will have messages like this in it:
{Screenshot|https://i.imgur.com/8AdVa6k.png}
{ExampleUserMessage|ticket logs {Channel|ticket-logs} {Channel|uploads}}
Note that only the last 100 messages in a ticket will be logged.}

{Blockquote|For logs like this:
{Screenshot|https://i.imgur.com/LtH2SvF.png}
you need just one channel.
{ExampleUserMessage|ticket transcripts {Channel|text-transcripts}}}

{Heading|Additional configuration}

{Heading|Automatically close blank tickets}
{Blockquote|If someone makes a ticket but never sends anything, you can configure {Interpunct} to delete it automatically.
{ExampleUserMessage|ticket autoclose 15min}
Tickets where someone has sent a message will never be closed automatically.}

{Heading|Ping after someone types in a ticket}
{Blockquote|{ExampleUserMessage|ticket ping {Atmention|✅︎ Score Verifiers}}
{Screenshot|https://i.imgur.com/T1OTfUc.png}}

{Heading|Multiple ticket types}
Not yet. If you want this, ask in the {Link|https://interpunct.info/support|support server}.
`,
);

nr.addDocsWebPage(
	"/help/ticket",
	"Tickets",
	"creating tickets and stuff",
	`{Title|Tickets}

{Interpunct} can tickets.

{Heading|Notable Features}

- Logs ({Link|https://interpunct.info/viewticket?page=https://cdn.discordapp.com/attachments/735250062635958323/738369862287753277/log.html|Like This})
- In-discord transcripts
- Reaction controls (One reaction to create a ticket, one to close and save the transcript.)
- Automatic Ping (ping after someone sends a message)
- Automatic Close (close if no one sends anything)

{Heading|Setup}
{LinkDocs|/help/ticket/setup}

{Heading|Commands}
{CmdSummary|ticket category}
{CmdSummary|ticket invitation}
{CmdSummary|ticket welcome}
{CmdSummary|ticket logs}
{CmdSummary|ticket transcripts}
{CmdSummary|ticket ping}
{CmdSummary|ticket autoclose}
{CmdSummary|ticket deletetime}
{CmdSummary|ticket info}

To disable tickets, delete the invitation message and the ticket category.
`,
);

// 1: check that the category is empty. if ! empty fail.
// 2: make sure @ everyone is allowed to SEND MESSAGES. if not, error.

function ticketSuggestions(ticketdata: TicketConfig, info: Info) {
	const res: string[] = [];
	if (!ticketdata.main.category) {
		return [
			info.tag`The next step is to set the category for tickets to be added to with.\n{CmdSummary|ticket category}\nMore info in {LinkDocs|/help/ticket/setup}`,
		];
	}
	if (!ticketdata.main.invitation) {
		return [
			info.tag`The next step is to create an invitation message.\n{CmdSummary|ticket invitation}\nMore info in {LinkDocs|/help/ticket/setup}`,
		];
	}
	if (!ticketdata.main.joinmsg) {
		return [
			info.tag`The next step is to set a join message. {Interpunct} will send it when a new ticket is created.\n{CmdSummary|ticket welcome}\nMore info in {LinkDocs|/help/ticket/setup}`,
		];
	}
	res.push(
		"Ticketing is all set up! For more settings, check the docs: " +
			info.tag`{LinkDocs|/help/ticket}`,
	);
	if (!ticketdata.main.logs && !ticketdata.main.transcripts) {
		res.push(
			info.tag`If you want closed tickets to be logged, you might want to enable ticket logs and or transcripts.`,
		);
	}
	return res;
}

nr.globalCommand(
	"/help/ticket/welcome",
	"ticket welcome",
	{
		usage: "ticket welcome {Required|Welcome Message...}",
		description:
			"Set the message to be sent to users when they create a ticket. Do {Command|ticket welcome} to unset.",
		examples: [],
	},
	nr.list(...nr.a.words()),
	async ([msgtxt], info) => {
		if (!(await Info.theirPerm.manageBot(info))) return;
		if (!info.db || !info.guild) return await info.error("pms");

		const ticket = await info.db.getTicket();
		ticket.main.joinmsg = msgtxt;
		await info.db.setTicket(ticket);

		const suggestions = ticketSuggestions(ticket, info);

		await info.success(
			"Success! Ticket welcome message " +
				(msgtxt ? "set." : "removed.") +
				suggestions.map(sg => "\n" + sg).join(""),
		);
	},
);

// potential @everyone exploit for people with manage bot perms but no @ppl perms
//: set up tickets and then change the ticket visibility so everyone can see it
// then everyone will be @tted. so don't give people manage bot if you don't trust
// them.
nr.globalCommand(
	"/help/ticket/ping",
	"ticket ping",
	{
		usage: "ticket ping {Required|@Who to ping}",
		description:
			"Set a person/role to @ after someone says something in a new ticket. do {Command|ticket ping} to unset.",
		examples: [],
	},
	nr.list(...nr.a.words()),
	async ([msgtxt], info) => {
		if (!(await Info.theirPerm.manageBot(info))) return;
		if (!info.db || !info.guild) return await info.error("pms");

		const ticket = await info.db.getTicket();
		ticket.main.ping = msgtxt;
		await info.db.setTicket(ticket);

		const suggestions = ticketSuggestions(ticket, info);

		await info.success(
			"Success! Ticket ping " +
				(msgtxt ? "set." : "removed.") +
				suggestions.map(sg => "\n" + sg).join(""),
		);
	},
);

nr.globalCommand(
	"/help/ticket/autoclose",
	"ticket autoclose",
	{
		usage: "ticket autoclose {Required|Time eg 15min}",
		description:
			"automatically close a ticket if no one has sent anything it after the specified period. do {Command|ticket autoclose 0s} to unset.",
		examples: [],
	},
	nr.list(nr.a.duration()),
	async ([dur8n], info) => {
		if (!(await Info.theirPerm.manageBot(info))) return;
		if (!info.db || !info.guild) return await info.error("pms");

		const ticket = await info.db.getTicket();
		ticket.main.autoclose = dur8n || undefined;
		await info.db.setTicket(ticket);

		const suggestions = ticketSuggestions(ticket, info);

		await info.success(
			"Success! Ticket" +
				(dur8n
					? "s will be automatically closed if no one has said anything after the time period."
					: " autoclose removed.") +
				suggestions.map(sg => "\n" + sg).join(""),
		);
	},
);

nr.globalCommand(
	"/help/ticket/deletetime",
	"ticket deletetime",
	{
		usage: "ticket deletetime {Required|Time eg 1min}",
		description:
			"set how long to wait after closing a ticket before deleting the channel. messages sent in this time will show up in transcripts, but not logs. default is 1 minute.",
		examples: [],
	},
	nr.list(nr.a.duration()),
	async ([dur8n], info) => {
		if (!(await Info.theirPerm.manageBot(info))) return;
		if (!info.db || !info.guild) return await info.error("pms");

		const ticket = await info.db.getTicket();
		ticket.main.deletetime = dur8n || undefined;
		await info.db.setTicket(ticket);

		const suggestions = ticketSuggestions(ticket, info);

		await info.success(
			"Success! Ticket" +
				(dur8n
					? "s will deleted in " +
					  durationFormat(dur8n) +
					  " after closing."
					: " delete time set to default (1min).") +
				suggestions.map(sg => "\n" + sg).join(""),
		);
	},
);

nr.globalCommand(
	"/help/ticket/logs",
	"ticket logs",
	{
		usage: "ticket logs {Channel|ticket-logs} {Channel|uploads}",
		description:
			"Log the last 100 messages in a ticket to #ticket-logs when the ticket is closed. To disable, delete the log channels.",
		examples: [],
	},
	nr.list(nr.a.channel(), nr.a.channel()),
	async ([logsChan, uploadsChan], info) => {
		if (!(await Info.theirPerm.manageBot(info))) return;
		if (!info.db || !info.guild) return await info.error("pms");
		// make sure I have send messages perms on each
		for (const channel of [logsChan, uploadsChan]) {
			const myPerms = channel.permissionsFor(info.guild.me!)!;
			if (!myPerms.has("VIEW_CHANNEL")) {
				return await info.error(
					"I need permission to read messages in " +
						channel.toString(),
				);
			}
			if (!myPerms.has("SEND_MESSAGES")) {
				return await info.error(
					"I need permission to send messages in " +
						channel.toString(),
				);
			}
			if (channel === uploadsChan && !myPerms.has("ATTACH_FILES")) {
				return await info.error(
					"I need permission to attach files in " +
						channel.toString(),
				);
			}
		}
		// save
		const ticket = await info.db.getTicket();
		ticket.main.logs = { pretty: logsChan.id, uploads: uploadsChan.id };
		await info.db.setTicket(ticket);

		const suggestions = ticketSuggestions(ticket, info);

		await info.success(
			"Success! Pretty ticket logs will show up in " +
				logsChan.toString() +
				" and uploads will be in " +
				uploadsChan.toString() +
				suggestions.map(sg => "\n" + sg).join(""),
		);
	},
);

nr.globalCommand(
	"/help/ticket/transcripts",
	"ticket transcripts",
	{
		usage: "ticket logs {Channel|ticket-transcripts}",
		description:
			"Log all messages sent in a ticket to {Channel|#ticket-transcripts}. Does not log edits.",
		examples: [],
	},
	nr.list(nr.a.channel()),
	async ([transcriptsChan], info) => {
		if (!(await Info.theirPerm.manageBot(info))) return;
		if (!info.db || !info.guild) return await info.error("pms");
		// make sure I have send messages perms
		const myPerms = transcriptsChan.permissionsFor(info.guild.me!)!;
		if (!myPerms.has("VIEW_CHANNEL")) {
			return await info.error(
				"I need permission to read messages in " +
					transcriptsChan.toString(),
			);
		}
		if (!myPerms.has("SEND_MESSAGES")) {
			return await info.error(
				"I need permission to send messages in " +
					transcriptsChan.toString(),
			);
		}
		// save
		const ticket = await info.db.getTicket();
		ticket.main.transcripts = transcriptsChan.id;
		await info.db.setTicket(ticket);

		const suggestions = ticketSuggestions(ticket, info);

		await info.success(
			"Success! Messages people send in tickets will be copied into " +
				transcriptsChan.toString() +
				suggestions.map(sg => "\n" + sg).join(""),
		);
	},
);

nr.globalCommand(
	"/help/ticket/category",
	"ticket category",
	{
		usage: "ticket category {Required|CATEGORY NAME}",
		description: `Active tickets will be put into the category you set. It must be empty and with the right permissions.`,
		examples: [],
	},
	nr.list(...nr.a.words()),
	async ([catnme], info) => {
		if (!(await Info.theirPerm.manageBot(info))) return;
		if (!info.db || !info.guild) return await info.error("pms");

		const foundCategory = info.guild.channels.cache.find(
			chan =>
				(chan.name.toUpperCase() === catnme.toUpperCase() ||
					chan.id === catnme) &&
				chan.type === "category",
		) as discord.CategoryChannel | null;
		if (!foundCategory)
			return await info.error(
				"I could not find a category with that name. Make sure you have made a category and its permissions look like this: https://i.imgur.com/3S6YtZI.png",
			);

		// check permissions
		const everyonePerms = foundCategory.permissionOverwrites.get(
			info.guild.roles.everyone.id,
		);
		if (!everyonePerms)
			return await info.error(
				"Make sure your permissions for <#" +
					foundCategory.id +
					"> are set up like this: https://i.imgur.com/IgmAku7.png",
			);
		if (everyonePerms.allow.has("VIEW_CHANNEL")) {
			return await info.error(
				"@everyone must not be allowed to Read Text Channels & See Voice Channels in <#" +
					foundCategory.id +
					">. Your permissions should look something like this: https://i.imgur.com/3S6YtZI.png",
			);
		}
		if (everyonePerms.deny.has("SEND_MESSAGES")) {
			return await info.error(
				"@everyone needs to be allowed to send messages in <#" +
					foundCategory.id +
					">. https://i.imgur.com/UkAp4ZW.png",
			);
		}

		// make sure it's empty
		const fchild = foundCategory.children.array();
		if (fchild.length > 0) {
			return await info.error(
				"<#" +
					foundCategory.id +
					"> already has channels in it! Select a category that is empty to use for tickets.",
			);
		}

		const currentTickets = await info.db.getTicket();
		currentTickets.main.category = foundCategory.id;
		await info.db.setTicket(currentTickets);

		const suggestions = ticketSuggestions(currentTickets, info);

		await info.success(
			"Success! Tickets will be created in the <#" +
				foundCategory.id +
				"> channel." +
				suggestions.map(sg => "\n" + sg).join(""),
		);
	},
);

nr.globalCommand(
	"/help/ticket/info",
	"ticket info",
	{
		usage: "ticket info",
		description: "debug command",
		examples: [],
	},
	nr.list(),
	async ([], info) => {
		if (!(await Info.theirPerm.manageBot(info))) return;
		if (!info.db || !info.guild) return await info.error("pms");

		const ticketInfo = await info.db.getTicket();

		return await info.result(
			"```json\n" + JSON.stringify(ticketInfo.main) + "\n```",
		);
	},
);

nr.globalCommand(
	"/help/ticket/invitation",
	"ticket invitation",
	{
		usage: "ticket invitation {Required|invitation message link}",
		description:
			"Set the invitation message. Reacting to the invitation message will create a ticket.",
		examples: [],
	},
	nr.list(...nr.a.words()),
	async ([msglink], info) => {
		if (!(await Info.theirPerm.manageBot(info))) return;
		if (!info.db || !info.guild) return await info.error("pms");

		// find the invitation message (maybe there could be a command to create an invitation message)
		const ids = msglink.match(/[0-9]{5,}/g);
		if (!ids || ids.length !== 3)
			return await info.error(
				info.tag`Right click/tap and hold the message you want to use as an invitation message and select Copy Message Link. Then use it {Command|ticket invitation PASTE}`,
			);
		const [guildID, channelID, messageID] = ids;
		if (info.guild.id !== guildID)
			return await info.error(
				info.tag`The message you linked is on a different server. Please select a message from this server to be the ticket invitation.`,
			);
		const msgchan = info.guild.channels.resolve(
			channelID,
		) as discord.TextChannel;
		if (!msgchan)
			return await info.error(
				"I could not find the channel <#" +
					channelID +
					">. Maybe I don't have permission to view it?",
			);
		// in zig this could just be const msgmsg = msgchan.messages.fetch(messageID) catch return info.error("...")
		let msgmsg: discord.Message;
		try {
			msgmsg = await msgchan.messages.fetch(messageID);
		} catch (e) {
			return await info.error(
				"I could not find the message you linked in <#" +
					channelID +
					">. Maybe I don't have permission to view it? Make sure I have permission to Read Messages and View Message History.",
			);
		}

		// check for the ability to remove reactions in the invitation message's channel
		const chanperms = msgchan.permissionsFor(info.guild.me!);
		if (chanperms) {
			if (!chanperms.has("MANAGE_MESSAGES"))
				return await info.error(
					"In order for me to remove reactions, I need permission to Manage Messages in <#" +
						channelID +
						">.",
				);
			if (!chanperms.has("ADD_REACTIONS"))
				return await info.error(
					"In order for me to add reactions, I need permission to Add Reactions in <#" +
						channelID +
						">.",
				);
		}

		if (!info.myChannelPerms!.has("MANAGE_CHANNELS")) {
			// check for basic ticketing perms
			await info.error(
				info.tag`In order for me to be able to open and close tickets, I need permission to Manage Channels.`,
			);
			return false;
		}

		// if there are reactions on the invitation message, clear them and replace them.

		const reminders: string[] = [];

		const currentTickets = await info.db.getTicket();
		currentTickets.main.invitation = {
			channel: msgchan.id,
			message: msgmsg.id,
		};
		await info.db.setTicket(currentTickets);

		// if there are no reactions on the invitation message yet, send a reminder to add a reaction
		if (msgmsg.reactions.cache.array().length === 0)
			reminders.push(
				"React to the invitation message to pick the reaction.",
			);

		// send other suggestions
		reminders.push(...ticketSuggestions(currentTickets, info));

		return await info.success(
			"The ticket invitation message is set!" +
				reminders.map(rm => "\n" + rm).join(""),
		);
	},
);

function ticketOwnerID(channel: discord.TextChannel): string {
	const creatorid = (/<@!?([0-9]+?)>/.exec(channel.topic || "") || [
		"",
		"ERNOID",
	])[1];
	return creatorid;
}

type TicketCtx = {
	guild: discord.Guild;
	ticket: TicketConfig;
};

const verifiedbotsvg = safehtml`
    <svg aria-label="Verified Bot" class="botcheck" aria-hidden="false" width="16" height="16" viewBox="0 0 16 15.2">
        <path d="M7.4,11.17,4,8.62,5,7.26l2,1.53L10.64,4l1.36,1Z" fill="currentColor"></path>
    </svg>`;

function emojiHTML(animated: boolean, id: string, name: string) {
	return safehtml`<img class="emoji"
    src="https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}"
    title=":${name}:" aria-label=":${name}:" alt=":${name}:" draggable="false">`;
}

function genLogOneMessage(msg: discord.Message) {
	const bottag = msg.author.bot
		? safehtml`<span class="bottag">${raw(verifiedbotsvg)}BOT</span>`
		: "";

	const msgContentSafe = discordMarkdown.toHTML(msg.content, {
		discordOnly: false,
		discordCallback: {
			user: ({ id }) => {
				const usrinfo = msg.guild!.members.resolve(id);
				if (usrinfo) {
					const usrtag =
						usrinfo.user.username +
						"#" +
						usrinfo.user.discriminator;
					return safehtml`<span class="tag" data-id="${id}"
                    title="${usrtag}">@${usrinfo.displayName}</span>`;
				} else
					return safehtml`<span class="tag">${"<@!" +
						id +
						">"}</span>`;
			},
			channel: ({ id }) => {
				const chaninfo = msg.guild!.channels.resolve(id);
				if (chaninfo)
					return safehtml`<span class="tag" data-id="${id}">#${chaninfo.name}</span>`;
				else
					return safehtml`<span class="tag">${"<#" +
						id +
						">"}</span>`;
			},
			role: ({ id }) => {
				const roleinfo = msg.guild!.roles.resolve(id);
				if (roleinfo) {
					let roleColor: string | undefined = roleinfo.hexColor;
					if (roleColor === "#000000") roleColor = undefined;
					let styletxt = "";
					if (roleColor)
						styletxt = `--fg-color: ${roleColor}; --bg-color: ${roleColor}1A; --hl-color: ${roleColor}4d`;
					return safehtml`<span data-id="${id}" class="tag"
                    style="${styletxt}">@${roleinfo.name}</span>`;
				} else
					return safehtml`<span class="tag">${"<@&" +
						id +
						">"}</span>`;
			},
			emoji: (animated, name, id) => emojiHTML(animated, name, id),
			everyone: () => safehtml`<span class="tag">@everyone</span>`,
			here: () => safehtml`<span class="tag">@here</span>`,
		},
	});

	const reactions: string[] = [];
	for (const rxn of msg.reactions.cache.array()) {
		const emojitxt = rxn.emoji.id
			? emojiHTML(rxn.emoji.animated, rxn.emoji.id, rxn.emoji.name)
			: safehtml`${rxn.emoji.name}`;
		reactions.push(safehtml`<div class="reaction"
            ><div class="reactionemoji"
            >${raw(emojitxt)}</div
            ><div class="reactioncount"
            >${"" + (rxn.count || "???")}</div
        ></div>`);
	}
	const reactionsText = reactions.length ? "<br />" + reactions.join("") : "";

	const embeds: string[] = [];
	for (const embed of msg.embeds) {
		const mbedtitle = embed.title
			? safehtml`<div class="embedtitle">${embed.title}</div>`
			: "";
		const mbedesc = embed.description
			? safehtml`<div class="embedtitle">${embed.description}</div>`
			: "";
		embeds.push(safehtml`<div class="embed" style="--mbed-colr: ${embed.hexColor ||
			"unset"}"
            >${raw(mbedtitle)}${raw(mbedesc)}</div
        >`);
	}
	const embedsText = embeds.length ? "" + embeds.join("") : "";

	const attachments: string[] = [];
	for (const attachment of msg.attachments.array()) {
		const nmelcase = (attachment.name || "").toLowerCase();
		if (
			nmelcase.endsWith(".jpg") ||
			nmelcase.endsWith(".png") ||
			nmelcase.endsWith(".gif") ||
			nmelcase.endsWith(".jpeg")
		) {
			attachments.push(
				safehtml`<div><img src="${attachment.proxyURL}" class="sizimg" /></div>`,
			);
			continue;
		}
		attachments.push(
			safehtml`<div>[attachment, ${"" + attachment.size}b] <a href="${
				attachment.url
			}">${attachment.name || "ATCHMNT"}</a></div>`,
		);
	}
	const attachmentsText = attachments.length ? attachments.join("") : "";

	let memberColor = msg.member?.displayHexColor || "#000000";
	if (memberColor === "#000000") memberColor = "undefined as any";
	const authorign = msg.author.username + "#" + msg.author.discriminator;
	return {
		top: safehtml`<div class="message"
            ><img class="profile" src="${msg.author.displayAvatarURL({
				dynamic: true,
				size: 64,
			})}"
            /><div class="author" style="color: ${memberColor}"
            title="${authorign}" data-id="${msg.author.id}">
                ${msg.member?.displayName || authorign} ${raw(bottag)}</div
            ><div class="msgcontent">`,
		center: msgContentSafe + embedsText + attachmentsText + reactionsText,
		bottom: safehtml`</div></div>`,
	};
}

const docTemplate = fsync
	.readFileSync("docgen/doc/template.html", "utf-8")
	.replace(
		"{html|stylesheet}",
		"<style>" +
			fsync.readFileSync("docgen/doc/public/style.css", "utf-8") +
			"</style>",
	);

function genLogMayError(messages: discord.Message[]) {
	// return "TODO";
	const messagesListA = messages
		.sort((a, b) => a.createdTimestamp - b.createdTimestamp)
		.map(msg => {
			try {
				return genLogOneMessage(msg);
			} catch (e) {
				console.log(e);
				return {
					top: safehtml`<div class="msgerr">`,
					center: safehtml`<pre><code>${e.toString()}${"\n" +
						e.stack}</code></pre>`,
					bottom: safehtml`</div>`,
				};
			}
		});

	const messagesListB: { top: string; center: string; bottom: string }[] = [];
	for (const msg of messagesListA) {
		const latest = messagesListB[messagesListB.length - 1] || {
			top: "",
			center: "",
			bottom: "",
		};
		if (msg.top === latest.top && msg.bottom === latest.bottom)
			latest.center += "<br />" + msg.center;
		else messagesListB.push(msg);
	}
	const messagesListSafe = messagesListB
		.map(msg => msg.top + msg.center + msg.bottom)
		.join("\n");

	// fsync.writeFileSync("___DELETE.html", messagesListSafe, "utf-8");
	return htmlMinifier.minify(
		docTemplate.replace(/{html\|(.+?)}/g, (a, txt) => {
			if (txt === "navbar") return "";
			if (txt === "content") return messagesListSafe;
			if (txt === "sidebar") return "";
			if (txt === "pagetitle") return "log";
			return a;
		}),
	);
}

function genLog(messages: discord.Message[]) {
	try {
		return genLogMayError(messages);
	} catch (e) {
		return `uh oh the log couldn't be generated :(`;
	}
}

async function sendChannelLogMayError(
	ticketOwnerID: string,
	channel: discord.TextChannel,
	sendTo: discord.TextChannel,
) {
	sendTo.startTyping().catch(() => {}); // DO NOT await this. it resolves on stopTyping
	const lastMessages = (
		await channel.messages.fetch({ limit: 100 }, false)
	).array();
	for (const lmsg of lastMessages) {
		if (lmsg.partial) await lmsg.fetch();
		if (lmsg.author.partial) await lmsg.author.fetch();
		if (lmsg.member?.partial) await lmsg.author.fetch();
	}
	const logtext = genLog(lastMessages);
	const logMsg = await sendTo.send("<@" + ticketOwnerID + ">'s '", {
		...msgopts,
		files: [
			{
				name: "log.html",
				attachment: Buffer.from(logtext),
			},
		],
	});
	sendTo.stopTyping();
	const atchurl =
		"https://interpunct.info/viewticket?page=" +
		logMsg.attachments.array()[0].url;
	await logMsg.edit("<@" + ticketOwnerID + ">'s ticket: " + atchurl);
	return atchurl;
}

async function sendChannelLog(
	ticketOwnerID: string,
	channel: discord.TextChannel,
	sendTo: discord.TextChannel,
) {
	try {
		return await sendChannelLogMayError(ticketOwnerID, channel, sendTo);
	} catch (e_) {
		const e = e_ as Error;
		sendTo.stopTyping();
		await sendTo.send(
			":x: Uh oh error\n```\n" + e.toString() + "\n" + e.stack + "\n```",
		);
		return undefined;
	}
}

async function closeTicket(
	channel: discord.TextChannel,
	closer: discord.User | discord.PartialUser,
	ctx: TicketCtx,
	inactivity = false,
) {
	if (channel.deleted) return;
	if ((channel as any).__IS_CLOSING) return;
	(channel as any).__IS_CLOSING = true;

	// prettier-ignore
	await channel.edit({
		name: "closing-" + channel.name,
		topic: (channel.topic || "").replace("~", "×"),
	}, "Ticket closed by "+closer.toString());

	const forinactive = inactivity ? " for inactivity" : "";
	const deletetime = ctx.ticket.main.deletetime || 60 * 1000;
	await channel.send(
		"Ticket closed by " +
			closer.toString() +
			forinactive +
			". This channel will be deleted in " +
			durationFormat(deletetime) +
			".",
		msgopts,
	);

	let chanLogUrl: string | undefined;
	if (ctx.ticket.main.logs) {
		const chanLogSendTo = ctx.guild.channels.resolve(
			ctx.ticket.main.logs.uploads,
		);
		if (chanLogSendTo && chanLogSendTo instanceof discord.TextChannel) {
			chanLogUrl = await sendChannelLog(
				ticketOwnerID(channel),
				channel,
				chanLogSendTo,
			);
		}
	}

	await ticketLog(
		ticketOwnerID(channel),
		"Closed by " +
			closer.toString() +
			forinactive +
			(chanLogUrl ? "\n[View Log](" + chanLogUrl + ")" : ""),
		"red",
		ctx,
	);

	await new Promise(r => setTimeout(r, deletetime));
	await channel.delete("closed by " + closer.toString());
	(channel as any).__IS_CLOSING = false;
}

const colors = { green: 3066993, red: 15158332 };

async function createTicket(
	creator: discord.User | discord.PartialUser,
	ctx: TicketCtx,
) {
	const cat = ctx.guild.channels.resolve(ctx.ticket.main.category!);
	if (!cat) return; // oop can't create a ticket if there is no ticket category…
	if (cat.type !== "category") return; // oop can't create a ticket in a text channel

	const ncperms: discord.OverwriteResolvable[] = cat.permissionOverwrites.array();
	ncperms.push({ id: creator.id, allow: ["VIEW_CHANNEL"] });
	const channelName = "ticket-" + creator.id;
	// todo by topic?
	const foundch = cat.guild.channels.cache.find(
		ch => ch.name === channelName,
	) as discord.TextChannel;
	if (foundch) {
		await foundch.send(creator.toString() + ", Your ticket is here.");
		return;
	}
	const cre8tedchan = await cat.guild.channels.create(channelName, {
		parent: cat,
		permissionOverwrites: ncperms,
		topic: "~ " + creator.toString() + "'s ticket",
	});
	const hedrmsg = await cre8tedchan.send(
		creator.toString() +
			", " +
			(ctx.ticket.main.joinmsg || "No join message has been set."),
	);
	await hedrmsg.react("🗑️");
	const hndlfn = async () => {
		if (cre8tedchan.deleted) return;
		if ((cre8tedchan.topic || "").startsWith("~")) {
			await cre8tedchan.send(
				durationFormat(ctx.ticket.main.autoclose || 0) + " inactivity",
			);
			await closeTicket(cre8tedchan, creator, ctx, true);
		}
	};
	if (ctx.ticket.main.autoclose)
		setTimeout(() => {
			hndlfn().catch(e => console.log(e));
		}, ctx.ticket.main.autoclose);

	await ticketLog(creator.id, "Created ticket", "green", ctx);
}

async function ticketLog(
	actionerID: string,
	message: string,
	color: keyof typeof colors,
	ctx: TicketCtx,
) {
	if (!ctx.ticket.main.logs) return; // oop logging not enabled

	const rylActioner = ctx.guild.client.users.resolve(actionerID);

	const logsChannel = ctx.guild.channels.resolve(ctx.ticket.main.logs.pretty);
	if (!logsChannel) return;
	if (!(logsChannel instanceof discord.TextChannel)) return;

	const logEmbed = new discord.MessageEmbed();
	if (rylActioner)
		logEmbed.author = {
			name: rylActioner.username + "#" + rylActioner.discriminator,
			iconURL: rylActioner.displayAvatarURL({ dynamic: true, size: 32 }),
		};
	else
		logEmbed.author = {
			name: "id: " + actionerID,
		};
	logEmbed.color = colors[color];
	logEmbed.description = message;
	await logsChannel.send("<@" + actionerID + ">'s ticket", {
		...msgopts,
		embed: logEmbed,
	});
}

export async function onMessage(
	msg: discord.Message,
	db: Database,
): Promise<boolean> {
	if (!msg.guild) return false;
	if (msg.channel.type === "dm") return false;

	const ticketData = await db.getTicket();
	if (!ticketData.main.category) return false;
	if (!ticketData.main.invitation) return false;

	if (msg.channel.parent?.id === ticketData.main.category) {
		if (ticketData.main.transcripts) {
			const transcriptsChan = msg.channel.guild.channels.resolve(
				ticketData.main.transcripts,
			);
			if (
				transcriptsChan &&
				transcriptsChan instanceof discord.TextChannel
			) {
				await transcriptsChan.send(
					"<@" +
						ticketOwnerID(msg.channel as discord.TextChannel) +
						">'s ticket: [" +
						msg.author.toString() +
						"]: " +
						msg.content,
					msg.embeds[0]
						? { embed: msg.embeds[0], ...msgopts }
						: msgopts,
				);
				for (const atchmnt of msg.attachments) {
					await transcriptsChan.send(
						"Attachment: " + atchmnt[1].url,
						msgopts,
					);
				}
			}
		}
		// @ score verifiers maybe
		if (!msg.author.bot && (msg.channel.topic || "").startsWith("~")) {
			await msg.channel.setTopic(
				(msg.channel.topic || "").replace("~", "+"),
				"active",
			);
			if (ticketData.main.ping) {
				await msg.channel.send(ticketData.main.ping);
			}
		}
	}

	return false;
}

export async function onMessageReactionAdd(
	rxn: discord.MessageReaction,
	usr: discord.User,
	db: Database,
): Promise<boolean> {
	if (usr.bot) return false;
	if (!rxn.message.guild) return false;

	const ticketData = await db.getTicket();
	if (!ticketData.main.category) return false;
	if (!ticketData.main.invitation) return false;

	const ctx: TicketCtx = { guild: rxn.message.guild, ticket: ticketData };

	if (
		(rxn.message.channel as discord.TextChannel).parent?.id ===
			ticketData.main.category &&
		// && title contains ticket magic
		rxn.emoji.name === "🗑️"
	) {
		await closeTicket(rxn.message.channel as discord.TextChannel, usr, ctx);
		return true;
	}
	if (rxn.message.id === ticketData.main.invitation.message) {
		if (rxn.partial) await rxn.fetch();
		await rxn.users.fetch({ limit: 4 });
		if (rxn.users.cache.size == 1) {
			await rxn.message.react(rxn.emoji);
			await rxn.users.remove(usr.id);
			return true;
		}
		await rxn.users.remove(usr.id);
		await createTicket(usr, ctx);
		return true;
	}
	// console.log(rxn, usr);
	return false;
}
