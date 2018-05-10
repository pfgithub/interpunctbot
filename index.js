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

async function retrieveGuildInfo(g, msg) {
  let prefix = g ? "$" : "";
  let options = [/*o.deleteOriginal(1000)*/];
  let quotesPastebin = "";
  let disabledCommands = [];
  let rankmojis = [];
  if(g) {
    let guild = (await knex("guilds").where({"id": g.id}))[0];
    if(!guild) {
      await knex("guilds").insert({"id": g.id, "prefix": prefix});
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
    "pm": !g,
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
  }
}

function logMsg({msg, prefix}) {
  if(msg.guild) console.log(`${prefix}< [${msg.guild.nameAcronym}] <#${msg.channel.name}> \`${msg.author.tag}\`: ${msg.content}`);
  else console.log(`${prefix}< pm: ${msg.author.tag}: ${msg.content}`);
}

bot.on("message", async msg => {
  if(msg.cleanContent.indexOf(`ehxMcVy`) > -1) return await msg.delete();

  if(msg.author.id === bot.user.id) console.log(`i> ${msg.content}`);
  if(msg.author.bot) return;
  logMsg({"prefix": "I", "msg": msg});
  let info = await retrieveGuildInfo(msg.guild, msg);
  let handle = prefix => msg.cleanContent.startsWith(prefix) ? commands.handleCommand(msg.cleanContent.replace(prefix, ""), info) || true : false;
  handle(`${info.prefix  } `) || handle(info.prefix) || handle(`${bot.user.toString()} `) || handle(`${bot.user.toString()}`);

  checkMojiPerms(msg, info);
});

bot.on("messageUpdate", async(from, msg) => {
  if(msg.author.bot) return;
  logMsg({"prefix": "Eo", "msg": from}); logMsg({"prefix": "E2", "msg": msg});
  let info = await retrieveGuildInfo(msg.guild, msg);
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
  console.log(`R= ${reaction.emoji}`);
  let emoji = reaction.emoji.toString();
  let info = await retrieveGuildInfo(message.guild);
  let member = message.guild.member(user);
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
            (await message.reply(`Ranked with ${role.name}`)).delete(10*1000);
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

bot.login(config.token);

process.on("unhandledRejection", (reason, p) => {
  console.log("Unhandled Rejection at: Promise", p, "reason:", reason);
  // application specific logging, throwing an error, or other logic here
});
