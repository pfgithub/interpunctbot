import * as Discord from "discord.js";

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

function initHelper(shard: Discord.ShardClientUtil) {
	// shard.
}
