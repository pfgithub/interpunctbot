import * as d from "discord-api-types/v9";
import { shortenLink } from "../commands/fun";
import { api, ContextMenuCommandRouter } from "../SlashCommandManager";
import { onRightClick } from "./fancyuser";

export type MessageElement = {
    kind: "message",
    text: string,
};

type Ephemeral = () => MessageElement;
type Persistent = () => MessageElement;

// export function renderEphemeral(element: () => MessageElement): d.APIInteractionResponse;

// function renderEphemeral(() => <Sample />)
// function renderPersistent(initial state, Sample)

export type MessageContextMenuItemElement = {
	label: string,
	onClick: (e: CallFrom.MessageContextMenu) => Ephemeral | Persistent,
};

export function MessageContextMenuItem(
	props: MessageContextMenuItemElement,
): MessageContextMenuItemElement {
	return props;
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
    };
}

export async function renderFromMessageContextMenu(
	element: () => MessageElement,
	interaction: d.APIMessageApplicationCommandInteraction,
): Promise<void> {
	// 1. render the result
	const result = element();

	// 2. if the result has any persistent data to store, store it
	// TODO

	// 3. send it
	if(result.kind === "message") {
		// send an immediate response

		const response: d.APIInteractionResponse = {
			type: d.InteractionResponseType.ChannelMessageWithSource,
			data: {
				content: result.text,
				allowed_mentions: {parse: []},
			},
		};

		await api.api(d.Routes.interactionCallback(
			interaction.id,
			interaction.token,
		)).post({data: response});
	}
}

export function registerFancylib(cmcr: ContextMenuCommandRouter): void {
	const right_click_commands = onRightClick();
	for(const command of right_click_commands) {
		cmcr.message[command.label] = {
			handler: async (info, {interaction}) => {
				const arg: CallFrom.MessageContextMenu = {
					from: "message_context_menu",
					message: interaction.data.resolved.messages[interaction.data.target_id],
					interaction,
				};

				return await renderFromMessageContextMenu(command.onClick(arg), interaction);
			},
		};
	}
}