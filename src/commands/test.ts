import * as nr from "../NewRouter";

nr.globalCommand(
	"/help/test/test",
	"test",
	{
		usage: "test {{Emoji|emoji}} {{Role|role}}",
		description: "Test the bot",
		examples: [],
	},
	nr.list(nr.a.emoji(), ...nr.a.role()),
	async ([emoji, role], info) => {
		await info.success(`Emoji ID: ${emoji.id}, Role ID: ${role.id}`);
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
	async ([], info) => {
		throw new Error("Crash command used");
	},
);
