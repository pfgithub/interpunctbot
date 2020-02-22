import * as Discord from "discord.js";

import Info from "../../../Info";
import { perr } from "../../../..";
import { getPlayers, createTimer } from "../checkers";

/// pass data async
/// stream.write()
/// await stream.read()
/// adapted from https://github.com/pfgithub/advent-of-code-2019/blob/master/solutions/_defaults/_defaults.0.ts
function oneway<T>(): {
	read: () => Promise<T>;
	write: (v: T) => void;
	close: () => void;
} {
	const stream: T[] = [];
	let waitingnow: ((v: T) => void) | undefined;
	let over = false;
	return {
		read: () => {
			return new Promise(resolve => {
				if (stream.length > 0) {
					return resolve(stream.shift());
				} else {
					waitingnow = v => {
						waitingnow = undefined;
						resolve(v);
					};
				}
			});
		},
		write: v => {
			if (over) throw new Error("cannot write to closed oneway");
			if (waitingnow) {
				waitingnow(v);
			} else {
				stream.push(v);
			}
		},
		close: () => {
			over = true;
			if (stream.length > 0)
				throw new Error("oneway closed while items are in stream");
		},
	};
}

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
	checkGameOver: (state: Readonly<State>) => boolean;
	help: string;
	title: string;
};

export function copyState<T>(s: T): T {
	// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! todo (for undo)
	// it's actually ok to just pass the existing state for now, it's not like we ever undo yet.
	return s;
}

export const newGame = <State>(conf: GameConfig<State>) => async (
	[cmd]: [string],
	info: Info,
) => {
	if (cmd.trim()) {
		return await info.help(conf.help, "usage");
	}

	if (!info.db) {
		return await info.help("/errors/pms", "error");
	}

	if (!(await info.db.getFunEnabled())) {
		return await info.help("/errors/fun-disabled", "error");
	}

	const gameOverListener = oneway<boolean>();
	let gameOver = false;

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
	state = state; // I'm pretty sure there's a reason this is here...
	const setState = (newState: State) => {
		state = newState;
		if (conf.checkGameOver(state)) {
			gameOverListener.write(true);
			gameOver = true;
		}
	};

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
		if (gameOver) return;

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
		setState(action.apply(stateCopy));
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
		//\ that seems reasonable                                      /\\
		///\ the idea is that checkers doesn't need to know that      /\\\
		////\ state is just the action the previous player took      /\\\\
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
					setState(timer.update(stateCopy));
					availableActions = undefined;
					rerender();
				}
			},
		]) as [number, () => Promise<void>][]),
	);

	gameStarted = true;

	await gameOverListener.read();
	gameOverListener.close();
	gameTimer.end();

	await info.message.channel.send("Game over.");

	for (const message of messages) {
		message.rxnh.end();
		perr(
			message.msg.reactions.removeAll(),
			"remove all reactions (optional)",
		);
	}
	for (const msg of toRemoveOnNextReset) {
		perr(msg.delete(), "removing message in game");
	}
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
		) => Pos | true | false,
	): { x: number; y: number; distance: number } | undefined;
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
			let i = 0;
			while (true) {
				if (i > 1000)
					throw new Error("Potentially infinite find!:(passed 1000)");
				const result =
					cx >= w || cx < 0 || cy >= h || cy < 0
						? cb({}, cx, cy, false)
						: cb(tiles[cy][cx], cx, cy, true);
				if (result === false)
					if (i === 0) return undefined;
					else return { x, y, distance: i };
				[x, y] = [cx, cy];
				i++;
				if (result === true) return { x, y, distance: i };
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
