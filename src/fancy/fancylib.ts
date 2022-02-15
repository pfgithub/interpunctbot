import * as d from "discord-api-types/v9";
import { assertNever } from "../..";
import { api, ContextMenuCommandRouter, SlashCommandRouteBottomLevelCallback, SlashCommandRouter } from "../SlashCommandManager";
import * as crypto from "crypto";
import { ginteractionhandler } from "../NewRouter";
import { fancylib_persistence } from "./fancyhmr";

// NOTE:
// https://github.com/microsoft/TypeScript/issues/21699
// as soon as this issue is fixed,
// anything that is currently x(Element, {…})
// can be switched to <Element … />
//
// unfortunately it's been open for four years and there's a PR but it slows
// down the compiler so it hasn't been accepted yet.

export type MessageElement = {
    kind: "message",
    text: MarkdownText,
	components?: undefined | ComponentSpec[],
};

export type InteractionResponseNewMessage = {
	kind: "new_message",
	persist: false | {data: unknown, name: string},
	config: InteractionConfig,
	value: MessageElement,
};
export type InteractionResponseUpdateState = {
	kind: "edit_original",
	persist: false | {data: unknown, name: string},
	value: MessageElement,
};

export type SlashCommandInteractionResponse = InteractionResponseNewMessage;
export type InteractionResponse = SlashCommandInteractionResponse | InteractionResponseUpdateState;

type InteractionConfig = {
	visibility: "public" | "private",
};

export type LocalizedString = string & {__is_user_str: "is"};

/// a string that is shown to the user
export function u(text: string): LocalizedString {
	return text as unknown as LocalizedString;
}

export function renderEphemeral(element: MessageElement, opts: InteractionConfig): InteractionResponseNewMessage {
	return {
		kind: "new_message",
		persist: false,
		config: opts,
		value: element,
	};
}

export function renderError(message: LocalizedString): InteractionResponseNewMessage {
	return renderEphemeral(x(Message, {
		text: u("× Error: "+message),
	}), {visibility: "private"});
}

const persistent_elements = new Map<string, PersistentElement<any>>();

export type PersistentElement<State> = (
	state: State,
	updateState: (ns: State) => InteractionResponse,
) => MessageElement;
export function registerPersistentElement<State>(
	name: string,
	element: PersistentElement<State>,
): (initial_state: State, opts: InteractionConfig) => InteractionResponseNewMessage {
	persistent_elements.set(name, element);

	return (initial_state, opts): InteractionResponseNewMessage => {
		const rerender = () => element(initial_state, (ns): InteractionResponse => {
			throw new Error("Event handlers should not be called from registerPersistentElement");
		});
		return {
			kind: "new_message",
			persist: {data: initial_state, name},
			config: opts,
			value: rerender(),
		};
	};
}

// function renderEphemeral(() => <Sample />)
// function renderPersistent(initial state, Sample)

export type MessageContextMenuItemElement = {
	label: string,
	onClick: (e: CallFrom.MessageContextMenu) => InteractionResponseNewMessage,
};

export function MessageContextMenuItem(
	props: MessageContextMenuItemElement,
): MessageContextMenuItemElement {
	return props;
}

export type SlashCommandElement = SlashCommandGroupElement | SlashCommandLeafElement<unknown>;
export type SlashCommandGroupElement = {
	kind: "slash_command_group",
	default_permission?: undefined | boolean,
	label: LocalizedString,
	description: LocalizedString,
	children: SlashCommandElement[],
};
export type SlashCommandLeafElement<Args> = {
	kind: "slash_command",
	label: LocalizedString,
	description: LocalizedString,
	children: unknown[],
	onSend: (e: CallFrom.SlashCommand<Args>) => SlashCommandInteractionResponse,
};

export function SlashCommandGroup(props: Omit<SlashCommandGroupElement, "kind">): SlashCommandGroupElement {
	return {
		kind: "slash_command_group",
		...props,
	};
}

export function SlashCommand(props: Omit<SlashCommandLeafElement<unknown>, "kind">): SlashCommandLeafElement<unknown> {
	return {
		kind: "slash_command",
		...props,
	};
}

export function x<Props, Result>(a: (props: Props) => Result, props: Props): Result {
	return a(props);
}

export type ButtonClickEvent = {
	clicker: string,
	// … more
};

export type ComponentButtonSpec = {
    kind: "button",
    label: string,
    style: "red" | "blue" | "gray",
    onClick: (event: ButtonClickEvent) => InteractionResponse,
};
export type ComponentSpec = ComponentButtonSpec[];

export function Button(props: Omit<ComponentButtonSpec, "kind">): ComponentButtonSpec {
	return {
		kind: "button",
		...props,
	};
}

export type MdTxtMentions = {
	users: string[],
	roles: string[],
	groups: ("everyone" | "here")[],
};
export type MarkdownText = {
	kind: "bold",
	content: MarkdownText,
} | {
	kind: "italic",
	content: MarkdownText,
} | {
	kind: "raw",
	value: string,
	mentions: MdTxtMentions,
} | LocalizedString | MarkdownText[];

export function AtMention(props: {
	user: string,
	ping: boolean,
} | {
	role: string,
	ping: boolean,
} | {
	group: "everyone" | "here",
	ping: boolean,
} | {
	channel: string,
}): MarkdownText {
	if('user' in props) return {
		kind: "raw",
		value: "<@!"+props.user+">",
		mentions: {
			users: props.ping ? [props.user] : [],
			roles: [],
			groups: [],
		},
	}
	if('role' in props) return {
		kind: "raw",
		value: "<@&"+props.role+">",
		mentions: {
			users: [],
			roles: props.ping ? [props.role] : [],
			groups: [],
		},
	}
	if('group' in props) return {
		kind: "raw",
		value: "@"+props.group,
		mentions: {
			users: [],
			roles: [],
			groups: props.ping ? [props.group] : [],
		},
	}
	if('channel' in props) return {
		kind: "raw",
		value: "<#"+props.channel+">",
		mentions: {
			users: [],
			roles: [],
			groups: [],
		},
	}
	assertNever(props);
}

export function Message(props: {
    text: MarkdownText,
    components?: ComponentSpec[],
}): MessageElement {
	return {
		kind: "message",
		text: props.text,
		components: props.components,
	};
}

export function ErrorMsg(message: LocalizedString): MessageElement {
	return Message({text: message});
}

export declare namespace CallFrom {
    type MessageContextMenu = {
        from: "message_context_menu",
        message: d.APIMessage,
		interaction: d.APIMessageApplicationCommandInteraction,
    };
    type SlashCommand<Args> = {
        from: "slash_command",
        args: Args,
		interaction: d.APIApplicationCommandInteraction,
    };
}

function formatMarkdownTextInternal(mdtxt: MarkdownText): {
	content: string,
	mentions: MdTxtMentions,
} {
	if(Array.isArray(mdtxt)) {
		const resv = mdtxt.map(itm => formatMarkdownTextInternal(itm));
		return {
			content: resv.map(v => v.content).join(""),
			// TODO this better
			mentions: resv.reduce<MdTxtMentions>((t, a) => ({
				groups: [...t.groups, ...a.mentions.groups],
				users: [...t.users, ...a.mentions.users],
				roles: [...t.roles, ...a.mentions.roles],
			}), {
				groups: [],
				users: [],
				roles: [],
			}),
		};
	}
	if(typeof mdtxt === "string") {
		return {
			content: mdtxt, // TODO escape
			mentions: {roles: [], users: [], groups: []},
		}
	}
	if(mdtxt.kind === "bold") {
		const resv = formatMarkdownTextInternal(mdtxt.content);
		return {
			content: "**"+resv.content+"**", // not technically correct. eg **one***two* is wrong.
			mentions: resv.mentions,
		};
	}
	if(mdtxt.kind === "italic") {
		const resv = formatMarkdownTextInternal(mdtxt.content);
		return {
			content: "*"+resv.content+"*", // not technically correct. eg **one***two* is wrong.
			mentions: resv.mentions,
		};
	}
	if(mdtxt.kind === "raw") {
		return {
			content: mdtxt.value,
			mentions: mdtxt.mentions,
		}
	}
	assertNever(mdtxt);
}

function mtmentions(mtm: MdTxtMentions): d.APIAllowedMentions {
	const users = new Set(mtm.users);
	const roles = new Set(mtm.roles);
	const everyone = mtm.groups.length > -1;

	return {
		// parse specifies fields to infer from from message content
		// so parse: ["users"] would be equivalent to users: […find all user mentions in content]
		parse: everyone ? [d.AllowedMentionsTypes.Everyone] : [],
		users: [...users],
		roles: [...roles],
	};
}

function formatMarkdownText(
	mdtxt: MarkdownText,
): {content: string, allowed_mentions: d.APIAllowedMentions} {
	const res = formatMarkdownTextInternal(mdtxt);
	return {
		content: res.content,
		allowed_mentions: mtmentions(res.mentions),
	};
}

const version = (Date.now() / 1000 |0).toString(36);

function getCustomIdForButton(x: number, y: number, persist_id: string): string {
	// is there any reason version is in here instead of in the persisted content?
	return "#"+x+","+y+"#fancylib|"+version+"|"+persist_id;
}

async function saveValue(value: string): Promise<string> {
	const hash = crypto.createHash("sha256").update(value).digest("base64");
	fancylib_persistence.set(hash, {last_used: Date.now(), value});
	return hash;
}
async function getSavedValue(value: string): Promise<string | null> {
	const v = fancylib_persistence.get(value);
	if(v == null) return null;
	return v.value;
}

// buttons get formatted to
// #{row,col}#fancylib|{version}|{persist_id}
// example:
// "#5,5#fancylib|r75n2p|5T+ud1r+Gv/YANrqe8fI0us1Mp88YUDgWq+/55EtMg0"
function formatComponents(persist_id: string, components: ComponentSpec[]): d.APIActionRowComponent<d.APIMessageComponent>[] {
	return components.map((button_row, y): d.APIActionRowComponent<d.APIMessageComponent> => {
		// if(Array.isArray(button_row))
		// else check .kind eg dropdown
		// (even though dropdown takes up an entire actionrow, for some reason you still
		// have to put it in an actionrow?)
		// (you won't in fancylib)
		return {
			type: d.ComponentType.ActionRow,
			components: button_row.map((button, x): d.APIButtonComponent => {
				return {
					type: d.ComponentType.Button,
					custom_id: getCustomIdForButton(x, y, persist_id),

					label: button.label,
					style: d.ButtonStyle.Secondary,
					emoji: undefined,
					disabled: false,
				};
			}),
		};
	});
}

export async function sendCommandResponse(
	response: SlashCommandInteractionResponse,
	interaction: d.APIApplicationCommandInteraction,
): Promise<void> {
	const result = response.value;

	let persist_id = "NO_PERSIST";
	if(response.persist !== false) {
		persist_id = await saveValue(JSON.stringify({name: response.persist.name, state: response.persist.data}));
	}

	if(result.kind === "message") {
		// send an immediate response

		const data: d.APIInteractionResponse = {
			type: d.InteractionResponseType.ChannelMessageWithSource,
			data: {
				...formatMarkdownText(result.text),
				flags: response.config.visibility === "private" ? d.MessageFlags.Ephemeral : 0,
				components: result.components ? formatComponents(persist_id, result.components) : [],
			},
		};

		await api.api(d.Routes.interactionCallback(
			interaction.id,
			interaction.token,
		)).post({data});
	}
}

export type RoutingOpts = {
	allow_overwrite?: undefined | boolean,
};

export function registerFancylib(cmcr: ContextMenuCommandRouter, scr: SlashCommandRouter, opts: RoutingOpts = {}): void {
	const right_click_commands = fuser.onRightClick();
	for(const command of right_click_commands) {
		cmcr.message[command.label] = {
			handler: async (info, {interaction}) => {
				const arg: CallFrom.MessageContextMenu = {
					from: "message_context_menu",
					message: interaction.data.resolved.messages[interaction.data.target_id],
					interaction,
				};

				return await sendCommandResponse(command.onClick(arg), interaction);
			},
		};
	}

	const slash_commands = fuser.onSlashCommand();
	for(const command of slash_commands) {
		addRoute(scr, command, opts);
	}
}

async function sendButtonClickResponse(interaction: d.APIMessageComponentInteraction, response: InteractionResponse): Promise<void> {
	const result = response.value;

	let persist_id = "NO_PERSIST";
	if(response.persist !== false) {
		persist_id = await saveValue(JSON.stringify({name: response.persist.name, state: response.persist.data}));
	}

	if(result.kind === "message") {
		// send an immediate response

		const data: d.APIInteractionResponse = response.kind === "edit_original" ? {
			type: d.InteractionResponseType.UpdateMessage,
			data: {
				...formatMarkdownText(result.text),
				components: result.components ? formatComponents(persist_id, result.components) : [],
			},
		} : {
			type: d.InteractionResponseType.ChannelMessageWithSource,
			data: {
				...formatMarkdownText(result.text),
				flags: response.config.visibility === "private" ? d.MessageFlags.Ephemeral : 0,
				components: result.components ? formatComponents(persist_id, result.components) : [],
			},
		};

		await api.api(d.Routes.interactionCallback(
			interaction.id,
			interaction.token,
		)).post({data});
	}
}

ginteractionhandler["fancylib"] = {
	handle: async (info, custom_id) => {
		const interaction = info.raw_interaction!.raw_interaction as d.APIMessageComponentInteraction;
		return await sendButtonClickResponse(interaction, await (async (): Promise<InteractionResponse> => {
			const hash = custom_id.split("|")[2];
			if(hash === "NO_PERSIST") {
				return renderError(u("An internal error occured. Message was set to no-persist, but trying to handle button click. State: `"+custom_id+"`"));
			}
			const state_value = await getSavedValue(hash);
			if(!state_value) {
				return renderError(u("Component has expired."));
			}
	
			const {name: element_type, state} = JSON.parse(state_value) as {
				name: string,
				state: string,
			};
			const handler = persistent_elements.get(element_type);
			if(!handler) {
				return renderError(u("Element type "+element_type+" is no longer available."));
			}
	
			const element = handler(state, (new_state) => {
				return {
					kind: "edit_original",
					persist: {data: new_state, name: element_type},
					value: handler(new_state, () => {
						throw new Error("unreachable");
					}),
				};
			});
			let resonclick: undefined | ((ev: ButtonClickEvent) => InteractionResponse);
			(element.components ?? []).forEach((cr, y) => {
				cr.forEach((c, x) => {
					const button_id = getCustomIdForButton(x, y, hash);
					if(custom_id === button_id) {
						resonclick = c.onClick;
					}
				});
			});
			if(!resonclick) {
				console.log("out of date! refreshing component.");
				// TODO: render the component. check if the rendered one
				// is deepEqual to interaction.message
				//
				// if they are, we don't have to refresh the element.

				// check:
				// message.content
				// message.allowed_mentions
				// message.components

				return {
					kind: "edit_original",
					persist: {data: state, name: element_type},
					value: element,
				};
			}
			return resonclick({
				clicker: (interaction.member?.user ?? interaction.user ?? {id: "ENOID"}).id,
			});
		})());
	},
};
function addRoute(router: SlashCommandRouter, command: SlashCommandElement, opts: RoutingOpts) {
	const disallow_overwrite = !(opts.allow_overwrite ?? false);
	if(command.kind === "slash_command") {
		const route: SlashCommandRouteBottomLevelCallback = {
			description: command.description,
			handler: async (info, interaction) => {
				const arg: CallFrom.SlashCommand<unknown> = {
					from: "slash_command",
					args: [],
					interaction,
				};

				return await sendCommandResponse(command.onSend(arg), interaction);
			},
		};
		if(router[command.label] && disallow_overwrite) throw new Error("already exists label: "+command.label);

		router[command.label] = route;
	}else if(command.kind === "slash_command_group") {
		const route = router[command.label] ??= {
			description: command.description,
			default_permission: command.default_permission,
			subcommands: {},
		};
		if(!('subcommands' in route)) throw new Error("already exists label: "+command.label+" not subcommands");
		if(route.description !== command.description) throw new Error("already exists and different descriptions: "+command.label);
		for(const cmd of command.children) addRoute(route.subcommands, cmd, opts);
	}else assertNever(command);
}

export function destroyFancylib() {
	// nothing to do;
}

const fuser = require("./fancyuser") as typeof import("./fancyuser");