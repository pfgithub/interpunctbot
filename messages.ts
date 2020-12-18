import Info from "./src/Info";
import * as Discord from "discord.js";
import { CustomCommandsField } from "./src/Database";

export function raw(string: TemplateStringsArray | string) {
	return { __raw: `${string.toString()}` };
}

export function templateGenerator<InType>(helper: (str: InType) => string) {
	type ValueArrayType = (InType | string | { __raw: string })[];
	return (
		strings: TemplateStringsArray | InType,
		...values: ValueArrayType
	) => {
		if (!(strings as TemplateStringsArray).raw && !Array.isArray(strings)) {
			return helper(strings as InType);
		}
		const result: ValueArrayType = [];
		(strings as TemplateStringsArray).forEach((str, i) => {
			result.push(raw(str), values[i] || "");
		});
		return result
			.map(el =>
				typeof (el as { __raw: string }).__raw === "string"
					? (el as { __raw: string }).__raw
					: helper(el as InType),
			)
			.join("");
	};
}

/// joins a list in english
/// eg One / One or Two / One, Two, or Three / One, Two, Three, or Four
/// joiner is 'and' or 'or'
export function humanizelist(items: string[], joiner: string, empty = "*Empty list oops*"): string {
	if(items.length == 0) return empty;
	if(items.length == 1) return items[0];
	if(items.length == 2) return items.join(" "+joiner+" ");
	return items.map((a, i) => ((i == items.length - 1) ? "or " : "") + a).join(", ");
}

export const orlist = (items: string[], empty?: string) => humanizelist(items, "or", empty);
export const andlist = (items: string[], empty?: string) => humanizelist(items, "and", empty);
export const plural = (text: any[] | number) => (typeof text === "number" ? text : text.length) === 1 ? "" : "s";

export const safe = templateGenerator((str: string) =>
	str
		.replace(/(\*|_|`|~|\\|<|>|\[|\]"|'|\(|\)|:)/g, "\\$1")
		.replace(/everyone/g, "every\u200bone")
		.replace(/here/g, "he\u200bre"),
);

const shownon: { [key: string]: true | undefined } = {};

export const messages = {
	role: (role: Discord.Role) => {
		if (
			role.mentionable ||
			role.guild.me!.hasPermission("MENTION_EVERYONE")
		)
			return safe`${`@${role.name}`}`;
		return role.toString();
	},
	nd: (number: number) =>
		number +
		(number > 10 && number < 20 // 12th, 13th, 14th
			? "th"
			: `${number}`.endsWith("1") // 1st, 21st
			? "st"
			: `${number}`.endsWith("2") // 2nd, 52nd
			? "nd"
			: `${number}`.endsWith("3") // 3rd, 23rd
			? "rd"
			: "th"),
	arguments: {
		channel_arg_not_provided: (
			info: Info,
			cmd: string,
			index: number,
			commandhelp: string,
			purpose: string,
		) => `The ${messages.nd(
			index,
		)} argument to this command must be a channel${purpose}. Mention a channel by typing # and selecting a channel, or use the channel ID.
> **Using Channels in Commands**: <https://interpunct.info/channel-arg>${
			commandhelp ? `\n${commandhelp}` : ""
		}`,
		emoji_arg_not_provided: (
			info: Info,
			cmd: string,
			index: number,
			commandhelp: string,
			purpose: string,
		) => `The ${messages.nd(
			index + 1,
		)} argument to this command must be an emoji${purpose}. Use an emoji by selecting it from the emoji menu, or use the emoji's id.
> **Using Emojis in Commands**: <https://interpunct.info/emoji-arg>${
			commandhelp ? `\n${commandhelp}` : ""
		}`,
		word_arg_not_provided: (
			info: Info,
			cmd: string,
			index: number,
			commandhelp: string,
			purpose: string,
		) => `The ${messages.nd(
			index + 1,
		)} argument to this command must be a word.${purpose}
> **Using Words in Commands**: <https://interpunct.info/word-arg>${
			commandhelp ? `\n${commandhelp}` : ""
		}`,
		words_arg_not_provided: (
			info: Info,
			cmd: string,
			index: number,
			commandhelp: string,
			purpose: string,
		) => `The last argument to this command must be the message${purpose}
> **Using in Commands**: <https://interpunct.info/words-arg>${
			commandhelp ? `\n${commandhelp}` : ""
		}`,
		role_arg_not_provided: (
			info: Info,
			cmd: string,
			index: number,
			commandhelp: string,
			purpose: string,
		) => `The last argument to this command must be the role name, @mention, or id${purpose}
> **Using Roles in Commands**: <https://interpunct.info/role-arg>${
			commandhelp ? `\n${commandhelp}` : ""
		}`,
		channel_not_found: (
			info: Info,
			channelID: string,
			index: number,
			commandhelp: string,
		) => `The channel with the ID ${channelID} could not be found. Make sure the ${messages.nd(
			index + 1,
		)} argument to this command has a real channel on this server.
> **Using Channels in Commands**: <https://interpunct.info/channel-arg>${
			commandhelp ? `\n${commandhelp}` : ""
		}`,
		emoji_not_found: (
			info: Info,
			channelID: string,
			index: number,
			commandhelp: string,
			purpose: string,
		) => `The emoji with the ID ${channelID} could not be found. Make sure the ${messages.nd(
			index + 1,
		)} argument to this command has a real emoji on this server.
> **Using Emojis in Commands**: <https://interpunct.info/emoji-arg>${
			commandhelp ? `\n${commandhelp}` : ""
		}`,
		role_name_not_provided: (
			info: Info,
			roleID: string,
			index: number,
			commandhelp: string,
		) => `The role in the last argument could not be found.
> **Using Roles in Commands**: <https://interpunct.info/role-arg>${
			commandhelp ? `\n${commandhelp}` : ""
		}`,
		multiple_roles_found: (
			rolename: string,
			matchingRoles: Discord.Role[],
		) =>
			`There are ${
				matchingRoles.length
			} roles named ${safe`${rolename}`}. Either rename the others or use a Role ID.
> ${matchingRoles
				.map(
					r =>
						messages.role(r) +
						(matchingRoles.length <= 4 ? " (`" + r.id + "`)" : ""),
				)
				.join(", ")}`,
		multiple_roles_found_fuzzy: (
			rolename: string,
			matchingRoles: Discord.Role[],
		) => `There are ${
			matchingRoles.length
		} roles with names similar to ${safe`${rolename}`}. Either be more specific or use a Role ID.
> ${matchingRoles
			.map(
				r =>
					messages.role(r) +
					(matchingRoles.length <= 4 ? " (`" + r.id + "`)" : ""),
			)
			.join(", ")}`,
		no_roles_found: (
			info: Info,
			rolename: string,
			index: number,
			commandhelp: string,
		) => `I could not find any roles named ${safe`${rolename}`}. Check your spelling or directly copy and paste the name. If that doesn't work, use a Role ID.
> **Using Roles in Commands**: <https://interpunct.info/role-arg>${
			commandhelp ? `\n${commandhelp}` : ""
		}`,
		role_this_should_never_happen: () => ``,

		num_arg_not_provided: (
			info: Info,
			cmd: string,
			index: number,
			commandhelp: string,
			purpose: string,
		) => `The ${messages.nd(
			index + 1,
		)} argument to this command must be a number.${purpose}
> **Using Numbers in Commands**: <https://interpunct.info/number-arg>${
			commandhelp ? `\n${commandhelp}` : ""
		}`,

		num_is_nan: (
			info: Info,
			cmd: string,
			index: number,
			commandhelp: string,
			purpose: string,
		) => `I could not find a number in the ${messages.nd(
			index + 1,
		)} argument to this command.${purpose}
> **Using Numbers in Commands**: <https://interpunct.info/number-arg>${
			commandhelp ? `\n${commandhelp}` : ""
		}`,
	},
	emoji: {
		failure: "<:failure_2:508841130503438356>",
		success: "<:success_2:508840840416854026>",
		restrict_usage: (info: Info) =>
			`Usage: \`${info.prefix}emoji restrict\`<:emoji:685668888842993833>\` Role\`
> Role can be a role name, id, or mention.
> **More Info**: <https://interpunct.info/emoji>`,
		could_not_find_emoji: (
			info: Info,
			emojiID: string,
		) => safe`Could not find emoji with the ID ${emojiID}.
> **More Info**: <https://interpunct.info/emoji>`,
		role_does_not_exist: (
			info: Info,
			roleID: string,
		) => safe`Could not find role with the ID ${roleID}.
> **More Info**: <https://interpunct.info/emoji>`,
		multiple_roles_found: (
			info: Info,
			roleName: string,
			roles: Discord.Role[],
		) => safe`There are multiple roles named ${
			roleName.startsWith("@") ? roleName : `@${roleName}`
		}. Use the ID of the role you meant instead. <https://interpunct.info/role>
Found Roles:
${roles
	.map(
		r =>
			safe`- **ID**: ${r.id}, **Name**: ${`@${r.name}`}, **Color**: ${
				r.hexColor
			}\n`,
	)
	.join("")}> **More Info**: <https://interpunct.info/emoji>`,
		no_roles_found: (info: Info, roleName: string) =>
			`No role could be found with the name ${
				roleName.startsWith("@") ? roleName : `@${roleName}`
			}. Try using the role ID instead: <https://interpunct.info/role>
> **More Info**: <https://interpunct.info/emoji>`,
		added_restriction: (
			info: Info,
			emoji: Discord.GuildEmoji,
			addedRole: Discord.Role,
			fullList: Discord.Role[],
		) =>
			`Role ${messages.role(
				addedRole,
			)} added to restrictions for ${emoji.toString()}. This emoji can now only be used by members with any of these roles:
${fullList.map(role => `- ${role.toString()}\n`).join("")}
> If this was a mistake, reset the restrictions for this emoji with \`${
				info.prefix
			}emoji unrestrict ${emoji.id}\``,
		removed_restriction: (
			info: Info,
			emoji: Discord.GuildEmoji,
			removedRole: Discord.Role,
			fullList: Discord.Role[],
		) =>
			`Role ${removedRole.toString()} removed from restrictions for ${emoji.toString()}. This emoji can now only be used by members with any of these roles:
${fullList.map(role => `- ${role.toString()}\n`).join("")}
> If this was a mistake, reset the restrictions for this emoji with \`${
				info.prefix
			}emoji unrestrict ${emoji.id}\``,
		removed_all_restrictions: (info: Info, emoji: Discord.GuildEmoji) =>
			`Removed all restrictions for ${emoji.toString()}. Anyone can now use this emoji.`,
		inspect: (
			info: Info,
			emoji: Discord.GuildEmoji,
		) => `**Emoji ${emoji.toString()}**:
${
	emoji.roles.cache.array().length > 0
		? `This emoji can only be used by members with at least one of these roles:
${emoji.roles.cache
	.array()
	.map(role => `- ${role.toString()}\n`)
	.join("")}`
		: ""
}**Image**: ${emoji.url}`,
	},
	failure: {
		command_cannot_be_used_in_pms: (info: Info) =>
			`This command cannot be used in PMs!
> **Support Server**: <https://interpunct.info/support>
> **About this Error**: <https://interpunct.info/command-cannot-be-used-in-pms>`,
		command_must_use_pms: (info: Info) =>
			`PM me to use this command.
> **Support Server**: <https://interpunct.info/support>
> **About this Error**: <https://interpunct.info/command-must-use-pms>`,
		generic_internal_error: (info: Info, errorCode: string) =>
			`An internal error occured while running this command.
For help, ask on the support server with your error code \`${errorCode}\`
> **Support Server**: <https://interpunct.info/support>
> **Error Code**: \`${errorCode}\``,
		missing_permissions_internal_error: (info: Info, errorCode: string) =>
			`${info.atme} does not have some of the permissions it needs to run this command.
For help, ask on the support server with your error code \`${errorCode}\`
> **Support Server**: <https://interpunct.info/support>
> **Error Code**: \`${errorCode}\``,
		command_not_found: (info: Info, command: string) =>
			safe`Command \`${info.prefix}${command}\` not found. Type \`${raw(
				info.prefix,
			)}help\` for a list of commands.` +
			(info.authorPerms.manageBot &&
			!shownon[info.message.channel.id + "|" + info.message.author.id]
				? ((shownon[
						info.message.channel.id + "|" + info.message.author.id
				  ] = true),
				  "\n> Don't want to see this? Disable this message with `" +
						safe`${info.prefix}set showunknowncommand never` +
						"`.")
				: ""),
		command_removed: (
			info: Info,
			old: string,
			version: string,
			description?: string,
		) =>
			safe`The command \`${
				info.prefix
			}${old}\` has been removed as part  of inter·punct bot version ${version}.${raw(
				description ? `\n\n${description}` : "",
			)}	
> Join the support server to complain if this removal affects you: <https://interpunct.info/support>`,
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
			unknownCommandMessages: "always" | "admins" | "never",
		) =>
			showErrors === "always"
				? `Errors will be shown to all users.${
						unknownCommandMessages === "never"
							? `\n> Unknown command errors are currently hidden. To show them for admins or all users, use \`${info.prefix}set showunknowncommand always\` or \`${info.prefix}set showunknowncommand admins\``
							: ""
				  }`
				: showErrors === "admins"
				? `Bot errors will only be shown to members with the \`Manage Server\` permission.${
						unknownCommandMessages === "always"
							? `\n> Unknown command errors will still be shown to all users. To show them for admins or disable them entirely, use \`${info.prefix}set show unknowncommand admins\` or \`${info.prefix}set showunknowncommand never\``
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
			safe`The current prefix for this server is ${info.prefix}. To change it, use \`${info.prefix}set prefix new_prefix\``,
		prefix_updated: (info: Info, newPrefix: string) =>
			safe`Prefix changed to ${newPrefix}.\n> Try it out with \`${newPrefix}test\`.`,
		show_errors_usage: (
			info: Info,
			showErrors: "always" | "admins" | "never",
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
			showErrors: "always" | "admins" | "never",
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
			unknownCommandMessages: "always" | "admins" | "never",
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
			}set show unknown command always|admins|never\``,
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
> Use \`${info.prefix}log reset\` to clear the log and start a new one.`,
	},
	speedrun: {
		requires_setup: (info: Info) =>
			`Speedrun commands have not been set up on this server. Set them up with \`${info.prefix}speedrun set https://speedrun.com/game Category Name\`.
> More Info: <https://interpunct.info/speedrun>`,
		invalid_category_name: (
			info: Info,
			categoryName: string,
			categoryNames: string[],
		) =>
			safe`The category ${categoryName} is not on the selected game. Valid categories are: ${categoryNames.join(
				", ",
			)}.
> More Info: <https://interpunct.info/speedrun>`,
		no_wr_found: (info: Info) => `No world record found.
> More Info: <https://interpunct.info/speedrun>`,
		no_run_for_position: (
			info: Info,
			position: number,
		) => `No run found in ${messages.nd(position)} place.
> More Info: <https://interpunct.info/speedrun>`,
		position_required: (info: Info) =>
			`A position is required, such as \`${info.prefix}speedrun leaderboard 26\`
> More Info: <https://interpunct.info/speedrun>`,
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
> Try it out with \`ip!${
			["minesweeper", "connect4", "checkers", "trivia"][
				Math.floor(Math.random() * 4)
			]
		}\``,
		fun_has_been_disabled: (info: Info) =>
			`Fun is no longer allowed on this server.`,
		minesweeper_usage: (
			info: Info,
			difficulties: string[],
			modes: string[],
		) => `Usage: \`${info.prefix}minesweeper [optional ${difficulties.join(
			"|",
		)} = medium] [optional ${modes.join(
			"|",
		)} = customemojis] [optional WIDTHxHEIGHT = 10x10] [optional difficulty% = 15%]\`
> More Info: <https://interpunct.info/minesweeper>`,
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
		list_lists: (info: Info, lists: CustomCommandsField) =>
			`**Lists**:
${Object.entries(lists)
	.map(([key, value]) =>
		value.type === "list"
			? `> ${key}: <https://pastebin.com/${value.pastebin}>`
			: `> ${key}: ${value.text.substr(0, 50) +
					(value.text.length > 50 ? "..." : "")}`,
	)
	.join(`\n`) || "> *No lists yet. Create some with {Command|lists add}*"}`,
		no_list_name_provided: (
			info: Info,
		) => `A list name and pastebin URL is required. For example: \`${info.prefix}lists add listname pastebin.com/NFuKYjUN\`
> More Info: <https://interpunct.info/lists>`,
		list_already_exists: (
			info: Info,
			listName: string,
			pastebinUrl: string,
		) =>
			`Command ${listName} already exists, edit it with \`${info.prefix}lists edit ${listName} ${pastebinUrl}\` or delete it with \`${info.prefix}lists delete ${listName}\`
> More Info: <https://interpunct.info/lists>`,
		list_does_not_exist: (
			info: Info,
			listName: string,
			pastebinUrl: string,
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
			`List ${listName} removed.`,
	},
	channels: {
		purge: {
			message_limit: (info: Info, messageLimit: number) =>
				!messageLimit
					? `A message limit must be given, such as \`${info.prefix}purge 25\``
					: messageLimit < 1
					? `Message limit must be positive.`
					: messageLimit > 100
					? `Message limit must be between 1 and 100`
					: `Message limit must be an integer.`,
			in_progress: (info: Info, messagesToDelete: number) =>
				`Deleting ${messagesToDelete} messages...`,
			success: (info: Info, messagesToDelete: number) =>
				`Succesfully deleted ${messagesToDelete} messages.`,
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
				`The channel${plural(channels)} ${andlist(channels
					.map(c => c.toString()))} now have spaces.`,
			autospace_info_off: (info: Info) =>
				`> If you want channels to automatically have spaces in the future, use \`${info.prefix}space channels automatically\``,
			autospace_info_on: (info: Info) =>
				`Channels should be given spaces automatically because you have \`ip!space channels enable\`d.`,
			partially_succeeded_spacing: (
				info: Info,
				channels: Discord.Channel[],
				failedChannels: Discord.Channel[],
			) =>
				`The channel${plural(channels)} ${andlist(channels
					.map(c => c.toString()))} now have spaces.
The channel${plural(failedChannels)} ${andlist(failedChannels
					.map(c => c.toString()))} could not be given spaces. Maybe ${
					info.atme
				} does not have permission to Manage Channels?
If you wanted spaces in these channels, check the channel settings to see if ${
					info.atme
				} has permission to manage them.

> Discord Support: <https://support.discordapp.com/hc/en-us/articles/206029707-How-do-I-set-up-Permissions->
> Command Help: <https://interpunct.info/spacing-channels>`,
			failed_spacing: (info: Info, failedChannels: Discord.Channel[]) =>
				`The channel${plural(failedChannels)} ${andlist(failedChannels
					.map(c => c.toString()))} could not be given spaces. Maybe ${
					info.atme
				} does not have permission to Manage Channels?
If you wanted spaces in these channels, check the channel settings to see if ${
					info.atme
				} has permission to manage them.
> Discord Support: <https://support.discordapp.com/hc/en-us/articles/206029707-How-do-I-set-up-Permissions->
> Command Help: <https://interpunct.info/spacing-channels>`,
		},
		send_many: {
			no_channels_tagged: (info: Info) =>
				`**No channels were tagged!**
To send a message to multiple channels, tag every channel you want to send the message to, like this:
\`\`\`
${info.prefix}send This is my great message! #rules #general
\`\`\`
> More Info: <https://interpunct.info/sending-messages-to-multiple-channels>`,
			succeeded_sending: (info: Info, channels: Discord.Channel[]) =>
				`Your message was sent to ${andlist(channels
					.map(c => c.toString()))}.`,
			partially_succeeded_sending: (
				info: Info,
				channels: Discord.Channel[],
				failedChannels: Discord.Channel[],
			) =>
				`Your message was sent to ${andlist(channels
					.map(c => c.toString()))}.
It could not be sent to ${orlist(failedChannels
					.map(c => c.toString()))}. Maybe ${
					info.atme
				} does not have permission to Read and Send Messages there?
Check the channel settings to see if ${
					info.atme
				} has permission to read and send messages.
> Discord Support: <https://support.discordapp.com/hc/en-us/articles/206029707-How-do-I-set-up-Permissions->
> Command Help: <https://interpunct.info/sending-messages-to-multiple-channels>`,
			failed_sending: (info: Info, failedChannels: Discord.Channel[]) =>
				`Your message could not be sent to ${orlist(failedChannels
					.map(c => c.toString()))}. Maybe ${
					info.atme
				} does not have permission to Read and Send Messages there?
Check the channel settings to see if ${
					info.atme
				} has permission to read and send messages.
> Discord Support: <https://support.discordapp.com/hc/en-us/articles/206029707-How-do-I-set-up-Permissions->
> Command Help: <https://interpunct.info/sending-messages-to-multiple-channels>`,
		},
	},
};
