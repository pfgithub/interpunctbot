import { tryParse } from "../../Database";
import client from "../../../bot";
import { globalKnex } from "../../db";
import { QueryBuilder } from "knex";
import { callEventInternal, EventContent } from "./event_eval";
import { reportError } from "./report_error";

/*
notes:
- we only get one try. if we call the event and the message doesn't go out, too bad.

ok so:
- currently TimedEvents are per-shard
- we could switch them to per-guild
*/

const ourk = (): QueryBuilder<DBEvent, DBEvent[]> => globalKnex!<DBEvent, DBEvent[]>("timed_events_at2");

export interface TimedEvent extends TimedEventExclSearch {
    // search can be used to for instance:
    // - find all my upcoming remindme s to cancel a specific one
    // - find a delete request for a specified message and cancel it
    search: string;
}
export type TimedEventExclSearch = {
    for_guild: string,
    content: EventContent,
};

type DBEvent = {
    id: number,
    for_guild: string,
    time: `${number}`,
    event: string, // EventContent
    completed: boolean,

    created_time: null | `${string}`,
    started_at_time: null | `${string}`,
    completed_at_time: null | `${string}`,
    status: null | "NEW" | "LOAD" | "SUCCESS" | "ERROR" | "CANCELED" | "unsupported", // MAX LEN 10
    error_id: null | number,
    search: null | string, // MAX LEN 100
};

// *!WARNING: this leaks memory and only recovers it on process restart
// hopefully not too many events will be canceled
let canceled_events = new Set<string>();

let next_event_timeout: {njst: NodeJS.Timeout, time: number} | null = null;

export async function cancelAllEventsForSearch(search: string): Promise<void> {
    // console.log("canceled:", search);
    canceled_events.add(search);
    await ourk().where({
        completed: false,
        search: search,
    }).update({
        completed: true,

        status: "CANCELED",
        completed_at_time: `${Date.now()}`,
    });
}

//! always queue events for a guild that your shard is on. never queue events for a different guild.
export async function queueEvent(event: TimedEvent, from_now_ms: number): Promise<void> {
    if(from_now_ms < (60 * 60 * 1000)) { // 1h
        setTimeout(() => callEvent(null, event), from_now_ms);
        return;
    }

    if(event.search.length > 100) throw new Error("search string too long"); // postgres counts codepoints
    // i think so this isn't quite right but it should never not error when it won't fit
    // *! consider hashing the search string to remove the 100 character limit.

    /*
		t.increments("id")
			.notNull()
			.primary();
        t.string("for_guild").notNull();
		t.bigInteger("time").notNull();
		t.json("event").notNull();
		t.boolean("completed").notNull();
    */
    const next_event_time = Date.now() + from_now_ms;
    const insert_data: Omit<DBEvent, "id"> = {
        for_guild: event.for_guild,
        time: `${(next_event_time)}`,
        event: JSON.stringify(event.content),
        completed: false,

        created_time: `${Date.now()}`,
        started_at_time: null,
        completed_at_time: null,
        status: "NEW",
        error_id: null,
        search: event.search,
    };
    const insert_res = await ourk().insert(insert_data);
    // for some reason, insert_res.length !== 1 on production (postgres) but it is in sqlite
    // if(insert_res.length !== 1) throw new Error("res length wrong?");
    // db_cache.add({
    //     ...insert_data,
    //     id: insert_res[0],
    // });
    queueUpdateNextEvent(event.for_guild, next_event_time);
}


let should_update_next_event_after: number | null = null;
let currently_updating_next_event = false;

function queueUpdateNextEvent(guild_id: string, nxtvt: number): void {
    if(currently_updating_next_event) {
       // console.log("requeue canceled for timeout");
        should_update_next_event_after = Math.min(nxtvt, should_update_next_event_after ?? Infinity);
    }else{
        currently_updating_next_event = true;
        // console.log("start update next event");
        updateNextEvent(nxtvt).catch(e => {
            reportError(guild_id, "TEat2", e, {
                guild_id, nxtvt,
            });
        }).finally(() => {
            // console.log("done update next event");
            currently_updating_next_event = false;
            if(should_update_next_event_after != null) {
                const snea = should_update_next_event_after
                should_update_next_event_after = null;
                // console.log("auto requeue");
                updateNextEvent(snea);
            }
        });
    }
}

// async function cancelEventBySearch(search: string)
// : cancels all events that equal the search string

// do a db fetch and update known_next_event
async function updateNextEvent(nxtvt: number): Promise<void> {
    // console.log("[TEat2] nextev update", nxtvt);
    if(next_event_timeout != null && nxtvt !== -1 && nxtvt > next_event_timeout.time) {
        return;
    }

    const all_guilds = [...client.guilds.cache.values()].map(g => g.id); // can't use .keys for some reason

    // this is a pretty big 'whereIn' list. should never be more than 2000 items though.
    // especially for a .limit(1) query, wow
    const next_event = await ourk().where({
        'completed': false,
    }).whereIn("for_guild", [...all_guilds]).orderBy('time', "asc").select("*").first();
    
    if(next_event == null) return;
    
    const event_time = +next_event.time;
    const ms_until_event = event_time - Date.now();

    if(next_event_timeout != null) {
        clearTimeout(next_event_timeout.njst);
        next_event_timeout = null;
    }

    if(ms_until_event < 0) {
        // console.log("[TEat2] backlogged event");
        try {
            await markCompletedThenCallDBEvent(next_event);
        }finally {
            return queueUpdateNextEvent("0", -1);
        }
    }
    if(ms_until_event > 2_000_000_000) { // near the 32 bit integer limit timeouts have
        next_event_timeout = {njst: setTimeout(() => {
            next_event_timeout = null;
            queueUpdateNextEvent(next_event.for_guild, event_time);
        }, 2_000_000_000), time: event_time};
        return;
    }

    next_event_timeout = {njst: setTimeout(() => {
        next_event_timeout = null;
        (async () => {
            await markCompletedThenCallDBEvent(next_event);
        })().catch(e => {
            // console.log("[TEat2] complete failure", e);
        }).finally(() => {
            queueUpdateNextEvent("0", -1);
        });
    }, ms_until_event), time: event_time};
    // tryParse<TimedEvent>()
}

export function initializeTimedEvents(): void {
    queueUpdateNextEvent("0", -1);
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
    if(canceled_events.has(db_ev.search ?? "*NONE*")) return; // skip

    // mark the event completed (status=load)
    // I guess we could check here 'where status != canceled'
    // how do we check if the update succeeded?
    const update_count = await ourk().where({
        id: db_ev.id,
        completed: false,
    }).update({
        completed: true,

        status: "LOAD",
        started_at_time: `${Date.now()}`,
    });
    if(update_count === 0) {
        return; // did not update any event; maybe it was canceled
    }

    const ev_content = tryParse<EventContent>(db_ev.event, {
        kind: "corrupted",
    });

    // async start calling the event. *do not error*
    callEvent(db_ev.id, {for_guild: db_ev.for_guild, content: ev_content, search: db_ev.search ?? "*NONE*"});
}

export function callEvent(ev_id: null | number, event: TimedEvent): void {
    if(canceled_events.has(event.search)) {
        // canceled; nvm
        return;
    }

    // TODO: note that the event is completed, for average event completion time stats
    // we can note as
    // - in_progress
    // - completed
    // - errored
    // note that we will never automatically retry any events
    callEventInternal(event).then(r => {
        if(ev_id != null) ourk().where({
            id: ev_id,
        }).update({
            status: "SUCCESS",
            completed_at_time: `${Date.now()}`,
        }).catch(em => {
            // failed to mark event as an error event
            // funny
            // console.log('[TEat2] failed to mark event as a success.', em);
        });
    }).catch(e => {
        // console.log("[TEat2] callEventInternal error", e);
        reportError(event.for_guild, "TEat2", e, event);
        // oh reporterror can't give us the error id in a callback or something, unfortunate

        if(ev_id != null) ourk().where({
            id: ev_id,
        }).update({
            status: "ERROR",
            completed_at_time: `${Date.now()}`,
        }).catch(em => {
            // failed to mark event as an error event
            // funny
            // console.log('[TEat2] failed to mark event as an error. ironic.', em);
        });
    });
}

// 30, 15, 30, 30
