import * as Discord from "discord.js";

export async function getGuilds(client: Discord.Client): Promise<number> {
	if (!client.shard) return client.guilds.cache.size;
	try {
		return ((await client.shard.fetchClientValues(
			"guilds.cache.size",
		)) as number[]).reduce((t, a) => t + a, 0);
	} catch (e) {
		return -1;
	}
}

export async function getMembers(client: Discord.Client): Promise<number> {
	if (!client.shard) return client.users.cache.size;
	try {
		return ((await client.shard.fetchClientValues(
			"users.cache.size",
		)) as number[]).reduce((t, a) => t + a, 0);
	} catch (e) {
		return -1;
	}
}

// async function sendPM(userID: number, message: string) {}

// async function sendError(message: string) {}

// what does this do? i'm confused
export function initHelper(
	shard: Discord.ShardClientUtil,
): void {
	// shard‽ ⨹
}
