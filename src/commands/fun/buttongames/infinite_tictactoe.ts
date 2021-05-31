import { boardRender, newBoard } from "../gamelib/gamelib";
import {
	callback,
	CreateOpts, Game, HandleInteractionResponse,
	mkbtn,
	RenderResult,
	renderResultToHandledInteraction, renderResultToResult, showPlayAgainstYourselfMenu
} from "./tictactoe";

type ITTTState = {
    kind: "joining",
	initiator: string,
} | {
    kind: "canceled",
} | {
    kind: "playing",
    board: InfiniteBoard,
    center: [number, number],
    turn: "X" | "O",
    players: {X: string, O: string},
    over?: {
        winner: "X" | "O" | "Tie",
        reason: string,
    },
};
type InfiniteBoard = {
	[key: string]: undefined | "X" | "O", // "x|y"
};
function getTile(x_offset: number, y_offset: number, center: [number, number], board: InfiniteBoard): undefined | "X" | "O" {
	return board[(center[0] + x_offset)+"|"+(center[1] + y_offset)];
}
function setTile(x_offset: number, y_offset: number, center: [number, number], board: InfiniteBoard, value: undefined | "X" | "O"): void {
	board[(center[0] + x_offset)+"|"+(center[1] + y_offset)] = value;
}

function irange<T>(start: number, end: number, map: (v: number) => T): T[] {
	const res: T[] = [];
	for(let i = start; i <= end; i++) res.push(map(i));
	return res;
}



function newRender(state: ITTTState): RenderResult<ITTTState> {
	const rules_btn = mkbtn<ITTTState>("Rules", "secondary", {emoji: "476514294075490306"}, callback("RULES", () => {
		return {kind: "reply_hidden", response: {
			content: "Try to get three in a row. The place you go becomes the center for next turn.",
			embeds: [],
			components: [],
			allowed_mentions: {parse: []},
		}};
	}));
	if(state.kind === "joining") {
		return {
			content: "<@"+state.initiator+"> is starting a game of ∞ **Infinite Tic Tac Toe**",
			embeds: [],
			components: [
				[
					mkbtn<ITTTState>("Join Game", "accept", {}, callback("JOIN", (author_id) => {
						const updated_state: ITTTState = {
							kind: "playing",
							board: {},
							center: [0, 0],
							turn: "X",
							players: {X: state.initiator, O: author_id},
						};
						if(author_id === state.initiator) return showPlayAgainstYourselfMenu(ITTTGame, updated_state);
						return {kind: "update_state",
							state: updated_state,
						};
					})),
					mkbtn<ITTTState>("Cancel", "deny", {}, callback("CANCEL", (author_id) => {
						if(author_id !== state.initiator) return {kind: "error", msg: "You can't cancel someone else's game."};
						return {kind: "update_state", state: {kind: "canceled"}};
					})),
					rules_btn,
				]
			],
			allowed_mentions: {parse: []},
		};
	}
	if(state.kind === "canceled") {
		return {
			content: "Canceled game.",
			embeds: [],
			components: [],
			allowed_mentions: {parse: []},
		};
	}
	if(state.kind === "playing") {
		const bsize = 11;
		const bcenter = 5;
		const board = newBoard(bsize, bsize, (x, y) => {
			const res = getTile(x - bcenter, y - bcenter, state.center, state.board);
			if(res == null && Math.abs(x - bcenter) <= 1 && Math.abs(y - bcenter) <= 1) return "C";
			return res;
		});
		return {
			content:
				(state.over ? (state.over.winner === "Tie" ? "Tie" : "Winner: <@"+state.players[state.over.winner]+">")
					+ " ("+state.over.reason+"). Players: X: <@"+state.players.X+">, Y: <@"+state.players.O+">"
				: "<@"+state.players[state.turn]+">'s turn ("+state.turn+")") + "\n"
				+ boardRender(board, tile => tile === "X" ? "❎" : tile === "O" ? "🅾️" : tile === "C" ? "⬜" : "⬛")
			,
			embeds: [],
			components: irange(-2, 2, (y) => irange(-2, 2, (x) => {
				// if(y === 2 && x === 2) return rules_btn;
				const tile = getTile(x, y, state.center, state.board);
				return mkbtn<ITTTState>(
					tile ?? "\u200b",
					tile === "X" ? "accept" : tile === "O" ? "deny" : "secondary",
					{disabled: Math.abs(x) === 2 || Math.abs(y) === 2},
					callback("TILE,"+x+","+y, (author_id) => {
						if(state.over) return {kind: "error", msg: "The game is over."};
						if(author_id !== state.players[state.turn]) return {kind: "error", msg: "It's not your turn."};
						if(getTile(x, y, state.center, state.board) != null) return {kind: "error", msg: "You can't play on that tile."};
						setTile(x, y, state.center, state.board, state.turn);
						state.center = [state.center[0] + x, state.center[1] + y];

						const checks: [number, number][][] = [
							[[-2, -2], [-1, -1]],
							[[-1, -1], [1, 1]],
							[[1, 1], [2, 2]],
						];
						const ctile = getTile(0, 0, state.center, state.board);
						for(const citems of checks) {
							const matches = false
								|| citems.every(([xm, ym]) => getTile(xm, ym, state.center, state.board) === ctile)
								|| citems.every(([xm, ]) => getTile(xm, 0, state.center, state.board) === ctile)
								|| citems.every(([, ym]) => getTile(0, ym, state.center, state.board) === ctile)
							;
							if(matches) {
								state.over = {winner: state.turn, reason: "three in a row"};
								return {kind: "update_state", state};
							}
						}
						// also loop over the 3x3 range and if all match it's a tie
						let is_tie = true;
						irange(-1, 1, (xm) => irange(-1, 1, (ym) => {
							if(getTile(ym, xm, state.center, state.board) == null) is_tie = false;
						}));
						if(is_tie) {
							state.over = {winner: "Tie", reason: "Can't move."};
							return {kind: "update_state", state};
						}

						state.turn = state.turn === "X" ? "O" : "X";

						return {kind: "update_state", state};
					}),
				);
			})),
			allowed_mentions: {parse: []},
		};
	}
	return {
		content: "TODO",
		embeds: [],
		components: [],
		allowed_mentions: {parse: []},
	};
}

export const ITTTGame: Game<ITTTState> & {
	init(o: CreateOpts): ITTTState,
} = {
	kind: "ITTT",
	init({author_id}) {
		return {
			kind: "joining",
			initiator: author_id,
		};
	},
	render(state, key, info) {
		return renderResultToResult(newRender(state), key);
	},
	// rather than a seperate handleInteraction, what if it called render() again and searched
	// for the thing with the specified key
	// I think that's a bad idea b/c there might be issues with updates
	// or it could say "The bot has updated, press [] to continue." and then it'd just redraw
	// the panel
	// ok I think that's a good idea actually
	handleInteraction(opts): HandleInteractionResponse<ITTTState> {
		return renderResultToHandledInteraction(newRender(opts.state), opts);
	},
};