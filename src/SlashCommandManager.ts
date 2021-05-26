import client, { timedEvents } from "../bot";
import * as discord from "discord.js";
import { ilt, logCommand, production } from "..";
import { globalConfig } from "./config";
import Info, {MessageLike} from "./Info";
import { ginteractionhandler, globalCommandNS, globalDocs } from "./NewRouter";
import deepEqual from "deep-equal";

const api = client as any as ApiHolder;

type ApiHandler = {
    get: <T>() => Promise<T>;
    post: <T, Q>(value: T) => Promise<Q>;
    patch: (value: any) => Promise<any>;
    delete: () => Promise<any>;
} & {[key: string]: ApiHandler} & ((...data: any[]) => ApiHandler);

type ApiHolder = {api: ApiHandler};

type UsedCommandOption = {
    name: string;
    options?: UsedCommandOption[];
    value?: string;
};
type UsedCommand = {
    name: string;
    id: string;
    options?: UsedCommandOption[];
};
type ClickedButton = {
    custom_id: string;
    component_type: number;
};

export type DiscordInteraction = DiscordCommandInteraction | DiscordButtonClickInteraction;

export type DiscordBaseInteraction = {
    id: string; // interaction id
    token: string; // interaction token
};

export type DiscordCommandInteraction = DiscordBaseInteraction & {
    type: 2;
    name: string;
    guild_id: string;
    channel_id: string;
    member: {user: {id: string}}; // TODO add this to the discord member cache // in the future this will be done automatically so nah
    data: UsedCommand;
};
export type DiscordButtonClickInteraction = DiscordBaseInteraction & {
    type: 3;
    version: 1;
    guild_id: string;
    channel_id: string;
    application_id: string;
    message: {id: string; channel_id: string};
    member: {user: {id: string}};
    data: ClickedButton;
};

type SlashCommandOptionNamelessSubcommand = {
    description: string;
    options?: SlashCommandOption[];
};
type SlashCommandOptionNamelessNormal = {
    description: string;
    required: boolean;
};

type SlashCommandOptionNameless =
    | SlashCommandOptionNamelessSubcommand & {type: 1} // sub_command
    | SlashCommandOptionNamelessSubcommand & {type: 2} // sub_command_group
    | SlashCommandOptionNamelessNormal & {type: 3; choices?: {name: string; value: string}[]} // string
    | SlashCommandOptionNamelessNormal & {type: 4; choices?: {name: string; value: number}[]} // integer
    | SlashCommandOptionNamelessNormal & {type: 5} // boolean
    | SlashCommandOptionNamelessNormal & {type: 6} // user
    | SlashCommandOptionNamelessNormal & {type: 7} // channel
    | SlashCommandOptionNamelessNormal & {type: 8} // role
;

type SlashCommandOption = SlashCommandOptionNameless & {
    name: string;
}
type SlashCommandNameless = {
    description: string;
    options?: SlashCommandOption[];
};
type SlashCommandUser = SlashCommandNameless & {
    name: string;
};
type SlashCommand = SlashCommandUser & {
    id: string;
    application_id: string;
};

export type InteractionHandled = {__interaction_handled: true};
const interaction_handled: InteractionHandled = {__interaction_handled: true};

export class InteractionHelper {
    raw_interaction: DiscordInteraction;
    has_ackd: boolean;
    options: UsedCommandOption[];

    constructor(raw_interaction: DiscordInteraction) {
        this.raw_interaction = raw_interaction;
        this.has_ackd = false;
        this.options = undefined as any;
    }
    async sendRaw(value: object) {
        if(this.has_ackd) throw new Error("cannot double interact");
        this.has_ackd = true;
        await api.api.interactions(this.raw_interaction.id, this.raw_interaction.token).callback.post({data: value});
    }
    async acceptLater() {
        await this.sendRaw({
            type: 5,
        });
        return interaction_handled;
    }
    async accept() {
        await this.sendRaw({
            type: 4,
            data: {content: "✓", flags: 1 << 6, allowed_mentions: {parse: []}},
        });
        return interaction_handled;
    }
    async reply(message: string) {
        await this.sendRaw({
            type: 4,
            data: {content: message, allowed_mentions: {parse: []}},
        });
        return interaction_handled;
    }
    async replyHiddenHideCommand(message: string, components: unknown = undefined) {
        await this.sendRaw({
            type: 4,
            data: {content: message, flags: 1 << 6, allowed_mentions: {parse: []}, components},
        });
        return interaction_handled;
    }
}

function on_interaction(interaction: DiscordInteraction) {
    ilt(do_handle_interaction(interaction), false).then(async res => {
        if(res.error) {
            console.log("handle interaction failed with", res.error);
            await api.api.webhooks(client.user!.id, interaction.token).post({data: {
                content: "Uh oh! Something went wrong while handling this interaction",
            }});
            return;
        }
    }).catch(e => console.log("handle interaction x2 failed", e));
}
async function handle_interaction_routed(info: Info, route_name: string, route: SlashCommandRoute, options: UsedCommandOption[], interaction: InteractionHelper): Promise<unknown> {
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

async function do_handle_interaction(interaction: DiscordInteraction) {
    const startTime = Date.now();

    const interaction_helper = new InteractionHelper(interaction);

    logCommand(interaction.guild_id, interaction.channel_id, false, interaction.member.user.id, 
        (interaction.type === 2 ? "/"+interaction.data.name : "@"+interaction.type)+": "+JSON.stringify(interaction.data)
    );
    
    if(interaction.type === 3) {
        const data = interaction.data;

        console.log(interaction);

        const guild = client.guilds.cache.get(interaction.guild_id)!;
        const channel = client.channels.cache.get(interaction.channel_id)! as discord.Message["channel"];
        const member = guild.members.add(interaction.member);
        let message: discord.Message | undefined;

        if('type' in interaction.message) {
            message = channel.messages.add(interaction.message);
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
                    await message.delete({timeout: 10})
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
        return await info.error("Unsupported button.");
    }else if(interaction.type !== 2) {
        return await interaction_helper.replyHiddenHideCommand("× Interaction not supported.");
    }
    
    const data = interaction.data;

    console.log("Got interaction: ", require("util").inspect(interaction.data, false, null, true));
    // construct an info object
    const guild = client.guilds.cache.get(interaction.guild_id)!;
    const channel = client.channels.cache.get(interaction.channel_id)! as discord.Message["channel"];
    const member = guild.members.add(interaction.member);
    
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
    
    const route = slash_command_router[data.name];
    if(!route) return await info.error("Unsupported interaction / This command should not exist.");

    return await handle_interaction_routed(info, data.name, route, data.options || [], interaction_helper);
}

type SlashCommandRouteBottomLevel = {
    route?: string;
    preload?: string;
    description?: string; // if no description is specified, it will be chosen from the route
    args?: {[key: string]: SlashCommandOptionNameless};
    arg_stringifier?: (args: UsedCommandOption[]) => string;
};
type SlashCommandRouteSubcommand = {
    description: string;
    subcommands: {[key: string]: SlashCommandRouteBottomLevel} | {[key: string]: SlashCommandRouteSubcommand};
};
type SlashCommandRoute = SlashCommandRouteBottomLevel | SlashCommandRouteSubcommand;

const opt = {
    oneOf(description: string, choices: {[key: string]: string}): SlashCommandOptionNameless {
        if(description.length > 100) throw new Error("max 100 len desc");
        return {
            type: 3,
            description,
            required: true,
            choices: Object.entries(choices).map(([value, key]) => ({name: key, value})),
        }
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

const slash_command_router: {[key: string]: SlashCommandRoute} = {
    test: {},
    ping: {},
    help: {args: {command: opt.optional(opt.string("Command/page to get help for"))}},
    play: {
        description: "Play a game",
        subcommands: {
            connect4: {}, minesweeper: {},
            papersoccer: {}, ultimatetictactoe: {},
            checkers: {}, circlegame: {},
            tictactoe: {},
            randomword: {args: {custom_word: opt.optional(opt.string("A custom word. Costs 5 trophies."))}},
            trivia: {}, needle: {},
            tictactoe2: {route: "ttt2"},
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
    }
};

const global_slash_commands: {[key: string]: SlashCommandNameless} = {};

function createBottomLevelCommand(cmdname: string, cmddata: SlashCommandRouteBottomLevel): SlashCommandUser {
    const base_command_name = cmddata.route ?? cmdname;
    const base_command = globalCommandNS[base_command_name];
    if(!base_command) throw new Error("Undefined command `"+base_command_name+"`");
    const base_command_docs = globalDocs[base_command.docsPath];
    const docs_desc = base_command_docs.summaries.description;

    if(cmddata.description && cmddata.description.length > 100) throw new Error("max length 100");
    let final_desc = cmddata.description ?? docs_desc;
    if(final_desc.length > 100) final_desc = final_desc.substr(0, 99) + "…";

    return {
        name: cmdname,
        description: final_desc,
        options: Object.entries(cmddata.args ?? {}).map(([optname, optvalue]) => {
            return {...optvalue, name: optname};
        }),
    };
}

for(const [cmdname, cmddata] of Object.entries(slash_command_router)) {
    if('subcommands' in cmddata) {
        if(Object.entries(cmddata.subcommands).length > 25) throw new Error("Max 25 subcommands");
        global_slash_commands[cmdname] = {
            description: cmddata.description,
            options: Object.entries(cmddata.subcommands).map(([scname, scdata_raw]) => {
                const scdata = scdata_raw as SlashCommandRouteBottomLevel | SlashCommandRouteSubcommand;
                if('subcommands' in scdata) {
                    if(Object.entries(scdata.subcommands).length > 25) throw new Error("Max 25 subsubcommands");
                    return {
                        type: 2,
                        name: scname,
                        description: scdata.description,
                        options: Object.entries(scdata.subcommands).map(([sscname, sscdata_raw]) => {
                            if('subcommands' in sscdata_raw) throw new Error("too nested!");
                            const sscdata = sscdata_raw as SlashCommandRouteBottomLevel;
                            return {type: 1, ...createBottomLevelCommand(sscname, sscdata)};
                        }),
                    };
                } else {
                    return {type: 1, ...createBottomLevelCommand(scname, scdata)};
                }
            }),
        };
        continue;
    }
    const v = createBottomLevelCommand(cmdname, cmddata);
    global_slash_commands[cmdname] = v;
}

if(Object.entries(global_slash_commands).length > 50) throw new Error("Max 50 slash commands");

let __is_First_Shard: boolean | undefined = undefined;
function firstShard() {
    if(__is_First_Shard !== undefined) return __is_First_Shard;
    const values = client.guilds.cache.values();
    const first = values.next();
    if(first.done) return false;
    console.log("This shard is:",first.value.shardID);
    __is_First_Shard = first.value.shardID == 0;
    return __is_First_Shard;
}

function shouldUpdateCommandsHere() {
    if(production) return firstShard();
    return !!devCommandGuild;
}

const devCommandGuild = globalConfig.slashCommandServer;
async function getCommands(): Promise<SlashCommand[]> {
    if(!shouldUpdateCommandsHere()) throw new Error("Not supposed to update commands here");
    if(production) {
        return await api.api.applications(client.user!.id).commands.get<SlashCommand[]>();
    }else{
        return await api.api.applications(client.user!.id).guilds(devCommandGuild).commands.get<SlashCommand[]>();
    }
}

async function addCommand(command_data: SlashCommandUser): Promise<SlashCommand> {
    if(!shouldUpdateCommandsHere()) throw new Error("Not supposed to update commands here");
    if(production) {
        return await api.api.applications(client.user!.id).commands.post<{data: SlashCommandUser}, SlashCommand>({data: command_data});
    }else{
        return await api.api.applications(client.user!.id).guilds(devCommandGuild).commands.post<{data: SlashCommandUser}, SlashCommand>({data: command_data});
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

function normalizeSCO(inv: SlashCommandOption[]): SlashCommandOption[] {
    return JSON.parse(JSON.stringify(inv), (key, value) => {
        if(typeof value === "object") {
            for(const [k, v] of Object.entries(value)) {
                if(Array.isArray(v) && v.length == 0) delete value[k];
                if(k === "required" && v === false) delete value[k];
            }
        }
        return value;
    });
}

function compareOptions(remote: SlashCommandOption[], local: SlashCommandOption[]): "same" | "different" {
    if(deepEqual(normalizeSCO(local), normalizeSCO(remote), {strict: false})) return "same";
    return "different";
}

function compareCommands(remote: SlashCommand, local: SlashCommandUser): "same" | "different" {
    if(remote.description !== local.description) return "different";
    if(compareOptions(remote.options ?? [], local.options ?? []) === "different") return "different";
    return "same";
}

export async function start() {
    // get list of global slash commands
    // update to match

    client.ws.on("INTERACTION_CREATE" as any, on_interaction);

    // NOTE that this only has to be done on shard 0
    if(!shouldUpdateCommandsHere()) {
        console.log("Not updating slash commands on this shard/config");
        return;
    }

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
        if(compareCommands(remote, local) == "different") {
            console.log("Updating command: "+remote.name+" (id "+remote.id+")");
            const res = await addCommand(local);
            console.log("√ Edited", res);
            continue;
        }
    }
    for(const [cmd_name, new_command] of Object.entries(global_slash_commands)) {
        const cmd_full: SlashCommandUser = {...new_command, name: cmd_name};
        if(!current_slash_commands.find(csc => csc.name == cmd_name)) {
            console.log("Adding new command: "+cmd_name);
            const res = await addCommand(cmd_full);
            console.log("√ Added", res);
        }
    }
    console.log("Slash commands up to date!");
}