import * as Discord from "discord.js";
import MB, { MessageBuilder } from "./MessageBuilder";
import Database from "./Database";
import * as config from "../config.json";
import { ilt } from "..";

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
				"You need permisison to `Manage Server` to use this command"
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
				"This command can only be used by the hoster of interpunct bot"
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
				`${info.message.client.toString()} needs permisison to \`Manage Server\` to use this command.`
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
				`${info.message.client.toString()} needs permisison to \`Manage Server\` to use this command.`
			) && false
		);
	}
};

export type MessageOptionsParameter =
	| Discord.MessageOptions
	| Discord.MessageEmbed
	| Discord.MessageAttachment;

export type MessageParametersType =
	| [string, (MessageOptionsParameter) | undefined]
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
	get prefix() {
		if (this.db) {
			return this.db.getPrefix();
		}
		return "";
	}
	get authorChannelPerms() {
		if (this.channel instanceof Discord.TextChannel) {
			return this.channel.permissionsFor(this.member!);
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
			manageBot: this.authorChannelPerms
				? this.authorChannelPerms.has("MANAGE_GUILD")
				: true,
			manageChannel: this.authorChannelPerms
				? this.authorChannelPerms.has("MANAGE_CHANNELS")
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
		return [type + values[0], values[1]];
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
			this.message.reply(content, {
				...options,
				split: true
			})
		);
		if (replyResult.result) {
			return replyResult.result as Discord.Message[];
		}
		if (this.authorPerms.manageChannel) {
			// this._informMissingPermissions(SEND_MESSAGES, "reply to your message", this.message.author)
			// If the author has permission to manage the channel permissions, tell them the bot doesn't have permission to respond.
			const errorMessage = await this.message.author!.send(
				// how can a message not have an author
				...this._formatMessageWithResultType(
					result.error,
					`I do not have permission to reply to your message in #${
						this.channel instanceof Discord.TextChannel
							? this.channel.name
							: "this should never happen"
					}`
				)
			); // this.channel.name does not require antiformatting because channels are already not allowed to have @everyone or whatever
			errorMessage.delete({ timeout: 10 * 1000 }); // Don't await for this, you don't want to wait 10 seconds for it to delete do you
		}
		// Send the actual result
		return <Discord.Message[]>(<unknown>await this.message.author!.send(
			content,
			{
				...options,
				split: true
			}
		));
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
		let res;
		if (
			!this.myChannelPerms ||
			this.myChannelPerms.has("USE_EXTERNAL_EMOJIS")
		) {
			res = await this.reply("<:error:508841130503438356>", ...msg);
		} else {
			res = await this.reply("❌", ...msg);
		}
		const reactResult = await ilt(this.message.react("508841130503438356"));
		if (reactResult.error) {
			await ilt(this.message.react("❌")); // may fail, not a problem
		}
		res && res.forEach(r => r.delete({ timeout: 20 * 1000 }));
		return res;
	}
	async warn(...msg: MessageParametersType) {
		let res;
		if (
			!this.myChannelPerms ||
			this.myChannelPerms.has("USE_EXTERNAL_EMOJIS")
		) {
			res = await this.reply("<:warning:508842207089000468>", ...msg);
		} else {
			res = await this.reply("⚠", ...msg);
		}
		const reactResult = await ilt(this.message.react("508842207089000468"));
		if (reactResult.error) {
			await ilt(this.message.react("⚠")); // may fail
		}
		res && res.forEach(r => r.delete({ timeout: 20 * 1000 }));
		return res;
	}
	async success(...msg: MessageParametersType) {
		let res;
		if (
			!this.myChannelPerms ||
			this.myChannelPerms.has("USE_EXTERNAL_EMOJIS")
		) {
			res = await this.reply("<:success:508840840416854026>", ...msg);
		} else {
			res = await this.reply("✅", ...msg);
		}
		const reactResult = await ilt(this.message.react("508840840416854026"));
		if (reactResult.error) {
			await ilt(this.message.react("✅")); // may fail
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
}
