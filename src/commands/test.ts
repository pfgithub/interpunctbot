import * as nr from "../NewRouter";
import Info from "../Info";
import { promises as fs } from "fs";
import * as path from "path";

nr.globalCommand(
	"/help/test/test",
	"test",
	{
		usage: "test {Emoji|emoji} {Role|role}",
		description: "Test the bot",
		examples: [],
	},
	nr.list(),
	async ([], info) => {
		await info.success(
			`it works! This is the default webpage for this web server.`,
		);
	},
);

nr.globalCommand(
	"/help/test/crash",
	"crash",
	{
		usage: "crash",
		description: "Crash the bot",
		examples: [
			{
				in: `ip!crash`,
				out: `@you, {Emoji|failure} An internal error occured while running this command. Error code: {Code|8oywx5uxsi}`,
			},
		],
	},
	nr.list(),
	async ([], info) => {
		throw new Error("Crash command used");
	},
);

nr.globalCommand(
	"/help/owner/restart",
	"restart",
	{
		usage: "restart",
		description: "restart the bot",
		examples: [],
	},
	nr.list(),
	async ([], info) => {
		if (!Info.theirPerm.owner(info)) return;
		const msg = (await info.result(
			"<a:loading:682804438783492139> Restarting...",
		))![0];
		await fs.writeFile(
			path.join(process.cwd(), ".restarting"),
			msg.channel + ":" + msg.id + ":" + new Date().getTime(),
			"utf-8",
		);
		process.exit(0);
	},
);
