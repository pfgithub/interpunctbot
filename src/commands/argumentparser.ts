import * as Discord from "discord.js";

import Info from "../Info";
import * as nr from "../NewRouter";
import { messages, safe } from "../../messages";

import Fuse from "fuse.js";
import { dgToDiscord } from "../parseDiscordDG";

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
	error: (
		docsPage: string,
		opts?: {
			safeDetails?: string;
		},
	) => Promise<{ result: "exit" }>,
	readavail?: "full" | "part",
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
	enumNoSpace<T extends string>(...words: T[]) {
		return EnumNoSpaceArgumentType(words);
	},
	words() {
		return [WordsArgumentType()] as const;
	},
	role() {
		return [RoleArgumentType(false) as ArgumentType<Discord.Role>] as const;
	},
	backtick() {
		return BacktickArgumentType();
	},
	manyRoles() {
		return [
			RoleArgumentType(true) as ArgumentType<Discord.Role[]>,
		] as const;
	},
	// this is the dumbest code I have ever seen what
	message() {
		return MessageArgumentType();
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
	return async (info, arg, cmd, error) => {
		if (!cmd.trim()) {
			return await error("/arg/channel/not-found");
		}
		if (!info.guild) {
			await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
			return { result: "exit" };
		}
		const match = /^[\S\s]*?([0-9]{14,})[^\s]*\s*([\S\s]*)$/.exec(cmd);
		if (!match) {
			return await error("/arg/channel/not-found");
		}
		const [, channelID, remainingCmd] = match;
		const channel = info.guild.channels.resolve(channelID);
		if (!channel) {
			return await error("/arg/channel/not-found");
		}
		return {
			result: "continue",
			value: channel,
			cmd: remainingCmd,
		};
	};
}

function UserArgumentType(): ArgumentType<Discord.User> {
	return async (info, arg, cmd, error) => {
		if (!cmd.trim()) {
			return error("/arg/user/not-found");
		}
		if (!info.guild) {
			await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
			return { result: "exit" };
		}
		const match = /^[\S\s]*?([0-9]{14,})[^\s]*\s*([\S\s]*)$/.exec(cmd);
		if (!match) {
			return error("/arg/user/not-found");
		}
		const [, userID, remainingCmd] = match;
		const channel = info.message.client.users.resolve(userID);
		if (!channel) {
			return error("/arg/user/not-found");
		}
		return {
			result: "continue",
			value: channel,
			cmd: remainingCmd,
		};
	};
}

function EmojiArgumentType(): ArgumentType<Discord.GuildEmoji> {
	return async (info, arg, cmd, error) => {
		if (!cmd.trim()) {
			return error("/arg/emoji/not-found");
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
			return error("/arg/emoji/not-found");
		}
		const [, emojiID, remainingCmd] = match;
		const emoji = info.guild.emojis.resolve(emojiID);
		if (!emoji) {
			return error("/arg/emoji/not-found");
		}
		return {
			result: "continue",
			value: emoji,
			cmd: remainingCmd,
		};
	};
}

function WordArgumentType(): ArgumentType<string> {
	return async (info, arg, cmd, error, modev) => {
		if (!cmd.trim()) {
			return error("/arg/word/not-found");
		}
		const word = /^([\S]+)\s*([\S\s]*)/m.exec(cmd);
		if (!word) {
			return error("/arg/word/not-found");
		}
		const [, result, newCmd] = word;
		return { result: "continue", value: result, cmd: newCmd };
	};
}

function EnumArgumentType<T extends string>(options: T[]): ArgumentType<T> {
	return async (info, arg, cmd, error) => {
		if (!cmd.trim()) {
			return error("/arg/enum/not-found", {
				safeDetails:
					"Expected " + options.map(o => safe(o)).join(" | ") + "",
			});
		}
		const word = /^([\S]+)\s*([\S\s]*)/m.exec(cmd);
		if (!word) {
			return error("/arg/enum/not-found", {
				safeDetails:
					"Expected " + options.map(o => safe(o)).join(" | ") + "",
			});
		}
		const [, result, newCmd] = word;
		const optionText = options.find(
			option => result.toLowerCase() === option.toLowerCase(),
		);
		if (!optionText) {
			return error("/arg/enum/not-found", {
				safeDetails:
					"Expected " +
					options.map(o => safe(o)).join(" | ") +
					", got " +
					safe(result) +
					"",
			});
		}
		return { result: "continue", value: optionText, cmd: newCmd };
	};
}

function EnumNoSpaceArgumentType<T extends string>(
	options: T[],
): ArgumentType<T> {
	return async (info, arg, cmd, error) => {
		if (!cmd.trim()) {
			return error("/arg/enum/not-found", {
				safeDetails:
					"Expected " + options.map(o => safe(o)).join(" | ") + "",
			});
		}
		const optionText = options.find(option =>
			cmd.toLowerCase().startsWith(option.toLowerCase()),
		);
		if (!optionText) {
			return error("/arg/enum/not-found", {
				safeDetails:
					"Expected " + options.map(o => safe(o)).join(" | ") + "",
			});
		}
		return {
			result: "continue",
			value: optionText,
			cmd: cmd.substr(optionText.length).trim(),
		};
	};
}

function NumberArgumentType(): ArgumentType<number> {
	return async (info, arg, cmd, error) => {
		if (!cmd.trim()) {
			return await error("/arg/number/not-found");
		}
		const wordval = /^([\S]+)\s*([\S\s]*)/m.exec(cmd);
		if (!wordval) {
			return await error("/arg/number/not-found");
		}
		const [, num, newCmd] = wordval;
		if (Number.isNaN(+num)) {
			return await error("/arg/number/not-found");
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
		week: 86400000 * 7,
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
		w: unit.week,
		week: unit.week,
		weeks: unit.week,
		mo: unit.month,
		month: unit.month,
		months: unit.month,
		y: unit.year,
		yr: unit.year,
		year: unit.year,
		years: unit.year,
		ll: unit.LL,
		cc: unit.cc,
		ii: unit.ii,
		qm: unit.qm,
	};

	return async (info, arg, cmd, error) => {
		if (!cmd.trim()) {
			return await error("/arg/duration/not-found");
		}

		let remainder = cmd;
		let result = 0;
		let anyfound = false;

		while (true) {
			if (remainder.startsWith(","))
				remainder = remainder.substr(1).trim();
			const inum = /^[0-9.\-]+/.exec(remainder);
			// todo(/*check if makes sense as a number, eg remindme 1 day .hi! should not be a number. */);
			if (!inum) break;

			if (isNaN(+inum[0])) {
				break; // parsing with ambiguity doesn't have a correct answer
				// (other than removing the ambiguity)
				// ip!remindme (2 days) do something
				// but that looks bad and is weird, ip!remindme 2 days do something is better
			}
			const rmderTemp = remainder.substr(inum[0].length).trim();
			const numberv = +inum[0];

			const unitstr = /^[A-Za-z]+/.exec(rmderTemp);
			if (!unitstr) {
				if (!anyfound) {
					return await error("/arg/duration/bad-unit");
				}
				break;
			}
			remainder = rmderTemp;
			const unitname = unitstr[0].toLowerCase();

			if (names[unitname] === undefined) {
				if (!anyfound) {
					return await error("/arg/duration/bad-unit");
				}
				break; // once again,
				// ip!remindme 2 test
				// what should that do? this will make it error with no duration provided
				// ip!remindme 5 microseconds test
				// that should say it's an invalid unit
				// is `ip!remindme 5 fortnights` more or less common than `ip!remindme 3 days 2 do a thing`
				// I have made the decision to allow `ip!remindme 3 days 2 do a thing` but not have as good of an error on `ip!remindme 5 microseconds`
				// maybe if anyfound is still false, it could display the unit error?
				// sure
			}
			remainder = remainder.substr(unitstr[0].length).trim();
			result += numberv * names[unitname];
			anyfound = true;
		}
		if (remainder.startsWith(",")) remainder = remainder.substr(1).trim();
		if (!anyfound) {
			return await error("/arg/duration/not-found");
		}

		const nearestMS = Math.round(result);
		if (nearestMS < 0) {
			return await error("/arg/duration/in-the-past");
		}
		return { result: "continue", value: nearestMS, cmd: remainder };
	};
}

function WordsArgumentType(): ArgumentType<string> {
	return async (info, arg, cmd, error) => {
		return { result: "continue", value: cmd.trim(), cmd: "" };
	};
}

function BacktickArgumentType(): ArgumentType<string> {
	return async (info, arg, cmd, error, modev) => {
		if (!cmd.trim()) {
			return await error("/arg/backtick/not-found");
		}
		if (modev === "full") {
			return {result: "continue", value: cmd, cmd: ""};
		}
		const rgxMatch = /^\`(.+?)\`(.+)$/.exec(cmd);
		if (!rgxMatch) {
			const word = /^([\S]+)\s*([\S\s]*)/m.exec(cmd);
			if (!word) {
				return await error("/arg/backtick/not-found");
			}
			const [, result, newCmd] = word;
			return { result: "continue", value: result, cmd: newCmd };
		}
		const [, backticked, final] = rgxMatch;
		if (safe(backticked) !== backticked) {
			return await error("/arg/backtick/unsafe");
		}
		return {
			result: "continue",
			value: backticked.trim(),
			cmd: final.trim(),
		};
	};
}

function MessageArgumentType(): ArgumentType<Discord.Message> {
	return async (info, arg, cmd, error) => {
		if (!cmd.trim()) {
			return await error("/arg/message/not-found");
		}
		const word = /^([\S]+)\s*([\S\s]*)/.exec(cmd.trim());
		if (!word) {
			return await error("/arg/message/not-found");
		}
		const [, urlink, final] = word;
		const ids = urlink.match(/[0-9]{5,}/g);
		if (!ids || ids.length !== 3)
			return await error("/arg/message/not-found");

		const [guildID, channelID, messageID] = ids;
		if (!info.guild || info.guild.id !== guildID)
			return await error("/arg/message/different-server");

		const msgchan = info.guild.channels.resolve(
			channelID,
		) as Discord.TextChannel;
		if (!msgchan)
			return await error(
				"I could not find the channel <#" +
					channelID +
					">. Maybe I don't have permission to view it?",
			);

		let msgmsg: Discord.Message;
		try {
			msgmsg = await msgchan.messages.fetch(messageID);
		} catch (e) {
			return await error(
				"I could not find the message you linked in <#" +
					channelID +
					">. Maybe I don't have permission to view it? Make sure I have permission to Read Messages and View Message History.",
			);
		}

		return {
			result: "continue",
			value: msgmsg,
			cmd: final.trim(),
		};
	};
}

function RoleArgumentType(
	allowMultiple: boolean,
): ArgumentType<Discord.Role | Discord.Role[]> {
	return async (info, arg, cmd, error) => {
		if (!cmd.trim()) {
			return await error("/arg/role/not-found");
		}
		if (!info.guild) {
			await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
			return { result: "exit" };
		}
		const rolename = cmd.trim();
		if (!rolename) {
			return await error("/arg/role/not-found");
		}
		//eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
		const roleID = (rolename
			.trim()
			.match(/^[\S\s]*?([0-9]{16,})[\S\s]*$/) || ["", ""])[1];
		let role: Discord.Role;
		if (roleID) {
			const foundRole = info.guild.roles.resolve(roleID);
			if (!foundRole) {
				return await error("/arg/role/not-found");
			}
			role = foundRole;
		} else {
			const exactMatches = info.guild.roles.cache
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
				return await error("/arg/role/multiple-found", {
					safeDetails: messages.arguments.multiple_roles_found(
						rolename,
						exactMatches,
					),
				});
			}
			if (exactMatches.length === 0) {
				const roleNameList = info.guild.roles.cache
					.array()
					.sort((a, b) => b.comparePositionTo(a));
				const fuse = new Fuse(roleNameList, {
					shouldSort: false,
					threshold: 0.2,
					location: 0,
					distance: 100,
					maxPatternLength: 32,
					minMatchCharLength: 1,
					keys: ["name"],
				});
				const results = fuse
					.search(rolename)
					.map(r => ((r as any).item as Discord.Role) || r);
				if (results.length === 0) {
					return await error("/arg/role/not-found");
				} else if (results.length > 1) {
					if (allowMultiple) {
						return {
							result: "continue",
							value: results,
							cmd: "",
						};
					}
					return await error("/arg/role/multiple-found", {
						safeDetails: messages.arguments.multiple_roles_found_fuzzy(
							rolename,
							results,
						),
					});
				} else {
					role = results[0];
				}
			} else {
				role = exactMatches[0];
			}
		}
		if (!role) {
			throw new Error("This should never happen."); // should give people an error id and stuff // just kidding! it doesn't because it happens in the argument parser.
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
		cmd: cmd_in,
		help,
		partial,
	}: { info: Info; cmd: string | string[]; help: string; partial?: boolean },
	...schema: ArgTypes
): Promise<
	| { result: ArgTypeArrayToReturnType<ArgTypes>; remaining: string }
	| undefined
> {
	const resarr: ArgTypeToReturnType<any>[] = [];
	let index = 0;
	const errfn = async (
		docs: string,
		other?: { safeDetails?: string | undefined },
	): Promise<{ result: "exit" }> => {
		const docsPage = nr.globalDocs[docs];
		let docsres: string = docs;
		if (docsPage) {
			docsres = dgToDiscord(docsPage.summaries.description, info);
		}
		const cmdPage = nr.globalDocs[help];
		if (!cmdPage) {
			throw new Error("cmd page not found");
		}

		const pfx = other
			? other.safeDetails
				? other.safeDetails + "\n"
				: ""
			: "";
		await info.error(
			pfx +
				"Usage: " +
				dgToDiscord(cmdPage.summaries.usage, info) +
				"\n" +
				docsres +
				"\n" +
				"> Command Help: <https://interpunct.info" +
				help +
				">" +
				(docsPage
					? "\n> Error Details: <https://interpunct.info" +
					  docsPage.path +
					  ">"
					: ""),
		);
		return { result: "exit" };
	};

	let remaining: string;
	if(Array.isArray(cmd_in)) {
		const dupe = [...cmd_in];
		for(const value of schema) {
			const cmdv = dupe.shift();
			if(cmdv === undefined) {
				console.log("empty array", dupe);
				await errfn(help);
				return undefined;
			}

			const parseResult = await value(info, undefined, cmdv, errfn, "full");
			if (parseResult.result === "exit") {
				return undefined;
			}
			if(parseResult.cmd) {
				console.log("DID NOT PARSE ALL", [cmdv, parseResult.cmd]);
				await errfn(help);
				return undefined;
			}
			resarr.push(parseResult.value);
			index++;
		}
		if(dupe.length && !partial) {
			// extra arguments
			console.log("MISSING", dupe);
			await errfn(help);
			return undefined;
		}
		remaining = dupe.join(" ").trim();
	}else{
		let cmd = cmd_in;
		for (const value of schema) {
			const parseResult = await value(info, undefined, cmd, errfn);
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
			await errfn(help);
			return undefined;
		}
		remaining = cmd.trim();
	}
	
	return {
		result: (resarr as unknown) as ArgTypeArrayToReturnType<ArgTypes>,
		remaining: remaining,
	};
}

export const AP = ArgumentParser;
