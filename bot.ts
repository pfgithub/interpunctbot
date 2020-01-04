import * as Discord from "discord.js";
import * as config from "./config.json";
import { TimedEvents } from "./src/TimedEvents";
const client = new Discord.Client({ disableEveryone: true });

const token = config.token;

client.login(token);

export let timedEvents: TimedEvents | undefined = undefined;

client.on("ready", () => {
	timedEvents = new TimedEvents(client);
	timedEvents.setHandler("pmuser", async event => {
		if (client.shard && client.shard.ids.indexOf(0) === -1) {
			return "notmine"; // might be right
		}
		let message = event.message;
		let userID = event.user;
		let user = await client.users.fetch(userID);
		if (!user) {
			return "handled"; // user could not be found.
		}
		await user.send(message); // if this throws, the event will still succeed
		return "handled";
	});
	timedEvents.setHandler("delete", async event => {
		let guild = await client.guilds.get(event.guild);
		if (!guild) {
			return "notmine"; // !!! OR the guild has kicked the bot. this will create ghost events
		}
		let channel = await guild.channels.get(event.channel);
		if (!channel) return "handled";
		if (!(channel instanceof Discord.TextChannel)) return "handled";
		let message = await channel.messages.fetch(event.message);
		if (!message) return "handled";
		await message.delete();
		return "handled";
	});
});

export default client;
