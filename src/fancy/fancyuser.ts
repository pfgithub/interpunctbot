import { refreshFancylib } from "./fancyhmr";
import { CallFrom, MessageElement, Message, x, MessageContextMenuItem, MessageContextMenuItemElement, SlashCommandGroup, SlashCommand, renderEphemeral, renderError, SlashCommandElement, registerPersistentElement, u, AtMention, MarkdownText, InteractionResponse, Button, ComponentButtonSpec, LocalizedString } from "./fancylib";

// ok
// I think we're ready - let's start porting commands over
// still have to:
// - persist values in the database
// - hmr for dev experience
// - do what I outlined in fancylib.ts to avoid unnecessary refreshes
// - oh also it would be nice if we could use the source code hash rather than Date.now()
//   for the version. that way things only need to be refreshed if the source changes
// - doesn't matter once we do that thing though

export function Sample(props: {event: CallFrom.MessageContextMenu}): MessageElement {
	return x(Message, {
		text: u("The message ID is <"+props.event.message.id+">"),
	});
}

export function RockPaperScissors({state, updateState}: {state: RPSState, updateState: (ns: RPSState) => InteractionResponse}): MessageElement {
	if(state.p1.choice && state.p2?.choice) {
		if(state.p1.choice === state.p2.choice) {
			return x(Message, {
				text: [
					u("Tie. "),
					x(AtMention, {user: state.p1.id, ping: false}),
					u(" and "),
					x(AtMention, {user: state.p1.id, ping: false}),
					u("'s "+(state.p1.choice.endsWith("s") ? state.p1.choice : state.p1.choice + "s")),
					u(" refuse to fight eachother. No one wins."),
				],
			});
		}
		const rps_beats: {[key in RPSChoice]: [RPSChoice, LocalizedString, LocalizedString]} = {
			rock: ["scissors", u("smashes"), u(" to bits. ")],
			scissors: ["paper", u("cuts up"), u(" into shreds. ")],
			paper: ["rock", u("covers"), u(". ")],
		};
		const winner = rps_beats[state.p1.choice][0] === state.p2.choice ? state.p1 : state.p2;
		const loser = winner == state.p1 ? state.p2 : state.p1;
		const verbs = rps_beats[winner.choice!][1];
		const flavour = rps_beats[winner.choice!][2];
		return x(Message, {
			text: [
				x(AtMention, {user: winner.id, ping: true}),
				u("'s "+winner.choice+" "+verbs+" "),
				x(AtMention, {user: loser.id, ping: false}),
				u("'s "+loser.choice+flavour),
				x(AtMention, {user: winner.id, ping: true}),
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
				x(AtMention, {user: p.id, ping: p.choice == null}),
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
		return x(Button, {
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
						return renderEphemeral(x(Message, {
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
						return renderEphemeral(x(Message, {
							text: u("You cannot change your selection."),
						}), {visibility: "private"}); // TODO ephemeral
					}
				}else if(state.p2 == null) {
					return updateState({
						...state,
						p2: {id: ev.clicker, choice},
					});
				}else{
					return renderEphemeral(x(Message, {
						text: u("There are already two players in this game."),
					}), {visibility: "private"});
				}
			},
		});
	};
	return x(Message, {
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

const rps = registerPersistentElement<RPSState>("rock_paper_scissors", (state, updateState) => {
	// just store in db as a hash of the raw state
	// no need to keep more complicated stuff
	// oh we also need to know which function to call, that's right
	// ok yeah this is good
	return x(RockPaperScissors, {state, updateState});
});

// rather than guild: guild | undefined,
// make a seperate onRightClickInGuid(guild: guild | undefined)
// re-call that any time there's a relevant db change
// we can even use a solid js store to track what's used if we want to be fancy
export function onRightClick(): MessageContextMenuItemElement[] {
	return [
		x(MessageContextMenuItem, {label: u("Sample"), onClick: event => {
			return renderEphemeral(x(Sample, {event}), {visibility: "private"});
		}}),
		/*
        <MessageContextMenuItem onClick={e => renderEphemeral(() => <Sample event={e} />)}>
            Sample
        </MessageContextMenuItem>
        */
	];
}

export function onSlashCommand(): SlashCommandElement[] {
	return [
		x(SlashCommandGroup, {label: u("play"), description: u("Play a game"), children: [
			x(SlashCommand, {label: u("rock_paper_scissors"), description: u("Play a game of rock paper scissors"), children: [
				// player?: User
				// thing?: string, oninput=(text) => [array of suggestions]
			], onSend: event => {
				const user = event.interaction.member?.user ?? event.interaction.user;
				if(!user) return renderError(u("No User"));
				return rps({
					p1: {id: user.id, choice: null},
					p2: null,
				}, {visibility: "public"});
			}}),
		]}),
		x(SlashCommandGroup, {label: u("dev"), description: u("Developer Commands"), children: [
			x(SlashCommand, {label: u("reload_libfancy"), default_permission: false, description: u("Reload libfancy"), children: [], onSend: ev => {
				const user = ev.interaction.member?.user ?? ev.interaction.user;
				if(!user || user.id !== "341076015663153153") return renderError(u("× You can't do that"));
				const result = refreshFancylib();
				return renderEphemeral(x(Message, {
					text: [u(result)],
				}), {visibility: "public"});
			}})
		]}),
		/*
        <SlashCommandGroup label="play">
            <Description></Description>
            <SlashCommand label="rock_paper_scissors" onSend={event => {
                return rps({…});
            }}>
                <NumberArg />
                <UserArg />
                <AutocompleteArg oninput={} />
            </SlashCommand>
        </SlashCommandGroup>
        */
	];
}

// export function ViewSource(call: CallFrom.MessageContextMenu): InteractionResponseSpec {
// 	const resurl =
//         "https://pfg.pw/spoilerbot/spoiler?s=" +
//         encodeURIComponent(call.message.content)
//     ;
// 	const postres = useAsync(shortenLink(resurl));
// 	if(postres.incomplete) return postres.incomplete; // this function will be re-called when the async value is ready
// 	if ("error" in postres.value) return ErrorMsg(postres.value.error);

// 	return x(Message, {
// 		text: "Message source: <"+postres.value.url+">",
// 	});
// }