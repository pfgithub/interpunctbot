const Usage = require("../Usage");
const o = require("../options");
const {RichEmbed} = require("discord.js");

function getRankName(guild, rank) {
  if(guild.roles.get(rank))
    return (guild.roles.get(rank).name);
  return ("???");
}

function printRankMojis(guild, rankmojis) { // TODO add some Setting class so you can easily add settings like list settings or set settings
  return `Rankmojis: ${rankmojis.map(({rank, moji}) => `${moji}: ${getRankName(guild, rank)}`).join`, `}`;
}

let settings = new Usage({
  "description": "Adjust bot settings",
  "requirements": [o.pm(false), o.perm("ADMINISTRATOR")]
});

settings.add("prefix", new Usage({
  "description": "Set the bot prefix",
  "usage": ["new prefix..."],
  "callback": async(data, ...value) => {
    if(!value) return await data.msg.reply(`Prefix: \`${data.prefix}\`.`);
    value = value.join` `;

    await data.db("guilds").where({"id": data.msg.guild.id}).update({"prefix": value});
    return await data.msg.reply(`Prefix updated to: \`${value}\`.`);
  }
}));

settings.add("quote", new Usage({
  "description": "Set pastebin url for where to find quotes",
  "usage": ["new prefix..."],
  "callback": async(data, ...value) => {
    if(!value) return await data.msg.reply(`Quote pastebin: https://pastebin.com/${data.quotesPastebin}.`);
    // if(!value.match(new RegExp(/^[A-Za-z0-9]$/))) return await data.msg.reply`Invalid pastebin id`;
    await data.db("guilds").where({"id": data.msg.guild.id}).update({"quotes": value});
    return await data.msg.reply(`Quote pastebin updated to: https://pastebin.com/${value}.`);
  }
}));

settings.add("rankmoji", new Usage({
  "description": "Set/Remove/List all rankmoji",
  "requirements": [o.myPerm("MANAGE_MESSAGES")],
  "callback": async(data, value) => {
    return await data.msg.reply(printRankMojis(data.msg.guild, data.rankmojis));
  }
}));

settings.path("rankmoji").add("add", new Usage({
  "description": "Add a rankmoji",
  "usage": ["rank", "emoji"],
  "callback": async(data, rank, ...moji) => {
    if(!rank || !moji) return await data.commandUsage;

    data.rankmojis.push({"rank": rank, "moji": moji.join` `.trim()});
    await data.db("guilds").where({"id": data.msg.guild.id}).update({"rankmojis": JSON.stringify(data.rankmojis)});
    return await data.msg.reply(printRankMojis(data.msg.guild, data.rankmojis));
  }
}));

settings.path("rankmoji").add("remove", new Usage({
  "description": "Add a rankmoji",
  "usage": [["rank", "emoji"]],
  "callback": async(data, ...value) => {
    if(!value) return await data.commandUsage;

    value = value.join` `.trim();
    data.rankmojis = data.rankmojis.filter(({rank, moji}) => !(rank === value || moji === value) );
    await data.db("guilds").where({"id": data.msg.guild.id}).update({"rankmojis": JSON.stringify(data.rankmojis)});

    return await data.msg.reply(printRankMojis(data.msg.guild, data.rankmojis));
  }
}));

settings.depricate("rankmojiChannel", "rankmoji channel");
settings.path("rankmoji").add("channel", new Usage({
  "description": "Sets a channel that can be used to rank people with emojis",
  "requirements": [o.myPerm("MANAGE_ROLES")],
  "usage": ["channel"],
  "callback": async(data) => {
    let chanid;
    try{
      chanid = data.msg.mentions.channels.first().id; // TODO use ? syntax when it gets released
    }catch(e) {}
    if(!chanid) return await data.msg.reply(`Rankmoji Channel: <#${data.rankmojiChannel}>.`);

    await data.db("guilds").where({"id": data.msg.guild.id}).update({"rankmojiChannel": chanid});
    return await data.msg.reply(`rankmojiChannel updated to: <#${chanid}>`);
  }
}));

settings.add("nameScreening", new Usage({
  "description": "Set/Remove/List all names where users will be instantly banned upon joining",
  "requirements": [o.myPerm("BAN_MEMBERS")],
  "callback": async(data, value) => {
    if(!value) return await data.msg.reply(`Dissalowed Name Parts: ${data.nameScreening.join`, `}`);
  }
}));

settings.path("nameScreening").add("add", new Usage({
  "description": "Add a nameScreening",
  "usage": ["name parts..."],
  "callback": async(data, ...nameparts) => {
    data.nameScreening.push(...nameparts);

    await data.db("guilds").where({"id": data.msg.guild.id}).update({"nameScreening": JSON.stringify(data.nameScreening)});
    return await data.msg.reply(`Dissalowed Name Parts: ${data.nameScreening.join`, `}`);
  }
}));

settings.path("nameScreening").add("remove", new Usage({
  "description": "Remove a nameScreening",
  "usage": ["name parts..."],
  "callback": async(data, ...nameparts) => {
    data.nameScreening = data.nameScreening.filter(v => nameparts.indexOf(v) <= -1); //

    await data.db("guilds").where({"id": data.msg.guild.id}).update({"nameScreening": JSON.stringify(data.nameScreening)});
    return await data.msg.reply(`Dissalowed Name Parts: ${data.nameScreening.join`, `}`);
  }
}));

settings.add("logging", new Usage({
  "description": "Enable/disable logging",
  "usage": [["true", "false"]],
  "callback": async(data, value) => {
    if(!value) return await data.msg.reply(`Logging: \`${data.logging}\`. Admins can \`${data.prefix}log download\` to download logs. Logs will be reset when this is run.`);

    await data.db("guilds").where({"id": data.msg.guild.id}).update({"logging": value === "true" ? "true" : "false"});
    return await data.msg.reply(`Logging is now \`${value === "true" ? "enabled" : "disabled"}\`.`);
  }
}));

settings.add("listRoles", new Usage({
  "description": "List roles on the server",
  "usage": [["true", "false"]],
  "callback": async(data) => {
    let res = [];
    let resEmbed = new RichEmbed();
    for(let [id, role] of data.msg.guild.roles) {
      res.push(`${id}: ${role.name}`);
      if(resEmbed.fields.length < 25)
        resEmbed.addField(role.name, `\`\`\`${id}\`\`\``);
    }
    if(resEmbed.fields.length < 25) return await data.msg.reply(``, {"embed": resEmbed});
    return await data.msg.reply(`\`\`\`${res.join`\n`}\`\`\``);
    // return await data.msg.reply(`\`\`\`${res.join`\n`.split`@everyone`.join`everyone`.split`@here`.join`here`}\`\`\``);
  }
}));

module.exports = settings;
