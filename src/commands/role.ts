import * as nr from "../NewRouter";
import Info, { permTheyCanManageRole, permWeCanManageRole } from "../Info";
import * as Discord from "discord.js";
import { messages, safe } from "../../messages";
import { durationFormat } from "../durationFormat";
import { AP } from "./argumentparser";
import { QuickrankField } from "../Database";

/*

ip!rank @user [rank stuff]

quickrank add reaction :emoji: @gold pot
quickrank add name `gold pot` @gold pot
quickrank add time <10m @sub-10
quickrank role @score verifiers
quickrank list

!rank @user sub-15, gold pot
*/

nr.globalCommand(
	"/help/quickrank/name",
	"quickrank add named",
	{
		usage: "",
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

		if (!Info.theirPerm.manageBot(info)) return;
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
		usage: "",
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

		if (!Info.theirPerm.manageBot(info)) return;
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
		usage: "",
		description: "add a reaction to react to messages with to rank people",
		examples: [],
	},
	nr.list(nr.a.emoji(), ...nr.a.role()),
	async ([emoji, role], info) => {
		if (!info.db) {
			await info.docs("/errors/pms", "error");
			return;
		}

		if (!Info.theirPerm.manageBot(info)) return;
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
		usage: "",
		description:
			"set a role that allows members to quickrank even if they do not have permissions to manage roles.",
		examples: [],
	},
	nr.list(...nr.a.role()),
	async ([role], info) => {
		if (!info.db) {
			await info.docs("/errors/pms", "error");
			return;
		}

		if (!Info.theirPerm.manageBot(info)) return;

		const qr = await info.db.getQuickrank();

		for (const roleID of [
			...Object.values(qr.emojiAlias).map(r => r.role),
			...Object.values(qr.nameAlias).map(r => r.role),
			...qr.timeAlias.map(r => r.role),
			...Object.keys(qr.providesAlias),
		]) {
			const r = info.guild!.roles.resolve(roleID);
			if (r) if (!(await permTheyCanManageRole(r, info))) return;
		}

		qr.managerRole = role.id;
		await info.db.setQuickrank(qr);
		await info.success(
			"Quickrank role set! Members with this role can give any user one of these roles/;123:!TODO",
		);
	},
);

nr.globalCommand(
	"/help/quickrank/remove/role",
	"quickrank remove role",
	{
		usage: "",
		description: "",
		examples: [],
	},
	nr.list(...nr.a.role()),
	async ([role], info) => {
		if (!info.db) {
			await info.docs("/errors/pms", "error");
			return;
		}

		if (!Info.theirPerm.manageBot(info)) return;

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
		for (const [roleID, rule] of Object.entries(qr.providesAlias)) {
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
		usage: "quickrank add provides {Required|role} -> {Required|role}",
		description: "when ranking users with role 1, also give them role 2.",
		examples: [],
	},
	nr.passthroughArgs,
	async ([cmd], info) => {
		if (!info.db) {
			await info.docs("/errors/pms", "error");
			return;
		}

		if (!Info.theirPerm.manageBot(info)) return;

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
		usage: "",
		description: "list all quickrank aliases.",
		examples: [],
	},
	nr.list(),
	async ([], info) => {
		if (!info.db) {
			await info.docs("/errors/pms", "error");
			return;
		}

		if (!Info.theirPerm.manageBot(info)) return;

		const qr = await info.db.getQuickrank();

		const allRulesFirst: { roleID: string; text: string }[] = [];

		for (const [emoji, rule] of Object.entries(qr.emojiAlias)) {
			console.log("<:emoji:" + emoji + ">");
			allRulesFirst.push({
				roleID: rule.role,
				text:
					"React to any message with the emoji <:emoji:" +
					emoji +
					"> and press check.",
			});
		}
		for (const [safeName, rule] of Object.entries(qr.nameAlias)) {
			allRulesFirst.push({
				roleID: rule.role,
				text:
					"Use the command " +
					safe(info.prefix) +
					"rank @user " +
					safeName,
			});
		}
		for (const rule of qr.timeAlias) {
			allRulesFirst.push({
				roleID: rule.role,
				text:
					"Something something " +
					rule.ltgt +
					durationFormat(rule.ms),
			});
		}
		for (const [fromRoleID, rule] of Object.entries(qr.providesAlias)) {
			allRulesFirst.push({
				roleID: fromRoleID,
				text: "This role provides: " + rule.map(r => r.role).join(", "),
			});
		}

		if (!allRulesFirst.length)
			await info.error(
				"Quickrank has not been set up yet on this server.",
			);
		const allRules = allRulesFirst.map(rule => {
			const r = info.guild!.roles.resolve(rule.roleID);
			return {
				roleSort: r?.position ?? 1000000,
				text:
					"- " +
					(r ? messages.role(r) : "@deleted-role") +
					": " +
					rule.text,
			};
		});
		const mngrrle = qr.managerRole
			? info.guild!.roles.resolve(qr.managerRole)
			: undefined;
		await info.result(
			"Users with permission to manage roles or users with the role " +
				(mngrrle ? messages.role(mngrrle) : "*not set*") +
				" are allowed to use quickrank\n" +
				allRules
					.sort((a, b) => b.roleSort - a.roleSort)
					.map(q => q.text)
					.join("\n"),
		);
	},
);

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
		usage: "",
		description: "rank",
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

		const member = info.guild!.members.resolve(user);
		if (!member) {
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
			if (member.roles.cache.has(roleID)) {
				discordRolesAlreadyGiven.push(role);
			} else {
				discordRolesToGive.push(role);
			}
		}

		await info.startLoading();
		await member.roles.add(rolesToGive);

		await info.success(
			"gave roles " +
				discordRolesToGive
					.sort((a, b) => b.position - a.position)
					.map(r => messages.role(r))
					.join(", ") +
				"\n" +
				"already gave " +
				discordRolesAlreadyGiven
					.sort((a, b) => b.position - a.position)
					.map(r => messages.role(r))
					.join(", "),
		);

		// for role of roles
		//  // if user has permission | is manager
		//  // else error "You don't have permission to give these roles"
	},
);
