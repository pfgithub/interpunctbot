import * as nr from "../NewRouter";

import { messages, safe } from "../../messages";
import Info from "../Info";

nr.addDocsWebPage(
	"/help/configuration",
	"Configuration",
	"settings for some parts of inter·punct",
	`{Title|Configuration}

Some parts of {Interpunct} can be configured

{CmdSummary|set prefix}
{CmdSummary|set ShowErrors}
{CmdSummary|set ShowUnknownCommand}
{CmdSummary|set ManageBotRole}`,
);

// nr.globalAlias("help configuration", "set");

nr.globalCommand(
	"/help/settings/managebotrole",
	"set managebotrole",
	{
		description: "Set a role in which users can manage the bot settings.",
		usage: "set ManageBotRole {Required|{Role|role}}",
		examples: [],
	},
	nr.list(...nr.a.role()),
	async ([role], info) => {
		if (!(await Info.theirPerm.manageBot(info))) return;

		if (!info.db) {
			return await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
		}

		await info.db.setManageBotRole(role.id);
		await info.success("set " + messages.role(role));
	},
);

nr.globalCommand(
	"/help/settings/prefix",
	"set prefix",
	{
		description:
			"Set the prefix for running commands. If you ever get stuck, you can always reset the prefix using {Interpunct} set prefix ip!",
		usage: "set prefix {Required|prefix}",
		examples: [
			{
				in: "set prefix !",
				out:
					"{Emoji|success} Prefix set to !\n{Blockquote|Try it out with !test}",
			},
		],
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		if (!(await Info.theirPerm.manageBot(info))) return;

		if (!info.db) {
			return await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
		}
		const newPrefix = cmd.trim();
		if (!newPrefix) {
			// !"" === true
			return await info.error(messages.settings.no_prefix_provided(info));
		}
		await info.db.setPrefix(newPrefix);
		return await info.success(
			messages.settings.prefix_updated(info, newPrefix),
		);
	},
);

nr.globalCommand(
	"/help/settings/show-errors",
	"set showerrors",
	{
		usage: "set ShowErrors {Required|{Enum|always|admins|never}}",
		description: "choose who command errors are shown to",
		examples: [],
	},
	nr.list(nr.a.enum("always", "admins", "never")),
	async ([cmd], info) => {
		if (!(await Info.theirPerm.manageBot(info))) return;
		if (!info.db) {
			return await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
		}
		if (cmd === "always" || cmd === "admins" || cmd === "never") {
			await info.db.setCommandErrors(cmd);
			return await info.success(
				messages.settings.show_errors_set(
					info,
					cmd,
					await info.db.getUnknownCommandMessages(),
				),
			);
		}
		return await info.error(
			messages.settings.show_errors_usage(
				info,
				await info.db.getCommandErrors(),
			),
		);
	},
);
nr.globalAlias("set showerrors", "set show errors");

nr.globalCommand(
	"/help/settings/show-unknown-command",
	"set showunknowncommand",
	{
		usage: "set ShowUnknownCommand {Required|{Enum|always|admins|never}}",
		description: "choose who unknown command errors are shown to",
		examples: [],
	},
	nr.list(nr.a.enum("always", "admins", "never")),
	async ([cmd], info) => {
		if (!(await Info.theirPerm.manageBot(info))) return;
		if (!info.db) {
			return await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
		}
		if (cmd === "always" || cmd === "admins" || cmd === "never") {
			await info.db.setUnknownCommandMessages(cmd);
			return await info.success(
				messages.settings.unknown_commands_set(
					info,
					cmd,
					await info.db.getCommandErrors(),
				),
			);
		}
		return await info.error(
			messages.settings.unknown_commands_usage(
				info,
				await info.db.getUnknownCommandMessages(),
			),
		);
	},
);
nr.globalAlias("set showunknowncommand", "set show unknown command");

// nr.alias("highway", "autoban")

// add remove clear
nr.globalCommand(
	"/help/administration/autoban/add",
	"autoban add",
	{
		usage: "autoban add {Required|newline separated list of words}",
		description: "ban users with certain words in their username.",
		extendedDescription:
			"{Emoji|warning} Banning words that are very short can get many users banned. Check the server audit log to see banned users.",
		examples: [
			{
				in: "autoban add\ntwitch.tv\ndiscord.dg",
				out:
					"{Emoji|success} Users with these words in their name (not case-sensitive) will be banned when they join the server:\n- twitch.tv\n- discord.dg",
			},
		],
	},
	nr.passthroughArgs,
	async ([words], info) => {
		if (!Info.theirPerm.banMembers(info)) return;
		if (!(await Info.theirPerm.manageBot(info))) return;
		if (!Info.ourPerm.banMembers(info)) return;
		const nlsep = words
			.split("\n")
			.map(w => w.trim())
			.filter(w => w);
		if (!nlsep.length) {
			return await info.docs("/errors/autoban/no-words", "error");
		}
		if (!info.db) {
			return await info.docs("/errors/pms", "error");
		}
		const ad = await info.db.getAutoban(); // this isn't safe, if two people add to autodelete at once only one will actually save.
		// ^ this is the point of using a database, you add columns instead of using a database as json storage per guild
		ad.push(...nlsep);
		// maybe ad should be a set so it doesn't have duplicates
		await info.db.setAutoban(ad);
		await info.success(
			"Users with these words in their name (not case-sensitive) will be banned when they join the server:\n" +
				ad
					.map(
						q =>
							(nlsep.includes(q) ? "(new) " : "") +
							"- " +
							safe(q),
					)
					.join("\n"),
		);
	},
);

nr.globalCommand(
	"/help/administration/autoban/list",
	"autoban list",
	{
		usage: "autoban list",
		description: "list all name parts",
		examples: [],
	},
	nr.list(),
	async ([], info) => {
		if (!Info.theirPerm.banMembers(info)) return;
		if (!(await Info.theirPerm.manageBot(info))) return;
		if (!info.db) {
			return await info.docs("/errors/pms", "error");
		}
		const ad = await info.db.getAutoban();
		await info.success(
			"Users with these words in their name (not case-sensitive) will be banned when they join the server:\n" +
				(ad.length
					? ad.map(q => "- " + safe(q)).join("\n")
					: "*Autoban is not enabled on this server*"),
		);
	},
);

nr.globalCommand(
	"/help/administration/autoban/clear",
	"autoban clear",
	{
		usage: "autoban clear",
		description: "disable autoban on the server",
		examples: [],
	},
	nr.list(),
	async ([], info) => {
		if (!Info.theirPerm.banMembers(info)) return;
		if (!(await Info.theirPerm.manageBot(info))) return;
		if (!info.db) {
			return await info.docs("/errors/pms", "error");
		}
		await info.db.setAutoban([]);
		await info.success("Autoban is now disabled on this server");
	},
);

// import Usage from "command-parser";
// import o from "../options";
// import {RichEmbed} from "discord.js";
// import SpeedrunAPI from "speedrunapi";
// const sr = new SpeedrunAPI();
// import MB from "../MessageBuilder";
//
// function getRankName(guild, rank) {
// 	if(guild.roles.get(rank))
// 		{return (guild.roles.get(rank).name);}
// 	return ("???");
// }
//
// function printRankMojis(guild, rankmojis) { // TODO add some Setting class so you can easily add settings like list settings or set settings
// 	return `Rankmojis: ${rankmojis.map(({rank, moji}) => `${moji}: ${getRankName(guild, rank)}`).join`, `}`;
// }
//
// const settings = new Usage({
// 	description: "Adjust bot settings",
// 	requirements: [o.pm(false), o.perm("MANAGE_GUILD")]
// });
//
// settings.add("prefix", new Usage({
// 	description: "Set the bot prefix",
// 	usage: ["new prefix..."],
// 	callback: async(data, ...value) => {
// 		if(!value) {return await data.msg.reply(`Prefix: \`${data.prefix}\`.`);}
// 		value = value.join` `;
//
// 		await data.db("guilds").where({id: data.msg.guild.id}).update({prefix: value});
// 		return await data.msg.reply(`Prefix updated to: \`${value}\`.`);
// 	}
// }));
//
// settings.rename("quote", "lists quote");
//
// settings.add("lists", new Usage({
// 	description: "Set pastebin url for where to find quotes",
// 	usage: ["list", ["pastebin id of list", "remove"]],
// 	callback: async(data, list, value) => {
// 		if(!list) {return await data.msg.reply(`Lists: ${Object.keys(data.allPastebin).join` `}`);}
//
// 		if(list === "quote") {
// 			if(!value) {return await data.msg.reply(`Quote pastebin: https://pastebin.com/${data.allPastebin.quote}.`);}
// 			await data.db("guilds").where({id: data.msg.guild.id}).update({quotes: value});
// 			return await data.msg.reply(`Quote pastebin updated to: https://pastebin.com/${value}.`);
// 		}
// 		if(!value) {return await data.msg.reply(`${list} pastebin: https://pastebin.com/${data.allPastebin[list]}.`);}
// 		if(value === "remove") {delete data.allPastebin[list];}
// 		else {data.allPastebin[list] = value;}
// 		await data.db("guilds").where({id: data.msg.guild.id}).update({searchablePastebins: JSON.stringify(data.allPastebin)}); // allPastebin.quote is automatically overridden
// 		return await data.msg.reply(`${list} pastebin updated to: https://pastebin.com/${data.allPastebin[list]}.`);
// 	}
// }));
//
// settings.add("discmoji", new Usage({
// 	description: "Restrict or unrestrict an emoji",
// 	requirements: [o.myPerm("ADMINISTRATOR")],
// }));
//
// settings.path("discmoji").add("restrict", new Usage({
// 	description: "Add a restricted role to an emoji",
// 	usage: ["role id", ["emoji", "emoji id"]],
// 	callback: async(data, rank, ...emoji) => {
// 		try{
// 			const role = data.msg.guild.roles.get(rank);
// 			const moji = data.msg.guild.emojis.get(emoji.join` `.match(/([0-9]{18,})/)[1]);
// 			await moji.addRestrictedRole(role);
// 			return await data.msg.reply(`Restricted emoji with id \`${moji.id}\` to role with id \`${role.id}\``);
// 		}catch(e) {
// 			return await data.msg.reply("Error. Make sure you supplied a role id and an emoji or emoji id");
// 		}
// 	}
// }));
//
// settings.path("discmoji").add("unrestrict", new Usage({
// 	description: "Remove a restricted role from an emoji",
// 	usage: ["role id", ["emoji", "emoji id"]],
// 	callback: async(data, rank, ...emoji) => {
// 		try{
// 			const role = data.msg.guild.roles.get(rank);
// 			const moji = data.msg.guild.emojis.get(emoji.join` `.match(/([0-9]{18,})/)[1]);
// 			await moji.removeRestrictedRole(role);
// 			return await data.msg.reply(`Unrestricted emoji with id \`${moji.id}\` to role with id \`${role.id}\``);
// 		}catch(e) {
// 			return await data.msg.reply("Error. Make sure you supplied a role id and an emoji or emoji id");
// 		}
// 	}
// }));
//
// settings.path("discmoji").add("list", new Usage({
// 	description: "Remove a restricted role from an emoji",
// 	usage: [["emoji", "emoji id"]],
// 	callback: async(data,  ...emoji) => {
// 		try{
// 			const moji = data.msg.guild.emojis.get(emoji.join` `.match(/([0-9]{18,})/)[1]);
// 			let resroles = `Any of the following roles can use this emoji:`;
// 			moji.roles.array().forEach(role => {
// 				resroles += `\n${  role.name  }: ` + `\`${  role.id  }\``;
// 			});
// 			return await data.msg.reply(resroles);
// 		}catch(e) {
// 			return await data.msg.reply("Error. Make sure you supplied an emoji or emoji id");
// 		}
// 	}
// }));
//
// settings.add("rankmoji", new Usage({
// 	description: "Set/Remove/List all rankmoji",
// 	requirements: [o.myPerm("MANAGE_MESSAGES")],
// 	callback: async(data, value) => {
// 		return await data.msg.reply(printRankMojis(data.msg.guild, data.rankmojis));
// 	}
// }));
//
// settings.path("rankmoji").add("add", new Usage({
// 	description: "Add a rankmoji",
// 	usage: ["role id", "emoji"],
// 	callback: async(data, rank, ...moji) => {
// 		if(!rank || !moji) {return await data.commandUsage;}
//
// 		data.rankmojis.push({rank: rank, moji: moji.join` `.trim()});
// 		await data.db("guilds").where({id: data.msg.guild.id}).update({rankmojis: JSON.stringify(data.rankmojis)});
// 		return await data.msg.reply(printRankMojis(data.msg.guild, data.rankmojis));
// 	}
// }));
//
// settings.path("rankmoji").add("remove", new Usage({
// 	description: "Add a rankmoji",
// 	usage: [["role id", "emoji"]],
// 	callback: async(data, ...value) => {
// 		if(!value) {return await data.commandUsage;}
//
// 		value = value.join` `.trim();
// 		data.rankmojis = data.rankmojis.filter(({rank, moji}) => !(rank === value || moji === value) );
// 		await data.db("guilds").where({id: data.msg.guild.id}).update({rankmojis: JSON.stringify(data.rankmojis)});
//
// 		return await data.msg.reply(printRankMojis(data.msg.guild, data.rankmojis));
// 	}
// }));
//
// settings.rename("rankmojiChannel", "rankmoji channel");
// settings.path("rankmoji").add("channel", new Usage({
// 	description: "Sets a channel that can be used to rank people with emojis",
// 	requirements: [o.myPerm("MANAGE_ROLES")],
// 	usage: ["channel"],
// 	callback: async(data) => {
// 		let chanid;
// 		try{
// 			chanid = data.msg.mentions.channels.first().id; // TODO use ? syntax when it gets released
// 		}catch(e) {}
// 		if(!chanid) {return await data.msg.reply(`Rankmoji Channel: <#${data.rankmojiChannel}>.`);}
//
// 		await data.db("guilds").where({id: data.msg.guild.id}).update({rankmojiChannel: chanid});
// 		return await data.msg.reply(`rankmojiChannel updated to: <#${chanid}>`);
// 	}
// }));
//
// settings.add("permreplacements", new Usage({ // TODO finish
// 	description: "Set/Remove/List all permreplacements",
// 	requirements: [o.myPerm("MANAGE_MESSAGES")],
// 	callback: async(data, value) => {
// 		return await data.msg.reply(JSON.stringify(data.permReplacements));
// 	}
// }));
//
// settings.path("permreplacements").add("set", new Usage({
// 	description: "Set a permreplacements",
// 	usage: ["perm", "replacementID"],
// 	callback: async(data, perm, replacement) => {
// 		if(!perm || !replacement) {return await data.commandUsage;} // hmm this doesn't work at all
//
// 		data.permReplacements[perm] = replacement;
// 		await data.db("guilds").where({id: data.msg.guild.id}).update({permreplacements: JSON.stringify(data.permReplacements)});
// 		return await data.msg.reply(JSON.stringify(data.permReplacements));
// 	}
// }));
//
// settings.path("permreplacements").add("remove", new Usage({
// 	description: "Remove a permreplacements",
// 	usage: ["perm"],
// 	callback: async(data, perm) => {
// 		if(!perm) {return await data.commandUsage;}
//
// 		delete data.permReplacements[perm];
// 		await data.db("guilds").where({id: data.msg.guild.id}).update({permreplacements: JSON.stringify(data.permReplacements)});
// 		return await data.msg.reply(JSON.stringify(data.permReplacements));
// 	}
// }));
//
// settings.add("speedrun", new Usage({
// 	description: "Set the ID of the speedrun.com page to track",
// 	usage: ["abbreviation", "category"],
// 	callback: async(data, abbreviation, ...category) => {
// 		if(!abbreviation || !category) {return await data.msg.reply(`Speedrun ID, Default Category: \`${data.speedrun}\`.`);}
//
// 		const gameData = await sr.games().param({abbreviation: abbreviation}).embed(["categories"]).exec();
// 		const games = gameData.items;
// 		if(games.length <= 0) {return await data.msg.reply("Please supply a valid game abbreviation");}
// 		const id = games[0].id;
//
// 		const categories = games[0].categories.data;
//
// 		const categoryFilter = categories.items.filter(cat => cat.name.toLowerCase() === category.join` `.toLowerCase());
// 		if(categoryFilter.length <= 0) {return await data.msg.reply(`Please supply a valid category name. Categories: ${categories.items.map(cat => cat.name).join`, `}`);}
//
// 		await data.db("guilds").where({id: data.msg.guild.id}).update({speedrun: `${id}, ${categoryFilter[0].id}`});
// 		return await data.msg.reply(`Speedrun ID \`${`${id}, ${categoryFilter[0].id}`}\`.`);
// 	}
// }));
//
// settings.add("nameScreening", new Usage({
// 	description: "Set/Remove/List all names where users will be instantly banned upon joining",
// 	requirements: [o.myPerm("BAN_MEMBERS")],
// 	callback: async(data, value) => {
// 		if(!value) {return await data.msg.reply(`Dissalowed Name Parts: ${data.nameScreening.join`, `}`);}
// 	}
// }));
//
// settings.path("nameScreening").add("add", new Usage({
// 	description: "Add a nameScreening",
// 	usage: ["name parts..."],
// 	callback: async(data, ...nameparts) => {
// 		data.nameScreening.push(...nameparts);
//
// 		await data.db("guilds").where({id: data.msg.guild.id}).update({nameScreening: JSON.stringify(data.nameScreening)});
// 		return await data.msg.reply(`Dissalowed Name Parts: ${data.nameScreening.join`, `}`);
// 	}
// }));
//
// settings.path("nameScreening").add("remove", new Usage({
// 	description: "Remove a nameScreening",
// 	usage: ["name parts..."],
// 	callback: async(data, ...nameparts) => {
// 		data.nameScreening = data.nameScreening.filter(v => nameparts.indexOf(v) <= -1); //
//
// 		await data.db("guilds").where({id: data.msg.guild.id}).update({nameScreening: JSON.stringify(data.nameScreening)});
// 		return await data.msg.reply(`Dissalowed Name Parts: ${data.nameScreening.join`, `}`);
// 	}
// }));
//
// settings.add("logging", new Usage({
// 	description: "Enable/disable logging",
// 	usage: [["true", "false"]],
// 	callback: async(data, value) => {
// 		if(!value) {return await data.msg.reply(`Logging: \`${data.logging}\`. Admins can \`${data.prefix}log download\` to download logs. Logs will be reset when this is run.`);}
//
// 		await data.db("guilds").where({id: data.msg.guild.id}).update({logging: value === "true" ? "true" : "false"});
// 		return await data.msg.reply(`Logging is now \`${value === "true" ? "enabled" : "disabled"}\`.`);
// 	}
// }));
//
// settings.add("events", new Usage({
// 	description: "Set text that will be said when something happens."
// }));
//
// settings.path("events").add("welcome", new Usage({
// 	description: "Sets the welcome message. Welcome messages will be in your server's new member messages channel",
// 	usage: [["none", "welcome @s/%s message..."]],
// 	callback: async(data) => {
// 		const message = data.msg.content.split(/^.+?settings events welcome ?/s).join``; // no safe content for us
// 		// if(!message) return await data.msg.reply(`Welcome: ${data.events.welcome}`);
// 		if(message && message.indexOf("@s") + message.indexOf("%s") <= -2) {await data.msg.reply("Put @s or %s in your welcome message to mention/say the user's name");}
//
// 		await data.db("guilds").where({id: data.msg.guild.id}).update({welcome: message});
// 		return await data.msg.reply(`Welcome message ${message ? `updated. Preview: \n\n${message.split`@s`.join(data.msg.author.toString()).split`%s`.join(data.msg.member.displayName)}` : "removed"}`);
// 	}
// }));
//
// settings.path("events").add("goodbye", new Usage({
// 	description: "Sets the goodbye message. Goodbye messages will be in your server's new member messages channel",
// 	usage: [["none", "goodbye @s/%s message..."]],
// 	callback: async(data) => {
// 		const message = data.msg.content.split(/^.+?settings events goodbye ?/s).join``; // no safe content for us
// 		// if(!message) return await data.msg.reply(`Goodbye: ${data.events.goodbye}`);
// 		if(message && message.indexOf("@s") + message.indexOf("%s") <= -2) {await data.msg.reply("Put @s or %s in your welcome message to mention/say the user's name");}
//
// 		await data.db("guilds").where({id: data.msg.guild.id}).update({goodbye: message === "none" ? "" : message});
// 		return await data.msg.reply(`Goodbye message ${message ? `updated. Preview: ${message.split`@s`.join(data.msg.author.toString()).split`%s`.join(data.msg.member.displayName)}` : "removed"}`);
// 	}
// }));
//
// settings.add("unknownCommandMessages", new Usage({
// 	description: "Enable/disable unknown command messages",
// 	usage: [["true", "false"]],
// 	callback: async(data, value) => {
// 		if(!value) {return await data.msg.reply(`unknownCommandMessages: \`${data.unknownCommandMessages}\`.`);}
//
// 		await data.db("guilds").where({id: data.msg.guild.id}).update({unknownCommandMessages: value === "true" ? "true" : "false"});
// 		return await data.msg.reply(`Unknown command messages will ${value === "true" ? "show for all users" : "be disabled for users and PMed for people who can manage server"}.`);
// 	}
// }));
//
// settings.add("commandFailureMessages", new Usage({
// 	description: "Enable/disable command failure messages",
// 	usage: [["true", "false"]],
// 	callback: async(data, value) => {
// 		if(!value) {return await data.msg.reply(`command failure messages: \`${data.failedPrecheckMessages === "true" ? "on": "off"}\`.`);}
//
// 		await data.db("guilds").where({id: data.msg.guild.id}).update({failedPrecheckMessages: value === "true" ? "true" : "false"});
// 		return await data.msg.reply(`Command failure messages messages will ${value === "true" ? "show for all users" : "be disabled for users and PMed for people who can manage server"}.`);
// 	}
// }));
//
// settings.add("autospaceChannels", new Usage({
// 	description: "Enable/disable channel autospacing",
// 	usage: [["true", "false"]],
// 	requirements: [o.myPerm("MANAGE_CHANNELS")],
// 	callback: async(data, value) => {
// 		if(!value) {return await data.msg.reply(`channel spacing: \`${data.channelSpacing === "true" ? "on": "off"}\`.`);}
//
// 		await data.db("guilds").where({id: data.msg.guild.id}).update({channel_spacing: value === "true" ? "true" : "false"});
// 		return await data.msg.reply(`Channels will automatically ${value === "true" ? "be spaced" : "no longer automatically be spaced"}.`);
// 	}
// }));
//
// settings.add("listRoles", new Usage({
// 	description: "List roles on the server",
// 	usage: [["true", "false"]],
// 	callback: async(data) => {
// 		const res = [];
// 		const mb = MB();
// 		mb.title.tag`Roles:`;
// 		mb.description.tag``;
// 		data.msg.guild.roles.array().sort((a, b) => a.calculatedPosition<b.calculatedPosition?1:(a.calculatedPosition>b.calculatedPosition?-1:0)) // inverted sort
// 			.forEach(role => {
// 				mb.addField((t, d)=>{
// 					// if(!role.mentionable)
// 					// 	t.putRaw(role.toString()); // Actually, don't do this. It is not visible in embed output form and instead shows the raw ping
// 					// else
// 					t.put(role.name);
// 					d.tag`\`${role.id}\``;
// 				}, true);
// 			});
// 		return await data.msg.reply(...mb.build(data.embed));
// 		// return await data.msg.reply(`\`\`\`${res.join`\n`.split`@everyone`.join`everyone`.split`@here`.join`here`}\`\`\``);
// 	}
// }));
//
// export default settings;
