/*

speedrun really needs to move to a new bot, this implementation is really bad
second worst part of the bot to index.js

TODO FOR FUTURE UPDATE/NEW BOT:

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

import SpeedrunAPI from "speedrunapi";
const sr = new SpeedrunAPI();
import o from "../options";
import { RichEmbed } from "discord.js";
import MB from "../MessageBuilder";
import Router from "commandrouter";
import { r } from "../Info";

import request from "async-request";

import moment from "moment";
require("moment-duration-format")(moment);

const router = new Router();

const adminrouter = new Router();

async function getURL(strings, ...values) {
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

async function getGamesFrom({ abbreviation }) {
	const gameData = await getURL`https://www.speedrun.com/api/v1/games?abbreviation=${abbreviation}&embed=categories`;
	//let gameData = await sr.games().param({abbreviation: abbreviation}).embed(["categories"]).exec(); // works but geturl is almost better
	return gameData;
}
async function getCategoriesFromGameID(id) {
	// we may want to stop using the speedrun api it's really bad and unreliable
	const categoriesGetter = sr.games(id);
	categoriesGetter._method = "categories"; // reliable modules such as speedrunapi work great
	const categories = await categoriesGetter.exec();
	return categories;
}

async function getCategoryFromSpeedrunID(category, id) {}

async function listCategoriesAtID(id) {}

function parseAbbreviation({ from: speedrunpage = "" }) {
	// I've been doing too much swift
	const match = speedrunpage.match(/[A-Za-z0-9_]+$/); // match the last a-za-z0-9+ of the page. if this doesn't work for all pages, submit a bug report
	return match ? match[0] : undefined;
}

//router.add([r.manageBot], adminrouter); // that might error if anyone doesn't have managebot // confirmed it does, might want to change this in commandourndstgjkh
// forex we could have the router still route through the paths but once an actual matching command is found, it could check these. not sure if that would work with
// quotes though
router.add([], adminrouter);

router.add("wr", [], async (cmd, info) => {
	// wr <category> gets the wr for the specified category||default
	await info.startLoading();
	let [...categoryName] = cmd.split` `;
	categoryName = categoryName.join` `;

	const defaultGameCategory = await info.db.getSpeedrunDefault();
	if (!defaultGameCategory) {
		return await info.error(
			`Speedrun commands have not been configured for this server.`
		);
	}
	let { gameID, categoryID } = defaultGameCategory;

	if (categoryName) {
		// wouuldn't it be cool if loading could be updated to say "Getting Category..."
		const categories = await getCategoriesFromGameID(gameID);

		const categoryFilter = categories.items.filter(
			cat => cat.name.toLowerCase() === categoryName.toLowerCase()
		);
		if (categoryFilter.length <= 0) {
			return await info.error(
				new MB.TextBuilder()
					.tag`The category \`${categoryName}\` is not in the game.
		Valid categories: ${categories.items.map(cat => cat.name).join`, `}`.build(
					false
				)
			);
		} // TODO return as a mb fields[categoryname,url,name,url...]
		categoryID = categoryFilter[0].id;
	}

	const place = 1;

	const gameData = await sr
		.leaderboards(gameID, categoryID)
		.embed(["category", "players", "game"])
		.exec();
	const actualGameData = gameData.items.game.data;
	const runs = gameData.items.runs.filter(
		run => run.place.toString() === place.toString()
	); // TODO run.place === place and have place just get the person in nth place
	const getPlayer = player =>
		gameData.items.players.data.filter(pl => pl.id === player)[0];
	const run_ = runs[0];
	if (!run_) {
		return await info.error("No world record found");
	}
	const run = run_.run;

	const mb = MB();
	mb.url.putRaw(gameData.items.category.data.weblink);
	mb.title.put(gameData.items.category.data.name);

	const runPlayer = getPlayer(run.players[0].id);
	mb.setAuthor(
		runPlayer.names.international,
		`https://www.speedrun.com/images/flags/${runPlayer.location.country.code}.png`,
		runPlayer.weblink
	);
	const duration = moment.duration(run.times.primary_t, "seconds");
	mb.description.tag`[${duration.format(
		"y [years] M [months] w [weeks] d [days,] h[h]:mm[m]:s.SSS[s]"
	)}](`;
	mb.description.putRaw(run.weblink);
	mb.description.tag`)
	${run.comment || "No comment"}
	`;

	const assetIcon =
		actualGameData.assets[
			`trophy-${["1st", "2nd", "3rd", "4th"][run_.place - 1]}`
		];
	if (assetIcon) {
		mb.setThumbnail(assetIcon.uri);
	}

	await info.result(mb);
});
function isNormalInteger(str) {
	const n = Math.floor(Number(str));
	return n !== Infinity && String(n) === str && n > 0;
}

router.add("speedrun leaderboard", [], async (cmd, info) => {
	// speedrun leaderboard <<abbreviation> category> n gets the person in nth placed
	let [position, ...categoryName] = cmd.split` `;
	categoryName = categoryName.join` `;

	if (!position || !isNormalInteger(position)) {
		return info.error(
			`A position is required, such as \`speedrun leaderboard 26\``
		);
	}
	position = parseInt(position, 10); // position =+ position

	const defaultGameCategory = await info.db.getSpeedrunDefault();
	if (!defaultGameCategory) {
		return await info.error(
			`Speedrun commands have not been configured for this server.`
		);
	}
	let { gameID, categoryID } = defaultGameCategory;

	await info.startLoading();

	if (categoryName) {
		// wouuldn't it be cool if loading could be updated to say "Getting Category..."
		const categories = await getCategoriesFromGameID(gameID);

		const categoryFilter = categories.items.filter(
			cat => cat.name.toLowerCase() === categoryName.toLowerCase()
		);
		if (categoryFilter.length <= 0) {
			return await info.error(
				new MB.TextBuilder()
					.tag`The category \`${categoryName}\` is not in the game.
		Valid categories: ${categories.items.map(cat => cat.name).join`, `}`.build(
					false
				)
			);
		} // TODO return as a mb fields[categoryname,url,name,url...]
		categoryID = categoryFilter[0].id;
	}

	const place = position;

	const gameData = await sr
		.leaderboards(gameID, categoryID)
		.embed(["category", "players", "game"])
		.exec();
	const actualGameData = gameData.items.game.data;
	const runs = gameData.items.runs.filter(
		run => run.place.toString() === place.toString()
	); // TODO run.place === place and have place just get the person in nth place
	const getPlayer = player =>
		gameData.items.players.data.filter(pl => pl.id === player)[0];
	const run_ = runs[0];
	if (!run_) {
		return await info.error("No world record found");
	}
	const run = run_.run;

	const mb = MB();
	mb.url.putRaw(gameData.items.category.data.weblink);
	mb.title.put(gameData.items.category.data.name);

	const runPlayer = getPlayer(run.players[0].id);
	mb.setAuthor(
		runPlayer.names.international,
		`https://www.speedrun.com/images/flags/${runPlayer.location.country.code}.png`,
		runPlayer.weblink
	);
	const duration = moment.duration(run.times.primary_t, "seconds");
	mb.description.tag`[${duration.format(
		"y [years] M [months] w [weeks] d [days,] h[h]:mm[m]:s.SSS[s]"
	)}](`;
	mb.description.putRaw(run.weblink);
	mb.description.tag`)
	${run.comment || "No comment"}
	`;

	const assetIcon =
		actualGameData.assets[
			`trophy-${["1st", "2nd", "3rd", "4th"][run_.place - 1]}`
		];
	if (assetIcon) {
		mb.setThumbnail(assetIcon.uri);
	}

	await info.result(mb);
});
router.add("speedrun rules", [], async (cmd, info) => {
	await info.startLoading();
	let [...categoryName] = cmd.split` `;
	categoryName = categoryName.join` `;

	const defaultGameCategory = await info.db.getSpeedrunDefault();
	if (!defaultGameCategory) {
		return await info.error(
			`Speedrun commands have not been configured for this server.`
		);
	}
	let { gameID, categoryID } = defaultGameCategory;

	if (categoryName) {
		// wouuldn't it be cool if loading could be updated to say "Getting Category..."
		const categories = await getCategoriesFromGameID(gameID);

		const categoryFilter = categories.items.filter(
			cat => cat.name.toLowerCase() === categoryName.toLowerCase()
		);
		if (categoryFilter.length <= 0) {
			return await info.error(
				new MB.TextBuilder()
					.tag`The category \`${categoryName}\` is not in the game.
		Valid categories: ${categories.items.map(cat => cat.name).join`, `}`.build(
					false
				)
			);
		} // TODO return as a mb fields[categoryname,url,name,url...]
		categoryID = categoryFilter[0].id;
	}

	const place = 1;

	const gameData = await sr
		.leaderboards(gameID, categoryID)
		.embed(["category"])
		.exec();

	const mb = MB();
	mb.url.putRaw(gameData.items.category.data.weblink);
	mb.title.put(gameData.items.category.data.name);
	mb.description.put(gameData.items.category.data.rules);

	return info.result(mb);
}); // <<abbreviation> category>

async function getGameAtPage(abbreviation) {
	// Get the list of games from the abbreviation
	const games = (await getGamesFrom({ abbreviation: abbreviation })).data;
	if (games.length < 1) {
		return new MB.TextBuilder()
			.tag`No games found for the abbreviation \`${abbreviation}\`. Is the URL right?`.build(
			false
		);
	} // a textbuilder is used here because what if parseabbreviation is updated to allow @
	if (games.length > 1) {
		return new MB.TextBuilder()
			.tag`Too many games were found for the abbreviation \`${abbreviation}\`. This should never happen, submit a bug report on the support server (\`about\`) or gitlab page`.build(
			false
		);
	}

	return games[0];
}
adminrouter.add("speedrun set", [r.manageBot], async (cmd, info) => {
	// extract the abbreviation from the command
	let [speedrunpage, ...categoryName] = cmd.split` `;
	categoryName = categoryName.join` `;

	// parse the abbreviation from whatver the user provided and error if it fails, start loading, then get the games
	const abbreviation = parseAbbreviation({ from: speedrunpage });
	if (!abbreviation || !categoryName) {
		return await info.error(
			`Usage: \`speedrun set https://speedrun.com/mygame My Category\``
		);
	}
	await info.startLoading();
	const game = await getGameAtPage(abbreviation);
	if (typeof game === "string") {
		return await info.error(game);
	}

	// get the provided category
	const gameID = game.id;
	const categories = game.categories.data;
	const category = categories.find(
		category => category.name.toLowerCase() === categoryName.toLowerCase()
	);
	if (!category) {
		return await info.error(
			new MB.TextBuilder()
				.tag`The category \`${categoryName}\` is not in the game.
	Valid categories: ${categories.map(cat => cat.name).join`, `}`.build(false)
		);
	}

	// set the default speedrun
	await info.db.setSpeedrunDefault(gameID, category.id);

	// success
	return await info.success(
		new MB.TextBuilder()
			.tag`Default speedrun page updated to ${abbreviation}: ${categoryName} (ids: ${gameID}, ${category.id})`.build(
			false
		)
	);
}); // set <abbreviaton> <category> // sets the default category

const speedrun = new Usage({
	description: "Commands related to speedrun.com",
	requirements: [o.setting("speedrun")]
});

export default router;
