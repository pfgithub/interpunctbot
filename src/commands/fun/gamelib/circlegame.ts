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
	normal: "🟣",
	selected: ["1️⃣", "2⃣", "3⃣", "4⃣", "5⃣"],
	numbers: ["1️⃣", "2⃣", "3⃣", "4⃣", "5⃣"],
	noNumber: "🟦",
	backbtn: "↩️",
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
		if (state.mode === "count") {
			const res = [1, 2, 3, 4, 5]
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
			res.push({
				button: tileset.tiles.backbtn,
				player: state.players[state.turnIndex],
				apply: state => {
					state.mode = "row";
					return state;
				},
			});
			return res;
		}
		return []; // never
	},
	renderSetup() {
		return [
			{
				type: "once",
				actions: [tileset.tiles.backbtn, ...tileset.tiles.numbers],
			},
		];
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
				"Try to be the last player to take a circle.\n" +
				status,
		];
	},
	timers: [
		{
			time: unit(0, "sec"),
			message: state => {
				const currentplayer = state.players[state.turnIndex];
				return `<@${currentplayer.id}>, it's your turn.`;
			},
		},
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
