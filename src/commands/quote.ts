//@ts-ignore
import PastebinAPI from "pastebin-js";
const pastebin = new PastebinAPI();
import { MessageEmbed } from "discord.js";
import Router from "commandrouter";
import Info from "../Info";

const router = new Router<Info, any>();

function escapeMarkdown(text: string) {
	const unescaped = text.replace(/\\(\*|_|`|~|\\)/g, "$1"); // unescape any "backslashed" character // why is this required?
	const escaped = unescaped.replace(/(\*|_|`|~|\\)/g, "\\$1"); // escape *, _, `, ~, \
	return escaped;
}

function deUsererrorIfy(str: string) {
	// 10/10/100
	return str.toLowerCase();
}

async function handleList(
	listName: string,
	listPastebin: string,
	cmd: string,
	info: Info
) {
	// get the list pastebin id;
	const pastebinId = listPastebin;
	if (!pastebinId) {
		return await info.error(
			`The ${listName} list doesn't actually exist... Spooky`
		);
	}

	await info.startLoading();

	// split the arguments at spaces to parse them
	let searchString = cmd.split(` `);

	let forceLine;
	let individual: string | boolean = false;

	// parse out [single] and [quote number], then condense the remaining command into a search string
	if (searchString.length > 0 && searchString[0] === "single") {
		individual = searchString.shift() || true;
	}
	if (
		searchString.length > 0 &&
		searchString[searchString.length - 1].match(/^\d+$/)
	) {
		forceLine = parseInt(searchString.pop()!, 10);
	}
	searchString = deUsererrorIfy(searchString.join(` `)).split(` `);

	// Get the pastebin paste at the pastebin id, this might fail for many reason but one is used in catch(er)
	let allQuotes;
	try {
		allQuotes = await pastebin.getPaste(pastebinId);
	} catch (er) {
		return await info.error(
			"Failed to get list. Make sure it is set to a valid URL using `list lists`"
		);
	}

	// aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
	allQuotes = escapeMarkdown(allQuotes)
		.split(`\r`)
		.join(``)
		.split(individual ? `\n` : /\n{2,}/)
		.filter(q => q.match(/[A-Za-z]/));

	// if there is a set search string, filter the quotes to only ones containing that search string
	if (searchString) {
		allQuotes = allQuotes.filter(q =>
			searchString.every(z => deUsererrorIfy(q).indexOf(z) > -1)
		);
	}

	// If there are no quotes, fake the list to actually saying No Quotes Found
	if (allQuotes.length < 1) {
		allQuotes = [`No quotes found for ${searchString.join(` `)}`];
	}

	// Set the line number to a random line unless a forceline is set
	let line = Math.floor(Math.random() * allQuotes.length); // why not forceLine || random, or with the stage 1 proposal, forceLine ?? random to have the exact same implementation
	if (forceLine !== undefined) {
		line = forceLine - 1;
	}
	if (line < 0) {
		line = 0;
	}
	if (line > allQuotes.length - 1) {
		line = allQuotes.length - 1;
	}

	// Get information out of the chosen quote about the author and stuff
	const quoteSplit = allQuotes[line].split(` - `);
	const quoteAuthor = quoteSplit[1];
	const quoteFull = quoteSplit[0];

	// Create the resulting embed and populate it, in the future this could use a messagebuilder
	const quoteEmbed = new MessageEmbed();
	quoteEmbed.setDescription(`*${quoteFull}*`);
	if (quoteAuthor) {
		quoteEmbed.setAuthor(quoteAuthor);
	} else {
		quoteEmbed.setTitle("Quote");
	}
	quoteEmbed.setFooter(`${line + 1}/${allQuotes.length}`);
	quoteEmbed.setColor(`RANDOM`);

	// Return the result
	await info.result("", { embed: quoteEmbed });
}
const settingsRouter = new Router<Info, any>();
router.add([], settingsRouter);

settingsRouter.add(
	"list lists",
	[Info.r.manageBot],
	async (cmd, info, next) => {
		await info.startLoading();
		if (!info.db) {
			return info.error("This command cannot be used in PMs");
		}
		const lists = await info.db.getLists();
		return info.result(
			`\`\`\`${Object.keys(lists)
				.map(key => `${key}: https://pastebin.com/${lists[key]}`)
				.join(`\n`)}\`\`\``
		);
	}
);

function parsePastebinURL(url: string = "") {
	const match = url.match(/^.+([A-Za-z0-9]{8})/);
	if (!match) {
		return undefined;
	}
	const pastebinCode = match[1];
	return pastebinCode;
}

async function addOrEditList(add: boolean, cmd: string, info: Info) {
	if (!info.db) {
		return info.error("This command cannot be used in PMs");
	}

	// <name> <pastebin.com/id
	// Split the command at spaces for easier maniuplation
	const splitCmd = cmd.split(` `);

	// Extract the list name and pastebin URL from the first two items in the command. let [listName, ...pastebinUrl] = splitCmd;?
	const listName = splitCmd.shift();
	const pastebinUrl = splitCmd.join(` `).trim();

	if (!listName) {
		return info.error("Usage: `command name` `pastebin.com/paste`");
	}

	// Get the lists from the database
	const lists = await info.db.getLists();

	// If the list should be added but it already exists, error. If the list should be edited but doesn't exist, error. Basically there's no point to doing this at all
	if (!!lists[listName] === add) {
		// if !a !== b... !!a === b and a == b are the same and probably easier to read
		if (add) {
			return await info.error(
				`List ${listName} already exists, edit it with \`lists edit ${listName} ${pastebinUrl}\` or delete it with \`lists delete ${listName}\``
			);
		}
		return await info.error(
			`List ${listName} does not exist, add it with \`lists add ${listName} ${pastebinUrl}\``
		);
	}

	// Parse the pastebin url out of whatever mess the user put into the second argument of the command
	const pastebinID = parsePastebinURL(pastebinUrl);

	// If no pastebin URL could be found, inform the user that they need one
	if (!pastebinID) {
		return await info.error(
			`Please supply a valid pastebin URL as the second argument to this command like \`https://pastebin.com/NFuKYjUN\` or just the code like \`NFuKYjUN\``
		);
	}

	// Update the list and save it to the database
	lists[listName] = pastebinID;
	await info.db.setLists(lists);

	// Return the right success message depending on if the list is being added or edited
	if (add) {
		return await info.success(
			`Added list ${listName} with pastebin URL <https://pastebin.com/${pastebinID}>`
		);
	}
	return await info.success(
		`Changed list ${listName} to <https://pastebin.com/${pastebinID}>`
	);
}

settingsRouter.add("lists add", [], async (cmd, info) => {
	// if lists.length > 3 say "your list limit has been reached, join the support server in `about` and ask to increase it"
	return await addOrEditList(true, cmd, info);
});

settingsRouter.add("lists edit", [], async (cmd, info) => {
	// there's not much purpose to a distinction between add and edit...
	return await addOrEditList(false, cmd, info);
});

settingsRouter.add("lists remove", [], async (cmd, info) => {
	// there's not much purpose to a distinction between add and edit...
	const listName = cmd;
	if (!info.db) {
		return info.error("This command cannot be used in PMs");
	}
	const lists = await info.db.getLists();
	if (!lists[listName]) {
		return await info.error(
			`List ${listName} does not exist. View lists using \`list lists\``
		);
	}
	delete lists[listName];
	await info.db.setLists(lists);
	return await info.success(`Removed list ${listName}`);
});

router.add([], async (cmd, info, next) => {
	if (!info.db) {
		return info.error("This command cannot be used in PMs");
	}
	const lists = await info.db.getLists(); // TODO info.db.lists
	const listNames = Object.keys(lists);
	// Here we create a new router and add all the lists to it
	const listRouter = new Router<Info, any>();
	listNames.forEach(listName =>
		listRouter.add(listName, [], (c, i) =>
			handleList(listName, lists[listName], c, i)
		)
	);
	// Then we handle our request by instead giving the job to the new router. If no list is found, next will be called on the superrouter.
	return listRouter.handle(cmd, info, next);
});

export default router;
