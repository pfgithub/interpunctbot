import * as d from "discord-api-types/v9";
import { assertNever } from "../..";
import { api, ContextMenuCommandRouter, SlashCommandRouteBottomLevelCallback, SlashCommandRouter } from "../SlashCommandManager";
import * as crypto from "crypto";

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

export function registerPersistentElement<State>(
	name: string,
	element: (
		state: State,
		updateState: (ns: State) => InteractionResponse,
	) => MessageElement,
): (initial_state: State, opts: InteractionConfig) => InteractionResponseNewMessage {
	// , setState: (new_state: State) => InteractionRespons
	return (initial_state, opts): InteractionResponseNewMessage => {
		let state = initial_state;
		const setState = (new_state: State) => {
			state = new_state;
		};

		const rerender = () => element(state, (ns): InteractionResponse => {
			setState(ns);
			return {
				kind: "edit_original",
				// this assumes that this was called on an interaction where
				// edit_original is available and refers to the correct message.
				//
				// hopefully it was.
				persist: {data: state, name},
				value: rerender(),
			}
		});
		return {
			kind: "new_message",
			persist: {data: state, name},
			config: opts,
			value: rerender(),
		};
	};
}

// function renderEphemeral(() => <Sample />)
// function renderPersistent(initial state, Sample)

export type MessageContextMenuItemElement = {
	label: string,
	onClick: (e: CallFrom.MessageContextMenu) => InteractionResponse,
};

export function MessageContextMenuItem(
	props: MessageContextMenuItemElement,
): MessageContextMenuItemElement {
	return props;
}

export type SlashCommandElement = SlashCommandGroupElement | SlashCommandLeafElement<unknown>;
export type SlashCommandGroupElement = {
	kind: "slash_command_group",
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

// buttons get formatted to
// #{row,col}#fancylib|{persist_id}
// example:
// "#5,5#|fancylib|rock_paper_scissors|5T+ud1r+Gv/YANrqe8fI0us1Mp88YUDgWq+/55EtMg0"
// that's 78/100 characters and that is the maximum length as long as
// we don't use any names longer than "rock_paper_scissors"
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
					custom_id: "#"+x+","+y+"#fancylib|"+persist_id,

					label: button.label,
					style: d.ButtonStyle.Secondary,
					emoji: undefined,
					disabled: false,
				};
			}),
		};
	});
}

// fields are only added, never updated
const persistence = new Map<string, {last_used: number, value: string}>();

export async function sendCommandResponse(
	response: SlashCommandInteractionResponse,
	interaction: d.APIApplicationCommandInteraction,
): Promise<void> {
	const result = response.value;

	let persist_id = "@NO_PERSIST@";
	if(response.persist !== false) {
		const stringified = JSON.stringify(response.persist.data);
		const hash = crypto.createHash("sha256").update(stringified).digest("base64");
		persist_id = "@"+response.persist.name+"@"+hash;
		persistence.set(hash, {last_used: Date.now(), value: stringified});
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

export function registerFancylib(cmcr: ContextMenuCommandRouter, scr: SlashCommandRouter): void {
	const fuser = require("./fancyuser");
	// this could allow hot reload once we do diffing and stuff

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
		addRoute(scr, command);
	}
}
function addRoute(router: SlashCommandRouter, command: SlashCommandElement) {
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
		if(router[command.label]) throw new Error("already exists label: "+command.label);

		router[command.label] = route;
	}else if(command.kind === "slash_command_group") {
		const route = router[command.label] ??= {
			description: command.description,
			subcommands: {},
		};
		if(!('subcommands' in route)) throw new Error("already exists label: "+command.label+" not subcommands");
		if(route.description !== command.description) throw new Error("already exists and different descriptions: "+command.label);
		for(const cmd of command.children) addRoute(route.subcommands, cmd);
	}else assertNever(command);
}