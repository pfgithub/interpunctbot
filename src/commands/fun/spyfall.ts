import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import * as nr from "../../NewRouter";
import { getTwoPlayers } from "./helpers";
import * as Discord from "discord.js";
import { perr } from "../../..";

// https://github.com/pfgithub/advent-of-code-2019/blob/master/solutions/_defaults/_defaults.0.ts
function ratelimit(timeout: number) {
	let ctime = 0;
	return {
		do: (cb: () => void) => {
			const time = new Date().getTime();
			if (time > ctime + timeout) {
				cb();
				ctime = time;
			}
		},
	};
}

type GameData = {
	locations: {
		title: string;
		roles: string[];
	}[];
};

const gamedata: GameData = yaml.safeLoad(
	fs.readFileSync(
		path.join(process.cwd(), "src/commands/fun/spyfall.yaml"),
		"utf-8",
	),
);

nr.globalCommand(
	"/help/fun/spyfall",
	"spyfall",
	{
		usage: "spyfall",
		description: "play a game of spyfall",
		examples: [],
	},
	nr.list(...nr.a.words()),
	async ([cmd], info) => {
		let spysonly = false; // secret, shhh
		if (cmd === "\u200B") {
			spysonly = true;
		} else if (cmd.trim()) {
			return await info.docs("/help/fun/spyfall", "usage");
		}

		const playersInGame: Set<string> = new Set([info.message.author.id]);
		const genInviteMessage = () =>
			info.message.author.toString() +
			` is looking to start a game of **Spyfall**. 3-6 players are needed to play.
=== **Players** (${playersInGame.size}) ===
${[...playersInGame].map(pl => "<@" + pl + ">").join("\n")}
==============
React ➕ to join. ${info.message.author.toString()}, React ✅ to start game.`;
		const inviteMessage = await info.message.channel.send(
			genInviteMessage(),
		);
		await inviteMessage.react("➕");
		await inviteMessage.react("✅");

		let cancelGame = false;

		const ratelimitEdit = ratelimit(3000);
		const editMessage = () =>
			!cancelGame &&
			ratelimitEdit.do(() =>
				perr(
					inviteMessage
						.edit(genInviteMessage())
						.catch(e => (cancelGame = true)),
					"spyfall join msg",
				),
			);

		let startGameReq = false;
		const rxnh = info.handleReactions(
			inviteMessage,
			async (rxn, usr) => {
				if (rxn.emoji.name === "➕") {
					playersInGame.add(usr.id);
					return;
				} else if (
					rxn.emoji.name === "✅" &&
					usr.id === info.message.author.id
				) {
					startGameReq = true;
					rxnh.end();
					return;
				}
				editMessage();
			},
			async (rxn, usr) => {
				playersInGame.delete(usr.id);
			},
		);

		const updateInterval = setInterval(() => editMessage(), 10 * 1000);
		const finalTimeout = setTimeout(() => {
			rxnh.end();
		}, 5 * 60 * 1000); // 5 minutes for players to join

		await rxnh.done;

		clearInterval(updateInterval);
		clearTimeout(finalTimeout);
		perr(inviteMessage.delete(), false);

		if (!startGameReq) {
			return await info.error("Did not start game.");
		}
		if (playersInGame.size < 3) {
			return await info.error(
				"Not enough players to start game. Must have 3-6 players.",
			);
		}
		if (playersInGame.size > 8) {
			return await info.error(
				"Too many players to start game. Must have 3-8 players.",
			);
		}

		// pick a random location
		// PM to every player

		const location =
			gamedata.locations[
				Math.floor(Math.random() * gamedata.locations.length)
			];

		const availableRoles = [...location.roles];
		const spy = Math.floor(Math.random() * playersInGame.size);

		let i = 0;
		for (const player of playersInGame) {
			let data: { location: string; role: string };
			if (i === spy || spysonly) {
				// player is spy
				data = { location: "Spy", role: "Spy" };
			} else {
				const roleIndex = Math.floor(
					Math.random() * availableRoles.length,
				);
				const role = availableRoles[roleIndex];
				availableRoles.splice(roleIndex, 1);
				data = {
					location: location.title,
					role: role,
				};
			}

			const playerDiscord = info.message.client.users.resolve(player);
			if (!playerDiscord) {
				await info.error("A player was not found.");
			} else {
				// if shard 0
				await playerDiscord.send(
					`=== Spyfall ===\nLocation: **${data.location}** \nRole: *${data.role}*`,
				);
			}

			i++;
		}

		await info.success(
			"Started game with " +
				[...playersInGame].map(pl => "<@" + pl + ">").join("\n"),
		);
	},
);
// note that pming people must be on the 0th shard
