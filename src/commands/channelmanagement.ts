import { Channel, Guild, GuildChannel, TextChannel } from "discord.js";
import { ilt, perr, assertNever } from "../..";
import { messages, safe, raw } from "../../messages";
import { AutodeleteRuleNoID, AutodeleteRule } from "../Database";
import { durationFormat } from "../durationFormat";
import Info from "../Info";
import { a, AP } from "./argumentparser";
import * as nr from "../NewRouter";

export const stripMentions = (msg: string) => {
	return msg
		.replace(/@(everyone|here)/g, "")
		.replace(/<@.+?>/g, "")
		.replace(/<#.+?>/g, "");
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
		description: "Purge messages in a channel",
		examples: [
			{
				in: "purge 1",
				out:
					"{Atmention|you}, {Emoji|success} Succesfully deleted 1 message.",
			},
		],
	},
	nr.list(nr.a.number()),
	async ([messageLimit], info) => {
		if (!Info.theirPerm.manageMessages(info)) return;
		Info.ourPerm.manageMessages;
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
		const messagesToDelete = await channel.messages.fetch({
			limit: messageLimit,
		});
		// const confirmationResult = await info.confirm("are you sure?");
		// if (!confirmationResult) {
		// 	return;
		// }
		// if(!await info.confirm("are you sure?")){ return; }
		// this can be done with an emoji reaction system like goirankbot has
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
			await ilt(
				progressMessage.edit(
					`Deleting messages... [\`${"X".repeat(progressPerdeci) +
						" ".repeat(
							10 - progressPerdeci,
						)}\`] (${deletedCount} / ${messagesToDelete.size})`,
				),
				"purge messages progress bar",
			);
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
			messages.channels.purge.success(info, messagesToDelete.size),
		);
		await progressMessage.delete();
	},
);

export function findChannelsRequireSpacing(
	guild: Guild,
	characterToReplace: string,
) {
	return guild.channels.cache
		.array()
		.filter(chan => doesChannelRequireSpacing(chan, characterToReplace));
}

export function doesChannelRequireSpacing(
	chan: GuildChannel,
	characterToReplace: string,
) {
	return (
		chan.name.includes(characterToReplace) &&
		chan.type !== "voice" &&
		chan.type !== "category"
	);
}

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
	},
	nr.list(nr.a.channel(), nr.a.duration()),
	async ([channel, time], info) => {
		if (!Info.theirPerm.manageChannels(info)) return;

		const guild = info.guild;
		if (!guild) {
			return await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
		}

		if (!(channel instanceof TextChannel)) {
			return await info.error(
				"Slowmode can only be set on text channels.",
			);
		}
		const finalTime = Math.ceil(time / 1000);
		const finalTimeMS = finalTime * 1000;
		await channel.setRateLimitPerUser(
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

function printrule(rule: AutodeleteRule, info: Info) {
	if (rule.type === "prefix") {
		return safe`Remove messages starting with ${
			rule.prefix
		} after ${durationFormat(rule.duration)}`;
	}
	if (rule.type === "channel") {
		return safe`Remove messages in <#${
			rule.channel
		}> after ${durationFormat(rule.duration)}`;
	}
	if (rule.type === "user") {
		const user = info.guild!.member(rule.user);
		return safe`Remove messages from user ${raw(
			user ? user.toString() : "@deleted-user",
		)}> after ${durationFormat(rule.duration)}`;
	}
	if (rule.type === "role") {
		const role = info.guild!.roles.resolve(rule.role);
		return safe`Remove messages from user ${raw(
			role ? messages.role(role) : "@deleted-role",
		)}> after ${durationFormat(rule.duration)}`;
	}
	return assertNever(rule);
}

nr.globalCommand(
	"/help/autodelete/list",
	"autodelete list",
	{
		usage: "autodelete list",
		description: "list all autodelete rules on this server",
		examples: [],
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		if (!Info.theirPerm.manageChannels(info)) return;
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
							printrule(rule, info),
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
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		if (!Info.theirPerm.manageChannels(info)) return;
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
		await info.db.removeAutodelete(id);
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
});

// nr.addDocsShorthand("autodelete add prefix", "/help/autodelete/add/prefix");

nr.addHelpDocsPage("/help/autodelete/add/channel", {
	title: "autodelete channel",
	usage:
		"autodelete add {Required|{Duration}} channel {Required|{Channel|the-channel}}",
	description:
		"create an autodelete rule to remove all messages in a certain channel",
	examples: [],
});

nr.addHelpDocsPage("/help/autodelete/add/user", {
	title: "autodelete user",
	usage:
		"autodelete add {Required|{Duration}} user {Required|{Atmention|the-user}}",
	description:
		"create an autodelete rule to remove all messages from a certain user or bot",
	examples: [],
});

nr.addHelpDocsPage("/help/autodelete/add/role", {
	title: "autodelete role",
	usage:
		"autodelete add {Required|{Duration}} role {Required|{Role|the role}}",
	description:
		"create an autodelete rule to remove all messages from people with a certain role",
	examples: [],
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
{UsageSummary|/help/autodelete/add/role}`,
		examples: [],
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		if (!Info.theirPerm.manageChannels(info)) return;
		if (!Info.ourPerm.manageMessages(info)) return;
		if (!info.db) {
			return await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
		}
		const ap = await AP(
			{ info, cmd, partial: true, help: "/help/autodelete/add" },
			a.duration(),
			a.enum("prefix", "user", "channel", "role"),
		);
		if (!ap) return;
		const [duration, mode] = ap.result;

		cmd = ap.remaining;
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
		} else if (mode === "role") {
			const ap = await AP(
				{ info, cmd, help: "/help/autodelete/add/role" },
				...a.role(),
			);
			if (!ap) return;
			const [role] = ap.result;
			autodeleteInfo = { type: "role", role: role.id, duration };
		} else {
			throw new Error("this should never happen");
		}

		const autodeleteLimit = await info.db.getAutodeleteLimit();
		if ((await info.db.getAutodelete()).rules.length >= autodeleteLimit)
			return await info.error(
				"This server has reached its autodelete limit (" +
					autodeleteLimit +
					").\n> To increase this limit, ask on the support server\n> <https://interpunct.info/support>",
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
	"/help/channels/send",
	"send",
	{
		usage:
			"send {Required|{Channel|list-of-channels}} {Required|message to send}",
		description: "",
		examples: [
			{
				in: "send {Channel|channel-one} {Channel|channel-two} hi!",
				out:
					"{Atmention|you}, {Emoji|success} Your message was sent to {Channel|channel-one}, {Channel|channel-two}",
			},
		],
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		if (!Info.theirPerm.manageChannels(info)) return;

		const channelsToSendTo = info.message.mentions.channels.array();

		if (channelsToSendTo.length === 0) {
			return await info.error(
				messages.channels.send_many.no_channels_tagged(info),
			);
		}

		const safeMessage = stripMentions(cmd); // makes a message safe (removes @everyone and @here and all other mentions)

		const failures: Channel[] = [];
		const successes: Channel[] = []; // maybe do Message[] and link to every message i.p sent?
		for (const channel of channelsToSendTo) {
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

nr.globalCommand(
	"/help/messages/set-goodbye",
	"messages set goodbye",
	{
		usage:
			"messagess set goodbye {Required|{Channel|#channel}} {Required|message...}",
		description:
			"set a message to show when someone leaves the server. use \\{Name\\} and \\{Mention\\} to include people's usernames/mentions",
		examples: [
			{
				in:
					"messages set goodbye {Channel|#welcome}\nGoodbye \\{Name\\} (\\{Mention\\}), we will miss you!",
				out:
					"{Atmention|you}, {Emoji|success} Goodbye message set. Here is an example of what might be sent to {Channel|#welcome} when someone leaves:\n\nGoodbye person leaving ({Atmention|person leaving}), we will miss you!",
			},
		],
	},
	nr.list(nr.a.channel(), ...nr.a.words()),
	async ([channel, message], info) => {
		if (!info.db) {
			return await info.docs("/errors/pms", "error");
		}
		if (!Info.theirPerm.manageBot) return;
		const theyCanMention = info.message.member!.hasPermission(
			"MENTION_EVERYONE",
		);

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
	},
	nr.list(),
	async ([], info) => {
		if (!info.db) {
			return await info.docs("/errors/pms", "error");
		}
		if (!Info.theirPerm.manageBot) return;

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
	},
	nr.list(),
	async ([], info) => {
		if (!info.db) {
			return await info.docs("/errors/pms", "error");
		}
		if (!Info.theirPerm.manageBot) return;

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
			"messagess set welcome {Required|{Channel|channel}} {Required|message...}",
		description:
			"set a message to show when someone joins the server. use \\{Name\\} and \\{Mention\\} to include people's usernames/mentions",
		examples: [
			{
				in:
					"messages set goodbye {Channel|welcome}\nWelcome to the server \\{Mention\\} (\\{Name\\})!!! Make sure to check out the {Channel|rules}!",
				out:
					"{Atmention|you}, {Emoji|success} Welcome message set. Here is an example of what might be sent to {Channel|#welcome} when someone joins:\n\nWelcome {Atmention|person joining} (person joining)!!! Make sure to check out the {Channel|rules}!",
			},
		],
	},
	nr.list(nr.a.channel(), ...nr.a.words()),
	async ([channel, message], info) => {
		if (!info.db) {
			return await info.docs("/errors/pms", "error");
		}
		if (!Info.theirPerm.manageBot) return;
		const theyCanMention = info.message.member!.hasPermission(
			"MENTION_EVERYONE",
		);

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

// !!!!!!!!!!!!!!! router.add("pin message")
