const Usage = require("command-parser");
const {RichEmbed} = require("discord.js");
const o = require("../options");

let about = new Usage({
  description: "Info about the bot",
  callback: async(data) => {
	let embed = new RichEmbed();
	embed.setAuthor("pfg#4865", "https://cdn.discordapp.com/avatars/341076015663153153/d4d033b5a2df0c42328659202e09438e.png?size=128");
	embed.setColor("random");
	embed.title = "Inter·punct Bot";
	embed.description = "A bot that does stuff.";
	embed.addField("<:list:476514785106591744> discordbots.org (vote pls)", "https://discordbots.org/bot/433078185555656705");
	embed.addField("<:list:476514785106591744> bots.discord.pw", "https://bots.discord.pw/bots/433078185555656705");
	embed.addField("<:javascript:476513336490721290> source code", "https://gitlab.com/pfgitlab/interpunctbot");
	embed.addField("<:documentation:476514294075490306> documentation", "https://gitlab.com/pfgitlab/interpunctbot/blob/master/README.md");
	embed.addField("prefix", data.prefix, true);

	data.msg.reply("About:", {embed: embed});
  }
});

module.exports = about;
