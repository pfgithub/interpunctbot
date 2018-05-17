const Discord = require("discord.js");
const config = require("./config");
const bot = new Discord.Client();


let token;
if(process.env.NODE_ENV === "production") token = config.tokenProduction;
else token = config.token;

bot.login(token);

module.exports = bot;
