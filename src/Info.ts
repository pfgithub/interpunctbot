import * as Discord from "discord.js";
import { MessageBuilder } from "./MessageBuilder";
import Database from "./Database";
import { ilt, perr } from "..";
import { safe, messages, templateGenerator } from "../messages";
import { TimedEvents } from "./TimedEvents";
import { globalConfig } from "./config";
import { globalDocs } from "./NewRouter";
import { dgToDiscord } from "./parseDiscordDG";
import { DiscordInteraction, InteractionHelper } from "./SlashCommandManager";

const result = {
	error: "<:failure:508841130503438356> Error: ",
	result: "",
	info: "<:info:508842207089000468> Info: ",
	success: "<:success:508840840416854026> Success: ", // Discord uses a gray ✔️ emoji for some reason. It could be backslashed but some other platforms do too
};

export function memberCanManageRole(
	member: Discord.GuildMember,
	role: Discord.Role,
) {
	if (!member) return false;
	return (
		member.hasPermission("MANAGE_ROLES") &&
		(member.roles.highest.comparePositionTo(role) >= 0 ||
			member.hasPermission("ADMINISTRATOR"))
	);
}

export async function permTheyCanManageRole(role: Discord.Role, info: Info) {
	if (!info.message.member!.hasPermission("MANAGE_ROLES")) {
		await info.docs("/errors/perm/manage-roles", "error");
		return false;
	}
	if (!memberCanManageRole(info.message.member!, role)) {
		await info.docs(
			"/errors/theirperms/manage-roles/not-high-enough",
			"error",
		);
		return false;
	}
	return true;
}

export async function permWeCanManageRole(role: Discord.Role, info: Info) {
	if (!info.myChannelPerms!.has("MANAGE_ROLES")) {
		await info.docs("/errors/ourperms/manage-roles", "error");
		return false;
	}
	if (!memberCanManageRole(info.guild!.me!, role)) {
		await info.docs(
			"/errors/ourperms/manage-roles/not-high-enough",
			"error",
		);
		return false;
	}
	return true;
}

export const theirPerm = {
	manageBot: async (info: Info) => {
		if (!theirPerm.pm(false)(info)) {
			return false;
		}
		if (info.authorPerms.manageBot) {
			return true;
		}
		const mngbotrol = await info.db!.getManageBotRole();
		if (info.message.member!.roles.cache.has(mngbotrol.role)) {
			return true;
		}
		const frol = info.guild!.roles.resolve(mngbotrol.role);
		perr(
			info.error(
				"You need permisison to `Manage Server`" +
					(frol ? " or the role " + messages.role(frol) : "") +
					" to use this command",
			),
			"manage bot theirperm error",
		);
		return false;
	},
	manageChannels: (info: Info) => {
		if (!theirPerm.pm(false)(info)) {
			return false;
		}
		if (info.authorPerms.manageChannel) {
			return true;
		}
		perr(
			info.error(
				"You need permisison to `Manage Channels` to use this command",
			),
			"manage channels theirperm error",
		);
		return false;
	},
	manageEmoji: (info: Info) => {
		if (!theirPerm.pm(false)(info)) {
			return false;
		}
		if (info.authorPerms.manageEmoji) {
			return true;
		}
		perr(
			info.error(
				"You need permisison to `Manage Emojis` to use this command",
			),
			"manage emoji theirperm error",
		);
		return false;
	},
	manageMessages: (info: Info) => {
		if (!theirPerm.pm(false)(info)) {
			return false;
		}
		if (info.authorPerms.manageMessages) {
			return true;
		}
		perr(
			info.error(
				"You need permisison to `Manage Messages` to use this command",
			),
			"manage messages theirperm error",
		);
		return false;
	},
	banMembers: (info: Info) => {
		if (!theirPerm.pm(false)(info)) {
			return false;
		}
		if (info.authorPerms.banMembers) {
			return true;
		}
		perr(
			info.error(
				"You need permisison to `Ban Members` to use this command",
			),
			"manage messages theirperm error",
		);
		return false;
	},
	pm: (expected: boolean) => (info: Info) => {
		if (info.pm === expected) {
			return true;
		}
		perr(
			info.error("This command cannot be used in a PM"),
			"pm theirperm error",
		);
		return false;
	}, // I want an r.load() that calls startloading and awaits for it
	owner: (info: Info) => {
		if (globalConfig.owners.includes(info.message.author.id)) {
			return true;
		}
		perr(
			info.error(
				"This command can only be used by the hoster of interpunct bot (@pfg#4865)",
			),
			"owner theirperm error",
		);
		return false;
	},
};

// todo remove these they are terrible and a waste of code
export const ourPerm = {
	manageChannels: (info: Info) => {
		if (!theirPerm.pm(false)(info)) {
			return false;
		}
		if (info.myPerms.manageChannel) {
			return true;
		}
		perr(
			info.error(
				`${info.atme} needs permisison to \`Manage Channels\` to use this command.`,
			),
			"manage channels ourperm error",
		);
		return false;
	},
	manageEmoji: (info: Info) => {
		if (!theirPerm.pm(false)(info)) {
			return false;
		}
		if (info.myPerms.manageEmoji) {
			return true;
		}
		perr(
			info.error(
				`${info.atme} needs permisison to \`Manage Emojis\` to use this command.`,
			),
			"manage emoji ourperm error",
		);
		return false;
	},
	manageMessages: (info: Info) => {
		if (!theirPerm.pm(false)(info)) {
			return false;
		}
		if (info.myPerms.manageMessages) {
			return true;
		}
		perr(
			info.error(
				`${info.atme} needs permisison to \`Manage Messages\` to use this command.`,
			),
			"manage messages ourperm error",
		);
		return false;
	},
	banMembers: (info: Info) => {
		if (!theirPerm.pm(false)(info)) {
			return false;
		}
		if (info.myPerms.banMembers) {
			return true;
		}
		perr(
			info.error(
				`${info.atme} needs permisison to \`Ban Members\` to use this command.`,
			),
			"manage messages ourperm error",
		);
		return false;
	},
};

export type MessageOptionsParameter =
	| Discord.MessageOptions
	| Discord.MessageEmbed
	| Discord.MessageAttachment;

export type MessageParametersType =
	| [string, MessageOptionsParameter | undefined]
	| [string];

export type MessageLike = {
	channel: Discord.Message["channel"];
	guild: Discord.Message["guild"];
	member: Discord.Message["member"];
	author: Discord.Message["author"];
	client: Discord.Message["client"];
	content: Discord.Message["content"];
	delete: () => Promise<void>;
};

export default class Info {
	loading: boolean;
	channel: Discord.TextChannel | Discord.DMChannel | Discord.NewsChannel;
	guild?: Discord.Guild | null;
	message: MessageLike;
	raw_message?: Discord.Message;
	raw_interaction?: InteractionHelper;
	other?: {
		startTime: number;
		infoPerSecond: number;
	};
	db?: Database;
	member?: Discord.GuildMember | null;
	prefix: string;
	timedEvents: TimedEvents;
	constructor(
		message: MessageLike,
		timedEvents: TimedEvents,
		other?: {
			startTime: number;
			infoPerSecond: number;
			raw_message?: Discord.Message;
			raw_interaction?: InteractionHelper;
		},
	) {
		this.timedEvents = timedEvents;
		this.loading = false;
		this.channel = message.channel;
		this.guild = message.guild;
		this.message = message;
		if(other?.raw_message) this.raw_message = other.raw_message;
		if(other?.raw_interaction) this.raw_interaction = other.raw_interaction;

		this.member = message.member;
		this.other = other;
		this.db = this.guild ? new Database(this.guild.id) : undefined;
		// start fetching prefix
		this.prefix = "@inter·punct ";
		if (this.db) {
			ilt(this.db.getPrefix(), "get db prefix")
				.then(res => {
					if (!res.error) {
						this.prefix = res.result;
					}
				})
				.catch(_ => _ as never);
		} else {
			this.prefix = "";
		}
	}

	static msgopts = {
		allowedMentions: { parse: [], roles: [], users: [] },
		split: false,
	} as {allowedMentions: {parse: []; roles: []; users: []}; split: false}; // Discord.MessageOptions
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
			manageMessages: this.authorChannelPerms
				? this.authorChannelPerms.has("MANAGE_MESSAGES")
				: true,
			banMembers: this.authorGuildPerms
				? this.authorGuildPerms.has("BAN_MEMBERS")
				: true,
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
				: true,
			banMembers: this.myChannelPerms
				? this.myChannelPerms.has("BAN_MEMBERS")
				: true,
		};
	}
	get pm() {
		return !this.guild;
	}
	async startLoading() {
		perr(this.channel.startTyping(), "started typing"); // never finishes?
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
	shouldAlert(): boolean {
		if(this.raw_message) {
			if(Date.now() - this.raw_message.createdAt.getTime() > 3000) return true;
			if(this.raw_message.channel.lastMessageID !== this.raw_message.id) return true;
			return false;
		}else{
			return false;
		}
	}
	async _tryReply(
		...values: MessageParametersType
	): Promise<Discord.Message[] | undefined> {
		const atThem = this.message.author.toString();
		const shouldAlert = this.shouldAlert();
		const allowedMentions: Discord.MessageMentionOptions = shouldAlert
			? { users: [this.message.author.id], roles: [], parse: [] }
			: { users: [], roles: [], parse: [] };

		const content = values[0];
		const options = values[1];
		// returns the message

		const msgtxt = atThem + ", " + content;
		const splitmsg = Discord.Util.splitMessage(msgtxt);

		const resmsgs: Discord.Message[] = [];
		for (const msgpart of splitmsg) {
			const iltres = await ilt(
				this.message.channel.send(msgpart, {
					...options,
					split: false,
					allowedMentions,
				}),
				false,
			);
			if (iltres.error) {
				console.log(iltres.error);
				return;
			} // oop
			resmsgs.push(iltres.result);
		}
		return resmsgs;
	}
	async reply(
		resultType: string,
		...value:
			| [string | MessageBuilder, MessageOptionsParameter | undefined]
			| [string | MessageBuilder]
	) {
		// Stop any loading if it is happening, we're replying now we're done loading
		await this.stopLoading(); // not awaited for because it doesn't matter

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
	async error(msg: string) {
		if(this.raw_interaction) return await this.errorAlways(msg);
		
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
		return this.errorAlways(msg);
	}
	async errorAlways(msg: string) {
		if(this.raw_interaction && !this.raw_interaction.has_ackd) {
			try{
				return await this.raw_interaction.replyHidden("<:error:508841130503438356> "+msg);
			}catch(e) {console.log(e);}
		}

		const reactOrNot = this.shouldAlert();

		if (reactOrNot && this.raw_message) {
			await ilt(this.raw_message.react("❌"), false);
		}
		let res;
		if (
			!this.myChannelPerms ||
			this.myChannelPerms.has("USE_EXTERNAL_EMOJIS")
		) {
			res = await this.reply("<:error:508841130503438356>", msg);
		} else {
			res = await this.reply("❌", msg);
		}
		// res && res.forEach(r => r.delete({ timeout: 20 * 1000 }));
		return res;
	}
	async warn(msg: string) {
		if(this.raw_interaction && !this.raw_interaction.has_ackd) {
			try{
				return await this.raw_interaction.reply("<:warning:508842207089000468> "+msg);
			}catch(e) {console.log(e);}
		}

		const reactOrNot = this.shouldAlert();
		if (reactOrNot && this.raw_message) {
			await ilt(this.raw_message.react("⚠"), false);
		}
		let res;
		if (
			!this.myChannelPerms ||
			this.myChannelPerms.has("USE_EXTERNAL_EMOJIS")
		) {
			res = await this.reply("<:warning:508842207089000468>", msg);
		} else {
			res = await this.reply("⚠", msg);
		}
		// res && res.forEach(r => r.delete({ timeout: 20 * 1000 }));
		return res;
	}
	async success(msg: string) {
		if(this.raw_interaction && !this.raw_interaction.has_ackd) {
			try{
				return await this.raw_interaction.reply("<:success:508840840416854026> "+msg);
			}catch(e) {console.log(e);}
		}

		const reactOrNot = this.shouldAlert();
		if (reactOrNot && this.raw_message) {
			await ilt(this.raw_message.react("✅"), false);
		}
		let res;
		if (
			!this.myChannelPerms ||
			this.myChannelPerms.has("USE_EXTERNAL_EMOJIS")
		) {
			res = await this.reply("<:success:508840840416854026>", msg);
		} else {
			res = await this.reply("✅", msg);
		}
		// res && res.forEach(r => r.delete({ timeout: 20 * 1000 }));
		return res;
	}
	async docs(path: string, mode: "usage" | "error" | "full") {
		const docsPage = globalDocs[path];
		if (!docsPage) {
			return await this.error(
				"Uh oh! This is an invalid message:( https://interpunct.info" +
					safe(path) +
					" ):",
			);
		}
		if (mode === "usage") {
			return await this.error(
				"Usage: " +
					dgToDiscord(docsPage.summaries.usage, this) +
					" (<https://interpunct.info" +
					path +
					">)",
			);
		}
		if (mode === "error") {
			return await this.error(
				dgToDiscord(docsPage.summaries.description, this) +
					"\n\n> More Info: <https://interpunct.info" +
					path +
					">",
			);
		}
		if (mode === "full") {
			return await this.result(
				dgToDiscord(docsPage.body, this) +
					"\n\n> Full Page: <https://interpunct.info" +
					path +
					">",
			);
		}
		throw new Error("bad help :{ !! }:");
	}
	tag(str: TemplateStringsArray, ...values: (string | {__raw: string})[]) {
		const s = templateGenerator((q: string) =>
			q.replace(/[\\{|}]/g, "\\$1"),
		);
		return dgToDiscord(s(str, ...values), this);
		// return await info.error(info.tag`{Command|test} is {Reaction|${user input}}`)
	}
	async result(...msg: MessageParametersType) {
		return await this.reply(result.result, ...msg);
	}
	async redirect(newcmd: string) {
		throw new Error("NOT IMPLEMENTED YET " + newcmd); // TODO for example .wr is just .speedrun leaderboard 1, so it could res.redirect("speedrun leaderboard 1 "+arguments)
	}
	// async confirm(who: string): boolean{
	//
	// }
	get handleReactions() {
		return handleReactions;
	}
}

export function handleReactions(
	msg: Discord.Message,
	cb: (
		reaction: Discord.MessageReaction,
		user: Discord.User,
	) => Promise<void>,
	rxnRemove?: (
		reaction: Discord.MessageReaction,
		user: Discord.User,
	) => Promise<void>,
) {
	const reactionCollector = new Discord.ReactionCollector(
		msg,
		() => true, // the filter doesn't actually eg prevent reactions from going to the standard onReactionAdd handler so it's pointless
		{},
	);
	let errCb: (error: Error) => void = (error: Error) => {
		throw error;
	};
	reactionCollector.on("collect", (reaction, user) => {
		if (user.bot) {
			return;
		}
		ilt(cb(reaction, user), false)
			.then(v => (v.error ? errCb(v.error) : 0))
			.catch(_ => _ as never);
	});
	rxnRemove &&
		reactionCollector.on("remove", (reaction, user) => {
			if (user.bot) {
				return;
			}
			ilt(rxnRemove(reaction, user), false)
				.then(v => (v.error ? errCb(v.error) : 0))
				.catch(_ => _ as never);
		});
	return {
		end: () => reactionCollector.stop(),
		done: new Promise<void>((resolve, reject) => {
			errCb = reject;
			reactionCollector.addListener("end", () => resolve());
		}),
	};
}
