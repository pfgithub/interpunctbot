import { promises as fs } from "fs";
import * as path from "path";
import * as Discord from "discord.js";
import * as readline from "readline";
import { test, TestHelper, PermissionRoleName } from ".";

const actions: {
	[key: string]:
		| ((
				t: TestHelper,
				args: string,
				rewriteSelf: (newValue: string) => Promise<void>
		  ) => Promise<void>)
		| undefined;
} = {
	async help(t, args, rewrite) {
		console.log(
			Object.keys(actions)
				.sort()
				.map(a => `- ${a}`)
				.join("\n")
		);
	},
	async reset(t, args, rewrite) {
		await t.resetAll();
	},
	async channel(t, args, rewrite) {
		const [channelType, ...channelNameArr] = args.split(" ");
		if (channelNameArr[0][0] !== "#") {
			throw new Error(`Channel name does not start with #`);
		}
		const channelName = channelNameArr.join(" ").substr(1);
		if (
			channelType !== "text" &&
			channelType !== "voice" &&
			channelType !== "category"
		) {
			throw new Error(
				`Only text, voice, and category channels are available`
			);
		}
		await t.createChannels({ type: channelType, name: channelName });
	},
	async defaultPermissions(t, args, rewrite) {
		await t.basePermissions("ipbot");
	},
	async permission(t, args, rewrite) {
		await t.permissions(
			"ipbot",
			...(args.split(" ") as PermissionRoleName[])
		);
	},
	async myDefaultPerms(t, args, rewrite) {
		await t.basePermissions("testbot");
	},
	async myPerm(t, args, rewrite) {
		await t.permissions(
			"testbot",
			...(args.split(" ") as PermissionRoleName[])
		);
	},
	async startBot(t, args, rewrite) {
		await t.startBot();
	},
	async exit(t, args, rewrite) {
		process.exit(0);
	},
	async send(t, args, rewrite) {
		let [channelName, ...messageArr] = args.split(": ");
		const message = messageArr.join(": ");
		if (!channelName.startsWith("#")) {
			throw new Error(`Channel name does not start with #`);
		}
		channelName = channelName.substr(1);
		const channel = t.botInteractionGuild.channels.find(
			c => c.name === channelName
		); // note that multiple channels with the same name is not testable
		if (!channel) {
			throw new Error(`Could not find channel with name #${channelName}`);
		}
		await (channel as Discord.TextChannel).send(message);
	},
	async test(t, args, rewrite) {
		const events = await t.events();
		rewrite(
			`test\n${JSON.stringify(events, null, "\t")
				.split("\n")
				.map(l => `!! ${l}`)
				.join("\n")}`
		);
		// ^^ make sure to remove the !! below this line somehow
	}
};

(async () => {
	let providedMode = process.argv[2] || "repl";
	if (providedMode === "-c") {
		providedMode = "preset";
	}

	const infileName = providedMode;
	const infilePath = path.join(__dirname, infileName);

	const mode: "file" | "repl" | "preset" =
		providedMode === "repl"
			? "repl"
			: providedMode === "preset"
			? "preset"
			: "file";

	const exitOnFailure = mode !== "repl";

	test(infileName, async t => {
		const lineList =
			mode === "file"
				? await (async () => {
						const infile = await fs.readFile(infilePath, "utf-8");

						return infile
							.split("\n")
							.filter(line => !line.startsWith("!!"));
				  })()
				: mode === "preset"
				? await (async () => {
						return process.argv[3].split("\n");
				  })()
				: await (async () => {
						return readline.createInterface({
							input: process.stdin,
							output: process.stdout,
							prompt: "test> "
						});
				  })();

		let lineNumber = 0;
		const realLog = global.console.log;
		const preContinue = () => {
			global.console.log = realLog;
			process.stdout.write("test> ");
		};

		const linesForOutput: string[] = [];

		preContinue();
		for await (const lineIn of lineList) {
			lineNumber++;
			const i = lineNumber - 1;
			linesForOutput.push(lineIn);

			// ---

			const line = lineIn.trim();
			const startTime = new Date().getTime();
			if (!line) {
				preContinue();
				continue;
			}
			if (line.startsWith("//")) {
				preContinue();
				continue;
			}
			// maybe:
			// user!send #test_one: ip!space channels
			// setup!perm user ADMINISTRATOR
			// user!send #test_one: ip!space channels

			console.log(`${lineNumber}:\tRunning: ${line}...`);

			const realLog = global.console.log;
			global.console.log = (...v: any[]) => {
				if (typeof v[0] === "string") {
					const copy = v.slice(0);
					copy[0] = `${lineNumber}:\t\t${copy[0]}`;
					return realLog(...copy);
				}
				return realLog(...v);
			};

			const [actionName, ...argsArr] = line.split(" ");
			const args = argsArr.join(" ");

			const action = actions[actionName];
			if (!action) {
				console.log(
					`${lineNumber}: Action named ${actionName} does not exist.`
				);
				if (exitOnFailure) {
					process.exit(1);
				} else {
					linesForOutput[i] = `// error: ${line}`;
				}
				preContinue();
				continue;
			}
			try {
				await action(t, args, async (newValue: string) => {
					linesForOutput[i] = newValue;
					console.log(newValue);
				});
			} catch (e) {
				console.log(`${lineNumber}: Error! ${e.toString()}`);
				if (exitOnFailure) {
					process.exit(1);
				} else {
					//eslint-disable-next-line require-atomic-updates
					linesForOutput[i] = `// error: ${line}`;
				}
			}
			const endTime = new Date().getTime();
			console.log(`\t  Done in ${endTime - startTime} ms.`);
			preContinue();
		}
		const resultText = linesForOutput.join("\n");
		await fs.writeFile(infilePath, resultText, "utf-8");
	});
})();
