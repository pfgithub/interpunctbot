const Usage = require("command-parser");
const o = require("../options");
const {Attachment} = require("discord.js");
const fs = require("mz/fs");
const path = require("path");
const Router = require("commandrouter");

const router = new Router;

router.add("download", [], async(cmd, info) => { // 
	if(!await info.db.getLogEnabled()) {return await info.error("Logging is not enabled on your server");}
	await info.startLoading();
	await info.result("Use `log reset` to reset the log.", new Attachment(`./logs/${info.guild.id}.log`, `${info.guild.name}.log`));
});

async function deleteLogs(guildID) {
	await fs.unlink(path.join(global.__basedir, `/logs/${guildID}.log`));
}

router.add("reset", [], async(cmd, info) => {
	if(!await info.db.getLogEnabled()) {return await info.error("Logging is not enabled on your server");}
	await info.startLoading();
	await deleteLogs(info.guild.id);
	await info.success("Logs have been reset.");
});

router.add("disable", [], async(cmd, info) => {
	await info.startLoading();
	await deleteLogs(info.guild.id);
	await info.db.setLogEnabled(false);
	await info.success("Logs have been disabled and deleted.");
});

router.add("enable", [], async(cmd, info) => {
	await info.startLoading();
	await info.db.setLogEnabled(true);
	await info.success("Logs have been enabled.");
});

router.add("", [], async(cmd, info) => {
	await info.result("Logging commands: ```log download - download the log\nlog reset - reset the log\nlog disable/enable - enable/disable logging```");
});

module.exports = router;

let log = new Usage({description: "Commands related to logging", requirements: [o.perm("ADMINISTRATOR"), o.setting("logging")]});

log.add("download", new Usage({
	description: "Download the saved log",
	callback: async(data) => {
		let replyMessage = await data.msg.reply("<a:loading:393852367751086090>");

		await data.msg.channel.send(new Attachment(`./logs/${data.msg.guild.id}.log`, `${data.msg.guild.name}.log`));
		await replyMessage.edit("Use `log reset` to reset the log.");
	}
}));
log.add("reset", new Usage({
	description: "Delete the saved log",
	callback: async(data) => {
		let replyMessage = await data.msg.reply("<a:loading:393852367751086090>");
		await fs.unlink(path.join(global.__basedir, `/logs/${data.msg.guild.id}.log`));
		await replyMessage.edit("Logs have been reset.");
	}
}));