const commands = new (require("../Commands"));
const o = require("../options");

function getRankName(guild, rank) {
  if(guild.roles.get(rank))
    return (guild.roles.get(rank).name);
  return ("???");
}

function printRankMojis(guild, rankmojis) {
  return `Rankmojis: ${rankmojis.map(({rank, moji}) => `${moji}: ${getRankName(guild, rank)}`).join`, `}`;
}

commands.registerCommand("settings", [o.pm(false), o.perm("ADMINISTRATOR")/*requireRank("configurator")*/], async(data, setting, ...value) => {
  if(value) value = value.join(" ");
  if(!setting) return await data.msg.reply("Settings: `prefix: string`, `quote: pastebin id of quotes`, `rankmojis <add/remove> <rank> <emoji>`");
  if(setting === "prefix") {
    // if(o.requireRank()(data)) // this needs a subcommand system
    if(!value) return await data.msg.reply(`Prefix: \`${data.prefix}\`.`);
    await data.db("guilds").where({"id": data.msg.guild.id}).update({"prefix": value});
    return await data.msg.reply(`Prefix updated to: \`${value}\`.`);
  }
  if(setting === "quote") {
    if(!value) return await data.msg.reply(`Quote pastebin: https://pastebin.com/${data.quotesPastebin}.`);
    // if(!value.match(new RegExp(/^[A-Za-z0-9]$/))) return await data.msg.reply`Invalid pastebin id`;
    await data.db("guilds").where({"id": data.msg.guild.id}).update({"quotes": value});
    return await data.msg.reply(`Quote pastebin updated to: https://pastebin.com/${value}.`);
  }
  if(setting === "rankmojis") {
    if(!o.myPerm("MANAGE_MESSAGES")) return await data.msg.reply(`I need permission to MANAGE_MESAGES to use rankmojis`);
    if(!value) return await data.msg.reply(printRankMojis(data.msg.guild, data.rankmojis));
    value = value.split` `;
    console.log(value);
    if(value[0] === "add") {
      if(value.length !== 3) return await data.msg.reply(`rankmojis add <rank> <emoji>`);
      let rank = value[1];
      value.shift(); value.shift();
      data.rankmojis.push({"rank": rank, "moji": value.join` `.trim()});
      await data.db("guilds").where({"id": data.msg.guild.id}).update({"rankmojis": JSON.stringify(data.rankmojis)});
      return await data.msg.reply(printRankMojis(data.msg.guild, data.rankmojis));
    }
    if(value[0] === "remove") {
      if(value.length !== 2) return await data.msg.reply(`rankmojis remove <rank/emoji>`);
      value.shift(); value = value.join` `.trim();
      data.rankmojis = data.rankmojis.filter(({rank, moji}) => !(rank === value || moji === value) );
      await data.db("guilds").where({"id": data.msg.guild.id}).update({"rankmojis": JSON.stringify(data.rankmojis)});
      return await data.msg.reply(printRankMojis(data.msg.guild, data.rankmojis));
    }
    if(value[0] === "flag") { // flag rankwith true :emoji:

    }
    // if(value[0] === "delet-this") {
    //   await data.db("guilds").where({"id": data.msg.guild.id}).update({"rankmojis": []});
    //   return await data.msg.reply(`delet'd`);
    // }
    return await data.msg.reply(`rankmojis <add/remove> <rank> <emoji>`);
  }
  return await data.msg.reply("Settings_: `prefix: string`, `quote: pastebin id of quotes` , `rankmojis <add/remove> <rank> <emoji>`");
});

commands.registerCommand("listRoles", [o.pm(false), o.perm("ADMINISTRATOR")], async(data, setting, ...value) => {
  let res = [];
  for(let [id, role] of data.msg.guild.roles) {
    res.push(`${id}: ${role.name}`);
  }
  return await data.msg.reply(res.join`\n`.split`@everyone`.join`everyone`.split`@here`.join`here`);
});

module.exports = commands;
