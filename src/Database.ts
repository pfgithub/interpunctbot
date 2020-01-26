/*

await db.getPrefix(guild.id, prefix)

*/

import knex from "./db";
import { logError } from "..";

type GuildData = { [key in keyof Fields]?: Fields[key] };

type AutodeleteInfo = {
	prefix: { prefix: string };
	user: { user: string };
	channel: { channel: string };
	role: { role: string };
};
export type AutodeleteRule = {
	[key in keyof AutodeleteInfo]: AutodeleteInfo[key] & {
		type: key;
		id: number;
		duration: number;
	};
}[keyof AutodeleteInfo];
export type AutodeleteRuleNoID = {
	[key in keyof AutodeleteInfo]: AutodeleteInfo[key] & {
		type: key;
		id?: undefined;
		duration: number;
	};
}[keyof AutodeleteInfo];

export type AutodeleteField = {
	rules: AutodeleteRule[];
	nextID: number;
};

const cache: Map<string, GuildData> = new Map();
const shouldCache: { [ey: string]: boolean | undefined } = {
	prefix: true,
	logging: true,
	rankmojiChannel: true,
	autodelete: true,
};

function tryParse<T>(json: string | undefined, defaultValue: T): T {
	if (!json) {
		return defaultValue;
	}
	try {
		return JSON.parse(json);
	} catch (e) {
		logError(new Error(`Malformed JSON: ${json}`));
		return defaultValue;
	}
}

type Fields = {
	id: string;
	prefix: string;
	searchablePastebins?: string;
	logging?: string;
	quotes?: string;
	nameScreening?: string;
	unknownCommandMessages?: string;
	failedPrecheckMessages?: string;
	channel_spacing?: string;
	speedrun?: string; // "gameID, categoryID"
	welcome?: string;
	goodbye?: string;
	// pmonfailure?: string;
	funEnabled?: string;
	rankmojiChannel: string;
	autodelete?: string;
	autodelete_limit?: number;
};

type JSONFields = {
	searchablePastebins: ListsField;
	nameScreening: NameScreeningField;
	autodelete: AutodeleteField;
};
type BooleanFields = {
	logging: boolean;
	channel_spacing: boolean;
	funEnabled: boolean;
};

type ListsField = { [key: string]: string };
type NameScreeningField = string[];
// type SpeedrunField = { gameID: string; categoryID: string };

const lock: { [key: string]: (() => void)[] } = {};

// database should be initialized with every Info
class Database {
	guild: string;
	_data?: Fields;
	static get cache() {
		return cache;
	}
	constructor(guildId: string) {
		this.guild = guildId;
		this._data = undefined;
		if (!cache.has(this.guild)) {
			cache.set(this.guild, {});
		}
	}
	async getOrLoadData(): Promise<Fields> {
		// loads data into the this.data.
		if (this._data) {
			return this._data;
		}

		let data = (await knex("guilds").where({ id: this.guild }))[0]; // THIS IS NOT THE RIGHT WAY
		if (!data) {
			if (lock[this.guild]) {
				await new Promise(r => lock[this.guild].push(() => r()));
				return this.getOrLoadData();
			}
			lock[this.guild] = [];
			// we need a better way to do this
			try {
				data = await knex("guilds").insert({
					id: this.guild,
					prefix: "ip!",
				});
			} catch (er) {
				throw new Error(
					`no db entry was found for guild id ${this.guild}, but a new one could not be created because ${er}, the data was ${data}`,
				);
			}
			const values = lock[this.guild];
			delete lock[this.guild];
			values.forEach(e => e());
		}
		this._data = data;
		return this._data!;
	}
	async _get<Name extends keyof Fields>(name: Name): Promise<Fields[Name]> {
		// returns a string
		// if (shouldCache[name]) {
		if (
			cache.has(this.guild) &&
			cache.get(this.guild)![name] !== undefined
		) {
			return cache.get(this.guild)![name]! as Fields[Name];
		}
		// }
		const data = await this.getOrLoadData();
		if (shouldCache[name]) {
			//eslint-disable-next-line require-atomic-updates
			cache.get(this.guild)![name] = data[name]; // if two of these happen at once, the cache could get written to twice at a time. that is (probably) fine
		}
		return data[name];
	}
	async _set<Name extends keyof Fields>(name: Name, value: Fields[Name]) {
		// value is a string // we need an updateMany function
		await knex("guilds")
			.where({ id: this.guild })
			.update({ [name]: value });
		if (shouldCache[name]) {
			cache.get(this.guild)![name] = value;
		}
		if (this._data) {
			// it doesn't really matter if we update data or not because we will probably be forgotten about immediately after this, but whatever makes it so you can .setPrefix() then .getPrefix() and print the new result
			this._data[name] = value;
		}
	}
	async _getJson<Name extends keyof JSONFields>(
		name: Name,
		defaultValue: JSONFields[Name],
	): Promise<JSONFields[Name]> {
		return tryParse(await this._get(name), defaultValue);
	}
	async _setJson<Name extends keyof JSONFields>(
		name: Name,
		newValue: JSONFields[Name],
	) {
		await this._set(name, JSON.stringify(newValue));
	}
	async _getBool<Name extends keyof BooleanFields>(
		name: Name,
		defaultValue: BooleanFields[Name],
	): Promise<BooleanFields[Name]> {
		let val = await this._get(name);
		if (!val) {
			val = defaultValue.toString();
		}
		return val === "true";
	}
	async _setBool<Name extends keyof BooleanFields>(
		name: Name,
		newValue: BooleanFields[Name],
	) {
		await this._set(name, newValue.toString());
	}

	async getPrefix(): Promise<string> {
		return (await this._get(`prefix`)) || "ip!";
	}
	async setPrefix(newPrefix: string) {
		await this._set("prefix", newPrefix);
	}
	async getEmojiRankChannel(): Promise<string | undefined> {
		return (await this._get(`rankmojiChannel`)) || "";
	}
	async setEmojiRankChannel(newChannel: string) {
		await this._set("rankmojiChannel", newChannel);
	}
	async getLists(): Promise<ListsField> {
		const quoteList = await this._get(`quotes`);
		const otherLists = await this._getJson("searchablePastebins", {}); // here is where we could actually update the database to store everything in searchablepastebins instead of quotes... maybe later
		if (quoteList && !otherLists.quote) {
			otherLists.quote = quoteList;
		} // otherlists.quote OVERRIDES QUOTE!!!
		return otherLists;
	}
	async setLists(newLists: ListsField) {
		await this._setJson("searchablePastebins", newLists); // otherlists.quote overrides quote therefore we don't need to parse out and set quote
	}
	async getAutoban(): Promise<NameScreeningField> {
		return await this._getJson("nameScreening", []);
	}
	async setAutoban(newAutoban: NameScreeningField) {
		return await this._setJson("nameScreening", newAutoban);
	}
	async getAutodeleteLimit(): Promise<number> {
		return (await this._get("autodelete_limit")) || 10;
	}
	async setAutodeleteLimit(newLimit: number) {
		return await this._set("autodelete_limit", newLimit);
	}
	async getAutodelete() {
		return await this._getJson("autodelete", { rules: [], nextID: 1 });
	}
	async addAutodelete(rule: AutodeleteRuleNoID | AutodeleteRule) {
		const autodelete = await this.getAutodelete();
		if (!rule.id) rule.id = autodelete.nextID++;
		autodelete.rules.push(rule as AutodeleteRule);
		await this._setJson("autodelete", autodelete);
		return rule.id;
	}
	async removeAutodelete(id: number) {
		const autodelete = await this.getAutodelete();
		autodelete.rules = autodelete.rules.filter(rule => rule.id !== id);
		return await this._setJson("autodelete", autodelete);
	}
	// BOOL, these could probably be condensed
	async getLogEnabled(): Promise<boolean> {
		// cached
		return await this._getBool("logging", /*default:*/ false);
	}
	async setLogEnabled(bool: boolean) {
		return await this._set("logging", bool.toString());
	}
	async getUnknownCommandMessages(): Promise<"always" | "admins" | "never"> {
		const value = await this._get("unknownCommandMessages");
		if (value === "true") {
			return "always";
		}
		if (value === "admins") {
			return "admins";
		}
		if (value === "false") {
			return "never";
		}
		return "always"; // default
	}
	async setUnknownCommandMessages(bool: "always" | "admins" | "never") {
		if (bool === "always") {
			return await this._set("unknownCommandMessages", "true");
		}
		if (bool === "admins") {
			return await this._set("unknownCommandMessages", "admins");
		}
		if (bool === "never") {
			return await this._set("unknownCommandMessages", "false");
		}
	}
	async getCommandErrors(): Promise<"always" | "admins" | "never"> {
		const value = await this._get("failedPrecheckMessages");
		if (value === "true") {
			return "always";
		}
		if (value === "false") {
			return "admins";
		}
		if (value === "noone") {
			return "never";
		}
		return "always"; // default
	}
	async setCommandErrors(bool: "always" | "admins" | "never") {
		if (bool === "always") {
			return await this._set("failedPrecheckMessages", "true");
		}
		if (bool === "admins") {
			return await this._set("failedPrecheckMessages", "false");
		}
		if (bool === "never") {
			return await this._set("failedPrecheckMessages", "noone");
		}
	}
	// async getPMOnFailure(): Promise<"always" | "admins" | "never"> {
	// 	const value = await this._get("pmonfailure");
	// 	if (value === "true") {
	// 		return "always";
	// 	}
	// 	if (value === "false") {
	// 		return "admins";
	// 	}
	// 	if (value === "noone") {
	// 		return "never";
	// 	}
	// 	return "never"; // default
	// }
	// async setPMOnFailure(bool: "always" | "admins" | "never") {
	// 	if (bool === "always") {
	// 		return await this._set("pmonfailure", "true");
	// 	}
	// 	if (bool === "admins") {
	// 		return await this._set("pmonfailure", "false");
	// 	}
	// 	if (bool === "never") {
	// 		return await this._set("pmonfailure", "noone");
	// 	}
	// }
	async getAutospaceChannels() {
		return await this._getBool("channel_spacing", false);
	}
	async setAutospaceChannels(bool: boolean) {
		return await this._set("channel_spacing", bool.toString());
	}
	// tbd
	async getWelcomeMessage() {
		return await this._get("welcome");
	}
	async setWelcomeMessage(newMessage: string) {
		return await this._set("welcome", newMessage);
	}
	async getGoodbyeMessage() {
		return await this._get("goodbye");
	}
	async setGoodbyeMessage(newMessage: string) {
		return await this._set("goodbye", newMessage);
	}
	async getFunEnabled() {
		return await this._getBool("funEnabled", true);
	}
	async setFunEnabled(value: boolean) {
		return await this._setBool("funEnabled", value);
	}
	// async getSpeedrun() {
	// 	return await this._getJson("speedrunv2");
	// }
	async getSpeedrunDefault() {
		const [gameID, categoryID] = (
			(await this._get("speedrun")) || ""
		).split(`, `);
		if (!categoryID) {
			return undefined;
		} // category id will be undefined because [1] of .split will be undefined.
		return { gameID: gameID, categoryID: categoryID };
	}
	async setSpeedrunDefault(gameID: string, categoryID: string) {
		return await this._set("speedrun", `${gameID}, ${categoryID}`);
	}
	async addError(error: string, settingCause: string) {
		// log for the ip!error log
		void error;
		void settingCause;
	}
}

export default Database;

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
