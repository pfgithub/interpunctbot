import Router from "commandrouter";
import * as Discord from "discord.js";
import { mkdirSync, promises as fs } from "fs";
import moment from "moment";
import mdf from "moment-duration-format";
import path from "path";

import client, { timedEvents } from "./bot";
import { messages, safe } from "./messages";
import aboutRouter from "./src/commands/about";
import channelsRouter from "./src/commands/channelmanagement";
import emojiRouter from "./src/commands/emoji";
import fun from "./src/commands/fun";
import "./src/commands/help";
import "./src/commands/logging";
import quoteRouter from "./src/commands/quote";
import settingsRouter from "./src/commands/settings";
import "./src/commands/speedrun";
import "./src/commands/test";
import { globalConfig } from "./src/config";
import Database from "./src/Database";
import Info from "./src/Info";
import * as nr from "./src/NewRouter";

mdf(moment as any);

try {
	mkdirSync(path.join(process.cwd(), `logs`));
} catch (e) {}

export let serverStartTime = 0;

const router = new Router<Info, Promise<any>>();

const production = process.env.NODE_ENV === "production";

const mostRecentCommands: { content: string; date: string }[] = [];

function devlog(...msg: any) {
	if (!production) {
		global.console.log(...msg);
	}
}

router.add([], fun);
router.add([], channelsRouter);

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

router.add("spoiler", [], async (cmd, info) => {
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
});

depricate("spaceChannels", "channels spacing", "2.0"); // 1.0 -> 2.0
remove(
	"channels spacing",
	"Unfortunately, discord has removed the ability for bots to put spaces in channel names.",
);

// usage.add("channels", require("./src/commands/channelmanagement")); !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

reroute("invite", "about", "2.0");

router.add("about", [], aboutRouter);
// router.add("help", [], async (cmd, info, next) => {
// 	await info.result(
// 		messages.help(info, info.db ? await info.db.getLists() : {}),
// 	);
// });

reroute("downloadLog", "log download", "2.0");
reroute("resetLog", "log reset", "2.0");
reroute("listRoles", "settings listRoles", "2.0");
remove(
	"settings listroles",
	"Discord now has a builtin way for you to get the ID of roles by right clicking a role in the Roles section of settings. Also, most interpunct commands will now accept a role name instead of ID.",
	"3.0",
);

router.add("crash", [], () => {
	throw new Error("crash command used");
});

router.add([], settingsRouter);
router.add([], emojiRouter);
router.add([], quoteRouter);

function depricate(oldcmd: string, newcmd: string, version = "3.0") {
	router.add(oldcmd, [], async (cmd, info) => {
		return await info.error(
			`\`${oldcmd}\` has been renamed to \`${newcmd}\` as part of Interpunct Bot ${version}. See \`help\` for more information. Join the support server in \`about\` if you have any issues.`,
			undefined,
		);
	});
}

function reroute(oldcmd: string, newcmd: string, version = "3.0") {
	router.add(oldcmd, [], async (cmd, info) => {
		await info.warn(
			`\`${oldcmd}\` has been renamed to \`${newcmd}\` as part of Interpunct Bot ${version}. See \`help\` for more information. Join the support server in \`about\` if you have any issues.`,
			undefined,
		);
		router.handle(newcmd, info);
	});
}

function remove(oldcmd: string, reason: string, version = "3.0") {
	router.add(oldcmd, [], async (cmd, info) => {
		return await info.error(
			messages.failure.command_removed(info, oldcmd, version, reason),
		);
	});
}

depricate("settings prefix", "set prefix [new prefix]");
depricate("settings lists", "lists [add/edit/remove]");
depricate(
	"settings discmoji",
	"IMPLEMENT BEFORE RELEASE;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;", // > Warning: It is recommended to use rankmoji instead.
);
depricate("settings rankmoji", "emoji");
remove(
	"settings permreplacements",
	"Permreplacements were never tested and probably didn't work.",
);
depricate("settings speedrun", "speedrun <add/remove/default>");
depricate(
	"settings nameScreening",
	"IMPLEMENT BEFORE RELEASE;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;",
);
depricate("settings logging", "log <enable/disable>");
depricate(
	"settings events",
	"IMPLEMENT BEFORE RELEASE;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;",
);
depricate(
	"settings unknownCommandMessages",
	"set show unknown command [always/admins/never]",
);
depricate(
	"settings commandFailureMessages",
	"set show errors [always/admins/never]",
);
depricate("settings autospaceChannels", "space channels automatically");
depricate("settings listRoles", "https://interpunct.info/role-id");
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
			undefined,
		);
	} // else do nothing
});

function updateActivity() {
	const count = client.guilds.size;
	client.user && client.user.setActivity(`ip!help on ${count} servers`);
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
	updateActivity();
});

setInterval(updateActivity, 1 * 1000); // update every 1 min

function streplace(str: string, eplace: { [key: string]: string }) {
	Object.keys(eplace).forEach(key => {
		str = str.split(key).join(eplace[key]);
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
	const welcomeMessage = await db.getWelcomeMessage();
	if (welcomeMessage) {
		if (member.guild.systemChannel) {
			await member.guild.systemChannel.send(
				streplace(welcomeMessage, {
					"@s": member.toString(),
					"%s": member.displayName,
				}),
			);
		} else {
			await db.addError(
				`Unable to send welcome message because this server does not have a System Channel set. Set one in the server settings for this server.`,
				"welcome message",
			);
		}
	}
}

client.on("guildMemberAdd", member => {
	perr(guildMemberAdd(member), "member joined");
});

function tsAssert<V>(a: any): a is V {
	return !!a || true;
}

client.on("guildMemberRemove", member => {
	perr(
		(async () => {
			if (member.partial) {
				// partial is not supported
				console.log(
					"!!! PARTIAL MEMBER WAS AQUIRED IN A MEMBER REMOVE EVENT",
					"the member is:",
					member,
				);
				await member.fetch();
				if (!tsAssert<Discord.GuildMember>(member)) return;
			}
			const db = new Database(member.guild.id); // it seems bad creating these objects just to forget them immediately
			const goodbyeMessage = await db.getGoodbyeMessage();
			if (goodbyeMessage) {
				if (member.guild.systemChannel) {
					await member.guild.systemChannel.send(
						streplace(goodbyeMessage, {
							"@s": member.toString(),
							"%s": member.displayName,
						}),
					);
				} else {
					await db.addError(
						`Unable to send welcome message because this server does not have a System Channel set. Set one in the server settings for this server.`,
						"welcome message",
					);
				}
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

	const info = new Info(msg, timedEvents!, {
		startTime: new Date().getTime(),
		infoPerSecond: -1,
	});

	if (info.db) {
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
				msg.member!.roles.has(rule.role)
			) {
				deleteMsg = true;
			}
			if (deleteMsg) {
				await info.timedEvents.queue(
					[
						{
							type: "delete",
							guild: info.guild!.id,
							channel: info.message.channel.id,
							message: info.message.id,
						},
						...(rule.duration < 3000
							? [
									{
										type: "pmuser",
										user: msg.author.id,
										message:
											"Your message in <#" +
											info.message.channel.id +
											"> was removed.",
									} as const,
							  ]
							: []),
					],
					new Date().getTime() + rule.duration,
				);
			}
		}
	}

	if (shouldIgnore(msg.author)) {
		return;
	}
	logMsg({ prefix: "I", msg: msg });

	if (info.db && (await info.db.getLogEnabled())) {
		try {
			await guildLog(
				msg.guild!.id, // db ? guild! : guild?
				`[${moment().format("YYYY-MM-DD HH:mm:ss Z")}] <#${
					(msg.channel as Discord.TextChannel).name
				}> \`${msg.author.tag}\`: ${msg.content}`,
			);
		} catch (e) {
			logError(e);
		}
	}

	// await newInfo.setup(knex)
	const messageRouter = new Router<Info, Promise<any>>();
	const messageRouter2 = new Router<Info, Promise<any>>();
	messageRouter.add(
		info.db ? await info.db.getPrefix() : "",
		[],
		messageRouter2,
	); // prefixCommand
	messageRouter.add(client.user!.toString(), [], messageRouter2); // @botCommand
	for (const possibleCommand of Object.keys(nr.globalCommandNS)
		.sort()
		.reverse()) {
		messageRouter2.add(possibleCommand, [], async (cmd, info) => {
			nr.globalCommandNS[possibleCommand].handler(cmd, info);
		});
	}
	messageRouter2.add("", [], router);

	const handleResult = messageRouter.handle(msg.content, info);
	// if (!handleResult) {
	// 	return await newInfo.error("Command not foundfjdaklsalknjdjkdls");
	// }
	if (!handleResult) return;

	const commandHandleResult = await ilt(handleResult, "handling command");
	if (commandHandleResult.error) {
		const er = commandHandleResult.error;
		const ewid = wrapErrorAddID(er);
		logError(ewid);
		if (er instanceof Discord.DiscordAPIError) {
			await info.error(
				messages.failure.missing_permissions_internal_error(
					info,
					ewid.errorCode,
				),
			);
		} else {
			await info.error(
				messages.failure.generic_internal_error(info, ewid.errorCode),
			);
		}
	}
}

client.on("message", msg => {
	perr(onMessage(msg), "on message");
});

async function onMessageUpdate(
	from: Discord.Message | Discord.PartialMessage,
	msg: Discord.Message | Discord.PartialMessage,
) {
	if (from.partial || msg.partial) {
		console.log("!! MESSAGE UPDATE HAD A PARTIAL MESSAGE");
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
	// forget about the guild at some point in time
	global.console.log(`_ Left guild ${guild.name} (${guild.nameAcronym})`);
	// TODO delete info in db after leaving a guild
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

	const serverID = globalConfig.errorReporting?.server; // this could be used to make sure this is the right shard. right now error reporting will not yet work across shards. or it could just be unused and channelid could be used for shards.
	const channelID = globalConfig.errorReporting?.channel;

	if (!channelID) {
		console.log(message);
		console.log(
			"!!! VERYBAD !!! Error reporting not set up in config. Nowhere to report errors.",
		);
		return;
	}

	try {
		const channel: Discord.TextChannel = client.channels.get(
			channelID,
		)! as Discord.TextChannel;
		await channel.send(message);
	} catch (e) {
		console.log("Failed to report. Exiting.");
		process.exit(1); // if an error message failed to report, it is likely the bot can no longer reach discord or something else bad happened
	}
}
