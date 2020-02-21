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

type Connect4 = {
	board: Board<"bg" | "fg">;
	turn: "r" | "y";
	players: { r: Player; y: Player };
	status: { s: "playing" } | { s: "winner"; winner: Player; reason: string };
};

const tileset = newTileset({
	red: "<:r:648226318017626132>",
	yellow: "<:y:648226318118420500>",
	empty: "<:w:648296516406083595>",
	buttons: [
		"<:1:648291430028279808>",
		"<:2:648291429864701952>",
		"<:3:648291429893931008>",
		"<:4:648291429839273994>",
		"<:5:648291429856051201>",
		"<:6:648291429554192419>",
		"<:7:648291429977948160>",
	],
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

function checkWin(gameState: Connect4) {}

export const connect4 = newGame<Connect4>({
	title: "Connect 4",
	help: "/help/fun/connect4",
	setup(players) {
		const initialState: Connect4 = {
			board: newBoard(7, 6, ["fg", "bg"]),
			turn: "r",
			players: {
				r: players[0], // person who ran the command
				y: players[1], // next person to join
			},
			status: { s: "playing" },
		};

		for (let y = 0; y < 6; y++) {
			for (let x = 0; x < 7; x++) {
				initialState.board.set("bg", x, y, tileset.tiles.empty);
			}
		}

		return initialState;
	},
	getMoves(state) {
		const resmoves: MoveSet<Connect4> = [];
		for (let x = 0; x < 7; x++) {
			const found = state.board.search(
				[x, -1],
				(stack, x, y, onBoard) => {
					if (!onBoard && y > 0) return true;
					return stack.fg === undefined ? [x, y + 1] : true;
				},
			); // should have a findPrev for the thing one before
			if (found && found.y >= 0) {
				const [x, y] = [found.x, found.y];
				resmoves.push({
					button: tileset.tiles.buttons[x],
					player: state.players[state.turn],
					apply: state => {
						// state is a copy, it should be mutated
						const tile =
							state.turn === "r"
								? tileset.tiles.red
								: tileset.tiles.yellow;
						state.board.set("fg", x, y, tile);

						state.turn = state.turn === "r" ? "y" : "r";
						return state;
					},
				});
			}
		}
		if (resmoves.length === 0) {
			///// set lose
			//// how?
			/// lose needs to be set in state and this doesn't modify state
			// also this doesn't get called until after lose should be run
		}
		return resmoves;
	},
	renderSetup() {
		return [{ type: "once", actions: [...tileset.tiles.buttons] }];
	},
	render(state: Connect4): string[] {
		const currentplayer = state.players[state.turn];
		const playercolor =
			state.turn === "r" ? tileset.tiles.red : tileset.tiles.yellow;
		const statusbar =
			state.status.s === "playing"
				? `<@${currentplayer.id}>'s turn (${playercolor})`
				: state.status.s === "winner"
				? `<@${state.status.winner.id}> won!`
				: "never.";
		return [
			`
**Connect 4**
${statusbar}
==============
${tileset.tiles.laneHeadings.join("")}
${state.board.render()}
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
					state.turn === "r"
						? tileset.tiles.red
						: tileset.tiles.yellow;
				return `<@${currentplayer.id}> (${playercolor}), it's your turn. 30s left.`;
			},
		},
		{
			time: unit(60, "sec"),
			update: state => {
				state.status = {
					s: "winner",
					winner: state.players[state.turn === "r" ? "y" : "r"],
					reason: "Time out!",
				};
				return state;
			},
		},
	],
});