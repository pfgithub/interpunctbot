const Discord = require("discord.js");
const config = require("./config");
const bot = new Discord.Client();

bot.login(config.token);

module.exports = bot;
