import * as Discord from "discord.js";

import Info from "../Info";
import { messages, safe } from "../../messages";

import Fuse from "fuse.js";

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

/*
duration: 10s, 25m, 50min, 60h10min, 2d
10 seconds, 20 hours, 3 minutes, ...
*/

/*

goal for taglist:

difficulty=[easy, medium, hard]
type=[multiple, question]
category=[History, ...]
size=/()x()/

so you could use the command like
ip!minesweeper easy 5x5
or like
ip!minesweeper difficulty=easy size=5x5

goal for arguments in general:
ip!emoji restrict :emoji: @role
ip!emoji restrict :emoji: 1904821394
ip!emoji restrict 5438725489 1904821394
ip!emoji restrict emoji name role name

but how do you differentiate between emoji name and role name?

*/

/*

concept command parser:

command.add("command.help", command => {
	const helpPath = command.args
		.toLowerCase()
		.replace(/[^A-Za-z0-9\.\s]/g, "_")
		.split(/\s/);
	const helpMessage = await ilt(fs.readFile(
		path.join("../../docgen/dist/discord/help", ...helpPath)
	));
	if(helpMessage.error){
		return await info.error("help.page.not.found",helpPath)
	}
});

command.add("set", (command) => {
	let guildData = new GuildDataStore(guild);
	await guildData.fetch();
	if(command.isEnter("prefix")){
		let prefix = command.args.trim();
		if(!prefix) return await info.error("prefix.invalid.or.not.provided");
		await guildData.setPrefix(prefix);
		return await info.success("prefix.set", prefix);
	}
	if(command.isEnter("logging")){
		let parse = command.parse(a.boolean("")); // commmand knows that the path is `set logging` so it can point you to `help set logging` and `/help/set/logging`
		if(!parse) return;
		let [setTo] = parse;
		await guildData.setLogging(setTo);
		return await info.success("logging.set", setTo);
	}
	return await info.error("command.not.found", "/help/set")
})


*/

type ArgumentType<T> = (
	info: Info,
	arg: undefined,
	cmd: string,
	index: number,
	commandhelp: string,
	argpurpose: string,
) => ArgumentParserResult<T>;

export const a = {
	emoji() {
		return EmojiArgumentType();
	},
	channel() {
		return ChannelArgumentType();
	},
	user() {
		return UserArgumentType();
	},
	word() {
		return WordArgumentType();
	},
	number() {
		return NumberArgumentType();
	},
	duration() {
		return DurationArgumentType();
	},
	enum<T extends string>(...words: T[]) {
		return EnumArgumentType(words);
	},
	words() {
		return [WordsArgumentType()] as const;
	},
	role() {
		return [RoleArgumentType(false) as ArgumentType<Discord.Role>] as const;
	},
	manyRoles() {
		return [
			RoleArgumentType(true) as ArgumentType<Discord.Role[]>,
		] as const;
	},
};

export type ArgTypeToReturnType<T> = T extends BaseArgType<any, infer Q>
	? Q
	: never;
export type ArgTypeArrayToReturnType<
	T extends Readonly<ArgumentType<any>[]>
> = {
	[key in keyof T]: T[key] extends ArgumentType<infer U> ? U : never;
};

function roleNameMatch(rolename: string, message: string) {
	const rn = rolename.trim().toLowerCase();
	const rm = message.trim().toLowerCase();
	return rn === rm || `@${rn}` === rm;
}

export type ArgumentParserResult<T> = Promise<
	{ result: "continue"; value: T; cmd: string } | { result: "exit" }
>;

function ChannelArgumentType(): ArgumentType<Discord.GuildChannel> {
	return async (info, arg, cmd, index, commandhelp, argpurpose) => {
		if (!cmd.trim()) {
			await info.error(
				messages.arguments.channel_arg_not_provided(
					info,
					cmd,
					index,
					commandhelp,
					argpurpose,
				),
			);
			return { result: "exit" };
		}
		if (!info.guild) {
			await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
			return { result: "exit" };
		}
		const match = /^[\S\s]*?([0-9]{14,})[^\s]*\s*([\S\s]*)$/.exec(cmd);
		if (!match) {
			await info.error(
				messages.arguments.channel_arg_not_provided(
					info,
					cmd,
					index,
					commandhelp,
					argpurpose,
				),
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
					commandhelp,
				),
			);
			return { result: "exit" };
		}
		return {
			result: "continue",
			value: channel,
			cmd: remainingCmd,
		};
	};
}

function UserArgumentType(): ArgumentType<Discord.User> {
	return async (info, arg, cmd, index, commandhelp, argpurpose) => {
		if (!cmd.trim()) {
			await info.error("user arg not provided");
			return { result: "exit" };
		}
		if (!info.guild) {
			await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
			return { result: "exit" };
		}
		const match = /^[\S\s]*?([0-9]{14,})[^\s]*\s*([\S\s]*)$/.exec(cmd);
		if (!match) {
			await info.error("user arg not provided");
			return { result: "exit" };
		}
		const [, userID, remainingCmd] = match;
		const channel = info.message.client.users.get(userID);
		if (!channel) {
			await info.error("user not found");
			return { result: "exit" };
		}
		return {
			result: "continue",
			value: channel,
			cmd: remainingCmd,
		};
	};
}

function EmojiArgumentType(): ArgumentType<Discord.GuildEmoji> {
	return async (info, arg, cmd, index, commandhelp, argpurpose) => {
		if (!cmd.trim()) {
			await info.error(
				messages.arguments.emoji_arg_not_provided(
					info,
					cmd,
					index,
					commandhelp,
					argpurpose,
				),
			);
			return { result: "exit" };
		}
		if (!info.guild) {
			await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
			return { result: "exit" };
		}
		const match = /^[\S\s]*?([0-9]{14,})[^\s]*?(?:\s+|$)([\S\s]*)$/.exec(
			cmd,
		);
		if (!match) {
			await info.error(
				messages.arguments.emoji_arg_not_provided(
					info,
					cmd,
					index,
					commandhelp,
					argpurpose,
				),
			);
			return { result: "exit" };
		}
		const [, emojiID, remainingCmd] = match;
		const emoji = info.guild.emojis.get(emojiID);
		if (!emoji) {
			await info.error(
				messages.arguments.emoji_not_found(
					info,
					emojiID,
					index,
					commandhelp,
					argpurpose,
				),
			);
			return { result: "exit" };
		}
		return {
			result: "continue",
			value: emoji,
			cmd: remainingCmd,
		};
	};
}

function WordArgumentType(): ArgumentType<string> {
	return async (info, arg, cmd, index, commandhelp, argpurpose) => {
		if (!cmd.trim()) {
			await info.error(
				messages.arguments.word_arg_not_provided(
					info,
					cmd,
					index,
					commandhelp,
					argpurpose,
				),
			);
			return { result: "exit" };
		}
		const word = /^([\S]+)\s*([\S\s]*)/m.exec(cmd);
		if (!word) {
			await info.error(
				messages.arguments.word_arg_not_provided(
					info,
					cmd,
					index,
					commandhelp,
					argpurpose,
				),
			);
			return { result: "exit" };
		}
		const [, result, newCmd] = word;
		return { result: "continue", value: result, cmd: newCmd };
	};
}

function EnumArgumentType<T extends string>(options: T[]): ArgumentType<T> {
	return async (info, arg, cmd, index, commandhelp, argpurpose) => {
		if (!cmd.trim()) {
			await info.error("value not provided");
			return { result: "exit" };
		}
		const word = /^([\S]+)\s*([\S\s]*)/m.exec(cmd);
		if (!word) {
			await info.error("value not provided");
			return { result: "exit" };
		}
		const [, result, newCmd] = word;
		const optionText = options.find(
			option => result.toLowerCase() === option.toLowerCase(),
		);
		if (!optionText) {
			await info.error("must be one of:" + options.join(","));
			return { result: "exit" };
		}
		return { result: "continue", value: optionText, cmd: newCmd };
	};
}

function NumberArgumentType(): ArgumentType<number> {
	return async (info, arg, cmd, index, commandhelp, argpurpose) => {
		if (!cmd.trim()) {
			await info.error(
				messages.arguments.num_arg_not_provided(
					info,
					cmd,
					index,
					commandhelp,
					argpurpose,
				),
			);
			return { result: "exit" };
		}
		const wordval = /^([\S]+)\s*([\S\s]*)/m.exec(cmd);
		if (!wordval) {
			await info.error(
				messages.arguments.num_arg_not_provided(
					info,
					cmd,
					index,
					commandhelp,
					argpurpose,
				),
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
					argpurpose,
				),
			);
		}
		return { result: "continue", value: +num, cmd: newCmd };
	};
}

function DurationArgumentType(): ArgumentType<number> {
	const unit = {
		ms: 1,
		sec: 1000,
		min: 60000,
		hr: 3600000,
		day: 86400000,
		month: 2629746000,
		year: 31556952000,
		LL: 864000,
		cc: 86400,
		ii: 864,
		qm: 108 / 125,
	};
	const names: { [key: string]: number } = {
		ms: unit.ms,
		milisecond: unit.ms,
		miliseconds: unit.ms,
		s: unit.sec,
		sec: unit.sec,
		second: unit.sec,
		seconds: unit.sec,
		m: unit.min,
		min: unit.min,
		minute: unit.min,
		minutes: unit.min,
		h: unit.hr,
		hr: unit.hr,
		hour: unit.hr,
		hours: unit.hr,
		d: unit.day,
		day: unit.day,
		days: unit.day,
		month: unit.month,
		months: unit.month,
		y: unit.year,
		yr: unit.year,
		years: unit.year,
		ll: unit.LL,
		cc: unit.cc,
		ii: unit.ii,
		qm: unit.qm,
	};

	return async (info, arg, cmd, index, commandhelp, argpurpose) => {
		if (!cmd.trim()) {
			await info.error(
				messages.arguments.num_arg_not_provided(
					info,
					cmd,
					index,
					commandhelp,
					argpurpose,
				),
			);
			return { result: "exit" };
		}

		let remainder = cmd;
		let result = 0;

		while (true) {
			if (remainder.startsWith(","))
				remainder = remainder.substr(1).trim();
			const inum = /^[0-9.\-]+/.exec(remainder);
			if (!inum) break;
			remainder = remainder.substr(inum[0].length).trim();

			if (isNaN(+inum[0])) {
				await info.error(
					safe`could not parse number "${inum[0]}" bad.\n> list of units: https://interpunct.bot/help/args/units/or/something/idk`,
				);
				return { result: "exit" };
			}
			const numberv = +inum[0];

			const unitstr = /^[A-Za-z]+/.exec(remainder);
			if (!unitstr) {
				await info.error("no unit bad");
				return { result: "exit" };
			}
			remainder = remainder.substr(unitstr[0].length).trim();
			const unitname = unitstr[0].toLowerCase();

			if (names[unitname] === undefined) {
				await info.error(
					safe`invalid unit "${unitstr[0]}" bad.\n> list of units: https://interpunct.bot/help/args/units/or/something/idk`,
				);
				return { result: "exit" };
			}
			result += numberv * names[unitname];
		}
		if (remainder.startsWith(",")) remainder = remainder.substr(1).trim();

		let nearestMS = Math.round(result);
		if (nearestMS < 0) nearestMS = 0;
		return { result: "continue", value: nearestMS, cmd: remainder };
	};
}

function WordsArgumentType(): ArgumentType<string> {
	return async (info, arg, cmd, index, commandhelp, argpurpose) => {
		if (!cmd.trim() && (false as true)) {
			await info.error(
				messages.arguments.words_arg_not_provided(
					info,
					cmd,
					index,
					commandhelp,
					argpurpose,
				),
			);
			return { result: "exit" };
		}
		return { result: "continue", value: cmd.trim(), cmd: "" };
	};
}

function RoleArgumentType(
	allowMultiple: boolean,
): ArgumentType<Discord.Role | Discord.Role[]> {
	return async (info, arg, cmd, index, commandhelp, argpurpose) => {
		if (!cmd.trim()) {
			await info.error(
				messages.arguments.role_arg_not_provided(
					info,
					cmd,
					index,
					commandhelp,
					argpurpose,
				),
			);
			return { result: "exit" };
		}
		if (!info.guild) {
			await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
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
					argpurpose,
				),
			);
			return { result: "exit" };
		}
		//eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
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
						index,
						commandhelp,
					),
				);
				return { result: "exit" };
			}
			role = foundRole;
		} else {
			const exactMatches = info.guild.roles
				.array()
				.filter(role => roleNameMatch(role.name, rolename));
			if (exactMatches.length > 1) {
				if (allowMultiple) {
					return {
						result: "continue",
						value: exactMatches,
						cmd: "",
					};
				}
				await info.error(
					messages.arguments.multiple_roles_found(
						info,
						rolename,
						exactMatches,
						commandhelp,
					),
				);
				return { result: "exit" };
			}
			if (exactMatches.length === 0) {
				const roleNameList = info.guild.roles
					.array()
					.sort((a, b) => b.comparePositionTo(a));
				const fuse = new Fuse(roleNameList, {
					shouldSort: false,
					threshold: 0.1,
					location: 0,
					distance: 100,
					maxPatternLength: 32,
					minMatchCharLength: 1,
					keys: ["name"],
				});
				const results = fuse.search(rolename);
				if (results.length === 0) {
					await info.error(
						messages.arguments.no_roles_found(
							info,
							rolename,
							index,
							commandhelp,
						),
					);
					return { result: "exit" };
				} else if (results.length > 1) {
					if (allowMultiple) {
						return {
							result: "continue",
							value: results,
							cmd: "",
						};
					}
					await info.error(
						messages.arguments.multiple_roles_found_fuzzy(
							info,
							rolename,
							results,
							commandhelp,
						),
					);
					return { result: "exit" };
				} else {
					role = results[0];
				}
			} else {
				role = exactMatches[0];
			}
		}
		if (!role) {
			throw new Error("This should never happen."); // should give people an error id and stuff
		}
		return {
			result: "continue",
			value: allowMultiple ? [role] : role,
			cmd: "",
		};
	};
}

export type APListAny = Readonly<ArgumentType<any>[]>;
export type Results<APList extends APListAny> = ArgTypeArrayToReturnType<
	APList
>;
export type List<APList extends APListAny> = { list: APList };

export function list<APList extends APListAny>(
	...schema: APList
): List<APList> {
	return { list: schema };
}

export async function ArgumentParser<
	ArgTypes extends Readonly<ArgumentType<any>[]>
>(
	{
		info,
		cmd,
		help,
		partial,
	}: { info: Info; cmd: string; help?: string; partial?: boolean },
	...schema: ArgTypes
): Promise<
	| { result: ArgTypeArrayToReturnType<ArgTypes>; remaining: string }
	| undefined
> {
	const resarr: ArgTypeToReturnType<any>[] = [];
	let index = 0;
	for (const value of schema) {
		const parseResult = await value(
			info,
			undefined,
			cmd,
			index,
			help || "",
			"", // not implemented yet :(
		);
		if (parseResult.result === "exit") {
			return undefined;
		}
		resarr.push(parseResult.value);
		cmd = parseResult.cmd;
		index++;
	}
	if (cmd.trim() && !partial) {
		// extra arguments
		console.log("MISSING", cmd);
		await info.error(
			`Usage: ${help || "not provided"}`, // !!!!!!! str->messages
		);
		return undefined;
	}
	return {
		result: (resarr as unknown) as ArgTypeArrayToReturnType<ArgTypes>,
		remaining: cmd.trim(),
	};
}

export const AP = ArgumentParser;
