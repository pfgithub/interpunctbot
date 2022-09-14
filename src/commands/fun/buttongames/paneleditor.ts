import { URL } from "url";
import { assertNever } from "../../../..";
import { globalKnex } from "../../../db";
import Info, { memberCanManageRole } from "../../../Info";
import {
	ButtonStyle,

	buttonStyles, callback, componentRow, CreateOpts, fixID, Game, HandleInteractionResponse,
	IKey,
	mkbtn, RenderActionButton, RenderActionButtonAction,
	RenderActionButtonActionCallbackOpt, RenderActionRow, RenderResult,
	renderResultToHandledInteraction, renderResultToResult,

	requestEmojiInput, requestLongTextInput, requestRoleInput, requestTextInput, SampleMessage
} from "./tictactoe";
import * as d from "discord-api-types/v9";

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
} | {
	kind: "show_error",
	message: string,
} | {
	kind: "show_panel",
	panel?: {owner: string, name: string},
	// making my #rank requests:
	// dropdown of ranks. when you click one it tells you what proof
	// you need in an ephemeral panel and gives you a button
	// to create ticket
} | {
	kind: "open_ticket",
} | {kind: "unsupported"};

type Button = {
	color: ButtonStyle,
	label: string,
	emoji?: string,
	action: ButtonAction,
	disabled?: true,
};
type ButtonRow = Button[];
type SavedState = {
	rows: ButtonRow[],
	content?: string,
};
type PanelState = {
	initiator: string,
	last_saved: number,
	last_saved_as?: {to: "user" | "guild", name: string},
	rows: ButtonRow[],
	content?: string,

	edit_mode: EditMode,
};
type EditMode = {
	kind: "home",
} | {
	kind: "save_panel",
	mode: "save" | "load" | "send",
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
} | {kind: "unsupported"};

function isValidURL(url_in: string): undefined | string {
	if(!url_in) return "No URL";
	if(url_in.length > 512) return "URL must be less than 512 characters";
	let url: URL;
	try {
		url = new URL(url_in);
	}catch(e) {
		return "Invalid URL. URL must start with `http://` or `https://`. "+(e as Error).toString();
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

function previewButton(opts: {safe: boolean}, btn: Button, action: RenderActionButtonAction<PanelState>): RenderActionButton<PanelState> {
	// btn.action.kind === "link" ? ((): RenderActionButtonAction<PanelState> => {
	// 	const is_valid_url = isValidURL(btn.action.url ?? "");
	// 	return {kind: "link", url: is_valid_url ? "https://interpunct.info/invalid-url?reason="+encodeURIComponent(is_valid_url) : btn.action.url!};
	// })() : {kind: "callback", id: key, cb: (author_id) => {
	// 	return {kind: "error", msg: "TODO"};
	// }};
	// TODO use that when no action is provided
	return {
		kind: "button",

		label: btn.label.substr(0, 80) || "​",
		color: btn.action.kind === "link" ? "secondary" : btn.color,
		action: action,
		disabled: false,
		emoji: btn.emoji ? (
			opts.safe
			? {id: "685668888842993833", name: "a", animated: false}
			: {id: btn.emoji, name: "a", animated: false}
		) : undefined,
	};
}

export function encodePanel(state: PanelState): SavedState {
	return {rows: state.rows, content: state.content};
}

function displayPanel(saved_in: SavedState, info: Info, mode: "error" | "preview_error"): {result: "success", message: SampleMessage} | {result: "error", error: string} {
	const saved: SavedState = JSON.parse(JSON.stringify(saved_in));

	for(const row of saved.rows) {
		for(const line of row) {
			if(line.action.kind === "role") {
				const role = info.guild!.roles.resolve(line.action.role_id ?? "0");
				const role_mention = "<@&"+line.action.role_id+"> (@"+line.action.role_name+")";
				if(!role) {
					const error_msg = "Role "+role_mention+" does not exist on this server.";
					if(mode === "error") return {result: "error", error: error_msg};
					line.action = {kind: "show_error", message: error_msg};
					continue;
				}
				if(!memberCanManageRole(info.message.member!, role)) {
					const error_msg = "You do not have permission to give people "+role_mention+". You "+
					"must have permission to Manage Roles and your highest role must be higher than the role you are "+
					"trying to give.";
					if(mode === "error") return {result: "error", error: error_msg};
					line.action = {kind: "show_error", message: error_msg};
					continue;
				}
				if(!memberCanManageRole(info.guild!.me!, role)) {
					const error_msg = "I do not have permission to give people "+role_mention+". I "+
					"must have permission to Manage Roles and my highest role must be higher than the role I am "+
					"trying to give.";
					if(mode === "error") return {result: "error", error: error_msg};
					line.action = {kind: "show_error", message: error_msg};
					continue;
				}
			}
		}
	}
	return {result: "success", message: {
		content: saved.content || "\u200B",
		components: [
			...saved.rows.map(row => {
				return componentRow(row.map((btn): d.APIMessageComponent => {
					const is_link = btn.action.kind === "link";
					const links_to_err = isValidURL(btn.action.kind === "link" ? btn.action.url ?? "" : "");
					const links_to = (links_to_err ?
						"https://interpunct.info/invalid-url?reason="+encodeURIComponent(links_to_err) : btn.action.kind === "link"
						? btn.action.url : "https://interpunct.info/invalid-url?reason="+encodeURIComponent("No link")
					) ?? "https://example.com/";
					const custom_id = btn.action.kind === "link"
						? "*no*"
						: btn.action.kind === "role"
						? "GRANTROLE|"+btn.action.role_id
						: btn.action.kind === "nothing"
						? "NONE"
						: btn.action.kind === "show_error"
						? "ERROR_PERMS"
						: "UNSUPPORTED"
					;
					return {
						type: 2,
						style: is_link ? 5 : buttonStyles[btn.color],
						// not sure why this is necessary; style is 5 | other so shouldn't it be erroring?
						url: is_link ? links_to : undefined as unknown as string,
						disabled: !!btn.disabled,
						custom_id: fixID(is_link ? undefined : custom_id),
						label: btn.label || "\u200b",
						emoji: btn.emoji ? {id: btn.emoji} : undefined,
					};	
				}));
			}),
		],
		allowed_mentions: {parse: []},
		embeds: [],
	}};
}

async function savePanelScreenState(info: Info, mode: "save" | "load" | "send"): Promise<EditMode> {
	const [guild_panels, user_panels] = await Promise.all([
		globalKnex!("panels").select(["name", "last_updated", "created_by"]).where({
			owner_id: info.message.guild!.id,
		}).orderBy("last_updated", "desc").limit(10),
		globalKnex!("panels").select(["name", "last_updated", "created_by"]).where({
			owner_id: info.message.author.id,
		}).orderBy("last_updated", "desc").limit(10),
	]) as [{name: string, last_updated: number, created_by: string}[], {name: string, last_updated: number, created_by: string}[]];

	console.log("Guild panels:", guild_panels);
	console.log("User panels:", user_panels);

	// const save_res = exec("savePanel", {
	// 	mode,
	// 	guild_panels: info.authorPerms.manageBot ? guild_panels : undefined,
	// 	user_panels: user_panels,
	// });
	// if(!save_res.completed) return save_res.data;

	// set the edit_mode to home and also set anything else the save wanted to tell me

	return {kind: "save_panel",
		mode,
		guild_panels: info.authorPerms.manageBot ? guild_panels : undefined,
		user_panels: user_panels,
	};
}

function setButtonText(info: Info, ikey: IKey, btn: Button, state: PanelState): HandleInteractionResponse<PanelState> {
	return requestTextInput<PanelState>(info, ikey, btn.label, (value) => {
		const is_valid = isValidLabel(value);
		if(is_valid != null) return {kind: "error", msg: is_valid};
		btn.label = value;
		return {kind: "update_state", state};
	});
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
					state.edit_mode = await savePanelScreenState(info, "save");
					return {kind: "update_state", state};
				},
			};
		};
		const savePanel = (save_to_id: string, save_name: string, created_by: string, now: number, ss: SavedState): HandleInteractionResponse<PanelState> => ({
			kind: "async",
			handler: async (info) => {
				const last_updated = Date.now();
				await globalKnex!("panels").where({
					owner_id: save_to_id,
					name: save_name,
				}).update({
					last_updated: now,
					created_by,
					data: JSON.stringify(ss),
				});

				state.edit_mode = {kind: "saved"};
				state.last_saved = last_updated;
				state.last_saved_as = {to: save_to_id === created_by ? "user" : "guild", name: save_name};
				return {kind: "update_state", state};
			},
		});
		if(state.edit_mode.kind === "home") {
			const btncount = state.rows.reduce((t, a) => t + a.length, 0);
			return {
				content: "\u200b",
				embeds: [],
				components: [
					[
						mkbtn<PanelState>("Content:", "secondary", {disabled: true}, {kind: "none"}),
						...state.content ? [
							mkbtn<PanelState>(
								state.content.length + "/2000 characters",
								"secondary", {disabled: false}, callback("show_content", req_author, () => {
									return {kind: "reply_hidden", response: {
										content: state.content || "\u200b",
										embeds: [],
										components: [],
										allowed_mentions: {parse: []},
									}};
								}),
							),
						] : [],
						mkbtn<PanelState>("🖉 Edit", state.content ? "secondary" : "primary", {}, callback("SET_CONTENT", req_author, (_, info, ikey) => {
							return requestLongTextInput(info, ikey, state.content ?? "", (restxt) => {
								state.content = restxt;
								return {kind: "update_state", state};
							});
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
							if(state.rows.length === 0) {
								state.rows.push([{color: "secondary", label: "Button", action: {kind: "nothing"}}]);
								state.edit_mode = {kind: "edit_button", btn_row: state.rows.length - 1, btn_col: 0};
								return {kind: "update_state", state};
							}
							state.edit_mode = {kind: "root"};
							return {kind: "update_state", state};
						})),
					],
					[
						mkbtn<PanelState>("🖫 Save Panel", "accept", {}, callback("SAVE", req_author, (author_id) => {
							return savePanelScreen(author_id);
						})),
						mkbtn<PanelState>("👁 Preview", "primary", {}, callback("PREVIEW", req_author, (a, out_info) => {
							const res = displayPanel(encodePanel(state), out_info, "preview_error");
							if(res.result === "error") return {kind: "error", msg: res.result};
							return {kind: "reply_hidden", response: res.message};
						})),
					],
				],
				allowed_mentions: {parse: []},
			};
		}else if(state.edit_mode.kind === "save_panel") {
			const ostate = state.edit_mode;
			// display a list of panels on this server and a "save new" button to save with a custom name
			const performSaveAs = (author_id: string, owner: "author" | "guild", root_info: Info,
				ikey: IKey,
			): HandleInteractionResponse<PanelState> => requestTextInput(root_info, ikey, "", (save_name) => {
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
						state.last_saved_as = {to: owner === "author" ? "user" : "guild", name: save_name};
						return {kind: "update_state", state};
					},
				};
			});
			const performLoad = (
				owner_id: string,
				save_name: string,
				mode: "load" | "send",
			): HandleInteractionResponse<PanelState> => {
				return {
					kind: "async",
					handler: async (info) => {
						const previous_save = await globalKnex!("panels").select(["last_updated", "data"]).where({
							owner_id: owner_id,
							name: save_name,
						}) as {last_updated: number, data: string | Record<string, unknown>}[];
						if(previous_save.length === 0) {
							return {kind: "error", msg: "Panel not found?"};
						}

						const first = previous_save[0]!;
						const new_state: PanelState = {
							...(typeof first.data === "string" ? JSON.parse(first.data) : first.data),
							initiator: state.initiator,
							last_saved: first.last_updated,
							last_saved_as: {to: owner_id === info.message.author.id ? "user" : "guild", name: save_name},
							edit_mode: {kind: "home"},
						};
						if(mode === "send") {
							const msgv = displayPanel(encodePanel(new_state), info, "error");
							if(msgv.result === "error") return {kind: "error", msg: msgv.error};
							return {
								kind: "replace_content",
								content: msgv.message,
							};
						}
						return {kind: "update_state", state: new_state};
					},
				};
			};

			const guild_panels = (ostate.guild_panels ?? []).map((panel, i) => {
				return mkbtn<PanelState>(panel.name, "secondary", {}, callback("SAVEg,"+i, req_author, (author_id, info) => {
					if(ostate.mode === "load" || ostate.mode === "send") {
						return performLoad(info.message.guild!.id, panel.name, ostate.mode);
					}
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
					if(ostate.mode === "load" || ostate.mode === "send") {
						return performLoad(author_id, panel.name, ostate.mode);
					}
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
					[
						...ostate.mode === "load" || ostate.mode === "send" ? [
							mkbtn<PanelState>("+ New", "accept", {}, callback("NEW", req_author, (author_id) => {
								state.edit_mode = {kind: "home"};
								return {kind: "update_state", state};
							})),
						] : [
							mkbtn<PanelState>("< Back", "primary", {}, callback("BACK", req_author, (author_id) => {
								state.edit_mode = {kind: "home"};
								return {kind: "update_state", state};
							})),
							...state.last_saved_as ? [
								mkbtn<PanelState>("Last Save:", "secondary", {disabled: true}, {kind: "none"}),
								mkbtn<PanelState>(state.last_saved_as.to === "user" ? "Yourself" : "Server", "secondary", {disabled: true}, {kind: "none"}),
								mkbtn<PanelState>(state.last_saved_as.name, "secondary", {disabled: true}, {kind: "none"}),
								mkbtn<PanelState>("🖫 Save", "accept", {}, callback("SAVE_AUTO", req_author, (author_id, info, a) => {
									return savePanel(
										state.last_saved_as!.to === "user" ? author_id : info.guild!.id,
										state.last_saved_as!.name,
										author_id,
										Date.now(),
										encodePanel(state),
									);
								})),
							] : [],
						],
					],
					[
						mkbtn<PanelState>("Server Panels:", "secondary", {disabled: true}, {kind: "none"}),
						...ostate.guild_panels ? [
							...ostate.mode === "save" ? [mkbtn<PanelState>("🖫 Save to Server", "accept", {}, callback("SAVE_SERVER", req_author, (author_id, info, a) => {
								return performSaveAs(author_id, "guild", info, a);
							}))] : [],
							...guild_panels.splice(0, ostate.mode === "save" ? 3 : 4),
						] : [
							mkbtn<PanelState>("You do not have permission", "deny", {disabled: true}, {kind: "none"}),
						],
					],
					...guild_panels.length > 0 ? [[
						...guild_panels.splice(0, 4),
						...guild_panels.length >= 0 ? [mkbtn<PanelState>("…", "secondary", {}, callback("SAVEg_more", req_author, (author_id) => {
							return {kind: "error", msg: "TODO more"};
						}))] : [],
					]] : [],
					[
						mkbtn<PanelState>("Your Panels:", "secondary", {disabled: true}, {kind: "none"}),
						...ostate.mode === "save" ? [mkbtn<PanelState>("🖫 Save for Yourself", "accept", {}, callback("SAVE_YOU", req_author, (author_id, info, a) => {
							return performSaveAs(author_id, "author", info, a);
						}))] : [],
						...user_panels.splice(0, ostate.mode === "save" ? 3 : 4),
					],
					...user_panels.length > 0 ? [[
						...user_panels.splice(0, 4),
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
							return savePanel(ostate.save_to, ostate.name, author_id, Date.now(), encodePanel(state));
						})),
						mkbtn<PanelState>("Cancel", "primary", {}, callback("CLOSE", req_author, (author_id) => {
							return savePanelScreen(author_id);
						})),
						mkbtn<PanelState>("👁 Preview This", "secondary", {}, callback("PREVIEW_THIS", req_author, () => {
							return {kind: "error", msg: "TODO"};
						})),
						mkbtn<PanelState>("👁 Preview Saved", "secondary", {}, callback("PREVIEW_OTHER", req_author, () => {
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
					...state.last_saved_as ? [[
						mkbtn<PanelState>("Last Save:", "secondary", {disabled: true}, {kind: "none"}),
						mkbtn<PanelState>(state.last_saved_as.to === "user" ? "Yourself" : "Server", "secondary", {disabled: true}, {kind: "none"}),
						mkbtn<PanelState>(state.last_saved_as.name, "secondary", {disabled: true}, {kind: "none"}),
					]] : [],
					[
						mkbtn<PanelState>("Send", "primary", {}, callback("SEND", req_author, (author_id, info) => {
							const msgv = displayPanel(encodePanel(state), info, "error");
							if(msgv.result === "error") return {kind: "error", msg: msgv.error};
							return {
								kind: "replace_content",
								content: msgv.message,
							};
						})),
						mkbtn<PanelState>("× Close", "deny", {}, callback("CLOSE", req_author, (author_id) => {
							state.edit_mode = {kind: "close"};
							return {kind: "update_state", state};
						})),
						mkbtn<PanelState>("Keep Editing", "secondary", {}, callback("CONTINUE", req_author, (author_id) => {
							state.edit_mode = {kind: "home"};
							return {kind: "update_state", state};
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
						...row.map((btn, btn_idx) => previewButton({safe: true}, btn, callback<PanelState>("EDITBTN,"+row_idx+","+btn_idx, req_author, () => {
							state.edit_mode = {kind: "edit_button", btn_row: row_idx, btn_col: btn_idx};
							return {kind: "update_state", state};
						}))),
						...row.length < 5 ? [
							mkbtn<PanelState>("+", "primary", {}, callback("ADDBTN,"+row_idx, req_author, (_, info, ikey) => {
								const newbtn: Button = {color: "secondary", label: "Button", action: {kind: "nothing"}};
								state.rows[row_idx].push(newbtn);
								state.edit_mode = {kind: "edit_button", btn_row: row_idx, btn_col: state.rows[row_idx].length - 1};
								return setButtonText(info, ikey, newbtn, state);
							})),
						] : [],
					]),
					...omode.show_last ? [] : [[
						...state.rows.length < 5 ? [mkbtn<PanelState>(state.rows.length === 0 ? "+" : "+ Row", "primary", {}, callback("ADDROW", req_author, (_, info, ikey) => {
							const newbtn: Button = {color: "secondary", label: "Button", action: {kind: "nothing"}};
							state.rows.push([newbtn]);
							state.edit_mode = {kind: "edit_button", btn_row: state.rows.length - 1, btn_col: 0};
							return setButtonText(info, ikey, newbtn, state);
						}))] : [mkbtn<PanelState>("Show Last Line", "secondary", {}, callback("SHOWLAST", req_author, () => {
							state.edit_mode = {kind: "root", show_last: true};
							return {kind: "update_state", state};
						}))],
						mkbtn<PanelState>("🖫 Save", "accept", {}, callback("ROOT", req_author, () => {
							state.edit_mode = {kind: "home"};
							return {kind: "update_state", state};
						})),
					]]
				],
				allowed_mentions: {parse: []},
			};
		} else if(state.edit_mode.kind === "edit_button") {
			const ostate = state.edit_mode;
			const btn = state.rows[state.edit_mode.btn_row]![state.edit_mode.btn_col]!;
			return {
				content: "\u200b",
				embeds: [],
				components: [
					[
						mkbtn<PanelState>("Preview:", "secondary", {disabled: true}, {kind: "none"}),
						previewButton({safe: true}, btn, callback("PREVIEW_CLICK", req_author, () => {
							return {kind: "reply_hidden", response: {
								content: "When you click this button, "+btn.action.kind,
								embeds: [],
								components: [],
								allowed_mentions: {parse: []},
							}};
						})),
					],
					[
						mkbtn<PanelState>("Label:", "secondary", {disabled: true}, {kind: "none"}),
						mkbtn<PanelState>("Set Text", "secondary", {}, callback("SET_TEXT", req_author, (author_id, info, ikey) => {
							return setButtonText(info, ikey, btn, state);
						})),
						...btn.label ? [mkbtn<PanelState>("Clear Text", "secondary", {}, callback("CLR_TEXT", req_author, (author_id) => {
							btn.label = "";
							return {kind: "update_state", state};
						}))] : [],
						mkbtn<PanelState>("Set Emoji", "secondary", {}, callback("SET_EMOJI", req_author, (author_id, info, a) => {
							return requestEmojiInput(info, a, (emoji) => {
								btn.emoji = emoji.id;
								return {kind: "update_state", state};
							}, {note: "<:info:508842207089000468> The emoji will only display when you preview or send this panel due to Discord API issues."});
						})),
						...btn.emoji ? [mkbtn<PanelState>("Clear Emoji", "secondary", {}, callback("CLR_EMOJI", req_author, (author_id) => {
							btn.emoji = undefined;
							return {kind: "update_state", state};
						}))] : [],
					],
					[
						mkbtn<PanelState>("Color:", "secondary", {disabled: true}, {kind: "none"}),
						...btn.action.kind === "link" ? [
							mkbtn<PanelState>("Not allowed on links", "secondary", {disabled: true}, {kind: "none"}),
						] : (([["Blurple", "primary"], ["Gray", "secondary"], ["Green", "accept"], ["Red", "deny"]] as const).map(([name, color]) => {
							return mkbtn<PanelState>(name, btn.color === color ? "primary" : "secondary", {}, callback("SETCOL,"+color, req_author, () => {
								btn.color = color;
								return {kind: "update_state", state};
							}));
						})),
					],
					[
						mkbtn<PanelState>("Action:", "secondary", {disabled: true}, {kind: "none"}),
						...([["Nothing", "nothing"], ["Role", "role"], ["Link", "link"]] as const).map(([name, kind]) => {
							return mkbtn<PanelState>(name, btn.action.kind === kind ? "primary" : "secondary", {}, callback("ACTION,"+kind, req_author, (author_id, info, ikey) => {
								if(kind === "link") {
									return requestTextInput(info, ikey, btn.action.kind === "link" ? btn.action.url ?? "" : "", (text) => {
										const is_valid = isValidURL(text);
										if(is_valid != null) return {kind: "error", msg: is_valid};
										btn.action = {kind: "link", url: text};
										return {kind: "update_state", state};
									});
								}
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
						mkbtn<PanelState>("never", "secondary", {disabled: true}, {kind: "none"}),
					],
				];
			}else if(btn.action.kind === "role") {
				const action = btn.action;
				action_cfg = [
					[
						mkbtn<PanelState>("Role:", "secondary", {disabled: true}, {kind: "none"}),
						...action.role_id ? [
							mkbtn<PanelState>("@"+action.role_name, "secondary", {}, callback("SHOW_ROLE", () => {
								return {kind: "reply_hidden", response: {
									content: "<@&"+action.role_id+">",
									embeds: [],
									components: [],
									allowed_mentions: {parse: []},
								}};
							})),
						] : [],
						mkbtn<PanelState>("🖉 Edit", action.role_id ? "secondary" : "primary", {}, callback("SET_ROLE", req_author, (author_id, info, a) => {
							return requestRoleInput(info, a, (role) => {
								if(!memberCanManageRole(info.message.member!, role)) {
									return {kind: "error", msg: "You do not have permission to give people <@&"+role.id+">.\n"
									+ "You need permission to Manage Roles and your highest role must be above <@&"+role.id+">."};
								}
								if(!memberCanManageRole(role.guild.me!, role)) {
									return {kind: "error", msg: "I do not have permission to give people <@&"+role.id+">.\n"
									+ "I need permission to Manage Roles and my highest role must be above <@&"+role.id+">."};
								}
								// const is_valid = isValidURL(result.value);
								// if(is_valid != null) return {kind: "error", msg: is_valid};
								action.role_id = role.id;
								action.role_name = role.name;
								return {kind: "update_state", state};
							});
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

export const PanelEditor: Game<PanelState> & {
	init(o: CreateOpts, m: {mode: "new" | "edit" | "send", search?: string}, info: Info): Promise<PanelState>,
} = {
	kind: "PANL",
	async init({author_id}, {mode, search}, info) {
		let edit_mode: EditMode;
		if(mode === "edit") {
			edit_mode = await savePanelScreenState(info, "load");
		}else if(mode === "new") {
			edit_mode = {kind: "home"};
		}else if(mode === "send") {
			edit_mode = await savePanelScreenState(info, "send");
		}else assertNever(mode);
		return {
			initiator: author_id,
			rows: [],
			edit_mode: edit_mode,
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