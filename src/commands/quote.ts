//@ts-ignore
import PastebinAPI from "pastebin-js";
const pastebin = new PastebinAPI();
import { MessageEmbed } from "discord.js";
import Info from "../Info";
import { messages } from "../../messages";
import * as nr from "../NewRouter";

function escapeMarkdown(text: string) {
	const unescaped = text.replace(/\\(\*|_|`|~|\\)/g, "$1"); // unescape any "backslashed" character // why is this required?
	const escaped = unescaped.replace(/(\*|_|`|~|\\)/g, "\\$1"); // escape *, _, `, ~, \
	return escaped;
}

function normalizeSearchTerm(str: string) {
	return str.toLowerCase();
}

export async function handleList(
	listName: string,
	listPastebin: string,
	cmd: string,
	info: Info,
) {
	// get the list pastebin id;
	const pastebinId = listPastebin;
	if (!pastebinId) {
		return await info.error(
			messages.lists.list_exists_but_not_really(info, listName),
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
		/^\d+$/.exec(searchString[searchString.length - 1])
	) {
		forceLine = parseInt(searchString.pop()!, 10);
	}
	searchString = normalizeSearchTerm(searchString.join(` `)).split(` `);

	// Get the pastebin paste at the pastebin id, this might fail for many reason but one is used in catch(er)
	let allQuotes;
	try {
		allQuotes = await pastebin.getPaste(pastebinId);
	} catch (er) {
		return await info.error(messages.lists.failed_to_get_list(info));
	}

	// aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
	allQuotes = escapeMarkdown(allQuotes)
		.split(`\r`)
		.join(``)
		.split(individual ? `\n` : /\n{2,}/)
		.filter(q => /[A-Za-z]/.exec(q));

	// if there is a set search string, filter the quotes to only ones containing that search string
	if (searchString) {
		allQuotes = allQuotes.filter(q =>
			searchString.every(z => normalizeSearchTerm(q).includes(z)),
		);
	}

	// If there are no quotes, fake the list to actually saying No Quotes Found
	if (allQuotes.length < 1) {
		allQuotes = [
			messages.lists.nothing_found_for_search(info, searchString),
		];
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

	if (info.myChannelPerms!.has("EMBED_LINKS")) {
		// Create the resulting embed and populate it, in the future this could use a messagebuilder
		const quoteEmbed = new MessageEmbed();
		quoteEmbed.setDescription(`*${quoteFull}*`);
		if (quoteAuthor) {
			quoteEmbed.setAuthor(quoteAuthor);
		} else {
			quoteEmbed.setTitle("Quote");
		}
		quoteEmbed.setFooter(`${line + 1}/${allQuotes.length}`);
		quoteEmbed.setColor(3092790);

		// Return the result
		return await info.result("", { embed: quoteEmbed });
	}
	return await info.result(`${quoteAuthor || "Quote"}
${quoteFull
	.split("\n")
	.map(l => `> *${l}*`)
	.join("\n")}
${line + 1}/${allQuotes.length}`);
}

/*

TODO

@DocAdd /help/lists/list

GOAL: Store command permissions, usage, and output in the same place

@Command {Command|lists list}
@Permissions manageBot
@Description
Lists all lists and their pastebin links for this server.
@/Description
@Example
Command: lists list
Output: {Translate|lists.list_lists|{"A": ""}|}
@/Example
@Example
Command: lists list
Output: {Translate|lists.list_lists|{"A"}|}
@/Example

*/
nr.globalCommand(
	"/help/lists/list",
	"lists list",
	{
		usage: "",
		description: "",
		examples: [
			{
				in: "list lists",
				out:
					"{Atmention|you}, {Bold|Lists}:\n{Blockquote|motivation: {Link|https://pastebin.com/NFuKYjUN}}",
			},
		],
	},
	nr.list(),
	async ([], info) => {
		if (!info.db) {
			return await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
		}
		const lists = await info.db.getLists();
		return await info.result(messages.lists.list_lists(info, lists));
	},
);
nr.globalAlias("lists list", "list lists");

function parsePastebinURL(url = "") {
	const match = /^.*([A-Za-z0-9]{8})/.exec(url);
	if (!match) {
		return undefined;
	}
	const pastebinCode = match[1];
	return pastebinCode;
}

async function addOrEditList(add: boolean, cmd: string, info: Info) {
	if (!info.db) {
		return await info.error(
			messages.failure.command_cannot_be_used_in_pms(info),
		);
	}

	// <name> <pastebin.com/id
	// Split the command at spaces for easier maniuplation
	const splitCmd = cmd.split(` `);

	// Extract the list name and pastebin URL from the first two items in the command. let [listName, ...pastebinUrl] = splitCmd;?
	const listName = splitCmd.shift();
	const pastebinUrl = splitCmd.join(` `).trim();

	if (!listName) {
		return await info.error(messages.lists.no_list_name_provided(info));
	}

	// Get the lists from the database
	const lists = await info.db.getLists();

	// If the list should be added but it already exists, error. If the list should be edited but doesn't exist, error. Basically there's no point to doing this at all
	if (!!lists[listName] === add) {
		// if !a !== b... !!a === b and a == b are the same and probably easier to read
		if (add) {
			return await info.error(
				messages.lists.list_already_exists(info, listName, pastebinUrl),
			);
		}
		return await info.error(
			messages.lists.list_does_not_exist(info, listName, pastebinUrl),
		);
	}

	// Parse the pastebin url out of whatever mess the user put into the second argument of the command
	const pastebinID = parsePastebinURL(pastebinUrl);

	// If no pastebin URL could be found, inform the user that they need one
	if (!pastebinID) {
		return await info.error(
			messages.lists.invalid_pastebin_url(info, listName),
		);
	}

	// Update the list and save it to the database
	lists[listName] = pastebinID;
	await info.db.setLists(lists);

	// Return the right success message depending on if the list is being added or edited
	if (add) {
		return await info.success(
			messages.lists.add_successful(info, listName, pastebinID),
		);
	}
	return await info.success(
		messages.lists.edit_succesful(info, listName, pastebinID),
	);
}

nr.globalCommand(
	"/help/lists/add",
	"lists add",
	{
		usage:
			"lists add {Required|listname} {Required|https://pastebin.com/url}",
		description: "Add custom command list.",
		extendedDescription:
			"Example list: {Link|https://pastebin.com/NFuKYjUN}",
		examples: [
			{
				in: "lists add motivation {Link|https://pastebin.com/NFuKYjUN}",
				out:
					"{Atmention|you}, {Emoji|success} Added list motivation with pastebin URL {Link|https://pastebin.com/NFuKYjUN}\nTry it out with {Command|motivation}",
			},
		],
	},
	nr.list(...nr.a.words()),
	async ([cmd], info) => {
		if (!Info.theirPerm.manageBot(info)) return;
		return await addOrEditList(true, cmd, info);
	},
);

nr.globalCommand(
	"/help/lists/edit",
	"lists edit",
	{
		usage:
			"lists edit {Required|listname} {Required|https://pastebin.com/url}",
		description: "Edit custom command list.",
		extendedDescription:
			"Example list: {Link|https://pastebin.com/NFuKYjUN}",
		examples: [
			{
				in:
					"lists edit motivation {Link|https://pastebin.com/NFuKYjUN}",
				out:
					"{Atmention|you}, {Emoji|success} Updated list motivation with new pastebin URL {Link|https://pastebin.com/NFuKYjUN}\nTry it out with {Command|motivation}",
			},
		],
	},
	nr.list(...nr.a.words()),
	async ([cmd], info) => {
		if (!Info.theirPerm.manageBot(info)) return;
		return await addOrEditList(false, cmd, info);
	},
);

nr.globalCommand(
	"/help/lists/remove",
	"lists remove",
	{
		usage: "lists remove {Required|list name}",
		description: "Remove a list",
		examples: [
			{
				in: "lists remove motivation",
				out: "{Emoji|success} List removed",
			},
		],
	},
	nr.list(...nr.a.words()),
	async ([listName], info) => {
		// there's not much purpose to a distinction between add and edit...
		if (!info.db) {
			return await info.error(
				messages.failure.command_cannot_be_used_in_pms(info),
			);
		}
		const lists = await info.db.getLists();
		if (!lists[listName]) {
			return await info.error(
				messages.lists.remove_list_that_does_not_exist(info, listName),
			);
		}
		delete lists[listName];
		await info.db.setLists(lists);
		return await info.success(
			messages.lists.remove_list_succesful(info, listName),
		);
	},
);
