import * as Discord from "discord.js";

import Info from "../../Info";
import { perr, ilt } from "../../..";
import { getPlayers, createTimer } from "./checkers";

export const ratelimit = (frequency: number & { __unit: "ms" }) => {
	let timeout: NodeJS.Timeout | undefined;
	let nextExec: undefined | (() => Promise<void>);
	return (action: () => Promise<void>) => {
		if (timeout) {
			nextExec = action;
			return;
		}
		perr(action(), "executing ratelimit");
		timeout = setTimeout(() => {
			timeout = undefined;
			if (nextExec) perr(nextExec(), "executing ratelimit (nextexec)");
		}, frequency);
	};
};

export function unit(v: number, name: "ms" | "sec") {
	if (name === "sec") return (v * 1000) as number & { __unit: "ms" };
	if (name === "ms") return v as number & { __unit: "ms" };
	throw new Error("invalid unit " + name);
}

export type Player = { id: string };
export type Tile = string;

export type Move<State> = {
	button: Tile;
	player: Player;
	apply: (state: State) => State;
};
export type MoveSet<State> = Move<State>[];
export type GameConfig<State> = {
	setup: (player: Player[]) => State;
	getMoves: (state: State) => MoveSet<State>;
	renderSetup: () => { type: "once"; actions: Tile[] }[];
	render: (state: Readonly<State>) => string[];
	timers: {
		time: number & { __unit: "ms" };
		message?: (v: Readonly<State>) => string;
		update?: (v: State) => State;
	}[];
	help: string;
	title: string;
};

export function copyState<T>(s: T): T {
	// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! todo (for undo)
	// it's actually ok to just pass the existing state for now, it's not like we ever undo yet.
	return s;
}

export const newGame = <State>(conf: GameConfig<State>) => async (
	cmd: string,
	info: Info,
) => {
	if (cmd.trim()) {
		return await info.help(conf.help, "usage");
	}

	if (!info.db) {
		return await info.help("/errors/pms", "error");
	}

	if (!(await info.db.getFunEnabled())) {
		return await info.help("/errors/fun", "error");
	}

	const players = await getPlayers(
		[info.message.author.id],
		2,
		conf.title,
		info,
	);
	if (!players) return;

	let state = conf.setup(
		players.map(pl => ({
			id: pl,
		})),
	);
	state = state;

	let gameStarted = false;

	const messagesConf = conf.renderSetup();
	const messages: {
		msg: Discord.Message;
		text: string;
		rxnh: { end: () => void; done: Promise<unknown> };
	}[] = [];
	{
		const emojiPromises: Promise<unknown>[] = [];
		const initialMessages = [
			"<a:loading:393852367751086090> Starting Game...",
			"<a:loading:393852367751086090>",
		];
		let messageNumber = 0;

		for (const confItem of messagesConf) {
			const message = await info.message.channel.send(
				initialMessages[messageNumber] ||
					initialMessages[initialMessages.length - 1],
			);
			const rxnh = info.handleReactions(message, onReactionHoisted);
			messages.push({ msg: message, text: "@!@", rxnh });
			emojiPromises.push(
				(async () => {
					for (const emoji of confItem.actions) {
						await message.react(/:([0-9]+)>/.exec(emoji)![1]);
					}
				})(),
			);
			messageNumber++;
		}

		await Promise.all(emojiPromises);
	}

	const rerenderRatelimit = ratelimit(unit(3, "sec"));
	const rerender = () =>
		rerenderRatelimit(async () => {
			const newText = conf.render(state);
			let i = 0;
			for (const item of newText) {
				const message = messages[i];
				if (item.trim() !== message.text.trim())
					await message.msg.edit(item.trim());
				i++;
			}
		});

	rerender();

	let availableActions: MoveSet<State> | undefined; // to prevent constant recalculations. probably not a terrible performance issue but idk

	const toRemoveOnNextReset: Discord.Message[] = [];
	const resetTimer = () => {
		gameTimer.reset();
		for (const msg of toRemoveOnNextReset) {
			perr(msg.delete(), "removing message in game");
		}
	};

	async function onReactionHoisted(
		reaction: Discord.MessageReaction,
		user: Discord.User,
	) {
		perr(reaction.users.remove(user), "remove reaction for game");
		if (!gameStarted) return;
		if (!reaction.emoji.id) return;
		resetTimer();
		if (!availableActions) availableActions = conf.getMoves(state);
		console.log(availableActions);
		if (availableActions.length === 0) {
			throw new Error("There are no available moves!");
		}
		const action = availableActions.find(
			action =>
				action.player.id === user.id &&
				action.button.includes(reaction.emoji.id!),
		);
		if (!action) return; // maybe log "no" or something
		// copy state
		const stateCopy = copyState(state);
		state = action.apply(stateCopy);
		availableActions = undefined;
		////////////// here's an idea                       \\\\\\\\\\\\\\
		///////////// update available actions now           \\\\\\\\\\\\\
		//////////// huh                                      \\\\\\\\\\\\
		/////////// what if this is checkers and it needs to   \\\\\\\\\\\
		////////// know how many moves there are?               \\\\\\\\\\
		///////// that should be done by the availableactions    \\\\\\\\\
		//////// handler, not here. too bad.                      \\\\\\\\
		/////// it's already finding all of them so its easy       \\\\\\\
		////// what if availableActions was passed to the renderer? \\\\\\
		///// that way                                               \\\\\
		//// what if availableActions could modify state?             \\\\
		/// then it would have to run after every state update         \\\
		// that seems reasonable                                        \\
		rerender();
	}

	const gameTimer = createTimer(
		...(conf.timers.map(timer => [
			timer.time,
			async () => {
				if (timer.message) {
					// auto delete this message on next timer reset
					toRemoveOnNextReset.push(
						await info.channel.send(timer.message(state)),
					);
				}
				if (timer.update) {
					const stateCopy = copyState(state);
					state = timer.update(stateCopy);
					availableActions = undefined;
					rerender();
				}
			},
		]) as [number, () => Promise<void>][]),
	);

	gameStarted = true;

	await new Promise(() => {
		/*todo*/
	});

	// TODO:
	// - win conditions
	// - board

	//// ===== wait for game to end =====

	for (const message of messages) {
		message.rxnh.end();
		perr(
			message.msg.reactions.removeAll(),
			"remove all reactions (optional)",
		);
	}

	return "a";
};

export type Tileset<T> = { tiles: T };
export function newTileset<T>(tiles: T): Tileset<T> {
	return { tiles }; // 10/10 function
	// TODO: create tilesets from png images and have this automatically manage emojis in a set list of emoji servers provided by id in the config
}

export type Stack<Layers extends string> = {
	[key in Layers]?: Tile;
};
export type Board<Layers extends string> = {
	get(layer: Layers, x: number, y: number): Tile | undefined;
	set(layer: Layers, x: number, y: number, tile: Tile | undefined): void;
	setStack(x: number, y: number, tile: Stack<Layers>): void;
	render(): string;
	search(
		startingPosition: Pos,
		cb: (
			stack: Stack<Layers>,
			x: number,
			y: number,
			onBoard: boolean,
		) => Pos | true,
	): { x: number; y: number } | undefined;
	copy(): Board<Layers>;
};
export type Pos = [number, number];
// this should just be a class instead of this function thing
export function newBoard<Layers extends string>(
	w: number,
	h: number,
	layerOrder: Layers[],
): Board<Layers> {
	const tiles: Stack<Layers>[][] = []; // wait woah this is a completely private member. nothing else can access it. I guess it comes at the cost of making new functions every time the board is instantiated and having seperate typescript types and implementation.
	for (let y = 0; y < h; y++) {
		tiles[y] = [];
		for (let x = 0; x < w; x++) {
			tiles[y][x] = {};
		}
	}

	const board: Board<Layers> = {
		get(layer, x, y) {
			return tiles[y][x][layer];
		},
		set(layer, x, y, tile) {
			tiles[y][x][layer] = tile;
		},
		setStack(x, y, stack) {
			tiles[y][x] = { ...stack }; // this might cause issues if tiles get more complicated unfortunately
		},
		render() {
			return tiles
				.map(row =>
					row
						.map(stack => {
							for (const order of layerOrder) {
								if (stack[order]) return stack[order];
							}
							throw new Error(
								"A tile was blank while rendering!",
							);
						})
						.join(""),
				)
				.join("\n");
		},
		search(startingPosition, cb) {
			let [cx, cy] = startingPosition;
			let [x, y] = startingPosition;
			const i = 0;
			while (true) {
				if (i > 100)
					throw new Error("Potentially infinite find!:(passed 100)");
				const result =
					cx >= w || cx < 0 || cy >= h || cy < 0
						? cb({}, cx, cy, false)
						: cb(tiles[cy][cx], cx, cy, true);
				if (result === true) return { x, y };
				[x, y] = [cx, cy];
				[cx, cy] = result;
			}
		},
		copy() {
			const nb = newBoard(w, h, layerOrder);
			for (let y = 0; y < h; y++) {
				for (let x = 0; x < w; x++) {
					nb.setStack(x, y, tiles[y][x]);
				}
			}
			return nb;
		},
	};

	return board;
}
