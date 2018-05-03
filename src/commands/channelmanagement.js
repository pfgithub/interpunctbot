const commands = new (require("../Commands"));
const o = require("../options");

function spaceChannels({guild, from, to}) {
  let channelNames = [];
  guild.channels.forEach(channel => {if(channel.name.indexOf(from) > -1) { channelNames.push(`<#${channel.id}>`); channel.setName(channel.name.split(from).join(to)); }   });
  return channelNames.length > 10 ? `${channelNames.length} channels` : `${  channelNames.join(", ")  }.`;
}

commands.registerCommand("spaceChannels", [o.pm(false), o.myPerm("MANAGE_CHANNELS"), o.perm("MANAGE_CHANNELS")/*o.yourPerm("MANAGE_CHANNELS")*/], async(data, yn) => {
  if(!yn) return data.msg.reply("Usage: spaceChannels [space|dash]");
  switch (yn) {
    case "true":
    case "space":
    case "yes":
      return data.msg.reply(`Spaced ${spaceChannels({"guild": data.msg.guild, "from": `-`, "to": ` `})}`);
    case "false":
    case "dash":
    case "no":
      return data.msg.reply(`Dashed ${spaceChannels({"guild": data.msg.guild, "to": `-`, "from": ` `})}`);
    default:
      return data.msg.reply("Usage: spaceChannels [space|dash]");
  }
});

commands.registerCommand("renameChannel", [o.pm(false), o.myPerm("MANAGE_CHANNELS"), o.perm("MANAGE_CHANNELS")/*o.yourPerm("MANAGE_CHANNELS")*/], async(data, channel, ...newname) => {
  if(!channel) return await data.msg.reply("Usage: renameChannel [#channel], [newname]");
  if(newname.length === 0) return await data.msg.reply("Usage: renameChannel [channel id], [newname]");
  newname = newname.join` `.split``.map(c =>
    c.match(/[A-Z]/) ? String.fromCodePoint(c.codePointAt() + 120159) : c
  ).join``.split` `.join` `;
  try{
    data.msg.guild.channels.get(channel.replace(/[^0-9]/g, "")).setName(newname);
    return await data.msg.reply(`Renamed <#${channel}> to ${newname}`);
  }catch(ex) {
    return await data.msg.reply("Could not rename channel. Maybe you didn't tag the channel right?");
  }
});


module.exports = commands;
