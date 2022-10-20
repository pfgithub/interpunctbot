import * as Discord from "discord.js";
import Database from "./Database";
import { ilt, perr } from "..";
import { safe, messages, templateGenerator } from "../messages";
import { globalConfig } from "./config";
import { globalDocs } from "./NewRouter";
import { dgToDiscord } from "./parseDiscordDG";
import { InteractionHelper } from "./SlashCommandManager";

const result = {
	error: "<:failure:508841130503438356> Error: ",
	result: "",
	info: "<:info:508842207089000468> Info: ",
	success: "<:success:508840840416854026> Success: ", // Discord uses a gray ✔️ emoji for some reason. It could be backslashed but some other platforms do too
};

export function memberCanManageRole(
	member: Discord.GuildMember,
	role: Discord.Role,
): boolean {
	if (!member) return false;
	return (
		member.permissions.has("MANAGE_ROLES") &&
		(member.roles.highest.comparePositionTo(role) >= 0 ||
			member.permissions.has("ADMINISTRATOR"))
		// technically admins can't manage roles above them but too bad
	);
}

export async function permTheyCanManageRole(role: Discord.Role, info: Info): Promise<boolean> {
	if (!info.message.member!.permissions.has("MANAGE_ROLES")) {
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

export async function permWeCanManageRole(role: Discord.Role, info: Info): Promise<boolean> {
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
	manageBot: async (info: Info): Promise<boolean> => {
		if (!theirPerm.pm(false)(info)) {
			return false;
		}
		if (await info.theyHavePermsToManageBot()) {
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
	manageChannels: (info: Info): boolean => {
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
	manageEmoji: (info: Info): boolean => {
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
	manageMessages: (info: Info): boolean => {
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
	banMembers: (info: Info): boolean => {
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
	pm: (expected: boolean) => (info: Info): boolean => {
		if (info.pm === expected) {
			return true;
		}
		perr(
			info.error("This command cannot be used in a PM"),
			"pm theirperm error",
		);
		return false;
	}, // I want an r.load() that calls startloading and awaits for it
	owner: (info: Info): boolean => {
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
	manageChannels: (info: Info): boolean => {
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
	manageEmoji: (info: Info): boolean => {
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
	manageMessages: (info: Info): boolean => {
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
	banMembers: (info: Info): boolean => {
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
	| Discord.MessageOptions
	| string
;

export type MessageLike = {
	channel: Discord.Message["channel"],
	guild: Discord.Message["guild"],
	member: Discord.Message["member"],
	author: Discord.Message["author"],
	client: Discord.Message["client"],
	content: Discord.Message["content"],
	delete: () => Promise<void>,
};

export default class Info {
	channel: Discord.TextBasedChannels;
	guild?: Discord.Guild | null;
	message: MessageLike;
	raw_message?: Discord.Message;
	raw_interaction?: InteractionHelper;
	other?: {
		startTime: number,
		infoPerSecond: number,
	};
	db?: Database;
	member?: Discord.GuildMember | null;
	prefix: string; // excuse me what?! this is set in the constructor but the constructor
	// is synchronous so i guess we just kinda hope that it finishes setting in time?
	constructor(
	    message: MessageLike,
	    other?: {
			startTime: number,
			infoPerSecond: number,
			raw_message?: Discord.Message,
			raw_interaction?: InteractionHelper,
		},
	) {
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
	                    this.prefix = res.result!; // typescript broke
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
	} as {allowedMentions: {parse: [], roles: [], users: []}, split: false}; // Discord.MessageOptions
	static get result(): typeof result {
	    return result;
	}
	static get theirPerm(): typeof theirPerm {
	    return theirPerm;
	}
	static get ourPerm(): typeof ourPerm {
	    return ourPerm;
	}
	get atme(): string {
	    return this.message.client.user!.toString();
	}
	get authorChannelPerms(): Readonly<Discord.Permissions> | undefined | null {
	    if ('guild' in this.channel) {
	        return this.channel.permissionsFor(this.member!);
	    }
	    return undefined;
	}
	get authorGuildPerms(): Readonly<Discord.Permissions> | undefined | null {
	    if (this.member) {
	        return this.member.permissions;
	    }
	    return undefined;
	}
	get myChannelPerms(): Readonly<Discord.Permissions> | undefined | null {
	    if ('guild' in this.channel) {
	        return this.channel.permissionsFor(this.guild!.me!);
	    }
	    return undefined;
	}
	async theyHavePermsToManageBot(): Promise<boolean> {
		if(this.authorGuildPerms?.has("MANAGE_GUILD") ?? true) {
			return true; // in pm or author has perm
		}
		const mngbotrol = await this.db!.getManageBotRole();
		if (this.message.member!.roles.cache.has(mngbotrol.role)) {
			return true;
		}
		return false; // does not have perm
	}
	get authorPerms(): {manageChannel: boolean, manageEmoji: boolean, manageMessages: boolean, banMembers: boolean} {
	    return {
	        manageChannel: this.authorGuildPerms
				? this.authorGuildPerms.has("MANAGE_CHANNELS")
				: true,
	        manageEmoji: this.authorGuildPerms
				? this.authorGuildPerms.has("MANAGE_EMOJIS_AND_STICKERS")
				: true,
	        manageMessages: this.authorChannelPerms
				? this.authorChannelPerms.has("MANAGE_MESSAGES")
				: true,
	        banMembers: this.authorGuildPerms
				? this.authorGuildPerms.has("BAN_MEMBERS")
				: true,
	    };
	}
	get myPerms(): {manageBot: boolean, manageChannel: boolean, manageEmoji: boolean, manageMessages: boolean, banMembers: boolean} {
	    return {
	        manageBot: this.myChannelPerms
				? this.myChannelPerms.has("MANAGE_GUILD")
				: true,
	        manageChannel: this.myChannelPerms
				? this.myChannelPerms.has("MANAGE_CHANNELS")
				: true,
	        manageEmoji: this.myChannelPerms
				? this.myChannelPerms.has("MANAGE_EMOJIS_AND_STICKERS")
				: true,
	        manageMessages: this.myChannelPerms
				? this.myChannelPerms.has("MANAGE_MESSAGES")
				: true,
	        banMembers: this.myChannelPerms
				? this.myChannelPerms.has("BAN_MEMBERS")
				: true,
	    };
	}
	get pm(): boolean {
	    return !this.guild;
	}
	async typing(): Promise<void> {
		await this.channel.sendTyping();
	}
	shouldAlert(): boolean {
	    if(this.raw_message) {
	        if(Date.now() - this.raw_message.createdAt.getTime() > 3000) return true;
	        if(this.raw_message.channel.lastMessageId !== this.raw_message.id) return true;
	        return false;
	    }else{
	        return false;
	    }
	}
	async _tryReply(
	    values: Discord.MessageOptions
	): Promise<Discord.Message[] | undefined> {
	    const atThem = this.message.author.toString();
	    const shouldAlert = this.shouldAlert();
	    const allowedMentions: Discord.MessageMentionOptions = shouldAlert
			? { users: [this.message.author.id], roles: [], parse: [] }
			: { users: [], roles: [], parse: [] };
		// TODO reply
		
	    const msgtxt = atThem + ", " + values.content;
	    const splitmsg = Discord.Util.splitMessage(msgtxt);

	    const resmsgs: Discord.Message[] = [];
	    for (const [i, msgpart] of splitmsg.entries()) {
	        const iltres = await ilt(
	            this.message.channel.send({
	                allowedMentions,
					...(i === 0 ? values : {}),
					content: msgpart,
	            }),
	            false,
	        );
	        if (iltres.error) {
	            console.log(iltres.error);
	            return;
	        }
	        resmsgs.push(iltres.result);
	    }
	    return resmsgs;
	}
	async accept(): Promise<void> {
	    if(this.raw_interaction && !this.raw_interaction.has_ackd) {
	        await this.raw_interaction.accept();
	    }
	}
	async reply(
	    resultType: string,
	    value: MessageParametersType,
	): Promise<Discord.Message[] | undefined> {
	    if(this.raw_interaction && typeof value === "string") {
	        try {
	            await this.raw_interaction.reply(resultType + " " + value);
	            return undefined;
	        } catch(e) {console.log(e)}
	    }

	    let message: Discord.MessageOptions = typeof value === "string" ? {content: value} : value;

	    // Format the message with the correct result type
		message = {...message, content: resultType + " " + (message.content ?? "")};

	    // Reply to the message (or author)
	    return await this._tryReply(message);
	}
	async error(msg: string): Promise<void> {
	    if(this.raw_interaction) return await this.errorAlways(msg);
		
	    const unknownCommandMessages = this.db
			? await this.db.getCommandErrors()
			: "always";
	    if (
	        unknownCommandMessages === "always" ||
			(unknownCommandMessages === "admins" && await this.theyHavePermsToManageBot())
	    ) {
	    } else {
	        return;
	    }
	    return this.errorAlways(msg);
	}
	async errorAlways(msg: string): Promise<void> {
	    if(this.raw_interaction && !this.raw_interaction.has_ackd) {
	        try{
	            await this.raw_interaction.replyHiddenHideCommand("<:error:508841130503438356> "+msg);
	            return;
	        }catch(e) {console.log(e)}
	    }

	    const reactOrNot = this.shouldAlert();

	    if (reactOrNot && this.raw_message) {
	        await ilt(this.raw_message.react("❌"), false);
	    }
	    if (
	        !this.myChannelPerms ||
			this.myChannelPerms.has("USE_EXTERNAL_EMOJIS")
	    ) {
	        await this.reply("<:error:508841130503438356>", msg);
	    } else {
	        await this.reply("❌", msg);
	    }
	    return;
	}
	async warn(msg: string): Promise<Discord.Message[] | undefined> {
	    if(this.raw_interaction && !this.raw_interaction.has_ackd) {
	        try{
	            await this.raw_interaction.reply("<:warning:508842207089000468> "+msg);
				return;
	        }catch(e) {console.log(e)}
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
	async success(msg: string): Promise<Discord.Message[] | undefined> {
	    if(this.raw_interaction && !this.raw_interaction.has_ackd) {
	        try{
	            await this.raw_interaction.reply("<:success:508840840416854026> "+msg);
				return;
	        }catch(e) {console.log(e)}
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
	async docs(path: string, mode: "usage" | "error" | "full"): Promise<void> {
	    const docsPage = globalDocs[path];
	    if (!docsPage) {
	        return await this.error(
	            "Uh oh! This is an invalid message:( " +
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
	        await this.result(
	            dgToDiscord(docsPage.body, this) +
					"\n\n> Full Page: <https://interpunct.info" +
					path +
					">",
	        );
			return;
	    }
	    throw new Error("bad help :{ !! }:");
	}
	tag(str: TemplateStringsArray, ...values: (string | {__raw: string})[]): string {
	    const s = templateGenerator((q: string) =>
	        q.replace(/[\\{|}]/g, "\\$1"),
	    );
	    return dgToDiscord(s(str, ...values), this);
	    // return await info.error(info.tag`{Command|test} is {Reaction|${user input}}`)
	}
	async result(msg: MessageParametersType): Promise<Discord.Message[] | undefined> {
	    return await this.reply(result.result, msg);
	}
	async redirect(newcmd: string): Promise<never> {
	    throw new Error("NOT IMPLEMENTED YET " + newcmd); // TODO for example .wr is just .speedrun leaderboard 1, so it could res.redirect("speedrun leaderboard 1 "+arguments)
	}
	// async confirm(who: string): boolean{
	//
	// }
	get handleReactions(): typeof handleReactions {
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
): {end: () => void, done: Promise<void>} {
	const reactionCollector = new Discord.ReactionCollector(msg);
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
