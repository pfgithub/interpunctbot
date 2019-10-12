import Router from "commandrouter";
import Info from "../Info";
import * as moment from "moment";
import * as Discord from "discord.js";
const router = new Router<Info, any>();

import { messages } from "../../messages";

function roleNameMatch(rolename: string, message: string) {
	const rn = rolename.trim().toLowerCase();
	const rm = message.trim().toLowerCase();
	return rn === rm || `@${rn}` === rm;
}

async function getEmojiAndRole(
	cmd: string,
	info: Info,
	{ allowJustEmoji }: { allowJustEmoji: false }
): Promise<{ emoji: Discord.GuildEmoji; role: Discord.Role } | undefined>;
async function getEmojiAndRole(
	cmd: string,
	info: Info,
	{ allowJustEmoji }: { allowJustEmoji: true }
): Promise<
	| { emoji: Discord.GuildEmoji; role: Discord.Role }
	| { emoji: Discord.GuildEmoji; role: undefined }
	| undefined
>;
async function getEmojiAndRole(
	cmd: string,
	info: Info,
	{ allowJustEmoji }: { allowJustEmoji: boolean }
): Promise<
	| { emoji: Discord.GuildEmoji; role: Discord.Role }
	| { emoji: Discord.GuildEmoji; role: undefined }
	| undefined
> {
	if (!info.guild) {
		await info.error(messages.failure.command_cannot_be_used_in_pms(info));
		return;
	}
	if (!cmd.trim()) {
		await info.error(messages.emoji.restrict_usage(info));
		return;
	}
	const [, emojiID, rolename] = cmd.match(
		/^[\S\s]*?([0-9]{16,})[^ ]*? (.+)$/
	) || ["", "", ""];

	if (!emojiID || !rolename) {
		if (allowJustEmoji) {
			const [, emojiID] = cmd
				.trim()
				.match(/^[\S\s]*?([0-9]{16,})[^ ]*$/) || ["", ""];
			if (!emojiID) {
				await info.error(
					messages.emoji.could_not_find_emoji(info, emojiID)
				);
				return;
			}

			const emoji = info.guild.emojis.get(emojiID);
			if (!emoji) {
				await info.error(
					messages.emoji.could_not_find_emoji(info, emojiID)
				);
				return;
			}

			return { emoji: emoji, role: undefined };
		}
		await info.error(messages.emoji.restrict_usage(info));
		return;
	}

	const emoji = info.guild.emojis.get(emojiID);
	if (!emoji) {
		await info.error(messages.emoji.could_not_find_emoji(info, emojiID));
		return;
	}

	const roleID = (rolename.trim().match(/^[\S\s]*?([0-9]{16,})[\S\s]*$/) || [
		"",
		""
	])[1];
	let role: Discord.Role;
	if (roleID) {
		const foundRole = info.guild.roles.get(roleID);
		if (!foundRole) {
			await info.error(messages.emoji.role_does_not_exist(info, roleID));
			return;
		}
		role = foundRole;
	} else {
		const matchingRoles = info.guild.roles
			.array()
			.filter(role => roleNameMatch(role.name, rolename));
		if (matchingRoles.length > 1) {
			await info.error(
				messages.emoji.multiple_roles_found(
					info,
					rolename,
					matchingRoles
				)
			);
			return;
		}
		if (matchingRoles.length === 0) {
			await info.error(messages.emoji.no_roles_found(info, rolename));
			return;
		}
		role = matchingRoles[0];
	}

	return { emoji, role };
}

router.add(
	"emoji restrict",
	[Info.theirPerm.manageEmoji, Info.ourPerm.manageEmoji],
	async (cmd, info, next) => {
		if (!info.guild) {
			return await info.error(
				messages.failure.command_cannot_be_used_in_pms(info)
			);
		}

		const emojiAndRole = await getEmojiAndRole(cmd, info, {
			allowJustEmoji: false
		});
		if (!emojiAndRole) {
			return;
		}
		const { emoji, role } = emojiAndRole;

		const newRoles = new Discord.Collection(emoji.roles);
		newRoles.set(role.id, role);
		await emoji.edit(
			{ roles: newRoles },
			`@${info.message.member!.displayName}`
		);
		await info.success(
			messages.emoji.added_restriction(
				info,
				emoji,
				role,
				newRoles.array()
			)
		);
	}
);

router.add(
	"emoji unrestrict",
	[Info.theirPerm.manageEmoji, Info.ourPerm.manageEmoji],
	async (cmd, info, next) => {
		if (!info.guild) {
			return await info.error(
				messages.failure.command_cannot_be_used_in_pms(info)
			);
		}

		const emojiAndRole = await getEmojiAndRole(cmd, info, {
			allowJustEmoji: true
		});
		if (!emojiAndRole) {
			return;
		}
		const { emoji, role } = emojiAndRole;

		const newRoles = new Discord.Collection(emoji.roles);

		// note that emojirolestore.set() and .add() exist. this way makes it possible to set a reason and await for completion.

		if (!role) {
			newRoles.clear();
			await emoji.edit(
				{ roles: newRoles },
				`@${info.message.member!.displayName}`
			);
			return await info.success(
				messages.emoji.removed_all_restrictions(info, emoji)
			);
		}
		newRoles.delete(role.id);
		await emoji.edit(
			{ roles: newRoles },
			`@${info.message.member!.displayName}`
		);
		await info.success(
			messages.emoji.removed_restriction(
				info,
				emoji,
				role,
				newRoles.array()
			)
		);
	}
);

router.add(
	"emoji inspect",
	[Info.theirPerm.manageEmoji],
	async (cmd, info, next) => {
		// argparser(ap.channel, ap.emojilong);
		if (!info.guild) {
			return await info.error(
				messages.failure.command_cannot_be_used_in_pms(info)
			);
		}

		const [, emojiID] = cmd.trim().match(/^[\S\s]*?([0-9]{16,})[^ ]*$/) || [
			"",
			""
		];
		if (!emojiID) {
			await info.error(
				messages.emoji.could_not_find_emoji(info, emojiID)
			);
			return;
		}

		const emoji = info.guild.emojis.get(emojiID);
		if (!emoji) {
			await info.error(
				messages.emoji.could_not_find_emoji(info, emojiID)
			);
			return;
		}

		await info.success(messages.emoji.inspect(info, emoji));
	}
);

export default router;
