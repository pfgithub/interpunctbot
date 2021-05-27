import * as nr from "../../../NewRouter";
import {globalKnex} from "../../../db";
import client from "../../../../bot";
import Info, {permTheyCanManageRole, permWeCanManageRole} from "../../../Info";
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
} | {
    type: 3;
    label: string;
    style: 1;
    custom_id: string;
    options: {value: string; label: string}[];
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
                    button("boo_btn", "Boo!", "primary", {}),
				]),
                componentRow([
                    {type: 3, style: 1, label: "Down", custom_id: "dropdown", options: [
                        {value: "one", label: "One"},
                        {value: "two", label: "Two"},
                    ]},
                ]),
			],
		}});
	},
);

nr.ginteractionhandler["boo_btn"] = {
    async handle(info, custom_id) {
        if(info.raw_interaction) {
            await info.raw_interaction.replyHiddenHideCommand("👻");
        }
    }
};

type GameKind =
    | "TTT" // tic tac toe
    | "CG" // circlegame
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
	const [id] = await globalKnex!("games").insert({
        id: undefined,
        data: JSON.stringify(gd),
    }).returning("id");

    return numToGameID(id);
}
async function getGameData(game_id: GameID): Promise<GameData> {
    const res = await globalKnex!("games").where({id: gameIDToNum(game_id)});
    const rd = res[0].data;
    if(typeof rd !== "string") return rd;
    return JSON.parse(rd);
}

async function renderGame(info: Info, game_id: GameID) {
    const game_data = await getGameData(game_id);

    const api = client as any as ApiHolder;
    await api.api.channels(info.message.channel.id).messages.post<{data: SampleMessage}, unknown>({data:
        games[game_data.kind].render(game_data.state, game_id, game_data.kind, game_data.stage, info)
    });
}

interface Game<T> {
    render: (state: unknown, game_id: GameID, game_kind: GameKind, game_stage: number, info: Info) => SampleMessage;
    handleInteraction: (info: Info, custom_id: string) => Promise<InteractionHandled<T>>;
};

const TTTKeys = {
    joining: {join: "join", end: "end", join_anyway: "join_anyway"},
    playing: {give_up: "give_up"},
};
async function updateGameState<T>(info: Info, ikey: {game_id: GameID; kind: GameKind; stage: number}, state: T): Promise<InteractionHandled<T>> {
    // get new game data
    const upd_game_data: GameData = {kind: ikey.kind, stage: ikey.stage + 1, state: state};
    // 1: send updated message    
    
    const msgv = games[upd_game_data.kind].render(upd_game_data.state, ikey.game_id, upd_game_data.kind, upd_game_data.stage, info);
    if(info.raw_interaction) {
        await info.raw_interaction.sendRaw({
            type: 4,
            data: {...msgv, allowed_mentions: {parse: []}},
        });
    }else{
        await info.accept();
        const api = client as any as ApiHolder;
        await api.api.channels(info.message.channel.id).messages.post<{data: SampleMessage}, unknown>({data:
            msgv
        });
    }

    // 2: accept interaction
    // await info.accept();
    // TODO use interactions rather than info.accept()
    // 3: update in db
    await globalKnex!("games").where({id: gameIDToNum(ikey.game_id)}).update({data: JSON.stringify(upd_game_data)});
    // 4: delete original
    // TODO rather than deleting, what about patching the previous interaction
    // response and changing all the buttons to "disabled"?
    await info.message.delete();
    // return handle token
    return {__interaction_handled: true as unknown as T};
}
async function errorGame(info: Info, message: string): Promise<InteractionHandled<any>> {
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

const TTTGame: Game<TicTacToeState> = {
    render(state_in, game_id, game_kind, game_stage, info): SampleMessage {
        const state = state_in as TicTacToeState;

        const key = (name: string) => getInteractionKey(game_id, game_kind, game_stage, name);

        if(state.mode === "joining") {
            return {
                content: "<@"+state.first_player+"> is starting a game of Tic Tac Toe",
                components: [
                    componentRow([
                        button(key(TTTKeys.joining.join), "Join Game", "accept", {}),
                        button(key(TTTKeys.joining.end), "Cancel", "deny", {}),
                    ]),
                ],
            };
        }else if(state.mode === "playing" || state.mode === "won") {
            return {
                content: state.mode === "playing"
                    ? "It's your turn <@"+state.players[state.player]+">, You are "+state.player
                    : state.mode === "won"
                    ? state.win
                    ? (state.win.player === "Tie"
                    ? "There was a tie. ("+state.win.reason+"). "
                    : "<@"+state.players[state.win.player]+"> won!")
                    + " ("+state.win.reason+"). Players: X <@"+state.players.X+">, O: <@"+state.players.O+">"
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
            };
        }else if(state.mode === "canceled"){
            return {
                content: "Canceled game.",
                components: [],
            };
        }else{
            return {
                content: "Unsupported "+state.mode,
                components: [],
            };
        }
    },
    async handleInteraction(info, custom_id): Promise<InteractionHandled<TicTacToeState>> {
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
                                button(key(TTTKeys.joining.join_anyway), "Play against yourself", "secondary", {}),
                            ]),
                        ]);
                    }else{
                        await info.accept();
                    }
                    return {__interaction_handled: true as unknown as TicTacToeState};
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
        await renderGame(info, game_id);
	},
);

nr.ginteractionhandler["GRANTROLE"] = {
    async handle(info, custom_id) {
        const [, role_id] = custom_id.split("|");
        let adding_role = true;
        try {
            if(info.member!.roles.cache.has(role_id)) {
                adding_role = false;
                await info.member!.roles.remove(role_id);
            }else{
                await info.member!.roles.add(role_id);
            }
        }catch(e) {
            console.log(e);
            if(info.raw_interaction) {
                await info.raw_interaction.replyHiddenHideCommand("<:failure:508841130503438356> There was an error "+
                    (adding_role ? "giving you" : "removing")+" the role <@&"+role_id+">")
                ;
                return;
            }
        }
        if(info.raw_interaction) {
            await info.raw_interaction.replyHiddenHideCommand(
                (adding_role ? "<:success:508840840416854026> Given" : "<:info:508842207089000468> Removed")+" role <@&"+role_id+">"
            );
        }
        return;
    }
};

nr.globalCommand(
	"/help/test/grantrolebtn",
	"grantrolebtn",
	{
		usage: "grantrolebtn",
		description: "grantrolebtn `button text` <role>",
		examples: [],
		perms: {runner: ["manage_bot"]},
	},
	nr.list(nr.a.backtick(), ...nr.a.role()),
	async ([word, role], info) => {
        if(!await permTheyCanManageRole(role, info)) return;
        if(!await permWeCanManageRole(role, info)) return;

		const api = info.message.client as any as ApiHolder;
		await api.api.channels(info.message.channel.id).messages.post<{data: SampleMessage}, unknown>({data: {
			content: "​",
			components: [
				componentRow([
                    button("GRANTROLE|"+role.id, word, "primary", {}),
				]),
			],
		}});
	},
);

nr.globalCommand(
	"/help/test/createticketbtn",
	"createticketbtn",
	{
		usage: "createticketbtn",
		description: "createticketbtn `Ticket message`",
		examples: [],
		perms: {runner: ["manage_bot"]},
	},
	nr.list(nr.a.backtick()),
	async ([word], info) => {
		const api = info.message.client as any as ApiHolder;
		await api.api.channels(info.message.channel.id).messages.post<{data: SampleMessage}, unknown>({data: {
			content: "​",
			components: [
				componentRow([
                    button("CREATETICKET", word, "primary", {}),
				]),
			],
		}});
	},
);

type Circle = "O" | "X" | " ";
type CirclegameState = {
    mode: "joining",
    initiator: string,
} | {
    mode: "playing",
    over?: {
        winner: "O" | "X" | "Tie",
        reason: string,
    },
    lines: Circle[][],
    player: "O" | "X",
    players: {
        "O": string,
        "X": string,
    },
    // ooo! change the colors of the removed circles based on
    // who removed them! that'd be neat
} | {
    mode: "canceled",
} | {mode: "__never__"};
const CGKeys = {
    joining: {join: "join", end: "end", join_anyway: "join_anyway"},
    playing: {give_up: "give_up"},
};
const CGGame: Game<CirclegameState> = {
    render(state_in, game_id, game_kind, game_stage, info): SampleMessage {
        const state = state_in as CirclegameState;

        const key = (name: string) => getInteractionKey(game_id, game_kind, game_stage, name);

        if(state.mode === "joining") {
            return {
                content: "<@"+state.initiator+"> is starting a circle game",
                components: [
                    componentRow([
                        button(key(CGKeys.joining.join), "Join Game", "accept", {}),
                        button(key(CGKeys.joining.end), "Cancel", "deny", {}),
                    ]),
                ],
            };
        }else if(state.mode === "playing") {
            return {
                content: !state.over
                    ? "It's your turn <@"+state.players[state.player]+">, You are "+state.player+"\n"
                    + "Try to be the last player to take a circle."
                    : (state.over.winner === "Tie"
                    ? "There was a tie. ("+state.over.reason+"). "
                    : "<@"+state.players[state.over.winner]+"> won!")
                    + " ("+state.over.reason+"). Players: <@"+state.players.X+">, <@"+state.players.O+">",
                components: [
                    ...state.lines.map((yr, y) => {
                        const vc = yr.filter(itm => itm === " ").length;
                        return componentRow([
                            ...yr.map((tile, x) =>
                                button(key("C,"+(vc - x)+","+y), tile === " " ? "" + (vc - x) : " ",
                                    ({" ": "secondary", "X": "primary", "O": "accept"} as const)[tile],
                                    {disabled: tile === " " ? false : true},
                                ),
                            ),
                            ...y == 0 && !state.over ?
                            [
                                button(key(CGKeys.playing.give_up), "Give Up", "deny", {}),
                            ] : [],
                        ]);
                    }),
                ],
            };
        }else if(state.mode === "canceled") {
            return {
                content: "Canceled game.",
                components: [],
            };
        }else{
            return {
                content: "Unsupported "+state.mode,
                components: [],
            };
        }
    },
    async handleInteraction(info, custom_id): Promise<InteractionHandled<CirclegameState>> {
        const ikey = parseInteractionKey(custom_id);
        const game_state = await getGameData(ikey.game_id);
        const key = (name: string) => getInteractionKey(ikey.game_id, ikey.kind, ikey.stage, name);

        if(game_state.stage != ikey.stage) {
            return await errorGame(info, "This button is no longer active.");
        }
        const state = game_state.state as CirclegameState;

        console.log(game_state);

        if(state.mode === "joining") {
            if(ikey.name === CGKeys.joining.join || ikey.name === CGKeys.joining.join_anyway) {
                if(ikey.name !== CGKeys.joining.join_anyway && info.message.author.id === state.initiator) {
                    if(info.raw_interaction) {
                        await info.raw_interaction.replyHiddenHideCommand("You are already in the game.", [
                            componentRow([
                                button(key(CGKeys.joining.join_anyway), "Play against yourself", "secondary", {}),
                            ]),
                        ]);
                    }else{
                        await info.accept();
                    }
                    return {__interaction_handled: true as any};
                }else{
                    return await updateGameState<CirclegameState>(info, ikey, {
                        mode: "playing",
                        // initiator: state.first_player,
                        lines: [
                            [" "],
                            [" ", " "],
                            [" ", " ", " "],
                            [" ", " ", " ", " "],
                            [" ", " ", " ", " ", " "],
                        ],
                        player: "X",
                        players: {
                            "X": state.initiator,
                            "O": info.message.author.id,
                        },
                    });
                }
            }else if(ikey.name === CGKeys.joining.end) {
                if(info.message.author.id === state.initiator) {
                    return await updateGameState<CirclegameState>(info, ikey, {
                        mode: "canceled",
                    });
                }else{
                    return await errorGame(info, "Only <@"+state.initiator+"> can cancel.");
                }
            }else{
                return await errorGame(info, "Error! Unsupported "+ikey.name);
            }
        }else if(state.mode === "playing") {
            if(state.over) return await errorGame(info, "This game is over.");
            if(info.message.author.id !== state.players[state.player]) {
                if(!JSON.stringify(state.player).includes(info.message.author.id)) { // hack
                    return await errorGame(info, "You're not in this game");
                }
                return await errorGame(info, "It's not your turn");
            }
            if(ikey.name.startsWith("C,")) {
                const [, tc, ty] = ikey.name.split(",") as [string, string, string];

                const line = state.lines[+ty];
                let index = line.lastIndexOf(" ") + 1;
                for(let i = Math.max(0, index -+ tc); i < index; i++){
                    line[i] = state.player;
                }

                if(state.lines.every(line => line.lastIndexOf(" ") === -1)) {
                    return await updateGameState<CirclegameState>(info, ikey, {
                        ...state,
                        over: {
                            winner: state.player,
                            reason: "Took the last circle",
                        },
                    });
                }

                return await updateGameState<CirclegameState>(info, ikey, {
                    ...state,
                    player: advanceCGPlayer(state.player),
                });
                return await errorGame(info, "TODO: "+tc+", "+ty);
            }else if(ikey.name === CGKeys.playing.give_up) {
                return await updateGameState<CirclegameState>(info, ikey, {
                    ...state,
                    mode: "playing",
                    over: {
                        winner: advanceCGPlayer(state.player),
                        reason: "Other player gave up.",
                    },
                });
            }else{
                return await errorGame(info, "Error! Unsupported "+ikey.name);
            }
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
function advanceCGPlayer(player: "X" | "O"): "O" | "X" {
    return ({"X": "O", "O": "X"} as const)[player];
}

nr.globalCommand(
	"/help/test/circlegame2",
	"circlegame2",
	{
		usage: "circlegame2",
		description: "circlegame2",
		examples: [],
		perms: {},
	},
	nr.list(),
	async ([], info) => {
		const api = info.message.client as any as ApiHolder;

		const game_id = await createGame<CirclegameState>("CG", {mode: "joining", initiator: info.message.author.id});
        await renderGame(info, game_id);

        // const nums = [..."12345"];
        // const circles = new Array(5).fill(0).map((_, it) => it + 1);
		// await api.api.channels(info.message.channel.id).messages.post<{data: SampleMessage}, unknown>({data: {
		// 	content: "Circlegame. Try to be the last person to take a circle.",
		// 	components: circles.map(itm => new Array(itm).fill(0).map((_, it, ar) => ar.length - it)).map(q => {
        //         return componentRow(q.map(r => button("boo_btn", "" + nums[r - 1], "primary", {})));
        //     }),
		// }});
	},
);
nr.globalCommand(
	"/help/test/papersoccer2",
	"papersoccer2",
	{
		usage: "papersoccer2",
		description: "papersoccer2",
		examples: [],
		perms: {},
	},
	nr.list(),
	async ([], info) => {
		const api = info.message.client as any as ApiHolder;

        // const nums = [..."12345"];
        // const circles = new Array(5).fill(0).map((_, it) => it + 1);
		await api.api.channels(info.message.channel.id).messages.post<{data: SampleMessage}, unknown>({data: {
			content: "Papersoccer. TODO",
			components: [[..."↖↑↗"], [..."← →"], [..."↙↓↘"]].map(itm => 
                componentRow(itm.map(v => button("todo", v, "secondary", {disabled: v === " "}))),
            ),
            // oh and it can even show which directions are valid w/ disabled
		}});
	},
);

const games: {[key in GameKind]: Game<unknown>} = {
    "TTT": TTTGame,
    "CG": CGGame,
};