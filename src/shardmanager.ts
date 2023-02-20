import { ShardingManager } from "discord.js";
import { globalConfig } from "./config";
import { promises as fs } from "fs";
import * as path from "path";

if (globalConfig.token == null)
	throw new Error(
		"Token not provided, bot cannot start. Configure in config/config.json",
	);
const manager = new ShardingManager("built/index.js", {
	token: globalConfig.token,
	totalShards: 20,
});

manager.spawn().catch(e => console.log("spawn error", e));
manager.on("shardCreate", shard => {
	console.log(`Launched shard ${shard.id}`);
	// shard.
});

async function cleanLogs() {
	const logsDir = path.join(process.cwd(), "logs");
	const allLogs = await fs.readdir(logsDir);
	const rgx = /^\[(.+?)\]/;
	const rgx2 = /^!! \[ (.+?) /;
	const mustBePast = new Date().getTime() - 60 * 24 * 60 * 60 * 1000;
	for (const logFile of allLogs) {
		const fpath = path.join(process.cwd(), "logs", logFile);
		let initialtext;
		try {
			initialtext = await fs.readFile(fpath, "utf-8");
		}catch(e) {
			continue;
		}
		const allLines = initialtext.split("\n");
		let resIdx = allLines.length;
		let prevDeleteCount = 0;
		let index = -1;
		for (const line of allLines) {
			index++;
			if (index === 0 && line.startsWith("!! [")) {
				prevDeleteCount = +rgx2.exec(line)![1];
				continue;
			}
			const lineDate = rgx.exec(line);
			if (!lineDate) continue;
			const realDate = new Date(lineDate[1]).getTime();
			if (isNaN(realDate)) {
				resIdx = 0;
				break;
			}
			if (realDate > mustBePast) {
				resIdx = index;
				break;
			}
		}
		allLines.splice(0, resIdx);
		const tdelcount = prevDeleteCount + resIdx;
		if (tdelcount !== 0)
			allLines.unshift(
				"!! [ " +
					tdelcount +
					" messages were more than 60 days old and were trimmed from this log. https://interpunct.info/help/log ]",
			);
		const restext = allLines.join("\n");
		if (initialtext !== restext) await fs.writeFile(fpath, restext, "utf-8");
		console.log("Trimmed log", logFile);
	}
}
cleanLogs().catch(e => console.log("CleanLogs failed,", e));
