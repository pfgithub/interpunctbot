import { tryParse } from "../../Database";
import client from "../../../bot";
import { globalKnex } from "../../db";
import { QueryBuilder } from "knex";
import { callEventInternal, EventContent } from "./event_eval";

/*
notes:
- we only get one try. if we call the event and the message doesn't go out, too bad.
*/

const ourk = (): QueryBuilder<DBEvent, DBEvent[]> => globalKnex!<DBEvent, DBEvent[]>("timed_events_at2");

export type TimedEvent = {
    for_guild: string,
    content: EventContent,
};

type DBEvent = {
    id: number,
    for_guild: string,
    time: `${number}`,
    event: string, // EventContent
    completed: boolean,
};

//* if we find an event but it's more than 2,147,483,647ms in the future:
// - setTimeout(that long)

let next_event_timeout: NodeJS.Timeout | null = null;

//! always queue events for a guild that your shard is on. never queue events for a different guild.
export async function queueEvent(event: TimedEvent, from_now_ms: number): Promise<void> {
    if(from_now_ms < 10_000) {
        setTimeout(() => callEvent(event), from_now_ms);
        return;
    }

    /*
		t.increments("id")
			.notNull()
			.primary();
        t.string("for_guild").notNull();
		t.bigInteger("time").notNull();
		t.json("event").notNull();
		t.boolean("completed").notNull();
    */
    const insert_res = await ourk().insert({
        for_guild: event.for_guild,
        time: `${(Date.now() + from_now_ms)}`,
        event: JSON.stringify(event.content),
        completed: false,
    });
    await updateNextEvent();
}

// do a db fetch and update known_next_event
// if it turns out this fn gets called too much, we can limit it and have it only call
// if the next event looks near
export async function updateNextEvent(): Promise<void> {
    const all_guilds = [...client.guilds.cache.values()].map(g => g.id); // can't use .keys for some reason

    // this is a pretty big 'whereIn' list. should never be more than 2000 items though.
    // especially for a .limit(1) query, wow
    const next_event = await ourk().where({
        'completed': false,
    }).whereIn("for_guild", [...all_guilds]).orderBy('time', "asc").select("*").first();
    
    if(next_event == null) return;
    
    const ms_until_event = (+next_event.time) - Date.now();

    if(next_event_timeout != null) clearTimeout(next_event_timeout);

    if(ms_until_event < 0) {
        console.log("[TEat2] backlogged event");
        await markCompletedThenCallDBEvent(next_event);
        return await updateNextEvent();
    }
    if(ms_until_event > 2_000_000_000) { // near the 32 bit integer limit timeouts have
        next_event_timeout = setTimeout(() => {
            next_event_timeout = null;
            updateNextEvent().catch(e => console.log("[TEat2] timeout updatenextevent failure", e));
        }, 2_000_000_000);
        return;
    }

    next_event_timeout = setTimeout(() => {
        next_event_timeout = null;
        (async () => {
            await markCompletedThenCallDBEvent(next_event);
            await updateNextEvent();
        })().catch(e => {
            console.log("[TEat2] complete failure", e);
        });
    }, ms_until_event);
    // tryParse<TimedEvent>()
}

export function initializeTimedEvents(): void {
    updateNextEvent().catch(e => {
        console.log("[TEat2] initialize error", e);
    });
}

// to start a timeout:
// - if longer than 2,147,483,647ms:
// let ms_remaining = …
// if(ms_remaining > 2,147,483,647) {
//    setTimeout(this again)
// }else{
//    setTimeout(do the event)
// }

async function markCompletedThenCallDBEvent(db_ev: DBEvent) {
    const ev_content = tryParse<EventContent>(db_ev.event, {
        kind: "corrupted",
    });

    // async start calling the event. *do not error*
    callEvent({for_guild: db_ev.for_guild, content: ev_content});

    // mark the event completed
    await ourk().where({
        id: db_ev.id,
    }).update({
        completed: true,
    });
}

export function callEvent(event: TimedEvent): void {
    callEventInternal(event).catch(e => console.log("[TEat2] callEventInternal error", e));
}

// 30, 15, 30, 30