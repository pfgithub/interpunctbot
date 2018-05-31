const Usage = require("../Usage");
const o = require("../options");

let ping = new Usage({
  description: "Ping the bot to see if it can respond",
  callback: async(data) => {
    await data.msg.reply("Pong!");
  }
});

module.exports = ping;
