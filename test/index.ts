import * as Discord from "discord.js";
import { readFileSync, promises as fs } from "fs";
import * as childProcess from "child_process";
import * as path from "path";
const config = JSON.parse(
	readFileSync(path.join(__dirname, "config.json"), "utf-8")
);

type TesterCallback = (t: TestHelper) => Promise<void>;

const testQueue: { reason: string; cb: TesterCallback }[] = [];

export function test(reason: string, cb: TesterCallback) {
	testQueue.push({ reason, cb });
}

export type PermissionRoleName =
	| "ADMINISTRATOR"
	| "VIEW_AUDIT_LOG"
	| "MANAGE_SERVER"
	| "MANAGE_ROLES"
	| "MANAGE_CHANNELS"
	| "KICK_MEMBERS"
	| "BAN_MEMBERS"
	| "CREATE_INVITE"
	| "CHANGE_NICKNAME"
	| "MANAGE_NICKNAMES"
	| "MANAGE_EMOJIS"
	| "READ_TEXT_CHANNELS_SEE_VOICE_CHANNELS"
	| "SEND_MESSAGES"
	| "SEND_TTS_MESSAGES"
	| "MANAGE_MESSAGES"
	| "EMBED_LINKS"
	| "ATTACH_FILES"
	| "READ_MESSAGE_HISTORY"
	| "MENTION_EVERYONE"
	| "USE_EXTERNAL_EMOJIS"
	| "ADD_REACTIONS";

type MessageHandler = (message: Discord.Message) => void;

const spawnedProcesses: childProcess.ChildProcess[] = [];

async function arrayToObject<
	Names extends Readonly<unknown[]>,
	CBKeys extends string,
	CBValue
>(
	names: Names,
	cb: (name: Names[number]) => Promise<{ key: CBKeys; value: CBValue }>
): Promise<{ [key in CBKeys]: CBValue }> {
	const resobj: { [key in CBKeys]?: CBValue } = {};
	for (const name of names) {
		const { key, value } = await cb(name);
		resobj[key] = value;
	}
	return resobj as { [key in CBKeys]: CBValue };
}

type ChannelNameType = string | ChannelFullNameType;

type ChannelFullNameType = Readonly<
	| { name: string; type: "text" }
	| { name: string; type: "voice" }
	| { name: string; type: "category" }
>;

type ChannelName<T extends ChannelNameType> = T extends string
	? T
	: T extends { name: string }
	? T["name"]
	: never;

type ChannelType<T extends ChannelNameType> = T extends string
	? Discord.TextChannel
	: T extends { type: "text" }
	? Discord.TextChannel
	: T extends { type: "voice" }
	? Discord.VoiceChannel
	: T extends { type: "category" }
	? Discord.CategoryChannel
	: never;

export class TestHelper {
	client: Discord.Client;
	guild: Discord.Guild;
	ipbot: Discord.GuildMember;

	private waitingForMessages: MessageHandler[];
	private mostRecentEvents: { type: "message"; value: string }[];
	// private noEventsTimeout = NodeJS.Timeout // on(event) clearTimeout(..) setTimeout(..)

	private botProcess?: childProcess.ChildProcess;

	constructor(
		client: Discord.Client,
		guild: Discord.Guild,
		ipbot: Discord.GuildMember
	) {
		this.client = client;
		this.guild = guild;
		this.ipbot = ipbot;
		this.waitingForMessages = [];
		this.mostRecentEvents = [];

		this.client.on("message", message => this._didRecieveMessage(message));
	}

	private _didRecieveMessage(message: Discord.Message) {
		if (message.author!.id === this.client.user!.id) {
			return; // our message, ignore.
		}
		this.waitingForMessages.shift()!(message);
	}

	nextMessage(): Promise<Discord.Message> {
		// await nextEvents()
		// next events until 2000ms after there are no more events
		return new Promise((r, re) => {
			this.waitingForMessages.push(m => r(m));
		});
	}

	async createChannels<ChannelNames extends (ChannelNameType)[]>(
		...channelNames: Readonly<ChannelNames>
	): Promise<
		{
			[key in ChannelName<ChannelNames[number]>]: ChannelType<key>;
		}
	> {
		return ((await arrayToObject(
			channelNames,
			async (data: ChannelNameType) => {
				const channelToCreate: ChannelFullNameType =
					typeof data === "string"
						? { type: "text", name: data }
						: data;
				return {
					key: channelToCreate.name,
					value: await this.guild.channels.create(
						channelToCreate.name,
						{ type: channelToCreate.type }
					)
				};
			}
		)) as unknown) as {
			[key in ChannelName<ChannelNames[number]>]: ChannelType<key>;
		};
	}

	async resetAll() {
		console.log("-- ResetAll");
		// remove all channels
		console.log("--- Removing channels");
		for (const channel of this.guild.channels.array()) {
			await channel.delete();
		}
		// remove all roles from ipbot
		console.log("--- Removing roles from bot");
		for (const role of this.ipbot.roles.array()) {
			if (role.name === "@everyone") {
				continue;
			}
			await this.ipbot.roles.remove(role);
		}
		// remove database
		console.log("--- Removing database");
		try {
			await fs.unlink(path.join(__dirname, "..", "data.db"));
		} catch (e) {}
		// create database
		console.log("--- Creating database");
		const createDB = childProcess.spawn(
			"yarn",
			["knex", "migrate:latest"],
			{
				cwd: path.join(__dirname, "..")
			}
		);
		spawnedProcesses.push(createDB);
		const datahandler = (data: Buffer) => {
			console.log(
				`------- KNEX: ${data
					.toString()
					.split("\n")
					.join("\\n")}`
			);
		};
		createDB.stdout!.on("data", datahandler);
		createDB.stderr!.on("data", datahandler);
		await new Promise<void>((r, re) => createDB.on("exit", () => r()));
		// done
		console.log("--- Everything Reset");
	}

	async permissions(...permissions: PermissionRoleName[]) {
		console.log(`----- Adding Permissions ${permissions.join(",")}`);
		for (const permission of permissions) {
			const role = this.guild.roles.find(r => r.name === permission);
			if (!role) {
				throw new Error(
					`The role named ${permission} does not exist in the testing server`
				);
			}
			await this.ipbot.roles.add(role);
		}
	}

	async basePermissions() {
		this.permissions(
			"READ_MESSAGE_HISTORY",
			"READ_TEXT_CHANNELS_SEE_VOICE_CHANNELS",
			"SEND_MESSAGES"
		);
	}

	startBot(): Promise<void> {
		console.log("--- Starting bot...");
		this.botProcess = childProcess.spawn("ts-node", ["."], {
			cwd: path.join(__dirname, "..")
		});
		const botProcess = this.botProcess;
		spawnedProcesses.push(botProcess);
		return new Promise(resolve => {
			botProcess.stdout!.on("data", (data: Buffer) => {
				console.log(
					`------- BOT: ${data
						.toString()
						.split("\n")
						.join("\\n")}`
				);
				if (data.toString() === "Ready\n") {
					console.log("--- Bot said Ready");
					resolve();
				}
			});
			botProcess.stderr!.on("data", (data: Buffer) => {
				console.log(
					`------- BOT ERR!: ${data
						.toString()
						.split("\n")
						.join("\\n")}`
				);
			});
		});
	}

	async stopBot() {
		if (this.botProcess) {
			this.botProcess.kill();
		}
	}
}

(async () => {
	let exitCode = 0;
	const client = new Discord.Client();
	client.login(config.token);
	client.on("ready", async () => {
		const guild = client.guilds.get(config.server)!;
		const testHelper = new TestHelper(
			client,
			guild,
			guild.members.get(config.ipbot)!
		);
		let i = 0;
		for (const tester of testQueue) {
			console.log(
				`------ Testing ${tester.reason} (${i + 1} / ${
					testQueue.length
				})`
			);
			let success = true;
			const startTime = new Date().getTime();
			try {
				await tester.cb(testHelper);
			} catch (e) {
				console.log(e);
				success = false;
				exitCode++;
			}
			const endTime = new Date().getTime();
			const ms = endTime - startTime;
			console.log(
				`------ Test ${success ? "PASSED" : "FAILED"} in ${ms}ms`
			);
			i++;
			testHelper.stopBot();
		}
		await new Promise(r => setTimeout(r, 1000)); //wait 1s before closing
		process.exit(exitCode);
	});
})();

// kill children before exit
const cleanExit = () => {
	console.log("killing", spawnedProcesses.length, "child processes");
	spawnedProcesses.forEach(child => {
		if (!child.killed) {
			child.kill();
		}
	});
};
const cleanExitExit = () => {
	cleanExit();
	process.exit(1);
};
process.on("exit", cleanExit);
process.on("SIGINT", cleanExitExit);
process.on("SIGUSR1", cleanExitExit);
process.on("SIGUSR2", cleanExitExit);
process.on("uncaughtException", err => {
	console.log("UNCAUGHT PROMISE EXCEPTION", err);
	cleanExitExit();
});
