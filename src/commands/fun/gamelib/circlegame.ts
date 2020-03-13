import { Move, newGame, newTileset, Player, unit } from "./gamelib";

//

type State = {
	rows: number[];
	players: Player[];
	turnIndex: number;
	selectedIndex: number;
	mode: "row" | "count" | "winner";
};

const tileset = newTileset({
	normal: "<:Circle:649845888377815061>",
	selected: [
		"<:Reaction1:649845887551668237>",
		"<:Reaction2:649845886943363102>",
		"<:Reaction3:649845885835935747>",
		"<:Reaction4:649845883826995210>",
		"<:Reaction5:649845885832003585>",
	],
	numbers: ["1️⃣", "2⃣", "3⃣", "4⃣", "5⃣"],
	noNumber: "0⃣",
});

export const circlegame = newGame<State>({
	title: "CircleGame",
	help: "/help/fun/circlegame",
	setup(players) {
		return {
			rows: [1, 2, 3, 4, 5],
			players,
			turnIndex: 0,
			selectedIndex: 0,
			mode: "row",
		};
	},
	/*
		state.turnIndex++;
		state.turnIndex %= state.players.length;
	*/
	checkGameOver(state) {
		return state.mode === "winner";
	},
	getMoves(state) {
		if (state.mode === "row")
			return state.rows
				.map((remaining, row): Move<State> | undefined => {
					if (remaining === 0) return undefined;
					return {
						button: tileset.tiles.numbers[row],
						player: state.players[state.turnIndex],
						apply: state => {
							state.selectedIndex = row;
							state.mode = "count";
							return state;
						},
					};
				})
				.filter(q => q)
				.map(q => q!);
		if (state.mode === "count")
			return [1, 2, 3, 4, 5]
				.map((toRemove): Move<State> | undefined => {
					const remaining = state.rows[state.selectedIndex];
					if (toRemove > remaining) return undefined;
					return {
						button: tileset.tiles.numbers[toRemove - 1],
						player: state.players[state.turnIndex],
						apply: state => {
							state.rows[state.selectedIndex] -= toRemove;
							if (state.rows.reduce((t, c) => t + c, 0) === 0) {
								state.mode = "winner";
								return state;
							}
							state.turnIndex++;
							state.turnIndex %= state.players.length;
							state.mode = "row";
							return state;
						},
					};
				})
				.filter(q => q)
				.map(q => q!);
		return []; // never
	},
	renderSetup() {
		return [{ type: "once", actions: tileset.tiles.numbers }];
	},
	render(state) {
		// prettier-ignore
		const board = state.mode === "count"
			? state.rows.map((remaining, row) =>
				tileset.tiles.noNumber +
				(row === state.selectedIndex
					? new Array(remaining).fill(0).map((_, col) =>
					tileset.tiles.selected[remaining - col-1]).join("")
					: tileset.tiles.normal.repeat(remaining))
			).join("\n")
			: state.rows.map((remaining, row) =>
				tileset.tiles.numbers[row] +
				tileset.tiles.normal.repeat(remaining),
			).join("\n");

		const status =
			state.mode === "winner"
				? "<@" + state.players[state.turnIndex].id + ">" + " won!"
				: "<@" +
				  state.players[state.turnIndex].id +
				  ">, it's your turn. " +
				  (state.mode === "count"
						? "Select a count."
						: "Select a row.");
		return [
			"=== **CircleGame** ===\n" +
				board +
				"\n=============" +
				"\n" +
				status,
		];
	},
	timers: [
		{
			time: unit(30, "sec"),
			message: state => {
				const currentplayer = state.players[state.turnIndex];
				return `<@${currentplayer.id}>, it's your turn. 30s left.`;
			},
		},
		{
			time: unit(60, "sec"),
			update: state => {
				state.turnIndex++;
				state.turnIndex %= state.players.length;
				state.mode = "winner";
				return state;
			},
		},
	],
});
