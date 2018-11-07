const bot = require("./bot");
const config = require("./config");
const path = require("path");
const Usage = require("command-parser");
const o = require("./src/options");
const knex = require("./src/db"); // TODO add something so if you delete a message with a command it deletes the result messages or a reaction on the result msg or idk
const {Attachment, RichEmbed, DiscordAPIError} = require("discord.js");
const moment = require("moment");
const handleQuote = require("./src/commands/quote");
const MB = require("./src/MessageBuilder");
const request = require("request");
const Router = require("commandrouter");
const Info = require("./src/Info");

global.__basedir = __dirname;


const {EventEmitter} = require("events"); // TODO add a thing for warning people like $warn [person] and have it be like 1 warning fine 2 warnings tempmute 3 warnings...and customizeable

const fs = require("mz/fs");

let usage = new Usage({
	description: "All Commands",
	usage: ["command..."]
});

const router = new Router;

let production = process.env.NODE_ENV === "production";

let mostRecentCommands = [];

function devlog(...msg) {
	if(!production) console.log(...msg);
}

usage.add("help",  new Usage({
	description: "List help for all commands",
	usage: ["all", "command..."],
	callback: async(data, ...command) => {
		let all = command[0] === "all" ? command.shift() : false;
		let cmdToGetHelp = data.commands;
		if(command.join` `) return await data.msg.reply(`Getting help on individual commands is disabled. See ${data.prefix}about for documentation`);

		let commands = cmdToGetHelp.description; // Object.keys(data.allPastebin)
		let result = cmdToGetHelp.getUsage({data: all ? undefined : data}); // we need to // brb walk away from what I was typing hope it wasn't important
		result = result.map(line => `${data.prefix}${line}`).join`\n`;
		commands += `\`\`\`\n${result}\n\`\`\``;
		if(!all) commands +=  "and more that you or your server cannot use. `help all` for a full list";
		return data.msg.reply(commands);
	}
}));
usage.add("settings", require("./src/commands/settings"));
router.add("ping", [], require("./src/commands/ping"));
usage.add("speedrun", require("./src/commands/speedrun"));
router.add("log", [Info.r.manageBot], require("./src/commands/logging"));
// usage.add("quote", require("./src/commands/quote"));

usage.add("purge",  new Usage({
	description: "Deletes the last n messages from a channel",
	usage: ["msgs to delete"],
	requirements: [o.perm("MANAGE_MESSAGES"), o.myPerm("MANAGE_MESSAGES")],
	callback: async(data, n) => {
		let number = +n;
		if(isNaN(number)) return await data.msg.reply("Invalid numbers");
		let msgs = await data.msg.channel.fetchMessages({limit: number});
		msgs.array().forEach(msg => msg.delete());
	}
}));
usage.add("spoiler",  new Usage({
	description: "Says something that you have to hover/click to see",
	usage: ["message..."],
	callback: async(data, ...message) => {
		if(o.myPerm("MANAGE_MESSAGES")(data)) await data.msg.delete();
		else (async() => (await data.msg.reply("This command works better when I have the permission `MANAGE_MESSAGES`")).delete(10*1000))();
		message = message.join` `;
		let mb = MB();
		mb.title.tag`Spoiler`;
		mb.description.tag`[Hover to View](https://dummyimage.com/600x400/000/fff&text=${encodeURIComponent(message).replace(/[_]/g, "")} "${message}")`;

		return await data.msg.reply(...mb.build(data.embed || true)); // spoilers must use embeds
	}
}));

usage.rename("spaceChannels", "channels spacing");

usage.add("channels", require("./src/commands/channelmanagement"));

usage.rename("invite", "about");
//usage.add("about", require("./src/commands/about"));
router.add("about", [], require("./src/commands/about"));

usage.rename("downloadLog", "log download");
usage.rename("resetLog", "log reset");
usage.rename("listRoles", "settings listRoles");

usage.add("crash", new Usage({
	description: "Throw an unhandled promise rejection",
	requirements: [o.owner()],
	callback: async(data) => {
		throw new Error("Crash Command Used");
	}
}));

router.add([], require("./src/commands/quote"));

router.add([], async(cmd, info) => {
	if(info.db.getUnknownCommandMessages) {
		return await info.error("Command not found, use help for a list of commands");
	} // else do nothing
});

fs.readdirSync(path.join(__dirname, "src/commands"));

let serverInfo = {};

function tryParse(json) {
	try{
		return typeof json === "string" ? JSON.parse(json) : json;
	}catch(e) {
		console.log(`Could not parse  ^^${JSON.stringify(json)}`);
		return [];
	}
}

let infoPerSecond = [];

async function retrieveGuildInfo(g, msg) {
	let startTime = new Date();
	infoPerSecond.push(startTime);
	infoPerSecond = infoPerSecond.filter(ips => ips.getTime() + 1000 > (new Date()).getTime());

	let prefix = g ? "ip!" : "";
	let options = [/*o.deleteOriginal(1000)*/];
	let disabledCommands = [];
	let rankmojis = [];
	let rankmojiChannel = "";
	let nameScreening = [];
	let allPastebin = {};
	let logging = false;
	let speedrun;
	let unknownCommandMessages = true;
	let failedPrecheckMessages = true;
	let permReplacements = {};
	let channelSpacing = false;
	let events = {welcome: "", goodbye: ""};
	if(g) {
		let guild = (await knex("guilds").where({id: g.id}))[0];
		if(!guild) {
			await knex("guilds").insert({id: g.id, prefix: prefix});
		}else{
			prefix = guild.prefix;
			allPastebin = tryParse(guild.searchablePastebins) || allPastebin;
			if(guild.quotes) allPastebin.quote = guild.quotes;
			speedrun = guild.speedrun;
			disabledCommands = tryParse(guild.disabledCommands) || disabledCommands;
			rankmojis = tryParse(guild.rankmojis) || rankmojis;
			rankmojiChannel = guild.rankmojiChannel;
			nameScreening = tryParse(guild.nameScreening) || nameScreening;
			permReplacements = tryParse(guild.permreplacements) || permReplacements;
			logging = guild.logging === "true" ? true : false;
			unknownCommandMessages = guild.unknownCommandMessages === "true" || !guild.unknownCommandMessages ? true : false;
			failedPrecheckMessages = guild.failedPrecheckMessages === "true" || !guild.failedPrecheckMessages ? true : false;
			channelSpacing = guild.channel_spacing === "true" ? true : false;
			events.welcome = guild.welcome || events.welcome;
			events.goodbye = guild.goodbye || events.goodbye;
		}
	}
	return{
		prefix: prefix,
		options: options,
		msg: msg,
		db: knex,
		pm: !g,
		allPastebin: allPastebin,
		disabledCommands: disabledCommands,
		rankmojis: rankmojis,
		rankmojiChannel: rankmojiChannel,
		nameScreening: nameScreening,
		logging: logging,
		speedrun: speedrun,
		unknownCommandMessages: unknownCommandMessages,
		permReplacements: permReplacements,
		events: events,
		embed: true,
		failedPrecheckMessages: failedPrecheckMessages,
		channelSpacing: channelSpacing,
		startTime: startTime,
		infoPerSecond: infoPerSecond.length
	};
}


function updateActivity() {
	let count = bot.guilds.size;
	bot.user.setActivity(`ip!help on ${count} servers`);
	if(process.env.NODE_ENV === "development") return; // only production should post
	let options = {
		url: `https://bots.discord.pw/api/bots/${config.bdpid}/stats`,
		headers: {
			Authorization: config["bots.discord.pw"]
		},
		json: {
			server_count: count // eslint-disable-line camelcase
		}
	};
	request.post(options, (er, res) => {if(er) console.log("er... my res isn't existant", er); else console.log(res.body);});
}

bot.on("ready", async() => {
	console.log("Ready");
	// bot.user.setActivity(`Skynet Simulator ${(new Date()).getFullYear()+1}`);
	updateActivity();
});

setInterval(updateActivity, 60 * 60 * 1000);

function streplace(str, eplace) {
	Object.keys(eplace).forEach(key =>{
		str = str.split(key).join(eplace[key]);
	});
	return str;
}

bot.on("guildMemberAdd", async(member) => { // serverNewMember // member.toString gives a mention that's cool
	let info = await retrieveGuildInfo(member.guild);
	let nameParts = info.nameScreening.filter(screen => member.displayName.toLowerCase().indexOf(screen.toLowerCase()) > -1);
	if(nameParts.length > 0) { // if any part of name contiains screen
		if(member.bannable) {
			member.ban(`Name contains dissallowed words: ${nameParts.join`, `}`);
			if(info.logging) try{
				guildLog(member.guild.id, `[${moment().format("YYYY-MM-DD HH:mm:ss Z")}] Banned ${member.displayName} because their name contains ${nameParts.join`, `}`);
			}catch(e) {console.log(e);}
		}else{
			devlog("E>< Could not ban member");
		}
	}
	if(info.events.welcome) setTimeout( () => member.guild.systemChannel.send(streplace(info.events.welcome, {"@s": member.toString(), "%s": member.displayName})), 1000 );
});

bot.on("guildMemberRemove", async(member) => {
	let info = await retrieveGuildInfo(member.guild);
	if(info.events.goodbye) member.guild.systemChannel.send(streplace(info.events.goodbye, {"@s": member.toString(), "%s": member.displayName}));
});

bot.on("channelCreate", async(newC) => {
	let info = await retrieveGuildInfo(newC.guild);
	if(info.channelSpacing) {
		newC.setName(newC.name.split("-").join(" "));
	}
});

bot.on("channelUpdate", async(old, newC) => {
	let info = await retrieveGuildInfo(newC.guild);
	if(info.channelSpacing) {
		newC.setName(newC.name.split("-").join(" "));
	}
});

async function checkMojiPerms(msg, info) {
	// if user.hasPerm(nitro custom emojis) && user.isNitro) {//bypass emoji role check}
	// Discord doesn't give this information to bot accounts :(
	let mojimsg = msg.cleanContent;
	let noPermMojis = [];
	let noPermMojiReason = [];
	info.rankmojis.forEach(({rank, moji}) => {
		if(msg.cleanContent.indexOf(moji) > -1) {
			if(!msg.member.roles.has(rank)) {
				mojimsg = mojimsg.split(moji).join(`[no perms]`);
				noPermMojis.push(moji);
				if(msg.guild.roles.get(rank))
					noPermMojiReason.push(msg.guild.roles.get(rank).name);
				else
					noPermMojiReason.push("a rank that doesn't exist");
			}
		}
	});
	if(mojimsg !== msg.cleanContent) {
		await msg.delete();
		let response = await msg.reply(`You do not have permission to use the emoji${noPermMojis.length === 1 ? "" : "s"}: ${noPermMojis.join`, `}. You need <${noPermMojiReason.join`>, <`}> to do that`);
		response.delete(10*1000);
		let themsg = await msg.reply(mojimsg);
		themsg.delete(20*1000);
		return false;
	}
	return true;
}

function logMsg({msg, prefix}) {
	if(msg.guild) devlog(`${prefix}< [${msg.guild.nameAcronym}] <#${msg.channel.name}> \`${msg.author.tag}\`: ${msg.content}`);
	else devlog(`${prefix}< pm: ${msg.author.tag}: ${msg.content}`);
}

async function guildLog(id, log) {
	await fs.appendFile(path.join(__dirname, `logs/${id}.log`), `${log}\n`, "utf8");
}

bot.on("message", async msg => {
	if(msg.author.id === bot.user.id) devlog(`i> ${msg.content}`);
	if(msg.author.bot) return;
	logMsg({prefix: "I", msg: msg});
	// right here do if(prefix)
	let info = await retrieveGuildInfo(msg.guild, msg);
	if(info.logging) try{guildLog(msg.guild.id, `[${moment().format("YYYY-MM-DD HH:mm:ss Z")}] <#${msg.channel.name}> \`${msg.author.tag}\`: ${msg.content}`);}catch(e) {console.log(e);}
	let handle = async(prefixlessMessage) => {
		mostRecentCommands.push({content: msg.cleanContent, date: new Date()});
		while(mostRecentCommands.length > 5) {
			mostRecentCommands.shift();
		}

		console.log(msg.cleanContent); // TODO remove this
		let output;

		let outerUsage = new Usage({});
		outerUsage.add("", usage);
		Object.keys(info.allPastebin).forEach(spb => outerUsage.add(spb, handleQuote(spb)));
		info.commands = outerUsage;

		try{
			output = await outerUsage.parse(info, prefixlessMessage);
		}catch(er) {
			let error = "";
			if(er instanceof DiscordAPIError) error = `The error is: ${er.message} (error code ${er.code})`;
			try{
				await msg.reply(`❌ Error: An internal error occured while attempting to run this command. ${error}`);
			}catch(errr) {
				await msg.author.send(`❌ Error: An error occured while running your command. Additionally, an error occured while trying to tell you about it... Maybe I'm not allowed to talk? ${error}`);
			}
			throw er; // To make sure I know of its existance
		}

		if(output.type !== "success") { // TODO note this will change to like output.notFound or output.preCheckFailed or something
			let resChannel = msg.channel;
			if(output.type === "notFound" &&       !info.unknownCommandMessages) {if(!o.perm("MANAGE_GUILD")(info)) {return;} resChannel = msg.author;}
			if(output.type === "preCheckFailed" && !info.failedPrecheckMessages) {if(!o.perm("MANAGE_GUILD")(info)) {return;} resChannel = msg.author;}
			let mb = MB();
			mb.title.tag`❌ Error:`;
			mb.description.putRaw(output.defaultMessage); // WARNING this could potentionally ping people if mis set. Don't allow user input in outputs
			// const resEmbed = new RichEmbed;
			// resEmbed.description = output;
			// resEmbed.title = "❌ Error:";
			// msg.reply("", {embed: resEmbed});
			return await resChannel.send(...mb.build(info.embed));
		}
		return true;
	};

	let newInfo = new Info(msg, {startTime: info.startTime, infoPerSecond: info.infoPerSecond});
	// await newInfo.setup(knex)
	let messageRouter = new Router;
	console.log(info.prefix, msg.content);
	messageRouter.add(info.prefix, [], router); // prefixCommand
	messageRouter.add(bot.user.toString(), [], router); // @botCommand

	messageRouter.handle(msg.content, newInfo);

	// if(msg.cleanContent.startsWith(info.prefix)) {
	// 	let prefixlessMessage = msg.cleanContent.replace(info.prefix, "").trim(); // replace without regex just replaces the first instance
	// 	handle(prefixlessMessage);
	// }else if(msg.mentions.members.array().map(member => member.id).indexOf(bot.user.id) > -1) {
	// 	let prefixlessMessage = msg.cleanContent.split(`@${msg.guild.me.displayName}`).join``.trim();
	// 	handle(prefixlessMessage);
	// }
	// right here do if(moji)
	if(!(await checkMojiPerms(msg, info))) return;
	// if(msg.channel.id === info.rankmojiChannel) {
	//   info.rankmojis.forEach(({rank, moji}) => {
	//     msg.react(msg.guild.emojis.get(moji.split`:`[2].replace(/[^0-9]/g, "")) || moji);
	//   });
	// }
});

bot.on("messageUpdate", async(from, msg) => {
	if(msg.author.bot) return;
	logMsg({prefix: "Eo", msg: from}); logMsg({prefix: "E2", msg: msg});
	let info = await retrieveGuildInfo(msg.guild, msg);
	if(info.logging) try{
		guildLog(msg.guild.id, `[${moment().format("YYYY-MM-DD HH:mm:ss Z")}] <#${from.channel.name}> \`${from.author.tag}\` Edited Message: ${from.content}`);
		guildLog(msg.guild.id, `[${moment().format("YYYY-MM-DD HH:mm:ss Z")}] <#${msg.channel.name}> \`${msg.author.tag}\` To: ${msg.content}`);
	}catch(e) {console.log(e);}
	checkMojiPerms(msg, info);
});

function getEmojiKey(emoji) {
	return (emoji.id) ? `${emoji.name}:${emoji.id}` : emoji.name;
}

bot.on("raw", async event => {
	if (event.t !== "MESSAGE_REACTION_ADD") return;

	const { d: data } = event;
	const user = bot.users.get(data.user_id); // Not sure how there will ever be no user for an event but whatever
	if(!user) return;
	const channel = bot.channels.get(data.channel_id);
	if(!channel) return;
	let message;
	message = await channel.fetchMessage(data.message_id);
	if(!message.guild) return;
	const emojiKey = getEmojiKey(data.emoji);
	const reaction = message.reactions.get(emojiKey);

	bot.emit("messageReactionAddCustom", reaction, user, message);
});
let rolesToAddToMessages = {};

bot.on("messageReactionAddCustom", async(reaction, user, message) => {
	if(user.bot) return;
	// console.log(`R= ${reaction.emoji}`); // keeping this around because this isn't tested that well, if it crashes it might help // not keeping it around it'll be loud
	let emoji = reaction.emoji.toString();
	let info = await retrieveGuildInfo(message.guild);
	// if(info.logging) try{guildLog(msg.guild.id, `[${moment().format("YYYY-MM-DD HH:mm:ss Z")}] <#${message.channel.name}> \`${message.author.tag}\` Edited Message: ${from.content}`)}catch(e){console.log(e);} // no point
	let member = message.guild.member(user);
	if(message.channel.id !== info.rankmojiChannel) return;
	if(member.hasPermission("MANAGE_ROLES") && message.guild.member(bot.user).hasPermission("MANAGE_ROLES")) {
		let delet = () => {
			if(rolesToAddToMessages[message.id]) {
				rolesToAddToMessages[message.id].reaxns.forEach(reaxn => message.reactions.get(reaxn).remove());
				delete rolesToAddToMessages[message.id];
			}
		};
		info.rankmojis.forEach(async({rank, moji}) => {
			if(moji !== emoji) return;
			if(!message.guild.roles.get(rank)) return;
			if(!rolesToAddToMessages[message.id]) rolesToAddToMessages[message.id] = {roles: [], reaxns: []};
			rolesToAddToMessages[message.id].roles.push(rank);
			rolesToAddToMessages[message.id].reaxns.push(getEmojiKey((await message.react("✅")).emoji)); // after awaiting for something you should check if the conditions are still met
			setTimeout(delet, 10*1000);
		});
		if(emoji === "✅") {
			if(rolesToAddToMessages[message.id]) {
				rolesToAddToMessages[message.id].roles.forEach(async rolid => {
					let role = message.guild.roles.get(rolid);
					try{
						if(message.member.roles.get(rolid)) return;
						await message.member.addRole(role);
						if(role.mentionable) // TODO if !mentionable mention
							await message.reply(`Ranked with ${role.name}`);
						else
							await message.reply(`Ranked with ${role.toString()}`);
					}catch(e) {
						(await message.reply(`Could not rank, I need to be above the role you want me to rank with`)).delete(10*1000);
					}
				});
			}
		}
	}
});

bot.on("guildCreate", (guild) => {
	console.log(`_ Joined guild ${guild.name} (${guild.nameAcronym})`);
});

bot.on("guildDelete", (guild) => { // forget about the guild at some point in time
	console.log(`_ Left guild ${guild.name} (${guild.nameAcronym})`);
});

process.on("unhandledRejection", (reason, p) => {
	let finalMsg = `
Hey <@${config.owner}>, there was an error

**Recent Commands:**
${mostRecentCommands.map(c => `\`${c.content}\` / ${moment(c.date).fromNow()}`).join`\n`}

**Stacktrace**:
\`\`\`
${reason.stack}
\`\`\`
`;
	console.log(p);
	console.log(reason);
	console.log(finalMsg);
	try{
		let rept = config.errorReporting.split`/`;
		bot.guilds.get(rept[0]).channels.get(rept[1]).send(finalMsg); // TODO disable logging in production and instead show the 10 messages before here with this
	}catch(e) {
		console.log("Failed to report");
	}
	// application specific logging, throwing an error, or other logic here
});
