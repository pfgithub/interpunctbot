import { ShardingManager } from "discord.js";
import { globalConfig } from "./config";

if (!globalConfig.token)
	throw new Error(
		"Token not provided, bot cannot start. Configure in config/config.json",
	);
const manager = new ShardingManager("built/index.js", {
	token: globalConfig.token,
	totalShards: 5,
});

manager.spawn().catch(e => console.log("spawn error", e));
manager.on("shardCreate", shard => {
	console.log(`Launched shard ${shard.id}`);
	// shard.
});
