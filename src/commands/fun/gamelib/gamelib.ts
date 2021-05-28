import * as Discord from "discord.js";

import Info from "../../../Info";
import { perr } from "../../../..";
import { getTwoPlayers, createTimer } from "../helpers";

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
			return new Promise<T>(resolve => {
				if (stream.length > 0) {
					return resolve(stream.shift()!);
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

export function unit(v: number, name: "ms" | "sec" | "min") {
	if (name === "min") return (v * 1000 * 60) as number & { __unit: "ms" };
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
	turnMsg?: (v: Readonly<State>) => {player: Player, msg: string},
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
	const DO_TEST_MODE = cmd === "testmode";
	if (cmd.trim() && !DO_TEST_MODE) {
		return await info.docs(conf.help, "usage");
	}

	if (!info.db) {
		return await info.docs("/errors/pms", "error");
	}

	if (!info.myChannelPerms!.has("MANAGE_MESSAGES")) {
		await info.warn(
			conf.title +
				" works best when " +
				info.atme +
				" has permission to Manage Messages so that reactions can be removed automatically. You must remove reactions yourself.",
		);
	}

	const gameOverListener = oneway<boolean>();
	let gameOver = false;

	const players = DO_TEST_MODE
		? [info.message.author.id, info.message.author.id]
		: await getTwoPlayers([info.message.author.id], conf.title, info);
	if (!players) return;

	let state = conf.setup(
		players.map(pl => ({
			id: pl,
		})),
	);

	state = state; // I'm pretty sure there's a reason this is here... no idea what it is though
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
			"<a:loading:682804438783492139> Starting Game...",
			"<a:loading:682804438783492139>",
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
						if (/:([0-9]+)>/.exec(emoji)!)
							throw new Error("Reaction emojis must be builtin");
						await message.react(emoji);
					}
				})(),
			);
			messageNumber++;
		}

		if (!DO_TEST_MODE) await Promise.all(emojiPromises);
	}

	const rerenderRatelimit = ratelimit(unit(3, "sec"));
	const rerender = () =>
		rerenderRatelimit(async () => {
			const newText = conf.render(state);
			let i = 0;
			for (const item of newText) {
				const message = messages[i];
				// todo make it so only one can be edited at once and only the first and last goes through
				if (item.trim() !== message.text.trim())
					await message.msg.edit(item.trim());
				i++;
			}
		});

	rerender();

	let availableActions: MoveSet<State> | undefined; // to prevent constant recalculations. probably not a terrible performance issue but idk

	let turnMsg: {msg: Discord.Message, text: string} | undefined = undefined;

	let turnMsgUpdateQueue: (string | undefined)[] = [];

	function updateTurnMessage(new_msg: string | undefined) {
		turnMsgUpdateQueue.push(new_msg);
		if(turnMsgUpdateQueue.length > 1) return;

		if(new_msg === turnMsg?.text) {
			turnMsgUpdateQueue.pop();
			return; // nothing to do;
		}

		const prev_msg = turnMsg?.msg;
		turnMsg = undefined;

		const gamelink = (info.message.channel.lastMessage !== initialLatestMessage
			? "\n> <" + messages[0].msg?.url + ">"
			: ""
		);

		if(new_msg != null) info.channel.send(new_msg + gamelink).then(sent_msg => {
			turnMsg = {msg: sent_msg, text: new_msg!};

			// in case an update is sent between the time this update starts and it completes
			if(turnMsgUpdateQueue.length > 1) {
				const nextUpdate = turnMsgUpdateQueue[turnMsgUpdateQueue.length - 1];
				turnMsgUpdateQueue = [];
				updateTurnMessage(nextUpdate);
			}else turnMsgUpdateQueue = [];
		})
		if(prev_msg) perr(prev_msg.delete(), "deleting turn message");
	}

	const resetTimer = () => {
		gameTimer.reset();
	};

	async function onReactionHoisted(
		reaction: Discord.MessageReaction,
		user: Discord.User,
	) {
		if (gameOver) return;

		perr(reaction.users.remove(user), false);
		if (!gameStarted) return;
		if (!reaction.emoji.name) return;
		resetTimer();
		if (!availableActions) availableActions = conf.getMoves(state);
		// console.log(availableActions);
		if (availableActions.length === 0) {
			throw new Error("There are no available moves!");
		}
		const action = availableActions.find(
			action =>
				action.player.id === user.id &&
				action.button.includes(reaction.emoji.name),
		);
		if (!action) return; // maybe log "no" or something
		// copy state
		const stateCopy = copyState(state);
		setState(action.apply(stateCopy));
		availableActions = undefined;
		rerender();
	}

	const initialLatestMessage = info.message.channel.lastMessage;

	const gameTimer = createTimer(
		...(conf.timers.map(timer => [
			timer.time,
			async () => {
				if (timer.message) {
					updateTurnMessage(timer.message(state));
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
		perr(message.msg.reactions.removeAll(), false);
	}
	updateTurnMessage(undefined);
};

export type Tileset<T> = { tiles: T };
export function newTileset<T>(tiles: T): Tileset<T> {
	return { tiles }; // 10/10 function
	// TODO: create tilesets from png images and have this automatically manage emojis in a set list of emoji servers provided by id in the config
}

// TODO rename gamelib to board
// rename all board functions to just their names directly eg get, set, render
export type Board<TileData> = {
	w: number;
	h: number;
	tiles: TileData[][];
};
export function boardGet<T>(board: Board<T>, x: number, y: number): T | undefined {
	return board.tiles[y]?.[x];
}
export function boardSet<T>(board: Board<T>, x: number, y: number, tile: T): void {
	board.tiles[y]![x] = tile;
}
/// like boardMap, but mutates the board. also, there is no boardMap.
export function boardFill<T>(board: Board<T>, tile: (tile: T, x: number, y: number) => T): void {
	boardForEach(board, (tilec, x, y) => {
		boardSet(board, x, y, tile(tilec, x, y));
	});
}
export function boardRender<T>(board: Board<T>, draw: (tile: T, x: number, y: number) => string): string {
	return board.tiles
		.map((row, y) =>
			row.map((tile, x) => draw(tile, x, y)).join(""),
		)
		.join("\n")
	;
}
export function boardMegarender<T>(board: Board<T>,
	_w: number,
	h: number,
	draw: (tile: T, x: number, y: number) => string[],
): string[][][] {
	const res: string[][][] = [];
	board.tiles.forEach((row, y) => {
		const rly: string[][] = new Array(h).fill(0).map(() => []);
		res.push(rly);
		row.forEach((tile, x) => {
			const drawn = draw(tile, x, y);
			drawn.forEach((line, i) => {
				const ty = i;
				rly[ty].push(line);
			});
		});
	});
	return res;
}
export function boardForEach<T>(board: Board<T>, cb: (tile: T, x: number, y: number) => void): void {
	for (let y = 0; y < board.h; y++) {
		for (let x = 0; x < board.w; x++) {
			cb(boardGet(board, x, y)!, x, y);
		}
	}
}
export function boardFilter<T>(board: Board<T>,
	filtration: (tile: T, x: number, y: number) => boolean,
): { tile: T; x: number; y: number }[] {
	const results: { tile: T; x: number; y: number }[] = [];
	boardForEach(board, (tile, x, y) => {
		if (filtration(tile, x, y)) results.push({ tile, x, y });
	});
	return results;
}
export function boardSearch<T>(board: Board<T>,
	startingPosition: Pos,
	cb: (
		tile: T,
		x: number,
		y: number,
	) => Pos | "current" | "previous",
): { x: number; y: number; distance: number } | undefined {
	let [cx, cy] = startingPosition;
	let [x, y] = startingPosition;

	let i = 0;
	for (; i < 1000;) {
		const result =
			cx >= board.w || cx < 0 || cy >= board.h || cy < 0
				? "previous" // search will now automatically return prev when off board
				: cb(board.tiles[cy][cx], cx, cy);
		if (result === "previous")
			if (i === 0) return undefined;
			else return { x, y, distance: i };
		[x, y] = [cx, cy];
		i++;
		if (result === "current") return { x, y, distance: i };
		[cx, cy] = result;
	}
	throw new Error("Potentially infinite find!:(passed 1000)");
}

export type Board_OLD<TileData> = {
	get(x: number, y: number): TileData | undefined;
	set( // or mutate tile
		x: number,
		y: number,
		tile: TileData,
	): void;
	fill(tile: (tile: TileData, x: number, y: number) => TileData): void;
	render(draw: (tile: TileData, x: number, y: number) => string): string;
	megarender(
		w: number,
		h: number,
		draw: (tile: TileData, x: number, y: number) => string[],
	): string[][][];
	forEach(cb: (tile: TileData, x: number, y: number) => void): void;
	filter(
		compare: (tile: TileData, x: number, y: number) => boolean,
	): { tile: TileData; x: number; y: number }[];
	search(
		startingPosition: Pos,
		cb: (
			tile: TileData,
			x: number,
			y: number,
		) => Pos | "current" | "previous",
	): { x: number; y: number; distance: number } | undefined;
};
export type Pos = [number, number];

// this should just be a class instead of this function thing
export function newBoard<TileData>(
	w: number,
	h: number,
	fill: (x: number, y: number) => TileData, // to make copies, x and y are unnecessary but why not
): Board<TileData> {
	const tiles: TileData[][] = [];
	for (let y = 0; y < h; y++) {
		tiles[y] = [];
		for (let x = 0; x < w; x++) {
			tiles[y][x] = fill(x, y);
		}
	}
	return {tiles, w, h};
}
