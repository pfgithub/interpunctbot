import {
	newBoard,
	newTileset,
	Player,
	newGame,
	MoveSet,
	Board,
} from "./gamelib";
import * as gl from "./gamelib";

//

type Color = "r" | "y";

type Piece = { color?: Color };

export type Connect4 = {
	board: Board<Piece>,
	turn: Color,
	players: { r: Player, y: Player },
	status:
		| { s: "playing" }
		| { s: "winner", winner: Player, reason: string }
		| { s: "tie" },
};

export const tileset = newTileset({
	r: "<:r:648226318017626132>",
	y: "<:y:648226318118420500>",
	empty: "<:w:648296516406083595>",
	buttons: ["1️⃣", "2⃣", "3⃣", "4⃣", "5⃣", "6⃣", "7⃣"],
	laneHeadings: [
		"<:number1:648301185115357205>",
		"<:number2:648299358722195467>",
		"<:number3:648301185127677972>",
		"<:number4:648301184930545669>",
		"<:number5:648301184955711488>",
		"<:number6:648301496282120249>",
		"<:number7:648301184679149570>",
	],
});

function checkWin(gameState: Connect4, [placedX, placedY]: [number, number]) {
	const checks: [number, number][] = [
		[-1, -1],
		[-1, 0],
		[-1, 1],
		[0, -1],
	];
	const tile = gl.boardGet(gameState.board, placedX, placedY)!;
	if (!tile.color) throw new Error("checkWin called at invalid location");
	for (const check of checks) {
		const downmost = gl.boardSearch(gameState.board,
			[placedX, placedY],
			(tileh, x, y) => {
				if (tileh.color !== tile.color) return "previous";
				return [x + check[0], y + check[1]];
			},
		);
		if (!downmost) throw new Error("tile was not found but it must be");
		const upmost = gl.boardSearch(gameState.board,
			[downmost.x, downmost.y],
			(tileh, x, y) => {
				if (tileh.color !== tile.color) return "previous";
				return [x - check[0], y - check[1]];
			},
		);
		if (!upmost) throw new Error("tile was not found but it must be 2");
		if (upmost.distance >= 4) return true;
	}
	return false;
}

function checkTie(gameState: Connect4): boolean {
	for (let tx = 0; tx < 7; tx++) {
		const found = gl.boardSearch(gameState.board, [tx, 0], (tile, x, y) => {
			return tile.color ? "previous" : [x, y + 1];
		});
		if (found) return false;
	}
	return true;
}

export const connect4 = newGame<Connect4>({
	setup(players) {
		return {
			board: newBoard(7, 6, () => ({})),
			turn: "r",
			players: {
				r: players[0], // person who ran the command
				y: players[1], // next person to join
			},
			status: { s: "playing" },
		};
	},
	getMoves(state) {
		const resmoves: MoveSet<Connect4> = [];
		for (let tx = 0; tx < 7; tx++) {
			const found = gl.boardSearch(state.board, [tx, 0], (tile, x, y) => {
				return tile.color ? "previous" : [x, y + 1];
			});
			if (!found) continue;
			const [x, y] = [found.x, found.y];
			resmoves.push({
				button: tileset.tiles.buttons[x],
				player: state.players[state.turn],
				apply: state => {
					// we're pretending state is a copy (even though it isn't because that isn't implemented yet), it should be mutated
					gl.boardSet(state.board, x, y, { color: state.turn });

					if (checkWin(state, [x, y])) {
						state.status = {
							s: "winner",
							winner: state.players[state.turn],
							reason: "Won!",
						};
					} else if (checkTie(state)) {
						state.status = {
							s: "tie",
						};
					} else state.turn = state.turn === "r" ? "y" : "r";
					return state;
				},
			});
		}
		if (resmoves.length === 0) {
			///// set lose
			//// how?
			/// lose needs to be set in state and this doesn't modify state
			// also this doesn't get called until after lose should be run
		}
		return resmoves;
	},
	checkGameOver(state) {
		return state.status.s === "winner" || state.status.s === "tie";
	},
	render(state: Connect4): string[] {
		const currentplayer = state.players[state.turn];
		const playercolor =
			state.turn === "r" ? tileset.tiles.r : tileset.tiles.y;
		const statusbar =
			state.status.s === "playing"
				? `<@${currentplayer.id}>'s turn (${playercolor})`
				: state.status.s === "winner"
				? `<@${state.status.winner.id}> won! (${state.status.reason})`
				: state.status.s === "tie"
				? `Tie`
				: "never.";
		const renderedBoard = gl.boardRender(state.board, tile => {
			if (tile.color) return tileset.tiles[tile.color];
			return tileset.tiles.empty;
		});
		return [
			`
**Connect 4**
${statusbar}
==============
${tileset.tiles.laneHeadings.join("")}
${renderedBoard}
==============
Try to get 4 in a row in any direction, including diagonal.`,
		];
	},
});
