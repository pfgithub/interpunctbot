import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import Router from "commandrouter";
import { perr, ilt } from "../../..";
import { messages } from "../../../messages";
import Info from "../../Info";
import { createTimer } from "./checkers";

const router = new Router<Info, Promise<any>>();

type GoDirectionSpec = (
	| string
	| { msg: string; goto?: string; reroll?: string }
)[];

type LevelSpec = {
	text: string;
	left: GoDirectionSpec;
	up: GoDirectionSpec;
	right: GoDirectionSpec;
};

const gamedata = yaml.safeLoad(
	fs.readFileSync(
		path.join(process.cwd(), "src/commands/fun/goi.yaml"),
		"utf-8",
	),
);

const ge: { [key: string]: string | undefined } = gamedata.emojis;

const goilevels: { [key: string]: LevelSpec } = gamedata.levels;

router.add("goi", [], async (cmd: string, info) => {
	if (info.db ? await info.db.getFunEnabled() : true) {
	} else {
		return await info.error(messages.fun.fun_disabled(info));
	}

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

	let level = gamedata.start;
	await gamemsg.react(ge.left!);
	await gamemsg.react(ge.up!);
	await gamemsg.react(ge.right!);

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
		? goilevels[level].text.replace(/{(.+?)}/g, (_, v) => {
				v = v.trim();
				if (v === "player") return ge.normalcharacter!;
				return ge[v] || "{err`" + v + "`}";
		  })
		: `404! Level \`${level}\` not found!`
}${events.map(ev => `\n${ev}`).join("")}`);
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
		if (
			Math.random() < parseInt(action.reroll || "0", 10) / 100 &&
			depth < 100
		) {
			return doAction(actions, depth + 1);
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
			throw new Error("!action for left/up/right");
		}
		doAction(action);
		await updateMessage();
	});
	await updateMessage();
	await rh.done;
	addEvent("Game over :(");
	await updateMessage();
	await ilt(gamemsg.reactions.removeAll(), "goi reactions removeall"); // potential perms error
});

export default router;
