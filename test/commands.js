/*global Promise*/
const Discord = require("discord.js");
const bot = new Discord.Client();
const conf = require("../config.json");


let server = "342404605432430602";
let channel = "435612840104165378";
// tests are handled sequentially

function it(description, cb, aboveme) {

}
const describe = it;

let latestMsgsInChannel = [];
let noticeMe = [];
bot.on("message", async msg => {
  if(msg.channel === channel) {
    if(noticeMe[0]) noticeMe.shift()(msg);
    else latestMsgsInChannel.push(msg);
  }
});

function response() {
  if(latestMsgsInChannel[0])
    return new Promise(resolve => resolve(latestMsgsInChannel.shift()));
  return new Promise(resolve => {
    noticeMe.push(msg => {
      resolve(msg);
    });
  });
}

describe("VoteBot", () => {
  describe("Commands", () => {
    it("should respond to prefixed commands", async() => {
      bot.guilds.get(server).channels.get(channel).sendMessage("<shouldRespond");
      (await response());
    });
  });
});

bot.login(conf.testToken);
