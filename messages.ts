import Info from "./src/Info";
import * as Discord from "discord.js";

export const messages = {
	help: (info: Info) =>
		`**inter\u00B7punct help**
> Finding Role IDs: <https://interpunct.info/role-id>
Channels <https://interpunct.info/channels>
> [\`X\`] Replace Dashes with Spaces: \`ip!space channels\`
> [\` \`] Pin Message: \`prefix!pin messagelink/id\` (Get a Message Link or ID by right clicking/long tapping a message and selecting Copy ...)
> [\`X\`] Sending a message to multiple channels: \`ip!send: My message #channel-one #channel-two\`
Logging <https://interpunct.info/logging>
> [\`X\`] Enable message logging: \`ip!logging enable\`
> [\`X\`] Download message log: \`ip!log download\` (The log file will be attached for anyone to donwload.)
> [\`X\`] Clear log: \`ip!log reset\`
> [\`X\`] Disable logging: \`ip!log disable\` (Any existing logs will be deleted)
Emojis <https://interpunct.info/emojis>
> [\` \`] Restrict Emoji by Role: \`ip!emoji restrict \`<:emoji:628119879798489089>\` RoleID\`
Fun <https://interpunct.info/fun>
> [\` \`] Disable fun: \`ip!fun disable\`
> [\` \`] Enable fun: \`ip!fun enable\` (Enabled by default)
> [\`X\`] Play ping pong: \`ip!ping\`
> [\` \`] Play minesweeper: \`ip!minesweeper\`
Speedrun.com <https://interpunct.info/speedrun>
> [\` \`] Show WR: \`ip!wr\`
> [\` \`] Show Rules: \`ip!speedrun rules CategoryName%\`
> [\` \`] Set Game on speedrun.com: \`ip!speedrun set https://www.speedrun.com/yourgame%\`
Quotes and Lists <https://interpunct.info/lists>
> [\` \`] Create List: \`ip!lists add listname https://pastebin.com/\`
> [\` \`] View List: \`ip!listname [optional "single"] [optional search term] [optional number]\`
Configuration <https://interpunct.info/configuration>
> [\` \`] Error messages: \`ip!settings errors show|hide\` (Default show)
> [\` \`] PM Errors: \`ip!settings pm on|off\` (Default on)
> [\` \`] Set Prefix: \`ip!settings prefix newprefix\` (Default \`ip!\`)
Server Info
> inter·punct prefix: \`ip!\`
> If the prefix is broken, you can use ${info.atme} as a prefix instead.
Bot Info
> Website: <https://interpunct.info>
> Support Server: <https://discord.gg/e7BmyqD>`
			.split("ip!")
			.join(info.prefix),
	emoji: {
		failure: "<:failure_2:547081084710682643>"
	},
	failure: {
		command_cannot_be_used_in_pms: (info: Info) =>
			`This command cannot be used in PMs!`
	},
	settings: {
		autospace_enabled: (info: Info) =>
			`When you make a new channel or edit an existing channel, all dashes will be replaced with spaces. To disable this, use
\`\`\`
${info.prefix}space channels disable
\`\`\``,
		autospace_disabled: (info: Info) =>
			`Channels will no longer have spaces added to their names.`
	},
	fun: {
		fun_disabled: (info: Info) => `Fun is not allowed on this server.`,
		ping: (info: Info) => `<a:pingpong:482012177725653003>
> Took ${new Date().getTime() - info.other!.startTime}ms, handling ${
			info.other!.infoPerSecond
		} db requests per second`
	},
	channels: {
		spacing: {
			no_channels_to_space: (info: Info) =>
				`**There are no channels to put spaces in!**
To add spaces to a channel, put dashes (\`-\`) where you want the spaces to go or replace a custom character using
\`\`\`
${info.prefix}space channels \`_\`
\`\`\`
> More Info: <https://interpunct.info/spacing-channels>`,
			succeeded_spacing: (info: Info, channels: Discord.Channel[]) =>
				`The channels ${channels
					.map(c => c.toString())
					.join(", ")} now have spaces.
If you want channels to automatically have spaces in the future, use
\`\`\`
${info.prefix}space channels automatically
\`\`\``,
			partially_succeeded_spacing: (
				info: Info,
				channels: Discord.Channel[],
				failedChannels: Discord.Channel[]
			) =>
				`The channels ${channels
					.map(c => c.toString())
					.join(", ")} now have spaces.
The channels ${failedChannels
					.map(c => c.toString())
					.join(", ")} could not be given spaces. Maybe ${
					info.atme
				} does not have permission to Manage Channels?
If you wanted spaces in these channels, check the channel settings to see if ${
					info.atme
				} has permission to manage them.

> Discord Support: <https://support.discordapp.com/hc/en-us/articles/206029707-How-do-I-set-up-Permissions->
> Command Help: <https://interpunct.info/spacing-channels>`,
			failed_spacing: (info: Info, failedChannels: Discord.Channel[]) =>
				`The channels ${failedChannels
					.map(c => c.toString())
					.join(", ")} could not be given spaces. Maybe ${
					info.atme
				} does not have permission to Manage Channels?
If you wanted spaces in these channels, check the channel settings to see if ${
					info.atme
				} has permission to manage them.
> Discord Support: <https://support.discordapp.com/hc/en-us/articles/206029707-How-do-I-set-up-Permissions->
> Command Help: <https://interpunct.info/spacing-channels>`
		},
		send_many: {
			no_channels_tagged: (info: Info) =>
				`**No channels were tagged!**
To send a message to multiple channels, tag every channel you want to send the message to, like this:
\`\`\`
${info.prefix}send: This is my great message! #rules #general
\`\`\`
> More Info: <https://interpunct.info/sending-messages-to-multiple-channels>`,
			succeeded_sending: (info: Info, channels: Discord.Channel[]) =>
				`Your message was sent to ${channels
					.map(c => c.toString())
					.join(", ")}.`,
			partially_succeeded_sending: (
				info: Info,
				channels: Discord.Channel[],
				failedChannels: Discord.Channel[]
			) =>
				`Your message was sent to ${channels
					.map(c => c.toString())
					.join(", ")}.
It could not be sent to ${failedChannels
					.map(c => c.toString())
					.join(", ")}. Maybe ${
					info.atme
				} does not have permission to Read and Send Messages there?
Check the channel settings to see if ${
					info.atme
				} has permission to read and send messages.
> Discord Support: <https://support.discordapp.com/hc/en-us/articles/206029707-How-do-I-set-up-Permissions->
> Command Help: <https://interpunct.info/sending-messages-to-multiple-channels>`,
			failed_sending: (info: Info, failedChannels: Discord.Channel[]) =>
				`Your message could not be sent to ${failedChannels
					.map(c => c.toString())
					.join(", ")}. Maybe ${
					info.atme
				} does not have permission to Read and Send Messages there?
Check the channel settings to see if ${
					info.atme
				} has permission to read and send messages.
> Discord Support: <https://support.discordapp.com/hc/en-us/articles/206029707-How-do-I-set-up-Permissions->
> Command Help: <https://interpunct.info/sending-messages-to-multiple-channels>`
		}
	}
};
