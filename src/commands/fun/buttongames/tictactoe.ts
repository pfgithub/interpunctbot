import * as nr from "../../../NewRouter";
import {globalKnex} from "../../../db";
import client from "../../../../bot";
import Info, {permTheyCanManageRole, permWeCanManageRole} from "../../../Info";
import { InteractionHandled, InteractionHelper } from "../../../SlashCommandManager";
import { assertNever, perr } from "../../../..";
import { clearRequest, requestInput2, ResponseType } from "../../../RequestManager";
import { shortenLink } from "../../fun";
import * as discord from "discord.js";

nr.addDocsWebPage(
	"/help/buttons",
	"Buttons",
	"buttons",
	`{Title|Games}\n\n{Interpunct} can help you create buttons to give people roles
and other things.

{CmdSummary|grantrolebtn}
{CmdSummary|newpanel}
{CmdSummary|editpanel}
{CmdSummary|sendpanel}

`,
);

// FILE TODO:
// the id arg for making a button should accept a distinct "button key" type
// everything should be migrated to the new system
// maybe: the new system could be changed to allow "overlays"? like
//   basically react hooks. those are scary though, it's easy to
//   break states across updates.
// test. these uis are possible to test because they have identifiers
//   for every button. just have to move stuff away from using info
//   directly and towards using proper non-hacky abstractions.

const BasicKeys = {
	rules: "rules",
	joining: {join: "join", end: "end", join_anyway: "join_anyway"},
	playing: {give_up: "give_up"},
};

type ApiHandler = {
    get: <T>() => Promise<T>,
    post: <T, Q>(value: T) => Promise<Q>,
    patch: (value: any) => Promise<any>,
    delete: () => Promise<any>,
} & {[key: string]: ApiHandler} & ((...data: any[]) => ApiHandler);

type ApiHolder = {api: ApiHandler};

// type ActionButtonComponent = {
// 	type: 2,
// 	style: 1 | 2 | 3 | 4, // primary, primary (green), secondary, destructive (red)
// 	label?: string,
// 	custom_id: string, // max 100 chars
// 	disabled?: boolean,
// 	emoji?: {name: string, id: string, animated: boolean},
// };
// type LinkButtonComponent = {
// 	type: 2,
// 	style: 5, // URL
// 	label: string,
// 	url: string,
// 	disabled: boolean,
// };
export type ButtonComponent = {
	type: 2,
	style: 1 | 2 | 3 | 4 | 5, // primary, primary (green), secondary, destructive (red), URL
	label?: string,
	custom_id?: string,
	url?: string,
	disabled?: boolean,
} | {
    type: 3,
    label: string,
    style: 1,
    custom_id: string,
    options: {value: string, label: string}[],
};

export const buttonStyles = {
	primary: 1,
	secondary: 2,
	accept: 3,
	deny: 4,
} as const;
export type ButtonStyle = keyof typeof buttonStyles;

type ExtraButtonOpts = {
	disabled?: boolean,
	emoji?: {name: string, id: string, animated: boolean},
};

export function button(id: string, label: string | undefined, style: ButtonStyle, opts: ExtraButtonOpts): ButtonComponent {
	if(id.length > 100) throw new Error("bad id");
	return {
		type: 2,
		style: buttonStyles[style],
		label: label,
		custom_id: id,
		...opts,
	};
}

export type ActionRow = {type: 1, components: ButtonComponent[]};
export function componentRow(children: ButtonComponent[]): ActionRow {
	if(children.length > 5) throw new Error("too many buttons");
	return {type: 1, components: children};
}

export type SampleMessage = {
	content: string,
	components: ActionRow[],
    allowed_mentions: {parse: []},
	embeds: {
		title: string,
		description: string,
		url?: string,
		color: 0x2F3136,
		timestamp?: string,
		footer?: {icon_url: string, text: string},
		thumbnail?: {url: string},
		image?: {url: string},
		author?: {name: string, url: string, icon_url: string},
		fields?: {name: string, value: string, inline?: boolean}[],
	}[],
};
export type RenderActionButtonActionCallbackOpt<T> = (author_id: string, info: Info, ikey: IKey) => HandleInteractionResponse<T> | undefined;
export type RenderActionButtonActionCallback<T> = (author_id: string, info: Info, ikey: IKey) => HandleInteractionResponse<T>;
export type RenderActionButtonAction<T> = {
	kind: "callback",
	id: string,
	cb: RenderActionButtonActionCallback<T>,
} | {
	kind: "link",
	url: string,
} | {
	kind: "none",
};
export type RenderActionButton<T> = {
	label: string,
	color: ButtonStyle,
	action: RenderActionButtonAction<T>,
	emoji?: {id: string, name?: string, animated?: boolean},
	disabled?: boolean,
};
export type RenderActionRow<T> = RenderActionButton<T>[];
export type RenderResult<T> = {
	content: string,
	components: RenderActionRow<T>[],
    allowed_mentions: {parse: []},
	embeds: {
		title: string,
		description: string,
		url?: string,
		color: 0x2F3136,
		timestamp?: string,
		footer?: {icon_url: string, text: string},
		thumbnail?: {url: string},
		image?: {url: string},
		author?: {name: string, url: string, icon_url: string},
		fields?: {name: string, value: string, inline?: boolean}[],
	}[],
};

// if we want to, it's possible to allow multipart things
// like you call the callback multiple times. so for an overlay. like you call the root callback, find the button
// it's in, call that callback, find that button, … repeat

export function renderResultToHandledInteraction<T>(rr: RenderResult<T>, hia: HandleInteractionOpts<T>): HandleInteractionResponse<T> {
	const callbacks = new Map<string, RenderActionButtonActionCallback<T>>();

	rr.components.forEach(component => component.forEach(itm => {
		if(itm.action.kind === "callback") {
			const pv = callbacks.get(itm.action.id);
			if(pv && pv !== itm.action.cb) {
				throw new Error("Duplicate key "+itm.action.id+" with different handler.");
			}
			callbacks.set(itm.action.id, itm.action.cb);
		}
	}));

	if(hia.key_name === "*RELOAD*") {
		clearRequest(hia.author_id);
		return {kind: "update_state", state: hia.state};
	}
	const cb_v = callbacks.get(hia.key_name);
	if(!cb_v) {
		if(hia.key_name !== BasicKeys.joining.join_anyway) console.log("Key missing: "+hia.key_name+", reloading panel.");
		return {kind: "update_state", state: hia.state};
	}

	return cb_v(hia.author_id, hia.info, hia.ikey);
}

export function renderResultToResult(rr: RenderResult<unknown>, key: (a: string) => string): SampleMessage {
	const keys = new Map<string, RenderActionButtonActionCallback<unknown>>();
	return {
		...rr,
		components: rr.components.map(component => componentRow(component.map(itm => {
			if(itm.action.kind === "callback") {
				const pv = keys.get(itm.action.id);
				if(pv && pv !== itm.action.cb) {
					throw new Error("Duplicate key "+itm.action.id+" with different handler.");
				}
				if(itm.action.id.includes("|")) throw new Error("keys cannot contain `|`");
				keys.set(itm.action.id, itm.action.cb);
			}
			return {
				type: 2,
				style: itm.action.kind === "link" ? 5 : buttonStyles[itm.color],
				url: itm.action.kind === "link" ? itm.action.url : undefined,
				label: itm.label.length > 80 ? itm.label.substr(0, 79) + "…" : itm.label || "\u200B",
				custom_id: itm.action.kind === "callback" ? key(itm.action.id) : itm.action.kind === "link" ? undefined : "NONE",
				disabled: itm.disabled,
				emoji: itm.emoji,
			} as any;
		}))),
	};
}

nr.globalCommand(
	"/help/test/spooky",
	"spooky",
	{
		usage: "spooky",
		description: "spooky",
		examples: [],
		perms: {fun: true},
	},
	nr.list(),
	async ([], info) => {
		const api = info.message.client as any as ApiHolder;
		await api.api.channels(info.message.channel.id).messages.post<{data: SampleMessage}, unknown>({data: {
			content: "spooky",
			embeds: [],
			components: [
				componentRow([
					button("boo_btn", "Boo!", "primary", {}),
				]),
			],
			allowed_mentions: {parse: []},
		}});
	},
);

nr.ginteractionhandler["boo_btn"] = {
	async handle(info, custom_id) {
		if(info.raw_interaction) {
			await info.raw_interaction.replyHiddenHideCommand("👻", [
				componentRow([
					{type: 3, style: 1, label: "Down", custom_id: "dropdown", options: [
						{value: "one", label: "One"},
						{value: "two", label: "Two"},
					]},
				])
			]);
		}
	}
};

nr.globalCommand(
	"/help/test/help2",
	"help2",
	{
		usage: "help2",
		description: "help2",
		examples: [],
		perms: {fun: true},
	},
	nr.list(),
	async ([], info) => {
		const api = info.message.client as any as ApiHolder;
		await api.api.channels(info.message.channel.id).messages.post<{data: SampleMessage}, unknown>({data: {
			content: "help2",
			embeds: [],
			components: [
				componentRow([
					button("NONE", "Configuration", "secondary", {}),
					button("NONE", "Games", "secondary", {}),
					button("NONE", "Tickets", "secondary", {}),
					button("NONE", "Emoji", "secondary", {}),
					button("NONE", "Messages", "secondary", {}),
				]),
				componentRow([
					button("NONE", "Channels", "secondary", {}),
					button("NONE", "Administration", "secondary", {}),
					button("NONE", "Custom Commands", "secondary", {}),
					button("NONE", "Log", "secondary", {}),
					button("NONE", "Fun", "secondary", {}),
				]),
				componentRow([
					button("NONE", "speedrun.com", "secondary", {}),
					button("NONE", "Quickrank", "secondary", {}),
					button("NONE", "Autodelete", "secondary", {}),
				]),
				componentRow([
					{
						type: 2,
						style: 5,
						label: "Full Help",
						url: "https://interpunct.info/help",
						disabled: false,
					},
				]),
			],
			allowed_mentions: {parse: []},
		}});
	},
);

type GameData = {
    kind: GameKind,
    state: unknown,
    stage: number,
};

type GameID = string & {__is_game_id?: undefined};
function numToGameID(num: number): GameID {
	return (num.toString(36) as GameID).padStart(7, "0");
}
function gameIDToNum(game_id: GameID): number {
	return parseInt(game_id, 36);
}

// type InteractionKey = `GAME|${GameID}|${GameKind}|${number}|${string}`; // ID|KIND|STAGE|NAME
type InteractionKey = string; // some things don't like the above type
export function getInteractionKey(id: GameID, kind: GameKind, stage: number, name: string): InteractionKey {
	//eslint-disable-next-line @typescript-eslint/restrict-template-expressions
	const res: InteractionKey = `GAME|${id}|${kind}|${stage}|${name}`;
	if(res.length > 100) throw new Error("interaction key too long");
	return res;
}
function parseInteractionKey(key: InteractionKey): {game_id: GameID, kind: GameKind, stage: number, name: string} {
	const [, a, b, c, d] = key.split("|") as [string, string, string, string, string];
	return {
		game_id: a as GameID,
		kind: b as GameKind,
		stage: +c,
		name: d,
	};
}

async function createGame<T>(game: Game<T>, state: T) {
	const gd: GameData = {
		kind: game.kind,
		state: state,
		stage: 0,
	};
	const [id] = await globalKnex!("games").insert({
		id: undefined,
		data: JSON.stringify(gd),
	}).returning("id") as [number];

	return numToGameID(id);
}
async function getGameData(game_id: GameID): Promise<GameData> {
	const res = await globalKnex!("games").where({id: gameIDToNum(game_id)}) as [{data: string | GameData}];
	const rd = res[0].data;
	if(typeof rd !== "string") return rd;
	return JSON.parse(rd) as GameData;
}

async function renderGame(info: Info, game_id: GameID) {
	const game_data = await getGameData(game_id);

	const api = client as any as ApiHolder;
	const key = (name: string) => getInteractionKey(game_id, game_data.kind, game_data.stage, name);
	await api.api.channels(info.message.channel.id).messages.post<{data: SampleMessage}, unknown>({data:
        games[game_data.kind].render(game_data.state, key, info),
	});
}

export type HandleInteractionResponse<T> = {
	// InteractionHandled<T>
	kind: "update_state",
	state: T,
} | {
	kind: "error",
	msg: string,
} | {
	kind: "other",
	handler: (info: Info) => Promise<void>,
} | {
	kind: "async",
	handler: (info: Info) => Promise<HandleInteractionResponse<T>>,
} | {
	kind: "reply_hidden",
	response: SampleMessage,
} | {
	kind: "replace_content",
	content: SampleMessage,
};

export type CreateOpts = {author_id: string};
type HandleInteractionOpts<T> = {state: T, key_name: string, author_id: string, info: Info, ikey: IKey};
export interface Game<T> {
	kind: GameKind;
	// init: (opts: CreateOpts) => T;
    render: (state: T, key: (a: string) => string, info: Info) => SampleMessage;
    handleInteraction: (opts: HandleInteractionOpts<T>) => HandleInteractionResponse<T>;
}
export interface GameInit<T, O extends unknown[]> {
	init: (...args: O) => T;
}

// TODO rather than incrementing stage, generate a random id
// this will prevent a race condition when two buttons are clicked
// at the same time and both fetch from the db before the db is updated by either.
// actually it shouldn't matter too much, the only invalid state will be in what buttons are
// visible and that's fine

export type IKey = {game_id: GameID, kind: GameKind, stage: number};
export async function updateGameState<T>(info: Info, ikey: IKey,
	state: T, opts: {edit_original?: InteractionHelper} = {},
): Promise<InteractionHandled<T>> {
	// get new game data
	const upd_game_data: GameData = {kind: ikey.kind, stage: ikey.stage + 1, state: state};
	// 1: send updated message    
    
	const key = (name: string) => getInteractionKey(ikey.game_id, upd_game_data.kind, upd_game_data.stage, name);
	const msgv = games[upd_game_data.kind].render(upd_game_data.state, key, info);
	if(opts.edit_original) {
		await opts.edit_original.editOriginal({
			...msgv, allowed_mentions: {parse: []},
		});
	}else if(info.raw_interaction) {
		await info.raw_interaction.sendRaw({
			type: 7,
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
	// return handle token
	return {__interaction_handled: true as unknown as T};
}
async function errorGame(info: Info, message: string): Promise<InteractionHandled<any>> {
	await info.error(message);
	return {__interaction_handled: true};
}

type Grid<T> = T[][];

type TicTacToeState = {
	mode: "joining",
	first_player: string,
} | {
	mode: "playing" | "won",
	board: {grid: Grid<" " | "O" | "X">},
	player: "O" | "X",
	players: {
		"O": string,
		"X": string,
	},
    win?: {
        player: "X" | "O" | "Tie",
        reason: string,
    },
} | {
    mode: "canceled",
    initiator: string,
};
function gridSearch<GT>(grid: Grid<GT>, start: [number, number],
	cb: (
        tile: GT,
        x: number,
        y: number,
    ) => [number, number] | "current" | "previous",
): { x: number, y: number, distance: number } | undefined {
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

const TTTGame: Game<TicTacToeState> & GameInit<TicTacToeState, [CreateOpts]> = {
	kind: "TTT",
	init({author_id}): TicTacToeState {
		return {mode: "joining", first_player: author_id};
	},
	render(state, key, info): SampleMessage {
		if(state.mode === "joining") {
			return {
				content: "<@"+state.first_player+"> is starting a game of Tic Tac Toe",
				embeds: [],
				components: [
					componentRow([
						button(key(BasicKeys.joining.join), "Join Game", "accept", {}),
						button(key(BasicKeys.joining.end), "Cancel", "deny", {}),
					]),
				],
				allowed_mentions: {parse: []},
			};
		}else if(state.mode === "playing" || state.mode === "won") {
			return {
				content: state.mode === "playing"
					? "It's your turn <@"+state.players[state.player]+">, You are "+state.player
					: state.mode === "won"
					? state.win
					? (state.win.player === "Tie"
					? "There was a tie. "
					: "<@"+state.players[state.win.player]+"> won!")
					+ " ("+state.win.reason+"). Players: X <@"+state.players.X+">, O: <@"+state.players.O+">"
					: "Someone won but I'm not sure who."
					: "never",
				embeds: [],
				components: [
					...state.board.grid.map((yr, y) => componentRow(
						yr.map((tile, x) =>
							button(key("T,"+x+","+y), tile, ({" ": "secondary", "X": "primary", "O": "accept"} as const)[tile], {}),
						)
					)),
					...state.mode === "playing" ?
					[componentRow([
						button(key(BasicKeys.playing.give_up), "Give Up", "deny", {}),
					])] : [],
				],
				allowed_mentions: {parse: []},
			};
		}else if(state.mode === "canceled"){
			return {
				content: "Canceled game.",
				embeds: [],
				components: [],
				allowed_mentions: {parse: []},
			};
		}else{
			return {
				content: "Unsupported "+state.mode,
				embeds: [],
				components: [],
				allowed_mentions: {parse: []},
			};
		}
	},
	handleInteraction({state, key_name, author_id}): HandleInteractionResponse<TicTacToeState> {
		if(state.mode === "joining") {
			if(key_name === BasicKeys.joining.join || key_name === BasicKeys.joining.join_anyway) {
				if(key_name !== BasicKeys.joining.join_anyway && author_id === state.first_player) {
					return showPlayAgainstYourselfMenu(TTTGame, state);
				}else{
					return {kind: "update_state", state: {
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
							"O": author_id,
						},
					}};
				}
			}else if(key_name === BasicKeys.joining.end) {
				if(author_id === state.first_player) {
					return {kind: "update_state", state: {
						mode: "canceled",
						initiator: state.first_player,
					}};
				}else{
					return {kind: "error", msg: "Only <@"+state.first_player+"> can cancel."};
				}
			}else{
				return {kind: "error", msg: "Error! Unsupported "+key_name};
			}
		}else if(state.mode === "playing") {
			if(author_id !== state.players[state.player]) {
				if(!JSON.stringify(state.player).includes(author_id)) { // hack
					return {kind: "error", msg: "You're not in this game"};
				}
				return {kind: "error", msg: "It's not your turn"};
			}
			if(key_name.startsWith("T,")) {
				const [, tx, ty] = key_name.split(",") as [string, string, string];
				if(state.board.grid[+ty]![+tx] !== " ") return {kind: "error", msg: "You must click an empty tile"};
                state.board.grid[+ty]![+tx] = state.player;
                if(tttDetectWin(state.board.grid, +tx, +ty)) {
                	return {kind: "update_state", state: {
                		...state,
                		mode: "won",
                		win: {
                			player: state.player,
                			reason: "Three in a row",
                		},
                	}};
                }else if(tttDetectTie(state.board.grid)) {
                	return {kind: "update_state", state: {
                		...state,
                		mode: "won",
                		win: {
                			player: "Tie",
                			reason: "All spaces filled",
                		},
                	}};
                }
                return {kind: "update_state", state: {
                	...state,
                	mode: "playing",
                	player: advanceTTTPlayer(state.player),
                }};
			}else if(key_name === BasicKeys.playing.give_up) {
				return {kind: "update_state", state: {
					...state,
					mode: "won",
					win: {
						player: advanceTTTPlayer(state.player),
						reason: "Other player gave up.",
					},
				}};
			}else{
				return {kind: "error", msg: "Error! Unsupported "+key_name};
			}
		}else if(state.mode === "won") {
			return {kind: "error", msg: "This game is over."};
		}else if(state.mode === "canceled") {
			return {kind: "error", msg: "This game was not started."};
		}else{
			return {kind: "error", msg: "TODO support "+state.mode};
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
		const game_state = await getGameData(ikey.game_id);

		if(game_state.stage !== ikey.stage) {
			await errorGame(info, "This button is no longer active.");
			return;
		}

		let res = games[ikey.kind].handleInteraction({state: game_state.state, key_name: ikey.name, author_id: info.message.author.id, info, ikey});
		while(res.kind === "async") {
			res = await res.handler(info);
		}
		if(res.kind === "update_state") {
			await updateGameState(info, ikey, res.state);
		}else if(res.kind === "error") {
			await errorGame(info, res.msg);
		}else if(res.kind === "other") {
			await res.handler(info);
		}else if(res.kind === "replace_content") {
			await info.raw_interaction!.sendRaw({
				type: 7,
				data: {...res.content, allowed_mentions: {parse: []}},
			});
		}else if(res.kind === "reply_hidden") {
			return await info.raw_interaction!.sendRaw({
				type: 4,
				data: {...res.response, flags: 1 << 6},
			});
		}else assertNever(res);
	}
};

nr.globalCommand(
	"/help/fun/tictactoe",
	"tictactoe",
	{
		usage: "tictactoe",
		description:
			"Play a game of tic tac toe.",
		extendedDescription: `To play tic tac toe, try to make 3 in a row on your turn.`,
		examples: [
			{
				in: "tictactoe",
				out: "{Screenshot|https://i.imgur.com/VL8fihL.png}",
			},
		],
		perms: {fun: true},
	},
	nr.list(),
	async ([], info) => {
		const game_id = await createGame(TTTGame, TTTGame.init({author_id: info.message.author.id}));
		await renderGame(info, game_id);
	},
);
nr.globalAlias("tictactoe", "knots and crosses");
nr.globalAlias("tictactoe", "knotsandcrosses");
nr.globalAlias("tictactoe", "tic tac toe");
nr.globalAlias("tictactoe", "ticktactoe");
nr.globalAlias("tictactoe", "tick tac toe");
nr.globalAlias("tictactoe", "tick tack toâ€™");
nr.globalAlias("tictactoe", "ttt");

// TODO what instead of removing the role, it returns a hidden where you can toggle the role?
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
	"/help/buttons/grantrolebtn",
	"grantrolebtn",
	{
		usage: "grantrolebtn {Required|ButtonText} {Required|role}",
		description: "Create a button that, when clicked, gives people a role.",
		extendedDescription: "Edit the text with {Command|editmsg}.",
		examples: [
			{
				in: "{ExampleUserMessageNoPfx|/button role name: Become Bad role: @bad}",
				out: "{Screenshot|https://i.imgur.com/y56NMZH.png}",
			}
		],
		perms: {runner: ["manage_bot"]},
	},
	nr.list(nr.a.backtick(), ...nr.a.role()),
	async ([word, role], info) => {
		if(!await permTheyCanManageRole(role, info)) return;
		if(!await permWeCanManageRole(role, info)) return;

		const api = info.message.client as any as ApiHolder;
		await api.api.channels(info.message.channel.id).messages.post<{data: SampleMessage}, unknown>({data: {
			content: "​",
			embeds: [],
			components: [
				componentRow([
					button("GRANTROLE|"+role.id, word, "primary", {}),
				]),
			],
			allowed_mentions: {parse: []},
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
			embeds: [],
			components: [
				componentRow([
					button("CREATETICKET", word, "primary", {}),
				]),
			],
			allowed_mentions: {parse: []},
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
const CGGame: Game<CirclegameState> & GameInit<CirclegameState, [CreateOpts]> = {
	kind: "CG",
	init({author_id}): CirclegameState {
		return {mode: "joining", initiator: author_id};
	},
	render(state, key, info): SampleMessage {
		if(state.mode === "joining") {
			return {
				content: "<@"+state.initiator+"> is starting a circle game",
				embeds: [],
				components: [
					componentRow([
						button(key(BasicKeys.joining.join), "Join Game", "accept", {}),
						button(key(BasicKeys.joining.end), "Cancel", "deny", {}),
					]),
				],
				allowed_mentions: {parse: []},
			};
		}else if(state.mode === "playing") {
			return {
				content: !state.over
                    ? "It's your turn <@"+state.players[state.player]+">\n"
                    + "Try to be the last player to take a circle."
                    : (state.over.winner === "Tie"
                    ? "There was a tie. ("+state.over.reason+"). "
                    : "<@"+state.players[state.over.winner]+"> won!")
                    + " ("+state.over.reason+"). Players: <@"+state.players.X+">, <@"+state.players.O+">",
				embeds: [],
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
							...y === 0 && !state.over ?
                            [
                            	button(key(BasicKeys.playing.give_up), "Give Up", "deny", {}),
                            ] : [],
						]);
					}),
				],
				allowed_mentions: {parse: []},
			};
		}else if(state.mode === "canceled") {
			return {
				content: "Canceled game.",
				embeds: [],
				components: [],
				allowed_mentions: {parse: []},
			};
		}else{
			return {
				content: "Unsupported "+state.mode,
				embeds: [],
				components: [],
				allowed_mentions: {parse: []},
			};
		}
	},
	handleInteraction({state, author_id, key_name}): HandleInteractionResponse<CirclegameState> {
		if(state.mode === "joining") {
			if(key_name === BasicKeys.joining.join || key_name === BasicKeys.joining.join_anyway) {
				if(key_name !== BasicKeys.joining.join_anyway && author_id === state.initiator) {
					return showPlayAgainstYourselfMenu(CGGame, state);
				}else{
					return {kind: "update_state", state: {
						mode: "playing",
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
							"O": author_id,
						},
					}};
				}
			}else if(key_name === BasicKeys.joining.end) {
				if(author_id === state.initiator) {
					return {kind: "update_state", state: {
						mode: "canceled",
					}};
				}else{
					return {kind: "error", msg: "Only <@"+state.initiator+"> can cancel."};
				}
			}else{
				return {kind: "error", msg: "Error! Unsupported "+key_name};
			}
		}else if(state.mode === "playing") {
			if(state.over) return {kind: "error", msg: "This game is over."};
			if(author_id !== state.players[state.player]) {
				if(!JSON.stringify(state.player).includes(author_id)) { // hack
					return {kind: "error", msg: "You're not in this game"};
				}
				return {kind: "error", msg: "It's not your turn"};
			}
			if(key_name.startsWith("C,")) {
				const [, tc, ty] = key_name.split(",") as [string, string, string];

				const line = state.lines[+ty];
				const index = line.lastIndexOf(" ") + 1;
				for(let i = Math.max(0, index -+ tc); i < index; i++){
					line[i] = state.player;
				}

				if(state.lines.every(sline => sline.lastIndexOf(" ") === -1)) {
					return {kind: "update_state", state: {
						...state,
						over: {
							winner: state.player,
							reason: "Took the last circle",
						},
					}};
				}

				return {kind: "update_state", state: {
					...state,
					player: advanceCGPlayer(state.player),
				}};
				return {kind: "error", msg: "TODO: "+tc+", "+ty};
			}else if(key_name === BasicKeys.playing.give_up) {
				return {kind: "update_state", state: {
					...state,
					mode: "playing",
					over: {
						winner: advanceCGPlayer(state.player),
						reason: "Other player gave up.",
					},
				}};
			}else{
				return {kind: "error", msg: "Error! Unsupported "+key_name};
			}
		}else if(state.mode === "canceled") {
			return {kind: "error", msg: "This game was not started."};
		}else{
			return {kind: "error", msg: "TODO support "+state.mode};
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
	"/help/fun/circlegame",
	"circlegame",
	{
		usage: "circlegame",
		description:
			"Play a game of circlegame.",
		examples: [
			{
				in: "circlegame",
				out: "{Screenshot|https://i.imgur.com/HW7Pxh6.png}",
			},
		],
		perms: {fun: true},
	},
	nr.list(),
	async ([], info) => {
		const game_id = await createGame(CGGame, CGGame.init({author_id: info.message.author.id}));
		await renderGame(info, game_id);
	},
);
nr.globalAlias("circlegame", "circle game");


nr.globalCommand(
	"/help/fun/papersoccer",
	"papersoccer",
	{
		usage: "papersoccer",
		description:
			"Play a game of paper soccer.",
		extendedDescription: `To play paper soccer, try to get the ball into the opponent's goal.
You cannot move in a line that has already been drawn.
If you move somewhere that already has lines going from it, you get to move again.

Alternative spellings are accepted, including {Command|paper football}`,
		examples: [
			{
				in: "papersoccer",
				out: "{Screenshot|https://i.imgur.com/FNnudZ6.png}",
			},
		],
		perms: {fun: true},
	},
	nr.list(),
	async ([], info) => {
		const game_id = await createGame(PSGame, PSGame.init({author_id: info.message.author.id}));
		await renderGame(info, game_id);
	},
);
nr.globalAlias("papersoccer", "paper soccer");
nr.globalAlias("papersoccer", "paper football");
nr.globalAlias("papersoccer", "paperfootball");
nr.globalAlias("papersoccer", "soccer");
nr.globalAlias("papersoccer", "football");

import * as PS from "../gamelib/papersoccer";

const PSGame = gamelibGameHandler("PS2", PS.papersoccer, "Paper Soccer", state => [
	"== **Paper Soccer** ==\n"+
	(state ? "⬆️ <@"+state.players[0].id+"> wins by getting the ball to the **top** of the screen.\n" : "")+
	(state ? "⬇️ <@"+state.players[1].id+"> wins win by getting the ball to the **bottom** of the screen.\n" : "")+
	"You cannot move across a line that has already been drawn.\n"+
	"If the location you move to already has a line, you get to keep going.\n"+
	"If you get the ball stuck, your opponent wins."+(state?.over ? "\n"+
	"\n"+
	"This game is over. <@"+state.players[state.turn].id+"> won ("+state.over.reason+")" : ""), []],
(key, mm, render, state) => {
	const rulesbtn = button(key(BasicKeys.rules), "Rules", "secondary", {emoji: {name: "rules", id: "476514294075490306", animated: false}});
	const ts = PS.buttonReactions;

	return {
		content: render[1],
		embeds: [],
		components: !mm ? [componentRow([rulesbtn])] : [
			componentRow([
				button(key("E,"+ts.aa), "↖", "secondary", {disabled: !mm[ts.aa]}),
				button(key("E,"+ts.ba), "↑", "secondary", {disabled: !mm[ts.ba]}),
				button(key("E,"+ts.ca), "↗️", "secondary", {disabled: !mm[ts.ca]}),
			]),
			componentRow([
				button(key("E,"+ts.ab), "←", "secondary", {disabled: !mm[ts.ab]}),
				button(key("none"), " ", "secondary", {disabled: true}),
				button(key("E,"+ts.cb), "→", "secondary", {disabled: !mm[ts.cb]}),
			]),
			componentRow([
				button(key("E,"+ts.ac), "↙", "secondary", {disabled: !mm[ts.ac]}),
				button(key("E,"+ts.bc), "↓", "secondary", {disabled: !mm[ts.bc]}),
				button(key("E,"+ts.cc), "↘", "secondary", {disabled: !mm[ts.cc]}),
			]),
			componentRow([
				rulesbtn,
				button(key(BasicKeys.playing.give_up), "Give Up", "deny", {}),
			]),
		],
		allowed_mentions: {parse: []},
	};
},
(author_id, state) => {
	if(state.state.players[state.state.turn].id !== author_id) return {kind: "error", msg: "It's not your turn"};
	// other player wins
	state.state.turn += 1;
	state.state.turn %= state.state.players.length;
	state.state.over = {
		reason: "Other player gave up",
	};
	return {kind: "update_state", state: state};
},
);

type CalcOp = "+" | "-" | "×" | "÷" | "^";
type CalcState = {
    current: string,
    previous?: {
        operation: CalcOp,
        number: string,
    },
    before_eq?: {
        operation: CalcOp,
        lhs: string,
        number: string,
    },
};

nr.globalCommand(
	"/help/test/calculator",
	"calculator",
	{
		usage: "calculator",
		description: "calculator",
		examples: [],
		perms: {fun: true},
	},
	nr.list(),
	async ([], info) => {
		const game_id = await createGame(Calculator, Calculator.init({author_id: info.message.author.id}));
		await renderGame(info, game_id);
	},
);
const Calculator: Game<CalcState> & GameInit<CalcState, [CreateOpts]> = {
	kind: "CALC",
	init({author_id}) {
		return {current: ""};
	},
	render(state, key, info): SampleMessage {
		const currentText = (state.current || "0");
		let renderedCalculator = (state.previous ? state.previous.number + " " + state.previous.operation + " " : "")
            + currentText
        ;
		if(state.previous && state.previous.operation === "^" && state.current.match(/^[0-9.]+$/)) {
			renderedCalculator = state.previous.number + [...currentText].map(c => c === "." ? "·" : [..."⁰¹²³⁴⁵⁶⁷⁸⁹"][+c]).join("");
		}
		if(state.before_eq) {
			renderedCalculator = "= " + renderedCalculator;
			if(!state.previous) {
				renderedCalculator = state.before_eq.operation + " " + state.before_eq.number + " " + renderedCalculator;
			}
		}
		const operations_enabled = !!state.current;
		const eq_enabled = calculate(JSON.parse(JSON.stringify(state)));
		return {
			content: "```\n"+renderedCalculator+"\n```",
			embeds: [],
			components: [
				componentRow([
					button(key("O,^"), "xʸ", "secondary", {disabled: !operations_enabled}),
					button(key("negative"), "±", "secondary", {}),
					button(key("bksp"), "⌫", "secondary", {}),
					button(key("ac"), "AC", "deny", {}),
				]),
				componentRow([
					button(key("I,7"), "7", "secondary", {}),
					button(key("I,8"), "8", "secondary", {}),
					button(key("I,9"), "9", "secondary", {}),
					button(key("O,÷"), "÷", "secondary", {disabled: !operations_enabled}),
				]),
				componentRow([
					button(key("I,4"), "4", "secondary", {}),
					button(key("I,5"), "5", "secondary", {}),
					button(key("I,6"), "6", "secondary", {}),
					button(key("O,×"), "×", "secondary", {disabled: !operations_enabled}),
				]),
				componentRow([
					button(key("I,1"), "1", "secondary", {}),
					button(key("I,2"), "2", "secondary", {}),
					button(key("I,3"), "3", "secondary", {}),
					button(key("O,-"), "-", "secondary", {disabled: !operations_enabled}),
				]),
				componentRow([
					button(key("I,0"), "0", "secondary", {}),
					button(key("I,."), ".", "secondary", {disabled: state.current.includes(".")}),
					button(key("eq"), "=", eq_enabled ? "primary" : "secondary", {disabled: !eq_enabled}),
					button(key("O,+"), "+", "secondary", {disabled: !operations_enabled}),
				]),
			],
			allowed_mentions: {parse: []},
		};
	},
	handleInteraction({state, author_id, key_name}): HandleInteractionResponse<CalcState> {
		if(key_name.startsWith("I,")) {
			const insert = key_name.replace("I,", "");
			state.current += insert;
			return {kind: "update_state", state: state};
		}else if(key_name.startsWith("O,")) {
			const op = key_name.replace("O,", "");
			if(state.previous) {
				if(!calculate(state)) return {kind: "error", msg: "Never."};
			}
			state.previous = {
				operation: op as any,
				number: state.current,
			};
			state.current = "";
			return {kind: "update_state", state: state};
		}else if(key_name === "ac") {
			state.before_eq = undefined;
			state.previous = undefined;
			state.current = "";
			return {kind: "update_state", state: state};
		}else if(key_name === "bksp") {
			if(!state.current) {
				if(state.previous) {
					state.current = state.previous.number;
					state.previous = undefined;
				}else{
					if(state.before_eq) {
						state.current = state.before_eq.number;
						state.previous = {number: state.before_eq.lhs, operation: state.before_eq.operation};
						state.before_eq = undefined;
					}
				}
			}else{
				state.current = state.current.substr(0, state.current.length - 1);
			}
			return {kind: "update_state", state: state};
		}else if(key_name === "eq") {
			if(!calculate(state)) return {kind: "error", msg: "Cannot = nothing"};

			// state.before_eq = {
			//     operation: prev.operation,
			//     lhs: state.current,
			//     number: prev.number,
			// };

			return {kind: "update_state", state: state};
		}else if(key_name === "negative") {
			if(state.current.includes("-")) {
				state.current = state.current.replace("-", "");
			}else{
				state.current = "-" + state.current;
			}
			return {kind: "update_state", state: state};
		} else return {kind: "error", msg: "TODO support "+key_name};
	}
};

function calculateValue(lhs_str: string, op: CalcOp, rhs_str: string): number {
	const lhs =+ lhs_str;
	const rhs =+ rhs_str;

	if(op === "+") {
		return lhs + rhs;
	}else if(op === "-") {
		return lhs - rhs;
	}else if(op === "×") {
		return lhs * rhs;
	}else if(op === "÷") {
		return lhs / rhs;
	}else if(op === "^") {
		return lhs ** rhs;
	}else{
		throw new Error("bad calculation");
	}
}
function calculate(state: CalcState): boolean {
	const lhs = state.previous?.number ?? state.current;
	const rhs = state.previous ? state.current : state.before_eq?.number;
	const op = state.previous ? state.previous.operation : state.before_eq?.operation;
	if(rhs == null || op == null) return false;

	state.before_eq = {
		operation: op,
		lhs,
		number: rhs,
	};
	state.previous = undefined;
	state.current = "" + calculateValue(lhs, op, rhs);

	return true;
}

nr.globalCommand(
	"/help/fun/ultimatetictactoe",
	"ultimatetictactoe",
	{
		usage: "ultimatetictactoe",
		description:
			"Play a game of ultimate tic tac toe.",
		extendedDescription: `Instructions:
For better instructions, read {Link|https://mathwithbaddrawings.com/2013/06/16/ultimate-tic-tac-toe/}
- On your turn, select which board to play on (if you have a choice) and then play your x/o.
- When you get 3 in a row on a small board, you win that board.
- To win the game, get 3 small boards in a row (up/down, left/right, or diagonal)
- The square you play on determines which square your opponent must play on.

{Screenshot|https://i.imgur.com/m0CGIb5.png}

`,
		examples: [
			{
				in: "ultimate tictactoe",
				out: "{Screenshot|https://i.imgur.com/SsjvYYm.png}",
			},
		],
		perms: {fun: true},
	},
	nr.list(),
	async ([], info) => {
		const game_id = await createGame(UTTTGame, UTTTGame.init({author_id: info.message.author.id}));
		await renderGame(info, game_id);
	},
);
nr.globalAlias("ultimatetictactoe", "ultimate tic tac toe");
nr.globalAlias("ultimatetictactoe", "ultimate tictactoe");
nr.globalAlias("ultimatetictactoe", "uttt");
nr.globalAlias("ultimatetictactoe", "bigtictactoe");
nr.globalAlias("ultimatetictactoe", "big tic tac toe");
nr.globalAlias("ultimatetictactoe", "big tictactoe");
nr.globalAlias("ultimatetictactoe", "ultimate knotsandcrosses");
nr.globalAlias("ultimatetictactoe", "ultimateknotsandcrosses");
nr.globalAlias("ultimatetictactoe", "ultimate knots and crosses");
nr.globalAlias("ultimatetictactoe", "big knotsandcrosses");
nr.globalAlias("ultimatetictactoe", "bigknotsandcrosses");
nr.globalAlias("ultimatetictactoe", "big knots and crosses");


import * as utttg from "../gamelib/ultimatetictactoe";


const UTTTGame = gamelibGameHandler("UTTT", utttg.ultimatetictactoe, "Ultimate Tic Tac Toe", () => ["" +
	"- On your turn, select which board to play on (if you have a choice) and then play your x/o.\n" +
	"- When you get 3 in a row on a small board, you win that board.\n" +
	"- To win the game, win 3 small boards in a row (up/down, left/right, or diagonal)\n" +
	"- The square you play on determines which board your opponent must play on next.", [
	componentRow([{
		type: 2,
		style: 5, // URL
		label: "More Help",
		url: "https://interpunct.info/help/fun/ultimatetictactoe",
		disabled: false,
	}]),
]],
(key, mm, render, state) => {
	let components: ActionRow[];
	if(!mm) {
		components = [
			componentRow([
				button(key(BasicKeys.rules), "Rules", "secondary", {emoji: {name: "rules", id: "476514294075490306", animated: false}}),
			]),
		];
	}else{
		const ts = utttg.tileset.tiles;
		const is_l2 = state.state.status.s === "playing" ? state.state.status.board === "pick" : false;
		const bstyl = is_l2 ? "primary" : "secondary";
		components = [
			componentRow([
				button(key("E,"+ts.buttons[0]), "1", bstyl, {disabled: !mm[ts.buttons[0]]}),
				button(key("E,"+ts.buttons[1]), "2", bstyl, {disabled: !mm[ts.buttons[1]]}),
				button(key("E,"+ts.buttons[2]), "3", bstyl, {disabled: !mm[ts.buttons[2]]}),
			]),
			componentRow([
				button(key("E,"+ts.buttons[3]), "4", bstyl, {disabled: !mm[ts.buttons[3]]}),
				button(key("E,"+ts.buttons[4]), "5", bstyl, {disabled: !mm[ts.buttons[4]]}),
				button(key("E,"+ts.buttons[5]), "6", bstyl, {disabled: !mm[ts.buttons[5]]}),
			]),
			componentRow([
				button(key("E,"+ts.buttons[6]), "7", bstyl, {disabled: !mm[ts.buttons[6]]}),
				button(key("E,"+ts.buttons[7]), "8", bstyl, {disabled: !mm[ts.buttons[7]]}),
				button(key("E,"+ts.buttons[8]), "9", bstyl, {disabled: !mm[ts.buttons[8]]}),
			]),
			componentRow([
				button(key("E,"+ts.backbtn), "⎌", "primary", {disabled: !mm[ts.backbtn]}),
				button(key(BasicKeys.rules), "Rules", "secondary", {emoji: {name: "rules", id: "476514294075490306", animated: false}}),
				button(key(BasicKeys.playing.give_up), "Give Up", "deny", {}),
			]),
		];
	}
	return {
		content: render[0],
		embeds: [],
		components,
		allowed_mentions: {parse: []},
	};
},
(author_id, state) => {
	if(state.state.status.s === "playing" && state.state.players[state.state.status.turn].id === author_id) {
		state.state.status = {
			s: "winner",
			winner: state.state.players[state.state.status.turn === "x" ? "o" : "x"],
			reason: "Other player gave up",
		};
		return {kind: "update_state", state};
	}else{
		return {kind: "error", msg: "You can't do that."};
	}
},
);

import * as connect4 from "../gamelib/connect4";

const Conn4Game = gamelibGameHandler("C4", connect4.connect4, "Connect 4", () => ["" +
	"Try to get 4 in a row in any direction, including diagonal.", []],
(key, mm, render): SampleMessage => {
	let components: ActionRow[];
	if(!mm) {
		components = [
			componentRow([
				button(key(BasicKeys.rules), "Rules", "secondary", {emoji: {name: "rules", id: "476514294075490306", animated: false}}),
			]),
		];
	}else{
		const ts = connect4.tileset.tiles;
		components = [
			componentRow([
				button(key("E,"+ts.buttons[0]), "1", "secondary", {disabled: !mm[ts.buttons[0]]}),
				button(key("E,"+ts.buttons[1]), "2", "secondary", {disabled: !mm[ts.buttons[1]]}),
				button(key("E,"+ts.buttons[2]), "3", "secondary", {disabled: !mm[ts.buttons[2]]}),
				button(key("E,"+ts.buttons[3]), "4", "secondary", {disabled: !mm[ts.buttons[3]]}),
			]),
			componentRow([
				button(key("E,"+ts.buttons[4]), "5", "secondary", {disabled: !mm[ts.buttons[4]]}),
				button(key("E,"+ts.buttons[5]), "6", "secondary", {disabled: !mm[ts.buttons[5]]}),
				button(key("E,"+ts.buttons[6]), "7", "secondary", {disabled: !mm[ts.buttons[6]]}),
			]),
			componentRow([
				button(key(BasicKeys.rules), "Rules", "secondary", {emoji: {name: "rules", id: "476514294075490306", animated: false}}),
				button(key(BasicKeys.playing.give_up), "Give Up", "deny", {}),
			]),
		];
	}
	return {
		content: render[0],
		embeds: [],
		components,
		allowed_mentions: {parse: []},
	};
},
(author_id, state) => {
	if(state.state.status.s === "playing" && state.state.players[state.state.turn].id === author_id) {
		state.state.status = {
			s: "winner",
			winner:
				state.state.players[state.state.turn === "r" ? "y" : "r"],
			reason: "Other player gave up",
		};
		return {kind: "update_state", state: state};
	}else{
		return {kind: "error", msg: "It's not your turn."};
	}
},
);


// const Connect4Game = gamelibGameHandler();

nr.globalCommand(
	"/help/fun/connect4",
	"connect4",
	{
		usage: "connect4",
		description:
			"Play a game of connect 4.",
		extendedDescription:
			"To play connect4, select where to drop your tile and try to make a sequence of 4 in any direction including diagonal.",
		examples: [
			{
				in: "connect4",
				out: "{Screenshot|https://i.imgur.com/3YjxBXi.png}",
			},
		],
		perms: {fun: true},
	},
	nr.passthroughArgs,
	async ([], info) => {
		const game_id = await createGame(Conn4Game, Conn4Game.init({author_id: info.message.author.id}));
		await renderGame(info, game_id);
	},
);
nr.globalAlias("connect4", "connect 4");
nr.globalAlias("connect4", "conn4");

import * as checkers from "../gamelib/checkers";

const CheckersGame = gamelibGameHandler("CHK", checkers.checkers, "Checkers", () => ["" +
	"Try to capture all your opponent's pieces.", [
	componentRow([{
		type: 2,
		style: 5, // URL
		label: "More Help",
		url: "http://www.darkfish.com/checkers/rules.html",
		disabled: false,
	}]),
]], (key, mm, render) => {
	let components: ActionRow[];
	if(!mm) {
		components = [
			componentRow([
				button(key(BasicKeys.rules), "Rules", "secondary", {emoji: {name: "rules", id: "476514294075490306", animated: false}}),
			]),
		];
	}else{
		const ts = checkers.tileset.tiles.interaction;
		components = [
			componentRow([
				button(key("E,"+ts.arrows.ul), "↖", "secondary", {disabled: !mm[ts.arrows.ul]}),
				button(key("E,"+ts.arrows.ur), "↗", "secondary", {disabled: !mm[ts.arrows.ur]}),
				button(key(BasicKeys.rules), "Rules", "secondary", {emoji: {name: "rules", id: "476514294075490306", animated: false}}),
			]),
			componentRow([
				button(key("E,"+ts.arrows.dl), "↙", "secondary", {disabled: !mm[ts.arrows.dl]}),
				button(key("E,"+ts.arrows.dr), "↘", "secondary", {disabled: !mm[ts.arrows.dr]}),
				button(key(BasicKeys.playing.give_up), "Give Up", "deny", {}),
			]),
			componentRow([
				button(key("E,"+ts.pieces[0]), "1", "secondary", {disabled: !mm[ts.pieces[0]]}),
				button(key("E,"+ts.pieces[1]), "2", "secondary", {disabled: !mm[ts.pieces[1]]}),
				button(key("E,"+ts.pieces[2]), "3", "secondary", {disabled: !mm[ts.pieces[2]]}),
				button(key("E,"+ts.pieces[3]), "4", "secondary", {disabled: !mm[ts.pieces[3]]}),
			]),
			componentRow([
				button(key("E,"+ts.pieces[4]), "5", "secondary", {disabled: !mm[ts.pieces[4]]}),
				button(key("E,"+ts.pieces[5]), "6", "secondary", {disabled: !mm[ts.pieces[5]]}),
				button(key("E,"+ts.pieces[6]), "7", "secondary", {disabled: !mm[ts.pieces[6]]}),
				button(key("E,"+ts.pieces[7]), "8", "secondary", {disabled: !mm[ts.pieces[7]]}),
			]),
			componentRow([
				button(key("E,"+ts.pieces[8]), "9", "secondary", {disabled: !mm[ts.pieces[8]]}),
				button(key("E,"+ts.pieces[9]), "A", "secondary", {disabled: !mm[ts.pieces[9]]}),
				button(key("E,"+ts.pieces[10]), "B", "secondary", {disabled: !mm[ts.pieces[10]]}),
				button(key("E,"+ts.pieces[11]), "C", "secondary", {disabled: !mm[ts.pieces[11]]}),
			]),
		];
	}
	return {
		content: render[0],
		embeds: [],
		components,
		allowed_mentions: {parse: []},
	};
}, (author_id, state) => {
	if (state.state.status.s === "winner" || state.state.status.s === "tie") {
		return {kind: "error", msg: "The game is over."};
	}
	if(state.state.players[state.state.status.turn].id !== author_id) {
		return {kind: "error", msg: "You can't do that."};
	}
	const nextplayer = state.state.players[state.state.status.turn === "red" ? "black" : "red"];
	state.state.status = {
		s: "winner",
		reason: "Other p. gave up",
		winner: nextplayer,
	};
	checkers.updateOverlay(state.state);

	return {kind: "update_state", state};
});

async function duplicateGame<T>(game: Game<T>, game_state: T) {
	const gd: GameData = {
		kind: game.kind,
		state: game_state,
		stage: 0,
	};
	const [id] = await globalKnex!("games").insert({
		id: undefined,
		data: JSON.stringify(gd),
	}).returning("id") as [number];

	return numToGameID(id);
}

export function showPlayAgainstYourselfMenu<T>(res: Game<T>, state: T): HandleInteractionResponse<T> {
	return {
		kind: "async",
		handler: async (info) => {
			const dupe_key = await duplicateGame(res, state);
			return {kind: "reply_hidden", response: {
				content: "You are already in the game.",
				embeds: [],
				components: [
					componentRow([
						button(getInteractionKey(dupe_key, res.kind, 0, BasicKeys.joining.join_anyway), "Play against yourself", "secondary", {}),
					]),
				],
				allowed_mentions: {parse: []},
			}};
		}
	};
}

import { GameConfig } from "../gamelib/gamelib";

type GamelibState<T> = {
	mode: "joining",
	initiator: string,
} | {
	mode: "playing",
	state: T,
} | {mode: "canceled"} | {mode: "unsupported"};

function gamelibGameHandler<State>(
	kind: GameKind,
	gamelibGame: GameConfig<State>,
	title: string,
	rules: (state: State | undefined) => [string, ActionRow[]],
	// (key, actions: GameOver | ActionsList)
	renderPlaying: (key: (a: string) => string, mm: {[key: string]: boolean} | undefined, render: string[], state: {mode: "playing", state: State}) => SampleMessage,
	handleGiveUp: (author_id: string, state: {mode: "playing", state: State}) =>
		HandleInteractionResponse<GamelibState<State>>
	,
): Game<GamelibState<State>> & GameInit<GamelibState<State>, [CreateOpts]> {
	type CheckersState = GamelibState<State>;

	const res: Game<CheckersState> & GameInit<CheckersState, [CreateOpts]> = {
		kind,
		init({author_id}): CheckersState {
			return {mode: "joining", initiator: author_id};
		},
		render(state, key, info): SampleMessage {
			if(state.mode === "joining") {
				return {
					content: "<@"+state.initiator+"> is starting a game of "+title,
					embeds: [],
					components: [
						componentRow([
							button(key(BasicKeys.joining.join), "Join Game", "accept", {}),
							button(key(BasicKeys.joining.end), "Cancel", "deny", {}),
							button(key(BasicKeys.rules), "Rules", "secondary", {emoji: {name: "rules", id: "476514294075490306", animated: false}}),
						]),
					],
					allowed_mentions: {parse: []},
				};
			}else if(state.mode === "playing") {
				let mm: {[key: string]: boolean} | undefined;
				if(gamelibGame.checkGameOver(state.state)) {
					mm = undefined;
				}else{
					const moves = gamelibGame.getMoves(state.state);
					mm = {};
					moves.forEach(move => mm![move.button] = true);
				}
				return renderPlaying(key, mm, gamelibGame.render(state.state), state);
			}else if(state.mode === "canceled") {
				return {
					content: "Canceled game.",
					embeds: [],
					components: [],
					allowed_mentions: {parse: []},
				};
			}else{
				return {
					content: "Unsupported "+state.mode,
					embeds: [],
					components: [],
					allowed_mentions: {parse: []},
				};
			}
		},
		handleInteraction({state, author_id, key_name}): HandleInteractionResponse<CheckersState> {
			if(key_name === BasicKeys.rules) {
				const rulesres = rules(state.mode === "playing" ? state.state : undefined);

				return {kind: "reply_hidden",
					response: {
						content: rulesres[0],
						embeds: [],
						components: rulesres[1] ?? [],
						allowed_mentions: {parse: []},
					},
				};
			}else if(state.mode === "joining") {
				if(key_name === BasicKeys.joining.join || key_name === BasicKeys.joining.join_anyway) {
					if(key_name !== BasicKeys.joining.join_anyway && author_id === state.initiator) {
						return showPlayAgainstYourselfMenu(res, state);
					}else{
						return {kind: "update_state", state: {
							mode: "playing",

							state: gamelibGame.setup([{id: state.initiator}, {id: author_id}]),
						}};
					}
				}else if(key_name === BasicKeys.joining.end) {
					if(author_id === state.initiator) {
						return {kind: "update_state", state: {
							mode: "canceled",
						}};
					}else{
						return {kind: "error", msg: "Only <@"+state.initiator+"> can cancel."};
					}
				}else{
					return {kind: "error", msg: "Error! Unsupported "+key_name};
				}
			}else if(state.mode === "playing") {
				if(gamelibGame.checkGameOver(state.state)) {
					return {kind: "error", msg: "The game is over"};
				}

				if(key_name === BasicKeys.playing.give_up) {
					return handleGiveUp(author_id, state);
				}

				if(key_name.startsWith("E,")) {
					const kbtn = key_name.replace("E,", "");
					const moves = gamelibGame.getMoves(state.state);
					const move = moves.find(mv => mv.button === kbtn);
					if(!move) return {kind: "error", msg: "You can't do that."};
					if(move.player.id !== author_id) return {kind: "error", msg: "You can't do that."};
					return {kind: "update_state", state: {mode: "playing", state: move.apply(state.state)}};
				}
				
				return {kind: "error", msg: "TODO support "+key_name};
			}else if(state.mode === "canceled") {
				return {kind: "error", msg: "This game was not started."};
			}else{
				return {kind: "error", msg: "TODO support "+state.mode};
			}
		}
	};
	return res;
}

nr.globalCommand(
	"/help/fun/checkers",
	"checkers",
	{
		usage: "checkers",
		description:
			"Play a game of checkers.",
		extendedDescription:
			"To play checkers, try to take all your opponents' pieces. For more help, look up the rules online. {Link|http://www.darkfish.com/checkers/rules.html}",
		examples: [
			{
				in: "checkers",
				out: "{Screenshot|https://i.imgur.com/Nx3tVMB.png}",
			},
		],
		perms: {fun: true},
	},
	nr.passthroughArgs,
	async ([], info) => {
		const game_id = await createGame(CheckersGame, CheckersGame.init({author_id: info.message.author.id}));
		await renderGame(info, game_id);
	},
);

nr.globalCommand(
	"/help/fun/infinitetictactoe",
	"infinitetictactoe",
	{
		usage: "infinitetictactoe",
		description:
			"Play a game of infinitetictactoe.",
		extendedDescription:
			"To play infinitetictactoe, try to win.",
		examples: [],
		perms: {fun: true},
	},
	nr.passthroughArgs,
	async ([], info) => {
		const game_id = await createGame(itttgame.ITTTGame, itttgame.ITTTGame.init({author_id: info.message.author.id}));
		await renderGame(info, game_id);
	},
);
nr.globalAlias("infinitetictactoe", "ittt");
nr.globalAlias("infinitetictactoe", "infinite tictactoe");
nr.globalAlias("infinitetictactoe", "infinite tic tac toe");

nr.globalCommand(
	"/help/buttons/newpanel",
	"newpanel",
	{
		usage: "newpanel",
		description: "Create a new button panel",
		examples: [],
		perms: {fun: true},
	},
	nr.list(),
	async ([], info) => {
		const game_id = await createGame(paneleditor.PanelEditor, await paneleditor.PanelEditor.init(
			{author_id: info.message.author.id}, {mode: "new"}, info,
		));
		await renderGame(info, game_id);
	},
);

nr.globalCommand(
	"/help/buttons/editpanel",
	"editpanel",
	{
		usage: "editpanel {Optional|panel name}",
		description: "edit a button panel",
		examples: [],
		perms: {fun: true},
	},
	nr.list(...nr.a.words()),
	async ([panel_name], info) => {
		const game_id = await createGame(paneleditor.PanelEditor, await paneleditor.PanelEditor.init(
			{author_id: info.message.author.id}, {mode: "edit", search: panel_name || undefined}, info,
		));
		await renderGame(info, game_id);
	},
);

nr.globalCommand(
	"/help/buttons/sendpanel",
	"sendpanel",
	{
		usage: "sendpanel {Optional|panel name}",
		description: "Send a button panel",
		examples: [],
		perms: {fun: true},
	},
	nr.list(...nr.a.words()),
	async ([panel_name], info) => {
		const game_id = await createGame(paneleditor.PanelEditor, await paneleditor.PanelEditor.init(
			{author_id: info.message.author.id}, {mode: "send", search: panel_name || undefined}, info,
		));
		await renderGame(info, game_id);
	},
);

let paneleditor = require("./paneleditor") as typeof import("./paneleditor");
let itttgame = require("./infinite_tictactoe") as typeof import("./infinite_tictactoe");

import * as fs from "fs";
if(process.env.NODE_ENV !== "production") {
	fs.watchFile(require.resolve("./paneleditor"), (curr, prev) => {
		try {
			const start_time = Date.now();
			delete require.cache[require.resolve("./paneleditor")];
			paneleditor = require("./paneleditor");
			games["PANL"] = paneleditor.PanelEditor;
			console.log("Panel editor updated in "+(Date.now() - start_time)+" ms.");
		}catch(e){
			console.log("Panel editor update failed", e);
		}
	});
	fs.watchFile(require.resolve("./infinite_tictactoe"), (curr, prev) => {
		try {
			const start_time = Date.now();
			delete require.cache[require.resolve("./infinite_tictactoe")];
			itttgame = require("./infinite_tictactoe");
			games["ITTT"] = itttgame.ITTTGame;
			console.log("ITTTGame updated in "+(Date.now() - start_time)+" ms.");
		}catch(e){
			console.log("ITTTGame update failed", e);
		}
	});
}

export function mkbtn<T>(label: string, color: ButtonStyle, opts: {disabled?: boolean, emoji?: string}, action: RenderActionButtonAction<T>): RenderActionButton<T> {
	return {
		label,
		color,
		action,
		disabled: opts.disabled,
		emoji: opts.emoji ? {id: opts.emoji} : undefined,
	};
}
export function callback<T>(id: string, ...cb: [
	...RenderActionButtonActionCallbackOpt<T>[],
	RenderActionButtonActionCallback<T>,
]): RenderActionButtonAction<T> {
	return {kind: "callback", id, cb: (author_id, info, ikey) => {
		for(const a of cb) {
			const res = a(author_id, info, ikey);
			if(res) return res;
		}
		throw new Error("unreachable");
	}};
}

export function requestTextInput<T>(info: Info, ikey: IKey,
	cb: (a: string) => HandleInteractionResponse<T>,
): HandleInteractionResponse<T> {
	return requestInput(info, ikey, (res): HandleInteractionResponse<T> => {
		if(res.kind !== "text") return {kind: "error", msg: "Expected text."};
		return cb(res.value);
	}, {slash: "give text", base: "givetext {Text}"});
}
export function requestLongTextInput<T>(info: Info, ikey: IKey,
	current_value: string,
	cb: (a: string) => HandleInteractionResponse<T>,
): HandleInteractionResponse<T> {
	return {
		kind: "async",
		handler: async () => {
			const resurl =
				"https://pfg.pw/sitepages/messagecreator?content=" +
				encodeURIComponent(current_value) + "&post=true";
			const postres = await shortenLink(resurl);
			if ("error" in postres) return {kind: "error", msg: postres.error};

			return requestInput(info, ikey, (res): HandleInteractionResponse<T> => {
				if(res.kind !== "longtext") return {kind: "error", msg: "Expected text."};
				return cb(res.value);
			}, {entire: "Edit the content here: <"+postres.url+">", slash: "", base: ""});
		}
	};
}
export function requestRoleInput<T>(info: Info, ikey: IKey,
	cb: (a: discord.Role) => HandleInteractionResponse<T>,
): HandleInteractionResponse<T> {
	return requestInput(info, ikey, (res): HandleInteractionResponse<T> => {
		if(res.kind !== "role") return {kind: "error", msg: "Expected role."};
		return cb(res.value);
	}, {slash: "give role", base: "giverole {Role name or id}"});
}
export function requestEmojiInput<T>(info: Info, ikey: IKey,
	cb: (a: {id: string}) => HandleInteractionResponse<T>,
): HandleInteractionResponse<T> {
	return requestInput(info, ikey, (res): HandleInteractionResponse<T> => {
		if(res.kind !== "emoji") return {kind: "error", msg: "Expected emoji."};
		return cb(res.value);
	}, {slash: "give emoji", base: "giveemoji {Emoji or emoji id}"});
}
export function requestInput<T>(info: Info, ikey: IKey,
	cb: (a: ResponseType) => HandleInteractionResponse<T>,
	messages: {slash: string, base: string, entire?: string},
): HandleInteractionResponse<T> {
	requestInput2(info.message.author.id, (response, input_info) => {
		perr((async () => {
			let resp = cb(response);
			while(resp.kind === "async") {
				resp = await resp.handler(input_info);
			}
			if(resp.kind === "error") {
				return await input_info.error(resp.msg);
			}else if(resp.kind === "update_state") {
				await updateGameState<T>(info, ikey, resp.state, {edit_original: info.raw_interaction!});	
				if(input_info.raw_interaction) {
					await input_info.raw_interaction.replyHiddenHideCommand("✓ Set.");
				}else{
					await input_info.success("Set.");
				}
			}else if(resp.kind === "other"){
				return await resp.handler(input_info);
			}else if(resp.kind === "reply_hidden"){
				if(info.raw_interaction) {
					return await input_info.raw_interaction!.sendRaw({
						type: 4,
						data: {...resp.response, flags: 1 << 6},
					});
				}else{
					return await info.accept();
				}
			}else if(resp.kind === "replace_content"){
				await info.raw_interaction!.editOriginal({
					...resp.content, allowed_mentions: {parse: []},
				});
			}else assertNever(resp);
		})().catch(async (e) => {
			console.log(e);
			return await input_info.error("Internal error.");
		}), "responding to input");
	});
	const key = (name: string) => getInteractionKey(ikey.game_id, ikey.kind, ikey.stage, name);
	const msgv: SampleMessage = {
		content: messages.entire ?? "Please type <:slash:848339665093656607>`/"+messages.slash+"` or `"+info.prefix+messages.base+"`",
		components: [
			componentRow([
				button(key("*RELOAD*"), "Cancel", "primary", {}),
			]),
		],
		allowed_mentions: {parse: []},
		embeds: [],
	};
	return {
		kind: "replace_content",
		content: {
			...msgv, allowed_mentions: {parse: []},
		},
	};
}


type GameKind =
    | "TTT" // tic tac toe
    | "CG" // circlegame
    | "PS2" // paper soccer
    | "CALC" // calculator
    | "UTTT" // ultimate tic tac toe
    | "C4" // connect 4
    | "CHK" // checkers
	| "PANL" // panel
	| "ITTT" // infinite tic tac toe
;

const games: {[key in GameKind]: Game<any>} = {
	"TTT": TTTGame,
	"CG": CGGame,
	"PS2": PSGame,
	"CALC": Calculator,
	"UTTT": UTTTGame,
	"C4": Conn4Game,
	"CHK": CheckersGame,
	"PANL": paneleditor.PanelEditor,
	"ITTT": itttgame.ITTTGame,
};