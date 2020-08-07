// 3x3 grid of tic tac toe games
import {
	newBoard,
	newTileset,
	Player,
	newGame,
	MoveSet,
	unit,
	Board,
	Pos,
} from "./gamelib";

type MegaTile = OneGrid | Color | "~";
type MegaGrid = Board<MegaTile>;
type OneGrid = Board<OneTile>;
type OneTile = Color | undefined;
type Color = "x" | "o";

function checkTie(board: Board<MegaTile | OneTile>) {
	return board.filter(q => typeof q !== "string").length === 0;
}

function checkWin(
	board: Board<MegaTile | OneTile>,
	[placedX, placedY]: [number, number],
) {
	const checks: [number, number][] = [
		[-1, -1],
		[-1, 0],
		[-1, 1],
		[0, -1],
	];
	const tile = board.get(placedX, placedY)!;
	if (tile !== "x" && tile !== "o")
		throw new Error("checkWin called at invalid location");
	for (const check of checks) {
		const downmost = board.search([placedX, placedY], (tileh, x, y) => {
			if (tileh !== tile) return "previous";
			return [x + check[0], y + check[1]];
		});
		if (!downmost) throw new Error("tile was not found but it must be");
		const upmost = board.search([downmost.x, downmost.y], (tileh, x, y) => {
			if (tileh !== tile) return "previous";
			return [x - check[0], y - check[1]];
		});
		if (!upmost) throw new Error("tile was not found but it must be 2");
		if (upmost.distance >= 3) return true;
	}
	return false;
}

const tileset = newTileset({
	x: "❌",
	o: "🟢",
	blank: "⬜",
	backbtn: "🔙",
	buttons: ["1️⃣", "2⃣", "3⃣", "4⃣", "5⃣", "6⃣", "7⃣", "8⃣", "9⃣"],
});

const megatiles = {
	"~": ["⬜⬜⬜", "🇹​🇮​🇪", "⬜⬜⬜"],
	x: ["🟥⬜🟥", "⬜🟥⬜", "🟥⬜🟥"],
	o: ["⬜🟩⬜", "🟩🟢🟩", "⬜🟩⬜"],
};

type UltimateTicTacToe = {
	board: MegaGrid;
	players: { x: Player; o: Player };
	status:
		| { s: "playing"; turn: Color; board: number | "pick"; back?: boolean } // if board is full, pick which board to play on
		| { s: "winner"; winner: Player; reason: string }
		| { s: "tie" };
};

function toXY(v: number): Pos {
	return [v % 3, (v - (v % 3)) / 3];
}

export const ultimatetictactoe = newGame<UltimateTicTacToe>({
	title: "Ultimate Tic Tac Toe",
	help: "/help/fun/ultimatetictactoe",
	setup(players) {
		return {
			board: newBoard<MegaTile>(3, 3, () =>
				newBoard(3, 3, () => undefined),
			),
			players: {
				x: players[0], // person who ran the command
				o: players[1], // next person to join
			},
			status: { s: "playing", turn: "x", board: "pick" },
		};
	},
	// getMoves should be called before render change my mind
	getMoves(state) {
		if (state.status.s !== "playing")
			throw new Error("Get moves called while game over");

		const turn = state.status.turn;

		// check if target board is "pick"
		// if so, choose which board
		if (state.status.board === "pick") {
			const resmoves: MoveSet<UltimateTicTacToe> = [];
			state.board.forEach((tile, x, y) => {
				if (typeof tile === "string") return;
				resmoves.push({
					button: tileset.tiles.buttons[y * 3 + x],
					player: state.players[turn],
					apply: state => {
						state.status = {
							s: "playing",
							turn,
							board: y * 3 + x,
							back: true,
						};
						return state;
					},
				});
			});
			return resmoves;
		}
		const onboard = state.status.board;

		// else, choose where to go on that board
		const resmoves: MoveSet<UltimateTicTacToe> = [];

		const [tx, ty] = toXY(onboard);
		const minitile = state.board.get(tx, ty) as Board<OneTile>;
		console.log(onboard, tx, ty, minitile);

		minitile.forEach((tile, x, y) => {
			if (tile === "x" || tile === "o") return; // invalid move
			resmoves.push({
				button: tileset.tiles.buttons[y * 3 + x],
				player: state.players[turn],
				apply: state => {
					minitile.set(x, y, turn);
					if (checkTie(minitile)) {
						state.board.set(tx, ty, "~");
						if (checkTie(state.board)) {
							state.status = { s: "tie" };
						}
					} else if (checkWin(minitile, [x, y])) {
						state.board.set(tx, ty, turn);
						if (checkTie(state.board)) {
							state.status = { s: "tie" };
						} else if (checkWin(state.board, [tx, ty])) {
							state.status = {
								s: "winner",
								winner: state.players[turn],
								reason: "good at the game",
							};
						}
					}
					if (state.status.s === "playing") {
						const bv = state.board.get(x, y);
						const bsel =
							typeof bv === "string" ? "pick" : y * 3 + x;
						state.status = {
							s: "playing",
							turn: turn === "x" ? "o" : "x",
							board: bsel,
						};
					}
					return state;
				},
			});
		});
		if (state.status.back) {
			resmoves.push({
				button: tileset.tiles.backbtn,
				player: state.players[turn],
				apply: state => {
					state.status = { s: "playing", turn, board: "pick" };
					return state;
				},
			});
		}
		return resmoves;
	},
	renderSetup() {
		return [
			{
				type: "once",
				actions: [tileset.tiles.backbtn, ...tileset.tiles.buttons],
			},
		];
	},
	checkGameOver(state) {
		return state.status.s === "winner" || state.status.s === "tie";
	},
	render(state: UltimateTicTacToe): string[] {
		// when picking a 3x3 grid to play on
		// show all empty tiles as numbers.
		// each grid numbered 1-9

		// when picking normally, show blank tiles
		// and only the grid that is yours has real numbers.

		let statusbar = "never";
		if (state.status.s === "playing") {
			const currentplayer = state.players[state.status.turn];
			const playercolor = tileset.tiles[state.status.turn];
			statusbar = `<@${currentplayer.id}>'s turn (${playercolor})`;
		} else if (state.status.s === "winner") {
			statusbar = `<@${state.status.winner.id}> won! (${state.status.reason})`;
		} else if (state.status.s === "tie") {
			statusbar = `Tie!`;
		}

		const renderedBoard = state.board.megarender(
			3,
			3,
			"|",
			"-",
			(tile, x, y) => {
				if (typeof tile === "string") return megatiles[tile];
				return tile
					.render((tyle, tx, ty) => {
						if (tyle) return tileset.tiles[tyle];
						if (state.status.s === "playing") {
							if (state.status.board === "pick")
								return tileset.tiles.buttons[y * 3 + x];
							if (state.status.board === y * 3 + x)
								return tileset.tiles.buttons[ty * 3 + tx];
						}
						return tileset.tiles.blank;
					})
					.split("\n");
			},
		);
		return [
			`
**Ultimate Tic Tac Toe**
${statusbar}
==============
${renderedBoard}
==============
`,
		];
	},
	timers: [
		{
			time: unit(120, "sec"),
			message: state => {
				if (state.status.s !== "playing") return "Never!";
				const currentplayer = state.players[state.status.turn];
				const playercolor = tileset.tiles[state.status.turn];
				return `<@${currentplayer.id}> (${playercolor}), it's your turn. 30s left.`;
			},
		},
		{
			time: unit(400, "sec"),
			update: state => {
				if (state.status.s !== "playing") return state;
				state.status = {
					s: "winner",
					winner:
						state.players[state.status.turn === "x" ? "o" : "x"],
					reason: "Time out!",
				};
				return state;
			},
		},
	],
});
