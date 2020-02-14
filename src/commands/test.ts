import * as nr from "../NewRouter";

nr.globalCommand(
	"/help/test/test",
	"test",
	{
		usage: "test {{Emoji|emoji}} {{Role|role}}",
		description: "Test the bot",
		examples: [],
	},
	nr.list(),
	f => f(),
	this,
	async ([], info) => {
		await info.success(
			`it works! this is the default webpage for this web server.`,
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
				out: `@you, {{Emoji|failure}} An internal error occured while running this command. Error code: {{Code|8oywx5uxsi}}`,
			},
		],
	},
	nr.list(),
	f => f(),
	this,
	async ([], info) => {
		throw new Error("Crash command used");
	},
);
