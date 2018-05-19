const bot = require("./bot");
const config = require("./config");
const path = require("path");
const Commands = require("./src/Commands");
const o = require("./src/options");
const knex = require("./src/db"); // TODO add something so if you delete a message with a command it deletes the result messages or a reaction on the result msg or idk
const Attachment = require("discord.js").Attachment;
const moment = require("moment");

const {EventEmitter} = require("events"); // TODO add a thing for warning people like $warn [person] and have it be like 1 warning fine 2 warnings tempmute 3 warnings...and customizeable

const fs = require("mz/fs");

let commands = new Commands;

let production = process.env.NODE_ENV === "production";

let mostRecentCommands = [];

function devlog(...msg) {
  if(!production) console.log(...msg);
}


async function registerAllCommands() {
  commands.registerCommand("help", [], async(data, cmd) => {
    let all = false;
    if(cmd === "all") all = true;
    let help = [];
    let others = 0;
    commands._commands.forEach(cmd => {
      if(cmd.cmd instanceof RegExp) return;
      if(all || cmd.requirements.every(option => option(data))) help.push(`${data.prefix}${cmd.cmd}`);
      else others++;
    });
    return await data.msg.reply(`Commands: \`${help.join`\`, \``}\` ${others ? ` and ${others} others that you or your server cannot use.` : ""}. ${!all && others ? `\`${data.prefix}help all\` for a full list of commands` : ""}`);
  });
  commands.registerCommands(
    require("./src/commands/ping"),
    require("./src/commands/settings"),
    require("./src/commands/quote"),
    require("./src/commands/channelmanagement"),
    require("./src/commands/about")
  );
  commands.registerCommand("downloadLog", [o.perm("ADMINISTRATOR"), o.setting("logging")], async(data) => {
    try{
      await data.msg.channel.send(new Attachment(`./logs/${data.msg.guild.id}.log`, `${data.msg.guild.name}.log`));
      await data.msg.reply("Use $resetLog to reset the log.");
    }catch(e) {
      await data.msg.reply`Could not get logs. Maybe they're not enabled?`;
    }
  });
  commands.registerCommand("resetLog", [o.perm("ADMINISTRATOR"), o.setting("logging")], async(data) => {
    try{
      await fs.unlink(path.join(__dirname, `logs/${data.msg.guild.id}.log`));
      await data.msg.reply("Logs have been reset.");
    }catch(e) {
      await data.msg.reply`Could not reset logs. Maybe they don't exist?`;
    }
  });
  commands.registerCommand(/crash/, [o.owner()], async(data) => {
    throw new Error("Unhandled promise rejection");
  });
  commands.registerCommand(/guildsIAmOn/, [o.owner()], async(data) => {
    return await data.msg.reply(`I am on ${bot.guilds.size} guilds`);
  });
  commands.registerCommand(/echo `(.+)`/, [o.owner()], async(data, all, whatToEcho) => {
    await data.msg.channel.send(whatToEcho.split`:__:`.join``);
    data.msg.delete();
  });
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
    return json;
  }catch(e) {
    console.log(`Could not parse  ^^${JSON.stringify(json)}`);
    return [];
  }
}

async function retrieveGuildInfo(g, msg) {
  let prefix = g ? "ip!" : "";
  let options = [/*o.deleteOriginal(1000)*/];
  let quotesPastebin = "";
  let disabledCommands = [];
  let rankmojis = [];
  let rankmojiChannel = "";
  let nameScreening = [];
  let logging = false;
  if(g) {
    let guild = (await knex("guilds").where({"id": g.id}))[0];
    if(!guild) {
      await knex("guilds").insert({"id": g.id, "prefix": prefix});
    }else{
      prefix = guild.prefix;
      quotesPastebin = guild.quotes;
      disabledCommands = tryParse(guild.disabledCommands) || disabledCommands;
      rankmojis = tryParse(guild.rankmojis) || rankmojis;
      rankmojiChannel = guild.rankmojiChannel;
      nameScreening = tryParse(guild.nameScreening) || nameScreening;
      logging = guild.logging === "true" ? true : false;
    }
  }
  return{
    "prefix": prefix,
    "options": options,
    "msg": msg,
    "db": knex,
    "pm": !g,
    "quotesPastebin": quotesPastebin,
    "disabledCommands": disabledCommands,
    "rankmojis": rankmojis,
    "rankmojiChannel": rankmojiChannel,
    "nameScreening": nameScreening,
    "logging": logging
  };
}

bot.on("ready", async() => {
  console.log("Ready");
  // bot.user.setActivity(`Skynet Simulator ${(new Date()).getFullYear()+1}`);
  bot.user.setActivity(`ip!help`);
});

bot.on("guildMemberAdd", async(member) => { // serverNewMember // member.toString gives a mention that's cool
  let info = await retrieveGuildInfo(member.guild);
  let nameParts = info.nameScreening.filter(screen => member.displayName.toLowerCase().indexOf(screen.toLowerCase()) > -1);
  if(nameParts.length > 0) { // if any part of name contiains screen
    if(member.bannable) {
      member.ban(`Name contains dissallowed words: ${nameParts.join`, `}`);
      if(info.logging) try{
        guildLog(member.guild.id, `[${moment().format("YYYY-MM-DD HH:mm:ss Z")}] Banned ${member.displayName} because their name contains ${nameParts.join`, `}`);
      }catch(e) {console.log(e);}
    }else{
      devlog("E>< Could not ban member");
    }
  }
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
        mojimsg = mojimsg.split(moji).join(`[no perms]`);
        noPermMojis.push(moji);
        if(msg.guild.roles.get(rank))
          noPermMojiReason.push(msg.guild.roles.get(rank).name);
        else
          noPermMojiReason.push("a rank that doesn't exist");
      }
    }
  });
  if(mojimsg !== msg.cleanContent) {
    await msg.delete();
    let response = await msg.reply(`You do not have permission to use the emoji${noPermMojis.length === 1 ? "" : "s"}: ${noPermMojis.join`, `}. You need <${noPermMojiReason.join`>, <`}> to do that`);
    response.delete(10*1000);
    let themsg = await msg.reply(mojimsg);
    themsg.delete(20*1000);
    return false;
  }
  return true;
}

function logMsg({msg, prefix}) {
  if(msg.guild) devlog(`${prefix}< [${msg.guild.nameAcronym}] <#${msg.channel.name}> \`${msg.author.tag}\`: ${msg.content}`);
  else devlog(`${prefix}< pm: ${msg.author.tag}: ${msg.content}`);
}

async function guildLog(id, log) {
  await fs.appendFile(path.join(__dirname, `logs/${id}.log`), `${log}\n`, "utf8");
}

bot.on("message", async msg => {
  if(msg.author.id === bot.user.id) devlog(`i> ${msg.content}`);
  if(msg.author.bot) return;
  logMsg({"prefix": "I", "msg": msg});
  let info = await retrieveGuildInfo(msg.guild, msg);
  if(info.logging) try{guildLog(msg.guild.id, `[${moment().format("YYYY-MM-DD HH:mm:ss Z")}] <#${msg.channel.name}> \`${msg.author.tag}\`: ${msg.content}`);}catch(e) {console.log(e);}
  let handle = prefix => {
    if(msg.cleanContent.startsWith(prefix)) {
      commands.handleCommand(msg.cleanContent.replace(prefix, ""), info);
      mostRecentCommands.push({"content": msg.cleanContent, "date": new Date()});
      while(mostRecentCommands.length > 5) {
        mostRecentCommands.shift();
      }
      return true;
    }
    return false;
  };
  handle(`${info.prefix  } `) || handle(info.prefix) || handle(`${bot.user.toString()} `) || handle(`${bot.user.toString()}`);

  if(!(await checkMojiPerms(msg, info))) return;
  // if(msg.channel.id === info.rankmojiChannel) {
  //   info.rankmojis.forEach(({rank, moji}) => {
  //     msg.react(msg.guild.emojis.get(moji.split`:`[2].replace(/[^0-9]/g, "")) || moji);
  //   });
  // }
});

bot.on("messageUpdate", async(from, msg) => {
  if(msg.author.bot) return;
  logMsg({"prefix": "Eo", "msg": from}); logMsg({"prefix": "E2", "msg": msg});
  let info = await retrieveGuildInfo(msg.guild, msg);
  if(info.logging) try{
    guildLog(msg.guild.id, `[${moment().format("YYYY-MM-DD HH:mm:ss Z")}] <#${from.channel.name}> \`${from.author.tag}\` Edited Message: ${from.content}`);
    guildLog(msg.guild.id, `[${moment().format("YYYY-MM-DD HH:mm:ss Z")}] <#${msg.channel.name}> \`${msg.author.tag}\` To: ${msg.content}`);
  }catch(e) {console.log(e);}
  checkMojiPerms(msg, info);
});

function getEmojiKey(emoji) {
  return (emoji.id) ? `${emoji.name}:${emoji.id}` : emoji.name;
}

bot.on("raw", async event => {
  if (event.t !== "MESSAGE_REACTION_ADD") return;

  const { "d": data } = event;
  const user = bot.users.get(data.user_id);
  const channel = bot.channels.get(data.channel_id);
  if(!channel) return;
  let message;
  message = await channel.fetchMessage(data.message_id);
  const emojiKey = getEmojiKey(data.emoji);
  const reaction = message.reactions.get(emojiKey);

  bot.emit("messageReactionAddCustom", reaction, user, message);
});
let rolesToAddToMessages = {};

bot.on("messageReactionAddCustom", async(reaction, user, message) => {
  if(user.bot) return;
  console.log(`R= ${reaction.emoji}`); // keeping this around because this isn't tested that well, if it crashes it might help
  let emoji = reaction.emoji.toString();
  let info = await retrieveGuildInfo(message.guild);
  // if(info.logging) try{guildLog(msg.guild.id, `[${moment().format("YYYY-MM-DD HH:mm:ss Z")}] <#${message.channel.name}> \`${message.author.tag}\` Edited Message: ${from.content}`)}catch(e){console.log(e);} // no point
  let member = message.guild.member(user);
  if(message.channel.id !== info.rankmojiChannel) return;
  if(member.hasPermission("MANAGE_ROLES") && message.guild.member(bot.user).hasPermission("MANAGE_ROLES")) {
    let delet = () => {
      if(rolesToAddToMessages[message.id]) {
        rolesToAddToMessages[message.id].reaxns.forEach(reaxn => message.reactions.get(reaxn).remove());
        delete rolesToAddToMessages[message.id];
      }
    };
    info.rankmojis.forEach(async({rank, moji}) => {
      if(moji !== emoji) return;
      if(!message.guild.roles.get(rank)) return;
      if(!rolesToAddToMessages[message.id]) rolesToAddToMessages[message.id] = {"roles": [], "reaxns": []};
      rolesToAddToMessages[message.id].roles.push(rank);
      rolesToAddToMessages[message.id].reaxns.push(getEmojiKey((await message.react("✅")).emoji));
      rolesToAddToMessages[message.id].reaxns.push(getEmojiKey((await message.react("❎")).emoji));
      setTimeout(delet, 5*1000);
    });
    if(emoji === "✅") {
      if(rolesToAddToMessages[message.id]) {
        rolesToAddToMessages[message.id].roles.forEach(async rolid => {
          let role = message.guild.roles.get(rolid);
          try{
            await message.member.addRole(role);
            await message.reply(`Ranked with ${role.name}`);
          }catch(e) {
            (await message.reply(`Could not rank, I need to be above the role you want me to rank with`)).delete(10*1000);
          }
        });
      }
    }
    if(emoji === "❎") {
      delet();
    }
  }
});

bot.on("guildCreate", (guild) => {
  console.log(`_ Joined guild ${guild.name} (${guild.nameAcronym})`);
});

bot.on("guildDelete", (guild) => { // forget about the guild at some point in time
  console.log(`_ Left guild ${guild.name} (${guild.nameAcronym})`);
});

process.on("unhandledRejection", (reason, p) => {
  let finalMsg = `${mostRecentCommands.map(c => `\`${c.content}\` ][ ${moment(c.date).fromNow()}`).join`\n`}\n<@${config.owner}> Unhandled Rejection at: Promise ${p.toString()} reason: ${reason.toString()}`;
  console.log(finalMsg);
  try{
    let rept = config.errorReporting.split`/`;
    bot.guilds.get(rept[0]).channels.get(rept[1]).send(finalMsg); // TODO disable logging in production and instead show the 10 messages before here with this
  }catch(e) {
    console.log("Failed to report");
  }
  // application specific logging, throwing an error, or other logic here
});
