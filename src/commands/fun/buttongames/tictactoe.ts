import * as nr from "../../../NewRouter";
import {globalKnex} from "../../../db";
import client from "../../../../bot";
import Info from "../../../Info";
import { InteractionHandled } from "../../../SlashCommandManager";
import { globalConfig } from "../../../config";

type ApiHandler = {
    get: <T>() => Promise<T>;
    post: <T, Q>(value: T) => Promise<Q>;
    patch: (value: any) => Promise<any>;
    delete: () => Promise<any>;
} & {[key: string]: ApiHandler} & ((...data: any[]) => ApiHandler);

type ApiHolder = {api: ApiHandler};

type ButtonComponent = {
	type: 2;
	style: 1 | 2 | 3 | 4; // primary, primary (green), secondary, destructive (red)
	label?: string;
	custom_id: string; // max 100 chars
	disabled?: boolean;
	emoji?: {name: string; id: string; animated: boolean};
} | {
	type: 2;
	style: 5; // URL
	label: string;
	url: string;
	disabled: boolean;
};

const buttonStyles = {
	primary: 1,
	secondary: 2,
	accept: 3,
	deny: 4,
} as const;
type ButtonStyle = keyof typeof buttonStyles;

type ExtraButtonOpts = {
	disabled?: boolean;
	emoji?: {name: string; id: string; animated: boolean};
};

function button(id: string, label: string | undefined, style: ButtonStyle, opts: ExtraButtonOpts): ButtonComponent {
	if(id.length > 100) throw new Error("bad id");
	return {
		type: 2,
		style: buttonStyles[style],
		label: label,
		custom_id: id,
		...opts,
	};
}

type ActionRow = {type: 1; components: ButtonComponent[]};
function componentRow(children: ButtonComponent[]): ActionRow {
    if(children.length > 5) throw new Error("too many buttons");
	return {type: 1, components: children};
}

type SampleMessage = {
	content: string;
	components: ActionRow[];
};

nr.globalCommand(
	"/help/test/spooky",
	"spooky",
	{
		usage: "spooky",
		description: "spooky",
		examples: [],
		perms: {},
	},
	nr.list(),
	async ([], info) => {
		const api = info.message.client as any as ApiHolder;
		await api.api.channels(info.message.channel.id).messages.post<{data: SampleMessage}, unknown>({data: {
			content: "spooky",
			components: [
				componentRow([
					button("boo_btn", "👻 Boo!", "primary", {}),
				]),
			],
		}});
	},
);

type GameKind =
    | "TTT" // tic tac toe
;

type GameData = {
    kind: GameKind;
    state: unknown;
    stage: number;
};

type GameID = string & {__is_game_id?: undefined};
function numToGameID(num: number): GameID {
    return num.toString(36) as GameID;
}
function gameIDToNum(game_id: GameID): number {
    return parseInt(game_id, 36);
}

type InteractionKey = `GAME|${GameID}|${GameKind}|${number}|${string}`; // ID|KIND|STAGE|NAME
function getInteractionKey(id: GameID, kind: GameKind, stage: number, name: string): InteractionKey {
    //eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const res: InteractionKey = `GAME|${id}|${kind}|${stage}|${name}`;
    if(res.length > 100) throw new Error("interaction key too long");
    return res;
}
function parseInteractionKey(key: InteractionKey): {game_id: GameID; kind: GameKind; stage: number; name: string} {
    const [, a, b, c, d] = key.split("|") as [string, string, string, string, string];
    return {
        game_id: a as GameID,
        kind: b as GameKind,
        stage: +c,
        name: d,
    };
}

async function createGame<T>(game_kind: GameKind, game_state: T) {
    const gd: GameData = {
        kind: game_kind,
        state: game_state,
        stage: 0,
    };
	const res = await globalKnex!("games").insert({
        id: undefined,
        data: JSON.stringify(gd),
    });
    const id = res[0]!;

    return numToGameID(id);
}
async function getGameData(game_id: GameID): Promise<GameData> {
    const res = await globalKnex!("games").where({id: gameIDToNum(game_id)});
    return JSON.parse(res[0].data);
}

async function renderGame(channel_id: string, game_id: GameID) {
    const game_data = await getGameData(game_id);
    await games[game_data.kind].render(game_data.state, channel_id, game_id, game_data.kind, game_data.stage);
}

interface Game {
    render: (state: unknown, channel_id: string, game_id: GameID, game_kind: GameKind, game_stage: number) => Promise<void>;
    handleInteraction: (info: Info, custom_id: string) => Promise<InteractionHandled>;
};

const TTTKeys = {
    joining: {join: "join", end: "end", join_anyway: "join_anyway"},
    playing: {give_up: "give_up"},
};
async function updateGameState<T>(info: Info, ikey: {game_id: GameID; kind: GameKind; stage: number}, state: T): Promise<InteractionHandled> {
    // get new game data
    const upd_game_data: GameData = {kind: ikey.kind, stage: ikey.stage + 1, state: state};
    // 1: send updated message
    await games[upd_game_data.kind].render(upd_game_data.state, info.message.channel.id, ikey.game_id, upd_game_data.kind, upd_game_data.stage);
    // 2: accept interaction
    await info.accept();
    // TODO use interactions rather than info.accept()
    // 3: update in db
    await globalKnex!("games").where({id: gameIDToNum(ikey.game_id)}).update({data: JSON.stringify(upd_game_data)});
    // 4: delete original
    // TODO rather than deleting, what about patching the previous interaction
    // response and changing all the buttons to "disabled"?
    await info.message.delete();
    // return handle token
    return {__interaction_handled: true};
}
async function errorGame(info: Info, message: string): Promise<InteractionHandled> {
    await info.error(message);
    return {__interaction_handled: true};
}

type Grid<T> = T[][];

type TicTacToeState = {
	mode: "joining";
	first_player: string;
} | {
	mode: "playing" | "won";
	board: {grid: Grid<" " | "O" | "X">};
	player: "O" | "X";
	players: {
		"O": string;
		"X": string;
	};
    win?: {
        player: "X" | "O" | "Tie",
        reason: string,
    },
} | {
    mode: "canceled",
    initiator: string;
};
function gridSearch<GT>(grid: Grid<GT>, start: [number, number],
    cb: (
        tile: GT,
        x: number,
        y: number,
    ) => [number, number] | "current" | "previous",
): { x: number; y: number; distance: number } | undefined {
    let [cx, cy] = start;
    let [x, y] = start;
    const w = grid[0]!.length;
    const h = grid.length;
    let i = 0;
    while (true) {
        if (i > 1000)
            throw new Error("Potentially infinite find!:(passed 1000)");
        const result =
            cx >= w || cx < 0 || cy >= h || cy < 0
                ? "previous" // search will now automatically end when off board
                : cb(grid[cy][cx], cx, cy);
        if (result === "previous")
            if (i === 0) return undefined;
            else return { x, y, distance: i };
        [x, y] = [cx, cy];
        i++;
        if (result === "current") return { x, y, distance: i };
        [cx, cy] = result;
    }
}
function tttDetectWin(grid: Grid<" " | "O" | "X">, placedX: number, placedY: number): boolean {
	const checks: [number, number][] = [
		[-1, -1],
		[-1, 0],
		[-1, 1],
		[0, -1],
	];
	const tile = grid[placedY][placedX];
	if (tile === " ") throw new Error("checkWin called at invalid location");
	for (const check of checks) {
		const downmost = gridSearch(grid,
			[placedX, placedY],
			(tileh, x, y) => {
				if (tileh !== tile) return "previous";
				return [x + check[0], y + check[1]];
			},
		);
		if (!downmost) throw new Error("tile was not found but it must be");
		const upmost = gridSearch(grid,
			[downmost.x, downmost.y],
			(tileh, x, y) => {
				if (tileh !== tile) return "previous";
				return [x - check[0], y - check[1]];
			},
		);
		if (!upmost) throw new Error("tile was not found but it must be 2");
		if (upmost.distance >= 3) return true;
	}
	return false;
}
function tttDetectTie(grid: Grid<" " | "O" | "X">): boolean {
    return grid.every(l => l.every(t => t !== " "));
}

const TTTGame: Game = {
    async render(state_in, channel_id, game_id, game_kind, game_stage) {
        const state = state_in as TicTacToeState;
		const api = client as any as ApiHolder;

        const key = (name: string) => getInteractionKey(game_id, game_kind, game_stage, name);

        if(state.mode === "joining") {
            await api.api.channels(channel_id).messages.post<{data: SampleMessage}, unknown>({data: {
                content: "<@"+state.first_player+"> is starting a game of Tic Tac Toe",
                components: [
                    componentRow([
                        button(key(TTTKeys.joining.join), "Join Game", "accept", {}),
                        button(key(TTTKeys.joining.end), "Cancel", "deny", {}),
                    ]),
                ],
            }});
        }else if(state.mode === "playing" || state.mode === "won") {
            await api.api.channels(channel_id).messages.post<{data: SampleMessage}, unknown>({data: {
                content: state.mode === "playing"
                    ? "It's your turn <@"+state.players[state.player]+">, You are "+state.player
                    : state.mode === "won"
                    ? state.win
                    ? state.win.player === "Tie"
                    ? "There was a tie. ("+state.win.reason+")"
                    : "<@"+state.players[state.win.player]+"> won! ("+state.win.reason+"). Players: X <@"+state.players.X+">, O: <@"+state.players.O+">"
                    : "Someone won but I'm not sure who."
                    : "never",
                components: [
                    ...state.board.grid.map((yr, y) => componentRow(
                        yr.map((tile, x) =>
                            button(key("T,"+x+","+y), tile, ({" ": "secondary", "X": "primary", "O": "accept"} as const)[tile], {}),
                        )
                    )),
                    ...state.mode === "playing" ?
                    [componentRow([
                        button(key(TTTKeys.playing.give_up), "Give Up", "deny", {}),
                    ])] : [],
                ],
            }});
        }else if(state.mode === "canceled"){
            await api.api.channels(channel_id).messages.post<{data: SampleMessage}, unknown>({data: {
                content: "Canceled game.",
                components: [],
            }});
        }else{
            await api.api.channels(channel_id).messages.post<{data: SampleMessage}, unknown>({data: {
                content: "Unsupported "+state.mode,
                components: [],
            }});
        }
    },
    async handleInteraction(info, custom_id): Promise<InteractionHandled> {
        const ikey = parseInteractionKey(custom_id);
        const game_state = await getGameData(ikey.game_id);
        const key = (name: string) => getInteractionKey(ikey.game_id, ikey.kind, ikey.stage, name);

        if(game_state.stage != ikey.stage) {
            return await errorGame(info, "This button is no longer active.");
        }
        const state = game_state.state as TicTacToeState;

        console.log(game_state);

        if(state.mode === "joining") {
            if(ikey.name === TTTKeys.joining.join || ikey.name === TTTKeys.joining.join_anyway) {
                if(ikey.name !== TTTKeys.joining.join_anyway && info.message.author.id === state.first_player) {
                    if(info.raw_interaction) {
                        await info.raw_interaction.replyHiddenHideCommand("You are already in the game.", [
                            componentRow([
                                button(key(TTTKeys.joining.join_anyway), "Play by yourself", "secondary", {}),
                            ]),
                        ]);
                    }else{
                        await info.accept();
                    }
                    return {__interaction_handled: true};
                }else{
                    return await updateGameState<TicTacToeState>(info, ikey, {
                        mode: "playing",
                        // initiator: state.first_player,
                        board: {grid:
                            [
                                [" ", " ", " "],
                                [" ", " ", " "],
                                [" ", " ", " "],
                            ]
                        },
                        player: "X",
                        players: {
                            "X": state.first_player,
                            "O": info.message.author.id,
                        },
                    });
                }
            }else if(ikey.name === TTTKeys.joining.end) {
                if(info.message.author.id === state.first_player) {
                    return await updateGameState<TicTacToeState>(info, ikey, {
                        mode: "canceled",
                        initiator: state.first_player,
                    });
                }else{
                    return await errorGame(info, "Only <@"+state.first_player+"> can cancel.");
                }
            }else{
                return await errorGame(info, "Error! Unsupported "+ikey.name);
            }
        }else if(state.mode === "playing") {
            if(info.message.author.id !== state.players[state.player]) {
                if(!JSON.stringify(state.player).includes(info.message.author.id)) { // hack
                    return await errorGame(info, "You're not in this game");
                }
                return await errorGame(info, "It's not your turn");
            }
            if(ikey.name.startsWith("T,")) {
                const [, tx, ty] = ikey.name.split(",") as [string, string, string];
                if(state.board.grid[+ty]![+tx] !== " ") return await errorGame(info, "You must click an empty tile");
                state.board.grid[+ty]![+tx] = state.player;
                if(tttDetectWin(state.board.grid, +tx, +ty)) {
                    return await updateGameState<TicTacToeState>(info, ikey, {
                        ...state,
                        mode: "won",
                        win: {
                            player: state.player,
                            reason: "Three in a row",
                        },
                    });
                }else if(tttDetectTie(state.board.grid)) {
                    return await updateGameState<TicTacToeState>(info, ikey, {
                        ...state,
                        mode: "won",
                        win: {
                            player: "Tie",
                            reason: "All spaces filled",
                        },
                    });
                }
                return await updateGameState<TicTacToeState>(info, ikey, {
                    ...state,
                    mode: "playing",
                    player: advanceTTTPlayer(state.player),
                });
            }else if(ikey.name === TTTKeys.playing.give_up) {
                return await updateGameState<TicTacToeState>(info, ikey, {
                    ...state,
                    mode: "won",
                    win: {
                        player: advanceTTTPlayer(state.player),
                        reason: "Other player gave up.",
                    },
                });
            }else{
                return await errorGame(info, "Error! Unsupported "+ikey.name);
            }
        }else if(state.mode === "won") {
            return await errorGame(info, "This game is over.");
        }else if(state.mode === "canceled") {
            return await errorGame(info, "This game was not started.");
        }else{
            return await errorGame(info, "TODO support "+state.mode);
        }

        // if(info.raw_interaction) {
        //     await info.raw_interaction.replyHiddenHideCommand("Interaction "+custom_id);
        // }

        // if(info.raw_interaction) {
        //     await info.raw_interaction.accept();
        // }
    }
};
function advanceTTTPlayer(player: "X" | "O"): "O" | "X" {
    return ({"X": "O", "O": "X"} as const)[player];
}

nr.ginteractionhandler["GAME"] = {
    async handle(info, custom_id) {
        const ikey = parseInteractionKey(custom_id);
        await games[ikey.kind].handleInteraction(info, custom_id);
    }
};

const games: {[key in GameKind]: Game} = {
    "TTT": TTTGame,
};

nr.globalCommand(
	"/help/test/ttt2",
	"ttt2",
	{
		usage: "ttt2",
		description: "ttt2",
		examples: [],
		perms: {},
	},
	nr.list(),
	async ([], info) => {
		const game_id = await createGame<TicTacToeState>("TTT", {mode: "joining", first_player: info.message.author.id});
        await renderGame(info.message.channel.id, game_id);
        
		// renderTicTacToe(game_id);

		// const api = info.message.client as any as ApiHolder;
		// await api.api.channels(info.message.channel.id).messages.post<{data: SampleMessage}, unknown>({data: {
		// 	content: "<@341076015663153153>, You are X",
		// 	components: [
		// 		componentRow([
		// 			button("ttt_1", " ", "secondary", {}),
		// 			button("ttt_1", "O", "accept", {}),
		// 			button("ttt_1", " ", "secondary", {}),
		// 		]),
		// 		componentRow([
		// 			button("ttt_1", "X", "primary", {}),
		// 			button("ttt_1", "X", "primary", {}),
		// 			button("ttt_1", " ", "secondary", {}),
		// 		]),
		// 		componentRow([
		// 			button("ttt_1", "O", "accept", {}),
		// 			button("ttt_1", "X", "primary", {}),
		// 			button("ttt_1", " ", "secondary", {}),
		// 		]),
		// 		componentRow([
		// 			button("ttt_1", "Give Up", "deny", {}),
		// 		]),
		// 	],
		// }});
	},
);
