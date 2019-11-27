// bad code alert

import Router from "commandrouter";
import { AP, a } from "../argumentparser";
import * as moment from "moment";
import * as Discord from "discord.js";

import { messages, safe, raw } from "../../../messages";
import { serverStartTime, ilt } from "../../..";

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

// !!!!! todo emoji manager that auto manages an emoji server. just Emoji("Red2.png") and it returns the id or something idk maybe not.

const emojis = {
	red: {
		pieces: [
			"<:r1:649100010230644737>",
			"<:r2:649100010952065038>",
			"<:r3:649100010562125834>",
			"<:r4:649100010146758677>",
			"<:r5:649100010452942858>",
			"<:r6:649100010465787934>",
			"<:r7:649100010318856194>",
			"<:r8:649100010465656832>",
			"<:r9:649100010301947914>",
			"<:rA:649100010226581516>",
			"<:rB:649100010465525782>",
			"<:rC:649100010507730974>"
		],
		selected: "<:rs:649100010536960041>",
		blank: "<:rt:649107794691358751>"
	},
	black: {
		pieces: [
			"<:b1:649100011111710751>",
			"<:b2:649100011438866457>",
			"<:b3:649100011547656193>",
			"<:b4:649100011358912542>",
			"<:b5:649100011698782208>",
			"<:b6:649100011434409984>",
			"<:b7:649100011312775168>",
			"<:b8:649100011409506334>",
			"<:b9:649100011702976525>",
			"<:bA:649100011203985439>",
			"<:bB:649100011270963200>",
			"<:bC:649100012176801843>"
		],
		selected: "<:bs:649100010893344768>",
		blank: "<:bt:649107794666061824>"
	},
	board: {
		white: "<:et:649100010251747342>",
		black: "<:et:649100010868178972>",
		arrows: {
			ul: "<:ul:649100011514101779>",
			ur: "<:ur:649100011161911302>",
			bl: "<:dl:649100011665227786>",
			br: "<:dr:649100012319670274>"
		}
	},
	interaction: {
		pieces: [
			"649100010797006879",
			"649100011019436036",
			"649100011522490387",
			"649100010767646730",
			"649100010717446144",
			"649100010654400525",
			"649100010721509386",
			"649100010486759425",
			"649100010696343552",
			"649100010843013167",
			"649100010545217586",
			"649100010503274504"
		],
		arrows: {
			ul: "649100011514101779",
			ur: "649100011161911302",
			bl: "649100011665227786",
			br: "649100012319670274"
		},
		done: "546938940389589002",
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

type Direction = [1, 1] | [1, -1] | [-1, -1] | [-1, 1];

class Checkers {
	checkerGrid: ("w" | "b")[][];
	checkerPieces: (
		| { color: "r" | "b"; number: number; alldirs: boolean }
		| undefined
	)[][];
	movementOverlay!: ("ul" | "ur" | "dl" | "dr" | undefined)[][];
	currentPlayer: "r" | "b";
	selectionsAvailable: "piece" | "piecedirection" | "direction";
	selectedPiece?: { x: number; y: number };
	onupdate?: () => void;
	constructor() {
		const r = (n: number) => ({
			color: "r" as const,
			number: n,
			alldirs: false
		});
		const b = (n: number) => ({
			color: "b" as const,
			number: n,
			alldirs: false
		});
		const u___ = undefined;
		this.checkerGrid = [
			["w", "b", "w", "b", "w", "b", "w", "b"],
			["b", "w", "b", "w", "b", "w", "b", "w"],
			["w", "b", "w", "b", "w", "b", "w", "b"],
			["b", "w", "b", "w", "b", "w", "b", "w"],
			["w", "b", "w", "b", "w", "b", "w", "b"],
			["b", "w", "b", "w", "b", "w", "b", "w"],
			["w", "b", "w", "b", "w", "b", "w", "b"],
			["b", "w", "b", "w", "b", "w", "b", "w"]
		];
		this.checkerPieces = [
			[u___, r(0), u___, u___, u___, b(0), u___, b(1)],
			[r(1), u___, r(2), u___, u___, u___, b(2), u___],
			[u___, r(3), u___, u___, u___, b(3), u___, b(4)],
			[r(4), u___, r(5), u___, u___, u___, b(5), u___],
			[u___, r(6), u___, u___, u___, b(6), u___, b(7)],
			[r(7), u___, r(8), u___, u___, u___, b(8), u___],
			[u___, r(9), u___, u___, u___, b(9), u___, b(10)],
			[r(10), u___, r(11), u___, u___, u___, b(11), u___]
		];
		this.clearMovementOverlay();
		this.currentPlayer = "r";
		this.selectionsAvailable = "piece";
	}
	getGrid(): CheckerTile[][] {
		const resArr: CheckerTile[][] = [];
		for (let y = 0; y < 8; y++) {
			const resRow: CheckerTile[] = [];
			for (let x = 0; x < 8; x++) {
				const movementOverlay = this.movementOverlay[y][x];
				if (movementOverlay) {
					resRow.push(
						movementOverlay === "ul"
							? emojis.board.arrows.ul
							: movementOverlay === "ur"
							? emojis.board.arrows.ur
							: movementOverlay === "dl"
							? emojis.board.arrows.bl
							: emojis.board.arrows.br
					);
					continue;
				}
				const checkerPiece = this.checkerPieces[y][x];
				if (checkerPiece) {
					const set =
						checkerPiece.color === "r" ? emojis.red : emojis.black;
					resRow.push(
						this.currentPlayer === checkerPiece.color
							? this.selectedPiece &&
							  this.selectedPiece.x === x &&
							  this.selectedPiece.y === y
								? set.selected
								: set.pieces[checkerPiece.number]
							: set.blank
					);
					continue;
				}
				const gridColor = this.checkerGrid[y][x];
				resRow.push(
					gridColor === "w" ? emojis.board.white : emojis.board.black
				);
			}
			resArr.push(resRow);
		}
		return resArr;
	}
	clearMovementOverlay() {
		const u = undefined;
		this.movementOverlay = [
			[u, u, u, u, u, u, u, u],
			[u, u, u, u, u, u, u, u],
			[u, u, u, u, u, u, u, u],
			[u, u, u, u, u, u, u, u],
			[u, u, u, u, u, u, u, u],
			[u, u, u, u, u, u, u, u],
			[u, u, u, u, u, u, u, u],
			[u, u, u, u, u, u, u, u]
		];
	}
	inBounds(x: number, y: number) {
		return x >= 0 && x < 8 && y >= 0 && y < 8;
	}
	findMovePos(
		x: number,
		y: number,
		dir: Direction
	): { x: number; y: number; jump?: { x: number; y: number } } | undefined {
		const moveCount = [...dir];
		const [movedX, movedY] = [x + moveCount[0], y + moveCount[1]];
		if (!this.inBounds(movedX, movedY)) {
			return undefined;
		}
		const tileInMovePos = this.checkerPieces[movedY][movedX];
		if (!tileInMovePos) {
			return { x: movedX, y: movedY };
		}
		if (tileInMovePos.color === this.currentPlayer) {
			return undefined;
		}
		const [dmX, dmY] = [movedX + moveCount[0], movedY + moveCount[1]];
		if (!this.inBounds(dmX, dmY)) {
			return undefined;
		}
		const tileInJumpPos = this.checkerPieces[dmY][dmX];
		if (!tileInJumpPos) {
			return { x: dmX, y: dmY, jump: { x: movedX, y: movedY } };
		}
		return undefined;
	}
	nextTurn() {
		this.clearMovementOverlay();
		this.selectedPiece = undefined;
		this.currentPlayer = this.currentPlayer === "b" ? "r" : "b";
		this.selectionsAvailable = "piece";
	}
	selectPiece(number: number) {
		if (
			this.selectionsAvailable !== "piece" &&
			this.selectionsAvailable !== "piecedirection"
		) {
			return;
		}

		this.clearMovementOverlay();
		this.selectedPiece = undefined;

		// find piece
		for (let y = 0; y < 8; y++) {
			for (let x = 0; x < 8; x++) {
				const checkerHere = this.checkerPieces[y][x];
				if (
					checkerHere &&
					checkerHere.color === this.currentPlayer &&
					checkerHere.number === number
				) {
					this.selectedPiece = { y, x };
				}
			}
		}

		if (this.selectedPiece) {
			// add arrows
			this.addArrows();
			this.selectionsAvailable = "piecedirection";
			// success, emit
			this.emit();
			return;
		}
		// if not, the piece may not exist.
	}
	//eslint-disable-next-line complexity
	addArrows() {
		if (!this.selectedPiece) {
			return;
		}
		const pieceData = this.checkerPieces[this.selectedPiece.y][
			this.selectedPiece.x
		]!;
		// why do we do the same thing 4 times
		if (pieceData.alldirs || pieceData.color === "b") {
			const { x, y } = this.selectedPiece;
			const move = this.findMovePos(x, y, [-1, -1]);
			if (move) {
				if (this.selectionsAvailable === "direction" && !move.jump) {
				} else {
					this.movementOverlay[move.y][move.x] = "ul";
				}
			}
		}
		if (pieceData.alldirs || pieceData.color === "b") {
			const { x, y } = this.selectedPiece;
			const move = this.findMovePos(x, y, [-1, 1]);
			if (move) {
				if (this.selectionsAvailable === "direction" && !move.jump) {
				} else {
					this.movementOverlay[move.y][move.x] = "dl";
				}
			}
		}
		if (pieceData.alldirs || pieceData.color === "r") {
			const { x, y } = this.selectedPiece;
			const move = this.findMovePos(x, y, [1, 1]);
			if (move) {
				if (this.selectionsAvailable === "direction" && !move.jump) {
				} else {
					this.movementOverlay[move.y][move.x] = "dr";
				}
			}
		}
		if (pieceData.alldirs || pieceData.color === "r") {
			const { x, y } = this.selectedPiece;
			const move = this.findMovePos(x, y, [1, -1]);
			if (move) {
				if (this.selectionsAvailable === "direction" && !move.jump) {
				} else {
					this.movementOverlay[move.y][move.x] = "ur";
				}
			}
		}
	}
	movePiece(direction: Direction) {
		if (
			this.selectionsAvailable !== "piecedirection" &&
			this.selectionsAvailable !== "direction"
		) {
			return;
		}
		if (!this.selectedPiece) {
			return;
		}
		const piece1 = this.checkerPieces[this.selectedPiece.y][
			this.selectedPiece.x
		]!;
		const move = this.findMovePos(
			this.selectedPiece.x,
			this.selectedPiece.y,
			direction
		);
		if (!move) {
			return; // no
		}
		if (piece1.alldirs) {
		} else {
			if (piece1.color === "r" && direction[0] === -1) {
				return;
			}
			if (piece1.color === "b" && direction[0] === 1) {
				return;
			}
		}
		if (this.selectionsAvailable === "direction" && !move.jump) {
			return;
		}
		const piece = this.checkerPieces[this.selectedPiece.y][
			this.selectedPiece.x
		]!;
		this.checkerPieces[this.selectedPiece.y][
			this.selectedPiece.x
		] = undefined;
		this.checkerPieces[move.y][move.x] = piece;
		this.selectedPiece = { x: move.x, y: move.y };
		if (move.x === 0 || move.x === 7) {
			piece.alldirs = true;
		}
		if (move.jump) {
			this.checkerPieces[move.jump.y][move.jump.x] = undefined; // remove piece
			this.clearMovementOverlay();
			this.selectionsAvailable = "direction";
			this.addArrows();
		} else {
			this.nextTurn();
		}
		this.emit();
	}
	completeTurn() {
		if (this.selectionsAvailable === "direction") {
			this.nextTurn();
			this.emit();
		}
	}
	emit() {
		this.onupdate && this.onupdate();
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
		"Checkers",
		info
	);
	if (!playersInGame) {
		return;
	}

	// set up game messages
	// set up checker piece selection
	await info.channel.send(
		`=== Checkers === ${emojis.red.blank} <@${playersInGame[0]}>, ${emojis.black.blank} <@${playersInGame[1]}>`
	);
	const checkerPieceSelectionMessage = await info.channel.send(
		`Setting up game board...`
	);
	const directionSelectionMessage = await info.channel.send(
		`Setting up game directions...`
	);

	for (const cpse of emojis.interaction.pieces) {
		await checkerPieceSelectionMessage.react(cpse);
	}
	await directionSelectionMessage.react(emojis.interaction.arrows.ul);
	await directionSelectionMessage.react(emojis.interaction.arrows.ur);
	await directionSelectionMessage.react(emojis.interaction.arrows.bl);
	await directionSelectionMessage.react(emojis.interaction.arrows.br);
	await directionSelectionMessage.react(emojis.interaction.done);

	const game = new Checkers();

	const update = async () =>
		await Promise.all([
			checkerPieceSelectionMessage.edit(
				`${game
					.getGrid()
					.map(l => `> ${l.join("")}`)
					.join("\n")}\n${
					game.selectionsAvailable === "piece" ||
					game.selectionsAvailable === "piecedirection"
						? game.currentPlayer === "b"
							? `<@${playersInGame[1]}>`
							: `<@${playersInGame[0]}>`
						: "---"
				}, your turn.`
			),
			directionSelectionMessage.edit(
				game.selectionsAvailable === "piecedirection" ||
					game.selectionsAvailable === "direction"
					? `${
							game.currentPlayer === "b"
								? `<@${playersInGame[1]}>`
								: `<@${playersInGame[0]}>`
					  }, your turn.`
					: "---"
			)
		]);

	const pcCol = info.handleReactions(
		checkerPieceSelectionMessage,
		async (reaction, user) => {
			ilt(reaction.users.remove(user.id), "checkers remove reaction");
			const expectedUser =
				game.currentPlayer === "b"
					? playersInGame[1]
					: playersInGame[0];
			if (user.id !== expectedUser) {
				return;
			}
			const pieceNum = emojis.interaction.pieces.indexOf(
				reaction.emoji.id!
			);
			if (pieceNum === -1) {
				return;
			}
			game.selectPiece(pieceNum);
		}
	);

	const dcCol = info.handleReactions(
		directionSelectionMessage,
		async (reaction, user) => {
			ilt(reaction.users.remove(user.id), "checkers remove reaction");
			const expectedUser =
				game.currentPlayer === "b"
					? playersInGame[1]
					: playersInGame[0];
			if (user.id !== expectedUser) {
				return;
			}
			const emid = reaction.emoji.id!;
			if (emid === emojis.interaction.done) {
				return game.completeTurn();
			}
			const dirs = emojis.interaction.arrows;
			const direction: Direction | undefined =
				emid === dirs.ul
					? [-1, -1]
					: emid === dirs.ur
					? [1, -1]
					: emid === dirs.bl
					? [-1, 1]
					: emid === dirs.br
					? [1, 1]
					: undefined;
			if (!direction) {
				return;
			}
			game.movePiece(direction);
		}
	);

	game.onupdate = () => {
		ilt(update(), "checkers game update");
	};

	await update();

	await Promise.all([pcCol.done, dcCol.done]);

	// REMAINING TODO:
	// winning game, 60s timeout
	// after jumping should only be able to jump, not move normally
	// should finish automatically if a jump has no possible spaces to jump to
	// if a player can't move, skip their turn (tell them to press check to pass)
});

export default router;

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
