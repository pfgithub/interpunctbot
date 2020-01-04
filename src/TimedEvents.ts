import knex from "./db";
import { logError, ilt } from "..";
import * as Discord from "discord.js";

type EventTypes = {
	pmuser: { message: string; user: string };
	delete: { guild: string; channel: string; message: string };
};

export type EventOfType<Type extends keyof EventTypes> = EventTypes[Type] & {
	type: Type;
};

export type EventData = {
	[key in keyof EventTypes]: EventOfType<key>;
}[keyof EventTypes];

export type EventHandlers = {
	[key in keyof EventTypes]?: (
		eventData: EventOfType<key>
	) => Promise<"handled" | "notmine">;
};

export type SqlEvent = {
	id: number;
	time: number;
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
	starting: boolean = false;

	constructor(client: Discord.Client) {
		this.eventHandlers = {};
		this.initialize();
		this.client = client;
	}

	setHandler<EventType extends keyof EventTypes>(
		eventType: EventType,
		handler: EventHandlers[EventType]
	) {
		this.eventHandlers[eventType] = handler;
	}
	async initialize() {
		await this.startNext();
	}
	async queue(event: EventData, time: number) {
		// add to db
		let insertedResult = await knex<SqlEvent>("timed_events").insert({
			time,
			event: JSON.stringify(event),
			completed: false
		});
		let id = insertedResult[0];
		if (this.client.shard)
			this.client.shard.send({
				action: "queueEvent",
				event: { event, time, id }
			});
		this._queueNoAdd({ event, time, id });
	}
	_queueNoAdd(ev: { event: EventData; time: number; id: number }) {
		if (ev.time <= this.currentTime) {
			this.startEventTimeout(ev.event, ev.time, ev.id);
		}
		this.startNext();
	}
	startEventTimeout(event: EventData, time: number, id: number) {
		if (this.currentEvents.has(id)) return;
		this.currentEvents.set(id, true);
		if (time <= this.currentTime) this.currentTime = time;
		let now = new Date().getTime();
		let deltaTime = time - now;
		if (deltaTime < 0) deltaTime = 0; // events that should've triggered during a server restart
		setTimeout(async () => {
			this.currentEvents.delete(id);
			this.startNext();
			let handler = this.eventHandlers[event.type];
			if (!handler) {
				return logError(
					new Error("Event had an invalid handler: " + handler),
					true
				);
			}
			let handlerResult = await ilt(
				handler(event as any),
				"calling delayed event handler"
			);
			if (handlerResult.error || handlerResult.result === "handled") {
				// await knex<SqlEvent>("timed_events")
				// 	.where("id", "=", id)
				// 	.update("completed", true);
				await knex<SqlEvent>("timed_events")
					.where("id", "=", id)
					.delete();
			}
			if (handlerResult.error) {
				return logError(
					handlerResult.error,
					false,
					new Error(
						"Handler threw error. The event **has** been marked as handled."
					)
				);
			}
		}, deltaTime);
	}
	async startNext() {
		let ongoingEvents = this.currentEvents.size;
		if (100 - ongoingEvents > 0 && !this.starting) {
		} else {
			return;
		}
		this.starting = true;
		let events = await knex<SqlEvent>("timed_events")
			.where("time", ">", this.currentTime)
			.andWhere("completed", "=", false)
			.orderBy("time")
			.limit(100 - ongoingEvents);
		if (events[events.length - 1]) {
			this.currentTime = events[events.length - 1].time;
		}
		this.starting = false;
		for (let event of events) {
			let eventData = JSON.parse(event.event) as EventData;
			this.startEventTimeout(eventData, event.time, event.id);
		}
	}
}
