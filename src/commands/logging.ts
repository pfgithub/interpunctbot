import { MessageAttachment } from "discord.js";
import { promises as fs } from "fs";
import path from "path";
import Info from "../Info";
import { messages } from "../../messages";
import { ilt } from "../..";
import * as nr from "../NewRouter";

const LOG_END_TIME = 1640453124096;
const logging_removed_extended_reason = ""
	+ " due to discord policy changes. Please disable logging on your server."
	+ " If you need this functionality, please find a different bot that can"
	+ " provide it or ask me in the support server: <https://interpunct.info/support>"
;
const logging_removed_message =
	"Logging has been removed from interpunctbot" + logging_removed_extended_reason
;

nr.addDocsWebPage(
	"/help/log",
	"Logging",
	"commands to manage a server message log (disabled by default)",
	`{Title|Logging}

Logging functionality has been removed from {Interpunct}`,
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
		perms: { runner: ["manage_bot"], raw_message: true },
	},
	nr.list(),
	async ([], info) => {
		const days_remaining = ((LOG_END_TIME - Date.now()) / 1000 / 60 / 60 / 24) |0;
		if(days_remaining <= 0) {
			return await info.error(
				logging_removed_message,
			);
		}
		await info.warn(
			"Logging will be removed from interpunctbot in"
			+ " " + days_remaining
			+ " days"
			+ logging_removed_extended_reason,
		);

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
		await info.typing();
		const logDownloadMessageResult = await ilt(
			info.raw_message!.reply({
			    content: "Log files:",
			    files: [new MessageAttachment(
			        `./logs/${info.guild.id}.log`,
			        `${info.guild.name}.log`,
			    )],
			}),
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

export async function deleteLogs(guildID: string): Promise<void> {
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
		perms: { runner: ["manage_bot"] },
	},
	nr.list(),
	async ([], info) => {
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
		perms: { runner: ["manage_bot"] },
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
		perms: { runner: ["manage_bot"] },
	},
	nr.list(),
	async ([], info) => {
		if(true as false) {
			return await info.error(logging_removed_message);
		}
		
		if (!info.db || !info.guild) {
			return await info.error("This command cannot be used in PMs");
		}
		await info.db.setLogEnabled(true);
		await info.success("Logs have been enabled.");
	},
);
