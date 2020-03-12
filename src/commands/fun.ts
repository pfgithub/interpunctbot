import moment from "moment";
import { serverStartTime } from "../..";
import { messages, safe } from "../../messages";
import { durationFormat } from "../durationFormat";
import { setEditInterval } from "../editInterval";
import Info from "../Info";
import * as nr from "../NewRouter";
import { a, AP } from "./argumentparser";
import "./fun/gamelibgames";
import "./fun/goi";
import { createTimer } from "./fun/helpers";
import "./fun/trivia";
import { getGuilds } from "../ShardHelper";

nr.addDocsWebPage(
	"/help/fun",
	"Fun",
	"games and other fun commands",
	`{Title|Fun}\n\n{Interpunct} has a variety of fun commands.

{Heading|Configuration}
Fun commands are enabled by default.
{CmdSummary|fun}

{Heading|Games}
{CmdSummary|trivia}
{CmdSummary|connect4}
{CmdSummary|minesweeper}

{Heading|Misc}
{CmdSummary|ping}
{CmdSummary|stats}
{CmdSummary|members}
{CmdSummary|remindme}
{CmdSummary|needle}
{CmdSummary|vote}`,
);

nr.globalCommand(
	"/help/fun/ping",
	"ping",
	{
		usage: "ping",
		description: "Play a game of ping pong against {Interpunct}.",
		examples: [{ in: "ping", out: "@you, Pong!" }],
	},
	nr.list(),
	async ([], info) => {
		if (info.db ? !(await info.db.getFunEnabled()) : false) {
			return await info.error(messages.fun.fun_disabled(info));
		}

		if (Math.random() > 0.9) {
			return await info.result("\\*misses\\*");
		}
		return await info.result("Pong!");
	},
);

nr.globalCommand(
	"/help/fun/pong",
	"pong",
	{
		usage: "pong",
		description: "Play a game of pong ping against {Interpunct}.",
		examples: [{ in: "pong", out: "@you, Ping!" }],
	},
	nr.list(),
	async ([], info) => {
		if (info.db ? !(await info.db.getFunEnabled()) : false) {
			return await info.error(messages.fun.fun_disabled(info));
		}

		if (Math.random() > 0.9) {
			return await info.result("\\*misses\\*");
		}
		return await info.result("Ping!");
	},
);

nr.globalCommand(
	"/help/fun/needle",
	"needle",
	{
		usage: "needle",
		description: "Find the needle in the haystack.",
		examples: [],
	},
	nr.list(),
	async ([], info) => {
		if (info.db ? !(await info.db.getFunEnabled()) : false) {
			return await info.error(messages.fun.fun_disabled(info));
		}

		const item = Math.floor(Math.random() * 200);
		await info.result(
			"Find the needle (|):\n" +
				new Array(200)
					.fill("")
					.map((_, i) => (i === item ? "|||||" : "|| ||"))
					.join(""),
		);
	},
);

nr.globalCommand(
	"/help/fun/botdev",
	"botdev",
	{ usage: "botdev", description: "Get help", examples: [] },
	nr.list(),
	async ([], info) => {
		if (info.db ? !(await info.db.getFunEnabled()) : false) {
			return await info.error(messages.fun.fun_disabled(info));
		}

		await info.error(
			`Command \`botdev\` not found, type \`${info.prefix}notdev\` for a list of commands.`,
		);
		return;
	},
);

nr.globalCommand(
	"/help/fun/notdev",
	"notdev",
	{ usage: "botdev", description: "Get help", examples: [] },
	nr.list(),
	async ([], info) => {
		if (info.db ? !(await info.db.getFunEnabled()) : false) {
			return await info.error(messages.fun.fun_disabled(info));
		}

		await info.error(
			`Command \`notdev\` not found, type \`${info.prefix}botdev\` for a list of commands.`,
		);
		return;
	},
);

const ms = (ms: number) => new Promise(r => setTimeout(r, ms));

nr.globalCommand(
	"/help/fun/load",
	"load",
	{
		usage: "load",
		description: "Fetch results",
		examples: [],
	},
	nr.list(),
	async ([], info) => {
		if (info.db ? !(await info.db.getFunEnabled()) : false) {
			return await info.error(messages.fun.fun_disabled(info));
		}

		const prefix =
			"<@" + info.message.author.id + ">, <a:loading:682804438783492139>";
		const msg = await info.channel.send(prefix);
		await ms(3000);
		await msg.edit(prefix + " Just one moment...");
		await ms(6000);
		await msg.edit(
			prefix + " This is taking a bit longer than expected...",
		);
		await ms(9000);
		await msg.edit(prefix + " Please wait, fetching results...");
		await ms(12000);
		await msg.edit(prefix + " This should be over shortly...");
		await ms(24000);
		await msg.edit(prefix + " Please hold...");
		await ms(48000);
		await msg.edit(
			info.message.author.toString() +
				", " +
				messages.emoji.failure +
				"Huh, it seems something went wrong.",
		);
	},
);

nr.globalCommand(
	"/help/fun/color",
	"color",
	{
		usage: "color {Required|hex code}",
		description: "shows an image of a hex color",
		examples: [],
	},
	nr.list(nr.a.word()),
	async ([word], info) => {
		if (info.db ? !(await info.db.getFunEnabled()) : false) {
			return await info.error(messages.fun.fun_disabled(info));
		}

		const hexcode = word.replace("#", "");
		await info.result(
			safe`Color #${hexcode}: https://dummyimage.com/300x300/${encodeURIComponent(
				"#" + hexcode,
			)}/fff&text=${encodeURIComponent("#" + hexcode)}`,
		);
	},
);

nr.globalCommand(
	"/help/fun/play",
	"play",
	{
		usage: "play {Required|song}",
		description: "Plays a song in a fake music player",
		examples: [],
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		if (info.db ? !(await info.db.getFunEnabled()) : false) {
			return await info.error(messages.fun.fun_disabled(info));
		}

		if (!cmd) {
			return await info.docs("/help/fun/play", "usage");
		}
		await info.message.channel.send(safe`Now playing: ${cmd}
󠀀󠀀󠀀0:01━━━━━━●─────── 0:02
󠀀󠀀󠀀⇆ㅤㅤㅤ◁ㅤㅤ❚❚ㅤㅤ▷ㅤㅤㅤ↻`);
	},
);

nr.globalCommand(
	"/help/fun/accept-all",
	"accept all",
	{
		usage: "accept all",
		description: "You made the right choice!",
		examples: [],
	},
	nr.list(),
	async ([], info) => {
		if (info.db ? !(await info.db.getFunEnabled()) : false) {
			return await info.error(messages.fun.fun_disabled(info));
		}

		await info.success("You made the right choice!");
	},
);

nr.globalCommand(
	"/help/fun/vdb",
	"vdb",
	{
		usage: "vdb {Optional|command}",
		description: "runs a command in the vdb debugger",
		examples: [],
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		if (info.db ? !(await info.db.getFunEnabled()) : false) {
			return await info.error(messages.fun.fun_disabled(info));
		}

		const callcmd = (cmd: string) => {
			if (cmd === "help") {
				return safe`Uh oh! VDB debugging mode is not enabled. Help is not enabled.`;
			}
			if (cmd === "quit") {
				return "";
			}
			return safe`Undefined command: "${cmd}". Try "help".`;
		};

		await info.message.channel.send(`\`\`\`
GNU vdb (VDB) 2.4.1
Copyright (C) 2019 Free Software Foundation, Inc.
License GPLv3+: GNU GPL version 3 or later <http://gnu.org/licenses/gpl.html>
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.
Type "show copying" and "show warranty" for details.
This VDB was configured as "x86_64-pc-btw-i-use-arch".
Type "show configuration" for configuration details.
For bug reporting instructions, please see:
<http://www.gnu.org/software/vdb/bugs/>.
Find the VDB manual and other documentation resources online at:
    <http://www.gnu.org/software/vdb/documentation/>.

For help, type "help".
Type "apropos word" to search for commands related to "word".
(vdb) ${cmd ? safe`${cmd}\n` + callcmd(cmd) + "\n(vdb) quit" : "|"}
\`\`\``);
	},
);

nr.globalCommand(
	"/help/fun/members",
	"members",
	{
		usage: "members {Optional|{Role|role}}",
		description:
			"get the number of members on the server and optionally filter by a specific role",
		examples: [
			{
				in: "ip!members",
				out: "This server has 1,740 members.",
			},
			{
				in: "ip!members {Role|🕐︎ SUB-3}",
				out:
					"This server has 83 members with the role {Role|🕐︎ SUB-3} (4.77%)",
			},
		],
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		if (info.db ? !(await info.db.getFunEnabled()) : false) {
			return await info.error(messages.fun.fun_disabled(info));
		}

		if (!info.guild) {
			return await info.error("something something pms");
		}
		if (!cmd) {
			await info.result(
				"This server has " +
					info.guild.memberCount.toLocaleString("en-US") +
					" members",
			);
		} else {
			const ap = await AP(
				{ cmd, info, help: "/help/fun/members" },
				...a.manyRoles(),
			);
			if (!ap) return;
			const [roles] = ap.result;

			const results: string[] = [];
			for (const role of roles) {
				const rolemembers = role.members.size;
				results.push(
					"This server has " +
						rolemembers.toLocaleString("en-US") +
						" members with the role " +
						messages.role(role) +
						" (" +
						(rolemembers / info.guild.memberCount).toLocaleString(
							"en-US",
							{
								style: "percent",
								minimumSignificantDigits: 3,
								maximumSignificantDigits: 3,
							},
						) +
						")",
				);
			}

			await info.result(results.join("\n"));
		}
	},
);

nr.addDocsWebPage(
	"/help/tutorial",
	"tutorials",
	"tutorials",
	`{Title|Tutorials}
{LinkSummary|/help/tutorial/cube}`,
);

nr.addDocsWebPage(
	"/help/tutorial/cube",
	"cube",
	"making a cube in blender",
	`{Title|Making a cube in blender}
Making cubes in blender is easy and fun!

{Screenshot|https://i.imgur.com/HXoUOPN.png}

Start by downloading and installing blender (any version above 2.8). Open blender and create a new project. Next, switch to the cycles renderer.

{Screenshot|https://i.imgur.com/ukrXL1F.png}

Now it's time to modify your cube. Select your cube and navigate to the materials tab.

{Screenshot|https://i.imgur.com/0qMb8cO.png}

Try changing around some of the settings. You will notice that nothing changes. This is because your cube is being rendered in solid mode. To view the real material, switch to rendered mode.

{Screenshot|https://i.imgur.com/VLMgLkF.png}

Now you can see the cube and material changes, but everything will be noisy. If you get tired of the noise, you can switch back to solid mode.

It's time to make a floor. Click the add button and select mesh > cube to add another cube or plane.

{Screenshot|https://i.imgur.com/bmkiRGL.png}

Move and resize this cube into a floor using the tools on the side.

{Screenshot|https://i.imgur.com/5ouoDNF.png}

Congratulations, you have completed the tutorial. All that is left now is to render your cube by pressing F12. To preview how it will look before rendering, press Numpad0.

{Screenshot|https://i.imgur.com/KnYCPJW.png}

Looking a bit noisy? Enable denoise in the Layer Properties tab. Taking too long? Decrease the resolution in the Output Properties tab.`,
);

nr.globalCommand(
	"/help/fun/cube",
	"cube",
	{
		usage: "cube",
		description: "cube",
		examples: [],
	},
	nr.list(),
	async ([], info) => {
		if (info.db ? !(await info.db.getFunEnabled()) : false) {
			return await info.error(messages.fun.fun_disabled(info));
		}

		await info.result(
			"https://i.imgur.com/HXoUOPN.png\n\n> For more info on making cubes, ip!tutorial cube",
		);
	},
);

nr.globalCommand(
	"/help/fun/vote2",
	"vote2",
	{
		usage: "vote2 {Required|contraversial statement}",
		description: "allows other people to vote on your message",
		examples: [],
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		if (info.db ? !(await info.db.getFunEnabled()) : false) {
			return await info.error(messages.fun.fun_disabled(info));
		}

		if (!cmd) {
			return await info.docs("/help/fun/vote2", "usage");
		}
		await Promise.all([info.message.react("👍"), info.message.react("👎")]);
	},
);

/*
@Docs
Usage: ip!vote {Text|your message}
Example: ip!vote should I add a vote command to inter·punct bot?
Result: VOTE: should I add a vote command to inter·punct bot?{Newline}{Reaction|Upvote}{Reaction|Downvote}
*/
nr.globalCommand(
	"/help/fun/vote",
	"vote",
	{
		usage: "vote {Required|controversial statement}",
		description:
			"allows other people to vote on whether they agree or disagree with your statement",
		examples: [
			{
				in: "vote pineapple on pizza is good",
				out:
					"VOTE: pineapple on pizza is good (Votes: +143,289, Voting ended)\n{Reaction|upvote|7,543,829}{Reaction|downvote|7,400,540}", // so in discord it can show as [^ 6543643] [v 543]
			},
		],
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		if (info.db ? !(await info.db.getFunEnabled()) : false) {
			return await info.error(messages.fun.fun_disabled(info));
		}

		const msg = await info.channel.send("VOTE: " + safe`${cmd}`);
		await Promise.all([msg.react("👍"), msg.react("👎")]);

		let endhandler: () => void = () => {
			throw new Error("end not handled");
		};
		const countdown = createTimer([
			60 * 1000,
			async () => {
				endhandler();
			},
		]);

		async function editMessage(over?: boolean) {
			const upvotes = (msg.reactions.resolve("👍")?.count || 1) - 1;
			const downvotes = (msg.reactions.resolve("👎")?.count || 1) - 1;
			const voteCount = upvotes - downvotes;
			const content =
				"VOTE: " +
				safe`${cmd}` +
				" (Votes: " +
				(voteCount > 0 ? "+" : "") +
				voteCount.toLocaleString("en-US") +
				", " +
				(upvotes + downvotes > 0
					? (upvotes / (upvotes + downvotes)).toLocaleString(
							"en-US",
							{
								style: "percent",
								maximumSignificantDigits: 3,
							},
					  )
					: "No Votes") +
				(over ? ", Voting ended." : "") +
				")";
			if (msg.content !== content) await msg.edit(content);
		}
		const msgEditInterval = setEditInterval(async () => {
			await editMessage();
		});

		const rxnh = info.handleReactions(
			msg,
			async () => {
				countdown.reset();
				//adviseMessageUpdate();
			},
			// if downvote && user upvoted, remove upvote
			// if upvote && user downvoted, remove downvote
		);
		await new Promise(resolve => (endhandler = resolve));
		msgEditInterval.end();
		rxnh.end();
		await editMessage(true);
	},
);

nr.globalCommand(
	"/help/fun/snek",
	"snek",
	{
		usage: "snek",
		description: "snek",
		examples: [],
	},
	nr.list(),
	async ([], info) => {
		if (info.db ? !(await info.db.getFunEnabled()) : false) {
			return await info.error(messages.fun.fun_disabled(info));
		}

		return await info.result(
			"<:snakehead:417047491062661134> <:donotridesnake:413753981186342923>",
		);
	},
);

nr.globalCommand(
	"/help/fun/stats",
	"stats",
	{
		usage: "stats",
		description: "displays various statistics about the bot",
		examples: [
			{
				in: "stats",
				out:
					"{Atmention|you}, Statistics:\n{Blockquote|{Bold|Servers}: 1834 servers\n{Bold|Uptime}: 39m:37.128s\nTook 8ms, handling -1 db requests per second}",
			},
		],
	},
	nr.list(),
	async ([], info) => {
		if (info.db ? !(await info.db.getFunEnabled()) : false) {
			return await info.error(messages.fun.fun_disabled(info));
		}
		const totalServers = await getGuilds(info.message.client);
		const now = new Date().getTime();
		const msg = `**Statistics**:
> **Servers**: ${totalServers} total, ${
			info.message.client.guilds.cache.size
		} on this shard.
> **Uptime**: ${moment
			.duration(now - serverStartTime)
			.format(
				"y [years] M [months] w [weeks] d [days,] h[h]:mm[m]:s.SSS[s]",
			)}
> Took ${new Date().getTime() - info.other!.startTime}ms, handling ${
			info.other!.infoPerSecond
		} db requests per second`;
		const msgs = await info.result(msg, undefined);
		if (msgs && msgs[0])
			await msgs[0].edit(
				msg +
					"\n> **Took**: " +
					durationFormat(now - msgs[0].createdAt.getTime()) +
					" to send this message.",
			);
	},
);

nr.globalCommand(
	"/help/fun/remindme",
	"remindme",
	{
		usage: "remindme {Duration|when} {Optional|message}",
		description:
			"{Interpunct} will pm you with your reminder after the specified time runs out",
		examples: [
			{
				in: "remindme 10 years has ipv3 released yet?",
				out: "{Emoji|success} Reminder set for 10 years.",
			},
		],
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		if (info.db ? !(await info.db.getFunEnabled()) : false) {
			return await info.error(messages.fun.fun_disabled(info));
		}
		const ap = await AP({ cmd, info }, a.duration(), ...a.words());
		if (!ap) return;
		const [delay, message] = ap.result;
		const restime = new Date().getTime() + delay;

		await info.timedEvents.queue(
			{
				type: "pmuser",
				message: `Reminder: ${info.message.url}\n${message
					.split("\n")
					.map(l => "> " + l)
					.join("\n")}`,
				user: info.message.author.id,
			},
			restime,
		);
		await info.success(
			"Reminder set for " +
				(delay >= 86400000
					? new Date(restime).toUTCString() +
					  " (" +
					  durationFormat(delay) +
					  ")"
					: durationFormat(delay) +
					  " (" +
					  new Date(restime).toUTCString() +
					  ")"),
		);
	},
);

nr.globalCommand(
	"/help/fun/config",
	"fun",
	{
		usage: "fun {Required|{Enum|enable|disable}}",
		description: "enables or disables fun",
		examples: [
			{
				in: "fun disable",
				out: "{Emoji|success} Fun is no longer allowed on this server.",
			},
		],
	},
	nr.list(nr.a.enum("enable", "disable")),
	async ([mode], info) => {
		if (!Info.theirPerm.manageBot(info)) return;
		if (!info.db) {
			return await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
		}
		if (mode === "enable") {
			await info.db.setFunEnabled(true);
			return await info.success(messages.fun.fun_has_been_enabled(info));
		} else if (mode === "disable") {
			await info.db.setFunEnabled(false);
			return await info.success(messages.fun.fun_has_been_disabled(info));
		}
		return await info.docs("/help/fun/config", "usage");
	},
);

// ------------------- MINESWEEPER -----------------------

/////////////////////////////////////
// WARNING. Viewing the code below //
//   may be bad. Viewer discretion //
//   advised.                      //
/////////////////////////////////////

// TODO: rewrite this and make it support revealing the top left by default as
// well as batching together groups of mines so they aren't all over the place.

// Or code golf it instead. Maybe the code will be more readable.

nr.globalCommand(
	"/help/fun/minesweeper",
	"minesweeper",
	{
		usage: "minesweeper",
		description: "play minesweeper",
		examples: [
			{
				in: "minesweeper",
				out: "{Screenshot|https://i.imgur.com/M0nA5Hg.png}",
			},
		],
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		if (info.db ? !(await info.db.getFunEnabled()) : false) {
			return await info.error(messages.fun.fun_disabled(info));
		}
		const words = cmd.split(" ");
		let difficulty: keyof typeof dv | undefined;
		let customvalue = 0;
		let mode: string | undefined;
		let width: number | undefined;
		let height: number | undefined;
		let flag = false;
		let group = false;
		const remainingWords = words.filter(word => {
			if (difficulties.includes(word as any)) {
				difficulty = word as any;
				return false;
			}
			if (modesl.includes(word)) {
				mode = word;
				return false;
			}
			if (word === "flag") {
				flag = true;
				return false;
			}
			if (word === "group") {
				group = true;
				return false;
			}
			const sizeMatch = /^([0-9]+)x([0-9]+)$/.exec(word);
			if (sizeMatch) {
				width = Math.min(+sizeMatch[1], 25);
				height = Math.min(+sizeMatch[2], 25);
				return false;
			}
			const percentMatch = /^([0-9]+)%$/.exec(word);
			if (percentMatch) {
				difficulty = "custom";
				customvalue =
					Math.min(Math.max(+percentMatch[1], 0), 100) / 100;
				return false;
			}
			return true;
		});
		difficulty = difficulty || "medium";
		mode = mode || "emojis";
		width = width || 13;
		height = height || 15;
		if (remainingWords.join(" ").trim().length > 0) {
			return await info.error(
				messages.fun.minesweeper_usage(info, difficulties, modesl),
			);
		}

		const generatedBoard = badMinesweeperGenerator({
			difficulty,
			mode,
			width,
			height,
			flag,
			customvalue,
			group,
		});

		// if (info.myChannelPerms ? info.myChannelPerms.has("EMBED_LINKS") : true) {
		// ...
		// }
		const linesUnder2000: string[] = [];
		const splitQuotedBoard = generatedBoard.boardStr
			.split("\n")
			.map(l => `> ${l}`);
		splitQuotedBoard.push(
			`**${width}**x**${height}** | theme: **${mode}** | difficulty: **${difficulty}** (${Math.round(
				(dv[difficulty] === -1 ? customvalue : dv[difficulty]) * 100,
			)}%) | ${generatedBoard.mineCount + " mines "}${
				flag ? "flag " : ""
			}${group ? "group" : ""}`,
		);
		splitQuotedBoard.forEach(line => {
			const newLine = `${linesUnder2000[linesUnder2000.length - 1] ||
				""}\n${line}`; // puts an extra \n on the first line
			if (newLine.length < 1999) {
				linesUnder2000.pop();
				linesUnder2000.push(newLine);
			} else {
				linesUnder2000.push(line.substr(0, 1999));
			}
		});
		for (const line of linesUnder2000) {
			await info.channel.send(line);
		}
	},
);

const dv = {
	easy: 0.05,
	medium: 0.15,
	hard: 0.2,
	veryhard: 0.25,
	epic: 0.3,
	ultra: 0.45,
	custom: -1,
};
const difficulties: (keyof typeof dv)[] = [
	"easy",
	"medium",
	"hard",
	"veryhard",
	"epic",
	"ultra",
];

const modesl = ["numbers", "customemojis", "emojis"];

const modes: {
	[key in typeof modesl[number]]: [
		string,
		string,
		string,
		string,
		string,
		string,
		string,
		string,
		string,
		string,
	];
} = {
	numbers: [
		" ` ` ",
		" `1` ",
		" `2` ",
		" `3` ",
		" `4` ",
		" `5` ",
		" `6` ",
		" `7` ",
		" `8` ",
		" `X` ",
	],
	customemojis: [
		"<:0:579074398296866823>",
		"<:1:579074398141677587>",
		"<:2:579074398611570698>",
		"<:3:579074398288347138>",
		"<:4:579074398615502858>",
		"<:5:579074398670028841>",
		"<:6:579074398418501667>",
		"<:7:579074398284414992>",
		"<:8_:579074398343004162>",
		"<:b_:579074398699651072>",
	],
	emojis: [
		"⬜",
		":one:",
		":two:",
		":three:",
		":four:",
		":five:",
		":six:",
		":seven:",
		":eight:",
		"💥",
	],
};

const badMinesweeperGenerator = ({
	difficulty,
	mode,
	width,
	height,
	flag,
	customvalue,
	group,
}: {
	difficulty: keyof typeof dv;
	mode: keyof typeof modes;
	width: number;
	height: number;
	flag: boolean;
	customvalue: number;
	group: false;
}): { boardStr: string; mineCount: number } => {
	const v = modes[mode];
	let mineCount = 0;
	const vals = v;
	// if(v === "custom") {vals =
	// [0,1,2,3,4,5,6,7,8,9].map(i=>document.getElementById(i).value)} else
	// vals = JSON.parse(v);
	const w = width;
	const h = height;
	const b = dv[difficulty] === -1 ? customvalue : dv[difficulty];
	const arr: number[][] = [];
	const revealed: boolean[][] = [];
	for (let y = 0; y < h; y++) {
		arr[y] = [];
		revealed[y] = [];
		for (let x = 0; x < w; x++) {
			arr[y][x] = Math.random() > b ? 0 : 9;
			if (arr[y][x] === 9) mineCount++;
			revealed[y][x] = false;
		}
	}
	arr[0][0] = 0;
	arr[1][0] = 0;
	arr[1][1] = 0;
	arr[0][1] = 0;
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const vta = arr[y][x] >= 9 ? 1 : 0;
			for (let t = Math.max(y - 1, 0); t <= Math.min(y + 1, h - 1); t++) {
				for (
					let s = Math.max(x - 1, 0);
					s <= Math.min(x + 1, w - 1);
					s++
				) {
					arr[t][s] += vta;
				}
			}
		}
	}
	// pre reveal some times
	{
		const floodfillNext: [number, number][] = [[0, 0]];
		while (floodfillNext.length) {
			let [y, x] = floodfillNext.shift()!;
			y = Math.max(Math.min(y, h - 1), 0);
			x = Math.max(Math.min(x, w - 1), 0);
			if (!revealed[y][x]) {
				revealed[y][x] = true;
				if (arr[y][x] === 0) {
					floodfillNext.push([y + 1, x - 1]);
					floodfillNext.push([y + 1, x]);
					floodfillNext.push([y + 1, x + 1]);
					floodfillNext.push([y, x - 1]);
					floodfillNext.push([y, x + 1]);
					floodfillNext.push([y - 1, x - 1]);
					floodfillNext.push([y - 1, x]);
					floodfillNext.push([y - 1, x + 1]);
				}
			}
		}
	}
	const boardStr = arr
		.map((el, y) =>
			el
				.map((e, x) => {
					const hide = revealed[y][x] ? "" : "||";
					const glimit = e === 0 ? 1 : 0;
					const groupNext =
						arr[y][x + 1] < glimit ? (x < w - 1 ? "" : "||") : "||";
					const groupPrev =
						arr[y][x - 1] < glimit ? (x > 0 ? "" : "||") : "||";
					return (
						(group ? groupPrev && hide : hide) +
						vals[Math.min(e, 9)] +
						(group ? groupNext && hide : hide) +
						(flag ? "||;||" : "")
					);
				})
				.join(""),
		)
		.join("\n");
	return { boardStr, mineCount };
};
