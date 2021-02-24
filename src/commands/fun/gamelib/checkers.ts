import * as g from "./gamelib";

// TODO: tie

type Color = "red" | "black";

type Piece = {
	bg: "black" | "white";
	piece?: {
		color: Color;
		number: number;
		king: boolean;
	};
	overlay?:
		| {
				type: "move";
				direction: "ul" | "ur" | "dl" | "dr";
		  }
		| { type: "selpiece" }
		| { type: "select" }
		| { type: "ghost" };
};

type Checkers = {
	board: g.Board<Piece>;
	players: { red: g.Player; black: g.Player };
	status:
		| never
		/// Pick which piece to move with
		| { s: "selectpiece"; turn: Color }
		/// Move or jump with the selected piece. Allows back button.
		| { s: "moveany"; turn: Color; piece: number }
		/// Move or jump with the selected piece. Back button not allowed.
		| { s: "jump"; turn: Color; piece: number }
		| { s: "winner"; winner: g.Player; reason: string }
		| { s: "tie"; reason: string };
};

const tileset = g.newTileset({
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
			"<:rC:649845888885325824>",
		],
		selected: "<:rs:649845890856517632>",
		blank: "<:rt:649845888448987136>",
		king: "<:rk:649845889065680926>",
		ghost: "<:rg:650110208441450506>",
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
			"<:bC:649845887903727616>",
		],
		selected: "<:bs:649845888608370708>",
		blank: "<:bt:649845888377815061>",
		king: "<:bk:649845888780468244>",
		ghost: "<:bg:650110208349175814>",
	},
	board: {
		white: "<:et:649845888709165066>",
		black: "<:et:649845883898429450>",
		arrows: {
			ul: "<:ul:649845888675479552>",
			ur: "<:ur:649845888746913805>",
			dl: "<:dl:649845888486866944>",
			dr: "<:dr:649845890718105630>",
		},
	},
	interaction: {
		pieces: [
			"1️⃣",
			"2⃣",
			"3⃣",
			"4⃣",
			"5⃣",
			"6⃣",
			"7⃣",
			"8⃣",
			"9⃣",
			"🇦",
			"🇧",
			"🇨",
		],
		arrows: {
			ul: "↖️",
			ur: "↗️",
			dl: "↙️",
			dr: "↘️",
		},
		back: "↩️",
	},
});

// export type GameConfig<State> = {
// 	setup: (player: Player[]) => State;
// 	getMoves: (state: State) => MoveSet<State>;
// 	renderSetup: () => { type: "once"; actions: Tile[] }[];
// 	render: (state: Readonly<State>) => string[];
// 	timers: {
// 		time: number & { __unit: "ms" };
// 		message?: (v: Readonly<State>) => string;
// 		update?: (v: State) => State;
// 	}[];
// 	checkGameOver: (state: Readonly<State>) => boolean;
// 	help: string;
// 	title: string;
// };

type MoveType = {
	number: number;
	from: [number, number];
	to: [number, number];
	direction: [number, number];
};

// it is required to get available moves for all pieces in normal:
// - pieces with no available moves should not get the number overlay
// - it has to be decided whether a jump move must be made
// - extrainfo should have some message like "Since a piece is available to take, you must jump"
function getMovablePieces(
	state: Checkers,
): { position: [number, number]; number: number }[] {
	const jumpMoves: ([number, number] | undefined)[] = new Array(12).fill(
		undefined,
	);
	const normalMoves: ([number, number] | undefined)[] = new Array(12).fill(
		undefined,
	);

	if (state.status.s === "winner" || state.status.s === "tie")
		throw new Error("Game already over");
	if (state.status.s !== "selectpiece")
		throw new Error(
			"already moving. getAvailableMoves must be used instead",
		);
	const st = state.status;

	const pieces = state.board.filter(t => t.piece?.color === st.turn);

	for (const piece of pieces) {
		const moveDirections = getMoveDirectionsForPiece(
			state,
			piece.tile,
			piece.x,
			piece.y,
		);
		for (const mvdir of moveDirections.moves) {
			if (moveDirections.mode === "jump")
				jumpMoves[mvdir.number] = mvdir.from;
			else normalMoves[mvdir.number] = mvdir.from;
		}
	}
	console.log("Available Moves: ", jumpMoves, normalMoves);

	const movelistmap = (jm: [number, number] | undefined, i: number) =>
		jm ? [{ position: jm, number: i }] : [];

	// don't worry it's an inverse pyramid model
	const mlmJumpMoves = jumpMoves.flatMap(movelistmap);
	if (mlmJumpMoves.length > 0) return mlmJumpMoves;
	return normalMoves.flatMap(movelistmap);
}

function getMoveDirectionsForPiece(
	state: Checkers,
	tile: Piece,
	x: number,
	y: number,
): {
	mode: "move" | "jump";
	moves: (MoveType & { take?: [number, number] })[];
} {
	const jumpMoves: (MoveType & { take: [number, number] })[] = [];
	const normalMoves: MoveType[] = [];

	const pcdat = tile.piece!;
	if (!pcdat)
		throw new Error("no move directions for piece x: " + x + ", y: " + y);

	const possibledirs: [number, number][] = [];
	if (pcdat.king || pcdat.color === "red") possibledirs.push([1, -1], [1, 1]);
	if (pcdat.king || pcdat.color === "black")
		possibledirs.push([-1, -1], [-1, 1]);

	console.log("Checking dirs: ", possibledirs);

	for (const [dx, dy] of possibledirs) {
		const [nx, ny] = [x + dx, y + dy];
		const moveto = state.board.get(nx, ny);
		if (!moveto) continue; // off screen
		if (!moveto.piece) {
			normalMoves.push({
				number: pcdat.number,
				from: [x, y],
				to: [nx, ny],
				direction: [dx, dy],
			});
			continue;
		}
		if (moveto.piece.color === pcdat.color) continue; // cannot jump same-color piece

		const [fx, fy] = [nx + dx, ny + dy];
		const jumpto = state.board.get(fx, fy);
		if (!jumpto) continue; // off screen
		if (jumpto.piece) continue; // cannot jump over piece to piece

		jumpMoves.push({
			number: pcdat.number,
			from: [x, y],
			to: [fx, fy],
			take: [nx, ny],
			direction: [dx, dy],
		});
	}

	console.log("Res moves: ", jumpMoves, normalMoves);

	if (jumpMoves.length > 0) return { mode: "jump", moves: jumpMoves };
	return { mode: "move", moves: normalMoves };
}

function getAvailableMoves(
	state: Checkers,
): (MoveType & { take?: [number, number] })[] {
	if (state.status.s === "winner" || state.status.s === "tie")
		throw new Error("Game already over");
	if (state.status.s === "selectpiece") throw new Error("not moving yet");
	const st = state.status;

	const piece = state.board.filter(
		t => t.piece?.number === st.piece && t.piece?.color === st.turn,
	)[0];
	if (!piece) throw new Error("Could not find selected piece");

	const moveDirections = getMoveDirectionsForPiece(
		state,
		piece.tile,
		piece.x,
		piece.y,
	);

	if (moveDirections.mode === "jump") return moveDirections.moves;
	if (state.status.s === "jump") return []; // no jump moves available for this piece.
	return moveDirections.moves;
}

// this could be called by render or something. it won't be, but it could.
function updateOverlay(state: Checkers) {
	state.board.forEach(tile => {
		tile.overlay = undefined;
	});

	if (state.status.s === "selectpiece") {
		const movablePieces = getMovablePieces(state);
		for (const avpc of movablePieces) {
			// set overlay icon
			const pc = state.board.get(...avpc.position);
			if (!pc || !pc.piece) throw new Error("bad movable piece");
			pc.overlay = { type: "select" };
		}
	}

	if (state.status.s === "moveany" || state.status.s === "jump") {
		const moveDirs = getAvailableMoves(state);
		for (const moveDir of moveDirs) {
			// set dir icon
			console.log("movedir: ", moveDir);
			const mvpc = state.board.get(...moveDir.to);
			if (!mvpc || mvpc.piece) throw new Error("bad movedir tile");
			mvpc.overlay = {
				type: "move",
				direction: directionToDirectionString(moveDir.direction),
			};

			if (moveDir.take) {
				const takepce = state.board.get(...moveDir.take);
				if (!takepce || !takepce.piece) throw new Error("bad takepce");
				takepce.overlay = { type: "ghost" };
			}

			const selxtdpc = state.board.get(...moveDir.from);
			if (!selxtdpc || !selxtdpc.piece)
				throw new Error("bad movedir current");
			selxtdpc.overlay = { type: "selpiece" };
		}
	}
}

function getMoves(state: Checkers): g.MoveSet<Checkers> {
	if (state.status.s === "winner" || state.status.s === "tie") {
		return []; // never hopefully
	}

	if (state.status.s === "selectpiece") {
		const st = state.status;

		const movablePieces = getMovablePieces(state);
		return movablePieces.map(pc => ({
			button: tileset.tiles.interaction.pieces[pc.number],
			player: state.players[st.turn],
			apply: state => {
				state.status = {
					s: "moveany",
					turn: st.turn,
					piece: pc.number,
				};
				updateOverlay(state);
				return state;
			},
		}));
	}

	const resMoves: g.MoveSet<Checkers> = [];
	const st = state.status;

	const availableMoves = getAvailableMoves(state);
	for (const move of availableMoves) {
		resMoves.push({
			button:
				tileset.tiles.interaction.arrows[
					directionToDirectionString(move.direction)
				],
			player: state.players[st.turn],
			apply: state => {
				const from = state.board.get(...move.from)!;
				const to = state.board.get(...move.to)!;
				to.piece = from.piece;
				from.piece = undefined;

				// TODO: show a ghost overlay?
				if (move.take) {
					state.board.get(...move.take)!.piece = undefined;
					// prettier-ignore
					if(state.board.filter(t => t.piece ? t.piece.color !== st.turn : false).length === 0) {
						state.status = {s: "winner", winner: state.players[st.turn], reason: ""};
						updateOverlay(state);
						return state;
					}
				}

				const kingSide = { red: 7, black: 0 };
				const makeKing =
					!to.piece!.king && move.to[0] === kingSide[to.piece!.color];

				if (makeKing) to.piece!.king = true;

				// ==: Jump (for getAvailableMoves call)
				state.status = {
					s: "jump",
					turn: st.turn,
					piece: st.piece,
				};
				// : Check if the current player should continue or if next turn.
				if (
					// ==: If this move did not jump, next turn
					!move.take ||
					// ==: If this move created a king, next turn
					makeKing ||
					// ==: If there are no moves available, next turn
					getAvailableMoves(state).length === 0
				) {
					// ==: Next turn
					state.status = {
						s: "selectpiece",
						turn: st.turn === "red" ? "black" : "red",
					};
				} else {
					// already set
				}

				updateOverlay(state);
				return state;
			},
		});
	}

	// allow going back to selectpiece on moveany
	if (state.status.s === "moveany") {
		resMoves.push({
			button: tileset.tiles.interaction.back,
			player: state.players[st.turn],
			apply: state => {
				state.status = {
					s: "selectpiece",
					turn: st.turn,
				};
				updateOverlay(state);
				return state;
			},
		});
	}
	// there is no option to preemtively end your turn if you are forced to jump. you must follow the full jump chain (any of your choosing)

	return resMoves;
}

function directionToDirectionString(
	direction: [number, number],
): "ul" | "ur" | "dl" | "dr" {
	if (direction[0] === -1) {
		if (direction[1] === -1) return "ul";
		return "dl";
	}
	if (direction[1] === -1) return "ur";
	return "dr";
}

function assertNever(a: never): never {
	throw new Error("never: " + a);
}

export const checkers = g.newGame<Checkers>({
	title: "Checkers",
	help: "/help/fun/checkers",
	setup(players) {
		const u___ = {};
		const r = (n: number): Partial<Piece> => ({
			piece: { color: "red", number: n, king: false },
		});
		const b = (n: number): Partial<Piece> => ({
			piece: { color: "black", number: n, king: false },
		});
		const [A, B] = [10, 11, 12];
		const checkerPieces: Partial<Piece>[][] = [
			[u___, r(0), u___, u___, u___, b(0), u___, b(1)],
			[r(1), u___, r(2), u___, u___, u___, b(2), u___],
			[u___, r(3), u___, u___, u___, b(3), u___, b(4)],
			[r(4), u___, r(5), u___, u___, u___, b(5), u___],
			[u___, r(6), u___, u___, u___, b(6), u___, b(7)],
			[r(7), u___, r(8), u___, u___, u___, b(8), u___],
			[u___, r(9), u___, u___, u___, b(9), u___, b(A)],
			[r(A), u___, r(B), u___, u___, u___, b(B), u___],
		];

		const initialState: Checkers = {
			board: g.newBoard<Piece>(8, 8, (x, y) => {
				const base: Piece =
					x % 2 !== y % 2 ? { bg: "black" } : { bg: "white" };
				Object.assign(base, checkerPieces[y][x]);
				return base;
			}),
			players: { red: players[0], black: players[1] },
			status: { s: "selectpiece", turn: "red" },
		};

		updateOverlay(initialState);
		return initialState;
	},
	renderSetup() {
		return [
			{
				type: "once",
				actions: [
					tileset.tiles.interaction.back,
					...tileset.tiles.interaction.pieces,
					...Object.values(tileset.tiles.interaction.arrows),
				],
			},
		];
	},
	render(state) {
		const mode = state.status;
		console.log(mode);
		// in zig this could be an inline switch on a tagged union. formatting would be a bit harder though (would have to heap allocate a string probably and format to it and then defer free).
		const status1 =
			mode.s === "selectpiece"
				? `<@${state.players[mode.turn].id}>'s turn (${
						tileset.tiles[mode.turn].blank
				  })`
				: mode.s === "moveany"
				? `<@${state.players[mode.turn].id}>'s turn (${
						tileset.tiles[mode.turn].blank
				  })`
				: mode.s === "jump"
				? `<@${state.players[mode.turn].id}>'s turn (${
						tileset.tiles[mode.turn].blank
				  })`
				: mode.s === "winner"
				? `<@${mode.winner.id}> won! (${mode.reason})`
				: mode.s === "tie"
				? `Tie!`
				: assertNever(mode);
		const boardRender = state.board.render(tile => {
			if (tile.overlay) {
				if (tile.overlay.type === "move")
					return tileset.tiles.board.arrows[tile.overlay.direction];
				if (tile.overlay.type === "selpiece")
					return tileset.tiles[tile.piece!.color].selected;
				if (tile.overlay.type === "ghost")
					return tileset.tiles[tile.piece!.color].ghost;
				if (tile.overlay.type === "select")
					return tileset.tiles[tile.piece!.color].pieces[
						tile.piece!.number
					];
				assertNever(tile.overlay);
			}
			if (tile.piece) {
				if (tile.piece.king) {
					return tileset.tiles[tile.piece.color].king;
				} else {
					return tileset.tiles[tile.piece.color].blank;
				}
			}
			return tileset.tiles.board[tile.bg];
		});

		return [
			`**Checkers**
=== ${status1} ===
${boardRender}
=== ${status1} ===`,
		];
	},
	getMoves(state) {
		return getMoves(state);
	},
	checkGameOver(state) {
		return state.status.s === "winner" || state.status.s === "tie";
	},
	timers: [
		{
			time: g.unit(0, "min"),

			message: state => {
				if (state.status.s === "winner") assertNever(0 as never);
				if (state.status.s === "tie") assertNever(0 as never);
				const currentplayer = state.players[state.status.turn];
				const playercolor = tileset.tiles[state.status.turn].blank;
				return `<@${currentplayer.id}> (${playercolor}), it's your turn.`;
			},
		},
		{
			time: g.unit(3, "min"),

			message: state => {
				if (state.status.s === "winner") assertNever(0 as never);
				if (state.status.s === "tie") assertNever(0 as never);
				const currentplayer = state.players[state.status.turn];
				const playercolor = tileset.tiles[state.status.turn].blank;
				return `<@${currentplayer.id}> (${playercolor}), it's your turn. 30s left.`;
			},
		},
		{
			time: g.unit(4, "min"),
			update: state => {
				if (state.status.s === "winner") assertNever(0 as never);
				if (state.status.s === "tie") assertNever(0 as never);
				const nextplayer = state.players[state.status.turn === "red" ? "black" : "red"];
				state.status = {
					s: "winner",
					reason: "Time out.",
					winner: nextplayer,
				};
				updateOverlay(state);
				return state;
			},
		},
	],
});
