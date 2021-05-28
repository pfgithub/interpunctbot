// 3x3 grid of tic tac toe games
import {
	newBoard,
	newTileset,
	Player,
	newGame,
	MoveSet,
	Board,
	Pos,
} from "./gamelib";
import * as gl from "./gamelib";

type MegaTile = OneGrid | Color | "~";
type MegaGrid = Board<MegaTile>;
type OneGrid = Board<OneTile>;
type OneTile = Color | null;
type Color = "x" | "o";

function checkTie(board: Board<MegaTile | OneTile>) {
	return gl.boardFilter(board, q => typeof q !== "string").length === 0;
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
	const tile = gl.boardGet(board, placedX, placedY)!;
	if (tile !== "x" && tile !== "o")
		throw new Error("checkWin called at invalid location");
	for (const check of checks) {
		const downmost = gl.boardSearch(board, [placedX, placedY], (tileh, x, y) => {
			if (tileh !== tile) return "previous";
			return [x + check[0], y + check[1]];
		});
		if (!downmost) throw new Error("tile was not found but it must be");
		const upmost = gl.boardSearch(board, [downmost.x, downmost.y], (tileh, x, y) => {
			if (tileh !== tile) return "previous";
			return [x - check[0], y - check[1]];
		});
		if (!upmost) throw new Error("tile was not found but it must be 2");
		if (upmost.distance >= 3) return true;
	}
	return false;
}

export const tileset = newTileset({
	x: "❎",
	o: "🅾️",
	blank: "⬜",
	backbtn: "↩️",
	buttons: ["1️⃣", "2⃣", "3⃣", "4⃣", "5⃣", "6⃣", "7⃣", "8⃣", "9⃣"],
});

const megatiles = {
	"~": ["⬛⬛⬛", "🇹​🇮​🇪", "⬛⬛⬛"],
	x: ["🟩⬛🟩", "⬛🟩⬛", "🟩⬛🟩"],
	o: ["⬛🟥⬛", "🟥🟥🟥", "⬛🟥⬛"],
};

export type UltimateTicTacToe = {
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

function joinBetween<T>(
	a: T[],
	cb: () => T,
	xtramode: "startend" | "between" = "between",
): T[] {
	const res: T[] = [];
	a.forEach((itm, i) => {
		if (i !== 0 || xtramode !== "between") res.push(cb());
		res.push(itm);
		if (i === a.length - 1 && xtramode === "startend") res.push(cb());
	});
	return res;
}

function getMoves(state: UltimateTicTacToe): MoveSet<UltimateTicTacToe> {
	if (state.status.s !== "playing")
		throw new Error("Get moves called while game over");

	const turn = state.status.turn;

	// check if target board is "pick"
	// if so, choose which board
	if (state.status.board === "pick") {
		const resmoves: MoveSet<UltimateTicTacToe> = [];
		gl.boardForEach(state.board, (tile, x, y) => {
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
	const minitile = gl.boardGet(state.board, tx, ty) as Board<OneTile>;
	console.log(onboard, tx, ty, minitile);

	gl.boardForEach(minitile, (tile, x, y) => {
		if (tile === "x" || tile === "o") return; // invalid move
		resmoves.push({
			button: tileset.tiles.buttons[y * 3 + x],
			player: state.players[turn],
			apply: state => {
				gl.boardSet(minitile, x, y, turn);
				if (checkWin(minitile, [x, y])) {
					gl.boardSet(state.board, tx, ty, turn);
					if (checkWin(state.board, [tx, ty])) {
						state.status = {
							s: "winner",
							winner: state.players[turn],
							reason: "good at the game",
						};
					} else if (checkTie(state.board)) {
						state.status = { s: "tie" };
					}
				} else if (checkTie(minitile)) {
					gl.boardSet(state.board, tx, ty, "~");
					if (checkTie(state.board)) {
						state.status = { s: "tie" };
					}
				}
				if (state.status.s === "playing") {
					const bv = gl.boardGet(state.board, x, y);
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
}
export function render(state: UltimateTicTacToe) {
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

	// make tiles like
	const renderedBoard = gl.boardMegarender(state.board, 3, 3, (tile, x, y) => {
		if (typeof tile === "string") return megatiles[tile];
		return gl.boardRender(tile, (tyle, tx, ty) => {
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
	});

	// do some magic to outline all tiles with 1 layer of black tiles
	const rbth: string[][][] = joinBetween(
		renderedBoard.map(q =>
			q.map(v => joinBetween(v, () => "⬛", "startend")),
		),
		() => [
			[
				"⬛",
				"⬛".repeat(3),
				"⬛",
				"⬛".repeat(3),
				"⬛",
				"⬛".repeat(3),
				"⬛",
			],
		],
		"startend",
	);

	// resulting structure looks like this (numbers represent # of emojis in a string)
	// [
	//  [[1 3 1 3 1 3 1]]
	//  [[1 3 1 3 1 3 1]
	//   [1 3 1 3 1 3 1]
	//   [1 3 1 3 1 3 1]]
	//  [[1 3 1 3 1 3 1]]
	//  [[1 3 1 3 1 3 1]
	//   [1 3 1 3 1 3 1]
	//   [1 3 1 3 1 3 1]]
	//  [[1 3 1 3 1 3 1]]
	//  [[1 3 1 3 1 3 1]
	//   [1 3 1 3 1 3 1]
	//   [1 3 1 3 1 3 1]]
	//  [[1 3 1 3 1 3 1]]
	// ]

	// do some magic to outline either the current board or the whole map depending on what is available rn
	if (state.status.s === "playing") {
		if (state.status.board === "pick") {
			rbth.forEach((fl, yv) => {
				for (const fq of fl) {
					let lim = [0, 6];
					if (yv === 0 || yv === 6) lim = [0, 1, 2, 3, 4, 5, 6];
					for (const i of lim) {
						fq[i] = fq[i].split("⬛").join("🟨");
					}
				}
			});
		} else {
			// surround
			const [x, y] = toXY(state.status.board);
			const [rx, ry] = [x * 2 + 1, y * 2 + 1];
			const fixlines = rbth.slice(ry - 1, ry + 2);
			for (const fixlinel of fixlines) {
				for (const fixline of fixlinel) {
					for (let i = rx - 1; i < rx + 2; i++) {
						fixline[i] = fixline[i].split("⬛").join("🟨");
					}
				}
			}
		}
	}

	const finalboard = rbth
		.map(q => q.map(i => i.join("")).join("\n"))
		.join("\n");
	return [
		`
**Ultimate Tic Tac Toe**
${statusbar}
==============
${finalboard}
==============
`,
	];
}

function setup(players: string[]): UltimateTicTacToe {
	return {
		board: newBoard<MegaTile>(3, 3, () =>
			newBoard(3, 3, () => null),
		),
		players: {
			x: {id: players[0]}, // person who ran the command
			o: {id: players[1]}, // next person to join
		},
		status: { s: "playing", turn: "x", board: "pick" },
	};
}

function checkGameOver(state: UltimateTicTacToe): boolean {
	return state.status.s === "winner" || state.status.s === "tie";
}

export const ultimatetictactoe = newGame<UltimateTicTacToe>({
	setup(players) {
		return setup(players.map(pl => pl.id));
	},
	// getMoves should be called before render change my mind
	getMoves(state) {
		return getMoves(state);
	},
	checkGameOver,
	render(state: UltimateTicTacToe): string[] {
		return render(state);
	},
});
