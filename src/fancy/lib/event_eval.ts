import client, { api } from "../../../bot";
import * as d from "discord-api-types/v9";
import { TimedEvent } from "./TimedEventsAt2";
import { TextBasedChannel, TextChannel } from "discord.js";
import { reportError } from "./report_error";

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

type msgs = {timeout: boolean, messages: string[]};

function forceStartTimeout(guild_id: string, chan: string, msgs: msgs) {
    msgs.timeout = false;
    if(msgs.messages.length > 0) {
        msgs.timeout = true;
        setTimeout(() => {
            msgs.timeout = false;
            handleMsgs(guild_id, chan, msgs);
        }, 2000);
    }
}

function handleMsgs(guild_id: string, chan: string, msgs: msgs) {
    const messages = new Set(msgs.messages.splice(0, 100)); // making a set because sometimes
    // messages get double-added?
    console.log("batch delete", messages);

    (async () => {
        const channl = client.channels.cache.get(chan);
        if(!channl) return;
        if(!(channl instanceof TextChannel)) return;
        if(messages.size > 5) {
            await channl.bulkDelete([...messages], true);
        }else{
            for(const message of messages) {
                await api.api(d.Routes.channelMessage(chan, message)).delete();
            }
        }
        // if(messages.length === 1) {
        //     await api.api(d.Routes.channelMessage(chan, messages[0])).delete();
        // }else if(messages.length === 0) {
        //     // ?
        // await this.client.rest.post(Routes.channelBulkDelete(this.id), { body: { messages: messageIds } });
        // what is different about this code i am so confused
        // it says it has the wrong content type
        // should i put 'data: {messages}'?
        // } else await api.api(d.Routes.channelBulkDelete(chan)).post({
        //     body: {
        //         messages,
        //     },
        // });
    })().then(() => {
        forceStartTimeout(guild_id, chan, msgs);
    }).catch((e) => {
        reportError(guild_id, "BatchDelete", e, {chan, messages});
    });
}

const channel_bulkdelete_cache = new Map<string, msgs>();
function addBatchDeleteMessage(guild_id: string, channel: string, message: string) {
    let q: msgs | undefined = channel_bulkdelete_cache.get(channel);
    if(q == null) {
        q = {timeout: false, messages: []};
        channel_bulkdelete_cache.set(channel, q);
    }
    q.messages.push(message);
    if(!q.timeout) {
        forceStartTimeout(guild_id, channel, q);
    }
}

export async function callEventInternal(event: TimedEvent): Promise<void> {
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
        addBatchDeleteMessage(for_guild, content.channel_id, content.message_id);
    }else{
        throw new Error("unsupported content kind: " + content.kind);
    }
}