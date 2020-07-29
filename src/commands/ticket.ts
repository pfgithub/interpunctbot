// oh my. this is what usingnamespace is for.
import * as Discord from "discord.js";
import { assertNever, ilt, perr } from "../..";
import { messages, raw, safe } from "../../messages";
import { AutodeleteRule, AutodeleteRuleNoID, TicketConfig } from "../Database";
import { durationFormat } from "../durationFormat";
import Info from "../Info";
import * as nr from "../NewRouter";
import { a, AP } from "./argumentparser";

nr.addDocsWebPage(
	"/help/ticket",
	"Tickets",
	"creating tickets and stuff",
	`{Title|Tickets}

{Interpunct} can tickets.

{Heading|Notable Features}

- Transcripts ({Link|https://pfg.pw/rankr/view?page=https://cdn.discordapp.com/attachments/735250062635958323/737912350371217498/log.html|Like This})
- Reaction controls (One reaction to create a ticket, one to close and save the transcript.)
- Automatic Ping (ping after someone sends a message)
- Automatic Close (close if no one sends anything)
- In-discord setup (Configure permissions and stuff in discord directly)

{CmdSummary|ticket quickstart}

{Heading|Basic Setup}
To set up tickets, you need 1 empty category and optionally 1-3 channels for logging. Something like this:
{Screenshot|https://i.imgur.com/FZ9zOrP.png}

Configure the permissions of the category to not allow @everyone to view. Make sure {Interpunct} still has permission to view it though. Like this:
{Screenshot|https://i.imgur.com/IgmAku7.png}
You can also add in any additional permissions you need, for example if you want {Atmention|✅︎ Score Verifiers} to be allowed to help with tickets, also set:
{Screenshot|https://i.imgur.com/sVMfxgF.png}

Once you have the category set up, tell Interpunct about it.
{ExampleUserMessage|ticket category RANK REQUESTS}
If anything is wrong, {Interpunct} will tell you what needs changing.

Now, create an invitation message. Users will react to this message to create a ticket. Either send a message yourself, or use {Command|embed} to create a clean looking panel. Something like this:
{ExampleUserMessageNoPfx|{Blockquote|React 📬 to request a rank.}
{Reaction|📬|1}}
Right click or Tap and Hold on the invitation message and select "Copy Message Link". Desktop screenshot:
{Screenshot|https://i.imgur.com/IXXmWvX.png}
Paste it like this:
{ExampleUserMessage|ticket invitation (paste)https://discordapp.com/channels/407693624374067201/413910491484913675/737920767559335976}
If anything is wrong, {Interpunct} will tell you what needs changing.

Tickets are set up. To try it out, click the reaction on your invitation message. If you haven't added one yet, add one and then click it after {Interpunct} replaces it.

{Heading|Ticket logs}
For logs like this:
{Screenshot|https://i.imgur.com/3S6YtZI.png}
you need 2 channels. The second one will have messages like this in it:
{Screenshot|https://i.imgur.com/8AdVa6k.png}
{ExampleUserMessage|ticket logs {Channel|ticket-logs} {Channel|uploads}}
Note that only the last 100 messages in a ticket will be logged.

For logs like this:
{Screenshot|https://i.imgur.com/LtH2SvF.png}
you need just one channel.
{ExampleUserMessage|ticket transcripts {Channel|text-transcripts}}

{Heading|Additional configuration}

{Heading|Automatically close blank tickets}
{Blockquote|If someone makes a ticket but never sends anything, you can configure {Interpunct} to delete it automatically.
{ExampleUserMessage|ticket autoclose 15min}
Tickets where someone has sent a message will never be closed automatically.}

{Heading|Ping after someone types in a ticket}
{Blockquote|{ExampleUserMessage|ticket ping {Atmention|✅︎ Score Verifiers}}
{Screenshot|https://i.imgur.com/T1OTfUc.png}}

{Heading|Multiple ticket types}
TODO (Not supported yet). Likely tickets list/tickets edit 2/tickets edit 1/tickets new

{CmdSummary|ticket category}
{CmdSummary|ticket invitation}
{CmdSummary|ticket logs}
{CmdSummary|ticket transcripts}
{CmdSummary|ticket ping}
{CmdSummary|ticket autoclose}
{CmdSummary|ticket info}
{CmdSummary|ticket welcome}

To disable tickets, delete the invitation message and the ticket category.
`,
);

// 1: check that the category is empty. if ! empty fail.
// 2: make sure @ everyone is allowed to SEND MESSAGES. if not, error.

nr.globalCommand(
	"/help/ticket/category",
	"ticket category",
	{
		usage: "ticket category {Required|CATEGORY NAME}",
		description: `{Title|Set the ticket category}
Active tickets will be put into the category you set. It must be empty and permissions. More help:
{LinkSummary|/help/ticket}`,
		examples: [],
	},
	nr.list(...nr.a.words()),
	async ([catnme], info) => {
		if (!Info.theirPerm.manageChannels(info)) return;
		if (!info.db || !info.guild) return await info.error("pms");

		const foundCategory = info.guild.channels.cache.find(
			chan =>
				(chan.name.toUpperCase() === catnme.toUpperCase() ||
					chan.id === catnme) &&
				chan.type === "category",
		) as Discord.CategoryChannel | null;
		if (!foundCategory)
			return await info.error(
				"I could not find a category with that name. Make sure you have made a category and its permissions look like this: https://i.imgur.com/3S6YtZI.png",
			);

		// check permissions
		const everyonePerms = foundCategory.permissionOverwrites.get(
			info.guild.roles.everyone.id,
		);
		if (!everyonePerms)
			return await info.error(
				"Make sure your permissions for <#" +
					foundCategory.id +
					"> are set up like this: https://i.imgur.com/IgmAku7.png",
			);
		if (everyonePerms.allow.has("VIEW_CHANNEL")) {
			return await info.error(
				"@everyone must not be allowed to Read Text Channels & See Voice Channels in <#" +
					foundCategory.id +
					">. Your permissions should look something like this: https://i.imgur.com/3S6YtZI.png",
			);
		}
		if (everyonePerms.deny.has("SEND_MESSAGES")) {
			return await info.error(
				"@everyone needs to be allowed to send messages in <#" +
					foundCategory.id +
					">. https://i.imgur.com/UkAp4ZW.png",
			);
		}

		// make sure it's empty

		const currentTickets = await info.db.getTicket();
		currentTickets.main.category = foundCategory.id;
		await info.db.setTicket(currentTickets);

		const suggestions = ticketSuggestions(currentTickets, info);

		await info.success(
			"Success! Tickets will be created in the <#" +
				foundCategory.id +
				"> channel." +
				suggestions.map(sg => "\n" + sg).join(""),
		);
	},
);

function ticketSuggestions(ticketdata: TicketConfig, info: Info) {
	const res: string[] = [];
	if (!ticketdata.main.category) {
		return [
			info.tag`The next step is to set the category for tickets to be added to with. More info in {LinkDocs|/help/ticket}`,
		];
	}
	if (!ticketdata.main.invitation) {
		return [
			info.tag`The next step is to create an invitation message. More info in {LinkDocs|/help/ticket}`,
		];
	}
	res.push(
		"Ticketing is all set up! For more settings, check the docs: " +
			info.tag`{LinkDocs|/help/ticket}`,
	);
	if (!ticketdata.main.logs && !ticketdata.main.transcripts) {
		res.push(
			info.tag`If you want closed tickets to be logged, you might want to enable ticket logs and or transcripts.`,
		);
	}
	return res;
}

nr.globalCommand(
	"/help/ticket/invitation",
	"ticket invitation",
	{
		usage: "ticket invitation {Required|invitation message link}",
		description: "ticket invitation",
		examples: [],
	},
	nr.list(...nr.a.words()),
	async ([msglink], info) => {
		if (!Info.theirPerm.manageChannels(info)) return;
		if (!info.db || !info.guild) return await info.error("pms");

		// find the invitation message (maybe there could be a command to create an invitation message)
		const ids = msglink.match(/[0-9]{5,}/g);
		if (!ids || ids.length !== 3)
			return await info.error(
				info.tag`Right click/tap and hold the message you want to use as an invitation message and select Copy Message Link. Then use it {Command|ticket invitation PASTE}`,
			);
		const [guildID, channelID, messageID] = ids;
		if (info.guild.id !== guildID)
			return await info.error(
				info.tag`The message you linked is on a different server. Please select a message from this server to be the ticket invitation.`,
			);
		const msgchan = info.guild.channels.resolve(
			channelID,
		) as Discord.TextChannel;
		if (!msgchan)
			return await info.error(
				"I could not find the channel <#" +
					channelID +
					">. Maybe I don't have permission to view it?",
			);
		// in zig this could just be const msgmsg = msgchan.messages.fetch(messageID) catch return info.error("...")
		let msgmsg: Discord.Message;
		try {
			msgmsg = await msgchan.messages.fetch(messageID);
		} catch (e) {
			return await info.error(
				"I could not find the message you linked in <#" +
					channelID +
					">. Maybe I don't have permission to view it? Make sure I have permission to Read Messages and View Message History.",
			);
		}

		// check for the ability to remove reactions in the invitation message's channel
		const chanperms = msgchan.permissionsFor(info.guild.me!);
		if (chanperms) {
			if (!chanperms.has("MANAGE_MESSAGES"))
				return await info.error(
					"In order for me to remove reactions, I need permission to Manage Messages in <#" +
						channelID +
						">.",
				);
			if (!chanperms.has("ADD_REACTIONS"))
				return await info.error(
					"In order for me to add reactions, I need permission to Add Reactions in <#" +
						channelID +
						">.",
				);
		}

		if (!info.myChannelPerms!.has("MANAGE_CHANNELS")) {
			// check for basic ticketing perms
			await info.error(
				info.tag`In order for me to be able to open and close tickets, I need permission to Manage Channels.`,
			);
			return false;
		}

		// if there are reactions on the invitation message, clear them and replace them.

		const reminders: string[] = [];

		const currentTickets = await info.db.getTicket();
		currentTickets.main.invitation = {
			channel: msgchan.id,
			message: msgmsg.id,
		};
		await info.db.setTicket(currentTickets);

		// if there are no reactions on the invitation message yet, send a reminder to add a reaction
		if (msgmsg.reactions.cache.array().length === 0)
			reminders.push(
				"React to the invitation message to pick the reaction.",
			);

		// send other suggestions
		reminders.push(...ticketSuggestions(currentTickets, info));

		return await info.success(
			"The ticket invitation message is set!" +
				reminders.map(rm => "\n" + rm).join(""),
		);
	},
);
