const commands = new (require("../Commands"));
const o = require("../options");

commands.registerCommand("ping", [], async(data) => {
  await data.msg.reply("Pong!");
});

module.exports = commands;
