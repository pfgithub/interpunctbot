const commands = new (require("../Commands"));
const o = require("../options");

commands.registerCommand("settings", [o.pm(false), o.perm("ADMINISTRATOR")/*requireRank("configurator")*/], async(data, setting, ...value) => {
  if(value) value = value.join(" ");
  if(!setting) return await data.msg.reply("Settings: `prefix: string`, `quote: pastebin id of quotes`");
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
  return await data.msg.reply("Settings: `prefix: string`, `quote: pastebin id of quotes`");
});

module.exports = commands;
