import { MessageContextMenuItemElement, SlashCommandElement, SlashCommandGroup, u } from "./fancylib";

require("./user/persistent/rock_paper_scissors") as typeof import("./user/persistent/rock_paper_scissors");

// ok
// I think we're ready - let's start porting commands over
// still have to:
// - persist values in the database
// - hmr for dev experience
// - do what I outlined in fancylib.ts to avoid unnecessary refreshes
// - oh also it would be nice if we could use the source code hash rather than Date.now()
//   for the version. that way things only need to be refreshed if the source changes
// - doesn't matter once we do that thing though

// export function Sample(props: {event: CallFrom.MessageContextMenu}): MessageElement {
// 	return Message({
// 		text: u("The message ID is <"+props.event.message.id+">"),
// 	});
// }

// rather than guild: guild | undefined,
// make a seperate onRightClickInGuid(guild: guild | undefined)
// re-call that any time there's a relevant db change
// we can even use a solid js store to track what's used if we want to be fancy

// here's something fun for the right click menu
// right click -> Target Message
// but permission-gate it. default permission: false and only show it for people
// who have a pending thing that needs a target message
export function onRightClick(): MessageContextMenuItemElement[] {
	return [
		// MessageContextMenuItem({label: u("Sample"), onClick: event => {
		// 	return renderEphemeral(Sample({event}), {visibility: "private"});
		// }}),
		/*
        <MessageContextMenuItem onClick={e => renderEphemeral(() => <Sample event={e} />)}>
            Sample
        </MessageContextMenuItem>
        */
	];
}

// I wasn't sure if this should have a param guild: null | …
// it should.
// permissions can only be set for a guild, and all commands are needed there.
//
// so we should ask to refresh the guild command list when permissions change and it will
// apply the permission changes too

// you know we could do fs routing couldn't we
// that could be interesting
// anyway let's start porting some commands and see what's bad and see what's good

export function onSlashCommand(): SlashCommandElement[] {
	return [
		SlashCommandGroup({label: u("play"), description: u("Play a game"), children: [
			(require("./user/commands/play/rock_paper_scissors") as typeof import("./user/commands/play/rock_paper_scissors")).default(),
		]}),
		SlashCommandGroup({label: u("dev"), default_permission: false, description: u("Developer Commands"), children: [
			(require("./user/commands/dev/reload_libfancy") as typeof import("./user/commands/dev/reload_libfancy")).default(),
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

// 	return Message({
// 		text: "Message source: <"+postres.value.url+">",
// 	});
// }