import * as d from "discord-api-types/v10";
import client from "../../../bot";
import { TimedEventExclSearch } from "./TimedEventsAt2";

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

export async function callEventInternal(event: TimedEventExclSearch): Promise<void> {
    // console.log("[EEat2] Evaluating event", event);
    const {content, for_guild} = event;
    if(content.kind === "send_pm") {
        // have to make a dm channel to use the api directly
        // ah: we call '/users/@me/channels' https://discord.com/developers/docs/resources/user#create-dm
        // that returns an object that it makes sense to cache
        const user = await client.users.fetch(content.user_id);
        await user.send({
            content: content.message,
            allowedMentions: {parse: []},
        });
    }else if(content.kind === "delete_message") {
        await client.rest.delete(d.Routes.channelMessage(content.channel_id, content.message_id));
    }else{
        throw new Error("unsupported content kind: " + content.kind);
    }
}