import client, { timedEvents } from "../bot";
import * as discord from "discord.js";
import { ilt, production } from "..";
import { globalConfig } from "./config";
import Info, {MessageLike} from "./Info";
import { globalCommandNS, globalDocs } from "./NewRouter";
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

type DiscordInteraction = {
    id: string; // interaction id
    token: string; // interaction token
    guild_id: string;
    channel_id: string;
    member: {user: {id: string}}; // TODO add this to the discord member cache // in the future this will be done automatically so nah
    data: UsedCommand;
};

type SlashCommandOption = {
    type: 2;
    name: string;
    description: string;
    options: SlashCommandOption[];
} | {
    type: 1;
    name: string;
    description: string;
    options?: SlashCommandOption[];
} | {
    // string
    type: 3;
    name: string;
    description: string;
    required: boolean;
    choices?: {name: string; value: string}[];
} | {
    // boolean. this is pretty much useless and string should always be used instead.
    type: 5;
    name: string;
    description: string;
    required: boolean;
};
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

function on_interaction(interaction: DiscordInteraction) {
    ilt(do_handle_interaction(interaction), false).then(async res => {
        if(res.error) {
            console.log("handle interaction failed with", res.error);
            await api.api.webhooks(client.user!.id, interaction.token).post({data: {
                type: 4,
                data: {content: "Uh oh! Something went wrong while handling this interaction"},
            }});
            return;
        }
    }).catch(e => console.log("handle interaction x2 failed", e));
}
async function do_handle_interaction(interaction: DiscordInteraction) {
    const startTime = Date.now();
    await api.api.interactions(interaction.id, interaction.token).callback.post({data: {
        type: 4,
        data: {content: "Handling interaction…"},
    }});
    await api.api.webhooks(client.user!.id, interaction.token).messages("@original").delete();

    console.log("Got interaction: ", interaction.data);
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
    });

    const data = interaction.data;

    if(data.name === "play" || data.name === "set") {
        const subcommand = data.options?.[0];
        if(!subcommand) return await info.error("No subcommand. This should never happen.");
        
        const handler = globalCommandNS[subcommand.name];
        if(!handler) return await info.error("Could not find handler. This should never happen.");

        return handler.handler((subcommand.options || []).map(opt => opt.value || "").join(" "), info);
    }else {
        return await info.error("Unsupported interaction");
    }
    // globalCommandNS["tic tac toe"].handler("", info);
}

function createBaseCommandItem(base_command: string, options?: SlashCommandOption[]): {name: string; description: string; type: 1; options?: SlashCommandOption[]} {
    let desc = globalDocs[globalCommandNS[base_command].docsPath].summaries.description;
    if(desc.length > 100) {
        desc = desc.substring(0, 99) + "…";
    }
    return {
        name: base_command,
        description: desc,
        type: 1,
        options,
    };
}

function createBaseCommandMenu(...base_commands: string[]): SlashCommandOption[] {
    const res: SlashCommandOption[] = [];
    for(const base_command of base_commands) {
        res.push(createBaseCommandItem(base_command));
    }
    if(res.length > 10) throw new Error("Max 10 subcommands per command");
    return res;
}

function pickOption(name: string, description: string, choices: {[key: string]: string}): SlashCommandOption {
    // object order is defined.
    return {
        type: 3,
        name,
        description,
        required: true,
        choices: Object.entries(choices).map(([value, key]) => ({name: key, value})),
    }
}

const global_slash_commands: {[key: string]: SlashCommandNameless} = {
    test: {
        description: "Test a slash command from botdev",
    },
    play: {
        description: "Play a game",
        options: createBaseCommandMenu(
            "connect4",
            "minesweeper",
            "papersoccer",
            "ultimatetictactoe",
            "checkers",
            "circlegame",
            "tictactoe",
            "randomword",
            "trivia",
            "needle"
        ),
    },
    set: {
        description: "Configure settings",
        // this could be done the other way around - {fun: do({to: oneof({enable: "On", disable: "Off"})})}
        // things might change though so who knows
        options: [
            createBaseCommandItem("fun", [pickOption("to", "allow or deny fun", {enable: "On", disable: "Off"})]),
        ],
    },
    // TODO a command like /set fun on/off that accepts one of those parameter things
};
if(Object.entries(global_slash_commands).length > 50) throw new Error("Max 50 slash commands");

let __is_First_Shard: boolean | undefined = undefined;
function firstShard() {
    if(__is_First_Shard !== undefined) return __is_First_Shard;
    const values = client.guilds.cache.values();
    const first = values.next();
    if(first.done) return false;
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

function compareOptions(remote: SlashCommandOption[], local: SlashCommandOption[]): "same" | "different" {
    if(deepEqual(local, remote)) return "same";
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

    console.log("Current slash commands: ",current_slash_commands);
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