const PastebinAPI = require("pastebin-js");
const pastebin = new PastebinAPI();
const {RichEmbed} = require("discord.js");
const Usage = require("command-parser");
const Router = require("commandrouter");
const {r} = require("../Info");

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

	let allQuotes;
	try{
		allQuotes = await pastebin.getPaste(pastebinId);
	}catch(er) {
		return await info.error("Failed to get list. Make sure it is set to a valid URL using `list lists`");
	}
	allQuotes = escapeMarkdown(allQuotes).split`\r`.join``.split(individual ? `\n` : /\n{2,}/).filter(q=>q.match(/[A-Za-z]/)); // Death:
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
let settingsRouter = new Router;
router.add([r.manageBot], settingsRouter);

settingsRouter.add("", [], async(cmd, info, next) => {
	await info.startLoading();
	return next();
});

settingsRouter.add("list lists", [], async(cmd, info, next) => {
	let lists = await info.db.getLists();
	return info.result(`\`\`\`${  Object.keys(lists).map(key => `${key}: https://pastebin.com/${lists[key]}`).join`\n`  }\`\`\``);
});

function parsePastebinURL(url = "") {
	let pastebinCode = url.match(/^.+([A-Za-z0-9]{8})/)[1];
	return pastebinCode;
}

async function addOrEditList(add, cmd, info) { // <name> <pastebin.com/id
	let splitCmd = cmd.split` `;
	let listName = splitCmd.shift();
	let pastebinUrl = splitCmd.join` `.trim();
	
	let lists = await info.db.getLists();

	if(!lists[listName] !== add) { // if !a !== b... !!a === b and a == b are the same and probably easier to read
		if(add) return await info.error(`List ${listName} already exists, edit it with \`lists edit ${listName} ${pastebinUrl}\` or delete it with \`lists delete ${listName}\``);
		return await info.error(`List ${listName} does not exist, add it with \`lists add ${listName} ${pastebinUrl}\``);
	}

	let pastebinID = parsePastebinURL(pastebinUrl);

	if(!pastebinID) {
		return await info.error(`Please supply a valid pastebin URL as the second argument to this command like \`https://pastebin.com/NFuKYjUN\` or just the code like \`NFuKYjUN\``);
	}

	lists[listName] = pastebinID;
	await info.db.setLists(lists);
	if(add) return await info.success(`Added list ${listName} with pastebin URL <https://pastebin.com/${pastebinID}>`);
	return await info.success(`Changed list ${listName} to <https://pastebin.com/${pastebinID}>`);
}

settingsRouter.add("lists add", [], async(cmd, info) => {
	return await addOrEditList(true, cmd, info);
});

settingsRouter.add("lists edit", [], async(cmd, info) => { // there's not much purpose to a distinction between add and edit...
	return await addOrEditList(false, cmd, info);
});

settingsRouter.add("lists remove", [], async(cmd, info) => { // there's not much purpose to a distinction between add and edit...
	let listName = cmd;
	let lists = await info.db.getLists();
	if(!lists[listName]) {
		return await info.error(`List ${listName} does not exist. View lists using \`list lists\``);
	}
	delete lists[listName];
	await info.db.setLists(lists);
	return await info.success(`Removed list ${listName}`);
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