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
			"<:r1:649845887715115009>",
			"<:r2:649845889061355520>",
			"<:r3:649845889073938452>",
			"<:r4:649845888495255592>",
			"<:r5:649845888780468246>",
			"<:r6:649845889057161227>",
			"<:r7:649845888629473301>",
			"<:r8:649845888931594258>",
			"<:r9:649845888751239168>",
			"<:rA:649845888998440960>",
			"<:rB:649845888558170113>",
			"<:rC:649845888885325824>"
		],
		selected: "<:rs:649845890856517632>",
		blank: "<:rt:649845888448987136>",
		king: "<:rk:649845889065680926>"
	},
	black: {
		pieces: [
			"<:b1:649845885999644692>",
			"<:b2:649845887534759936>",
			"<:b3:649845887903727627>",
			"<:b4:649845888138870812>",
			"<:b5:649845888113704960>",
			"<:b6:649848252484550677>",
			"<:b7:649845888130482197>",
			"<:b8:649845888600244244>",
			"<:b9:649845888113704980>",
			"<:bA:649845887408930817>",
			"<:bB:649845887807389707>",
			"<:bC:649845887903727616>"
		],
		selected: "<:bs:649845888608370708>",
		blank: "<:bt:649845888377815061>",
		king: "<:bk:649845888780468244>"
	},
	board: {
		white: "<:et:649845888709165066>",
		black: "<:et:649845883898429450>",
		arrows: {
			ul: "<:ul:649845888675479552>",
			ur: "<:ur:649845888746913805>",
			bl: "<:dl:649845888486866944>",
			br: "<:dr:649845890718105630>"
		}
	},
	interaction: {
		pieces: [
			"649845887551668237",
			"649845886943363102",
			"649845885835935747",
			"649845883826995210",
			"649845885832003585",
			"649845887073517571",
			"649845887115329546",
			"649845887228444691",
			"649845889011154944",
			"649845887182438421",
			"649845887765577738",
			"649845887509725194"
		],
		arrows: {
			ul: "649845888675479552",
			ur: "649845888746913805",
			bl: "649845888486866944",
			br: "649845890718105630"
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

type MoveResult = {
	x: number;
	y: number;
	jump?: {
		x: number;
		y: number;
	};
	direction: "ul" | "ur" | "dl" | "dr";
};

class Checkers {
	checkerGrid: ("w" | "b")[][];
	checkerPieces: (
		| { color: "r" | "b"; number: number; alldirs: boolean }
		| undefined)[][];
	movementOverlay!: ("ul" | "ur" | "dl" | "dr" | undefined)[][];
	currentPlayer: "r" | "b";
	selectionsAvailable: "piece" | "piecedirection" | "direction";
	selectedPiece?: { x: number; y: number };
	statusMessage: "" | "pressCheckToEndTurn" | "pressCheckToPassTurn" = "";
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
							: checkerPiece.alldirs
							? set.king
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
	directionToDirectionString(
		direction: Direction
	): "ul" | "ur" | "dl" | "dr" {
		if (direction[0] === -1) {
			if (direction[1] === -1) return "ul";
			return "dl";
		}
		if (direction[1] === -1) return "ur";
		return "dr";
	}
	findMovePos(x: number, y: number, dir: Direction): MoveResult | undefined {
		const moveCount = [...dir];
		const [movedX, movedY] = [x + moveCount[0], y + moveCount[1]];
		if (!this.inBounds(movedX, movedY)) {
			return undefined;
		}
		const tileToMove = this.checkerPieces[y][x];
		if (!tileToMove) {
			return undefined;
		}
		if (
			!(
				(tileToMove.color === "b" && dir[0] === -1) ||
				(tileToMove.color === "r" && dir[0] === 1) ||
				tileToMove.alldirs
			)
		) {
			// wrong direction
			return undefined;
		}
		const tileInMovePos = this.checkerPieces[movedY][movedX];
		if (!tileInMovePos) {
			if (this.selectionsAvailable === "direction") return undefined;
			return {
				x: movedX,
				y: movedY,
				direction: this.directionToDirectionString(dir)
			};
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
			return {
				x: dmX,
				y: dmY,
				jump: { x: movedX, y: movedY },
				direction: this.directionToDirectionString(dir)
			};
		}
		return undefined;
	}
	getAvailableMoves(x: number, y: number): MoveResult[] {
		let resultMoves: (MoveResult | undefined)[] = [];

		resultMoves.push(this.findMovePos(x, y, [1, 1]));
		resultMoves.push(this.findMovePos(x, y, [1, -1]));
		resultMoves.push(this.findMovePos(x, y, [-1, -1]));
		resultMoves.push(this.findMovePos(x, y, [-1, 1]));

		return resultMoves.filter(rm => rm) as MoveResult[];
	}
	nextTurn() {
		this.clearMovementOverlay();
		this.selectedPiece = undefined;
		this.currentPlayer = this.currentPlayer === "b" ? "r" : "b";
		this.selectionsAvailable = "piece";
		this.statusMessage = "";

		// check if player has moves available
		if (!this.canMove()) {
			this.statusMessage = "pressCheckToPassTurn";
		}
	}
	canMove(): boolean {
		let canMove = true;
		for (let i = 0; i < 12; i++) {
			let piece = this.findPiece(i, this.currentPlayer);
			if (piece) {
				let availableMoves = this.getAvailableMoves(piece.x, piece.y);
				if (availableMoves.length === 0) canMove = false;
			}
		}
		return canMove;
	}
	findPiece(number: number, color: "r" | "b") {
		for (let y = 0; y < 8; y++) {
			for (let x = 0; x < 8; x++) {
				const checkerHere = this.checkerPieces[y][x];
				if (
					checkerHere &&
					checkerHere.color === color &&
					checkerHere.number === number
				) {
					return { x, y, checkerHere };
				}
			}
		}
		return undefined;
	}
	selectPiece(number: number) {
		if (
			this.selectionsAvailable !== "piece" &&
			this.selectionsAvailable !== "piecedirection"
		) {
			return;
		}

		this.clearMovementOverlay();
		this.selectedPiece = this.findPiece(number, this.currentPlayer);

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
	// concept: getAvailableMoves
	// then addArrows uses getAvailableMoves
	// and so does movePiece
	//eslint-disable-next-line complexity
	addArrows(): number {
		if (!this.selectedPiece) {
			return 0;
		}
		const pieceData = this.checkerPieces[this.selectedPiece.y][
			this.selectedPiece.x
		]!;

		let moves = this.getAvailableMoves(
			this.selectedPiece.x,
			this.selectedPiece.y
		);

		moves.forEach(move => {
			this.movementOverlay[move.y][move.x] = move.direction;
		});
		return moves.length;
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
		const piece = this.checkerPieces[this.selectedPiece.y][
			this.selectedPiece.x
		]!;
		this.checkerPieces[this.selectedPiece.y][
			this.selectedPiece.x
		] = undefined;
		this.checkerPieces[move.y][move.x] = piece;
		this.selectedPiece = { x: move.x, y: move.y };
		let endTurn = false;
		if (move.x === 0 || move.x === 7) {
			if (!piece.alldirs) endTurn = true;
			piece.alldirs = true;
		}
		if (move.jump) {
			this.checkerPieces[move.jump.y][move.jump.x] = undefined; // remove piece
			this.clearMovementOverlay();
			this.selectionsAvailable = "direction";
			this.statusMessage = "pressCheckToEndTurn";
			const addedArrowCount = this.addArrows();
			if (addedArrowCount === 0 || endTurn) {
				this.nextTurn();
			}
		} else {
			this.nextTurn();
		}
		this.emit();
	}
	completeTurn() {
		if (this.selectionsAvailable === "direction") {
			this.nextTurn();
			this.emit();
			return;
		}
		if (!this.canMove()) {
			this.nextTurn();
			this.emit();
			return;
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
					  }, your turn.${
							game.statusMessage === "pressCheckToEndTurn"
								? ` Press <:check:${emojis.interaction.done} to end your turn.`
								: game.statusMessage === "pressCheckToPassTurn"
								? ` Press <:check:${emojis.interaction.done} to pass your turn.`
								: ""
					  }`
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
