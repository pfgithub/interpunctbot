import * as Discord from "discord.js";

import Info from "../Info";
import { messages } from "../../messages";

export type ArgType = "emoji" | "channel" | "word" | "words..." | "role..."; // | {type: "enum", values: ["one", "two"]}
export type ArgTypeValue<T> = T extends "emoji"
	? Discord.GuildEmoji
	: T extends "channel"
	? Discord.GuildChannel
	: T extends "word"
	? string
	: T extends "words"
	? string
	: T extends "role..."
	? Discord.Role
	: never;
export type ArgTypeArrayValue<T extends ArgType[]> = {
	[key in keyof T]: ArgTypeValue<T[key]>;
};

function roleNameMatch(rolename: string, message: string) {
	const rn = rolename.trim().toLowerCase();
	const rm = message.trim().toLowerCase();
	return rn === rm || `@${rn}` === rm;
}

//eslint-disable-next-line complexity
export async function OneArgumentParser(
	info: Info,
	arg: ArgType,
	cmd: string,
	index: number
): Promise<
	| { result: "continue"; value: ArgTypeValue<typeof arg>; cmd: string }
	| { result: "exit" }
> {
	if (arg === "channel") {
		if (!cmd.trim()) {
			await info.error(
				messages.arguments.channel_arg_not_provided(info, cmd, index)
			);
			return { result: "exit" };
		}
		if (!info.guild) {
			await info.error(
				messages.failure.command_cannot_be_used_in_pms(info)
			);
			return { result: "exit" };
		}
		const match = cmd.match(/^[\S\s]*?([0-9]{14,})[^\s]*?\s*([\S\s]*)$/);
		if (!match) {
			await info.error(messages.arguments.no_channel(info, cmd, index));
			return { result: "exit" };
		}
		const [, channelID, remainingCmd] = match;
		const channel = info.guild.channels.get(channelID);
		if (!channel) {
			await info.error(
				messages.arguments.channel_not_found(info, channelID, index)
			);
			return { result: "exit" };
		}
		return {
			result: "continue",
			value: channel,
			cmd: remainingCmd
		};
	}
	if (arg === "emoji") {
		if (!cmd.trim()) {
			await info.error(
				messages.arguments.emoji_arg_not_provided(info, cmd, index)
			);
			return { result: "exit" };
		}
		if (!info.guild) {
			await info.error(
				messages.failure.command_cannot_be_used_in_pms(info)
			);
			return { result: "exit" };
		}
		const match = cmd.match(/^[\S\s]*?([0-9]{14,})[^\s]*?\s*([\S\s]*)$/);
		if (!match) {
			await info.error(messages.arguments.no_channel(info, cmd, index));
			return { result: "exit" };
		}
		const [, emojiID, remainingCmd] = match;
		const emoji = info.guild.emojis.get(emojiID);
		if (!emoji) {
			await info.error(
				messages.arguments.emoji_not_found(info, emojiID, index)
			);
			return { result: "exit" };
		}
		return {
			result: "continue",
			value: emoji,
			cmd: remainingCmd
		};
	}
	if (arg === "word") {
		if (!cmd.trim()) {
			await info.error(
				messages.arguments.word_arg_not_provided(info, cmd, index)
			);
			return { result: "exit" };
		}
		const word = cmd.match(/^([\s]+)\s+([\S\s]+)/m);
		if (!word) {
			await info.error(messages.arguments.no_word(info, cmd, index));
			return { result: "exit" };
		}
		const [, result, newCmd] = word;
		return { result: "continue", value: result, cmd: newCmd };
	}
	if (arg === "words...") {
		if (!cmd.trim()) {
			await info.error(
				messages.arguments.words_arg_not_provided(info, cmd, index)
			);
			return { result: "exit" };
		}
		return { result: "continue", value: cmd.trim(), cmd: "" };
	}
	if (arg === "role...") {
		if (!cmd.trim()) {
			await info.error(
				messages.arguments.role_arg_not_provided(info, cmd, index)
			);
			return { result: "exit" };
		}
		if (!info.guild) {
			await info.error(
				messages.failure.command_cannot_be_used_in_pms(info)
			);
			return { result: "exit" };
		}
		const rolename = cmd.trim();
		if (!rolename) {
			await info.error(messages.arguments.no_role(info, cmd, index));
			return { result: "exit" };
		}
		const roleID = (rolename
			.trim()
			.match(/^[\S\s]*?([0-9]{16,})[\S\s]*$/) || ["", ""])[1];
		let role: Discord.Role;
		if (roleID) {
			const foundRole = info.guild.roles.get(roleID);
			if (!foundRole) {
				await info.error(
					messages.arguments.role_name_not_provided(
						info,
						roleID,
						index
					)
				);
				return { result: "exit" };
			}
			role = foundRole;
		} else {
			const matchingRoles = info.guild.roles
				.array()
				.filter(role => roleNameMatch(role.name, rolename));
			if (matchingRoles.length > 1) {
				await info.error(
					messages.arguments.multiple_roles_found(
						info,
						rolename,
						matchingRoles
					)
				);
				return { result: "exit" };
			}
			if (matchingRoles.length === 0) {
				await info.error(
					messages.arguments.no_roles_found(info, rolename, index)
				);
				return { result: "exit" };
			}
			role = matchingRoles[0];
		}
		if (!role) {
			await info.error(
				messages.arguments.role_this_should_never_happen(
					info,
					rolename,
					index
				)
			);
			return { result: "exit" };
		}
		return {
			result: "continue",
			value: role,
			cmd: ""
		};
	}
	throw new Error(`Argument parser tried to parse ${arg}`);
}

export async function ArgumentParser<ArgTypes extends ArgType[]>(
	info: Info,
	schema: ArgTypes,
	cmd: string
): Promise<ArgTypeArrayValue<ArgTypes> | undefined> {
	const resarr: ArgTypeValue<any>[] = [];
	let index = 0;
	for (const value of schema) {
		const parseResult = await OneArgumentParser(info, value, cmd, index);
		if (parseResult.result === "exit") {
			return undefined;
		}
		resarr.push(parseResult.value);
		cmd = parseResult.cmd;
		index++;
	}
	return resarr as ArgTypeArrayValue<ArgTypes>;
}
