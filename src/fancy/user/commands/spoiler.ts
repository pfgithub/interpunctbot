import fetch from "node-fetch";
import { InteractionResponseNewMessage, Message, MessageElement, renderDeferred, renderError, SlashCommand, SlashCommandArgAttachment, SlashCommandElement, u } from "../../fancylib";

export default function Command(): SlashCommandElement {
    return SlashCommand({
        label: u("spoiler"),
        description: u("Send an image as a spoiler, helpful for discord mobile users"),
        args: {
            // <arg type="attachment" />
            image: SlashCommandArgAttachment({description: "The image will be uploaded as a spoiler"}),
        },
        onSend: async (ev): Promise<InteractionResponseNewMessage> => {
            // deferredInteractionResponse(async () => {
            //     channel.send(…)
            //     return "✓"
            // })

            // actually can't we just send a public response with the image?

            // ev.args.image.value
            // oh we have to go into .resolved.attachments to get it

            const attachment_data = ev.interaction.data.resolved?.attachments?.[ev.args.image];
            if(!attachment_data) return renderError(u("Internal error - Could not find attachment?"));

            // deferred for that image fetch which could take a while
            return renderDeferred({visibility: "public"}, async (): Promise<MessageElement> => {
                return Message({
                    text: u("Spoiler"),
                    attachments: [
                        {
                            filename: "SPOILER_"+attachment_data.filename,
                            description: attachment_data.description,
                            value: await fetch(attachment_data.url).then(r => r.arrayBuffer()),
                        }
                    ],
                });
            });
        },
    });
}