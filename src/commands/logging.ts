import Router from "commandrouter";
import { MessageAttachment } from "discord.js";
import * as fs from "mz/fs";
import * as path from "path";
import Info from "../Info";

const router = new Router<Info, any>();

router.add("download", [], async (cmd, info) => {
	if (!info.db || !info.guild) {
		return info.error("This command cannot be used in PMs");
	}
	//
	if (!(await info.db.getLogEnabled())) {
		return await info.error("Logging is not enabled on your server");
	}
	await info.startLoading();
	await info.result(
		"Use `log reset` to reset the log.",
		new MessageAttachment(
			`./logs/${info.guild.id}.log`,
			`${info.guild.name}.log`
		)
	);
});

async function deleteLogs(guildID: string) {
	await fs.unlink(path.join(global.__basedir, `/logs/${guildID}.log`));
}

router.add("reset", [], async (cmd, info) => {
	if (!info.db || !info.guild) {
		return info.error("This command cannot be used in PMs");
	}
	if (!(await info.db.getLogEnabled())) {
		return await info.error("Logging is not enabled on your server");
	}
	await info.startLoading();
	await deleteLogs(info.guild.id);
	await info.success("Logs have been reset.");
});

router.add("disable", [], async (cmd, info) => {
	if (!info.db || !info.guild) {
		return info.error("This command cannot be used in PMs");
	}
	await info.startLoading();
	await deleteLogs(info.guild.id);
	await info.db.setLogEnabled(false);
	await info.success("Logs have been disabled and deleted.");
});

router.add("enable", [], async (cmd, info) => {
	if (!info.db || !info.guild) {
		return info.error("This command cannot be used in PMs");
	}
	await info.startLoading();
	await info.db.setLogEnabled(true);
	await info.success("Logs have been enabled.");
});

router.add("", [], async (cmd, info) => {
	await info.result(
		"Logging commands: ```log download - download the log\nlog reset - reset the log\nlog disable/enable - enable/disable logging```"
	);
});

export default router;
