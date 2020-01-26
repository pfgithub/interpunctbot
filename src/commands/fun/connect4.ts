// future concepts:
// have the top bar highlight the number played last
// so have it show yellow played here or something
// (needs 7*3 emojis suddenly)
// dropping animation (6 animated emojis for a thing falling through that spacel)
//                    (6 more for it landing in that space)
// show your color next to your name when it is your turn
// score tracking. show (8-0) or the actual number of how many times one person
//                 won against the other

import Router from "commandrouter";
import { messages, safe } from "../../../messages";
import Info from "../../Info";
import { AP } from "../argumentparser";
import { createTimer, getPlayers } from "./checkers";

const router = new Router<Info, Promise<any>>();

const themes = [
	{
		".": "<:w:648193417058320394>",
		R: "<:r:648194063102902294>",
		y: "<:y:648193417339207701>",
	},
	{
		".": "<:w:648197112667832376>",
		R: "<:r:648197112013783041>",
		y: "<:y:648197111900405790>",
	},
	{
		".": "<:w:648296516406083595>",
		R: "<:r:648226318017626132>",
		y: "<:y:648226318118420500>",
	},
];

const playerIndexToColor: ("R" | "y")[] = ["R", "y"];

const laneEmojis = [
	"648291430028279808",
	"648291429864701952",
	"648291429893931008",
	"648291429839273994",
	"648291429856051201",
	"648291429554192419",
	"648291429977948160",
];

const topBar =
	"<:number1:648301185115357205><:number2:648299358722195467><:number3:648301185127677972><:number4:648301184930545669><:number5:648301184955711488><:number6:648301496282120249><:number7:648301184679149570>";

export class Connect4Game {
	lanes: { [key in typeof laneEmojis[number]]: ("." | "R" | "y")[] };
	turnIndex: number;
	onchange: () => void;
	onend: () => void;
	playerCount: number;
	status:
		| { status: "active" }
		| { status: "ended"; reason: string }
		| { status: "winner"; winner: number };
	constructor(playerCount: number) {
		this.lanes = {};
		laneEmojis.forEach(
			le => (this.lanes[le] = [".", ".", ".", ".", ".", "."]),
		);
		this.turnIndex = 0;
		this.onchange = () => {};
		this.onend = () => {};
		this.playerCount = playerCount;
		this.status = { status: "active" };
	}

	end(reason: string) {
		if (this.status.status !== "active") {
			return false;
		}

		this.status = { status: "ended", reason };
		this.onchange();
		this.onend();
	}
	win(index: number) {
		if (this.status.status !== "active") {
			return false;
		}

		this.status = { status: "winner", winner: index };
		this.onchange();
		this.onend();
	}

	getText() {
		const gameBoard: ("." | "R" | "y")[][] = [[], [], [], [], [], []];
		laneEmojis.forEach((le, x) => {
			const lane = this.lanes[le];
			lane.forEach((i, y) => {
				gameBoard[y][x] = i;
			});
		});
		return gameBoard;
	}

	travel(
		[fromX, fromY]: [number, number],
		direction: (x: number, y: number) => [number, number],
		condition: (tile: "." | "R" | "y") => boolean,
	) {
		const tiles = this.getText();
		let x = fromX;
		let y = fromY;
		let iterCnt = 0;
		while (true) {
			[x, y] = direction(x, y);
			const tileRow = tiles[y];
			if (!tileRow) break;
			if (!condition(tileRow[x])) break;
			iterCnt++;
		}
		return iterCnt;
	}
	checkConnect4(
		[placedX, placedY]: [number, number],
		upfn: (x: number, y: number) => [number, number],
		downfn: (x: number, y: number) => [number, number],
		color: "." | "R" | "y",
	) {
		const iterUp = this.travel(
			[placedX, placedY],
			upfn,
			tile => tile === color,
		);
		const iterDown = this.travel(
			[placedX, placedY],
			downfn,
			tile => tile === color,
		);
		if (iterUp + 1 + iterDown >= 4) {
			// connected 4
			return true;
		}
		return false;
	}

	dropTile(lane: string): boolean {
		if (this.status.status !== "active") {
			return false;
		}

		const lanev = this.lanes[lane];
		let whereToDrop = lanev.findIndex(v => v !== ".") - 1;
		if (whereToDrop === -2) {
			whereToDrop = lanev.length - 1;
		}
		if (whereToDrop === -1) {
			return false;
		}
		const color = playerIndexToColor[this.turnIndex];
		lanev[whereToDrop] = color;
		const placedX = laneEmojis.indexOf(lane);
		const placedY = whereToDrop;

		// check if anyone won

		// check all directions
		if (
			this.checkConnect4(
				[placedX, placedY],
				(x, y) => [x, y - 1],
				(x, y) => [x, y + 1],
				color,
			) ||
			this.checkConnect4(
				[placedX, placedY],
				(x, y) => [x - 1, y],
				(x, y) => [x + 1, y],
				color,
			) ||
			this.checkConnect4(
				[placedX, placedY],
				(x, y) => [x - 1, y - 1],
				(x, y) => [x + 1, y + 1],
				color,
			) ||
			this.checkConnect4(
				[placedX, placedY],
				(x, y) => [x - 1, y + 1],
				(x, y) => [x + 1, y - 1],
				color,
			)
		) {
			this.win(this.turnIndex);
			return true;
		}

		return true;
	}

	nextTurn() {
		if (this.status.status !== "active") {
			return false;
		}

		this.turnIndex++;
		this.turnIndex %= this.playerCount;
		this.onchange();
	}
}

router.add("connect4", [], async (cmd: string, info) => {
	const apresult = await AP({ info, cmd });
	if (!apresult) return;

	if (info.db ? await info.db.getFunEnabled() : true) {
	} else {
		return await info.error(messages.fun.fun_disabled(info));
	}

	if (info.myChannelPerms) {
		if (!info.myChannelPerms.has("USE_EXTERNAL_EMOJIS")) {
			return await info.error(
				"I need permission to `use external emojis` here to play connnect 4\n> https://interpunct.info/help/fun/connect4",
			);
		}
		if (!info.myChannelPerms.has("ADD_REACTIONS")) {
			return await info.error(
				"I need permission to `add reactions` here to play connnect 4\n> https://interpunct.info/help/fun/connect4",
			);
		}
		if (!info.myChannelPerms.has("MANAGE_MESSAGES")) {
			return await info.error(
				"I need permission to `manage messages` here to remove people's reactions in connnect 4\n> https://interpunct.info/help/fun/connect4",
			);
		}
	}

	const themeIndex = Math.floor(
		Math.max(Math.min(+cmd || 3, themes.length), 1) - 1,
	);
	const theme = themes[themeIndex];

	// ------------------------------------------------ wait for players to join

	const playersInGame = await getPlayers(
		[info.message.author.id],
		2,
		"Connect 4",
		info,
	);
	if (!playersInGame) {
		return;
	}

	// --------------------------------------------- start game

	{
		const game = new Connect4Game(playersInGame.length);

		const getGameBoardText = () =>
			`${playersInGame
				.map(
					(pl, i) =>
						theme[playerIndexToColor[i]] +
						safe` @${
							info.message.guild
								? info.message.guild.members.get(pl)!
										.displayName
								: info.message.client.users.get(pl)!.username
						}`,
				)
				.join(", ")} \n---\n> ${topBar}\n${game
				.getText()
				.map(l => `> ${l.map(q => theme[q]).join("")}`)
				.join("\n")}\n---\n${
				game.status.status === "active"
					? `<@${playersInGame[game.turnIndex]}>'s turn`
					: game.status.status === "ended"
					? `Game over. ${game.status.reason}`
					: `<@${playersInGame[game.status.winner]}> won!`
			}`;
		const gameBoardMessage = await info.channel.send("Setting up game...");
		const updateGameBoard = async () =>
			await gameBoardMessage.edit(getGameBoardText());

		for (const emoji of laneEmojis) {
			await gameBoardMessage.react(emoji);
		}

		const handleReactions = info.handleReactions(
			gameBoardMessage,
			async (reaction, user) => {
				await reaction.users.remove(user);
				gameTimer.reset();
				if (!laneEmojis.includes(reaction.emoji.id!)) {
					return; // invalid
				}
				// if your turn
				if (playersInGame[game.turnIndex] === user.id) {
					// drop tile
					const success = game.dropTile(reaction.emoji.id!);
					if (success) game.nextTurn();
				}
			},
		);

		const gameTimer = createTimer(
			[
				60000,
				async () => {
					game.end("Out of time (max 60s per turn)");
				},
			],
			[
				30000,
				async () => {
					await info.message.channel.send(
						`<@${
							playersInGame[game.turnIndex]
						}>, it's your turn in connect 4. ${
							gameBoardMessage.url
						}\n> If you don't play within 30s, the game will end. `,
					);
				},
			],
		);

		await updateGameBoard();

		game.onchange = () => updateGameBoard();
		game.onend = () => handleReactions.end();

		await handleReactions.done;
		gameTimer.end();

		await gameBoardMessage.reactions.removeAll();
	}
});

export default router;
