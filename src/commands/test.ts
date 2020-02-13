import * as nr from "../NewRouter";

nr.globalCommand(
	"/help/test/test",
	"test",
	{
		usage: "test {{Emoji|emoji}} {{Role|role}}",
		quickDescription: "Test the bot",
		fullDescription: "Test the bot",
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
		quickDescription: "Crash the bot",
		fullDescription: "Crash the bot",
		examples: [],
	},
	nr.list(),
	async ([], info) => {
		throw new Error("Crash command used");
	},
);
