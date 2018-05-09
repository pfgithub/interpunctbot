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
    let others = 0;
    commands._commands.forEach(cmd => {
      if(cmd.cmd instanceof RegExp) return;
      if(cmd.requirements.every(option => option(data))) help.push(`${data.prefix}${cmd.cmd}`);
      else others++;
    });
    return await data.msg.reply(`Commands: \`${help.join`\`, \``}\` ${others ? ` and ${others} others that you or your server cannot use.` : ""}`);
  });
  commands.registerCommand("about", [], async(data) => {
    await data.msg.reply("This bot does a few things. If it does a thing that it shouldn't, message pfg#4865 with the problem and I will fix it.");
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
  commands.registerCommand(new RegExp(/.+/), [], async(data) => {
    await data.msg.reply(`Command not found, try \`${data.prefix}help\` for a list of commands`);
  });
}

registerAllCommands();

fs.readdirSync(path.join(__dirname, "src/commands"));

let serverInfo = {};

function tryParse(json) {
  try{
    return JSON.parse(json || "[]");
  }catch(e) {
    console.log("Could not parse disabled commands for server ^^");
    return [];
  }
}

async function retrieveGuildInfo(msg) {
  let prefix = msg.guild ? "$" : "";
  let options = [/*o.deleteOriginal(1000)*/];
  let quotesPastebin = "";
  let disabledCommands = [];
  let rankmojis = [];
  if(msg.guild) {
    let guild = (await knex("guilds").where({"id": msg.guild.id}))[0];
    if(!guild) {
      await knex("guilds").insert({"id": msg.guild.id, "prefix": prefix});
    }else{
      prefix = guild.prefix;
      quotesPastebin = guild.quotes;
      disabledCommands = tryParse(guild.disabledCommands);
      rankmojis = tryParse(guild.rankmojis);
    }
  }
  return{
    "prefix": prefix,
    "options": options,
    "msg": msg,
    "db": knex,
    "pm": !msg.guild,
    "quotesPastebin": quotesPastebin,
    "disabledCommands": disabledCommands,
    "rankmojis": rankmojis
  };
}

bot.on("ready", async() => {
  console.log("Ready");
  // bot.guilds
  bot.user.setActivity(`Skynet Simulator ${(new Date()).getFullYear()+1}`);
});

async function checkMojiPerms(msg, info) {
  // if user.hasPerm(nitro custom emojis) && user.isNitro) {//bypass emoji role check}
  // Discord doesn't give this information to bot accounts :(
  let mojimsg = msg.cleanContent;
  let noPermMojis = [];
  let noPermMojiReason = [];
  info.rankmojis.forEach(({rank, moji}) => {
    if(msg.cleanContent.indexOf(moji) > -1) {
      if(!msg.member.roles.has(rank)) {
        mojimsg = mojimsg.split(moji).join`[]`;
        noPermMojis.push(moji);
        if(msg.guild.roles.get(rank))
          noPermMojiReason.push(msg.guild.roles.get(rank).name);
        else
          noPermMojiReason.push("a rank that doesn't exist");
      }
    }
  });
  if(mojimsg !== msg.cleanContent) {
    let response = await msg.reply(`You do not have permission to use the emoji${noPermMojis.length === 1 ? "" : "s"}: ${noPermMojis.join`, `}. You need <${noPermMojiReason.join`>, <`}> to do that`);
    response.delete(10*1000);
    await msg.reply(mojimsg);
    await msg.delete();
  }
}

bot.on("message", async msg => {
  if(msg.cleanContent.indexOf(`ehxMcVy`) > -1) return await msg.delete();

  if(msg.author.id === bot.user.id) console.log(`i> ${msg.content}`);
  if(msg.author.bot) return;
  if(msg.guild) console.log(`I< [${msg.guild.nameAcronym}] <#${msg.channel.name}> \`${msg.author.tag}\`: ${msg.content}`);
  else console.log(`I< pm: ${msg.author.tag}: ${msg.content}`);

  let info = await retrieveGuildInfo(msg);
  let handle = prefix => msg.cleanContent.startsWith(prefix) ? commands.handleCommand(msg.cleanContent.replace(prefix, ""), info) || true : false;
  handle(`${info.prefix  } `) || handle(info.prefix) || handle(`${bot.user.toString()} `) || handle(`${bot.user.toString()}`);

  checkMojiPerms(msg, info);
});

bot.on("guildCreate", (guild) => {
  console.log(`_ Joined guild ${guild.name} (${guild.nameAcronym})`);
});

bot.on("guildDelete", (guild) => { // forget about the guild at some point in time
  console.log(`_ Left guild ${guild.name} (${guild.nameAcronym})`);
});

bot.login(config.token);

// stagingServers- Allow configuration updates and moving things around and stuff
// Please create a server and do `<stageServer discord.gg/asdf`. Bots can't create servers :(
// //
