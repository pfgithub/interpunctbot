import * as nr from "../../NewRouter";
import { connect4 } from "./gamelib/connect4";
import { circlegame } from "./gamelib/circlegame";

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
