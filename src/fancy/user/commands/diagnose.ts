import client from "../../../../bot";
import Database, { CustomCommand } from "../../../Database";
import { Message, renderEphemeral, renderError, SlashCommand, SlashCommandArgAutocompletableText, SlashCommandElement, SlashCommandInteractionResponse, u } from "../../fancylib";

/*
: give info eg server id
: list recent errors (not yet - we'll have to improve how errors are stored in the db)
: check autodelete permissions
: check ticket setup and permissions
: …
*/

export default function Command(): SlashCommandElement {
    return SlashCommand({label: u("diagnose"), description: u("Try to diagnose issues in interpunct setup"), args: {
        //
    }, onSend: async (event): Promise<SlashCommandInteractionResponse> => {
        // DIAGNOSTICS:
        if(event.interaction.guild_id == null) return renderError(u("guild null"));
        const guild_id = event.interaction.guild_id;

        const guild_djs = client.guilds.cache.get(guild_id);
		const shardv = guild_djs ? ` (shard id ${guild_djs.shardId})` : "";

        const db = new Database(guild_id);

        const modules: string[] = [];

        {
            modules.push(`Diagnostics:
Server ID: \`${guild_id}\`${shardv}`);
        }

        const autodelete_info = await db.getAutodelete();
        if(autodelete_info.rules.length > 0) {
            modules.push(`Autodelete:
Diagnostics for autodelete are not implemented yet. If you are having trouble with autodelete, you can ask for help on the support server`);
        }

        if(await db.ticketConfigured()) {
            // !TODO! %TODO% @TBD@ *FIX* use a real command mention instead of a hardcoded one
            modules.push(`Tickets:
Use </ticket diagnose:791908656953950218> (/ticket diagnose) for diagnostics`);
        }

        modules.push(`Support server:
If you need help with the bot, you can ask on the support server: <https://discord.gg/HVWCeXc>`);

        return renderEphemeral(Message({
            text: u(modules.join("\n\n")),
        }), {visibility: "public"});
    }});
}

// TODO:
// - this duplicates code
// - ideally we could support both slash commands and chat commands from libfancy in order to not duplicate work