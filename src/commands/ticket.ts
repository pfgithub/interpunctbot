// oh my. this is what usingnamespace is for.
import * as Discord from "discord.js";
import { assertNever, ilt, perr } from "../..";
import { messages, raw, safe } from "../../messages";
import { AutodeleteRule, AutodeleteRuleNoID } from "../Database";
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
				chan.name.toUpperCase() === catnme.toUpperCase() &&
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
		const nextSteps = !currentTickets.main.invitation
			? "\n" +
			  info.tag`The next step is to create an invitation message. More info in {LinkDocs|/help/ticket}`
			: "";
		await info.success(
			"Success! Tickets will be created in the <#" +
				foundCategory.id +
				"> channel." +
				nextSteps,
		);
	},
);

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

		// check for the ability to remove reactions in the invitation message's channel

		// check for basic ticketing perms
		if (!info.myChannelPerms!.has("MANAGE_CHANNELS")) {
			await info.error(
				info.tag`In order for {Interpunct} to be able to open and close tickets, {Interpunct} needs permission to Manage Channels.`,
			);
			return false;
		}

		// if there are reactions on the invitation message, clear them and replace them.

		// if there are no reactions on the invitation message yet, send a reminder to add a reaction
		// if logging is not set up yet, send a reminder to set up logging
	},
);
