import { CallFrom, MessageElement, Message, x, MessageContextMenuItem, MessageContextMenuItemElement, SlashCommandGroup, SlashCommand, renderEphemeral, renderError, SlashCommandElement, registerPersistentElement } from "./fancylib";

// ok should I go try firebase or a similar realtime database for this

export function Sample(props: {event: CallFrom.MessageContextMenu}): MessageElement {
	return x(Message, {
		text: "The message ID is <"+props.event.message.id+">",
	});
}

type RPSState = {
    p1_choice: undefined | "rock" | "paper" | "scissors",
    p2_choice: undefined | "rock" | "paper" | "scissors",
    p1: string,
    p2: string | undefined,
};
export function RockPaperScissors(props: {state: RPSState}): MessageElement {
	return x(Message, {
		text: "Rock paper scissors. P1 is: "+props.state.p1,
	});
}

const rps = registerPersistentElement<RPSState>("rock_paper_scissors", state => {
	return x(RockPaperScissors, {state});
});

// rather than guild: guild | undefined,
// make a seperate onRightClickInGuid(guild: guild | undefined)
// re-call that any time there's a relevant db change
// we can even use a solid js store to track what's used if we want to be fancy
export function onRightClick(): MessageContextMenuItemElement[] {
	return [
		x(MessageContextMenuItem, {label: "Sample", onClick: event => {
			return renderEphemeral(() => x(Sample, {event}), {visibility: "private"});
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
		x(SlashCommandGroup, {label: "play", description: "Play a game", children: [
			x(SlashCommand, {label: "rock_paper_scissors", description: "Play a game of rock paper scissors", children: [
				// player?: User
				// thing?: string, oninput=(text) => [array of suggestions]
			], onSend: event => {
				const user = event.interaction.member?.user ?? event.interaction.user;
				if(!user) return renderError("No User");
				return rps({
					p1: user.id,
					p2: undefined,
					p1_choice: undefined,
					p2_choice: undefined,
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