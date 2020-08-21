
export type GamelibBoard<TileData> = {
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
export function newGamelibBoard<TileData>(
	w: number,
	h: number,
	fill: (x: number, y: number) => TileData, // to make copies, x and y are unnecessary but why not
): GamelibBoard<TileData> {
	const tiles: TileData[][] = [];
	for (let y = 0; y < h; y++) {
		tiles[y] = [];
		for (let x = 0; x < w; x++) {
			tiles[y][x] = fill(x, y);
		}
	}

	const board: GamelibBoard<TileData> = {
		// returns undefined when out of map
		get(x, y) {
			return tiles[y]?.[x];
		},
		set(x, y, tile) {
			tiles[y][x] = tile;
		},
		fill(tile) {
			board.forEach((tilec, x, y) => {
				board.set(x, y, tile(tilec, x, y));
			});
		},
		render(draw) {
			return tiles
				.map((row, y) =>
					row.map((tile, x) => draw(tile, x, y)).join(""),
				)
				.join("\n");
		},
		megarender(_w, h, draw) {
			const res: string[][][] = [];
			tiles.forEach((row, y) => {
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
		},
		forEach(cb) {
			for (let y = 0; y < h; y++) {
				for (let x = 0; x < w; x++) {
					cb(board.get(x, y)!, x, y);
				}
			}
		},
		filter(filtration) {
			const results: { tile: TileData; x: number; y: number }[] = [];
			board.forEach((tile, x, y) => {
				if (filtration(tile, x, y)) results.push({ tile, x, y });
			});
			return results;
		},
		search(startingPosition, cb) {
			let [cx, cy] = startingPosition;
			let [x, y] = startingPosition;
			let i = 0;
			while (true) {
				if (i > 1000)
					throw new Error("Potentially infinite find!:(passed 1000)");
				const result = // in zig this could be a normal if statement instead of a ternary thing. that is the obvious way to do it, why doesn't every language do it that way
					cx >= w || cx < 0 || cy >= h || cy < 0
						? "previous" // search will now automatically fail when off board
						: cb(tiles[cy][cx], cx, cy);
				if (result === "previous")
					if (i === 0) return undefined;
					else return { x, y, distance: i };
				[x, y] = [cx, cy];
				i++;
				if (result === "current") return { x, y, distance: i };
				[cx, cy] = result;
			}
		},
	};

	return board;
}

import * as fs from "fs";

const emojis = JSON.parse(fs.readFileSync("config/emojis.json", "utf-8"));

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
type Direction = "aa" | "ab" | "ac" | "ba" | "bc" | "ca" | "cb" | "cc";
type Connection = {to: number; active: number};
type Point = {
	x: number; y: number;
	connections: {
		[key in Direction]: Connection | undefined;
	};
};

type Board = {
	points: Point[];
	connections: boolean[];
};

function directionToDiff(direction: Direction): [number, number] {
	return direction.split("").map(itm => ({a: -1, b: 0, c: 1}[itm as "a" | "b" | "c"])) as [number, number];
}
function diffToDirection(diff: [number, number]): Direction {
	return diff.map(v => v === -1 ? "a" : v === 0 ? "b" : v === 1 ? "c" : (() => {throw new Error("bad v: "+v)})()).join("") as Direction;
}
const xyToPtIndex = (x: number, y: number) => y * 11 + x;
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
function displayBoard(board: Board, ball: [number, number], player: string) {
	const glboard = newGamelibBoard<DisplayTile>(10, 14, (x, y) => {
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
	res.shift();
	res.pop();
	for(const line of [0, res.length - 1]) {
		res[line] = res[line].substr(0, res[line].length - 3);
	}
	return "<@"+player+">:\n\n" + res.join("\n");
}

function initBoard(): Board {
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

console.log(displayBoard(initBoard(), [5, 7], "341076015663153153"));