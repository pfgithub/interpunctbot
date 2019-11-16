import { Message, Guild, Channel, GuildChannel, TextChannel } from "discord.js";
import Router from "commandrouter";
import Info from "../Info";
import { ilt } from "../..";
const router = new Router<Info, any>();
import { messages } from "../../messages";
import { AP, a } from "./argumentparser";

const stripMentions = (msg: string) => {
	return msg
		.replace(/@(everyone|here)/g, "")
		.replace(/<@!?[0-9]+>/g, "")
		.replace(/<#!?[0-9]+>/g, "");
};

async function spaceChannels({
	guild,
	from,
	to,
	msg,
	info
}: {
	guild: Guild;
	from: string;
	to: string;
	msg: Message;
	info: Info;
}) {}

router.add(
	"space channels automatically",
	[
		Info.theirPerm.manageChannels,
		Info.theirPerm.manageBot,
		Info.ourPerm.manageChannels
	],
	async (cmd, info) => {
		if (!info.guild || !info.db) {
			return info.error(
				messages.failure.command_cannot_be_used_in_pms(info)
			);
		}
		await info.db.setAutospaceChannels(true);
		/*async*/ info.success(messages.settings.autospace_enabled(info));

		// space now
		const channelsToSpaceNow = findChannelsRequireSpacing(info.guild, "-");
		for (const channel of channelsToSpaceNow) {
			await spaceChannel(
				channel,
				"-",
				`started autospacing by @${info.message.member!.displayName}`
			);
		}
	}
);

router.add(
	"space channels disable",
	[
		Info.theirPerm.manageChannels,
		Info.theirPerm.manageBot,
		Info.ourPerm.manageChannels
	],
	async (cmd, info) => {
		if (!info.guild || !info.db) {
			return info.error(
				messages.failure.command_cannot_be_used_in_pms(info)
			);
		}
		info.db.setAutospaceChannels(false);
		return info.success(messages.settings.autospace_disabled(info));
	}
);

router.add(
	"purge",
	[Info.theirPerm.manageMessages, Info.ourPerm.manageMessages],
	async (cmd, info) => {
		if (!info.guild || !info.db) {
			return info.error(
				messages.failure.command_cannot_be_used_in_pms(info)
			);
		}

		const apresult = await AP(
			{ info, cmd },
			a.number(async num => {
				if (num < 1 || num > 100 || !Number.isInteger(num)) {
					await info.error(
						messages.channels.purge.message_limit(info, num)
					);
					return false;
				}
				return true;
			})
			// what if we want an optional channel? oh no
			// now the argument parser gets messy
		);
		if (!apresult) return;
		const [messageLimit] = apresult;

		const channel = info.message.channel as TextChannel;
		const messagesToDelete = await channel.messages.fetch({
			limit: messageLimit
		});
		// const confirmationResult = await info.confirm("are you sure?");
		// if (!confirmationResult) {
		// 	return;
		// }
		// if(!await info.confirm("are you sure?")){ return; }
		// this can be done with an emoji reaction system like goirankbot has
		const progressMessage = await info.channel.send(
			messages.channels.purge.in_progress(info, messagesToDelete.size)
		);
		const now = new Date().getTime();
		const toBulkDelete = messagesToDelete.filter(
			m => m.createdAt.getTime() > now - 13 * 24 * 60 * 60 * 1000 // 13 just in case. discord limit is 14
		);
		const toSlowDelete = messagesToDelete.filter(
			m => m.createdAt.getTime() <= now - 13 * 24 * 60 * 60 * 1000
		);
		await channel.bulkDelete(toBulkDelete);
		let deletedCount = toBulkDelete.size;
		const startUpdateThing = () =>
			setTimeout(async () => {
				const progressPerdeci = Math.floor(
					(deletedCount / toSlowDelete.size) * 10
				);
				await ilt(
					progressMessage.edit(
						`Deleting messages... [\`${"X".repeat(progressPerdeci) +
							" ".repeat(
								10 - progressPerdeci
							)}\`] (${deletedCount} / ${messagesToDelete.size})`
					),
					"purge messages progress bar"
				);
				updateProgressInterval = startUpdateThing();
			}, 1000);
		let updateProgressInterval = startUpdateThing();
		for (const [key, message] of toSlowDelete) {
			await message.delete();
			deletedCount++;
		}
		clearInterval(updateProgressInterval);
		await info.success(
			messages.channels.purge.success(info, messagesToDelete.size)
		);
		await progressMessage.delete();
	}
);

export function findChannelsRequireSpacing(
	guild: Guild,
	characterToReplace: string
) {
	return guild.channels
		.array()
		.filter(chan => doesChannelRequireSpacing(chan, characterToReplace));
}

export function doesChannelRequireSpacing(
	chan: GuildChannel,
	characterToReplace: string
) {
	return (
		chan.name.indexOf(characterToReplace) > -1 &&
		chan.type !== "voice" &&
		chan.type !== "category"
	);
}

export async function spaceChannel(
	channel: GuildChannel,
	characterToReplace: string,
	reason: string
) {
	if (!doesChannelRequireSpacing(channel, characterToReplace)) {
		return {
			error: new Error("Channel does not need spacing"),
			result: undefined
		};
	}
	return await ilt(
		channel.setName(
			channel.name.split(characterToReplace).join("\u2005"),
			reason
		),
		"renaming channel for spacechannels"
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
			return info.error(
				messages.failure.command_cannot_be_used_in_pms(info)
			);
		}
		const characterToReplace = (cmd.match(/^[\s\S]*`(.+?)`/) ||
			([, "-"] as const))[1];
		const channelsNeedUpdating = findChannelsRequireSpacing(
			guild,
			characterToReplace
		);

		if (channelsNeedUpdating.length <= 0) {
			return info.error(
				messages.channels.spacing.no_channels_to_space(info)
			);
		}

		const successChannels: GuildChannel[] = [];
		const failureChannels: GuildChannel[] = [];

		for (const channel of channelsNeedUpdating) {
			const setNameResult = await spaceChannel(
				channel,
				characterToReplace,
				`@${info.message.member!.displayName}`
			);
			if (setNameResult.error) {
				failureChannels.push(channel);
			} else {
				successChannels.push(channel);
			}
		}

		if (failureChannels.length === 0) {
			return info.success(
				`${messages.channels.spacing.succeeded_spacing(
					info,
					successChannels
				)}\n${
					(await info.db!.getAutospaceChannels())
						? messages.channels.spacing.autospace_info_on(info)
						: messages.channels.spacing.autospace_info_off(info)
				}`
			);
		}
		if (successChannels.length === 0) {
			return info.error(
				messages.channels.spacing.failed_spacing(info, failureChannels)
			);
		}
		return info.error(
			messages.channels.spacing.partially_succeeded_spacing(
				info,
				successChannels,
				failureChannels
			)
		);
	}
);

router.add("send:", [Info.theirPerm.manageChannels], async (cmd, info) => {
	await info.startLoading();
	const message = stripMentions(info.message.content).replace(
		/^[\s\S]*?send: ?/i,
		""
	); // TODO find a better way to do this
	const channelsToSendTo = info.message.mentions.channels.array();

	if (channelsToSendTo.length === 0) {
		return info.error(messages.channels.send_many.no_channels_tagged(info));
	}

	const failures: Channel[] = [];
	const successes: Channel[] = []; // maybe do Message[] and link to every message i.p sent?
	for (const channel of channelsToSendTo) {
		const sent = await ilt(
			channel.send(message),
			"sending message for sendmany"
		);
		if (sent.error) {
			failures.push(channel);
		} else {
			successes.push(channel);
		}
	}

	if (failures.length === 0) {
		return info.success(
			messages.channels.send_many.succeeded_sending(info, successes)
		);
	}
	if (successes.length === 0) {
		return info.error(
			messages.channels.send_many.failed_sending(info, failures)
		);
	}
	return info.error(
		messages.channels.send_many.partially_succeeded_sending(
			info,
			successes,
			failures
		)
	);
});

// !!!!!!!!!!!!!!! router.add("pin message")

export default router;
