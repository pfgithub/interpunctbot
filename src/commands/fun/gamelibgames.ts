import * as nr from "../../NewRouter";
import { connect4 } from "./gamelib/connect4";
import { circlegame } from "./gamelib/circlegame";
import { tictactoe } from "./gamelib/tictactoe";
import { ultimatetictactoe } from "./gamelib/ultimatetictactoe";

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
	"/help/fun/circlegame",
	"circlegame",
	{
		usage: "circlegame",
		description:
			"Play a game of circlegame. {Interpunct} requires permission to manage reactions to run games best.",
		extendedDescription:
			"To play circlegame, select a row and then a number of circles to take and try to be the last person to take a circle.",
		examples: [],
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
		examples: [],
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
		extendedDescription: `instructions: play an x/o. try to get 3 in a row. the next player to play will have
to play in the board corrospoding to the one you put your piece in. if that board is
won, you can go anywhere! try to win 3 boards in a row.

for more detailed instructions, read {Link|https://mathwithbaddrawings.com/2013/06/16/ultimate-tic-tac-toe/}`,
		examples: [],
	},
	nr.passthroughArgs,
	ultimatetictactoe,
);
// correct spelling
nr.globalAlias("ultimatetictactoe", "ultimate tic tac toe");
nr.globalAlias("ultimatetictactoe", "ultimate tictactoe");
nr.globalAlias("ultimatetictactoe", "uttt");
// wrong spelling
nr.globalAlias("ultimatetictactoe", "ultimate knotsandcrosses");
nr.globalAlias("ultimatetictactoe", "ultimateknotsandcrosses");
nr.globalAlias("ultimatetictactoe", "ultimate knots and crosses");
