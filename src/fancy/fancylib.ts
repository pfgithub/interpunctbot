import * as d from "discord-api-types/v9";
import { assertNever } from "../..";
import { api, ContextMenuCommandRouter, SlashCommandRouteBottomLevelCallback, SlashCommandRouter } from "../SlashCommandManager";

export type MessageElement = {
    kind: "message",
    text: string,
};

type InteractionResponse = {
	persist: false | {data: unknown, name: string},
	config: InteractionConfig,
	value: MessageElement,
};

type InteractionConfig = {
	visibility: "public" | "private",
};

export function renderEphemeral(element: () => MessageElement, opts: InteractionConfig): InteractionResponse {
	return {
		persist: false,
		config: opts,
		value: element(),
	};
}

export function renderError(message: string): InteractionResponse {
	return renderEphemeral(() => x(Message, {
		text: "× Error: "+message,
	}), {visibility: "private"});
}

export function registerPersistentElement<State>(
	name: string,
	element: (state: State) => MessageElement,
): (initial_state: State, opts: InteractionConfig) => InteractionResponse {
	// , setState: (new_state: State) => InteractionRespons
	return (initial_state, opts) => {
		return {
			persist: {data: initial_state, name},
			config: opts,
			value: element(initial_state),
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
	label: string,
	description: string,
	children: SlashCommandElement[],
};
export type SlashCommandLeafElement<Args> = {
	kind: "slash_command",
	label: string,
	description: string,
	children: unknown[],
	onSend: (e: CallFrom.SlashCommand<Args>) => InteractionResponse,
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

export type ComponentButtonSpec = {
    kind: "button",
    label: string,
    style: "red" | "blue",
    onClick: () => void,
};
export type ComponentSpec = ComponentButtonSpec;

export function Button(props: Omit<ComponentButtonSpec, "kind">): ComponentSpec {
	return {
		kind: "button",
		...props,
	};
}

export function Message(props: {
    text: string,
    components?: ComponentSpec[],
}): MessageElement {
	return {
		kind: "message",
		text: props.text,
	};
}

export function ErrorMsg(message: string): MessageElement {
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

export async function renderCommandLike(
	response: InteractionResponse,
	interaction: d.APIApplicationCommandInteraction,
): Promise<void> {
	// 1. render the result
	const result = response.value;

	// 2. if the result has any persistent data to store, store it
	// TODO

	// 3. send it
	if(result.kind === "message") {
		// send an immediate response

		const data: d.APIInteractionResponse = {
			type: d.InteractionResponseType.ChannelMessageWithSource,
			data: {
				content: result.text,
				allowed_mentions: {parse: []},
				flags: response.config.visibility === "private" ? d.MessageFlags.Ephemeral : 0,
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

				return await renderCommandLike(command.onClick(arg), interaction);
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

				return await renderCommandLike(command.onSend(arg), interaction);
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