import * as Discord from "discord.js";
import { TextChannel } from "discord.js";
import { assertNever, ilt, perr } from "../..";
import { messages, safe } from "../../messages";
import { AutodeleteRule, AutodeleteRuleNoID } from "../Database";
import { durationFormat } from "../durationFormat";
import Info from "../Info";
import * as nr from "../NewRouter";
import { a, AP } from "./argumentparser";

export const stripMentions = (msg: string): string => {
	return msg
		.replace(/@(everyone|here)/g, "")
		.replace(/<@.+?>/g, "")
		.replace(/<#.+?>/g, "")
	;
};

nr.addDocsWebPage(
	"/help/channels",
	"Channels",
	"channel management",
	`{Title|Channels}

{Interpunct} has a variety of channel management commands.

{CmdSummary|purge}
{CmdSummary|slowmode set}
{CmdSummary|send}
{CmdSummary|pinbottom}
{LinkSummary|/help/messages}`,
);

nr.addDocsWebPage(
	"/help/messages",
	"Welcome/Goodbye Messages",
	"welcome/goodbye messages",
	`{Title|Welcome/Goodbye Messages}

{CmdSummary|messages set welcome}
{CmdSummary|messages remove welcome}
{CmdSummary|messages set goodbye}
{CmdSummary|messages remove goodbye}`,
);

// nr.globalCommand(
// 	"/help/channels/purge/until",
// 	"purge until",
// 	{
// 		usage: "purge until {Required|message url}",
// 		description:
// 			"Delete messages backwards until reaching a specific message. (also deletes that message).",
// 		examples: [
// 			{
// 				in:
// 					"purge https://discordapp.com/channels/407693624374067201/407917609636462592/407918623353602049",
// 				out:
// 					"{Atmention|you}, {Emoji|success} Succesfully deleted 3 messages.",
// 			},
// 		],
// 	},
// 	nr.passthroughArgs,
// 	async ([messageLink], info) => {
// 		// fetch message from the link
// 		// confirm("are you sure")
// 	},
// );
nr.globalCommand(
	"/help/channels/purge",
	"purge",
	{
		usage: "purge {Required|message count}",
		description: "Purge messages in a channel. Skips pinned messages.",
		examples: [
			{
				in: "purge 1",
				out:
					"{Atmention|you}, {Emoji|success} Succesfully deleted 1 message.",
			},
		],
		perms: { runner: ["manage_messages_thischannel"] }, // would be neat if adding "guild" here would pass in an info with guild and db guarenteed
	},
	nr.list(nr.a.number()),
	async ([messageLimit], info) => {
		if (!info.guild || !info.db) {
			return await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
		}

		if (
			messageLimit < 1 ||
			messageLimit > 100 ||
			!Number.isInteger(messageLimit)
		) {
			return await info.error(
				messages.channels.purge.message_limit(info, messageLimit),
			);
		}

		const channel = info.message.channel as TextChannel;
		const messagesToDeleteOrig = (await channel.messages.fetch({
			limit: messageLimit,
		}));
		const messagesToDelete = messagesToDeleteOrig.filter(msg => !msg.pinned);
		const skip_count = messagesToDeleteOrig.size - messagesToDelete.size;
		// const confirmationResult = await info.confirm("are you sure?");
		// if (!confirmationResult) {
		// 	return;
		// }
		// if(!await info.confirm("are you sure?")){ return; }
		// this can be done with an emoji reaction system like goirankbot has
		// this can be done with our await confirm() thing that uses buttons
		const progressMessage = await info.channel.send(
			messages.channels.purge.in_progress(info, messagesToDelete.size),
		);
		const now = new Date().getTime();
		const toBulkDelete = messagesToDelete.filter(
			m => m.createdAt.getTime() > now - 13 * 24 * 60 * 60 * 1000, // 13 just in case. discord limit is 14
		);
		const toSlowDelete = messagesToDelete.filter(
			m => m.createdAt.getTime() <= now - 13 * 24 * 60 * 60 * 1000,
		);
		await channel.bulkDelete(toBulkDelete);
		let deletedCount = toBulkDelete.size;
		const stres = async () => {
			const progressPerdeci = Math.floor(
				(deletedCount / toSlowDelete.size) * 10,
			);
			const iltres = await ilt<Discord.Message<boolean>>(
				progressMessage.edit(
					`Deleting messages... [\`${"X".repeat(progressPerdeci) +
						" ".repeat(
						    10 - progressPerdeci,
						)}\`] (${deletedCount} / ${messagesToDelete.size})`,
				),
				"purge messages progress bar",
			);
			if (iltres.error) return; // nope stop
			updateProgressInterval = startUpdateThing();
		};
		const startUpdateThing = () =>
			setTimeout(
				() => perr(stres(), "updating message delete progress message"),
				3000,
			);
		let updateProgressInterval = startUpdateThing();
		for (const [, message] of toSlowDelete) {
			await message.delete();
			deletedCount++;
		}
		clearInterval(updateProgressInterval);
		await info.success(
			messages.channels.purge.success(info, messagesToDelete.size, skip_count),
		);
		await progressMessage.delete();
	},
);

/*
@CommandDocumentation /help/channels/slowmode

## Slow Mode

## {Emoji|admins} Enable Slowmode

: {Command|channel slowmode set {Required|seconds} {Enum|seconds|minutes|hours|days} {Required|{Channel|channel}}}
: {Command|channel slowmode disable {Required|{Channel|channel}}
: Set slowmode on {Channel|channel} to some number of seconds.
Command: channel slowmode set 2 seconds #general
Output: @you, {Emoji|success} Slowmode for {Channel|channel} set to 2 seconds.

*/

nr.globalCommand(
	"/help/channels/slowmode/set",
	"slowmode set",
	{
		usage:
			"slowmode set {Required|{Channel|channel}} {Required|{Duration|duration}}",
		description:
			"Set the slowmode for a channel to values that discord does not provide (such as 1 second, 45 minutes, ...). Maximum of 6 hours, minimum of 1 second, set to 0 to disable slowmode.",
		examples: [
			{
				in: "slowmode set {Channel|channel} 1 second",
				out:
					"{Atmention|you}, {Emoji|success} Slowmode for {Channel|channel} set to 1 second, 000ms",
			},
		],
		perms: { runner: ["manage_channels"] },
	},
	nr.list(nr.a.channel(), nr.a.duration()),
	async ([channel, time], info) => {
		const guild = info.guild;
		if (!guild) {
			return await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
		}

		if (channel.type !== Discord.ChannelType.GuildText) {
			return await info.error(
				"Slowmode can only be set on text channels.",
			);
		}
		const finalTime = Math.ceil(time / 1000);
		const finalTimeMS = finalTime * 1000;
		await (channel as Discord.GuildTextBasedChannel).setRateLimitPerUser(
			finalTime,
			"set by " + info.message.author.toString(),
		);
		return await info.success(
			`Slowmode for ${channel.toString()} set to ${durationFormat(
				finalTimeMS,
			)}.`, // should use moment formatting
		);
	},
);

nr.addDocsWebPage(
	"/help/autodelete",
	"Autodelete",
	"have inter·punct remove certain messages automatically",
	`{Title|Autodelete}
Autodelete in inter·punct can be set up to delete messages automatically from a user, in a channel, or starting with a given prefix, after a time period.

{Heading|Using autodelete rules to create a 3s-delete channel}
{ExampleUserMessage|autodelete add 3s channel {Channel|3s-delete}}
Any messages sent in {Channel|3s-delete} will be deleted after 3 seconds.

{Heading|Using autodelete rules to delete bot messages after a certain time period}
{ExampleUserMessage|autodelete add 10 seconds user {Atmention|Mee6}}
Any messages sent by {Atmention|Mee6} will be deleted after 10 seconds.

{Heading|Using autodelete rules to ban reaction gifs from tenor}
{ExampleUserMessage|autodelete add 1 second prefix https://tenor.com/}
{ExampleUserMessageNoPfx|https://tenor.com/ this message will be deleted}
Note: Autodelete rules set to <1 second will PM the user of the deleted message.

{Heading|Commands}
{CmdSummary|autodelete add}
{CmdSummary|autodelete list}
{CmdSummary|autodelete remove}`,
);

export function printrule(rule: AutodeleteRule): string {
	if (typeof rule.duration !== "number") {
		if(rule.duration.type === "autopublish" && rule.type === "channel") {
			return "Automatically publish messages in #"+rule.channel;
		}else return "Other rule";
	}
	if (rule.type === "prefix") {
		return `Remove messages starting with ${
			rule.prefix
		} after ${durationFormat(rule.duration)}`;
	}
	if (rule.type === "channel") {
		return `Remove messages in <#${
			rule.channel
		}> after ${durationFormat(rule.duration)}`;
	}
	if (rule.type === "user") {
		return `Remove messages from user <@${rule.user}> after ${durationFormat(rule.duration)}`;
	}
	if (rule.type === "role") {
		return `Remove messages from user <@&${rule.role}> after ${durationFormat(rule.duration)}`;
	}
	if (rule.type === "counting") {
		return `Remove messages in <#${
			rule.channel
		}> that do not count after ${durationFormat(rule.duration)}`;
	}
	if (rule.type === "textonly") {
		return `Remove text-only messages in <#${
			rule.channel
		}>`;
	}
	return assertNever(rule);
}

const autodelete_perms = {
	runner: ["manage_channels", "manage_bot"],
	bot: ["manage_messages"],
} as const;

nr.globalCommand(
	"/help/autodelete/list",
	"autodelete list",
	{
		usage: "autodelete list",
		description: "list all autodelete rules on this server",
		examples: [],
		perms: { runner: autodelete_perms.runner },
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		if (!info.db) {
			return await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
		}
		const ap = await AP({
			info,
			cmd,
			partial: true,
			help: "/help/autodelete/list",
		});
		if (!ap) return;
		const autodelete = await info.db.getAutodelete();
		return await info.result(
			"Autodelete Rules:\n" +
				autodelete.rules
				    .map(
				        (
				            rule, // {Command|"+escape("autodelete remove "+rule.id)+"}
				        ) =>
				            "`" +
							safe(info.prefix) +
							"autodelete remove " +
							rule.id +
							"` - " +
							printrule(rule),
				    )
				    .join("\n"),
		);
	},
);
nr.globalCommand(
	"/help/autodelete/remove",
	"autodelete remove",
	{
		usage: "autodelete remove #",
		description:
			"remove an autodelete rule. use {Command|autodelete list} to list.",
		examples: [],
		perms: { runner: autodelete_perms.runner },
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		if (!info.db) {
			return await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
		}
		const ap = await AP(
			{ info, cmd, partial: true, help: "/help/autodelete/remove" },
			a.number(),
		);
		if (!ap) return;
		const [id] = ap.result;
		const res = await info.db.removeAutodelete(id);
		if(!res) return await info.error("Autodelete rule not found? "+info.tag`{Command|autodelete list}`);
		return await info.success("Autodelete rule removed");
	},
);

nr.addHelpDocsPage("/help/autodelete/add/prefix", {
	title: "autodelete prefix",
	usage: "autodelete add {Required|{Duration}} prefix {Required|the prefix}",
	description:
		"create an autodelete rule to remove all messages that start with a specified prefix",
	examples: [
		{
			in: "autodelete add 1s prefix https://tenor.com/",
			out:
				"{Atmention|you}, {Emoji|success} These types of messages will be automatically deleted after 1 second.\nNIY\nExample of a message that will be removed: {Code|https://tenor.com/}",
		},
	],
	perms: autodelete_perms,
});

// nr.addDocsShorthand("autodelete add prefix", "/help/autodelete/add/prefix");

nr.addHelpDocsPage("/help/autodelete/add/channel", {
	title: "autodelete channel",
	usage:
		"autodelete add {Required|{Duration}} channel {Required|{Channel|the-channel}}",
	description:
		"create an autodelete rule to remove all messages in a certain channel",
	examples: [],
	perms: autodelete_perms,
});

nr.addHelpDocsPage("/help/autodelete/add/user", {
	title: "autodelete user",
	usage:
		"autodelete add {Required|{Duration}} user {Required|{Atmention|the-user}}",
	description:
		"create an autodelete rule to remove all messages from a certain user or bot",
	examples: [],
	perms: autodelete_perms,
});

nr.addHelpDocsPage("/help/autodelete/add/role", {
	title: "autodelete role",
	usage:
		"autodelete add {Required|{Duration}} role {Required|{Role|the role}}",
	description:
		"create an autodelete rule to remove all messages from people with a certain role",
	examples: [],
	perms: autodelete_perms,
});

nr.addHelpDocsPage("/help/autodelete/add/counting", {
	title: "autodelete counting",
	usage:
		"autodelete add {Required|{Duration}} counting {Required|{Channel|the channel}}",
	description:
		"create an autodelete rule to remove all messages from people not counting sequentially",
	examples: [],
	perms: autodelete_perms,
});

nr.globalCommand(
	"/help/autodelete/add",
	"autodelete add",
	{
		usage:
			"autodelete add {Required|{Duration}} {Required|{Enum|prefix|user|channel|role}}",
		description:
			"create an autodelete rule. autodelete rules will delete messages that match a certain rule, such as those from a specific user or in a specific channel.",
		extendedDescription: `{UsageSummary|/help/autodelete/add/prefix}
{UsageSummary|/help/autodelete/add/user}
{UsageSummary|/help/autodelete/add/channel}
{UsageSummary|/help/autodelete/add/role}
{UsageSummary|/help/autodelete/add/textonly}`,
		examples: [],
		perms: autodelete_perms,
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		if (!info.db) {
			return await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
		}
		const root_ap = await AP(
			{ info, cmd, partial: true, help: "/help/autodelete/add" },
			a.duration(),
			a.enum("prefix", "user", "channel", "role", "textonly"),
		);
		if (!root_ap) return;
		const [duration, mode] = root_ap.result;

		cmd = root_ap.remaining;
		let autodeleteInfo: AutodeleteRuleNoID;
		if (mode === "prefix") {
			const prefix = cmd;
			if (!prefix) return await info.error("Expected prefix bad");
			autodeleteInfo = { type: "prefix", prefix, duration };
		} else if (mode === "user") {
			const ap = await AP(
				{ info, cmd, help: "/help/autodelete/add/user" },
				a.user(),
			);
			if (!ap) return;
			const [user] = ap.result;
			autodeleteInfo = { type: "user", user: user.id, duration };
		} else if (mode === "channel") {
			const ap = await AP(
				{ info, cmd, help: "/help/autodelete/add/channel" },
				a.channel(),
			);
			if (!ap) return;
			const [channel] = ap.result;
			autodeleteInfo = { type: "channel", channel: channel.id, duration };
		} else if (mode === "textonly") {
			const ap = await AP(
				{ info, cmd, help: "/help/autodelete/add/channel" },
				a.channel(),
			);
			if (!ap) return;
			const [channel] = ap.result;
			autodeleteInfo = { type: "textonly", channel: channel.id, duration };
		} else if (mode === "role") {
			const ap = await AP(
				{ info, cmd, help: "/help/autodelete/add/role" },
				...a.role(),
			);
			if (!ap) return;
			const [role] = ap.result;
			autodeleteInfo = { type: "role", role: role.id, duration };
		} else {
			assertNever(mode);
		}

		const autodeleteLimit = await info.db.getAutodeleteLimit();
		if ((await info.db.getAutodelete()).rules.length >= autodeleteLimit)
			return await info.error(
				"This server has reached its autodelete limit (" +
					autodeleteLimit +
					").\n> To increase this limit, ask on the support server\n> Make sure to include your server id which is `"+info.guild?.id+"`\n> https://discord.gg/fYFZCaG25k",
			); // !!!
		const autodeleteID = await info.db.addAutodelete(autodeleteInfo);
		return await info.success(
			"These types of messages will be automatically deleted after " +
				durationFormat(duration) +
				".\n> To remove this rule, `ip!autodelete remove " +
				autodeleteID +
				"`", // !!!
		);
	},
);

nr.globalCommand(
	"/help/autodelete/restrict",
	"autodelete restrict",
	{
		usage:
			"autodelete restrict {Required|autodelete #} {Required|roles to restrict}",
		description:
			"Restrict an autodelete rule so it only applies to people with certain roles",
		examples: [],
		perms: { runner: autodelete_perms.runner },
	},
	nr.list(nr.a.number(), ...nr.a.role()),
	async ([number, role], info) => {
		return info.error("Not implemented yet");
	},
);

nr.globalCommand(
	"/help/autodelete/bypass",
	"autodelete bypass",
	{
		usage:
			"autodelete bypass {Required|autodelete #} {Required|roles to restrict}",
		description:
			"Set roles to bypass a certain autodelete rule automatically.",
		extendedDescription:
			"People with manage messages perms can always use \\{\\{DoNotDelete\\}\\} in their" +
			"messages to manually bypass autodelete even if no bypass roles are set for that rule",
		examples: [],
		perms: { runner: autodelete_perms.runner },
	},
	nr.list(nr.a.number(), ...nr.a.role()),
	async ([number, role], info) => {
		return info.error("Not implemented yet");
	},
);

nr.globalCommand(
	"/help/channels/send",
	"send",
	{
		usage:
			"send {Required|{Channel|list-of-channels}} {Required|message to send}",
		description: "Send a message to multiple channels at once",
		examples: [
			{
				in: "send {Channel|channel-one} {Channel|channel-two} hi!",
				out:
					"{Atmention|you}, {Emoji|success} Your message was sent to {Channel|channel-one}, {Channel|channel-two}",
			},
		],
		perms: { runner: ["manage_channels"], raw_message: true },
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		const channelsToSendTo = [...info.raw_message!.mentions.channels.values()];

		if (channelsToSendTo.length === 0) {
			return await info.error(
				messages.channels.send_many.no_channels_tagged(info),
			);
		}

		const safeMessage = stripMentions(cmd); // makes a message safe (removes @everyone and @here and all other mentions)

		const failures: Discord.Channel[] = [];
		const successes: Discord.Channel[] = []; // maybe do Message[] and link to every message i.p sent?
		for (const channel of channelsToSendTo) {
			if (channel.type !== Discord.ChannelType.GuildText) {
				failures.push(channel);
				continue;
			}
			const sent = await ilt(
				channel.send(safeMessage),
				"sending message for sendmany",
			);
			if (sent.error) {
				failures.push(channel);
			} else {
				successes.push(channel);
			}
		}

		if (failures.length === 0) {
			if(info.message.content.includes("channels sendMany")) {
				return await info.warn(info.tag`Message sent. {Command|channels sendMany} has been renamed, next time you can use {Command|send #channels …message}`);
			}
			return await info.success(
				messages.channels.send_many.succeeded_sending(info, successes),
			);
		}
		if (successes.length === 0) {
			return await info.error(
				messages.channels.send_many.failed_sending(info, failures),
			);
		}
		return await info.error(
			messages.channels.send_many.partially_succeeded_sending(
				info,
				successes,
				failures,
			),
		);
	},
);

async function cannotSendIn(channel: Discord.GuildChannel, info: Info): Promise<boolean> {
	if (channel.type !== Discord.ChannelType.GuildText) {
		await info.error("Cannot send messages in a "+channel.type+" channel. Please select a text channel.");
		return true;
	}
	if(!channel.permissionsFor(channel.guild.members.me!)?.has("SendMessages")) {
		await info.error("I do not have permissions to send messages in "+channel.toString()+".");
		return true;
	}
	return false;
}

nr.globalCommand(
	"/help/messages/set-goodbye",
	"messages set goodbye",
	{
		usage:
			"messages set goodbye {Required|{Channel|channel}} {Required|message...}",
		description:
			"set a message to show when someone leaves the server. use \\{Name\\} and \\{Mention\\} to include people's usernames/mentions",
		examples: [
			{
				in:
					"messages set goodbye {Channel|welcome}\nGoodbye \\{Name\\} (\\{Mention\\}), we will miss you!",
				out:
					"{Atmention|you}, {Emoji|success} Goodbye message set. Here is an example of what might be sent to {Channel|welcome} when someone leaves:\n\nGoodbye person leaving ({Atmention|person leaving}), we will miss you!",
			},
		],
		perms: { runner: ["manage_bot"] },
	},
	nr.list(nr.a.channel(), ...nr.a.words()),
	async ([channel, message], info) => {
		if (!info.db) {
			return await info.docs("/errors/pms", "error");
		}
		const theyCanMention = info.message.member!.permissions.has(
			"MentionEveryone",
		);

		if(await cannotSendIn(channel, info)) return;

		if (!theyCanMention) {
			const nmsg = stripMentions(message);
			if (nmsg !== message)
				await info.warn(
					"To include arbitrary mentions in the goodbye message, you must have permission to MENTION_EVERYONE.",
				);
			message = nmsg;
		}
		message = message.trim();
		if (!message.includes("{Mention}") && !message.includes("{Name}")) {
			await info.warn(
				"To include the username or mention the user who left, put `{Mention}` or `{Name}` in your message.",
			);
		}

		const events = await info.db.getEvents();
		events.userLeave = {
			action: "message",
			message: message,
			channel: channel.id,
		};
		await info.db.setEvents(events);

		await info.success(
			"Goodbye message set. Here is an example of what might be sent to <#" +
				channel.id +
				"> when someone leaves:\n\n" +
				message
				    .split("{Name}")
				    .join("inter·punct")
				    .split("{Mention}")
				    .join(info.atme),
		);
	},
);

nr.globalCommand(
	"/help/messages/remove-welcome",
	"messages remove welcome",
	{
		usage: "messages remove welcome",
		description: "disable the welcome message",
		examples: [],
		perms: { runner: ["manage_bot"] },
	},
	nr.list(),
	async ([], info) => {
		if (!info.db) {
			return await info.docs("/errors/pms", "error");
		}

		const events = await info.db.getEvents();
		events.userJoin = {
			action: "none",
		};
		await info.db.setEvents(events);

		await info.success("Welcome message removed.");
	},
);

nr.globalCommand(
	"/help/messages/remove-goodbye",
	"messages remove goodbye",
	{
		usage: "messages remove goodbye",
		description: "disable the goodbye message",
		examples: [],
		perms: { runner: ["manage_bot"] },
	},
	nr.list(),
	async ([], info) => {
		if (!info.db) {
			return await info.docs("/errors/pms", "error");
		}

		const events = await info.db.getEvents();
		events.userLeave = {
			action: "none",
		};
		await info.db.setEvents(events);

		await info.success("Goodbye message removed.");
	},
);

nr.globalCommand(
	"/help/messages/set-welcome",
	"messages set welcome",
	{
		usage:
			"messages set welcome {Required|{Channel|channel}} {Required|message...}",
		description:
			"set a message to show when someone joins the server. use \\{Name\\} and \\{Mention\\} to include people's usernames/mentions",
		examples: [
			{
				in:
					"messages set goodbye {Channel|welcome}\nWelcome to the server \\{Mention\\} (\\{Name\\})!!! Make sure to check out the {Channel|rules}!",
				out:
					"{Atmention|you}, {Emoji|success} Welcome message set. Here is an example of what might be sent to {Channel|welcome} when someone joins:\n\nWelcome to the server {Atmention|person joining} (person joining)!!! Make sure to check out the {Channel|rules}!",
			},
		],
		perms: { runner: ["manage_bot"] },
	},
	nr.list(nr.a.channel(), ...nr.a.words()),
	async ([channel, message], info) => {
		if (!info.db) {
			return await info.docs("/errors/pms", "error");
		}
		const theyCanMention = info.message.member!.permissions.has(
			"MentionEveryone",
		);

		if(await cannotSendIn(channel, info)) return;

		if (!theyCanMention) {
			const nmsg = stripMentions(message);
			if (nmsg !== message)
				await info.warn(
					"To include arbitrary mentions in the welcome message, you must have permission to MENTION_EVERYONE.",
				);
			message = nmsg;
		}
		message = message.trim();
		if (!message.includes("{Mention}") && !message.includes("{Name}")) {
			await info.warn(
				"To include the username or mention the user who joined, put `{Mention}` or `{Name}` in your message.",
			);
		}

		const events = await info.db.getEvents();
		events.userJoin = {
			action: "message",
			message: message,
			channel: channel.id,
		};
		await info.db.setEvents(events);

		await info.success(
			"Welcome message set. Here is an example of what might be sent to <#" +
				channel.id +
				"> when someone joins:\n\n" +
				message
				    .split("{Name}")
				    .join("inter·punct")
				    .split("{Mention}")
				    .join(info.atme),
		);
	},
);

const lastUpdatedTimesCache: { [key: string]: number | undefined } = {};
export async function sendPinBottom(info: Info, chid: Discord.Snowflake, from_timeout = false): Promise<void> {
	if (!info.db) return;
	const db = info.db;
	const client = info.message.client;

	const chopts = await db.getChannelOptions(); // should be instant hopefully. might cause race conditions sometimes. this is a very well coded and robust bot.
	const topts = chopts[chid];
	if (!topts) return;
	if (!topts.pinBottom) return;

	const lastSentTime = lastUpdatedTimesCache[chid];
	if (lastSentTime && lastSentTime > Date.now() - 1000 * 5) {
		if(!from_timeout) setTimeout(
			() => {
				sendPinBottom(info, chid, true).catch(e => console.log("sendpinbottom error", e));
			},
			1000 * 5,
		);
		return;
	}
	lastUpdatedTimesCache[chid] = new Date().getTime();
	const chanl = client.channels.resolve(chid)! as Discord.TextChannel;
	if (!chanl) return; // f
	const newSentMessage = await chanl.send(topts.pinBottom);
	if (topts.lastestPinBottom) {
		try {
			await (
				await chanl.messages.fetch(topts.lastestPinBottom)!
			).delete();
		} catch (e) {
			// f. catch this to make sure latestPinBottom gets updated.
		}
	}
	topts.lastestPinBottom = newSentMessage.id;
	await db.setChannelOptions(chopts); // might cause race conditions if a user is updating the pinbottom setting at the same time. fun:). this is why it would be better to have this in a seperate db table and have it update a seperate column for channel latestpinbottom.
}

nr.globalCommand(
	"/help/channels/pinbottom",
	"pinbottom",
	{
		usage: "pinbottom {Required|{Channel|channel}} {Required|message...}",
		description:
			"{Interpunct} will send a message and make sure it always stays near the bottom of the channel",
		extendedDescription: "Use {Command|pinbottom {Channel|channel}} to unpin.",
		examples: [],
		perms: { runner: ["manage_bot"] },
	},
	nr.list(nr.a.channel(), ...nr.a.words()),
	async ([channel, message], info) => {
		if (!info.db) {
			return await info.docs("/errors/pms", "error");
		}
		const theyCanMention = info.message.member!.permissions.has(
			"MentionEveryone",
		);

		if (!theyCanMention) {
			const nmsg = stripMentions(message);
			if (nmsg !== message)
				await info.warn(
					"To include mentions in the pinned message, you must have permission to MENTION_EVERYONE.",
				);
			message = nmsg;
		}
		message = message.trim();

		if(await cannotSendIn(channel, info)) return;

		// try sending once before committing to the pinbottom
		try {
			await sendPinBottom(info, channel.id);
		} catch (e) {
			await info.error(
				"I don't have permission to send messages in <#" +
					channel.id +
					"> :(",
			);
			return;
		}

		const chopts = await info.db.getChannelOptions();
		if (!chopts[channel.id]) chopts[channel.id] = {};
		chopts[channel.id].pinBottom = message;
		chopts[channel.id].lastestPinBottom = undefined;
		lastUpdatedTimesCache[channel.id] = undefined;
		await info.db.setChannelOptions(chopts);

		await info.success("Success!");
	},
);

//// TODO autoreact channel #memes [unicode emoji][unicode emoji]
//// that might be difficult
