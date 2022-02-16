import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import * as nr from "../../NewRouter";
import {
	callback,
	CreateOpts, Game, HandleInteractionResponse,
	mkbtn,
	RenderResult,
	renderResultToHandledInteraction, renderResultToResult
} from "./buttongames/tictactoe";


type GOIState = {
	player: string,
	level: string,
	start_time: number,
	event_index: number,
	events: string[],
};

function newRender(state: GOIState): RenderResult<GOIState> {
	const level = goilevels[state.level];

	const addEvent = (event: string) => {
		state.events.push(`${state.event_index++} - ${event}`);
		if (state.events.length > 5) {
			state.events.shift();
		}
	};

	const doAction = (actions: GoDirectionSpec) => {
		const actionChances: { i: number, chance: number }[] = [];
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

		const pick_num = Math.random() * total;
		const action_index = [...actionChances]
			.reverse()
			.filter(m => pick_num < m.chance)
			.pop()!;
		console.log(actionChances, pick_num, action_index);
		const action = actions[action_index.i];

		if (typeof action === "string") {
			return addEvent(action);
		}
		addEvent(action.msg);
		if (action.goto) {
			state.level = action.goto;
		}
	};

	const content = `**Getting Over It with Bennett Foddy**
${
	level
		? level.text.replace(/{(.+?)}/g, (_, v) => {
			v = v.trim();
			if (v === "player") return ge.normalcharacter!;
			return ge[v] || "{err`" + v + "`}";
			})
		: `404! Level \`${state.level}\` not found!`
}${state.events.map(ev => `\n${ev}`).join("")}`;
	return {
		content,
		embeds: [],
		components: [
			[
				...([["left", "←"], ["up", "↑"], ["right", "→"]] as const).map(([dir, label]) => {
					return mkbtn<GOIState>(
						label,
						"secondary",
						{disabled: level[dir] === undefined},
						callback("GO_"+dir, (author_id) => {
							if (author_id !== state.player) {
								return {kind: "error", msg: "This isn't your game - make your own."};
							}
							if (!level) {
								return {kind: "error", msg: "This level doesn't exist. Error."};
							}
							const action = level[dir];
							if (!action) {
								throw new Error("Expected action");
							}
							doAction(action);
							return {kind: "update_state", state};
						}),
					);
				}),
			],
			// maybe add a dropdown menu in debug mode for picking the level
			// or if you;re tge iwber udj
			// you're the owner
		],
		allowed_mentions: {parse: []},
	};
}

export const GOIGame: Game<GOIState> & {
	init(o: CreateOpts): GOIState,
} = {
	kind: "GOI",
	init({author_id}) {
		return {
			player: author_id,
			level: game_start_level,
			start_time: Date.now(),
			event_index: 1,
			events: [],
		};
	},
	render(state, key, info) {
		return renderResultToResult(newRender(state), key);
	},
	handleInteraction(opts): HandleInteractionResponse<GOIState> {
		return renderResultToHandledInteraction(newRender(opts.state), opts);
	},
};

type GoDirectionSpec = (
	| string
	| { msg: string, goto?: string, chance?: string }
)[];

type LevelSpec = {
	text: string,
	left: GoDirectionSpec,
	up: GoDirectionSpec,
	right: GoDirectionSpec,
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
		return e as Error;
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
