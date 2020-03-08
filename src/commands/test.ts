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
	async ([]) => {
		throw new Error("Crash command used");
	},
);

nr.globalCommand(
	"/help/owner/restart",
	"restart",
	{
		usage: "restart",
		description: "restart the shard",
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

nr.globalCommand(
	"/help/owner/eval",
	"eval",
	{
		usage: "eval {Required|javascript.code}",
		description: "evaluate javascript",
		examples: [
			{
				in: "eval {Code|client.guilds.cache.size}",
				out: "{Atmention|you}, 1824",
			},
		],
	},
	nr.list(...nr.a.words()),
	async ([cmd], info) => {
		cmd = cmd.replace(/(^\`|\`$)/g, "").trim();
		if (cmd === "client.guilds.cache.size")
			return await info.result(
				"" + info.message.client.guilds.cache.size,
			);
		if (cmd === "client.token") return await info.error("no");
		await info.error(
			"```diff\n- SyntaxError: expected expression, got ')'\n```",
		);
	},
);
