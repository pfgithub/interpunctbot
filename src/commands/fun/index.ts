import Router from "commandrouter";
import * as moment from "moment";

import Info from "../../Info";

const router = new Router<Info, Promise<any>>();

import { messages } from "../../../messages";
import { serverStartTime, ilt } from "../../..";

import connect4 from "./connect4";
import trivia from "./trivia";
import goi from "./goi";
import checkers, { createTimer } from "./checkers";

import { AP, a } from "../argumentparser";
import { RichPresenceAssets } from "discord.js";
import { runInNewContext } from "vm";

router.add("ping", [], async (cmd: string, info) => {
	if (info.db ? await info.db.getFunEnabled() : true) {
	} else {
		return await info.error(messages.fun.fun_disabled(info));
	}

	if (Math.random() > 0.9) {
		return await info.result("\\*misses\\*");
	}
	return await info.result("Pong!");
});

router.add("pong", [], async (cmd: string, info) => {
	if (info.db ? await info.db.getFunEnabled() : true) {
	} else {
		return await info.error(messages.fun.fun_disabled(info));
	}

	if (Math.random() > 0.9) {
		return await info.result("\\*misses\\*");
	}
	return await info.result("Ping!");
});

router.add("stats", [], async (cmd: string, info) => {
	if (info.db ? await info.db.getFunEnabled() : true) {
	} else {
		return await info.error(messages.fun.fun_disabled(info));
	}
	return await info.result(
		`**Statistics**:
> **Servers**: ${info.message.client.guilds.size} servers
> **Uptime**: ${moment
			.duration(new Date().getTime() - serverStartTime)
			.format(
				"y [years] M [months] w [weeks] d [days,] h[h]:mm[m]:s.SSS[s]"
			)}
> Took ${new Date().getTime() - info.other!.startTime}ms, handling ${
			info.other!.infoPerSecond
		} db requests per second`,
		undefined
	);
});

router.add("remindme", [], async (cmd, info) => {
	if (info.db ? await info.db.getFunEnabled() : true) {
	} else {
		return await info.error(messages.fun.fun_disabled(info));
	}
	let ap = await AP({ cmd, info }, a.duration(), ...a.words());
	if (!ap) return;
	let [delay, message] = ap;

	info.timedEvents.queue(
		{
			type: "pmuser",
			message: `Reminder: ${message}`,
			user: info.message.author.id
		},
		new Date().getTime() + delay
	);
	await info.success("Reminder set");
});

router.add("fun", [Info.theirPerm.manageBot], async (cmd: string, info) => {
	if (!info.db) {
		return await info.error(
			messages.failure.command_cannot_be_used_in_pms(info)
		);
	}
	if (cmd === "enable") {
		await info.db.setFunEnabled(true);
		return await info.success(messages.fun.fun_has_been_enabled(info));
	} else if (cmd === "disable") {
		await info.db.setFunEnabled(false);
		return await info.success(messages.fun.fun_has_been_disabled(info));
	}
	return await info.error(messages.fun.command_not_found(info));
});

router.add("", [], connect4);
router.add("", [], trivia);
router.add("", [], goi);
router.add("", [], checkers);

// ------------------- MINESWEEPER -----------------------

/////////////////////////////////////
// WARNING. Viewing the code below //
//   may be bad. Viewer discretion //
//   advised.                      //
/////////////////////////////////////

// TODO: rewrite this and make it support revealing the top left by default as
// well as batching together groups of mines so they aren't all over the place.

// Or code golf it instead. Maybe the code will be more readable.

router.add("minesweeper", [], async (cmd: string, info) => {
	if (info.db ? await info.db.getFunEnabled() : true) {
	} else {
		return await info.error(messages.fun.fun_disabled(info));
	}
	const words = cmd.split(" ");
	let difficulty: keyof typeof dv | undefined;
	let customvalue: number = 0;
	let mode: string | undefined;
	let width: number | undefined;
	let height: number | undefined;
	let flag: boolean = false;
	const remainingWords = words.filter(word => {
		if (difficulties.indexOf(word as any) > -1) {
			difficulty = word as any;
			return false;
		}
		if (modesl.indexOf(word as any) > -1) {
			mode = word as any;
			return false;
		}
		if (word === "flag") {
			flag = true;
			return false;
		}
		const sizeMatch = word.match(/^([0-9]+)x([0-9]+)$/);
		if (sizeMatch) {
			width = Math.min(+sizeMatch[1], 25);
			height = Math.min(+sizeMatch[2], 25);
			return false;
		}
		const percentMatch = word.match(/^([0-9]+)%$/);
		if (percentMatch) {
			difficulty = "custom";
			customvalue = Math.min(Math.max(+percentMatch[1], 0), 100) / 100;
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
			messages.fun.minesweeper_usage(info, difficulties, modesl)
		);
	}

	const generatedBoard = badMinesweeperGenerator({
		difficulty,
		mode,
		width,
		height,
		flag,
		customvalue
	});

	// if (info.myChannelPerms ? info.myChannelPerms.has("EMBED_LINKS") : true) {
	// ...
	// }
	const linesUnder2000: string[] = [];
	const splitQuotedBoard = generatedBoard.split("\n").map(l => `> ${l}`);
	splitQuotedBoard.push(
		`**${width}**x**${height}** | theme: **${mode}** | difficulty: **${difficulty}** (${Math.round(
			(dv[difficulty] === -1 ? customvalue : dv[difficulty]) * 100
		)}%) | top left is always safe ${flag ? "flag" : ""}`
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
});

const dv = {
	easy: 0.05,
	medium: 0.15,
	hard: 0.2,
	veryhard: 0.25,
	epic: 0.3,
	ultra: 0.45,
	custom: -1
};
const difficulties: (keyof typeof dv)[] = [
	"easy",
	"medium",
	"hard",
	"veryhard",
	"epic",
	"ultra"
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
		string
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
		" `X` "
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
		"<:b_:579074398699651072>"
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
		"💥"
	]
};

const badMinesweeperGenerator = ({
	difficulty,
	mode,
	width,
	height,
	flag,
	customvalue
}: {
	difficulty: keyof typeof dv;
	mode: keyof typeof modes;
	width: number;
	height: number;
	flag: boolean;
	customvalue: number;
}) => {
	const v = modes[mode];
	const vals = v;
	// if(v === "custom") {vals =
	// [0,1,2,3,4,5,6,7,8,9].map(i=>document.getElementById(i).value)} else
	// vals = JSON.parse(v);
	const w = width;
	const h = height;
	const b = dv[difficulty] === -1 ? customvalue : dv[difficulty];
	const arr: number[][] = [];
	for (let y = 0; y < h; y++) {
		arr[y] = [];
		for (let x = 0; x < w; x++) {
			arr[y][x] = Math.random() > b ? 0 : 9;
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
	return arr
		.map(
			el =>
				`||${el
					.map(e => vals[Math.min(e, 9)])
					.join(`${flag ? "||||;" : ""}||||`)}${
					flag ? "||||;" : ""
				}||`
		)
		.join(`\n`)
		.replace(/^\|\|(.+?)\|\|/, "$1");
};

export default router;
