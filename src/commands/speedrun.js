const Usage = require("command-parser");
const SpeedrunAPI = require("speedrunapi");
const sr = new SpeedrunAPI();
const o = require("../options");
const {RichEmbed} = require("discord.js");
const MB = require("../MessageBuilder");

const moment = require("moment");
require("moment-duration-format")(moment);

let speedrun = new Usage({
	description: "Commands related to speedrun.com",
	requirements: [o.setting("speedrun")]
});

speedrun.add("rules", new Usage({ // TODO make it so I don't have the exact smae code twice
	description: "Get the category rules",
	usage: ["category..."],
	callback: async(data, ...category) => {
		let replyMessage = await data.msg.reply("<a:loading:393852367751086090>");

		let [gameID, defaultCategory] = data.speedrun.split`, `;
		if(category && category.length > 0 && category[0]) {
			let categoriesGetter = sr.games(gameID);
			categoriesGetter._method = "categories";
			let categories = await categoriesGetter.exec();

			let categoryFilter = categories.items.filter(cat => cat.name.toLowerCase() === category.join` `.toLowerCase());
			if(categoryFilter.length <= 0) return await data.msg.reply(`Please supply a valid category name. Categories: ${categories.items.map(cat => cat.name).join`, `}`);
			category = categoryFilter[0].id;
		}else{
			category = defaultCategory;
		}
		let gameData = await sr.leaderboards(gameID, category).embed(["category", "players", "game"]).exec();
		let actualGameData = gameData.items.game.data;
		let topThree = gameData.items.runs.filter(run => run.place<=3);
		let getPlayer = player => gameData.items.players.data.filter(pl => pl.id === player)[0];

		let mainEmbed = new RichEmbed;
		mainEmbed.title = gameData.items.category.data.name;
		mainEmbed.description = gameData.items.category.data.rules;
		mainEmbed.url = gameData.items.category.data.weblink;

		replyMessage.edit("", {embed: mainEmbed});
	}
}));

speedrun.add("leaderboard", new Usage({ // TODO trophy-1st for the person in first
	description: "Get the top n people",
	usage: ["top how many?", "category..."],
	callback: async(data, ...category) => {
		let replyMessage = await data.msg.reply("<a:loading:393852367751086090>");

		let [gameID, defaultCategory] = data.speedrun.split`, `;
		let places = 5;
		if(category[0] === `${parseInt(category[0], 10)}`) places = parseInt(category.shift(), 10);
		if(category && category.length > 0 && category[0]) {
			let categoriesGetter = sr.games(gameID);
			categoriesGetter._method = "categories";
			let categories = await categoriesGetter.exec();

			let categoryFilter = categories.items.filter(cat => cat.name.toLowerCase() === category.join` `.toLowerCase());
			if(categoryFilter.length <= 0) return await replyMessage.edit(`Please supply a valid category name. Categories: ${categories.items.map(cat => cat.name).join`, `}`);
			category = categoryFilter[0].id;
		}else{
			category = defaultCategory;
		}
		let gameData = await sr.leaderboards(gameID, category).embed(["category", "players", "game"]).exec();
		let actualGameData = gameData.items.game.data;
		let topThree = gameData.items.runs.filter(run => run.place<=places);
		let getPlayer = player => gameData.items.players.data.filter(pl => pl.id === player)[0];

		let mb = MB();
		mb.url.putRaw(gameData.items.category.data.weblink);
		mb.title.put(gameData.items.category.data.name);

		topThree.forEach(run_ => {
			let run = run_.run;

			let runPlayer = getPlayer(run.players[0].id);

			let duration = moment.duration(run.times.primary_t, "seconds");
			mb.addField((t, d) => {
				t.tag`${runPlayer.names.international}`;
				d.tag`[${duration.format("y [years] M [months] w [weeks] d [days,] h[h]:mm[m]:s.SSS[s]")}](`;
				d.putRaw(run.weblink);
				d.tag`)
${run.comment || "No comment"}
`;
			});
		});

		await replyMessage.edit(...mb.build(data.embed));
		// resEmbeds.forEach(embed => data.msg.reply("", {embed: embed}));
	}
}));

module.exports = speedrun;
