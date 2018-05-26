const Usage = require("../Usage");
const o = require("../options");

let about = new Usage({
  "description": "Info about the bot",
  "callback": async(data) => {
    await data.msg.reply(`
Interpunct Bot
Made by pfg#4865
I support PMs

Links:

Invite Me: <https://discordapp.com/api/oauth2/authorize?client_id=433078185555656705&permissions=268445780&scope=bot>
Github: <https://github.com/pfgithub/interpunctbot>
    `);
  }
});

module.exports = about;
