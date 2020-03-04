import * as nr from "../NewRouter";
import { stripMentions } from "./channelmanagement";

/*

ip!customcommand add `command name`
command text

*/

nr.globalCommand(
	"/help/customcommands/add",
	"customcommand add",
	{
		usage: "",
		description: "cca",
		examples: [],
	},
	nr.list(nr.a.backtick(), ...nr.a.words()),
	async ([safecmdname, restext], info) => {
		const safetext = stripMentions(restext);
	}
);