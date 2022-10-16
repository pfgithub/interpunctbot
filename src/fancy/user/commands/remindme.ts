import { queueEvent } from "../../lib/TimedEventsAt2";
import { ErrorMsg, Message, MessageElement, renderDeferred, renderError, SlashCommand, SlashCommandArgDuration, SlashCommandArgText, SlashCommandElement, SlashCommandInteractionResponse, u } from "../../fancylib";

export default function Command(): SlashCommandElement {
    return SlashCommand({label: u("remindme"), description: u("A message to yourself in the future. It's almost like time travel."), args: {
        when: SlashCommandArgDuration({description: "When to remind. Example: 1hr 10min"}),
        message: SlashCommandArgText({description: "Message to send to you"}),
        // player?: User
        // thing?: string, oninput=(text) => [array of suggestions]
    }, onSend: (event): SlashCommandInteractionResponse => {
        const {when, message} = event.args;

        return renderDeferred({visibility: "private"}, async (): Promise<MessageElement> => {
            if(event.interaction.guild_id == null) return ErrorMsg(u("Not supported in DMs"));

            await queueEvent({
                for_guild: event.interaction.guild_id,
                content: {
                    kind: "send_pm",
                    user_id: event.interaction.member?.user.id ?? event.interaction.user?.id ?? 0 as never,
                    message: `Reminder in <#${event.interaction.channel_id}> from ${Math.floor(Date.now() / 1000)}:\n${message
                        .split("\n")
                        .map(l => "> " + l)
                        .join("\n")}`,
                },
            }, when);

            const restime = new Date().getTime() + when;

            return Message({
                text: u("Reminder set for <t:"+Math.floor(restime / 1000)+"> (<t:"+Math.floor(restime / 1000)+":R>)"),
            });
        });
    }});
}