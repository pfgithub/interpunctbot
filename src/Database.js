/*

await db.getPrefix(guild.id, prefix)

*/

let knex = require("./db");

let cache = {};
let shouldCache = {prefix: true, logging: true};

function tryParse(json, defaultValue) {
	try{
		return typeof json === "string" ? JSON.parse(json) : json;
	}catch(e) {
		console.log(`Could not parse  ^^${JSON.stringify(json)}`);
		return defaultValue;
	}
}

// database should be initialized with every Info
class Database {
	static get cache() {return cache;}
	constructor(guildId) {
		this.guild = guildId;
		this._data = undefined;
		if(!cache[this.guild]) cache[this.guild] = {};
	}
	async getOrLoadData() { // loads data into the this.data. 
		if(this._data) return this._data;
        
		let data = (await knex("guilds").where({id: this.guild}))[0]; // THIS IS NOT THE RIGHT WAY
		if(!data) { // we need a better way to do this
			try{
				data = await knex("guilds").insert({id: this.guild, prefix: "ip!"});
			}catch(er) {
				console.log(`no db entry was found for guild id ${this.guild}, but a new one could not be created because ${er}`);
				throw new Error(`no db entry was found for guild id ${this.guild}, but a new one could not be created because ${er}, the data was ${data}`);
			}
		}
		this._data = data;
		return this._data;
	}
	async _get(name) { // returns a string
		if(shouldCache[name]) {
			if(cache[this.guild].hasOwnProperty(name)) return cache[this.guild][name];
		}
		let data = await this.getOrLoadData();
		if(shouldCache[name]) {
			cache[this.guild][name] = data[name];
		}
		return data[name];
	}
	async _set(name, value) { // value is a string // we need an updateMany function
		await knex("guilds").where({id: this.guild}).update({[name]: value});
		if(shouldCache[name]) {
			cache[this.guild][name] = value;
		}
		if(this.data) { // it doesn't really matter if we update data or not because we will probably be forgotten about immediately after this, but whatever makes it so you can .setPrefix() then .getPrefix() and print the new result
			this.data[name] = value;
		}
	}
	async _getJson(name, defaultValue) {
		return tryParse(await this._get(name), defaultValue);
	}
	async _setJson(name, newValue) {
		this._set(name, JSON.stringify(newValue));
	}
	async _getBool(name, defaultValue) {
		let val = await this._get(name);
		if(!val) val = defaultValue.toString();
		return val === "true";
	}

	async getPrefix() {
		return await this._get`prefix`;
	}
	async setPrefix(newPrefix) {
		await this._set("prefix", newPrefix);
	}
	async getLists() {
		let quoteList = await this._get`quotes`;
		let otherLists = await this._getJson("searchablePastebins", {}); // here is where we could actually update the database to store everything in searchablepastebins instead of quotes... maybe later
		if(quoteList && !otherLists.quote) otherLists.quote = quoteList; // otherlists.quote OVERRIDES QUOTE!!! 
		return otherLists;
	}
	async setLists(newLists) {
		await this._setJson("searchablePastebins", newLists); // otherlists.quote overrides quote therefore we don't need to parse out and set quote
	}
	async getAutoban() {
		return await this._getJson("nameScreening", []);
	}
	async setAutoban(newAutoban) {
		return await this._setJson("nameScreening", newAutoban);
	}
	// BOOL, these could probably be condensed
	async getLogEnabled() { // cached
		return await this._getBool("logging", false);
	}
	async setLogEnabled(bool) {
		return await this._set("logging", bool.toString());
	}
	async getUnknownCommandMessages() {
		return await this._getBool("unknownCommandMessages", true);
	}
	async setUnknownCommandMessages(bool) {
		return await this._set("unknownCommandMessages", bool.toString());
	}
	async getCommandErrors() { // true = all, false = manage_guild only
		return await this._getBool("failedPrecheckMessages", true);
	}
	async setCommandErrors(bool) {
		return await this._set("failedPrecheckMessages", bool.toString());
	}
	async getAutospaceChannels() {
		return await this._getBool("channel_spacing", false);
	}
	async setAutospaceChannels(bool) {
		return await this._set("channel_spacing", bool.toString());
	}
	// tbd
	async getWelcomeMessage() {

	}
	async getGoodbyeMessage() {

	}
}

module.exports = Database;

/*

	return{
get/setPrefix			prefix = guild.prefix;
get/setLists			allPastebin = tryParse(guild.searchablePastebins) || allPastebin;
replaced			if(guild.quotes) allPastebin.quote = guild.quotes;
			speedrun = guild.speedrun;
unused			disabledCommands = tryParse(guild.disabledCommands) || disabledCommands;
			rankmojis = tryParse(guild.rankmojis) || rankmojis;
			rankmojiChannel = guild.rankmojiChannel;
get/setAutoban			nameScreening = tryParse(guild.nameScreening) || nameScreening;
			permReplacements = tryParse(guild.permreplacements) || permReplacements;
get/setLogEnabled			logging = guild.logging === "true" ? true : false;
get/setUnknownCommandMessages			unknownCommandMessages = guild.unknownCommandMessages === "true" || !guild.unknownCommandMessages ? true : false;
get/setFailedPrecheckMessages			failedPrecheckMessages = guild.failedPrecheckMessages === "true" || !guild.failedPrecheckMessages ? true : false;
			channelSpacing = guild.channel_spacing === "true" ? true : false;
			events.welcome = guild.welcome || events.welcome;
			events.goodbye = guild.goodbye || events.goodbye;
	};

*/