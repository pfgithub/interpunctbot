import * as Discord from "discord.js";
import { mkdirSync, promises as fs } from "fs";
import moment from "moment";
import mdf from "moment-duration-format";
import path from "path";

import client, { timedEvents } from "./bot";
import { messages, safe } from "./messages";
import "./src/commands/about";
import "./src/commands/channelmanagement";
import "./src/commands/emoji";
import "./src/commands/fun";
import "./src/commands/help";
import "./src/commands/logging";
import "./src/commands/quote";
import "./src/commands/settings";
import "./src/commands/speedrun";
import "./src/commands/test";
import "./src/commands/role";
import "./src/commands/apdocs";
import "./src/commands/customcommands";
import {
	onMessageReactionAdd as ticketMessageReactionAdd,
	onMessage as ticketMessage,
} from "./src/commands/ticket";
import { globalConfig } from "./src/config";
import Database, { Event } from "./src/Database";
import Info, { memberCanManageRole, handleReactions } from "./src/Info";
import * as nr from "./src/NewRouter";
import { dgToDiscord } from "./src/parseDiscordDG";
import { handleList } from "./src/commands/quote";
import { createTimer } from "./src/commands/fun/helpers";
import {
	findAllProvidedRoles,
	getRankSuccessMessage,
} from "./src/commands/role";
import { getGuilds } from "./src/ShardHelper";
import fetch from "node-fetch";
import { deleteLogs } from "./src/commands/logging";
import { sendPinBottom } from "./src/commands/channelmanagement";

import * as SlashCommandManager from "./src/SlashCommandManager";

mdf(moment as any);

try {
	mkdirSync(path.join(process.cwd(), `logs`));
} catch (e) {}

export let serverStartTime = 0;

export const production = process.env.NODE_ENV === "production";

const mostRecentCommands: { content: string; date: string }[] = [];

function devlog(...msg: any) {
	if (!production) {
		global.console.log(...msg);
	}
}

export type ErrorWithID = Error & { errorCode: string };

export function wrapErrorAddID(error: Error): ErrorWithID {
	if (typeof error !== "object")
		error = new Error("primitive error: " + error);
	(error as ErrorWithID).errorCode = Math.floor(
		Math.random() * 1000000000000000,
	).toString(36);
	return error as ErrorWithID;
}

export async function ilt<T>(
	v: Promise<T> /*, reason: string (added to error message)*/,
	reason: string | false,
): Promise<
	{ error: ErrorWithID; result: undefined } | { error: undefined; result: T }
> {
	let result: T;
	try {
		result = await v;
	} catch (error) {
		const ewid = wrapErrorAddID(error);
		if (typeof reason === "string") {
			ignorePromise(reportILTFailure(ewid, new Error(reason)));
		}
		return { error: ewid, result: undefined };
	}
	return { result, error: undefined };
}

//eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
export function ignorePromise(_p: Promise<unknown>) {}

export function perr(
	v: Promise<unknown> /*, reason: string (added to error message)*/,
	reason: string | false,
): void {
	ignorePromise(ilt(v, reason));
}

nr.globalCommand(
	"/help/depricated/spoiler",
	"spoiler",
	{
		usage: "spoiler {Required|message}",
		description: "depricated",
		examples: [],
		perms: {},
	},
	nr.passthroughArgs,
	async ([], info) => {
		perr(info.message.delete(), "Deleting original message for spoiler");
		// if(er) send message...
		await info.error(
			messages.failure.command_removed(
				info,
				"spoiler",
				"3.0",
				"Discord has added official spoiler support by surrounding your message in `||vertical lines||`.",
			),
		);
	},
);

depricate("spaceChannels", "channels spacing", "2.0"); // 1.0 -> 2.0
remove(
	"channels spacing",
	"Unfortunately, discord has removed the ability for bots to put spaces in channel names.",
);
nr.globalAlias("send", "channels sendMany");

// usage.add("channels", require("./src/commands/channelmanagement")); !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

// router.add("help", [], async (cmd, info, next) => {
// 	await info.result(
// 		messages.help(info, info.db ? await info.db.getLists() : {}),
// 	);
// });

nr.globalAlias("messages set welcome", "settings events welcome");
nr.globalAlias("messages set goodbye", "settings events goodbye");
nr.globalAlias("log download", "downloadLog");
nr.globalAlias("log reset", "resetLog");
remove("listRoles", "3.0");
remove(
	"settings listroles",
	"Discord now has a builtin way for you to get the ID of roles by right clicking a role in the Roles section of settings. Also, most interpunct commands will now accept a role name instead of ID.",
	"3.0",
);

function depricate(oldcmd: string, newcmd: string, version = "3.0") {
	nr.globalCommand(
		"/help/depricated/" + oldcmd.toLowerCase().replace(" ", "/"),
		oldcmd.toLowerCase(),
		{
			usage: oldcmd.toLowerCase(),
			description: "depricated",
			examples: [],
			perms: {},
		},
		nr.list(),
		async ([], info) => {
			return await info.error(
				`\`${oldcmd}\` has been renamed to \`${newcmd}\` as part of Interpunct Bot ${version}. See \`help\` for more information. Join the support server in \`about\` if you have any issues.`,
			);
		},
	);
}

function remove(oldcmd: string, reason: string, version = "3.0") {
	nr.globalCommand(
		"/help/removed/" + oldcmd.toLowerCase(),
		oldcmd.toLowerCase(),
		{
			usage: oldcmd.toLowerCase(),
			description: "removed",
			examples: [],
			perms: {},
		},
		nr.passthroughArgs,
		async ([], info) => {
			return await info.error(
				messages.failure.command_removed(info, oldcmd, version, reason),
			);
		},
	);
}

depricate("settings prefix", "set prefix [new prefix]");
depricate("settings lists", "lists [add/edit/remove]");
depricate("settings discmoji", "emoji");
depricate("settings rankmoji", "emoji");
remove(
	"settings permreplacements",
	"Permreplacements were never tested and probably didn't work.",
);
depricate("settings speedrun", "speedrun <add/remove/default>");
depricate("settings nameScreening", "autoban");
depricate("settings logging", "log <enable/disable>");
depricate("settings events", "messages");
depricate(
	"settings unknownCommandMessages",
	"set show unknown command [always/admins/never]",
);
depricate(
	"settings commandFailureMessages",
	"set show errors [always/admins/never]",
);
depricate("settings autospaceChannels", "space channels automatically");
depricate("settings", "help");

/*

# ip!settings prefix [new prefix...]
# ip!settings lists [list] [pastebin id of list|remove]
# ip!settings discmoji restrict [role id] [emoji|emoji id]
# ip!settings discmoji unrestrict [role id] [emoji|emoji id]
# ip!settings discmoji list [emoji|emoji id]
 @ ip!settings rankmoji
 @ ip!settings rankmoji add [role id] [emoji]
 @ ip!settings rankmoji remove [role id|emoji]
 @ ip!settings rankmoji channel [channel]
# ip!settings permreplacements
# ip!settings permreplacements set [perm] [replacementID]
# ip!settings permreplacements remove [perm]
# ip!settings speedrun [abbreviation] [category]
# ip!settings nameScreening
# ip!settings nameScreening add [name parts...]
# ip!settings nameScreening remove [name parts...]
# ip!settings logging [true|false]
# ip!settings events welcome [none|welcome @s/%s message...]
# ip!settings events goodbye [none|goodbye @s/%s message...]
# ip!settings unknownCommandMessages [true|false]
# ip!settings commandFailureMessages [true|false]
# ip!settings autospaceChannels [true|false]
# ip!settings listRoles [true|false]
# ip!ping
# ip!speedrun rules [category...]
# ip!speedrun leaderboard [top how many?] [category...]
# ip!log download
# ip!log reset
 @ ip!purge [msgs to delete]
# ip!spoiler [message...]
# ip!channels spacing [space|dash]
# ip!channels sendMany [...message] [#channels #to #send #to]
# ip!about
# ip!crash
*/

async function unknownCommandHandler(cmd: string, info: Info) {
	if (info.db) {
		const lists = await info.db.getCustomCommands(); // TODO info.db.lists
		const listNames = Object.keys(lists);
		for (const listName of listNames) {
			if (
				cmd.toLowerCase().startsWith(listName.toLowerCase()) &&
				(cmd.substr(listName.length).trim() !==
					cmd.substr(listName.length) ||
					!cmd.substr(listName.length))
			) {
				const args = cmd.substr(listName.length).trim();
				const ll = lists[listName];
				if (ll.type === "list") {
					await handleList(listName, ll.pastebin, args, info);
					return;
				}
				if (ll.type === "command") {
					if (args) return await info.error("No args.");
					await info.result(ll.text);
					return;
				}
				assertNever(ll);
			}
		}
	}

	const autoResolution =
		"/" +
		cmd
			.trim()
			.split(" ")
			.join("/");
	const docsPage =
		nr.globalDocs["/help" + autoResolution] ||
		nr.globalDocs[autoResolution];
	if (docsPage) {
		const bodyText = dgToDiscord(docsPage.body, info);
		await info.result(
			// dgToDiscord(`{Var|bodyText}\n\n{Bold|Full Help}: {Link|${url}}`) // concept
			(
				bodyText +
				"\n\n" +
				"**Full Help**: <https://interpunct.info" +
				docsPage.path +
				">"
			).replace(/\n\n+/g, "\n\n"),
		);
		return;
	}

	const unknownCommandMessages = info.db
		? await info.db.getUnknownCommandMessages()
		: "always";
	if (
		unknownCommandMessages === "always" ||
		(unknownCommandMessages === "admins" && info.authorPerms.manageBot)
	) {
		if (/^[^a-zA-Z]/.exec(cmd)) return; // for people using different prefixes like $ so $10 doesn't trigger
		return await info.errorAlways(
			messages.failure.command_not_found(info, cmd),
		);
	} // else do nothing
}

async function updateActivity() {
	console.log("Posting activity...");
	if (client.user) {
		const count = await getGuilds(client);
		await client.user.setPresence({
			activity: {
				name:
					count === -1
						? "ip!help on a bunch of servers"
						: `ip!help on ${count} servers`,
				type: "WATCHING",
				url: "https://interpunct.info/",
			},
			status: production ? "online" : "idle",
		});
		const dbgToken = globalConfig.listings?.["discord.bots.gg"];
		if (count !== -1 && dbgToken) {
			const fres = await fetch(
				"https://discord.bots.gg/api/v1/bots/" +
					client.user.id +
					"/stats",
				{
					method: "POST",
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json",
						Authorization: dbgToken,
					},
					body: JSON.stringify({
						guildCount: count, //client.guilds.cache.size,
						// shardCount: client.shard ? client.shard.count : 1,
						// shardId: client.shard ? client.shard.ids[0] : 1,
					}),
					// ^ or, post {guildCount: count on this shard, shardCount: count, shardId: number}
				},
			);
			console.log("dbgg post success", await fres.text());
		}
		const tggToken = globalConfig.listings?.["top.gg"];
		if (count !== -1 && tggToken) {
			const fres = await fetch(
				"https://top.gg/api/bots/" + client.user.id + "/stats",
				{
					method: "POST",
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json",
						Authorization: tggToken,
					},
					body: JSON.stringify({
						server_count: count,
					}),
				},
			);
			console.log("topgg post success", await fres.json());
		}
	}
	console.log("Post succesful!");
	// if(process.env.NODE_ENV !== "production") return; // only production should post
	// let options = {
	// 	url: `https://bots.discord.pw/api/bots/${config.bdpid}/stats`,
	// 	headers: {
	// 		Authorization: config["bots.discord.pw"]
	// 	},
	// 	json: {
	// 		server_count: count // eslint-disable-line camelcase
	// 	}
	// };
	// request.post(options, (er, res) => {});
}

export function shouldIgnore(user: Discord.User) {
	return user.bot && !globalConfig.testing?.users?.includes(user.id);
}

client.on("ready", () => {
	global.console.log("Ready");
	serverStartTime = new Date().getTime();
	perr(updateActivity(), "activity update");

	perr(SlashCommandManager.start(), "slash command manager");
});

setInterval(() => perr(updateActivity(), "activity update"), 30 * 60 * 1000); // update every 30 min

function streplace(str: string, eplace: { [key: string]: string }) {
	const uids: { [key: string]: string } = {};
	Object.keys(eplace).forEach(key => {
		uids[key] = "!!!{{<>::}}" + Math.random().toString(36);
		str = str.split(key).join(uids[key]);
	});
	Object.keys(eplace).forEach(key => {
		str = str.split(uids[key]).join(eplace[key]);
	});
	return str;
}

async function guildMemberAdd(
	member: Discord.GuildMember | Discord.PartialGuildMember,
) {
	if (member.partial) {
		// partial is not supported
		console.log("!!! PARTIAL MEMBER WAS AQUIRED IN A MEMBER ADD EVENT");
		await member.fetch();
		if (!tsAssert<Discord.GuildMember>(member)) return;
	}
	const db = new Database(member.guild.id);
	const nameParts = (await db.getAutoban()).filter(screen =>
		member.displayName.toLowerCase().includes(screen.toLowerCase()),
	);
	if (nameParts.length > 0) {
		// if any part of name contiains screen
		if (member.bannable) {
			await member.ban({
				reason: `Name contains dissallowed words: ${nameParts.join(
					`, `,
				)}`,
			});
			// if (info.logging) {
			// 	try {
			// 		guildLog(
			// 			member.guild.id,
			// 			`[${moment().format("YYYY-MM-DD HH:mm:ss Z")}] Banned ${
			// 				member.displayName
			// 			} because their name contains ${nameParts.join`, `}`
			// 		);
			// 	} catch (e) {
			// 		throw e;
			// 	}
			// } !!!!!!!!!!!!!!!!!!!!!!!!!!!!! this should be logged on bot.on(ban)
		} else {
			await db.addError(
				safe`Unable to ban user named ${member.displayName}, possibly because interpunct bot does not have permission to ban members.`,
				"name screening",
			);
		}
	}

	const events = await db.getEvents();
	if (events.userJoin) {
		await runEvent(events.userJoin, db, member.guild, {
			"{Mention}": member.toString(),
			"{Name}": safe(member.displayName),
		}); // should (usually) not error
	}
}

client.on("guildMemberAdd", member => {
	perr(guildMemberAdd(member), "member joined");
});

function tsAssert<V>(a: any): a is V {
	return !!a || true;
}

export function assertNever(value: never): never {
	console.log(value);
	throw new Error("Never!");
}

async function runEvent(
	event: Event,
	db: Database,
	guild: Discord.Guild,
	vars: { [key: string]: string },
) {
	if (event.action === "none") {
		return;
	} else if (event.action === "message") {
		let channel = event.channel;
		if (channel === "{SystemMessagesChannel}") {
			if (!guild.systemChannel)
				return await db.addError(
					"/errors/ipscript/system-channel-not-set",
					"unused",
				);
			channel = guild.systemChannel.id;
		}
		const channelDiscord = guild.channels.resolve(channel);
		if (!channelDiscord) {
			return await db.addError(
				"/errors/ipscript/channel-id-not-found",
				"",
			);
		}
		if (!(channelDiscord instanceof Discord.TextChannel)) {
			return await db.addError(
				"/errors/ipscript/channel-not-text-channel",
				"",
			);
		}
		return await channelDiscord.send(streplace(event.message, vars));
	} else {
		return assertNever(event);
	}
}

client.on("guildMemberRemove", member => {
	perr(
		(async () => {
			if (member.partial) {
				// partial is not supported
				console.log(
					"!!! PARTIAL MEMBER WAS AQUIRED IN A MEMBER REMOVE EVENT",
					"the member is:",
					member.toString(),
				);
			}
			if (!member.guild) return;
			const db = new Database(member.guild.id); // it seems bad creating these objects just to forget them immediately
			const events = await db.getEvents();
			if (events.userLeave) {
				await runEvent(events.userLeave, db, member.guild, {
					"{Mention}": member.toString(),
					"{Name}": safe(
						member.displayName || "(name could not be determined)",
					),
				}); // should (usually) not error
			}
		})(),
		"member left.",
	);
});

// async function spaceChannelIfNecessary(channel: Discord.GuildChannel) {
// 	if (!channel.guild) return; // ???
// 	const db = new Database(channel.guild.id);
// 	if (await db.getAutospaceChannels()) {
// 		if (doesChannelRequireSpacing(channel, "-")) {
// 			await spaceChannel(
// 				channel,
// 				"-",
// 				`automatically spaced. \`${await db.getPrefix()}space channels disable\` to stop`,
// 			);
// 		}
// 	}
// }
//
// client.on("channelCreate", (newC: Discord.GuildChannel) =>
// 	perr(spaceChannelIfNecessary(newC), "space channel on create"),
// );
// client.on(
// 	"channelUpdate",
// 	(_oldC: Discord.GuildChannel, newC: Discord.GuildChannel) =>
// 		perr(spaceChannelIfNecessary(newC), "space channel on update"),
// );

function logMsg({ msg, prefix }: { msg: Discord.Message; prefix: string }) {
	if (msg.guild) {
		devlog(
			`${prefix}< [${msg.guild.nameAcronym}] <#${
				(msg.channel as Discord.TextChannel).name
			}> \`${msg.author.tag}\`: ${msg.content}`,
		);
	} else {
		devlog(`${prefix}< pm: ${msg.author.tag}: ${msg.content}`);
	}
}

async function guildLog(id: string, log: string) {
	await fs.appendFile(
		path.join(process.cwd(), `logs/${id}.log`),
		`${log}\n`,
		"utf8",
	);
}

async function onMessage(msg: Discord.Message | Discord.PartialMessage) {
	if (msg.partial) {
		// partial is not supported
		console.log("!!! PARTIAL MESSAGE WAS AQUIRED IN A MESSAGE EVENT");
		await msg.fetch();
		if (!tsAssert<Discord.Message>(msg)) return;
	}
	if (!msg.author) {
		return logError(
			new Error(
				"MESSAGE DOES NOT HAVE AUTHOR. This should never happen.",
			),
		);
	}
	if (msg.author.id === client.user!.id) {
		devlog(`i> ${msg.content}`);
	}

	
	const message_like = {
		channel: msg.channel,
		guild: msg.guild,
		member: msg.member,
		author: msg.author,
		client: msg.client,
		content: msg.content,
		delete: async () => {await msg.delete({timeout: 10})},
	};

	const info = new Info(message_like, timedEvents!, {
		startTime: new Date().getTime(),
		infoPerSecond: -1,
		raw_message: msg,
	});

	if (info.db) {
		await ticketMessage(msg, info.db);

		const autodelete = await info.db.getAutodelete();

		for (const rule of autodelete.rules) {
			let deleteMsg = false;
			if (rule.type === "channel" && msg.channel.id === rule.channel) {
				deleteMsg = true;
			} else if (rule.type === "user" && msg.author.id === rule.user) {
				deleteMsg = true;
			} else if (
				rule.type === "prefix" &&
				msg.content.startsWith(rule.prefix)
			) {
				deleteMsg = true;
			} else if (
				rule.type === "role" &&
				msg.member!.roles.cache.has(rule.role)
			) {
				deleteMsg = true;
			} else if (
				rule.type === "counting" &&
				msg.channel.id === rule.channel
			) {
				// wow this doesn't work at all
				const findNumber = (txt: string) => {
					const chars = txt.match(/[0-9]/g);
					if (!chars) return undefined;
					if (chars.length > 10) return undefined;
					const number = +chars.join("");
					if (isNaN(number)) return undefined;
					return number;
				};
				const pma = msg.channel.messages.cache.array();
				// const pmsg = pma[pma.length - 2];
				let i = 2;
				const thisnum = findNumber(msg.content);
				if (thisnum === undefined) {
					deleteMsg = true;
				} else {
					let cnum = thisnum - 1;
					while (true) {
						const it = pma[pma.length - i];
						if (!it) break;
						if ((it as any)._____ignoreNumber____) break;
						if (i > 100) break;
						const number = findNumber(it.content);
						if (number === undefined) i++;
						else {
							cnum = number;
							break;
						}
					}
					if (cnum + 1 !== thisnum) {
						deleteMsg = true;
						msg.reply("" + (cnum + 1)).catch(() => {});
					}
				}
				if (deleteMsg) {
					(msg as any)._____ignoreNumber____ = true;
				}
			} else {
				// assertNever(rule);
			}
			const apply_to_only = rule.apply_roles?.include_only || [];
			const exclude_roles = rule.apply_roles?.exclude || [];

			if (deleteMsg) {
				const member = msg.member!;
				// member.fetch(); // this should be auto because they sent a message
				const has_exclude = exclude_roles.some(v =>
					member.roles.cache.has(v),
				);
				const has_apto = apply_to_only.some(v =>
					member.roles.cache.has(v),
				);

				if (!has_apto && apply_to_only.length > 0) deleteMsg = false;
				if (has_exclude) deleteMsg = false;
			}

			if (deleteMsg) {
				if (typeof rule.duration === "number") {
					if (
						msg.content.includes("{{DoNotDelete}}") &&
						info.authorPerms.manageMessages
					) {
						// bypass rule
					} else {
						setTimeout(() => {
							info.message.delete().catch(() => {});
						}, rule.duration);
					}
				} else if (rule.duration.type === "autoreact") {
					// TODO
				}
			}
			//if (deleteMsg) {
			//	await info.timedEvents.queue(
			//		[
			//			{
			//				type: "delete",
			//				guild: info.guild!.id,
			//				channel: info.message.channel.id,
			//				message: info.message.id,
			//			},
			//			...(rule.duration < 3000
			//				? [
			//						{
			//							type: "pmuser",
			//							user: msg.author.id,
			//							message:
			//								"Your message in <#" +
			//								info.message.channel.id +
			//								"> was removed.",
			//						} as const,
			//				  ]
			//				: []),
			//		],
			//		new Date().getTime() + rule.duration,
			//	);
			//}
		}
	}

	if (info.db && (await info.db.getLogEnabled())) {
		try {
			await guildLog(
				msg.guild!.id, // db ? guild! : guild?
				`[${moment().format("YYYY-MM-DD HH:mm:ss Z")}] <#${
					(msg.channel as Discord.TextChannel).name
				}> ${msg.author.bot ? "[BOT] " : ""}\`${msg.author.tag}\`: ${
					msg.content
				}`,
			);
		} catch (e) {
			logError(e);
		}
	}

	logMsg({ prefix: "I", msg: msg });
	if (shouldIgnore(msg.author)) {
		return;
	}

	try {
		await sendPinBottom(info, info.message.channel.id);
	} catch (e) {}

	// await newInfo.setup(knex)

	let commandText: string | undefined;
	{
		const lcCutContent = msg.content.toLowerCase();

		const allPrefixes = [
			"<@" + client.user!.id + ">",
			"<@!" + client.user!.id + ">",
			...(!info.db ? ["ip!"] : ""),
			info.db ? await info.db.getPrefix() : "",
		];
		const matchingPrefix = allPrefixes.find(prefix =>
			lcCutContent.startsWith(prefix),
		);
		if (matchingPrefix != null)
			commandText = msg.content.substr(matchingPrefix.length).trim();
	}

	if (commandText) {
		const lcCutContent = commandText.toLowerCase();

		try {
			guildLog(
				"__commands", // db ? guild! : guild?
				`[${moment().format("YYYY-MM-DD HH:mm:ss Z")}] (${
					msg.guild ? msg.guild.nameAcronym : "DM"
				}) <#${msg.channel.id}> ${msg.author.bot ? "[BOT] " : ""}\`${
					msg.author.id
				}\`: ${msg.content}`,
			).catch(() => {});
		} catch (e) {}

		const allCommands = Object.keys(nr.globalCommandNS)
			.sort()
			.reverse(); // so "ip!a b" comes before "ip!a"
		const matchingCommand = allCommands.find(cmd =>
			lcCutContent.startsWith(cmd),
		);

		if (
			matchingCommand != null &&
			(commandText.substr(matchingCommand.length).trim() !==
				commandText.substr(matchingCommand.length) ||
				!commandText.substr(matchingCommand.length))
		) {
			const matchingCommandData = nr.globalCommandNS[matchingCommand];
			const matchingCommandArgs = commandText
				.substr(matchingCommand.length)
				.trim();
			matchingCommandData.handler(matchingCommandArgs, info);
		} else {
			ilt(unknownCommandHandler(commandText, info), "command handler")
				.then(result => {
					if (result.error) nr.reportError(result.error, info);
				})
				.catch(e => console.error(e));
		}
	}
}

client.on("disconnect", () => {
	console.log("Bot disconnected!");
});

let handlingCount = 0;
client.on("message", msg => {
	if (handlingCount > 100)
		return console.log("Handling too many messages, skipping one.");
	perr(
		(async () => {
			// const myid = msgid++;
			handlingCount++;
			// console.log(myid + " start (handling " + handlingCount + ")");
			try {
				await onMessage(msg);
			} catch (e) {}
			handlingCount--;
			// console.log(myid + " done (handling " + handlingCount + ")");
		})(),
		"on message",
	);
});

async function onMessageUpdate(
	from: Discord.Message | Discord.PartialMessage,
	msg: Discord.Message | Discord.PartialMessage,
) {
	if (from.partial || msg.partial) {
		//console.log("!! MESSAGE UPDATE HAD A PARTIAL MESSAGE");
		return;
	}
	if (shouldIgnore(msg.author)) {
		return;
	}
	logMsg({ prefix: "Edit From", msg: from });
	logMsg({ prefix: "Edit To  ", msg: msg });
	if (msg.guild) {
		const db = new Database(msg.guild.id);
		if (await db.getLogEnabled()) {
			try {
				await guildLog(
					msg.guild.id,
					`[${moment().format("YYYY-MM-DD HH:mm:ss Z")}] <#${
						(from.channel as Discord.GuildChannel).name
					}> \`${from.author.tag}\` Edited Message: ${from.content}`,
				);
				await guildLog(
					msg.guild.id,
					`[${moment().format("YYYY-MM-DD HH:mm:ss Z")}] <#${
						(msg.channel as Discord.GuildChannel).name
					}> \`${msg.author.tag}\` To: ${msg.content}`,
				);
			} catch (e) {
				logError(e);
			}
		}
	}
}

client.on("messageUpdate", (from, msg) => {
	perr(onMessageUpdate(from, msg), "message update");
});

const ignoreReactionsOnFrom: { [key: string]: true } = {};

async function rankingMessageReactionAdd(
	reaction: Discord.MessageReaction,
	user: Discord.User | Discord.PartialUser,
	db: Database,
): Promise<boolean> {
	const msg = reaction.message;
	if (!msg.guild) return false;

	const reactor = msg.guild.members.resolve(user.id);
	if (!reactor) {
		return false;
	}

	// now there needs to be some filtering system or something
	// to ignore most reactions
	if (reaction.emoji instanceof Discord.ReactionEmoji) {
		return false;
	}

	const irfKey = msg.guild.id + "|" + msg.id + "|" + user.id;
	if (ignoreReactionsOnFrom[irfKey]) return false;
	ignoreReactionsOnFrom[irfKey] = true;

	const qr = await db.getQuickrank();

	const isManager = qr.managerRole && reactor.roles.cache.has(qr.managerRole);
	if (!(isManager || reactor.hasPermission("MANAGE_ROLES"))) {
		delete ignoreReactionsOnFrom[irfKey];
		return false; // bad person
	}

	const hndlr = qr.emojiAlias[reaction.emoji.id];
	if (!hndlr) {
		delete ignoreReactionsOnFrom[irfKey];
		return false;
	}

	const roleIDs = [hndlr.role];
	let rank = false;

	const timer = createTimer([
		60 * 1000,
		async () => {
			// timer over.
		},
	]);

	const huser = user;
	const rxnh = handleReactions(msg, async (reaction, user) => {
		if (huser.id !== user.id) return;
		const msg = reaction.message;
		if (!msg.guild) {
			return;
		}
		const reactor = msg.guild.members.resolve(user);
		if (!reactor) {
			return;
		}
		if (reaction.emoji instanceof Discord.ReactionEmoji) {
			if (reaction.emoji.name === "✅") {
				rank = true;
				timer.end();
				return;
			}
			return;
		}

		const hndlr = qr.emojiAlias[reaction.emoji.id];
		if (!hndlr) {
			return;
		}

		roleIDs.push(hndlr.role);
	});

	const myreaxn = await msg.react("✅");

	await timer.over();
	rxnh.end();

	delete ignoreReactionsOnFrom[irfKey];

	const guild = msg.guild;

	if (!rank) {
		await myreaxn.remove();
		return true;
	}

	let member = await msg.guild.members.fetch(msg.author);
	if (!member) {
		await msg.channel.send(
			reactor.toString() +
				", Member " +
				msg.author.toString() +
				" not found. Are they still on the server?",
		);
		return true;
	}
	if(member.id === client.user!.id) {
		// oop
		// check if in ticket
		const ticket_info = await db.getTicket();

		if((reaction.message.channel as Discord.TextChannel).parentID === ticket_info.main.category) {
			const topic = (reaction.message.channel as Discord.TextChannel).topic;
	
			if(topic) {
				const ticket_user = /\d+/.exec(topic);
				if(ticket_user) {
					member = await msg.guild.members.fetch(ticket_user[0]);
	
					if (!member) {
						await msg.channel.send(
							reactor.toString() +
								", Member " +
								msg.author.toString() +
								" not found. Are they still on the server?",
						);
						return true;
					}
				}
			}
		}

	}

	const rolesToGive: Discord.Role[] = [];
	const rolesAlreadyGiven: Discord.Role[] = [];

	const allRoleIDsToGive = findAllProvidedRoles(roleIDs, qr);
	for (const roleID of allRoleIDsToGive) {
		const role = guild.roles.resolve(roleID);
		if (!role) {
			await msg.channel.send(
				reactor.toString() + ", :x: Role not found.",
			); // TODO simplified info things for sending successes and failures to channels but that can specify a user to reply to
			return true;
		}
		if (msg.partial) await msg.fetch();
		console.log("Ranking", msg.author.toString());
		if (member.roles.cache.has(roleID)) {
			rolesAlreadyGiven.push(role);
			continue;
		}
		rolesToGive.push(role);

		if (!memberCanManageRole(reactor, role) && !isManager) {
			await msg.channel.send(
				reactor.toString() +
					", :x: You do not have permission to manage " +
					messages.role(role) +
					".",
			); // TODO info.docs^^
			return true;
		}

		if (!memberCanManageRole(guild.me!, role)) {
			await msg.channel.send(
				reactor.toString() +
					", :x: I do not have permission to manage " +
					messages.role(role) +
					".",
			); // TODO info.docs^^
			return true;
		}
	}

	// if (!(await permTheyCanManageRole(reactor, role))) return;
	// if (!(await permWeCanManageRole(reactor, role))) return;

	const reason =
		"Given by " + reactor.toString() + " (" + reactor.displayName + ")";
	await member.roles.add(rolesToGive, reason);

	await msg.channel.send(
		...getRankSuccessMessage(
			reactor,
			member,
			rolesToGive,
			rolesAlreadyGiven,
			roleIDs,
		)
	);

	// if(msg.reactions.has("546938940389589002") && msg.reactions.get(546938940389589002).users.contains(user)) // incase they uncheck
	return true;
}

async function onReactionAdd(
	reaction: Discord.MessageReaction,
	user: Discord.User | Discord.PartialUser,
) {
	// defer would be really nice here, ignoreReactionsFrom[...] = ...; defer delete ignoreReactionsFrom[...]

	const msg = reaction.message;
	if (!msg.guild) return;

	const db = new Database(msg.guild.id);
	if (await ticketMessageReactionAdd(reaction, user, db)) return;
	if (await rankingMessageReactionAdd(reaction, user, db)) return;
}

client.on("messageReactionAdd", (reaction, user) => {
	if(user.bot) return;
	perr(
		(async () => {
			//console.log("Got reaction: {}, {}", reaction, user);
			const freaction = await reaction.fetch();
			await onReactionAdd(freaction, user);
		})(),
		"handle reactions",
	);
});

//client.on("raw", async event => {
//    if(event.t === "MESSAGE_REACTION_ADD") {
//        //console.log("Got message reaction add event: {}", event);
//        const data = event.d;
//        const user_id = data.user_id;
//        const message_id = data.message_id;
//        const channel_id = data.channel_id;
//        const channel = await client.channels.fetch(channel_id);
//        if(!channel) return;
//        if(!(channel instanceof Discord.TextChannel)) return;
//        const message = await channel.messages.fetch(message_id);
//        const emoji_key = getEmojiKey(data.emoji);
//        const reaction = message.reactions.resolve(emoji_key);
//
//        console.log("Got message reaction add event: {}", reaction, user_id);
//    }
//});

// function getEmojiKey(emoji: any) {
// 	return emoji.id ? `${emoji.name}:${emoji.id}` : emoji.name;
// }
//
// bot.on("raw", async event => {
// 	if (event.t !== "MESSAGE_REACTION_ADD") {
// 		return;
// 	}
//
// 	const { d: data } = event;
// 	const user = bot.users.get(data.user_id); // Not sure how there will ever be no user for an event but whatever
// 	if (!user) {
// 		return;
// 	}
// 	const channel = bot.channels.get(data.channel_id);
// 	if (!channel) {
// 		return;
// 	}
// 	await channel.fetch();
// 	if (!(channel instanceof GuildChannel)) {
// 		return;
// 	}
// 	let message = await (channel).messages.fetch(data.message_id);
// 	if (!(<GuildChannel>message).guild) {
// 		return;
// 	}
// 	const emojiKey = getEmojiKey(data.emoji);
// 	const reaction = message.reactions.get(emojiKey);
//
// 	bot.emit("messageReactionAddCustom", reaction, user, message);
// });
// const rolesToAddToMessages = {};
//
// bot.on(
// 	"messageReactionAddCustom",
// 	async (reaction: MessageReaction, user: User, message: Message) => {
// 		if (user.bot && user.id !== config.allowMessagesFrom) {
// 			return;
// 		}
// 		if (!message.guild) {
// 			return; // duplicate
// 		}
// 		const emoji = reaction.emoji.toString();
// 		const db = new Database(message.guild.id);
// 		const member = message.guild.member(user);
// 	// 	if (message.channel.id !== db.getRankmojiChannel()) {
// 	// 		return;
// 	// 	}
// 	// 	if (
// 	// 		member.hasPermission("MANAGE_ROLES") &&
// 	// 		message.guild.member(bot.user).hasPermission("MANAGE_ROLES")
// 	// 	) {
// 	// 		const delet = () => {
// 	// 			if (rolesToAddToMessages[message.id]) {
// 	// 				rolesToAddToMessages[message.id].reaxns.forEach(reaxn =>
// 	// 					message.reactions.get(reaxn).remove()
// 	// 				);
// 	// 				delete rolesToAddToMessages[message.id];
// 	// 			}
// 	// 		};
// 	// 		info.rankmojis.forEach(async ({ rank, moji }) => {
// 	// 			if (moji !== emoji) {
// 	// 				return;
// 	// 			}
// 	// 			if (!message.guild.roles.get(rank)) {
// 	// 				return;
// 	// 			}
// 	// 			if (!rolesToAddToMessages[message.id]) {
// 	// 				rolesToAddToMessages[message.id] = {
// 	// 					roles: [],
// 	// 					reaxns: []
// 	// 				};
// 	// 			}
// 	// 			rolesToAddToMessages[message.id].roles.push(rank);
// 	// 			rolesToAddToMessages[message.id].reaxns.push(
// 	// 				getEmojiKey((await message.react("✅")).emoji)
// 	// 			); // after awaiting for something you should check if the conditions are still met
// 	// 			setTimeout(delet, 10 * 1000);
// 	// 		});
// 	// 		if (emoji === "✅") {
// 	// 			if (rolesToAddToMessages[message.id]) {
// 	// 				rolesToAddToMessages[message.id].roles.forEach(
// 	// 					async rolid => {
// 	// 						const role = message.guild.roles.get(rolid);
// 	// 						try {
// 	// 							if (message.member.roles.get(rolid)) {
// 	// 								return;
// 	// 							}
// 	// 							await message.member.addRole(role);
// 	// 							if (role.mentionable) {
// 	// 								// TODO if !mentionable mention
// 	// 								await message.reply(
// 	// 									`Ranked with ${role.name}`
// 	// 								);
// 	// 							} else {
// 	// 								await message.reply(
// 	// 									`Ranked with ${role.toString()}`
// 	// 								);
// 	// 							}
// 	// 						} catch (e) {
// 	// 							(await message.reply(
// 	// 								`Could not rank, I need to be above the role you want me to rank with`
// 	// 							)).delete(10 * 1000);
// 	// 						}
// 	// 					}
// 	// 				);
// 	// 			}
// 	// 		}
// 	// 	}
// 	// }
// );

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

client.on("guildCreate", guild => {
	global.console.log(`_ Joined guild ${guild.name} (${guild.nameAcronym})`);
});

client.on("guildDelete", guild => {
	global.console.log(`_ Left guild ${guild.name} (${guild.nameAcronym})`);
	deleteLogs(guild.id).catch(e =>
		global.console.log("Could not delete guild logs,", e),
	);
	new Database(guild.id)
		.deleteAllData()
		.catch(e => global.console.log("Could not delete guild data,", e));
});

export async function reportILTFailure(message: ErrorWithID, reason: Error) {
	logError(message, false, reason);
}

export function logError(
	message: Error,
	atEveryone = true,
	additionalDetails?: Error,
) {
	ignorePromise(
		(async () => {
			const finalMsg = `ERROR CODE: \`${
				(message as ErrorWithID).errorCode
			}\`!!. ${
				additionalDetails
					? `Details: ${additionalDetails.toString()}

**Stacktrace**:
\`\`\`
${additionalDetails.stack || "errno"}
\`\`\``
					: ""
			}

Hey ${atEveryone ? "@everyone" : "the void of discord"}, there was an error

**Recent Commands:**
${mostRecentCommands
	.map(c => `\`${c.content}\` / ${moment(c.date).fromNow()}`)
	.join(`\n`)}

**Stacktrace**:
\`\`\`
${message.stack || "errno"}
\`\`\`
`;
			await sendMessageToErrorReportingChannel(finalMsg);
		})(),
	);
}

process.on("unhandledRejection", (reason: any, p) => {
	console.log("UNHANDLED REJECTON.", reason, p);
	// process.exit(1);
	// console.log(p);
	// console.log(reason);
	// reason.errorCode = "Unhandled Rejection; No Error Code";
	// ignorePromise(logError(reason)); // no error code
});

export async function sendMessageToErrorReportingChannel(message: string) {
	// !!!! SHARDING: this does not work with sharding
	console.log(message);

	// const serverID = globalConfig.errorReporting?.server; // this could be used to make sure this is the right shard. right now error reporting will not yet work across shards. or it could just be unused and channelid could be used for shards.
	const channelID = globalConfig.errorReporting?.channel;

	if (!channelID) {
		console.log(message);
		console.log(
			"!!! VERYBAD !!! Error reporting not set up in config. Nowhere to report errors.",
		);
		return;
	}

	try {
		const channel: Discord.TextChannel = client.channels.resolve(
			channelID,
		)! as Discord.TextChannel;
		await channel.send(message);
	} catch (e) {
		console.log("Failed to report. Not Exiting.");
		// process.exit(1); // if an error message failed to report, it is likely the bot can no longer reach discord or something else bad happened
	}
}
