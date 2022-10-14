import client, { timedEvents } from "../bot";
import * as discord from "discord.js";
import { ilt, logCommand, production } from "..";
import { globalConfig } from "./config";
import Info, {MessageLike} from "./Info";
import { ginteractionhandler, globalCommandNS, globalDocs } from "./NewRouter";
import deepEqual from "deep-equal";
import * as util from "util";
import * as d from "discord-api-types/v9";
import { shortenLink } from "./commands/fun";
import { registerFancylib } from "./fancy/fancyhmr";
import { textinput_handlers } from "./commands/fun/buttongames/tictactoe";

export const api = client as any as ApiHolder;

type ApiHandler = {
    get: <T>() => Promise<T>,
    post: <T, Q>(value: T) => Promise<Q>,
    patch: (value: any) => Promise<any>,
    delete: () => Promise<any>,
} & {[key: string]: ApiHandler} & ((...data: any[]) => ApiHandler);
// discord-api-types also has route url builders in it. TODO: use them instead

type ApiHolder = {api: ApiHandler};


type DistributiveOmit<T, K extends keyof any> = T extends any
	? Omit<T, K>
	: never
;
type SlashCommandOptionNameless = DistributiveOmit<d.APIApplicationCommandBasicOption, "name">;

type NamelessAPIApplicationCommand = Omit<UnsubmittedAPIApplicationCommand, "name">;
type UnsubmittedAPIApplicationCommand = Omit<d.APIApplicationCommand, "id" | "application_id" | "version">;

export type InteractionHandled<T> = {__interaction_handled: T};
const interaction_handled: InteractionHandled<any> = {__interaction_handled: true};

export function enterSafeMode(emsg: string, value: d.APIInteractionResponse | d.APIModalInteractionResponse): d.APIInteractionResponse {
	// if it says something like ""
	// components[1].components[0] we know exactly which one to fix
	// but that might allow for like double errors and stuff
	// so for now I'll just get rid of all of them
	return JSON.parse(JSON.stringify(value, (k, v) => {
		return v;
	}));
}

export class InteractionHelper {
    raw_interaction: d.APIInteraction | d.APIModalSubmitInteraction;
    has_ackd: boolean;
    options: d.APIApplicationCommandInteractionDataOption[];

    constructor(raw_interaction: d.APIInteraction | d.APIModalSubmitInteraction) {
    	this.raw_interaction = raw_interaction;
    	this.has_ackd = false;
    	this.options = undefined as any;
    }
    async sendRaw(value: d.APIInteractionResponse | d.APIModalInteractionResponse): Promise<void> {
    	if(this.has_ackd) throw new Error("cannot double interact");
		const iltres = await ilt(api.api.interactions(this.raw_interaction.id, this.raw_interaction.token).callback.post({data: value}), "interaction sendraw");
		if(iltres.error) {
			const e = iltres.error;
			if(e.toString().includes("Invalid Form Body")) {
				await api.api.interactions(this.raw_interaction.id, this.raw_interaction.token).callback.post({
					data: enterSafeMode(e.toString(), value),
				});
			}
		}
    	this.has_ackd = true;
    }
    async editOriginal(value: unknown): Promise<void> {
    	await api.api.webhooks(this.raw_interaction.application_id, this.raw_interaction.token).messages("@original").patch({data: value});
    }
    async delete(): Promise<void> {
    	await api.api.webhooks(this.raw_interaction.application_id, this.raw_interaction.token).messages("@original").delete();
    }
    async acceptLater(): Promise<InteractionHandled<any>> {
    	await this.sendRaw({
    		type: d.InteractionResponseType.DeferredChannelMessageWithSource,
    	});
    	return interaction_handled;
    }
    async accept(): Promise<InteractionHandled<any>> {
    	await this.sendRaw({
    		type: d.InteractionResponseType.ChannelMessageWithSource,
    		data: {content: "✓", flags: 1 << 6, allowed_mentions: {parse: []}},
    	});
    	return interaction_handled;
    }
    async reply(message: string): Promise<InteractionHandled<any>> {
    	await this.sendRaw({
    		type: d.InteractionResponseType.ChannelMessageWithSource,
    		data: {content: message, allowed_mentions: {parse: []}},
    	});
    	return interaction_handled;
    }
    async replyHiddenHideCommand(message: string, components: d.APIActionRowComponent<d.APIMessageActionRowComponent>[] | undefined = undefined): Promise<InteractionHandled<any>> {
    	await this.sendRaw({
    		type: d.InteractionResponseType.ChannelMessageWithSource,
    		data: {content: message, flags: 1 << 6, allowed_mentions: {parse: []}, components},
    	});
    	return interaction_handled;
    }
	async replyModal(modal: d.APIModalInteractionResponseCallbackData): Promise<InteractionHandled<any>> {
		await this.sendRaw({
			type: d.InteractionResponseType.Modal,
			data: modal,
		});
		return interaction_handled;
	}
}

function on_interaction(interaction: d.APIInteraction | d.APIModalSubmitInteraction) {
	ilt(do_handle_interaction(interaction), false).then(async res => {
		if(res.error) {
			console.log("handle interaction failed with", res.error);
			const helper = new InteractionHelper(interaction);
			await helper.replyHiddenHideCommand("Uh oh! Something went wrong while handling this interaction");
			return;
		}
	}).catch(e => console.log("handle interaction x2 failed", e));
}
async function handle_interaction_routed(info: Info, route_name: string, route: SlashCommandRoute, options: d.APIApplicationCommandInteractionDataOption[], interaction: InteractionHelper): Promise<unknown> {
	if('subcommands' in route) {
		// read option
		if(options.length !== 1) return await info.error("Expected subcommand. This should never happen.");
		const opt0 = options[0];
		if(opt0.type !== d.ApplicationCommandOptionType.Subcommand
		&& opt0.type !== d.ApplicationCommandOptionType.SubcommandGroup) {
			return await info.error("Expected subcommand. This should never happen.");
		}
		const optnme = opt0.name;

		const next_route = route.subcommands[optnme];
		if(!next_route) return await info.error(info.tag`Subcommand ${optnme} not found. This should never happen.`);

		return await handle_interaction_routed(info, optnme, next_route, opt0.options ?? [], interaction);
	}else{
		if('handler' in route) {
			if(interaction.raw_interaction.type !== d.InteractionType.ApplicationCommand) {
				return await info.error("Expected a command interaction. This should never happen.");
			}
			return await route.handler(info, interaction.raw_interaction, options);
		}

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

		return handler.handler([route.preload ?? [], (options || []).map(opt => (
			'value' in opt ? "" + opt.value || "" : "!!ERROR:"+opt.type+"!!"
		))].flat(), info);
	}
}

// TODO update to built in discordjs stuff rather than api raw
// api raw was nice while it lasted because I didn't have to think about caches and stuff

// TODO don't do that; migrate to api raw
// potential issues: may have to worry about retry functionality and stuff

async function do_handle_interaction(interaction: d.APIInteraction | d.APIModalSubmitInteraction) {
	const startTime = Date.now();

	const interaction_helper = new InteractionHelper(interaction);

	logCommand(interaction.guild_id, interaction.channel_id, false, interaction.user?.id, 
		(interaction.type === 2 ? "/"+interaction.data.name : "@"+interaction.type)+": "+JSON.stringify(interaction.data)
	);
	if(interaction.guild_id === undefined
	|| interaction.channel_id === undefined) {
		return await interaction_helper.replyHiddenHideCommand("× DMs not supported.");
	}
    
	if(interaction.type === d.InteractionType.MessageComponent || interaction.type === d.InteractionType.ModalSubmit) {
		console.log(interaction);

		const guild = client.guilds.cache.get(interaction.guild_id)!;
		const channel = client.channels.cache.get(interaction.channel_id)! as discord.Message["channel"];
		// @ts-expect-error
		const member = guild.members._add(interaction.member);
		let message: discord.Message | undefined;
		
		if(interaction.message && 'type' in interaction.message) {
			// @ts-expect-error
			message = channel.messages._add(interaction.message);
		}else{}

		const message_like = { // weird; the message is sent by interpunct but the author is set to the interactor
			channel: message?.channel ?? channel,
			guild: message?.guild ?? guild,
			member: member,
			author: member.user,
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

		if(interaction.type === d.InteractionType.MessageComponent) {
			const data = interaction.data;

			const idv = data.custom_id.split("|")[0]!.replace(/^#.+?#/, "");
			const inh = ginteractionhandler[idv];
			// note: does not check for channel view perms
			if(inh) {
				const result = await ilt(inh.handle(info, data.custom_id), "button click on "+data.custom_id);
				if(result.error) {
					if(result.error.message.includes("Invalid Form Body")) {
						return await info.error("An internal error occured while handling this button click."
						+" Error code: `"+result.error.errorCode+"`"+"\n"+"Note: This error may "
						+"be caused by an incorrect emoji in a button. The error text is:\n"+
						"```\n"+result.error.message+"\n```");
					}
					return await info.error("An internal error occured while handling this button click."
					+" Error code: `"+result.error.errorCode+"`");
				}
				return result.result;
			}
			return await info.error("Unsupported button kind `"+idv+"`.");
		}else{
			const data = interaction.data;

			const handler = textinput_handlers.get(data.custom_id);
			if(!handler) {
				return await interaction_helper.replyHiddenHideCommand("× Modal expired.");
			}
			const value = data.components?.[0]?.components?.[0]?.value;
			if(value == null) {
				return await interaction_helper.replyHiddenHideCommand("× No value.");
			}

			return handler(value, info);
		}
	}else if(interaction.type !== d.InteractionType.ApplicationCommand) {
		return await interaction_helper.replyHiddenHideCommand("× Interaction not supported.");
	}
    
	const data = interaction.data;

	console.log("Got interaction: ", util.inspect(interaction.data, false, null, true));
	// construct an info object
	const guild = client.guilds.cache.get(interaction.guild_id)!;
	const channel = client.channels.cache.get(interaction.channel_id)! as discord.Message["channel"];
	// @ts-expect-error
	const member = guild.members._add(interaction.member);
    
	const mlike: MessageLike = {
		channel,
		guild,
		member,
		author: member.user,
		client,
		content: "*no content*",
		delete: async () => {
			// nothing to do.
		},
	};
	const info = new Info(mlike, timedEvents!, {
		startTime,
		infoPerSecond: -1,
		raw_interaction: interaction_helper,
	});

	const my_channel_perms = info.myChannelPerms!;
	if(!my_channel_perms.has("VIEW_CHANNEL")) {
		return await interaction_helper.replyHiddenHideCommand("Commands cannot be used in this channel because I don't have permission to see it.");
	}

	// if(interaction.data.type === d.ApplicationCommandType.User) {
	// 	context_menu_command_router.user[];
	// }

	if(interaction.data.type === d.ApplicationCommandType.User) {
		const route = context_menu_command_router.user[interaction.data.name];
		if(!route) return await interaction_helper.replyHiddenHideCommand("× Unsupported interaction / This command should not exist");
		return await route.handler(info, {
			user: interaction.data.resolved.users[interaction.data.target_id],
			member: interaction.data.resolved.members?.[interaction.data.target_id],
			interaction: interaction as d.APIUserApplicationCommandInteraction,
		});
	}
	if(interaction.data.type === d.ApplicationCommandType.Message) {
		const route = context_menu_command_router.message[interaction.data.name];
		if(!route) return await interaction_helper.replyHiddenHideCommand("× Unsupported interaction / This command should not exist");
		return await route.handler(info, {
			message: interaction.data.resolved.messages[interaction.data.target_id],
			interaction: interaction as d.APIMessageApplicationCommandInteraction,
		});
	}
	if(interaction.data.type !== d.ApplicationCommandType.ChatInput) {
		return await interaction_helper.replyHiddenHideCommand("× This type of command is not yet supported.");
	}
    
	const route = slash_command_router[data.name];
	if(!route) return await info.error("Unsupported interaction / This command should not exist.");

	return await handle_interaction_routed(info, data.name, route, interaction.data.options || [], interaction_helper);
}

export type SlashCommandRouteBottomLevelAutomatic = {
    route?: string,
    preload?: string,
    description?: string, // if no description is specified, it will be chosen from the route
    args?: {[key: string]: SlashCommandOptionNameless},
	args_raw?: d.APIApplicationCommandBasicOption[],
    arg_stringifier?: (args: d.APIApplicationCommandInteractionDataOption[]) => string,
};
export type SlashCommandRouteBottomLevelCallback = {
	handler: (
		info: Info,
		interaction: d.APIApplicationCommandInteraction,
		options: d.APIApplicationCommandInteractionDataOption[],
	) => Promise<void>,
	description: string,
    args?: {[key: string]: SlashCommandOptionNameless},
	args_raw?: d.APIApplicationCommandBasicOption[],
};

export type SlashCommandRouteBottomLevel =
	| SlashCommandRouteBottomLevelAutomatic
	| SlashCommandRouteBottomLevelCallback
;
export type SlashCommandRouteSubcommand = {
    description: string,
	default_permission?: boolean | undefined,
    subcommands: {[key: string]: SlashCommandRouteBottomLevel} | {[key: string]: SlashCommandRouteSubcommand},
};
export type SlashCommandRoute = SlashCommandRouteBottomLevel | SlashCommandRouteSubcommand;

const opt = {
	oneOf(description: string, choices: {[key: string]: string}): SlashCommandOptionNameless {
		if(description.length > 100) throw new Error("max 100 len desc");
		return {
			type: d.ApplicationCommandOptionType.String,
			description,
			required: true,
			choices: Object.entries(choices).map(([value, key]) => ({name: key, value})),
		};
	},
	channel(description: string): SlashCommandOptionNameless {
		if(description.length > 100) throw new Error("max 100 len desc");
		return {type: 7, description, required: true};
	},
	string(description: string): SlashCommandOptionNameless {
		if(description.length > 100) throw new Error("max 100 len desc");
		return {type: 3, description, required: true};
	},
	// boolean is not necessary, oneOf is better in almost every case.
	integer(description: string): SlashCommandOptionNameless {
		if(description.length > 100) throw new Error("max 100 len desc");
		return {type: 4, description, required: true};
	},
	user(description: string): SlashCommandOptionNameless {
		if(description.length > 100) throw new Error("max 100 len desc");
		return {type: 6, description, required: true};
	},
	role(description: string): SlashCommandOptionNameless {
		if(description.length > 100) throw new Error("max 100 len desc");
		return {type: 8, description, required: true};
	},
	// TODO update when discord adds multiline support
	multiline(description: string): SlashCommandOptionNameless {
		if(description.length > 100) throw new Error("max 100 len desc");
		return {type: 3, description, required: true};
	},
	optional(scon: SlashCommandOptionNameless): SlashCommandOptionNameless {
		return {...scon, required: false} as any;
	},
};

export type SlashCommandRouter = {[key: string]: SlashCommandRoute};

const slash_command_router: SlashCommandRouter = {
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
			goi: {},
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
			logs: {route: "ticket logs", args: {log_channel: opt.channel("Channel for pretty logs")}},
			logs_transcripts: {route: "ticket logs", args: {log_channel: opt.channel("Channel for immediate transcripts of every message sent in a ticket")}},
			ping: {route: "ticket ping", args: {who: opt.string("Who to ping after someone says something in their ticket")}},
			autoclose: {route: "ticket autoclose", args: {time: opt.string("How long until the ticket is auto closed. Eg: 15 min. Use 0s to disable.")}},
			deletetime: {route: "ticket deletetime", args: {time: opt.string("How long from trash can to gone ticket. Default: 1 min")}},
			diagnose: {route: "ticket diagnose"},
			creatorcanclose: {route: "ticket creatorcanclose", args: {can: opt.oneOf("Can close?", {yes: "Yes", no: "No"})}},
			dmonclose: {route: "ticket dmonclose", args: {dm: opt.oneOf("DM creator on close?", {yes: "Yes", no: "No"})}},
			disable: {route: "ticket disable"},
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

type ContextMenuCommand<T> = {
	handler: (info: Info, a: T) => Promise<void>,
};

export type ContextMenuCommandRouter = {
	user: {[key: string]: ContextMenuCommand<{
		user: d.APIUser,
		member: d.APIInteractionDataResolvedGuildMember | undefined,
		interaction: d.APIUserApplicationCommandInteraction,
	}>},
	message: {[key: string]: ContextMenuCommand<{
		message: d.APIMessage,
		interaction: d.APIMessageApplicationCommandInteraction,
	}>},
};

const context_menu_command_router: ContextMenuCommandRouter = {
	user: {},
	message: {
		// 'View Source': {
		// 	handler: async (info, {message}) => {
		// 		// wait can't I upload a text file now
		// 		// https://discord.com/developers/docs/reference#uploading-files ok yeah I can
		// 		// but I don't feel like figuring out that mess rn

		// 		const resurl =
		// 			"https://pfg.pw/spoilerbot/spoiler?s=" +
		// 			encodeURIComponent(message.content);
		// 		const postres = await shortenLink(resurl);
		// 		if ("error" in postres) return await info.error(postres.error);
				
		// 		await info.result("Message source: <" + postres.url + ">");
		// 		return;
		// 	},
		// },
		// 'Edit Message': {
		// 	handler: async (info, {message}) => {
		// 		const handler = globalCommandNS["editmsg"];
		// 		if(!handler) throw new Error("missing handler for editmsg");
		// 		// hacky. ideally we'd just use the data given to us in the interaction
		// 		// to check permissions and stuff rather than doing this hack
		// 		return handler.handler([
		// 			"https://discord.com/channels/"+info.guild?.id+"/"+message.channel_id+"/"+message.id,
		// 		], info);
		// 	},
		// },
	},
};

registerFancylib(context_menu_command_router, slash_command_router);

const global_slash_commands: {[key: string]: NamelessAPIApplicationCommand} = {};

function createBottomLevelCommand(cmdname: string, cmddata: SlashCommandRouteBottomLevel): Omit<
	UnsubmittedAPIApplicationCommand, "type" | "options"
> & {
	options: d.APIApplicationCommandBasicOption[],
} {
	let docs_desc = "error; no description provided";
	if('handler' in cmddata) {
		// nothing to do
	}else{
		const base_command_name = cmddata.route ?? cmdname;
		const base_command = globalCommandNS[base_command_name];
		if(!base_command) throw new Error("Undefined command `"+base_command_name+"`");
		const base_command_docs = globalDocs[base_command.docsPath];
		docs_desc = base_command_docs.summaries.description;
	}

	if(cmddata.description && cmddata.description.length > 100) throw new Error("max length 100");
	let final_desc = cmddata.description ?? docs_desc;
	if(final_desc.length > 100) final_desc = final_desc.substr(0, 99) + "…";

	return {
		// type: d.ApplicationCommandType.ChatInput,
		name: cmdname,
		description: final_desc,
		options: [...Object.entries(cmddata.args ?? {}).map(([optname, optvalue]): d.APIApplicationCommandBasicOption => {
			return {...optvalue, name: optname};
		}), ...(cmddata.args_raw ?? [])],
	};
}

for(const [cmdname, cmddata] of Object.entries(slash_command_router)) {
	if('subcommands' in cmddata) {
		if(Object.entries(cmddata.subcommands).length > 25) throw new Error("Max 25 subcommands");
		global_slash_commands[cmdname] = {
			type: d.ApplicationCommandType.ChatInput,
			description: cmddata.description,
			default_permission: cmddata.default_permission,
			options: Object.entries(cmddata.subcommands).map(([scname, scdata_raw]): d.APIApplicationCommandOption => {
				const scdata = scdata_raw as SlashCommandRouteBottomLevel | SlashCommandRouteSubcommand;
				if('subcommands' in scdata) {
					if(Object.entries(scdata.subcommands).length > 25) throw new Error("Max 25 subsubcommands");
					return {
						type: d.ApplicationCommandOptionType.SubcommandGroup,
						name: scname,
						description: scdata.description,
						options: Object.entries(scdata.subcommands).map(([sscname, sscdata_raw]): d.APIApplicationCommandSubcommandOption => {
							if('subcommands' in sscdata_raw) throw new Error("too nested!");
							const sscdata = sscdata_raw as SlashCommandRouteBottomLevel;
							return {
								type: d.ApplicationCommandOptionType.Subcommand,
								...createBottomLevelCommand(sscname, sscdata),
							};
						}),
					};
				} else {
					return {
						type: d.ApplicationCommandOptionType.Subcommand,
						...createBottomLevelCommand(scname, scdata),
					};
				}
			}),
		};
		continue;
	}
	global_slash_commands[cmdname] = {
		type: d.ApplicationCommandType.ChatInput,
		...createBottomLevelCommand(cmdname, cmddata),
	};
}
for(const [cmdname] of Object.entries(context_menu_command_router.user)) {
	global_slash_commands[cmdname] = {
		type: d.ApplicationCommandType.User,
		description: "",
	};
}
for(const [cmdname] of Object.entries(context_menu_command_router.message)) {
	global_slash_commands[cmdname] = {
		type: d.ApplicationCommandType.Message,
		description: "",
	};
}

if(Object.entries(global_slash_commands).length > 100) throw new Error("Max 100 slash commands");

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
async function getCommands(): Promise<d.APIApplicationCommand[]> {
	if(!shouldUpdateCommandsHere()) throw new Error("Not supposed to update commands here");
	if(production) {
		return await api.api.applications(client.user!.id).commands.get<d.APIApplicationCommand[]>();
	}else{
		return await api.api.applications(client.user!.id).guilds(devCommandGuild).commands.get<d.APIApplicationCommand[]>();
	}
}

async function addCommand(command_data: UnsubmittedAPIApplicationCommand): Promise<d.APIApplicationCommand> {
	if(!shouldUpdateCommandsHere()) throw new Error("Not supposed to update commands here");
	if(production) {
		return await api.api.applications(client.user!.id).commands.post<{data: UnsubmittedAPIApplicationCommand}, d.APIApplicationCommand>({data: command_data});
	}else{
		return await api.api.applications(client.user!.id).guilds(devCommandGuild).commands.post<{data: UnsubmittedAPIApplicationCommand}, d.APIApplicationCommand>({data: command_data});
	}
}

async function removeCommand(command_id: string): Promise<void> {
	if(!shouldUpdateCommandsHere()) throw new Error("Not supposed to update commands here");
	if(production) {
		await api.api.applications(client.user!.id).commands(command_id).delete();
	}else{
		await api.api.applications(client.user!.id).guilds(devCommandGuild).commands(command_id).delete();
	}
}

function normalizeSCO(inv: d.APIApplicationCommandOption[]): d.APIApplicationCommandOption[] {
	return JSON.parse(JSON.stringify(inv), (key, value) => {
		if(typeof value === "object") {
			for(const [k, v] of Object.entries(value)) {
				if(Array.isArray(v) && v.length === 0) delete value[k];
				if(k === "required" && v === false) delete value[k];
			}
		}
		return value;
	});
}

function compareOptions(remote: d.APIApplicationCommandOption[], local: d.APIApplicationCommandOption[]): "same" | "different" {
	if(deepEqual(normalizeSCO(local), normalizeSCO(remote), {strict: false})) return "same";
	return "different";
}

function compareCommands(remote: d.APIApplicationCommand, local: UnsubmittedAPIApplicationCommand): "same" | "different" {
	if(remote.description !== local.description && local.type === d.ApplicationCommandType.ChatInput) return "different";
	if((remote.default_permission ?? true) !== (local.default_permission ?? true)) return "different";
	if(compareOptions(remote.options ?? [], local.options ?? []) === "different") return "different";
	return "same";
}

export async function start(): Promise<void> {
	// get list of global slash commands
	// update to match

	client.ws.on("INTERACTION_CREATE" as any, on_interaction);

	// NOTE that this only has to be done on shard 0
	if(!shouldUpdateCommandsHere()) {
		console.log("Not updating slash commands on this shard/config");
		return;
	}

	// https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
	// we can just use this now
	// > Commands that do not already exist will count toward daily application command create limits

	const current_slash_commands = await getCommands();

	// console.log("Current slash commands: ",current_slash_commands);
	// update slash commands to match global slash commands

	for(const remote of current_slash_commands) {
		const local_user = global_slash_commands[remote.name];
		if(!local_user) {
			console.log("Removing command: "+remote.name+" (id "+remote.id+")");
			await removeCommand(remote.id);
			console.log("√ Removed");
			continue;
		}
		const local = {...local_user, name: remote.name};
		if(remote.type !== local.type) {
			console.log("Re-adding command: "+remote.name+" (id "+remote.id+")");
			await removeCommand(remote.id);
			console.log("... Removed");
			const res = await addCommand(local);
			console.log("√ Re-added", res);
			continue;
		}
		if(compareCommands(remote, local) === "different") {
			console.log("Updating command: "+remote.name+" (id "+remote.id+")");
			const res = await addCommand(local);
			console.log("√ Edited", res);
			continue;
		}
	}
	for(const [cmd_name, new_command] of Object.entries(global_slash_commands)) {
		const cmd_full: UnsubmittedAPIApplicationCommand = {...new_command, name: cmd_name};
		if(!current_slash_commands.find(csc => csc.name === cmd_name)) {
			console.log("Adding new command: "+cmd_name);
			const res = await addCommand(cmd_full);
			console.log("√ Added", res);
		}
	}
	console.log("Slash commands up to date!");
}
