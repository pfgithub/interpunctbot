/*global Symbol*/
/*
So what does module do?
Router routes commands, module does...?

It holds a commandrouter, it has a method commandlist
I think module shouldn't exist and it should be replaced with Router

 */
let MB = require("./MessageBuilder");
const Database = require("./Database");

let result = {
	error: "<:failure:508841130503438356> Error: ",
	result: "",
	info: "<:info:508842207089000468> Info: ",
	success: "<:success:508840840416854026> Success: " // Discord uses a gray ✔️ emoji for some reason. It could be backslashed but some other platforms do too
};

let r = {
	manageBot: (info) => {
		if(!r.pm(false)(info)) return false;
		if(info.authorPerms.manageBot) {
			return true;
		}
		return info.error("You need permisison to `Manage Server` to use this command") && false;
	},
	pm: (expected) => (info) => {
		if(info.pm === expected) return true;
		return info.error("This command cannot be used in a PM") && false;
	} // I want an r.load() that calls startloading and awaits for it
};

class Info {
	constructor(message, other) {
		this.loading = false;
		this.channel = message.channel;
		this.guild = message.guild;
		this.message = message;
		this.member = message.member;
		this.other = other;
		this.db = new Database(this.guild.id);
	}
	static get result() {return result;}
	async setup(database) {
		// gets the relevant fields from the db
	}
	static get r() {return r;}
	get authorChannelPerms() {
		return this.channel.permissionsFor(this.member);
	}
	get myChannelPerms() {
		return this.channel.permissionsFor(this.guild.me);
	}
	get authorPerms() {
		return {
			manageBot: this.authorChannelPerms.has("MANAGE_GUILD"),
			manageChannel: this.authorChannelPerms.has("MANAGE_CHANNELS")
		};
	}
	get pm() {
		return !this.guild;
	}
	async startLoading() {
		this._loadingCreationInProgress = true;
		this.loading = await this._tryReply("<a:typing:393848431413559296>");
		this._loadingCreationInProgress = false;
	}
	async stopLoading() {
		if(this._loadingCreationInProgress) throw new Error("StopLoading called before StartLoading awaited for"); // this could be fixed by awaiting until loadingCreationInProgress changes,forex setting a setter for _lcip in stoploading if !_lcip
		if(this.loading && this.loading.deletable && !this._loadingDeletionInProgress) {
			this._loadingDeletionInProgress = true;
			await this.loading.delete();
			this._loadingDeletionInProgress = false;
			this.loading = undefined;
		}
	}
	_formatMessageWithResultType(type, ...data) { // In the future maybe adjust richembeds maybe probably not
		let [message, options] = data;
		return [type + message, options];
	}
	async _informMissingPermissions(perm, message, channel = this.channel) {

	}
	async _tryReply(...data) { // returns the message
		if(data[0].length > 1999) {
			return this._tryReply("message too long"); // FIX, make it send multiple messages and return the last or somethignfdlkjk
		}

		if(this.pm || this.myChannelPerms.has("SEND_MESSAGES")) {
			return await this.message.reply(...data);
		}
		if(this.authorPerms.manageChannel) {
			// this._informMissingPermissions(SEND_MESSAGES, "reply to your message", this.message.author)
			// If the author has permission to manage the channel permissions, tell them the bot doesn't have permission to respond.
			let errorMessage = await this.message.author.send(...this._formatMessageWithResultType(result.error, `I do not have permission to reply to your message in #${this.channel.name}`)); // this.channel.name does not require antiformatting because channels are already not allowed to have @everyone or whatever
			errorMessage.delete(10*1000); // Don't await for this, you don't want to wait 10 seconds for it to delete do you
		}
		// Send the actual result
		return await this.message.author.send(...data);
	}
	async reply(resultType, message, data) {
		let showErrors = (await this.db.getCommandErrors());
		showErrors = true; console.log("REMOVE THIS"); //TEMP
		if(resultType === result.error && !showErrors) {
			if(!this.authorPerms.manageBot) {
				return {"delete": async() => {}}; // command errors are disabled, return nothing
			}
		}

		// Stop any loading if it is happening, we're replying now we're done loading
		this.stopLoading(); // not awaited for because it doesn't matter

		// If the message is a messagebuilder, build the message builder
		if(message instanceof MB.MessageBuilder) {
			message = message.build(true);
		}else if(typeof message === "string") {
			message = [message, data];
		}

		// Format the message with the correct result type
		message = this._formatMessageWithResultType(resultType, ...message);

		// Reply to the message (or author)
		return await this._tryReply(...message);
	}
	async error(...msg) {
		this.message.react("508841130503438356"); console.log("WHAT IF I DON'T HAVE PERMS TO ADD REACTIONS. also config.emoji");
		let res = await this.reply(result.error, ...msg);
		res.delete(20*1000);
		return res;
	}
	async success(...msg) {  
		this.message.react("508840840416854026");
		let res = await this.reply(result.success, ...msg);
		res.delete(20*1000);
		return res;
	}
	async result(...msg) {
		return await this.reply(result.result, ...msg);
	}
	async redirect(newcmd) {
		throw new Error("NOT IMPLEMENTED YET"); // TODO for example .wr is just .speedrun leaderboard 1, so it could res.redirect("speedrun leaderboard 1 "+arguments)
	}
}

module.exports = Info;
