import { renderError, SlashCommand, SlashCommandArgDuration, SlashCommandArgText, SlashCommandElement, SlashCommandInteractionResponse, u } from "../../fancylib";

export default function Command(): SlashCommandElement {
    return SlashCommand({label: u("remindme"), description: u("A message to yourself in the future. It's almost like time travel."), args: {
        when: SlashCommandArgDuration({description: "When to remind. Example: 1hr 10min"}),
        message: SlashCommandArgText({description: "Message to send to you"}),
        // player?: User
        // thing?: string, oninput=(text) => [array of suggestions]
    }, onSend: (event): SlashCommandInteractionResponse => {
        return renderError(u("TODO remindme slash command ver :: "+event.args.when + ", "+event.args.message));
    }});
}