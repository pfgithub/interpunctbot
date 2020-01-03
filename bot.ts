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
});

export default client;
