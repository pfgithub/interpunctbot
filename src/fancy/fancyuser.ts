import { CallFrom, MessageElement, Message, x, MessageContextMenuItem, MessageContextMenuItemElement, SlashCommandGroup, SlashCommand, renderEphemeral, renderError, SlashCommandElement, registerPersistentElement, u, AtMention, MarkdownText, InteractionResponse, Button, ComponentButtonSpec } from "./fancylib";

// ok should I go try firebase or a similar realtime database for this

export function Sample(props: {event: CallFrom.MessageContextMenu}): MessageElement {
	return x(Message, {
		text: u("The message ID is <"+props.event.message.id+">"),
	});
}

export function RockPaperScissors(props: {state: RPSState, updateState: (ns: RPSState) => InteractionResponse}): MessageElement {
	const pinfo = (player: "p1" | "p2"): MarkdownText[] => {
		const p = props.state[player];
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
				if(props.state.p1.id === ev.clicker) {
					if(props.state.p1.choice == null) {
						return props.updateState({
							...props.state,
							p1: {...props.state.p1, choice},
						});
					}else{
						return renderEphemeral(x(Message, {
							text: u("You cannot change your selection."),
						}), {visibility: "private"});
					}
				}else if(props.state.p2?.id === ev.clicker) {
					if(props.state.p2.choice == null) {
						return props.updateState({
							...props.state,
							p2: {...props.state.p2, choice},
						});
					}else{
						return renderEphemeral(x(Message, {
							text: u("You cannot change your selection."),
						}), {visibility: "private"}); // TODO ephemeral
					}
				}else if(props.state.p2 == null) {
					return props.updateState({
						...props.state,
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