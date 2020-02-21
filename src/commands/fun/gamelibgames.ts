import * as nr from "../../NewRouter";
import { connect4 } from "./gamelib/connect4";

nr.globalCommand(
	"/help/fun/connect4",
	"gamelib",
	{
		usage: "connect4",
		description:
			"Play a game of connect 4. {Interpunct} requires permission to manage reactions to run the game best.",
		examples: [],
	},
	nr.list(...nr.a.words()),
	connect4,
);
