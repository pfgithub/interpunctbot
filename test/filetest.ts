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
		await t.basePermissions();
	},
	async permission(t, args, rewrite) {
		await t.permissions(...(args.split(" ") as PermissionRoleName[]));
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
		const channel = t.guild.channels.find(c => c.name === channelName); // note that multiple channels with the same name is not testable
		if (!channel) {
			throw new Error(`Could not find channel with name #${channelName}`);
		}
		(channel as Discord.TextChannel).send(message);
	},
	async test(t, args, rewrite) {
		// let events = await t.events();
		// rewrite(`test\t${JSON.stringify(events, null, "\t").split("\n").map((l, i) => i === 0 ? l : "!!\t\t"+l).join("\n")}`)
		// ^^ make sure to remove the !! below this line somehow
		await new Promise(r => setTimeout(r, 5000));
	}
};

(async () => {
	const infileName = "channels.test";
	const infilePath = path.join(__dirname, infileName);
	const infile = await fs.readFile(infilePath, "utf-8");

	test(infileName, async t => {
		let lineNumber = 0;
		for (const line of infile.split("\n")) {
			lineNumber++;
			const startTime = new Date().getTime();
			if (!line.trim()) {
				continue;
			}
			if (line.startsWith("!! ")) {
				continue;
			}
			if (line.startsWith("!! ")) {
				continue;
			}

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
				throw new Error(`Action named ${action} does not exist.`);
			}
			try {
				await action(t, args, async (newValue: string) => undefined);
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
	});
})();
