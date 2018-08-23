const Usage = require("command-parser");
const SpeedrunAPI = require("speedrunapi");
const sr = new SpeedrunAPI();
const o = require("../options");
const {RichEmbed} = require("discord.js");

let speedrun = new Usage({
	description: "Commands related to speedrun.com",
	requirements: [o.setting("speedrun")]
});

speedrun.add("rules", new Usage({ // TODO make it so I don't have the exact smae code twice
	description: "Get the category rules",
	callback: async(data, ...category) => {
		let replyMessage = await data.msg.reply("<a:loading:393852367751086090>");

		let [gameID, defaultCategory] = data.speedrun.split`, `;
		if(category && category.length > 0 && category[0]) {
			let categoriesGetter = sr.games(gameID);
			categoriesGetter._method = "categories";
			let categories = await categoriesGetter.exec();

			let categoryFilter = categories.items.filter(cat => cat.name === category.join` `);
			if(categoryFilter.length <= 0) return await data.msg.reply("Please supply a valid category name");
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
	description: "Get the top 5 people",
	callback: async(data, ...category) => {
		let replyMessage = await data.msg.reply("<a:loading:393852367751086090>");

		let [gameID, defaultCategory] = data.speedrun.split`, `;
		if(category && category.length > 0 && category[0]) {
			let categoriesGetter = sr.games(gameID);
			categoriesGetter._method = "categories";
			let categories = await categoriesGetter.exec();

			let categoryFilter = categories.items.filter(cat => cat.name === category.join` `);
			if(categoryFilter.length <= 0) return await data.msg.reply("Please supply a valid category name");
			category = categoryFilter[0].id;
		}else{
			category = defaultCategory;
		}
		let gameData = await sr.leaderboards(gameID, category).embed(["category", "players", "game"]).exec();
		let actualGameData = gameData.items.game.data;
		let topThree = gameData.items.runs.filter(run => run.place<=3);
		let getPlayer = player => gameData.items.players.data.filter(pl => pl.id === player)[0];

		let resEmbeds = [];
		let mainEmbed = new RichEmbed;
		mainEmbed.title = gameData.items.category.data.name;
		mainEmbed.url = gameData.items.category.data.weblink;
		topThree.forEach(run_ => {
			let run = run_.run;
			let embed = new RichEmbed;
			embed.title = `:${  run.times.primary_t}`;
			embed.description = run.comment;
			embed.url = run.weblink;
			// embed.color = "random";
			let runPlayer = getPlayer(run.players[0].id);
			embed.author = {
				name: runPlayer.names.international,
				url: runPlayer.weblink,
				icon_url: `https://www.speedrun.com/images/flags/${runPlayer.location.country.code}.png` // eslint-disable-line camelcase
			};
			let assetIcon = actualGameData.assets[`trophy-${["1st", "2nd", "3rd", "4th"][run_.place-1]}`];
			if(assetIcon) embed.thumbnail = {
				url: assetIcon.uri
			};
			mainEmbed.addField(run.times.primary_t, `[${runPlayer.names.international}](${runPlayer.weblink}): [Watch](${run.videos.links[0].uri})`);
			resEmbeds.push(embed);
		});

		replyMessage.delete();
		data.msg.reply("", {embed: mainEmbed});
		// resEmbeds.forEach(embed => data.msg.reply("", {embed: embed}));
	}
}));

module.exports = speedrun;
