// import * as nr from "../../NewRouter";
// import { getTwoPlayers } from "./helpers";
// import * as Discord from "discord.js";
// import { perr } from "../../..";
//
// // https://github.com/pfgithub/advent-of-code-2019/blob/master/solutions/_defaults/_defaults.0.ts
// function ratelimit(timeout: number) {
// 	let ctime = 0;
// 	return {
// 		do: (cb: () => void) => {
// 			const time = new Date().getTime();
// 			if (time > ctime + timeout) {
// 				cb();
// 				ctime = time;
// 			}
// 		},
// 	};
// }
//
// nr.globalCommand(
// 	"/help/fun/spyfall",
// 	"spyfall",
// 	{
// 		usage: "spyfall",
// 		description: "play a game of spyfall",
// 		examples: [],
// 	},
// 	nr.list(),
// 	async ([], info) => {
// 		const playersInGame: string[] = [info.message.author.id];
// 		const genInviteMessage = () =>
// 			info.message.author.toString() +
// 			` is looking to start a game of **Spyfall**. 3-6 players are needed to play.
// === **Players** ===
// ${playersInGame.map(pl => "<@" + pl + ">").join("\n")}`;
// 		const inviteMessage = await info.message.channel.send(genInviteMessage);
//
// 		const ratelimitEdit = ratelimit(3000);
// 		const editMessage = () =>
// 			ratelimitEdit.do(() =>
// 				perr(
// 					inviteMessage
// 						.edit(genInviteMessage)
// 						.catch(e => (cancelGame = true)),
// 					"spyfall join msg",
// 				),
// 			);
//
// 		const rxnh = info.handleReactions();
// 		// on reaction add
// 		// on reaction remove
// 	},
// );
