import * as Discord from "discord.js";
import MB, { MessageBuilder } from "./MessageBuilder";
import Database from "./Database";
import * as config from "../config.json";
import { ilt } from "..";
import { safe, raw } from "../messages";

const result = {
	error: "<:failure:508841130503438356> Error: ",
	result: "",
	info: "<:info:508842207089000468> Info: ",
	success: "<:success:508840840416854026> Success: " // Discord uses a gray ✔️ emoji for some reason. It could be backslashed but some other platforms do too
};

export const theirPerm = {
	manageBot: (info: Info) => {
		if (!theirPerm.pm(false)(info)) {
			return false;
		}
		if (info.authorPerms.manageBot) {
			return true;
		}
		return (
			info.error(
				"You need permisison to `Manage Server` to use this command"
			) && false
		);
	},
	manageChannels: (info: Info) => {
		if (!theirPerm.pm(false)(info)) {
			return false;
		}
		if (info.authorPerms.manageChannel) {
			return true;
		}
		return (
			info.error(
				"You need permisison to `Manage Channels` to use this command"
			) && false
		);
	},
	manageEmoji: (info: Info) => {
		if (!theirPerm.pm(false)(info)) {
			return false;
		}
		if (info.authorPerms.manageEmoji) {
			return true;
		}
		return (
			info.error(
				"You need permisison to `Manage Emojis` to use this command"
			) && false
		);
	},
	manageMessages: (info: Info) => {
		if (!theirPerm.pm(false)(info)) {
			return false;
		}
		if (info.authorPerms.manageMessages) {
			return true;
		}
		return (
			info.error(
				"You need permisison to `Manage Messages` to use this command"
			) && false
		);
	},
	pm: (expected: boolean) => (info: Info) => {
		if (info.pm === expected) {
			return true;
		}
		return info.error("This command cannot be used in a PM") && false;
	}, // I want an r.load() that calls startloading and awaits for it
	owner: (info: Info) => {
		if (info.message.author!.id === config.owner) {
			return true;
		}
		return (
			info.error(
				"This command can only be used by the hoster of interpunct bot (@pfg#4865)"
			) && false
		);
	}
};

export const ourPerm = {
	manageBot: (info: Info) => {
		if (!theirPerm.pm(false)(info)) {
			return false;
		}
		if (info.authorPerms.manageBot) {
			return true;
		}
		return (
			info.error(
				`${info.atme} needs permisison to \`Manage Server\` to use this command.`
			) && false
		);
	},
	manageChannels: (info: Info) => {
		if (!theirPerm.pm(false)(info)) {
			return false;
		}
		if (info.myPerms.manageChannel) {
			return true;
		}
		return (
			info.error(
				`${info.atme} needs permisison to \`Manage Channels\` to use this command.`
			) && false
		);
	},
	manageEmoji: (info: Info) => {
		if (!theirPerm.pm(false)(info)) {
			return false;
		}
		if (info.myPerms.manageEmoji) {
			return true;
		}
		return (
			info.error(
				`${info.atme} needs permisison to \`Manage Emojis\` to use this command.`
			) && false
		);
	},
	manageMessages: (info: Info) => {
		if (!theirPerm.pm(false)(info)) {
			return false;
		}
		if (info.myPerms.manageMessages) {
			return true;
		}
		return (
			info.error(
				`${info.atme} needs permisison to \`Manage Messages\` to use this command.`
			) && false
		);
	}
};

export type MessageOptionsParameter =
	| Discord.MessageOptions
	| Discord.MessageEmbed
	| Discord.MessageAttachment;

export type MessageParametersType =
	| [string, MessageOptionsParameter | undefined]
	| [string];

export default class Info {
	loading: boolean;
	channel: Discord.TextChannel | Discord.DMChannel;
	guild?: Discord.Guild | null;
	message: Discord.Message;
	other?: {
		startTime: number;
		infoPerSecond: number;
	};
	db?: Database;
	member?: Discord.GuildMember | null;
	prefix: string;
	constructor(
		message: Discord.Message,
		other?: {
			startTime: number;
			infoPerSecond: number;
		}
	) {
		this.loading = false;
		this.channel = message.channel;
		this.guild = message.guild;
		this.message = message;
		this.member = message.member;
		this.other = other;
		this.db = this.guild ? new Database(this.guild.id) : undefined;
		// start fetching prefix
		this.prefix = "@inter·punct ";
		if (this.db) {
			this.db.getPrefix().then(prefix => (this.prefix = prefix));
		} else {
			this.prefix = "";
		}
	}
	static get result() {
		return result;
	}
	static get theirPerm() {
		return theirPerm;
	}
	static get ourPerm() {
		return ourPerm;
	}
	get atme() {
		return this.message.client.user!.toString();
	}
	get authorChannelPerms() {
		if (this.channel instanceof Discord.TextChannel) {
			return this.channel.permissionsFor(this.member!);
		}
		return undefined;
	}
	get authorGuildPerms() {
		if (this.member) {
			return this.member.permissions;
		}
		return undefined;
	}
	get myChannelPerms() {
		if (this.channel instanceof Discord.TextChannel) {
			return this.channel.permissionsFor(this.guild!.me!);
		}
		return undefined;
	}
	get authorPerms() {
		return {
			manageBot: this.authorGuildPerms
				? this.authorGuildPerms.has("MANAGE_GUILD")
				: true,
			manageChannel: this.authorGuildPerms
				? this.authorGuildPerms.has("MANAGE_CHANNELS")
				: true,
			manageEmoji: this.authorGuildPerms
				? this.authorGuildPerms.has("MANAGE_EMOJIS")
				: true,
			manageMessages: this.authorGuildPerms // maybe we should only allow send: to send to channels author has manage messages perms for
				? this.authorGuildPerms.has("MANAGE_MESSAGES")
				: true
		};
	}
	get myPerms() {
		return {
			manageBot: this.myChannelPerms
				? this.myChannelPerms.has("MANAGE_GUILD")
				: true,
			manageChannel: this.myChannelPerms
				? this.myChannelPerms.has("MANAGE_CHANNELS")
				: true,
			manageEmoji: this.myChannelPerms
				? this.myChannelPerms.has("MANAGE_EMOJIS")
				: true,
			manageMessages: this.myChannelPerms
				? this.myChannelPerms.has("MANAGE_MESSAGES")
				: true
		};
	}
	get pm() {
		return !this.guild;
	}
	async startLoading() {
		this.channel.startTyping();
	}
	async stopLoading() {
		this.channel.stopTyping();
	}
	_formatMessageWithResultType(
		type: string,
		...values: MessageParametersType
	): MessageParametersType {
		// In the future maybe adjust richembeds maybe probably not
		return [`${type} ${values[0]}`, values[1]];
	}
	async _informMissingPermissions(
		perm: Discord.PermissionString,
		message: string,
		channel = this.channel
	) {}
	async _tryReply(
		...values: MessageParametersType
	): Promise<Discord.Message[] | undefined> {
		const content = values[0];
		const options = values[1];
		// returns the message
		const replyResult = await ilt(
			this.message.channel.send(
				safe`@${
					this.message.member
						? this.message.member.displayName
						: this.message.author!.username
				}, ${raw(content)}`,
				{
					...options,
					split: true
				}
			),
			false
		);
		if (replyResult.result) {
			return (replyResult.result as unknown) as Discord.Message[];
		}
		// if (!(this.db ? this.db.getPMOnFailure() : false)) {
		// 	// server does not have pmonfailure enabled. do nothing.
		// 	return undefined;
		// }
		// if (this.authorPerms.manageChannel) {
		// 	// this._informMissingPermissions(SEND_MESSAGES, "reply to your message", this.message.author)
		// 	// If the author has permission to manage the channel permissions, tell them the bot doesn't have permission to respond.
		// 	/*	const errorMessage =*/ await this.message.author!.send(
		// 		// how can a message not have an author
		// 		...this._formatMessageWithResultType(
		// 			result.error,
		// 			`I do not have permission to reply to your message in #${
		// 				this.channel instanceof Discord.TextChannel
		// 					? this.channel.name
		// 					: "this should never happen"
		// 			}`
		// 		)
		// 	);
		// 	// errorMessage.delete({ timeout: 10 * 1000 });
		// }
		// // Send the actual result
		// if (this.db && (await this.db.getPMOnFailure())) {
		// 	return <Discord.Message[]>(<unknown>await this.message.author!.send(
		// 		content,
		// 		{
		// 			...options,
		// 			split: true
		// 		}
		// 	));
		// }
	}
	async reply(
		resultType: string,
		...value:
			| [string | MessageBuilder, MessageOptionsParameter | undefined]
			| [string | MessageBuilder]
	) {
		const showErrors = this.db ? await this.db.getCommandErrors() : true;
		if (resultType === result.error && !showErrors) {
			if (!this.authorPerms.manageBot) {
				return; // command errors are disabled, return nothing
			}
		}

		// Stop any loading if it is happening, we're replying now we're done loading
		this.stopLoading(); // not awaited for because it doesn't matter

		let message: MessageParametersType;

		// If the message is a messagebuilder, build the message builder
		if (value[0] instanceof MessageBuilder) {
			message = value[0].build(true);
		} else if (typeof value[0] === "string") {
			message = [value[0], value[1]];
		} else {
			message = [value[0]];
		}

		// Format the message with the correct result type
		message = this._formatMessageWithResultType(resultType, ...message);

		// Reply to the message (or author)
		return await this._tryReply(...message);
	}
	async error(...msg: MessageParametersType) {
		const unknownCommandMessages = this.db
			? await this.db.getCommandErrors()
			: "always";
		if (
			unknownCommandMessages === "always" ||
			(unknownCommandMessages === "admins" && this.authorPerms.manageBot)
		) {
		} else {
			return [];
		}
		return this.errorAlways(...msg);
	}
	async errorAlways(...msg: MessageParametersType) {
		const reactResult = await ilt(
			this.message.react("508841130503438356"),
			false
		);
		if (reactResult.error) {
			await ilt(this.message.react("❌"), false); // may fail, not a problem
		}
		let res;
		if (
			!this.myChannelPerms ||
			this.myChannelPerms.has("USE_EXTERNAL_EMOJIS")
		) {
			res = await this.reply("<:error:508841130503438356>", ...msg);
		} else {
			res = await this.reply("❌", ...msg);
		}
		// res && res.forEach(r => r.delete({ timeout: 20 * 1000 }));
		return res;
	}
	async warn(...msg: MessageParametersType) {
		const reactResult = await ilt(
			this.message.react("508842207089000468"),
			false
		);
		if (reactResult.error) {
			await ilt(this.message.react("⚠"), false); // may fail
		}
		let res;
		if (
			!this.myChannelPerms ||
			this.myChannelPerms.has("USE_EXTERNAL_EMOJIS")
		) {
			res = await this.reply("<:warning:508842207089000468>", ...msg);
		} else {
			res = await this.reply("⚠", ...msg);
		}
		// res && res.forEach(r => r.delete({ timeout: 20 * 1000 }));
		return res;
	}
	async success(...msg: MessageParametersType) {
		const reactResult = await ilt(
			this.message.react("508840840416854026"),
			false
		);
		if (reactResult.error) {
			await ilt(this.message.react("✅"), false); // may fail
		}
		let res;
		if (
			!this.myChannelPerms ||
			this.myChannelPerms.has("USE_EXTERNAL_EMOJIS")
		) {
			res = await this.reply("<:success:508840840416854026>", ...msg);
		} else {
			res = await this.reply("✅", ...msg);
		}
		// res && res.forEach(r => r.delete({ timeout: 20 * 1000 }));
		return res;
	}
	async result(...msg: MessageParametersType) {
		return await this.reply(result.result, ...msg);
	}
	async redirect(newcmd: string) {
		throw new Error("NOT IMPLEMENTED YET"); // TODO for example .wr is just .speedrun leaderboard 1, so it could res.redirect("speedrun leaderboard 1 "+arguments)
	}
	handleReactions(
		msg: Discord.Message,
		cb: (
			reaction: Discord.MessageReaction,
			user: Discord.User
		) => Promise<void>
	) {
		const reactionCollector = new Discord.ReactionCollector(
			msg,
			collection => {
				return true;
			},
			{}
		);
		let errCb: (error: Error) => void = (error: Error) => {
			throw error;
		};
		reactionCollector.on("collect", async (reaction, user) => {
			if (user.bot) {
				return;
			}
			const result = await ilt(cb(reaction, user), false);
			if (result.error) {
				errCb(result.error);
			}
		});
		return {
			end: () => reactionCollector.stop(),
			done: new Promise((resolve, reject) => {
				errCb = reject;
				reactionCollector.addListener("end", () => resolve());
			})
		};
	}
}
