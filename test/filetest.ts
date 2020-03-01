import { promises as fs } from "fs";
import path from "path";
import * as Discord from "discord.js";
import readline from "readline";
import { test, TestHelper, PermissionRoleName } from ".";

const actions: {
	[key: string]:
		| ((
				t: TestHelper,
				args: string,
				rewriteSelf: (newValue: string) => Promise<void>,
		  ) => Promise<void>)
		| undefined;
} = {
	async help(t, args, rewrite) {
		console.log(
			Object.keys(actions)
				.sort()
				.map(a => `- ${a}`)
				.join("\n"),
		);
	},
	async reset(t, args, rewrite) {
		await t.resetAll();
	},
	async channel(t, args, rewrite) {
		const [channelType, ...channelNameArr] = args.split(" ");
		if (!channelNameArr[0].startsWith("#")) {
			throw new Error(`Channel name does not start with #`);
		}
		const channelName = channelNameArr.join(" ").substr(1);
		if (
			channelType !== "text" &&
			channelType !== "voice" &&
			channelType !== "category"
		) {
			throw new Error(
				`Only text, voice, and category channels are available`,
			);
		}
		await t.createChannels({ type: channelType, name: channelName });
	},
	async renameChannel(t, args, rewrite) {
		const [originalName, newName] = args.split(" ");
		if (!originalName.startsWith("#")) {
			throw new Error(`Channel name does not start with #`);
		}
		if (!newName.startsWith("#")) {
			throw new Error(`Channel name does not start with #`);
		}
		const channelName = originalName.substr(1);
		const newChannelName = newName.substr(1);
		const channel = t.botInteractionGuild.channels.cache.find(
			c => c.name === channelName,
		);
		if (!channel) {
			throw new Error(`Channel ${channelName} not in guild`);
		}
		await channel.setName(newChannelName);
	},
	async defaultPermissions(t, args, rewrite) {
		await t.basePermissions("ipbot");
	},
	async permission(t, args, rewrite) {
		await t.permissions(
			"ipbot",
			...(args.split(" ") as PermissionRoleName[]),
		);
	},
	async watchTime(t, args, rewrite) {
		t.watchTime = +args;
	},
	async myDefaultPerms(t, args, rewrite) {
		await t.basePermissions("testbot");
	},
	async myPerm(t, args, rewrite) {
		await t.permissions(
			"testbot",
			...(args.split(" ") as PermissionRoleName[]),
		);
	},
	async removeMyPerm(t, args, rewrite) {
		await t.removePermissions(
			"testbot",
			...(args.split(" ") as PermissionRoleName[]),
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
		let message = messageArr.join(": ");
		for (const channel of t.adminGuild.channels.cache.array()) {
			message = message
				.split(`#[${channel.name}]`)
				.join(channel.toString());
		}
		if (!channelName.startsWith("#")) {
			throw new Error(`Channel name does not start with #`);
		}
		channelName = channelName.substr(1);
		const channel = t.botInteractionGuild.channels.cache.find(
			c => c.name === channelName,
		); // note that multiple channels with the same name is not testable
		if (!channel) {
			throw new Error(`Could not find channel with name #${channelName}`);
		}
		await (channel as Discord.TextChannel).send(message);
	},
	async watch(t, args, rewrite) {
		await t.startWatchingEvents();
		// ^^ make sure to remove the !! below this line somehowW
	},
	async test(t, args, rewrite) {
		const events = await t.events();
		await rewrite(
			`test\n${JSON.stringify(events, null, "\t")
				.split("\n")
				.map(l => `!! ${l}`)
				.join("\n")}`,
		);
		// ^^ make sure to remove the !! below this line somehow
	},
};

(async () => {
	let providedMode = process.argv[2] || "repl";
	if (providedMode === "-c") {
		providedMode = "preset";
	}

	const infileName = providedMode;
	const infilePath = path.join(process.cwd(), "test", infileName);

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
						return process.argv[3].split("\\n");
				  })()
				: await (async () => {
						return readline.createInterface({
							input: process.stdin,
							output: process.stdout,
							prompt: "test> ",
						});
				  })();

		let lineNumber = 0;
		// it's ok here because it gets called under the global. namespace
		// eslint-disable-next-line @typescript-eslint/unbound-method
		const realLog = global.console.log;
		const preContinue = () => {
			// eslint-disable-next-line @typescript-eslint/unbound-method
			global.console.log = realLog;
			mode === "repl" && process.stdout.write("test> ");
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

			// once again, ok here but this should be updated so it doesn't do things twice
			// eslint-disable-next-line @typescript-eslint/unbound-method
			const realLog = global.console.log;
			// eslint-disable-next-line @typescript-eslint/unbound-method
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
					`${lineNumber}: Action named ${actionName} does not exist.`,
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
})().catch(() => {});
