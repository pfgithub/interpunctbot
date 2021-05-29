import {ButtonStyle, Game, SampleMessage, componentRow, button, HandleInteractionResponse, ButtonComponent, ActionRow} from "./tictactoe";
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

function previewButton(btn: Button, key: string): ButtonComponent {
	if(btn.action.kind === "link") {
		const is_valid_url = isValidURL(btn.action.url ?? "");
		return {
			type: 2,
			style: 5, // URL
			label: btn.label.substr(0, 80) || "​",
			url: is_valid_url ? "https://interpunct.info/invalid-url?reason="+encodeURIComponent(is_valid_url) : btn.action.url!,
			disabled: false,
		};
	}
	return button(key, btn.label.substr(0, 80) || "​", btn.color, {});
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
	render(state, key, info): SampleMessage {
		if(state.edit_mode.kind === "root") return {
			content: "​",
			embeds: [],
			components: [
				...state.rows.map((row, row_idx) => componentRow([
					...row.map((btn, btn_idx) => previewButton(btn, key("EDITBTN,"+row_idx+","+btn_idx))),
					...row.length < 5 ? [
						button(key("ADDBTN,"+row_idx), "+", "accept", {disabled: false}),
					] : [],
				])),
				...state.rows.length < 5 ? [
					componentRow([
						button(key("ADDROW"), "+ Row", "accept", {disabled: false}),
					])] : []
				,
			],
			allowed_mentions: {parse: []},
		}; else if(state.edit_mode.kind === "edit_button") {
			const btn = state.rows[state.edit_mode.btn_row]![state.edit_mode.btn_col]!;
			return {
				content: "​",
				embeds: [],
				components: [
					componentRow([
						button(key("NONE"), "Preview:", "secondary", {disabled: true}),
						previewButton(btn, key("NONE")),
					]),
					componentRow([
						button(key("ROOT"), "🖫 Save", "accept", {}),
						button(key("DELETE"), "🗑 Delete", "deny", {}),
					]),
					componentRow([
						button(key("NONE"), "Label:", "secondary", {disabled: true}),
						button(key("SET_TEXT"), "Set Text", "secondary", {}),
						button(key("SET_EMOJI"), "Set Emoji", "secondary", {}),
					]),
					...btn.action.kind === "link" ? [] : [componentRow([
						button(key("NONE"), "Color:", "secondary", {disabled: true}),
						button(key("SETCOL,primary"), "Blurple", btn.color === "primary" ? "primary" : "secondary", {}),
						button(key("SETCOL,secondary"), "Gray", btn.color === "secondary" ? "primary" : "secondary", {}),
						button(key("SETCOL,accept"), "Green", btn.color === "accept" ? "primary" : "secondary", {}),
						button(key("SETCOL,deny"), "Red", btn.color === "deny" ? "primary" : "secondary", {}),
					])],
					componentRow([
						button(key("NONE"), "Action:", "secondary", {disabled: true}),
						button(key("ACTION,nothing"), "Nothing", btn.action.kind === "nothing" ? "primary" : "secondary", {}),
						button(key("ACTION,role"), "Role", btn.action.kind === "role" ? "primary" : "secondary", {}),
						button(key("ACTION,link"), "Link", btn.action.kind === "link" ? "primary" : "secondary", {}),
						button(key("ACTION_MORE"), "▸ More", "secondary", {}),
					]),
				],
				allowed_mentions: {parse: []},
			};
		} else if(state.edit_mode.kind === "edit_button_label") {
			request.requestInput("EDIT_BUTTON_LABEL", state.initiator);
			return {
				content: "​",
				embeds: [{
					color: 0x2F3136,
					title: "Set Label",
					description: "<:slash:848339665093656607>give text",
				}],
				components: [
					componentRow([
						button(key("SAVE"), "🖫 Save", "accept", {}),
						button(key("CANCEL"), "🗑 Cancel", "deny", {}),
					]),
				],
				allowed_mentions: {parse: []},
			};
		} else if(state.edit_mode.kind === "edit_action") {
			const btn = state.rows[state.edit_mode.btn_row]![state.edit_mode.btn_col]!;
			let action_cfg: ActionRow[];
			if(btn.action.kind === "nothing") {
				action_cfg = [
					componentRow([
						button(key("NONE"), "Nothing to configure", "secondary", {disabled: true}),
					]),
				];
			}else if(btn.action.kind === "link") {
				action_cfg = [
					componentRow([
						button(key("NONE"), "URL:", "secondary", {disabled: true}),
						...btn.action.url ? [
							button(key("NONE"), btn.action.url, "secondary", {disabled: true}),
						] : [],
						button(key("SET_URL"), btn.action.url ?? "🖉 Edit", "secondary", {disabled: false}),
					]),
				];
			}else if(btn.action.kind === "role") {
				action_cfg = [];
			}else{
				action_cfg = [
					componentRow([
						button(key("NONE"), "TODO "+btn.action.kind, "secondary", {disabled: true}),
					]),
				];
			}
			return {
				content: "​",
				embeds: [],
				components: [
					componentRow([
						button(key("BACK"), "< Back", "secondary", {}),
						button(key("ACTION,nothing"), "Nothing", btn.action.kind === "nothing" ? "primary" : "secondary", {}),
						button(key("ACTION,role"), "Role", btn.action.kind === "role" ? "primary" : "secondary", {}),
						button(key("ACTION,link"), "Link", btn.action.kind === "link" ? "primary" : "secondary", {}),
						button(key("ACTION_MORE"), "▸ More", "secondary", {}),
					]),
					...action_cfg,
				],
				allowed_mentions: {parse: []},
			};
		}
		return {
			content: "Error! TODO "+state.edit_mode.kind,
			embeds: [],
			components: [
				componentRow([button(key("ROOT"), "Back", "secondary", {})]),
			],
			allowed_mentions: {parse: []},
		};
	},
	// rather than a seperate handleInteraction, what if it called render() again and searched
	// for the thing with the specified key
	// I think that's a bad idea b/c there might be issues with updates
	// or it could say "The bot has updated, press [] to continue." and then it'd just redraw
	// the panel
	// ok I think that's a good idea actually
	handleInteraction({state, author_id, key_name}): HandleInteractionResponse<PanelState> {
		if(author_id !== state.initiator) return {kind: "error", msg: "This is not your panel."};
		if(key_name === "ROOT") {
			state.edit_mode = {kind: "root"};
			return {kind: "update_state", state};
		}else if(state.edit_mode.kind === "edit_action") { 
			const btn = state.rows[state.edit_mode.btn_row][state.edit_mode.btn_col];
			if(key_name === "BACK") {
				state.edit_mode = {...state.edit_mode, kind: "edit_button"};
				return {kind: "update_state", state};
			}
			if(key_name.startsWith("ACTION,")) {
				const [, action_type] = key_name.split(",") as [string, ButtonAction["kind"]];
				btn.action = {kind: action_type};
				return {kind: "update_state", state};
			}
			return {kind: "error", msg: "TODO support "+key_name};
		}else if(state.edit_mode.kind === "edit_button_label") {
			const btn = state.rows[state.edit_mode.btn_row][state.edit_mode.btn_col];
			if(key_name === "SAVE") {
				const result = request.getTextInput("EDIT_BUTTON_LABEL", author_id);
				if(result.kind === "error") {
					return {kind: "error", msg: result.message};
				}else{
					const is_valid = isValidLabel(result.value);
					if(is_valid != null) return {kind: "error", msg: is_valid};
					state.edit_mode = {...state.edit_mode, kind: "edit_button"};
					btn.label = result.value;
					return {kind: "update_state", state};
				}
			}else if(key_name === "CANCEL") {
				state.edit_mode = {...state.edit_mode, kind: "edit_button"};
				return {kind: "update_state", state};
			}
			return {kind: "error", msg: "TODO support "+key_name};
		}else if(state.edit_mode.kind === "edit_button") {
			const btn = state.rows[state.edit_mode.btn_row][state.edit_mode.btn_col];
			if(key_name === "NONE") {
				return {kind: "update_state", state};
			}
			if(key_name.startsWith("SETCOL,")) {
				const [, color] = key_name.split(",") as [string, ButtonStyle];
				btn.color = color;
				return {kind: "update_state", state};
			}
			if(key_name.startsWith("ACTION,")) {
				const [, action_type] = key_name.split(",") as [string, ButtonAction["kind"]];
				btn.action = {kind: action_type};
				if(action_type !== "nothing") state.edit_mode = {...state.edit_mode, kind: "edit_action"};
				return {kind: "update_state", state};
			}
			if(key_name === "SET_TEXT") {
				state.edit_mode = {...state.edit_mode, kind: "edit_button_label"};
				return {kind: "update_state", state};
			}
			return {kind: "error", msg: "TODO support "+key_name};
		}else if(state.edit_mode.kind === "root") {
			if(key_name.startsWith("EDITBTN,")) {
				const [, btn_row, btn_col] = key_name.split(",") as [string, string, string];
				state.edit_mode = {kind: "edit_button", btn_row: +btn_row, btn_col: +btn_col};
				return {kind: "update_state", state};
			}
			if(key_name === "ADDROW") {
				state.rows.push([{color: "secondary", label: "Button", action: {kind: "nothing"}}]);
				state.edit_mode = {kind: "edit_button", btn_row: state.rows.length - 1, btn_col: 0};
				return {kind: "update_state", state};
			}
			if(key_name.startsWith("ADDBTN,")) {
				const [, btn_idx] = key_name.split(",") as [string, string];
				state.rows[+btn_idx].push({color: "secondary", label: "Button", action: {kind: "nothing"}});
				state.edit_mode = {kind: "edit_button", btn_row: +btn_idx, btn_col: state.rows[+btn_idx].length - 1};
				return {kind: "update_state", state};
			}
			return {kind: "error", msg: "TODO support mode "+state.edit_mode.kind};
		}else return {
			kind: "error",
			msg: "TODO support mode "+state.edit_mode.kind,
		};
	},
};