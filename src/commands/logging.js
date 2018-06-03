const Usage = require("../Usage");
const o = require("../options");
const {Attachment} = require("discord.js");
const fs = require("mz/fs");
const path = require("path");

let log = new Usage({description: "Commands related to logging", requirements: [o.perm("ADMINISTRATOR"), o.setting("logging")]});

log.add("download", new Usage({
  description: "Download the saved log",
  callback: async(data) => {
    await data.msg.channel.send(new Attachment(`./logs/${data.msg.guild.id}.log`, `${data.msg.guild.name}.log`));
    await data.msg.reply("Use `log reset` to reset the log.");
  }
}));
log.add("reset", new Usage({
  description: "Delete the saved log",
  callback: async(data) => {
    await fs.unlink(path.join(__dirname, path.join(__dirname, `/logs/${data.msg.guild.id}.log`)));
    await data.msg.reply("Logs have been reset.");
  }
}));

module.exports = log;
