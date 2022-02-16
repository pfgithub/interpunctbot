import { refreshFancylib } from "../../fancyhmr";
import { InteractionResponseNewMessage, Message, renderEphemeral, renderError, SlashCommand, u } from "../../fancylib";

export default function Command() {
    return SlashCommand({
        label: u("spoiler"),
        description: u("Send an image as a spoiler, helpful for discord mobile users"),
        children: [
            // <arg type="attachment" />
            {kind: "attachment", name: "The image", description: "The image will be uploaded as a spoiler"},
        ],
        onSend: (ev): InteractionResponseNewMessage => {
            // deferredInteractionResponse(async () => {
            //     channel.send(…)
            //     return "✓"
            // })

            // actually can't we just send a public response with the image?

            return {
                kind: "new_message",
                deferred: true,
                config: {visibility: "private"},
                value: (async (): Promise<InteractionResponseNewMessage> => {
                    return renderEphemeral(Message({
                        text: u("TODO"),
                    }), {visibility: "private"})
                })(),
            }
        },
    });
}