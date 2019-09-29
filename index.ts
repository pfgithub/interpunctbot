import bot from "./bot";
import * as config from "./config.json";
import * as path from "path";
import knex from "./src/db"; // TODO add something so if you delete a message with a command it deletes the result messages or a reaction on the result msg or idk
import {
	MessageAttachment,
	MessageEmbed,
	DiscordAPIError,
	GuildChannel,
	Message,
	TextChannel,
	MessageReaction,
	User
} from "discord.js";
import * as moment from "moment";
import handleQuote from "./src/commands/quote";
import MB from "./src/MessageBuilder";
import * as request from "request";
import Router from "commandrouter";
import Info from "./src/Info";

import ping from "./src/commands/ping";
import speedrun from "./src/commands/speedrun";
import logging from "./src/commands/logging";
import channelsRouter from "./src/commands/channelmanagement";
import aboutRouter from "./src/commands/about";
import quoteRouter from "./src/commands/quote";

declare function require(name: never): never;

declare global {
	namespace NodeJS {
		interface Global {
			__basedir: string;
		}
	}
}
global.__basedir = __dirname;

import { EventEmitter } from "events"; // TODO add a thing for warning people like $warn [person] and have it be like 1 warning fine 2 warnings tempmute 3 warnings...and customizeable

import * as fs from "mz/fs";
import Database from "./src/Database";

const router = new Router<Info, any>();

const production = process.env.NODE_ENV === "production";

const mostRecentCommands: { content: string; date: string }[] = [];

function devlog(...msg: any) {
	if (!production) {
		global.console.log(...msg);
	}
}

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!usage.add("settings", require("./src/commands/settings"));
router.add("ping", [], ping);
router.add([], channelsRouter);
router.add([], speedrun);
router.add("log", [Info.theirPerm.manageBot], logging);

// usage.add(
// 	"purge",
// 	new Usage({
// 		description: "Deletes the last n messages from a channel",
// 		usage: ["msgs to delete"],
// 		requirements: [o.perm("MANAGE_MESSAGES"), o.myPerm("MANAGE_MESSAGES")],
// 		callback: async (data, n) => {
// 			await data.msg.reply("This command is not recommened for use.");
// 			const number = +n;
// 			if (isNaN(number)) {
// 				return await data.msg.reply("Invalid numbers");
// 			}
// 			const msgs = await data.msg.channel.fetchMessages({
// 				limit: number
// 			});
// 			msgs.array().forEach(msg => msg.delete());
// 		}
// 	})
// ); !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

remove(
	"spoiler",
	"Discord has added official spoilers, type your spoiler in between lines `||like this||`"
);

export async function ilt<T>(
	v: Promise<T> /*, reason: string (added to error message)*/,
	reason: string
): Promise<
	{ error: Error; result: undefined } | { error: undefined; result: T }
> {
	let result: T;
	try {
		result = await v;
	} catch (error) {
		reportILTFailure(error, new Error(reason));
		return { error, result: undefined };
	}
	return { result, error: undefined };
}

router.add("spoiler", [], async (cmd, info) => {
	const deletedMessage = await ilt(
		info.message.delete(),
		"Deleting original message for spoiler"
	);
	// if(er) send message...
	info.error(
		"Discord has added official spoiler support by surrounding your message in `||`vertical lines`||`.",
		undefined
	);
});

depricate("spaceChannels", "channels spacing", "2.0"); // 1.0 -> 2.0

// usage.add("channels", require("./src/commands/channelmanagement")); !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

reroute("invite", "about", "2.0");

router.add("about", [], aboutRouter);

depricate("downloadLog", "log download", "2.0");
depricate("resetLog", "log reset", "2.0");
depricate("listRoles", "settings listRoles", "2.0");
remove(
	"settings listroles",
	"Discord now has a builtin way for you to get the ID of roles by right clicking a role in the Roles section of settings. Also, most interpunct commands will now accept a role name instead of ID.",
	"3.0"
);

router.add("crash", [Info.theirPerm.owner], () => {
	throw new Error("crash command used");
});

router.add([], quoteRouter);

function depricate(oldcmd: string, newcmd: string, version: string = "3.0") {
	router.add(oldcmd, [], async (cmd, info) => {
		return await info.error(
			`\`${oldcmd}\` has been renamed to \`${newcmd}\` as part of Interpunct Bot ${version}. See \`help\` for more information. Join the support server in \`about\` if you have any issues.`,
			undefined
		);
	});
}

function reroute(oldcmd: string, newcmd: string, version: string = "3.0") {
	router.add(oldcmd, [], async (cmd, info) => {
		await info.warn(
			`\`${oldcmd}\` has been renamed to \`${newcmd}\` as part of Interpunct Bot ${version}. See \`help\` for more information. Join the support server in \`about\` if you have any issues.`,
			undefined
		);
		router.handle(newcmd, info);
	});
}

function remove(oldcmd: string, reason: string, version: string = "3.0") {
	router.add(oldcmd, [], async (cmd, info) => {
		return await info.error(
			`\`${oldcmd}\` has been removed as part of ${version}.
			${reason ? `${reason} ` : ""}
			Join the support server in \`about\` if you have any issues.`,
			undefined
		);
	});
}

depricate("settings prefix", "prefix");
depricate("settings lists", "lists <add/remove>");
depricate(
	"settings discmoji",
	"IMPLEMENT BEFORE RELEASE;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;"
);
depricate(
	"settings rankmoji",
	"IMPLEMENT BEFORE RELEASE;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;"
);
remove(
	"settings permreplacements",
	"Permreplacements were never tested and probably didn't work."
);
depricate("settings speedrun", "speedrun <add/remove/default>");
depricate(
	"settings nameScreening",
	"IMPLEMENT BEFORE RELEASE;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;"
);
depricate("settings logging", "log <enable/disable>");
depricate(
	"settings events",
	"IMPLEMENT BEFORE RELEASE;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;"
);
depricate(
	"settings unknownCommandMessages",
	"IMPLEMENT BEFORE RELEASE;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;"
);
depricate(
	"settings commandFailureMessages",
	"IMPLEMENT BEFORE RELEASE;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;"
);
depricate(
	"settings autospaceChannels",
	"IMPLEMENT BEFORE RELEASE;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;"
);
depricate(
	"settings listRoles",
	"IMPLEMENT BEFORE RELEASE;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;"
);
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

router.add([], async (cmd, info) => {
	if (!info.db || (await info.db.getUnknownCommandMessages())) {
		return await info.error(
			"Command not found, use help for a list of commands",
			undefined
		);
	} // else do nothing
});

fs.readdirSync(path.join(__dirname, "src/commands"));

const serverInfo = {};

function tryParse(json: any) {
	try {
		return typeof json === "string" ? JSON.parse(json) : json;
	} catch (e) {
		//console.log(`Could not parse  ^^${JSON.stringify(json)}`);
		return [];
	}
}

const infoPerSecond: number[] = [];

function updateActivity() {
	const count = bot.guilds.size;
	bot.user && bot.user.setActivity(`ip!help on ${count} servers`);
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

bot.on("ready", async () => {
	global.console.log("Ready");
	updateActivity();
});

setInterval(updateActivity, 15 * 1000); // update every 15 min

function streplace(str: string, eplace: { [key: string]: string }) {
	Object.keys(eplace).forEach(key => {
		str = str.split(key).join(eplace[key]);
	});
	return str;
}

bot.on("guildMemberAdd", async member => {
	const db = new Database(member.guild.id);
	const nameParts = (await db.getAutoban()).filter(
		screen =>
			member.displayName.toLowerCase().indexOf(screen.toLowerCase()) > -1
	);
	if (nameParts.length > 0) {
		// if any part of name contiains screen
		if (member.bannable) {
			member.ban({
				reason: `Name contains dissallowed words: ${nameParts.join(
					`, `
				)}`
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
			db.addError(
				`Unable to ban user named ${member.displayName}, possibly because interpunct bot does not have permission to ban members.`,
				"name screening"
			);
		}
	}
	const welcomeMessage = await db.getWelcomeMessage();
	if (welcomeMessage) {
		setTimeout(() => {
			if (member.guild.systemChannel) {
				member.guild.systemChannel.send(
					streplace(welcomeMessage, {
						"@s": member.toString(),
						"%s": member.displayName
					})
				);
			} else {
				db.addError(
					`Unable to send welcome message because this server does not have a System Channel set. Set one in the server settings for this server.`,
					"welcome message"
				);
			}
		}, 1000);
	}
});

bot.on("guildMemberRemove", async member => {
	const db = new Database(member.guild.id); // it seems bad creating these objects just to forget them immediately
	const goodbyeMessage = await db.getGoodbyeMessage();
	if (goodbyeMessage) {
		if (member.guild.systemChannel) {
			member.guild.systemChannel.send(
				streplace(goodbyeMessage, {
					"@s": member.toString(),
					"%s": member.displayName
				})
			);
		} else {
			db.addError(
				`Unable to send welcome message because this server does not have a System Channel set. Set one in the server settings for this server.`,
				"welcome message"
			);
		}
	}
});

bot.on("channelCreate", async (newC: GuildChannel) => {
	const db = new Database(newC.guild.id);
	if (await db.getAutospaceChannels()) {
		const newName = newC.name.split("-").join("\u0020");
		if (newC.name !== newName) {
			newC.setName(newName);
		} // nbsp
	}
});

bot.on("channelCreate", async (_oldC: GuildChannel, newC: GuildChannel) => {
	const db = new Database(newC.guild.id);
	if (await db.getAutospaceChannels()) {
		const newName = newC.name.split("-").join("\u0020");
		if (newC.name !== newName) {
			newC.setName(newName);
		} // nbsp
	}
});

function logMsg({ msg, prefix }: { msg: Message; prefix: string }) {
	if (msg.guild) {
		devlog(
			`${prefix}< [${msg.guild.nameAcronym}] <#${
				(<TextChannel>msg.channel).name
			}> \`${msg.author!.tag}\`: ${msg.content}`
		);
	} else {
		devlog(`${prefix}< pm: ${msg.author!.tag}: ${msg.content}`);
	}
}

async function guildLog(id: string, log: string) {
	await fs.appendFile(
		path.join(__dirname, `logs/${id}.log`),
		`${log}\n`,
		"utf8"
	);
}

bot.on("message", async msg => {
	if (!msg.author) {
		return logError(
			new Error("MESSAGE DOES NOT HAVE AUTHOR. This should never happen.")
		);
	}
	if (msg.author.id === bot.user!.id) {
		devlog(`i> ${msg.content}`);
	}
	if (msg.author.bot) {
		return;
	}
	logMsg({ prefix: "I", msg: msg });

	const newInfo = new Info(msg, {
		startTime: new Date().getTime(),
		infoPerSecond: -1
	});

	if (newInfo.db && newInfo.db.getLogEnabled()) {
		try {
			guildLog(
				msg.guild!.id, // db ? guild! : guild?
				`[${moment().format("YYYY-MM-DD HH:mm:ss Z")}] <#${
					(<TextChannel>msg.channel).name
				}> \`${msg.author.tag}\`: ${msg.content}`
			);
		} catch (e) {
			logError(e);
		}
	}

	// await newInfo.setup(knex)
	const messageRouter = new Router<Info, any>();
	messageRouter.add(
		newInfo.db ? await newInfo.db.getPrefix() : "",
		[],
		router
	); // prefixCommand
	messageRouter.add(bot.user!.toString(), [], router); // @botCommand

	try {
		await messageRouter.handle(msg.content, newInfo); // await in case there is an async function that errors.
	} catch (er) {
		msg.reply(
			"An internal error occured :( maybe try again? If that doesn't work, submit a bug report on the support server in `about`."
		);
		logError(er);
	}
});

bot.on("messageUpdate", async (from, msg) => {
	if (msg.author!.bot) {
		return;
	}
	logMsg({ prefix: "Edit From", msg: from });
	logMsg({ prefix: "Edit To  ", msg: msg });
	if (msg.guild) {
		const db = new Database(msg.guild.id);
		if (await db.getLogEnabled()) {
			try {
				guildLog(
					msg.guild.id,
					`[${moment().format("YYYY-MM-DD HH:mm:ss Z")}] <#${
						(<GuildChannel>from.channel).name
					}> \`${from.author!.tag}\` Edited Message: ${from.content}`
				);
				guildLog(
					msg.guild.id,
					`[${moment().format("YYYY-MM-DD HH:mm:ss Z")}] <#${
						(<GuildChannel>msg.channel).name
					}> \`${msg.author!.tag}\` To: ${msg.content}`
				);
			} catch (e) {
				logError(e);
			}
		}
	}
});

// function getEmojiKey(emoji) {
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
// 		if (user.bot) {
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

bot.on("guildCreate", guild => {
	global.console.log(`_ Joined guild ${guild.name} (${guild.nameAcronym})`);
});

bot.on("guildDelete", async guild => {
	// forget about the guild at some point in time
	global.console.log(`_ Left guild ${guild.name} (${guild.nameAcronym})`);
	// TODO delete info in db after leaving a guild
});

export async function reportILTFailure(message: Error, reason: Error) {
	logError(message, false, reason);
}

export async function logError(
	message: Error,
	atEveryone: boolean = true,
	additionalDetails?: Error
) {
	const finalMsg = `${
		additionalDetails
			? `Details: ${additionalDetails}

**Stacktrace**:
\`\`\`
${additionalDetails.stack}
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
${message.stack}
\`\`\`
`;
	await sendMessageToErrorReportingChannel(finalMsg);
}

process.on("unhandledRejection", (reason, p) => {
	console.log(p);
	console.log(reason);
	logError(reason as Error);
});

export async function sendMessageToErrorReportingChannel(message: string) {
	console.log(message);
	try {
		const rept = config.errorReporting.split(`/`);
		const channel: TextChannel = bot.channels.get(rept[1])! as TextChannel;
		await channel.send(message);
	} catch (e) {
		console.log("Failed to report. Exiting.");
		process.exit(1); // if an error message failed to report, it is likely the bot can no longer reach discord or something else bad happened
	}
}
