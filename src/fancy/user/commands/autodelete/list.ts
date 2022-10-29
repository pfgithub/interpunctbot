import client from "../../../../../bot";
import { printrule } from "../../../../commands/channelmanagement";
import Database from "../../../../Database";
import { InteractionResponseNewMessage, Message, renderEphemeral, renderError, SlashCommand, SlashCommandElement, u } from "../../../fancylib";

export default function Command(): SlashCommandElement {
    return SlashCommand({
        label: u("list"),
        description: u("List autodelete rules"),
        args: {},
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

            const autodelete = await db.getAutodelete();
            return renderEphemeral(Message({
                text: u("Autodelete Rules:\n(Remove with "+commandMention("autodelete remove")+")\n" +
				autodelete.rules
				    .map(
				        (
				            rule, // {Command|"+escape("autodelete remove "+rule.id)+"}
				        ) =>
				            rule.id + " - " +
							printrule(rule),
				    )
				    .join("\n"),),
            }), {visibility: "public"});
        },
    });
}

function commandMention(cmd: string) {
    return "/"+cmd;
    // TODO "</"+cmd+":"+ get command id(cmd.split(" ")[0])+">"
}
