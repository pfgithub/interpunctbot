import fetch from "node-fetch";
import { InteractionResponseNewMessage, Message, renderError, SlashCommand, SlashCommandElement, u } from "../../fancylib";

export default function Command(): SlashCommandElement {
    return SlashCommand({
        label: u("spoiler"),
        description: u("Send an image as a spoiler, helpful for discord mobile users"),
        children: [
            // <arg type="attachment" />
            {kind: "attachment", name: "image" as const, description: "The image will be uploaded as a spoiler"},
        ],
        onSend: (ev): InteractionResponseNewMessage => {
            // deferredInteractionResponse(async () => {
            //     channel.send(…)
            //     return "✓"
            // })

            // actually can't we just send a public response with the image?

            // ev.args.image.value
            // oh we have to go into .resolved.attachments to get it

            const attachment_data = ev.interaction.data.resolved?.attachments?.[ev.args.image.value];
            if(!attachment_data) return renderError(u("Internal error - Could not find attachment?"));

            return {
                kind: "new_message",
                deferred: true,
                config: {visibility: "public"},
                value: (async (): Promise<InteractionResponseNewMessage> => {
                    return {
                        kind: "new_message",
                        deferred: false,
                        persist: false,
                        config: {visibility: "public"},
                        value: Message({
                            text: u("Spoiler"),
                            attachments: [
                                {
                                    filename: "SPOILER_"+attachment_data.filename,
                                    description: attachment_data.description,
                                    value: await fetch(attachment_data.url).then(r => r.arrayBuffer()),
                                }
                            ],
                        }),
                    };
                })(),
            };
        },
    });
}