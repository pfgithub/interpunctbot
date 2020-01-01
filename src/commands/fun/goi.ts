import Router from "commandrouter";
import { AP, a } from "../argumentparser";
import * as moment from "moment";
import * as Discord from "discord.js";

import { messages, safe, raw } from "../../../messages";
import { serverStartTime, ilt } from "../../..";

import Info from "../../Info";
import { getPlayers, createTimer } from "./checkers";

const router = new Router<Info, Promise<any>>();

const ge = {
	skyg: "<:SkyGreen:650520232355692544>",
	sand: "<:Sand:650519965950279684>",
	normalcharacter: "<:normalpot:407696469722791937>",
	goldpot: "<:goldpot:407697013493334036>", // once people have beat the game 50 times
	bgtree: "🌲",
	tree: "<:tree:413755772850143243>",
	ocean: "<:Water:650520886897803264>",
	left: "⬅️",
	up: "⬆️",
	right: "➡️",
	rock: "<:Rock:650518888601354250>",
	vwall: "<:VWall:650522702612004898>",
	paddle: "<:Paddle:650523021609795616>",
	prock: "<:PRock:650523309125009429>"
};

type GoDirectionSpec = (
	| string
	| { message: string; goto: string; rerollChance: number }
)[];

type LevelSpec = {
	text: { template: string[]; v: { [key: string]: string } };
	go: { [emoji: string]: GoDirectionSpec };
};

const goilevels: { [key: string]: LevelSpec } = {
	tree: {
		text: {
			template: ["ssss", "sgpt", "wfff"],
			v: {
				s: ge.skyg,
				g: ge.bgtree,
				p: "player",
				t: ge.tree,
				w: ge.ocean,
				f: ge.sand
			}
		},
		go: {
			[ge.left]: [
				"*You pogo into the water and die. You are back at the beginning*"
			],
			[ge.up]: ["*You pogo up and fall back down*"],
			[ge.right]: [
				"*You try to reach the first branch of the tree but fall back down*",
				"*You make it up to the first branch of the tree, but fall down*",
				{
					message: "*You pull yourself up over the tree*",
					goto: "rock",
					rerollChance: 0.25
				},
				{
					message:
						"*You fling yourself over the tree with great force*",
					goto: "basin",
					rerollChance: 0.75
				}
			]
		}
	},
	rock: {
		text: {
			template: ["____", "|p#_", "fff_"],
			v: {
				_: ge.skyg,
				"|": ge.tree,
				p: "player",
				"#": ge.rock,
				f: ge.sand
			}
		},
		go: {
			[ge.left]: [
				{
					message: "*You make your way back over the tree.*",
					goto: "tree",
					rerollChance: 0
				}
			],
			[ge.up]: ["*You pogo up and fall back down*"],
			[ge.right]: [
				{
					message:
						"*You climb over the rock and fall into the basin*",
					goto: "basin",
					rerollChance: 0
				},
				{
					message:
						"*You fling yourself over the rock with great force*",
					goto: "paddle",
					rerollChance: 0.75
				}
			]
		}
	},
	basin: {
		text: {
			template: ["#__-w", "f__<w", "f_p_w", "ffffw"],
			v: {
				_: ge.skyg,
				"|": ge.tree,
				p: "player",
				"#": ge.rock,
				f: ge.sand,
				"-": ge.paddle,
				"<": ge.prock,
				w: ge.vwall
			}
		},
		go: {
			[ge.left]: [
				"*You try to climb back out of the basin, but fail*",
				"*You make it half way up the left side, but fall off*",
				{
					message: "You climb your way back out of the basin",
					goto: "rock",
					rerollChance: 0.99
				}
			],
			[ge.up]: [
				"*You pogo up but miss the rock and paddle*",
				"*You pogo up and grab the rock, but fall off*",
				{
					message:
						"*You pogo and grab the rock and use it to fling yourself onto the paddle*",
					goto: "paddle",
					rerollChance: 0.75
				}
			],
			[ge.right]: ["*You run into the wall*"]
		}
	},
	paddle: {
		text: {
			template: ["", "ap", ""],
			v: {
				a: "This level is not implemented yet!",
				p: "player"
			}
		},
		go: {
			[ge.left]: [
				{
					message: "You fall back down to the basin",
					rerollChance: 0,
					goto: "basin"
				},
				{
					message:
						"You fling yourself off the paddle with great force",
					rerollChance: 0.75,
					goto: "rock"
				}
			],
			[ge.up]: ["*you go up*"],
			[ge.right]: ["*you go right*"]
		}
	}
};

router.add("goi", [], async (cmd: string, info) => {
	if (info.db ? await info.db.getFunEnabled() : true) {
	} else {
		return info.error(messages.fun.fun_disabled(info));
	}

	if (info.myChannelPerms) {
		if (!info.myChannelPerms.has("USE_EXTERNAL_EMOJIS")) {
			return await info.error(
				"I need permission to `use external emojis` here to play goi\n> https://interpunct.info/help/fun/goi"
			);
		}
		if (!info.myChannelPerms.has("ADD_REACTIONS")) {
			return await info.error(
				"I need permission to `add reactions` here to play goi\n> https://interpunct.info/help/fun/goi"
			);
		}
		if (!info.myChannelPerms.has("MANAGE_MESSAGES")) {
			return await info.error(
				"I need permission to `manage messages` here to remove people's reactions in goi\n> https://interpunct.info/help/fun/goi"
			);
		}
	}

	const gamemsg = await info.message.channel.send("Setting up game...");

	let level = "tree";
	await gamemsg.react(ge.left);
	await gamemsg.react(ge.up);
	await gamemsg.react(ge.right);

	const events: string[] = [];
	let eventIndex = 1;

	let isUpdating = false;
	let postUpdate: ((q: boolean) => void)[] = [];
	const updateMessage = async () => {
		if (isUpdating) {
			postUpdate.forEach(v => v(false));
			postUpdate = [];
			const v = await new Promise(r => postUpdate.push(r));
			if (!v) {
				return;
			}
		}
		//eslint-disable-next-line require-atomic-updates
		isUpdating = true;
		await gamemsg.edit(`**Getting Over It with Bennett Foddy**
${
	goilevels[level]
		? goilevels[level].text.template
				.map(l =>
					l
						.split("")
						.map(q =>
							goilevels[level].text.v[q] === "player"
								? ge.normalcharacter
								: goilevels[level].text.v[q]
						)
						.join("")
				)
				.join("\n")
		: `404! Level \`${level}\` not found!`
}${events.map((ev, i) => `\n${ev}`).join("")}`);
		//eslint-disable-next-line require-atomic-updates
		isUpdating = false;
		postUpdate.forEach(v => v(true));
	};
	const addEvent = (event: string) => {
		events.push(`${eventIndex++} - ${event}`);
		if (events.length > 5) {
			events.shift();
		}
	};
	const doAction = (actions: GoDirectionSpec, depth = 0): void => {
		const action = actions[Math.floor(Math.random() * actions.length)];
		if (typeof action === "string") {
			return addEvent(action);
		}
		if (Math.random() < action.rerollChance && depth < 100) {
			return doAction(actions, depth + 1);
		}
		addEvent(action.message);
		level = action.goto;
	};
	const timer = createTimer([
		60000,
		async () => {
			rh.end();
		}
	]);
	const rh = info.handleReactions(gamemsg, async (rxns, user) => {
		timer.reset();
		if (user.id !== info.message.author.id) {
			return;
		}
		ilt(rxns.users.remove(user.id), "remove reaction in goi");
		const emov = rxns.emoji.name;
		if (!goilevels[level]) {
			return;
		}
		if (!goilevels[level].go[emov]) {
			return;
		}
		doAction(goilevels[level].go[emov]);
		await updateMessage();
	});
	await updateMessage();
	await rh.done;
	addEvent("Game over :(");
	await updateMessage();
});

export default router;
