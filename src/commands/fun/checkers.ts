import Router from "commandrouter";
import { AP, a } from "../argumentparser";
import * as moment from "moment";
import * as Discord from "discord.js";

import { messages, safe, raw } from "../../../messages";
import { serverStartTime } from "../../..";

import Info from "../../Info";

const router = new Router<Info, any>();

// 12x red pieces, 12x black pieces,
// 1x selected red piece, selected black piece
// full white square, full dark square,
// edge pieces
// arrow pieces
// move by
//: selecting a piece (with its number)
// the board will highlight that piece and
//    and the directions it can move
// then select a direction
// you can also reselect a piece instead of
//    selecting a direction
// jumping is the same. when you select the
//    piece, it highlights what it can jump past
//    but after you choose to jump, you have to
//    select another direction again (can't select)
//    (a different piece)

// game is played left to right. black on left, red on right

// two messages. top is board and piece selection, bottom is
//    direction selection. on your turn, it will @ you in
//    piece selection, then both piece and direction. if
//    you can only go in direction, it will only @ you in
//    direction (so the message highlight shows what you)
//    (can do.)

// two player game. have the joining thing anyway because
//    I think it's easier to use and more clear. Redo it
//    into a reusable function to use in this and connect4.
//    ejyptian war will need its own because the owner chooses
//    when to start the game.

// possability for move animations (but unnecessary)

const emojis = {
	red: {
		pieces: [
			"(r0)",
			"(r1)",
			"(r2)",
			"(r3)",
			"(r4)",
			"(r5)",
			"(r6)",
			"(r7)",
			"(r8)",
			"(r9)",
			"(rA)",
			"(rB)"
		],
		selected: "(rs)"
	},
	black: {
		pieces: ["", "", "", "", "", "", "", "", "", "", "", ""],
		selected: ""
	},
	board: {
		white: "",
		black: "",
		arrows: {
			ul: "",
			ur: "",
			bl: "",
			br: ""
		}
	},
	interaction: {
		pieces: ["", "", "", "", "", "", "", "", "", "", "", ""],
		arrows: { ul: "", ur: "", bl: "", br: "" },
		join: "455896379210989568"
	}
};

type CheckerTile =
	| typeof emojis.red.pieces[number]
	| typeof emojis.red.selected
	| typeof emojis.black.pieces[number]
	| typeof emojis.black.selected
	| typeof emojis.board.white
	| typeof emojis.board.black
	| typeof emojis.board.arrows.ul
	| typeof emojis.board.arrows.ur
	| typeof emojis.board.arrows.bl
	| typeof emojis.board.arrows.br;

type Direction = "ul" | "ur" | "bl" | "br";

class Checkers {
	gameBoard: CheckerTile[][];
	currentPlayer: "r" | "b";
	selectionsAvailable: "piece" | "piecedirection" | "direction";
	constructor() {
		const r = emojis.red.pieces;
		const b = emojis.black.pieces;
		const ___b = emojis.board.black;
		const ___w = emojis.board.white;
		this.gameBoard = [
			[___w, r[0], ___w, ___b, ___w, b[0], ___w, b[1]],
			[r[1], ___w, r[2], ___w, ___b, ___w, b[2], ___w],
			[___w, r[3], ___w, ___b, ___w, b[3], ___w, b[4]],
			[r[4], ___w, r[5], ___w, ___b, ___w, b[5], ___w],
			[___w, r[6], ___w, ___b, ___w, b[6], ___w, b[7]],
			[r[7], ___w, r[8], ___w, ___b, ___w, b[8], ___w],
			[___w, r[9], ___w, ___b, ___w, b[9], ___w, b[10]],
			[r[10], ___w, r[11], ___w, ___b, ___w, b[11], ___w]
		];
		this.currentPlayer = "r";
		this.selectionsAvailable = "piece";
	}
	selectPiece(number: number) {
		if (
			this.selectionsAvailable !== "piece" &&
			this.selectionsAvailable !== "piecedirection"
		) {
			return;
		}
		// select piece to move. update the board to have that piece emojis.[color].selected and show arrows around it. remove any leftover arrows. then switches selectionsavailable to piecedirection.
	}
	movePiece(direction: Direction) {
		// move piece. may advance to the next turn
		// if(jump) don't advance to next turn. otherwise, do
	}
}

router.add("checkers", [], async (cmd: string, info) => {
	const apresult = await AP({ info, cmd });
	if (!apresult) return;

	if (info.db ? await info.db.getFunEnabled() : true) {
	} else {
		return await info.error(messages.fun.fun_disabled(info));
	}

	if (info.myChannelPerms) {
		if (!info.myChannelPerms.has("USE_EXTERNAL_EMOJIS")) {
			return await info.error(
				"I need permission to `use external emojis` here to play checkers\n> https://interpunct.info/help/fun/connect4"
			);
		}
		if (!info.myChannelPerms.has("ADD_REACTIONS")) {
			return await info.error(
				"I need permission to `add reactions` here to play checkers\n> https://interpunct.info/help/fun/connect4"
			);
		}
		if (!info.myChannelPerms.has("MANAGE_MESSAGES")) {
			return await info.error(
				"I need permission to `manage messages` here to remove people's reactions in checkers\n> https://interpunct.info/help/fun/connect4"
			);
		}
	}

	const playersInGame = await getPlayers(
		[info.message.author.id],
		2,
		"Connect 4",
		info
	);
	if (!playersInGame) {
		return;
	}
});

export async function getPlayers(
	initial: string[],
	playerLimit: number,
	gameName: string,
	/*requireApprobalBeforeStart*/ info: Info
) {
	const playersInGame: string[] = initial;
	{
		const startTime = new Date().getTime();
		const getJoinMessageText = () =>
			`${info.message.author.toString()} has started a game of ${gameName}.
> (${`${playersInGame.length}`}/${playerLimit}) ${playersInGame
				.map(pl => `<@${pl}>`)
				.join(", ")}
> React <:j:${emojis.interaction.join}> to join. (${`${60 -
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
				if (reaction.emoji.id !== emojis.interaction.join) {
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

		await joinRequestMessage.react(emojis.interaction.join);

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
	return playersInGame;
}
