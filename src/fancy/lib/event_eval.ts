import client, { api } from "../../../bot";
import * as d from "discord-api-types/v9";
import { TimedEvent } from "./TimedEventsAt2";

export type EventContent = {
    kind: "send_pm",
    user_id: string,
    message: string,
} | {
    kind: "delete_message",
    channel_id: string,
    message_id: string,
} | {
    kind: "corrupted",
};

export async function callEventInternal(event: TimedEvent): Promise<void> {
    console.log("[EEat2] Evaluating event", event);
    const {content, for_guild} = event;
    if(content.kind === "send_pm") {
        // have to make a dm channel to use the api directly
        const user = await client.users.fetch(content.user_id);
        await user.send({
            content: content.message,
            allowedMentions: {parse: []},
        });
    }else if(content.kind === "delete_message") {
        await api.api(d.Routes.channelMessage(content.channel_id, content.message_id)).delete();
    }else{
        throw new Error("unsupported content kind: " + content.kind);
    }
}