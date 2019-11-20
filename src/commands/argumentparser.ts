import * as Discord from "discord.js";

import Info from "../Info";
import { messages } from "../../messages";

export type BaseArgType<S, T> = {
	type: S;
	validator?: (v: T) => Promise<boolean>;
};
export type EmojiArgType = BaseArgType<"emoji", Discord.GuildEmoji>;
export type ChannelArgType = BaseArgType<"channel", Discord.GuildChannel>;
export type WordArgType = BaseArgType<"word", string>;
export type NumberArgType = BaseArgType<"number", number>;
export type WordsArgType = BaseArgType<"words...", string>;
export type RoleArgType = BaseArgType<"role...", Discord.Role>;

export const a = {
	emoji(validator?: EmojiArgType["validator"]): EmojiArgType {
		return { type: "emoji", validator };
	},
	channel(validator?: ChannelArgType["validator"]): ChannelArgType {
		return { type: "channel", validator };
	},
	word(validator?: WordArgType["validator"]): WordArgType {
		return { type: "word", validator };
	},
	number(validator?: NumberArgType["validator"]): NumberArgType {
		return { type: "number", validator };
	},
	words(validator?: WordsArgType["validator"]): [WordsArgType] {
		return [{ type: "words...", validator }];
	},
	role(validator?: RoleArgType["validator"]): [RoleArgType] {
		return [{ type: "role...", validator }];
	}
};

export type ArgTypeToReturnType<T> = T extends BaseArgType<any, infer Q>
	? Q
	: never;
export type ArgTypeArrayToReturnType<
	T extends Readonly<BaseArgType<any, any>[]>
> = {
	[key in keyof T]: ArgTypeToReturnType<T[key]>;
};

function roleNameMatch(rolename: string, message: string) {
	const rn = rolename.trim().toLowerCase();
	const rm = message.trim().toLowerCase();
	return rn === rm || `@${rn}` === rm;
}

export type ArgumentParserResult<T> = Promise<
	{ result: "continue"; value: T; cmd: string } | { result: "exit" }
>;

export async function ChannelArgumentParser(
	info: Info,
	arg: ChannelArgType,
	cmd: string,
	index: number,
	commandhelp: string,
	argpurpose: string
): ArgumentParserResult<Discord.GuildChannel> {
	if (!cmd.trim()) {
		await info.error(
			messages.arguments.channel_arg_not_provided(
				info,
				cmd,
				index,
				commandhelp,
				argpurpose
			)
		);
		return { result: "exit" };
	}
	if (!info.guild) {
		await info.error(messages.failure.command_cannot_be_used_in_pms(info));
		return { result: "exit" };
	}
	const match = cmd.match(/^[\S\s]*?([0-9]{14,})[^\s]*?\s*([\S\s]*)$/);
	if (!match) {
		await info.error(
			messages.arguments.channel_arg_not_provided(
				info,
				cmd,
				index,
				commandhelp,
				argpurpose
			)
		);
		return { result: "exit" };
	}
	const [, channelID, remainingCmd] = match;
	const channel = info.guild.channels.get(channelID);
	if (!channel) {
		await info.error(
			messages.arguments.channel_not_found(
				info,
				channelID,
				index,
				commandhelp
			)
		);
		return { result: "exit" };
	}
	return {
		result: "continue",
		value: channel,
		cmd: remainingCmd
	};
}

export async function EmojiArgumentParser(
	info: Info,
	arg: EmojiArgType,
	cmd: string,
	index: number,
	commandhelp: string,
	argpurpose: string
): ArgumentParserResult<Discord.GuildEmoji> {
	if (!cmd.trim()) {
		await info.error(
			messages.arguments.emoji_arg_not_provided(
				info,
				cmd,
				index,
				commandhelp,
				argpurpose
			)
		);
		return { result: "exit" };
	}
	if (!info.guild) {
		await info.error(messages.failure.command_cannot_be_used_in_pms(info));
		return { result: "exit" };
	}
	const match = cmd.match(/^[\S\s]*?([0-9]{14,})[^\s]*?(?:\s+|$)([\S\s]*)$/);
	if (!match) {
		await info.error(
			messages.arguments.emoji_arg_not_provided(
				info,
				cmd,
				index,
				commandhelp,
				argpurpose
			)
		);
		return { result: "exit" };
	}
	const [, emojiID, remainingCmd] = match;
	console.log("!!!!!!!!!!!!!!!!!!", match);
	const emoji = info.guild.emojis.get(emojiID);
	if (!emoji) {
		await info.error(
			messages.arguments.emoji_not_found(
				info,
				emojiID,
				index,
				commandhelp,
				argpurpose
			)
		);
		return { result: "exit" };
	}
	return {
		result: "continue",
		value: emoji,
		cmd: remainingCmd
	};
}

export async function WordArgumentParser(
	info: Info,
	arg: WordArgType,
	cmd: string,
	index: number,
	commandhelp: string,
	argpurpose: string
): ArgumentParserResult<string> {
	if (!cmd.trim()) {
		await info.error(
			messages.arguments.word_arg_not_provided(
				info,
				cmd,
				index,
				commandhelp,
				argpurpose
			)
		);
		return { result: "exit" };
	}
	const word = cmd.match(/^([\S]+)\s*([\S\s]*)/m);
	if (!word) {
		await info.error(
			messages.arguments.word_arg_not_provided(
				info,
				cmd,
				index,
				commandhelp,
				argpurpose
			)
		);
		return { result: "exit" };
	}
	const [, result, newCmd] = word;
	return { result: "continue", value: result, cmd: newCmd };
}

export async function NumberArgumentParser(
	info: Info,
	arg: NumberArgType,
	cmd: string,
	index: number,
	commandhelp: string,
	argpurpose: string
): ArgumentParserResult<number> {
	if (!cmd.trim()) {
		await info.error(
			messages.arguments.num_arg_not_provided(
				info,
				cmd,
				index,
				commandhelp,
				argpurpose
			)
		);
		return { result: "exit" };
	}
	const wordval = cmd.match(/^([\S]+)\s*([\S\s]*)/m);
	if (!wordval) {
		await info.error(
			messages.arguments.num_arg_not_provided(
				info,
				cmd,
				index,
				commandhelp,
				argpurpose
			)
		);
		return { result: "exit" };
	}
	const [, num, newCmd] = wordval;
	if (Number.isNaN(+num)) {
		await info.error(
			messages.arguments.num_is_nan(
				info,
				cmd,
				index,
				commandhelp,
				argpurpose
			)
		);
	}
	return { result: "continue", value: +num, cmd: newCmd };
}

export async function WordsArgumentParser(
	info: Info,
	arg: WordsArgType,
	cmd: string,
	index: number,
	commandhelp: string,
	argpurpose: string
): ArgumentParserResult<string> {
	if (!cmd.trim()) {
		await info.error(
			messages.arguments.words_arg_not_provided(
				info,
				cmd,
				index,
				commandhelp,
				argpurpose
			)
		);
		return { result: "exit" };
	}
	return { result: "continue", value: cmd.trim(), cmd: "" };
}

export async function RoleArgumentParser(
	info: Info,
	arg: RoleArgType,
	cmd: string,
	index: number,
	commandhelp: string,
	argpurpose: string
): ArgumentParserResult<Discord.Role> {
	if (!cmd.trim()) {
		await info.error(
			messages.arguments.role_arg_not_provided(
				info,
				cmd,
				index,
				commandhelp,
				argpurpose
			)
		);
		return { result: "exit" };
	}
	if (!info.guild) {
		await info.error(messages.failure.command_cannot_be_used_in_pms(info));
		return { result: "exit" };
	}
	const rolename = cmd.trim();
	if (!rolename) {
		await info.error(
			messages.arguments.role_arg_not_provided(
				info,
				cmd,
				index,
				commandhelp,
				argpurpose
			)
		);
		return { result: "exit" };
	}
	const roleID = (rolename.trim().match(/^[\S\s]*?([0-9]{16,})[\S\s]*$/) || [
		"",
		""
	])[1];
	let role: Discord.Role;
	if (roleID) {
		const foundRole = info.guild.roles.get(roleID);
		if (!foundRole) {
			await info.error(
				messages.arguments.role_name_not_provided(
					info,
					roleID,
					index,
					commandhelp
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
					matchingRoles,
					commandhelp
				)
			);
			return { result: "exit" };
		}
		if (matchingRoles.length === 0) {
			await info.error(
				messages.arguments.no_roles_found(
					info,
					rolename,
					index,
					commandhelp
				)
			);
			return { result: "exit" };
		}
		role = matchingRoles[0];
	}
	if (!role) {
		throw new Error("This should never happen."); // should give people an error id and stuff
	}
	return {
		result: "continue",
		value: role,
		cmd: ""
	};
}

export async function OneArgumentParser<K extends BaseArgType<any, any>>(
	info: Info,
	arg: K,
	cmd: string,
	i: number,
	cmdh: string,
	argp: string
): ArgumentParserResult<K> {
	if (arg.type === "channel") {
		return ChannelArgumentParser(info, arg, cmd, i, cmdh, argp) as any;
	}
	if (arg.type === "emoji") {
		return EmojiArgumentParser(info, arg, cmd, i, cmdh, argp) as any;
	}
	if (arg.type === "word") {
		return WordArgumentParser(info, arg, cmd, i, cmdh, argp) as any;
	}
	if (arg.type === "number") {
		return NumberArgumentParser(info, arg, cmd, i, cmdh, argp) as any;
	}
	if (arg.type === "words...") {
		return WordsArgumentParser(info, arg, cmd, i, cmdh, argp) as any;
	}
	if (arg.type === "role...") {
		return RoleArgumentParser(info, arg, cmd, i, cmdh, argp) as any;
	}
	throw new Error(
		`Argument parser tried to parse ${arg} which isn't a thing. Why isn't this done using classes/callback functions? who knows`
	);
}

export async function ArgumentParser<
	ArgTypes extends Readonly<BaseArgType<any, any>[]>
>(
	{ info, cmd, help }: { info: Info; cmd: string; help?: string },
	...schema: ArgTypes
): Promise<ArgTypeArrayToReturnType<ArgTypes> | undefined> {
	const resarr: ArgTypeToReturnType<any>[] = [];
	let index = 0;
	for (const value of schema) {
		const parseResult = await OneArgumentParser(
			info,
			value,
			cmd,
			index,
			help || "",
			"" // not implemented yet :(
		);
		if (parseResult.result === "exit") {
			return undefined;
		}
		if (value.validator) {
			if (!(await value.validator(parseResult.value))) {
				return;
			}
		}
		resarr.push(parseResult.value);
		cmd = parseResult.cmd;
		index++;
	}
	if (cmd.trim()) {
		// extra arguments
		await info.error(
			`This command only uses arguments, but you gave ${index} arguments` // !!!!!!! str->messages
		);
		return undefined;
	}
	return (resarr as unknown) as ArgTypeArrayToReturnType<ArgTypes>;
}

export const AP = ArgumentParser;
