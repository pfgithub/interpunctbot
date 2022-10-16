import * as d from "discord-api-types/v9";
import { promises as fs } from "fs";
import path from "path";
import { SlashCommand, SlashCommandElement, u } from "../../../fancylib";

export default function Command(): SlashCommandElement {
    return SlashCommand({
        label: u("restart"),
        description: u("Restart the bot"),
        args: {},
        // permissions: () => {user_id: "341076015663153153"}
        onSend: ev => {
            return {
                kind: "new_message",
                deferred: true,
                config: {visibility: "private"},
                value: async () => {
                    await fs.writeFile(
                        path.join(process.cwd(), ".restarting_interaction"),
                        JSON.stringify({
                            route: d.Routes.webhookMessage(
                                ev.interaction.application_id, ev.interaction.token,
                            ),
                            time: Date.now(),
                        }),
                        "utf-8",
                    );
                    process.exit(0);
                },
            };
        },
    });
}