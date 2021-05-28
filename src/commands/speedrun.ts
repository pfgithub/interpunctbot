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

import MB, { TextBuilder } from "../MessageBuilder";
import Info from "../Info";
import { messages } from "../../messages";
import * as nr from "../NewRouter";
import fetch from "node-fetch";

import moment from "moment";

const ctime = () => Date.now();

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
): Promise<any> {
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
	return await fetch(res).then(v => v.json());
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

type Game = {
	id: string,
	names: {
		international: string,
		twitch?: string,
		japanese?: string,
	},
	abbreviation: string,
	weblink: string,
	released: number,
	"release-date": string,
	ruleset: {
		"show-miliseconds": boolean,
		"require-verification": boolean,
		"require-video": boolean,
		"run-times": ("realtime" | "ingame")[],
		"default-time": "realtime" | "ingame",
		"emulators-allowed": boolean,
	},
	romhack: boolean,
	gametypes: unknown[],
	platforms: string[],
	regions: unknown[],
	genres: string[],
	engines: string[],
	developers: string[],
	publishers: string[],
	moderators: { [id: string]: "moderator" | "super-moderator" },
	created: string,
	assets: {
		[key: string]: { uri: string, width: number, height: number },
	},
	links: { rel: string, uri: string }[],
};

async function getGamesFrom({ abbreviation }: { abbreviation: string }) {
	const startTime = ctime();
	const gameData = await getURL`https://www.speedrun.com/api/v1/games?abbreviation=${abbreviation}&embed=categories`;
	console.log(
		`Getting games for abbreviation took ${ctime() - startTime}ms.`,
	);
	return gameData as {
		data: (Game & { categories: { data: Category[] } })[],
	};
}

type Link = { rel: string, url: string };

type Category = {
	id: string,
	name: string,
	weblink: string,
	type: "per-game" | "per-level",
	rules: string,
	players: { type: "exactly", value: 1 },
	miscellaneous: boolean,
	links: Link[],
};
async function getCategoriesFromGameID(id: string) {
	const startTime = ctime();
	const res: {
		data: Category[],
	} = await getURL`https://www.speedrun.com/api/v1/games/${id}/categories`;
	console.log(`Getting categories for game took ${ctime() - startTime}ms.`);
	res.data = res.data.filter(cat => cat.type === "per-game");
	return res;
}

function parseAbbreviation({ from: speedrunpage = "" }) {
	const match = /[A-Za-z0-9_]+$/.exec(speedrunpage); // match the last a-za-z0-9+ of the page. if this doesn't work for all pages, submit a bug report
	return match ? match[0] : undefined;
}

async function getGameAndCategory(
	categoryName: string,
	info: Info,
): Promise<
	| { gameID: string, categoryID: string, error: false, category: Category }
	| { error: true }
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
	const gameID = defaultGameCategory.gameID;
	let categoryID = defaultGameCategory.categoryID;

	let category: Category;

	if (categoryName) {
		const categories = await getCategoriesFromGameID(gameID);

		const categoryFilter = categories.data.filter(cat =>
			compareCatName(cat.name, categoryName),
		);
		if (categoryFilter.length <= 0) {
			await info.error(
				messages.speedrun.invalid_category_name(
					info,
					categoryName,
					categories.data.map(cat => cat.name),
				),
			);
			return { error: true };
		} // TODO return as a mb fields[categoryname,url,name,url...]
		categoryID = categoryFilter[0].id;
		category = categoryFilter[0];
	} else {
		category = (
			await getURL`https://www.speedrun.com/api/v1/categories/${categoryID}`
		).data;
	}

	return { gameID, categoryID, category, error: false };
}

type Run = {
	place: number,
	run: {
		id: string,
		weblink: string,
		game: string,
		level?: unknown,
		category: string,
		videos: { links: { uri: string }[] },
		comment: string,
		status: {
			status: "verified" | unknown,
			examiner: string,
			"verify-date": string,
		},
		players: { rel: string, id: string, uri: string }[],
		date: string,
		times: {
			primary: string,
			primary_t: number,
			realtime?: string,
			realtime_t?: number,
			realtime_noloads?: string,
			realtime_noloads_number?: number,
			ingame?: string,
			ingame_t?: number,
		},
		system: { platform: string, emulated: boolean, region?: unknown },
		splits?: unknown,
		values: unknown,
	},
};

type GameData = {
	weblink: string,
	level?: unknown,
	platform?: unknown,
	region?: unknown,
	emulators?: unknown,
	"video-only": boolean,
	timing: string,
	values: unknown,
	runs: Run[],
	links: { rel: string, uri: string }[],
};

type Player = {
	rel: string,
	id: string,
	names: {
		international: string,
		japanese?: unknown,
	},
	weblink: string,
	"name-style": unknown,
	role: "user",
	signup: string,
	location?: {
		country: {
			code: string,
			names: { international: string, japanese?: unknown },
		},
	},
	twitch?: unknown,
	hitbox?: unknown,
	youtube?: { uri: string },
	twitter?: unknown,
	speedrunslive?: unknown,
	links: { rel: string, uri: string }[],
};

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

	const gameData: {
		data: GameData & {
			category: { data: Category },
			game: { data: Game },
			players: { data: Player[] },
		},
	} = await getURL`https://www.speedrun.com/api/v1/leaderboards/${gameID}/category/${categoryID}?embed=category,players,game`;

	const actualGameData = gameData.data.game.data;
	const getPlayer = (player: string) =>
		gameData.data.players.data.filter(pl => pl.id === player)[0];
	const runs =
		typeof position === "string"
			? gameData.data.runs.filter(
			    run =>
			        run.run.players &&
						run.run.players[0] &&
						getPlayer(
						    run.run.players[0].id,
						)?.names?.international?.toLowerCase() ===
							position.toLowerCase(),
			  )
			: gameData.data.runs.filter((run: any) => run.place === place); // TODO run.place === place and have place just get the person in nth place // why isn't this .find()
	const run_ = runs[0];
	if (!run_) {
		if (typeof position === "string")
			return await info.error(
				info.tag`No runs found for player ${position}.`,
			);
		return await info.error(
			messages.speedrun.no_run_for_position(info, position),
		);
	}
	const run = run_.run;

	const mb = MB();
	mb.url.putRaw(run.weblink);
	const duration = moment.duration(run.times.primary_t, "seconds");
	mb.title.put(
		duration.format(
			"y [years] M [months] w [weeks] d [days,] h[h]:mm[m]:ss.SSS[s]",
		),
	);

	const runPlayer = getPlayer(run.players[0].id);
	mb.setAuthor(
		runPlayer.names.international,
		runPlayer.location
			? `https://www.speedrun.com/images/flags/${runPlayer.location.country.code}.png`
			: undefined,
		runPlayer.weblink,
	);
	mb.description.tag`[${gameData.data.category.data.name}](`;
	mb.description.putRaw(gameData.data.category.data.weblink);
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
		perms: {},
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		info.startLoading();
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
		usage: "leaderboard {Optional|Position#} {Optional|Category%}",
		description:
			"Show the speedrun leaderboard, optionally in a specific category / including a person in #th place",
		examples: [],
		perms: {},
	},
	nr.list(nr.a.number(), ...nr.a.words()),
	async ([position, cmd], info) => {
		info.startLoading();
		if (!position || !isNormalInteger("" + position)) {
			// todo display top 5
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
		perms: {},
	},
	nr.list(nr.a.word(), ...nr.a.words()),
	async ([username, cmd], info) => {
		info.startLoading();
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
		perms: {},
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		const startTime = ctime();
		info.startLoading();
		const categoryNameArray = cmd.split(` `);
		const categoryName = categoryNameArray.join(` `);

		const gac = await getGameAndCategory(categoryName, info);
		if (gac.error) return;
		const { category } = gac;

		const mb = MB();
		mb.url.putRaw(category.weblink);
		mb.title.put(category.name);
		mb.description.put(category.rules);
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
		perms: { runner: ["manage_bot"] },
	},
	nr.list(),
	async ([], info) => {
		if (!info.db) {
			return await info.error(
				"Cannot use speedrun commands in private pm messages",
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
		perms: { runner: ["manage_bot"] },
	},
	nr.list(nr.a.word(), ...nr.a.words()),
	async ([speedrunpage, categoryName], info) => {
		const startTime = ctime();
		// extract the abbreviation from the command

		if (!info.db) {
			return await info.error(
				"Cannot use speedrun commands in private pm messages",
			);
		}

		// parse the abbreviation from whatver the user provided and error if it fails, start loading, then get the games
		const abbreviation = parseAbbreviation({ from: speedrunpage });
		if (!abbreviation || !categoryName) {
			return await info.error(
				`Usage: \`speedrun set https://speedrun.com/mygame My Category\``,
			);
		}
		info.startLoading();
		const game = await getGameAtPage(abbreviation);
		if (typeof game === "string") {
			return await info.error(game);
		}

		// get the provided category
		const gameID = game.id;
		const categories = game.categories.data;
		const category = categories.find(cat =>
			compareCatName(cat.name, categoryName),
		);
		if (!category) {
			return await info.error(
				new TextBuilder()
					.tag`The category \`${categoryName}\` is not in the game.
	Valid categories: ${categories.map(cat => cat.name).join(`, `)}`.build(),
			);
		}

		// set the default speedrun
		await info.db.setSpeedrunDefault(gameID, category.id);

		// success
		return await info.success(
			info.tag`Default speedrun page updated to ${abbreviation}: ${categoryName} (ids: ${gameID}, ${
				category.id
			}). Took ${`${ctime() - startTime}`} ms.`
		);
	},
); // set <abbreviaton> <category> // sets the default category
