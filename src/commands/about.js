const Usage = require("command-parser");
const {RichEmbed} = require("discord.js");
const o = require("../options");
const MB = require("../MessageBuilder");
const router = new (require("commandrouter"));

router.add([], async(cmd, info) => {
	let prefix = await info.db.getPrefix();
	let mb = MB();
	mb.title.tag`Inter·punct Bot`;
	mb.description.tag`A bot that does stuff.`;
	mb.addField((title, description) => {title.tag`<:list:476514785106591744> discordbots.org`, description.tag`<https://discordbots.org/bot/433078185555656705>`;});
	mb.addField((title, description) => {title.tag`<:list:476514785106591744> bots.discord.pw`, description.tag`<https://bots.discord.pw/bots/433078185555656705>`;});
	mb.addField((title, description) => {title.tag`<:javascript:476513336490721290> source code`, description.tag`<https://gitlab.com/pfgitlab/interpunctbot>`;});
	mb.addField((title, description) => {title.tag`<:documentation:476514294075490306> documentation`, description.tag`<https://gitlab.com/pfgitlab/interpunctbot/blob/master/README.md>`;});
	mb.addField((title, description) => {title.tag`<:discord:478701038447230996> support server`, description.tag`<https://discord.gg/j7qpZdE>`;});
	mb.addField((title, description) => {title.tag`<a:cursor:404001393360502805> prefix`, description.tag`\`${prefix}\``;});
	mb.setAuthor("pfg#4865", "https://cdn.discordapp.com/avatars/341076015663153153/d4d033b5a2df0c42328659202e09438e.png?size=128");

	info.result(mb);
});

module.exports = router;
