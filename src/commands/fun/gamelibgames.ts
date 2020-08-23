import * as nr from "../../NewRouter";
import { connect4 } from "./gamelib/connect4";
import { circlegame } from "./gamelib/circlegame";
import { tictactoe } from "./gamelib/tictactoe";
import { ultimatetictactoe } from "./gamelib/ultimatetictactoe";
import { checkers } from "./gamelib/checkers";
import { papersoccer } from "./gamelib/papersoccer";

nr.globalCommand(
	"/help/fun/connect4",
	"connect4",
	{
		usage: "connect4",
		description:
			"Play a game of connect 4. {Interpunct} requires permission to manage reactions to run games best.",
		extendedDescription:
			"To play connect4, select where to drop your tile and try to make a sequence of 4 in any direction including diagonal.",
		examples: [
			{
				in: "connect4",
				out: "{Screenshot|https://i.imgur.com/3YjxBXi.png}",
			},
		],
	},
	nr.passthroughArgs,
	connect4,
);
nr.globalAlias("connect4", "connect 4");

nr.globalCommand(
	"/help/fun/checkers",
	"checkers",
	{
		usage: "checkers",
		description:
			"Play a game of checkers. {Interpunct} requires permission to manage reactions to run games best.",
		extendedDescription:
			"To play checkers, try to take all your opponents' pieces. For more help, look up the rules online. {Link|http://www.darkfish.com/checkers/rules.html}",
		examples: [
			{
				in: "checkers",
				out: "{Screenshot|https://i.imgur.com/Nx3tVMB.png}",
			},
		],
	},
	nr.passthroughArgs,
	checkers,
);

nr.globalCommand(
	"/help/fun/circlegame",
	"circlegame",
	{
		usage: "circlegame",
		description:
			"Play a game of circlegame. {Interpunct} requires permission to manage reactions to run games best.",
		extendedDescription:
			"To play circlegame, select a row and then a number of circles to take and try to be the last person to take a circle.",
		examples: [
			{
				in: "circlegame",
				out: "{Screenshot|https://i.imgur.com/HW7Pxh6.png}",
			},
		],
	},
	nr.passthroughArgs,
	circlegame,
);
nr.globalAlias("circlegame", "circle game");

nr.globalCommand(
	"/help/fun/tictactoe",
	"tictactoe",
	{
		usage: "tictactoe",
		description:
			"Play a game of tic tac toe. {Interpunct} requires permission to manage reactions to run games best.",
		extendedDescription: `To play tic tac toe, try to make 3 in a row on your turn.
{Blockquote|Some people incorrectly spell this game "knots and crosses". This spelling is wrong, but it will still be accepted by {Interpunct}.}`,
		examples: [
			{
				in: "ticktactoe",
				out: "{Screenshot|https://i.imgur.com/VL8fihL.png}",
			},
		],
	},
	nr.passthroughArgs,
	tictactoe,
);
nr.globalAlias("tictactoe", "knots and crosses");
nr.globalAlias("tictactoe", "knotsandcrosses");
nr.globalAlias("tictactoe", "tic tac toe");
nr.globalAlias("tictactoe", "tick tack toâ€™");
nr.globalAlias("tictactoe", "ttt");

nr.globalCommand(
	"/help/fun/ultimatetictactoe",
	"ultimatetictactoe",
	{
		usage: "ultimatetictactoe",
		description:
			"Play a game of ultimate tic tac toe. {Interpunct} requires permission to manage reactions to run games best.",
		extendedDescription: `Instructions:
For better instructions, read {Link|https://mathwithbaddrawings.com/2013/06/16/ultimate-tic-tac-toe/}
- On your turn, select which board to play on (if you have a choice) and then play your x/o.
- When you get 3 in a row on a small board, you win that board.
- To win the game, get 3 small boards in a row (up/down, left/right, or diagonal)
- The square you play on determines which square your opponent must play on.

{Screenshot|https://i.imgur.com/m0CGIb5.png}

`,
		examples: [
			{
				in: "ultimate tictactoe",
				out: "{Screenshot|https://i.imgur.com/SsjvYYm.png}",
			},
		],
	},
	nr.passthroughArgs,
	ultimatetictactoe,
);
// correct spelling
nr.globalAlias("ultimatetictactoe", "ultimate tic tac toe");
nr.globalAlias("ultimatetictactoe", "ultimate tictactoe");
nr.globalAlias("ultimatetictactoe", "uttt");
nr.globalAlias("ultimatetictactoe", "bigtictactoe");
nr.globalAlias("ultimatetictactoe", "big tic tac toe");
nr.globalAlias("ultimatetictactoe", "big tictactoe");
// wrong spelling
nr.globalAlias("ultimatetictactoe", "ultimate knotsandcrosses");
nr.globalAlias("ultimatetictactoe", "ultimateknotsandcrosses");
nr.globalAlias("ultimatetictactoe", "ultimate knots and crosses");
nr.globalAlias("ultimatetictactoe", "big knotsandcrosses");
nr.globalAlias("ultimatetictactoe", "bigknotsandcrosses");
nr.globalAlias("ultimatetictactoe", "big knots and crosses");

nr.globalCommand(
	"/help/fun/papersoccer",
	"papersoccer",
	{
		usage: "papersoccer",
		description:
			"Play a game of paper soccer. {Interpunct} requires permission to manage reactions to run games best.",
		extendedDescription: `To play paper soccer, try to get the ball into the opponent's goal.
You cannot move in a line that has already been drawn.
If you move somewhere that already has lines going from it, you get to move again.

Alternative spellings are accepted, including {Command|paper football}`,
		examples: [
			{
				in: "papersoccer",
				out: "{Screenshot|https://i.imgur.com/FNnudZ6.png}",
			},
		],
	},
	nr.passthroughArgs,
	papersoccer,
);
nr.globalAlias("papersoccer", "paper soccer");
nr.globalAlias("papersoccer", "paper football");
nr.globalAlias("papersoccer", "paperfootball");
nr.globalAlias("papersoccer", "soccer");
nr.globalAlias("papersoccer", "football");
