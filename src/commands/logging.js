const Usage = require("command-parser");
const o = require("../options");
const {Attachment} = require("discord.js");
const fs = require("mz/fs");
const path = require("path");

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

module.exports = log;
