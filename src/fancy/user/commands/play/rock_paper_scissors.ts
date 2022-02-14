import { renderError, SlashCommand, SlashCommandElement, u } from "../../../fancylib";
import { rps } from "../../persistent/rock_paper_scissors";

export default function Command(): SlashCommandElement {
    return SlashCommand({label: u("rock_paper_scissors"), description: u("Play a game of rock paper scissors"), children: [
        // player?: User
        // thing?: string, oninput=(text) => [array of suggestions]
    ], onSend: event => {
        const user = event.interaction.member?.user ?? event.interaction.user;
        if(!user) return renderError(u("No User"));
        return rps({
            p1: {id: user.id, choice: null},
            p2: null,
        }, {visibility: "public"});
    }});
}