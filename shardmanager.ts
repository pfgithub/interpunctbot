import { ShardingManager } from "discord.js";
const manager = new ShardingManager("bot-script-js", { token: "token" }); // bot script
// ^ todo bundle files into a single js file? maybe?

// .broadcast
// .fetchClientValues

// what if sharding is over multiple servers? it isn't so that doesn't matter
