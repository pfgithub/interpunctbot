import Info from "./src/Info";
import * as Discord from "discord.js";

export function raw(string: TemplateStringsArray | string) {
	return { __raw: `${string}` };
}

export function safe(
	strings: TemplateStringsArray,
	...values: (string | { __raw: string })[]
) {
	const result: (string | { __raw: string })[] = [];
	strings.forEach((str, i) => {
		result.push(raw(str), values[i] || "");
	});
	return result
		.map(el =>
			typeof (el as { __raw: string }).__raw === "string"
				? (el as { __raw: string }).__raw
				: (el as string)
						.replace(/(\*|_|`|~|\\|<|>|\[|\]"|'|\(|\))/g, "\\$1")
						.replace(/(@)(everyone|here)/g, "\\$1\u200b\\$2")
		)
		.join("");
}

export const messages = {
	help: (info: Info, lists: { [key: string]: string }) =>
		`**inter\u00B7punct help**
> Finding Role IDs: <https://interpunct.info/role-id>
Channels <https://interpunct.info/channels>
> [\`X\`] Replace Dashes with Spaces: \`ip!space channels\`
> [\`X\`] Automatically put spaces in channel names: \`ip!space channels automatically\` (Off by default)
> [\`X\`] Stop putting spaces in channel names: \`ip!space channels disable\`
> [\` \`] Pin Message: \`prefix!pin messagelink/id\` (Get a Message Link or ID by right clicking/long tapping a message and selecting Copy ...)
> [\`X\`] Sending a message to multiple channels: \`ip!send: My message #channel-one #channel-two\`
Logging <https://interpunct.info/logging>
> [\`X\`] Enable message logging: \`ip!logging enable\`
> [\`X\`] Download message log: \`ip!log download\` (The log file will be attached in a reply.)
> [\`X\`] Clear log: \`ip!log reset\`
> [\`X\`] Disable logging: \`ip!log disable\` (Any existing logs will be deleted)
Emojis <https://interpunct.info/emojis>
> [\`X\`] Restrict Emoji by Role: \`ip!emoji restrict \`<:emoji:629134046332583946>\` Role\` (Role name, id, or mention)
> [\`X\`] Remove all restrictions from emoji: \`ip!emoji unrestrict \`<:emoji:629134046332583946>
> [\`X\`] Remove one restriction from emoji: \`ip!emoji unrestrict \`<:emoji:629134046332583946>\` Role\`
> [\`X\`] Inspect emoji: \`ip!emoji inspect \`<:emoji:629134046332583946>
> [\` \`] Set channel for emoji ranking: \`ip!emojirank channel #channel\`
> [\` \`] Disable emoji ranking: \`ip!emojirank disable\`
> [\` \`] Add an emoji for emoji ranking: \`ip!emojirank add for=everyone|admins \`<:emoji:629134046332583946>\` Role\`
> [\` \`] Remove an emoji for emoji ranking: \`ip!emojirank remove \`<:emoji:629134046332583946>
Fun <https://interpunct.info/fun>
> [\`X\`] Disable fun: \`ip!fun disable\`
> [\`X\`] Enable fun: \`ip!fun enable\` (Enabled by default)
> [\`X\`] Play ping pong: \`ip!ping\`
> [\`X\`] Play minesweeper: \`ip!minesweeper\`
Speedrun.com <https://interpunct.info/speedrun>
> [\`X\`] Show WR: \`ip!wr\`
> [\`X\`] Show Rules: \`ip!speedrun rules CategoryName%\`
> [\`X\`] Set Game on speedrun.com: \`ip!speedrun set https://www.speedrun.com/yourgame%\`
Quotes and Lists <https://interpunct.info/lists>
> [\`X\`] Create List: \`ip!lists add listname pastebin.com/NFuKYjUN\`
> [\`X\`] Edit List: \`ip!lists edit listname pastebin.com/NFuKYjUN\`
> [\`X\`] Remove List: \`ip!lists remove listname\`
> [\`X\`] List Lists: \`ip!lists list\`
${Object.keys(lists)
	.map(
		l =>
			`> [\`X\`] View ${l}: \`ip!${l} [optional "single"] [optional search term] [optional number]\`\n`
	)
	.join("")}Administration <https://interpunct.info/administration>
> [\` \`] Automatically ban users with specific words in their name:
> \`\`\`
> ip!autoban add
> newline seperated
> list of
> words to ban if found
> in someone's username
> \`\`\`
> [\`X\`] Purge messages in a channel: \`ip!purge [number of messages to purge]\`
> [\` \`] Welcome and Goodbye messages: \`ip!command unknown\`
Configuration <https://interpunct.info/configuration>
> [\`X\`] Error messages: \`ip!set show errors always|admins|never\` (Default: always)
> [\`X\`] Unknown command errors: \`ip!set show unknown command show|admins|hide\` (Default: show)
> [\`X\`] PM Errors: \`ip!settings pm on|off\` (Default: on)
> [\`X\`] Set Prefix: \`ip!set prefix newprefix\` (Default \`{defaultprefix}\`)
Server Info
> inter·punct prefix: ${
			info.prefix ? `\`ip!\`` : "no prefix is required in PMs."
		}
> If the prefix is broken, you can use ${info.atme} as a prefix instead.
Bot Info
> Invite: <https://discordapp.com/api/oauth2/authorize?client_id=433078185555656705&permissions=268445780&scope=bot>
> Website: <https://interpunct.info>
> Support Server: <https://interpunct.info/support>`
			.split("ip!")
			.join(info.prefix)
			.split("{defaultprefix}")
			.join("ip!"),
	role: (role: Discord.Role) =>
		role.mentionable ? safe`${`@${role.name}`}` : role.toString(),
	emoji: {
		failure: "<:failure_2:547081084710682643>",
		restrict_usage: (info: Info) =>
			`Usage: \`${info.prefix}emoji restrict\`<:emoji:629134046332583946>\` Role\`
> Role can be a role name, id, or mention.
> **More Info**: <https://interpunct.info/emoji>`,
		could_not_find_emoji: (
			info: Info,
			emojiID: string
		) => safe`Could not find emoji with the ID ${emojiID}.
> **More Info**: <https://interpunct.info/emoji>`,
		role_does_not_exist: (
			info: Info,
			roleID: string
		) => safe`Could not find role with the ID ${roleID}.
> **More Info**: <https://interpunct.info/emoji>`,
		multiple_roles_found: (
			info: Info,
			roleName: string,
			roles: Discord.Role[]
		) => safe`There are multiple roles named ${
			roleName[0] === "@" ? roleName : `@${roleName}`
		}. Use the ID of the role you meant instead. <https://interpunct.info/role>
Found Roles:
${roles
	.map(
		r =>
			safe`- **ID**: ${r.id}, **Name**: ${`@${r.name}`}, **Color**: ${
				r.hexColor
			}\n`
	)
	.join("")}> **More Info**: <https://interpunct.info/emoji>`,
		no_roles_found: (info: Info, roleName: string) =>
			`No role could be found with the name ${
				roleName[0] === "@" ? roleName : `@${roleName}`
			}. Try using the role ID instead: <https://interpunct.info/role>
> **More Info**: <https://interpunct.info/emoji>`,
		added_restriction: (
			info: Info,
			emoji: Discord.GuildEmoji,
			addedRole: Discord.Role,
			fullList: Discord.Role[]
		) =>
			`Role ${messages.role(
				addedRole
			)} added to restrictions for ${emoji.toString()}. This emoji can now only be used by members with any of these roles:
${fullList.map(role => `- ${messages.role(role)}\n`).join("")}
> If this was a mistake, reset the restrictions for this emoji with \`${
				info.prefix
			}emoji unrestrict ${emoji.id}\``,
		removed_restriction: (
			info: Info,
			emoji: Discord.GuildEmoji,
			removedRole: Discord.Role,
			fullList: Discord.Role[]
		) =>
			`Role ${messages.role(
				removedRole
			)} removed from restrictions for ${emoji.toString()}. This emoji can now only be used by members with any of these roles:
${fullList.map(role => `- ${messages.role(role)}\n`).join("")}
> If this was a mistake, reset the restrictions for this emoji with \`${
				info.prefix
			}emoji unrestrict ${emoji.id}\``,
		removed_all_restrictions: (info: Info, emoji: Discord.GuildEmoji) =>
			`Removed all restrictions for ${emoji.toString()}. Anyone can now use this emoji.`,
		inspect: (info: Info, emoji: Discord.GuildEmoji) =>
			`**Emoji ${emoji.toString()}**:
This emoji can only be used by members with at least one of these roles:
${emoji.roles
	.array()
	.map(role => `- ${messages.role(role)}\n`)
	.join("")}**Image**: ${emoji.url}`
	},
	failure: {
		command_cannot_be_used_in_pms: (info: Info) =>
			`This command cannot be used in PMs!`,
		generic_internal_error: (info: Info, errorCode: string) =>
			`An internal error occured while running the command.
For help, ask on the support server with your error code \`${errorCode}\`
> **Support Server**: <https://interpunct.info/support>
> **Error Code**: \`${errorCode}\``,
		command_not_found: (info: Info, command: string) =>
			safe`Command \`${command}\` not found. Type \`${raw(
				info.prefix
			)}help\` for a list of commands.`
	},
	settings: {
		autospace_enabled: (info: Info) =>
			`When you make a new channel or edit an existing channel, all dashes will be replaced with spaces. To disable this, use
\`\`\`
${info.prefix}space channels disable
\`\`\``,
		autospace_disabled: (info: Info) =>
			`Channels will no longer have spaces added to their names.`,
		show_errors_set: (
			info: Info,
			showErrors: "always" | "admins" | "never",
			unknownCommandMessages: "always" | "admins" | "never"
		) =>
			showErrors === "always"
				? `Errors will be shown to all users.${
						unknownCommandMessages === "never"
							? `\n> Unknown command errors are currently hidden. To show them for admins or all users, use \`${info.prefix}set show unknown command always\` or \`${info.prefix}set show unknown command admins\``
							: ""
				  }`
				: showErrors === "admins"
				? `Bot errors will only be shown to members with the \`Manage Server\` permission.${
						unknownCommandMessages === "always"
							? `\n> Unknown command errors will still be shown to all users. To show them for admins or disable them entirely, use \`${info.prefix}set show unknown command admins\` or \`${info.prefix}set show unknown command never\``
							: ""
				  }`
				: showErrors === "never"
				? `Bot errors will never be shown. If a command is not working and not giving any output, try re-enabling command errors with \`${
						info.prefix
				  }set show errors always\`.${
						unknownCommandMessages === "always"
							? `\n> Unknown command errors will still be shown to all users. To show them for admins only or disable them entirely, use \`${info.prefix}set show unknown command admins\` or \`${info.prefix}set show unknown command never\``
							: ""
				  }`
				: `this should never happen`,
		no_prefix_provided: (info: Info) =>
			`The current prefix for this server is ${info.prefix}. To change it, use \`${info.prefix}set prefix new_prefix\``,
		prefix_updated: (info: Info, newPrefix: string) =>
			`Prefix changed to ${newPrefix}. Try it out with \`${newPrefix}ping\`.`,
		show_errors_usage: (
			info: Info,
			showErrors: "always" | "admins" | "never"
		) =>
			`Error messages are currently ${
				showErrors === "always"
					? "shown to all users"
					: showErrors === "admins"
					? "shown to members with the `Manage Server` permission"
					: showErrors === "never"
					? "never shown"
					: "this should never happen"
			}. To change this, use \`${
				info.prefix
			}set show errors always|admins|never\``,
		unknown_commands_set: (
			info: Info,
			unknownCommandMessages: "always" | "admins" | "never",
			showErrors: "always" | "admins" | "never"
		) =>
			unknownCommandMessages === "always"
				? `Unknown command messages will be shown to all users.`
				: unknownCommandMessages === "admins"
				? `Unknown command messages will only be shown to members with the \`Manage Server\` permission.`
				: unknownCommandMessages === "never"
				? `Unknown command messages will be hidden. If a command is not working and not giving any output, try re-enabling unknown command messages with \`${info.prefix}set show unknown command always\``
				: `this should never happen`,
		unknown_commands_usage: (
			info: Info,
			unknownCommandMessages: "always" | "admins" | "never"
		) =>
			`Unknown command messages are currently ${
				unknownCommandMessages === "always"
					? "shown to all users"
					: unknownCommandMessages === "admins"
					? "shown to members with the `Manage Server` permission"
					: unknownCommandMessages === "never"
					? "never shown"
					: "this should never happen"
			}. To change this, use \`${
				info.prefix
			}set show unknown command always|admins|never\``
	},
	logging: {
		attach_files: (info: Info) =>
			`${info.atme} needs permission to \`Attach Files\` to upload your log file here.
> More Info: <https://interpunct.info/logging>`,
		upload_probably_failed: (info: Info, errorCode: string) =>
			`(Probably) Failed to upload the log file. For help, join the support server and ask with your error code \`${errorCode}\`.
> More Info: <https://interpunct.info/logging>
> Support Server: <https://discord.gg/HVWCeXc>`,
		log_sent: (info: Info) =>
			`
> Use \`${info.prefix}log reset\` to clear the log and start a new one.`
	},
	speedrun: {
		requires_setup: (info: Info) =>
			`Speedrun commands have not been set up on this server. Set them up with \`${info.prefix}speedrun set https://speedrun.com/game Category Name\`.
> More Info: <https://interpunct.info/speedrun>`,
		invalid_category_name: (
			info: Info,
			categoryName: string,
			categoryNames: string[]
		) =>
			safe`The category ${categoryName} is not on the selected game. Valid categories are: ${categoryNames.join(
				", "
			)}.
> More Info: <https://interpunct.info/speedrun>`,
		no_wr_found: (info: Info) => `No world record found.
> More Info: <https://interpunct.info/speedrun>`,
		no_run_for_position: (
			info: Info,
			position: number
		) => `No run found in ${position}${
			`${position}`.endsWith("1")
				? "st"
				: `${position}`.endsWith("2")
				? "nd"
				: `${position}`.endsWith("3")
				? "rd"
				: "th"
		} place.
> More Info: <https://interpunct.info/speedrun>`,
		position_required: (info: Info) =>
			`A position is required, such as \`${info.prefix}speedrun leaderboard 26\`
> More Info: <https://interpunct.info/speedrun>`
	},
	fun: {
		fun_disabled: (info: Info) => `Fun is not allowed on this server.`,
		ping: (info: Info) => `<a:pingpong:482012177725653003>
> Took ${new Date().getTime() - info.other!.startTime}ms, handling ${
			info.other!.infoPerSecond
		} db requests per second`,
		command_not_found: (info: Info) =>
			`Usage: \`${info.prefix} fun enable|disable\`.
> More Info: <https://interpunct.info/fun>`,
		fun_has_been_enabled: (info: Info) => `Fun enabled.
> Try it out with \`ip!minesweeper\``,
		fun_has_been_disabled: (info: Info) =>
			`Fun is no longer allowed on this server.`,
		minesweeper_usage: (
			info: Info,
			difficulties: string[],
			modes: string[]
		) => `Usage: \`${info.prefix}minesweeper [optional ${difficulties.join(
			"|"
		)} = hard] [optional ${modes.join(
			"|"
		)} = emojis] [optional WIDTHxHEIGHT = 10x10]\`
> More Info: <https://interpunct.info/minesweeper>`
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
		) => `A list name and pastebin URL is required. For example: \`${info.prefix}lists add listname pastebin.com/NFuKYjUN\`
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
		purge: {
			message_limit: (info: Info, messageLimit: number) =>
				!messageLimit
					? `A message limit must be given, such as \`${info.prefix}purge 25\``
					: messageLimit < 1
					? `Message limit must be positive.`
					: messageLimit > 1000
					? `Message limit must be less than 1000`
					: `Message limit must be an integer.`,
			in_progress: (info: Info, messagesToDelete: number) =>
				`Deleting ${messagesToDelete} messages...`,
			success: (info: Info, messagesToDelete: number) =>
				`Succesfully deleted ${messagesToDelete} messages.`
		},
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
