const commands = new (require("../Commands"));
const o = require("../options");

commands.registerCommand("about", [], async(data, setting, ...value) => {
  await data.msg.reply(`
Interpunct Bot
Made by pfg#4865
${data.prefix}invite to invite me
https://github.com/pfgithub/interpunctbot
I support PMs
  `);
});

commands.registerCommand("invite", [], async(data, setting, ...value) => {
  await data.msg.reply(`
https://discordapp.com/api/oauth2/authorize?client_id=433078185555656705&permissions=268445780&scope=bot
Choose your permissions
  `);
});

module.exports = commands;
