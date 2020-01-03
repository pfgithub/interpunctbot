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
		let message = event.message;
		let userID = event.user;
		let user = client.users.get(userID);
		if (!user) {
			return "notmine"; // what if the user no longer exists, this will clutter the event queue
		}
		await user.send(message); // if this throws, the event will still succeed
		return "handled";
	});
});

export default client;
