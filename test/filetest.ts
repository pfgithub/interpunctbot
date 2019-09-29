import { promises as fs } from "fs";
import * as path from "path";
import * as Discord from "discord.js";
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
		(channel as Discord.TextChannel).send(message);
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
	const infileName = "channels.test";

	test(infileName, async t => {
		const infilePath = path.join(__dirname, infileName);
		const infile = await fs.readFile(infilePath, "utf-8");

		let lineNumber = 0;
		const inLines = infile
			.split("\n")
			.filter(line => !line.startsWith("!!"));
		for (const lineIn of inLines) {
			lineNumber++;
			const i = lineNumber - 1;

			// ---

			const line = lineIn.trim();
			const startTime = new Date().getTime();
			if (!line) {
				continue;
			}
			if (line.startsWith("//")) {
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
				throw new Error(`Action named ${actionName} does not exist.`);
			}
			try {
				await action(t, args, async (newValue: string) => {
					inLines[i] = newValue;
				});
			} catch (e) {
				// eslint-disable-next-line require-atomic-updates
				global.console.log = realLog;
				console.log(`${lineNumber}: Error! ${e.toString()}`);
				throw e;
			}
			// eslint-disable-next-line require-atomic-updates
			global.console.log = realLog;
			const endTime = new Date().getTime();
			console.log(`\t  Done in ${endTime - startTime} ms.`);
		}
		const resultText = inLines.join("\n");
		await fs.writeFile(infilePath, resultText, "utf-8");
	});
})();
