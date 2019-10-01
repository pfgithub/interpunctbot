import Info from "./src/Info";
import * as Discord from "discord.js";

export const messages = {
	help: (info: Info, lists: { [key: string]: string }) =>
		`**inter\u00B7punct help**
> Finding Role IDs: <https://interpunct.info/role-id>
Channels <https://interpunct.info/channels>
> [\`X\`] Replace Dashes with Spaces: \`ip!space channels\`
> [\` \`] Pin Message: \`prefix!pin messagelink/id\` (Get a Message Link or ID by right clicking/long tapping a message and selecting Copy ...)
> [\`X\`] Sending a message to multiple channels: \`ip!send: My message #channel-one #channel-two\`
Logging <https://interpunct.info/logging>
> [\` \`] Enable message logging: \`ip!logging enable\`
> [\` \`] Download message log: \`ip!log download\` (The log file will be attached for anyone to donwload.)
> [\` \`] Clear log: \`ip!log reset\`
> [\` \`] Disable logging: \`ip!log disable\` (Any existing logs will be deleted)
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
> [\` \`] Edit List: \`ip!lists edit listname https://pastebin.com/\`
> [\` \`] Remove List: \`ip!lists remove listname\`
> [\` \`] List Lists: \`ip!lists list\`
${Object.keys(lists)
	.map(
		l =>
			`> [\`x\`] View ${l}: \`ip!${l} [optional "single"] [optional search term] [optional number]\``
	)
	.join("\n")}
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
	lists: {
		list_exists_but_not_really: (info: Info, listName: string) =>
			`The list ${listName} does not exist.
> More Info: <https://interpunct.info/lists>`,
		failed_to_get_list: (info: Info) =>
			`Failed to download list from pastebin.
> More Info: <https://interpunct.info/lists>`,
		nothing_found_for_search: (info: Info, searchString: string[]) =>
			`No results for ${searchString.join(" ")}.`,
		list_lists: (info: Info, lists: { [key: string]: string }) =>
			`**Lists**:
${Object.keys(lists)
	.map(key => `> ${key}: <https://pastebin.com/${lists[key]}>`)
	.join(`\n`)}`,
		no_list_name_provided: (
			info: Info
		) => `A list name and pastebin URL is required. For example: \`${info.prefix}lists add listname https://pastebin.com/NFuKYjUN\`
> More Info: <https://interpunct.info/lists>`,
		list_already_exists: (
			info: Info,
			listName: string,
			pastebinUrl: string
		) =>
			`List ${listName} already exists, edit it with \`${info.prefix}lists edit ${listName} ${pastebinUrl}\` or delete it with \`${info.prefix}lists delete ${listName}\`
> More Info: <https://interpunct.info/lists>`,
		list_does_not_exist: (
			info: Info,
			listName: string,
			pastebinUrl: string
		) =>
			`List ${listName} does not exist, add it with \`lists add ${listName} ${pastebinUrl}\`
> More Info: <https://interpunct.info/lists>`,
		invalid_pastebin_url: (info: Info, listName: string) =>
			`A valid pastebin URL is required as the second argument to this command. For example: \`${info.prefix}lists add ${listName} https://pastebin.com/NFuKYjUN\`.
> More Info: <https://interpunct.info/lists>`,
		add_successful: (info: Info, listName: string, pastebinID: string) =>
			`Added list ${listName} with pastebin URL <https://pastebin.com/${pastebinID}>
Try it out with \`${info.prefix}${listName}\``,
		edit_succesful: (info: Info, listName: string, pastebinID: string) =>
			`Updated list ${listName} with new pastebin URL <https://pastebin.com/${pastebinID}>
Try it out with \`${info.prefix}${listName}\``,
		remove_list_that_does_not_exist: (info: Info, listName: string) =>
			`There is no list named ${listName}. See a list of lists using \`${info.prefix}lists list\`.
> More Info: <https://interpunct.info/lists>`,
		remove_list_succesful: (info: Info, listName: string) =>
			`List ${listName} removed.`
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
					.join(", ")} now have spaces.`,
			autospace_info_off: (info: Info) =>
				`> If you want channels to automatically have spaces in the future, use \`${info.prefix}space channels automatically\``,
			autospace_info_on: (info: Info) =>
				`Channels should be given spaces automatically because you have \`ip!space channels enable\`d.`,
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
