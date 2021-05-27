import {
	newBoard as newGamelibBoard,
	Player,
	newGame,
	MoveSet,
	unit,
} from "./gamelib";
import * as fs from "fs";

const emojis = JSON.parse(fs.readFileSync("config/emojis/papersoccer.json", "utf-8"));

//

// type PaperSoccer = {
// 	board: Board<OutOfBounds | PlayTile>;
// 	connections: boolean[];
// };
// 
// function initSoccer(): PaperSoccer {
// 	// create a board:
// 	// center is 8x9
// 	// + a 2 wide goal on top/bottom
// 	// + borders on all edges
// }

// a: -1, b: 0, c: 1
export type Direction = "aa" | "ab" | "ac" | "ba" | "bc" | "ca" | "cb" | "cc";
type Connection = {to: number; active: number};
type Point = {
	x: number; y: number;
	connections: {
		[key in Direction]: Connection | undefined;
	};
};

export type Board = {
	points: Point[];
	connections: boolean[];
};

export function directionToDiff(direction: Direction): [number, number] {
	return direction.split("").map(itm => ({a: -1, b: 0, c: 1}[itm as "a" | "b" | "c"])) as [number, number];
}
function diffToDirection(diff: [number, number]): Direction {
	return diff.map(v => v === -1 ? "a" : v === 0 ? "b" : v === 1 ? "c" : (() => {throw new Error("bad v: "+v)})()).join("") as Direction;
}
export const xyToPtIndex = (x: number, y: number) => y * 11 + x;
const inBoard = (x: number, y: number) => {
	if(x >= 1 && x <= 9 && y >= 2 && y <= 12) return true;
	if(x >= 4 && x <= 6 && (y === 1 || y === 13)) return true;
	return false;
}
const isEdge = (x: number, y: number) => {
	if(!inBoard(x+1, y+1) || !inBoard(x+1, y-1) || !inBoard(x-1, y-1) || !inBoard(x-1, y+1)) return true;
	return false;
}

const ballPositions = ["", "bl", "br", "ul", "ur"] as const;
type BallPosition = typeof ballPositions[number];
type DisplayTile = {
	up: boolean;
	left: boolean;
	down: boolean;
	right: boolean;
	diagonbr: boolean;
	diagonur: boolean;
	ball: BallPosition;
} | undefined;
export function displayBoard(board: Board, ball: [number, number], winner: boolean, player: string, bottom: boolean) {
	const glboard = newGamelibBoard<DisplayTile>(8, 12, (rvx, rvy) => {
		const [x, y] = [rvx + 1, rvy + 1];
		if(!inBoard(x, y) || !inBoard(x+1, y) || !inBoard(x, y+1) || !inBoard(x+1, y+1)) return undefined;
		const ul = board.points[xyToPtIndex(x, y)];
		const bl = board.points[xyToPtIndex(x, y+1)];
		const br = board.points[xyToPtIndex(x+1, y+1)];
		const bp1 = ball[0] == x ? "l" : ball[0] == x + 1 ? "r" : "";
		const bp2 = ball[1] == y ? "u" : ball[1] == y + 1 ? "b" : "";
		const res: DisplayTile = {
			up: ul.connections.cb ? board.connections[ul.connections.cb.active] : false,
			left: ul.connections.bc ? board.connections[ul.connections.bc.active] : false,
			diagonbr: ul.connections.cc ? board.connections[ul.connections.cc.active] : false,
			diagonur: bl.connections.ca ? board.connections[bl.connections.ca.active] : false,
			down: br.connections.ab ? board.connections[br.connections.ab.active] : false,
			right: br.connections.ba ? board.connections[br.connections.ba.active] : false,
			ball: (bp1 && bp2 ? bp2 + bp1 : "") as BallPosition,
		};
		return res;
	});
	const res = glboard.render(tile => {
		if(!tile) return "⬛";
		
		const mode = [0, +tile.down, +tile.left, +tile.right, +tile.up,
			+tile.diagonbr, +tile.diagonur, ballPositions.indexOf(tile.ball)];
		
		const match = emojis["papersoccer-"+JSON.stringify(mode)];
		if(!match) throw new Error("Bad tile match "+JSON.stringify(mode));
		return match;
	}).split("\n");
	for(const line of [0, res.length - 1]) {
		res[line] = res[line].substr(0, res[line].length - 3);
	}
	const pl = winner ? "<@"+player+"> won." : "<@"+player+">'s turn";
	return "-\n"+(bottom ? "-" : pl)+"\n" + res.join("\n")+"\n"+(bottom ? pl : "-");
	// put <@player> on the bottom if they win by getting to the bottom
}

export function initBoard(): Board {
	const res: Board = {points: new Array(10 * 13).fill(undefined), connections: []};
	const getOrMakeConnection = (x: number, y: number, direction: Direction): Connection | undefined => {
		if(!inBoard(x, y)) return undefined;
		const [fstx, fsty] = directionToDiff(direction);
		const [dx, dy] = [x + fstx, y + fsty];
		if(!inBoard(dx, dy)) return undefined;
		const dpos = xyToPtIndex(dx, dy);
		const foundpt = res.points[dpos];
		const inverseDir = diffToDirection([-fstx, -fsty]);
		if(foundpt) {
			if(!foundpt.connections[inverseDir]) throw new Error("missing required connection?");
			return {to: dpos, active: foundpt.connections[inverseDir]!.active};
		} else {
			const edge = isEdge(x, y) && isEdge(dx, dy) && ((x === dx) !== (y === dy));
			const nidx = res.connections.push(edge) - 1;
			return {to: dpos, active: nidx};
		}
	}
	// connections are links between two points
	// getting the pt index is easy but connection index is a bit more difficult
	// nvm ez
	
	for(let y = 0; y < 14; y++) {
		for(let x = 0; x < 11; x++) {
			const ptIndex = xyToPtIndex(x, y);
			res.points[ptIndex] = {
				x, y,
				connections: {
					aa: getOrMakeConnection(x, y, "aa"),
					ab: getOrMakeConnection(x, y, "ab"),
					ac: getOrMakeConnection(x, y, "ac"),
					ba: getOrMakeConnection(x, y, "ba"),
					bc: getOrMakeConnection(x, y, "bc"),
					ca: getOrMakeConnection(x, y, "ca"),
					cb: getOrMakeConnection(x, y, "cb"),
					cc: getOrMakeConnection(x, y, "cc"),
				},
			};
		}
	}
	
	return res;
}

// console.log(displayBoard(initBoard(), [5, 7], "341076015663153153"));

const buttonReactions: {[key in Direction]: string} = {
	"aa": "↖️",
	"ba": "⬆️",
	"ca": "↗️",
	"cb": "➡️",
	"cc": "↘️",
	"bc": "⬇️",
	"ac": "↙️",
	"ab": "⬅️",
};

type GameState = {
	board: Board;
	players: Player[];
	turn: number;
	ball: [number, number];
	winner?: Player;
};

export function availableConnections(state: {board: Board}, x: number, y: number): "none" | "some" | "all" {
	let connections = 0;
	let maxConnections = 0;
	
	const point = state.board.points[xyToPtIndex(x, y)];
	for(const conxn of Object.values(point.connections)) {
		if(conxn) {
			maxConnections += 1;
			if(!state.board.connections[conxn.active])
				connections += 1;
		}
	}
	console.log(connections, maxConnections)
	if(connections === maxConnections) return "all";
	if(connections === 1) return "none";
	return "some";
}

export const papersoccer = newGame<GameState>({
	title: "Paper Soccer",
	help: "/help/fun/papersoccer",
	setup(players) {
		return {
			board: initBoard(),
			turn: 0,
			players,
			ball: [5, 7],
		}
	},
	getMoves(state) {
		const resMoves: MoveSet<GameState> = [];
		const index = xyToPtIndex(...state.ball);
		const point = state.board.points[index];
		
		for(const [dir, conxn] of Object.entries(point.connections) as [Direction, Connection][]) {
			if(!conxn) continue;
			if(state.board.connections[conxn.active]) continue;
			resMoves.push({
				button: buttonReactions[dir],
				player: state.players[state.turn],
				apply: state => {
					const [ofstx, ofsty] = directionToDiff(dir);
					state.ball[0] += ofstx;
					state.ball[1] += ofsty;
					const conxnCnt = availableConnections(state, ...state.ball);
					state.board.connections[conxn.active] = true;
					if(state.ball[1] === 1) {
						// p0 wins
						state.turn = 0;
						state.winner = state.players[state.turn];
					} else if(state.ball[1] === 13) {
						// p1 wins
						state.turn = 1;
						state.winner = state.players[state.turn];
					} else if(conxnCnt === "all") {
						// next turn
						state.turn += 1;
						state.turn %= state.players.length;
					}else if(conxnCnt === "none") {
						// other player wins
						state.turn += 1;
						state.turn %= state.players.length;
						state.winner = state.players[state.turn];
					}else{
						// current player goes again
					}
					return state;
				},
			});
		}
		
		return resMoves;
	},
	renderSetup() {
		return [{type: "once", actions: []}, { type: "once", actions: Object.values(buttonReactions) }];
	},
	checkGameOver(state) {
		return !!state.winner;
	},
	render(state) {
		return [
			"== **Paper Soccer** ==\n"+
			"⬆️ <@"+state.players[0].id+">, you win by getting the ball to the **top** of the screen.\n"+
			"⬇️ <@"+state.players[1].id+">, you win by getting the ball to the **bottom** of the screen.\n"+
			"You cannot move across a line that has already been drawn.\n"+
			"If the location you move to already has a line, you get another turn.\n"+
			"If you get the ball stuck, your opponent wins.",
			displayBoard(state.board, state.ball, !!state.winner, (state.winner || state.players[state.turn]).id, state.turn === 1),
		];
	},
	timers: [
		{
			time: unit(0, "sec"),
			message: state => {
				const currentplayer = state.players[state.turn];
				return `<@${currentplayer.id}>, it's your turn.`;
			},
		},
		{
			time: unit(60, "sec"),
			message: state => {
				const currentplayer = state.players[state.turn];
				return `<@${currentplayer.id}>, it's your turn. 1 minute left.`;
			},
		},
		{
			time: unit(120, "sec"),
			update: state => {
				state.turn += 1;
				state.turn %= state.players.length;
				state.winner = state.players[state.turn];
				return state;
			},
		},
	],
});