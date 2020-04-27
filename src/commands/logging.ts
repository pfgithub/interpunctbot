import { MessageAttachment } from "discord.js";
import { promises as fs } from "fs";
import path from "path";
import Info from "../Info";
import { messages } from "../../messages";
import { ilt } from "../..";
import * as nr from "../NewRouter";

nr.addDocsWebPage(
	"/help/log",
	"Logging",
	"commands to manage a server message log (disabled by default)",
	`{Title|Logging}

{Interpunct} has the ability to log all messages sent and edited in your server.

Logs can be deleted using the {Command|log reset} command, and all logs are deleted if you kick {Interpunct}. Old messages will be automatically removed from logs after 60 days, and a note will be inserted at the top of the log file.

{CmdSummary|log enable}
{CmdSummary|log disable}
{CmdSummary|log download}
{CmdSummary|log reset}`,
);

nr.globalCommand(
	"/help/log/download",
	"log download",
	{
		usage: "log download",
		description:
			"Upload the log file to the channel you sent this in. {Bold|Anyone will be able to download it in that channel}.",
		examples: [
			{
				in: "log download",
				out:
					"{Atmention|you}, Log files:\n{Screenshot|https://i.imgur.com/D9GVOoC.png}",
			},
		],
	},
	nr.list(),
	async ([], info) => {
		if (!(await Info.theirPerm.manageBot(info))) return;
		if (!info.db || !info.guild) {
			return await info.error("This command cannot be used in PMs");
		}
		//
		if (!(await info.db.getLogEnabled())) {
			return await info.error("Logging is not enabled on your server");
		}
		if (!info.myChannelPerms!.has("ATTACH_FILES")) {
			return await info.error(messages.logging.attach_files(info));
		}
		await info.startLoading();
		const logDownloadMessageResult = await ilt(
			info.message.reply(
				"Log files:",
				new MessageAttachment(
					`./logs/${info.guild.id}.log`,
					`${info.guild.name}.log`,
				),
			),
			"downloading log",
		);
		if (logDownloadMessageResult.error) {
			return await info.error(
				messages.logging.upload_probably_failed(
					info,
					logDownloadMessageResult.error.errorCode,
				),
			);
		}
		await info.result(messages.logging.log_sent(info));
	},
);

export async function deleteLogs(guildID: string) {
	await fs.unlink(path.join(process.cwd(), `/logs/${guildID}.log`));
}

nr.globalCommand(
	"/help/log/reset",
	"log reset",
	{
		usage: "log reset",
		description: "reset the log file on the server and start a new one",
		examples: [
			{
				in: "log reset",
				out: "{Atmention|you}, {Emoji|success} Logs have been reset.",
			},
		],
	},
	nr.list(),
	async ([], info) => {
		if (!(await Info.theirPerm.manageBot(info))) return;
		if (!info.db || !info.guild) {
			return await info.error("This command cannot be used in PMs");
		}
		if (!(await info.db.getLogEnabled())) {
			return await info.error("Logging is not enabled on your server");
		}
		await deleteLogs(info.guild.id);
		await info.success("Logs have been reset.");
	},
);

nr.globalCommand(
	"/help/log/disable",
	"log disable",
	{
		usage: "log disable",
		description: "disable message logging and delete any existing logs",
		examples: [
			{
				in: "log disable",
				out:
					"{Atmention|you}, {Emoji|success} Logs have been disabled and deleted.",
			},
		],
	},
	nr.list(),
	async ([], info) => {
		if (!(await Info.theirPerm.manageBot(info))) return;
		if (!info.db || !info.guild) {
			return await info.error("This command cannot be used in PMs");
		}
		if (!(await info.db.getLogEnabled())) {
			return await info.error("Logs are already disabled.");
		}
		await deleteLogs(info.guild.id);
		await info.db.setLogEnabled(false);
		await info.success("Logs have been disabled and deleted.");
	},
);

nr.globalCommand(
	"/help/log/enable",
	"log enable",
	{
		usage: "log enable",
		description:
			"enable logging messages on the server. {Interpunct} can only log messages from channels it has access to. Message edits will be logged too.",
		examples: [
			{
				in: "log enable",
				out: "{Atmention|you}, {Emoji|success} Logs have been enabled.",
			},
		],
	},
	nr.list(),
	async ([], info) => {
		if (!(await Info.theirPerm.manageBot(info))) return;
		if (!info.db || !info.guild) {
			return await info.error("This command cannot be used in PMs");
		}
		await info.db.setLogEnabled(true);
		await info.success("Logs have been enabled.");
	},
);

// router.add("", [], async (cmd, info) => {
// 	await info.result(
// 		"Logging commands: ```log download - download the log\nlog reset - reset the log\nlog disable/enable - enable/disable logging```",
// 	);
// });
//
// export default router;
