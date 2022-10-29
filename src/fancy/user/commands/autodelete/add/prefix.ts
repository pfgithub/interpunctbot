import client from "../../../../../../bot";
import Database, { AutodeleteRuleNoID } from "../../../../../Database";
import { durationFormat } from "../../../../../durationFormat";
import { Message, renderEphemeral, renderError, SlashCommand, SlashCommandArgDuration, SlashCommandArgText, SlashCommandElement, u } from "../../../../fancylib";

export default function Command(): SlashCommandElement {
    return SlashCommand({
        label: u("prefix"),
        description: u("Automatically remove messages starting with a certain prefix after a certain time period"),
        args: {
            prefix: SlashCommandArgText({
                description: "Prefix to remove messages starting with",
            }),
            time: SlashCommandArgDuration({
                description: "How long until the message gets removed?",
            }),
        },
        onSend: async (ev) => {
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
            const guild = await client.guilds.fetch(ev.interaction.guild_id);
	        // @ts-expect-error
            const sender = guild.members._add(ev.interaction.member);

            if(!sender.permissions.has("ManageGuild")) {
                const db = new Database(guild.id);
                const mng_bot_role = await db.getManageBotRole();
                if(mng_bot_role.role === "" || !ev.interaction.member.roles.includes(mng_bot_role.role)) {
                    return renderError(u("You need permission to MANAGE_GUILD or have <@&"+mng_bot_role.role+"> to use this command."));
                }
            }
            if(!sender.permissions.has("ManageMessages")) {
                return renderError(u("You need permission to MANAGE_MESSAGES to use this command."));
            }
            if(!(await guild.members.fetchMe()).permissions.has("ManageMessages")) {
                return renderError(u("Interpunct needs permission to MANAGE_MESSAGES to use this command. Check:\n- Interpunct has permission to manage messages"));
            }

            const db = new Database(ev.interaction.guild_id);

            const autodelete_rule: AutodeleteRuleNoID = {
                type: "prefix",
                prefix: ev.args.prefix,
                duration: ev.args.time,
            };

            const autodeleteLimit = await db.getAutodeleteLimit();
            if ((await db.getAutodelete()).rules.length >= autodeleteLimit)
                return renderError(u(
                    "This server has reached its autodelete limit (" +
                        autodeleteLimit +
                        ").\n> To increase this limit, ask on the support server\n> Make sure to include your server id which is `"+guild.id+"`\n> https://discord.gg/fYFZCaG25k",
                )); // !!!
            const autodeleteID = await db.addAutodelete(autodelete_rule);
            return renderEphemeral(
                Message({
                    text: u("These types of messages will be automatically deleted after " +
                    durationFormat(ev.args.time) +
                    ".\n> To remove this rule, `ip!autodelete remove " +
                    autodeleteID +
                    "`"),
                }),
                {visibility: "public"},
            );
        },
    });
}
