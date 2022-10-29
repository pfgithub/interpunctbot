import { api } from "../../bot";
import * as crypto from "crypto";
import { APIApplicationCommandOptionBase } from "discord-api-types/payloads/v9/_interactions/_applicationCommands/_chatInput/base";
import * as d from "discord-api-types/v9";
import { assertNever } from "../..";
import { ginteractionhandler } from "../NewRouter";
import { ContextMenuCommandRouter, SlashCommandRouteBottomLevelCallback, SlashCommandRouter } from "../SlashCommandManager";
import { fancylib_persistence } from "./fancyhmr";
import { APIApplicationCommandChannelOption, Snowflake } from "discord-api-types/v9";

// NOTE:
// https://github.com/microsoft/TypeScript/issues/21699
// as soon as this issue is fixed,
// anything that is currently x(Element, {…})
// can be switched to <Element … />
//
// unfortunately it's been open for four years and there's a PR but it slows
// down the compiler so it hasn't been accepted yet.

export type App = {
	message_context_menu: MessageContextMenuItemElement[],
	slash_commands: SlashCommandElement[],
	guildSlashCommands: (guild_id: string) => Promise<SlashCommandElement[]>,
	// doesn't auto update so you'll need to call updateGuildSlashCommands if you do something that should change this
};

export type MessageElement = {
    kind: "message",
    text: MarkdownText,
	components?: undefined | ComponentSpec[],
	attachments?: undefined | MessageAttachment[],
};

export type InteractionResponseAutocomplete = {
	kind: "autocomplete",
	choices: string[],
};
export type InteractionResponseNewMessage = {
	kind: "new_message",
	deferred: false,
	persist: false | {data: unknown, name: string},
	config: InteractionConfig,
	value: MessageElement,
} | {
	kind: "new_message",
	deferred: true,
	config: InteractionConfig,
	value: Promise<InteractionResponseNewMessage> | (() => Promise<InteractionResponseNewMessage>),
};
export type InteractionResponseUpdateState = {
	kind: "edit_original",
	// deferred: false,
	persist: false | {data: unknown, name: string},
	value: MessageElement,
};
// we're skipping deferred update original for now because it needs
// weird behaviour for errors
//  | {
// 	kind: "edit_original",
// 	deferred: true,
// 	value: Promise<InteractionResponseUpdateState>,
// };

export type AutocompleteInteractionResponse = InteractionResponseAutocomplete;
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

// * we should not have to use a deferred render for a short async wait (ie: db transactions)
// we should only use this for things we expect might take a while
// alternatively, we can include a speed in the config. like "speed": slow (for external network requests) or "speed": fast
// for db requests
export function renderDeferred(config: InteractionConfig, value: () => Promise<MessageElement>): InteractionResponseNewMessage {
	return {
		kind: "new_message",
		deferred: true,
		config,
		value: value().then(r => {
			return renderEphemeral(r, config);
		}),
	};
}

// ?? rename this??
export function renderEphemeral(element: MessageElement, opts: InteractionConfig): InteractionResponseNewMessage {
	return {
		kind: "new_message",
		deferred: false,
		persist: false,
		config: opts,
		value: element,
	};
}

export function renderError(message: LocalizedString): InteractionResponseNewMessage {
	return renderEphemeral(Message({
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
			deferred: false,
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


// this would be easier if args was an object {name: value}
export type FlattenArgs<Args extends SlashCommandArgs> = {
	// TODO: support optional args
	// not sure why that [1] thing is needed
	[key in keyof Args]: (Args[key] extends SlashCommandArgBase<infer T, infer U> ? [T, U] : [never, never])[1]
};

export type SlashCommandElement = SlashCommandGroupElement | SlashCommandLeafElement<SlashCommandArgs>;
export type SlashCommandGroupElement = {
	kind: "slash_command_group",
	label: LocalizedString,
	description: LocalizedString,
	children: SlashCommandElement[],
};
export type SlashCommandArgPostprocessRes<U> = {
	kind: "success",
	value: U,	
} | {
	kind: "error",
	message: string,
};
export interface SlashCommandArgBase<T, U> {
	description: string;
	required: boolean;
	postprocess: (v: T, c: CallFrom.Interaction) => Promise<SlashCommandArgPostprocessRes<U>>;
	__t_is?: undefined | T;
	__u_is?: undefined | U;
	// autofill?: (current_input) => …
}
export interface SlashCommandArgAutocompletable<T, U> extends SlashCommandArgBase<T, U> {
	autocomplete?: null | ((v: T, c: CallFrom.Interaction) => Promise<AutocompleteInteractionResponse>);
}
export interface SlashCommandAttachmentArg<U> extends SlashCommandArgBase<
	d.APIApplicationCommandInteractionDataAttachmentOption, U
> {
	kind: "attachment";
}
export interface SlashCommandTextArg<U> extends SlashCommandArgAutocompletable<
	d.APIApplicationCommandInteractionDataStringOption, U
> {
	kind: "text";
}
type ChannelTypesOptions = "all" | Exclude<APIApplicationCommandChannelOption["channel_types"], undefined>;
export interface SlashCommandChannelArg<U> extends SlashCommandArgBase<
	d.APIApplicationCommandInteractionDataChannelOption, U
> {
	kind: "channel";
	channel_types: ChannelTypesOptions;
}
export interface SlashCommandUserArg<U> extends SlashCommandArgBase<
	d.APIApplicationCommandInteractionDataUserOption, U
> {
	kind: "user";
}
export interface SlashCommandRoleArg<U> extends SlashCommandArgBase<
	d.APIApplicationCommandInteractionDataRoleOption, U
> {
	kind: "role";
}
export type SlashCommandArg =
	| SlashCommandAttachmentArg<unknown>
	| SlashCommandTextArg<unknown>
	| SlashCommandChannelArg<unknown>
	| SlashCommandUserArg<unknown>
	| SlashCommandRoleArg<unknown>
;
export type SlashCommandArgs = {
	[key: string]: SlashCommandArg,
};
export type SlashCommandLeafElement<Args extends SlashCommandArgs> = {
	kind: "slash_command",
	label: LocalizedString,
	description: LocalizedString,
	args: Args,
	onSend: (e: CallFrom.SlashCommand<SlashCommandArgs>) => Promise<SlashCommandInteractionResponse>,
};

export function SlashCommandGroup(props: Omit<SlashCommandGroupElement, "kind">): SlashCommandGroupElement {
	return {
		kind: "slash_command_group",
		...props,
	};
}

export function SlashCommand<T extends SlashCommandArgs>(props: Omit<SlashCommandLeafElement<T>, "kind" | "onSend"> & {
	onSend: (e: CallFrom.SlashCommand<T>) => Promise<SlashCommandInteractionResponse>,
}): SlashCommandLeafElement<T> {
	return {
		kind: "slash_command",
		...props,
		onSend: props.onSend as (e: CallFrom.SlashCommand<SlashCommandArgs>) => Promise<SlashCommandInteractionResponse>,
	};
}

export function SlashCommandArgAttachment(props: {
	description: string,
	required?: undefined | boolean,
}): SlashCommandAttachmentArg<Snowflake> {
	return {
		kind: "attachment",

		description: props.description,
		required: props.required ?? true,
		postprocess: async (v) => ({kind: "success", value: v.value}),
	};
}

export function SlashCommandArgText(props: {
	description: string,
	required?: undefined | boolean,
}): SlashCommandTextArg<string> {
	return {
		kind: "text",

		description: props.description,
		required: props.required ?? true,
		postprocess: async (v) => ({kind: "success", value: v.value}),
	};
}

export function SlashCommandArgChannel(props: {
	description: string,
	channel_types: ChannelTypesOptions,
	required?: undefined | boolean,
}): SlashCommandChannelArg<string> {
	return {
		kind: "channel",

		description: props.description,
		channel_types: props.channel_types,
		required: props.required ?? true,
		postprocess: async (v) => ({kind: "success", value: v.value}),
	};
}

export function SlashCommandArgUser(props: {
	description: string,
	required?: undefined | boolean,
}): SlashCommandUserArg<string> {
	return {
		kind: "user",

		description: props.description,
		required: props.required ?? true,
		postprocess: async (v) => ({kind: "success", value: v.value}),
	};
}

export function SlashCommandArgRole(props: {
	description: string,
	required?: undefined | boolean,
}): SlashCommandRoleArg<string> {
	return {
		kind: "role",

		description: props.description,
		required: props.required ?? true,
		postprocess: async (v) => ({kind: "success", value: v.value}),
	};
}

export function SlashCommandArgAutocompletableText<T>(props: {
	description: string,
	required?: undefined | boolean,
	autocomplete: (v: d.APIApplicationCommandInteractionDataStringOption, c: CallFrom.Interaction) => Promise<{
		value: null | T,
		autocomplete_entries: string[],
		error_msg: null | string,
	}>,
}): SlashCommandTextArg<T> {
	return {
		kind: "text",
		description: props.description,
		required: props.required ?? true,
		autocomplete: async (v, c) => {
			return {kind: "autocomplete", choices: (await props.autocomplete(v, c)).autocomplete_entries};
		},
		postprocess: async (v, c): Promise<SlashCommandArgPostprocessRes<T>> => {
			const res = await props.autocomplete(v, c);
			if(res.value != null) return {kind: "success", value: res.value};
			return {kind: "error", message: res.error_msg ?? "no error message provided"};
		},
	};
}

export function SlashCommandArgDuration(props: {
	description: string,
	required?: undefined | boolean,
}): SlashCommandTextArg<number> {
	// hmm. this isn't composable. ideally, this would call SlashCommandArgText with a custom postprocess
	// value. we can do that but not sure if it's good.
	const autocomplete = async (v: d.APIApplicationCommandInteractionDataStringOption): Promise<({
		value: null | number,
		autocomplete_entries: string[],
		error_msg: null | string,
	})> => {
		const str = v.value;

		const unit = {
			ms: 1,
			sec: 1000,
			min: 60000,
			hr: 3600000,
			day: 86400000,
			week: 86400000 * 7,
			month: 2629746000,
			year: 31556952000,
			LL: 864000,
			cc: 86400,
			ii: 864,
			qm: 108 / 125,
		};
		const names: { [key: string]: number } = {
			ms: unit.ms,
			milisecond: unit.ms,
			miliseconds: unit.ms,
			s: unit.sec,
			sec: unit.sec,
			secs: unit.sec,
			second: unit.sec,
			seconds: unit.sec,
			m: unit.min,
			min: unit.min,
			mins: unit.min,
			minute: unit.min,
			minutes: unit.min,
			h: unit.hr,
			hr: unit.hr,
			hrs: unit.hr,
			hour: unit.hr,
			hours: unit.hr,
			d: unit.day,
			day: unit.day,
			days: unit.day,
			w: unit.week,
			week: unit.week,
			weeks: unit.week,
			mo: unit.month,
			month: unit.month,
			months: unit.month,
			y: unit.year,
			yr: unit.year,
			year: unit.year,
			years: unit.year,
			ll: unit.LL,
			cc: unit.cc,
			ii: unit.ii,
			qm: unit.qm,
		};

		if (!str.trim()) {
			return {
				value: null,
				autocomplete_entries: [
					"10sec",
					"3min",
					"2hr",
				],
				error_msg: "missing duration",
			};
		}

		let remainder = str.trim();
		let prev_whole = "";
		let result = 0;
		let anyfound = false;

		while (true) {
			if(!remainder.trim()) break;

			const rem_start = remainder;
			if (remainder.startsWith(","))
				remainder = remainder.substr(1).trim();
			const inum = /^[0-9.-]+/.exec(remainder);
			if (!inum || isNaN(+inum[0])) return {
				value: null,
				autocomplete_entries: [
					prev_whole,
					prev_whole + " 10sec",
					prev_whole + " 3min",
					prev_whole + " 2hr",
				],
				error_msg: "missing number"
			};
			const rmderTemp = remainder.substr(inum[0].length).trim();
			const numberv = +inum[0];
			const number_whole = rem_start.substring(0, rem_start.length - rmderTemp.length);

			const unitstr = /^[A-Za-z]+/.exec(rmderTemp);
			if (!unitstr) {
				return {
					value: null,
					autocomplete_entries: [
						prev_whole,
						number_whole + "sec",
						number_whole + "min",
						number_whole + "hr",
					],
					error_msg: "missing unit"
				};
			}
			remainder = rmderTemp;
			const unitname = unitstr[0].toLowerCase();

			if (names[unitname] === undefined) {
				return {
					value: null,
					autocomplete_entries: [
						prev_whole,
						number_whole + "sec",
						number_whole + "min",
						number_whole + "hr",
					],
					error_msg: "unsupported unit: "+unitname
				};
			}
			remainder = remainder.substring(unitstr[0].length).trim();
			result += numberv * names[unitname];
			anyfound = true;

			prev_whole += rem_start.substring(0, rem_start.length - remainder.length);
		}
		if (!anyfound) {
			return {
				value: null,
				autocomplete_entries: [
					"10sec",
					"3min",
					"2hr",
				],
				error_msg: "missing a time. example: '10sec'",
			};
		}

		const nearestMS = Math.round(result);
		if (nearestMS < 0) {
			return {
				value: null,
				autocomplete_entries: [
					"10sec",
					"3min",
					"2hr",
				],
				error_msg: "the time cannot be in the past.",
			};
		}
		
		return {
			value: nearestMS,
			autocomplete_entries: [
				prev_whole,
				prev_whole + " 10sec",
				prev_whole + " 3min",
				prev_whole + " 2hr",
			],
			error_msg: null,
		};
	};
	return SlashCommandArgAutocompletableText({
		description: props.description,
		required: props.required,
		autocomplete,
	});
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
	};
	if('role' in props) return {
		kind: "raw",
		value: "<@&"+props.role+">",
		mentions: {
			users: [],
			roles: props.ping ? [props.role] : [],
			groups: [],
		},
	};
	if('group' in props) return {
		kind: "raw",
		value: "@"+props.group,
		mentions: {
			users: [],
			roles: [],
			groups: props.ping ? [props.group] : [],
		},
	};
	if('channel' in props) return {
		kind: "raw",
		value: "<#"+props.channel+">",
		mentions: {
			users: [],
			roles: [],
			groups: [],
		},
	};
	assertNever(props);
}

export type MessageAttachment = {
	// id: {index of array element}
	filename: string,
	description: undefined | string,
	value: ArrayBuffer,
};

export function Message(props: Omit<MessageElement, "kind">): MessageElement {
	return {
		kind: "message",
		...props,
	};
}

export function ErrorMsg(message: LocalizedString): MessageElement {
	return Message({text: message});
}

export declare namespace CallFrom {
	interface Interaction<T extends d.APIInteraction = d.APIInteraction> {
		interaction: T;
	}
    interface MessageContextMenu extends Interaction<d.APIMessageApplicationCommandInteraction> {
        from: "message_context_menu";
        message: d.APIMessage;
    }
    interface SlashCommand<Args extends SlashCommandArgs> extends Interaction<d.APIChatInputApplicationCommandInteraction> {
        from: "slash_command";
        args: FlattenArgs<Args>;
    }

	interface Message {
		message: d.APIMessage;
	}
	interface TextCommand extends Message {
		from: "text_chat";
		// hmm
		// text chat args need to determine when to stop automatically which is kinda
		// not super fun
		// and they can't autocomplete and stuff
		args: string;
	}
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
		};
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
		};
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
function formatComponents(persist_id: string, components: ComponentSpec[]): d.APIActionRowComponent<d.APIMessageActionRowComponent>[] {
	return components.map((button_row, y): d.APIActionRowComponent<d.APIMessageActionRowComponent> => {
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

async function sendAutocompleteResponse(
	response: AutocompleteInteractionResponse,
	interaction: d.APIApplicationCommandAutocompleteInteraction,
): Promise<void> {
	const cres: d.APIApplicationCommandOptionChoice[] = response.choices.filter((choice, i) => !!choice.trim() && i < 25).map(choice => ({
		name: choice,
		value: choice,
	}));
	const res: d.APIApplicationCommandAutocompleteResponse = {
		type: d.InteractionResponseType.ApplicationCommandAutocompleteResult,
		data: {
			choices: cres,
		},
	};
	await api.api(d.Routes.interactionCallback(
		interaction.id,
		interaction.token,
	)).post({data: res});
}

export async function sendCommandResponse(
	response: SlashCommandInteractionResponse,
	interaction: d.APIApplicationCommandInteraction,
	opts: {is_deferred: boolean} = {is_deferred: false},
): Promise<void> {
	if(response.deferred) {
		const data: d.APIInteractionResponse = {
			type: d.InteractionResponseType.DeferredChannelMessageWithSource,
			data: {
				flags: response.config.visibility === "private" ? d.MessageFlags.Ephemeral : 0,
			},
		};

		if(!opts.is_deferred) await api.api(d.Routes.interactionCallback(
			interaction.id,
			interaction.token,
		)).post({data});

		try{
			const res = await (typeof response.value === "function" ? response.value() : response.value);
			return sendCommandResponse(res, interaction, {is_deferred: true});
		}catch(e) {
			console.log("+%internal error", e);
			return sendCommandResponse(renderError(u("internal error")), interaction, {is_deferred: true});
		}
	}
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
				attachments: result.attachments ? result.attachments.map((ach, index) => {
					return {
						id: "" + index,
						description: ach.description,
						filename: ach.filename,
					};
				}) : undefined,
			},
		};

		const files: djs_request_manager.RawFileOld[] | undefined = result.attachments ? result.attachments.map((ach, i): djs_request_manager.RawFileOld => {
			return {
				name: ach.filename,
				key: "files["+i+"]",
				file: Buffer.from(ach.value),
			};
		}) : undefined;

		console.log("updating something or other", opts.is_deferred, "files:", files, data.data.attachments);

		if(opts.is_deferred) {
			try {
				await api.api(d.Routes.webhookMessage(
					interaction.application_id, interaction.token,
				)).patch({data: data.data, files});
			}catch(e) {
				// [!] don't do this for update message events
				// oh we can send a followup message maybe instead
				// but it can't be ephemeral
				console.log("EBAD", e);
				await api.api(d.Routes.webhookMessage(
					interaction.application_id, interaction.token,
				)).patch({data: {
					content: "✗ An error occured.",
				}});
			}
		} else await api.api(d.Routes.interactionCallback(
			interaction.id,
			interaction.token,
		)).post({data, files});
		console.log("✓ sent!", opts.is_deferred);
	}
}

export declare namespace djs_request_manager {
	// https://github.com/discordjs/discord.js/blob/main/packages/rest/src/lib/RequestManager.ts
	export type RawFile = {
		name: string,
		key?: undefined | string, // `files[${index}]` by default.
		data: Buffer,
	};
	// https://github.com/discordjs/discord.js/blob/ac26d9b1307d63e116b043505e5f925db7ed01aa/packages/discord.js/src/rest/APIRequest.js#L55
	// for discord js v12 or 13 or something, not using the new rest manager
	export type RawFileOld = {
		file: Buffer,
		key: string,
		name: string,
	};
}

export type RoutingOpts = {
	allow_overwrite?: undefined | boolean,
};

export function registerFancylib(cmcr: ContextMenuCommandRouter, scr: SlashCommandRouter, opts: RoutingOpts = {}): void {
	const right_click_commands = fuser.app().message_context_menu;
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

	const slash_commands = fuser.app().slash_commands;
	for(const command of slash_commands) {
		addRoute(scr, command, opts);
	}
}

async function sendButtonClickResponse(interaction: d.APIMessageComponentInteraction, response: InteractionResponse): Promise<void> {
	if(response.kind === "new_message" && response.deferred) {
		throw new Error("TODO deferred new_message button responses");
	}
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
			autocompleteHandler: async (interaction, options) => {
				// filter options for the focused one
				// handle that one
				const focused_option = options.find(opt => {
					if('focused' in opt) return opt.focused ?? false;
					return false;
				});
				if(focused_option == null) return; // no focused option?
				const matching_opt = command.args[focused_option.name];
				if(matching_opt == null) return; // no matching opt?
				if(matching_opt.kind === "text") {
					if(focused_option.type !== d.ApplicationCommandOptionType.String) return; // ?
					if(matching_opt.autocomplete == null) return; // ?
					const ac_res = await matching_opt.autocomplete(focused_option, {interaction});

					await sendAutocompleteResponse(ac_res, interaction);
				}else{
					return; // not the right type?
				}
			},
			handler: async (info, interaction, options) => {
				let got_error: null | LocalizedString = null;
				const arg: CallFrom.SlashCommand<SlashCommandArgs> = {
					from: "slash_command",
					// TODO: check that the option value type matches the expected one configured in the command
					// [there is a one hour period where stuff might be wrong]
					args: Object.fromEntries(await Promise.all(options.map(async (opt): Promise<[string, unknown]> => {
						const matching_opt = command.args[opt.name];
						if(matching_opt == null) {
							got_error = u("arg provided not specified in command");
							return ["", 0];
						}
						const optval = await matching_opt.postprocess(opt as unknown as never, {interaction});
						if(optval.kind === "error") {
							got_error = u("error in argument ["+optval.message+"]: "+optval.message);
							return ["", 0];
						}
						return [opt.name, optval.value];
					}))) as any,
					interaction: interaction as d.APIChatInputApplicationCommandInteraction,
				};
				if(got_error != null) return await sendCommandResponse(renderError(got_error), interaction);

				return await sendCommandResponse(await command.onSend(arg), interaction);
			},
			args_raw: Object.entries(command.args).map(([name, arg]): d.APIApplicationCommandBasicOption => {
				const shared = <T extends d.ApplicationCommandOptionType>(type: T): APIApplicationCommandOptionBase<T> => ({
					type,
					name: name,
					description: arg.description,
					required: arg.required,
				});
				if(arg.kind === "attachment") return {
					...shared(d.ApplicationCommandOptionType.Attachment),
				};
				if(arg.kind === "text") return {
					...shared(d.ApplicationCommandOptionType.String),
					autocomplete: arg.autocomplete != null,
				};
				if(arg.kind === "channel") return {
					...shared(d.ApplicationCommandOptionType.Channel),
					channel_types: arg.channel_types === "all" ? undefined : arg.channel_types,
				};
				if(arg.kind === "user") return {
					...shared(d.ApplicationCommandOptionType.User),
				};
				if(arg.kind === "role") return {
					...shared(d.ApplicationCommandOptionType.Role),
				};
				assertNever(arg);
			}),
		};
		if(router[command.label] && disallow_overwrite) throw new Error("already exists label: "+command.label);

		router[command.label] = route;
	}else if(command.kind === "slash_command_group") {
		const route = router[command.label] ??= {
			description: command.description,
			subcommands: {},
		};
		if(!('subcommands' in route)) throw new Error("already exists label: "+command.label+" not subcommands");
		if(route.description !== command.description) throw new Error("already exists and different descriptions: "+command.label);
		for(const cmd of command.children) addRoute(route.subcommands, cmd, opts);
	}else assertNever(command);
}

export function updateGuildSlashCommands(guild_id: string): Promise<void> {
	throw new Error("TODO");
}

export function destroyFancylib(): void {
	// nothing to do;
}

const fuser = require("./fancyuser") as typeof import("./fancyuser");