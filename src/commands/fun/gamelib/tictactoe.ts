import {
	newBoard,
	newTileset,
	Player,
	newGame,
	MoveSet,
	unit,
	Board,
} from "./gamelib";

//

type Color = "x" | "o";

type Piece = { color?: Color };

type TicTacToe = {
	board: Board<Piece>;
	turn: Color;
	players: { x: Player; o: Player };
	status:
		| { s: "playing" }
		| { s: "winner"; winner: Player; reason: string }
		| { s: "tie" };
};

const tileset = newTileset({
	tic: "❎",
	tac: "🅾️",
	toe: "⬜",
	buttons: ["1️⃣", "2⃣", "3⃣", "4⃣", "5⃣", "6⃣", "7⃣", "8⃣", "9⃣"],
});

function checkTie(gameState: TicTacToe) {
	return gameState.board.filter(q => !q.color).length === 0;
}

function checkWin(gameState: TicTacToe, [placedX, placedY]: [number, number]) {
	const checks: [number, number][] = [
		[-1, -1],
		[-1, 0],
		[-1, 1],
		[0, -1],
	];
	const tile = gameState.board.get(placedX, placedY)!;
	if (!tile.color) throw new Error("checkWin called at invalid location");
	for (const check of checks) {
		const downmost = gameState.board.search(
			[placedX, placedY],
			(tileh, x, y) => {
				if (tileh.color !== tile.color) return "previous";
				return [x + check[0], y + check[1]];
			},
		);
		if (!downmost) throw new Error("tile was not found but it must be");
		const upmost = gameState.board.search(
			[downmost.x, downmost.y],
			(tileh, x, y) => {
				if (tileh.color !== tile.color) return "previous";
				return [x - check[0], y - check[1]];
			},
		);
		if (!upmost) throw new Error("tile was not found but it must be 2");
		if (upmost.distance >= 3) return true;
	}
	return false;
}

export const tictactoe = newGame<TicTacToe>({
	title: "Tic Tac Toe",
	help: "/help/fun/tictactoe",
	setup(players) {
		return {
			board: newBoard(3, 3, () => ({})),
			turn: "x",
			players: {
				x: players[0], // person who ran the command
				o: players[1], // next person to join
			},
			status: { s: "playing" },
		};
	},
	getMoves(state) {
		const resmoves: MoveSet<TicTacToe> = [];
		state.board.forEach((tile, x, y) => {
			if (tile.color) return; // invalid move
			resmoves.push({
				button: tileset.tiles.buttons[y * 3 + x],
				player: state.players[state.turn],
				apply: state => {
					state.board.set(x, y, { color: state.turn });
					if (checkTie(state)) {
						state.status = {
							s: "tie",
							// f
						};
					} else if (checkWin(state, [x, y])) {
						state.status = {
							s: "winner",
							winner: state.players[state.turn],
							reason: "Won!",
						};
					} else state.turn = state.turn === "x" ? "o" : "x";
					return state;
				},
			});
		});
		return resmoves;
	},
	renderSetup() {
		return [{ type: "once", actions: [...tileset.tiles.buttons] }];
	},
	checkGameOver(state) {
		return state.status.s === "winner" || state.status.s === "tie";
	},
	render(state: TicTacToe): string[] {
		const currentplayer = state.players[state.turn];
		const playercolor =
			state.turn === "x" ? tileset.tiles.tic : tileset.tiles.tac;
		const statusbar =
			state.status.s === "playing"
				? `<@${currentplayer.id}>'s turn (${playercolor})`
				: state.status.s === "winner"
				? `<@${state.status.winner.id}> won! (${state.status.reason})`
				: state.status.s === "tie"
				? `Tie!`
				: "never.";
		const renderedBoard = state.board.render((tile, x, y) => {
			if (tile.color)
				return tileset.tiles[tile.color === "x" ? "tic" : "tac"];
			if (state.status.s === "playing")
				return tileset.tiles.buttons[y * 3 + x];
			return tileset.tiles.toe;
		});
		return [
			`
**Tic Tac Toe**
${statusbar}
==============
${renderedBoard}
==============
`,
		];
	},
	timers: [
		{
			time: unit(30, "sec"),
			message: state => {
				const currentplayer = state.players[state.turn];
				const playercolor =
					tileset.tiles[state.turn === "x" ? "tic" : "tac"];
				return `<@${currentplayer.id}> (${playercolor}), it's your turn. 30s left.`;
			},
		},
		{
			time: unit(60, "sec"),
			update: state => {
				state.status = {
					s: "winner",
					winner: state.players[state.turn === "x" ? "o" : "x"],
					reason: "Time out!",
				};
				return state;
			},
		},
	],
});
