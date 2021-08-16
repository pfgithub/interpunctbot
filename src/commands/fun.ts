import moment from "moment";
import { serverStartTime } from "../..";
import { messages, safe, raw } from "../../messages";
import { durationFormat } from "../durationFormat";
import { setEditInterval } from "../editInterval";
import Info from "../Info";
import * as discord from "discord.js";
import * as nr from "../NewRouter";
import { a, AP } from "./argumentparser";
import "./fun/gamelibgames";
import "./fun/goi";
import { createTimer } from "./fun/helpers";
import "./fun/trivia";
import "./fun/spyfall";
import { getGuilds, getMembers } from "../ShardHelper";
import * as fsync from "fs";
import fetch from "node-fetch";

nr.addDocsWebPage(
	"/help/games",
	"Games",
	"games",
	`{Title|Games}\n\n{Interpunct} has a variety of games.

{CmdSummary|tictactoe}
{CmdSummary|checkers}
{CmdSummary|circlegame}
{CmdSummary|papersoccer}
{CmdSummary|ultimate tictactoe}
{CmdSummary|infinite tictactoe}
{CmdSummary|connect4}
{CmdSummary|trivia}
{CmdSummary|randomword}

{Heading|Configuration}
Games are enabled by default.
{CmdSummary|fun}

`,
);
nr.addDocsWebPage(
	"/help/fun",
	"Fun",
	"fun commands",
	`{Title|Fun}\n\n{Interpunct} has a variety of fun commands.

{Heading|Configuration}
Fun commands are enabled by default.
{CmdSummary|fun}

{Heading|Misc}
{CmdSummary|ping}
{CmdSummary|time}
{CmdSummary|vote}
{CmdSummary|stats}
{CmdSummary|timer}
{CmdSummary|timer}
{CmdSummary|needle}
{CmdSummary|sendmsg}
{CmdSummary|editmsg}
{CmdSummary|viewmsgsource}
{CmdSummary|remindme}
{CmdSummary|calculator}
{CmdSummary|randomword}
{CmdSummary|inspirobot}
{CmdSummary|bubblewrap}
{CmdSummary|minesweeper}
`,
);

nr.globalCommand(
	"/help/fun/ping",
	"ping",
	{
		usage: "ping",
		description: "Play a game of ping pong against {Interpunct}.",
		examples: [{ in: "ping", out: "@you, Pong!" }],
		perms: { fun: true },
	},
	nr.list(),
	async ([], info) => {
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
		perms: { fun: true },
	},
	nr.list(),
	async ([], info) => {
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
		perms: { fun: true },
	},
	nr.list(),
	async ([], info) => {
		const size = 190;
		const item = Math.floor(Math.random() * size);
		await info.result(
			"Find the needle (|):\n" +
				new Array(size)
				    .fill("")
				    .map((_, i) => (i === item ? "|||||" : "|| ||"))
				    .join(""),
		);
	},
);

nr.globalCommand(
	"/help/fun/bubblewrap",
	"bubblewrap",
	{
		usage: "bubblewrap",
		description: "Bubblewrap.",
		examples: [],
		perms: { fun: true },
	},
	nr.list(),
	async ([], info) => {
		const w = 8;
		const h = 10;

		const cx = Math.floor(Math.random() * w);
		const cy = Math.floor(Math.random() * h);
		//prettier-ignore
		await info.result(
			"​\n" +
			new Array(h)
			    .fill("")
			    .map((_, y) =>
			        new Array(w)
			            .fill("")
			            .map((_, x) =>
					(x === cx && y === cy) ? "||Pöp||" : "||Pop||",
			            ).join(" "),
			    ).join("\n"),
		);
	},
);

nr.globalCommand(
	"/help/fun/award",
	"award",
	{
		usage: "award {Required|{Atmention|who}} {Required|award text...}",
		description: "Give someone an award.",
		examples: [],
		perms: { fun: true },
	},
	nr.list(nr.a.user(), ...nr.a.words()),
	async ([user, award], info) => {
		if (!award) return await info.docs("/help/fun/award", "usage");

		const userDisplayName = info.guild
			? info.guild.members.resolve(user)?.displayName || user.username
			: user.username;

		await info.result(
			`
**=============== 🏅 =================**
${" ".repeat(
		Math.max(30 - userDisplayName.length, 0),
	)}Congratulations ${user.toString()},
               You have been granted the award:
${" ".repeat(Math.max(43 - award.length, 0))}**${safe(award)}**
            for all your dedication and hard work!
**===================================**`,
		);
	},
);

nr.globalCommand(
	"/help/fun/botdev",
	"botdev",
	{
		usage: "botdev",
		description: "Get help",
		examples: [],
		perms: { fun: true },
	},
	nr.list(),
	async ([], info) => {
		await info.error(
			`Command \`botdev\` not found, type \`${info.prefix}notdev\` for a list of commands.`,
		);
		return;
	},
);

nr.globalCommand(
	"/help/fun/notdev",
	"notdev",
	{
		usage: "botdev",
		description: "Get help",
		examples: [],
		perms: { fun: true },
	},
	nr.list(),
	async ([], info) => {
		await info.error(
			`Command \`notdev\` not found, type \`${info.prefix}botdev\` for a list of commands.`,
		);
		return;
	},
);

const ms = (mss: number) => new Promise(r => setTimeout(r, mss));

nr.globalCommand(
	"/help/fun/load",
	"load",
	{
		usage: "load {Optional|final message}",
		description: "Fetch results",
		examples: [],
		perms: { fun: true },
	},
	nr.list(...nr.a.words()),
	async ([finalressafe], info) => {
		const prefix =
			"<@" + info.message.author.id + ">, <a:loading:682804438783492139>";
		const msg = await info.channel.send({
			content: prefix,
			...Info.msgopts,
		});
		info.message.delete().catch(() => {});
		await ms(3000);
		await msg.edit(prefix + " Just one moment...");
		await ms(6000);
		await msg.edit(
			prefix + " This is taking a bit longer than expected...",
		);
		await ms(9000);
		await msg.edit(prefix + " Please wait, fetching results...");
		await ms(12000);
		await msg.edit({
			content: info.message.author.toString() +
				", " +
				(messages.emoji.success + " " + finalressafe.trim() ||
					messages.emoji.failure +
						" Huh, it seems something went wrong."),
			...Info.msgopts,
		});
	},
);

nr.globalCommand(
	"/help/time",
	"time",
	{
		usage: "time {Optional|timezone}",
		description: "time",
		examples: [
			{ in: "time", out: "Fri, 18 Dec 2020 06:33:28 GMT" },
			{
				in: "time ET",
				out: "{Emoji|failure} timezones are not implemented yet :(",
			},
		],
		perms: { fun: true },
	},
	nr.list(...nr.a.words()),
	async ([cmd], info) => {
		if (cmd.trim())
			return await info.error("timezones are not implemented yet :(");
		return await info.result(new Date().toUTCString());
	},
);

nr.globalCommand(
	"/help/fun/color",
	"color",
	{
		usage: "color {Required|hex code}",
		description: "shows an image of a hex color",
		examples: [],
		perms: { fun: true },
	},
	nr.list(nr.a.word()),
	async ([word], info) => {
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
		perms: { fun: true },
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
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
		perms: { fun: true },
	},
	nr.list(),
	async ([], info) => {
		await info.success("You made the right choice!");
	},
);

function initMapping(fromstr: string, tostr: string): (str: string) => string {
	const from = [...fromstr];
	const to = [...tostr];
	if (from.length !== to.length)
		throw new Error("different mapping lengths.");

	const res: { [key: string]: string } = {};
	from.forEach((q, i) => {
		res[q] = to[i];
	});

	return (str: string) => [...str].map(c => res[c] || c).join("");
}

const superscript = initMapping(
	"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-",
	"ᵃᵇᶜᵈᵉᶠᵍʰᶦʲᵏˡᵐⁿᵒᵖᵠʳˢᵗᵘᵛʷˣʸᶻᴬᴮᶜᴰᴱᶠᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾᵠᴿˢᵀᵁⱽᵂˣʸᶻ⁰¹²³⁴⁵⁶⁷⁸⁹·¯",
);
const smallcaps = initMapping(
	"abcdefghijklmnopqrstuvwxyz",
	"ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ",
);

nr.globalCommand(
	"/help/fun/tiny",
	"tiny",
	{
		usage: "tiny {Required|text...}",
		description: "makes your text ᵗᶦⁿʸ",
		examples: [],
		perms: { fun: true },
	},
	nr.list(...nr.a.words()),
	async ([text], info) => {
		return info.result(superscript(safe(text)));
	},
);

nr.globalCommand(
	"/help/fun/small",
	"small",
	{
		usage: "small {Required|text...}",
		description: "makes your text sᴍᴀʟʟᴄᴀᴘs",
		examples: [],
		perms: { fun: true },
	},
	nr.list(...nr.a.words()),
	async ([text], info) => {
		return info.result(smallcaps(safe(text)));
	},
);

nr.globalCommand(
	"/help/fun/vdb",
	"vdb",
	{
		usage: "vdb {Optional|command}",
		description: "runs a command in the vdb debugger",
		examples: [],
		perms: { fun: true },
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		const callcmd = (ctxt: string) => {
			if (ctxt === "help") {
				return safe`Uh oh! VDB debugging mode is not enabled. Help is not enabled.`;
			}
			if (ctxt === "apropos word") {
				return safe`if -- Execute nested commands once IF the conditional expression is non zero.
while -- Execute nested commands WHILE the conditional expression is non zero.
x -- Examine memory: x/FMT ADDRESS.`;
			}
			if (ctxt === "quit") {
				return "";
			}
			return safe`Undefined command: "${ctxt}". Try "help".`;
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
	"/help/inspirobot",
	"inspirobot",
	{
		usage: "inspirobot",
		description: "get some inspiration from inspirobot",
		examples: [],
		perms: { fun: true },
	},
	nr.list(),
	async ([], info) => {
		const txtres = await (
			await fetch("https://inspirobot.me/api?generate=true")
		).text();
		return await info.result({
			content: "\u200b",
			files: [
				{
					name: "inspiration.png",
					attachment: txtres,
				},
			],
		});
	},
);
nr.globalAlias("inspirobot", "inspireme");

nr.addErrorDocsPage("/help/fun/timer/too-long", {
	overview:
		"That timer is too long. If you need a time longer than 1 hour, use {Command|remindme}.",
	detail: "",
	mainPath: "/help/fun/timer",
});

// nr.globalCommand(
// 	"/help/fun/timer",
// 	"timer",
// 	{
// 		usage: "timer {Required|{Duration}}",
// 		description:
// 			"set a short timer. use {Command|remindme} for long times.",
// 		examples: [],
// 	},
// 	nr.list(nr.a.duration()),
// 	async ([tms], info) => {
// 		if (tms > 1 * 60 * 60 * 1000)
// 			// 1hr
// 			return await info.docs("/help/fun/timer/too-long", "error");
//
// 		const message = await info.channel.send(
// 			"<a:loading:682804438783492139> Starting timer...",
// 		);
//
// 		const time = () => new Date().getTime();
// 		let start = 0;
// 		let paused: undefined | { ms: number };
//
// 		const rxnh = info.handleReactions(
// 			message,
// 			async (rx, ur) => {
// 				if (info.message.author.id !== ur.id) return;
// 				if (rx.emoji.name === "⏹️") {
// 					return rxnh.end();
// 				}
// 				if (rx.emoji.name === "⏸️") {
// 					if (!paused) paused = { ms: time() - start };
// 					return;
// 				}
// 			},
// 			async (rx, ur) => {
// 				if (info.message.author.id !== ur.id) return;
// 				if (rx.emoji.name === "⏸️") {
// 					if (paused) {
// 						start = time() - paused.ms;
// 						paused = undefined;
// 					}
// 					return;
// 				}
// 			},
// 		);
//
// 		await message.react("⏸️");
// 		await message.react("⏹️");
//
// 		start = time();
// 		const ei = setEditInterval(async () => {
// 			const nmc =
// 				(paused ? "**Paused**. " : "") +
// 				durationFormat(
// 					paused ? tms - paused.ms : tms - (time() - start),
// 				) +
// 				" remaining.";
// 			if (message.content === nmc) return;
// 			await message.edit(nmc);
// 		});
//
// 		await rxnh.done;
// 		ei.end();
// 		await message.edit("Timer over.");
// 		await info.success("Time up.");
//      // todo is: timer unpausing, update immediately after clicking reaction (with ratelimit), alert when timer is over (with settimeout that gets stopped and resumed on pause), don't allow infinite pause
// 	},
// );

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
		perms: { fun: true },
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
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
				if (info.guild.members.cache.size !== info.guild.memberCount) {
					await info.message.channel.sendTyping();
					await info.guild.members.fetch();
				}
				const rolemembers = role.members.size;
				results.push(
					"This server has " +
						rolemembers.toLocaleString("en-US") +
						" members with the role " +
						messages.role(role) +
						" (" +
						(
						    rolemembers / info.guild.members.cache.size
						).toLocaleString("en-US", {
						    style: "percent",
						    minimumSignificantDigits: 3,
						    maximumSignificantDigits: 3,
						}) +
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
		perms: { fun: true },
	},
	nr.list(),
	async ([], info) => {
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
		perms: { fun: true, raw_message: true },
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		if (!cmd) {
			return await info.docs("/help/fun/vote2", "usage");
		}
		await Promise.all([info.raw_message!.react("👍"), info.raw_message!.react("👎")]);
	},
);

nr.globalCommand(
	"/help/fun/userinfo",
	"userinfo",
	{
		usage: "userinfo {Required|{Atmention|someuser}}",
		description: "gives some user info",
		examples: [],
		perms: { fun: true },
	},
	nr.list(nr.a.user()),
	async ([ussr], info) => {
		const now = new Date().getTime();
		let l2o = "";
		if (info.guild) {
			const member = info.guild.members.resolve(ussr)!;
			const jat = member.joinedAt!.getTime();
			l2o = safe`\nJoined this server ${durationFormat(
				now - jat,
			)} ago (${new Date(jat).toUTCString()})`;
		}
		const dat = ussr.createdAt.getTime();
		return await info.result(
			safe`Info about ${raw(
				ussr.toString(),
			)}\nJoined discord ${durationFormat(now - dat)} ago (${new Date(
				dat,
			).toUTCString()})${raw(l2o)}`,
		);
	},
);

export async function getMsgFrom(
	info: Info,
	wrds: string,
	prefix: string,
	postfix: string,
	help: string,
): Promise<string | undefined> {
	const link = wrds.trim();
	if (
		link.length < 3 ||
		!link.startsWith(prefix) ||
		!link.endsWith(postfix) ||
		/[^a-zA-Z0-9]/.exec(link)
	) {
		await info.docs(help, "usage");
		return;
	}
	const resultraw = await fetch(
		"https://s.pfg.pw/" +
			encodeURIComponent(link.substring(1, link.length - 1)),
		{ redirect: "manual" },
	);
	console.log(resultraw);
	console.log(resultraw.headers.get("location"));
	const hgl = resultraw.headers.get("location");
	if (!hgl) {
		await info.error("Error 0x1fA4v43");
		return;
	}
	const location = hgl.replace("https://pfg.pw/spoilerbot/spoiler?s=", "");
	if (hgl === location) {
		await info.error("Error 0x432na9f");
		return;
	}
	const decoded = decodeURIComponent(location.replace(/\+/g, " "));
	const parsed = JSON.parse(decoded);
	if (typeof parsed !== "object" || typeof parsed.text !== "string") {
		await info.error("Error 0xzx42lx0a3p[]");
		return;
	}

	return parsed.text;
}

nr.globalCommand(
	"/help/sendmsg",
	"sendmsg",
	{
		usage: "sendmsg",
		description:
			"Send a message from {Link|https://pfg.pw/sitepages/messagecreator}",
		examples: [],
		perms: { runner: ["manage_messages_thischannel"] },
	},
	nr.list(...nr.a.words()),
	async ([wrds], info) => {
		if (!wrds)
			return await info.result(
				"Create your message at <https://pfg.pw/sitepages/messagecreator>.",
			);
		const msgval = await getMsgFrom(info, wrds, "c", "R", "/help/sendmsg"); // zig: getMsgFrom(wrds) orelse return (or more likely, catch |err| return reportMsgFromErr(err))
		if (!msgval) return;
		const msgsplit = discord.Util.splitMessage(msgval);
		for(const line of msgsplit) {
			await info.channel.send({ content: line, ...Info.msgopts });
		}
	},
);

async function confirmEditable(
	msgtoedit: discord.Message,
	info: Info,
): Promise<boolean> {
	if (msgtoedit.author.id !== info.message.client.user!.id) {
		await info.error(
			"The message you linked was sent by " +
				msgtoedit.author.toString() +
				", but I can only edit my own messages.",
		);
		return false;
	}
	const theirPerms = (msgtoedit.channel as discord.TextChannel).permissionsFor(
		info.message.author,
	);
	if (!theirPerms || !theirPerms.has("MANAGE_MESSAGES")) {
		await info.error(
			"You need permission to Manage Messages in <#" +
				msgtoedit.channel.id +
				"> in order to edit my message.",
		);
		return false;
	}
	if (!msgtoedit.editable) {
		await info.error("I can't edit that message. I'm not sure why.");
		return false;
	}
	return true;
}

nr.globalCommand(
	"/help/updatemsg",
	"updatemsg",
	{
		usage: "updatemsg {Required|message link} {Required|sendmsg code}",
		description: "{Link|https://pfg.pw/sitepages/messagecreator}",
		examples: [],
		perms: {}, // handled in body
	},
	nr.list(nr.a.message(), ...nr.a.words()),
	async ([msgtoedit, code], info) => {
		if (!(await confirmEditable(msgtoedit, info))) return;
		const msgval = await getMsgFrom(
			info,
			code,
			"M",
			"y",
			"/help/updatemsg",
		); // zig: getMsgFrom(wrds) orelse return (or more likely, catch |err| return reportMsgFromErr(err))
		if (!msgval) return;
		if (msgval.length > 2000)
			return await info.error(
				"I can't edit in more than 2000 characters.",
			);
		await msgtoedit.edit(msgval);
		return await info.success("Edited!");
	},
);

type PTRes = { error: string } | { url: string };
export function shortenLink(longurl: string): Promise<PTRes> {
	return new Promise<PTRes>((resolve, reject) => {
		fetch(
			"https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=AIzaSyAp1bFmhU7jx2tdcDzXz1cJu_9kyQgB5QQ",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					dynamicLinkInfo: {
						domainUriPrefix: "s.pfg.pw",
						link: longurl,
					},
					suffix: { option: "SHORT" },
				}),
			},
		)
			.then(response => response.json())
			.catch(e => {
				return resolve({ error: " " + e.toString() });
			})
			.then(res => {
				console.log(res);
				if (!res.shortLink) {
					return resolve({
						error:
							"Error ```json\n" + JSON.stringify(res) + "\n```",
					});
				}
				return resolve({
					url: res.shortLink,
				});
			})
			.catch(e => reject(e));
	});
}

nr.globalCommand(
	"/help/editmsg",
	"editmsg",
	{
		usage: "editmsg {Required|message link}",
		description: "editmsg [link to a message from {Interpunct}].",
		extendedDescription:
			"Right click / Tap and hold the message from {Interpunct} that you want to edit, and select 'Copy Message Link' to get the message link.",
		examples: [],
		perms: {}, // handled in body
	},
	nr.list(nr.a.message()),
	async ([msgtoedit], info) => {
		if (!(await confirmEditable(msgtoedit, info))) return;
		await msgtoedit.fetch();
		const resurl =
			"https://pfg.pw/sitepages/messagecreator?content=" +
			encodeURIComponent(msgtoedit.content) +
			"&msglink=" +
			encodeURIComponent(msgtoedit.url);
		const postres = await shortenLink(resurl);
		if ("error" in postres) return await info.error(postres.error);
		return await info.result(
			"Edit the message here: <" + postres.url + ">",
		);
	},
);
nr.globalCommand(
	"/help/viewmsgsource",
	"viewmsgsource",
	{
		usage: "viewmsgsource {Required|message link}",
		description:
			"viewmsgsource [link to a message]. it will give you a link to the source markdown of the message.",
		extendedDescription:
			"Right click / Tap and hold the message you want to view source to, and select 'Copy Message Link' to get the message link.",
		examples: [],
		perms: {}, // handled in body
	},
	nr.list(nr.a.message()),
	async ([msgtoedit], info) => {
		const theirPerms = (msgtoedit.channel as discord.TextChannel).permissionsFor(
			info.message.author,
		);
		if (
			!theirPerms ||
			!theirPerms.has("READ_MESSAGE_HISTORY") ||
			!theirPerms.has("VIEW_CHANNEL")
		) {
			return await info.error(
				"You need permission to Read Messages + Read Message History in <#" +
					msgtoedit.channel.id +
					"> in order to view the message source..",
			);
		}

		await msgtoedit.fetch();
		const resurl =
			"https://pfg.pw/spoilerbot/spoiler?s=" +
			encodeURIComponent(msgtoedit.content);
		const postres = await shortenLink(resurl);
		if ("error" in postres) return await info.error(postres.error);
		return await info.result("Message source: <" + postres.url + ">");
	},
);
// command editmsg should do this:
// get a message link
// get the text of the message
// upload it to the url shortener
// send you to https://pfg.pw/sitepages/messagecreator?from=URLSHORTENED&link=MSGLINK
// then messsagecreator should fill the textarea (disable while loading) and when you click "Edit"
// it should give you the `updatemsg` command.

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
		perms: { fun: true },
	},
	nr.passthroughArgs,
	async ([message], info) => {
		const msg = await info.channel.send({
			content: "VOTE: " + message,
			...Info.msgopts,
		});
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
				message +
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
			if (msg.content !== content)
				await msg.edit({content: content, ...Info.msgopts});
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
		await new Promise<void>(resolve => (endhandler = resolve));
		msgEditInterval.end();
		rxnh.end();
		await editMessage(true);
	},
);

const localtrophycount: { [key: string]: number } = {};

const allwords = JSON.parse(
	fsync.readFileSync("words.json", "utf-8"),
) as string[];

function trophyprint(count: number) {
	if (count === 0) return "0";
	return "🏆".repeat(count);
}

nr.globalCommand(
	"/help/fun/randomword",
	"randomword",
	{
		usage: "randomword",
		description: "the first person to type it wins",
		examples: [
			{
				in: "randomword",
				out: "{Screenshot|https://i.imgur.com/dWOoTBM.png}",
			},
		],
		perms: { fun: true, slash_do_not_interact: true },
	},
	nr.passthroughArgs,
	async ([requested_word], info) => {
		if(requested_word && !info.raw_interaction) {
			return await info.docs("/help/fun/randomword", "usage");
		}
		if(requested_word && info.raw_interaction) {
			const trophy_count = localtrophycount[info.message.author.id] || 0;
			if(trophy_count < 5) {
				return await info.raw_interaction.replyHiddenHideCommand("You need 5 trophies to set the word.");
			}
			localtrophycount[info.message.author.id] -= 5;
		}
		if(info.raw_interaction) {
			if(requested_word) {
				await info.raw_interaction.replyHiddenHideCommand("Sending your custom word");
				await info.message.channel.send({content: info.message.author.toString()+" used /randomword with a custom word", ...Info.msgopts});
			}else{
				await info.raw_interaction.accept();
			}
		}

		const msg = info.message;

		const rword = requested_word || allwords[Math.random() * allwords.length >> 0];
		await msg.channel.send({
			content: "Quick, type the word!",
			files: [
				{
					name: "type.png",
					attachment:
						"https://dummyimage.com/400x100/000/fff.png&text=" +
						encodeURIComponent(rword),
				},
			],
		});
		const start = new Date().getTime();
		const collectr = new discord.MessageCollector(
			msg.channel as discord.TextChannel,
			{
				filter: m => m.content.toLowerCase() === rword.toLowerCase(),
				time: 10_000
			},
		);
		await msg.channel.sendTyping();
		let guessed = false;

		const clxtrnded = async () => {
			if (guessed) return;
			const mytrphies = (localtrophycount["MEMEME"] || 0) + 1;
			localtrophycount["MEMEME"] = mytrphies;
			await msg.channel.send(rword);
			await msg.channel.send(
				"Ha! I win\nMy trophy collection: " + trophyprint(mytrphies),
			);
		};
		collectr.on("end", () => {
			clxtrnded().catch(() => {});
		});
		const clxtrclxted = async (msg_: discord.Message) => {
			const finalmsg = msg_;
			guessed = true;
			collectr.stop();
			const time = new Date().getTime() - start;
			localtrophycount[finalmsg.author.id] =
				(localtrophycount[finalmsg.author.id] || 0) + 1;
			const tc = localtrophycount[finalmsg.author.id];
			await finalmsg.channel.send(
				"Congrats " +
					finalmsg.author.toString() +
					", you typed it first in " +
					time +
					"ms." +
					(tc > 1
						? "\nYour trophies this session: " + trophyprint(tc)
						: " Here is your prize: 🏆"),
			);
			await finalmsg.react("🏆");
		};
		collectr.on("collect", msg_ => {
			clxtrclxted(msg_).catch(() => {});
		});
		return;
	},
);
nr.globalAlias("randomword", "random word");
nr.globalAlias("randomword", "randword");
nr.globalAlias("randomword", "rw");

nr.globalCommand(
	"/help/fun/snek",
	"snek",
	{
		usage: "snek",
		description: "snek",
		examples: [],
		perms: { fun: true },
	},
	nr.list(),
	async ([], info) => {
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
		perms: { fun: true },
	},
	nr.list(),
	async ([], info) => {
		const totalServers = await getGuilds(info.message.client);
		const totalMembers = await getMembers(info.message.client);
		const now = new Date().getTime();
		const shardv = info.guild ? ` (id ${info.guild.shardId})` : "";
		const msg = `**Statistics**:
> **Servers**: ${totalServers.toLocaleString()} total, ${
	info.message.client.guilds.cache.size
} on this shard${shardv}. Serving about ${totalMembers.toLocaleString()} users.
> **Uptime**: ${moment
		.duration(now - serverStartTime)
		.format(
			"y [years] M [months] w [weeks] d [days,] h[h]:mm[m]:s.SSS[s]",
		)}
> **Handled in**: ${new Date().getTime() - info.other!.startTime}ms.`;
		const msgs = await info.result(msg);
		if (msgs && msgs[0] && info.raw_message)
			await msgs[0].edit(
				msg +
					"\n> **Took**: " +
					durationFormat(
					    msgs[0].createdAt.getTime() -
							info.raw_message.createdAt.getTime(),
					) +
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
		perms: { fun: true, raw_message: true },
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		if (process.env.NODE_ENV === "production") {
			return await info.error("Sorry! remindme doesn't work right now.");
		}
		const ap = await AP(
			{ cmd, info, help: "/help/fun/remindme" },
			a.duration(),
			...a.words(),
		);
		if (!ap) return;
		const [delay, message] = ap.result;
		const restime = new Date().getTime() + delay;

		await info.timedEvents.queue(
			{
				type: "pmuser",
				message: `Reminder: ${info.raw_message!.url}\n${message
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
		description: "enables or disables fun and games",
		examples: [
			{
				in: "fun disable",
				out: "{Emoji|success} Fun is no longer allowed on this server.",
			},
		],
		perms: { runner: ["manage_bot"] },
	},
	nr.list(nr.a.enum("enable", "disable")),
	async ([mode], info) => {
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
		perms: { fun: true },
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
		await info.channel.send(splitQuotedBoard.join("\n")); // minesweeper is broken atm. also not splitting anymore so even more broken.
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
	difficulty: keyof typeof dv,
	mode: keyof typeof modes,
	width: number,
	height: number,
	flag: boolean,
	customvalue: number,
	group: false,
}): { boardStr: string, mineCount: number } => {
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
			if (vta) mineCount++;
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
