import { Message, Guild, Channel } from "discord.js";
import Router from "commandrouter";
import Info from "../Info";
import { ilt } from "../..";
const router = new Router<Info, any>();
import { messages } from "../../messages";

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
				messages.general.command_cannot_be_used_in_pms(info)
			);
		}
		info.db.setAutospaceChannels(true);
		return info.success(messages.settings.autospace_enabled(info));
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
				messages.general.command_cannot_be_used_in_pms(info)
			);
		}
		info.db.setAutospaceChannels(false);
		return info.success(messages.settings.autospace_disabled(info));
	}
);

router.add(
	"space channels",
	[Info.theirPerm.manageChannels],
	async (cmd, info) => {
		const guild = info.guild;
		if (!guild) {
			return info.error(
				messages.general.command_cannot_be_used_in_pms(info)
			);
		}
		const characterToReplace = (cmd.match(/`(.+?)`/) ||
			([, "-"] as const))[1];
		const channelsNeedUpdating = guild.channels
			.array()
			.filter(
				chan =>
					chan.name.indexOf(characterToReplace) > -1 &&
					chan.type !== "voice" &&
					chan.type !== "category"
			);

		if (channelsNeedUpdating.length <= 0) {
			return info.error(
				messages.channels.spacing.no_channels_to_space(info)
			);
		}

		const successChannels: Channel[] = [];
		const failureChannels: Channel[] = [];

		for (const channel of channelsNeedUpdating) {
			const setNameResult = await ilt(
				channel.setName(
					channel.name.split(characterToReplace).join("\u0020")
				)
			);
			if (setNameResult.error) {
				failureChannels.push(channel);
			} else {
				successChannels.push(channel);
			}
		}

		if (failureChannels.length === 0) {
			return info.success(
				messages.channels.spacing.succeeded_spacing(
					info,
					successChannels
				)
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
	//!!!!!!!!!!!!!!!!!!TODO
	// await info.startLoading();
	// const message = stripMentions(cmd).replace(/^.+?send: ?/i, ""); // TODO find a better way to do this
	// const channelsToSendTo = info.message.mentions.channels.array();
	//
	// if (channelsToSendTo.length === 0) {
	// 	return info.error(messages.channels.send_many.no_channels_tagged(info));
	// }
	//
	// const failures: Channel[] = [];
	// const successes: Message[] = [];
	// for (const channel of channelsToSendTo) {
	// 	const sent = await ilt(channel.send());
	// 	if (sent.error) {
	// 		failures.push(channel);
	// 	} else {
	// 		successes.push(sent.result);
	// 	}
	// }
	//
	// if (failures.length === 0) {
	// 	return info.success(
	// 		messages.channels.send_many.succeeded_sending(info, successes)
	// 	);
	// }
	// if (successes.length === 0) {
	// 	return info.error(
	// 		messages.channels.send_many.failed_sending(info, failureChannels)
	// 	);
	// }
	// return info.error(
	// 	messages.channels.send_many.partially_succeeded_sending(
	// 		info,
	// 		successes,
	// 		failures
	// 	)
	// );
});

export default router;
