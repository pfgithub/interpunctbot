import { CallFrom, MessageElement, Message, x, MessageContextMenuItem, MessageContextMenuItemElement } from "./fancylib";

export function Sample(props: {event: CallFrom.MessageContextMenu}): MessageElement {
    return x(Message, {
        text: "The message ID is <"+props.event.message.id+">",
    });
}

export function onRightClick(/* guild: guild | undefined */): MessageContextMenuItemElement[] {
    return [
        x(MessageContextMenuItem, {label: "Sample", onClick: event => {
            return () => x(Sample, {event: event}); // should be able to tell it to be hidden here
        }}),
        /*
        <MessageContextMenuItem onClick={e => <Sample event={e} />}>
            Sample
        </MessageContextMenuItem>
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