import client, { timedEvents } from "../bot";
import * as discord from "discord.js";
import { ilt, logCommand, perr, production } from "..";
import { globalConfig } from "./config";
import Info, {MessageLike} from "./Info";
import { ginteractionhandler, globalCommandNS, globalDocs } from "./NewRouter";
import deepEqual from "deep-equal";
import * as util from "util";

client.on("interactionCreate", interaction => {
	perr((async () => {
		const res = await ilt(do_handle_interaction(interaction), false);
		if(res.error) {
			console.log("handle interaction failed with", res.error);
			if(interaction instanceof discord.MessageComponentInteraction) {
				await interaction.reply({
					content: "Uh oh! Something went wrong while handling this interaction",
					ephemeral: true,
				});
			}else if(interaction instanceof discord.BaseCommandInteraction) {
				await interaction.reply({
					content: "Uh oh! Something went wrong while handling this interaction",
					ephemeral: true,
				});
			}else {
				throw new Error("interaction failed and is of unsupported type "+interaction.type);
			}
		}
	})(), "handling interaction");
});
async function handle_interaction_routed(
	info: Info,
	route_name: string,
	route: SlashCommandRoute,
	options: discord.CommandInteractionOption[],
	interaction: discord.Interaction,
): Promise<unknown> {
	if('subcommands' in route) {
		// read option
		if(options.length !== 1) return await info.error("Expected subcommand. This should never happen.");
		const opt0 = options[0];
		const optnme = opt0.name;

		const next_route = route.subcommands[optnme];
		if(!next_route) return await info.error(info.tag`Subcommand ${optnme} not found. This should never happen.`);

		return await handle_interaction_routed(info, optnme, next_route, opt0.options ?? [], interaction);
	}else{
		// (subcommand.options || []).map(opt => opt.value || ""
		const ns_path = route.route ?? route_name;

		const handler = globalCommandNS[ns_path];
		if(!handler) return await info.error("Could not find handler for ns_path `"+ns_path+"`. This should never happen.");

		if(!handler.config.supports_slash) {
			setTimeout(() => {
				if(interaction.has_ackd) return;
				interaction.accept().catch(e => console.log("Failed to accept interaction", e));
			}, 200);
		}

		interaction.options = options || [];

		return handler.handler([route.preload ?? [], (options || []).map(opt => "" + opt.value || "")].flat().join(" "), info);
	}
}

// TODO update to built in discordjs stuff rather than api raw
// api raw was nice while it lasted because I didn't have to think about caches and stuff

async function do_handle_interaction(interaction: discord.Interaction) {
	const startTime = Date.now();

	logCommand(interaction.guild_id, interaction.channel_id, false, interaction.member.user.id, 
		(interaction.type === 2 ? "/"+interaction.data.name : "@"+interaction.type)+": "+JSON.stringify(interaction.data)
	);
    
	if(interaction.isButton()) {
		const data = interaction.data;

		console.log(interaction);

		const message_like = { // weird; the message is sent by interpunct but the author is set to the interactor
			channel: message?.channel ?? channel,
			guild: message?.guild ?? guild,
			member: interaction.member,
			author: interaction.user,
			client: message?.client ?? client,
			content: message?.content ?? "*no content*",
			delete: async () => {
				if(message) {
					await new Promise(r => setTimeout(r, 10));
					await message.delete();
				}
			},
		};

		const info = new Info(message_like, timedEvents!, {
			startTime,
			infoPerSecond: -1,
			raw_interaction: interaction_helper,
		});

		const idv = data.custom_id.split("|")[0]!;
		const inh = ginteractionhandler[idv];
		// note: does not check for channel view perms
		if(inh) {
			try {
				return await inh.handle(info, data.custom_id);
			}catch(e) {
				console.log(e);
				return await info.error("An error occured while handling this button click.");
			}
		}
		return await info.error("Unsupported button kind `"+idv+"`.");
	}else if(!interaction.isCommand()) {
		throw new Error("Interaction kind not supported.");
		// return await interaction("× Interaction not supported.");
	}
    
	// console.log("Got interaction: ", util.inspect(interaction.data, false, null, true));
	console.log(interaction);

	// construct an info object
	// const guild = client.guilds.cache.get(interaction.guild_id)!;
	// const channel = client.channels.cache.get(interaction.channel_id)! as discord.Message["channel"];
	// const member = guild.members.add(interaction.member);
    
	if(!interaction.channel) throw new Error("Req. channel");
	if(interaction.member && !(interaction.member instanceof discord.GuildMember)) interaction.member = null;

	const mlike: MessageLike = {
		channel: interaction.channel,
		guild: interaction.guild,
		member: interaction.member,
		author: interaction.user,
		client,
		content: "*no content*",
		delete: async () => {
			// nothing to do.
		},
	};
	const info = new Info(mlike, timedEvents!, {
		startTime,
		infoPerSecond: -1,
		raw_interaction: interaction,
	});

	const my_channel_perms = info.myChannelPerms!;
	if(!my_channel_perms.has("VIEW_CHANNEL")) {
		return await interaction.reply("Commands cannot be used in this channel because I don't have permission to see it.");
	}
    
	const route = slash_command_router[data.name];
	if(!route) return await info.error("Unsupported interaction / This command should not exist.");

	return await handle_interaction_routed(info, data.name, route, data.options || [], interaction);
}

type SlashCommandRouteBottomLevel = {
	// handler?: () => {}
    route?: string,
    preload?: string,
    description?: string, // if no description is specified, it will be chosen from the route
    args?: {[key: string]: UnnamedOption},
    arg_stringifier?: (args: discord.CommandInteractionOption[]) => string,
};
type SlashCommandRouteSubcommand = {
    description: string,
    subcommands: {[key: string]: SlashCommandRouteBottomLevel} | {[key: string]: SlashCommandRouteSubcommand},
};
type SlashCommandRoute = SlashCommandRouteBottomLevel | SlashCommandRouteSubcommand;

type UnnamedOption =
	| Omit<discord.ApplicationCommandChoicesData, "name">
	| Omit<discord.ApplicationCommandNonOptionsData, "name">
;

const opt = {
	oneOf(description: string, choices: {[key: string]: string}): UnnamedOption {
		if(description.length > 100) throw new Error("max 100 len desc");
		return {
			type: 3,
			description,
			required: true,
			choices: Object.entries(choices).map(([value, key]) => ({name: key, value})),
		};
	},
	channel(description: string): UnnamedOption {
		if(description.length > 100) throw new Error("max 100 len desc");
		return {type: 7, description, required: true};
	},
	string(description: string): UnnamedOption {
		if(description.length > 100) throw new Error("max 100 len desc");
		return {type: 3, description, required: true};
	},
	// boolean is not necessary, oneOf is better in almost every case.
	integer(description: string): UnnamedOption {
		if(description.length > 100) throw new Error("max 100 len desc");
		return {type: 4, description, required: true};
	},
	user(description: string): UnnamedOption {
		if(description.length > 100) throw new Error("max 100 len desc");
		return {type: 6, description, required: true};
	},
	role(description: string): UnnamedOption {
		if(description.length > 100) throw new Error("max 100 len desc");
		return {type: 8, description, required: true};
	},
	// TODO update when discord adds multiline support
	multiline(description: string): UnnamedOption {
		if(description.length > 100) throw new Error("max 100 len desc");
		return {type: 3, description, required: true};
	},
	optional(scon: UnnamedOption): UnnamedOption {
		return {...scon, required: false} as any;
	},
};

const slash_command_router: {[key: string]: SlashCommandRoute} = {
	test: {},
	ping: {},
	help: {args: {command: opt.optional(opt.string("Command/page to get help for"))}},
	play: {
		description: "Play a game",
		subcommands: {
			tictactoe: {},
			checkers: {},
			circlegame: {},
			papersoccer: {},
			ultimatetictactoe: {},
			infinitetictactoe: {},
			connect4: {},
			trivia: {},
			randomword: {args: {custom_word: opt.optional(opt.string("A custom word. Costs 5 trophies."))}},
		},
	},
	set: {
		description: "Configure bot",
		subcommands: {
			prefix: {args: {to: opt.string("the new bot prefix. default is ip!")}},
			fun: {args: {to: opt.oneOf("allow or deny fun", {enable: "On", disable: "Off"})}},
			show_errors: {route: "set showerrors", args: {to: opt.oneOf("who to show errors to", {always: "Everyone", admins: "Admins", never: "Hidden"})}},
			show_unknown_command: {route: "set showunknowncommand", args: {to: opt.oneOf("who to show unknown command messages to", {always: "Everyone", admins: "Admins", never: "Hidden"})}},
			manage_bot_role: {route: "set managebotrole", args: {to: opt.role("Bot manager role")}},
		},
	},
	msgs: {
		description: "Configure messages",
		subcommands: {
			user_join: {
				description: "Set/remove join message",
				subcommands: {
					set: {route: "messages set welcome", args: {
						channel: opt.channel("Channel to send join messages in"),
						message: opt.multiline("Join message. Use `{Mention}` or `{Name}` to include the name of the joiner."),
					}},
					off: {route: "messages remove welcome"},
				},
			},
			user_leave: {
				description: "Set/remove leave message",
				subcommands: {
					set: {route: "messages set goodbye", args: {
						channel: opt.channel("Channel to send leave messages in"),
						message: opt.multiline("Use `{Mention}` or `{Name}` to include the name of the leaver."),
					}},
					off: {route: "messages remove goodbye"},
				},
			},
			pinbottom: {
				args: {channel: opt.channel("Channel to pin the message in"), message: opt.optional(opt.multiline("Message to pin"))},
			}
		},
	},
	slowmode: {
		description: "Configure slowmode",
		subcommands: {
			set: {
				route: "slowmode set",
				args: {channel: opt.channel("Channel to set slowmode in"), duration: opt.string("How long to set slowmode. Min: 1s, Max: 6h")}
			},
		},
	},
	purge: {
		args: {count: opt.integer("Number of messages to purge")},
	},
	ticket: {
		description: "Configure tickets",
		subcommands: {
			setup: {route: "help", preload: "ticket setup", description: "Get help setting up tickets"},
			category: {route: "ticket category", args: {category: opt.channel("Category to use tickets in")}},
			invitation: {route: "ticket invitation", args: {category: opt.string("Link to the invitation message")}},
			welcome: {route: "ticket welcome", args: {message: opt.optional(opt.string("The message. Use `{Mention}` and `{Name}`, or leave empty to unset"))}},
			logs: {route: "ticket logs", args: {log_channel: opt.channel("Channel for pretty logs"), upload_channel: opt.channel("Channel for uploading files.")}},
			logs_transcripts: {route: "ticket logs", args: {log_channel: opt.channel("Channel for immediate transcripts of every message sent in a ticket")}},
			ping: {route: "ticket ping", args: {who: opt.string("Who to ping after someone says something in their ticket")}},
			autoclose: {route: "ticket autoclose", args: {time: opt.string("How long until the ticket is auto closed. Eg: 15 min. Use 0s to disable.")}},
			deletetime: {route: "ticket deletetime", args: {time: opt.string("How long from trash can to gone ticket. Default: 1 min")}},
			diagnose: {route: "ticket diagnose"},
			creatorcanclose: {route: "ticket creatorcanclose", args: {can: opt.oneOf("Can close?", {yes: "Yes", no: "No"})}},
			dmonclose: {route: "ticket dmonclose", args: {dm: opt.oneOf("DM creator on close?", {yes: "Yes", no: "No"})}},
			// - creatorscanclose
		},
	},
	// // this will require a rework of autodelete
	// autodelete: {
	//     description: "Configure autodelete",
	//     subcommands: {
	//         add: {
	//             description: "Add an autodelete rule",
	//             subcommands: {
	//                 prefix: {args: {delete_time: opt.string("How long to wait before deleting the message. eg 100ms or 1h"), prefix: opt.string("Delete all messages starting with this prefix")}},
	//                 user: {args: {delete_time: opt.string("How long to wait before deleting the message. eg 100ms or 1h"), user: opt.user("Delete all messages from this user")}},
	//                 channel: {args: {delete_time: opt.string("How long to wait before deleting the message. eg 100ms or 1h"), channel: opt.user("Delete all messages in this channel")}},
	//                 role: {args: {delete_time: opt.string("How long to wait before deleting the message. eg 100ms or 1h"), channel: opt.role("Delete all messages from users with this role")}},
	//             },
	//         },
	//     }
	// },
	rank: {args: {who: opt.user("Who to rank"), ranks: opt.string("What ranks to give. Comma separated list.")}},
	quickrank: {
		description: "Quickrank config",
		subcommands: {
			list: {route: "quickrank list"},
			add: {
				description: "add quickrank",
				subcommands: {
					named: {
						route: "quickrank add named",
						args: {name: opt.string("The name for /rank"), role: opt.role("Role to give")},
						// TODO arg parser needs to be updated to do options better for slash commands
					},
					reaction: {
						route: "quickrank add reaction",
						args: {reaction: opt.string("An emoji from your server"), role: opt.role("Role to give")},
					},
					provides: {
						route: "quickrank add provides",
						args: {role1: opt.role("Role"), role2: opt.role("Role to give automatically when role1 is given")},
					},
					// should provides happen on role change events too?
				}
			},
			remove: {
				route: "quickrank remove role",
				args: {role: opt.role("Role to remove from quickrank")}
			},
			set: {
				description: "set quickrank",
				subcommands: {
					role: {route: "quickrank set role", args: {role: opt.role("Role of people who can bypass quickrank")}},
				},
			}
		},
	},
	command: {
		description: "manage custom commands",
		subcommands: {
			add: {route: "command add", args: {name: opt.string("Command name"), message: opt.string("What to say when the command is used")}},
			remove: {route: "command remove", args: {name: opt.string("Command name")}},
			list: {route: "command list"},
		},
	},
	slashbot: {
		description: "is slashbot",
		route: "ping",
	},
	button: {
		description: "create buttons",
		subcommands: {
			role: {route: "grantrolebtn", args: {name: opt.string("Button text"), role: opt.role("Role to give")}},
		},
	},
	panel: {
		description: "create button panels",
		subcommands: {
			new: {route: "newpanel"},
			edit: {route: "editpanel", args: {name: opt.optional(opt.string("Panel name"))}},
			send: {route: "sendpanel", args: {name: opt.optional(opt.string("Panel name"))}},
		},
	},
	give: {
		description: "only use these when prompted",
		subcommands: {
			text: {route: "givetext", args: {text: opt.string("Text")}},
			role: {route: "giverole", args: {role: opt.role("Role")}},
			emoji: {route: "giveemoji", args: {emoji: opt.string("Emoji")}},
		},
	},
};

function createBottomLevelCommand(cmdname: string, cmddata: SlashCommandRouteBottomLevel): discord.ApplicationCommandSubCommandData {
	const base_command_name = cmddata.route ?? cmdname;
	const base_command = globalCommandNS[base_command_name];
	if(!base_command) throw new Error("Undefined command `"+base_command_name+"`");
	const base_command_docs = globalDocs[base_command.docsPath];
	const docs_desc = base_command_docs.summaries.description;

	if(cmddata.description && cmddata.description.length > 100) throw new Error("max length 100");
	let final_desc = cmddata.description ?? docs_desc;
	if(final_desc.length > 100) final_desc = final_desc.substr(0, 99) + "…";

	return {
		type: "SUB_COMMAND",
		name: cmdname,
		description: final_desc,
		options: Object.entries(cmddata.args ?? {}).map(([optname, optvalue]) => {
			return {...optvalue, name: optname};
		}),
	};
}

function getCommandsOut(cmdname: string, cmddata: SlashCommandRoute): discord.ApplicationCommandData {
	if('subcommands' in cmddata) {
		if(Object.entries(cmddata.subcommands).length > 25) throw new Error("Max 25 subcommands");
		return {
			name: cmdname,
			type: "CHAT_INPUT",
			description: cmddata.description,
			options: Object.entries(cmddata.subcommands).map(([scname, scdata_raw]): (
				| discord.ApplicationCommandSubGroupData
				| discord.ApplicationCommandSubCommandData
			) => {
				const scdata = scdata_raw as SlashCommandRouteBottomLevel | SlashCommandRouteSubcommand;
				if('subcommands' in scdata) {
					if(Object.entries(scdata.subcommands).length > 25) throw new Error("Max 25 subsubcommands");
					return {
						type: "SUB_COMMAND_GROUP",
						name: scname,
						description: scdata.description,
						options: Object.entries(scdata.subcommands).map(([sscname, sscdata_raw]): discord.ApplicationCommandSubCommandData => {
							if('subcommands' in sscdata_raw) throw new Error("too nested!");
							const sscdata = sscdata_raw as SlashCommandRouteBottomLevel;
							return createBottomLevelCommand(sscname, sscdata);
						}),
					};
				} else {
					return createBottomLevelCommand(scname, scdata);
				}
			}),
		};
	}
	return {...createBottomLevelCommand(cmdname, cmddata), type: "CHAT_INPUT"};
}

const commands_out = Object.entries(slash_command_router).map(([k, v]) => getCommandsOut(k, v))

if(commands_out.length > 50) throw new Error("Max 50 slash commands");

let __is_First_Shard: boolean | undefined = undefined;
function firstShard() {
	if(__is_First_Shard !== undefined) return __is_First_Shard;
	const values = client.guilds.cache.values();
	const first = values.next();
	if(first.done) return false;
	console.log("This shard is:",first.value.shardId);
	__is_First_Shard = first.value.shardId === 0;
	return __is_First_Shard;
}

function shouldUpdateCommandsHere() {
	if(production) return firstShard();
	return !!devCommandGuild;
}

const devCommandGuild = globalConfig.slashCommandServer;

export async function start(): Promise<void> {
	// get list of global slash commands
	// update to match

	// NOTE that this only has to be done on shard 0
	if(!shouldUpdateCommandsHere()) {
		console.log("Not updating slash commands on this shard/config");
		return;
	}
	if(!client.application) {
		throw new Error("client.application undefined?");
	}

	if(!production && devCommandGuild) {
		await client.application.commands.set(commands_out, devCommandGuild);
	}else{
		await client.application.commands.set(commands_out);
	}

	console.log("Slash commands up to date!");
}