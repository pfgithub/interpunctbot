import { refreshFancylib } from "../../fancyhmr";
import { InteractionResponseNewMessage, Message, renderEphemeral, renderError, SlashCommand, u } from "../../fancylib";

export default function Command() {
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

            // const attachment_data = ev.interaction.data.resolved?.attachments[ev.args.image.value];

            return {
                kind: "new_message",
                deferred: true,
                config: {visibility: "private"},
                value: (async (): Promise<InteractionResponseNewMessage> => {
                    return renderEphemeral(Message({
                        text: u("TODO. Got arg:\n\n```json\n"+JSON.stringify(ev.args)+"\n```"),
                    }), {visibility: "private"})
                })(),
            }
        },
    });
}