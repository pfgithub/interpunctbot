import { Board, boardForEach, boardGet, boardMap, boardRender, newBoard } from "../gamelib/gamelib";
import {
	callback,
	CreateOpts, Game, HandleInteractionResponse,
	mkbtn,
	RenderResult,
	renderResultToHandledInteraction, renderResultToResult,
} from "./tictactoe";

type Tile = {
    ship: 0 | number,
    attacked: boolean,
};

type BattleshipState = {
    your_board: Board<Tile>,
	their_board: Board<Tile>,
	initiator: string,
	crosshair: {x?: number, y?: number},
	who: "your_board" | "their_board",
	ships: boolean[],
	placing_ship?: {ship: 0 | number}, // ideally this'd be an overlay thing but I haven't implemented overlays yet
};
function irange<T>(start: number, end: number, map: (v: number) => T): T[] {
	const res: T[] = [];
	for(let i = start; i <= end; i++) res.push(map(i));
	return res;
}

const ship_names: {length: number, color: string, name: string}[] = [{length: 0, color: "NO", name: "NONE"},
	{length: 5, color: "🟫", name: "Carrier"},
	{length: 4, color: "🟩", name: "Battleship"},
	{length: 3, color: "🟧", name: "Cruiser"},
	{length: 3, color: "🟪", name: "Submarine"},
	{length: 2, color: "🟥", name: "Destroyer"},
];

// ok ima do board setup first
// it'll uuh
// we'll have the crosshair view
// and then a Ships button (only active if you have both in the crosshair selected)
// and then you can select a ship and choose where to place it (up, left, down, or right of the crosshair)
// or go back

// the ships:
// 1: a five long ship
// 2: a four long ship
// 3: a three long ship
// 4: a three long ship
// 5: a two long ship

// ship colors:
// 🟫🟩🟧🟪🟥 brown, green, orange, purple, red
// and then uuh yellow for selection
// or white for selection
// oh wait uh oh we need a color scheme for your board
// that shows tiles that have been attacked
// b/c you can look at your board and see what is being attacked
// wait there's "❎" and "🔲🔳" I can use those for some things probably
// the x for hit water
// 🔄 ok we got it here's our scheme
//

// YOUR BOARD:
// 🟦 water is blue
// 🔄 hit water is this
// ❎ hit ship is this (or one of 🔲🔳 these maybe idk)
// ⬛ crosshair is black // 🔲 use this maybe if your crosshair intersects something? idk
// 🟫🟩🟧🟪🟥 ships are many colors

// THEIR BOARD:
// ⬛ unknown is black
// 🟦 hit water is blue
// 🟥 hit ship is red
// 🟧 crosshair is orange or ⬜ white (use 🔳 for crosshair intersection idk)

// then for playing we'll uuh
// so we'll use black bg and only put blue where there is water
// - blue: water
// - red: ship
// - red: ship, sunk (oh wait you don't actually know right. the game has to announce it but you may not know where the sink was)

// so here's how the game will work
// 1: board setup. both ppl set up their board and then say when they're ready
// 2: turns. goes in turns one person attacks the other

// general outline
// there'll be a "root game" that holds: interaction tokens for the two ephemeral messages (and can recreate them and update if needed)
// and then when you do something that the other player needs to know about, it'll send it through the root game or whatever
// since the root game is a normal message, it can be edited with normal api requests and no expiration issues

function placeShip(x: number, y: number, board: Board<Tile>, [dx, dy]: [number, number], ship_id: number): boolean {
	for(let i = 0; i < ship_names[ship_id].length; i++) {
		const tile = boardGet(board, x, y);
		if(!tile) return false;
		if(tile.ship) return false;
		tile.ship = ship_id;

		x += dx;
		y += dy;
	}
	return true;
}

function newRender(state: BattleshipState): RenderResult<BattleshipState> {
	const render_board = newBoard(11, 11, (x, y) => {
		if(x === 0 && y === 0) return "corner";
		if(y === 0) return "letter";
		if(x === 0) return "number";
		return boardGet(state[state.who], x - 1, y - 1) as Tile;
	});
	const rendered_board = ".\n"+boardRender(render_board, (tile, x, y) => {
		if(typeof tile === "string") {
			if(tile === "corner") return "🟦";
			if(x - 1 === state.crosshair.x) return "🟦";
			if(y - 1 === state.crosshair.y) return "🟦";
			if(tile === "letter") return String.fromCodePoint(0x1f1e6 + x - 1) + "\u200b";
			if(tile === "number") return (+y % 10)+"\uFE0F\u20e3";
		}
		if(state.who === "your_board") {
			if(tile.attacked) return [..."🔄❎"][+!!tile.ship]; // red or blue
			if(tile.ship && state.placing_ship?.ship !== tile.ship) return ship_names[tile.ship].color;
			if(state.placing_ship) {
				if(x - 1 === state.crosshair.x && y - 1 === state.crosshair.y) return "🔳";
			}else{
				if(x - 1 === state.crosshair.x && y - 1 !== state.crosshair.y) return "⬛";
				if(y - 1 === state.crosshair.y && x - 1 !== state.crosshair.x) return "⬛";
			}
			return "🟦";
		}else{
			if(tile.attacked) return [..."🟦🟥"][+!!tile.ship]; // red or blue
			if(x - 1 === state.crosshair.x && y - 1 !== state.crosshair.y) return "🟧";
			if(y - 1 === state.crosshair.y && x - 1 !== state.crosshair.x) return "🟧";
			return "⬛";
		}
	});
	if(state.placing_ship) {
		return {
			content: rendered_board,
			embeds: [],
			components: [
				[
					mkbtn<BattleshipState>("< Back", "secondary", {}, callback("START", (author_id) => {
						if(state.initiator !== author_id) return {kind: "error", msg: "This isn't your game"};
						
						state.placing_ship = undefined;
						return {kind: "update_state", state};
					})),
				],
				irange(1, 5, (ship_id) => {
					const ship_info = ship_names[ship_id];
					return mkbtn<BattleshipState>(ship_info.color.repeat(ship_info.length), state.placing_ship?.ship === ship_id
					? "accept" : state.ships[ship_id]
					? "primary" : "secondary", {disabled: state.placing_ship?.ship === ship_id}, callback("SHIP,"+ship_id, (author_id) => {
						if(state.initiator !== author_id) return {kind: "error", msg: "This isn't your game"};

						state.placing_ship = {ship: ship_id};
						return {kind: "update_state", state};
					}));
				}),
				([[-1, 0, "←"], [0, 1, "↓"], [0, -1, "↑"], [1, 0, "→"]] as const).map(([dx, dy, name]) => {
					return mkbtn<BattleshipState>(name, state.placing_ship?.ship ? "primary" : "secondary", {
						disabled: !state.placing_ship?.ship || !placeShip(state.crosshair.x!, state.crosshair.y!, boardMap(state.your_board,
							(tile) => tile.ship === state.placing_ship?.ship ? {...tile, ship: 0} : {...tile},
						), [dx, dy], state.placing_ship.ship)
					}, callback("PUT"+dx+","+dy, (author_id) => {
						if(state.initiator !== author_id) return {kind: "error", msg: "This isn't your game"};
						const placing_ship = state.placing_ship!.ship;

						boardForEach(state.your_board, (tile) => {
							if(tile.ship === placing_ship) tile.ship = 0;
						});
						placeShip(state.crosshair.x!, state.crosshair.y!, state.your_board, [dx, dy], placing_ship);
						state.placing_ship = undefined;
						state.ships[placing_ship] = false;
						state.crosshair = {};

						return {kind: "update_state", state};
					}));
				})
			],
			allowed_mentions: {parse: []},
		};
	}
	const axisbtn = (mode: "x" | "y", num: number) => {
		return mkbtn<BattleshipState>(
			"" + (mode === "x" ? String.fromCodePoint(0x41 + num) : ((num + 1) % 10)),
			state.crosshair[mode] === num ? "primary" : "secondary", // blue if selected or smth (blue tiles will be used for the crosshair)
			{},
			callback("NUM,"+mode+","+num, (author_id) => {
				if(state.initiator !== author_id) return {kind: "error", msg: "This isn't your game"}; // (this won't be needed)
				// author id won't matter since these'll be in an ephemeral message
				// there'll be a main thing in a normal message that can say like "hey person, please"
				// "hit refresh on your ephemeral message" if it goes past the 15min update limit
				// and also there'll be a button to get a new ephemeral message if you lost it

				if(state.crosshair[mode] === num) {
					state.crosshair[mode] = undefined;
				}else{
					state.crosshair[mode] = num;
				}

				return {kind: "update_state", state};
			}),
		);
	};
	return {
		content: rendered_board,
		embeds: [],
		components: [
			[
				mkbtn<BattleshipState>("Go to "+(state.who === "your_board" ? "their" : "your")+" board", "secondary", {}, callback("GOTO", (author_id) => {
					if(state.initiator !== author_id) return {kind: "error", msg: "This isn't your game"};

					state.who = state.who === "your_board" ? "their_board" : "your_board";
					state.crosshair = {};
					return {kind: "update_state", state};
				})),
				...state.who === "your_board" ? [
					mkbtn<BattleshipState>("Place Ship", state.ships.every(ship => !ship) ? "secondary" : "primary", {
						disabled: state.crosshair.x == null || state.crosshair.y == null,
					}, callback("SHIPS", (author_id) => {
						if(state.initiator !== author_id) return {kind: "error", msg: "This isn't your game"};

						state.placing_ship = {ship: 0};
						return {kind: "update_state", state};
					})),
					mkbtn<BattleshipState>("Ready", "accept", {
						disabled: !state.ships.every(ship => !ship),
					}, callback("START", (author_id) => {
						if(state.initiator !== author_id) return {kind: "error", msg: "This isn't your game"};

						return {kind: "update_state", state};
					})),
				] : [
					mkbtn<BattleshipState>("Fire!", "deny", {disabled: state.crosshair.x == null || state.crosshair.y == null}, callback("FIRE", (author_id) => {
						if(state.initiator !== author_id) return {kind: "error", msg: "This isn't your game"};

						const tile = boardGet(state.their_board, state.crosshair.x!, state.crosshair.y!)!;
						tile.attacked = true;
						state.crosshair = {};
						return {kind: "update_state", state};
					})),
				],
			],
			irange(0, 4, n => axisbtn("x", n)),
			irange(5, 9, n => axisbtn("x", n)),
			irange(0, 4, n => axisbtn("y", n)),
			irange(5, 9, n => axisbtn("y", n)),
		],
		allowed_mentions: {parse: []},
	};
}

export const BattleshipGame: Game<BattleshipState> & {
	init(o: CreateOpts): BattleshipState,
} = {
	kind: "BTTL",
	init({author_id}) {
		return {
			your_board: newBoard(10, 10, (x, y) => ({ship: 0, attacked: false})),
			their_board: newBoard(10, 10, (x, y) => ({ship: 0, attacked: false})),
			initiator: author_id,
			crosshair: {},
			who: "your_board",
			ships: [false, true, true, true, true, true],
			placing_ship: undefined,
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
	handleInteraction(opts): HandleInteractionResponse<BattleshipState> {
		return renderResultToHandledInteraction(newRender(opts.state), opts);
	},
};