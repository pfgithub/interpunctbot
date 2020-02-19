import Router from "commandrouter";
import { Channel, Guild, GuildChannel, TextChannel } from "discord.js";
import { ilt, perr } from "../..";
import { messages } from "../../messages";
import { AutodeleteRuleNoID } from "../Database";
import { durationFormat } from "../durationFormat";
import Info from "../Info";
import { a, AP } from "./argumentparser";
import * as nr from "../NewRouter";
const router = new Router<Info, Promise<any>>();

const stripMentions = (msg: string) => {
	return msg
		.replace(/@(everyone|here)/g, "")
		.replace(/<@!?[0-9]+>/g, "")
		.replace(/<#!?[0-9]+>/g, "");
};

router.add(
	"space channels automatically",
	[
		Info.theirPerm.manageChannels,
		Info.theirPerm.manageBot,
		Info.ourPerm.manageChannels,
	],
	async (cmd, info) => {
		if (!info.guild || !info.db) {
			return await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
		}
		await info.db.setAutospaceChannels(true);
		await info.success(messages.settings.autospace_enabled(info));

		// space now
		const channelsToSpaceNow = findChannelsRequireSpacing(info.guild, "-");
		for (const channel of channelsToSpaceNow) {
			await spaceChannel(
				channel,
				"-",
				`started autospacing by @${info.message.member!.displayName}`,
			);
		}
	},
);

router.add(
	"space channels disable",
	[
		Info.theirPerm.manageChannels,
		Info.theirPerm.manageBot,
		Info.ourPerm.manageChannels,
	],
	async (cmd, info) => {
		if (!info.guild || !info.db) {
			return await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
		}
		await info.db.setAutospaceChannels(false);
		return await info.success(messages.settings.autospace_disabled(info));
	},
);

router.add(
	"purge",
	[Info.theirPerm.manageMessages, Info.ourPerm.manageMessages],
	async (cmd, info) => {
		if (!info.guild || !info.db) {
			return await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
		}

		const ap = await AP(
			{ info, cmd },
			a.number(),
			// what if we want an optional channel? oh no
			// now the argument parser gets messy
		);
		if (!ap) return;
		const [messageLimit] = ap.result;
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
	return guild.channels
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

export async function spaceChannel(
	channel: GuildChannel,
	characterToReplace: string,
	reason: string,
) {
	if (!doesChannelRequireSpacing(channel, characterToReplace)) {
		return {
			error: new Error("Channel does not need spacing"),
			result: undefined,
		};
	}
	return await ilt(
		channel.setName(
			channel.name.split(characterToReplace).join("\u2005"),
			reason,
		),
		"renaming channel for spacechannels",
	);
}

router.add(
	"space channels",
	[Info.theirPerm.manageChannels, Info.ourPerm.manageChannels],
	async (cmd, info) => {
		const apresult = await AP({ info, cmd });
		if (!apresult) return;

		const guild = info.guild;
		if (!guild) {
			return await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
		}
		const characterToReplace = (/^[\s\S]*`(.+?)`/.exec(cmd) ||
			([, "-"] as const))[1];
		const channelsNeedUpdating = findChannelsRequireSpacing(
			guild,
			characterToReplace,
		);

		if (channelsNeedUpdating.length <= 0) {
			return await info.error(
				messages.channels.spacing.no_channels_to_space(info),
			);
		}

		const successChannels: GuildChannel[] = [];
		const failureChannels: GuildChannel[] = [];

		for (const channel of channelsNeedUpdating) {
			const setNameResult = await spaceChannel(
				channel,
				characterToReplace,
				`@${info.message.member!.displayName}`,
			);
			if (setNameResult.error) {
				failureChannels.push(channel);
			} else {
				successChannels.push(channel);
			}
		}

		if (failureChannels.length === 0) {
			return await info.success(
				`${messages.channels.spacing.succeeded_spacing(
					info,
					successChannels,
				)}\n${
					(await info.db!.getAutospaceChannels())
						? messages.channels.spacing.autospace_info_on(info)
						: messages.channels.spacing.autospace_info_off(info)
				}`,
			);
		}
		if (successChannels.length === 0) {
			return await info.error(
				messages.channels.spacing.failed_spacing(info, failureChannels),
			);
		}
		return await info.error(
			messages.channels.spacing.partially_succeeded_spacing(
				info,
				successChannels,
				failureChannels,
			),
		);
	},
);

/*
@CommandDocumentation /help/channels/slowmode

## Slow Mode

## {{Emoji|admins}} Enable Slowmode

: {{Command|channel slowmode set {{Required|seconds}} {{Enum|seconds|minutes|hours|days}} {{Required|{{Channel|channel}}}}}}
: {{Command|channel slowmode disable {{Required|{{Channel|channel}}}}
: Set slowmode on {{Channel|channel}} to some number of seconds.
Command: channel slowmode set 2 seconds #general
Output: @you, {{Emoji|success}} Slowmode for {{Channel|channel}} set to 2 seconds.

*/

nr.globalCommand(
	"/help/channels/slowmode/set",
	"slowmode set",
	{
		usage: "slowmode set {{Channel|channel}} {{Duration|duration}}",
		description:
			"Set the slowmode for a channel to values that discord does not provide (such as 1 second, 45 minutes, ...). Maximum of 6 hours, minimum of 1 second, set to 0 to disable slowmode.",
		examples: [
			{
				in: "ip!slowmode set {{Channel|channel}} 1 second",
				out:
					"{{Atmention|you}}, {{Emoji|success}} Slowmode for {{Channel|channel}} set to 1 second, 000ms",
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

/*
@DocAdd /help/autodelete

```
usage: ip!autodelete add {{Duration}}
example: ip!autodelete add 10s user {{Atmention|@Mee6}}
desc: automatically delete messages from Mee6 after 10 seconds
example: ip!autodelete add 1 hour channel #vent
desc: automatically delete messages in the #vent channel after 1 hour
example: ip!autodelete add 15 seconds prefix ip!
desc: automatically delete messages starting with ip! after 15 seconds
```

*/
// autodelete list
// autodelete remove [id]
nr.globalCommand(
	"/help/channels/autodelete/list",
	"autodelete list",
	{
		usage: "autodelete list",
		description: "list all autodelete rules on this server",
		examples: [],
	},
	nr.list(...nr.a.words()),
	async ([cmd], info) => {
		if (!Info.theirPerm.manageChannels(info)) return;
		if (!info.db) {
			return await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
		}
		const ap = await AP({ info, cmd, partial: true });
		if (!ap) return;
		const autodelete = await info.db.getAutodelete();
		return await info.result(
			"Autodelete Rules:\n" +
				autodelete.rules
					.map(
						rule =>
							"`" +
							info.prefix +
							"autodelete remove " +
							rule.id +
							"` - " +
							JSON.stringify(rule),
					)
					.join("\n"),
		);
	},
);
nr.globalCommand(
	"/help/channels/autodelete/remove",
	"autodelete remove",
	{
		usage: "autodelete remove #",
		description:
			"remove an autodelete rule. use {{Command|autodelete list}} to list.",
		examples: [],
	},
	nr.list(...nr.a.words()),
	async ([cmd], info) => {
		if (!Info.theirPerm.manageChannels(info)) return;
		if (!info.db) {
			return await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
		}
		const ap = await AP({ info, cmd, partial: true }, a.number());
		if (!ap) return;
		const [id] = ap.result;
		await info.db.removeAutodelete(id);
		return await info.success("Autodelete rule removed");
	},
);
nr.globalCommand(
	"/help/channels/autodelete/add",
	"autodelete add",
	{
		usage:
			"autodelete add {{Duration}} prefix prefix user user channel channel role role",
		description:
			"create an autodelete rule. autodelete rules will delete messages that match a certain rule, such as being from a specific user or in a specific channel.\n\n{{Heading|Using autodelete rules to create a 3s-delete channel}}\n\n{{Command|autodelete add 3s channel {{Channel|3s-delete}}}}\n\n{{Heading|Using autodelete rules to delete bot messages after a certain time period}}\n\n{{Command|autodelete add 10 seconds user {{Atmention|Mee6}}}}",
		examples: [],
	},
	nr.list(...nr.a.words()),
	async ([cmd], info) => {
		if (!Info.theirPerm.manageChannels(info)) return;
		if (!Info.ourPerm.manageMessages(info)) return;
		if (!info.db) {
			return await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
		}
		const ap = await AP(
			{ info, cmd, partial: true },
			a.duration(),
			a.enum("prefix", "user", "channel", "role"),
		);
		if (!ap) return;
		const [duration, mode] = ap.result;

		cmd = ap.remaining;
		let autodeleteInfo: AutodeleteRuleNoID;
		if (mode === "prefix") {
			const prefix = cmd;
			autodeleteInfo = { type: "prefix", prefix, duration };
		} else if (mode === "user") {
			const ap = await AP({ info, cmd }, a.user());
			if (!ap) return;
			const [user] = ap.result;
			autodeleteInfo = { type: "user", user: user.id, duration };
		} else if (mode === "channel") {
			const ap = await AP({ info, cmd }, a.channel());
			if (!ap) return;
			const [channel] = ap.result;
			autodeleteInfo = { type: "channel", channel: channel.id, duration };
		} else if (mode === "role") {
			const ap = await AP({ info, cmd }, ...a.role());
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
router.add("autodelete", [Info.theirPerm.manageChannels], async (cmd, info) => {
	// return await info.usage("autodelete")
	return await info.error("usage"); // !!!
});

router.add("send:", [Info.theirPerm.manageChannels], async (cmd, info) => {
	await info.startLoading();
	const message = stripMentions(info.message.content).replace(
		/^[\s\S]*?send: ?/i,
		"",
	); // TODO find a better way to do this
	const channelsToSendTo = info.message.mentions.channels.array();

	if (channelsToSendTo.length === 0) {
		return await info.error(
			messages.channels.send_many.no_channels_tagged(info),
		);
	}

	const failures: Channel[] = [];
	const successes: Channel[] = []; // maybe do Message[] and link to every message i.p sent?
	for (const channel of channelsToSendTo) {
		const sent = await ilt(
			channel.send(message),
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
});

// !!!!!!!!!!!!!!! router.add("pin message")

export default router;
