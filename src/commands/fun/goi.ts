import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import { ilt, perr } from "../../..";
import * as nr from "../../NewRouter";
import { createTimer, setEditInterval } from "./helpers";

type GoDirectionSpec = (
	| string
	| { msg: string; goto?: string; chance?: string }
)[];

type LevelSpec = {
	text: string;
	left: GoDirectionSpec;
	up: GoDirectionSpec;
	right: GoDirectionSpec;
};

let ge: { [key: string]: string | undefined };

let goilevels: { [key: string]: LevelSpec };

let game_start_level: string;

function reloadGoi(): undefined | Error {
	try {
		const gamedata = yaml.safeLoad(
			fs.readFileSync(
				path.join(process.cwd(), "src/commands/fun/goi.yaml"),
				"utf-8",
			),
		);
		ge = gamedata.emojis;
		goilevels = gamedata.levels;
		game_start_level = gamedata.start;
	} catch (e) {
		return e;
	}
}

const goload = reloadGoi();
if (goload) throw goload;

nr.globalCommand(
	"/help/owner/reloadgoi",
	"reloadgoi",
	{
		usage: "reloadgoi",
		description: "reloads the goi yaml file",
		examples: [],
		perms: {runner: ["bot_owner"]},
	},
	nr.list(),
	async ([], info) => {
		const start = Date.now();
		const goloadres = reloadGoi();
		if (goloadres) {
			return await info.error(
				info.tag`Uh oh! An error: ${goloadres.toString()}`,
			);
		}
		const end = Date.now();
		return await info.success(
			info.tag`Success! Reloaded {Code|goi.yaml} in ${"" +
				(end - start)}ms`,
		);
	},
);

nr.globalCommand(
	"/help/fun/goi",
	"goi",
	{
		usage: "goi",
		description: "Play a game of Getting Over It with Bennett Foddy",
		examples: [],
		perms: {fun: true}
	},
	nr.list(),
	async ([], info) => {
		if (info.myChannelPerms) {
			if (!info.myChannelPerms.has("USE_EXTERNAL_EMOJIS")) {
				return await info.error(
					"I need permission to `use external emojis` here to play goi\n> https://interpunct.info/help/fun/goi",
				);
			}
			if (!info.myChannelPerms.has("ADD_REACTIONS")) {
				return await info.error(
					"I need permission to `add reactions` here to play goi\n> https://interpunct.info/help/fun/goi",
				);
			}
			if (!info.myChannelPerms.has("MANAGE_MESSAGES")) {
				return await info.error(
					"I need permission to `manage messages` here to remove people's reactions in goi\n> https://interpunct.info/help/fun/goi",
				);
			}
		}

		const gamemsg = await info.message.channel.send("Setting up game...");

		let level = game_start_level;
		await gamemsg.react(ge.left!);
		await gamemsg.react(ge.up!);
		await gamemsg.react(ge.right!);

		const events: string[] = [];
		let eventIndex = 1;

		const editInterval = setEditInterval(
			async () => {
				await gamemsg.edit(`**Getting Over It with Bennett Foddy**
${
	goilevels[level]
		? goilevels[level].text.replace(/{(.+?)}/g, (_, v) => {
		    v = v.trim();
		    if (v === "player") return ge.normalcharacter!;
		    return ge[v] || "{err`" + v + "`}";
		  })
		: `404! Level \`${level}\` not found!`
}${events.map(ev => `\n${ev}`).join("")}`);
			},
			undefined,
			true,
		);
		const addEvent = (event: string) => {
			events.push(`${eventIndex++} - ${event}`);
			if (events.length > 5) {
				events.shift();
			}
		};
		const doAction = (actions: GoDirectionSpec, depth = 0): void => {
			const actionChances: { i: number; chance: number }[] = [];
			let total = 0;
			let i = 0;
			for (const action of actions) {
				let current = -1;
				// in zig, let current = if(...) ... else ...
				if (typeof action === "string") {
					current = 1;
				} else if (action.chance !== undefined) {
					current = +action.chance;
				} else {
					current = 1;
				}
				total += current;
				actionChances.push({ i, chance: total });
				i++;
			}

			const pickNum = Math.random() * total;
			const actionIndex = [...actionChances]
				.reverse()
				.filter(m => pickNum < m.chance)
				.pop()!;
			console.log(actionChances, pickNum, actionIndex);
			const action = actions[actionIndex.i];

			if (typeof action === "string") {
				return addEvent(action);
			}
			addEvent(action.msg);
			if (action.goto) {
				level = action.goto;
			}
		};
		const timer = createTimer([
			60000,
			async () => {
				rh.end();
			},
		]);
		const rh = info.handleReactions(gamemsg, async (rxns, user) => {
			timer.reset();
			if (user.id !== info.message.author.id) {
				return;
			}
			perr(rxns.users.remove(user.id), "remove reaction in goi");
			const emov = rxns.emoji.name;
			if (!goilevels[level]) {
				return;
			}
			let action = undefined;
			const levelt = goilevels[level];
			if (emov === ge.left!) {
				action = levelt.left;
			} else if (emov === ge.up!) {
				action = levelt.up;
			} else if (emov === ge.right!) {
				action = levelt.right;
			} else {
				return;
			}
			if (!action) {
				console.log(level, action, emov);
				addEvent(
					"*Uh oh! No one wrote the events for level `" +
						level +
						"` in the direction " +
						emov +
						"*",
				);
				editInterval.trigger();
				return;
			}
			doAction(action);
			editInterval.trigger();
		});
		await rh.done;
		addEvent("Game over :(");
		editInterval.trigger();
		// endInterval does not need to be ended because it does not auto requeue in manual mode
		await ilt(gamemsg.reactions.removeAll(), "goi reactions removeall"); // potential perms error
	},
);
