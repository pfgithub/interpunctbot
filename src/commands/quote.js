const PastebinAPI = require("pastebin-js");
const pastebin = new PastebinAPI();
const {RichEmbed} = require("discord.js");
const Usage = require("command-parser");
const Router = require("commandrouter");

let router = new Router;

function escapeMarkdown(text) {
	let unescaped = text.replace(/\\(\*|_|`|~|\\)/g, "$1"); // unescape any "backslashed" character // why is this required?
	let escaped = unescaped.replace(/(\*|_|`|~|\\)/g, "\\$1"); // escape *, _, `, ~, \
	return escaped;
}

function deUsererrorIfy(str) {
	return str.toLowerCase();
}

async function handleList(listName, listPastebin, cmd, info) {
	// get the list pastebin id;
	let pastebinId = listPastebin;
	if(!pastebinId) return await info.error(`The ${listName} list doesn't actually exist... Spooky`);

	await info.startLoading();

	// set the search string
	let searchString = cmd.split` `;

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

	await info.result("", {embed: quoteEmbed});
}

router.add("lists", [/* info.manageBot */], async(cmd, info) => {

});
router.add([], async(cmd, info, next) => {
	let lists = await info.db.getLists(); // TODO info.db.lists
	let listNames = Object.keys(lists);
	// Here we create a new router and add all the lists to it
	let listRouter = new Router;
	listNames.forEach(listName => listRouter.add(listName, [], (c, i) => handleList(listName, lists[listName], c, i)));
	// Then we handle our request by instead giving the job to the new router. If no list is found, next will be called on the superrouter.
	return listRouter.handle(cmd, info, next);
});

module.exports = router;