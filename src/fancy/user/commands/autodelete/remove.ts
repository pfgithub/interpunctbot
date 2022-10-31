import client from "../../../../../bot";
import Database, { AutodeleteDuration, AutodeleteRule } from "../../../../Database";
import { durationFormat } from "../../../../durationFormat";
import { InteractionResponseNewMessage, Message, renderEphemeral, renderError, SlashCommand, SlashCommandArgAutocompletableText, SlashCommandElement, u } from "../../../fancylib";

function shortfmtrule(rule: AutodeleteRule): string {
    if(rule.type === "channel") {
        const channel = client.channels.cache.get(rule.channel);
        if(channel == null) return "channel";
        if(!('name' in channel)) {
            return "DM";
        }
        return "#"+channel.name;
    }else{
        return rule.type;
    }
}
function shortfmtduration(duration: AutodeleteDuration): string {
    if(typeof duration === "number") {
        return "after " + (typeof duration === "number" ? durationFormat(duration) : "never");
    }else if(duration.type === "autopublish") {
        return "automatically publish";
    }else return "?"+duration.type;
}

export default function Command(): SlashCommandElement {
    return SlashCommand({
        label: u("remove"),
        description: u("Remove an autodelete rule"),
        args: {
            rule: SlashCommandArgAutocompletableText<number>({
                description: "Which rule?",
                autocomplete: async (v, c) => {
                    if(c.interaction.guild_id == null) throw new Error("no guild id");
                    const db = new Database(c.interaction.guild_id);
                    const rules = await db.getAutodelete();

                    const targets = rules.rules.map(rule => {
                        return rule.id + " - " + shortfmtrule(rule) + " " + shortfmtduration(rule.duration);
                    });

                    const num_v = v.value.match(/^[0-9]+/);
                    const vt = +(num_v?.[0] ?? "NaN");
                    if(isNaN(vt)) return {
                        error_msg: "no rule specified",
                        value: null,
                        autocomplete_entries: targets,
                    };

                    return {
                        error_msg: null,
                        value: vt,
                        autocomplete_entries: targets.filter(t => t.startsWith(num_v?.[0] ?? "")),
                    };
                },
            }),
        },
        onSend: async (ev): Promise<InteractionResponseNewMessage> => {
            /*
            const autodelete_perms = {
                runner: ["manage_messages", "manage_bot"],
            } as const;
            // * check that the bot has manage_messages perms in the target channel
            */
            if(ev.interaction.guild_id == null) return renderError(u("Cannot use in DMs"));
            if(ev.interaction.member == null) return renderError(u("Cannot use in DMs"));

            // these caches should always be up to date i think so no need to fetch from them
            // TODO: handle these ourselves rather than going through discord.js
            const target_guild = await client.guilds.fetch(ev.interaction.guild_id);
	        // @ts-expect-error
            const target_member = target_guild.members._add(ev.interaction.member);

            if(!target_member.permissions.has("ManageGuild")) {
                const db = new Database(target_guild.id);
                const mng_bot_role = await db.getManageBotRole();
                if(mng_bot_role.role === "" || !ev.interaction.member.roles.includes(mng_bot_role.role)) {
                    return renderError(u("You need permission to MANAGE_GUILD or have <@&"+mng_bot_role.role+"> to use this command."));
                }
            }

            const db = new Database(target_guild.id);

            const success = await db.removeAutodelete(ev.args.rule);
            if(success) {
                return renderEphemeral(Message({
                    text: u("✓ Removed rule"),
                }), {visibility: "public"});
            }else{
                return renderError(u("Could not find rule "+ev.args.rule+"?"));
            }
        },
    });
}
