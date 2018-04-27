const bot = require("./bot");
const config = require("./config");
const path = require("path");
const Commands = require("./src/Commands");
const o = require("./src/options");
const knex = require("./src/db");

const {EventEmitter} = require("events");

const fs = require("mz/fs");

let commands = new Commands;


async function registerAllCommands() {
  commands.registerCommand("help", [], async(data) => {
    let help = [];
    commands._commands.forEach(cmd => {
      if(cmd.options.every(option => option(data))) help.push(`${data.prefix}${cmd.cmd}`);
    });
    return await data.msg.reply(`Commands: \`${help.join`\`, \``}\``);
  });
  commands.registerCommands(
    require("./src/commands/ping"),
    require("./src/commands/settings"),
    require("./src/commands/quote"),
    require("./src/commands/channelmanagement")
  );
  /*(await fs.readdir(path.join(__dirname, "src/commands"))).forEach((file) => {
    commands.registerCommands(require(`./src/commands/${  file}`));
  });*/
  commands.registerCommand(new RegExp(), [], async(data) => {
    await data.msg.reply(`Command not found, try \`${data.prefix}help\` for a list of commands`);
  });
}

registerAllCommands();

fs.readdirSync(path.join(__dirname, "src/commands"));

let serverInfo = {};

async function retrieveGuildInfo(msg) {
  let prefix = msg.guild ? "<" : "";
  let options = [/*o.deleteOriginal(1000)*/];
  let quotesPastebin = "";
  if(msg.guild) {
    let guild = (await knex("guilds").where({"id": msg.guild.id}))[0];
    if(!guild) {
      await knex("guilds").insert({"id": msg.guild.id, "prefix": prefix});
    }else{
      prefix = guild.prefix;
      quotesPastebin = guild.quotes;
    }
  }
  return{
    "prefix": prefix,
    "options": options,
    "msg": msg,
    "db": knex,
    "pm": !msg.guild,
    "quotesPastebin": quotesPastebin
  };
}

bot.on("ready", async() => {
  console.log("Ready");
  // bot.guilds
  bot.user.setActivity(`Skynet Simulator ${(new Date()).getFullYear()+1}`);
});

bot.on("message", async msg => { // TODO remove things like @everyone so people can't use it // message.cleanContent
  if(msg.author.bot) return;
  let info = await retrieveGuildInfo(msg);
  console.log(msg.content);
  let handle = prefix => msg.content.startsWith(prefix) ? commands.handleCommand(msg.content.replace(prefix, ""), info) || true : false;
  handle(`${info.prefix  } `) || handle(info.prefix) || handle(`${bot.user.toString()} `) || handle(`${bot.user.toString()}`);
});

bot.on("guildCreate", (guild) => {

});

bot.on("guildDelete", (guild) => { // forget about the guild at some point in time

});

bot.login(config.token);

// stagingServers- Allow configuration updates and moving things around and stuff
// Please create a server and do `<stageServer discord.gg/asdf`. Bots can't create servers :(
// //
