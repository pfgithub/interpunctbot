import * as Discord from "discord.js";
import { TimedEvents } from "./TimedEvents";

export async function getGuilds(client: Discord.Client) {
	if (!client.shard) return client.guilds.cache.size;
	try {
		return ((await client.shard.fetchClientValues(
			"guilds.cache.size",
		)) as number[]).reduce((t, a) => t + a, 0);
	} catch (e) {
		return -1;
	}
}

async function sendPM(userID: number, message: string) {}

async function sendError(message: string) {}

export function initHelper(
	shard: Discord.ShardClientUtil,
	timedEvents: TimedEvents,
) {
	// shard‽ ⨹
}
