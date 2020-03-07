import { ShardingManager } from "discord.js";
import { globalConfig } from "./config";

if (!globalConfig.token)
	throw new Error(
		"Token not provided, bot cannot start. Configure in config/config.json",
	);
const manager = new ShardingManager("built/index.js", {
	token: globalConfig.token,
});

manager.spawn().catch(e => console.log("spawn error", e));
manager.on("shardCreate", shard => console.log(`Launched shard ${shard.id}`));

// bot script
// ^ todo bundle files into a single js file? maybe?

// .broadcast
// .fetchClientValues

// what if sharding is over multiple servers? it isn't so that doesn't matter
