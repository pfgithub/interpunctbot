const commands = new (require("../Commands"));
const o = require("../options");
const client = require("../../bot");

/*commands.registerCommand(new RegExp(/^ *<(.*):(.*):(.*)> *$/), [], async(data, fullmsg, animated, name, id) => {
  await data.msg.reply(client.emojis.get(id).url);
});*/

module.exports = commands;
