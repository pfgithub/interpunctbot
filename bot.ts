import * as Discord from "discord.js";
import { globalConfig } from "./src/config";
import { TimedEvents } from "./src/TimedEvents";
import { promises as fs } from "fs";
import path from "path";
import { durationFormat } from "./src/durationFormat";
import { initHelper } from "./src/ShardHelper";
const client = new Discord.Client({
	partials: ["MESSAGE", "CHANNEL", "REACTION"],
});

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

export let timedEvents: TimedEvents | undefined = undefined;

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

	timedEvents = new TimedEvents(client);
	timedEvents.setHandler("pmuser", async event => {
		if (client.shard && !client.shard.ids.includes(0)) {
			return "notmine"; // might be right
		}
		const message = event.message;
		const userID = event.user;
		const user = await client.users.fetch(userID);
		if (!user) {
			return "handled"; // user could not be found.
		}
		await user.send(message); // if this throws, the event will still succeed
		return "handled";
	});
	timedEvents.setHandler("delete", async event => {
		const guild = client.guilds.resolve(event.guild);
		if (!guild) {
			return "notmine"; // !!! OR the guild has kicked the bot. this will create ghost events that everyone has notmine.
		}
		const channel = guild.channels.resolve(event.channel);
		if (!channel) return "handled";
		if (!(channel instanceof Discord.TextChannel)) return "handled";
		const message = await channel.messages.fetch(event.message);
		if (!message) return "handled";
		await message.delete();
		return "handled";
	});
	timedEvents.setHandler("send", async event => {
		const guild = client.guilds.resolve(event.guild);
		if (!guild) {
			return "notmine"; // !!! OR the guild has kicked the bot. this will create ghost events that everyone has notmine.
		}
		const channel = guild.channels.resolve(event.channel);
		if (!channel) return "handled";
		if (!(channel instanceof Discord.TextChannel)) return "handled";
		await channel.send(event.message);
		return "handled";
	});

	if (client.shard) {
		initHelper(client.shard, timedEvents);
	}
});

export default client;
