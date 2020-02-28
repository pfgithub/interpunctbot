// import {
// 	newBoard,
// 	newTileset,
// 	Player,
// 	newGame,
// 	MoveSet,
// 	unit,
// 	Board,
// } from "./gamelib/gamelib";
//
// //
//
// type State = {
// 	board: Board<"bg" | "fg">; // fg is going to be numbers, maybe board should store objects instead of just tiles
// };
//
// const tileset = newTileset({
// 	blank: "⬜",
// 	numbers: [
// 		"2⃣",
// 		"4⃣",
// 		"8⃣",
// 		"16",
// 		"32",
// 		"64",
// 		"128",
// 		"256",
// 		"512",
// 		"1024",
// 		"2048",
// 	],
// });
//
// export default newGame<State>({
// 	setup(players) {
// 		const board = newBoard(4, 4, ["fg", "bg"]);
// 		for (let y = 0; y < 4; y++) {
// 			for (let x = 0; x < 4; x++) {
// 				board.set("bg", x, y, tileset.tiles.blank);
// 			}
// 		}
// 		return { board };
// 	},
// 	getMoves(state) {
// 		return state;
// 	},
// 	render() {
// 		// one message with score and stuff, one message with just the 4x4 grid (for large emoji on noncompact mode.)
// 	},
// });
