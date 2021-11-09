import * as d from "discord-api-types/v9";
import { shortenLink } from "../commands/fun";
import { api } from "../SlashCommandManager";

// unfortunately we can't be super fancy and use jsx because of a
// typescript issue: https://github.com/microsoft/TypeScript/issues/21699

type InteractionResponseSpec = {
    kind: "async_response",
    response: Promise<InteractionResponseSpec>,
    // continue_when: Promise<void>, // re-call this fn when this promise resolves
    // actually... can't we just continue when setValue is called?
    // ok I'm not sure how useState will work yet. I'll assume that works for now.
} | {
    kind: "message",
    text: string,
};

type ComponentButtonSpec = {
    kind: "button",
    label: string,
    style: "red" | "blue",
    onClick: () => void,
};
type ComponentSpec = ComponentButtonSpec;

export function Button(label: string, opts: Omit<ComponentButtonSpec, "kind" | "label">): ComponentSpec {
	return {
		kind: "button",
		label,
		...opts,
	};
}

// note: the owner (person who created) a message is allowed to delete it

export function Message(props: {
    text: string,
    components?: ComponentSpec[],
}): InteractionResponseSpec {
	return {
		kind: "message",
		text: props.text,
	};
}

export function ErrorMsg(message: string): InteractionResponseSpec {
	return Message({text: message});
}
export function usePersistentState<T>(initial: T): [T, (newValue: T) => InteractionResponseSpec] {
	throw new Error("TODO useState");
}
export function useEphemeralState<T>(initial: T): [T, (newValue: T) => InteractionResponseSpec] {
	// if this is called and the thing cannot be found:
	// throw an error that the message is no longer valid
	throw new Error("TODO useState");
}
export function useAsync<T>(promise: Promise<T>): {
    incomplete: InteractionResponseSpec,
} | {
    incomplete?: undefined,
    value: T,
} {
	const p2 = new Promise<InteractionResponseSpec>((resolveP2, errP2) => {
		const [value, setValue] = useEphemeralState<{_?: never} | {value: T}>({});
	    promise.then(r => {
			resolveP2(setValue({value: r}));
		}).catch(e => errP2(e));
		if('value' in value) return value;
	});
	return {incomplete: {
		kind: "async_response",
		response: p2,
	}};
}

// type CallCommand = {}; // this was called from a slash command
declare namespace CallFrom {
    type MessageContextMenu = {
        from: "message_context_menu",
        message: d.APIMessage,
    };
    type SlashCommand<Args> = {
        from: "slash_command",
        args: Args,
    };
}

export function ViewSource(call: CallFrom.MessageContextMenu): InteractionResponseSpec {
	const resurl =
        "https://pfg.pw/spoilerbot/spoiler?s=" +
        encodeURIComponent(call.message.content)
    ;
	const postres = useAsync(shortenLink(resurl));
	if(postres.incomplete) return postres.incomplete; // this function will be re-called when the async value is ready
	if ("error" in postres.value) return ErrorMsg(postres.value.error);

	return Message({
		text: "Message source: <"+postres.value.url+">",
	});
}

export async function renderFromMessageContextMenu(
	element: (call: CallFrom.MessageContextMenu) => InteractionResponseSpec,
	interaction: d.APIMessageApplicationCommandInteraction,
): Promise<void> {
	const arg: CallFrom.MessageContextMenu = {
		from: "message_context_menu",
		message: interaction.data.resolved.messages[interaction.data.target_id],
	};

	// 1. render the result
	const result = element(arg);

	// 2. if the result has any persistent data to store, store it
	// TODO

	// 3. send it
	if(result.kind === "async_response") {
		// wait there's a difference between
		// DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
		// and
		// DEFERRED_UPDATE_MESSAGE
		//
		// I'll have to deal with that later I guess
		//
		// it shouldn't be too hard because it can be an
		// option passed to <button />
		// eg <button mode={"popout"} onclick={} />
		//    <button mode={"edit"} onclick={} />

		setTimeout(() => {
			// send a DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE unless the response is
			// being sent
			const response: d.APIInteractionResponse = {
				type: d.InteractionResponseType.DeferredChannelMessageWithSource,
			};
			() => response;
		}, 500);
		// result.response.then(resp => {

		// });
		// // we can race, 500ms
		// const cb: 
		// d.Routes.interactionCallback();
		// send a deferred response
	}else if(result.kind === "message") {
		// send an immediate response

		const response: d.APIInteractionResponse = {
			type: d.InteractionResponseType.ChannelMessageWithSource,
			data: {
				content: result.text,
			},
		};

		await api.api(d.Routes.interactionCallback(
			interaction.id,
			interaction.token,
		)).post({data: response});
	}
}


/*

ALTERNATIVE OPTION:

make all things async
do the 'if a response isn't gotten in <500ms, error'

ok here's the thing

so onclick setstate is cool and all

but we have to work within the constraints of the actual problem

:: when an event happens, we need a response

:: setstate is not a response

instead eg setstate could return an interaction that you have to eg return
from onclick

<button primary onclick={() => setState(4)}>Hi!</button>

setstate returns a 'setstate' interaction response eg
the state is not set until the interaction response gets executed

eg

const [a, setA] = useState(1);

console.log(a); // 1
setA(2); // InteractionResponse
console.log(a); // 1

reminder buttons will rerender the whole panel if bot start time changed

*/


// function RockPaperScissors()
// buttons:
// - rock
// - paper
// - scissors
// if the other player hasn't chosen yet it updates to show that you have chosen
// if the other player has chosen it updates to say who won

// type DeleteTheUniverseArgs = {
//     new_universe_name: string,
// };
// function DeleteTheUniverse(call: CallFrom.SlashCommand<DeleteTheUniverseArgs>): InteractionResponseSpec {
//     const [confirm, setConfirm] = usePersistentState<null | boolean>(null);
//     if(confirm === null) {
//         return Message({
//             text: "Are you sure you want to delete the universe? This action is irreversible.",
//             components: [
//                 Button("Delete the universe", {style: "red", onClick: () => setConfirm(true)}),
//                 Button("Cancel", {style: "blue", onClick: () => setConfirm(false)}),
//             ],
//         });
//     }
//     if(confirm === false) {
//         return ErrorMsg("Deletion cancelled.");
//     }

//     return Message({
//         text: "I'm deleting the universe!",
//     });
// }

/*
return
    <arg type="string" onSuggest={(typing) => ["array", "of", "suggestions"]} />
    <arg type="number">
    <submit />
;
*/


// ok we can have a function to get the declarative command list
// here's the fun bit - re-call this function when things related to
// permissions or guild commands change b/c this will be able to generate
// permissions and guild commands and stuff

// this function is re-called any time:
// - a right click command is selected
// - a guild permission setting is changed, potentially changing the visibility of some
//   commands in this guild
// - a guild command is created
// - the bot is started
// it returns an array of default commands + guild-only commands if there are any
// function contextMenuItems() {
//     return [
//         MessageContextMenuItem("View Source", ViewSource),
//     ];
// }