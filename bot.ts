import Discord from "discord.js";
import config from "./config";
const bot = new Discord.Client();


let token;
if(process.env.NODE_ENV === "production") {token = config.tokenProduction;}
else {token = config.token;}

bot.login(token);

export default bot;
