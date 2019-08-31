import { Message, Guild } from "discord.js";
import Router from "commandrouter";
import Info from "../Info";
import { ilt } from "../..";
const router = new Router<Info, any>();

const channels = new Usage({
	desription: "Commands related to managing channels"
});

const stripMentions = (msg: Message) => {
	return msg.content
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
}) {
	const channelNames: string[] = [];
	for (const channel of guild.channels.array()) {
		if (channel.name.indexOf(from) > -1) {
			channelNames.push(`<#${channel.id}>`);
			const setNameResult = await ilt(
				channel.setName(channel.name.split(from).join(to))
			);
			if (setNameResult.error) {
				await info.error(
					`Could not space channels because I don't have permission to manage <#${channel.id}>.`
				);
				console.log("Channel space failure", setNameResult.error);
			}
		}
	}
	return channelNames.length > 10
		? `${channelNames.length} channels`
		: `${channelNames.join(", ")}.`;
}

router.add(
	"space channels",
	[Info.theirPerm.manageChannels],
	async (cmd, info) => {
		if (!info.message.guild) {
			return info.reply("This command may not be run in a PM");
		}
	}
);

router.add(
	"spacing",
	new Usage({
		description: "Have spaces in channel names instead of dashes",
		requirements: [
			o.pm(false),
			o.myPerm("MANAGE_CHANNELS"),
			o.perm("MANAGE_CHANNELS") /*o.yourPerm("MANAGE_CHANNELS")*/
		],
		usage: [["space", "dash"]],
		callback: async (data, yn) => {
			const replyMessage = await data.msg.reply(
				"<a:loading:393852367751086090>"
			);

			if (!yn) {
				return data.msg.reply("Usage: channels spacing [space|dash]");
			}
			switch (yn) {
				case "true":
				case "space":
				case "yes":
					return replyMessage.edit(
						`Spaced ${spaceChannels({
							guild: data.msg.guild,
							from: `-`,
							to: ` `,
							msg: data.msg
						})}. To automatically space future channels, use \`${
							data.prefix
						}settings autospaceChannels true\``
					);
				case "false":
				case "dash":
				case "no":
					return replyMessage.edit(
						`Dashed ${spaceChannels({
							guild: data.msg.guild,
							to: `-`,
							from: ` `,
							msg: data.msg
						})}`
					);
				default:
					return replyMessage.edit(
						"Usage: spaceChannels [space|dash]"
					);
			}
		}
	})
);

channels.add(
	"sendMany",
	new Usage({
		description: "Have spaces in channel names instead of dashes",
		requirements: [
			o.pm(false),
			o.perm("MANAGE_CHANNELS") /*o.yourPerm("MANAGE_CHANNELS")*/
		],
		usage: ["...message", "#channels #to #send #to"],
		callback: async data => {
			const replyMessage = await data.msg.reply(
				"<a:loading:393852367751086090>"
			);

			const message = stripMentions(data.msg).replace(
				/^.+channels sendMany /,
				""
			); // TODO find a better way to do this
			const channelsToSendTo = data.msg.mentions.channels.array();
			channelsToSendTo.forEach(channel => {
				channel
					.send(message)
					.catch(errorNooneCaresAbout =>
						data.msg.reply(
							`Could not send to ${channel.toString()}. Maybe I don't have permission?`
						)
					);
			});
			await replyMessage.edit(
				`Sent ${message} to ${channelsToSendTo.map(c => c.toString())
					.join`, `}`
			);
		}
	})
);

export default channels;
