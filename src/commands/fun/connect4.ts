// future concepts:
// have the top bar highlight the number played last
// so have it show yellow played here or something
// (needs 7*3 emojis suddenly)

import Router from "commandrouter";
import { messages, safe } from "../../../messages";
import Info from "../../Info";

const router = new Router<Info, any>();

const themes = [
	{
		".": "<:w:648193417058320394>",
		R: "<:r:648194063102902294>",
		y: "<:y:648193417339207701>"
	},
	{
		".": "<:w:648197112667832376>",
		R: "<:r:648197112013783041>",
		y: "<:y:648197111900405790>"
	},
	{
		".": "<:w:648296516406083595>",
		R: "<:r:648226318017626132>",
		y: "<:y:648226318118420500>"
	}
];

const playerIndexToColor: ("R" | "y")[] = ["R", "y"];

const laneEmojis = [
	"648291430028279808",
	"648291429864701952",
	"648291429893931008",
	"648291429839273994",
	"648291429856051201",
	"648291429554192419",
	"648291429977948160"
];

const topBar =
	"<:number1:648301185115357205><:number2:648299358722195467><:number3:648301185127677972><:number4:648301184930545669><:number5:648301184955711488><:number6:648301496282120249><:number7:648301184679149570>";

const joinEmoji = "455896379210989568";

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
			le => (this.lanes[le] = [".", ".", ".", ".", ".", "."])
		);
		this.turnIndex = 0;
		this.onchange = () => {};
		this.onend = () => {};
		this.playerCount = playerCount;
		this.status = { status: "active" };
	}

	end(reason: string) {
		if(this.status.status !== "active"){return false;}
		
		this.status = { status: "ended", reason };
		this.onchange();
		this.onend();
	}
	win(index: number) {
		if(this.status.status !== "active"){return false;}
		
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
		condition: (tile: "." | "R" | "y") => boolean
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
		color: "." | "R" | "y"
	) {
		const iterUp = this.travel(
			[placedX, placedY],
			upfn,
			tile => tile === color
		);
		const iterDown = this.travel(
			[placedX, placedY],
			downfn,
			tile => tile === color
		);
		if (iterUp + 1 + iterDown >= 4) {
			// connected 4
			return true;
		}
		return false;
	}

	dropTile(lane: string): boolean {
		if(this.status.status !== "active"){return false;}
		
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
				color
			) ||
			this.checkConnect4(
				[placedX, placedY],
				(x, y) => [x - 1, y],
				(x, y) => [x + 1, y],
				color
			) ||
			this.checkConnect4(
				[placedX, placedY],
				(x, y) => [x - 1, y - 1],
				(x, y) => [x + 1, y + 1],
				color
			) ||
			this.checkConnect4(
				[placedX, placedY],
				(x, y) => [x - 1, y + 1],
				(x, y) => [x + 1, y - 1],
				color
			)
		) {
			this.win(this.turnIndex);
			return true;
		}

		return true;
	}

	nextTurn() {
		if(this.status.status !== "active"){return false;}
		
		this.turnIndex++;
		this.turnIndex %= this.playerCount;
		this.onchange();
	}
}

router.add("connect4", [], async (cmd: string, info) => {
	if (info.db ? await info.db.getFunEnabled() : true) {
	} else {
		return await info.error(messages.fun.fun_disabled(info));
	}

	if (info.myChannelPerms) {
		if (!info.myChannelPerms.has("USE_EXTERNAL_EMOJIS")) {
			return await info.error(
				"I need permission to `use external emojis` here to play connnect 4\n> https://interpunct.info/help/fun/connect4"
			);
		}
		if (!info.myChannelPerms.has("ADD_REACTIONS")) {
			return await info.error(
				"I need permission to `add reactions` here to play connnect 4\n> https://interpunct.info/help/fun/connect4"
			);
		}
		if (!info.myChannelPerms.has("MANAGE_MESSAGES")) {
			return await info.error(
				"I need permission to `manage messages` here to remove people's reactions in connnect 4\n> https://interpunct.info/help/fun/connect4"
			);
		}
	}

	const themeIndex = Math.floor(
		Math.max(Math.min(+cmd || 3, themes.length), 1) - 1
	);
	const theme = themes[themeIndex];

	const playerLimit = 2;

	// ------------------------------------------------ wait for players to join

	const startTime = new Date().getTime();

	const playersInGame: string[] = [info.message.author.id];
	{
		const getJoinMessageText = () =>
			`${info.message.author.toString()} has started a game of Connect 4 ${
				theme["."]
			}${theme.R}${theme.y} .
> (${`${playersInGame.length}`}/${playerLimit}) ${playersInGame
				.map(pl => `<@${pl}>`)
				.join(", ")}
> React <:j:${joinEmoji}> to join. (${`${60 -
				Math.floor(
					(new Date().getTime() - startTime) / 1000
				)}`}s left)`;

		const joinRequestMessage = await info.channel.send(
			getJoinMessageText()
		);

		const updateMessage = () =>
			joinRequestMessage.edit(getJoinMessageText());

		const handleReactions = info.handleReactions(
			joinRequestMessage,
			async (reaction, user) => {
				if (reaction.emoji.id !== joinEmoji) {
					await reaction.users.remove(user);
				}
				if (playersInGame.length < playerLimit) {
					if (playersInGame.indexOf(user.id) === -1) {
						playersInGame.push(user.id);
						if (playersInGame.length === playerLimit) {
							// start game
							handleReactions.end();
						}
					}
				}
			}
		);

		await joinRequestMessage.react(joinEmoji);

		const interval = setInterval(async () => await updateMessage(), 3000);

		const tempt = setTimeout(async () => {
			await updateMessage();
			handleReactions.end();
		}, 60000);
		await handleReactions.done;
		clearTimeout(tempt);
		clearInterval(interval);
		await joinRequestMessage.delete();

		if (playersInGame.length !== playerLimit) {
			await info.error(`Not enough players to start game.`);
			return;
		}
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
						}`
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
				updateNoEventsTimeout();
				if (laneEmojis.indexOf(reaction.emoji.id!) === -1) {
					return; // invalid
				}
				// if your turn
				if (playersInGame[game.turnIndex] === user.id) {
					// drop tile
					const success = game.dropTile(reaction.emoji.id!);
					if (success) game.nextTurn();
				}
			}
		);

		const createNoEventsTimeout = () => [
			setTimeout(async () => {
				game.end("Out of time (max 60s per turn)");
			}, 60000),
			setTimeout(async () => {
				await info.message.channel.send(
					`<@${
						playersInGame[game.turnIndex]
					}>, it's your turn in connect 4. ${
						gameBoardMessage.url
					}\n> If you don't play within 30s, the game will end. `
				);
			}, 30000)
		];
		let noEventsTimeout = createNoEventsTimeout();

		const updateNoEventsTimeout = () => {
			noEventsTimeout.forEach(net => clearTimeout(net));
			noEventsTimeout = createNoEventsTimeout();
		};

		await updateGameBoard();

		game.onchange = () => updateGameBoard();
		game.onend = () => handleReactions.end();

		await handleReactions.done;
		noEventsTimeout.forEach(net => clearTimeout(net));

		await gameBoardMessage.reactions.removeAll();
	}
});

export default router;
