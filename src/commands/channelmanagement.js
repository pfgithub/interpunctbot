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

module.exports = commands;
