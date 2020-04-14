/*

this implementation is really bad
second worst part of the bot to index.js

TODO FOR FUTURE UPDATE:

speedrun add speedrun.com/game
speedrun remove speedrun.com/game
speedrun reload

wr <category>
leaderboard <#place> <category>
rules <category>

FOR NOW THIS BOT WILL HANDLE:
speedrun set <game> <category>
wr <category>
speedrun leaderboard <#place> <category>
speedrun ruels <category>

*/

//@ts-ignore
import SpeedrunAPI from "speedrunapi";
const sr = new SpeedrunAPI();
import MB, { TextBuilder } from "../MessageBuilder";
import Info from "../Info";
import { messages } from "../../messages";
import * as nr from "../NewRouter";
//@ts-ignore
import request from "async-request"; // this is a terrible library why am I using it // TODO switch to node-fetch

import moment from "moment";

const ctime = () => new Date().getTime();

nr.addDocsWebPage(
	"/help/speedrun",
	"Speedrun",
	"speedrun.com integrations",
	`{Title|Speedrun}

{Interpunct} has support for showing rules and times from {Link|https://speedrun.com}.

{CmdSummary|speedrun set}
{CmdSummary|speedrun disable}
{CmdSummary|wr}
{CmdSummary|pb}
{CmdSummary|leaderboard}
{CmdSummary|speedrun rules}`,
);

export async function getURL(
	strings: TemplateStringsArray | string | string[],
	...values: string[]
) {
	if (typeof strings === "string") {
		strings = [strings];
	}
	let res = "";
	strings.forEach((str, i) => {
		res += str;
		if (values[i]) {
			res += encodeURIComponent(values[i]);
		}
	});
	return JSON.parse((await request(res)).body);
}

function compareCatName(cat1: string, cat2: string) {
	if (!cat1.endsWith("%")) {
		cat1 += "%";
	}
	if (!cat2.endsWith("%")) {
		cat2 += "%";
	}
	return cat1.toLowerCase() === cat2.toLowerCase();
}

async function getGamesFrom({ abbreviation }: { abbreviation: string }) {
	const startTime = ctime();
	const gameData = await getURL`https://www.speedrun.com/api/v1/games?abbreviation=${abbreviation}&embed=categories`;
	//let gameData = await sr.games().param({abbreviation: abbreviation}).embed(["categories"]).exec(); // works but geturl is almost better
	console.log(
		`Getting games for abbreviation took ${ctime() - startTime}ms.`,
	);
	return gameData;
}
async function getCategoriesFromGameID(id: string) {
	const startTime = ctime();
	// we may want to stop using the speedrun api it's really bad and unreliable
	const categoriesGetter = sr.games(id);
	categoriesGetter._method = "categories"; // reliable modules such as speedrunapi work great
	const categories = await categoriesGetter.exec();
	console.log(`Getting categories for game took ${ctime() - startTime}ms.`);
	return categories;
}

function parseAbbreviation({ from: speedrunpage = "" }) {
	// I've been doing too much swift
	const match = /[A-Za-z0-9_]+$/.exec(speedrunpage); // match the last a-za-z0-9+ of the page. if this doesn't work for all pages, submit a bug report
	return match ? match[0] : undefined;
}

//router.add([r.manageBot], adminrouter); // that might error if anyone doesn't have managebot // confirmed it does, might want to change this in commandourndstgjkh
// forex we could have the router still route through the paths but once an actual matching command is found, it could check these. not sure if that would work with
// quotes though

async function getGameAndCategory(
	categoryName: string,
	info: Info,
): Promise<
	{ gameID: string; categoryID: string; error: false } | { error: true }
> {
	if (!info.db) {
		await info.error(messages.failure.command_cannot_be_used_in_pms(info));
		return { error: true };
	}
	const defaultGameCategory = await info.db.getSpeedrunDefault();
	if (!defaultGameCategory) {
		await info.error(messages.speedrun.requires_setup(info));
		return { error: true };
	}
	let { gameID, categoryID } = defaultGameCategory;
	gameID = gameID;

	if (categoryName) {
		const categories = await getCategoriesFromGameID(gameID);

		const categoryFilter = categories.items.filter((cat: any) =>
			compareCatName(cat.name, categoryName),
		);
		if (categoryFilter.length <= 0) {
			await info.error(
				messages.speedrun.invalid_category_name(
					info,
					categoryName,
					categories.items.map((cat: any) => cat.name),
				),
			);
			return { error: true };
		} // TODO return as a mb fields[categoryname,url,name,url...]
		categoryID = categoryFilter[0].id;
	}

	return { gameID, categoryID, error: false };
}

async function displayLeaderboard(
	position: number | string,
	categoryName: string,
	info: Info,
) {
	const startTime = new Date().getTime();

	const gac = await getGameAndCategory(categoryName, info); // const gac = await getGameAndCategory catch |e| switch(e => .Exit => return; else => return e;)
	if (gac.error) return;
	const { gameID, categoryID } = gac;

	const place = position;

	const gameData = await sr
		.leaderboards(gameID, categoryID)
		.embed(["category", "players", "game"])
		.exec();
	const actualGameData = gameData.items.game.data;
	const getPlayer = (player: any) =>
		gameData.items.players.data.filter((pl: any) => pl.id === player)[0];
	const runs = typeof position === "string" ? gameData.items.runs.filter(
		(run: any) => run.run.players && run.run.players[0] && getPlayer(run.run.players[0].id)?.names?.international?.toLowerCase() === position.toLowerCase(),
	):  gameData.items.runs.filter(
		(run: any) => run.place === place,
	); // TODO run.place === place and have place just get the person in nth place // why isn't this .find()
	const run_ = runs[0];
	if (!run_) {
		if(typeof position === "string") return await info.error(info.tag`No runs found for player ${position}.`);
		return await info.error(
			messages.speedrun.no_run_for_position(info, position),
		);
	}
	const run = run_.run;

	const mb = MB();
	mb.url.putRaw(gameData.items.category.data.weblink);
	mb.title.put(gameData.items.category.data.name);

	const runPlayer = getPlayer(run.players[0].id);
	mb.setAuthor(
		runPlayer.names.international,
		`https://www.speedrun.com/images/flags/${(runPlayer.location &&
			runPlayer.location.country &&
			runPlayer.location.country.code) as string}.png`,
		runPlayer.weblink,
	);
	const duration = moment.duration(run.times.primary_t, "seconds");
	mb.description.tag`[${duration.format(
		"y [years] M [months] w [weeks] d [days,] h[h]:mm[m]:s.SSS[s]",
	)}](`;
	mb.description.putRaw(run.weblink);
	mb.description.tag`)
	${run.comment || "No comment"}
	`;
	mb.footer.tag`Took ${`${ctime() - startTime}`} ms`;
	console.log(`Finished loading leaderboard in ${ctime() - startTime} ms`);

	const assetIcon =
		actualGameData.assets[
			`trophy-${["1st", "2nd", "3rd", "4th"][run_.place - 1]}`
		];
	if (assetIcon) {
		mb.setThumbnail(assetIcon.uri);
	}

	if (info.myChannelPerms!.has("EMBED_LINKS")) {
		await info.result(...mb.build(true));
	} else {
		await info.result(...mb.build(false));
	}
}

nr.globalCommand(
	"/help/speedrun/wr",
	"wr",
	{
		usage: "wr {Optional|Category%}",
		description: "Get the current speedrun world record holder",
		examples: [],
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		await info.startLoading();
		await displayLeaderboard(1, cmd, info);
	},
);
function isNormalInteger(str: string) {
	const n = Math.floor(Number(str));
	return n !== Infinity && String(n) === str && n > 0;
}

nr.globalCommand(
	"/help/speedrun/leaderboard",
	"leaderboard",
	{
		usage: "leaderboard {Required|Position#} {Optional|Category%}",
		description: "Get the current speedrun world record holder",
		examples: [],
	},
	nr.list(nr.a.number(), ...nr.a.words()),
	async ([position, cmd], info) => {
		await info.startLoading();
		if (!position || !isNormalInteger("" + position)) {
			return await info.error(messages.speedrun.position_required(info));
		}
		await displayLeaderboard(position, cmd, info);
	},
);

nr.globalCommand(
	"/help/speedrun/pb",
	"pb",
	{
		usage: "pb {Required|username} {Optional|Category%}",
		description: "Get the pb for a specific speedrun person",
		examples: [],
	},
	nr.list(nr.a.word(), ...nr.a.words()),
	async ([username, cmd], info) => {
		await info.startLoading();
		await displayLeaderboard(username, cmd, info);
	},
);

nr.globalCommand(
	"/help/speedrun/rules",
	"speedrun rules",
	{
		usage: "speedrun rules {Optional|Category%}",
		description: "Get the speedrun rules",
		examples: [],
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		const startTime = ctime();
		await info.startLoading();
		const categoryNameArray = cmd.split(` `);
		const categoryName = categoryNameArray.join(` `);

		const gac = await getGameAndCategory(categoryName, info);
		if (gac.error) return;
		const { gameID, categoryID } = gac;

		const gameData = await sr
			.leaderboards(gameID, categoryID)
			.embed(["category"])
			.exec();

		const mb = MB();
		mb.url.putRaw(gameData.items.category.data.weblink);
		mb.title.put(gameData.items.category.data.name);
		mb.description.put(gameData.items.category.data.rules);
		mb.footer.tag`Took ${`${ctime() - startTime}`} ms`;

		if (info.myChannelPerms!.has("EMBED_LINKS")) {
			await info.result(...mb.build(true));
		} else {
			await info.result(...mb.build(false));
		}
	},
); // <<abbreviation> category>

async function getGameAtPage(abbreviation: string) {
	// Get the list of games from the abbreviation
	const games = (await getGamesFrom({ abbreviation: abbreviation })).data;
	if (games.length < 1) {
		return new TextBuilder()
			.tag`No games found for the abbreviation \`${abbreviation}\`. Is the URL right?`.build();
	} // a textbuilder is used here because what if parseabbreviation is updated to allow @
	if (games.length > 1) {
		return new TextBuilder()
			.tag`Too many games were found for the abbreviation \`${abbreviation}\`. This should never happen, submit a bug report on the support server (\`about\`).`.build();
	}

	return games[0];
}

nr.globalCommand(
	"/help/speedrun/disable",
	"speedrun disable",
	{
		usage: "speedrun disable",
		description: "disable speedrun commands",
		examples: [],
	},
	nr.list(),
	async ([], info) => {
		if (!(await Info.theirPerm.manageBot(info))) return;

		if (!info.db) {
			return await info.error(
				"Cannot use speedrun commands in private pm messages",
				undefined,
			);
		}

		await info.db.disableSpeedrun();
	},
);

nr.globalCommand(
	"/help/speedrun/set",
	"speedrun set",
	{
		usage:
			"speedrun set {Required|https://speedrun.com/game%} {Required|Category%}",
		description: "Set the speedrun game",
		examples: [],
	},
	nr.list(nr.a.word(), ...nr.a.words()),
	async ([speedrunpage, categoryName], info) => {
		if (!(await Info.theirPerm.manageBot(info))) return;

		const startTime = ctime();
		// extract the abbreviation from the command

		if (!info.db) {
			return await info.error(
				"Cannot use speedrun commands in private pm messages",
				undefined,
			);
		}

		// parse the abbreviation from whatver the user provided and error if it fails, start loading, then get the games
		const abbreviation = parseAbbreviation({ from: speedrunpage });
		if (!abbreviation || !categoryName) {
			return await info.error(
				`Usage: \`speedrun set https://speedrun.com/mygame My Category\``,
				undefined,
			);
		}
		await info.startLoading();
		const game = await getGameAtPage(abbreviation);
		if (typeof game === "string") {
			return await info.error(game, undefined);
		}

		// get the provided category
		const gameID = game.id;
		const categories = game.categories.data;
		const category = categories.find((category: any) =>
			compareCatName(category.name, categoryName),
		);
		if (!category) {
			return await info.error(
				new TextBuilder()
					.tag`The category \`${categoryName}\` is not in the game.
	Valid categories: ${categories.map((cat: any) => cat.name).join`, `}`.build(),
				undefined,
			);
		}

		// set the default speedrun
		await info.db.setSpeedrunDefault(gameID, category.id);

		// success
		return await info.success(
			new TextBuilder()
				.tag`Default speedrun page updated to ${abbreviation}: ${categoryName} (ids: ${gameID}, ${
				category.id
			}). Took ${`${ctime() - startTime}`} ms.`.build(),
			undefined,
		);
	},
); // set <abbreviaton> <category> // sets the default category
