// imports the config file

import fs from "fs";
import path from "path";
import type {Snowflake} from "discord.js";

type Config = {
	token?: string,
	owners: string[],
	errorReporting?: {
		server: Snowflake,
		channel: Snowflake,
	},
	listings: {
		"discord.bots.gg"?: string,
		"top.gg"?: string,
	},
	testing: {
		users: string[],
	},
	slashCommandServer?: string,
};

type RawConfig = {
	token?: string,
	owner?: string,
	owners?: string[],
	errorReporting?: {
		server: Snowflake,
		channel: Snowflake,
	},
	listings?: {
		"discord.bots.gg"?: string,
		"top.gg"?: string,
	},
	testing?: {
		users?: string[],
	},
	slashCommandServer?: string,
};

let rawConfig: RawConfig = {};
let configText = "";
try {
	configText = fs.readFileSync(
		path.join(process.cwd(), "config", "config.json"),
		"utf-8",
	);
} catch (e) {
	console.log("No config file found. The bot will not be able to run.");
}

if (configText) {
	rawConfig = JSON.parse(configText);
}

export const globalConfig: Config = {
	token: rawConfig.token,
	owners: [
		...(rawConfig.owner ? [rawConfig.owner] : []),
		...(rawConfig.owners || []),
	],
	errorReporting: rawConfig.errorReporting,
	listings: {
		"discord.bots.gg": rawConfig.listings?.["discord.bots.gg"],
		"top.gg": rawConfig.listings?.["top.gg"],
	},
	testing: {
		users: rawConfig.testing?.users || [],
	},
	slashCommandServer: rawConfig.slashCommandServer,
};
