import { AtMention, Button, ComponentButtonSpec, InteractionResponse, LocalizedString, MarkdownText, Message, MessageElement, registerPersistentElement, renderEphemeral, u } from "../../fancylib";

export function RockPaperScissors({state, updateState}: {state: RPSState, updateState: (ns: RPSState) => InteractionResponse}): MessageElement {
	if(state.p1.choice && state.p2?.choice) {
		if(state.p1.choice === state.p2.choice) {
			return Message({
				text: [
					u("Tie. "),
					AtMention({user: state.p1.id, ping: false}),
					u(" and "),
					AtMention({user: state.p2.id, ping: false}),
					u("'s "+(state.p1.choice.endsWith("s") ? state.p1.choice : state.p1.choice + "s")),
					u(" refuse to fight eachother. No one wins."),
				],
			});
		}
		const rps_beats: {[key in RPSChoice]: [RPSChoice, LocalizedString, LocalizedString]} = {
			rock: ["scissors", u("smashes"), u(" to bits. ")],
			scissors: ["paper", u("cut up"), u(" into shreds. ")],
			paper: ["rock", u("covers"), u(". ")],
		};
		const winner = rps_beats[state.p1.choice][0] === state.p2.choice ? state.p1 : state.p2;
		const loser = winner === state.p1 ? state.p2 : state.p1;
		const verbs = rps_beats[winner.choice!][1];
		const flavour = rps_beats[winner.choice!][2];
		return Message({
			text: [
				AtMention({user: winner.id, ping: true}),
				u("'s "+winner.choice+" "+verbs+" "),
				AtMention({user: loser.id, ping: false}),
				u("'s "+loser.choice+flavour),
				AtMention({user: winner.id, ping: true}),
				u(" wins."),
			],
			// we could add a gif attachment showing what happens
		});
	}
	const pinfo = (player: "p1" | "p2"): MarkdownText[] => {
		const p = state[player];
		return [
			u("Player "+player+": "),
			p != null ? [
				AtMention({user: p.id, ping: p.choice == null}),
				u(", "),
				p.choice == null ? [
					{kind: "italic", content: u("Not Ready")},
				] : [
					{kind: "bold", content: u("Ready")}
				],
			] : [
				{kind: "italic", content: u("Press a button below to join")},
			]
		];
	};
	const rpsbtn = (choice: RPSChoice): ComponentButtonSpec => {
		return Button({
			label: choice,
			style: "gray",
			onClick: ev => {
				if(state.p1.id === ev.clicker) {
					if(state.p1.choice == null) {
						return updateState({
							...state,
							p1: {...state.p1, choice},
						});
					}else{
						return renderEphemeral(Message({
							text: u("You cannot change your selection."),
						}), {visibility: "private"});
					}
				}else if(state.p2?.id === ev.clicker) {
					if(state.p2.choice == null) {
						return updateState({
							...state,
							p2: {...state.p2, choice},
						});
					}else{
						return renderEphemeral(Message({
							text: u("You cannot change your selection."),
						}), {visibility: "private"}); // TODO ephemeral
					}
				}else if(state.p2 == null) {
					return updateState({
						...state,
						p2: {id: ev.clicker, choice},
					});
				}else{
					return renderEphemeral(Message({
						text: u("There are already two players in this game."),
					}), {visibility: "private"});
				}
			},
		});
	};
	return Message({
		text: [
			{kind: "bold", content: u("Rock Paper Scissors")}, u("\n"),
			pinfo("p1"), u("\n"),
			pinfo("p2"), u("\n"),
		],
		components: [
			[
				rpsbtn("rock"),
				rpsbtn("paper"),
				rpsbtn("scissors"),
			],
		],
	});
}

type RPSChoice = "rock" | "paper" | "scissors";
type RPSState = {
    p1: {id: string, choice: null | RPSChoice},
    p2: null | {id: string, choice: null | RPSChoice},
};

export const rps = registerPersistentElement<RPSState>("rock_paper_scissors", (state, updateState) => {
	// just store in db as a hash of the raw state
	// no need to keep more complicated stuff
	// oh we also need to know which function to call, that's right
	// ok yeah this is good
	return RockPaperScissors({state, updateState});
});