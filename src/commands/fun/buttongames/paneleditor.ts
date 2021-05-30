import {ButtonStyle, Game, HandleInteractionResponse, RenderResult, RenderActionRow, renderResultToResult, RenderActionButton, RenderActionButtonAction, renderResultToHandledInteraction, RenderActionButtonActionCallbackOpt, RenderActionButtonActionCallback} from "./tictactoe";
import {URL} from "url";
import * as request from "../../../RequestManager";
import { memberCanManageRole } from "../../../Info";
import {globalKnex} from "../../../db";

// NOTE this will retain all fields, even those
// that are not of the active tag.
type ButtonAction = {
	kind: "nothing",
} | {
	kind: "role",
	role_id?: string, // before adding a panel, the panel must check that you have all the req. perms
	role_name?: string,
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
type SavedState = {
	rows: ButtonRow[],
};
type PanelState = {
	initiator: string,
	last_saved: number,
	rows: ButtonRow[],

	edit_mode: {
		kind: "home",
	} | {
		kind: "save_panel",
		guild_panels: {name: string, last_updated: number, created_by: string}[] | undefined,
		user_panels: {name: string, last_updated: number, created_by: string}[],
	} | {
		kind: "confirm_overwrite",
		name: string,
		last_updated: number,
		created_by: string,
		save_to: string,
	} | {
		kind: "saved",
	} | {
		kind: "root",
		show_last?: true,
	} | {
		kind: "edit_button",
		btn_row: number,
		btn_col: number,
	} | {
		kind: "edit_action",
		btn_row: number,
		btn_col: number,
	} | {
		kind: "close",
	} | {kind: "unsupported"},
};

function isValidURL(url_in: string): undefined | string {
	if(!url_in) return "No URL";
	if(url_in.length > 512) return "URL must be less than 512 characters";
	let url: URL;
	try {
		url = new URL(url_in);
	}catch(e) {
		return "Invalid URL. URL must start with `http://` or `https://`. "+e.toString();
	}
	if(url.protocol !== "http:" && url.protocol !== "https:") {
		return "URL must start with `http://` or `https://`";
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
	return {kind: "callback", id, cb: (author_id, info) => {
		for(const a of cb) {
			const res = a(author_id, info);
			if(res) return res;
		}
		throw new Error("unreachable");
	}};
}

function encodePanel(state: PanelState): SavedState {
	return {rows: state.rows};
}

function newRender(state: PanelState): RenderResult<PanelState> {
	{
		const req_author: RenderActionButtonActionCallbackOpt<PanelState> = (author_id) => {
			if(author_id !== state.initiator) return {kind: "error", msg: "This is not your panel."};
			return undefined;
		};
		const savePanelScreen = (author_id: string): HandleInteractionResponse<PanelState> => {
			return {
				kind: "async",
				handler: async (info) => {
					const [guild_panels, user_panels] = await Promise.all([
						globalKnex!("panels").select(["name", "last_updated", "created_by"]).where({
							owner_id: info.message.guild!.id,
						}).orderBy("last_updated", "desc").limit(8),
						globalKnex!("panels").select(["name", "last_updated", "created_by"]).where({
							owner_id: author_id,
						}).orderBy("last_updated", "desc").limit(8),
					]) as [{name: string, last_updated: number, created_by: string}[], {name: string, last_updated: number, created_by: string}[]];

					console.log("Guild panels:", guild_panels);
					console.log("User panels:", user_panels);

					state.edit_mode = {kind: "save_panel",
						guild_panels: info.authorPerms.manageBot ? guild_panels : [],
						user_panels: user_panels,
					};
					return {kind: "update_state", state};
				},
			};
		};
		if(state.edit_mode.kind === "home") {
			const btncount = state.rows.reduce((t, a) => t + a.length, 0);
			return {
				content: "\u200b",
				embeds: [],
				components: [
					[
						mkbtn<PanelState>("Content:", "secondary", {disabled: true}, {kind: "none"}),
						mkbtn<PanelState>("🖉 Edit", "secondary", {}, callback("SET_CONTENT", req_author, () => {
							// make this use that website. like when you click this button, say do ip!editmsg <msg link>
							// or don't, idk.
							return {kind: "error", msg: "TODO"};
						})),
					],
					[
						mkbtn<PanelState>("Buttons:", "secondary", {disabled: true}, {kind: "none"}),
						...state.rows.length > 0 ? [
							mkbtn<PanelState>(
								state.rows.length + " row"+(state.rows.length !== 1 ? "s" : "")+", "+btncount+" button"+(btncount !== 1 ? "s" : ""),
								"secondary", {disabled: false}, {kind: "none"}
							),
						] : [],
						mkbtn<PanelState>("🖉 Edit", state.rows.length > 0 ? "secondary" : "primary", {}, callback("EDIT_BUTTONS", req_author, () => {
							state.edit_mode = {kind: "root"};
							return {kind: "update_state", state};
						})),
					],
					[
						mkbtn<PanelState>("🖫 Save Panel", "accept", {}, callback("SAVE", req_author, (author_id) => {
							return savePanelScreen(author_id);
						})),
						mkbtn<PanelState>("👁 Preview", "primary", {}, callback("PREVIEW", req_author, () => {
							return {kind: "other", handler: async (info) => {
								if(info.raw_interaction) {
									await info.raw_interaction.replyHiddenHideCommand("TODO preview");
								}else{
									await info.accept();
								}
							}};
						})),
					],
				],
				allowed_mentions: {parse: []},
			};
		}else if(state.edit_mode.kind === "save_panel") {
			const ostate = state.edit_mode;
			// display a list of panels on this server and a "save new" button to save with a custom name
			const performSave = (author_id: string, owner: "author" | "guild"): HandleInteractionResponse<PanelState> => {
				const edit_id = request.requestInput("SAVE_PANEL", author_id);
				const result = request.getTextInput(edit_id, author_id);
				if(result.kind === "error") {
					return {kind: "error", msg: result.message};
				}
				const save_name = result.value;
				if(save_name.length > 60) return {kind: "error", msg: "Name must be at most 60 characters"};

				return {
					kind: "async",
					handler: async (info) => {
						if(owner === "guild") {
							if(!info.authorPerms.manageBot) return {
								kind: "error",
								msg: "You need permission to manage the bot to save to this server. (\"manage server\" permission)",
							};
						}
						const owner_id = owner === "guild" ? info.guild!.id : author_id;
						const previous_save = await globalKnex!("panels").select(["last_updated", "created_by"]).where({
							owner_id: owner_id,
							name: save_name,
						}) as {last_updated: number, created_by: string}[];
						if(previous_save.length !== 0) {
							const first = previous_save[0]!;
							state.edit_mode = {
								kind: "confirm_overwrite",
								name: save_name,
								last_updated: first.last_updated,
								created_by: first.created_by,
								save_to: owner_id,
							};
							return {kind: "update_state", state};
						}

						const last_updated = Date.now();
						await globalKnex!("panels").insert({
							owner_id: owner_id,
							name: save_name,
							last_updated: last_updated,
							created_by: author_id,
							data: JSON.stringify(encodePanel(state)),
						});

						state.edit_mode = {kind: "saved"};
						state.last_saved = last_updated;
						return {kind: "update_state", state};
					},
				};
				// 2: save
				// 3: delete the message
			};

			const guild_panels = (ostate.guild_panels ?? []).map((panel, i) => {
				return mkbtn<PanelState>(panel.name, "secondary", {}, callback("SAVEg,"+i, req_author, (author_id, info) => {
					state.edit_mode = {
						kind: "confirm_overwrite",
						name: panel.name,
						last_updated: panel.last_updated,
						created_by: panel.created_by,
						save_to: info.message.guild!.id,
					};
					return {kind: "update_state", state};
				}));
			});
			const user_panels = ostate.user_panels.map((panel, i) => {
				return mkbtn<PanelState>(panel.name, "secondary", {}, callback("SAVEu,"+i, req_author, (author_id) => {
					state.edit_mode = {
						kind: "confirm_overwrite",
						name: panel.name,
						last_updated: panel.last_updated,
						created_by: panel.created_by,
						save_to: author_id,
					};
					return {kind: "update_state", state};
				}));
			});

			return {
				content: "\u200b",
				embeds: [],
				components: [
					[mkbtn<PanelState>("< Back", "primary", {}, callback("BACK", req_author, (author_id) => {
						state.edit_mode = {kind: "home"};
						return {kind: "update_state", state};
					}))],
					[
						mkbtn<PanelState>("Server Panels:", "secondary", {disabled: true}, {kind: "none"}),
						...ostate.guild_panels ? [
							mkbtn<PanelState>("🖫 Save to Server", "accept", {}, callback("SAVE_SERVER", req_author, (author_id) => {
								return performSave(author_id, "guild");
							})),
							...guild_panels.filter((panel, i) => i < 3),
						] : [
							mkbtn<PanelState>("You do not have permission", "deny", {disabled: true}, {kind: "none"}),
						],
					],
					...guild_panels.length > 3 ? [[
						...guild_panels.filter((panel, i) => i >= 3 && i < 7),
						...guild_panels.length >= 7 ? [mkbtn<PanelState>("…", "secondary", {}, callback("SAVEg_more", req_author, (author_id) => {
							return {kind: "error", msg: "TODO more"};
						}))] : [],
					]] : [],
					[
						mkbtn<PanelState>("Your Panels:", "secondary", {disabled: true}, {kind: "none"}),
						mkbtn<PanelState>("🖫 Save for Yourself", "accept", {}, callback("SAVE_YOU", req_author, (author_id) => {
							return performSave(author_id, "author");
						})),
						...user_panels.filter((panel, i) => i < 3),
					],
					...user_panels.length > 3 ? [[
						...user_panels.filter((panel, i) => i >= 3 && i < 7),
						...user_panels.length >= 7 ? [mkbtn<PanelState>("…", "secondary", {}, callback("SAVEu_more", req_author, (author_id) => {
							return {kind: "error", msg: "TODO more"};
						}))] : [],
					]] : [],
				],
				allowed_mentions: {parse: []},
			};
		}else if(state.edit_mode.kind === "close") {
			return {
				content: "Closed",
				embeds: [],
				components: [],
				allowed_mentions: {parse: []},
			};
		}else if(state.edit_mode.kind === "confirm_overwrite") {
			const ostate = state.edit_mode;
			return {
				content: "Are you sure you want to overwrite `"+ostate.name+"`?\n"
				+ "Last edited by <@"+ostate.created_by+"> "+(Date.now() - ostate.last_updated)+" ms ago."+(
					ostate.last_updated > state.last_saved ? "\nThis was edited" : ""
				),
				embeds: [],
				components: [
					[
						mkbtn<PanelState>("Overwrite", state.last_saved === ostate.last_updated ? "accept" : "deny", {}, callback("OVERWRITE", req_author, (author_id) => {
							return {
								kind: "async",
								handler: async (info) => {
									const last_updated = Date.now();
									await globalKnex!("panels").where({
										owner_id: ostate.save_to,
										name: ostate.name,
									}).update({
										last_updated: last_updated,
										created_by: author_id,
										data: JSON.stringify(encodePanel(state)),
									});

									state.edit_mode = {kind: "saved"};
									state.last_saved = last_updated;
									return {kind: "update_state", state};
								},
							};
						})),
						mkbtn<PanelState>("Cancel", "primary", {}, callback("CLOSE", req_author, (author_id) => {
							return savePanelScreen(author_id);
						})),
						mkbtn<PanelState>("👁 Preview This", "primary", {}, callback("PREVIEW_THIS", req_author, () => {
							return {kind: "error", msg: "TODO"};
						})),
						mkbtn<PanelState>("👁 Preview Saved", "primary", {}, callback("PREVIEW_OTHER", req_author, () => {
							return {kind: "error", msg: "TODO"};
						})),
					],
				],
				allowed_mentions: {parse: []},
			};
		}else if(state.edit_mode.kind === "saved") {
			return {
				content: "<:success:508840840416854026> Your panel has been saved.",
				embeds: [],
				components: [
					[
						mkbtn<PanelState>("Keep Editing", "secondary", {}, callback("CONTINUE", req_author, (author_id) => {
							state.edit_mode = {kind: "home"};
							return {kind: "update_state", state};
						})),
						mkbtn<PanelState>("× Close", "deny", {}, callback("CLOSE", req_author, (author_id) => {
							state.edit_mode = {kind: "close"};
							return {kind: "update_state", state};
						})),
						mkbtn<PanelState>("Send", "primary", {}, callback("SEND", req_author, (author_id) => {
							return {kind: "error", msg: "TODO send"};
						})),
					],
				],
				allowed_mentions: {parse: []},
			};
		}else if(state.edit_mode.kind === "root") {
			const omode = state.edit_mode;
			return {
				content: "\u200b",
				embeds: [],
				components: [
					...state.rows.filter((_, i) => omode.show_last ? true : i < 4).map((row, row_idx): RenderActionRow<PanelState> => [
						...row.map((btn, btn_idx) => previewButton(btn, callback<PanelState>("EDITBTN,"+row_idx+","+btn_idx, req_author, () => {
							state.edit_mode = {kind: "edit_button", btn_row: row_idx, btn_col: btn_idx};
							return {kind: "update_state", state};
						}))),
						...row.length < 5 ? [
							mkbtn<PanelState>("+", "accept", {}, callback("ADDBTN,"+row_idx, req_author, () => {
								state.rows[row_idx].push({color: "secondary", label: "Button", action: {kind: "nothing"}});
								state.edit_mode = {kind: "edit_button", btn_row: row_idx, btn_col: state.rows[row_idx].length - 1};
								return {kind: "update_state", state};
							})),
						] : [],
					]),
					...omode.show_last ? [] : [[
						...state.rows.length < 5 ? [mkbtn<PanelState>("+ Row", "accept", {}, callback("ADDROW", req_author, () => {
							state.rows.push([{color: "secondary", label: "Button", action: {kind: "nothing"}}]);
							state.edit_mode = {kind: "edit_button", btn_row: state.rows.length - 1, btn_col: 0};
							return {kind: "update_state", state};
						}))] : [mkbtn<PanelState>("Show Last Line", "secondary", {}, callback("SHOWLAST", req_author, () => {
							state.edit_mode = {kind: "root", show_last: true};
							return {kind: "update_state", state};
						}))],
						mkbtn<PanelState>("🖫 Save", "accept", {}, callback("ROOT", req_author, () => {
							state.edit_mode = {kind: "home"};
							return {kind: "update_state", state};
						})),
						mkbtn<PanelState>("🗑 Delete", "deny", {}, callback("DELETE", req_author, () => {
							return {kind: "error", msg: "TODO"};
						})),
					]]
				],
				allowed_mentions: {parse: []},
			};
		} else if(state.edit_mode.kind === "edit_button") {
			const edit_id = request.requestInput("EDIT_BUTTON", state.initiator);
			const ostate = state.edit_mode;
			const btn = state.rows[state.edit_mode.btn_row]![state.edit_mode.btn_col]!;
			return {
				content: "\u200b",
				embeds: [],
				components: [
					[
						mkbtn<PanelState>("Preview:", "secondary", {disabled: true}, {kind: "none"}),
						previewButton(btn, callback("PREVIEW_CLICK", req_author, () => {
							return {kind: "other", handler: async (info) => {
								if(info.raw_interaction) {
									const action = btn.action;
									await info.raw_interaction.replyHiddenHideCommand("When you click this button, "+action.kind);
								}else{
									await info.accept();
								}
							}};
						})),
					],
					[
						mkbtn<PanelState>("Label:", "secondary", {disabled: true}, {kind: "none"}),
						mkbtn<PanelState>("Set Text", "secondary", {}, callback("SET_TEXT", req_author, (author_id) => {
							const result = request.getTextInput(edit_id, author_id);
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
						mkbtn<PanelState>("Set Emoji", "secondary", {}, callback("SET_EMOJI", req_author, () => {
							return {kind: "error", msg: "TODO"};
						})),
					],
					...btn.action.kind === "link" ? [] : [[
						mkbtn<PanelState>("Color:", "secondary", {disabled: true}, {kind: "none"}),
						...([["Blurple", "primary"], ["Gray", "secondary"], ["Green", "accept"], ["Red", "deny"]] as const).map(([name, color]) => {
							return mkbtn<PanelState>(name, btn.color === color ? "primary" : "secondary", {}, callback("SETCOL,"+color, req_author, () => {
								btn.color = color;
								return {kind: "update_state", state};
							}));
						}),
					]],
					[
						mkbtn<PanelState>("Action:", "secondary", {disabled: true}, {kind: "none"}),
						...([["Nothing", "nothing"], ["Role", "role"], ["Link", "link"]] as const).map(([name, kind]) => {
							return mkbtn<PanelState>(name, btn.action.kind === kind ? "primary" : "secondary", {}, callback("ACTION,"+kind, req_author, () => {
								btn.action.kind = kind;
								if(kind !== "nothing") state.edit_mode = {...ostate, kind: "edit_action"};
								return {kind: "update_state", state};
							}));
						}),
						mkbtn<PanelState>("▸ More", "secondary", {}, callback("ACTION_more", req_author, () => {
							return {kind: "error", msg: "TODO"};
						})),
					],
					[
						mkbtn<PanelState>("🖫 Save", "accept", {}, callback("SAVE", req_author, () => {
							state.edit_mode = {kind: "root"};
							return {kind: "update_state", state};
						})),
						mkbtn<PanelState>("🗑 Delete", "deny", {}, callback("DELETE", req_author, () => {
							state.rows[ostate.btn_row].splice(ostate.btn_col, 1);
							if(state.rows[ostate.btn_row].length === 0) state.rows.splice(ostate.btn_row, 1);
							state.edit_mode = {kind: "root"};
							return {kind: "update_state", state};
						})),
					],
				],
				allowed_mentions: {parse: []},
			};
		} else if(state.edit_mode.kind === "edit_action") {
			const edit_id = request.requestInput("EDIT_BUTTON", state.initiator);
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
				const action = btn.action;
				action_cfg = [
					[
						mkbtn<PanelState>("URL:", "secondary", {disabled: true}, {kind: "none"}),
						...action.url ? [
							mkbtn<PanelState>(action.url, "secondary", {}, {kind: "link", url: action.url}),
						] : [],
						mkbtn<PanelState>("🖉 Edit", action.url ? "secondary" : "primary", {}, callback("SET_URL", req_author, (author_id) => {
							const result = request.getTextInput(edit_id, author_id);
							if(result.kind === "error") {
								return {kind: "error", msg: result.message};
							}else{
								const is_valid = isValidURL(result.value);
								if(is_valid != null) return {kind: "error", msg: is_valid};
								action.url = result.value;
								return {kind: "update_state", state};
							}
						})),
					],
				];
			}else if(btn.action.kind === "role") {
				const action = btn.action;
				action_cfg = [
					[
						mkbtn<PanelState>("Role:", "secondary", {disabled: true}, {kind: "none"}),
						...action.role_id ? [
							mkbtn<PanelState>("@"+action.role_name, "secondary", {}, callback("SHOW_ROLE", () => {
								return {kind: "other", handler: async (info) => {
									if(info.raw_interaction) {
										await info.raw_interaction.replyHiddenHideCommand("<@&"+action.role_id+">");
									}else{
										await info.accept();
									}
								}};
							})),
						] : [],
						mkbtn<PanelState>("🖉 Edit", action.role_id ? "secondary" : "primary", {}, callback("SET_ROLE", req_author, (author_id, info) => {
							const result = request.getRoleInput(edit_id, author_id);
							if(result.kind === "error") {
								return {kind: "error", msg: result.message};
							}else{
								if(!memberCanManageRole(info.message.member!, result.value)) {
									return {kind: "error", msg: "You do not have permission to give people <@&"+result.value.id+">.\n"
									+ "You need permission to Manage Roles and your highest role must be above <@&"+result.value.id+">."};
								}
								if(!memberCanManageRole(result.value.guild.me!, result.value)) {
									return {kind: "error", msg: "I do not have permission to give people <@&"+result.value.id+">.\n"
									+ "I need permission to Manage Roles and my highest role must be above <@&"+result.value.id+">."};
								}
								// const is_valid = isValidURL(result.value);
								// if(is_valid != null) return {kind: "error", msg: is_valid};
								action.role_id = result.value.id;
								action.role_name = result.value.name;
								return {kind: "update_state", state};
							}
						})),
					],
				];
			}else{
				const action = btn.action;
				action_cfg = [
					[
						mkbtn<PanelState>("TODO "+action.kind, "secondary", {disabled: true}, {kind: "none"}),
					],
				];
			}
			return {
				content: "\u200b",
				embeds: [],
				components: [
					[
						mkbtn<PanelState>("🖫 Save", "accept", {}, callback("BACK", req_author, (author_id) => {
							state.edit_mode = {...ostate, kind: "edit_button"};
							return {kind: "update_state", state};
						})),
						...([["Nothing", "nothing"], ["Role", "role"], ["Link", "link"]] as const).map(([name, kind]) => {
							return mkbtn<PanelState>(name, btn.action.kind === kind ? "primary" : "secondary", {}, callback("ACTION,"+kind, req_author, (author_id) => {
								btn.action.kind = kind;
								return {kind: "update_state", state};
							}));
						}),
						mkbtn<PanelState>("▸ More", "secondary", {}, callback("ACTION_more", req_author, (author_id) => {
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
					state.edit_mode = {kind: "home"};
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
			edit_mode: {kind: "home"},
			last_saved: Date.now(),
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