import * as Discord from "discord.js";
import * as nr from "../NewRouter";
import Info from "../Info";

/*

ip!customcommand add `command name`
command text

*/

nr.addDocsWebPage(
	"/help/customcommands",
	"Custom Commands",
	"custom commands config",
	`{Title|Custom Commands}
inter·punct has the ability to create custom commands and quote lists.

{CmdSummary|command add}
{CmdSummary|command remove}
{CmdSummary|command list}
{LinkSummary|/help/customcommands/quotes}
`,
);

nr.globalCommand(
	"/help/customcommands/add",
	"command add",
	{
		usage: "command add {Required|commandname} {Required|text...}",
		description: "add a custom command",
		examples: [],
		perms: { runner: ["manage_bot"] },
	},
	nr.list(nr.a.backtick(), ...nr.a.words()),
	async ([safecmdname, restext], info) => {
		if (!info.db) return await info.docs("/errors/pms", "error");
		
		const cmdname = safecmdname.toLowerCase();
		const lists = await info.db.getCustomCommands();
		if (Object.hasOwnProperty.call(lists, cmdname))
			return await info.error(
				info.tag`That command already exists. Remove it with {Command|command remove ${safecmdname}}`,
			);
		if (nr.globalCommandNS[cmdname])
			return await info.error(
				"That command is already built into interpunct bot. Pick a different name.",
			);
		lists[cmdname] = {
			type: "command",
			text: restext.trim(),
		};
		await info.db.setCustomCommands(lists);
		await info.success(info.tag`Command added. Try it with {Command|${cmdname}}`);
	},
);
