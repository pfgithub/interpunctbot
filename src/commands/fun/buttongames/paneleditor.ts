import {ButtonStyle, Game, HandleInteractionResponse, RenderResult, RenderActionRow, renderResultToResult, RenderActionButton, RenderActionButtonAction, renderResultToHandledInteraction, RenderActionButtonActionCallbackOpt, RenderActionButtonActionCallback} from "./tictactoe";
import {URL} from "url";
import * as request from "../../../RequestManager";

// NOTE this will retain all fields, even those
// that are not of the active tag.
type ButtonAction = {
	kind: "nothing",
} | {
	kind: "role",
	role_id?: string, // before adding a panel, the panel must check that you have all the req. perms
} | {
	kind: "link",
	url?: string,
} | {kind: "unsupported"};

type Button = {
	color: ButtonStyle,
	label: string,
	action: ButtonAction,
};
type ButtonRow = Button[];
type PanelState = {
	initiator: string,
	rows: ButtonRow[],

	edit_mode: {
		kind: "root",
	} | {
		kind: "edit_button",
		btn_row: number,
		btn_col: number,
	} | {
		kind: "edit_button_label",
		btn_row: number,
		btn_col: number,
	} | {
		kind: "edit_action",
		btn_row: number,
		btn_col: number,
	} | {kind: "unsupported"},
};

function isValidURL(url_in: string): undefined | string {
	if(!url_in) return "No URL";
	if(url_in.length > 512) return "URL must be less than 512 characters";
	let url: URL;
	try {
		url = new URL(url_in);
	}catch(e) {
		return "invalid url";
	}
	if(url.protocol !== "http" && url.protocol !== "https") {
		throw new Error("URL must start with `http://` or `https://`");
	}
	return undefined;
}

function isValidLabel(label: string): string | undefined {
	if(label.length <= 80) return undefined;
	return "Label must be at most 80 characters long";
}

function previewButton(btn: Button, action: RenderActionButtonAction<PanelState>): RenderActionButton<PanelState> {
	// btn.action.kind === "link" ? ((): RenderActionButtonAction<PanelState> => {
	// 	const is_valid_url = isValidURL(btn.action.url ?? "");
	// 	return {kind: "link", url: is_valid_url ? "https://interpunct.info/invalid-url?reason="+encodeURIComponent(is_valid_url) : btn.action.url!};
	// })() : {kind: "callback", id: key, cb: (author_id) => {
	// 	return {kind: "error", msg: "TODO"};
	// }};
	// TODO use that when no action is provided
	return {
		label: btn.label.substr(0, 80) || "​",
		color: btn.action.kind === "link" ? "secondary" : btn.color,
		action: action,
		disabled: false,
	};
}

function mkbtn<T>(label: string, color: ButtonStyle, opts: {disabled?: boolean}, action: RenderActionButtonAction<T>): RenderActionButton<T> {
	return {
		label,
		color,
		action,
		...opts,
	};
}
function callback<T>(id: string, ...cb: [
	...RenderActionButtonActionCallbackOpt<T>[],
	RenderActionButtonActionCallback<T>,
]): RenderActionButtonAction<T> {
	return {kind: "callback", id, cb: (author_id) => {
		for(const a of cb) {
			const res = a(author_id);
			if(res) return res;
		}
		throw new Error("unreachable");
	}};
}

function newRender(state: PanelState): RenderResult<PanelState> {
	{
		const req_author: RenderActionButtonActionCallbackOpt<PanelState> = (author_id) => {
			if(author_id !== state.initiator) return {kind: "error", msg: "This is not your panel."};
			return undefined;
		};
		if(state.edit_mode.kind === "root") return {
			content: "​",
			embeds: [],
			components: [
				...state.rows.map((row, row_idx): RenderActionRow<PanelState> => [
					...row.map((btn, btn_idx) => previewButton(btn, callback<PanelState>("EDITBTN,"+row_idx+","+btn_idx, req_author, (author_id) => {
						state.edit_mode = {kind: "edit_button", btn_row: row_idx, btn_col: btn_idx};
						return {kind: "update_state", state};
					}))),
					...row.length < 5 ? [
						mkbtn<PanelState>("+", "accept", {}, callback("ADDBTN,"+row_idx, req_author, (author_id) => {
							state.rows[row_idx].push({color: "secondary", label: "Button", action: {kind: "nothing"}});
							state.edit_mode = {kind: "edit_button", btn_row: row_idx, btn_col: state.rows[row_idx].length - 1};
							return {kind: "update_state", state};
						})),
					] : [],
				]),
				...state.rows.length < 5 ? [
					[
						mkbtn<PanelState>("+ Row", "accept", {}, callback("ADDROW", req_author, (author_id) => {
							state.rows.push([{color: "secondary", label: "Button", action: {kind: "nothing"}}]);
							state.edit_mode = {kind: "edit_button", btn_row: state.rows.length - 1, btn_col: 0};
							return {kind: "update_state", state};
						})),
					]
				] : [],
			],
			allowed_mentions: {parse: []},
		}; else if(state.edit_mode.kind === "edit_button") {
			const ostate = state.edit_mode;
			const btn = state.rows[state.edit_mode.btn_row]![state.edit_mode.btn_col]!;
			return {
				content: "​",
				embeds: [],
				components: [
					[
						mkbtn<PanelState>("Preview:", "secondary", {disabled: true}, {kind: "none"}),
						previewButton(btn, {kind: "none"}),
					],
					[
						mkbtn<PanelState>("🖫 Save", "accept", {}, callback("ROOT", req_author, (author_id) => {
							state.edit_mode = {kind: "root"};
							return {kind: "update_state", state};
						})),
						mkbtn<PanelState>("🗑 Delete", "deny", {}, callback("DELETE", req_author, (author_id) => {
							return {kind: "error", msg: "TODO"};
						})),
					],
					[
						mkbtn<PanelState>("Label:", "secondary", {disabled: true}, {kind: "none"}),
						mkbtn<PanelState>("Set Text", "secondary", {}, callback("SET_TEXT", req_author, (author_id) => {
							state.edit_mode = {...ostate, kind: "edit_button_label"};
							return {kind: "update_state", state};
						})),
						mkbtn<PanelState>("Set Emoji", "secondary", {}, callback("SET_EMOJI", req_author, (author_id) => {
							return {kind: "error", msg: "TODO"};
						})),
					],
					...btn.action.kind === "link" ? [] : [[
						mkbtn<PanelState>("Color:", "secondary", {disabled: true}, {kind: "none"}),
						...([["Blurple", "primary"], ["Gray", "secondary"], ["Green", "accept"], ["Red", "deny"]] as const).map(([name, color]) => {
							return mkbtn<PanelState>(name, btn.color === color ? "primary" : "secondary", {}, callback("SETCOL,"+color, req_author, (author_id) => {
								btn.color = color;
								return {kind: "update_state", state};
							}));
						}),
					]],
					[
						mkbtn<PanelState>("Action:", "secondary", {disabled: true}, {kind: "none"}),
						...([["Nothing", "nothing"], ["Role", "role"], ["Link", "link"]] as const).map(([name, kind]) => {
							return mkbtn<PanelState>(name, btn.action.kind === kind ? "primary" : "secondary", {}, callback("ACTION,"+kind, req_author, (author_id) => {
								btn.action = {kind: kind};
								if(kind !== "nothing") state.edit_mode = {...ostate, kind: "edit_action"};
								return {kind: "update_state", state};
							}));
						}),
						mkbtn<PanelState>("▸ More", btn.action.kind === "link" ? "primary" : "secondary", {}, callback("ACTION_more", req_author, (author_id) => {
							return {kind: "error", msg: "TODO"};
						})),
					],
				],
				allowed_mentions: {parse: []},
			};
		} else if(state.edit_mode.kind === "edit_button_label") {
			const ostate = state.edit_mode;
			const btn = state.rows[state.edit_mode.btn_row]![state.edit_mode.btn_col]!;
			request.requestInput("EDIT_BUTTON_LABEL", state.initiator);
			return {
				content: "​",
				embeds: [{
					color: 0x2F3136,
					title: "Set Label",
					description: "<:slash:848339665093656607>give text",
				}],
				components: [
					[
						mkbtn<PanelState>("🖫 Save", "accept", {}, callback("SAVE", req_author, (author_id) => {
							const result = request.getTextInput("EDIT_BUTTON_LABEL", author_id);
							if(result.kind === "error") {
								return {kind: "error", msg: result.message};
							}else{
								const is_valid = isValidLabel(result.value);
								if(is_valid != null) return {kind: "error", msg: is_valid};
								state.edit_mode = {...ostate, kind: "edit_button"};
								btn.label = result.value;
								return {kind: "update_state", state};
							}
						})),
						mkbtn<PanelState>("🗑 Cancel", "deny", {}, callback("CANCEL", req_author, (author_id) => {
							state.edit_mode = {...ostate, kind: "edit_button"};
							return {kind: "update_state", state};
						})),
					],
				],
				allowed_mentions: {parse: []},
			};
		} else if(state.edit_mode.kind === "edit_action") {
			const ostate = state.edit_mode;
			const btn = state.rows[state.edit_mode.btn_row]![state.edit_mode.btn_col]!;
			let action_cfg: RenderActionRow<PanelState>[];
			if(btn.action.kind === "nothing") {
				action_cfg = [
					[
						mkbtn<PanelState>("Nothing to configure.", "secondary", {disabled: true}, {kind: "none"}),
					],
				];
			}else if(btn.action.kind === "link") {
				action_cfg = [
					[
						mkbtn<PanelState>("URL:", "secondary", {disabled: true}, {kind: "none"}),
						...btn.action.url ? [
							mkbtn<PanelState>((btn.action.url || "​").substr(0, 80), "secondary", {disabled: true}, {kind: "none"}),
						] : [],
						mkbtn<PanelState>("🖉 Edit", btn.action.url ? "primary" : "secondary", {}, callback("SET_URL", req_author, (author_id) => {
							return {kind: "error", msg: "TODO"};
						})),
					],
				];
			}else{
				action_cfg = [
					[
						mkbtn<PanelState>("TODO "+btn.action.kind, "secondary", {disabled: true}, {kind: "none"}),
					],
				];
			}
			return {
				content: "​",
				embeds: [],
				components: [
					[
						mkbtn<PanelState>("< Back", "secondary", {}, callback("BACK", req_author, (author_id) => {
							state.edit_mode = {...ostate, kind: "edit_button"};
							return {kind: "update_state", state};
						})),
						...([["Nothing", "nothing"], ["Role", "role"], ["Link", "link"]] as const).map(([name, kind]) => {
							return mkbtn<PanelState>(name, btn.action.kind === kind ? "primary" : "secondary", {}, callback("ACTION,"+kind, req_author, (author_id) => {
								btn.action = {kind: kind};
								return {kind: "update_state", state};
							}));
						}),
						mkbtn<PanelState>("▸ More", btn.action.kind === "link" ? "primary" : "secondary", {}, callback("ACTION_more", req_author, (author_id) => {
							return {kind: "error", msg: "TODO"};
						})),
					],
					...action_cfg,
				],
				allowed_mentions: {parse: []},
			};
		}
		return {
			content: "Error! TODO "+state.edit_mode.kind,
			embeds: [],
			components: [
				[mkbtn<PanelState>("Continue", "primary", {}, callback("ROOT", req_author, (author_id) => {
					state.edit_mode = {kind: "root"};
					return {kind: "update_state", state};
				}))],
			],
			allowed_mentions: {parse: []},
		};
	}
}

export const PanelEditor: Game<PanelState> = {
	kind: "PANL",
	init({author_id}): PanelState {
		return {
			initiator: author_id,
			rows: [],
			edit_mode: {kind: "root"},
		};
	},
	render(state, key, info) {
		return renderResultToResult(newRender(state), key);
	},
	// rather than a seperate handleInteraction, what if it called render() again and searched
	// for the thing with the specified key
	// I think that's a bad idea b/c there might be issues with updates
	// or it could say "The bot has updated, press [] to continue." and then it'd just redraw
	// the panel
	// ok I think that's a good idea actually
	handleInteraction(opts): HandleInteractionResponse<PanelState> {
		return renderResultToHandledInteraction(newRender(opts.state), opts);
	},
};