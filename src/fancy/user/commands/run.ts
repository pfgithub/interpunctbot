import Database, { CustomCommand } from "../../../Database";
import { ErrorMsg, MessageElement, renderDeferred, SlashCommand, SlashCommandArgAutocompletableText, SlashCommandElement, SlashCommandInteractionResponse, u } from "../../fancylib";

export default function Command(): SlashCommandElement {
    return SlashCommand({label: u("run"), description: u("Run a server command"), args: {
        command: SlashCommandArgAutocompletableText<{name: string, value: CustomCommand}>({
            description: "The command",
            autocomplete: async (v, c) => {
		        const str = v.value.toLowerCase();
                if(c.interaction.guild_id == null) throw new Error("not supported in dms");
                const custom_commands = await new Database(c.interaction.guild_id).getCustomCommands();
                const matching = Object.entries(custom_commands).filter(cc => {
                    if(cc[0].startsWith(str)) {
                        return true;
                    }
                });
                const exact_match = Object.hasOwnProperty.call(custom_commands, str);

                return {
                    value: exact_match ? {name: str, value: custom_commands[str]!} : null,
                    error_msg: exact_match ? null : "Command not found: "+str,
                    autocomplete_entries: matching.map(q => q[0]),
                };
            },
        }),
    }, onSend: (event): SlashCommandInteractionResponse => {
        const {command} = event.args;

        return renderDeferred({visibility: "private"}, async (): Promise<MessageElement> => {
            if(event.interaction.guild_id == null) return ErrorMsg(u("Not supported in DMs"));

            throw new Error("TODO implement this & support args like for quotes !"+command.name);
        });
    }});
}

// TODO:
// - this duplicates code
// - ideally we could support both slash commands and chat commands from libfancy in order to not duplicate work