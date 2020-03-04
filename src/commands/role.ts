import * as nr from "../NewRouter";
import Info from "../Info";
import * as Discord from "discord.js";
import { messages, safe } from "../../messages";
import { durationFormat } from "../durationFormat";

/*

ip!rank @user [rank stuff]

quickrank add reaction :emoji: @gold pot
quickrank add name `gold pot` @gold pot
quickrank add time <10m @sub-10
quickrank role @score verifiers
quickrank list

!rank @user sub-15, gold pot
*/

function memberCanManageRole(
	member: Discord.GuildMember,
	role: Discord.Role,
	info: Info,
) {
	if (!info.message.member) return false;
	return (
		info.message.member.hasPermission("MANAGE_ROLES") &&
		!(
			info.message.member.roles.highest.comparePositionTo(role) >= 0 &&
			!info.message.member.hasPermission("ADMINISTRATOR")
		)
	);
}

async function permTheyCanManageRole(role: Discord.Role, info: Info) {
	if (!info.message.member!.hasPermission("MANAGE_ROLES")) {
		await info.docs("/errors/perm/manage-roles", "error");
		return false;
	}
	if (!memberCanManageRole(info.message.member!, role, info)) {
		await info.docs(
			"/errors/theirperms/manage-roles/not-high-enough",
			"error",
		);
		return false;
	}
	return true;
}

async function permWeCanManageRole(role: Discord.Role, info: Info) {
	if (!info.myChannelPerms!.has("MANAGE_ROLES")) {
		await info.docs("/errors/ourperms/manage-roles", "error");
		return false;
	}
	if (!memberCanManageRole(info.guild!.me!, role, info)) {
		await info.docs(
			"/errors/ourperms/manage-roles/not-high-enough",
			"error",
		);
		return false;
	}
	return true;
}

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

		const qr = await info.db.getQuickrank();
		if (qr.nameAlias[name]) {
			await info.docs("/errors/name/already/used/todo", "error");
			return;
		}
		qr.nameAlias[name] = { role: role.id };
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

		for (const [emoji, rule] of Object.entries(qr.emojiAlias)) {
			if (rule.role === role.id) delete qr.emojiAlias[emoji];
		}
		for (const [safeName, rule] of Object.entries(qr.nameAlias)) {
			if (rule.role === role.id) delete qr.emojiAlias[safeName];
		}
		qr.timeAlias = qr.timeAlias.filter(ta => ta.role !== role.id);

		await info.db.setQuickrank(qr);
		await info.success("ok.");
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
			allRulesFirst.push({
				roleID: rule.role,
				text:
					"React to any message with the emoji <:e:" +
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
		await info.result(
			allRules
				.sort((a, b) => b.roleSort - a.roleSort)
				.map(q => q.text)
				.join("\n"),
		);
	},
);
