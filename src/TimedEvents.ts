import { globalKnex } from "./db";
import { logError, ilt, perr } from "..";
import * as Discord from "discord.js";

type EventTypes = {
	pmuser: { message: string; user: string };
	delete: { guild: string; channel: string; message: string };
	send: { guild: string; channel: string; message: string };
};

export type EventOfType<Type extends keyof EventTypes> = EventTypes[Type] & {
	type: Type;
};

export type EventData = {
	[key in keyof EventTypes]: EventOfType<key>;
}[keyof EventTypes];

export type EventHandlers = {
	[key in keyof EventTypes]?: (
		eventData: EventOfType<key>,
	) => Promise<"handled" | "notmine">;
};

export type SqlEvent = {
	id: number;
	time_64b: string;
	event: string;
	completed: boolean;
};

export class TimedEvents {
	// connect to the database
	// get the next event
	// set a timeout for it
	// when that event happens, call its callback and fetch the next event
	eventHandlers: EventHandlers;
	currentTime = 0;
	client: Discord.Client;
	currentEvents: Map<number, boolean> = new Map();
	starting = false;

	constructor(client: Discord.Client) {
		this.eventHandlers = {};
		perr(this.initialize(), "Initializing timedEvents");
		this.client = client;
	}

	setHandler<EventType extends keyof EventTypes>(
		eventType: EventType,
		handler: EventHandlers[EventType],
	) {
		this.eventHandlers[eventType] = handler;
	}
	async initialize() {
		await this.startNext();
	}
	async queue(event: EventData | EventData[], time: number) {
		if (time > Number.MAX_SAFE_INTEGER) return; // no need to waste time on these.
		// add to db
		const eventfixed = Array.isArray(event) ? event : [event];
		const insertedResult = await globalKnex!<SqlEvent>(
			"timed_events",
		).insert({
			time_64b: "" + time,
			event: JSON.stringify(eventfixed),
			completed: false,
		});
		const id = insertedResult[0];
		if (this.client.shard)
			await this.client.shard.send({
				action: "queueEvent",
				event: { event: eventfixed, time, id },
			}); // huh interesting
		this._queueNoAdd({
			event: eventfixed,
			time,
			id,
		});
	}
	_queueNoAdd(ev: { event: EventData[]; time: number; id: number }) {
		if (ev.time <= this.currentTime) {
			this.startEventTimeout(ev.event, ev.time, ev.id);
		}
		perr(this.startNext(), "Waiting for next event");
	}
	startEventTimeout(events: EventData[], time: number, id: number) {
		if (this.currentEvents.has(id)) return;
		this.currentEvents.set(id, true);
		if (time <= this.currentTime) this.currentTime = time;
		const now = new Date().getTime();
		let deltaTime = time - now;
		if (deltaTime < 0) deltaTime = 0; // events that should've triggered during a server restart
		const handle = async () => {
			this.currentEvents.delete(id);
			perr(this.startNext(), "Waiting for next event");
			for (const event of events) {
				const handler = this.eventHandlers[event.type];
				if (!handler) {
					return logError(
						new Error("Event had an invalid handler: " + handler),
						true,
					);
				}
				const handlerResult = await ilt(
					handler(event as any),
					"calling delayed event handler",
				);
				if (handlerResult.error || handlerResult.result === "handled") {
					// await knex<SqlEvent>("timed_events")
					// 	.where("id", "=", id)
					// 	.update("completed", true);
					await globalKnex!<SqlEvent>("timed_events")
						.where("id", "=", id)
						.delete();
				}
				if (handlerResult.error) {
					return logError(
						handlerResult.error,
						false,
						new Error(
							"Handler threw error. The event **has** been marked as handled.",
						),
					);
				}
			}
		};
        if(process.env.NODE_ENV === "production")
            return;
		if (deltaTime < 2147483647)
			setTimeout(() => perr(handle(), "Handling event"), deltaTime);
	}
	async startNext() {
		if (!globalKnex) {
			console.log(
				"Cannot begin timedEvents because there is no knex instance.",
			);
			return;
		}

		const ongoingEvents = this.currentEvents.size;
		if (100 - ongoingEvents > 0 && !this.starting) {
		} else {
			return;
		}
		this.starting = true;
		const events = await globalKnex<SqlEvent>("timed_events")
			.where("time_64b", ">", this.currentTime)
			.andWhere("completed", "=", false)
			.orderBy("time_64b")
			.limit(100 - ongoingEvents);
		if (events[events.length - 1]) {
			const ev = events[events.length - 1];
			this.currentTime = +ev.time_64b;
		}
		this.starting = false;
		for (const event of events) {
			const eventData = (typeof event.event === "string"
				? JSON.parse(event.event)
				: event.event) as EventData[];
			this.startEventTimeout(
				Array.isArray(eventData) ? eventData : [eventData],
				+event.time_64b,
				event.id,
			);
		}
	}
}
