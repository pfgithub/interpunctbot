import {ButtonStyle, Game, SampleMessage, componentRow, button, HandleInteractionResponse} from "./tictactoe";

type Button = {
	color: ButtonStyle,
	label: string,
};
type ButtonCol = Button[];
type ButtonRow = ButtonCol[];
type PanelState = {
	initiator: string,
	rows: ButtonRow[],
};

export const PanelEditor: Game<PanelState> = {
	kind: "PANL",
	render(state, key, info): SampleMessage {
		return {
			content: "Editing Panel…",
			components: [
				componentRow([
					button(key("ADD"), "+", "accept", {disabled: false}),
				]),
			],
			allowed_mentions: {parse: []},
		};
	},
	handleInteraction({state, author_id, key_name}): HandleInteractionResponse<PanelState> {
		return {
			kind: "error",
			msg: "TODO support "+key_name,
		};
	}
};