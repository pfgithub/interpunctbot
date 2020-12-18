import * as nr from "../NewRouter";
import Info, { permTheyCanManageRole, permWeCanManageRole } from "../Info";
import * as Discord from "discord.js";
import { messages, raw, safe } from "../../messages";
import { durationFormat } from "../durationFormat";
import { AP } from "./argumentparser";
import { QuickrankField } from "../Database";
import { INSPECT_MAX_BYTES } from "buffer";

/*

ip!rank @user [rank stuff]

quickrank add reaction :emoji: @gold pot
quickrank add name `gold pot` @gold pot
quickrank add time <10m @sub-10
quickrank role @score verifiers
quickrank list

!rank @user sub-15, gold pot
*/

nr.addDocsWebPage(
	"/errors/quickrank",
	"Quickrank Errors",
	"errors",
	`{Title|Errors}
{LinkSummary|/errors/quickrank/invalid-role}`,
);

nr.addErrorDocsPage("/errors/quickrank/invalid-role", {
	overview:
		"I could not find that role. Make sure you spelled it right, and that it is configured with {LinkDocs|/help/quickrank} .",
	detail: "",
	mainPath: "/help/quickrank",
});

nr.addDocsWebPage(
	"/help/quickrank",
	"Quickrank",
	"allow moderators to rank people quickly",
	`{Title|Quickrank}
Quickrank can be set up to allow admins to rank people quickly on a server.

After setup, you can react like this:
{ExampleUserMessage|Give me a rank
{Reaction|sub10|1} {Reaction|success|1}}
Or send a message like this:
{ExampleUserMessage|rank {Atmention|person} sub-10}
to give a user one or more roles
{ExampleBotMessage|{Atmention|person}, You were given the roles @🕐︎ SUB-10, @🕐︎ SUB-15, @🕐︎ SUB-20 by {Atmention|admin}}

{Comment|
{Heading|Basic Setup}
To add some roles to be used with the {Command|rank} command, they need to be given names.

To add some roles to react with emojis for, they need to be given emojis.
}

{LinkSummary|/help/quickrank/setup}

{Heading|Relevant Commands}
{CmdSummary|rank}
{CmdSummary|quickrank list}
{CmdSummary|quickrank add named}
{CmdSummary|quickrank add time}
{CmdSummary|quickrank add reaction}
{CmdSummary|quickrank add provides}
{CmdSummary|quickrank remove role}
{CmdSummary|quickrank set role}

{Heading|Errors}
{LinkSummary|/errors/quickrank}`,
);

nr.addDocsWebPage(
	"/help/quickrank/setup",
	"Quickrank Setup",
	"setup quickrank commands",
	`{Title|Setup}
To set up a system like the example above, first each role must be given either a name,  emoji, or both, and then a chain of provides must be set up.

{Bold|Reactions}:
{Blockquote|{ExampleUserMessage|quickrank add reaction {Emoji|sub10} @🕐︎ SUB-10}
{ExampleUserMessage|quickrank add reaction {Emoji|sub15} @🕐︎ SUB-15}
{ExampleUserMessage|quickrank add reaction {Emoji|sub20} @🕐︎ SUB-20}
You might also want to make it so these emojis are given to people as rewards for getting these roles, for more about that see {LinkDocs|/help/emoji}. Make sure you give your admin roles access to the emoji too though!}

{Bold|Names}:
{Blockquote|{ExampleUserMessage|quickrank add named {Code|sub-10} @🕐︎ SUB-10}
{ExampleUserMessage|quickrank add named {Code|sub-15} @🕐︎ SUB-15}
{ExampleUserMessage|quickrank add named {Code|sub-20} @🕐︎ SUB-20}
Note that the name must be surrounded in \`backticks\` if there are multiple words.}


{Bold|Provides}:
{Blockquote|If you give someone one role, provides will automatically add any other roles they need too. For example, if I rank someone sub-10 I also want to give them sub-15 and sub-20. Also, if I rank someone sub-15, I also want to give them sub-20. To do this, I can set up a provides chain so sub-10 provides sub-15 and sub-15 provides sub-20.
{ExampleUserMessage|quickrank add provides @🕐︎ SUB-10 -> @🕐︎ SUB-15}
{ExampleUserMessage|quickrank add provides @🕐︎ SUB-20 -> @🕐︎ SUB-20}
Now you can use the {Command|rank} command to give people the roles sub-10, 15, or 20, and you can also react to messages and click check mark to give people these roles quickly.}

If you make any mistakes, remove a role with
{CmdSummary|quickrank remove role}

To view the entire quickrank configuration, use
{CmdSummary|quickrank list}`,
);

nr.globalCommand(
	"/help/quickrank/name",
	"quickrank add named",
	{
		usage:
			"quickrank add named {Required|backtick surrounded name} {Required|@role}",
		description: "add a rank name to be used in the {Command|rank} command",
		examples: [
			/*
ip!quickrank name `gold pot` @gold pot
{Emoji|success}, added. Try it out with.
ip!rank @user gold pot
*/
		],
	},
	nr.list(nr.a.backtick(), ...nr.a.role()),
	async ([name, role], info) => {
		if (!info.db) {
			await info.docs("/errors/pms", "error");
			return;
		}

		if (!(await Info.theirPerm.manageBot(info))) return;
		if (!(await permTheyCanManageRole(role, info))) return;
		if (!(await permWeCanManageRole(role, info))) return;

		if (name.includes(","))
			return await info.docs(
				"/errors/quickrank/name/comma-not-allowed",
				"error",
			);

		const qr = await info.db.getQuickrank();
		if (qr.nameAlias[name.toLowerCase()]) {
			await info.docs("/errors/name/already/used/todo", "error");
			return;
		}
		qr.nameAlias[name.toLowerCase()] = { name, role: role.id };
		await info.db.setQuickrank(qr);
		await info.success("Done!");
	},
);

nr.globalCommand(
	"/help/quickrank/time",
	"quickrank add time",
	{
		usage:
			"quickrank add time {Required|{Duration|duration}} {Required|@role}",
		description:
			"add a rank time to be unsed in the {Command|rank} command",
		examples: [],
	},
	nr.list(nr.a.enumNoSpace("<", ">"), nr.a.duration(), ...nr.a.role()),
	async ([ltgt, duration, role], info) => {
		if (!info.db) {
			await info.docs("/errors/pms", "error");
			return;
		}

		if (!(await Info.theirPerm.manageBot(info))) return;
		if (!(await permTheyCanManageRole(role, info))) return;
		if (!(await permWeCanManageRole(role, info))) return;

		const qr = await info.db.getQuickrank();
		qr.timeAlias.push({ ms: duration, ltgt, role: role.id });
		await info.db.setQuickrank(qr);
		await info.success("Done!");
	},
);

nr.globalCommand(
	"/help/quickrank/reaction",
	"quickrank add reaction",
	{
		usage:
			"quickrank add reaction {Required|{Emoji|emoji}} {Required|@role}",
		description:
			"add a reaction to react to messages and click check with to rank people",
		examples: [],
	},
	nr.list(nr.a.emoji(), ...nr.a.role()),
	async ([emoji, role], info) => {
		if (!info.db) {
			await info.docs("/errors/pms", "error");
			return;
		}

		if (!(await Info.theirPerm.manageBot(info))) return;
		if (!(await permTheyCanManageRole(role, info))) return;
		if (!(await permWeCanManageRole(role, info))) return;

		const qr = await info.db.getQuickrank();
		if (qr.emojiAlias[emoji.id]) {
			await info.docs("/errors/emoji/already/used/todo", "error");
			return;
		}
		qr.emojiAlias[emoji.id] = { role: role.id };
		await info.db.setQuickrank(qr);
		await info.success("Done!");
	},
);

nr.globalCommand(
	"/help/quickrank/role",
	"quickrank set role",
	{
		usage: "quickrank set role {Required|role}",
		description:
			"set a role that allows members to quickrank even if they do not have permissions to manage roles. Keep in mind that this will allow people with this role to give people any of the roles configured in quickrank. If you don't want them giving away admin roles, make sure not to put those in quickrank.",
		examples: [],
	},
	nr.list(...nr.a.role()),
	async ([role], info) => {
		if (!info.db) {
			await info.docs("/errors/pms", "error");
			return;
		}

		if (!(await Info.theirPerm.manageBot(info))) return;

		const qr = await info.db.getQuickrank();

		const listOfManagableRoles = [
			...Object.values(qr.emojiAlias).map(r => r.role),
			...Object.values(qr.nameAlias).map(r => r.role),
			...qr.timeAlias.map(r => r.role),
			...Object.keys(qr.providesAlias),
		];
		const setOfManagableRoles = new Set(listOfManagableRoles);

		for (const roleID of setOfManagableRoles) {
			const r = info.guild!.roles.resolve(roleID);
			if (r) if (!(await permTheyCanManageRole(r, info))) return;
		}

		qr.managerRole = role.id;
		await info.db.setQuickrank(qr);

		const managableRoles = [...setOfManagableRoles.values()].map(q => "<@&"+q+">");

		await info.success(
			"Quickrank role set to "+role.toString()
			+"! Members with the "+role.toString()
			+(managableRoles.length == 0 ? " role can give any user roles with quickrank. Quickrank is not yet configued."
			: " role can give any user these roles with quickrank: "+managableRoles.join(", ")),
		);
	},
);

nr.globalCommand(
	"/help/quickrank/remove/role",
	"quickrank remove role",
	{
		usage: "quickrank remove role {Required|@role}",
		description:
			"Remove a role from quickrank entirely (reaction, named, time, provides)",
		examples: [],
	},
	nr.list(...nr.a.role()),
	async ([role], info) => {
		if (!info.db) {
			await info.docs("/errors/pms", "error");
			return;
		}

		if (!(await Info.theirPerm.manageBot(info))) return;

		const qr = await info.db.getQuickrank();

		let didrmve = 0;

		for (const [emoji, rule] of Object.entries(qr.emojiAlias)) {
			if (rule.role === role.id) {
				delete qr.emojiAlias[emoji];
				didrmve++;
			}
		}
		for (const [safeName, rule] of Object.entries(qr.nameAlias)) {
			if (rule.role === role.id) {
				delete qr.nameAlias[safeName];
				didrmve++;
			}
		}
		for (const [roleID] of Object.entries(qr.providesAlias)) {
			if (roleID === role.id) {
				delete qr.providesAlias[roleID];
				didrmve++;
			}
		}
		qr.timeAlias = qr.timeAlias.filter(ta =>
			ta.role !== role.id ? true : (didrmve++, false),
		);

		if (!didrmve) {
			await info.error(
				"not ok:( not gone " + messages.role(role) + " ):",
			);
			return;
		}

		await info.db.setQuickrank(qr);
		await info.success(
			"ok. (gone " +
				messages.role(role) +
				") (removed " +
				didrmve +
				" roles.)",
		);
	},
);

nr.globalCommand(
	"/help/quickrank/provides",
	"quickrank add provides",
	{
		usage:
			"quickrank add provides {Required|@role 1} -> {Required|@role 2}",
		description: "when ranking users with role 1, also give them role 2.",
		examples: [],
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		if (!info.db) {
			await info.docs("/errors/pms", "error");
			return;
		}

		if (!(await Info.theirPerm.manageBot(info))) return;

		const arrowSplit = cmd.split("->");
		if (arrowSplit.length !== 2) {
			await info.error("missing -> thing or something");
			return;
		}
		const [role1cmd, role2cmd] = arrowSplit;

		const r1ap = await AP(
			{ info, cmd: role1cmd.trim(), help: "/help/quickrank/provides" },
			...nr.a.role(),
		);
		if (!r1ap) return;
		const r2ap = await AP(
			{ info, cmd: role2cmd.trim(), help: "/help/quickrank/provides" },
			...nr.a.role(),
		);
		if (!r2ap) return;

		const [[roleFrom], [roleTo]] = [r1ap.result, r2ap.result];

		if (!(await permTheyCanManageRole(roleTo, info))) return;
		if (!(await permWeCanManageRole(roleFrom, info))) return;
		if (!(await permWeCanManageRole(roleTo, info))) return;

		const qr = await info.db.getQuickrank();

		if (!qr.providesAlias[roleFrom.id]) {
			qr.providesAlias[roleFrom.id] = [];
		}
		const prova = qr.providesAlias[roleFrom.id];
		if (prova.find(el => el.role === roleTo.id)) {
			return await info.error("already provides :x: bad.");
		}

		prova.push({ role: roleTo.id });

		await info.db.setQuickrank(qr);

		return await info.success("done");
	},
);

nr.globalCommand(
	"/help/quickrank/list",
	"quickrank list",
	{
		usage: "quickrank list",
		description: "list all quickrank configuration.",
		examples: [],
	},
	nr.list(),
	async ([], info) => {
		if (!info.db) {
			await info.docs("/errors/pms", "error");
			return;
		}

		if (!(await Info.theirPerm.manageBot(info))) return;

		const qr = await info.db.getQuickrank();

		const byRole: {[roleID: string]: {emojiMention?: string; safeNameAlias?: string; timeAlias?: number; provides?: string[]}} = {};

		for (const [emojiID, rule] of Object.entries(qr.emojiAlias)) {
			if(!byRole[rule.role]) byRole[rule.role] = {}; // ??=
			let emojiName = "unknown";
			const match = info.message.client.emojis.resolve(emojiID);
			if(match) {
				emojiName = match.name;
			}
			byRole[rule.role].emojiMention = "<:"+emojiName+":"+emojiID+">";
		}
		for (const [safeName, rule] of Object.entries(qr.nameAlias)) {
			if(!byRole[rule.role]) byRole[rule.role] = {}; // ??=
			byRole[rule.role].safeNameAlias = safeName;
		}
		for (const rule of qr.timeAlias) {
			if(!byRole[rule.role]) byRole[rule.role] = {}; // ??=
			byRole[rule.role].timeAlias = rule.ms;
		}
		for (const [fromRoleID, rule] of Object.entries(qr.providesAlias)) {
			if(!byRole[fromRoleID]) byRole[fromRoleID] = {}; // ??=
			byRole[fromRoleID].provides = rule.map(v => v.role);
		}

		if (!Object.entries(byRole).length)
			await info.error(
				"Quickrank has not been set up yet on this server.",
			);
		const sortedByRole = Object.entries(byRole).map(([roleID, content]) => {
			const r = info.guild!.roles.resolve(roleID);
			return {
				roleSort: r?.position ?? 1000000,
				roleID,
				content,
			};
		}).sort((a, b) => a.roleSort - b.roleSort);
		const mngrrle = qr.managerRole
			? info.guild!.roles.resolve(qr.managerRole)
			: undefined;

		const sortedText = sortedByRole.map(({roleID, content}) => {
			const methods: string[] = [];
			if(content.emojiMention) methods.push("react with "+content.emojiMention+"✅");
			if(content.safeNameAlias) methods.push(info.tag`use the command {Command|rank @user ${raw(content.safeNameAlias)}}`);
			if(content.timeAlias) methods.push(info.tag`use the command {Command|rank @user sub-${""+(content.timeAlias / 60000)}}`);
			const providesMsg = content.provides ? " This role also gives "+orlist(content.provides.map(q => "<@&"+q+">"), "and")+" when given with quickrank." : "";
			return "- <@&"+roleID+">: "+orlist(methods)+"."+providesMsg;
		});

		await info.result(
			"Users with permission to manage roles"+(mngrrle ? " or users with the role " +
			mngrrle.toString() : "") +
			" are allowed to use quickrank\n" +
			sortedText.join("\n"),
		);
	},
);

function orlist(items: string[], joiner = "or"): string {
	if(items.length == 0) return "*empty list oops*";
	if(items.length == 1) return items[0];
	if(items.length == 2) return items.join(" "+joiner+" ");
	return items.map((a, i) => ((i == items.length - 1) ? "or " : "") + a).join(", ");
}

export function findAllProvidedRoles(
	roleIDs: string[],
	quickrank: QuickrankField,
): string[] {
	const finalIDs = new Set(roleIDs);

	for (const id of finalIDs.values()) {
		// zig: while(it.next()) |v| {}, no special syntax required
		if (quickrank.providesAlias[id]) {
			const alias = quickrank.providesAlias[id];
			// ^zig skips that line because if(quickrank.providesAlias[id]) |alias| {
			for (const itm of alias) {
				finalIDs.add(itm.role);
			}
		}
	}

	return [...finalIDs];
}

nr.globalCommand(
	"/help/quickrank/rank",
	"rank",
	{
		usage:
			"rank {Required|user} {Required|comma, separated, list, of, role, names}",
		description:
			"rank someone with a given list of roles. role names must be configured with quickrank.",
		examples: [],
	},
	nr.list(nr.a.user(), ...nr.a.words()),
	async ([user, words], info) => {
		// find all roles to give
		// only give roles the giver has perms to
		// UNLESS the giver has the quickrank manager role, then give all::

		if (!info.db) {
			await info.docs("/errors/pms", "error");
			return;
		}

		const reciever = info.guild!.members.resolve(user);
		if (!reciever) {
			await info.docs("/errors/quickrank/invalid-member", "error");
			return;
		}

		const splitIntoCommas = words
			.split(",")
			.map(w => w.trim())
			.filter(w => w);
		const qr = await info.db.getQuickrank();

		const rolesToGive: string[] = [];

		for (const word of splitIntoCommas) {
			// if word is a name
			const nameAlias = qr.nameAlias[word.toLowerCase()];
			if (nameAlias) {
				rolesToGive.push(nameAlias.role);
				break;
			}
			// if word is a sub-
			if (word.toLowerCase().startsWith("sub")) {
				const timeMinutes = +word
					.substr(3)
					.replace("-", "")
					.trim();
				if (!timeMinutes) {
					return await info.docs(
						"/errors/quickrank/invalid-sub-time",
						"error",
					);
				}
				for (const ta of qr.timeAlias) {
					if (ta.ltgt === "<" && timeMinutes * 1000 * 60 <= ta.ms) {
						rolesToGive.push(ta.role);
					}
				}
				break;
			}
			// else error
			return await info.docs("/errors/quickrank/invalid-role", "error"); // see ip!quickrank list for a list.
		}

		if (!rolesToGive.length) {
			return await info.docs("/help/quickrank/rank", "usage");
		}

		const discordRolesToGive: Discord.Role[] = [];
		const discordRolesAlreadyGiven: Discord.Role[] = [];

		const allRolesToGive = findAllProvidedRoles(rolesToGive, qr);

		for (const roleID of allRolesToGive) {
			const role = info.guild!.roles.resolve(roleID);
			if (!role)
				return await info.docs(
					"/errors/quickrank/deleted-role",
					"error",
				);
			if (!(await permTheyCanManageRole(role, info))) return;
			if (!(await permWeCanManageRole(role, info))) return;
			if (reciever.roles.cache.has(roleID)) {
				discordRolesAlreadyGiven.push(role);
			} else {
				discordRolesToGive.push(role);
			}
		}

		// await info.startLoading();
		let reason =
			"Given by " +
			info.message.member!.toString() +
			" (" +
			info.message.member!.displayName +
			")";
		await reciever.roles.add(discordRolesToGive, reason);

		await info.message.channel.send(
			getRankSuccessMessage(
				info.message.member!,
				reciever,

				discordRolesToGive,
				discordRolesAlreadyGiven,
				rolesToGive,
			),
		);

		// for role of roles
		//  // if user has permission | is manager
		//  // else error "You don't have permission to give these roles"
	},
);

export function getRankSuccessMessage(
	giver: Discord.GuildMember,
	reciever: Discord.GuildMember,
	rolesToGive: Discord.Role[],
	preExistingRoles: Discord.Role[],
	explicitRolesToGive: string[],
) {
	if (rolesToGive.length === 0) {
		const explicit = explicitRolesToGive.map(id => preExistingRoles.find(q => q.id == id)!);
		return (
			giver.toString() +
			", No roles were given. " +
			safe(reciever.displayName) +
			" already has " +
			orlist(
			explicit
			.sort((a, b) => b.position - a.position)
			.map(r => messages.role(r))
			, "and")
		);
	}
	const explicitRolesNotGiven = preExistingRoles.filter(r =>
		explicitRolesToGive.includes(r.id),
	);
	return (
		reciever.toString() +
		", You were given the role"+(rolesToGive.length == 1 ? "" : "s")+" " +
		orlist(
			rolesToGive
			.sort((a, b) => b.position - a.position)
			.map(r => messages.role(r)), "and") +
		" by " +
		giver.toString() +
		"" +
		(explicitRolesNotGiven.length > 0
			? "\n> The role"+(explicitRolesNotGiven.length == 1 ? "" : "s")+" " +
			orlist(
			  explicitRolesNotGiven
					.sort((a, b) => b.position - a.position)
					.map(r => messages.role(r)), "and"
			)+
			  " were not given because you already have them."
			: "")
	);
}
