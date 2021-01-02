import * as Discord from "discord.js";
import * as nr from "../NewRouter";
import { stripMentions } from "./channelmanagement";
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

export async function restrictTextToPerms(
	member: Discord.GuildMember,
	text: string,
	info: Info,
): Promise<string> {
	let message = text;

	const theyCanMention = member.hasPermission("MENTION_EVERYONE");

	if (!theyCanMention) {
		const nmsg = stripMentions(message);
		if (nmsg !== message)
			await info.warn(
				"To include arbitrary mentions in the message, you must have permission to MENTION_EVERYONE.",
			);
		message = nmsg;
	}
	message = message.trim();

	return message;
}

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
	async ([safecmdname, unsaferestext], info) => {
		if (!info.db) return await info.docs("/errors/pms", "error");
		const safetext = await restrictTextToPerms(
			info.message.member!,
			unsaferestext,
			info,
		);

		const lists = await info.db.getCustomCommands();
		if (lists[safecmdname.toLowerCase()])
			return await info.error(
				info.tag`That command already exists. Remove it with {Command|command remove ${safecmdname}}`,
			);
		if (nr.globalCommandNS[safecmdname.toLowerCase()])
			return await info.error(
				"That command is already built into interpunct bot. Pick a different name.",
			);
		lists[safecmdname.toLowerCase()] = {
			type: "command",
			text: safetext.trim(),
		};
		await info.db.setCustomCommands(lists);
		await info.success("ok");
	},
);
