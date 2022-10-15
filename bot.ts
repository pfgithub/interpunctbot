import * as Discord from "discord.js";
import { globalConfig } from "./src/config";
import { promises as fs } from "fs";
import path from "path";
import { durationFormat } from "./src/durationFormat";
import { initHelper } from "./src/ShardHelper";
import { initializeTimedEvents } from "./src/fancy/lib/TimedEventsAt2";
const client = new Discord.Client({
	partials: ["USER", "MESSAGE", "CHANNEL", "GUILD_MEMBER", "REACTION"],
	intents: [
		"GUILDS",
		"GUILD_MEMBERS", // privileged
		"GUILD_BANS",
		"GUILD_EMOJIS_AND_STICKERS",
		// "GUILD_INTEGRATIONS" // unneeded
		// "GUILD_WEBHOOKS" // unneeded
		// "GUILD_INVITES" // unneeded currently
		// "GUILD_VOICE_STATES" // unneeded
		// "GUILD_PRESENCES" // unneeded
		"GUILD_MESSAGES",
		"GUILD_MESSAGE_REACTIONS", // hopefully going to get rid of this
		// "GUILD_MESSAGE_TYPING", // unneeded
		"DIRECT_MESSAGES",
		"DIRECT_MESSAGE_REACTIONS",
		// "DIRECT_MESSAGE_TYPING"
	],
});
export const api = client as any as ApiHolder;

type ApiHandler = {
    get: <T>() => Promise<T>,
    post: <T, Q>(value: T) => Promise<Q>,
    patch: (value: any) => Promise<any>,
    delete: () => Promise<any>,
} & {[key: string]: ApiHandler} & ((...data: any[]) => ApiHandler);
type ApiHolder = {api: ApiHandler};

//eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
function ignorePromise(_p: Promise<unknown>) {}

export const docsGenMode = process.argv.includes("--gen-docs");

console.log("Starting inter·punct bot");
if (docsGenMode) console.log("] Docs gen mode active");
if (!docsGenMode) {
	if (!globalConfig.token)
		throw new Error(
			"Token not provided, bot cannot start. Configure in config/config.json",
		);
	ignorePromise(client.login(globalConfig.token));
}

client.on("rateLimit", rl => {
	console.log("Client ratelimited", rl);
});
client.on("ready", () => {
	(async () => {
		const pth = path.join(process.cwd(), ".restarting");
		const [channelid, msgid, timems] = (
			await fs.readFile(pth, "utf-8")
		).split(":");
		await fs.unlink(pth);
		const channel = client.channels.resolve(
			channelid,
		) as Discord.TextChannel;
		const message = await channel.messages.fetch(msgid)!;
		await channel.send(
			message.content.substr(0, message.content.lastIndexOf(",")) +
				", <:success:508840840416854026> Bot restarted in " +
				durationFormat(new Date().getTime() - +timems) +
				".",
		);
		await message.delete();
	})().catch(() => {});
	(async () => {
		const pth = path.join(process.cwd(), ".restarting_interaction");
		const {route, time} = JSON.parse(
			await fs.readFile(pth, "utf-8")
		) as {route: string, time: number};
		await fs.unlink(pth);
		await (client as any).api(route).patch({data: {
			content: "✓, Bot restarted in "+durationFormat(Date.now() - time),
		}});
	})().catch(() => {});

	initializeTimedEvents();

	if (client.shard) {
		initHelper(client.shard);
	}
});

export default client;
