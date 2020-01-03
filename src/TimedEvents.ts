import knex from "./db";
import { logError, ilt } from "..";
import * as Discord from "discord.js";

type EventTypes = {
	pmuser: { message: string; user: string };
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
	ongoingEvents = 0;

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
		await this.startNext(100);
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
		if (this.ongoingEvents < 100) {
			this.startNext(100 - this.ongoingEvents);
		}
	}
	startEventTimeout(event: EventData, time: number, id: number) {
		if (time <= this.currentTime) this.currentTime = time;
		let now = new Date().getTime();
		let deltaTime = time - now;
		if (deltaTime < 0) deltaTime = 0; // events that should've triggered during a server restart
		setTimeout(async () => {
			this.ongoingEvents--;
			this.startNext(1);
			let handler = this.eventHandlers[event.type];
			if (!handler) {
				return logError(
					new Error("Event had an invalid handler: " + handler),
					true
				);
			}
			let handlerResult = await ilt(
				handler(event),
				"calling delayed event handler"
			);
			if (handlerResult.error || handlerResult.result === "handled") {
				await knex<SqlEvent>("timed_events")
					.where("id", "=", id)
					.update("completed", true);
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
	async startNext(count: number) {
		let events = await knex<SqlEvent>("timed_events")
			.where("time", ">", this.currentTime)
			.andWhere("completed", "=", false)
			.orderBy("time")
			.limit(count);
		if (events[events.length - 1]) {
			this.currentTime = events[events.length - 1].time;
		}
		for (let event of events) {
			this.ongoingEvents++;
			let eventData = JSON.parse(event.event) as EventData;
			this.startEventTimeout(eventData, event.time, event.id);
		}
	}
}
