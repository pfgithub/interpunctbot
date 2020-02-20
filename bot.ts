import * as Discord from "discord.js";
import config from "./config.json";
import { TimedEvents } from "./src/TimedEvents";
const client = new Discord.Client({ disableEveryone: true });

//eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
function ignorePromise(_p: Promise<unknown>) {}

const token = config.token;

export const docsGenMode = process.argv.includes("--gen-docs");

console.log("Starting inter·punct bot");
if (docsGenMode) console.log("] Docs gen mode active");
if (!docsGenMode) ignorePromise(client.login(token));

export let timedEvents: TimedEvents | undefined = undefined;

client.on("ready", () => {
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
		const guild = client.guilds.get(event.guild);
		if (!guild) {
			return "notmine"; // !!! OR the guild has kicked the bot. this will create ghost events that everyone has notmine.
		}
		const channel = guild.channels.get(event.channel);
		if (!channel) return "handled";
		if (!(channel instanceof Discord.TextChannel)) return "handled";
		const message = await channel.messages.fetch(event.message);
		if (!message) return "handled";
		await message.delete();
		return "handled";
	});
	timedEvents.setHandler("send", async event => {
		const guild = client.guilds.get(event.guild);
		if (!guild) {
			return "notmine"; // !!! OR the guild has kicked the bot. this will create ghost events that everyone has notmine.
		}
		const channel = guild.channels.get(event.channel);
		if (!channel) return "handled";
		if (!(channel instanceof Discord.TextChannel)) return "handled";
		await channel.send(event.message);
		return "handled";
	});
});

export default client;
