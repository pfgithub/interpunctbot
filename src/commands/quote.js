const PastebinAPI = require("pastebin-js");
const pastebin = new PastebinAPI();
const {RichEmbed} = require("discord.js");


function escapeMarkdown(text) {
	let unescaped = text.replace(/\\(\*|_|`|~|\\)/g, "$1"); // unescape any "backslashed" character // why is this required?
	let escaped = unescaped.replace(/(\*|_|`|~|\\)/g, "\\$1"); // escape *, _, `, ~, \
	return escaped;
}

function deUsererrorIfy(str) {
	return str.toLowerCase();
}

module.exports = async(data, type, ...searchString) => {
	let replyMessage = await data.msg.reply("<a:loading:393852367751086090>");

	let pastebinId = data.allPastebin[type];
	if(!pastebinId) return true;
	let forceLine;
	let individual = false;

	if(searchString.length > 0 && searchString[0] === "single") individual = searchString.shift() || true;
	if(searchString.length > 0 && searchString[searchString.length - 1].match(/^\d+$/)) forceLine = parseInt(searchString.pop(), 10);
	searchString = searchString.join` `.toLowerCase().split` `;

	let allQuotes = escapeMarkdown(await pastebin.getPaste(pastebinId)
		.catch(async e => await data.msg.reply("Failed to get list. Make sure it is set with `settings lists ${type} <pastebinID>`"))
	).split`\r`.join``.split(individual ? `\n` : /\n{2,}/).filter(q=>q.match(/[A-Za-z]/)); // Death:
	if(searchString) {
		allQuotes = allQuotes
			.filter(q => searchString.every(z=>deUsererrorIfy(q).indexOf(z) > -1));
	}

	if(allQuotes.length < 1) allQuotes = [`No quotes found for ${searchString.join` `}`];
	let line = Math.floor(Math.random() * allQuotes.length);
	if(forceLine != null) line = forceLine-1;
	if(line < 0) line = 0;
	if(line > allQuotes.length - 1) line = allQuotes.length - 1;

	let quoteEmbed = new RichEmbed();
	let quoteSplit = allQuotes[line].split` - `;
	let quoteAuthor = quoteSplit[1];
	let quoteFull = quoteSplit[0];

	quoteEmbed.setDescription(`*${quoteFull}*`);
	if(quoteAuthor) quoteEmbed.setAuthor(quoteAuthor);
	else quoteEmbed.setTitle("Quote");
	quoteEmbed.setFooter(`${line+1}/${allQuotes.length}`);
	quoteEmbed.setColor(`RANDOM`);

	await replyMessage.edit("", {embed: quoteEmbed});
};
