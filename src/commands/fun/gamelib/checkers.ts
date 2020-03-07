import * as g from "./gamelib";

declare let todo: any;

// reminder:
// if(can jump) must jump
// if(did just jump) must pass
// if(can move) move
// explicit pass

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
		| {
				type: "selpiece";
				color: Color;
		  }
		| { type: "ghost"; color: Color };
	// should this be here? seems like there should be a better way to do this like if it was only a concept that existed in the renderer and had nothing to do with state // the answer is no it can't only exist in the renderer because sometimes the piece can only jump or only move or ... and ...
};

type Checkers = {
	board: g.Board<Piece>;
	players: { red: g.Player; black: g.Player };
	status:
		| { s: "turn"; turn: Color }
		| { s: "moveany"; turn: Color; piece: number }
		| { s: "jump"; turn: Color; piece: number }
		| { s: "winner"; winner: g.Player; reason: string };
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
			"649845887509725194",
		],
		arrows: {
			ul: "649845888675479552",
			ur: "649845888746913805",
			dl: "649845888486866944",
			dr: "649845890718105630",
		},
		done: "546938940389589002",
		join: "455896379210989568",
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

export const checkers = g.newGame<Checkers>({
	title: "checkers",
	help: "/help/fun/checkers",
	setup(players) {
		const u___ = {};
		const r = (n: number) => ({
			piece: { color: "r", number: n, king: false },
		});
		const b = (n: number) => ({
			piece: { color: "b", number: n, king: false },
		});
		const checkerPieces: Partial<Piece>[][] = [
			[u___, r(0), u___, u___, u___, b(0), u___, b(1)],
			[r(1), u___, r(2), u___, u___, u___, b(2), u___],
			[u___, r(3), u___, u___, u___, b(3), u___, b(4)],
			[r(4), u___, r(5), u___, u___, u___, b(5), u___],
			[u___, r(6), u___, u___, u___, b(6), u___, b(7)],
			[r(7), u___, r(8), u___, u___, u___, b(8), u___],
			[u___, r(9), u___, u___, u___, b(9), u___, b(10)],
			[r(10), u___, r(11), u___, u___, u___, b(11), u___],
		];

		const initialState: Checkers = {
			board: g.newBoard<Piece>(8, 8, (x, y) => {
				const base: Piece =
					x % 2 !== y % 2 ? { bg: "black" } : { bg: "white" };
				Object.assign(base, checkerPieces[y][x]);
				return base;
			}),
			players: { red: players[0], black: players[1] },
			status: { s: "turn", turn: "red" },
		};

		return initialState;
	},
	renderSetup() {
		return [
			{
				type: "once",
				actions: [
					...tileset.tiles.interaction.pieces,
					tileset.tiles.interaction.done,
				],
			},
			{
				type: "once",
				actions: Object.values(tileset.tiles.interaction.arrows),
			},
		];
	},
	render(state) {
		const mode = state.status;
		// in zig this could be an inline switch on a tagged union. formatting would be a bit harder though (would have to heap allocate a string probably and format to it and then defer free).
		const status1 =
			mode.s === "turn"
				? `<@${state.players[mode.turn].id}>'s turn (${
						tileset.tiles[mode.turn].blank
				  })`
				: mode.s === "moveany"
				? `<@${state.players[mode.turn].id}>'s turn (${
						tileset.tiles[mode.turn].blank
				  })`
				: mode.s === "jump"
				? ``
				: mode.s === "winner"
				? `<@${mode.winner.id}> won! (${mode.reason})`
				: "never.";
		const status2 =
			mode.s === "turn"
				? ``
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
				: "never.";
		const boardRender = state.board.render(tile => {
			if (tile.overlay) {
				if (tile.overlay.type === "move")
					return tileset.tiles.board.arrows[tile.overlay.direction];
				if (tile.overlay.type === "selpiece")
					return tileset.tiles[tile.overlay.color].selected;
			}
			if (tile.piece) {
				// if(tile.piece) |piece| if(piece.color) // every language should be like zigwinner
				if (mode.s !== "winner" && tile.piece.color === mode.turn) {
					if (mode.s === "moveany" || mode.s === "jump") {
						if (tile.piece.number === mode.piece) {
							return tileset.tiles[tile.piece.color].selected;
						}
					}
					return tileset.tiles[tile.piece.color].pieces[
						tile.piece.number
					];
				} else {
					if (tile.piece.king) {
						tileset.tiles[tile.piece.color].king;
					} else {
						return tileset.tiles[tile.piece.color].blank;
					}
				}
			}
			return tileset.tiles.board[tile.bg];
		});

		return [
			`**Checkers***
=== ${status1} ===
${boardRender}
=== ${status1} ===`,
			`=== ${status2} ===`,
		];
	},
	getMoves(state) {
		// once again this could be a tagged union switch in zig
		if (state.status.s === "winner") {
			return []; // never hopefully
		}
		const st = state.status;
		const jumpMoves: {
			number: number;
			from: [number, number];
			take: [number, number];
			to: [number, number];
			direction: [number, number];
		}[] = [];
		const normalMoves: {
			number: number;
			from: [number, number];
			to: [number, number];
			direction: [number, number];
		}[] = [];
		const piecesWithJumpMoves: typeof jumpMoves[] = [];
		const piecesWithNormalMoves: typeof normalMoves[] = [];
		const pieces = state.board.filter(t => t.piece?.color === st.turn);
		for (const piece of pieces) {
			for (const [dx, dy] of [
				[-1, -1],
				[-1, 1],
				[1, -1],
				[1, 1],
			]) {
				const [nx, ny] = [piece.x + dx, piece.y + dy];
				const normal = state.board.get(nx, ny);
				if (!normal) {
					continue;
				}
				if (normal.piece) {
					const [jx, jy] = [piece.x + 2 * dx, piece.y + 2 * dy];
					const jump = state.board.get(jx, jy);
					const pce = piece.tile.piece!;
					if (jump?.piece?.color !== st.turn) {
						const it: typeof jumpMoves[number] = {
							number: pce.number,
							from: [piece.x, piece.y],
							take: [nx, ny],
							to: [jx, jy],
							direction: [dx, dy],
						};
						jumpMoves.push(it);
						if (!piecesWithJumpMoves[pce.number])
							piecesWithJumpMoves[pce.number] = [];
						piecesWithJumpMoves[pce.number]!.push(it);
						continue;
					}
					const it: typeof normalMoves[number] = {
						number: piece.tile.piece!.number,
						from: [piece.x, piece.y],
						to: [nx, ny],
						direction: [dx, dy],
					};
					normalMoves.push(it);
					if (!piecesWithNormalMoves[pce.number])
						piecesWithNormalMoves[pce.number] = [];
					piecesWithNormalMoves[pce.number]!.push(it);
					continue;
				}
				continue;
			}
		}
		const clearOverlay = (state: Checkers) => {
			state.board.forEach(tile => {
				tile.overlay = undefined;
			});
		};
		const results: g.MoveSet<Checkers> = [];
		if (state.status.s === "turn" || state.status.s === "moveany") {
			if (piecesWithJumpMoves.length >= 1) {
				results.push(
					// it seems there should only be one jump move per direction
					// so instead of looping over jumpMoves, loop over piecesWithJumpMoves
					...piecesWithJumpMoves.map(
						(pwjm): g.Move<Checkers> => ({
							button:
								tileset.tiles.interaction.pieces[
									pwjm[0].number
								],
							player: state.players[st.turn],
							apply: state => {
								if (
									state.status.s === "jump" ||
									state.status.s === "winner"
								)
									return state;
								// clear overlay
								clearOverlay(state);
								const origst = state.status;
								// setup overlay
								for (const jm of pwjm) {
									const tile = state.board.get(
										jm.to[0],
										jm.to[1],
									)!;
									const dirst = directionToDirectionString([
										Math.sign(jm.to[0] - jm.from[0]),
										Math.sign(jm.to[1] - jm.from[1]),
									]);
									tile.overlay = {
										type: "move",
										direction: dirst,
									};
								}
								const player = state.board.get(
									...pwjm[0].from,
								)!;
								player.overlay = {
									type: "selpiece",
									color: player.piece!.color,
								};
								// set next status
								state.status = {
									s: "jump", // only jump from now until the turn ends
									turn: origst.turn,
									piece: pwjm[0].number,
								};
								return state;
							},
						}),
					),
				);
			} else {
				results.push(
					...piecesWithNormalMoves.map(
						(pwnm): g.Move<Checkers> => ({
							button:
								tileset.tiles.interaction.pieces[
									pwnm[0].number
								],
							player: state.players[st.turn],
							apply: state => {
								if (
									state.status.s === "jump" ||
									state.status.s === "winner"
								)
									return state;
								// clear overlay
								clearOverlay(state);
								const origst = state.status;
								// setup overlay
								for (const nm of pwnm) {
									const tile = state.board.get(
										nm.to[0],
										nm.to[1],
									)!;
									const dirst = directionToDirectionString([
										Math.sign(nm.to[0] - nm.from[0]),
										Math.sign(nm.to[1] - nm.from[1]),
									]);
									tile.overlay = {
										type: "move",
										direction: dirst,
									};
								}
								const player = state.board.get(
									...pwnm[0].from,
								)!;
								player.overlay = {
									type: "selpiece",
									color: player.piece!.color,
								};
								// set next status
								state.status = {
									s: "moveany",
									turn: origst.turn,
									piece: pwnm[0].number,
								};
								return state;
							},
						}),
					),
				);
			}
		}
		if (state.status.s === "moveany" || state.status.s === "jump") {
			const st = state.status;
			if (jumpMoves.length >= 1 || state.status.s === "jump") {
				const activePieces = jumpMoves.filter(
					move => move.number === st.piece,
				);
				if (!activePieces.length) throw new Error("never");
				results.push(
					...activePieces.map(
						(actv): g.Move<Checkers> => ({
							button:
								tileset.tiles.interaction.arrows[
									directionToDirectionString(actv.direction)
								],
							apply: state => {
								// clear overlay obviously
								clearOverlay(state);
								// perform jump
								const checker = state.board.get(...actv.from)!;
								const jumped = state.board.get(...actv.to)!;
								jumped.overlay = {
									type: "ghost",
									color: jumped.piece!.color,
								};
								jumped.piece = undefined;
								// set next status
								// if at end of line, end immediately
								// else set status to continue jumping
								todo;
								return state;
							},
							player: state.players[st.turn],
						}),
					),
				);
			} else {
				const activePieces = normalMoves.filter(
					move => move.number === st.piece,
				);
				if (!activePieces.length) throw new Error("never");
				results.push(
					...activePieces.map(
						(actv): g.Move<Checkers> => ({
							button:
								tileset.tiles.interaction.arrows[
									directionToDirectionString(actv.direction)
								],
							apply: state => {
								// perform move
								// set next status
								todo;
								return state;
							},
							player: state.players[st.turn],
						}),
					),
				);
			}
		}
		// IF CANNOT MOVE
		// if moveany|jump
		//  re-update
		// else-if turn
		//  request pass
		todo;
		return results;
	},
	checkGameOver(state) {
		return state.status.s === "winner";
	},
	timers: [
		{
			time: g.unit(3, "min"),

			message: state => {
				if (state.status.s === "winner") return "never.";
				const currentplayer = state.players[state.status.turn];
				const playercolor = tileset.tiles[state.status.turn].blank;
				return `<@${currentplayer.id}> (${playercolor}), it's your turn. 30s left.`;
			},
		},
		{
			time: g.unit(4, "min"),
			update: state => {
				if (state.status.s === "winner") return state;
				const currentplayer = state.players[state.status.turn];
				state.status = {
					s: "winner",
					reason: "Time out.",
					winner: currentplayer,
				};
				return state;
			},
		},
	],
});
